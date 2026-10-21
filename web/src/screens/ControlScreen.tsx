import { useState, type ReactNode } from 'react';
import { useApp } from '../state';
import { placeById } from '../data/places';
import { SERVICE_HOURS, type DayType, type ZoneId } from '../data/scenario';
import { TOURIST_STANDARD } from '../engine/drt';
import { ciAt, isOpen, pOverAt } from '../engine/crowd';
import { ADOPTION } from '../engine/choice';
import { crowdAt, dispersalAt, gatewayAverages, gatewayDay, zoneDay, zoneRequired, SITES } from '../engine/ops';
import { fmtTime } from '../i18n/strings';
import { WaveMark } from '../components/Icon';
import { CrowdHeatmap, Dumbbell, FleetChart, GatewayGantt, HEAT, StandardLines, ZONE_COLOR, type HeatRow } from '../components/DashCharts';
import { DAY_LABEL } from '../components/Shell';

function Panel({ title, sub, table, children, wide }: { title: string; sub?: ReactNode; table: ReactNode; children: ReactNode; wide?: boolean }) {
  const [asTable, setAsTable] = useState(false);
  return (
    <section className={`panel${wide ? ' wide' : ''}`}>
      <div className="panel-head">
        <div>
          <h2>{title}</h2>
          {sub ? <p className="psub">{sub}</p> : null}
        </div>
        <button type="button" className="ptoggle" aria-pressed={asTable} onClick={() => setAsTable(!asTable)}>
          {asTable ? '차트로 보기' : '표로 보기'}
        </button>
      </div>
      {asTable ? <div className="tscroll">{table}</div> : children}
    </section>
  );
}

const DASH_TITLE = { control: '관제·예약 대시보드', model: '수리모형', driver: '기사 앱 · QR 탑승 확인' };

export function DashHeader({ current }: { current: 'control' | 'model' | 'driver' }) {
  return (
    <header className="dash-head">
      <div className="inner">
        <div className="title">
          <div className="brand"><WaveMark size={26} /><span>PADO <b>CALL</b></span></div>
          <span className="sep" aria-hidden="true" />
          <h1>{DASH_TITLE[current]}</h1>
        </div>
        <nav aria-label="파도콜">
          <a href="#/control" aria-current={current === 'control' ? 'page' : undefined}>관제 대시보드</a>
          <a href="#/model" aria-current={current === 'model' ? 'page' : undefined}>수리모형</a>
          <a href="#/driver" aria-current={current === 'driver' ? 'page' : undefined}>기사 앱</a>
          <a href="#/call">관광객 앱</a>
        </nav>
      </div>
    </header>
  );
}

