import { useMemo, useRef, useState } from 'react';
import { useApp, type PayMethod } from '../state';
import { AREAS, PLACES, ZONE_POLYGONS, areaById, placeById, placesInZone, type AreaId, type Lang, type PlaceId } from '../data/places';
import { quoteArrival, departureSlots, FARE_PER_PERSON, READY_AFTER_LANDING } from '../engine/airport';
import { alternatives } from '../engine/choice';
import { ciAt, ciLevel, isOpen } from '../engine/crowd';
import { crowdAt, rideMinutes, rideQuote, siteIndex, SITES } from '../engine/ops';
import type { DayType } from '../data/scenario';
import { fmtHM, fmtMin, fmtTime, fmtWon, t } from '../i18n/strings';
import { Icon } from '../components/Icon';
import { ZoneMap } from '../components/ZoneMap';
import { RealMap } from '../components/RealMap';
import { AIRPORT_NAME, airportFit, airportLine, airportMarks, rideLine, rideMarks } from '../components/mapMarks';
import { PaySheet } from '../components/PaySheet';
import { LevelTag, PickupPhoto, Stepper, TideGauge } from '../components/Widgets';

const toInput = (m: number) => fmtTime(m);
const fromInput = (s: string, fallback: number) => {
  const mm = /^(\d{1,2}):(\d{2})$/.exec(s);
  return mm ? Number(mm[1]) * 60 + Number(mm[2]) : fallback;
};

type Seg = 'airport' | 'ride';

export function CallScreen() {
  const { lang, route } = useApp();
  const [seg, setSeg] = useState<Seg>(route.params.get('seg') === 'ride' || route.params.get('to') ? 'ride' : 'airport');
  const [dir, setDir] = useState<'arr' | 'dep'>(route.params.get('dir') === 'dep' ? 'dep' : 'arr');
  return (
    <>
      <div className="seg" role="group" aria-label={t('nav.call', lang)}>
        <button type="button" aria-pressed={seg === 'airport'} onClick={() => setSeg('airport')}>
          <Icon name="plane" size={18} /> {t('call.seg.airport', lang)}
        </button>
        <button type="button" aria-pressed={seg === 'ride'} onClick={() => setSeg('ride')}>
          <Icon name="van" size={18} /> {t('call.seg.ride', lang)}
        </button>
      </div>
      {seg === 'airport' ? (
        <>
          <div className="seg small light" role="group" aria-label={t('call.seg.airport', lang)}>
            <button type="button" aria-pressed={dir === 'arr'} onClick={() => setDir('arr')}>{t('call.arr', lang)}</button>
            <button type="button" aria-pressed={dir === 'dep'} onClick={() => setDir('dep')}>{t('call.dep', lang)}</button>
          </div>
          {dir === 'arr' ? <AirportArrive /> : <AirportLeave />}
        </>
      ) : (
        <RideNow />
      )}
    </>
  );
}

function AreaSelect({ value, onChange, lang, id }: { value: AreaId; onChange: (a: AreaId) => void; lang: Lang; id: string }) {
  return (
    <select id={id} value={value} onChange={(e) => onChange(e.target.value as AreaId)}>
      {(['A', 'B'] as const).map((z) => (
        <optgroup key={z} label={t(`zone.${z}` as 'zone.A', lang)}>
          {AREAS.filter((a) => a.zone === z).map((a) => (
            <option key={a.id} value={a.id}>{a.name[lang]}</option>
          ))}
        </optgroup>
      ))}
    </select>
  );
}

/**
 * Example flight times follow the demo clock: the soonest landing from 30 min ahead whose shuttle
 * leaves within 15 min of baggage claim, and the soonest departure from 3 h ahead with a hotel pickup
 * still to come. Late in the day an afternoon example is used instead. Any time can be typed in.
 */
