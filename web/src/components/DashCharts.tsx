/** Dashboard charts (SVG, hover tooltips, every chart has a table twin in the panel). */
import { useState, type ReactNode } from 'react';
import type { HourStat } from '../engine/drt';
import type { GatewayPlan, Trip } from '../engine/airport';
import { ciLevel } from '../engine/crowd';
import { fmtTime } from '../i18n/strings';

export const ZONE_COLOR = { A: '#00a396', B: '#2e6fbf', airport: '#c07a00' } as const;
const GRID = '#ebeff4';
const AXIS = '#c9d1db';
const MUTED = '#5f6b7a';
const INK = '#2b3442';
const CRIT = '#e5484d';

interface TipState {
  x: number; // % of width
  y: number; // % of height
  body: ReactNode;
}

function Tip({ tip }: { tip: TipState | null }) {
  if (!tip) return null;
  return (
    <div className="dtip" style={{ left: `${tip.x}%`, top: `${tip.y}%` }}>
      {tip.body}
    </div>
  );
}

const topRounded = (x: number, y: number, w: number, h: number, r = 4) => {
  if (h <= 0) return '';
  const rr = Math.min(r, h, w / 2);
  return `M${x},${y + h}V${y + rr}Q${x},${y} ${x + rr},${y}H${x + w - rr}Q${x + w},${y} ${x + w},${y + rr}V${y + h}Z`;
};

/* ------------------------------------------------------------------ fleet: allocated vs required */
export function FleetChart({ hours, required, color, label }: { hours: HourStat[]; required: { hour: number; required: number }[]; color: string; label: string }) {
  const W = 300;
  const H = 172;
  const m = { l: 22, r: 4, t: 18, b: 22 };
  const n = hours.length;
  const band = (W - m.l - m.r) / n;
  const bw = Math.min(16, band * 0.62);
  const ymax = Math.max(5, ...required.map((r) => r.required), ...hours.map((h) => h.fleet)) + 0.5;
  const y = (v: number) => m.t + (1 - v / ymax) * (H - m.t - m.b);
  const [tip, setTip] = useState<TipState | null>(null);
  return (
    <div className="chart">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label}>
        {Array.from({ length: Math.floor(ymax) + 1 }, (_, v) => (
          <g key={v}>
            <line x1={m.l} x2={W - m.r} y1={y(v)} y2={y(v)} stroke={v === 0 ? AXIS : GRID} />
            <text x={m.l - 6} y={y(v) + 4} textAnchor="end" fontSize="10.5" fill={MUTED} className="tabular">{v}</text>
          </g>
        ))}
        {hours.map((h, i) => {
          const req = required.find((r) => r.hour === h.hour)?.required ?? 0;
          const cx = m.l + band * (i + 0.5);
          const short = req > h.fleet;
          const prevReq = i > 0 ? required.find((r) => r.hour === hours[i - 1].hour)?.required ?? 0 : 0;
          const runStart = short && !(i > 0 && prevReq > hours[i - 1].fleet);
          return (
            <g key={h.hour}>
              <path d={topRounded(cx - bw / 2, y(h.fleet), bw, y(0) - y(h.fleet))} fill={color} />
              <line x1={cx - bw / 2 - 3} x2={cx + bw / 2 + 3} y1={y(req)} y2={y(req)} stroke={short ? CRIT : INK} strokeWidth={2.5} strokeLinecap="round" />
              {runStart ? <text x={cx - bw / 2 - 3} y={y(req) - 6} fontSize="10.5" fontWeight="800" fill="#b4232a">부족</text> : null}
              {i % 2 === 0 ? <text x={cx} y={H - 6} textAnchor="middle" fontSize="10.5" fill={MUTED} className="tabular">{h.hour}시</text> : null}
              <rect
                x={cx - band / 2}
                y={m.t}
                width={band}
                height={H - m.t - m.b}
                fill="transparent"
                tabIndex={0}
                onPointerEnter={() => setTip({ x: (cx / W) * 100, y: (y(Math.max(req, h.fleet)) / H) * 100, body: (
                  <>
                    <b>{h.hour}시</b> 배치 {h.fleet}대 · 필요 {req}대
                    <br />평균 대기 {h.mean.toFixed(1)}분 · 30분 초과 {(h.p30 * 100).toFixed(1)}%
                  </>
                ) })}
                onFocus={() => setTip({ x: (cx / W) * 100, y: (y(Math.max(req, h.fleet)) / H) * 100, body: <><b>{h.hour}시</b> 배치 {h.fleet}대 · 필요 {req}대</> })}
                onPointerLeave={() => setTip(null)}
                onBlur={() => setTip(null)}
              />
            </g>
          );
        })}
      </svg>
      <Tip tip={tip} />
    </div>
  );
}

