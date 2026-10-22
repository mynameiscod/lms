import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import supportApi, { SupportTicket, Paged, errorText, moduleLabel, TicketStatus } from '../../api/supportApi';
import { StatusBadge, Loading, ErrorState, EmptyState, fmtDate } from './supportUi';
import './support.css';

const FILTERS: { key: '' | TicketStatus; label: string }[] = [
  { key: '', label: 'All' }, { key: 'open', label: 'Open' }, { key: 'in_progress', label: 'In progress' },
  { key: 'waiting_on_user', label: 'Waiting on you' }, { key: 'resolved', label: 'Resolved' }, { key: 'closed', label: 'Closed' },
];

/** The member's own tickets, newest activity first. */
const MyTickets: React.FC<{ basePath: string; compact?: boolean; limit?: number }> = ({ basePath, compact, limit = 10 }) => {
  const nav = useNavigate();
  const [status, setStatus] = useState<'' | TicketStatus>('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Paged<SupportTicket> | null>(null);
  const [err, setErr] = useState('');

  const load = useCallback(async () => {
    setErr('');
    try { setData(await supportApi.mine({ status: status || undefined, page, limit })); }
    catch (e) { setErr(errorText(e, 'Your tickets could not be loaded.')); }
  }, [status, page, limit]);
  useEffect(() => { setData(null); load(); }, [load]);

  const pages = data ? Math.max(1, Math.ceil(data.total / data.limit)) : 1;

  return (
    <div>
      {!compact && (
        <div className="sp-filters" role="group" aria-label="Filter by status">
          {FILTERS.map(f => (
            <button key={f.key} type="button" className={`sp-chip${status === f.key ? ' on' : ''}`} aria-pressed={status === f.key}
              onClick={() => { setStatus(f.key); setPage(1); }}>{f.label}</button>
          ))}
        </div>
      )}
      {err ? <ErrorState text={err} onRetry={load} />
        : !data ? <Loading text="Loading your tickets…" />
        : data.tickets.length === 0 ? (
          <EmptyState icon="inbox" title={status ? 'No tickets with this status' : 'No tickets yet'} text={status ? undefined : 'When you report a problem, it will appear here with its progress.'}>
            {!status && <button type="button" className="sp-btn sp-btn-primary" onClick={() => nav(`${basePath}/new`)}>Report a problem</button>}
          </EmptyState>
        ) : (
          <>
            <ul className="sp-list">
              {data.tickets.map(t => (
                <li key={t.id}>
                  <button type="button" className="sp-item" onClick={() => nav(`${basePath}/tickets/${t.id}`)}>
                    <div className="sp-item-main">
                      <div className="sp-item-subj">{t.subject}</div>
                      <div className="sp-item-meta">{t.ticketNumber} · {moduleLabel(t.module)} · updated {fmtDate(t.lastActivityAt)}</div>
                    </div>
                    {t.unread && <span className="sp-badge sp-new">New reply</span>}
                    <StatusBadge status={t.status} />
                    <i className="bi bi-chevron-right" aria-hidden />
                  </button>
                </li>
              ))}
            </ul>
            {!compact && pages > 1 && (
              <div className="sp-pager">
                <button type="button" className="sp-btn sp-btn-ghost" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Previous</button>
                <span>Page {page} of {pages}</span>
                <button type="button" className="sp-btn sp-btn-ghost" disabled={page >= pages} onClick={() => setPage(p => p + 1)}>Next</button>
              </div>
            )}
          </>
        )}
    </div>
  );
};

export default MyTickets;