const roundUp5 = (m: number) => Math.ceil(m / 5) * 5;
function firstTime(from: number, to: number, ok: (m: number) => boolean): number | null {
  for (let m = from; m <= to; m += 5) if (ok(m)) return m;
  return null;
}
function defaultLanding(day: DayType, clock: number): number {
  const ok = (m: number) => {
    const q = quoteArrival(day, m, 'gwangalli', 2, 2);
    return q.ok && q.wait <= 15;
  };
  return firstTime(Math.max(6 * 60, roundUp5(clock + 30)), 21 * 60 + 30, ok) ?? firstTime(15 * 60, 21 * 60 + 30, ok) ?? 15 * 60 + 50;
}
function defaultFlightDep(day: DayType, clock: number): number {
  const ok = (after: number) => (m: number) => departureSlots(day, m, 'haeundae', 2).some((x) => x.pickup >= after);
  return firstTime(Math.max(9 * 60, roundUp5(clock + 180)), 22 * 60 + 30, ok(clock + 15)) ?? firstTime(15 * 60, 22 * 60 + 30, ok(0)) ?? 17 * 60;
}

function AirportArrive() {
  const { lang, day, clock, addTrip, showToast, go } = useApp();
  const [flight, setFlight] = useState('');
  const [landing, setLanding] = useState(() => defaultLanding(day, clock));
  const [paying, setPaying] = useState(false);
  const [area, setArea] = useState<AreaId>('gwangalli');
  const [pax, setPax] = useState(2);
  const [bags, setBags] = useState(2);
  const [delay, setDelay] = useState(false);
  const q = useMemo(() => quoteArrival(day, landing, area, pax, bags, delay ? 40 : 0), [day, landing, area, pax, bags, delay]);
  const shared = q.sharedWith === 0 ? t('call.shared0', lang) : q.sharedWith === 1 ? t('call.shared1', lang) : t('call.sharedN', lang, { n: q.sharedWith });
  const book = (method: PayMethod) => {
    addTrip({
      kind: 'arr', day, createdAt: clock, pickup: q.depart, arrive: q.eta50, zone: areaById(area).zone,
      from: 'airport', to: area, pax, fare: q.fare, note: flight.trim() || undefined, lang, pay: { method, status: 'authorized' },
    });
    showToast(t('toast.paidBooked', lang));
    go('trips');
  };
  return (
    <>
      {paying ? <PaySheet lang={lang} kind="airport" amount={q.fare} summary={t('pay.summary', lang, { a: AIRPORT_NAME[lang], b: areaById(area).name[lang], n: pax })} onConfirm={book} onClose={() => setPaying(false)} /> : null}
      <RealMap lang={lang} ariaLabel={t('call.arr', lang)} aspect="16 / 9" marks={airportMarks(area, lang)} line={airportLine(area, 'arr')} lineColor="#c07a00" fitTo={airportFit(area, 'arr')} />
      <div className="card">
        <div className="grid2">
          <div className="field">
            <label htmlFor="flight">{t('call.flight', lang)}</label>
            <input id="flight" value={flight} placeholder={t('call.flightPh', lang)} autoComplete="off" onChange={(e) => setFlight(e.target.value.toUpperCase().slice(0, 8))} />
          </div>
          <div className="field">
            <label htmlFor="landing">{t('call.landing', lang)}</label>
            <input id="landing" type="time" step={300} value={toInput(landing)} onChange={(e) => setLanding(fromInput(e.target.value, landing))} />
          </div>
        </div>
        <div className="field" style={{ marginTop: 10 }}>
          <label htmlFor="area">{t('call.hotelArea', lang)}</label>
          <AreaSelect id="area" value={area} onChange={setArea} lang={lang} />
        </div>
        <div className="grid2" style={{ marginTop: 10 }}>
          <div className="field">
            <span className="label">{t('call.travelers', lang)}</span>
            <Stepper value={pax} min={1} max={6} onChange={setPax} label={t('call.travelers', lang)} />
          </div>
          <div className="field">
            <span className="label">{t('call.bags', lang)}</span>
            <Stepper value={bags} min={0} max={8} onChange={setBags} label={t('call.bags', lang)} />
          </div>
        </div>
      </div>

      {q.ok ? (
        <div className="card airport" aria-live="polite">
          <div className="row" style={{ color: 'var(--amber-ink)', fontWeight: 800, fontSize: 13 }}>
            <Icon name="plane" size={18} /> {t('call.ready', lang, { t: fmtTime(landing + READY_AFTER_LANDING) })}
          </div>
          <div className="hero" style={{ marginTop: 8 }}>
            <span className="num" style={{ fontSize: 40 }}>{fmtTime(q.depart)}</span>
            <span className="unit">{lang === 'en' ? 'departure' : lang === 'ko' ? '출발' : lang === 'ja' ? '発' : lang === 'zhHans' ? '发车' : '發車'}</span>
          </div>
          <div className="sub ink" style={{ fontWeight: 600 }}>{q.wait < 1 ? t('call.afterNow', lang) : t('call.after', lang, { m: fmtMin(q.wait, lang) })}</div>
          <hr className="divider" />
          <div className="od">
            <div className="rail"><i style={{ background: 'var(--amber)' }} /><span /><i style={{ background: 'var(--navy)' }} /></div>
            <div className="stack" style={{ gap: 10 }}>
              <div>
                <div className="value">{lang === 'ko' ? '김해공항 국제선' : lang === 'ja' ? '金海空港 国際線' : lang === 'zhHans' ? '金海机场 国际航站楼' : lang === 'zhHant' ? '金海機場 國際線' : 'Gimhae Airport, international'}</div>
                <div className="sub">{t('call.meet', lang)}</div>
              </div>
              <div>
                <div className="value">{t('call.eta', lang, { t: fmtTime(q.eta50) })}</div>
                <div className="sub">{t('call.eta90', lang, { t: fmtTime(q.eta90) })} · {areaById(area).name[lang]}</div>
              </div>
            </div>
          </div>
          <hr className="divider" />
          <div className="between">
            <div className="stack">
              <span className="row" style={{ fontWeight: 700, color: 'var(--navy)' }}><Icon name="users" size={18} />{shared}</span>
              <span className="sub">{t('call.vanNote', lang)}</span>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div className="label">{t('call.fare', lang)}</div>
              <div className="value">{fmtWon(q.fare)}</div>
              <div className="sub">{fmtWon(FARE_PER_PERSON)} × {pax}</div>
            </div>
          </div>
          <hr className="divider" />
          <div className="stack">
            <span style={{ fontWeight: 800, color: 'var(--navy)', fontSize: 14 }}>{t('call.delayTitle', lang)}</span>
            <span className="sub">{t('call.delayBody', lang)}</span>
            <div className="row" style={{ marginTop: 6, flexWrap: 'wrap' }}>
              <button type="button" className="chip" aria-pressed={delay} onClick={() => setDelay(!delay)}>
                <Icon name="clock" size={16} /> {t('call.delaySim', lang)}
              </button>
              {delay && q.delayed ? <span className="sub ink">{t('call.delayResult', lang, { t: fmtTime(q.delayed.depart), t2: fmtTime(q.delayed.eta50) })}</span> : null}
            </div>
          </div>
          <button type="button" className="btn-primary amber" onClick={() => setPaying(true)}>{t('call.book', lang)}</button>
          <p className="note">{t('call.compare', lang)}</p>
        </div>
      ) : (
        <div className="card airport"><p style={{ margin: 0 }}>{t('call.noSeat', lang)}</p></div>
      )}
    </>
  );
}