/* ------------------------------------------------------------------ wait-standard lines (A and B) */
export interface LineSeries {
  name: string;
  color: string;
  pts: { hour: number; v: number }[];
}

export function StandardLines({ series, std, stdLabel, unit, label, ymin = 0, format }: { series: LineSeries[]; std: number; stdLabel: string; unit: string; label: string; ymin?: number; format: (v: number) => string }) {
  const W = 300;
  const H = 172;
  const m = { l: 34, r: 22, t: 16, b: 22 };
  const h0 = Math.min(...series.flatMap((s) => s.pts.map((p) => p.hour)));
  const h1 = Math.max(...series.flatMap((s) => s.pts.map((p) => p.hour))) + 1;
  const vmax = Math.max(std * 1.6, ...series.flatMap((s) => s.pts.map((p) => p.v))) * 1.08;
  const x = (h: number) => m.l + ((h - h0) / (h1 - h0)) * (W - m.l - m.r);
  const y = (v: number) => m.t + (1 - (v - ymin) / (vmax - ymin)) * (H - m.t - m.b);
  const ticks = niceTicks(vmax);
  const [tip, setTip] = useState<TipState | null>(null);
  const [hov, setHov] = useState<number | null>(null);
  const onMove = (e: React.PointerEvent<SVGRectElement>) => {
    const box = (e.currentTarget.ownerSVGElement as SVGSVGElement).getBoundingClientRect();
    const sx = ((e.clientX - box.left) / box.width) * W;
    const hh = Math.min(h1 - 1, Math.max(h0, Math.floor(h0 + ((sx - m.l) / (W - m.l - m.r)) * (h1 - h0))));
    setHov(hh);
    setTip({
      x: (x(hh + 0.5) / W) * 100,
      y: (m.t / H) * 100 + 8,
      body: (
        <>
          <b>{hh}시</b>
          {series.map((s) => {
            const p = s.pts.find((q) => q.hour === hh);
            return (
              <div key={s.name}>
                <span className="k" style={{ background: s.color }} />
                <b style={{ fontSize: 13 }}>{p ? format(p.v) : '–'}</b> {s.name}
              </div>
            );
          })}
        </>
      ),
    });
  };
  return (
    <div className="chart">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label}>
        {ticks.map((v) => (
          <g key={v}>
            <line x1={m.l} x2={W - m.r} y1={y(v)} y2={y(v)} stroke={v === 0 ? AXIS : GRID} />
            <text x={m.l - 6} y={y(v) + 4} textAnchor="end" fontSize="10.5" fill={MUTED} className="tabular">{format(v)}</text>
          </g>
        ))}
        <line x1={m.l} x2={W - m.r} y1={y(std)} y2={y(std)} stroke={CRIT} strokeWidth={1.2} />
        <text x={W - m.r} y={y(std) - 5} textAnchor="end" fontSize="10.5" fontWeight="700" fill="#b4232a">{stdLabel}</text>
        {Array.from({ length: h1 - h0 }, (_, i) => h0 + i).filter((h) => h % 3 === 0).map((h) => (
          <text key={h} x={x(h + 0.5)} y={H - 6} textAnchor="middle" fontSize="10.5" fill={MUTED} className="tabular">{h}시</text>
        ))}
        {hov !== null ? <line x1={x(hov + 0.5)} x2={x(hov + 0.5)} y1={m.t} y2={H - m.b} stroke={INK} opacity={0.35} /> : null}
        {series.map((s) => {
          const d = s.pts.map((p, i) => `${i ? 'L' : 'M'}${x(p.hour + 0.5).toFixed(1)},${y(p.v).toFixed(1)}`).join('');
          const last = s.pts[s.pts.length - 1];
          return (
            <g key={s.name}>
              <path d={d} stroke={s.color} strokeWidth={2} fill="none" strokeLinejoin="round" strokeLinecap="round" />
              {last ? (
                <>
                  <circle cx={x(last.hour + 0.5)} cy={y(last.v)} r={4} fill={s.color} stroke="#fff" strokeWidth={2} />
                  <text x={x(last.hour + 0.5) + 8} y={y(last.v) + 4} fontSize="11" fontWeight="800" fill={INK}>{s.name}</text>
                </>
              ) : null}
              {hov !== null
                ? s.pts.filter((p) => p.hour === hov).map((p) => <circle key={p.hour} cx={x(p.hour + 0.5)} cy={y(p.v)} r={4.5} fill={s.color} stroke="#fff" strokeWidth={2} />)
                : null}
            </g>
          );
        })}
        <rect x={m.l} y={m.t} width={W - m.l - m.r} height={H - m.t - m.b} fill="transparent" onPointerMove={onMove} onPointerLeave={() => { setTip(null); setHov(null); }} />
      </svg>
      <Tip tip={tip} />
      <span className="sr-only">{unit}</span>
    </div>
  );
}

