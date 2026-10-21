/**
 * Demo scenarios (virtual demand — NOT measured data).
 * Pilot structure of the plan: airport gateway 2 vehicles + zone A (Haeundae·Gwangalli) 3 + zone B (old town·Yeongdo) 3;
 * on cruise days one A vehicle moves to B in the daytime and waits at the Yeongdo cruise terminal
 * (large cruise ships berth there; the North Port terminal takes ferries and smaller ships).
 */
import type { ZoneParams } from '../engine/drt';

export type ZoneId = 'A' | 'B';
export type DayType = 'weekday' | 'weekend' | 'cruise' | 'drone';

export const ZONE_PARAMS: Record<ZoneId, ZoneParams> = {
  // corridor length, ride length, speed, detour, dispatch delay, dwell, pooling proxy ξ
  A: { ellKm: 8, rideKm: 3.0, speedKmh: 18, detour: 1.3, t0: 1, dwell: 2, xi: 1.5 },
  B: { ellKm: 10, rideKm: 3.5, speedKmh: 18, detour: 1.3, t0: 1, dwell: 2, xi: 1.5 },
};

export const SERVICE_HOURS: Record<ZoneId, [number, number]> = {
  A: [10 * 60, 22 * 60],
  B: [9 * 60, 21 * 60],
};

/** Calls per day and hourly shares (sum 1) per zone and day type. */
const PROFILE: Record<ZoneId, Record<DayType, { calls: number; share: number[] }>> = {
  B: {
    // weekdays: about three quarters of weekend demand, same daily shape (the fleet stays at 3)
    weekday: { calls: 30, share: [0.05, 0.08, 0.1, 0.1, 0.105, 0.105, 0.1, 0.1, 0.09, 0.075, 0.055, 0.04] },
    weekend: { calls: 40, share: [0.05, 0.08, 0.1, 0.1, 0.105, 0.105, 0.1, 0.1, 0.09, 0.075, 0.055, 0.04] },
    cruise: { calls: 58, share: [0.09, 0.12, 0.115, 0.09, 0.08, 0.08, 0.085, 0.11, 0.095, 0.06, 0.045, 0.03] },
    drone: { calls: 40, share: [0.05, 0.08, 0.1, 0.1, 0.105, 0.105, 0.1, 0.1, 0.09, 0.075, 0.055, 0.04] },
  },
  A: {
    weekday: { calls: 30, share: [0.05, 0.06, 0.07, 0.07, 0.07, 0.07, 0.07, 0.09, 0.11, 0.12, 0.12, 0.1] },
    weekend: { calls: 42, share: [0.05, 0.06, 0.07, 0.08, 0.08, 0.08, 0.08, 0.09, 0.1, 0.1, 0.11, 0.1] },
    // cruise days are assumed to be weekdays: lower daytime demand in zone A
    cruise: { calls: 30, share: [0.05, 0.06, 0.07, 0.07, 0.07, 0.07, 0.07, 0.09, 0.11, 0.12, 0.12, 0.1] },
    drone: { calls: 52, share: [0.04, 0.05, 0.06, 0.07, 0.07, 0.07, 0.07, 0.08, 0.09, 0.1, 0.12, 0.18] },
  },
};

export function callsPerDay(z: ZoneId, d: DayType): number {
  return PROFILE[z][d].calls;
}

/** Calls per minute at minute-of-day t (piecewise constant per hour). */
export function lamAt(z: ZoneId, d: DayType, t: number): number {
  const [open, close] = SERVICE_HOURS[z];
  if (t < open || t >= close) return 0;
  const h = Math.floor((t - open) / 60);
  const pr = PROFILE[z][d];
  return (pr.calls * pr.share[h]) / 60;
}

/** Operating levers that the control dashboard can switch. */
export interface Levers {
  cruiseLend: boolean; // cruise day: one A vehicle serves B 09:00–18:00
  droneSupport: boolean; // drone Saturday: one B vehicle joins A after B closes (arrives 21:20)
  preBook: number; // drone Saturday: share of 20–22h return trips pre-booked as pooled batches (0..0.6)
}

export const DEFAULT_LEVERS: Levers = { cruiseLend: true, droneSupport: true, preBook: 0.3 };

/** Pooled pre-booked return batches use about half the vehicle time per group (efficiency 3.0 vs 1.5). */
export const PREBOOK_VEHICLE_FACTOR = 0.5;

/** Effective calls per minute for the on-demand queue (pre-booked batches pool several groups per trip). */
export function lamEff(z: ZoneId, d: DayType, t: number, lv: Levers = DEFAULT_LEVERS): number {
  const l = lamAt(z, d, t);
  if (z === 'A' && d === 'drone' && t >= 20 * 60) return l * (1 - lv.preBook + lv.preBook * PREBOOK_VEHICLE_FACTOR);
  return l;
}

/** Vehicles in service under the operating levers. */
export function fleetAt(z: ZoneId, d: DayType, t: number, lv: Levers = DEFAULT_LEVERS): number {
  const [open, close] = SERVICE_HOURS[z];
  if (t < open || t >= close) return 0;
  if (d === 'cruise' && lv.cruiseLend) {
    const day = t >= 9 * 60 && t < 18 * 60;
    if (z === 'B') return day ? 4 : 3;
    if (z === 'A') return day ? 2 : 3;
  }
  if (d === 'drone' && lv.droneSupport && z === 'A' && t >= 21 * 60 + 20) return 4;
  return 3;
}

export const AIRPORT_FLEET = 2;

export const DAY_TYPES: DayType[] = ['weekday', 'weekend', 'cruise', 'drone'];
