import { useMemo, useState } from 'react';
import { useApp } from '../state';
import { ZONE_POLYGONS, placeById, placesInZone, type Lang, type PlaceId } from '../data/places';
import type { ZoneId } from '../data/scenario';
import { bestHour, ciAt, ciSdAt, isOpen, pOverAt, type CrowdForecast } from '../engine/crowd';
import { alternatives } from '../engine/choice';
import { crowdAt, rideMinutes, siteIndex, SITES } from '../engine/ops';
import { fmtCi, fmtMin, fmtPct, fmtTime, t } from '../i18n/strings';
import { Icon } from '../components/Icon';
import { ZoneMap, type CrowdMark } from '../components/ZoneMap';
import { RealMap } from '../components/RealMap';
import { crowdMarks } from '../components/mapMarks';
import { ForecastChart, Legend, LevelTag, type FcPoint } from '../components/Widgets';

interface AlertItem {
  id: PlaceId;
  at: number;
  p: number;
  now: boolean;
}

function zoneAlerts(f: CrowdForecast, zone: ZoneId, now: number): AlertItem[] {
  const out: AlertItem[] = [];
  SITES.forEach((s, k) => {
    if (s.zone !== zone) return;
    for (let tt = now; tt <= Math.min(now + 180, 24 * 60 - 10); tt += 10) {
      const p = pOverAt(f, k, tt);
      if (p >= 0.5 && isOpen(s.spec, f.day, tt)) {
        let pmax = p;
        for (let u = tt; u <= Math.min(tt + 60, 24 * 60 - 10); u += 10) pmax = Math.max(pmax, pOverAt(f, k, u));
        out.push({ id: s.id, at: tt, p: pmax, now: tt === now });
        break;
      }
    }
  });
  return out.sort((a, b) => a.at - b.at).slice(0, 2);
}

function forecastPoints(f: CrowdForecast, k: number): FcPoint[] {
  const pts: FcPoint[] = [];
  for (let tt = 8 * 60; tt <= 24 * 60; tt += 10) {
    const ci = ciAt(f, k, tt);
    const sd = ciSdAt(f, k, tt);
    pts.push({ t: tt, ci, lo: Math.max(0, ci - 1.2816 * sd), hi: ci + 1.2816 * sd, p: pOverAt(f, k, tt) });
  }
  return pts;
}

const placeLabel = (id: PlaceId, lang: Lang) => placeById(id).name[lang];

