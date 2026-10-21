import { useId, useState, type PointerEvent } from 'react';
import type { Lang, Scene } from '../data/places';
import { fmtCi, fmtMin, fmtPct, fmtTime, t } from '../i18n/strings';
import { Icon, WaveMark } from './Icon';
import { CI_COLORS, ciLevel } from '../engine/crowd';

/** Pickup-wait tide gauge: cumulative chance of being picked up within 10 / 20 / 30 minutes. */
export function TideGauge({ p10, p20, p30, lang }: { p10: number; p20: number; p30: number; lang: Lang }) {
  const seg = [p10, Math.max(0, p20 - p10), Math.max(0, p30 - p20)];
  const colors = ['var(--g1)', 'var(--g2)', 'var(--g3)'];
  const cum = [p10, p20, p30];
  return (
    <div className="gauge">
      <div className="gauge-bar" role="img" aria-label={cum.map((p, i) => `${t('ride.within', lang, { m: fmtMin((i + 1) * 10, lang) })} ${fmtPct(p)}`).join(', ')}>
        {seg.map((w, i) => (w > 0.004 ? <span key={i} style={{ width: `${w * 100}%`, background: colors[i] }} /> : null))}
      </div>
      <div className="gauge-legend">
        {cum.map((p, i) => (
          <div key={i}>
            <span>
              <i style={{ background: colors[i] }} />
              {t('ride.within', lang, { m: fmtMin((i + 1) * 10, lang) })}
            </span>
            <b>{fmtPct(p)}</b>
          </div>
        ))}
      </div>
    </div>
  );
}

export function LevelTag({ ci, lang, open = true }: { ci: number; lang: Lang; open?: boolean }) {
  if (!open) return <span className="level"><i style={{ background: '#9aa6b3' }} />{t('wave.closed', lang)}</span>;
  const lv = ciLevel(ci);
  return (
    <span className="level">
      <i style={{ background: CI_COLORS[lv] }} />
      {t(`level.${lv}` as 'level.0', lang)} · {fmtCi(ci)}
    </span>
  );
}

export function Legend({ lang }: { lang: Lang }) {
  return (
    <div className="legend" aria-label={t('wave.ci', lang)}>
      {[0, 1, 2, 3].map((lv) => (
        <span key={lv} className="level" style={{ fontWeight: 600, fontSize: 12 }}>
          <i style={{ background: CI_COLORS[lv] }} />
          {t(`level.${lv}` as 'level.0', lang)} {lv === 0 ? '< 0.5' : lv === 3 ? '≥ 1.0' : lv === 1 ? '0.5–0.8' : '0.8–1.0'}
        </span>
      ))}
    </div>
  );
}

export function Stepper({ value, min, max, onChange, label }: { value: number; min: number; max: number; onChange: (v: number) => void; label: string }) {
  return (
    <div className="stepper" role="group" aria-label={label}>
      <button type="button" aria-label="−" disabled={value <= min} onClick={() => onChange(Math.max(min, value - 1))}>−</button>
      <output aria-live="polite">{value}</output>
      <button type="button" aria-label="+" disabled={value >= max} onClick={() => onChange(Math.min(max, value + 1))}>+</button>
    </div>
  );
}

