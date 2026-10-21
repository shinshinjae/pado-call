/**
 * Airport gateway (pre-booked, pooled) between Gimhae airport and hotels in zones A / B.
 *
 * Plan — arrival bookings (airport → hotel) are batched into trips, one zone per trip: a van at the
 * airport leaves when the last selected group is ready, and the oldest group waits at most BATCH_MAX
 * minutes for others. The return leg of every trip passes the same zone, so it offers a pickup slot
 * for departure bookings (hotel → airport): the same van carries passengers both ways. Each van also
 * starts the day with an inbound run from its depot zone.
 * Execution — flight delays and drive-time variability are sampled (Monte Carlo). A trip leaves at
 * its planned time; groups whose flight is late are moved automatically to the next departure of
 * their zone, so the others are not held.
 * Drive times are log-normal around the median of each hotel area — all demo assumptions.
 */
import { mulberry32, normal } from './rng';
import { AREAS, areaById, type AreaId } from '../data/places';
import type { DayType, ZoneId } from '../data/scenario';

export const READY_AFTER_LANDING = 25; // immigration + baggage (min)
export const BATCH_MAX = 15; // the oldest group waits at most this long for others
export const SEATS = 9;
export const DROP_MIN = 6; // per hotel drop-off
export const PICKUP_MIN = 4; // per hotel pickup on the return leg
export const SIGMA = 0.18; // log-normal spread of drive times
export const PLAN_Z = 1.0; // the plan reserves the ~84th-percentile drive time
export const Z90 = 1.2816;
export const FARE_PER_PERSON = 10000;
export const ON_TIME_MIN = 5; // KPI: depart within 5 min of the planned time
export const CHECKIN_BEFORE = 120; // be at the airport 2 h before an international departure
export const EARLY_MAX = 90; // … but not more than 90 min earlier than that
export const DAY_FIRST = 7 * 60 + 20; // vans leave their depots
export const DAY_LAST = 22 * 60 + 30; // last departure from the airport

export type Dir = 'arr' | 'dep';
export interface Booking {
  id: string;
  dir: Dir;
  flight: string;
  time: number; // arr: scheduled landing · dep: scheduled flight departure (minute of day)
  delay: number; // arr: delay on the demo day (min)
  area: AreaId;
  zone: ZoneId;
  pax: number;
  bags: number;
  mine?: boolean;
}

export const readyAt = (b: Booking, delayed = false): number => b.time + (delayed ? b.delay : 0) + READY_AFTER_LANDING;
export const deadlineOf = (b: Booking): number => b.time - CHECKIN_BEFORE;

const peak = (t: number) => (t >= 17 * 60 && t < 19 * 60 + 30 ? 1.2 : 1.0);
/** Drive time airport ↔ hotel area at quantile z (z = 0: median). */
export function driveQuantile(area: AreaId, t: number, z: number): number {
  return areaById(area).driveMin * peak(t) * Math.exp(z * SIGMA);
}
/** Mean hop between two hotel stops inside a zone. */
const HOP = 6;

export interface Stop {
  booking: Booking;
  kind: 'drop' | 'pick';
  plan: number; // planned time at the stop (80% plan)
  eta50: number;
  eta90: number;
}
export interface Trip {
  id: number;
  van: number; // 1-based
  zone: ZoneId;
  kind: 'out' | 'depot'; // airport → zone → airport, or the first inbound run from the depot
  depart: number; // planned departure from the airport (out) or from the depot (depot)
  arrivals: Booking[];
  departures: Booking[];
  stops: Stop[];
  inZone: number; // start of the return leg (after the last drop)
  back: number; // planned arrival at the airport (80% plan)
  back50: number; // median arrival at the airport
}
export interface GatewayPlan {
  bookings: Booking[];
  trips: Trip[];
  tripOf: Map<string, Trip>;
  waitArr: Map<string, number>; // planned ready → departure (arrivals)
  airportArr: Map<string, number>; // median airport arrival (departures)
  fallback: Booking[]; // no shuttle seat → partner taxi
  served: number;
  activeVanHours: number;
  q: number; // bookings served per active van-hour
}

const argmin = (a: number[]) => a.reduce((best, v, i) => (v < a[best] ? i : best), 0);

/** Planned airport arrival of a return leg that picks up `picks` (farthest hotel first). */
function legBack(inZone: number, picks: Booking[]): number {
  if (!picks.length) return inZone;
  const closest = picks.reduce((a, b) => (areaById(b.area).driveMin < areaById(a.area).driveMin ? b : a));
  const tEnd = inZone + (HOP + PICKUP_MIN) * picks.length;
  return tEnd + driveQuantile(closest.area, tEnd, PLAN_Z);
}

