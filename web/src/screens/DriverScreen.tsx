/** Driver app (Korean): scan the passenger's QR boarding pass → boarding confirmed and the card payment captured. */
import { useCallback, useEffect, useRef, useState } from 'react';
import { useApp, type TripRecord } from '../state';
import { AREAS, PLACES, type Lang } from '../data/places';
import type { DayType } from '../data/scenario';
import { fmtTime, fmtWon, t } from '../i18n/strings';
import { Icon } from '../components/Icon';
import { AIRPORT_NAME } from '../components/mapMarks';
import { DAY_LABEL } from '../components/Shell';
import { DashHeader } from './ControlScreen';
import type { BoardingClaims } from '../lib/boarding';
import { checkScan, type BoardLog, type ScanResult } from '../lib/trips';
import { decodeQr, decodeQrFile, warmUp } from '../lib/qrscan';

const LOG = 'padocall.boardlog.v1';
function readLog(): BoardLog[] {
  try {
    const v = JSON.parse(window.localStorage.getItem(LOG) ?? '[]');
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}
function writeLog(v: BoardLog[]) {
  try {
    window.localStorage.setItem(LOG, JSON.stringify(v));
  } catch {
    /* storage unavailable — the log stays in memory */
  }
}

const LANG_KO: Record<Lang, string> = { ko: '한국어', en: '영어', ja: '일본어', zhHans: '중국어(간체)', zhHant: '중국어(번체)' };
const REQ_KO: Record<string, string> = { wheelchair: '휠체어', stroller: '유모차', luggage: '큰 짐' };
const asLang = (l: string): Lang => (l in LANG_KO ? (l as Lang) : 'en');

function endName(k: BoardingClaims['k'], v: string, lang: Lang): string {
  if (v === 'airport') return AIRPORT_NAME[lang];
  const hit = k === 'ride' ? PLACES.find((p) => p.id === v) : AREAS.find((a) => a.id === v);
  return hit?.name[lang] ?? v;
}
const route = (c: BoardingClaims) => `${endName(c.k, c.f, 'ko')} → ${endName(c.k, c.t, 'ko')}`;
function kindKo(c: BoardingClaims): string {
  if (c.k !== 'ride') return c.k === 'arr' ? '공항 셔틀 (공항 → 숙소)' : '공항 셔틀 (숙소 → 공항)';
  const z = PLACES.find((p) => p.id === c.f)?.zone;
  return z ? `권역 셔틀 ${z}` : '권역 셔틀';
}
function requestsKo(c: BoardingClaims): string {
  if (!c.n) return '없음';
  if (c.k !== 'ride') return `항공편 ${c.n}`;
  return c.n.split(',').map((x) => REQ_KO[x] ?? x).join(' · ');
}
const dayKo = (d: string) => DAY_LABEL[d as DayType]?.ko ?? d;

type Via = 'camera' | 'photo' | 'code' | 'demo';
interface Shown {
  res: ScanResult;
  via: Via;
  at: number;
  key: number;
}

function Details({ c, pay }: { c: BoardingClaims; pay: string }) {
  return (
    <dl className="vdl">
      <dt>예약 코드</dt><dd className="mono">{c.c}</dd>
      <dt>구간</dt><dd>{route(c)}</dd>
      <dt>종류</dt><dd>{kindKo(c)}</dd>
      <dt>인원</dt><dd>{c.p}명</dd>
      <dt>승객 언어</dt><dd>{LANG_KO[asLang(c.l)]}</dd>
      <dt>요청</dt><dd>{requestsKo(c)}</dd>
      <dt>승차 예정</dt><dd>{fmtTime(c.u)} · {dayKo(c.d)}</dd>
      <dt>결제</dt><dd>{pay}</dd>
    </dl>
  );
}

function Verdict({ shown }: { shown: Shown }) {
  const { res, at } = shown;
  if (res.kind === 'ok') {
    const c = res.claims;
    const lang = asLang(c.l);
    return (
      <div className="verdict ok" role="status">
        <div className="vh"><Icon name="check" size={26} /> 탑승 확인 · 결제 확정</div>
        <p className="vs">{fmtTime(at)} · {fmtWon(c.a)} 결제가 확정됐어요 (부를 때 카드 승인 → 지금 매입).</p>
        <div className="greet" lang={lang === 'zhHans' ? 'zh-Hans' : lang === 'zhHant' ? 'zh-Hant' : lang}>
          <span className="gk">승객 언어로 인사 · {LANG_KO[lang]}</span>
          <span className="gl">{t('drv.welcome', lang, { b: endName(c.k, c.t, lang) })}</span>
          {lang !== 'ko' ? <span className="gko" lang="ko">{t('drv.welcome', 'ko', { b: endName(c.k, c.t, 'ko') })}</span> : null}
        </div>
        <Details c={c} pay={`${fmtWon(c.a)} 확정`} />
        {!res.trip ? <p className="vnote">다른 기기에서 발급된 탑승권이에요. 실서비스에서는 서버가 결제를 확정하고 승객 앱에 탑승 알림을 보냅니다.</p> : null}
      </div>
    );
  }
  if (res.kind === 'used') {
    return (
      <div className="verdict warn" role="alert">
        <div className="vh"><Icon name="warn" size={24} /> 이미 사용된 탑승권</div>
        <p className="vs">{fmtTime(res.at)}에 탑승 처리된 QR이에요. 같은 QR은 한 번만 쓸 수 있어요.</p>
        <Details c={res.claims} pay={`${fmtWon(res.claims.a)} 확정됨`} />
      </div>
    );
  }
  if (res.kind === 'cancelled') {
    return (
      <div className="verdict bad" role="alert">
        <div className="vh"><Icon name="x" size={24} /> 취소된 예약</div>
        <p className="vs">카드 승인이 이미 풀린 예약이에요. 탑승을 안내하지 마세요.</p>
        <Details c={res.claims} pay="승인 취소 (요금 없음)" />
      </div>
    );
  }
  if (res.kind === 'notfound') {
    return (
      <div className="verdict bad" role="alert">
        <div className="vh"><Icon name="x" size={24} /> 찾을 수 없는 코드 {res.code}</div>
        <p className="vs">이 기기에 없는 예약이에요. 실서비스에서는 서버에서 조회합니다 — 가능하면 QR을 찍어 주세요.</p>
      </div>
    );
  }
  return (
    <div className="verdict bad" role="alert">
      <div className="vh"><Icon name="x" size={24} /> {res.reason === 'signature' ? '위·변조된 QR' : '파도콜 탑승권이 아니에요'}</div>
      <p className="vs">
        {res.reason === 'signature'
          ? '예약 정보가 바뀐 QR이에요. 승객에게 앱의 탑승권을 다시 보여 달라고 해 주세요.'
          : '다른 QR이나 코드가 읽혔어요. 승객 앱 ‘내 여정’의 QR 탑승권을 비춰 주세요.'}
      </p>
    </div>
  );
}

/** Camera viewfinder; reports the first decoded QR text and stops. */
function useCamera(onText: (s: string) => void) {
  const video = useRef<HTMLVideoElement>(null);
  const stream = useRef<MediaStream | null>(null);
  const timer = useRef<number | undefined>(undefined);
  const cb = useRef(onText);
  cb.current = onText;
  const [on, setOn] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const stop = useCallback(() => {
    window.clearTimeout(timer.current);
    stream.current?.getTracks().forEach((tr) => tr.stop());
    stream.current = null;
    if (video.current) video.current.srcObject = null;
    setOn(false);
  }, []);
  useEffect(() => stop, [stop]);

  const start = useCallback(async () => {
    setErr(null);
    if (!navigator.mediaDevices?.getUserMedia) {
      setErr('이 브라우저에서는 카메라를 쓸 수 없어요. 사진·캡처로 확인하거나 예비 코드를 입력해 주세요.');
      return;
    }
    try {
      void warmUp().catch(() => undefined);
      const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false });
      stream.current = s;
      const v = video.current;
      if (!v) return stop();
      v.srcObject = s;
      await v.play();
      setOn(true);
      const tick = async () => {
        if (!stream.current) return;
        const text = await decodeQr(v, v.videoWidth, v.videoHeight).catch(() => null);
        if (!stream.current) return;
        if (text) {
          stop();
          cb.current(text);
          return;
        }
        timer.current = window.setTimeout(tick, 120);
      };
      void tick();
    } catch (e) {
      stop();
      const name = (e as { name?: string }).name;
      setErr(
        name === 'NotAllowedError' || name === 'SecurityError'
          ? '카메라 권한이 거부됐어요. 주소창의 카메라 권한을 허용하거나, 사진·캡처로 확인해 주세요.'
          : '카메라를 찾지 못했어요. 사진·캡처로 확인하거나 예비 코드를 입력해 주세요.',
      );
    }
  }, [stop]);

  return { video, on, err, start, stop };
}