function niceTicks(vmax: number): number[] {
  const raw = vmax / 4;
  const p = Math.pow(10, Math.floor(Math.log10(raw)));
  const step = [1, 2, 2.5, 5, 10].map((k) => k * p).find((s) => s >= raw) ?? raw;
  const out: number[] = [];
  for (let v = 0; v <= vmax + 1e-9; v += step) out.push(Math.round(v * 1000) / 1000);
  return out;
}

/* ------------------------------------------------------------------ crowd heatmap */
export interface HeatRow {
  name: string;
  zone: 'A' | 'B';
  cells: { hour: number; ci: number; p: number; open: boolean }[];
}

export const HEAT = ['#d3efdf', '#f7e3a1', '#f5b27a', '#e5484d'];

export function CrowdHeatmap({ rows, now, label }: { rows: HeatRow[]; now: number; label: string }) {
  const hours = rows[0]?.cells.map((c) => c.hour) ?? [];
  const W = 1200;
  const lw = 104;
  const cw = (W - lw - 6) / hours.length;
  const ch = 26;
  const top = 40;
  const gapZone = 30;
  const firstB = rows.findIndex((r) => r.zone === 'B');
  const H = top + rows.length * ch + gapZone + 28;
  const [tip, setTip] = useState<TipState | null>(null);
  const yOf = (i: number) => top + i * ch + (rows[i].zone === 'B' ? gapZone : 0);
  const xNow = lw + ((now / 60 - hours[0]) / hours.length) * (W - lw - 6);
  return (
    <div className="chart heat">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label}>
        {hours.map((h, j) => <text key={h} x={lw + cw * (j + 0.5)} y={H - 8} textAnchor="middle" fontSize="12.5" fill={MUTED} className="tabular">{h}시</text>)}
        <text x={0} y={top - 12} fontSize="12.5" fontWeight="800" fill={MUTED}>A권역 해운대·광안리</text>
        {firstB >= 0 ? <text x={0} y={yOf(firstB) - 10} fontSize="12.5" fontWeight="800" fill={MUTED}>B권역 원도심·영도</text> : null}
        {rows.map((r, i) => (
          <g key={r.name}>
            <text x={lw - 12} y={yOf(i) + ch / 2 + 5} textAnchor="end" fontSize="13.5" fontWeight="700" fill={INK}>{r.name}</text>
            {r.cells.map((c, j) => {
              const fill = c.open ? HEAT[ciLevel(c.ci)] : '#f1f3f6';
              const cx = lw + cw * j;
              const body = c.open ? (
                <>
                  <b>{r.name}</b> {c.hour}:30
                  <br />혼잡지수 <b style={{ fontSize: 13 }}>{c.ci.toFixed(2)}</b>{c.hour * 60 + 30 > now ? ` · 혼잡 확률 ${(c.p * 100).toFixed(0)}%` : ' · 관측 보정'}
                </>
              ) : (
                <>
                  <b>{r.name}</b> {c.hour}:30 · 운영 시간 외
                </>
              );
              return (
                <g key={c.hour}>
                  <rect
                    x={cx + 1}
                    y={yOf(i) + 1}
                    width={cw - 2}
                    height={ch - 2}
                    rx={3}
                    fill={fill}
                    tabIndex={0}
                    aria-label={`${r.name} ${c.hour}시 ${c.open ? c.ci.toFixed(2) : '운영 시간 외'}`}
                    onPointerEnter={() => setTip({ x: ((cx + cw / 2) / W) * 100, y: (yOf(i) / H) * 100, body })}
                    onFocus={() => setTip({ x: ((cx + cw / 2) / W) * 100, y: (yOf(i) / H) * 100, body })}
                    onPointerLeave={() => setTip(null)}
                    onBlur={() => setTip(null)}
                  />
                  {c.open && c.ci >= 1 ? (
                    <text x={cx + cw / 2} y={yOf(i) + ch / 2 + 5} textAnchor="middle" fontSize="13" fontWeight="800" fill="#fff" pointerEvents="none">{c.ci.toFixed(1)}</text>
                  ) : null}
                </g>
              );
            })}
          </g>
        ))}
        {now / 60 >= hours[0] && now / 60 <= hours[hours.length - 1] + 1 ? (
          <g pointerEvents="none">
            <line x1={xNow} x2={xNow} y1={top - 8} y2={H - 24} stroke={INK} strokeWidth={1.5} />
            <text x={xNow - 8} y={top - 12} textAnchor="end" fontSize="12.5" fontWeight="700" fill={MUTED}>관측 보정</text>
            <text x={xNow + 8} y={top - 12} fontSize="12.5" fontWeight="800" fill={INK}>{`예측 · 현재 ${fmtTime(now)}`}</text>
          </g>
        ) : null}
      </svg>
      <Tip tip={tip} />
    </div>
  );
}