function AirportLeave() {
  const { lang, day, clock, addTrip, showToast, go } = useApp();
  const [flightDep, setFlightDep] = useState(() => defaultFlightDep(day, clock));
  const [paying, setPaying] = useState(false);
  const [area, setArea] = useState<AreaId>('haeundae');
  const [pax, setPax] = useState(2);
  const slots = useMemo(() => departureSlots(day, flightDep, area, pax), [day, flightDep, area, pax]);
  const [pick, setPick] = useState(0);
  const chosen = slots[Math.min(pick, slots.length - 1)];
  const book = (method: PayMethod) => {
    if (!chosen) return;
    addTrip({
      kind: 'dep', day, createdAt: clock, pickup: chosen.pickup, arrive: chosen.airport50, zone: areaById(area).zone,
      from: area, to: 'airport', pax, fare: FARE_PER_PERSON * pax, lang, pay: { method, status: 'authorized' },
    });
    showToast(t('toast.paidBooked', lang));
    go('trips');
  };
  return (
    <>
      {paying && chosen ? <PaySheet lang={lang} kind="airport" amount={FARE_PER_PERSON * pax} summary={t('pay.summary', lang, { a: areaById(area).name[lang], b: AIRPORT_NAME[lang], n: pax })} onConfirm={book} onClose={() => setPaying(false)} /> : null}
      <RealMap lang={lang} ariaLabel={t('call.dep', lang)} aspect="16 / 9" marks={airportMarks(area, lang)} line={airportLine(area, 'dep')} lineColor="#c07a00" fitTo={airportFit(area, 'dep')} />
      <div className="card">
        <div className="grid2">
          <div className="field">
            <label htmlFor="fdep">{t('call.depTime', lang)}</label>
            <input id="fdep" type="time" step={300} value={toInput(flightDep)} onChange={(e) => { setFlightDep(fromInput(e.target.value, flightDep)); setPick(0); }} />
          </div>
          <div className="field">
            <span className="label">{t('call.travelers', lang)}</span>
            <Stepper value={pax} min={1} max={6} onChange={(v) => { setPax(v); setPick(0); }} label={t('call.travelers', lang)} />
          </div>
        </div>
        <div className="field" style={{ marginTop: 10 }}>
          <label htmlFor="area2">{t('call.hotelArea', lang)}</label>
          <AreaSelect id="area2" value={area} onChange={(a) => { setArea(a); setPick(0); }} lang={lang} />
        </div>
      </div>
      <h2 className="section-title">{t('call.slots', lang)}</h2>
      {slots.length ? (
        <div className="stack" style={{ gap: 8, marginTop: 8 }} role="radiogroup" aria-label={t('call.slots', lang)}>
          {slots.map((s, i) => (
            <label key={s.trip} className="slot">
              <input type="radio" name="slot" checked={i === Math.min(pick, slots.length - 1)} onChange={() => setPick(i)} />
              <span>
                <span className="h">{t('call.slot', lang, { t: fmtTime(s.pickup), t2: fmtTime(s.airport50) })}</span>
                <br />
                <span className="b">{t('call.slotBefore', lang, { h: fmtHM(s.beforeFlight, lang) })} · {t('call.eta90', lang, { t: fmtTime(s.airport90) })}</span>
              </span>
            </label>
          ))}
          <div className="between" style={{ marginTop: 4 }}>
            <span className="sub">{t('call.vanNote', lang)}</span>
            <span className="value">{fmtWon(FARE_PER_PERSON * pax)}</span>
          </div>
          <button type="button" className="btn-primary amber" onClick={() => setPaying(true)}>{t('call.bookPickup', lang)}</button>
        </div>
      ) : (
        <div className="card" style={{ background: 'var(--mist)' }}>
          <p style={{ margin: 0, fontWeight: 600 }}>{t('call.noSlot', lang)}</p>
        </div>
      )}
    </>
  );
}

