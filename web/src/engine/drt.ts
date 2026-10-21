/**
 * DRT engine — wait-time distribution of an on-demand zone shuttle.
 *
 * The number of requests in the system n(t) (waiting + being served) is a birth–death
 * process with time-varying demand λ(t). Its probability distribution p_n(t) is propagated
 * minute by minute with the Kolmogorov forward equation (uniformization), following the
 * modelling approach of the team's prior study [1] in a simplified, generic form:
 *
 *   - pickup time with I idle vehicles spread over a corridor of length ℓ:
 *       E[distance to nearest idle vehicle] = κ(I)·ℓ,  κ(I) = (I+3) / (2(I+1)(I+2))
 *   - one service cycle  τ(I) = (t0 + pickup(I) + ride + dwell) / ξ
 *     (ξ ≥ 1 is an optimistic proxy for ride pooling; ξ = 1 means no pooling)
 *   - completion rate μ_n = Σ_{k≤n} 1/τ(M−k+1) for n ≤ M,  μ_n = M/τ(1) once a queue forms
 *   - an arriving request that sees n < M waits (t0 + pickup(M−n))/ξ;
 *     if it sees n ≥ M it first waits an Erlang(n−M+1, M/τ(1)) time for a vehicle to free up.
 *
 * [1] 신재완·김민수(2026), 「부산시 저수요 시내버스 운행의 수요응답형 교통 전환 조건:
 *     1분 단위 정류장 수요 재구성과 Kolmogorov 전진방정식 모형」, 대한교통학회지 투고 원고.
 *     No data or calibrated results of [1] are included here; all inputs are demo assumptions.
 */

export interface ZoneParams {
  ellKm: number; // zone corridor length (km)
  rideKm: number; // mean ride length (km)
  speedKmh: number;
  detour: number; // road detour factor
  t0: number; // dispatch delay (min)
  dwell: number; // boarding + alighting (min)
  xi: number; // pooling efficiency proxy (≥ 1)
}

export interface ServiceStandard {
  meanMax: number; // hourly mean wait ≤ meanMax (min)
  tailMin: number; // P(W > tailMin) ≤ tailProb
  tailProb: number;
}

/** Tourist standard of PADO CALL (stricter than the 20 / 40 min DRT standard of [1]). */
export const TOURIST_STANDARD: ServiceStandard = { meanMax: 15, tailMin: 30, tailProb: 0.05 };

export const kappa = (I: number): number => (I + 3) / (2 * (I + 1) * (I + 2));
export const pickupMin = (p: ZoneParams, I: number): number => (60 * p.detour * p.ellKm * kappa(I)) / p.speedKmh;
export const rideMin = (p: ZoneParams): number => (60 * p.detour * p.rideKm) / p.speedKmh;
export const cycleMin = (p: ZoneParams, I: number): number => (p.t0 + pickupMin(p, I) + rideMin(p) + p.dwell) / p.xi;
/** Wait of a request that finds I ≥ 1 idle vehicles. */
export const idleWait = (p: ZoneParams, I: number): number => (p.t0 + pickupMin(p, I)) / p.xi;

/** Completion rates μ_0..μ_N for a fleet of M vehicles. */
export function deathRates(p: ZoneParams, M: number, N: number): Float64Array {
  const mu = new Float64Array(N + 1);
  if (M <= 0) return mu;
  let acc = 0;
  const qRate = M / cycleMin(p, 1);
  for (let n = 1; n <= N; n++) {
    if (n <= M) {
      acc += 1 / cycleMin(p, M - n + 1);
      mu[n] = acc;
    } else {
      mu[n] = qRate;
    }
  }
  return mu;
}

/** One minute of the forward equation dp/dt = pQ by uniformization (birth λ, death μ_n, truncated at N). */
export function stepForward(pv: Float64Array, lam: number, mu: Float64Array, dt = 1): Float64Array {
  const N = pv.length - 1;
  let L = 0;
  for (let n = 0; n <= N; n++) {
    const out = (n < N ? lam : 0) + mu[n];
    if (out > L) L = out;
  }
  if (L <= 0) return pv.slice();
  const Lt = L * dt;
  const res = new Float64Array(N + 1);
  let term = pv.slice();
  let w = Math.exp(-Lt);
  let cum = w;
  for (let n = 0; n <= N; n++) res[n] += w * term[n];
  let k = 0;
  const next = new Float64Array(N + 1);
  while (cum < 1 - 1e-13 && k < 1000) {
    // next = term · P,  P = I + Q/L
    for (let m = 0; m <= N; m++) {
      const outM = (m < N ? lam : 0) + mu[m];
      let v = term[m] * (1 - outM / L);
      if (m > 0) v += term[m - 1] * (lam / L);
      if (m < N) v += term[m + 1] * (mu[m + 1] / L);
      next[m] = v;
    }
    term.set(next);
    k += 1;
    w *= Lt / k;
    cum += w;
    for (let n = 0; n <= N; n++) res[n] += w * term[n];
  }
  // renormalise the (tiny) truncation error
  let s = 0;
  for (let n = 0; n <= N; n++) s += res[n];
  if (s > 0) for (let n = 0; n <= N; n++) res[n] /= s;
  return res;
}

