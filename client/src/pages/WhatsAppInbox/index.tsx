import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import ChatPanel from '../../components/WhatsAppChat/ChatPanel';
import { useWaLive } from '../../components/WhatsAppChat/useWaLive';
import { whatsAppChatApi, InboxFilter, InboxPage, InboxRow, chatErr } from '../../api/whatsAppChatApi';
import './whatsAppInbox.css';

/**
 * WhatsApp Inbox — every conversation of the institute in one place: unread first, filters for
 * placement candidates / leads / students, ownership, and the chat itself. Updates live.
 */

const FILTERS: [InboxFilter, string][] = [
  ['all', 'All'], ['unread', 'Unread'], ['mine', 'Mine'], ['unassigned', 'Unassigned'],
  ['placement', 'Placement'], ['lead', 'Leads'], ['student', 'Students'],
];

const ago = (iso?: string) => {
  if (!iso) return '';
  const d = new Date(iso);
  const mins = Math.round((Date.now() - d.getTime()) / 60_000);
  if (mins < 1) return 'now';
  if (mins < 60) return `${mins}m`;
  if (mins < 24 * 60 && d.getDate() === new Date().getDate()) return d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true });
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
};
const pretty = (phone: string) => (phone.startsWith('91') && phone.length === 12 ? `+91 ${phone.slice(2, 7)} ${phone.slice(7)}` : `+${phone}`);
const initials = (name: string) => name.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase();

const Row: React.FC<{ r: InboxRow; active: boolean; onOpen: () => void }> = ({ r, active, onOpen }) => (
  <li>
    <button type="button" className={`wai-row${active ? ' on' : ''}${r.unreadCount ? ' unread' : ''}`} onClick={onOpen}>
      <span className="wai-avatar" aria-hidden>{initials(r.name || r.contactName || '') || <i className="bi bi-person" />}</span>
      <span className="wai-main">
        <span className="wai-line1">
          <b>{r.name || r.contactName || pretty(r.phone)}</b>
          <time>{ago(r.lastMessageAt)}</time>
        </span>
        <span className="wai-line2">
          <span className="wai-preview">{r.lastPreview || '—'}</span>
          {r.unreadCount > 0 && <span className="wai-count">{r.unreadCount}</span>}
        </span>
        <span className="wai-tags">
          {r.links.placementId && <span className="wai-tag p">Placement</span>}
          {r.links.leadId && <span className="wai-tag l">Lead</span>}
          {r.links.userId && <span className="wai-tag s">Student</span>}
          {r.assignedTo ? <span className="wai-owner">· {r.assignedTo.name}</span> : <span className="wai-owner none">· Unassigned</span>}
        </span>
      </span>
    </button>
  </li>
);

const WhatsAppInbox: React.FC = () => {
  const [params, setParams] = useSearchParams();
  const [filter, setFilter] = useState<InboxFilter>('all');
  const [q, setQ] = useState('');
  const [data, setData] = useState<InboxPage | null>(null);
  const [more, setMore] = useState<InboxRow[]>([]);
  const [err, setErr] = useState('');
  const selected = params.get('phone') || '';
  const reqId = useRef(0);

  const load = useCallback(async () => {
    const id = ++reqId.current;
    try {
      const page = await whatsAppChatApi.inbox({ filter, q: q.trim() || undefined });
      if (id !== reqId.current) return; // a newer request superseded this one
      setData(page); setMore([]); setErr('');
    } catch (e) { if (id === reqId.current) setErr(chatErr(e)); }
  }, [filter, q]);

  useEffect(() => { const t = setTimeout(load, q ? 300 : 0); return () => clearTimeout(t); }, [load, q]);

  // A burst of events (status ticks, several messages) refreshes the list once.
  const pending = useRef<ReturnType<typeof setTimeout> | null>(null);
  useWaLive(() => {
    if (pending.current) return;
    pending.current = setTimeout(() => { pending.current = null; load(); }, 800);
  });
  useEffect(() => () => { if (pending.current) clearTimeout(pending.current); }, []);

  const loadMore = async () => {
    if (!data) return;
    const nextPage = data.page + Math.ceil(more.length / data.limit) + 1;
    try { const p = await whatsAppChatApi.inbox({ filter, q: q.trim() || undefined, page: nextPage }); setMore([...more, ...p.rows]); }
    catch (e) { setErr(chatErr(e)); }
  };

  const rows = [...(data?.rows || []), ...more];
  const shown = rows.length;
  const open = (phone: string) => setParams({ phone });
  const current = rows.find((r) => r.phone === selected);
  const count = (k: InboxFilter) => (data?.counts && k in data.counts ? (data.counts as any)[k] : undefined);

  return (
    <div className={`wai${selected ? ' has-chat' : ''}`}>
      <section className="wai-left" aria-label="Conversations">
        <div className="wai-head">
          <h1><i className="bi bi-whatsapp" /> WhatsApp Inbox</h1>
          <p>Every conversation with your WhatsApp number. Unread first.</p>
        </div>
        <input className="wai-search" placeholder="Search name, number or message" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search conversations" />
        <div className="wai-filters" role="tablist">
          {FILTERS.map(([k, l]) => (
            <button key={k} role="tab" aria-selected={filter === k} className={filter === k ? 'on' : ''} onClick={() => setFilter(k)}>
              {l}{count(k) !== undefined && <span>{count(k)}</span>}
            </button>
          ))}
        </div>
        {err && <div className="wai-err">{err}</div>}
        <ul className="wai-list">
          {!data ? <li className="wai-empty">Loading…</li> : !rows.length ? (
            <li className="wai-empty">{q ? 'No conversations match.' : filter === 'all' ? 'No WhatsApp conversations yet. They appear here as soon as someone writes to your number.' : 'Nothing here.'}</li>
          ) : rows.map((r) => <Row key={r.phone} r={r} active={r.phone === selected} onOpen={() => open(r.phone)} />)}
        </ul>
        {data && shown < data.total && <button type="button" className="wai-more" onClick={loadMore}>Show more ({data.total - shown} left)</button>}
      </section>

      <section className="wai-right" aria-label="Conversation">
        {!selected ? (
          <div className="wai-placeholder"><i className="bi bi-chat-dots" /><p>Choose a conversation on the left.</p></div>
        ) : (
          <>
            <div className="wai-chat-head">
              <button type="button" className="wai-back" onClick={() => setParams({})} aria-label="Back to conversations"><i className="bi bi-arrow-left" /></button>
              <div>
                <h2>{current?.name || current?.contactName || pretty(selected)}</h2>
                <div className="wai-chat-sub">
                  <span>{pretty(selected)}</span>
                  {current?.links.placementId && <Link to={`/admin/placement-program?open=${current.links.placementId}`}>Placement record</Link>}
                  {current?.links.leadId && <Link to={`/leads/${current.links.leadId}`}>Lead record</Link>}
                  {current?.links.userId && <span className="wai-tag s">Student</span>}
                </div>
              </div>
            </div>
            <ChatPanel key={selected} phone={selected} name={current?.name || current?.contactName} />
          </>
        )}
      </section>
    </div>
  );
};

export default WhatsAppInbox;
