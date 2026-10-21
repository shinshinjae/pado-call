/**
 * Scenario report — the numbers behind the dashboard, for checking the plan document.
 * Run: npx tsx scripts/report.ts
 */
import { requiredFleetByHour, simulateDay } from '../src/engine/drt';
import { DAY_TYPES, DEFAULT_LEVERS, SERVICE_HOURS, ZONE_PARAMS, fleetAt, lamEff, type ZoneId } from '../src/data/scenario';
import { gatewayKpis } from '../src/engine/airport';
import { SITES, crowdAt, dispersalAt } from '../src/engine/ops';

for (const xi of [ZONE_PARAMS.A.xi, 1.0]) {
  console.log(`\n=== pooling factor xi = ${xi}${xi === 1 ? ' (no pooling)' : ''}`);
  for (const d of DAY_TYPES) {
    const rows: string[] = [];
    let calls = 0;
    let vh = 0;
    for (const z of ['A', 'B'] as ZoneId[]) {
      const p = { ...ZONE_PARAMS[z], xi };
      const [o, c] = SERVICE_HOURS[z];
      const r = simulateDay(p, o, c, (t) => lamEff(z, d, t, DEFAULT_LEVERS), (t) => fleetAt(z, d, t, DEFAULT_LEVERS));
      const req = requiredFleetByHour(p, o, c, (t) => lamEff(z, d, t, DEFAULT_LEVERS), 9);
      calls += r.totalCalls;
      vh += r.vehicleHours;
      rows.push(`${z}: calls ${r.totalCalls.toFixed(0)}, vehicle-hours ${r.vehicleHours.toFixed(0)}, q ${r.q.toFixed(2)}, hours meeting standard ${(r.meetShare * 100).toFixed(0)}%, required fleet max ${Math.max(...req.map((x) => x.required))}`);
    }
    console.log(`${d}: q(A+B) ${(calls / vh).toFixed(2)}\n  ${rows.join('\n  ')}`);
  }
}
console.log('\n=== airport gateway (12 virtual days)');
for (const d of DAY_TYPES) {
  const k = gatewayKpis(d, 12);
  console.log(`${d}: q ${k.q.toFixed(2)}, on-time ${(k.onTime * 100).toFixed(0)}%, wait median ${k.waitMedian.toFixed(0)} min, p80 ${k.waitP80.toFixed(0)} min, served ${(k.servedShare * 100).toFixed(0)}%, taxi fallback ${k.fallbackPerDay.toFixed(1)}/day`);
}
console.log('\n=== crowd dispersal (forecast at 12:00, 20% adoption)');
for (const d of DAY_TYPES) {
  const ds = dispersalAt(d, 12 * 60);
  const f = crowdAt(d, 12 * 60);
  void f;
  console.log(`${d}: crowded site-hours ${(ds.crowdedMinBase / 60).toFixed(1)} -> ${(ds.crowdedMinApp / 60).toFixed(1)}, HHI ${ds.hhiBase.toFixed(3)} -> ${ds.hhiApp.toFixed(3)}, peak CI ${SITES.map((s, k) => `${s.id} ${ds.peakBase[k].toFixed(2)}→${ds.peakApp[k].toFixed(2)}`).filter((_, k) => ds.peakBase[k] >= 0.9).join(', ')}`);
}
