/**
 * Real map — MapLibre GL JS with OpenFreeMap vector tiles (OpenStreetMap data, no API key).
 * Markers are plain DOM elements (accessible buttons); the service area and route are GeoJSON layers.
 * Basemap labels follow the app language where OpenStreetMap has a translation.
 * If the map cannot load (offline, blocked, no WebGL) the schematic map passed as `fallback` is shown.
 *
 * URL switches for testing: ?map=schematic forces the fallback, ?map=blank uses an empty local style.
 */
import { useEffect, useRef, useState, type ReactNode } from 'react';
import 'maplibre-gl/dist/maplibre-gl.css';
import type { GeoJSONSource, Map as MLMap, Marker as MLMarker, StyleSpecification } from 'maplibre-gl';
import type { Lang } from '../data/places';

type ML = typeof import('maplibre-gl');

export const STYLE_URL = 'https://tiles.openfreemap.org/styles/positron';
const BLANK_STYLE: StyleSpecification = {
  version: 8,
  sources: {},
  layers: [{ id: 'bg', type: 'background', paint: { 'background-color': '#e8eef3' } }],
};
const FONT = "'Pretendard Variable', Pretendard, 'Noto Sans KR', 'Noto Sans CJK KR', 'Apple SD Gothic Neo', 'Malgun Gothic', 'Noto Sans JP', 'Noto Sans SC', sans-serif";
const LOAD_TIMEOUT = 10000;

let mlPromise: Promise<ML> | null = null;
function loadMapLibre(): Promise<ML> {
  if (!mlPromise) {
    mlPromise = Promise.all([import('maplibre-gl'), import('maplibre-gl/dist/maplibre-gl-worker.mjs?url')]).then(([ml, worker]) => {
      ml.setWorkerUrl(worker.default);
      return ml;
    });
    mlPromise.catch(() => {
      mlPromise = null;
    });
  }
  return mlPromise;
}

export function mapMode(): 'real' | 'schematic' | 'blank' {
  try {
    const m = new URLSearchParams(window.location.search).get('map');
    return m === 'schematic' || m === 'blank' ? m : 'real';
  } catch {
    return 'real';
  }
}

const LABEL_FIELD: Record<Lang, unknown> = {
  ko: ['coalesce', ['get', 'name:ko'], ['get', 'name']],
  en: ['coalesce', ['get', 'name:en'], ['get', 'name:latin'], ['get', 'name']],
  ja: ['coalesce', ['get', 'name:ja'], ['get', 'name']],
  zhHans: ['coalesce', ['get', 'name:zh-Hans'], ['get', 'name:zh'], ['get', 'name']],
  zhHant: ['coalesce', ['get', 'name:zh-Hant'], ['get', 'name:zh'], ['get', 'name']],
};

const UI_TEXT: Record<Lang, Record<string, string>> = {
  ko: {
    'CooperativeGesturesHandler.WindowsHelpText': 'Ctrl 키를 누른 채 스크롤하면 지도를 확대·축소해요',
    'CooperativeGesturesHandler.MacHelpText': '⌘ 키를 누른 채 스크롤하면 지도를 확대·축소해요',
    'CooperativeGesturesHandler.MobileHelpText': '두 손가락으로 지도를 움직이세요',
    'NavigationControl.ZoomIn': '확대',
    'NavigationControl.ZoomOut': '축소',
  },
  en: {
    'CooperativeGesturesHandler.WindowsHelpText': 'Use Ctrl + scroll to zoom the map',
    'CooperativeGesturesHandler.MacHelpText': 'Use ⌘ + scroll to zoom the map',
    'CooperativeGesturesHandler.MobileHelpText': 'Use two fingers to move the map',
    'NavigationControl.ZoomIn': 'Zoom in',
    'NavigationControl.ZoomOut': 'Zoom out',
  },
  ja: {
    'CooperativeGesturesHandler.WindowsHelpText': 'Ctrlキーを押しながらスクロールすると地図を拡大・縮小できます',
    'CooperativeGesturesHandler.MacHelpText': '⌘キーを押しながらスクロールすると地図を拡大・縮小できます',
    'CooperativeGesturesHandler.MobileHelpText': '2本の指で地図を動かしてください',
    'NavigationControl.ZoomIn': '拡大',
    'NavigationControl.ZoomOut': '縮小',
  },
  zhHans: {
    'CooperativeGesturesHandler.WindowsHelpText': '按住 Ctrl 键并滚动可缩放地图',
    'CooperativeGesturesHandler.MacHelpText': '按住 ⌘ 键并滚动可缩放地图',
    'CooperativeGesturesHandler.MobileHelpText': '请用两根手指移动地图',
    'NavigationControl.ZoomIn': '放大',
    'NavigationControl.ZoomOut': '缩小',
  },
  zhHant: {
    'CooperativeGesturesHandler.WindowsHelpText': '按住 Ctrl 鍵並捲動可縮放地圖',
    'CooperativeGesturesHandler.MacHelpText': '按住 ⌘ 鍵並捲動可縮放地圖',
    'CooperativeGesturesHandler.MobileHelpText': '請用兩根手指移動地圖',
    'NavigationControl.ZoomIn': '放大',
    'NavigationControl.ZoomOut': '縮小',
  },
};