/** P(Erlang(j, rate) > s). */
export function erlangTail(j: number, rate: number, s: number): number {
  if (s <= 0) return 1;
  const x = rate * s;
  let term = Math.exp(-x);
  let sum = term;
  for (let i = 1; i < j; i++) {
    term *= x / i;
    sum += term;
  }
  return Math.min(1, sum);
}

/** P(W > x) for an arrival that sees the state distribution pv with M vehicles. */
export function waitTail(p: ZoneParams, pv: Float64Array, M: number, x: number): number {
  if (M <= 0) return 1;
  const N = pv.length - 1;
  const qRate = M / cycleMin(p, 1);
  const c1 = idleWait(p, 1);
  let tail = 0;
  for (let n = 0; n <= N; n++) {
    const pn = pv[n];
    if (pn < 1e-15) continue;
    if (n < M) {
      if (idleWait(p, M - n) > x) tail += pn;
    } else {
      tail += pn * erlangTail(n - M + 1, qRate, x - c1);
    }
  }
  return Math.min(1, tail);
}

/** Mean wait for an arrival that sees pv. */
export function waitMean(p: ZoneParams, pv: Float64Array, M: number): number {
  if (M <= 0) return Infinity;
  const N = pv.length - 1;
  const qRate = M / cycleMin(p, 1);
  const c1 = idleWait(p, 1);
  let m = 0;
  for (let n = 0; n <= N; n++) {
    const pn = pv[n];
    if (n < M) m += pn * idleWait(p, M - n);
    else m += pn * ((n - M + 1) / qRate + c1);
  }
  return m;
}

/** Smallest x (0.5-min grid) with P(W ≤ x) ≥ prob (bisection — the tail is non-increasing in x). */
export function waitQuantile(tailFn: (x: number) => number, prob: number, xmax = 180): number {
  const ok = (i: number) => 1 - tailFn(i * 0.5) >= prob;
  let hi = Math.round(xmax / 0.5);
  if (!ok(hi)) return xmax;
  let lo = 0;
  if (ok(lo)) return 0;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (ok(mid)) hi = mid;
    else lo = mid;
  }
  return hi * 0.5;
}

export interface HourStat {
  hour: number;
  calls: number; // expected calls in the hour
  fleet: number;
  mean: number; // arrival-weighted mean wait
  p30: number; // arrival-weighted P(W > 30)
  q90: number; // 90% quantile of the hour's wait mixture
  meets: boolean;
}

export interface DayResult {
  open: number; // minute of day
  close: number;
  dist: Float64Array[]; // state distribution seen by an arrival at each service minute
  lam: number[]; // calls per minute
  fleet: number[];
  hours: HourStat[];
  totalCalls: number;
  vehicleHours: number;
  q: number; // calls per vehicle-hour
  meetShare: number; // share of service hours meeting the standard
}

/**
 * Propagate one service day.
 * @param lamAt  calls per minute at minute-of-day t
 * @param fleetAt vehicles in service at minute-of-day t
 */