/* ------------------------------------------------------------------ airport gateway Gantt */
export function GatewayGantt({ plan, now, label }: { plan: GatewayPlan; now: number; label: string }) {
  const W = 620;
  const t0 = 7 * 60;
  const t1 = 23 * 60 + 30;
  const lw = 52;
  const rowH = 40;
  const top = 10;
  const vans = Math.max(...plan.trips.map((t) => t.van));
  const H = top + vans * rowH + 26;
  const x = (tt: number) => lw + ((tt - t0) / (t1 - t0)) * (W - lw - 10);
  const [tip, setTip] = useState<TipState | null>(null);
  const show = (tr: Trip, cy: number) =>
    setTip({
      x: (x((tr.depart + tr.back) / 2) / W) * 100,
      y: (cy / H) * 100,
      body: (
        <>
          <b>{tr.kind === 'depot' ? '아침 출발(차고지→공항)' : `${fmtTime(tr.depart)} 공항 출발`}</b> · {tr.zone}권역
          <br />도착객 {tr.arrivals.length}팀({tr.arrivals.reduce((a, b) => a + b.pax, 0)}명) · 귀로 픽업 {tr.departures.length}팀({tr.departures.reduce((a, b) => a + b.pax, 0)}명)
          <br />공항 복귀 {fmtTime(tr.back50)} (계획 {fmtTime(tr.back)})
        </>
      ),
    });
  return (
    <div className="chart">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label}>
        {Array.from({ length: 9 }, (_, i) => 8 + i * 2).map((h) => (
          <g key={h}>
            <line x1={x(h * 60)} x2={x(h * 60)} y1={top} y2={H - 22} stroke={GRID} />
            <text x={x(h * 60)} y={H - 7} textAnchor="middle" fontSize="10.5" fill={MUTED} className="tabular">{h}시</text>
          </g>
        ))}
        {Array.from({ length: vans }, (_, v) => (
          <text key={v} x={lw - 10} y={top + v * rowH + rowH / 2 + 4} textAnchor="end" fontSize="12" fontWeight="700" fill={INK}>{`차량 ${v + 1}`}</text>
        ))}
        {plan.trips.map((tr) => {
          const cy = top + (tr.van - 1) * rowH + rowH / 2;
          const c = ZONE_COLOR[tr.zone];
          const outEnd = tr.kind === 'depot' ? tr.depart : tr.inZone;
          const outW = x(outEnd) - x(tr.depart);
          const pax = tr.arrivals.length;
          return (
            <g key={tr.id} tabIndex={0} onPointerEnter={() => show(tr, cy - 12)} onFocus={() => show(tr, cy - 12)} onPointerLeave={() => setTip(null)} onBlur={() => setTip(null)}>
              {tr.kind === 'out' ? <rect x={x(tr.depart)} y={cy - 11} width={Math.max(2, outW - 1)} height={22} rx={4} fill={c} /> : null}
              <rect x={x(outEnd) + 1} y={cy - 7} width={Math.max(2, x(tr.back) - x(outEnd) - 2)} height={14} rx={4} fill={c} opacity={0.35} />
              {tr.departures.map((b) => {
                const st = tr.stops.find((s) => s.booking.id === b.id);
                return st ? <circle key={b.id} cx={x(st.plan)} cy={cy} r={4} fill="#fff" stroke={c} strokeWidth={2} /> : null;
              })}
              {tr.kind === 'out' && outW >= 30 ? (
                <text x={x(tr.depart) + outW / 2} y={cy + 4} textAnchor="middle" fontSize="11" fontWeight="800" fill="#fff" pointerEvents="none">{`${pax}팀`}</text>
              ) : null}
            </g>
          );
        })}
        {now >= t0 && now <= t1 ? <line x1={x(now)} x2={x(now)} y1={top - 4} y2={H - 22} stroke={INK} strokeWidth={1.5} /> : null}
      </svg>
      <Tip tip={tip} />
    </div>
  );
}