/* ------------------------------------------------------------------ ride now */

type SR = { start: () => void; stop: () => void; lang: string; onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null; onend: (() => void) | null; onerror: (() => void) | null };
const speechCtor = (): (new () => SR) | null => {
  const w = window as unknown as { SpeechRecognition?: new () => SR; webkitSpeechRecognition?: new () => SR };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
};
const SPEECH_LANG: Record<Lang, string> = { ko: 'ko-KR', en: 'en-US', ja: 'ja-JP', zhHans: 'zh-CN', zhHant: 'zh-TW' };

function matchPlace(text: string): PlaceId | null {
  const s = text.toLowerCase().replace(/\s+/g, '');
  for (const p of PLACES) {
    const names = [...Object.values(p.name), ...Object.values(p.short)].map((n) => n.toLowerCase().replace(/\s+/g, ''));
    if (names.some((n) => n.length >= 2 && (s.includes(n) || n.includes(s)))) return p.id;
  }
  return null;
}

/** "Picked up within N minutes" in words (the big number is the 90% wait). */
const WAIT_HERO: Record<Lang, { lead?: string; unit: string }> = {
  ko: { unit: '분 이내' },
  en: { lead: 'within', unit: 'min' },
  ja: { unit: '分以内' },
  zhHans: { unit: '分钟内' },
  zhHant: { unit: '分鐘內' },
};

