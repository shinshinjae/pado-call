/**
 * Precompute road routes for every line the app draws — place pairs inside each zone and
 * airport ↔ hotel areas — with an OSRM car router on OpenStreetMap data, and write
 * src/data/routes.json (encoded polylines + road distance and time).
 *
 * Needs internet access: `npm run routes` (or the "road routes" GitHub Actions workflow).
 * ROUTES_MOCK=1 writes straight lines instead, to test the pipeline offline.
 */
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { AIRPORT, AREAS, PLACES, haversineKm } from '../src/data/places';

type LngLat = [number, number];
interface Pt {
  key: string;
  lat: number;
  lng: number;
}
interface Route {
  p: string; // encoded polyline (precision 5, lat/lng order as in the Google format)
  m: number; // road distance (m)
  s: number; // free-flow driving time (s)
}

const SERVERS = ['https://router.project-osrm.org/route/v1/driving/', 'https://routing.openstreetmap.de/routed-car/route/v1/driving/'];
const UA = 'pado-call route precompute (https://github.com/jaewansh/pado-call)';
const SIMPLIFY_M = 4;
const MOCK = process.env.ROUTES_MOCK === '1';
const OUT = fileURLToPath(new URL('../src/data/routes.json', import.meta.url));
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Ramer–Douglas–Peucker on local metric coordinates. */
function simplify(pts: LngLat[], tol: number): LngLat[] {
  if (pts.length < 3) return pts;
  const lat0 = (pts[0][1] * Math.PI) / 180;
  const xy = pts.map(([lng, lat]) => [6371000 * ((lng * Math.PI) / 180) * Math.cos(lat0), 6371000 * ((lat * Math.PI) / 180)]);
  const keep = new Uint8Array(pts.length);
  keep[0] = keep[pts.length - 1] = 1;
  const stack: [number, number][] = [[0, pts.length - 1]];
  while (stack.length) {
    const [i, j] = stack.pop()!;
    const [ax, ay] = xy[i];
    const [bx, by] = xy[j];
    const dx = bx - ax;
    const dy = by - ay;
    const len2 = dx * dx + dy * dy;
    let far = -1;
    let best = tol;
    for (let k = i + 1; k < j; k++) {
      const [px, py] = xy[k];
      const t = len2 ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / len2)) : 0;
      const d = Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
      if (d > best) {
        best = d;
        far = k;
      }
    }
    if (far > 0) {
      keep[far] = 1;
      stack.push([i, far], [far, j]);
    }
  }
  return pts.filter((_, k) => keep[k]);
}

function encodeSigned(v: number): string {
  let s = v < 0 ? ~(v << 1) : v << 1;
  let out = '';
  while (s >= 0x20) {
    out += String.fromCharCode((0x20 | (s & 0x1f)) + 63);
    s >>= 5;
  }
  return out + String.fromCharCode(s + 63);
}

function encode(pts: LngLat[]): string {
  let plat = 0;
  let plng = 0;
  let out = '';
  for (const [lng, lat] of pts) {
    const la = Math.round(lat * 1e5);
    const ln = Math.round(lng * 1e5);
    out += encodeSigned(la - plat) + encodeSigned(ln - plng);
    plat = la;
    plng = ln;
  }
  return out;
}

async function route(a: Pt, b: Pt): Promise<{ line: LngLat[]; m: number; s: number; via: string } | null> {
  if (MOCK) return { line: [[a.lng, a.lat], [b.lng, b.lat]], m: Math.round(1300 * haversineKm(a, b)), s: Math.round(150 * haversineKm(a, b)), via: 'mock' };
  const coords = `${a.lng.toFixed(5)},${a.lat.toFixed(5)};${b.lng.toFixed(5)},${b.lat.toFixed(5)}`;
  for (const base of SERVERS) {
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const res = await fetch(`${base}${coords}?overview=full&geometries=geojson&steps=false`, { headers: { 'User-Agent': UA } });
        if (res.ok) {
          const d = (await res.json()) as { code: string; routes?: { geometry: { coordinates: LngLat[] }; distance: number; duration: number }[] };
          if (d.code === 'Ok' && d.routes?.length) {
            const r = d.routes[0];
            return { line: r.geometry.coordinates, m: Math.round(r.distance), s: Math.round(r.duration), via: new URL(base).host };
          }
          console.warn(`  ${a.key} → ${b.key}: ${d.code} at ${base}`);
          break;
        }
        console.warn(`  ${a.key} → ${b.key}: HTTP ${res.status} at ${base}`);
      } catch (e) {
        console.warn(`  ${a.key} → ${b.key}: ${(e as Error).message} at ${base}`);
      }
      await sleep(2000 * (attempt + 1));
    }
  }
  return null;
}

async function main() {
  const pairs: [Pt, Pt][] = [];
  for (const z of ['A', 'B'] as const) {
    const ps = PLACES.filter((p) => p.zone === z).map((p) => ({ key: p.id, lat: p.lat, lng: p.lng }));
    for (const a of ps) for (const b of ps) if (a.key !== b.key) pairs.push([a, b]);
  }
  const airport: Pt = { key: 'airport', ...AIRPORT };
  for (const ar of AREAS) {
    const p: Pt = { key: `area:${ar.id}`, lat: ar.lat, lng: ar.lng };
    pairs.push([airport, p], [p, airport]);
  }

  const routes: Record<string, Route> = {};
  const missing: string[] = [];
  for (const [a, b] of pairs) {
    const r = await route(a, b);
    const key = `${a.key}>${b.key}`;
    if (!r) {
      missing.push(key);
      continue;
    }
    const line = simplify(r.line, SIMPLIFY_M);
    routes[key] = { p: encode(line), m: r.m, s: r.s };
    const ratio = r.m / 1000 / haversineKm(a, b);
    console.log(`${key.padEnd(34)} ${(r.m / 1000).toFixed(1).padStart(5)} km  ×${ratio.toFixed(2)}  ${String(line.length).padStart(4)} pts  ${r.via}${ratio > 3 ? '  <-- check' : ''}`);
    if (!MOCK) await sleep(1100); // public demo servers: about one request per second
  }

  const out = {
    meta: {
      source: MOCK ? 'mock (straight lines)' : 'OSRM car routing on OpenStreetMap data (© OpenStreetMap contributors, ODbL)',
      generated: new Date().toISOString().slice(0, 10),
      simplifyM: SIMPLIFY_M,
    },
    routes,
  };
  writeFileSync(OUT, JSON.stringify(out) + '\n');
  console.log(`\n${Object.keys(routes).length} routes written to ${OUT}${missing.length ? `; missing: ${missing.join(', ')}` : ''}`);
  if (missing.length) process.exitCode = 1;
}

main();
