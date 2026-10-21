import { DashHeader } from './ControlScreen';
import { ZONE_PARAMS } from '../data/scenario';
import { TOURIST_STANDARD } from '../engine/drt';
import { ENSEMBLE, OBS_NOISE } from '../engine/crowd';
import { ADOPTION, LOOKAHEAD, THETA } from '../engine/choice';
import { BATCH_MAX, CHECKIN_BEFORE, FARE_PER_PERSON, ON_TIME_MIN, READY_AFTER_LANDING, SEATS } from '../engine/airport';
import { SITES } from '../engine/ops';
import { placeById } from '../data/places';

const EQ: Record<string, [number, number]> = { m1: [194.614, 28.518], m2: [284.052, 19.964], m3: [192.606, 35.751], m5: [92.204, 29.868] };
const base = import.meta.env.BASE_URL;

function Eq({ id, alt }: { id: keyof typeof EQ; alt: string }) {
  const [w, h] = EQ[id];
  const s = 2.15;
  return <img className="eq" src={`${base}eq/${id}.svg`} alt={alt} width={Math.round(w * s)} height={Math.round(h * s)} />;
}

export function ModelScreen() {
  return (
    <div className="dash" lang="ko">
      <DashHeader current="model" />
      <main className="model">
        <p className="ref" style={{ margin: 0 }}>
          앱의 모든 계산은 브라우저에서 실행되는 TypeScript 엔진(web/src/engine)이 담당하며, 같은 계산을 Python 참조 엔진(engine-py)으로 교차 검증합니다. 입력 수요·관측은 시연용 가상 데이터입니다.
        </p>

        <section>
          <h2>1. 관광 DRT 대기시간 확률</h2>
          <p>
            권역 셔틀에 들어온 호출 수의 확률분포를 1분 단위로 앞으로 계산해, 지금 부르면 몇 분 안에 탈 수 있는지(평균·90% 대기·10/20/30분 안 승차 확률)와 시간대별 필요 차량을 구합니다.
            모형화 방법은 팀의 선행연구[1](정류장 수요 재구성과 Kolmogorov 전진방정식 기반 DRT 전환 조건)를 관광 권역용으로 단순화한 일반형이며, 수식과 보정 결과는 [1]을 인용합니다.
          </p>
          <div className="pipeline" aria-label="계산 흐름">
            <div><b>시간대별 호출 수요</b>권역·운영일 유형별 가상 수요, 귀가 사전예약 반영</div>
            <div><b>확률분포 전진 계산</b>1분 단위, 차량 수·합승 효과 반영</div>
            <div><b>대기시간 분포</b>평균, 90% 대기, 30분 초과 확률</div>
            <div><b>필요 차량·재배치</b>관광 기준을 맞추는 최소 차량, 크루즈·드론쇼 레버</div>
          </div>
          <table>
            <thead><tr><th>권역</th><th>회랑 길이</th><th>평균 이동</th><th>속도</th><th>우회 계수</th><th>합승 효과 ξ</th></tr></thead>
            <tbody>
              {(['A', 'B'] as const).map((z) => (
                <tr key={z}><td>{z === 'A' ? 'A 해운대·광안리' : 'B 원도심·영도'}</td><td>{ZONE_PARAMS[z].ellKm} km</td><td>{ZONE_PARAMS[z].rideKm} km</td><td>{ZONE_PARAMS[z].speedKmh} km/h</td><td>{ZONE_PARAMS[z].detour}</td><td>{ZONE_PARAMS[z].xi}</td></tr>
              ))}
            </tbody>
          </table>
          <p className="eqcap">관광 대기 기준: 시간대 평균 대기 ≤ {TOURIST_STANDARD.meanMax}분, 30분 초과 확률 ≤ {TOURIST_STANDARD.tailProb * 100}% — 선행연구의 일반 DRT 기준(20분·40분)보다 엄격하게 설정했습니다. 권역·차량·수요 값은 기획안의 가정치입니다.</p>
        </section>

        <section>
          <h2>2. 혼잡도 예측 — 구획 모형 + 앙상블 칼만필터</h2>
          <p>명소마다 체류 인원을 유입과 체류시간으로 계산하고, 매시간 들어오는 관측으로 체류 인원과 그날의 유입 배수를 함께 보정한 뒤 1–3시간 앞을 예측합니다. 시연판의 관측은 가상 데이터입니다.</p>
          <div className="eqrow">
            <Eq id="m1" alt="dN_a/dt = A_a(t) − N_a(t)/T_a, CI_a(t) = N_a(t)/K_a" />
            <span className="eqcap">N: 체류 인원, A: 유입(추정 배수 포함), T: 평균 체류시간, K: 쾌적 수용 인원 → 혼잡지수 CI 4단계(0.5·0.8·1.0)</span>
            <Eq id="m2" alt="x^a_i = x^f_i + K(y + ε_i − H x^f_i), K = P^f H^T (H P^f H^T + R)^{-1}" />
            <span className="eqcap">앙상블 {ENSEMBLE}개, 관측 오차 {OBS_NOISE * 100}%, 상태 = [체류 인원, log 유입 배수]. 명소별 국소 분석으로 서로 무관한 명소 간 가짜 상관을 막습니다. 예측의 80% 범위와 P(CI&gt;1)은 앙상블에서 바로 계산합니다.</span>
          </div>
          <h3 className="sub-h">향후 구현 — 통신사 실시간 유동인구로 혼잡도 계산</h3>
          <ul>
            <li><b>관측 데이터:</b> 통신사(SKT·KT 등)가 비식별 집계한 격자 단위 실시간 유동인구를 제휴로 받습니다. 개인 위치는 수집하지 않습니다.</li>
            <li><b>명소별 집계:</b> 명소 영역(폴리곤)과 겹치는 격자 인구를 면적 비율로 더해 관측값 y<sub>a</sub>(t)를 만듭니다.</li>
            <li><b>관측식:</b> y<sub>a</sub>(t) = c · N<sub>a</sub>(t) + ε. 배율 c(통신사 점유율·검출률)는 앙상블 상태에 넣어 함께 추정하거나, 시범 초기 며칠의 현장 계수로 보정합니다. 데이터가 갱신될 때마다 분석해 1–3시간 예측과 혼잡 확률 P(CI&gt;1)을 다시 계산합니다.</li>
            <li><b>보조 데이터:</b> 관광공사 관광지 집중률 예측(30일, 상대값)과 도시철도 역별 승하차는 유입의 사전분포로, 행사·크루즈 일정과 파도콜 셔틀 하차 인원은 보조 관측으로 함께 씁니다.</li>
            <li><b>상주 인구 처리:</b> 혼잡지수(물리적 혼잡)는 전체 인원으로 계산합니다. 관광객 분산 효과를 따로 볼 때는 같은 시간대의 평소 상주 인구 기준선을 빼서 방문 인구를 추정합니다. 감천·흰여울처럼 주거지와 겹치는 명소에 필요합니다.</li>
            <li><b>관측 오차:</b> 격자 크기와 명소 모양에 따라 명소별 관측 오차 R을 다르게 둡니다. 흰여울처럼 좁고 긴 명소는 격자 경계 오차가 커서 R을 크게 잡습니다.</li>
            <li><b>추진·비용:</b> 시범 운영 단계에서 부산시·관광공사 협의체를 통해 통신사 데이터 제휴를 확정합니다. 유상 제휴가 일반적이므로 데이터·API 예산에서 함께 검토합니다.</li>
          </ul>
          <table>
            <thead><tr><th>명소</th><th>쾌적 수용 K</th><th>평균 체류 T</th><th>하루 방문(평일·주말·크루즈·드론쇼, 가상)</th></tr></thead>
            <tbody>
              {SITES.map((s) => (
                <tr key={s.id}><td>{placeById(s.id).name.ko}</td><td>{s.spec.K.toLocaleString()}명</td><td>{s.spec.T}분</td><td>{s.spec.daily.weekday.toLocaleString()} · {s.spec.daily.weekend.toLocaleString()} · {s.spec.daily.cruise.toLocaleString()} · {s.spec.daily.drone.toLocaleString()}</td></tr>
              ))}
            </tbody>
          </table>
        </section>

        <section>
          <h2>3. 혼잡 회피 선택 확률과 분산 효과</h2>
          <p>관광객이 명소를 고를 확률에 도착 시점의 예측 혼잡지수를 벌점으로 넣습니다. 앱은 같은 권역 안의 운영 중인 명소만 제안하고, 효용은 평소 방문 패턴에 맞춰 보정해 혼잡 예측 때문에만 방문을 옮깁니다.</p>
          <div className="eqrow">
            <Eq id="m3" alt="P_u(a|t) = exp(V_ua − θ CI_a(t+Δ)) / Σ_b exp(V_ub − θ CI_b(t+Δ))" />
            <span className="eqcap">θ = {THETA}, Δ = {LOOKAHEAD}분, 앱 추천을 따르는 비율 {Math.round(ADOPTION * 100)}% (가정)</span>
            <Eq id="m5" alt="HHI(t) = Σ_a s_a(t)^2" />
            <span className="eqcap">방문 집중도(HHI)가 낮을수록 분산. 대시보드는 혼잡(CI&gt;1) 명소·시간과 명소별 최고 혼잡지수의 변화를 함께 보여 줍니다.</span>
          </div>
        </section>

        <section>
          <h2>4. 공항 게이트웨이 예약 배차</h2>
          <ul>
            <li>도착객 준비 시각 = 착륙 + {READY_AFTER_LANDING}분(입국·수하물). 같은 권역 예약을 묶어 출발하며, 가장 먼저 준비된 팀은 최대 {BATCH_MAX}–25분까지 합승을 기다립니다(다른 차량이 곧 돌아오면 짧게).</li>
            <li>차량 {SEATS}석, 권역별 숙소 앞 하차(가까운 곳부터). 공항으로 돌아오는 길에 같은 권역의 귀국객을 숙소에서 태웁니다(항공편 {CHECKIN_BEFORE / 60}시간 전 도착 기준, 맞는 픽업 시간대를 고르게 함).</li>
            <li>계획은 이동시간의 약 84% 분위수로 여유를 두고, 실제 운행은 이동시간 변동·항공편 지연을 몬테카를로로 뽑아 평가합니다. 지연된 팀은 다음 셔틀로 자동 변경되어 다른 팀의 출발을 붙잡지 않습니다.</li>
            <li>KPI: 예약 출발 {ON_TIME_MIN}분 이내 정시 출발률, 준비→출발 대기, 차량·시간당 처리건수 q, 제휴 택시 연결 건수. 요금 1인 {FARE_PER_PERSON.toLocaleString()}원(안).</li>
          </ul>
        </section>

        <section>
          <h2>검증</h2>
          <ul>
            <li>TypeScript 단위 테스트(vitest): 확률 보존, 단일 차량 M/M/1 정상분포 일치, 차량을 늘리면 대기가 줄어드는 단조성, 칼만 갱신과 EnKF의 일치, 선택 확률의 성질, 공항 배차의 좌석·시간창 제약 등.</li>
            <li>Python 참조 엔진(engine-py, NumPy/SciPy): 같은 입력으로 대기시간 분포와 혼잡 모형을 독립 구현해 TypeScript 결과와 수치 비교(pytest).</li>
          </ul>
          <p className="ref">[1] 신재완·김민수(2026), 「부산시 저수요 시내버스 운행의 수요응답형 교통 전환 조건: 1분 단위 정류장 수요 재구성과 Kolmogorov 전진방정식 모형」, 대한교통학회지 투고 원고. 이 저장소에는 [1]의 데이터·보정 결과가 포함되어 있지 않습니다.</p>
        </section>
      </main>
    </div>
  );
}