const fits = (b: Booking, back: number) => back <= deadlineOf(b) + 1e-9 && back >= deadlineOf(b) - EARLY_MAX - 1e-9;

/** Return leg: pick up departure groups of the zone whose airport arrival fits their window. */
function returnLeg(zone: ZoneId, inZone: number, pending: Booking[], seatsFree: number) {
  let picks: Booking[] = [];
  let seats = seatsFree;
  const cands = pending.filter((b) => b.zone === zone).sort((a, b) => deadlineOf(a) - deadlineOf(b));
  for (const b of cands) {
    if (seats < b.pax) continue;
    const trial = [...picks, b];
    const back = legBack(inZone, trial);
    if (trial.every((x) => fits(x, back))) {
      picks = trial;
      seats -= b.pax;
    }
  }
  // pickup order: farthest from the airport first, so the closest hotel is the last stop
  picks.sort((a, b) => areaById(b.area).driveMin - areaById(a.area).driveMin);
  const stops: Stop[] = [];
  let t = inZone;
  picks.forEach((b) => {
    t += HOP + PICKUP_MIN;
    stops.push({ booking: b, kind: 'pick', plan: t, eta50: t, eta90: t });
  });
  const last = picks.length ? picks[picks.length - 1].area : null;
  return { picks, stops, tEnd: t, lastArea: last };
}

/** Build the day plan for the gateway vans. */
export interface PlanOptions {
  vans?: number;
  batchMax?: number;
  holdMax?: number; // hold longer for pooling when the other vans are far away
}
export const HOLD_MAX = 25;

export function planGateway(bookings: Booking[], opts: PlanOptions = {}): GatewayPlan {
  const vans = opts.vans ?? 2;
  const batchMax = opts.batchMax ?? BATCH_MAX;
  const holdMax = opts.holdMax ?? HOLD_MAX;
  const arrivals = bookings.filter((b) => b.dir === 'arr').sort((a, b) => readyAt(a) - readyAt(b));
  const pendingDep = bookings.filter((b) => b.dir === 'dep');
  const trips: Trip[] = [];
  const vanFree: number[] = [];
  // first inbound runs from the depots (van 1 in A, van 2 in B, …)
  for (let v = 0; v < vans; v++) {
    const zone: ZoneId = v % 2 === 0 ? 'A' : 'B';
    const leg = returnLeg(zone, DAY_FIRST, pendingDep, SEATS);
    const lastArea = leg.lastArea ?? (zone === 'A' ? 'gwangalli' : 'busanstn');
    const back = leg.tEnd + driveQuantile(lastArea, leg.tEnd, PLAN_Z);
    const back50 = leg.tEnd + driveQuantile(lastArea, leg.tEnd, 0);
    leg.picks.forEach((b) => pendingDep.splice(pendingDep.indexOf(b), 1));
    leg.stops.forEach((s) => {
      s.eta50 = s.plan;
      s.eta90 = s.plan;
    });
    trips.push({ id: trips.length + 1, van: v + 1, zone, kind: 'depot', depart: DAY_FIRST, arrivals: [], departures: leg.picks, stops: leg.stops, inZone: DAY_FIRST, back, back50 });
    vanFree.push(back);
  }
  const pending = [...arrivals];
  let guard = 0;
  while (pending.length && guard++ < 400) {
    const v = argmin(vanFree);
    const first = pending[0];
    const zone = first.zone;
    const tAvail = Math.max(vanFree[v], readyAt(first));
    if (tAvail > DAY_LAST + 60) break;
    // pooling hold: short if another van is back soon, longer (≤ holdMax) if not
    const others = vanFree.filter((_, k) => k !== v);
    const nextOther = others.length ? Math.min(...others) : Infinity;
    const hold = Math.min(holdMax, Math.max(batchMax, (nextOther - readyAt(first)) / 3));
    const latest = Math.max(tAvail, readyAt(first) + hold);
    const groups: Booking[] = [];
    let seats = 0;
    for (const b of pending) {
      if (b.zone !== zone || readyAt(b) > latest || seats + b.pax > SEATS) continue;
      groups.push(b);
      seats += b.pax;
    }
    const depart = Math.max(tAvail, ...groups.map((g) => readyAt(g)));
    const ordered = [...groups].sort((a, b) => areaById(a.area).driveMin - areaById(b.area).driveMin);
    const stops: Stop[] = ordered.map((g, i) => ({
      booking: g,
      kind: 'drop',
      plan: depart + driveQuantile(g.area, depart, PLAN_Z) + DROP_MIN * i,
      eta50: depart + driveQuantile(g.area, depart, 0) + DROP_MIN * i,
      eta90: depart + driveQuantile(g.area, depart, Z90) + DROP_MIN * i,
    }));
    const inZone = stops[stops.length - 1].plan + DROP_MIN;
    const leg = returnLeg(zone, inZone, pendingDep, SEATS);
    leg.picks.forEach((b) => pendingDep.splice(pendingDep.indexOf(b), 1));
    const lastArea = leg.lastArea ?? ordered[ordered.length - 1].area;
    const back = leg.tEnd + driveQuantile(lastArea, leg.tEnd, PLAN_Z);
    const back50 = leg.tEnd + driveQuantile(lastArea, leg.tEnd, 0);
    trips.push({ id: trips.length + 1, van: v + 1, zone, kind: 'out', depart, arrivals: groups, departures: leg.picks, stops: [...stops, ...leg.stops], inZone, back, back50 });
    vanFree[v] = back;
    groups.forEach((g) => pending.splice(pending.indexOf(g), 1));
  }
  const tripOf = new Map<string, Trip>();
  const waitArr = new Map<string, number>();
  const airportArr = new Map<string, number>();
  for (const tr of trips) {
    tr.arrivals.forEach((b) => {
      tripOf.set(b.id, tr);
      waitArr.set(b.id, tr.depart - readyAt(b));
    });
    tr.departures.forEach((b) => {
      tripOf.set(b.id, tr);
      airportArr.set(b.id, tr.back50);
    });
  }
  const fallback = [...pending, ...pendingDep];
  const served = bookings.length - fallback.length;
  let active = 0;
  for (let v = 1; v <= vans; v++) {
    const ts = trips.filter((t) => t.van === v);
    if (ts.length) active += (Math.max(...ts.map((t) => t.back)) - Math.min(...ts.map((t) => t.depart))) / 60;
  }
  return { bookings, trips, tripOf, waitArr, airportArr, fallback, served, activeVanHours: active, q: active > 0 ? served / active : 0 };
}

