import React, { useState } from 'react';
import { EvState } from '../../api/eventApisApi';

export const STATE_LABEL: Record<EvState, string> = {
  open: 'Open', closed: 'Closed', not_yet_open: 'Not open yet', paused: 'Paused',
};

export const StatePill: React.FC<{ s: EvState }> = ({ s }) => <span className={`ev-pill ${s}`}>{STATE_LABEL[s] || s}</span>;

const IST = new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' });
export const istDate = (v?: string | null) => (v ? IST.format(new Date(v)) : '—');

/** A Date as the value a datetime-local input wants, in the browser's own time. */
export const toLocalInput = (v?: string | null) => {
  if (!v) return '';
  const d = new Date(v);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

export const Modal: React.FC<{ title: string; onClose: () => void; children: React.ReactNode }> = ({ title, onClose, children }) => (
  <div className="ev-modal-back" role="dialog" aria-modal="true" aria-label={title} onClick={onClose}>
    <div className="ev-modal" onClick={(e) => e.stopPropagation()}>
      <div className="ev-modal-head">
        <h2 style={{ margin: 0 }}>{title}</h2>
        <button className="ev-btn ev-btn-ghost ev-btn-sm" onClick={onClose} aria-label="Close"><i className="fa-solid fa-xmark" /></button>
      </div>
      {children}
    </div>
  </div>
);

/** A read-only value with a Copy button that falls back to selecting the text. */
export const CopyField: React.FC<{ value: string; label: string }> = ({ value, label }) => {
  const [copied, setCopied] = useState(false);
  const copy = async (e: React.MouseEvent<HTMLButtonElement>) => {
    const input = e.currentTarget.parentElement?.querySelector('input');
    try { await navigator.clipboard.writeText(value); setCopied(true); setTimeout(() => setCopied(false), 1800); }
    catch { input?.select(); }
  };
  return (
    <div className="ev-copyrow">
      <input className="ev-input ev-mono" readOnly value={value} aria-label={label} onFocus={(e) => e.currentTarget.select()} />
      <button className="ev-btn ev-btn-sm" onClick={copy}>{copied ? 'Copied' : 'Copy'}</button>
    </div>
  );
};
