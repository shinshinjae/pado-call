/**
 * Road routes drawn on the map, precomputed with an OSRM car router on OpenStreetMap data
 * (scripts/fetch_routes.ts, GitHub Actions "road routes"). Keys: `from>to` with place ids,
 * `airport` and `area:<hotel area id>`.
 */
import data from './routes.json';

export type LngLat = [number, number];
interface Stored {
  p: string; // encoded polyline (precision 5)
  m: number; // road distance (m)
  s: number; // free-flow driving time (s)
}

const ROUTES: Record<string, Stored> = (data as { routes: Record<string, Stored> }).routes;
export const ROUTE_SOURCE: string = (data as { meta: { source: string } }).meta.source;

/** Decode a Google-format polyline (lat/lng pairs, precision 5) into [lng, lat] points. */
export function decodePolyline(s: string): LngLat[] {
  const out: LngLat[] = [];
  let i = 0;
  let lat = 0;
  let lng = 0;
  while (i < s.length) {
    for (let k = 0; k < 2; k++) {
      let shift = 0;
      let result = 0;
      let b: number;
      do {
        b = s.charCodeAt(i++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);
      const d = result & 1 ? ~(result >> 1) : result >> 1;
      if (k === 0) lat += d;
      else lng += d;
    }
    out.push([lng / 1e5, lat / 1e5]);
  }
  return out;
}

const cache = new Map<string, LngLat[]>();

/** Road route between two keys, or null when it was not precomputed. */
export function roadRoute(from: string, to: string): { line: LngLat[]; km: number } | null {
  const key = `${from}>${to}`;
  const r = ROUTES[key];
  if (!r) return null;
  let line = cache.get(key);
  if (!line) {
    line = decodePolyline(r.p);
    cache.set(key, line);
  }
  return { line, km: r.m / 1000 };
}
