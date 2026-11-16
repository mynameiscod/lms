import React, { useEffect, useRef, useState } from 'react';
import { SUB_LABEL, SubStatus, STAGE_LABEL, CompanyStage, OPENING_LABEL, OpeningStatus, Opening } from '../../api/talentPoolApi';

/* Small shared pieces of the Talent Portal (tpo- styles in portal.css). */

const SUB_CLS: Record<SubStatus, string> = {
  sent: 'blue', shortlisted: 'violet', interview: 'amber', selected: 'green', offered: 'green', joined: 'green', rejected: 'red', on_hold: 'grey', withdrawn: 'grey',
};
export const SubPill: React.FC<{ s: SubStatus }> = ({ s }) => <span className={`tp-pill ${SUB_CLS[s] || 'grey'}`}>{SUB_LABEL[s] || s}</span>;

const STAGE_CLS: Record<CompanyStage, string> = { prospect: 'grey', contacted: 'blue', active: 'green', on_hold: 'amber', closed: 'red' };
export const StagePill: React.FC<{ s: CompanyStage }> = ({ s }) => <span className={`tp-pill ${STAGE_CLS[s] || 'grey'}`}>{STAGE_LABEL[s] || s}</span>;

const OPEN_CLS: Record<OpeningStatus, string> = { open: 'green', on_hold: 'amber', closed: 'grey' };
export const OpeningPill: React.FC<{ s: OpeningStatus }> = ({ s }) => <span className={`tp-pill ${OPEN_CLS[s] || 'grey'}`}>{OPENING_LABEL[s] || s}</span>;

export const initials = (name?: string) => (name || '?').split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase();
export const Avatar: React.FC<{ name?: string; small?: boolean }> = ({ name, small }) => <span className={`tpo-avatar ${small ? 'sm' : ''}`}>{initials(name)}</span>;

const range = (a?: number | null, b?: number | null, unit = '') => {
  if (a == null && b == null) return '';
  if (a != null && b != null) return a === b ? `${a}${unit}` : `${a}–${b}${unit}`;
  return a != null ? `${a}+${unit}` : `up to ${b}${unit}`;
};
export const expText = (o: Partial<Opening>) => range(o.expMin, o.expMax, ' yrs') || '—';
export const salaryText = (o: Partial<Opening>) => { const r = range(o.salaryMin, o.salaryMax); return r ? `₹${r} LPA` : '—'; };