const MAP_NOTE: Record<Lang, { loading: string; offline: string }> = {
  ko: { loading: '지도를 불러오는 중…', offline: '실제 지도를 불러오지 못해 개략도로 보여 드려요' },
  en: { loading: 'Loading map…', offline: 'Showing a schematic map because the map could not load' },
  ja: { loading: '地図を読み込み中…', offline: '地図を読み込めないため概略図を表示しています' },
  zhHans: { loading: '正在加载地图…', offline: '无法加载地图，显示示意图' },
  zhHant: { loading: '正在載入地圖…', offline: '無法載入地圖，顯示示意圖' },
};

const VAN_SVG =
  '<svg width="18" height="14" viewBox="0 0 22 16" aria-hidden="true"><rect x="1" y="1" width="20" height="11" rx="3" fill="#0f2b46" stroke="#fff" stroke-width="1.2"/><rect x="13" y="3" width="6" height="4" rx="1" fill="#9fe7df"/><circle cx="6" cy="13" r="2" fill="#0f2b46" stroke="#fff"/><circle cx="16" cy="13" r="2" fill="#0f2b46" stroke="#fff"/></svg>';
const PLANE_SVG =
  '<svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true"><path d="M10.5 13.5 3 11l1.2-1.6 8 .9 4.6-5.1a1.8 1.8 0 0 1 2.6 2.5l-5 4.6.8 8-1.6 1.2-2.5-7.5-3.4 3 .3 2.7-1.2 1-1.6-3.3-3.3-1.6 1-1.2 2.7.3z" fill="#fff"/></svg>';

export type MarkKind = 'crowd' | 'place' | 'pickup' | 'dest' | 'van' | 'airport' | 'hotel';
export interface MapMark {
  id: string;
  lng: number;
  lat: number;
  kind: MarkKind;
  label?: string;
  color?: string;
  halo?: number; // px, crowd halo diameter
  selected?: boolean;
  dim?: boolean;
  labelPos?: 'top' | 'bottom' | 'left' | 'right';
  clickable?: boolean;
  ariaLabel?: string;
}

interface Props {
  marks: MapMark[];
  polygon?: [number, number][];
  polygonColor?: string;
  line?: [number, number][];
  lineColor?: string;
  fitTo: [number, number][];
  lang: Lang;
  onPick?: (id: string) => void;
  fallback?: ReactNode;
  ariaLabel: string;
  aspect?: string; // CSS aspect-ratio, e.g. '3 / 2'
  children?: ReactNode; // overlays (badges)
}

const bboxOf = (pts: [number, number][]): [[number, number], [number, number]] => {
  const xs = pts.map((p) => p[0]);
  const ys = pts.map((p) => p[1]);
  return [
    [Math.min(...xs), Math.min(...ys)],
    [Math.max(...xs), Math.max(...ys)],
  ];
};

/** Smooth curved path between two points (quadratic Bézier), for a route sketch. */
export function curve(a: [number, number], b: [number, number], bend = 0.18, n = 32): [number, number][] {
  const mx = (a[0] + b[0]) / 2;
  const my = (a[1] + b[1]) / 2;
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const cx = mx - dy * bend;
  const cy = my + dx * bend;
  const out: [number, number][] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    out.push([(1 - t) ** 2 * a[0] + 2 * (1 - t) * t * cx + t * t * b[0], (1 - t) ** 2 * a[1] + 2 * (1 - t) * t * cy + t * t * b[1]]);
  }
  return out;
}