export function WaveScreen() {
  const { lang, day, clock, route, go } = useApp();
  const qZone = route.params.get('zone');
  const [zone, setZone] = useState<ZoneId>(qZone === 'A' || qZone === 'B' ? qZone : day === 'cruise' ? 'B' : 'A');
  const [h, setH] = useState(Number(route.params.get('h') ?? 0) || 0);
  const f = crowdAt(day, clock);
  const T = Math.min(clock + h * 60, 24 * 60 - 10);
  const marks: CrowdMark[] = SITES.filter((s) => s.zone === zone).map((s) => {
    const k = siteIndex(s.id);
    return { id: s.id, ci: ciAt(f, k, T), open: isOpen(s.spec, day, T) };
  });
  const defaultSel = useMemo(() => {
    const open = marks.filter((m) => m.open);
    const list = open.length ? open : marks;
    return list.reduce((a, b) => (b.ci > a.ci ? b : a), list[0]).id;
  }, [zone, day, clock, h]); // eslint-disable-line react-hooks/exhaustive-deps
  const [sel, setSel] = useState<PlaceId | null>(null);
  const selected = sel && placeById(sel).zone === zone && placeById(sel).crowd ? sel : defaultSel;
  const k = siteIndex(selected);
  const alerts = zoneAlerts(f, zone, clock);
  const pts = forecastPoints(f, k);
  const obs = f.obs.map((o) => ({ t: o.t, ci: o.y[k] / SITES[k].spec.K }));
  const open = isOpen(SITES[k].spec, day, T);
  const best = bestHour(f, k, clock);
  const alts = alternatives(f, k, T).slice(0, 2);
  const hubFrom = placesInZone(zone).find((p) => p.hub && p.id !== selected)!;
  return (
    <>
      <div className="seg" role="group" aria-label={t('wave.ci', lang)}>
        {(['A', 'B'] as ZoneId[]).map((z) => (
          <button key={z} type="button" className="two" aria-pressed={zone === z} onClick={() => { setZone(z); setSel(null); }}>
            <span>{t(`zone.short${z}` as 'zone.shortA', lang)}</span>
            <small>{t(`zone.area${z}` as 'zone.areaA', lang)}</small>
          </button>
        ))}
      </div>
      <div className="seg small light" role="group" aria-label={t('wave.today', lang)}>
        {[0, 1, 2, 3].map((x) => (
          <button key={x} type="button" aria-pressed={h === x} onClick={() => setH(x)}>
            {x === 0 ? `${t('wave.now', lang)} ${fmtTime(clock)}` : t('wave.plus', lang, { h: x })}
          </button>
        ))}
      </div>
      <RealMap
        lang={lang}
        ariaLabel={t(`zone.${zone}` as 'zone.A', lang)}
        polygon={ZONE_POLYGONS[zone]}
        fitTo={ZONE_POLYGONS[zone]}
        marks={crowdMarks(zone, lang, marks, selected)}
        onPick={(id) => placeById(id as PlaceId).crowd && setSel(id as PlaceId)}
        fallback={<ZoneMap zone={zone} lang={lang} mode="crowd" crowd={marks} selected={selected} onPick={(id) => placeById(id).crowd && setSel(id)} ariaLabel={t(`zone.${zone}` as 'zone.A', lang)} />}
      >
        <span className="badge"><Icon name="clock" size={14} />{fmtTime(T)}</span>
      </RealMap>
      <Legend lang={lang} />

      {alerts.map((a) => (
        <div key={a.id} className="alert" role="status">
          <Icon name="warn" size={20} />
          <div>
            <div className="h">{a.now ? t('wave.alertNow', lang, { place: placeLabel(a.id, lang) }) : t('wave.alert', lang, { place: placeLabel(a.id, lang), t: fmtTime(a.at), p: fmtPct(a.p) })}</div>
            {(() => {
              const kk = siteIndex(a.id);
              const al = alternatives(f, kk, Math.max(a.at, clock)).slice(0, 1)[0];
              return al ? (
                <div className="b">
                  {t('ride.alt', lang)}: <b>{placeById(SITES[al.k].id).name[lang]}</b> ({fmtCi(al.ci)})
                </div>
              ) : null;
            })()}
          </div>
        </div>
      ))}

      <div className="card">
        <div className="between" style={{ alignItems: 'flex-start' }}>
          <div>
            <div className="value" style={{ fontSize: 18 }}>{placeLabel(selected, lang)}</div>
            <div className="row" style={{ marginTop: 4, flexWrap: 'wrap' }}>
              <LevelTag ci={ciAt(f, k, T)} lang={lang} open={open} />
              {open && T > clock ? <span className="sub">· {t('wave.chance', lang)} {fmtPct(pOverAt(f, k, T))}</span> : null}
            </div>
          </div>
          <button type="button" className="btn-ghost small" onClick={() => go('call', { seg: 'ride', to: selected, from: hubFrom.id })}>
            <Icon name="van" size={16} /> {t('wave.callThere', lang)}
          </button>
        </div>
        <ForecastChart pts={pts} obs={obs} now={clock} lang={lang} />
        {best && best.ci < 1 ? (
          <p className="sub ink" style={{ margin: '6px 0 0', fontWeight: 600 }}>
            {t('wave.best', lang, { t: `${fmtTime(best.t)}–${fmtTime(best.t + 60)}` })} ({fmtCi(best.ci)})
          </p>
        ) : best ? (
          <p className="sub ink" style={{ margin: '6px 0 0', fontWeight: 600 }}>{t('wave.bestNone', lang)}</p>
        ) : null}
      </div>

      {alts.length ? (
        <div className="card">
          <h3>{t('ride.alt', lang)} · {fmtTime(T)}</h3>
          <div className="alt-list">
            {alts.map((a) => {
              const p = placeById(SITES[a.k].id);
              return (
                <div key={a.k} className="alt-item">
                  <div>
                    <div className="h">{p.name[lang]}</div>
                    <div className="b"><LevelTag ci={a.ci} lang={lang} /> · {fmtMin(rideMinutes(selected, p.id), lang)}</div>
                  </div>
                  <button type="button" className="btn-ghost small" onClick={() => go('call', { seg: 'ride', to: p.id, from: selected })}>
                    {t('wave.callThere', lang)}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}
      <p className="note">{t('wave.note', lang)} · {t('wave.mapNote', lang)}</p>
    </>
  );
}
