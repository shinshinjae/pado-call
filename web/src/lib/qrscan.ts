/**
 * QR decoding for the driver screen: the browser's own BarcodeDetector where it exists
 * (Chrome on Android/macOS), otherwise jsQR, loaded only when the driver screen first scans.
 */
type Native = { detect: (src: CanvasImageSource) => Promise<{ rawValue: string }[]> };
type JsQR = (typeof import('jsqr'))['default'];

let nativeP: Promise<Native | null> | undefined;
let jsqrP: Promise<JsQR> | undefined;
let canvas: HTMLCanvasElement | undefined;

function native(): Promise<Native | null> {
  nativeP ??= (async () => {
    const BD = (window as unknown as { BarcodeDetector?: { new (o: { formats: string[] }): Native; getSupportedFormats?: () => Promise<string[]> } }).BarcodeDetector;
    if (!BD) return null;
    try {
      const formats = (await BD.getSupportedFormats?.()) ?? [];
      return formats.includes('qr_code') ? new BD({ formats: ['qr_code'] }) : null;
    } catch {
      return null;
    }
  })();
  return nativeP;
}

const jsqr = () =>
  (jsqrP ??= import('jsqr')
    .then((m) => m.default)
    .catch((e) => {
      jsqrP = undefined; // offline at first use: try again on the next frame
      throw e;
    }));

/** Load jsQR ahead of the first scan (no-op where the native detector exists). */
export async function warmUp(): Promise<void> {
  if (!(await native())) await jsqr();
}

/** Decode one frame or picture; `thorough` tries a larger working size and inverted images too. */
export async function decodeQr(src: CanvasImageSource, w: number, h: number, thorough = false): Promise<string | null> {
  if (!w || !h) return null;
  const n = await native();
  if (n) {
    try {
      const hit = await n.detect(src);
      if (hit[0]?.rawValue) return hit[0].rawValue;
    } catch {
      /* fall through to jsQR */
    }
    if (!thorough) return null;
  }
  const decode = await jsqr();
  for (const max of thorough ? [1400, 900, 2200] : [800]) {
    const s = Math.min(1, max / Math.max(w, h));
    const cw = Math.round(w * s);
    const ch = Math.round(h * s);
    canvas ??= document.createElement('canvas');
    canvas.width = cw;
    canvas.height = ch;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return null;
    ctx.drawImage(src, 0, 0, cw, ch);
    const img = ctx.getImageData(0, 0, cw, ch);
    const hit = decode(img.data, cw, ch, { inversionAttempts: thorough ? 'attemptBoth' : 'dontInvert' });
    if (hit?.data) return hit.data;
    if (s === 1) break;
  }
  return null;
}

/** Decode a photo or screenshot chosen by the driver. */
export async function decodeQrFile(file: Blob): Promise<string | null> {
  if ('createImageBitmap' in window) {
    try {
      const bmp = await createImageBitmap(file);
      try {
        return await decodeQr(bmp, bmp.width, bmp.height, true);
      } finally {
        bmp.close();
      }
    } catch {
      /* fall back to <img> */
    }
  }
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    return await decodeQr(img, img.naturalWidth, img.naturalHeight, true);
  } catch {
    return null;
  } finally {
    URL.revokeObjectURL(url);
  }
}
