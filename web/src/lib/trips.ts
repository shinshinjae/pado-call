/** Trip status shown to the passenger, and the driver-side check of a scanned boarding pass. */
import type { TripRecord } from '../state';
import { normCode, readBoardingToken, type BoardingClaims } from './boarding';

export type TripStatus = 'booked' | 'coming' | 'waiting' | 'onboard' | 'done';

/**
 * Boarding is confirmed only by the QR scan: before it the shuttle is on its way (or booked);
 * once the pickup time has passed it waits for the scan. Trips booked before QR passes existed
 * (no token) keep the old clock-based progress.
 */
export function tripStatus(tr: TripRecord, clock: number, day: string): TripStatus {
  if (tr.boardedAt != null) return clock < tr.boardedAt + Math.max(1, tr.arrive - tr.pickup) ? 'onboard' : 'done';
  if (tr.day !== day) return 'booked';
  if (clock < tr.pickup) return tr.kind === 'ride' ? 'coming' : 'booked';
  if (!tr.token) return clock < tr.arrive ? 'onboard' : 'done';
  return 'waiting';
}

/** One entry of the driver's boarding log (kept on the driver's device). */
export interface BoardLog {
  at: number; // demo minute of the scan
  claims: BoardingClaims;
}

export type ScanResult =
  | { kind: 'ok'; claims: BoardingClaims; trip?: TripRecord } // no trip → pass issued on another device
  | { kind: 'used'; claims: BoardingClaims; at: number }
  | { kind: 'cancelled'; claims: BoardingClaims }
  | { kind: 'invalid'; reason: 'format' | 'signature' }
  | { kind: 'notfound'; code: string };

/** Check a scanned QR text or a typed backup code against this device's trips and boarding log. */
export function checkScan(raw: string, trips: TripRecord[], log: BoardLog[]): ScanResult {
  const r = readBoardingToken(raw);
  if (!r.ok) {
    const code = normCode(raw);
    if (!code) return { kind: 'invalid', reason: r.reason };
    const trip = trips.find((x) => x.code === code && x.token);
    return trip?.token ? checkScan(trip.token, trips, log) : { kind: 'notfound', code };
  }
  const { claims } = r;
  const trip = trips.find((x) => x.code === claims.c);
  if (trip?.cancelled) return { kind: 'cancelled', claims };
  if (trip?.boardedAt != null) return { kind: 'used', claims, at: trip.boardedAt };
  const prev = log.find((x) => x.claims.c === claims.c);
  if (prev) return { kind: 'used', claims, at: prev.at };
  return { kind: 'ok', claims, trip };
}