function RideNow() {
  const { lang, day, clock, levers, route, addTrip, showToast, go } = useApp();
  const initTo = (route.params.get('to') as PlaceId | null) ?? 'gwangalli';
  const validTo = PLACES.some((p) => p.id === initTo) ? initTo : 'gwangalli';
  const initFrom = (route.params.get('from') as PlaceId | null) ?? (placeById(validTo).zone === 'A' ? (validTo === 'haeundae' ? 'gwangalli' : 'haeundae') : validTo === 'busanstn' ? 'nampo' : 'busanstn');
  const [from, setFrom] = useState<PlaceId>(initFrom);
  const [to, setTo] = useState<PlaceId>(validTo);
  const [pax, setPax] = useState(2);
  const [opts, setOpts] = useState({ wheelchair: false, stroller: false, luggage: false });
  const [heard, setHeard] = useState<string | null>(null);
  const [listening, setListening] = useState(false);
  const [paying, setPaying] = useState(false);
  const recRef = useRef<SR | null>(null);
  const zone = placeById(from).zone;
  const q = rideQuote(zone, day, levers, clock);
  const ride = rideMinutes(from, to);
  const arrive = clock + (q.open ? q.mean : 0) + ride;
  const f = crowdAt(day, clock);
  const k = siteIndex(to);
  const destCi = k >= 0 ? ciAt(f, k, arrive) : null;
  const destOpen = k >= 0 ? isOpen(SITES[k].spec, day, arrive) : true;
  const alts = k >= 0 && destCi !== null && ciLevel(destCi) >= 2 ? alternatives(f, k, arrive).filter((a) => SITES[a.k].id !== from).slice(0, 2) : [];

  const setFromKeepZone = (id: PlaceId) => {
    setFrom(id);
    if (placeById(id).zone !== placeById(to).zone || id === to) {
      const other = placesInZone(placeById(id).zone).find((p) => p.id !== id)!;
      setTo(other.id);
    }
  };
  const pickOnMap = (id: PlaceId) => {
    if (id === from) return;
    setTo(id);
  };
  const Speech = speechCtor();
  const listen = () => {
    if (!Speech) return;
    try {
      const rec = new Speech();
      rec.lang = SPEECH_LANG[lang];
      rec.onresult = (e) => {
        const text = e.results[0][0].transcript;
        setHeard(text);
        const id = matchPlace(text);
        if (id) {
          if (placeById(id).zone !== zone) {
            const hub = placesInZone(placeById(id).zone).find((p) => p.hub && p.id !== id)!;
            setFrom(hub.id);
          }
          setTo(id);
        }
      };
      rec.onend = () => setListening(false);
      rec.onerror = () => setListening(false);
      recRef.current = rec;
      setListening(true);
      rec.start();
    } catch {
      setListening(false);
    }
  };
  const call = (method: PayMethod) => {
    addTrip({
      kind: 'ride', day, createdAt: clock, pickup: clock + q.mean, arrive, zone, from, to, pax, fare: 3000 * pax,
      note: [opts.wheelchair && 'wheelchair', opts.stroller && 'stroller', opts.luggage && 'luggage'].filter(Boolean).join(',') || undefined,
      lang, pay: { method, status: 'authorized' },
    });
    showToast(t('toast.paidCalled', lang, { m: fmtMin(q.mean, lang) }));
    go('trips');
  };
  const zonePlaces = placesInZone(zone);
  return (
    <>
      {paying ? <PaySheet lang={lang} kind="ride" amount={3000 * pax} summary={t('pay.summary', lang, { a: placeById(from).short[lang], b: placeById(to).short[lang], n: pax })} onConfirm={call} onClose={() => setPaying(false)} /> : null}
      <RealMap
        lang={lang}
        ariaLabel={t(`zone.${zone}` as 'zone.A', lang)}
        polygon={ZONE_POLYGONS[zone]}
        fitTo={ZONE_POLYGONS[zone]}
        marks={rideMarks(zone, lang, from, to, q.open ? q.fleet : 0)}
        line={rideLine(placeById(from), placeById(to))}
        onPick={(id) => pickOnMap(id as PlaceId)}
        fallback={<ZoneMap zone={zone} lang={lang} mode="ride" from={from} to={to} vans={q.open ? q.fleet : 0} onPick={pickOnMap} ariaLabel={t(`zone.${zone}` as 'zone.A', lang)} />}
      />
      <div className="row sub" style={{ marginTop: 8, fontWeight: 700, color: 'var(--navy)' }}>
        <Icon name="van" size={18} />
        <span>{t(`zone.${zone}` as 'zone.A', lang)} · {q.open ? t('ride.fleet', lang, { n: q.fleet }) : `${fmtTime(q.opens)}–${fmtTime(q.closes)}`}</span>
      </div>

      <div className="card">
        <div className="od">
          <div className="rail"><i style={{ background: 'var(--teal)' }} /><span /><i style={{ background: 'var(--navy)' }} /></div>
          <div className="stack" style={{ gap: 10 }}>
            <div className="field">
              <label htmlFor="from">{t('ride.from', lang)}</label>
              <select id="from" value={from} onChange={(e) => setFromKeepZone(e.target.value as PlaceId)}>
                {(['A', 'B'] as const).map((z) => (
                  <optgroup key={z} label={t(`zone.${z}` as 'zone.A', lang)}>
                    {placesInZone(z).map((p) => <option key={p.id} value={p.id}>{p.name[lang]}</option>)}
                  </optgroup>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="to">{t('ride.to', lang)}</label>
              <div className="row">
                <select id="to" value={to} onChange={(e) => setTo(e.target.value as PlaceId)} style={{ flex: 1 }}>
                  {zonePlaces.filter((p) => p.id !== from).map((p) => <option key={p.id} value={p.id}>{p.name[lang]}</option>)}
                </select>
                {Speech ? (
                  <button type="button" className="btn-ghost" onClick={listen} aria-label={t('ride.voice', lang)} aria-pressed={listening} style={{ padding: '9px 10px' }}>
                    <Icon name="mic" size={18} />
                  </button>
                ) : null}
              </div>
              <span className="sub">{t('ride.sameZone', lang)}</span>
              {heard ? <span className="sub ink">{t('ride.voiceHeard', lang, { s: heard })}{matchPlace(heard) ? '' : ` — ${t('ride.voiceMiss', lang)}`}</span> : null}
            </div>
          </div>
        </div>
      </div>

      {q.open ? (
        <div className="card" aria-live="polite">
          <h3>{t('ride.waitLabel', lang)}</h3>
          <div className="hero">
            {WAIT_HERO[lang].lead ? <span className="lead">{WAIT_HERO[lang].lead}</span> : null}
            <span className="num">{Math.round(q.q90)}</span>
            <span className="unit">{WAIT_HERO[lang].unit}</span>
          </div>
          <div className="sub ink">{t('ride.heroSub', lang, { a: fmtMin(q.mean, lang) })}</div>
          <TideGauge p10={q.p10} p20={q.p20} p30={q.p30} lang={lang} />
          <hr className="divider" />
          <div className="row" style={{ fontWeight: 700, color: 'var(--navy)' }}>
            <Icon name="clock" size={18} /> {t('ride.trip', lang, { m: fmtMin(ride, lang), t: fmtTime(arrive) })}
          </div>
          {destCi !== null ? (
            <div className="row" style={{ marginTop: 6, flexWrap: 'wrap' }}>
              <span className="sub">{t('ride.crowd', lang, { t: fmtTime(arrive), place: placeById(to).short[lang], level: '' }).replace(/[:：]\s*$/, '')}</span>
              <LevelTag ci={destCi} lang={lang} open={destOpen} />
            </div>
          ) : null}
        </div>
      ) : (
        <div className="card" style={{ background: 'var(--mist)' }}>
          <p style={{ margin: 0, fontWeight: 600 }}>{t('ride.closed', lang, { o: fmtTime(q.opens), c: fmtTime(q.closes) })}</p>
        </div>
      )}

      {alts.length ? (
        <div className="card">
          <h3>{t('ride.alt', lang)}</h3>
          <div className="alt-list">
            {alts.map((a) => {
              const p = placeById(SITES[a.k].id);
              return (
                <div key={a.k} className="alt-item">
                  <div>
                    <div className="h">{p.name[lang]}</div>
                    <div className="b"><LevelTag ci={a.ci} lang={lang} /> · {fmtMin(rideMinutes(from, p.id), lang)}</div>
                  </div>
                  <button type="button" className="btn-ghost small" onClick={() => setTo(p.id)}>{t('wave.callThere', lang)}</button>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}

      <h2 className="section-title">{t('ride.pickupGuide', lang)}</h2>
      <p className="section-sub">{t('ride.photo', lang)} · {placeById(from).name[lang]}</p>
      <PickupPhoto scene={placeById(from).scene} caption={placeById(from).pickup[lang]} />

      <div className="card">
        <div className="between">
          <span className="label">{t('call.travelers', lang)}</span>
          <div style={{ width: 140 }}><Stepper value={pax} min={1} max={6} onChange={setPax} label={t('call.travelers', lang)} /></div>
        </div>
        <div className="chips" style={{ marginTop: 10 }}>
          <button type="button" className="chip" aria-pressed={opts.wheelchair} onClick={() => setOpts({ ...opts, wheelchair: !opts.wheelchair })}><Icon name="wheelchair" size={16} />{t('ride.opt.wheelchair', lang)}</button>
          <button type="button" className="chip" aria-pressed={opts.stroller} onClick={() => setOpts({ ...opts, stroller: !opts.stroller })}><Icon name="stroller" size={16} />{t('ride.opt.stroller', lang)}</button>
          <button type="button" className="chip" aria-pressed={opts.luggage} onClick={() => setOpts({ ...opts, luggage: !opts.luggage })}><Icon name="bag" size={16} />{t('ride.opt.luggage', lang)}</button>
        </div>
        <div className="between" style={{ marginTop: 12 }}>
          <span className="sub">{t('ride.fare', lang)}</span>
          <span className="value">{fmtWon(3000 * pax)}</span>
        </div>
        <button type="button" className="btn-primary" disabled={!q.open} onClick={() => setPaying(true)}>
          <Icon name="van" size={20} /> {t('ride.call', lang)}
        </button>
      </div>
    </>
  );
}
