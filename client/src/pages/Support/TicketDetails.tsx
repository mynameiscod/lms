import React, { useCallback, useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import supportApi, {
  TicketDetail, SupportMe, errorText, moduleLabel, categoryLabel, STAFF_STATUS_LABEL, PRIORITY_LABEL, TicketStatus, TicketPriority,
} from '../../api/supportApi';
import { StatusBadge, PriorityBadge, Loading, ErrorState, SlaBar, Timeline, fmtDateTime, openBlob, fmtSize } from './supportUi';
import './support.css';

/**
 * One ticket. The same page serves the member (in CareerPilot) and staff (in the admin app):
 * what each sees is decided by the server — internal notes simply are not in a member's
 * response — and the controls shown here follow /support/me, which the server enforces again.
 */
const STAFF_MOVES: Record<TicketStatus, TicketStatus[]> = {
  open: ['in_progress', 'waiting_on_user', 'resolved', 'closed'],
  in_progress: ['open', 'waiting_on_user', 'resolved', 'closed'],
  waiting_on_user: ['open', 'in_progress', 'resolved', 'closed'],
  resolved: ['in_progress', 'closed'],
  closed: [],
};

const TicketConversation: React.FC<{ detail: TicketDetail; staff: boolean }> = ({ detail, staff }) => {
  const [fileErr, setFileErr] = useState('');
  const all = [{ id: 'desc', authorKind: 'requester' as const, author: staff ? 'Requester' : 'You', visibility: 'public' as const, body: detail.ticket.description || '', attachments: [], createdAt: detail.ticket.createdAt }, ...detail.messages];
  return (
    <div className="sp-convo" aria-label="Conversation">
      {all.map(m => (
        <article key={m.id} className={`sp-msg sp-msg-${m.authorKind}${m.visibility === 'internal' ? ' sp-msg-internal' : ''}`}>
          <div className="sp-msg-hd">
            <span><b>{m.author}</b>{m.visibility === 'internal' && <span className="sp-internal-tag"> · Internal note (staff only)</span>}</span>
            <time dateTime={m.createdAt}>{fmtDateTime(m.createdAt)}</time>
          </div>
          <div className="sp-msg-body">{m.body}</div>
          {m.attachments.length > 0 && (
            <div className="sp-files">
              {m.attachments.map(a => (
                <button key={a.id} type="button" className="sp-file"
                  onClick={() => openBlob(() => supportApi.attachment(detail.ticket.id, a.id), a.name).catch(e => setFileErr(errorText(e, 'The file could not be opened.')))}>
                  <i className={`bi bi-${a.mime === 'application/pdf' ? 'file-earmark-pdf' : 'image'}`} aria-hidden /> {a.name} · {fmtSize(a.size)}
                </button>
              ))}
            </div>
          )}
        </article>
      ))}
      {fileErr && <p className="sp-err" role="alert">{fileErr}</p>}
    </div>
  );
};

const ErrorLine: React.FC<{ e: { id: string; title: string; count: number; lastSeen: string }; canOpen: boolean }> = ({ e, canOpen }) => {
  const nav = useNavigate();
  const body = <><b>{e.title}</b><span className="sp-item-meta"> · {e.count}× · {fmtDateTime(e.lastSeen)}</span></>;
  return canOpen
    ? <button type="button" className="sp-linkbtn" style={{ display: 'block', fontWeight: 400, margin: '4px 0' }} onClick={() => nav(`/admin/support/errors/${e.id}`)}>{body}</button>
    : <div style={{ margin: '4px 0' }}>{body}</div>;
};

const TicketDetails: React.FC<{ basePath: string; me: SupportMe | null; staffView?: boolean }> = ({ basePath, me, staffView = false }) => {
  const { id = '' } = useParams();
  const nav = useNavigate();
  const loc = useLocation();
  const raised = (loc.state as any) || {};
  const [detail, setDetail] = useState<TicketDetail | null>(null);
  const [err, setErr] = useState('');
  const [reply, setReply] = useState('');
  const [internal, setInternal] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok?: string; err?: string }>({});
  const [agents, setAgents] = useState<{ id: string; name: string }[]>([]);
  const canWork = !!me?.can.work && staffView;

  const load = useCallback(async () => {
    setErr('');
    try { setDetail(await supportApi.detail(id)); }
    catch (e: any) { setErr(e?.response?.status === 404 ? 'This ticket could not be found.' : errorText(e, 'The ticket could not be loaded.')); }
  }, [id]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { if (canWork) supportApi.agents().then(setAgents).catch(() => setAgents([])); }, [canWork]);

  const send = async (extra: { requestInfo?: boolean; resolve?: boolean } = {}) => {
    if (!reply.trim()) return;
    setBusy(true); setMsg({});
    try {
      await supportApi.reply(id, { body: reply.trim(), internal: canWork && internal ? true : undefined, ...extra }, files);
      setReply(''); setFiles([]); setInternal(false);
      setMsg({ ok: canWork && internal ? 'Internal note added.' : 'Message sent.' });
      await load();
    } catch (e) { setMsg({ err: errorText(e, 'Your message could not be sent.') }); }
    setBusy(false);
  };

  const change = async (body: Parameters<typeof supportApi.update>[1], ok: string) => {
    setBusy(true); setMsg({});
    try { await supportApi.update(id, body); setMsg({ ok }); await load(); }
    catch (e) { setMsg({ err: errorText(e) }); }
    setBusy(false);
  };

  const reopen = async () => {
    setBusy(true); setMsg({});
    try { await supportApi.reopen(id, reply.trim() || undefined); setReply(''); setMsg({ ok: 'Ticket reopened.' }); await load(); }
    catch (e) { setMsg({ err: errorText(e, 'The ticket could not be reopened.') }); }
    setBusy(false);
  };

  if (err) return <div className="sp"><button className="sp-back" onClick={() => nav(staffView ? basePath : `${basePath}/tickets`)}><i className="bi bi-arrow-left" aria-hidden /> Back</button><ErrorState text={err} onRetry={load} /></div>;
  if (!detail) return <div className="sp"><Loading text="Loading ticket…" /></div>;
  const t = detail.ticket;
  const staff = staffView && !!me?.can.readInternal;

  return (
    <div className="sp">
      <button className="sp-back" onClick={() => nav(staffView ? basePath : `${basePath}/tickets`)}><i className="bi bi-arrow-left" aria-hidden /> {staffView ? 'Back to queue' : 'My tickets'}</button>
      {raised.justRaised && (
        <div className="sp-ok" role="status" style={{ marginBottom: 14 }}>
          <i className="bi bi-check-circle-fill" aria-hidden />
          <span>{raised.duplicate ? `You had already raised this — it is ticket ${raised.justRaised}.` : `Ticket ${raised.justRaised} raised. We will reply here.`}{raised.fileNote ? ` ${raised.fileNote}` : ''}</span>
        </div>
      )}
      <div className="sp-head">
        <div>
          <h1>{t.subject}</h1>
          <div className="sp-item-meta">{t.ticketNumber} · {moduleLabel(t.module)} · {categoryLabel(t.category)} · raised {fmtDateTime(t.createdAt)}{t.source === 'ai_chat' ? ' · from the assistant' : ''}</div>
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <StatusBadge status={t.status} staff={staffView} />
          <PriorityBadge priority={t.priority} />
          {staffView && t.escalated && <span className="sp-badge sp-pr-critical"><i className="bi bi-arrow-up-circle" aria-hidden /> Escalated</span>}
        </div>
      </div>

      <div className="sp-grid">
        <div className="sp-stack">
          <TicketConversation detail={detail} staff={staff} />

          {(t.canReply || canWork) && t.status !== 'closed' && !(t.status === 'resolved' && !canWork) && (
            <div className="sp-card">
              {canWork && (
                <div className="sp-reply-tabs" role="tablist" aria-label="Reply type">
                  <button type="button" role="tab" aria-selected={!internal} className={`sp-chip${!internal ? ' on' : ''}`} onClick={() => setInternal(false)}>Reply to member</button>
                  <button type="button" role="tab" aria-selected={internal} className={`sp-chip${internal ? ' on' : ''}`} onClick={() => setInternal(true)}>Internal note</button>
                </div>
              )}
              <label className="sp-sr" htmlFor="sp-reply">Your message</label>
              <textarea id="sp-reply" className="sp-textarea" value={reply} maxLength={5000} onChange={e => setReply(e.target.value)}
                placeholder={internal ? 'Visible to support staff only.' : 'Write your message…'} />
              <div className="sp-field" style={{ marginTop: 8 }}>
                <input type="file" aria-label="Attach files" accept=".jpg,.jpeg,.png,.webp,.pdf" multiple onChange={e => { setFiles(Array.from(e.target.files || []).slice(0, 3)); }} />
              </div>
              <div className="sp-actions">
                <button type="button" className="sp-btn sp-btn-primary" disabled={busy || !reply.trim()} onClick={() => send()}>{internal ? 'Add note' : 'Send'}</button>
                {canWork && !internal && STAFF_MOVES[t.status].includes('waiting_on_user') && (
                  <button type="button" className="sp-btn sp-btn-ghost" disabled={busy || !reply.trim()} onClick={() => send({ requestInfo: true })}>Send and ask for more info</button>
                )}
                {canWork && !internal && STAFF_MOVES[t.status].includes('resolved') && (
                  <button type="button" className="sp-btn sp-btn-teal" disabled={busy || !reply.trim()} onClick={() => send({ resolve: true })}>Send and resolve</button>
                )}
              </div>
            </div>
          )}

          {t.canReopen && !staffView && (
            <div className="sp-card">
              <h3>Still not fixed?</h3>
              <p className="sp-hint">Tell us what is still wrong (optional) and reopen the ticket.</p>
              <textarea className="sp-textarea" style={{ minHeight: 80 }} aria-label="Why reopen" value={reply} onChange={e => setReply(e.target.value)} />
              <div className="sp-actions"><button type="button" className="sp-btn sp-btn-primary" disabled={busy} onClick={reopen}>Reopen ticket</button></div>
            </div>
          )}
          {msg.ok && <p className="sp-ok" role="status">{msg.ok}</p>}
          {msg.err && <p className="sp-err" role="alert">{msg.err}</p>}
        </div>

        <aside className="sp-stack" aria-label="Ticket details">
          {canWork && (
            <div className="sp-card">
              <h2>Manage</h2>
              <div className="sp-field">
                <label htmlFor="sp-status">Status</label>
                <select id="sp-status" className="sp-select" value={t.status} disabled={busy || !STAFF_MOVES[t.status].length}
                  onChange={e => change({ status: e.target.value }, 'Status updated.')}>
                  <option value={t.status}>{STAFF_STATUS_LABEL[t.status]}</option>
                  {STAFF_MOVES[t.status].map(s => <option key={s} value={s}>{STAFF_STATUS_LABEL[s]}</option>)}
                </select>
              </div>
              <div className="sp-field">
                <label htmlFor="sp-priority">Priority</label>
                <select id="sp-priority" className="sp-select" value={t.priority} disabled={busy} onChange={e => change({ priority: e.target.value }, 'Priority updated.')}>
                  {(Object.keys(PRIORITY_LABEL) as TicketPriority[]).map(p => <option key={p} value={p}>{PRIORITY_LABEL[p]}</option>)}
                </select>
              </div>
              <div className="sp-field">
                <label htmlFor="sp-assignee">Assignee</label>
                <select id="sp-assignee" className="sp-select" value={t.assignee?.id || ''} disabled={busy}
                  onChange={e => change({ assigneeId: e.target.value || null }, 'Assignment updated.')}>
                  <option value="">Unassigned</option>
                  {t.assignee && !agents.some(a => a.id === t.assignee!.id) && <option value={t.assignee.id}>{t.assignee.name}</option>}
                  {agents.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </div>
              <div className="sp-actions">
                {t.assignee?.id !== me?.userId && <button type="button" className="sp-btn sp-btn-ghost" disabled={busy} onClick={() => change({ assigneeId: 'me' }, 'Assigned to you.')}>Assign to me</button>}
                <button type="button" className={`sp-btn ${t.escalated ? 'sp-btn-ghost' : 'sp-btn-danger'}`} disabled={busy} onClick={() => change({ escalated: !t.escalated }, t.escalated ? 'Escalation removed.' : 'Escalated.')}>
                  {t.escalated ? 'Remove escalation' : 'Escalate'}
                </button>
              </div>
            </div>
          )}

          {t.sla && (t.sla.firstResponse || t.sla.resolution) && (
            <div className="sp-card">
              <h2>Response targets</h2>
              <SlaBar label="First response" clock={t.sla.firstResponse} />
              <SlaBar label="Resolution" clock={t.sla.resolution} />
            </div>
          )}

          <div className="sp-card">
            <h2>Details</h2>
            <dl className="sp-kv">
              {staffView && t.requester && <><dt>Member</dt><dd>{t.requester.name}{t.requester.email ? ` · ${t.requester.email}` : ''}</dd><dt>Role</dt><dd>{t.requester.role}</dd></>}
              {staffView && t.tenant?.name && <><dt>College</dt><dd>{t.tenant.name}</dd></>}
              <dt>Page</dt><dd>{t.context?.route || '—'}</dd>
              <dt>Reference</dt><dd>{t.context?.requestId || '—'}</dd>
              <dt>Device details</dt><dd>{t.diagnosticsConsent ? 'Shared' : 'Not shared'}</dd>
              {t.reopenCount > 0 && <><dt>Reopened</dt><dd>{t.reopenCount}×</dd></>}
              {t.firstResponseAt && <><dt>First reply</dt><dd>{fmtDateTime(t.firstResponseAt)}</dd></>}
              {t.resolvedAt && <><dt>Resolved</dt><dd>{fmtDateTime(t.resolvedAt)}</dd></>}
            </dl>
            {staffView && t.diagnostics?.summary && <pre className="sp-hint" style={{ whiteSpace: 'pre-wrap', marginTop: 10 }}>{t.diagnostics.summary}</pre>}
          </div>

          {staffView && detail.errors && (detail.errors.linked.length > 0 || detail.errors.possiblyRelated.length > 0) && (
            <div className="sp-card">
              <h2>Detected errors</h2>
              {detail.errors.linked.length > 0 && <p className="sp-hint">Linked by the request the member reported:</p>}
              {detail.errors.linked.map(e => <ErrorLine key={e.id} e={e} canOpen={!!me?.canMonitor} />)}
              {detail.errors.possiblyRelated.length > 0 && <p className="sp-hint" style={{ marginTop: 8 }}>Same area, within 30 minutes (possibly related):</p>}
              {detail.errors.possiblyRelated.map(e => <ErrorLine key={e.id} e={e} canOpen={!!me?.canMonitor} />)}
            </div>
          )}

          <div className="sp-card">
            <h2>Activity</h2>
            <Timeline entries={detail.timeline} staff={staff} />
          </div>
        </aside>
      </div>
    </div>
  );
};

export default TicketDetails;
