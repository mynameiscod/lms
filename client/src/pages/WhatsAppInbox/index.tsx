import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import ChatPanel from '../../components/WhatsAppChat/ChatPanel';
import { useWaLive } from '../../components/WhatsAppChat/useWaLive';
import { whatsAppChatApi, InboxFilter, InboxPage, InboxRow, InboxQuery, InboxOptions, InboxStatus, chatErr } from '../../api/whatsAppChatApi';
import ContextPanel from './ContextPanel';
import './whatsAppInbox.css';

/**
 * WhatsApp Inbox — every conversation in one place, built to answer three questions at a glance:
 * who needs a reply from us, who owns this person (one owner: the lead's counsellor), and what is
 * talking to them automatically. Waiting-for-us chats come first. Updates live.
 */

const TABS: { key: InboxFilter; label: string; hint: string }[] = [
  { key: 'all', label: 'All', hint: 'Every conversation' },
  { key: 'needs_reply', label: 'Needs reply', hint: 'They wrote last and nobody on the team has answered or marked it handled' },
  { key: 'mine', label: 'Mine', hint: 'You are the counsellor' },
  { key: 'unassigned', label: 'No counsellor', hint: 'Nobody owns these yet' },
  { key: 'automation', label: 'Automation', hint: 'A workflow or the old bot is talking to them now' },
  { key: 'unread', label: 'Unread', hint: 'New messages nobody has opened' },
];

const STATUS: Record<InboxStatus, { cls: string; icon: string; label: string } | null> = {
  needs_reply: { cls: 'reply', icon: 'bi-reply-fill', label: 'Needs reply' },
  automation: { cls: 'auto', icon: 'bi-lightning-charge-fill', label: 'Automation running' },
  waiting_lead: { cls: 'wait', icon: 'bi-hourglass-split', label: 'Waiting for them' },
  idle: null,
};

const ago = (iso?: string) => {
  if (!iso) return '';
  const d = new Date(iso);
  const mins = Math.round((Date.now() - d.getTime()) / 60_000);
  if (mins < 1) return 'now';
  if (mins < 60) return `${mins}m`;
  if (mins < 24 * 60 && d.getDate() === new Date().getDate()) return d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true });
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
};
const waited = (iso?: string) => {
  if (!iso) return '';
  const mins = Math.max(1, Math.round((Date.now() - new Date(iso).getTime()) / 60_000));
  if (mins < 60) return `${mins}m`;
  const h = Math.round(mins / 60);
  return h < 48 ? `${h}h` : `${Math.round(h / 24)}d`;
};
const windowLeft = (lastInboundAt?: string) => {
  if (!lastInboundAt) return null;
  const left = new Date(lastInboundAt).getTime() + 24 * 3_600_000 - Date.now();
  return left > 0 ? left : null;
};
const pretty = (phone: string) => (phone.startsWith('91') && phone.length === 12 ? `+91 ${phone.slice(2, 7)} ${phone.slice(7)}` : `+${phone}`);
const initials = (name: string) => name.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
const cap = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, ' ') : '');

const StatusChip: React.FC<{ r: InboxRow }> = ({ r }) => {
  const s = STATUS[r.status];
  if (!s) return null;
  return <span className={`wai-status ${s.cls}`}><i className={`bi ${s.icon}`} /> {s.label}{r.status === 'needs_reply' && r.waitingSince ? ` · ${waited(r.waitingSince)}` : ''}</span>;
};

const Row: React.FC<{ r: InboxRow; active: boolean; onOpen: () => void }> = ({ r, active, onOpen }) => {
  const left = windowLeft(r.lastInboundAt);
  const closing = left !== null && left < 3 * 3_600_000;
  return (
    <li>
      <button type="button" className={`wai-row${active ? ' on' : ''}${r.unreadCount ? ' unread' : ''} st-${r.status}`} onClick={onOpen}>
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
          <span className="wai-line3">
            <StatusChip r={r} />
            {closing && <span className="wai-closing" title="WhatsApp only lets you type freely for 24 hours after their last message"><i className="bi bi-clock" /> {Math.max(1, Math.round(left! / 60_000))}m to reply</span>}
          </span>
          <span className="wai-tags">
            {r.lead?.stage && <span className="wai-stage" style={{ ['--c' as any]: r.lead.stage.color || '#64748b' }}>{r.lead.stage.name}</span>}
            {r.lead?.source && <span className="wai-src">{cap(r.lead.source)}</span>}
            {!r.links.leadId && r.links.placementId && <span className="wai-tag p">Placement</span>}
            {!r.links.leadId && r.links.userId && <span className="wai-tag s">Student</span>}
            {r.replyTo && <span className="wai-tag r" title={`Replied to "${r.replyTo.templateName}" — not treated as a lead`}>{REPLY_TAG[r.replyTo.kind] || 'Not sales'}</span>}
            {!r.replyTo && !r.links.leadId && !r.links.placementId && !r.links.userId && <span className="wai-tag n">Not in CRM</span>}
            {r.assignedTo
              ? <span className="wai-owner" title={r.ownerFrom === 'lead' ? "Lead's counsellor" : 'Owns this chat'}><i className="bi bi-person-fill" /> {r.assignedTo.name}</span>
              : <span className="wai-owner none"><i className="bi bi-person-dash" /> No counsellor</span>}
          </span>
        </span>
      </button>
    </li>
  );
};