/* ------------------------------------------------------------------ dispersal dumbbell */
export function Dumbbell({ rows, label }: { rows: { name: string; base: number; app: number }[]; label: string }) {
  const W = 600;
  const lw = 84;
  const rowH = 27;
  const top = 18;
  const H = top + rows.length * rowH + 24;
  const vmax = Math.max(2, ...rows.map((r) => Math.max(r.base, r.app))) * 1.05;
  const x = (v: number) => lw + (v / vmax) * (W - lw - 30);
  const [tip, setTip] = useState<TipState | null>(null);
  const ticks = [0, 0.5, 1, 1.5, 2].filter((v) => v <= vmax);
  return (
    <div className="chart">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label}>
        {ticks.map((v) => (
          <g key={v}>
            <line x1={x(v)} x2={x(v)} y1={top - 6} y2={H - 22} stroke={v === 1 ? CRIT : GRID} strokeWidth={v === 1 ? 1.2 : 1} />
            <text x={x(v)} y={H - 7} textAnchor="middle" fontSize="12" fill={v === 1 ? '#b4232a' : MUTED} fontWeight={v === 1 ? 700 : 400} className="tabular">{v.toFixed(1)}</text>
          </g>
        ))}
        {rows.map((r, i) => {
          const cy = top + i * rowH + rowH / 2;
          const moved = Math.abs(r.base - r.app) >= 0.03;
          return (
            <g key={r.name} tabIndex={0}
              onPointerEnter={() => setTip({ x: (x(Math.max(r.base, r.app)) / W) * 100, y: (cy / H) * 100, body: <><b>{r.name}</b> 최고 혼잡지수 {r.base.toFixed(2)} → <b style={{ fontSize: 13 }}>{r.app.toFixed(2)}</b></> })}
              onFocus={() => setTip({ x: (x(Math.max(r.base, r.app)) / W) * 100, y: (cy / H) * 100, body: <><b>{r.name}</b> {r.base.toFixed(2)} → {r.app.toFixed(2)}</> })}
              onPointerLeave={() => setTip(null)}
              onBlur={() => setTip(null)}
            >
              <rect x={0} y={cy - rowH / 2} width={W} height={rowH} fill="transparent" />
              <text x={lw - 12} y={cy + 4.5} textAnchor="end" fontSize="13" fontWeight="700" fill={INK}>{r.name}</text>
              <line x1={x(r.base)} x2={x(r.app)} y1={cy} y2={cy} stroke="#c5ced8" strokeWidth={2} />
              <circle cx={x(r.base)} cy={cy} r={5} fill="#9aa6b3" stroke="#fff" strokeWidth={2} />
              <circle cx={x(r.app)} cy={cy} r={5} fill="#007e74" stroke="#fff" strokeWidth={2} />
              {moved && i < 3 ? <text x={x(Math.max(r.base, r.app)) + 10} y={cy + 4.5} fontSize="12" fontWeight="700" fill={INK} className="tabular">{`${r.base.toFixed(2)} → ${r.app.toFixed(2)}`}</text> : null}
            </g>
          );
        })}
      </svg>
      <Tip tip={tip} />
    </div>
  );
}
