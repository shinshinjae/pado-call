/** Schematic zone maps (not to scale) with crowd markers or a ride route. */
import type { KeyboardEvent } from 'react';
import { placesInZone, type Lang, type PlaceId } from '../data/places';
import type { ZoneId } from '../data/scenario';
import { CI_COLORS, ciLevel } from '../engine/crowd';
import { fmtCi } from '../i18n/strings';

const SEA = '#cfe3ee';
const LAND = '#f3f5f8';
const ROAD = '#ffffff';
const PARK = '#e2efe5';

const SHAPES: Record<ZoneId, JSX.Element> = {
  A: (
    <>
      <path
        d="M0,0 H360 V104 C352,108 344,112 338,118 C330,126 324,136 314,142 C300,150 288,160 272,164 C258,168 250,170 244,178 C240,186 246,198 240,208 C234,216 222,214 218,206 C212,194 204,180 190,170 C178,162 168,156 160,150 C154,146 146,150 140,158 C128,172 112,182 92,184 C70,186 48,178 30,168 C18,162 8,158 0,156 Z"
        fill={LAND}
      />
      <path d="M222,206 C216,196 212,188 220,182 C230,176 240,184 240,196 C240,206 232,212 222,206 Z" fill={PARK} />
      <path d="M296,0 C318,30 340,40 360,44 V0 Z" fill={PARK} />
      <path d="M176,0 C170,40 184,80 172,110 C166,128 160,140 158,150" stroke={SEA} strokeWidth="8" fill="none" strokeLinecap="round" />
      <g stroke={ROAD} strokeWidth="5" fill="none" strokeLinecap="round">
        <path d="M30,160 C60,170 80,166 96,160 C120,150 140,132 150,124 C170,104 186,80 196,64" />
        <path d="M196,64 C230,90 250,120 270,148" />
        <path d="M270,148 C290,140 306,124 322,112" />
        <path d="M262,156 C252,166 242,176 236,190" />
      </g>
      <path d="M22,170 C70,214 160,222 216,210" stroke="#97a7b7" strokeWidth="2.5" fill="none" />
      <path d="M22,170 C70,214 160,222 216,210" stroke="#ffffff" strokeWidth="0.8" fill="none" strokeDasharray="3 5" />
    </>
  ),
  B: (
    <>
      <path
        d="M0,0 H360 V58 C340,62 322,70 308,82 C300,90 298,100 300,112 L300,120 L268,122 C250,118 236,120 224,126 C206,134 188,138 170,138 C150,138 134,132 118,134 C96,136 80,146 60,150 C40,154 18,148 0,152 Z"
        fill={LAND}
      />
      <path d="M0,40 C24,30 50,40 70,62 C84,78 76,106 52,118 C30,128 10,118 0,112 Z" fill={PARK} />
      <path
        d="M150,170 C162,158 186,152 214,154 C246,156 276,160 300,170 C322,180 338,196 340,212 C342,228 330,240 316,240 L176,240 C160,232 148,216 146,200 C144,188 144,178 150,170 Z"
        fill={LAND}
      />
      <path d="M262,214 C276,200 300,198 318,206 C332,214 334,232 320,240 L270,240 C262,232 258,222 262,214 Z" fill={PARK} />
      <g stroke={ROAD} strokeWidth="5" fill="none" strokeLinecap="round">
        <path d="M236,52 C214,80 186,104 160,118" />
        <path d="M236,52 C256,70 272,88 284,106" />
        <path d="M160,118 C130,110 96,104 54,92" />
        <path d="M176,160 C170,172 166,182 168,190 C200,210 250,214 286,212" />
        <path d="M302,170 C310,174 316,178 318,184 C318,198 304,210 286,212" />
      </g>
      <path d="M176,136 L176,158" stroke="#97a7b7" strokeWidth="3" />
      <path d="M300,118 C308,134 308,152 302,170" stroke="#97a7b7" strokeWidth="2.5" fill="none" />
    </>
  ),
};

/** Label offsets per place (dx, dy, anchor) so labels avoid each other. */
const LABEL: Partial<Record<PlaceId, [number, number, 'start' | 'middle' | 'end']>> = {
  gwangalli: [0, 32, 'middle'],
  millak: [16, -10, 'start'],
  centum: [0, -18, 'middle'],
  haeundae: [0, 32, 'middle'],
  dongbaek: [16, 24, 'start'],
  blueline: [10, -18, 'end'],
  busanstn: [-6, -14, 'end'],
  nampo: [-14, -12, 'end'],
  gamcheon: [-14, -18, 'start'],
  huinnyeoul: [-14, 5, 'end'],
  taejongdae: [0, 24, 'middle'],
  ydcruise: [-14, -10, 'end'],
  cruise: [0, 22, 'middle'],
};

export interface CrowdMark {
  id: PlaceId;
  ci: number;
  open: boolean;
}

