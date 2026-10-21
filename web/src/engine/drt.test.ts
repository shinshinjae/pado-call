import { describe, expect, it } from 'vitest';
import { cycleMin, deathRates, erlangTail, kappa, requiredFleetByHour, simulateDay, stepForward, waitMean, waitTail } from './drt';
import { fleetAt, lamAt, lamEff, SERVICE_HOURS, ZONE_PARAMS, type Levers } from '../data/scenario';

describe('geometry', () => {
  it('kappa(1) = 1/3 (mean distance between two uniform points)', () => {
    expect(kappa(1)).toBeCloseTo(1 / 3, 12);
  });
  it('kappa decreases with more idle vehicles', () => {
    for (let I = 1; I < 10; I++) expect(kappa(I + 1)).toBeLessThan(kappa(I));
  });
});

describe('forward equation', () => {
  it('conserves probability mass', () => {
    const p = ZONE_PARAMS.B;
    const N = 40;
    let pv: Float64Array = new Float64Array(N + 1);
    pv[0] = 1;
    const mu = deathRates(p, 3, N);
    for (let t = 0; t < 300; t++) pv = stepForward(pv, 0.1, mu);
    const s = pv.reduce((a, b) => a + b, 0);
    expect(s).toBeCloseTo(1, 10);
    pv.forEach((v) => expect(v).toBeGreaterThanOrEqual(-1e-14));
  });

  it('matches the M/M/1 stationary law for a single server', () => {
    // with M = 1 every completion has rate 1/τ(1): the chain is M/M/1 with ρ = λ τ(1)
    const p = ZONE_PARAMS.B;
    const tau = cycleMin(p, 1);
    const lam = 0.5 / tau; // ρ = 0.5
    const N = 60;
    let pv: Float64Array = new Float64Array(N + 1);
    pv[0] = 1;
    const mu = deathRates(p, 1, N);
    for (let t = 0; t < 4000; t++) pv = stepForward(pv, lam, mu);
    for (let n = 0; n < 6; n++) expect(pv[n]).toBeCloseTo(0.5 * Math.pow(0.5, n), 4);
  });
});

describe('wait distribution', () => {
  it('Erlang tail of one stage is the exponential tail', () => {
    expect(erlangTail(1, 0.2, 5)).toBeCloseTo(Math.exp(-1), 12);
  });
  it('more vehicles never increase the mean wait or the 30-min tail', () => {
    const p = ZONE_PARAMS.B;
    const [o, c] = SERVICE_HOURS.B;
    const r3 = simulateDay(p, o, c, (t) => lamAt('B', 'cruise', t), () => 3);
    const r4 = simulateDay(p, o, c, (t) => lamAt('B', 'cruise', t), () => 4);
    r3.hours.forEach((h, k) => {
      expect(r4.hours[k].mean).toBeLessThanOrEqual(h.mean + 1e-9);
      expect(r4.hours[k].p30).toBeLessThanOrEqual(h.p30 + 1e-9);
    });
  });
  it('tail and mean are consistent (mean ≥ ∫ tail on a grid, roughly)', () => {
    const p = ZONE_PARAMS.A;
    const pv = new Float64Array(50);
    pv[0] = 0.5;
    pv[2] = 0.3;
    pv[4] = 0.2;
    let integral = 0;
    for (let x = 0; x < 200; x += 0.05) integral += 0.05 * waitTail(p, pv, 3, x);
    expect(integral).toBeCloseTo(waitMean(p, pv, 3), 1);
  });
});

describe('pilot scenario (virtual demand)', () => {
  it('zone B: 3 vehicles suffice on a normal day, cruise day needs the 4th vehicle', () => {
    const p = ZONE_PARAMS.B;
    const [o, c] = SERVICE_HOURS.B;
    const normal = simulateDay(p, o, c, (t) => lamAt('B', 'weekend', t), (t) => fleetAt('B', 'weekend', t));
    expect(normal.meetShare).toBe(1);
    const cruise3 = simulateDay(p, o, c, (t) => lamAt('B', 'cruise', t), () => 3);
    expect(cruise3.meetShare).toBeLessThan(1);
    const cruise = simulateDay(p, o, c, (t) => lamAt('B', 'cruise', t), (t) => fleetAt('B', 'cruise', t));
    expect(cruise.meetShare).toBe(1);
  });
  it('required fleet is between 1 and 9', () => {
    const [o, c] = SERVICE_HOURS.A;
    const req = requiredFleetByHour(ZONE_PARAMS.A, o, c, (t) => lamAt('A', 'drone', t), 8);
    req.forEach((r) => {
      expect(r.required).toBeGreaterThanOrEqual(1);
      expect(r.required).toBeLessThanOrEqual(9);
    });
  });
  it('zone A drone Saturday meets the standard only with the operating levers', () => {
    const p = ZONE_PARAMS.A;
    const [o, c] = SERVICE_HOURS.A;
    const none: Levers = { cruiseLend: false, droneSupport: false, preBook: 0 };
    const r0 = simulateDay(p, o, c, (t) => lamEff('A', 'drone', t, none), (t) => fleetAt('A', 'drone', t, none));
    expect(r0.meetShare).toBeLessThan(1);
    const r1 = simulateDay(p, o, c, (t) => lamEff('A', 'drone', t), (t) => fleetAt('A', 'drone', t));
    expect(r1.meetShare).toBe(1);
  });
  it('cruise day: lending one A vehicle keeps both zones within the standard', () => {
    for (const z of ['A', 'B'] as const) {
      const [o, c] = SERVICE_HOURS[z];
      const r = simulateDay(ZONE_PARAMS[z], o, c, (t) => lamEff(z, 'cruise', t), (t) => fleetAt(z, 'cruise', t));
      expect(r.meetShare).toBe(1);
    }
  });
});

describe('required fleet given the plan', () => {
  it('never exceeds the plan in hours the plan already serves within the standard, and flags real shortfalls', async () => {
    const { zoneDay, zoneRequired } = await import('./ops');
    const { DEFAULT_LEVERS } = await import('../data/scenario');
    for (const z of ['A', 'B'] as const)
      for (const d of ['weekday', 'weekend', 'cruise', 'drone'] as const) {
        const day = zoneDay(z, d, DEFAULT_LEVERS);
        const req = zoneRequired(z, d, DEFAULT_LEVERS);
        day.hours.forEach((h, k) => {
          if (h.meets) expect(req[k].required, `${z} ${d} ${h.hour}h`).toBeLessThanOrEqual(h.fleet);
        });
      }
    // cruise day without lending a vehicle to zone B: some daytime hours need a 4th vehicle
    const noLend = { ...DEFAULT_LEVERS, cruiseLend: false };
    const day = zoneDay('B', 'cruise', noLend);
    const req = zoneRequired('B', 'cruise', noLend);
    expect(day.hours.some((h, k) => req[k].required > h.fleet)).toBe(true);
  });
});
