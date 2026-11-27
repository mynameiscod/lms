import React, { useEffect } from 'react';
import { fmtDay, shiftDay, initials, Review, RATING_LABEL } from '../../api/salesTeamApi';

/** Previous / date / next, plus "Today". Never goes past today. */
export function DayPicker({ day, today, onChange }: { day: string; today: string; onChange: (d: string) => void }) {
  return (
    <div className="stm-day" role="group" aria-label="Choose a day">
      <button type="button" className="stm-icon-btn" aria-label="Previous day" onClick={() => onChange(shiftDay(day, -1))}><i className="bi bi-chevron-left" /></button>
      <label className="stm-day-input">
        <i className="bi bi-calendar3" />
        <span>{day === today ? 'Today' : fmtDay(day)}</span>
        <input type="date" value={day} max={today} onChange={e => e.target.value && onChange(e.target.value)} aria-label="Pick a date" />
      </label>
      <button type="button" className="stm-icon-btn" aria-label="Next day" disabled={day >= today} onClick={() => onChange(shiftDay(day, 1))}><i className="bi bi-chevron-right" /></button>
      {day !== today && <button type="button" className="stm-btn sm ghost" onClick={() => onChange(today)}>Today</button>}
    </div>
  );
}

export function LivePill({ live }: { live: boolean }) {
  return live
    ? <span className="stm-pill live"><span className="stm-dot" /> Live · today so far</span>
    : <span className="stm-pill"><i className="bi bi-archive" /> Saved report</span>;
}

export function Avatar({ name, color, size = 40 }: { name: string; color?: string; size?: number }) {
  return <span className="stm-avatar" style={{ width: size, height: size, fontSize: size * 0.38, background: color || '#EAF3FD', color: color ? '#fff' : '#051D64' }} aria-hidden="true">{initials(name)}</span>;
}

/** "22 / 60" with a bar; plain number when there is no target. */
export function TargetBar({ value, target, label }: { value: number; target?: number; label: string }) {
  const has = typeof target === 'number' && target > 0;
  const pct = has ? Math.min(100, Math.round((value / target!) * 100)) : 0;
  const tone = !has ? '' : pct >= 100 ? 'ok' : pct >= 60 ? 'mid' : 'low';
  return (
    <div className="stm-tbar">
      <div className="stm-tbar-top"><span>{label}</span><b>{value}{has && <em> / {target}</em>}</b></div>
      {has && <div className={`stm-tbar-track ${tone}`} role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={`${label} ${pct}% of target`}><i style={{ width: `${pct}%` }} /></div>}
    </div>
  );
}

export function ReviewChip({ review, open }: { review: Review; open: boolean }) {
  if (review.status === 'reviewed') {
    const r = review.rating || 'ok';
    return <span className={`stm-chip r-${r}`}><i className="bi bi-patch-check-fill" /> {RATING_LABEL[r]}</span>;
  }
  return open ? <span className="stm-chip pending"><i className="bi bi-hourglass-split" /> To review</span> : <span className="stm-chip muted"><i className="bi bi-clock" /> Opens 9 PM</span>;
}

export function Dialog({ title, onClose, children, wide }: { title: string; onClose: () => void; children: React.ReactNode; wide?: boolean }) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [onClose]);
  return (
    <div className="stm-modal-bg" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={`stm-modal${wide ? ' wide' : ''}`} role="dialog" aria-modal="true" aria-label={title}>
        <div className="stm-modal-head"><h2>{title}</h2><button type="button" aria-label="Close" onClick={onClose}><i className="bi bi-x-lg" /></button></div>
        {children}
      </div>
    </div>
  );
}

export function Toast({ text }: { text: string }) {
  return text ? <div className="stm-toast" role="status"><i className="bi bi-check-circle-fill" /> {text}</div> : null;
}

export function useToast(): [string, (s: string) => void] {
  const [t, setT] = React.useState('');
  useEffect(() => { if (!t) return; const h = setTimeout(() => setT(''), 3200); return () => clearTimeout(h); }, [t]);
  return [t, setT];
}

export function Empty({ icon, children }: { icon: string; children: React.ReactNode }) {
  return <div className="stm-empty"><i className={`bi ${icon}`} /><div>{children}</div></div>;
}

/** Page-level tabs (Day report / Leads, Members / Leads). */
export function SectionTabs({ value, onChange, tabs }: { value: string; onChange: (k: string) => void; tabs: [string, string, string][] }) {
  return (
    <nav className="stm-tabs big" role="tablist">
      {tabs.map(([k, ic, l]) => (
        <button key={k} type="button" role="tab" aria-selected={value === k} className={value === k ? 'on' : ''} onClick={() => onChange(k)}><i className={`bi ${ic}`} /> {l}</button>
      ))}
    </nav>
  );
}

export function Loading() {
  return <div className="stm-state"><span className="stm-spin" /> Loading…</div>;
}