interface Props {
  zone: ZoneId;
  lang: Lang;
  mode: 'crowd' | 'ride';
  crowd?: CrowdMark[];
  selected?: PlaceId | null;
  from?: PlaceId;
  to?: PlaceId;
  vans?: number;
  onPick?: (id: PlaceId) => void;
  ariaLabel: string;
}

function Van({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x - 11},${y - 7})`} aria-hidden="true">
      <rect width="22" height="14" rx="4" fill="#0f2b46" />
      <rect x="13" y="3" width="6" height="4" rx="1" fill="#9fe7df" />
      <circle cx="6" cy="14" r="2" fill="#0f2b46" stroke="#fff" strokeWidth="1" />
      <circle cx="16" cy="14" r="2" fill="#0f2b46" stroke="#fff" strokeWidth="1" />
    </g>
  );
}

export function ZoneMap({ zone, lang, mode, crowd = [], selected, from, to, vans = 0, onPick, ariaLabel }: Props) {
  const places = placesInZone(zone);
  const byId = new Map(places.map((p) => [p.id, p]));
  const hubs = places.filter((p) => p.hub);
  const key = (id: PlaceId) => (e: KeyboardEvent<SVGGElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onPick?.(id);
    }
  };
  const route = from && to && from !== to ? [byId.get(from)!, byId.get(to)!] : null;
  return (
    <svg viewBox="0 0 360 240" role="group" aria-label={ariaLabel}>
      <rect width="360" height="240" fill={SEA} />
      {SHAPES[zone]}
      {route ? (
        <path
          d={`M${route[0].x},${route[0].y} Q${(route[0].x + route[1].x) / 2 + (route[1].y - route[0].y) * 0.25},${(route[0].y + route[1].y) / 2 - (route[1].x - route[0].x) * 0.25} ${route[1].x},${route[1].y}`}
          stroke="#00a396"
          strokeWidth="4"
          fill="none"
          strokeLinecap="round"
          strokeDasharray="8 6"
        />
      ) : null}
      {mode === 'ride'
        ? Array.from({ length: vans }, (_, i) => {
            const h = hubs[i % hubs.length];
            const k = Math.floor(i / hubs.length);
            return <Van key={i} x={h.x + 22 + k * 8} y={h.y - 16 - k * 6} />;
          })
        : null}
      {places.map((p) => {
        const m = crowd.find((c) => c.id === p.id);
        const lab = LABEL[p.id] ?? [0, -16, 'middle'];
        const isSel = selected === p.id;
        const name = p.short[lang];
        let marker: JSX.Element;
        let text = name;
        if (mode === 'crowd' && m) {
          const lv = ciLevel(m.ci);
          const r = 9 + 15 * Math.min(1.7, Math.max(0, m.ci));
          marker = (
            <>
              <circle cx={p.x} cy={p.y} r={r} fill={m.open ? CI_COLORS[lv] : '#9aa6b3'} opacity={m.open ? 0.22 : 0.15} />
              <circle className="focus-ring" cx={p.x} cy={p.y} r={8} fill={m.open ? CI_COLORS[lv] : '#9aa6b3'} stroke="#fff" strokeWidth={2} />
              {isSel ? <circle cx={p.x} cy={p.y} r={13} fill="none" stroke="#0f2b46" strokeWidth={2} /> : null}
            </>
          );
          text = m.open ? `${name} ${fmtCi(m.ci)}` : name;
        } else if (mode === 'ride' && (p.id === from || p.id === to)) {
          const c = p.id === from ? '#00a396' : '#0f2b46';
          marker = (
            <>
              <circle cx={p.x} cy={p.y} r={11} fill={c} stroke="#fff" strokeWidth={2} />
              <circle cx={p.x} cy={p.y} r={4} fill="#fff" />
            </>
          );
        } else {
          marker = <circle className="focus-ring" cx={p.x} cy={p.y} r={6} fill={mode === 'crowd' ? '#b9c4cf' : '#7d8a98'} stroke="#fff" strokeWidth={2} />;
        }
        const strong = isSel || p.id === from || p.id === to;
        return (
          <g
            key={p.id}
            className="map-place"
            role={onPick ? 'button' : undefined}
            tabIndex={onPick ? 0 : undefined}
            aria-label={onPick ? p.name[lang] : undefined}
            aria-pressed={onPick ? isSel : undefined}
            onClick={onPick ? () => onPick(p.id) : undefined}
            onKeyDown={onPick ? key(p.id) : undefined}
          >
            <circle cx={p.x} cy={p.y} r={20} fill="transparent" />
            {marker}
            <text
              x={p.x + lab[0]}
              y={p.y + lab[1]}
              textAnchor={lab[2]}
              fontSize={strong ? 12.5 : 11.5}
              fontWeight={strong ? 800 : 700}
              fill={strong ? '#0f2b46' : '#2b3442'}
              stroke="#fff"
              strokeWidth={3.2}
              paintOrder="stroke"
              strokeLinejoin="round"
            >
              {text}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