/** Seed of the demo day shown in the app (its KPIs are close to the 12-day averages). */
export const DEMO_SEED = 11;

/** Synthetic bookings for a demo day: arrival and departure flight banks (virtual). */
export function syntheticBookings(day: DayType, seed = DEMO_SEED): Booking[] {
  const rand = mulberry32(seed + (day === 'cruise' ? 11 : day === 'drone' ? 23 : day === 'weekday' ? 5 : 0));
  // weekdays: about 80% of the weekend bookings
  const nArr = day === 'cruise' ? 12 : day === 'drone' ? 16 : day === 'weekday' ? 11 : 14;
  const nDep = day === 'cruise' ? 8 : 10 - (day === 'weekday' ? 2 : 0);
  // arrival waves of the day (virtual) — the drone Saturday has a stronger afternoon wave
  const arrBanks = day === 'drone'
    ? [{ c: 9 * 60 + 40, s: 35, w: 0.25 }, { c: 12 * 60 + 40, s: 35, w: 0.2 }, { c: 15 * 60 + 30, s: 40, w: 0.35 }, { c: 19 * 60 + 30, s: 40, w: 0.2 }]
    : [{ c: 9 * 60 + 40, s: 35, w: 0.3 }, { c: 12 * 60 + 40, s: 35, w: 0.2 }, { c: 15 * 60 + 40, s: 40, w: 0.25 }, { c: 19 * 60 + 30, s: 40, w: 0.25 }];
  // departure flights (virtual); tourists choose among the offered pickup slots
  const depBanks = [{ c: 10 * 60 + 40, s: 25, w: 0.3 }, { c: 14 * 60 + 20, s: 45, w: 0.35 }, { c: 18 * 60 + 40, s: 45, w: 0.35 }];
  const areaW: Record<AreaId, number> = day === 'drone'
    ? { gwangalli: 0.3, haeundae: 0.25, centum: 0.1, busanstn: 0.13, nampo: 0.12, yeongdo: 0.1 }
    : { gwangalli: 0.15, haeundae: 0.25, centum: 0.1, busanstn: 0.2, nampo: 0.15, yeongdo: 0.15 };
  const pick = <T extends { w: number }>(xs: T[]) => {
    let u = rand();
    for (const x of xs) {
      if (u < x.w) return x;
      u -= x.w;
    }
    return xs[xs.length - 1];
  };
  const pickArea = (): AreaId => {
    let u = rand();
    for (const a of AREAS) {
      if (u < areaW[a.id]) return a.id;
      u -= areaW[a.id];
    }
    return 'haeundae';
  };
  const carriers = ['KE', 'OZ', 'LJ', 'BX', 'MM', 'CX', 'JL', 'CI', 'VJ', 'ZE'];
  const flight = () => `${carriers[Math.floor(rand() * carriers.length)]}${100 + Math.floor(rand() * 800)}`;
  const out: Booking[] = [];
  for (let i = 0; i < nArr; i++) {
    const b = pick(arrBanks);
    const u = rand();
    const delay = u < 0.25 ? Math.round(5 + 20 * rand()) : u < 0.3 ? Math.round(30 + 40 * rand()) : 0;
    const area = pickArea();
    const pax = 1 + Math.floor(rand() * 3) + (rand() < 0.15 ? 1 : 0);
    out.push({ id: `A${i + 1}`, dir: 'arr', flight: flight(), time: Math.round(b.c + b.s * normal(rand)), delay, area, zone: areaById(area).zone, pax, bags: pax + (rand() < 0.4 ? 1 : 0) });
  }
  for (let i = 0; i < nDep; i++) {
    const b = pick(depBanks);
    const area = pickArea();
    const pax = 1 + Math.floor(rand() * 3);
    out.push({ id: `D${i + 1}`, dir: 'dep', flight: flight(), time: Math.round(b.c + b.s * normal(rand)), delay: 0, area, zone: areaById(area).zone, pax, bags: pax });
  }
  return out;
}