/** Illustrated photo guide of a pickup point (scene type + the blue PADO CALL sign). */
export function PickupPhoto({ scene, caption }: { scene: Scene; caption: string }) {
  const gid = useId().replace(/:/g, '');
  return (
    <figure className="photo" style={{ margin: 0 }}>
      <svg viewBox="0 0 360 150" role="img" aria-label={caption}>
        <defs>
          <linearGradient id={`sky${gid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#dff1fb" />
            <stop offset="1" stopColor="#f6fbfe" />
          </linearGradient>
        </defs>
        <rect width="360" height="150" fill={`url(#sky${gid})`} />
        {scene === 'coast' ? (
          <>
            <path d="M0,78 H360 V104 H0 Z" fill="#9fd3e6" />
            <path d="M0,86 C40,82 80,90 120,86 S200,82 240,88 S320,84 360,86" stroke="#ffffff" strokeWidth="2" fill="none" opacity=".8" />
            <path d="M0,100 H360 V112 H0 Z" fill="#efe2c4" />
            <path d="M210,40 L250,78 M250,40 L290,78" stroke="#c4ccd6" strokeWidth="2" />
          </>
        ) : scene === 'hill' ? (
          <>
            <path d="M0,90 C60,40 140,30 220,52 C280,68 320,56 360,40 V112 H0 Z" fill="#e8dcd0" />
            {[
              [30, 70, '#f2b8a2'], [62, 58, '#9fd3e6'], [94, 50, '#f6d36b'], [126, 46, '#b8d8a8'], [158, 48, '#f2b8a2'], [190, 52, '#9fd3e6'], [222, 58, '#f6d36b'],
            ].map(([x, y, c], i) => (
              <rect key={i} x={x as number} y={y as number} width="24" height="20" rx="2" fill={c as string} />
            ))}
          </>
        ) : (
          <>
            {[[16, 34, 46], [70, 20, 38], [116, 44, 52], [176, 28, 44], [228, 12, 58], [292, 38, 52]].map(([x, y, w], i) => (
              <rect key={i} x={x} y={y} width={w} height={112 - y} fill={i % 2 ? '#d7dee6' : '#c9d2dc'} />
            ))}
          </>
        )}
        <rect x="0" y="112" width="360" height="38" fill="#d9dee4" />
        <rect x="0" y="110" width="360" height="4" fill="#bfc7d0" />
        <rect x="84" y="118" width="120" height="24" rx="4" fill="none" stroke="#00a396" strokeWidth="2" strokeDasharray="6 5" />
        <g transform="translate(212,40)">
          <rect x="6" y="20" width="4" height="56" fill="#5f6b7a" />
          <rect x="-22" y="0" width="60" height="30" rx="6" fill="#2e6fbf" />
          <g transform="translate(-16,6) scale(.6)">
            <path d="M1.5 9 C4 3.5, 7 3.5, 9.5 8.5 S15.5 13.5, 20.5 5.5" stroke="#fff" strokeWidth="3.4" fill="none" strokeLinecap="round" />
          </g>
          <text x="10" y="13" fill="#fff" fontSize="8.5" fontWeight="800">PADO</text>
          <text x="10" y="24" fill="#9fe7df" fontSize="8.5" fontWeight="800">CALL</text>
        </g>
        <g transform="translate(266,104)">
          <rect width="64" height="28" rx="7" fill="#0f2b46" />
          <rect x="40" y="6" width="16" height="9" rx="2" fill="#9fe7df" />
          <circle cx="15" cy="28" r="5" fill="#0f2b46" stroke="#fff" strokeWidth="2" />
          <circle cx="49" cy="28" r="5" fill="#0f2b46" stroke="#fff" strokeWidth="2" />
        </g>
      </svg>
      <figcaption className="photo-cap">
        <Icon name="pin" size={18} />
        <span>{caption}</span>
      </figcaption>
    </figure>
  );
}

export interface FcPoint {
  t: number;
  ci: number;
  lo: number;
  hi: number;
  p: number;
}

/** Crowd-level forecast for one place: analysis before `now`, forecast with an 80% band after. */
export function ForecastChart({ pts, obs, now, lang, height = 168 }: { pts: FcPoint[]; obs: { t: number; ci: number }[]; now: number; lang: Lang; height?: number }) {
  const W = 360;
  const H = height;
  const m = { l: 30, r: 12, t: 22, b: 24 };
  const t0 = 8 * 60;
  const t1 = 24 * 60;
  const ymax = Math.max(1.6, Math.ceil((Math.max(...pts.map((p) => p.hi)) + 0.1) * 2) / 2);
  const x = (tt: number) => m.l + ((tt - t0) / (t1 - t0)) * (W - m.l - m.r);
  const y = (v: number) => m.t + (1 - v / ymax) * (H - m.t - m.b);
  const vis = pts.filter((p) => p.t >= t0 && p.t <= t1);
  const past = vis.filter((p) => p.t <= now);
  const fut = vis.filter((p) => p.t >= now);
  const line = (arr: FcPoint[]) => arr.map((p, i) => `${i ? 'L' : 'M'}${x(p.t).toFixed(1)},${y(p.ci).toFixed(1)}`).join('');
  const band = fut.length
    ? `M${fut.map((p) => `${x(p.t).toFixed(1)},${y(p.hi).toFixed(1)}`).join('L')}L${[...fut].reverse().map((p) => `${x(p.t).toFixed(1)},${y(p.lo).toFixed(1)}`).join('L')}Z`
    : '';
  const [hover, setHover] = useState<FcPoint | null>(null);
  const onMove = (e: PointerEvent<SVGRectElement>) => {
    const box = (e.currentTarget.ownerSVGElement as SVGSVGElement).getBoundingClientRect();
    const sx = ((e.clientX - box.left) / box.width) * W;
    const tt = t0 + ((sx - m.l) / (W - m.l - m.r)) * (t1 - t0);
    const snap = Math.round(tt / 10) * 10;
    const p = vis.reduce((a, b) => (Math.abs(b.t - snap) < Math.abs(a.t - snap) ? b : a), vis[0]);
    setHover(p ?? null);
  };
  const ticks = [9, 12, 15, 18, 21, 24];
  const yt = [0, 0.5, 1, 1.5, 2, 2.5].filter((v) => v <= ymax);
  return (
    <div className="fc">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={t('wave.today', lang)}>
        {yt.map((v) => (
          <g key={v}>
            <line x1={m.l} x2={W - m.r} y1={y(v)} y2={y(v)} stroke={v === 1 ? '#e5484d' : '#ebeff4'} strokeWidth={1} />
            <text x={m.l - 6} y={y(v) + 4} textAnchor="end" fontSize="10.5" fill="#5f6b7a" className="tabular">{v.toFixed(1)}</text>
          </g>
        ))}
        <text x={W - m.r} y={y(1) - 5} textAnchor="end" fontSize="10.5" fontWeight="700" fill="#b4232a">{t('level.3', lang)}</text>
        {ticks.map((h) => (
          <text key={h} x={x(h * 60)} y={H - 6} textAnchor="middle" fontSize="10.5" fill="#5f6b7a" className="tabular">{`${String(h % 24).padStart(2, '0')}:00`}</text>
        ))}
        <path d={band} fill="#0f2b46" opacity={0.1} />
        <path d={line(past)} stroke="#0f2b46" strokeWidth={2} fill="none" strokeLinejoin="round" strokeLinecap="round" />
        <path d={line(fut)} stroke="#0f2b46" strokeWidth={2} fill="none" strokeLinejoin="round" strokeLinecap="round" strokeDasharray="5 4" />
        {obs.filter((o) => o.t >= t0 && o.t <= now).map((o) => (
          <circle key={o.t} cx={x(o.t)} cy={y(o.ci)} r={3.5} fill="#00a396" stroke="#fff" strokeWidth={2} />
        ))}
        {now >= t0 && now <= t1 ? (
          <g>
            <line x1={x(now)} x2={x(now)} y1={m.t - 8} y2={H - m.b} stroke="#5f6b7a" strokeWidth={1} />
            <text x={x(now)} y={m.t - 11} textAnchor="middle" fontSize="10.5" fontWeight="700" fill="#2b3442">{`${t('wave.now', lang)} ${fmtTime(now)}`}</text>
          </g>
        ) : null}
        {hover ? (
          <g pointerEvents="none">
            <line x1={x(hover.t)} x2={x(hover.t)} y1={m.t} y2={H - m.b} stroke="#0f2b46" strokeWidth={1} opacity={0.5} />
            <circle cx={x(hover.t)} cy={y(hover.ci)} r={4.5} fill="#0f2b46" stroke="#fff" strokeWidth={2} />
          </g>
        ) : null}
        <rect
          x={m.l}
          y={m.t}
          width={W - m.l - m.r}
          height={H - m.t - m.b}
          fill="transparent"
          onPointerMove={onMove}
          onPointerLeave={() => setHover(null)}
        />
      </svg>
      {hover ? (
        <div className="tip" style={{ left: `${(x(hover.t) / W) * 100}%`, top: `${(y(hover.ci) / H) * 100}%`, marginTop: -10 }}>
          <b>{fmtCi(hover.ci)}</b> {fmtTime(hover.t)}
          {hover.t > now ? <div>{t('wave.chance', lang)} {fmtPct(hover.p)}</div> : null}
        </div>
      ) : null}
      <div className="legend" style={{ marginTop: 2 }}>
        <span className="level" style={{ fontWeight: 600, fontSize: 12 }}>
          <svg width="18" height="6" aria-hidden="true"><line x1="0" y1="3" x2="18" y2="3" stroke="#0f2b46" strokeWidth="2" /></svg>
          {t('wave.ci', lang)}
        </span>
        <span className="level" style={{ fontWeight: 600, fontSize: 12 }}>
          <svg width="18" height="10" aria-hidden="true"><rect width="18" height="10" rx="2" fill="#0f2b46" opacity=".12" /><line x1="0" y1="5" x2="18" y2="5" stroke="#0f2b46" strokeWidth="2" strokeDasharray="4 3" /></svg>
          {lang === 'ko' ? '예측 (80% 범위)' : lang === 'ja' ? '予測（80%範囲）' : lang === 'zhHans' ? '预测（80%区间）' : lang === 'zhHant' ? '預測（80%區間）' : 'Forecast (80% range)'}
        </span>
        <span className="level" style={{ fontWeight: 600, fontSize: 12 }}>
          <i style={{ background: '#00a396', width: 8, height: 8 }} />
          {lang === 'ko' ? '시간별 관측' : lang === 'ja' ? '毎時の観測' : lang === 'zhHans' ? '每小时观测' : lang === 'zhHant' ? '每小時觀測' : 'Hourly data'}
        </span>
      </div>
    </div>
  );
}

export function BrandMark() {
  return (
    <div className="brand" aria-label="PADO CALL">
      <WaveMark size={26} />
      <span>
        PADO <b>CALL</b>
      </span>
    </div>
  );
}