export function DriverScreen() {
  const { trips, day, clock, boardTrip, route: r } = useApp();
  const [log, setLog] = useState<BoardLog[]>(readLog);
  const [shown, setShown] = useState<Shown | null>(null);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [fileErr, setFileErr] = useState<string | null>(null);
  const file = useRef<HTMLInputElement>(null);
  const verdictRef = useRef<HTMLDivElement>(null);
  const hl = r.params.get('c');

  const state = useRef({ trips, log, clock });
  state.current = { trips, log, clock };

  // the log may also change in another tab (a second driver screen)
  useEffect(() => {
    const on = (e: StorageEvent) => e.key === LOG && setLog(readLog());
    window.addEventListener('storage', on);
    return () => window.removeEventListener('storage', on);
  }, []);

  const handle = useCallback(
    (raw: string, via: Via) => {
      const { trips: ts, log: lg, clock: now } = state.current;
      const res = checkScan(raw, ts, lg);
      if (res.kind === 'ok') {
        if (res.trip) boardTrip(res.trip.id, now);
        const next = [{ at: now, claims: res.claims }, ...lg].slice(0, 200);
        state.current.log = next;
        setLog(next);
        writeLog(next);
        navigator.vibrate?.(60);
      }
      setShown({ res, via, at: now, key: Date.now() });
      window.setTimeout(() => verdictRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }), 30);
    },
    [boardTrip],
  );

  const cam = useCamera((text) => handle(text, 'camera'));

  const onFile = async (f: File | undefined) => {
    if (!f) return;
    setFileErr(null);
    setBusy(true);
    try {
      const text = await decodeQrFile(f);
      if (text) handle(text, 'photo');
      else setFileErr('사진에서 QR을 찾지 못했어요. QR이 화면에 크게 나오도록 다시 찍어 주세요.');
    } finally {
      setBusy(false);
      if (file.current) file.current.value = '';
    }
  };

  const pending = trips
    .filter((x): x is TripRecord & { token: string } => !!x.token && !x.cancelled && x.boardedAt == null)
    .sort((a, b) => Number(b.day === day) - Number(a.day === day) || a.pickup - b.pickup);
  const total = log.reduce((s, x) => s + x.claims.a, 0);

  useEffect(() => {
    if (hl) document.getElementById(`pk-${hl}`)?.scrollIntoView({ block: 'center' });
  }, [hl]);
  // fetch the QR reader once while online, so scanning still works if the network drops later
  useEffect(() => {
    void warmUp().catch(() => undefined);
  }, []);

  return (
    <div className="dash">
      <DashHeader current="driver" />
      <div className="dash-filters">
        <div className="inner">
          <span className="fgroup"><span className="flabel">차량</span><b className="ink">파도콜 셔틀 (시연 단말기)</b></span>
          <span className="fgroup"><span className="flabel">운영일·시각</span><b className="ink">{DAY_LABEL[day].ko} {fmtTime(clock)}</b></span>
          <span className="fgroup psub">시각·운영일은 관제 대시보드나 승객 앱의 시연 설정에서 바꿀 수 있어요.</span>
        </div>
      </div>
      <div className="drv-body">
        <div className="drv-col">
          <section className="panel">
            <div className="panel-head">
              <div>
                <h2>QR 탑승 확인</h2>
                <p className="psub">승객 앱 ‘내 여정’의 QR을 비추면 탑승이 확인되고, 부를 때 걸어 둔 카드 승인이 결제로 확정됩니다.</p>
              </div>
            </div>
            <div className="scan-view">
              <video ref={cam.video} playsInline muted aria-label="카메라 화면" style={{ opacity: cam.on ? 1 : 0 }} />
              {cam.on ? (
                <>
                  <div className="scan-frame" aria-hidden="true" />
                  <div className="scan-hint">QR을 네모 안에 맞춰 주세요</div>
                </>
              ) : (
                <div className="scan-idle">
                  <Icon name="qr" size={44} />
                  <span>카메라를 켜고 승객의 QR을 비춰 주세요</span>
                </div>
              )}
            </div>
            <div className="scan-actions">
              {cam.on ? (
                <button type="button" className="dbtn" onClick={cam.stop}><Icon name="x" size={18} /> 카메라 끄기</button>
              ) : (
                <button type="button" className="dbtn primary" onClick={() => void cam.start()}><Icon name="camera" size={18} /> 카메라로 스캔</button>
              )}
              <button type="button" className="dbtn" disabled={busy} onClick={() => file.current?.click()}>
                <Icon name="image" size={18} /> {busy ? '사진 읽는 중…' : '사진·캡처로 확인'}
              </button>
              <input ref={file} type="file" accept="image/*" hidden aria-label="QR 사진 선택" onChange={(e) => void onFile(e.target.files?.[0])} />
            </div>
            <form
              className="code-form"
              onSubmit={(e) => {
                e.preventDefault();
                if (code.trim()) handle(code, 'code');
              }}
            >
              <label htmlFor="bcode" className="flabel">예비 코드</label>
              <input id="bcode" value={code} onChange={(e) => setCode(e.target.value)} placeholder="PD-XXXX" autoComplete="off" autoCapitalize="characters" spellCheck={false} maxLength={9} />
              <button type="submit" className="dbtn">확인</button>
            </form>
            {cam.err || fileErr ? <p className="scan-err" role="alert">{cam.err ?? fileErr}</p> : null}
          </section>
          <div ref={verdictRef}>{shown ? <Verdict key={shown.key} shown={shown} /> : null}</div>
        </div>

        <div className="drv-col">
          <section className="panel">
            <div className="panel-head">
              <div>
                <h2>승차 예정 <span className="count">{pending.length}</span></h2>
                <p className="psub">이 브라우저에서 결제한 예약 · QR을 찍기 전까지 카드 승인 상태예요.</p>
              </div>
            </div>
            {pending.length ? (
              <ul className="pk-list">
                {pending.map((tr) => {
                  const c: BoardingClaims = { c: tr.code, k: tr.kind, f: tr.from, t: tr.to, p: tr.pax, a: tr.fare, u: tr.pickup, d: tr.day, l: tr.lang ?? 'en', n: tr.note };
                  return (
                    <li key={tr.id} id={`pk-${tr.code}`} className={`pk${hl === tr.code ? ' hl' : ''}`}>
                      <div className="pt">
                        {fmtTime(tr.pickup)}
                        {tr.day !== day ? <small>{dayKo(tr.day)}</small> : null}
                      </div>
                      <div className="pm">
                        <div className="pr">{route(c)}</div>
                        <div className="ps">
                          <span className="mono">{tr.code}</span> · {kindKo(c)} · {tr.pax}명 · {LANG_KO[asLang(c.l)]}
                          {c.n ? ` · ${requestsKo(c)}` : ''} · {fmtWon(tr.fare)} 승인
                        </div>
                      </div>
                      <button type="button" className="dbtn small" onClick={() => handle(tr.token, 'demo')}>
                        <Icon name="qr" size={16} /> QR 확인(시연)
                      </button>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="empty-note">
                승차 예정 승객이 없어요. <a href="#/call?seg=ride">승객 앱</a>에서 셔틀을 부르거나 공항 셔틀을 예약하면 여기에 나타나요.
              </p>
            )}
          </section>

          <section className="panel">
            <div className="panel-head">
              <div>
                <h2>탑승 완료 · 결제 확정</h2>
                <p className="psub">이 단말기에서 확인한 QR {log.length}건 · 합계 {fmtWon(total)}</p>
              </div>
              {log.length ? (
                <button
                  type="button"
                  className="ptoggle"
                  onClick={() => {
                    setLog([]);
                    writeLog([]);
                    setShown(null);
                  }}
                >
                  시연 기록 지우기
                </button>
              ) : null}
            </div>
            {log.length ? (
              <div className="tscroll">
                <table className="dtable">
                  <thead>
                    <tr><th>탑승</th><th>코드</th><th style={{ textAlign: 'left' }}>구간</th><th>인원</th><th>결제</th></tr>
                  </thead>
                  <tbody>
                    {log.map((x, i) => (
                      <tr key={`${x.claims.c}-${i}`}>
                        <td>{fmtTime(x.at)}</td>
                        <td className="mono">{x.claims.c}</td>
                        <td style={{ textAlign: 'left' }}>{route(x.claims)}</td>
                        <td>{x.claims.p}명</td>
                        <td>{fmtWon(x.claims.a)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="empty-note">아직 확인한 QR이 없어요.</p>
            )}
          </section>

          <p className="drv-fine">
            시연판 안내 — QR에는 예약 정보와 위·변조 확인값이 들어 있어 통신이 끊겨도 기사 단말기에서 확인됩니다. 같은 QR은 한 번만 쓸 수 있어요.
            실서비스에서는 서버 전자서명과 PG사 결제(승인 → 탑승 시 매입)를 연동하고, 노쇼·늦은 취소는 수수료(안)를 받습니다.
            이 화면은 같은 브라우저의 승객 앱 ‘내 여정’과 연동돼요.
          </p>
        </div>
      </div>
    </div>
  );
}
