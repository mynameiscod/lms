import React, { useCallback, useEffect, useState } from 'react';
import { placementPartnerApi as api, PlacementPartner, OutreachMessage, ThreadItem, AttachmentRef, PartnerTaskRow, ImportResult, EnrichResult, EnrichedContact } from '../../api/placementPartnerApi';
import './PartnerPipeline.css';

// Shared: upload picked files and return their attachment refs.
async function uploadFiles(files: FileList | null): Promise<AttachmentRef[]> {
  if (!files || !files.length) return [];
  const refs: AttachmentRef[] = [];
  for (const f of Array.from(files)) {
    try { const r = await api.uploadAttachment(f); refs.push(r.data.data); } catch { /* skip rejected file */ }
  }
  return refs;
}
const prettySize = (n: number) => n < 1024 * 1024 ? `${Math.round(n / 1024)} KB` : `${(n / 1048576).toFixed(1)} MB`;

// Outreach status = the only status that matters in this simplified flow.
type OutStatus = 'not_started' | 'in_sequence' | 'replied' | 'bounced' | 'stopped';
const STATUS_META: Record<OutStatus, { label: string; color: string; bg: string }> = {
  not_started: { label: 'Not contacted', color: '#64748b', bg: '#f1f5f9' },
  in_sequence: { label: 'Following up',  color: '#2563eb', bg: '#eff6ff' },
  replied:     { label: 'Replied',       color: '#16a34a', bg: '#dcfce7' },
  bounced:     { label: 'Bounced',       color: '#dc2626', bg: '#fee2e2' },
  stopped:     { label: 'Stopped',       color: '#a16207', bg: '#fef9c3' },
};
const statusOf = (p: PlacementPartner): OutStatus => (p.outreach?.status as OutStatus) || 'not_started';

