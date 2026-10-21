"""DRT engine — wait-time distribution of an on-demand zone shuttle (Python reference).

The number of requests in the system n(t) (waiting + in service) is a birth–death process
with demand λ(t). Its distribution p(t) is propagated minute by minute with the Kolmogorov
forward equation dp/dt = p Q, solved here with the matrix exponential of the generator
(scipy.linalg.expm) — an independent route from the uniformization used in TypeScript.
"""
from __future__ import annotations

import math
from dataclasses import dataclass, field
from functools import lru_cache

import numpy as np
from scipy.linalg import expm
from scipy.stats import poisson


@dataclass(frozen=True)
class ZoneParams:
    ellKm: float  # zone corridor length (km)
    rideKm: float  # mean ride length (km)
    speedKmh: float
    detour: float
    t0: float  # dispatch delay (min)
    dwell: float  # boarding + alighting (min)
    xi: float  # pooling efficiency proxy (>= 1)


@dataclass(frozen=True)
class ServiceStandard:
    meanMax: float = 15.0
    tailMin: float = 30.0
    tailProb: float = 0.05


TOURIST_STANDARD = ServiceStandard()


def kappa(I: int) -> float:
    """Mean distance (in corridor lengths) from a request to the nearest of I idle vehicles."""
    return (I + 3) / (2 * (I + 1) * (I + 2))


def pickup_min(p: ZoneParams, I: int) -> float:
    return 60 * p.detour * p.ellKm * kappa(I) / p.speedKmh


def ride_min(p: ZoneParams) -> float:
    return 60 * p.detour * p.rideKm / p.speedKmh


def cycle_min(p: ZoneParams, I: int) -> float:
    return (p.t0 + pickup_min(p, I) + ride_min(p) + p.dwell) / p.xi


def idle_wait(p: ZoneParams, I: int) -> float:
    return (p.t0 + pickup_min(p, I)) / p.xi


def death_rates(p: ZoneParams, M: int, N: int) -> np.ndarray:
    mu = np.zeros(N + 1)
    if M <= 0:
        return mu
    acc = 0.0
    q = M / cycle_min(p, 1)
    for n in range(1, N + 1):
        if n <= M:
            acc += 1.0 / cycle_min(p, M - n + 1)
            mu[n] = acc
        else:
            mu[n] = q
    return mu


def generator(lam: float, mu: np.ndarray) -> np.ndarray:
    N = len(mu) - 1
    Q = np.zeros((N + 1, N + 1))
    for n in range(N + 1):
        if n < N:
            Q[n, n + 1] = lam
        if n > 0:
            Q[n, n - 1] = mu[n]
    Q[np.diag_indices(N + 1)] = -Q.sum(axis=1)
    return Q


@lru_cache(maxsize=4096)
def _transition(p: ZoneParams, lam: float, M: int, N: int, dt: float = 1.0) -> np.ndarray:
    return expm(generator(lam, death_rates(p, M, N)) * dt)


def erlang_tail(j: int, rate: float, s: float) -> float:
    """P(Erlang(j, rate) > s) = P(Poisson(rate·s) ≤ j−1)."""
    if s <= 0:
        return 1.0
    return float(poisson.cdf(j - 1, rate * s))


@lru_cache(maxsize=4096)
def _state_wait(p: ZoneParams, M: int, N: int) -> np.ndarray:
    """Mean wait of an arrival that finds n requests in the system (n = 0..N)."""
    q = M / cycle_min(p, 1)
    c1 = idle_wait(p, 1)
    n = np.arange(N + 1)
    idle = np.array([idle_wait(p, M - k) if k < M else 0.0 for k in n])
    return np.where(n < M, idle, (n - M + 1) / q + c1)


@lru_cache(maxsize=1024)
def _state_tail_grid(p: ZoneParams, M: int, N: int, xmax: float = 180.0) -> tuple[np.ndarray, np.ndarray]:
    """P(W > x | n) on the 0.5-min grid x = 0, 0.5, …, xmax — shape (grid, N+1)."""
    xs = np.arange(0.0, xmax + 1e-9, 0.5)
    q = M / cycle_min(p, 1)
    c1 = idle_wait(p, 1)
    n = np.arange(N + 1)
    G = np.zeros((len(xs), N + 1))
    idle_w = np.array([idle_wait(p, M - k) if k < M else np.nan for k in n])
    for gi, x in enumerate(xs):
        s = x - c1
        if s <= 0:
            queue = np.ones(N + 1)
        else:
            queue = poisson.cdf(n - M, q * s)  # j − 1 = n − M
        G[gi] = np.where(n < M, (idle_w > x).astype(float), queue)
    return xs, G


def _state_tail(p: ZoneParams, M: int, N: int, x: float) -> np.ndarray:
    q = M / cycle_min(p, 1)
    c1 = idle_wait(p, 1)
    n = np.arange(N + 1)
    idle_w = np.array([idle_wait(p, M - k) if k < M else np.nan for k in n])
    queue = np.ones(N + 1) if x - c1 <= 0 else poisson.cdf(n - M, q * (x - c1))
    return np.where(n < M, (idle_w > x).astype(float), queue)