function markerElement(m: MapMark, onPick?: (id: string) => void): HTMLElement {
  const el = document.createElement(m.clickable ? 'button' : 'div');
  el.className = `mk mk-${m.kind} lab-${m.labelPos ?? 'bottom'}${m.selected ? ' is-sel' : ''}${m.dim ? ' is-dim' : ''}`;
  if (m.clickable && el instanceof HTMLButtonElement) {
    el.type = 'button';
    el.setAttribute('aria-label', m.ariaLabel ?? m.label ?? m.id);
    if (m.selected) el.setAttribute('aria-pressed', 'true');
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      onPick?.(m.id);
    });
  } else {
    el.setAttribute('aria-hidden', 'true');
  }
  if (m.kind === 'crowd' && m.halo) {
    const halo = document.createElement('span');
    halo.className = 'mk-halo';
    halo.style.width = `${m.halo}px`;
    halo.style.height = `${m.halo}px`;
    if (m.color) halo.style.background = m.color;
    el.appendChild(halo);
  }
  const dot = document.createElement('span');
  dot.className = 'mk-dot';
  if (m.color && m.kind === 'crowd') dot.style.background = m.color;
  if (m.kind === 'van') dot.innerHTML = VAN_SVG;
  if (m.kind === 'airport') dot.innerHTML = PLANE_SVG;
  el.appendChild(dot);
  if (m.label) {
    const lab = document.createElement('span');
    lab.className = 'mk-label';
    lab.textContent = m.label;
    el.appendChild(lab);
  }
  return el;
}

function applyLanguage(map: MLMap, lang: Lang) {
  const style = map.getStyle();
  if (!style?.layers) return;
  for (const layer of style.layers) {
    if (layer.type !== 'symbol') continue;
    const tf = map.getLayoutProperty(layer.id, 'text-field');
    if (!tf) continue;
    if (!JSON.stringify(tf).includes('name')) continue; // keep road refs, house numbers
    try {
      map.setLayoutProperty(layer.id, 'text-field', LABEL_FIELD[lang] as never);
    } catch {
      /* layer without a name field */
    }
  }
}

type Side = 'bottom' | 'top' | 'right' | 'left';
const SIDES: Side[] = ['bottom', 'top', 'right', 'left'];
interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}
const overlap = (a: Box, b: Box) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
const overlapArea = (a: Box, b: Box) =>
  Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x)) * Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));
/** A label may graze marker dots by this share of its own area when no side is fully free (never other labels). */
const GRAZE = 0.12;
const priority = (m: MapMark) =>
  (m.selected ? 100 : 0) + (m.kind === 'pickup' || m.kind === 'dest' || m.kind === 'airport' || m.kind === 'hotel' ? 80 : 0) + (m.kind === 'crowd' && !m.dim ? 10 : 0);