/** KPIs over several virtual days (seeds 1..n): planned waits, on-time departures, q, fallbacks. */
export function gatewayKpis(day: DayType, n = 12) {
  let med = 0, p80 = 0, onTime = 0, q = 0, served = 0, total = 0, fallback = 0;
  for (let seed = 1; seed <= n; seed++) {
    const plan = planGateway(syntheticBookings(day, seed));
    const ex = executeGateway(plan, 60, seed);
    const w = [...plan.waitArr.values()].sort((a, b) => a - b);
    med += w[Math.floor(w.length / 2)] ?? 0;
    p80 += w[Math.floor(w.length * 0.8)] ?? 0;
    onTime += ex.onTime;
    q += plan.q;
    served += plan.served;
    total += plan.bookings.length;
    fallback += plan.fallback.length;
  }
  return { days: n, waitMedian: med / n, waitP80: p80 / n, onTime: onTime / n, q: q / n, servedShare: served / total, fallbackPerDay: fallback / n };
}

export interface ExecStats {
  onTime: number; // share of airport departures within ON_TIME_MIN of plan
  moved: number; // mean number of arrival groups moved to a later departure (flight delay)
  lateMean: number; // mean lateness of departures (min)
  days: number;
}

/**
 * Monte Carlo execution of a plan: drive times vary (log-normal), flights are late with the demo
 * delay distribution; a trip leaves at max(plan, van back); a group whose (delayed) ready time is
 * after the departure is moved to the next trip of its zone.
 */
export function executeGateway(plan: GatewayPlan, days = 200, seed = 99): ExecStats {
  const rand = mulberry32(seed);
  let onTime = 0;
  let total = 0;
  let moved = 0;
  let lateSum = 0;
  for (let d = 0; d < days; d++) {
    const backByVan = new Map<number, number>();
    const delay = new Map<string, number>();
    plan.bookings.forEach((b) => {
      if (b.dir !== 'arr') return;
      const u = rand();
      delay.set(b.id, u < 0.25 ? 5 + 20 * rand() : u < 0.3 ? 30 + 40 * rand() : 0);
    });
    for (const tr of [...plan.trips].sort((a, b) => a.depart - b.depart)) {
      const prevBack = backByVan.get(tr.van) ?? -Infinity;
      const dep = Math.max(tr.depart, prevBack);
      if (tr.kind === 'out') {
        total += 1;
        const late = dep - tr.depart;
        lateSum += late;
        if (late <= ON_TIME_MIN) onTime += 1;
        tr.arrivals.forEach((b) => {
          if (b.time + (delay.get(b.id) ?? 0) + READY_AFTER_LANDING > dep + ON_TIME_MIN) moved += 1;
        });
      }
      // trip duration varies around the plan (the plan holds the 80th percentile)
      const durPlan = tr.back - tr.depart;
      const dur = (durPlan / Math.exp(PLAN_Z * SIGMA)) * Math.exp(SIGMA * normal(rand));
      backByVan.set(tr.van, dep + dur);
    }
  }
  return { onTime: total ? onTime / total : 1, moved: moved / days, lateMean: total ? lateSum / total : 0, days };
}