def wait_tail(p: ZoneParams, pv: np.ndarray, M: int, x: float) -> float:
    if M <= 0:
        return 1.0
    return float(min(1.0, pv @ _state_tail(p, M, len(pv) - 1, x)))


def wait_mean(p: ZoneParams, pv: np.ndarray, M: int) -> float:
    if M <= 0:
        return math.inf
    return float(pv @ _state_wait(p, M, len(pv) - 1))


def wait_quantile_mix(p: ZoneParams, parts: list[tuple[float, np.ndarray, int]], prob: float, xmax: float = 180.0) -> float:
    """Smallest grid x with P(W ≤ x) ≥ prob for a weighted mixture of (weight, distribution, fleet)."""
    tails = None
    xs = None
    for w, pv, M in parts:
        xs, G = _state_tail_grid(p, M, len(pv) - 1, xmax)
        t = w * (G @ pv)
        tails = t if tails is None else tails + t
    ok = np.nonzero(1 - np.minimum(1.0, tails) >= prob)[0]
    return float(xs[ok[0]]) if len(ok) else xmax


@dataclass
class HourStat:
    hour: int
    calls: float
    fleet: int
    mean: float
    p30: float
    q90: float
    meets: bool


@dataclass
class DayResult:
    open: int
    close: int
    dist: list = field(repr=False)
    lam: list = field(repr=False)
    fleet: list = field(repr=False)
    hours: list
    totalCalls: float
    vehicleHours: float
    q: float
    meetShare: float


def _round_half_up(x: float) -> int:
    return int(math.floor(x + 0.5))


def simulate_day(p: ZoneParams, open_: int, close: int, lam_arr, fleet_arr, std: ServiceStandard = TOURIST_STANDARD, queue_cap: int = 45) -> DayResult:
    """lam_arr / fleet_arr: per-minute values for minutes open_ .. close−1."""
    n_min = close - open_
    lam_arr = [float(v) for v in lam_arr]
    fleet_arr = [int(v) for v in fleet_arr]
    assert len(lam_arr) == n_min and len(fleet_arr) == n_min
    N = max(fleet_arr) + queue_cap
    pv = np.zeros(N + 1)
    pv[0] = 1.0
    dist = []
    for i in range(n_min):
        dist.append(pv)
        pv = pv @ _transition(p, lam_arr[i], fleet_arr[i], N)
        pv = np.clip(pv, 0, None)
        pv = pv / pv.sum()
    hours = []
    for h in range(open_ // 60, math.ceil(close / 60)):
        idx = [t - open_ for t in range(max(open_, h * 60), min(close, (h + 1) * 60))]
        if not idx:
            continue
        wsum = sum(lam_arr[i] for i in idx)
        w = [(lam_arr[i] / wsum if wsum > 0 else 1 / len(idx)) for i in idx]
        mean = sum(wk * wait_mean(p, dist[i], fleet_arr[i]) for wk, i in zip(w, idx))
        p30 = sum(wk * wait_tail(p, dist[i], fleet_arr[i], std.tailMin) for wk, i in zip(w, idx))
        q90 = wait_quantile_mix(p, [(wk, dist[i], fleet_arr[i]) for wk, i in zip(w, idx)], 0.9)
        fl = _round_half_up(sum(fleet_arr[i] for i in idx) / len(idx))
        hours.append(HourStat(h, wsum, fl, mean, p30, q90, bool(mean <= std.meanMax and p30 <= std.tailProb)))
    total = sum(lam_arr)
    vh = sum(fleet_arr) / 60
    return DayResult(open_, close, dist, lam_arr, fleet_arr, hours, total, vh, total / vh if vh > 0 else 0.0,
                     sum(h.meets for h in hours) / len(hours) if hours else 0.0)


def wait_summary(p: ZoneParams, day: DayResult, minute: int) -> dict:
    i = min(max(minute - day.open, 0), len(day.dist) - 1)
    pv, M = day.dist[i], day.fleet[i]
    tail = lambda x: wait_tail(p, pv, M, x)  # noqa: E731
    return {
        "mean": wait_mean(p, pv, M),
        "q90": wait_quantile_mix(p, [(1.0, pv, M)], 0.9),
        "p10": 1 - tail(10),
        "p20": 1 - tail(20),
        "p30": 1 - tail(30),
        "fleet": M,
    }


def required_fleet_by_hour(p: ZoneParams, open_: int, close: int, lam_arr, max_fleet: int = 8, std: ServiceStandard = TOURIST_STANDARD):
    req: dict[int, int] = {}
    hours: list[int] = []
    for M in range(1, max_fleet + 1):
        run = simulate_day(p, open_, close, lam_arr, [M] * (close - open_), std)
        if M == 1:
            hours = [h.hour for h in run.hours]
        for h in run.hours:
            if h.hour not in req and h.meets:
                req[h.hour] = M
        if all(h in req for h in hours):
            break
    return [{"hour": h, "required": req.get(h, max_fleet + 1)} for h in hours]
