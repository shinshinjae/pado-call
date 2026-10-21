import { describe, expect, it } from 'vitest';
import { AIRPORT, AREAS, PLACES, haversineKm } from './places';
import { decodePolyline, roadRoute } from './routes';
import { rideMinutes } from '../engine/ops';

const near = (a: [number, number], b: { lng: number; lat: number }) => haversineKm({ lng: a[0], lat: a[1] }, b);

describe('road routes', () => {
  it('decode the Google polyline example', () => {
    const pts = decodePolyline('_p~iF~ps|U_ulLnnqC_mqNvxq`@');
    expect(pts).toEqual([
      [-120.2, 38.5],
      [-120.95, 40.7],
      [-126.453, 43.252],
    ]);
  });

  it('exist for every pair of places in a zone, start and end at the places, and are not shorter than the straight line', () => {
    for (const a of PLACES)
      for (const b of PLACES) {
        if (a.id === b.id || a.zone !== b.zone) continue;
        const r = roadRoute(a.id, b.id);
        expect(r, `${a.id}>${b.id}`).not.toBeNull();
        const line = r!.line;
        expect(line.length).toBeGreaterThan(1);
        expect(near(line[0], a)).toBeLessThan(0.2);
        expect(near(line[line.length - 1], b)).toBeLessThan(0.2);
        expect(r!.km).toBeGreaterThanOrEqual(haversineKm(a, b));
      }
  });

  it('exist both ways between the airport and every hotel area', () => {
    for (const ar of AREAS) {
      for (const [f, t, start, end] of [
        ['airport', `area:${ar.id}`, AIRPORT, ar],
        [`area:${ar.id}`, 'airport', ar, AIRPORT],
      ] as const) {
        const r = roadRoute(f, t);
        expect(r, `${f}>${t}`).not.toBeNull();
        expect(near(r!.line[0], start)).toBeLessThan(0.2);
        expect(near(r!.line[r!.line.length - 1], end)).toBeLessThan(0.2);
      }
    }
  });

  it('give ride times from the road distance at the zone speed', () => {
    // Haeundae → Gwangalli: 4.6 km of road at 18 km/h, plus a minute to board
    expect(rideMinutes('haeundae', 'gwangalli')).toBe(Math.round((60 * roadRoute('haeundae', 'gwangalli')!.km) / 18 + 1));
    for (const a of PLACES) for (const b of PLACES) if (a.id !== b.id && a.zone === b.zone) expect(rideMinutes(a.id, b.id)).toBeGreaterThanOrEqual(4);
  });
});
