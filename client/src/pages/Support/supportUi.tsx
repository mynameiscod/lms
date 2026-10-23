import React from 'react';
import {
  STATUS_LABEL, STAFF_STATUS_LABEL, PRIORITY_LABEL, TicketStatus, TicketPriority, SlaClock, TimelineEntry,
} from '../../api/supportApi';
import './support.css';

/** Shared Help & Support pieces, used by the member pages and the admin desk alike. */

export const fmtDateTime = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Kolkata' }) : '—';
export const fmtDate = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' }) : '—';

export const StatusBadge: React.FC<{ status: TicketStatus; staff?: boolean }> = ({ status, staff }) => (
  <span className={`sp-badge sp-st-${status}`}>{(staff ? STAFF_STATUS_LABEL : STATUS_LABEL)[status]}</span>
);

export const PriorityBadge: React.FC<{ priority: TicketPriority }> = ({ priority }) => (
  <span className={`sp-badge sp-pr-${priority}`}><i className="bi bi-flag-fill" aria-hidden /> {PRIORITY_LABEL[priority]}</span>
);

export const Loading: React.FC<{ text?: string }> = ({ text = 'Loading…' }) => (
  <div className="sp-state" role="status" aria-live="polite"><i className="bi bi-arrow-repeat sp-spin" aria-hidden /> {text}</div>
);

export const ErrorState: React.FC<{ text: string; onRetry?: () => void }> = ({ text, onRetry }) => (
  <div className="sp-state sp-state-err" role="alert">
    <i className="bi bi-exclamation-triangle" aria-hidden /> {text}
    {onRetry && <button type="button" className="sp-btn sp-btn-ghost" onClick={onRetry}>Try again</button>}
  </div>
);

export const EmptyState: React.FC<{ icon?: string; title: string; text?: string; children?: React.ReactNode }> = ({ icon = 'inbox', title, text, children }) => (
  <div className="sp-empty">
    <i className={`bi bi-${icon}`} aria-hidden />
    <h3>{title}</h3>
    {text && <p>{text}</p>}
    {children}
  </div>
);

const fmtMinutes = (m: number) => (m < 60 ? `${m} min` : m < 1440 ? `${Math.round(m / 60)} h` : `${Math.round(m / 1440)} d`);

/**
 * Progress against a target the organisation has set. Not rendered at all when there is no
 * target: an empty configuration must never look like a promise.
 */
export const SlaBar: React.FC<{ label: string; clock: SlaClock | null }> = ({ label, clock }) => {
  if (!clock) return null;
  const tone = clock.met === true ? 'ok' : clock.met === false ? 'late' : clock.elapsedPct >= 75 ? 'warn' : 'ok';
  const state = clock.met === true ? 'Met' : clock.met === false ? 'Past target' : `Target ${fmtMinutes(clock.targetMinutes)}`;
  return (
    <div className={`sp-sla sp-sla-${tone}`}>
      <div className="sp-sla-hd"><span>{label}</span><span>{state}</span></div>
      <div className="sp-sla-track" role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={clock.elapsedPct}>
        <div className="sp-sla-fill" style={{ width: `${clock.elapsedPct}%` }} />
      </div>
      <div className="sp-sla-ft">Due {fmtDateTime(clock.dueAt)}</div>
    </div>
  );
};

const ACTION_TEXT: Record<string, string> = {
  created: 'Ticket raised', status: 'Status changed', reopened: 'Reopened', priority: 'Priority changed',
  assigned: 'Assignment changed', escalated: 'Escalation changed', internal_note: 'Internal note added', view: 'Viewed by support HQ',
};
const valueText = (field: string, v: unknown, staff: boolean) => {
  if (v === null || v === undefined || v === '') return field === 'assignee' ? 'nobody' : '—';
  if (field === 'status') return (staff ? STAFF_STATUS_LABEL : STATUS_LABEL)[v as TicketStatus] || String(v);
  if (field === 'priority') return PRIORITY_LABEL[v as TicketPriority] || String(v);
  if (field === 'escalated') return v ? 'escalated' : 'not escalated';
  if (field === 'assignee') return 'an agent';
  return String(v);
};

export const Timeline: React.FC<{ entries: TimelineEntry[]; staff?: boolean }> = ({ entries, staff = false }) => {
  if (!entries.length) return null;
  return (
    <ol className="sp-timeline">
      {entries.map((e, i) => (
        <li key={i}>
          <span className="sp-tl-dot" aria-hidden />
          <div>
            <b>{ACTION_TEXT[e.action] || e.action}</b>
            {e.changes && Object.entries(e.changes).map(([f, c]) => (
              <span key={f} className="sp-tl-change"> · {c.from !== undefined ? `${valueText(f, c.from, staff)} → ` : ''}{valueText(f, c.to, staff)}</span>
            ))}
            <div className="sp-tl-meta">{fmtDateTime(e.at)}{staff ? ` · ${e.by}` : e.by === 'you' ? ' · you' : ' · support'}</div>
          </div>
        </li>
      ))}
    </ol>
  );
};

/** Opens an attachment fetched with the login header, without exposing a public URL. */
export async function openBlob(load: () => Promise<Blob>, name: string) {
  const blob = await load();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  if (blob.type === 'application/pdf') a.download = name; else a.target = '_blank';
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

export const fmtSize = (b: number) => (b < 1024 * 1024 ? `${Math.max(1, Math.round(b / 1024))} KB` : `${(b / 1024 / 1024).toFixed(1)} MB`);
