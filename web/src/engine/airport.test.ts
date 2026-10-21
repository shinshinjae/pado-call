import { describe, expect, it } from 'vitest';
import {
  CHECKIN_BEFORE, EARLY_MAX, SEATS, departureSlots, executeGateway, gatewayKpis, planGateway, quoteArrival, readyAt, syntheticBookings,
} from './airport';
import type { DayType } from '../data/scenario';

const DAYS: DayType[] = ['weekday', 'weekend', 'cruise', 'drone'];

describe('airport gateway plan', () => {
  for (const day of DAYS) {
    it(`${day}: feasible trips (one zone, seats, no overlap, windows)`, () => {
      const plan = planGateway(syntheticBookings(day));
      for (const tr of plan.trips) {
        expect(tr.arrivals.reduce((s, b) => s + b.pax, 0)).toBeLessThanOrEqual(SEATS);
        expect(tr.departures.reduce((s, b) => s + b.pax, 0)).toBeLessThanOrEqual(SEATS);
        for (const b of [...tr.arrivals, ...tr.departures]) expect(b.zone).toBe(tr.zone);
        for (const b of tr.arrivals) expect(tr.depart).toBeGreaterThanOrEqual(readyAt(b) - 1e-9);
        for (const b of tr.departures) {
          const deadline = b.time - CHECKIN_BEFORE;
          expect(tr.back).toBeLessThanOrEqual(deadline + 1e-9);
          expect(tr.back).toBeGreaterThanOrEqual(deadline - EARLY_MAX - 1e-9);
        }
        expect(tr.back).toBeGreaterThan(tr.depart);
      }
      for (const v of [1, 2]) {
        const ts = plan.trips.filter((t) => t.van === v).sort((a, b) => a.depart - b.depart);
        for (let i = 1; i < ts.length; i++) expect(ts[i].depart).toBeGreaterThanOrEqual(ts[i - 1].back - 1e-9);
      }
      // every booking is either served exactly once or handed to the partner-taxi fallback
      const ids = plan.trips.flatMap((t) => [...t.arrivals, ...t.departures].map((b) => b.id));
      expect(new Set(ids).size).toBe(ids.length);
      expect(ids.length + plan.fallback.length).toBe(plan.bookings.length);
    });
  }

  it('meets the on-time departure KPI in Monte Carlo (≥ 90% on the demo days)', () => {
    for (const day of DAYS) expect(executeGateway(planGateway(syntheticBookings(day))).onTime).toBeGreaterThanOrEqual(0.9);
  });

  it('averages over virtual days are sensible', () => {
    const k = gatewayKpis('weekend', 6);
    expect(k.q).toBeGreaterThan(0.4);
    expect(k.q).toBeLessThan(1.5);
    expect(k.servedShare).toBeGreaterThan(0.75);
  });
});

describe('quotes', () => {
  it('arrival quote: depart after ready, ETA90 ≥ ETA50', () => {
    const q = quoteArrival('drone', 14 * 60 + 35, 'gwangalli', 2, 3, 40);
    expect(q.ok).toBe(true);
    expect(q.depart).toBeGreaterThanOrEqual(q.ready);
    expect(q.eta50).toBeGreaterThan(q.depart);
    expect(q.eta90).toBeGreaterThanOrEqual(q.eta50);
    expect(q.fare).toBe(20000);
    expect(q.delayed!.depart).toBeGreaterThanOrEqual(q.ready + 40 - 1e-9);
  });

  it('departure slots reach the airport within the check-in window', () => {
    const flight = 15 * 60;
    const slots = departureSlots('weekend', flight, 'nampo', 2);
    for (const s of slots) {
      expect(s.beforeFlight).toBeGreaterThanOrEqual(CHECKIN_BEFORE - 15);
      expect(s.pickup).toBeLessThan(s.airport50);
    }
  });
});
