/**
 * Facade between the engines and the UI: memoised runs for a demo day, ride quotes, crowd and
 * dispersal results. Every number here is computed in the browser from virtual demo inputs.
 */
import { requiredFleetGivenPlan, simulateDay, waitSummary, type DayResult } from './drt';
import { crowdForecast, type CrowdForecast, type Site } from './crowd';
import { dispersal, type Dispersal } from './choice';
import { gatewayKpis, planGateway, executeGateway, syntheticBookings, type GatewayPlan, type ExecStats } from './airport';
import { DEFAULT_LEVERS, SERVICE_HOURS, ZONE_PARAMS, fleetAt, lamEff, type DayType, type Levers, type ZoneId } from '../data/scenario';
import { crowdSites, haversineKm, placeById, type PlaceId } from '../data/places';
import { roadRoute } from '../data/routes';

const memo = new Map<string, unknown>();
function cached<T>(key: string, fn: () => T): T {
  if (!memo.has(key)) {
    if (memo.size > 400) memo.clear();
    memo.set(key, fn());
  }
  return memo.get(key) as T;
}

export const leverKey = (lv: Levers): string => `${+lv.cruiseLend}${+lv.droneSupport}${lv.preBook.toFixed(2)}`;

export function zoneDay(z: ZoneId, d: DayType, lv: Levers = DEFAULT_LEVERS): DayResult {
  return cached(`day:${z}:${d}:${leverKey(lv)}`, () => {
    const [o, c] = SERVICE_HOURS[z];
    return simulateDay(ZONE_PARAMS[z], o, c, (t) => lamEff(z, d, t, lv), (t) => fleetAt(z, d, t, lv));
  });
}

/** Vehicles each hour needs to meet the standard, given the planned operation up to that hour. */
export function zoneRequired(z: ZoneId, d: DayType, lv: Levers = DEFAULT_LEVERS) {
  return cached(`req:${z}:${d}:${leverKey(lv)}`, () => requiredFleetGivenPlan(ZONE_PARAMS[z], zoneDay(z, d, lv), 8));
}

export interface RideQuote {
  open: boolean;
  opens: number;
  closes: number;
  mean: number;
  q90: number;
  p10: number;
  p20: number;
  p30: number;
  fleet: number;
}

/** Pickup-wait distribution for a call placed at minute t in zone z. */
export function rideQuote(z: ZoneId, d: DayType, lv: Levers, t: number): RideQuote {
  const [opens, closes] = SERVICE_HOURS[z];
  if (t < opens || t >= closes) return { open: false, opens, closes, mean: NaN, q90: NaN, p10: 0, p20: 0, p30: 0, fleet: 0 };
  const w = waitSummary(ZONE_PARAMS[z], zoneDay(z, d, lv), t);
  return { open: true, opens, closes, mean: w.mean, q90: w.q90, p10: w.p10, p20: w.p20, p30: w.p30, fleet: w.fleet };
}

/** In-zone ride time between two places: road distance of the drawn route at the zone's average speed, plus boarding. */
export function rideMinutes(a: PlaceId, b: PlaceId): number {
  const pa = placeById(a);
  const pb = placeById(b);
  const p = ZONE_PARAMS[pa.zone];
  // road distance of the drawn route; straight line × detour factor if no route is stored
  const km = roadRoute(a, b)?.km ?? p.detour * haversineKm(pa, pb);
  return Math.max(4, Math.round((60 * km) / p.speedKmh + 1));
}

export const SITES: Site[] = crowdSites().map((p) => ({ id: p.id, zone: p.zone, spec: p.crowd! }));
export const siteIndex = (id: PlaceId): number => SITES.findIndex((s) => s.id === id);

/** Crowd forecast with data assimilated up to `now` (rounded to 10 min for caching). */
export function crowdAt(d: DayType, now: number): CrowdForecast {
  const t = Math.round(now / 10) * 10;
  return cached(`crowd:${d}:${t}`, () => crowdForecast(SITES, d, t));
}

export function dispersalAt(d: DayType, now: number): Dispersal {
  const t = Math.round(now / 10) * 10;
  return cached(`disp:${d}:${t}`, () => dispersal(crowdAt(d, t)));
}

export function gatewayDay(d: DayType): { plan: GatewayPlan; exec: ExecStats } {
  return cached(`gw:${d}`, () => {
    const plan = planGateway(syntheticBookings(d));
    return { plan, exec: executeGateway(plan) };
  });
}

export function gatewayAverages(d: DayType) {
  return cached(`gwk:${d}`, () => gatewayKpis(d, 12));
}
