/**
 * Tourism engine ① — crowd forecast.
 *   dN_a/dt = m_a · A_a(t) − N_a(t)/T_a,   CI_a = N_a / K_a
 * N_a: people on site, A_a: base inflow (people/min), T_a: mean dwell, K_a: comfortable capacity,
 * m_a: unknown inflow multiplier of the day (estimated).
 * A site-wise (localized) ensemble Kalman filter with perturbed observations assimilates hourly
 * observations (tourism-organisation concentration index, app check-ins, shuttle drop-offs → noisy
 * people counts) into the augmented state [N_a, log m_a]; the ensemble is then run forward.
 * All inputs are virtual demo data.
 */
import { mulberry32, normal } from './rng';
import type { CrowdSpec, PlaceId } from '../data/places';
import type { DayType, ZoneId } from '../data/scenario';

export const DAY_START = 6 * 60;
export const DAY_END = 24 * 60;
export const ENSEMBLE = 40;
export const OBS_NOISE = 0.1; // relative observation noise
export const PRIOR_SD = 0.25; // prior spread of log-multipliers
export const TRUTH_SD = 0.18; // spread of the demo day's true multipliers
export const TRUTH_HOURLY_SD = 0.08; // hour-to-hour fluctuation of the true inflow (not in the model)
export const PARAM_WALK = 0.03; // random walk of log-multipliers per hour

export interface Site {
  id: PlaceId;
  zone: ZoneId;
  spec: CrowdSpec;
}

const hourOf = (t: number) => Math.min(23, Math.max(0, Math.floor(t / 60)));

/** Base inflow (people/min) of a site at minute t. */
export const inflow = (s: CrowdSpec, day: DayType, t: number): number => (s.daily[day] * s.profile[day][hourOf(t)]) / 60;

/** A site is open (receives visitors) at minute t. */
export const isOpen = (s: CrowdSpec, day: DayType, t: number): boolean => s.profile[day][hourOf(t)] > 0;

/** Deterministic run of the compartment model; `inflowFn` overrides the inflow (people/min). */
export function runModel(
  sites: Site[],
  day: DayType,
  mult: number[],
  inflowFn?: (k: number, t: number) => number,
): Float64Array[] {
  const out = sites.map(() => new Float64Array(DAY_END - DAY_START + 1));
  const N = sites.map(() => 0);
  for (let t = DAY_START; t <= DAY_END; t++) {
    sites.forEach((s, k) => {
      out[k][t - DAY_START] = N[k];
      const A = inflowFn ? inflowFn(k, t) : mult[k] * inflow(s.spec, day, t);
      N[k] = Math.max(0, N[k] + A - N[k] / s.spec.T);
    });
  }
  return out;
}

/** True multipliers of the demo day (seeded). */
export function truthMultipliers(sites: Site[], day: DayType, seed: number): number[] {
  const rand = mulberry32(seed);
  return sites.map(() => Math.exp(TRUTH_SD * normal(rand) + (day === 'drone' ? 0.05 : 0)));
}

/** Hidden "reality" of the demo day: model + hour-to-hour fluctuations the forecaster does not know. */
export function truthRun(sites: Site[], day: DayType, seed: number): Float64Array[] {
  const mult = truthMultipliers(sites, day, seed);
  const rand = mulberry32(seed * 13 + 5);
  const wiggle = sites.map(() => Array.from({ length: 24 }, () => Math.exp(TRUTH_HOURLY_SD * normal(rand))));
  return runModel(sites, day, mult, (k, t) => mult[k] * wiggle[k][hourOf(t)] * inflow(sites[k].spec, day, t));
}

/** Gauss–Jordan solve of a small dense system A X = B (A: n×n, B: n×m). */
export function solve(A: number[][], B: number[][]): number[][] {
  const n = A.length;
  const m = B[0].length;
  const M = A.map((row, i) => [...row, ...B[i]]);
  for (let c = 0; c < n; c++) {
    let piv = c;
    for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[piv][c])) piv = r;
    [M[c], M[piv]] = [M[piv], M[c]];
    const d = M[c][c] || 1e-12;
    for (let j = c; j < n + m; j++) M[c][j] /= d;
    for (let r = 0; r < n; r++) {
      if (r === c) continue;
      const f = M[r][c];
      if (f === 0) continue;
      for (let j = c; j < n + m; j++) M[r][j] -= f * M[c][j];
    }
  }
  return M.map((row) => row.slice(n));
}

const transpose = (M: number[][]): number[][] => M[0].map((_, j) => M.map((row) => row[j]));

/**
 * One EnKF analysis with perturbed observations. The observation operator H selects the first
 * p = y.length components of the state.
 */
export function enkfUpdate(ens: number[][], y: number[], obsSd: number[], rand: () => number): number[][] {
  const E = ens.length;
  const d = ens[0].length;
  const p = y.length;
  const mean = new Array(d).fill(0);
  ens.forEach((x) => x.forEach((v, j) => (mean[j] += v / E)));
  const X = ens.map((x) => x.map((v, j) => v - mean[j]));
  const PHt = Array.from({ length: d }, () => new Array(p).fill(0));
  for (let e = 0; e < E; e++) for (let i = 0; i < d; i++) for (let j = 0; j < p; j++) PHt[i][j] += (X[e][i] * X[e][j]) / (E - 1);
  const HPHt = Array.from({ length: p }, (_, i) => Array.from({ length: p }, (_, j) => PHt[i][j] + (i === j ? obsSd[i] ** 2 : 0)));
  const innov = ens.map((x) => y.map((yi, j) => yi + obsSd[j] * normal(rand) - x[j]));
  const S = solve(HPHt, transpose(innov)); // p × E
  return ens.map((x, e) => x.map((v, i) => v + PHt[i].reduce((s, val, j) => s + val * S[j][e], 0)));
}

