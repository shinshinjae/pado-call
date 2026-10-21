import { describe, expect, it } from 'vitest';
import type { TripRecord } from '../state';
import { makeBoardingToken } from './boarding';
import { checkScan, tripStatus, type BoardLog } from './trips';

function trip(over: Partial<TripRecord> = {}): TripRecord {
  const base: TripRecord = {
    id: 't1', kind: 'ride', code: 'PD-RFJJ', day: 'drone', createdAt: 1170, pickup: 1178, arrive: 1192, zone: 'A',
    from: 'gwangalli', to: 'centum', pax: 2, fare: 6000, lang: 'ja', pay: { method: 'card', status: 'authorized' },
  };
  const tr = { ...base, ...over };
  if (!('token' in over)) {
    tr.token = makeBoardingToken({ c: tr.code, k: tr.kind, f: tr.from, t: tr.to, p: tr.pax, a: tr.fare, u: tr.pickup, d: tr.day, l: tr.lang ?? 'en', n: tr.note });
  }
  return tr;
}

describe('trip status', () => {
  it('waits for the QR scan instead of assuming the passenger boarded', () => {
    const tr = trip();
    expect(tripStatus(tr, 1170, 'drone')).toBe('coming');
    expect(tripStatus(tr, 1178, 'drone')).toBe('waiting');
    expect(tripStatus(tr, 1300, 'drone')).toBe('waiting');
    expect(tripStatus(tr, 1170, 'weekday')).toBe('booked');
    expect(tripStatus({ ...tr, kind: 'arr' }, 1170, 'drone')).toBe('booked');
  });

  it('is on board after the scan until the ride time has passed', () => {
    const tr = trip({ boardedAt: 1176 });
    expect(tripStatus(tr, 1176, 'drone')).toBe('onboard');
    expect(tripStatus(tr, 1176 + 14, 'drone')).toBe('done');
  });

  it('keeps clock-based progress for trips booked before QR passes', () => {
    const old = trip({ token: undefined });
    expect(tripStatus(old, 1180, 'drone')).toBe('onboard');
    expect(tripStatus(old, 1200, 'drone')).toBe('done');
  });
});

describe('driver scan', () => {
  const tr = trip();
  it('accepts a valid pass once', () => {
    const r = checkScan(tr.token!, [tr], []);
    expect(r.kind).toBe('ok');
    if (r.kind === 'ok') expect(r.trip?.id).toBe('t1');
    const log: BoardLog[] = [{ at: 1179, claims: (r as { claims: BoardLog['claims'] }).claims }];
    expect(checkScan(tr.token!, [tr], log)).toMatchObject({ kind: 'used', at: 1179 });
    expect(checkScan(tr.token!, [{ ...tr, boardedAt: 1181 }], [])).toMatchObject({ kind: 'used', at: 1181 });
  });

  it('accepts a pass issued on another device (no local trip)', () => {
    expect(checkScan(tr.token!, [], [])).toMatchObject({ kind: 'ok', trip: undefined });
  });

  it('refuses cancelled bookings and forged codes', () => {
    expect(checkScan(tr.token!, [{ ...tr, cancelled: true }], []).kind).toBe('cancelled');
    expect(checkScan(tr.token!.replace('|2|', '|3|'), [tr], [])).toEqual({ kind: 'invalid', reason: 'signature' });
    expect(checkScan('hello', [tr], [])).toEqual({ kind: 'invalid', reason: 'format' });
  });

  it('looks up a typed backup code on this device', () => {
    expect(checkScan('rfjj', [tr], []).kind).toBe('ok');
    expect(checkScan('PD-XXXX', [tr], [])).toEqual({ kind: 'notfound', code: 'PD-XXXX' });
  });
});
