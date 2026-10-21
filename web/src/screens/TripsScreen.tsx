import { useEffect, useState } from 'react';
import { useApp, type TripRecord } from '../state';
import { areaById, placeById, type AreaId, type Lang, type PlaceId } from '../data/places';
import { fmtMin, fmtTime, fmtWon, t } from '../i18n/strings';
import { Icon } from '../components/Icon';
import { QrCode } from '../components/QrCode';
import { AIRPORT_NAME } from '../components/mapMarks';
import { tripStatus, type TripStatus } from '../lib/trips';

function endName(tr: TripRecord, end: 'from' | 'to', lang: Lang): string {
  const v = tr[end];
  if (v === 'airport') return AIRPORT_NAME[lang];
  if (tr.kind === 'ride') return placeById(v as PlaceId).name[lang];
  return areaById(v as AreaId).name[lang];
}

const PILL: Record<TripStatus, string> = { booked: 'pill', coming: 'pill teal', waiting: 'pill amber', onboard: 'pill teal', done: 'pill' };

function PayLine({ tr, lang }: { tr: TripRecord; lang: Lang }) {
  if (!tr.pay) return <span />;
  const st = tr.pay.status;
  return (
    <div className={`pay-line ${st}`}>
      <Icon name={st === 'captured' ? 'check' : 'card'} size={15} />
      <span>{t(`trips.pay.${st}` as 'trips.pay.authorized', lang, { a: fmtWon(tr.fare) })}</span>
    </div>
  );
}

/** Full-screen QR for the driver's reader (bright white, large modules). */
function QrFull({ tr, lang, onClose }: { tr: TripRecord; lang: Lang; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="qr-full" role="dialog" aria-modal="true" aria-label={t('trips.qr', lang)} onClick={onClose}>
      <QrCode value={tr.token ?? ''} size={300} label={`${t('trips.qr', lang)} ${tr.code}`} />
      <div className="code">{tr.code}</div>
      <p className="sub ink">{t('trips.qrHelp', lang)}</p>
      <button type="button" className="btn-ghost" onClick={onClose} autoFocus>
        <Icon name="x" size={16} />
        {t('pay.close', lang)}
      </button>
    </div>
  );
}

function BackupCode({ code, lang }: { code: string; lang: Lang }) {
  const [pre, post] = t('trips.qrBackup', lang, { code: '\u0000' }).split('\u0000');
  return (
    <div className="sub">
      {pre}
      <b className="code-sm">{code}</b>
      {post}
    </div>
  );
}