export interface CrowdForecast {
  sites: Site[];
  day: DayType;
  now: number;
  truth: Float64Array[]; // hidden reality (per site, per minute from DAY_START)
  obs: { t: number; y: number[] }[]; // hourly observations assimilated
  mean: Float64Array[]; // analysis up to now, forecast afterwards
  sd: Float64Array[];
  pOver1: Float64Array[]; // P(CI > 1) from the ensemble
  multEst: number[]; // estimated inflow multipliers at `now`
}

/** Assimilate hourly observations up to `now` (site by site), then forecast to the end of the day. */
export function crowdForecast(sites: Site[], day: DayType, now: number, seed = 2026): CrowdForecast {
  const truth = truthRun(sites, day, seed);
  const rand = mulberry32(seed * 7 + 1);
  const len = DAY_END - DAY_START + 1;
  const mean = sites.map(() => new Float64Array(len));
  const sd = sites.map(() => new Float64Array(len));
  const pOver1 = sites.map(() => new Float64Array(len));
  const obs: { t: number; y: number[] }[] = [];
  // ensemble per site: [N, log m]
  let ens: number[][][] = sites.map(() => Array.from({ length: ENSEMBLE }, () => [0, PRIOR_SD * normal(rand)]));
  let multEst = sites.map(() => 1);
  let wig: number[][] = sites.map(() => new Array(ENSEMBLE).fill(1));
  for (let t = DAY_START; t <= DAY_END; t++) {
    const i = t - DAY_START;
    if (t <= now && t % 60 === 0 && t > DAY_START) {
      const y = sites.map((_, k) => Math.max(0, truth[k][i] * (1 + OBS_NOISE * normal(rand))));
      obs.push({ t, y });
      ens = ens.map((E, k) => {
        if (truth[k][i] < 1 && !isOpen(sites[k].spec, day, t - 60)) return E; // closed and empty: nothing to learn
        const sdObs = Math.max(15, OBS_NOISE * y[k]);
        return enkfUpdate(E, [y[k]], [sdObs], rand).map(([n, th]) => [Math.max(0, n), th]);
      });
    }
    if (t === now) multEst = ens.map((E) => E.reduce((s, x) => s + Math.exp(x[1]), 0) / ENSEMBLE);
    sites.forEach((s, k) => {
      let m = 0;
      let m2 = 0;
      let over = 0;
      for (const x of ens[k]) {
        m += x[0];
        m2 += x[0] * x[0];
        if (x[0] > s.spec.K) over += 1;
      }
      m /= ENSEMBLE;
      mean[k][i] = m;
      sd[k][i] = Math.sqrt(Math.max(0, m2 / ENSEMBLE - m * m));
      pOver1[k][i] = over / ENSEMBLE;
    });
    // model error: each member draws its own hour-to-hour inflow fluctuation (stochastic forcing)
    if (t % 60 === 0) wig = sites.map(() => Array.from({ length: ENSEMBLE }, () => Math.exp(TRUTH_HOURLY_SD * normal(rand))));
    ens = ens.map((E, k) =>
      E.map(([n, th], e) => {
        const A = Math.exp(th) * wig[k][e] * inflow(sites[k].spec, day, t);
        return [Math.max(0, n + A - n / sites[k].spec.T), t % 60 === 0 ? th + PARAM_WALK * normal(rand) : th];
      }),
    );
  }
  if (now >= DAY_END) multEst = ens.map((E) => E.reduce((s, x) => s + Math.exp(x[1]), 0) / ENSEMBLE);
  return { sites, day, now, truth, obs, mean, sd, pOver1, multEst };
}

const idx = (f: CrowdForecast, k: number, t: number) => Math.min(Math.max(Math.round(t) - DAY_START, 0), f.mean[k].length - 1);
export const ciAt = (f: CrowdForecast, k: number, t: number): number => f.mean[k][idx(f, k, t)] / f.sites[k].spec.K;
export const ciSdAt = (f: CrowdForecast, k: number, t: number): number => f.sd[k][idx(f, k, t)] / f.sites[k].spec.K;
export const pOverAt = (f: CrowdForecast, k: number, t: number): number => f.pOver1[k][idx(f, k, t)];
export const truthCiAt = (f: CrowdForecast, k: number, t: number): number => f.truth[k][idx(f, k, t)] / f.sites[k].spec.K;

/** Hour (start minute) with the lowest forecast CI among the remaining open hours of the day. */
export function bestHour(f: CrowdForecast, k: number, from: number): { t: number; ci: number } | null {
  let best: { t: number; ci: number } | null = null;
  const start = Math.ceil(from / 60) * 60;
  for (let t = start; t < DAY_END; t += 60) {
    if (!isOpen(f.sites[k].spec, f.day, t)) continue;
    const ci = ciAt(f, k, t + 30);
    if (!best || ci < best.ci - 1e-9) best = { t, ci };
  }
  return best;
}

export type CiLevel = 0 | 1 | 2 | 3;
/** 4 levels: comfortable < 0.5 ≤ normal < 0.8 ≤ busy < 1.0 ≤ crowded */
export const ciLevel = (ci: number): CiLevel => (ci < 0.5 ? 0 : ci < 0.8 ? 1 : ci < 1 ? 2 : 3);
export const CI_COLORS = ['#22A06B', '#E2B203', '#F38A3F', '#E2483D'];
