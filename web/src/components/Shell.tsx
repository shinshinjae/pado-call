import { useState, type ReactNode } from 'react';
import { useApp } from '../state';
import { LANGS, fmtTime, t } from '../i18n/strings';
import type { Lang } from '../data/places';
import type { DayType } from '../data/scenario';
import { BrandMark } from './Widgets';
import { Icon } from './Icon';

export const DAY_LABEL: Record<DayType, { ko: string; en: string }> = {
  weekday: { ko: '평일', en: 'Weekday' },
  weekend: { ko: '주말', en: 'Weekend' },
  cruise: { ko: '크루즈 입항일', en: 'Cruise day' },
  drone: { ko: '드론쇼 토요일', en: 'Drone-show Saturday' },
};

export function LangPick() {
  const { lang, setLang } = useApp();
  return (
    <label className="lang-pick">
      <span className="sr-only">{t('lang.label', lang)}</span>
      <Icon name="globe" size={16} className="globe" />
      <select value={lang} onChange={(e) => setLang(e.target.value as Lang)}>
        {LANGS.map((l) => (
          <option key={l.id} value={l.id} lang={l.html}>
            {l.label}
          </option>
        ))}
      </select>
      <Icon name="caret" size={14} className="caret" />
    </label>
  );
}

export function DemoPanel() {
  const { day, setDay, clock, setClock } = useApp();
  const [open, setOpen] = useState(false);
  return (
    <aside className="demo" aria-label="시연 설정 Demo controls" lang="ko">
      <div className="demo-strip">
        <span>
          <span className="tag">시연 Demo</span> · {DAY_LABEL[day].ko} {fmtTime(clock)}
        </span>
        <button type="button" aria-expanded={open} onClick={() => setOpen(!open)}>
          {open ? '닫기' : '설정'}
        </button>
      </div>
      <div className="demo-body" style={{ display: open ? 'grid' : 'none' }}>
        <div>
          <h2>시연 설정 · Demo controls</h2>
          <p style={{ marginTop: 6 }}>모든 수치는 가상 수요로 브라우저에서 계산한 시연값입니다. All numbers are computed in your browser from virtual demand.</p>
        </div>
        <div>
          <p className="fine" style={{ marginBottom: 6 }}>운영일 · Scenario</p>
          <div className="row">
            {(Object.keys(DAY_LABEL) as DayType[]).map((d) => (
              <button key={d} type="button" className="opt" aria-pressed={day === d} onClick={() => setDay(d)}>
                {DAY_LABEL[d].ko}
              </button>
            ))}
          </div>
        </div>
        <div>
          <p className="fine" style={{ marginBottom: 6 }}>시각 · Demo clock</p>
          <div className="clock">
            <output aria-live="polite">{fmtTime(clock)}</output>
            <input
              type="range"
              min={6 * 60}
              max={23 * 60 + 50}
              step={10}
              value={clock}
              aria-label="시각"
              onChange={(e) => setClock(Number(e.target.value))}
            />
            <div className="nudge">
              <button type="button" onClick={() => setClock(Math.max(360, clock - 30))} aria-label="30분 전">−30</button>
              <button type="button" onClick={() => setClock(Math.min(1430, clock + 30))} aria-label="30분 후">+30</button>
            </div>
          </div>
        </div>
        <div className="links">
          <a href="#/control">관제·예약 대시보드 <span>Control</span></a>
          <a href="#/model">수리모형 설명 <span>Models</span></a>
          <a href="#/driver">기사 앱 · QR 탑승 확인 <span>Driver</span></a>
        </div>
        <p className="fine">지도는 OpenStreetMap 실제 지도(연결이 안 되면 개략도)이고, 차량·요금·수요는 기획안의 가정치이며 결제는 모의 시연입니다.</p>
      </div>
    </aside>
  );
}

export function TabBar() {
  const { lang, route, go } = useApp();
  const items: { path: string; icon: 'van' | 'wave' | 'ticket'; key: 'nav.call' | 'nav.wave' | 'nav.trips' }[] = [
    { path: 'call', icon: 'van', key: 'nav.call' },
    { path: 'wave', icon: 'wave', key: 'nav.wave' },
    { path: 'trips', icon: 'ticket', key: 'nav.trips' },
  ];
  return (
    <nav className="tabbar" aria-label="PADO CALL">
      {items.map((it) => (
        <button key={it.path} type="button" aria-current={route.path === it.path ? 'page' : undefined} onClick={() => go(it.path)}>
          <Icon name={it.icon} size={24} />
          {t(it.key, lang)}
        </button>
      ))}
    </nav>
  );
}

export function TouristShell({ children }: { children: ReactNode }) {
  const { lang, toast } = useApp();
  return (
    <div className="stage">
      <main className="app">
        <div className="app-scroll">
          <header className="appbar">
            <BrandMark />
            <div className="row">
              <span className="pill" title={t('demo.badge', lang)}>{t('demo.badge', lang)}</span>
              <LangPick />
            </div>
          </header>
          <div className="screen">{children}</div>
        </div>
        <TabBar />
        {toast ? (
          <div className="toast" role="status">
            {toast}
          </div>
        ) : null}
      </main>
      <DemoPanel />
    </div>
  );
}