const REPLY_TAG: Record<string, string> = { hiring: 'Hiring reply', wishes: 'Wishes reply', update: 'Update reply' };

const EMPTY: InboxQuery = { owner: '', stageId: '', source: '', type: '', window: '' };

const WhatsAppInbox: React.FC = () => {
  const [params, setParams] = useSearchParams();
  const [filter, setFilter] = useState<InboxFilter>('all');
  const [q, setQ] = useState('');
  const [more, setMore] = useState<InboxRow[]>([]);
  const [drop, setDrop] = useState<InboxQuery>(EMPTY);
  const [options, setOptions] = useState<InboxOptions | null>(null);
  const [data, setData] = useState<InboxPage | null>(null);
  const [err, setErr] = useState('');
  const [showCtx, setShowCtx] = useState(() => { try { return localStorage.getItem('wai.ctx') !== '0'; } catch { return true; } });
  const selected = params.get('phone') || '';
  const reqId = useRef(0);

  useEffect(() => { whatsAppChatApi.inboxOptions().then(setOptions).catch(() => {}); }, []);
  useEffect(() => { try { localStorage.setItem('wai.ctx', showCtx ? '1' : '0'); } catch { /* private window */ } }, [showCtx]);

  const query = useCallback((page?: number): InboxQuery => ({ ...drop, filter, q: q.trim() || undefined, page }), [drop, filter, q]);

  const load = useCallback(async () => {
    const id = ++reqId.current;
    try {
      const page = await whatsAppChatApi.inbox(query());
      if (id !== reqId.current) return; // a newer request superseded this one
      setData(page); setMore([]); setErr('');
    } catch (e) { if (id === reqId.current) setErr(chatErr(e)); }
  }, [query]);

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
    try { const p = await whatsAppChatApi.inbox(query(nextPage)); setMore([...more, ...p.rows]); }
    catch (e) { setErr(chatErr(e)); }
  };

  const rows = [...(data?.rows || []), ...more];
  const shown = rows.length;
  const open = (phone: string) => setParams({ phone });
  const current = rows.find((r) => r.phone === selected);
  const count = (k: InboxFilter) => (data?.counts && k in data.counts ? (data.counts as any)[k] : undefined);
  const setD = (k: keyof InboxQuery, v: string) => setDrop((d) => ({ ...d, [k]: v }));
  const activeDrops = Object.values(drop).filter(Boolean).length;

  const handled = async () => {
    if (!selected) return;
    try { await whatsAppChatApi.markHandled(selected); await load(); } catch (e) { setErr(chatErr(e)); }
  };

  return (
    <div className={`wai${selected ? ' has-chat' : ''}${selected && showCtx ? ' with-ctx' : ''}`}>
      <section className="wai-left" aria-label="Conversations">
        <div className="wai-head">
          <h1><i className="bi bi-whatsapp" /> WhatsApp Inbox</h1>
          <p>Chats waiting for a reply from us come first.</p>
        </div>
        <div className="wai-search-wrap">
          <i className="bi bi-search" />
          <input className="wai-search" placeholder="Search name, number or message" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search conversations" />
        </div>
        <div className="wai-tabs" role="tablist">
          {TABS.map((t) => (
            <button key={t.key} role="tab" title={t.hint} aria-selected={filter === t.key} className={`${filter === t.key ? 'on' : ''} ${t.key === 'needs_reply' && count('needs_reply') ? 'hot' : ''}`} onClick={() => setFilter(t.key)}>
              {t.label}{count(t.key) !== undefined && <span>{count(t.key)}</span>}
            </button>
          ))}
        </div>
        <div className="wai-drops">
          <select value={drop.owner} onChange={(e) => setD('owner', e.target.value)} aria-label="Counsellor" className={drop.owner ? 'set' : ''}>
            <option value="">All counsellors</option>
            <option value="none">No counsellor</option>
            {options?.staff.map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}
          </select>
          <select value={drop.stageId} onChange={(e) => setD('stageId', e.target.value)} aria-label="Lead stage" className={drop.stageId ? 'set' : ''}>
            <option value="">All stages</option>
            {options?.stages.map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}
          </select>
          <select value={drop.source} onChange={(e) => setD('source', e.target.value)} aria-label="Lead source" className={drop.source ? 'set' : ''}>
            <option value="">All sources</option>
            {options?.sources.map((s) => <option key={s} value={s}>{cap(s)}</option>)}
          </select>
          <select value={drop.type} onChange={(e) => setD('type', e.target.value)} aria-label="Who" className={drop.type ? 'set' : ''}>
            <option value="">Leads, placement, students</option>
            <option value="lead">Leads only</option>
            <option value="placement">Placement only</option>
            <option value="student">Students only</option>
            <option value="not_sales">Replies to hiring / wishes / updates</option>
          </select>
          <select value={drop.window} onChange={(e) => setD('window', e.target.value)} aria-label="Reply window" className={drop.window ? 'set' : ''}>
            <option value="">Any reply window</option>
            <option value="closing">Closing in 3 hours</option>
            <option value="open">Can type freely</option>
            <option value="closed">Templates only</option>
          </select>
          {activeDrops > 0 && <button type="button" className="wai-clear" onClick={() => setDrop(EMPTY)}>Clear filters ({activeDrops})</button>}
        </div>
        {err && <div className="wai-err">{err}</div>}
        <ul className="wai-list">
          {!data ? <li className="wai-empty">Loading…</li> : !rows.length ? (
            <li className="wai-empty">
              {q || activeDrops ? 'No conversations match these filters.'
                : filter === 'needs_reply' ? <><i className="bi bi-emoji-smile" /> All caught up. Nobody is waiting for a reply.</>
                  : filter === 'all' ? 'No WhatsApp conversations yet. They appear here as soon as someone writes to your number.' : 'Nothing here.'}
            </li>
          ) : rows.map((r) => <Row key={r.phone} r={r} active={r.phone === selected} onOpen={() => open(r.phone)} />)}
        </ul>
        {data && shown < data.total && <button type="button" className="wai-more" onClick={loadMore}>Show more ({data.total - shown} left)</button>}
      </section>

      <section className="wai-right" aria-label="Conversation">
        {!selected ? (
          <div className="wai-placeholder">
            <i className="bi bi-chat-dots" />
            <p>Choose a conversation on the left.</p>
            <ul className="wai-howto">
              <li><span className="wai-status reply"><i className="bi bi-reply-fill" /> Needs reply</span> they wrote last and nobody on the team has answered</li>
              <li><span className="wai-status auto"><i className="bi bi-lightning-charge-fill" /> Automation running</span> a workflow or the old bot is talking to them</li>
              <li><span className="wai-status wait"><i className="bi bi-hourglass-split" /> Waiting for them</span> we replied last</li>
            </ul>
          </div>
        ) : (
          <>
            <div className="wai-chat-head">
              <button type="button" className="wai-back" onClick={() => setParams({})} aria-label="Back to conversations"><i className="bi bi-arrow-left" /></button>
              <span className="wai-avatar lg" aria-hidden>{initials(current?.name || current?.contactName || '') || <i className="bi bi-person" />}</span>
              <div className="wai-chat-title">
                <h2>{current?.name || current?.contactName || pretty(selected)}</h2>
                <div className="wai-chat-sub">
                  <span>{pretty(selected)}</span>
                  {current?.lead?.stage && <span className="wai-stage" style={{ ['--c' as any]: current.lead.stage.color || '#64748b' }}>{current.lead.stage.name}</span>}
                  {current?.links.leadId && <Link to={`/leads/${current.links.leadId}`}>Open lead</Link>}
                  {current?.links.placementId && <Link to={`/admin/placement-program?open=${current.links.placementId}`}>Placement record</Link>}
                  {current && <StatusChip r={current} />}
                </div>
              </div>
              <div className="wai-chat-actions">
                {current?.status === 'needs_reply' && (
                  <button type="button" className="wai-btn" onClick={handled} title="You called them, or no answer is needed. It comes back if they write again.">
                    <i className="bi bi-check2-circle" /> Mark handled
                  </button>
                )}
                <button type="button" className={`wai-btn ghost${showCtx ? ' on' : ''}`} onClick={() => setShowCtx(!showCtx)} aria-pressed={showCtx}>
                  <i className="bi bi-layout-sidebar-reverse" /> Details
                </button>
              </div>
            </div>
            <ChatPanel key={selected} phone={selected} name={current?.name || current?.contactName} />
          </>
        )}
      </section>

      {selected && showCtx && <ContextPanel key={selected} phone={selected} onClose={() => setShowCtx(false)} />}
    </div>
  );
};

export default WhatsAppInbox;
