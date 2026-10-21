import { describe, expect, it } from 'vitest';
import { PLACES, ZONE_POLYGONS, placesInZone } from './places';

/** Ray casting on [lng, lat] rings. */
function inside(pt: [number, number], ring: [number, number][]): boolean {
  let hit = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (yi > pt[1] !== yj > pt[1] && pt[0] < ((xj - xi) * (pt[1] - yi)) / (yj - yi) + xi) hit = !hit;
  }
  return hit;
}

describe('places', () => {
  it('have unique ids', () => {
    expect(new Set(PLACES.map((p) => p.id)).size).toBe(PLACES.length);
  });

  it('lie inside the service area of their zone', () => {
    for (const p of PLACES) expect(inside([p.lng, p.lat], ZONE_POLYGONS[p.zone]), p.id).toBe(true);
  });

  it('park the extra cruise-day vehicle of zone B at the Yeongdo cruise terminal', () => {
    // vehicles are drawn at hubs in list order: 3 on a normal day, 4 on a cruise day
    const hubs = placesInZone('B').filter((p) => p.hub).map((p) => p.id);
    expect(hubs.slice(0, 4)).toEqual(['busanstn', 'nampo', 'huinnyeoul', 'ydcruise']);
  });
});
