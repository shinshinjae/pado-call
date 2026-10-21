/**
 * Export the demo scenario and reference results of the TypeScript engine for the Python
 * reference engine (engine-py). Run: npm run fixtures
 */
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { cycleMin, kappa, pickupMin, simulateDay, waitSummary, TOURIST_STANDARD } from '../src/engine/drt';
import { DAY_TYPES, DEFAULT_LEVERS, SERVICE_HOURS, ZONE_PARAMS, fleetAt, lamEff, type ZoneId } from '../src/data/scenario';
import { crowdSites } from '../src/data/places';
import { runModel, DAY_START, type Site } from '../src/engine/crowd';
import { choiceProbs, hhi, THETA } from '../src/engine/choice';

const root = resolve(fileURLToPath(new URL('.', import.meta.url)), '..', '..', 'engine-py');
const zones: ZoneId[] = ['A', 'B'];

const scenario = {
  note: 'Virtual demo scenario exported from web/src/data (TypeScript). Not measured data.',
  standard: TOURIST_STANDARD,
  zones: Object.fromEntries(zones.map((z) => [z, { ...ZONE_PARAMS[z], open: SERVICE_HOURS[z][0], close: SERVICE_HOURS[z][1] }])),
  lam: Object.fromEntries(zones.map((z) => [z, Object.fromEntries(DAY_TYPES.map((d) => {
    const [o, c] = SERVICE_HOURS[z];
    return [d, Array.from({ length: c - o }, (_, i) => lamEff(z, d, o + i, DEFAULT_LEVERS))];
  }))])),
  fleet: Object.fromEntries(zones.map((z) => [z, Object.fromEntries(DAY_TYPES.map((d) => {
    const [o, c] = SERVICE_HOURS[z];
    return [d, Array.from({ length: c - o }, (_, i) => fleetAt(z, d, o + i, DEFAULT_LEVERS))];
  }))])),
  sites: crowdSites().map((p) => ({ id: p.id, zone: p.zone, ...p.crowd! })),
  dayStart: DAY_START,
  theta: THETA,
};
writeFileSync(resolve(root, 'padocall', 'data', 'scenario.json'), JSON.stringify(scenario));

const basic = {
  kappa: [1, 2, 3, 4, 5, 6].map((I) => kappa(I)),
  pickup: Object.fromEntries(zones.map((z) => [z, [1, 2, 3, 4].map((I) => pickupMin(ZONE_PARAMS[z], I))])),
  cycle: Object.fromEntries(zones.map((z) => [z, [1, 2, 3, 4].map((I) => cycleMin(ZONE_PARAMS[z], I))])),
};

const days: Record<string, unknown> = {};
for (const z of zones) {
  for (const d of DAY_TYPES) {
    const [o, c] = SERVICE_HOURS[z];
    const r = simulateDay(ZONE_PARAMS[z], o, c, (t) => lamEff(z, d, t, DEFAULT_LEVERS), (t) => fleetAt(z, d, t, DEFAULT_LEVERS));
    const probes = [o + 45, Math.round((o + c) / 2), c - 30].map((t) => ({ t, ...waitSummary(ZONE_PARAMS[z], r, t) }));
    days[`${z}:${d}`] = {
      hours: r.hours.map((h) => ({ hour: h.hour, mean: h.mean, p30: h.p30, q90: h.q90, fleet: h.fleet, meets: h.meets })),
      totalCalls: r.totalCalls,
      vehicleHours: r.vehicleHours,
      q: r.q,
      probes,
    };
  }
}

const sites: Site[] = crowdSites().map((p) => ({ id: p.id, zone: p.zone, spec: p.crowd! }));
const crowd: Record<string, unknown> = {};
for (const d of DAY_TYPES) {
  const mult = sites.map((_, k) => 0.8 + 0.05 * k);
  const run = runModel(sites, d, mult);
  crowd[d] = { mult, every30: run.map((arr) => Array.from(arr).filter((_, i) => i % 30 === 0)) };
}

const choiceCases = [
  { V: [0, 0, 0], CI: [0.2, 0.9, 1.4], theta: THETA, avail: null },
  { V: [Math.log(1), Math.log(0.5), Math.log(0.8)], CI: [1.3, 0.6, 0.4], theta: THETA, avail: [true, true, false] },
  { V: [0.3, -0.2, 0.1, 0], CI: [0.5, 0.5, 2.0, 0.1], theta: 0.7, avail: null },
].map((c) => ({ ...c, P: choiceProbs(c.V, c.CI, c.theta, c.avail ?? undefined) }));
const hhiCases = [[1, 1, 1, 1], [5, 1, 1], [0.2, 0.3, 0.5]].map((s) => ({ s, hhi: hhi(s) }));

writeFileSync(resolve(root, 'tests', 'fixtures', 'reference.json'), JSON.stringify({ basic, days, crowd, choiceCases, hhiCases }, null, 0));
console.log('fixtures written to', root);