export function TripsScreen() {
  const { lang, trips, clock, day, cancelTrip, showToast, go } = useApp();
  const [big, setBig] = useState<string | null>(null);
  if (!trips.length) {
    return (
      <div className="empty">
        <Icon name="ticket" size={44} />
        <h2>{t('trips.empty', lang)}</h2>
        <p>{t('trips.emptyBody', lang)}</p>
        <div className="row" style={{ justifyContent: 'center', flexWrap: 'wrap' }}>
          <button type="button" className="btn-ghost" onClick={() => go('call')}><Icon name="plane" size={16} />{t('call.seg.airport', lang)}</button>
          <button type="button" className="btn-ghost" onClick={() => go('call', { seg: 'ride' })}><Icon name="van" size={16} />{t('call.seg.ride', lang)}</button>
        </div>
      </div>
    );
  }
  const bigTrip = trips.find((x) => x.id === big && x.token && !x.cancelled && x.boardedAt == null);
  return (
    <>
      <h2 className="section-title" style={{ marginTop: 6 }}>{t('trips.title', lang)}</h2>
      {trips.map((tr) => {
        const st = tripStatus(tr, clock, day);
        const boarded = tr.boardedAt != null;
        const kindLabel = tr.kind === 'arr' ? t('trips.airportArr', lang) : tr.kind === 'dep' ? t('trips.airportDep', lang) : t('trips.ride', lang);
        const color = tr.kind === 'ride' ? 'var(--teal-ink)' : 'var(--amber-ink)';
        const pickupLine = boarded
          ? t('trips.boarded', lang, { t: fmtTime(tr.boardedAt!) })
          : `${t('trips.pickupAt', lang, { t: fmtTime(tr.pickup) })}${st === 'coming' && !tr.cancelled ? ` · ${fmtMin(tr.pickup - clock, lang)}` : ''}`;
        const showPass = !!tr.token && !tr.cancelled && !boarded;
        return (
          <article key={tr.id} className={`trip${tr.cancelled ? ' cancelled' : ''}`}>
            <div className="between">
              <span className="kind" style={{ color }}>
                <Icon name={tr.kind === 'ride' ? 'van' : 'plane'} size={18} /> {kindLabel}
                {tr.note && tr.kind !== 'ride' ? <span className="pill" style={{ marginLeft: 4 }}>{tr.note}</span> : null}
              </span>
              <span className={tr.cancelled ? 'pill' : PILL[st]}>{tr.cancelled ? t('trips.cancelled', lang) : t(`trips.s.${st}` as 'trips.s.booked', lang)}</span>
            </div>
            <div className="od" style={{ marginTop: 10 }}>
              <div className="rail"><i style={{ background: tr.kind === 'ride' ? 'var(--teal)' : 'var(--amber)' }} /><span /><i style={{ background: 'var(--navy)' }} /></div>
              <div className="stack" style={{ gap: 8 }}>
                <div>
                  <div className="value">{endName(tr, 'from', lang)}</div>
                  <div className="sub">{pickupLine}</div>
                </div>
                <div>
                  <div className="value">{endName(tr, 'to', lang)}</div>
                  <div className="sub">{t('trips.arriveAt', lang, { t: fmtTime(tr.arrive) })}</div>
                </div>
              </div>
            </div>
            <hr className="divider" />
            {showPass ? (
              <div className="qr-pass">
                <div className="label"><Icon name="qr" size={15} /> {t('trips.qr', lang)}</div>
                <button type="button" className="qr-btn" onClick={() => setBig(tr.id)} aria-label={t('trips.qrZoom', lang)} title={t('trips.qrZoom', lang)}>
                  <QrCode value={tr.token!} size={164} label={`${t('trips.qr', lang)} ${tr.code}`} />
                </button>
                <div className="sub ink">{t('trips.qrHelp', lang)}</div>
                <BackupCode code={tr.code} lang={lang} />
                <a className="demo-link" href={`#/driver?c=${tr.code}`}>{t('trips.demoDriver', lang)}</a>
              </div>
            ) : boarded ? (
              <div className="boarded"><Icon name="check" size={18} /> {t('trips.qrUsed', lang)}</div>
            ) : !tr.token ? (
              <div>
                <div className="label">{t('trips.code', lang)}</div>
                <div className="code">{tr.code}</div>
                <div className="sub">{t('trips.show', lang)}</div>
              </div>
            ) : null}
            <div className="between" style={{ alignItems: 'flex-end', marginTop: showPass || boarded || !tr.token ? 12 : 0 }}>
              <PayLine tr={tr} lang={lang} />
              <div style={{ textAlign: 'right' }}>
                <div className="sub"><Icon name="users" size={14} /> {tr.pax}</div>
                <div className="value">{fmtWon(tr.fare)}</div>
              </div>
            </div>
            {!tr.cancelled && !boarded && st !== 'done' ? (
              <div style={{ marginTop: 10 }}>
                <button
                  type="button"
                  className="link-btn"
                  onClick={() => {
                    cancelTrip(tr.id);
                    showToast(t(tr.pay ? 'toast.cancelFree' : 'toast.cancelled', lang));
                  }}
                >
                  {t('trips.cancel', lang)}
                </button>
              </div>
            ) : null}
          </article>
        );
      })}
      {bigTrip ? <QrFull tr={bigTrip} lang={lang} onClose={() => setBig(null)} /> : null}
    </>
  );
}