export interface ArrivalQuote {
  ok: boolean;
  ready: number;
  depart: number;
  wait: number;
  eta50: number;
  eta90: number;
  sharedWith: number;
  van: number;
  fare: number;
  dropOrder: number;
  delayed?: { depart: number; eta50: number } | null; // if the flight is late by `delay`
}

/** Quote for my arrival booking inserted into the demo day. */
export function quoteArrival(day: DayType, landing: number, area: AreaId, pax: number, bags: number, delay = 0): ArrivalQuote {
  const mine: Booking = { id: 'ME', dir: 'arr', flight: 'MY', time: landing, delay: 0, area, zone: areaById(area).zone, pax, bags, mine: true };
  const base = syntheticBookings(day);
  const plan = planGateway([...base, mine]);
  const tr = plan.tripOf.get('ME');
  const fare = FARE_PER_PERSON * pax;
  if (!tr) return { ok: false, ready: readyAt(mine), depart: NaN, wait: NaN, eta50: NaN, eta90: NaN, sharedWith: 0, van: 0, fare, dropOrder: 0, delayed: null };
  const s = tr.stops.find((x) => x.booking.mine)!;
  let delayed: ArrivalQuote['delayed'] = null;
  if (delay > 0) {
    // the flight-status feed moves my ready time; the dispatcher re-plans the rest of the day
    const p2 = planGateway([...base, { ...mine, time: landing + delay }]);
    const t2 = p2.tripOf.get('ME');
    const s2 = t2?.stops.find((x) => x.booking.mine);
    delayed = t2 && s2 ? { depart: t2.depart, eta50: s2.eta50 } : null;
  }
  return {
    ok: true,
    ready: readyAt(mine),
    depart: tr.depart,
    wait: tr.depart - readyAt(mine),
    eta50: s.eta50,
    eta90: s.eta90,
    sharedWith: tr.arrivals.length - 1,
    van: tr.van,
    fare,
    dropOrder: tr.arrivals.indexOf(s.booking) >= 0 ? tr.stops.filter((x) => x.kind === 'drop').indexOf(s) + 1 : 1,
    delayed,
  };
}

export interface DepartureSlot {
  trip: number;
  van: number;
  pickup: number; // planned pickup at the hotel
  airport50: number;
  airport90: number;
  beforeFlight: number; // minutes between median airport arrival and flight departure
}

/** Pickup slots for my departure (hotel → airport): return legs of planned trips with a free seat. */
export function departureSlots(day: DayType, flightDep: number, area: AreaId, pax: number): DepartureSlot[] {
  const plan = planGateway(syntheticBookings(day));
  const zone = areaById(area).zone;
  const me: Booking = { id: 'ME', dir: 'dep', flight: 'MY', time: flightDep, delay: 0, area, zone, pax, bags: pax, mine: true };
  const out: DepartureSlot[] = [];
  for (const tr of plan.trips) {
    if (tr.zone !== zone) continue;
    const used = tr.departures.reduce((a, b) => a + b.pax, 0);
    if (used + pax > SEATS) continue;
    const trial = [...tr.departures, me];
    const back = legBack(tr.inZone, trial);
    if (!trial.every((x) => fits(x, back))) continue;
    const order = [...trial].sort((a, b) => areaById(b.area).driveMin - areaById(a.area).driveMin);
    const pos = order.indexOf(me);
    const pickup = tr.inZone + (HOP + PICKUP_MIN) * (pos + 1);
    const tEnd = tr.inZone + (HOP + PICKUP_MIN) * trial.length;
    const closest = order[order.length - 1].area;
    const a50 = tEnd + driveQuantile(closest, tEnd, 0);
    const a90 = tEnd + driveQuantile(closest, tEnd, Z90);
    out.push({ trip: tr.id, van: tr.van, pickup, airport50: a50, airport90: a90, beforeFlight: flightDep - a50 });
  }
  return out.sort((a, b) => b.pickup - a.pickup);
}