/** Greedy label placement: preferred side first, then the other sides, avoiding labels, dots and map controls. */
function layoutLabels(map: MLMap, items: { m: MapMark; el: HTMLElement }[]) {
  const box = map.getContainer();
  const W = box.clientWidth;
  const H = box.clientHeight;
  if (!W || !H) return;
  const placed: Box[] = [
    { x: 0, y: 0, w: 96, h: 40 }, // time badge
    { x: W - 46, y: 0, w: 46, h: 82 }, // zoom buttons
    { x: W - 34, y: H - 30, w: 34, h: 30 }, // attribution
  ];
  const pts = items.map(({ m }) => map.project([m.lng, m.lat]));
  const dots: Box[] = items.map(({ m }, i) => {
    const r = m.kind === 'airport' ? 15 : m.kind === 'pickup' || m.kind === 'dest' ? 11 : m.kind === 'van' ? 12 : 8;
    return { x: pts[i].x - r, y: pts[i].y - r, w: 2 * r, h: 2 * r };
  });
  const order = items.map((it, i) => ({ it, i })).sort((a, b) => priority(b.it.m) - priority(a.it.m));
  for (const { it, i } of order) {
    const lab = it.el.querySelector('.mk-label') as HTMLElement | null;
    if (!lab) continue;
    const w = lab.offsetWidth;
    const h = lab.offsetHeight;
    const p = pts[i];
    const gap = it.m.kind === 'airport' ? 18 : it.m.kind === 'hotel' ? 15 : 13;
    const pref: Side = it.m.labelPos ?? 'bottom';
    let chosen: Side = pref;
    let chosenBox: Box | null = null;
    let graze: { s: Side; b: Box; area: number } | null = null;
    for (const s of [pref, ...SIDES.filter((x) => x !== pref)]) {
      const b: Box =
        s === 'bottom' ? { x: p.x - w / 2, y: p.y + gap, w, h }
        : s === 'top' ? { x: p.x - w / 2, y: p.y - gap - h, w, h }
        : s === 'right' ? { x: p.x + gap, y: p.y - h / 2, w, h }
        : { x: p.x - gap - w, y: p.y - h / 2, w, h };
      const inside = b.x >= 2 && b.y >= 2 && b.x + b.w <= W - 2 && b.y + b.h <= H - 2;
      if (!inside || placed.some((q) => overlap(q, b))) continue;
      const area = dots.reduce((a, d, j) => (j !== i ? a + overlapArea(d, b) : a), 0);
      if (area === 0) {
        chosen = s;
        chosenBox = b;
        break;
      }
      if (area <= GRAZE * w * h && (!graze || area < graze.area)) graze = { s, b, area };
    }
    if (!chosenBox && graze) {
      chosen = graze.s;
      chosenBox = graze.b;
    }
    it.el.classList.remove('lab-top', 'lab-bottom', 'lab-left', 'lab-right');
    it.el.classList.add(`lab-${chosen}`);
    const keep = chosenBox !== null || priority(it.m) >= 80;
    lab.style.visibility = keep ? 'visible' : 'hidden';
    if (chosenBox) placed.push(chosenBox);
  }
}

const featurePolygon = (ring?: [number, number][]) => ({
  type: 'FeatureCollection' as const,
  features: ring && ring.length > 2 ? [{ type: 'Feature' as const, properties: {}, geometry: { type: 'Polygon' as const, coordinates: [ring] } }] : [],
});
const featureLine = (line?: [number, number][]) => ({
  type: 'FeatureCollection' as const,
  features: line && line.length > 1 ? [{ type: 'Feature' as const, properties: {}, geometry: { type: 'LineString' as const, coordinates: line } }] : [],
});