export function ControlScreen() {
  const { day, setDay, clock, setClock, levers, setLevers } = useApp();
  const zones: ZoneId[] = ['A', 'B'];
  const days = { A: zoneDay('A', day, levers), B: zoneDay('B', day, levers) };
  const req = { A: zoneRequired('A', day, levers), B: zoneRequired('B', day, levers) };
  const f = crowdAt(day, clock);
  const disp = dispersalAt(day, clock);
  const gw = gatewayDay(day);
  const gwAvg = gatewayAverages(day);

  const calls = days.A.totalCalls + days.B.totalCalls;
  const vh = days.A.vehicleHours + days.B.vehicleHours;
  const hoursAll = [...days.A.hours, ...days.B.hours];
  const meets = hoursAll.filter((h) => h.meets).length;
  const shortHours = zones.flatMap((z) => days[z].hours.filter((h) => (req[z].find((r) => r.hour === h.hour)?.required ?? 0) > h.fleet).map((h) => `${z} ${h.hour}시`));
  const waits = [...gw.plan.waitArr.values()].sort((a, b) => a - b);
  const wMed = waits[Math.floor(waits.length / 2)] ?? 0;
  const w80 = waits[Math.floor(waits.length * 0.8)] ?? 0;

  const heatHours = Array.from({ length: 16 }, (_, i) => 8 + i);
  const heatRows: HeatRow[] = SITES.map((s, k) => ({
    name: placeById(s.id).short.ko,
    zone: s.zone,
    cells: heatHours.map((h) => ({ hour: h, ci: ciAt(f, k, h * 60 + 30), p: pOverAt(f, k, h * 60 + 30), open: isOpen(s.spec, day, h * 60 + 30) })),
  }));
  const dumbRows = SITES.map((s, k) => ({ name: placeById(s.id).short.ko, base: disp.peakBase[k], app: disp.peakApp[k] })).sort((a, b) => b.base - a.base);

  return (
    <div className="dash" lang="ko">
      <DashHeader current="control" />
      <div className="dash-filters">
        <div className="inner" role="group" aria-label="운영 조건">
          <div className="fgroup">
            <span className="flabel">운영일</span>
            <div className="fseg">
              {(Object.keys(DAY_LABEL) as DayType[]).map((d) => (
                <button key={d} type="button" aria-pressed={day === d} onClick={() => setDay(d)}>{DAY_LABEL[d].ko}</button>
              ))}
            </div>
          </div>
          <div className="fgroup fclock">
            <span className="flabel">기준 시각</span>
            <output>{fmtTime(clock)}</output>
            <input type="range" min={360} max={1430} step={10} value={clock} aria-label="기준 시각" onChange={(e) => setClock(Number(e.target.value))} />
          </div>
          <div className="fgroup" style={{ gap: 14, flexWrap: 'wrap' }}>
            <span className="flabel">운영 레버</span>
            <label className="ftoggle">
              <input type="checkbox" checked={levers.cruiseLend} onChange={(e) => setLevers({ ...levers, cruiseLend: e.target.checked })} />
              크루즈 입항일 A→B 1대 (09–18시, 영도 크루즈터미널 대기)
            </label>
            <label className="ftoggle">
              <input type="checkbox" checked={levers.droneSupport} onChange={(e) => setLevers({ ...levers, droneSupport: e.target.checked })} />
              드론쇼 B→A 야간 지원 (21:20~)
            </label>
            <label className="fslider">
              귀가 사전예약
              <input type="range" min={0} max={0.6} step={0.05} value={levers.preBook} onChange={(e) => setLevers({ ...levers, preBook: Number(e.target.value) })} />
              <output>{Math.round(levers.preBook * 100)}%</output>
            </label>
          </div>
        </div>
      </div>

      <main className="dash-body">
        <div className="kpis">
          <div className="tile">
            <div className="tl">권역 호출 (A+B, 하루)</div>
            <div className="tv">{Math.round(calls)}<small>건</small></div>
            <div className="ts">A {Math.round(days.A.totalCalls)} · B {Math.round(days.B.totalCalls)} · 가상 수요</div>
          </div>
          <div className="tile">
            <div className="tl">관광 대기 기준 충족</div>
            <div className="tv">{meets}<small>/ {hoursAll.length}시간</small></div>
            <div className="ts">{shortHours.length ? <span className="bad">미충족: {shortHours.slice(0, 3).join(', ')}{shortHours.length > 3 ? ' 외' : ''}</span> : <span className="ok">모든 운행 시간 충족</span>} · 평균 ≤{TOURIST_STANDARD.meanMax}분, 30분 초과 ≤{TOURIST_STANDARD.tailProb * 100}%</div>
          </div>
          <div className="tile">
            <div className="tl">차량·시간당 처리건수 q (권역)</div>
            <div className="tv">{(calls / vh).toFixed(2)}<small>건</small></div>
            <div className="ts">A {days.A.q.toFixed(2)} · B {days.B.q.toFixed(2)} · 차량 {vh.toFixed(0)}대·시간</div>
          </div>
          <div className="tile">
            <div className="tl">공항 셔틀 정시 출발률</div>
            <div className="tv">{(gw.exec.onTime * 100).toFixed(0)}<small>%</small></div>
            <div className="ts">예약 출발 5분 이내 · 가상 12일 평균 {(gwAvg.onTime * 100).toFixed(0)}%</div>
          </div>
          <div className="tile">
            <div className="tl">혼잡(CI&gt;1) 명소·시간</div>
            <div className="tv">{(disp.crowdedMinBase / 60).toFixed(1)} → {(disp.crowdedMinApp / 60).toFixed(1)}<small>시간</small></div>
            <div className="ts">앱 추천을 {Math.round(ADOPTION * 100)}%가 따를 때 · HHI {disp.hhiBase.toFixed(3)} → {disp.hhiApp.toFixed(3)}</div>
          </div>
        </div>

        <div className="dgrid">
          <Panel
            title="시간대별 배치 차량과 필요 차량"
            sub="막대: 운행 레버를 반영한 배치 차량 · 가로선: 그 시각까지 배치대로 운행했을 때 관광 대기 기준을 맞추는 최소 차량(확률분포 계산)"
            table={
              <table className="dtable">
                <thead><tr><th>시간</th><th>A 배치</th><th>A 필요</th><th>A 평균 대기(분)</th><th>B 배치</th><th>B 필요</th><th>B 평균 대기(분)</th></tr></thead>
                <tbody>
                  {Array.from({ length: 13 }, (_, i) => 9 + i).map((h) => {
                    const a = days.A.hours.find((x) => x.hour === h);
                    const b = days.B.hours.find((x) => x.hour === h);
                    return (
                      <tr key={h}>
                        <td>{h}시</td>
                        <td>{a?.fleet ?? '–'}</td><td>{req.A.find((r) => r.hour === h)?.required ?? '–'}</td><td>{a ? a.mean.toFixed(1) : '–'}</td>
                        <td>{b?.fleet ?? '–'}</td><td>{req.B.find((r) => r.hour === h)?.required ?? '–'}</td><td>{b ? b.mean.toFixed(1) : '–'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            }
          >
            <div className="multiples">
              {zones.map((z) => (
                <div key={z}>
                  <h3><span className="swatch" style={{ background: ZONE_COLOR[z] }} />{z === 'A' ? 'A 해운대·광안리' : 'B 원도심·영도'} <span style={{ fontWeight: 600, color: 'var(--muted)' }}>{fmtTime(SERVICE_HOURS[z][0])}–{fmtTime(SERVICE_HOURS[z][1])}</span></h3>
                  <FleetChart hours={days[z].hours} required={req[z]} color={ZONE_COLOR[z]} label={`${z}권역 시간대별 배치·필요 차량`} />
                </div>
              ))}
            </div>
            <div className="legend">
              <span className="lkey"><span className="swatch" style={{ background: ZONE_COLOR.A }} /><span className="swatch" style={{ background: ZONE_COLOR.B, marginLeft: -3 }} />배치 차량</span>
              <span className="lkey"><svg width="18" height="6" aria-hidden="true"><line x1="0" y1="3" x2="18" y2="3" stroke="#2b3442" strokeWidth="2.5" /></svg>필요 차량</span>
              <span className="lkey"><svg width="18" height="6" aria-hidden="true"><line x1="0" y1="3" x2="18" y2="3" stroke="#e5484d" strokeWidth="2.5" /></svg>부족 (필요 &gt; 배치)</span>
            </div>
          </Panel>

          <Panel
            title="시간대별 대기시간과 관광 기준"
            sub="왼쪽: 평균 대기 · 오른쪽: 30분 초과 확률 — 선행연구[1]의 방법을 단순화한 일반형 계산"
            table={
              <table className="dtable">
                <thead><tr><th>시간</th><th>A 평균(분)</th><th>A 30분 초과</th><th>A 90% 대기(분)</th><th>B 평균(분)</th><th>B 30분 초과</th><th>B 90% 대기(분)</th></tr></thead>
                <tbody>
                  {Array.from({ length: 13 }, (_, i) => 9 + i).map((h) => {
                    const a = days.A.hours.find((x) => x.hour === h);
                    const b = days.B.hours.find((x) => x.hour === h);
                    return (
                      <tr key={h}>
                        <td>{h}시</td>
                        <td>{a ? a.mean.toFixed(1) : '–'}</td><td>{a ? `${(a.p30 * 100).toFixed(1)}%` : '–'}</td><td>{a ? a.q90.toFixed(1) : '–'}</td>
                        <td>{b ? b.mean.toFixed(1) : '–'}</td><td>{b ? `${(b.p30 * 100).toFixed(1)}%` : '–'}</td><td>{b ? b.q90.toFixed(1) : '–'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            }
          >
            <div className="multiples">
              <StandardLines
                label="평균 대기시간"
                unit="분"
                std={TOURIST_STANDARD.meanMax}
                stdLabel={`기준 ${TOURIST_STANDARD.meanMax}분`}
                format={(v) => `${Math.round(v)}분`}
                series={zones.map((z) => ({ name: z, color: ZONE_COLOR[z], pts: days[z].hours.map((h) => ({ hour: h.hour, v: h.mean })) }))}
              />
              <StandardLines
                label="30분 초과 확률"
                unit="%"
                std={TOURIST_STANDARD.tailProb}
                stdLabel={`기준 ${TOURIST_STANDARD.tailProb * 100}%`}
                format={(v) => `${(v * 100).toFixed(v < 0.1 ? 0 : 0)}%`}
                series={zones.map((z) => ({ name: z, color: ZONE_COLOR[z], pts: days[z].hours.map((h) => ({ hour: h.hour, v: h.p30 })) }))}
              />
            </div>
            <div className="legend">
              <span className="lkey"><svg width="18" height="6" aria-hidden="true"><line x1="0" y1="3" x2="18" y2="3" stroke={ZONE_COLOR.A} strokeWidth="2" /></svg>A 해운대·광안리</span>
              <span className="lkey"><svg width="18" height="6" aria-hidden="true"><line x1="0" y1="3" x2="18" y2="3" stroke={ZONE_COLOR.B} strokeWidth="2" /></svg>B 원도심·영도</span>
              <span className="lkey"><svg width="18" height="6" aria-hidden="true"><line x1="0" y1="3" x2="18" y2="3" stroke="#e5484d" strokeWidth="1.5" /></svg>관광 대기 기준</span>
            </div>
          </Panel>

          <Panel
            wide
            title="명소 혼잡지수 — 관측 보정과 예측"
            sub="혼잡지수 CI = 체류 인원 ÷ 쾌적 수용 인원. 기준 시각까지는 매시간 관측으로 보정(앙상블 칼만필터), 이후는 예측. 시연은 가상 관측이며, 시범 단계에서는 통신사 실시간 유동인구를 관측으로 씁니다. 칸 위에 마우스를 올리면 값·혼잡 확률이 보입니다."
            table={
              <table className="dtable">
                <thead><tr><th>명소</th>{heatHours.map((h) => <th key={h}>{h}시</th>)}</tr></thead>
                <tbody>
                  {heatRows.map((r) => (
                    <tr key={r.name}><td>{r.name}</td>{r.cells.map((c) => <td key={c.hour}>{c.open ? c.ci.toFixed(2) : '–'}</td>)}</tr>
                  ))}
                </tbody>
              </table>
            }
          >
            <CrowdHeatmap rows={heatRows} now={clock} label="명소별 시간대 혼잡지수" />
            <div className="legend">
              {['쾌적 < 0.5', '보통 0.5–0.8', '붐빔 0.8–1.0', '혼잡 ≥ 1.0'].map((s, i) => (
                <span key={s} className="lkey"><span className="swatch" style={{ background: HEAT[i] }} />{s}</span>
              ))}
              <span className="lkey"><span className="swatch" style={{ background: '#f1f3f6', border: '1px solid #dee4ec' }} />운영 시간 외</span>
            </div>
          </Panel>

          <Panel
            title="공항 게이트웨이 배차 계획 (2대)"
            sub="진한 막대: 공항→숙소(도착객) · 연한 막대: 귀로(숙소 픽업 ○ 후 공항) · 가상 예약일"
            table={
              <table className="dtable">
                <thead><tr><th>차량</th><th>공항 출발</th><th>권역</th><th>도착객(팀/명)</th><th>귀로 픽업(팀)</th><th>공항 복귀</th></tr></thead>
                <tbody>
                  {gw.plan.trips.map((tr) => (
                    <tr key={tr.id}>
                      <td>{tr.van}</td><td>{tr.kind === 'depot' ? `${fmtTime(tr.depart)} 차고지` : fmtTime(tr.depart)}</td><td>{tr.zone}</td>
                      <td>{tr.arrivals.length}/{tr.arrivals.reduce((a, b) => a + b.pax, 0)}</td><td>{tr.departures.length}</td><td>{fmtTime(tr.back50)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            }
          >
            <GatewayGantt plan={gw.plan} now={clock} label="공항 게이트웨이 차량별 배차" />
            <div className="legend">
              <span className="lkey"><span className="swatch" style={{ background: ZONE_COLOR.A }} />A권역 운행</span>
              <span className="lkey"><span className="swatch" style={{ background: ZONE_COLOR.B }} />B권역 운행</span>
              <span className="lkey"><svg width="12" height="12" aria-hidden="true"><circle cx="6" cy="6" r="4" fill="#fff" stroke="#5f6b7a" strokeWidth="2" /></svg>숙소 픽업(귀국객)</span>
            </div>
            <div className="gw-kpis">
              <div><span>예약(도착·출발)</span><b>{gw.plan.bookings.filter((b) => b.dir === 'arr').length}·{gw.plan.bookings.filter((b) => b.dir === 'dep').length}건</b></div>
              <div><span>준비→출발 대기</span><b>중앙 {Math.round(wMed)}분</b><span>80%: {Math.round(w80)}분</span></div>
              <div><span>정시 출발 (몬테카를로)</span><b>{(gw.exec.onTime * 100).toFixed(0)}%</b></div>
              <div><span>차량·시간당 q</span><b>{gw.plan.q.toFixed(2)}건</b><span>12일 평균 {gwAvg.q.toFixed(2)}</span></div>
              <div><span>제휴 택시 연결</span><b>{gw.plan.fallback.length}건</b></div>
            </div>
          </Panel>

          <Panel
            title="앱 추천 반영 시 명소별 최고 혼잡지수"
            sub={`회색: 추천 없음 · 청록: 방문객 ${Math.round(ADOPTION * 100)}%가 1시간 뒤 예측을 보고 같은 권역의 덜 붐비는 곳을 고를 때`}
            table={
              <table className="dtable">
                <thead><tr><th>명소</th><th>추천 없음</th><th>앱 추천 반영</th><th>변화</th></tr></thead>
                <tbody>
                  {dumbRows.map((r) => (
                    <tr key={r.name}><td>{r.name}</td><td>{r.base.toFixed(2)}</td><td>{r.app.toFixed(2)}</td><td>{(r.app - r.base >= 0 ? '+' : '') + (r.app - r.base).toFixed(2)}</td></tr>
                  ))}
                </tbody>
              </table>
            }
          >
            <Dumbbell rows={dumbRows} label="명소별 최고 혼잡지수 변화" />
            <div className="legend">
              <span className="lkey"><svg width="12" height="12" aria-hidden="true"><circle cx="6" cy="6" r="5" fill="#9aa6b3" /></svg>추천 없음</span>
              <span className="lkey"><svg width="12" height="12" aria-hidden="true"><circle cx="6" cy="6" r="5" fill="#007e74" /></svg>앱 추천 반영</span>
              <span className="lkey"><svg width="18" height="6" aria-hidden="true"><line x1="0" y1="3" x2="18" y2="3" stroke="#e5484d" strokeWidth="1.5" /></svg>혼잡 1.0</span>
            </div>
          </Panel>
        </div>
      </main>
      <footer className="dash-foot">
        모든 수요·예약·관측값은 시연용 가상 데이터이며, 계산은 브라우저에서 실행됩니다. 대기시간 확률 계산은 선행연구[1]의 모형화 방법을 단순화한 일반형이며 [1]의 데이터·보정 결과는 포함하지 않습니다.
        <br />[1] 신재완·김민수(2026), 「부산시 저수요 시내버스 운행의 수요응답형 교통 전환 조건: 1분 단위 정류장 수요 재구성과 Kolmogorov 전진방정식 모형」, 대한교통학회지 투고 원고.
      </footer>
    </div>
  );
}
