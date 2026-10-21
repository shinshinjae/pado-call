import { describe, expect, it } from 'vitest';
import { crowdSites } from '../data/places';
import { mulberry32, normal } from './rng';
import {
  DAY_START, bestHour, ciAt, ciLevel, crowdForecast, enkfUpdate, runModel, solve, truthMultipliers, type Site,
} from './crowd';
import { alternatives, choiceProbs, dispersal, hhi } from './choice';

const sites: Site[] = crowdSites().map((p) => ({ id: p.id, zone: p.zone, spec: p.crowd! }));

describe('compartment model', () => {
  it('relaxes to N = A·T under constant inflow', () => {
    const s = sites[0];
    const A = 20; // people/min
    const run = runModel([s], 'weekend', [1], () => A);
    const last = run[0][run[0].length - 1];
    // discrete-time fixed point: N = A·T
    expect(last).toBeGreaterThan(0.99 * A * s.spec.T);
    expect(last).toBeLessThan(1.001 * A * s.spec.T);
  });
});

describe('linear algebra and EnKF', () => {
  it('solves a small system', () => {
    const X = solve([[4, 1], [2, 3]], [[1], [2]]);
    expect(X[0][0]).toBeCloseTo(0.1, 10);
    expect(X[1][0]).toBeCloseTo(0.6, 10);
  });

  it('matches the Kalman update for a linear-Gaussian scalar case', () => {
    const rand = mulberry32(42);
    const E = 6000;
    const m0 = 10;
    const P0 = 4;
    const R = 1;
    const y = 13;
    const ens = Array.from({ length: E }, () => [m0 + Math.sqrt(P0) * normal(rand)]);
    const post = enkfUpdate(ens, [y], [Math.sqrt(R)], rand);
    const mean = post.reduce((s, x) => s + x[0], 0) / E;
    const v = post.reduce((s, x) => s + (x[0] - mean) ** 2, 0) / (E - 1);
    const K = P0 / (P0 + R);
    expect(mean).toBeCloseTo(m0 + K * (y - m0), 1); // 12.4
    expect(v).toBeCloseTo((1 - K) * P0, 1); // 0.8
  });
});

describe('crowd forecast (EnKF, virtual data)', () => {
  it('learns the inflow multipliers of the day', () => {
    const f = crowdForecast(sites, 'cruise', 18 * 60);
    const truth = truthMultipliers(sites, 'cruise', 2026);
    const relErr = f.multEst.map((m, k) => Math.abs(m / truth[k] - 1));
    const mean = relErr.reduce((a, b) => a + b, 0) / relErr.length;
    expect(mean).toBeLessThan(0.1);
  });

  it('forecasts one hour ahead close to the hidden truth', () => {
    const now = 14 * 60;
    const f = crowdForecast(sites, 'cruise', now);
    const t = now + 60;
    const errs = sites.map((s, k) => Math.abs(ciAt(f, k, t) - f.truth[k][t - DAY_START] / s.spec.K));
    expect(Math.max(...errs)).toBeLessThan(0.15);
  });

  it('flags the drone-show evening at Gwangalli as crowded', () => {
    const f = crowdForecast(sites, 'drone', 19 * 60);
    const k = sites.findIndex((s) => s.id === 'gwangalli');
    expect(ciLevel(ciAt(f, k, 21 * 60))).toBe(3);
    expect(f.pOver1[k][21 * 60 - DAY_START]).toBeGreaterThan(0.9);
  });

  it('suggests a calmer hour for Gamcheon on a cruise day', () => {
    const f = crowdForecast(sites, 'cruise', 11 * 60);
    const k = sites.findIndex((s) => s.id === 'gamcheon');
    const best = bestHour(f, k, 11 * 60)!;
    expect(best.ci).toBeLessThan(ciAt(f, k, 13 * 60));
  });
});

describe('congestion-avoiding choice', () => {
  it('is a probability vector and penalises congestion', () => {
    const P = choiceProbs([0, 0, 0], [0.2, 0.9, 1.4]);
    expect(P.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 12);
    expect(P[0]).toBeGreaterThan(P[1]);
    expect(P[1]).toBeGreaterThan(P[2]);
  });

  it('reduces to attractiveness shares without the penalty', () => {
    const pop = [1, 0.5, 0.5];
    const P = choiceProbs(pop.map(Math.log), [3, 0, 1], 0);
    expect(P[0]).toBeCloseTo(0.5, 12);
  });

  it('excludes unavailable sites', () => {
    const P = choiceProbs([0, 0], [0, 0], 1.6, [true, false]);
    expect(P).toEqual([1, 0]);
  });

  it('HHI of equal shares is 1/n', () => {
    expect(hhi([2, 2, 2, 2])).toBeCloseTo(0.25, 12);
  });

  it('offers open alternatives in the same zone only', () => {
    const f = crowdForecast(sites, 'drone', 19 * 60);
    const k = sites.findIndex((s) => s.id === 'gwangalli');
    const alt = alternatives(f, k, 20 * 60 + 30);
    expect(alt.length).toBeGreaterThan(0);
    for (const a of alt) {
      expect(sites[a.k].zone).toBe('A');
      expect(sites[a.k].spec.profile.drone[20]).toBeGreaterThan(0);
    }
  });

  it('dispersal lowers crowding and concentration on a cruise day', () => {
    const f = crowdForecast(sites, 'cruise', 12 * 60);
    const d = dispersal(f);
    expect(d.crowdedMinApp).toBeLessThan(d.crowdedMinBase);
    expect(d.hhiApp).toBeLessThan(d.hhiBase);
  });

  it('does not move anyone when nothing is crowded and all sites are equally busy', () => {
    const P = choiceProbs([Math.log(3), Math.log(1)], [0.4, 0.4]);
    expect(P[0]).toBeCloseTo(0.75, 12);
  });
});

describe('determinism', () => {
  it('same seed, same forecast', () => {
    const a = crowdForecast(sites, 'weekend', 15 * 60);
    const b = crowdForecast(sites, 'weekend', 15 * 60);
    expect(Array.from(a.mean[0])).toEqual(Array.from(b.mean[0]));
  });
});
