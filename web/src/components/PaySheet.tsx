/** Payment step before a call or booking: the card is authorised now and captured when the QR is scanned. */
import { useEffect, useRef, useState } from 'react';
import type { Lang } from '../data/places';
import type { PayMethod } from '../state';
import { fmtWon, t } from '../i18n/strings';
import { Icon } from './Icon';

const METHODS: PayMethod[] = ['card', 'wallet', 'alipay', 'kr'];

interface Props {
  lang: Lang;
  kind: 'ride' | 'airport';
  amount: number;
  summary: string;
  onConfirm: (m: PayMethod) => void;
  onClose: () => void;
}

export function PaySheet({ lang, kind, amount, summary, onConfirm, onClose }: Props) {
  const [method, setMethod] = useState<PayMethod>('card');
  const [busy, setBusy] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    box.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !busy) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [busy, onClose]);
  const confirm = () => {
    setBusy(true);
    window.setTimeout(() => onConfirm(method), 700);
  };
  return (
    <div className="sheet-backdrop" onClick={() => !busy && onClose()}>
      <div ref={box} className="sheet" role="dialog" aria-modal="true" aria-labelledby="pay-title" tabIndex={-1} onClick={(e) => e.stopPropagation()}>
        <div className="sheet-grip" aria-hidden="true" />
        <h2 id="pay-title">{t(kind === 'ride' ? 'pay.title.ride' : 'pay.title.airport', lang)}</h2>
        <div className="between" style={{ marginTop: 6 }}>
          <span className="sub ink">{summary}</span>
          <span className="value">{fmtWon(amount)}</span>
        </div>
        <fieldset className="pay-methods">
          <legend className="label">{t('pay.method', lang)}</legend>
          {METHODS.map((m) => (
            <label key={m} className="pay-opt">
              <input type="radio" name="pay" checked={method === m} onChange={() => setMethod(m)} />
              <span>{t(`pay.${m}` as 'pay.card', lang)}</span>
            </label>
          ))}
        </fieldset>
        <ul className="pay-notes">
          <li><Icon name="ticket" size={15} /> {t('pay.hold', lang)}</li>
          <li><Icon name="clock" size={15} /> {t(kind === 'ride' ? 'pay.cancelRule' : 'pay.airportRule', lang)}</li>
        </ul>
        <button type="button" className={`btn-primary${kind === 'airport' ? ' amber' : ''}`} disabled={busy} onClick={confirm}>
          {busy ? t('pay.processing', lang) : t(kind === 'ride' ? 'pay.confirm.ride' : 'pay.confirm.airport', lang, { a: fmtWon(amount) })}
        </button>
        <div className="between" style={{ marginTop: 8 }}>
          <span className="note" style={{ margin: 0 }}>{t('pay.demo', lang)}</span>
          <button type="button" className="link-btn" disabled={busy} onClick={onClose}>{t('pay.close', lang)}</button>
        </div>
      </div>
    </div>
  );
}
