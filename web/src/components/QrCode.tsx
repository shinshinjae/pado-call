/** QR code as crisp SVG (dark modules on white, 4-module quiet zone). */
import { useMemo } from 'react';
import { encode } from 'uqr';

export function qrPath(value: string): { d: string; dim: number } {
  const { data } = encode(value, { ecc: 'M', border: 0 });
  const q = 4;
  let d = '';
  data.forEach((row, y) => row.forEach((on, x) => {
    if (on) d += `M${x + q},${y + q}h1v1h-1z`;
  }));
  return { d, dim: data.length + 2 * q };
}

export function QrCode({ value, size = 176, label }: { value: string; size?: number; label: string }) {
  const { d, dim } = useMemo(() => qrPath(value), [value]);
  return (
    <svg className="qr" role="img" aria-label={label} viewBox={`0 0 ${dim} ${dim}`} width={size} height={size} shapeRendering="crispEdges">
      <rect width={dim} height={dim} fill="#ffffff" />
      <path d={d} fill="#0f2b46" />
    </svg>
  );
}