export function simulateDay(
  p: ZoneParams,
  open: number,
  close: number,
  lamAt: (t: number) => number,
  fleetAt: (t: number) => number,
  std: ServiceStandard = TOURIST_STANDARD,
  queueCap = 45,
): DayResult {
  let Mmax = 0;
  for (let t = open; t < close; t++) Mmax = Math.max(Mmax, fleetAt(t));
  const N = Mmax + queueCap;
  let pv: Float64Array = new Float64Array(N + 1);
  pv[0] = 1;
  const dist: Float64Array[] = [];
  const lam: number[] = [];
  const fleet: number[] = [];
  for (let t = open; t < close; t++) {
    const M = fleetAt(t);
    const l = lamAt(t);
    dist.push(pv);
    lam.push(l);
    fleet.push(M);
    pv = stepForward(pv, l, deathRates(p, M, N));
  }
  const hours: HourStat[] = [];
  for (let h = Math.floor(open / 60); h < Math.ceil(close / 60); h++) {
    const idx: number[] = [];
    for (let t = Math.max(open, h * 60); t < Math.min(close, (h + 1) * 60); t++) idx.push(t - open);
    if (!idx.length) continue;
    const wsum = idx.reduce((s, i) => s + lam[i], 0);
    const weights = idx.map((i) => (wsum > 0 ? lam[i] / wsum : 1 / idx.length));
    let mean = 0;
    let p30 = 0;
    idx.forEach((i, k) => {
      mean += weights[k] * waitMean(p, dist[i], fleet[i]);
      p30 += weights[k] * waitTail(p, dist[i], fleet[i], std.tailMin);
    });
    const tailMix = (x: number) => idx.reduce((s, i, k) => s + weights[k] * waitTail(p, dist[i], fleet[i], x), 0);
    const q90 = waitQuantile(tailMix, 0.9);
    const fl = Math.round(idx.reduce((s, i) => s + fleet[i], 0) / idx.length);
    hours.push({ hour: h, calls: wsum, fleet: fl, mean, p30, q90, meets: mean <= std.meanMax && p30 <= std.tailProb });
  }
  const totalCalls = lam.reduce((s, v) => s + v, 0);
  const vehicleHours = fleet.reduce((s, v) => s + v, 0) / 60;
  return {
    open,
    close,
    dist,
    lam,
    fleet,
    hours,
    totalCalls,
    vehicleHours,
    q: vehicleHours > 0 ? totalCalls / vehicleHours : 0,
    meetShare: hours.length ? hours.filter((x) => x.meets).length / hours.length : 0,
  };
}

/**
 * Fewest vehicles that keep each hour within the standard, given the planned operation until that hour:
 * the queue carried into the hour is the one the plan produced, so an hour the plan already serves
 * within the standard never needs more vehicles than the plan has.
 */
export function requiredFleetGivenPlan(
  p: ZoneParams,
  day: DayResult,
  maxFleet = 8,
  std: ServiceStandard = TOURIST_STANDARD,
  queueCap = 45,
): { hour: number; required: number }[] {
  const N = maxFleet + queueCap;
  return day.hours.map((h) => {
    const idx: number[] = [];
    for (let t = Math.max(day.open, h.hour * 60); t < Math.min(day.close, (h.hour + 1) * 60); t++) idx.push(t - day.open);
    const wsum = idx.reduce((s, i) => s + day.lam[i], 0);
    const start = day.dist[idx[0]];
    for (let M = 1; M <= maxFleet; M++) {
      let pv: Float64Array = new Float64Array(N + 1);
      pv.set(start.subarray(0, Math.min(start.length, N + 1)));
      const dr = deathRates(p, M, N);
      let mean = 0;
      let p30 = 0;
      for (const i of idx) {
        const w = wsum > 0 ? day.lam[i] / wsum : 1 / idx.length;
        mean += w * waitMean(p, pv, M);
        p30 += w * waitTail(p, pv, M, std.tailMin);
        pv = stepForward(pv, day.lam[i], dr);
      }
      if (mean <= std.meanMax && p30 <= std.tailProb) return { hour: h.hour, required: M };
    }
    return { hour: h.hour, required: maxFleet + 1 };
  });
}

/** Wait summary for one arrival minute (for the Call screen). */
export function waitSummary(p: ZoneParams, day: DayResult, minuteOfDay: number) {
  const i = Math.min(Math.max(minuteOfDay - day.open, 0), day.dist.length - 1);
  const pv = day.dist[i];
  const M = day.fleet[i];
  const tail = (x: number) => waitTail(p, pv, M, x);
  return {
    mean: waitMean(p, pv, M),
    q90: waitQuantile(tail, 0.9),
    p10: 1 - tail(10),
    p20: 1 - tail(20),
    p30: 1 - tail(30),
    fleet: M,
    busyMean: Array.from(pv).reduce((s, v, n) => s + v * Math.min(n, M), 0),
  };
}

/** Minimum constant fleet per hour that meets the standard (1..maxFleet; maxFleet+1 means "more"). */
export function requiredFleetByHour(
  p: ZoneParams,
  open: number,
  close: number,
  lamAt: (t: number) => number,
  maxFleet = 8,
  std: ServiceStandard = TOURIST_STANDARD,
): { hour: number; required: number }[] {
  // increase the fleet only while some hour still misses the standard
  const req: number[] = [];
  let hours: number[] = [];
  for (let M = 1; M <= maxFleet; M++) {
    const run = simulateDay(p, open, close, lamAt, () => M, std);
    if (M === 1) hours = run.hours.map((h) => h.hour);
    run.hours.forEach((h, k) => {
      if (req[k] === undefined && h.meets) req[k] = M;
    });
    if (hours.every((_, k) => req[k] !== undefined)) break;
  }
  return hours.map((hour, k) => ({ hour, required: req[k] ?? maxFleet + 1 }));
}
