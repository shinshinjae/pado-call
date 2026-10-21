/**
 * One-time QR boarding token. The QR carries the booking itself (code, route, passengers, amount),
 * so the driver's device can check it even without a network connection.
 * A real deployment signs the token on the server (e.g. Ed25519) and the driver app verifies the
 * signature; the demo uses a keyed checksum so an edited code is still rejected.
 *
 * Format (ASCII, fields percent-encoded):  PDC1|code|kind|from|to|pax|amount|pickup|day|lang|note|check
 * A compact positional text keeps the QR small (version 6–8), which cameras read more reliably.
 */
export interface BoardingClaims {
  c: string; // booking code, PD-XXXX
  k: 'arr' | 'dep' | 'ride';
  f: string; // from (place / hotel area / airport)
  t: string; // to
  p: number; // passengers
  a: number; // amount (KRW), authorised at booking, captured at boarding
  u: number; // pickup minute of day
  d: string; // day type
  l: string; // passenger language
  n?: string; // requests (wheelchair, stroller, luggage) or flight number
}

const PREFIX = 'PDC1';
const DEMO_KEY = 'pado-call-demo';
const SEP = '|';
const KINDS = ['arr', 'dep', 'ride'];

const esc = (s: string) => encodeURIComponent(s).replace(/%2C/g, ',');

/** FNV-1a (32-bit) keyed checksum, base 36. */
function checksum(s: string): string {
  let h = 0x811c9dc5;
  const str = `${DEMO_KEY}${SEP}${s}`;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(36);
}

/** Numbers are written as whole numbers (the demo pickup minute can be fractional). */
export function makeBoardingToken(c: BoardingClaims): string {
  const r = (x: number) => Math.max(0, Math.round(x));
  const body = [PREFIX, c.c, c.k, c.f, c.t, r(c.p), r(c.a), r(c.u), c.d, c.l, c.n ?? ''].map((v) => esc(String(v))).join(SEP);
  return `${body}${SEP}${checksum(body)}`;
}

export type TokenCheck = { ok: true; claims: BoardingClaims } | { ok: false; reason: 'format' | 'signature' };

export function readBoardingToken(raw: string): TokenCheck {
  const parts = raw.trim().split(SEP);
  if (parts.length !== 12 || parts[0] !== PREFIX) return { ok: false, reason: 'format' };
  const body = parts.slice(0, 11).join(SEP);
  if (checksum(body) !== parts[11]) return { ok: false, reason: 'signature' };
  try {
    const [, c, k, f, t, p, a, u, d, l, n] = parts.slice(0, 11).map((x) => decodeURIComponent(x));
    const num = (x: string) => (/^\d{1,7}$/.test(x) ? Number(x) : NaN);
    const claims: BoardingClaims = { c, k: k as BoardingClaims['k'], f, t, p: num(p), a: num(a), u: num(u), d, l };
    if (n) claims.n = n;
    if (!/^PD-[A-Z0-9]{4}$/.test(c) || !KINDS.includes(k) || ![claims.p, claims.a, claims.u].every(Number.isFinite)) return { ok: false, reason: 'format' };
    return { ok: true, claims };
  } catch {
    return { ok: false, reason: 'format' };
  }
}

/** A typed backup code ("rfjj", "PD RFJJ", "pd-rfjj") in canonical form, or null. */
export function normCode(s: string): string | null {
  const m = s.trim().toUpperCase().replace(/\s+/g, '').match(/^(?:PD-?)?([A-Z0-9]{4})$/);
  return m ? `PD-${m[1]}` : null;
}
