import { describe, expect, it } from 'vitest';
import { encode } from 'uqr';
import jsQR from 'jsqr';
import { makeBoardingToken, normCode, readBoardingToken, type BoardingClaims } from './boarding';

const claims: BoardingClaims = {
  c: 'PD-RFJJ', k: 'ride', f: 'gwangalli', t: 'centum', p: 2, a: 6000, u: 1178, d: 'drone', l: 'zhHans', n: 'wheelchair,luggage',
};

/** Draw the QR into an RGBA buffer (scale px per module, 4-module quiet zone) as a camera would see it. */
function raster(text: string, scale = 4) {
  const { data } = encode(text, { ecc: 'M', border: 0 });
  const q = 4;
  const dim = (data.length + 2 * q) * scale;
  const px = new Uint8ClampedArray(dim * dim * 4).fill(255);
  data.forEach((row, y) => row.forEach((on, x) => {
    if (!on) return;
    for (let dy = 0; dy < scale; dy++)
      for (let dx = 0; dx < scale; dx++) {
        const o = (((y + q) * scale + dy) * dim + (x + q) * scale + dx) * 4;
        px[o] = 15; px[o + 1] = 43; px[o + 2] = 70;
      }
  }));
  return { px, dim };
}

describe('boarding token', () => {
  it('round-trips the booking, including free-text notes', () => {
    const r = readBoardingToken(makeBoardingToken(claims));
    expect(r).toEqual({ ok: true, claims });
    const odd: BoardingClaims = { ...claims, k: 'arr', f: 'airport', t: 'haeundae', n: 'KE 1234 | 지연' };
    expect(readBoardingToken(makeBoardingToken(odd))).toEqual({ ok: true, claims: odd });
    const bare: BoardingClaims = { ...claims, n: undefined };
    delete bare.n;
    expect(readBoardingToken(makeBoardingToken(bare))).toEqual({ ok: true, claims: bare });
  });

  it('writes a fractional pickup minute as a whole minute', () => {
    const r = readBoardingToken(makeBoardingToken({ ...claims, u: 1178.36 }));
    expect(r.ok && r.claims.u).toBe(1178);
  });

  it('rejects edited or foreign codes', () => {
    const tok = makeBoardingToken(claims);
    const edited = tok.replace('|2|6000|', '|5|6000|');
    expect(edited).not.toBe(tok);
    expect(readBoardingToken(edited)).toEqual({ ok: false, reason: 'signature' });
    expect(readBoardingToken('https://example.com')).toEqual({ ok: false, reason: 'format' });
  });

  it('stays a small QR that survives camera-style decoding', () => {
    const tok = makeBoardingToken({ ...claims, f: 'huinnyeoul', t: 'taejongdae', p: 4, a: 12000, d: 'weekday', n: 'wheelchair,stroller,luggage' });
    expect(encode(tok, { ecc: 'M', border: 0 }).version).toBeLessThanOrEqual(8);
    const { px, dim } = raster(tok);
    const hit = jsQR(px, dim, dim);
    expect(hit?.data).toBe(tok);
    expect(readBoardingToken(hit!.data).ok).toBe(true);
  });

  it('normalises typed backup codes', () => {
    expect(normCode(' pd-rfjj ')).toBe('PD-RFJJ');
    expect(normCode('rfjj')).toBe('PD-RFJJ');
    expect(normCode('PD RF JJ')).toBe('PD-RFJJ');
    expect(normCode('PD-RFJJX')).toBeNull();
  });
});