export default function PlacementPartnership() {
  const [partners, setPartners] = useState<PlacementPartner[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<{ status: '' | OutStatus; search: string }>({ status: '', search: '' });
  const [showAdd, setShowAdd] = useState(false);
  const [showEnrich, setShowEnrich] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [showApprovals, setShowApprovals] = useState(false);
  const [showReminders, setShowReminders] = useState(false);
  const [selected, setSelected] = useState<PlacementPartner | null>(null);
  const [approvalCount, setApprovalCount] = useState(0);
  const [taskCount, setTaskCount] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const ls = await api.list({ search: filters.search || undefined });
      setPartners(ls.data.data);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  }, [filters.search]);
  useEffect(() => { load(); }, [load]);

  const refreshApprovalCount = useCallback(async () => {
    try { const r = await api.getQueue('pending_approval'); setApprovalCount(r.data.data.length); } catch { /* ignore */ }
  }, []);
  const refreshTaskCount = useCallback(async () => {
    try { const r = await api.listTasks('open'); setTaskCount(r.data.data.summary.overdue + r.data.data.summary.today); } catch { /* ignore */ }
  }, []);
  useEffect(() => { refreshApprovalCount(); refreshTaskCount(); }, [refreshApprovalCount, refreshTaskCount]);

  const visible = partners
    .filter(p => !filters.status || statusOf(p) === filters.status)
    .sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));

  const counts = partners.reduce((acc, p) => { const s = statusOf(p); acc[s] = (acc[s] || 0) + 1; return acc; }, {} as Record<string, number>);

  return (
    <div className="pp-wrap">
      <div className="pp-head">
        <div>
          <h1>Placement Partnership</h1>
          <p className="sub">{partners.length} contact{partners.length === 1 ? '' : 's'} · send an intro, the system handles follow-ups automatically</p>
        </div>
        <div className="pp-actions">
          <button className="pp-btn pp-btn-ghost pp-btn-sm" onClick={load} disabled={loading}>↻ Refresh</button>
          <button className="pp-btn pp-btn-ghost" onClick={() => setShowReminders(true)}>⏰ Reminders{taskCount > 0 ? ` (${taskCount})` : ''}</button>
          <button className="pp-btn pp-btn-ghost" onClick={() => setShowApprovals(true)}>📥 Approvals{approvalCount > 0 ? ` (${approvalCount})` : ''}</button>
          <button className="pp-btn pp-btn-ghost" onClick={() => setShowImport(true)}>⬆ Import CSV</button>
          <button className="pp-btn pp-btn-teal" onClick={() => setShowEnrich(true)}>🔍 Add by company</button>
          <button className="pp-btn pp-btn-primary" onClick={() => setShowAdd(true)}>+ Add contact</button>
        </div>
      </div>

      <div className="pp-filters">
        <select value={filters.status} onChange={e => setFilters(f => ({ ...f, status: e.target.value as any }))}>
          <option value="">All statuses ({partners.length})</option>
          {(Object.keys(STATUS_META) as OutStatus[]).map(s => (
            <option key={s} value={s}>{STATUS_META[s].label} ({counts[s] || 0})</option>
          ))}
        </select>
        <input placeholder="Search company or contact…" value={filters.search}
          onChange={e => setFilters(f => ({ ...f, search: e.target.value }))} />
      </div>

      {loading ? (
        <div className="pp-empty" style={{ padding: 60 }}>Loading…</div>
      ) : visible.length === 0 ? (
        <div className="pp-empty" style={{ padding: 60, textAlign: 'center' }}>
          {partners.length === 0
            ? 'No contacts yet. Click "+ Add contact" to paste a company + email from LinkedIn and send your first intro.'
            : 'No contacts match this filter.'}
        </div>
      ) : (
        <div className="pp-list">
          {visible.map(p => {
            const st = STATUS_META[statusOf(p)];
            return (
              <div key={p._id} className="pp-row" onClick={() => setSelected(p)}>
                <div className="pp-row-main">
                  <div className="pp-row-name">{p.companyName}</div>
                  <div className="pp-row-sub">
                    {p.contactName || 'No contact name'}{p.contactEmail ? ` · ${p.contactEmail}` : ''}{p.contactTitle ? ` · ${p.contactTitle}` : ''}
                  </div>
                </div>
                <div className="pp-row-meta">
                  {p.outreach?.emailsSent ? <span className="pp-row-sent">{p.outreach.emailsSent} sent</span> : null}
                  <span className="pp-row-badge" style={{ color: st.color, background: st.bg }}>{st.label}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showAdd && <AddModal onClose={() => setShowAdd(false)} onSaved={() => { setShowAdd(false); load(); }} />}
      {showEnrich && <EnrichModal onClose={() => setShowEnrich(false)} onAdded={() => { setShowEnrich(false); load(); }} />}
      {showImport && <ImportModal onClose={() => setShowImport(false)} onDone={() => load()} />}
      {selected && (
        <PartnerDrawer partner={selected} onClose={() => setSelected(null)}
          onChanged={() => { load(); refreshApprovalCount(); }} />
      )}
      {showApprovals && (
        <ApprovalsModal onClose={() => setShowApprovals(false)}
          onChanged={() => { refreshApprovalCount(); load(); }} />
      )}
      {showReminders && <RemindersModal onClose={() => setShowReminders(false)} onChanged={refreshTaskCount} />}
    </div>
  );
}

// ── Reminders / tasks dashboard ───────────────────────────────────────────────
function RemindersModal({ onClose, onChanged }: { onClose: () => void; onChanged: () => void }) {
  const [tab, setTab] = useState<'open' | 'overdue' | 'today' | 'all'>('open');
  const [tasks, setTasks] = useState<PartnerTaskRow[]>([]);
  const [summary, setSummary] = useState<{ open: number; overdue: number; today: number }>({ open: 0, overdue: 0, today: 0 });
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try { const r = await api.listTasks(tab); setTasks(r.data.data.tasks); setSummary(r.data.data.summary); }
    catch { /* ignore */ } finally { setLoading(false); }
  }, [tab]);
  useEffect(() => { load(); }, [load]);

  const done = async (id: string) => { await api.completeTask(id); load(); onChanged(); };
  const snooze = async (id: string, days: number) => { await api.snoozeTask(id, days); load(); onChanged(); };

  const KIND_COLOR: Record<string, string> = { reply: '#2563eb', interested: '#7c3aed', checkin: '#0ea5e9', guarantee: '#dc2626', manual: '#64748b' };
  const fmt = (d?: string) => d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '—';

  return (
    <div className="pp-modal-overlay" onClick={onClose}>
      <div className="pp-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 640 }}>
        <div className="pp-modal-head">
          <h3>⏰ Reminders</h3>
          <button className="pp-drawer-x" onClick={onClose}>×</button>
        </div>
        <div style={{ display: 'flex', gap: 6, padding: '0 4px 12px', flexWrap: 'wrap' }}>
          {([['open', `Open (${summary.open})`], ['overdue', `Overdue (${summary.overdue})`], ['today', `Today (${summary.today})`], ['all', 'All']] as [any, string][]).map(([k, l]) => (
            <button key={k} onClick={() => setTab(k)} style={{ border: `1.5px solid ${tab === k ? '#2563eb' : '#e2e8f0'}`, background: tab === k ? '#eff6ff' : '#fff', color: tab === k ? '#2563eb' : '#64748b', borderRadius: 999, padding: '5px 13px', fontSize: 12.5, fontWeight: 700, cursor: 'pointer' }}>{l}</button>
          ))}
        </div>
        <div style={{ maxHeight: '60vh', overflowY: 'auto' }}>
          {loading ? <div style={{ padding: 24, color: '#94a3b8' }}>Loading…</div> :
            tasks.length === 0 ? <div style={{ padding: 24, color: '#94a3b8', textAlign: 'center' }}>🎉 No reminders here — you're all caught up.</div> :
              tasks.map(t => (
                <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 8px', borderTop: '1px solid #f1f5f9' }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: KIND_COLOR[t.kind], flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 600, color: '#0f172a' }}>{t.company} <span style={{ fontSize: 11, fontWeight: 700, color: KIND_COLOR[t.kind] }}>· {t.kindLabel}</span></div>
                    <div style={{ fontSize: 12, color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.content}</div>
                  </div>
                  <span style={{ fontSize: 11.5, fontWeight: 700, color: t.overdue ? '#dc2626' : t.today ? '#d97706' : '#94a3b8', whiteSpace: 'nowrap' }}>{t.overdue ? 'Overdue' : t.today ? 'Today' : fmt(t.dueAt)}</span>
                  {t.open && <>
                    <button title="Snooze 3 days" onClick={() => snooze(t.id, 3)} style={{ border: '1px solid #e2e8f0', background: '#fff', borderRadius: 7, padding: '4px 8px', fontSize: 11.5, cursor: 'pointer', color: '#64748b' }}>💤 3d</button>
                    <button onClick={() => done(t.id)} style={{ border: 'none', background: '#16a34a', color: '#fff', borderRadius: 7, padding: '5px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>✓ Done</button>
                  </>}
                </div>
              ))}
        </div>
      </div>
    </div>
  );
}

// ── Partner detail drawer (outreach + conversation only) ──────────────────────
function PartnerDrawer({ partner: initial, onClose, onChanged }: { partner: PlacementPartner; onClose: () => void; onChanged: () => void }) {
  const [partner, setPartner] = useState<PlacementPartner>(initial);
  const [thread, setThread] = useState<{ items: ThreadItem[]; unread: number }>({ items: [], unread: 0 });
  const [imapTest, setImapTest] = useState<{ ok: boolean; m: string } | null>(null);
  const [replyForm, setReplyForm] = useState<{ subject: string; body: string; inboundId?: string }>({ subject: '', body: '' });
  const [replyFiles, setReplyFiles] = useState<AttachmentRef[]>([]);
  const [uploading, setUploading] = useState(false);
  const [replying, setReplying] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ t: 'ok' | 'err'; m: string } | null>(null);
  const out = statusOf(partner);
  const st = STATUS_META[out];

  const loadThread = useCallback(async () => {
    try { const r = await api.getThread(partner._id); setThread(r.data.data); } catch { /* ignore */ }
  }, [partner._id]);
  useEffect(() => { loadThread(); }, [loadThread]);

  const markRead = async (id: string) => {
    try { await api.markInboundRead(id); setThread(t => ({ items: t.items.map(i => i.id === id ? { ...i, read: true } : i), unread: Math.max(0, t.unread - 1) })); onChanged(); }
    catch { /* ignore */ }
  };
  const runImapTest = async () => {
    setImapTest({ ok: false, m: 'Checking…' });
    try { const r = await api.testImap(); setImapTest({ ok: r.data.success, m: r.data.message }); }
    catch (e: any) { setImapTest({ ok: false, m: e?.response?.data?.message || 'Test failed' }); }
  };

  const lastInbound = [...thread.items].reverse().find(i => i.dir === 'in');
  const defaultSubject = lastInbound ? `Re: ${lastInbound.subject}` : `Re: ${partner.companyName}`;
  const startReply = (item: ThreadItem) => setReplyForm(f => ({ subject: `Re: ${item.subject}`, body: f.body, inboundId: item.id }));
  const addReplyFiles = async (files: FileList | null) => {
    setUploading(true);
    try { const refs = await uploadFiles(files); setReplyFiles(f => [...f, ...refs]); }
    finally { setUploading(false); }
  };
  const sendReply = async () => {
    const subject = (replyForm.subject || defaultSubject).trim();
    const body = replyForm.body.trim();
    if (!body) { setMsg({ t: 'err', m: 'Write a message first' }); return; }
    setReplying(true); setMsg(null);
    try {
      await api.reply(partner._id, { subject, body, inboundId: replyForm.inboundId ?? lastInbound?.id, attachments: replyFiles });
      setReplyForm({ subject: '', body: '' }); setReplyFiles([]);
      setMsg({ t: 'ok', m: 'Reply sent' });
      await loadThread(); onChanged();
    } catch (e: any) { setMsg({ t: 'err', m: e?.response?.data?.message || 'Failed to send' }); }
    finally { setReplying(false); }
  };

  const act = async (fn: () => Promise<any>, ok: string) => {
    setBusy(true); setMsg(null);
    try { const r = await fn(); setMsg({ t: 'ok', m: r?.data?.message || ok }); if (r?.data?.data) setPartner(r.data.data); await loadThread(); onChanged(); }
    catch (e: any) { setMsg({ t: 'err', m: e?.response?.data?.message || 'Action failed' }); }
    finally { setBusy(false); }
  };

  return (
    <div className="pp-drawer-wrap">
      <div className="pp-drawer-bg" onClick={onClose} />
      <div className="pp-drawer">
        <div className="pp-drawer-head">
          <button className="pp-drawer-x" onClick={onClose}>×</button>
          <h2>{partner.companyName}</h2>
          <div className="meta">{partner.contactName || 'No contact name'} · {partner.contactEmail || 'no email'}</div>
        </div>
        <div className="pp-drawer-body">
          {msg && <div className={`pp-banner ${msg.t}`}>{msg.m}</div>}

          <div className="pp-act-row">
            {out === 'not_started' && (
              <button className="pp-btn pp-btn-primary pp-btn-sm" disabled={busy || !partner.contactEmail}
                title={!partner.contactEmail ? 'Add a contact email first' : ''}
                onClick={() => act(() => api.startOutreach(partner._id), 'Intro sent — follow-ups will go automatically')}>▶ Send intro</button>
            )}
            <button className="pp-btn pp-btn-ghost pp-btn-sm" disabled={busy} onClick={() => act(() => api.markReplied(partner._id), 'Marked replied')}>✓ Mark replied</button>
            <button className="pp-btn pp-btn-ghost pp-btn-sm" disabled={busy} onClick={() => act(() => api.markBounced(partner._id), 'Marked bounced')}>⚠ Mark bounced</button>
          </div>

          <div className="pp-kv"><b>Status:</b> <span style={{ color: st.color, fontWeight: 700 }}>{st.label}</span>{partner.outreach?.emailsSent ? ` · ${partner.outreach.emailsSent} email(s) sent` : ''}</div>
          {partner.outreach?.status === 'in_sequence' && <div className="pp-kv" style={{ color: '#64748b', fontSize: 12 }}>Follow-ups auto-send every ~3 days (up to 3) until they reply.</div>}
          {partner.contactTitle && <div className="pp-kv"><b>Title:</b> {partner.contactTitle}</div>}
          {partner.outreachAngle && <div className="pp-kv"><b>Angle:</b> {partner.outreachAngle}</div>}
          {partner.website && <div className="pp-kv"><b>Website:</b> {partner.website}</div>}
          {partner.notes && <div className="pp-kv"><b>Notes:</b> {partner.notes}</div>}

          <div className="pp-section-title" style={{ display: 'flex', alignItems: 'center' }}>
            Conversation{thread.unread > 0 ? <span className="pp-unread-pill">{thread.unread} new</span> : null}
            <button className="pp-btn pp-btn-ghost pp-btn-sm" style={{ marginLeft: 'auto' }} onClick={runImapTest}>Check inbox connection</button>
          </div>
          {imapTest && (
            <div className={`pp-banner ${imapTest.ok ? 'ok' : 'err'}`} style={{ marginBottom: 8 }}>
              {imapTest.ok ? '✅ ' : '⚠ '}{imapTest.m}
            </div>
          )}
          {thread.items.length === 0 ? (
            <div style={{ fontSize: 12, color: '#94a3b8' }}>No messages yet. Once you send the intro, sent emails and any replies appear here automatically.</div>
          ) : thread.items.map(m => (
            m.dir === 'out' ? (
              <div className="pp-chat out" key={m.id}>
                <div className="pp-chat-bubble out">
                  <div className="pp-chat-meta">
                    <span className="pp-mtype">{m.type}</span>
                    <span className={`pp-mstatus ${m.status}`}>{(m.status || '').replace('_', ' ')}</span>
                  </div>
                  <div className="pp-chat-subj">{m.subject}</div>
                  <div className="pp-chat-body">{m.body}</div>
                  <div className="pp-chat-time">{m.at ? new Date(m.at).toLocaleString() : ''}{m.failedReason ? ` · ${m.failedReason}` : ''}</div>
                </div>
              </div>
            ) : (
              <div className="pp-chat in" key={m.id} onClick={() => !m.read && markRead(m.id)}>
                <div className={`pp-chat-bubble in ${!m.read ? 'unread' : ''}`}>
                  <div className="pp-chat-meta">
                    <span className="pp-in-from">↩ {m.fromName || m.fromEmail}</span>
                    {!m.read && <span className="pp-in-new">● new</span>}
                    {m.matchedBy === 'thread' && <span className="pp-in-thread" title="Matched by email thread">🧵</span>}
                  </div>
                  <div className="pp-chat-subj">{m.subject}</div>
                  <div className="pp-chat-body">{m.body}</div>
                  <div className="pp-chat-time">
                    Received {m.at ? new Date(m.at).toLocaleString() : ''}
                    <button className="pp-chat-reply" onClick={(e) => { e.stopPropagation(); startReply(m); }}>↩ Reply</button>
                  </div>
                </div>
              </div>
            )
          ))}

          {/* Reply composer */}
          {partner.contactEmail && (
            <div className="pp-reply">
              {replyForm.inboundId && <div className="pp-reply-ctx">Replying in thread{lastInbound && replyForm.inboundId === lastInbound.id ? ' (latest reply)' : ''} · <button className="pp-linkbtn" onClick={() => setReplyForm(f => ({ ...f, inboundId: undefined }))}>new email instead</button></div>}
              <input className="pp-reply-subj" placeholder="Subject" value={replyForm.subject || defaultSubject}
                onChange={e => setReplyForm(f => ({ ...f, subject: e.target.value }))} />
              <textarea className="pp-reply-body" placeholder={`Write to ${partner.contactName || partner.contactEmail}…`} value={replyForm.body}
                onChange={e => setReplyForm(f => ({ ...f, body: e.target.value }))} />
              {replyFiles.length > 0 && (
                <div className="pp-attach-chips">
                  {replyFiles.map((a, i) => (
                    <span className="pp-attach-chip" key={i}>📎 {a.filename} <span className="sz">{prettySize(a.size)}</span>
                      <button onClick={() => setReplyFiles(f => f.filter((_, j) => j !== i))}>×</button></span>
                  ))}
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label className="pp-attach-btn">
                  {uploading ? 'Uploading…' : '📎 Attach'}
                  <input type="file" multiple accept=".pdf,.png,.jpg,.jpeg,.ppt,.pptx" style={{ display: 'none' }}
                    onChange={e => { addReplyFiles(e.target.files); e.currentTarget.value = ''; }} />
                </label>
                <button className="pp-btn pp-btn-primary pp-btn-sm" disabled={replying || uploading} onClick={sendReply}>{replying ? 'Sending…' : '➤ Send'}</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Approval queue (emails held because contact name is missing, etc.) ────────
function ApprovalsModal({ onClose, onChanged }: { onClose: () => void; onChanged: () => void }) {
  const [items, setItems] = useState<OutreachMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [edit, setEdit] = useState<Record<string, { subject: string; body: string; attachments: AttachmentRef[] }>>({});
  const [busy, setBusy] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api.getQueue('pending_approval');
      setItems(r.data.data);
      const e: Record<string, { subject: string; body: string; attachments: AttachmentRef[] }> = {};
      r.data.data.forEach(m => { e[m._id] = { subject: m.subject, body: m.body, attachments: m.attachments || [] }; });
      setEdit(e);
    } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const addFiles = async (id: string, files: FileList | null) => {
    setBusy(id + ':up');
    try { const refs = await uploadFiles(files); setEdit(s => ({ ...s, [id]: { ...s[id], attachments: [...(s[id]?.attachments || []), ...refs] } })); }
    finally { setBusy(''); }
  };
  const approve = async (id: string) => {
    setBusy(id);
    try { await api.approveMessage(id, edit[id]); await load(); onChanged(); }
    finally { setBusy(''); }
  };
  const discard = async (id: string) => {
    setBusy(id);
    try { await api.cancelMessage(id); await load(); onChanged(); }
    finally { setBusy(''); }
  };

  return (
    <div className="pp-overlay" onClick={onClose}>
      <div className="pp-modal" style={{ maxWidth: 640 }} onClick={e => e.stopPropagation()}>
        <h2>Approval queue</h2>
        <div className="pp-hint" style={{ marginTop: 0, marginBottom: 14 }}>
          Emails held for review (e.g. missing contact name) are drafted but never auto-sent. Review, edit if needed, then approve to send.
        </div>
        {loading ? <div className="pp-empty">Loading…</div> : items.length === 0 ? (
          <div className="pp-empty">Nothing waiting for approval. 🎉</div>
        ) : items.map(m => (
          <div className="pp-msg pp-edit" key={m._id}>
            <div className="top">
              <span className="pp-mtype">{m.type}</span>
              <span className="subj">{m.companyName} · {m.toEmail}</span>
            </div>
            <input value={edit[m._id]?.subject ?? ''} onChange={e => setEdit(s => ({ ...s, [m._id]: { ...s[m._id], subject: e.target.value } }))} placeholder="Subject" />
            <textarea value={edit[m._id]?.body ?? ''} onChange={e => setEdit(s => ({ ...s, [m._id]: { ...s[m._id], body: e.target.value } }))} />
            {(edit[m._id]?.attachments?.length ?? 0) > 0 && (
              <div className="pp-attach-chips">
                {edit[m._id].attachments.map((a, i) => (
                  <span className="pp-attach-chip" key={i}>📎 {a.filename} <span className="sz">{prettySize(a.size)}</span>
                    <button onClick={() => setEdit(s => ({ ...s, [m._id]: { ...s[m._id], attachments: s[m._id].attachments.filter((_, j) => j !== i) } }))}>×</button></span>
                ))}
              </div>
            )}
            <div className="pp-modal-actions" style={{ marginTop: 0 }}>
              <label className="pp-attach-btn" style={{ marginRight: 'auto' }}>
                {busy === m._id + ':up' ? 'Uploading…' : '📎 Attach'}
                <input type="file" multiple accept=".pdf,.png,.jpg,.jpeg,.ppt,.pptx" style={{ display: 'none' }}
                  onChange={e => { addFiles(m._id, e.target.files); e.currentTarget.value = ''; }} />
              </label>
              <button className="pp-btn pp-btn-ghost pp-btn-sm" disabled={busy === m._id} onClick={() => discard(m._id)}>Discard</button>
              <button className="pp-btn pp-btn-primary pp-btn-sm" disabled={busy === m._id} onClick={() => approve(m._id)}>{busy === m._id ? 'Sending…' : 'Approve & send'}</button>
            </div>
          </div>
        ))}
        <div className="pp-modal-actions"><button className="pp-btn pp-btn-ghost" onClick={onClose}>Close</button></div>
      </div>
    </div>
  );
}

// ── Add contact modal (Use Case 1 — paste from LinkedIn) ──────────────────────
function AddModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [f, setF] = useState<any>({ companyName: '', contactName: '', contactEmail: '', contactTitle: '', outreachAngle: '' });
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k: string) => (e: any) => setF((p: any) => ({ ...p, [k]: e.target.value }));

  const save = async () => {
    if (!f.companyName.trim()) { setErr('Company name is required'); return; }
    if (!f.contactEmail.trim()) { setErr('Contact email is required to send the intro'); return; }
    setBusy(true); setErr('');
    try { await api.create(f); onSaved(); }
    catch (e: any) { setErr(e?.response?.data?.message || 'Failed to save'); }
    finally { setBusy(false); }
  };

  return (
    <div className="pp-overlay" onClick={onClose}>
      <div className="pp-modal" onClick={e => e.stopPropagation()}>
        <h2>Add contact</h2>
        <div className="pp-hint" style={{ marginTop: 0 }}>Found someone on LinkedIn posting openings? Paste their details here, then open the card and hit <b>Send intro</b>. Follow-ups go automatically.</div>
        {err && <div className="pp-banner err">{err}</div>}
        <div className="pp-field"><label>Company name *</label><input value={f.companyName} onChange={set('companyName')} autoFocus /></div>
        <div className="pp-grid2">
          <div className="pp-field"><label>Contact name</label><input value={f.contactName} onChange={set('contactName')} placeholder="e.g. Priya Sharma" /></div>
          <div className="pp-field"><label>Contact email *</label><input value={f.contactEmail} onChange={set('contactEmail')} placeholder="name@company.com" /></div>
          <div className="pp-field"><label>Title / role</label><input value={f.contactTitle} onChange={set('contactTitle')} placeholder="e.g. HR Manager" /></div>
          <div className="pp-field"><label>Website</label><input value={f.website || ''} onChange={set('website')} placeholder="https://" /></div>
        </div>
        <div className="pp-field"><label>Angle / note (optional)</label><input value={f.outreachAngle} onChange={set('outreachAngle')} placeholder="Why we're a fit — e.g. they posted a Java fresher opening" /></div>
        <div className="pp-modal-actions">
          <button className="pp-btn pp-btn-ghost" onClick={onClose}>Cancel</button>
          <button className="pp-btn pp-btn-primary" onClick={save} disabled={busy}>{busy ? 'Saving…' : 'Add contact'}</button>
        </div>
      </div>
    </div>
  );
}

// ── Add by Company — Apollo enrichment (Use Case 2) ───────────────────────────
const CONF_META: Record<string, { label: string; color: string; bg: string }> = {
  high: { label: 'Verified email', color: '#16a34a', bg: '#dcfce7' },
  medium: { label: 'Likely email', color: '#d97706', bg: '#fef3c7' },
  low: { label: 'Email locked', color: '#64748b', bg: '#f1f5f9' },
};

function EnrichModal({ onClose, onAdded }: { onClose: () => void; onAdded: () => void }) {
  const [company, setCompany] = useState('');
  const [domain, setDomain] = useState('');
  const [loading, setLoading] = useState(false);
  const [res, setRes] = useState<EnrichResult | null>(null);
  const [err, setErr] = useState('');
  const [addingIdx, setAddingIdx] = useState<number | null>(null);

  const search = async () => {
    if (!company.trim() && !domain.trim()) { setErr('Enter a company name or website'); return; }
    setLoading(true); setErr(''); setRes(null);
    try { const r = await api.enrich(company.trim(), domain.trim() || undefined); setRes(r.data.data); }
    catch (e: any) { setErr(e?.response?.data?.message || 'Search failed'); }
    finally { setLoading(false); }
  };

  const pickContact = async (c: EnrichedContact, idx: number) => {
    setAddingIdx(idx); setErr('');
    try {
      await api.create({
        companyName: res?.company || company.trim(),
        website: res?.domain ? `https://${res.domain}` : (domain.trim() || undefined),
        contactName: c.name,
        contactEmail: c.email,
        contactTitle: c.title,
        contactLinkedin: c.linkedinUrl,
      });
      onAdded();
    } catch (e: any) {
      setErr(e?.response?.data?.message || 'Could not add — this company may already be in your pipeline.');
    } finally { setAddingIdx(null); }
  };

  return (
    <div className="pp-overlay" onClick={onClose}>
      <div className="pp-modal" style={{ maxWidth: 640 }} onClick={e => e.stopPropagation()}>
        <h2>Add by company</h2>
        <div className="pp-hint" style={{ marginTop: 0 }}>Enter a company — we'll show its <b>current openings</b> (LinkedIn / Google Jobs) and look up its HR / decision-maker / CEO contacts via Apollo. Pick one to add, then open the card and hit <b>Send intro</b>.</div>
        {err && <div className="pp-banner err">{err}</div>}
        <div className="pp-grid2">
          <div className="pp-field"><label>Company name</label><input value={company} onChange={e => setCompany(e.target.value)} placeholder="e.g. Acme Tech" autoFocus onKeyDown={e => e.key === 'Enter' && search()} /></div>
          <div className="pp-field"><label>Website / domain (optional)</label><input value={domain} onChange={e => setDomain(e.target.value)} placeholder="acme.com — improves accuracy" onKeyDown={e => e.key === 'Enter' && search()} /></div>
        </div>
        <div className="pp-modal-actions" style={{ marginTop: 4 }}>
          <button className="pp-btn pp-btn-ghost" onClick={onClose}>Cancel</button>
          <button className="pp-btn pp-btn-primary" onClick={search} disabled={loading}>{loading ? 'Searching…' : '🔍 Find contacts'}</button>
        </div>

        {res && (res.hiringLinks || res.companyInfo) && (
          <div style={{ marginTop: 14, border: '1px solid #e2e8f0', borderRadius: 10, padding: '12px 14px', background: '#f8fafc' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {res.companyInfo?.logoUrl && <img src={res.companyInfo.logoUrl} alt="" style={{ width: 34, height: 34, borderRadius: 7, objectFit: 'contain', background: '#fff', border: '1px solid #e2e8f0' }} />}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, color: 'var(--pp-navy)', fontSize: 14.5 }}>{res.companyInfo?.name || res.company}</div>
                <div style={{ fontSize: 12, color: '#64748b' }}>
                  {[res.companyInfo?.industry, res.companyInfo?.employees ? `${res.companyInfo.employees.toLocaleString()} employees` : '', res.domain].filter(Boolean).join(' · ')}
                </div>
              </div>
              {typeof res.companyInfo?.jobOpenings === 'number' && (
                <span className="pp-row-badge" style={{ color: '#15803d', background: '#dcfce7' }}>{res.companyInfo.jobOpenings} open role{res.companyInfo.jobOpenings === 1 ? '' : 's'}</span>
              )}
            </div>
            {res.hiringLinks && (
              <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
                <a className="pp-btn pp-btn-teal pp-btn-sm" href={res.hiringLinks.googleJobs} target="_blank" rel="noreferrer" style={{ textDecoration: 'none' }}>🔎 See current openings</a>
                <a className="pp-btn pp-btn-ghost pp-btn-sm" href={res.hiringLinks.linkedinJobs} target="_blank" rel="noreferrer" style={{ textDecoration: 'none' }}>Jobs on LinkedIn</a>
                {res.companyInfo?.linkedinUrl && <a className="pp-btn pp-btn-ghost pp-btn-sm" href={res.companyInfo.linkedinUrl} target="_blank" rel="noreferrer" style={{ textDecoration: 'none' }}>Company page</a>}
              </div>
            )}
          </div>
        )}

        {res && !res.configured && (
          <div className="pp-banner err" style={{ marginTop: 12 }}>{res.note || 'Apollo is not configured. Add an API key in Platform Settings → Placement Outreach.'}</div>
        )}
        {res && res.configured && (
          <div style={{ marginTop: 8 }}>
            {res.domain && <div className="pp-hint" style={{ marginTop: 0 }}>Matched domain: <b>{res.domain}</b></div>}
            {res.note && <div className="pp-hint">{res.note}</div>}
            {res.contacts.map((c, i) => {
              const cf = CONF_META[c.confidence];
              return (
                <div className="pp-stud col" key={i}>
                  <div className="pp-stud row">
                    <span className="nm">{c.name}{c.title ? <span style={{ fontWeight: 400, color: '#64748b' }}> · {c.title}</span> : null}</span>
                    <span className="pp-row-badge" style={{ color: cf.color, background: cf.bg }}>{cf.label}</span>
                    <button className="pp-btn pp-btn-primary pp-btn-sm" disabled={addingIdx !== null} onClick={() => pickContact(c, i)}>
                      {addingIdx === i ? 'Adding…' : 'Add'}
                    </button>
                  </div>
                  <div style={{ fontSize: 11.5, color: '#64748b' }}>
                    {c.email || <span style={{ color: '#94a3b8' }}>email hidden — add, then fill it manually (or reveal in Apollo)</span>}
                    {c.linkedinUrl ? <> · <a href={c.linkedinUrl} target="_blank" rel="noreferrer">LinkedIn</a></> : null}
                  </div>
                </div>
              );
            })}
            {res.contacts.length === 0 && !res.note && <div className="pp-empty">No contacts found.</div>}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Import CSV modal ──────────────────────────────────────────────────────────
function ImportModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [err, setErr] = useState('');

  const upload = async () => {
    if (!file) return;
    setBusy(true); setErr(''); setResult(null);
    try { const r = await api.import(file); setResult(r.data.data); onDone(); }
    catch (e: any) { setErr(e?.response?.data?.message || 'Import failed'); }
    finally { setBusy(false); }
  };

  return (
    <div className="pp-overlay" onClick={onClose}>
      <div className="pp-modal" onClick={e => e.stopPropagation()}>
        <h2>Import contacts (CSV)</h2>
        {err && <div className="pp-banner err">{err}</div>}
        {result ? (
          <>
            <div className="pp-banner ok">Created {result.created} · Updated {result.updated} · Skipped {result.skipped} (of {result.total} rows)</div>
            {result.errors?.length > 0 && (
              <div className="pp-hint">Skipped rows: {result.errors.map(e => `#${e.row} (${e.reason})`).join(', ')}</div>
            )}
            <div className="pp-modal-actions"><button className="pp-btn pp-btn-primary" onClick={onClose}>Done</button></div>
          </>
        ) : (
          <>
            <div className="pp-field">
              <label>CSV file</label>
              <input type="file" accept=".csv,text/csv" onChange={e => setFile(e.target.files?.[0] || null)} />
            </div>
            <div className="pp-hint">
              Columns (header row, any order — extras ignored):<br />
              <b>company</b> (required), website, contact_name, contact_email, contact_title, contact_phone, outreach_angle, notes.<br />
              Re-importing the same company updates it (no duplicates).
            </div>
            <div className="pp-modal-actions">
              <button className="pp-btn pp-btn-ghost" onClick={onClose}>Cancel</button>
              <button className="pp-btn pp-btn-teal" onClick={upload} disabled={!file || busy}>{busy ? 'Importing…' : 'Import'}</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