export const fmtDateTime = (d?: string | null) => (d ? new Date(d).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }) : '—');
/** "Today", "Tomorrow", "3 days overdue", or a date. */
export const dueText = (d: string) => {
  const day = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diff = Math.round((day(new Date(d)) - day(new Date())) / 86400000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  if (diff < 0) return `${-diff} day${diff === -1 ? '' : 's'} overdue`;
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
};
export const isOverdue = (d: string) => new Date(d).getTime() < new Date(new Date().setHours(0, 0, 0, 0)).getTime();
/** Value for <input type="date"> / "datetime-local". */
export const toDateInput = (d?: string | null) => (d ? new Date(new Date(d).getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10) : '');
export const toDateTimeInput = (d?: string | null) => (d ? new Date(new Date(d).getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16) : '');

/** Stat card like the header tiles on every portal screen. */
export const Stat: React.FC<{ icon: string; tone: string; label: string; value: React.ReactNode; on?: boolean; onClick?: () => void; sub?: string }> = ({ icon, tone, label, value, on, onClick, sub }) => {
  const Tag: any = onClick ? 'button' : 'div';
  return (
    <Tag className={`tpo-stat ${on ? 'on' : ''} ${onClick ? 'click' : ''}`} onClick={onClick}>
      <div className="tpo-stat-top"><span className={`tpo-ico ${tone}`}><i className={`fa-solid ${icon}`} /></span><span>{label}</span></div>
      <b>{value}</b>
      {sub && <small>{sub}</small>}
    </Tag>
  );
};

/** Page header: icon, title, subtitle, actions. */
export const PageHead: React.FC<{ icon: string; title: string; sub?: string; children?: React.ReactNode }> = ({ icon, title, sub, children }) => (
  <div className="tpo-head">
    <span className="tpo-head-ico"><i className={`fa-solid ${icon}`} /></span>
    <div className="tpo-head-text"><h1>{title}</h1>{sub && <p>{sub}</p>}</div>
    <div className="tpo-head-actions">{children}</div>
  </div>
);

/** Pagination footer with page-size picker. */
export function usePaged<T>(rows: T[], deps: any[] = []) {
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(10);
  useEffect(() => { setPage(1); }, deps); // eslint-disable-line react-hooks/exhaustive-deps
  const pages = Math.max(1, Math.ceil(rows.length / size));
  const p = Math.min(page, pages);
  return { slice: rows.slice((p - 1) * size, p * size), page: p, pages, size, setPage, setSize, total: rows.length, offset: (p - 1) * size };
}
export const Pager: React.FC<{ pg: ReturnType<typeof usePaged<any>>; noun: string }> = ({ pg, noun }) => {
  if (!pg.total) return null;
  const nums: number[] = [];
  for (let i = Math.max(1, pg.page - 2); i <= Math.min(pg.pages, pg.page + 2); i++) nums.push(i);
  return (
    <div className="tpo-pager">
      <span>Showing {pg.offset + 1}–{Math.min(pg.offset + pg.size, pg.total)} of {pg.total} {noun}{pg.total === 1 ? '' : 's'}</span>
      <div className="tpo-pager-r">
        <button className="tpo-pg" disabled={pg.page <= 1} onClick={() => pg.setPage(pg.page - 1)} aria-label="Previous"><i className="fa-solid fa-chevron-left" /></button>
        {nums.map(n => <button key={n} className={`tpo-pg ${n === pg.page ? 'on' : ''}`} onClick={() => pg.setPage(n)}>{n}</button>)}
        <button className="tpo-pg" disabled={pg.page >= pg.pages} onClick={() => pg.setPage(pg.page + 1)} aria-label="Next"><i className="fa-solid fa-chevron-right" /></button>
        <select value={pg.size} onChange={e => { pg.setSize(Number(e.target.value)); pg.setPage(1); }}>
          {[10, 25, 50, 100].map(n => <option key={n} value={n}>{n} / page</option>)}
        </select>
      </div>
    </div>
  );
};

/** The ⋮ menu on a table row. */
export const RowMenu: React.FC<{ items: { label: string; icon: string; onClick: () => void; danger?: boolean }[] }> = ({ items }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);
  return (
    <div className="tpo-menu" ref={ref} onClick={e => e.stopPropagation()}>
      <button className="tpo-kebab" onClick={() => setOpen(o => !o)} aria-label="Actions"><i className="fa-solid fa-ellipsis-vertical" /></button>
      {open && (
        <div className="tpo-menu-list">
          {items.map(it => (
            <button key={it.label} className={it.danger ? 'danger' : ''} onClick={() => { setOpen(false); it.onClick(); }}>
              <i className={`fa-solid ${it.icon}`} /> {it.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

/** Right-side drawer. */
export const Drawer: React.FC<{ title: React.ReactNode; sub?: React.ReactNode; wide?: boolean; onClose: () => void; children: React.ReactNode }> = ({ title, sub, wide, onClose, children }) => {
  useEffect(() => {
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', esc);
    return () => document.removeEventListener('keydown', esc);
  }, [onClose]);
  return (
    <div className="tp-overlay" onClick={onClose}>
      <div className={`tp-panel ${wide ? 'wide' : ''}`} onClick={e => e.stopPropagation()}>
        <div className="tp-panel-head"><div><h3>{title}</h3>{sub && <p>{sub}</p>}</div><button className="tp-x" onClick={onClose} aria-label="Close">×</button></div>
        {children}
      </div>
    </div>
  );
};

/** Empty state with an optional call to action. */
export const Empty: React.FC<{ icon: string; title: string; text?: string; action?: React.ReactNode }> = ({ icon, title, text, action }) => (
  <div className="tpo-emptybox">
    <span className="tpo-ico violet big"><i className={`fa-solid ${icon}`} /></span>
    <b>{title}</b>
    {text && <p>{text}</p>}
    {action}
  </div>
);