export function RealMap({ marks, polygon, polygonColor = '#00a396', line, lineColor = '#00a396', fitTo, lang, onPick, fallback, ariaLabel, aspect = '3 / 2', children }: Props) {
  const mode = mapMode();
  const box = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MLMap | null>(null);
  const markersRef = useRef<MLMarker[]>([]);
  const itemsRef = useRef<{ m: MapMark; el: HTMLElement }[]>([]);
  const mlRef = useRef<ML | null>(null);
  const onPickRef = useRef(onPick);
  onPickRef.current = onPick;
  const initial = useRef({ fitTo, lang });
  const [status, setStatus] = useState<'loading' | 'ready' | 'failed'>(mode === 'schematic' ? 'failed' : 'loading');

  // create the map once
  useEffect(() => {
    if (mode === 'schematic') return;
    let cancelled = false;
    let loaded = false;
    let timer = 0;
    const fail = () => {
      if (cancelled || loaded) return;
      cancelled = true;
      window.clearTimeout(timer);
      try {
        mapRef.current?.remove();
      } catch {
        /* ignore */
      }
      mapRef.current = null;
      setStatus('failed');
    };
    loadMapLibre()
      .then((ml) => {
        if (cancelled || !box.current) return;
        mlRef.current = ml;
        let map: MLMap;
        try {
          map = new ml.Map({
            container: box.current,
            style: mode === 'blank' ? BLANK_STYLE : STYLE_URL,
            bounds: bboxOf(initial.current.fitTo),
            fitBoundsOptions: { padding: 34 },
            attributionControl: { compact: true },
            cooperativeGestures: true,
            locale: UI_TEXT[initial.current.lang],
            localIdeographFontFamily: FONT,
            dragRotate: false,
            pitchWithRotate: false,
            touchPitch: false,
            maxZoom: 17,
            minZoom: 8,
          });
        } catch {
          fail();
          return;
        }
        mapRef.current = map;
        map.touchZoomRotate.disableRotation();
        map.addControl(new ml.NavigationControl({ showCompass: false }), 'top-right');
        timer = window.setTimeout(fail, LOAD_TIMEOUT);
        const relayout = () => {
          if (mapRef.current) layoutLabels(mapRef.current, itemsRef.current);
        };
        map.on('moveend', relayout);
        map.on('resize', relayout);
        map.on('error', () => {
          if (!loaded && !map.isStyleLoaded()) fail();
        });
        // ready as soon as the style is parsed (tiles may keep streaming in on slow networks)
        const onReady = () => {
          if (cancelled || loaded) return;
          loaded = true;
          window.clearTimeout(timer);
          map.addSource('zone', { type: 'geojson', data: featurePolygon() });
          map.addLayer({ id: 'zone-fill', type: 'fill', source: 'zone', paint: { 'fill-color': polygonColor, 'fill-opacity': 0.07 } });
          map.addLayer({ id: 'zone-line', type: 'line', source: 'zone', paint: { 'line-color': polygonColor, 'line-width': 2, 'line-opacity': 0.75, 'line-dasharray': [2, 1.5] } });
          map.addSource('route', { type: 'geojson', data: featureLine() });
          map.addLayer({ id: 'route-casing', type: 'line', source: 'route', layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': '#ffffff', 'line-width': 7, 'line-opacity': 0.9 } });
          map.addLayer({ id: 'route', type: 'line', source: 'route', layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': lineColor, 'line-width': 4, 'line-dasharray': [1.5, 1.2] } });
          setStatus('ready');
        };
        map.on('style.load', onReady);
        map.on('load', onReady);
      })
      .catch(fail);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];
      try {
        mapRef.current?.remove();
      } catch {
        /* ignore */
      }
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // basemap label language
  useEffect(() => {
    if (status === 'ready' && mapRef.current) applyLanguage(mapRef.current, lang);
  }, [status, lang]);

  // service area + route
  const polyKey = JSON.stringify(polygon ?? null);
  const lineKey = JSON.stringify(line ?? null);
  useEffect(() => {
    const map = mapRef.current;
    if (status !== 'ready' || !map) return;
    (map.getSource('zone') as GeoJSONSource | undefined)?.setData(featurePolygon(polygon));
    (map.getSource('route') as GeoJSONSource | undefined)?.setData(featureLine(line));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, polyKey, lineKey]);

  // camera
  const fitKey = JSON.stringify(fitTo);
  useEffect(() => {
    const map = mapRef.current;
    if (status !== 'ready' || !map || fitTo.length === 0) return;
    map.fitBounds(bboxOf(fitTo), { padding: 34, duration: 500, maxZoom: 15 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, fitKey]);

  // markers
  const markKey = JSON.stringify(marks);
  useEffect(() => {
    const map = mapRef.current;
    const ml = mlRef.current;
    if (status !== 'ready' || !map || !ml) return;
    markersRef.current.forEach((m) => m.remove());
    itemsRef.current = marks.map((m) => ({ m, el: markerElement(m, (id) => onPickRef.current?.(id)) }));
    markersRef.current = itemsRef.current.map(({ m, el }) => new ml.Marker({ element: el, anchor: 'center' }).setLngLat([m.lng, m.lat]).addTo(map));
    const raf = window.requestAnimationFrame(() => {
      if (mapRef.current) layoutLabels(mapRef.current, itemsRef.current);
    });
    return () => window.cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, markKey]);

  if (status === 'failed') {
    if (!fallback) return null;
    return (
      <>
        <div className="map-wrap">
          {fallback}
          {children}
        </div>
        {mode !== 'schematic' ? <p className="map-note">{MAP_NOTE[lang].offline}</p> : null}
      </>
    );
  }
  return (
    <div className="map-wrap real" style={{ aspectRatio: aspect }}>
      <div ref={box} className="rmap" role="region" aria-label={ariaLabel} />
      {status === 'loading' ? <div className="map-loading">{MAP_NOTE[lang].loading}</div> : null}
      {children}
    </div>
  );
}
