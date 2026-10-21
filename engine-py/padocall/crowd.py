"""Crowd forecast (Python reference): compartment model + ensemble Kalman filter.

    dN_a/dt = m_a·A_a(t) − N_a(t)/T_a,   CI_a = N_a / K_a

Discrete one-minute steps exactly as in web/src/engine/crowd.ts. The EnKF here draws its
random numbers from NumPy, so stochastic results agree with TypeScript statistically,
not digit by digit; the deterministic model agrees to round-off.
"""
from __future__ import annotations

import numpy as np

DAY_START = 6 * 60
DAY_END = 24 * 60


def inflow(site: dict, day: str, t: int) -> float:
    h = min(23, max(0, t // 60))
    return site["daily"][day] * site["profile"][day][h] / 60.0


def is_open(site: dict, day: str, t: int) -> bool:
    return site["profile"][day][min(23, max(0, t // 60))] > 0


def run_model(sites: list[dict], day: str, mult, inflow_fn=None) -> np.ndarray:
    """People on site per minute from DAY_START to DAY_END (inclusive); shape (sites, minutes)."""
    S = len(sites)
    out = np.zeros((S, DAY_END - DAY_START + 1))
    N = np.zeros(S)
    for t in range(DAY_START, DAY_END + 1):
        out[:, t - DAY_START] = N
        for k, s in enumerate(sites):
            A = inflow_fn(k, t) if inflow_fn else mult[k] * inflow(s, day, t)
            N[k] = max(0.0, N[k] + A - N[k] / s["T"])
    return out


def enkf_update(ens: np.ndarray, y: np.ndarray, obs_sd: np.ndarray, rng: np.random.Generator) -> np.ndarray:
    """Perturbed-observation EnKF analysis; H selects the first len(y) state components."""
    E, d = ens.shape
    p = len(y)
    X = ens - ens.mean(axis=0)
    PHt = X.T @ X[:, :p] / (E - 1)  # d × p
    HPHt = PHt[:p, :] + np.diag(obs_sd ** 2)
    innov = y + obs_sd * rng.standard_normal((E, p)) - ens[:, :p]  # E × p
    return ens + np.linalg.solve(HPHt, innov.T).T @ PHt.T


def crowd_forecast(sites: list[dict], day: str, now: int, seed: int = 2026, ensemble: int = 40,
                   obs_noise: float = 0.1, prior_sd: float = 0.25, truth_sd: float = 0.18,
                   hourly_sd: float = 0.08, walk: float = 0.03):
    """Identical-twin demo: hidden truth, hourly noisy observations until `now`, forecast afterwards."""
    rng = np.random.default_rng(seed)
    S = len(sites)
    mult_true = np.exp(truth_sd * rng.standard_normal(S) + (0.05 if day == "drone" else 0.0))
    wiggle = np.exp(hourly_sd * rng.standard_normal((S, 24)))
    truth = run_model(sites, day, mult_true, lambda k, t: mult_true[k] * wiggle[k, min(23, t // 60)] * inflow(sites[k], day, t))
    ens = [np.column_stack([np.zeros(ensemble), prior_sd * rng.standard_normal(ensemble)]) for _ in range(S)]
    L = DAY_END - DAY_START + 1
    mean = np.zeros((S, L))
    p_over = np.zeros((S, L))
    wig = np.ones((S, ensemble))
    for t in range(DAY_START, DAY_END + 1):
        i = t - DAY_START
        if t <= now and t % 60 == 0 and t > DAY_START:
            for k in range(S):
                yk = max(0.0, truth[k, i] * (1 + obs_noise * rng.standard_normal()))
                if truth[k, i] < 1 and not is_open(sites[k], day, t - 60):
                    continue
                ens[k] = enkf_update(ens[k], np.array([yk]), np.array([max(15.0, obs_noise * yk)]), rng)
                ens[k][:, 0] = np.maximum(ens[k][:, 0], 0)
        for k in range(S):
            mean[k, i] = ens[k][:, 0].mean()
            p_over[k, i] = (ens[k][:, 0] > sites[k]["K"]).mean()
        if t % 60 == 0:
            wig = np.exp(hourly_sd * rng.standard_normal((S, ensemble)))
        for k in range(S):
            n, th = ens[k][:, 0], ens[k][:, 1]
            A = np.exp(th) * wig[k] * inflow(sites[k], day, t)
            n_new = np.maximum(0, n + A - n / sites[k]["T"])
            th_new = th + walk * rng.standard_normal(ensemble) if t % 60 == 0 else th
            ens[k] = np.column_stack([n_new, th_new])
    mult_est = np.array([np.exp(e[:, 1]).mean() for e in ens])
    return {"truth": truth, "mean": mean, "p_over": p_over, "mult_true": mult_true, "mult_est": mult_est}
