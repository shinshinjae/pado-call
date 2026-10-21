/** Small stroke icons (24×24). */
type Name =
  | 'van' | 'plane' | 'wave' | 'ticket' | 'mic' | 'users' | 'bag' | 'wheelchair' | 'stroller'
  | 'pin' | 'warn' | 'clock' | 'globe' | 'caret' | 'check' | 'chev' | 'hotel' | 'camera' | 'x'
  | 'card' | 'qr' | 'image';

const P: Record<Name, JSX.Element> = {
  van: (
    <>
      <path d="M3 16.5V8.2C3 7 4 6 5.2 6h9.6c.7 0 1.3.3 1.7.8l3.6 4.2c.6.6.9 1.4.9 2.3v3.2" />
      <path d="M3 16.5h1.6M9.4 16.5h4.2M18.4 16.5H21" />
      <circle cx="7" cy="17" r="2.2" />
      <circle cx="16" cy="17" r="2.2" />
      <path d="M3.4 11h16.4M10 6.2V11" />
    </>
  ),
  plane: <path d="M10.5 13.5 3 11l1.2-1.6 8 .9 4.6-5.1a1.8 1.8 0 0 1 2.6 2.5l-5 4.6.8 8-1.6 1.2-2.5-7.5-3.4 3 .3 2.7-1.2 1-1.6-3.3-3.3-1.6 1-1.2 2.7.3z" />,
  wave: <path d="M2.5 14c2.4-4.6 5.4-4.6 7.6-.4s5.5 4.6 8.4-1.6c.8-1.6 1.9-2.4 3-2.4" />,
  ticket: (
    <>
      <path d="M4 7.5A1.5 1.5 0 0 1 5.5 6h13A1.5 1.5 0 0 1 20 7.5V10a2 2 0 0 0 0 4v2.5a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 16.5V14a2 2 0 0 0 0-4z" />
      <path d="M14.5 6.5v11" strokeDasharray="1.6 2.2" />
    </>
  ),
  mic: (
    <>
      <rect x="9" y="3" width="6" height="11" rx="3" />
      <path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21M8.5 21h7" />
    </>
  ),
  users: (
    <>
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3.5 19c.6-3.3 2.8-5 5.5-5s4.9 1.7 5.5 5" />
      <path d="M15.5 5.2a3 3 0 0 1 0 5.6M17.5 14.3c1.7.6 2.7 2.2 3 4.7" />
    </>
  ),
  bag: (
    <>
      <rect x="6" y="7" width="12" height="13" rx="2" />
      <path d="M9.5 7V4.5h5V7M10 11v5M14 11v5" />
    </>
  ),
  wheelchair: (
    <>
      <circle cx="11" cy="4.5" r="1.6" />
      <path d="M11 7.5v5.5h5l2.5 5" />
      <path d="M8 10.2a5.5 5.5 0 1 0 7.6 7" />
    </>
  ),
  stroller: (
    <>
      <path d="M4 5h2l2 9h10l2-6H7.2" />
      <circle cx="9" cy="18.5" r="1.7" />
      <circle cx="17" cy="18.5" r="1.7" />
      <path d="M13 8V4.5a5 5 0 0 1 5 5" />
    </>
  ),
  pin: (
    <>
      <path d="M12 21s-6.5-6-6.5-11A6.5 6.5 0 0 1 18.5 10c0 5-6.5 11-6.5 11z" />
      <circle cx="12" cy="10" r="2.3" />
    </>
  ),
  warn: (
    <>
      <path d="M12 3.8 2.8 19.5h18.4z" />
      <path d="M12 9.5v4.6M12 16.6v.4" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </>
  ),
  globe: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M3.5 12h17M12 3.5c2.6 2.4 3.8 5.2 3.8 8.5s-1.2 6.1-3.8 8.5c-2.6-2.4-3.8-5.2-3.8-8.5s1.2-6.1 3.8-8.5z" />
    </>
  ),
  caret: <path d="m7 10 5 5 5-5" />,
  check: <path d="m5 12.5 4.5 4.5L19 7.5" />,
  chev: <path d="m9.5 6 6 6-6 6" />,
  hotel: (
    <>
      <path d="M4 20V5.5A1.5 1.5 0 0 1 5.5 4h7A1.5 1.5 0 0 1 14 5.5V20M14 10h4.5a1.5 1.5 0 0 1 1.5 1.5V20M2.5 20h19" />
      <path d="M7.5 8h3M7.5 11.5h3M7.5 15h3M16.5 13.5h1M16.5 16.5h1" />
    </>
  ),
  camera: (
    <>
      <path d="M4 8.5A1.5 1.5 0 0 1 5.5 7h2.3L9.2 5h5.6l1.4 2h2.3A1.5 1.5 0 0 1 20 8.5v9A1.5 1.5 0 0 1 18.5 19h-13A1.5 1.5 0 0 1 4 17.5z" />
      <circle cx="12" cy="13" r="3.4" />
    </>
  ),
  x: <path d="M6.5 6.5l11 11M17.5 6.5l-11 11" />,
  card: (
    <>
      <rect x="3" y="5.5" width="18" height="13" rx="2" />
      <path d="M3 9.8h18M6.5 15h4" />
    </>
  ),
  qr: (
    <>
      <path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4z" />
      <path d="M14 14h2.5v2.5H14zM18.5 14H20M14 19.5h2.5M18.5 17.5V20H20" />
    </>
  ),
  image: (
    <>
      <rect x="3.5" y="4.5" width="17" height="15" rx="2" />
      <circle cx="9" cy="10" r="1.8" />
      <path d="M20.5 15.5l-4.8-4.8-8.7 8.8" />
    </>
  ),
};

export function Icon({ name, size = 20, className, title }: { name: Name; size?: number; className?: string; title?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden={title ? undefined : true}
      role={title ? 'img' : undefined}
    >
      {title ? <title>{title}</title> : null}
      {P[name]}
    </svg>
  );
}

export function WaveMark({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={(size * 14) / 22} viewBox="0 0 22 14" aria-hidden="true">
      <path d="M1.5 9 C4 3.5, 7 3.5, 9.5 8.5 S15.5 13.5, 20.5 5.5" stroke="#00A396" strokeWidth="3" fill="none" strokeLinecap="round" />
    </svg>
  );
}
