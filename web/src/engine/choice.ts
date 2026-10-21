/**
 * Tourism engine ② — congestion-avoiding choice and dispersal.
 *   P(a | t) = exp(V_a − θ·CI_a(t+Δ)) / Σ_b exp(V_b − θ·CI_b(t+Δ))     (open sites of the same zone)
 *   HHI = Σ_a s_a²   (concentration of visits; lower = more dispersed)
 */
import { ciAt, inflow, isOpen, runModel, type CrowdForecast } from './crowd';

export const THETA = 1.6;
export const ADOPTION = 0.2; // share of visitors who follow the app's congestion-aware suggestion
export const LOOKAHEAD = 60; // min — forecast horizon used by the suggestion

export function choiceProbs(V: number[], CI: number[], theta = THETA, avail?: boolean[]): number[] {
  const u = V.map((v, i) => (avail && !avail[i] ? -Infinity : v - theta * CI[i]));
  const mx = Math.max(...u);
  const e = u.map((x) => (x === -Infinity ? 0 : Math.exp(x - mx)));
  const s = e.reduce((a, b) => a + b, 0);
  return e.map((x) => (s > 0 ? x / s : 0));
}

export const hhi = (shares: number[]): number => {
  const s = shares.reduce((a, b) => a + b, 0);
  return s > 0 ? shares.reduce((acc, v) => acc + (v / s) ** 2, 0) : 0;
};

export interface Alternative {
  k: number; // site index
  ci: number; // forecast CI on arrival
  prob: number; // choice probability under congestion avoidance
}

/** Ranked alternatives in the same zone for someone heading to site `from`, arriving at `t`. */
export function alternatives(f: CrowdForecast, from: number, t: number): Alternative[] {
  const zone = f.sites[from].zone;
  const avail = f.sites.map((s) => s.zone === zone && isOpen(s.spec, f.day, t));
  const V = f.sites.map((s) => Math.log(s.spec.pop));
  const CI = f.sites.map((_, k) => ciAt(f, k, t));
  const P = choiceProbs(V, CI, THETA, avail);
  return f.sites
    .map((_, k) => ({ k, ci: CI[k], prob: P[k] }))
    .filter((a) => a.k !== from && avail[a.k])
    .sort((a, b) => b.prob - a.prob);
}

export interface Dispersal {
  hhiBase: number;
  hhiApp: number;
  crowdedMinBase: number; // site-minutes with CI > 1
  crowdedMinApp: number;
  peakBase: number[]; // peak CI per site
  peakApp: number[];
  runBase: Float64Array[];
  runApp: Float64Array[];
}

/**
 * Effect of the app: a share `adoption` of the visitors arriving in a zone re-choose among the open
 * sites of that zone with the congestion-avoiding probabilities (forecast CI `lookahead` min ahead).
 * Utilities are calibrated to the base pattern (V_a(t) = log of the base inflow), so visitors are
 * shifted only because of the forecast congestion, never by the app's own preference.
 */
export function dispersal(f: CrowdForecast, adoption = ADOPTION, lookahead = LOOKAHEAD): Dispersal {
  const { sites, day } = f;
  const mult = f.multEst;
  const base = (k: number, t: number) => mult[k] * inflow(sites[k].spec, day, t);
  const cache = new Map<number, number[]>();
  const probsAt = (t: number): number[] => {
    let P = cache.get(t);
    if (!P) {
      P = new Array(sites.length).fill(0);
      const V = sites.map((_, j) => Math.log(Math.max(base(j, t), 1e-9)));
      for (const zone of ['A', 'B'] as const) {
        const avail = sites.map((s) => s.zone === zone && isOpen(s.spec, day, t));
        const CI = sites.map((_, j) => ciAt(f, j, t + lookahead));
        const Pz = choiceProbs(V, CI, THETA, avail);
        Pz.forEach((p, j) => (P![j] += p));
      }
      cache.set(t, P);
    }
    return P;
  };
  const appInflow = (k: number, t: number) => {
    const zone = sites[k].zone;
    const tot = sites.reduce((s, x, j) => s + (x.zone === zone ? base(j, t) : 0), 0);
    if (tot <= 0) return 0;
    return (1 - adoption) * base(k, t) + adoption * tot * probsAt(t)[k];
  };
  const runBase = runModel(sites, day, mult);
  const runApp = runModel(sites, day, mult, appInflow);
  const visits = (fn: (k: number, t: number) => number) =>
    sites.map((_, k) => {
      let v = 0;
      for (let t = 0; t < 24 * 60; t++) v += fn(k, t);
      return v;
    });
  const crowded = (run: Float64Array[]) => run.reduce((acc, arr, k) => acc + arr.reduce((a, n) => a + (n > sites[k].spec.K ? 1 : 0), 0), 0);
  const peaks = (run: Float64Array[]) => run.map((arr, k) => Math.max(...arr) / sites[k].spec.K);
  return {
    hhiBase: hhi(visits(base)),
    hhiApp: hhi(visits(appInflow)),
    crowdedMinBase: crowded(runBase),
    crowdedMinApp: crowded(runApp),
    peakBase: peaks(runBase),
    peakApp: peaks(runApp),
    runBase,
    runApp,
  };
}
