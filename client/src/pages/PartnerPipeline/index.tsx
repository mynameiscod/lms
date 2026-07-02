import React, { useCallback, useEffect, useRef, useState } from 'react';
import { placementPartnerApi as api, PlacementPartner, PartnerStage, PartnerStageMeta, ImportResult, OutreachMessage, MatchedStudent, PartnerAnalytics, ThreadItem, AttachmentRef } from '../../api/placementPartnerApi';
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

const TIER_LABEL: Record<string, string> = { tier1: 'Tier 1', tier2: 'Tier 2', tier3: 'Tier 3' };
const OUT_LABEL: Record<string, string> = { in_sequence: 'In sequence', replied: 'Replied', bounced: 'Bounced', stopped: 'Stopped' };

export default function PartnerPipeline() {
  const [stages, setStages] = useState<PartnerStageMeta[]>([]);
  const [byStage, setByStage] = useState<Record<string, PlacementPartner[]>>({});
  const [loading, setLoading] = useState(true);
  const [moving, setMoving] = useState(false);
  const [filters, setFilters] = useState({ tier: '', priority: '', search: '' });
  const [showAdd, setShowAdd] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [showApprovals, setShowApprovals] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [selected, setSelected] = useState<PlacementPartner | null>(null);
  const [approvalCount, setApprovalCount] = useState(0);

  const dragRef = useRef<{ id: string; from: PartnerStage } | null>(null);
  const [dragOver, setDragOver] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [st, ls] = await Promise.all([api.getStages(), api.list({
        tier: filters.tier || undefined, priority: filters.priority || undefined, search: filters.search || undefined,
      })]);
      const stageArr = st.data.data;
      setStages(stageArr);
      const grouped: Record<string, PlacementPartner[]> = {};
      stageArr.forEach(s => { grouped[s.id] = []; });
      ls.data.data.forEach(p => { (grouped[p.stage] ||= []).push(p); });
      setByStage(grouped);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  }, [filters]);

  useEffect(() => { load(); }, [load]);

  const refreshApprovalCount = useCallback(async () => {
    try { const r = await api.getQueue('pending_approval'); setApprovalCount(r.data.data.length); } catch { /* ignore */ }
  }, []);
  useEffect(() => { refreshApprovalCount(); }, [refreshApprovalCount]);

  const handleDrop = async (to: PartnerStage) => {
    setDragOver(null);
    const drag = dragRef.current; dragRef.current = null;
    if (!drag || drag.from === to) return;
    const { id, from } = drag;
    setByStage(prev => {
      const moved = (prev[from] || []).find(p => p._id === id);
      if (!moved) return prev;
      return { ...prev, [from]: prev[from].filter(p => p._id !== id), [to]: [...(prev[to] || []), { ...moved, stage: to }] };
    });
    setMoving(true);
    try { await api.moveStage(id, to); } catch (e) { console.error(e); load(); } finally { setMoving(false); }
  };

  const total = Object.values(byStage).reduce((s, a) => s + a.length, 0);

  return (
    <div className="pp-wrap">
      <div className="pp-head">
        <div>
          <h1>Placement Partner Pipeline</h1>
          <p className="sub">{total} companies · drag a card to change stage{moving ? ' · saving…' : ''}</p>
        </div>
        <div className="pp-actions">
          <button className="pp-btn pp-btn-ghost pp-btn-sm" onClick={load} disabled={loading}>↻ Refresh</button>
          <button className="pp-btn pp-btn-ghost" onClick={() => setShowAnalytics(true)}>📊 Analytics</button>
          <button className="pp-btn pp-btn-ghost" onClick={() => setShowApprovals(true)}>📥 Approvals{approvalCount > 0 ? ` (${approvalCount})` : ''}</button>
          <button className="pp-btn pp-btn-teal" onClick={() => setShowImport(true)}>⬆ Import CSV</button>
          <button className="pp-btn pp-btn-primary" onClick={() => setShowAdd(true)}>+ Add partner</button>
        </div>
      </div>

      <div className="pp-filters">
        <select value={filters.tier} onChange={e => setFilters(f => ({ ...f, tier: e.target.value }))}>
          <option value="">All tiers</option>
          <option value="tier1">Tier 1</option><option value="tier2">Tier 2</option><option value="tier3">Tier 3</option>
        </select>
        <select value={filters.priority} onChange={e => setFilters(f => ({ ...f, priority: e.target.value }))}>
          <option value="">All priorities</option>
          <option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option>
        </select>
        <input placeholder="Search company…" value={filters.search}
          onChange={e => setFilters(f => ({ ...f, search: e.target.value }))} />
      </div>

      {loading ? (
        <div className="pp-empty" style={{ padding: 60 }}>Loading board…</div>
      ) : (
        <div className="pp-board">
          {stages.map(stage => {
            const cards = byStage[stage.id] || [];
            return (
              <div key={stage.id} className="pp-col"
                onDragOver={e => { e.preventDefault(); setDragOver(stage.id); }}
                onDragLeave={() => setDragOver(null)}
                onDrop={() => handleDrop(stage.id)}>
                <div className="pp-col-head" style={{ background: stage.color }}>
                  {stage.name}<span className="count">{cards.length}</span>
                </div>
                <div className={`pp-drop ${dragOver === stage.id ? 'over' : ''}`}>
                  {cards.map(p => (
                    <div key={p._id} className={`pp-card prio-${p.priority}`} draggable
                      onDragStart={() => { dragRef.current = { id: p._id, from: stage.id }; }}
                      onClick={() => setSelected(p)}>
                      <div className="name">{p.companyName}</div>
                      {(p.contactName || p.contactEmail) && (
                        <div className="meta">{p.contactName}{p.contactName && p.contactEmail ? ' · ' : ''}{p.contactEmail}</div>
                      )}
                      {p.location && <div className="meta">📍 {p.location}</div>}
                      <div className="row2">
                        <span className={`pp-badge pp-${p.tier}`}>{TIER_LABEL[p.tier]}</span>
                        <span className={`pp-badge pp-fit ${p.fresherFit}`}>Fit: {p.fresherFit}</span>
                      </div>
                      {p.outreach && p.outreach.status !== 'not_started' && (
                        <span className={`pp-out ${p.outreach.status}`}>
                          {OUT_LABEL[p.outreach.status]}{p.outreach.emailsSent ? ` · ${p.outreach.emailsSent} sent` : ''}
                        </span>
                      )}
                    </div>
                  ))}
                  {cards.length === 0 && <div className="pp-empty">Drop here</div>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showAdd && <AddModal onClose={() => setShowAdd(false)} onSaved={() => { setShowAdd(false); load(); }} />}
      {showImport && <ImportModal onClose={() => setShowImport(false)} onDone={() => load()} />}
      {selected && (
        <PartnerDrawer partner={selected} onClose={() => setSelected(null)}
          onChanged={() => { load(); refreshApprovalCount(); }} />
      )}
      {showApprovals && (
        <ApprovalsModal onClose={() => setShowApprovals(false)}
          onChanged={() => { refreshApprovalCount(); load(); }} />
      )}
      {showAnalytics && <AnalyticsModal onClose={() => setShowAnalytics(false)} />}
    </div>
  );
}

// ── Analytics ─────────────────────────────────────────────────────────────────
function AnalyticsModal({ onClose }: { onClose: () => void }) {
  const [a, setA] = useState<PartnerAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => { api.analytics().then(r => setA(r.data.data)).finally(() => setLoading(false)); }, []);

  const Stat = ({ label, val, color }: { label: string; val: React.ReactNode; color?: string }) => (
    <div style={{ flex: 1, minWidth: 110, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: '12px 14px' }}>
      <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 800, color: color || '#051D64' }}>{val}</div>
    </div>
  );

  return (
    <div className="pp-overlay" onClick={onClose}>
      <div className="pp-modal" style={{ maxWidth: 640 }} onClick={e => e.stopPropagation()}>
        <h2>Pipeline analytics</h2>
        {loading || !a ? <div className="pp-empty">Loading…</div> : (
          <>
            <div className="pp-section-title" style={{ marginTop: 0 }}>Funnel</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 6 }}>
              <Stat label="Companies" val={a.funnel.total} />
              <Stat label="Contacted" val={a.funnel.contacted} />
              <Stat label="Replied" val={a.funnel.replied} color="#0ea5e9" />
              <Stat label="Interviewing" val={a.funnel.interviewing} color="#f59e0b" />
              <Stat label="Placed" val={a.funnel.placed} color="#16a34a" />
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <Stat label="Response rate" val={`${a.responseRate}%`} color="#359AAD" />
              <Stat label="Placements" val={a.placements} color="#16a34a" />
              <Stat label={`Est. revenue (@${a.feePct}%)`} val={`₹${a.estRevenue} L`} color="#051D64" />
            </div>

            <div className="pp-section-title">Response rate by tier</div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead><tr style={{ textAlign: 'left', color: '#64748b', borderBottom: '1px solid #e2e8f0' }}>
                <th style={{ padding: '6px 4px' }}>Tier</th><th>Total</th><th>Contacted</th><th>Replied</th><th>Placed</th><th>Resp. %</th>
              </tr></thead>
              <tbody>
                {a.byTier.map(t => (
                  <tr key={t.tier} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '7px 4px', fontWeight: 700, textTransform: 'capitalize' }}>{t.tier.replace('tier', 'Tier ')}</td>
                    <td>{t.total}</td><td>{t.contacted}</td><td>{t.replied}</td><td>{t.placed}</td>
                    <td style={{ fontWeight: 700, color: '#359AAD' }}>{t.responseRate}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
        <div className="pp-modal-actions"><button className="pp-btn pp-btn-ghost" onClick={onClose}>Close</button></div>
      </div>
    </div>
  );
}

// ── Partner detail drawer (actions + message timeline) ────────────────────────
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
  const [matches, setMatches] = useState<MatchedStudent[] | null>(null);
  const [matching, setMatching] = useState(false);
  const out = partner.outreach?.status || 'not_started';
  const candidateIds = new Set((partner.candidates || []).map(c => c.studentId));

  const runMatch = async () => {
    setMatching(true);
    try { const r = await api.matchStudents(partner._id); setMatches(r.data.data); } catch { setMatches([]); }
    finally { setMatching(false); }
  };
  const addCandidate = async (sid: string) => {
    try { const r = await api.addCandidate(partner._id, sid); setPartner(r.data.data); onChanged(); } catch { /* ignore */ }
  };
  const removeCandidate = async (sid: string) => {
    try { const r = await api.removeCandidate(partner._id, sid); setPartner(r.data.data); onChanged(); } catch { /* ignore */ }
  };
  const previewPdf = async (sid: string) => {
    try { const r = await api.candidatePdf(partner._id, sid); window.open(URL.createObjectURL(r.data as Blob), '_blank'); }
    catch { setMsg({ t: 'err', m: 'Could not load PDF' }); }
  };
  const [place, setPlace] = useState({ studentId: '', ctc: '' });
  const markPlaced = async () => {
    setBusy(true); setMsg(null);
    try {
      const cand = (partner.candidates || []).find(c => c.studentId === place.studentId);
      const r = await api.markPlaced(partner._id, { studentId: place.studentId || undefined, studentName: cand?.studentName, ctc: place.ctc ? Number(place.ctc) : undefined });
      setPartner(r.data.data); setMsg({ t: 'ok', m: 'Marked as placed 🎉' }); onChanged();
    } catch (e: any) { setMsg({ t: 'err', m: e?.response?.data?.message || 'Failed' }); }
    finally { setBusy(false); }
  };
  const [iv, setIv] = useState({ scheduledAt: '', mode: 'Online', notes: '', notify: true });
  const scheduleInterview = async () => {
    if (!iv.scheduledAt) { setMsg({ t: 'err', m: 'Pick a date & time' }); return; }
    setBusy(true); setMsg(null);
    try {
      const r = await api.scheduleInterview(partner._id, { scheduledAt: iv.scheduledAt, mode: iv.mode, notes: iv.notes, notifyCompany: iv.notify });
      setPartner(r.data.data); setIv({ scheduledAt: '', mode: 'Online', notes: '', notify: true });
      setMsg({ t: 'ok', m: 'Interview scheduled' }); onChanged();
    } catch (e: any) { setMsg({ t: 'err', m: e?.response?.data?.message || 'Failed' }); }
    finally { setBusy(false); }
  };

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
    try { const r = await fn(); setMsg({ t: 'ok', m: r?.data?.message || ok }); await loadThread(); onChanged(); }
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
            {(out === 'not_started') && (
              <button className="pp-btn pp-btn-primary pp-btn-sm" disabled={busy} onClick={() => act(() => api.startOutreach(partner._id), 'Outreach started')}>▶ Start outreach</button>
            )}
            <button className="pp-btn pp-btn-teal pp-btn-sm" disabled={busy} onClick={() => act(() => api.draftVouch(partner._id), 'Vouch drafted — see Approvals')}>✍ Draft vouch</button>
            <button className="pp-btn pp-btn-ghost pp-btn-sm" disabled={busy} onClick={() => act(() => api.markReplied(partner._id), 'Marked replied')}>✓ Mark replied</button>
            <button className="pp-btn pp-btn-ghost pp-btn-sm" disabled={busy} onClick={() => act(() => api.markBounced(partner._id), 'Marked bounced')}>⚠ Mark bounced</button>
          </div>

          <div className="pp-kv"><b>Tier:</b> {TIER_LABEL[partner.tier]} &nbsp; <b>Priority:</b> {partner.priority} &nbsp; <b>Fit:</b> {partner.fresherFit}</div>
          <div className="pp-kv"><b>Outreach:</b> {OUT_LABEL[out] || 'Not started'}{partner.outreach?.emailsSent ? ` · ${partner.outreach.emailsSent} email(s) sent` : ''}</div>
          {partner.outreachAngle && <div className="pp-kv"><b>Angle:</b> {partner.outreachAngle}</div>}
          {partner.website && <div className="pp-kv"><b>Website:</b> {partner.website}</div>}
          {partner.notes && <div className="pp-kv"><b>Notes:</b> {partner.notes}</div>}

          <div className="pp-section-title" style={{ display: 'flex', alignItems: 'center' }}>
            Candidates to put forward
            <button className="pp-btn pp-btn-teal pp-btn-sm" style={{ marginLeft: 'auto' }} disabled={matching} onClick={runMatch}>
              {matching ? 'Matching…' : '🎯 Match students'}
            </button>
          </div>
          {(partner.candidates || []).length === 0 ? (
            <div style={{ fontSize: 12, color: '#94a3b8' }}>None selected yet.</div>
          ) : (
            <>
              {(partner.candidates || []).map(c => (
                <div className="pp-stud" key={c.studentId}>
                  <span className="nm">✓ {c.studentName || 'Student'}</span>
                  <button className="pp-btn pp-btn-ghost pp-btn-sm" onClick={() => previewPdf(c.studentId)}>Preview PDF</button>
                  <button className="pp-btn pp-btn-ghost pp-btn-sm" onClick={() => removeCandidate(c.studentId)}>Remove</button>
                </div>
              ))}
              <button className="pp-btn pp-btn-primary pp-btn-sm" style={{ marginTop: 6 }} disabled={busy}
                onClick={() => act(() => api.draftCandidateProfiles(partner._id), 'Profiles drafted — approve in queue')}>
                📄 Send candidate profiles (draft for approval)
              </button>
            </>
          )}

          {matches && (
            <>
              <div className="pp-section-title">Suggested students {matches.length ? `(${matches.length})` : ''}</div>
              {matches.length === 0 ? (
                <div style={{ fontSize: 12, color: '#94a3b8' }}>No available students matched.</div>
              ) : matches.map(s => (
                <div className="pp-stud col" key={s.studentId}>
                  <div className="pp-stud row">
                    <span className="nm">{s.name || s.email}</span>
                    <span style={{ fontSize: 11, color: '#359AAD', fontWeight: 700 }}>{s.score} match{s.score === 1 ? '' : 'es'}</span>
                    <button className="pp-btn pp-btn-primary pp-btn-sm" disabled={candidateIds.has(s.studentId)} onClick={() => addCandidate(s.studentId)}>
                      {candidateIds.has(s.studentId) ? 'Added' : 'Add'}
                    </button>
                  </div>
                  <div style={{ fontSize: 11, color: '#64748b' }}>
                    {s.experienceLevel ? `${s.experienceLevel} · ` : ''}{(s.matchedSkills.length ? s.matchedSkills : s.skills).slice(0, 8).join(', ')}
                  </div>
                </div>
              ))}
            </>
          )}

          <div className="pp-section-title">Interviews</div>
          {(partner.interviews || []).map((it, i) => (
            <div className="pp-kv" key={i}>🗓 <b>{new Date(it.scheduledAt).toLocaleString()}</b> · {it.mode}{it.candidateNames?.length ? ` · ${it.candidateNames.join(', ')}` : ''}{it.notes ? ` · ${it.notes}` : ''}</div>
          ))}
          <div className="pp-edit" style={{ marginTop: 8 }}>
            <input type="datetime-local" value={iv.scheduledAt} onChange={e => setIv(s => ({ ...s, scheduledAt: e.target.value }))} />
            <div className="pp-stud row" style={{ border: 'none', padding: 0, gap: 8 }}>
              <select value={iv.mode} onChange={e => setIv(s => ({ ...s, mode: e.target.value }))} style={{ flex: 1, border: '1px solid #cbd5e1', borderRadius: 7, padding: 8, fontSize: 12.5 }}>
                <option>Online</option><option>In-person</option><option>Phone</option>
              </select>
              <label style={{ fontSize: 12, color: '#475569', display: 'flex', alignItems: 'center', gap: 4 }}>
                <input type="checkbox" checked={iv.notify} onChange={e => setIv(s => ({ ...s, notify: e.target.checked }))} /> Email company
              </label>
            </div>
            <input placeholder="Notes (optional)" value={iv.notes} onChange={e => setIv(s => ({ ...s, notes: e.target.value }))} />
            <button className="pp-btn pp-btn-teal pp-btn-sm" disabled={busy} onClick={scheduleInterview}>＋ Schedule interview</button>
          </div>

          <div className="pp-section-title">Placement</div>
          {partner.placement?.placedAt ? (
            <div className="pp-banner ok" style={{ marginBottom: 0 }}>
              🎉 Placed{partner.placement.studentName ? `: ${partner.placement.studentName}` : ''}{partner.placement.ctc ? ` · ₹${partner.placement.ctc} LPA` : ''}
              {partner.placement.guaranteeEndsAt && <><br />Guarantee ends {new Date(partner.placement.guaranteeEndsAt).toLocaleDateString()}</>}
            </div>
          ) : (
            <div className="pp-edit">
              <select value={place.studentId} onChange={e => setPlace(s => ({ ...s, studentId: e.target.value }))}
                style={{ width: '100%', border: '1px solid #cbd5e1', borderRadius: 7, padding: 8, fontSize: 12.5, marginBottom: 6 }}>
                <option value="">Select placed student…</option>
                {(partner.candidates || []).map(c => <option key={c.studentId} value={c.studentId}>{c.studentName || 'Student'}</option>)}
              </select>
              <input placeholder="CTC in LPA (optional)" value={place.ctc} onChange={e => setPlace(s => ({ ...s, ctc: e.target.value }))} />
              <button className="pp-btn pp-btn-primary pp-btn-sm" disabled={busy} onClick={markPlaced}>🎉 Mark placed</button>
            </div>
          )}

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
            <div style={{ fontSize: 12, color: '#94a3b8' }}>No messages yet. Replies appear here automatically once IMAP is enabled.</div>
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

// ── Approval queue (gated vouch / candidate-profile emails) ───────────────────
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
        <h2>Approval queue — trust-point emails</h2>
        <div className="pp-hint" style={{ marginTop: 0, marginBottom: 14 }}>
          Vouch and candidate-profile emails are drafted by the system but never auto-sent. Review, edit if needed, then approve to send.
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

// ── Add partner modal ─────────────────────────────────────────────────────────
function AddModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [f, setF] = useState<any>({ companyName: '', tier: 'tier3', priority: 'medium', fresherFit: 'medium' });
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k: string) => (e: any) => setF((p: any) => ({ ...p, [k]: e.target.value }));

  const save = async () => {
    if (!f.companyName.trim()) { setErr('Company name is required'); return; }
    setBusy(true); setErr('');
    try { await api.create(f); onSaved(); }
    catch (e: any) { setErr(e?.response?.data?.message || 'Failed to save'); }
    finally { setBusy(false); }
  };

  return (
    <div className="pp-overlay" onClick={onClose}>
      <div className="pp-modal" onClick={e => e.stopPropagation()}>
        <h2>Add placement partner</h2>
        {err && <div className="pp-banner err">{err}</div>}
        <div className="pp-field"><label>Company name *</label><input value={f.companyName} onChange={set('companyName')} /></div>
        <div className="pp-grid2">
          <div className="pp-field"><label>Tier</label><select value={f.tier} onChange={set('tier')}><option value="tier1">Tier 1</option><option value="tier2">Tier 2</option><option value="tier3">Tier 3</option></select></div>
          <div className="pp-field"><label>Priority</label><select value={f.priority} onChange={set('priority')}><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option></select></div>
          <div className="pp-field"><label>Fresher fit</label><select value={f.fresherFit} onChange={set('fresherFit')}><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option></select></div>
          <div className="pp-field"><label>Location</label><input value={f.location || ''} onChange={set('location')} /></div>
          <div className="pp-field"><label>Website</label><input value={f.website || ''} onChange={set('website')} placeholder="https://" /></div>
          <div className="pp-field"><label>Contact name</label><input value={f.contactName || ''} onChange={set('contactName')} /></div>
          <div className="pp-field"><label>Contact email</label><input value={f.contactEmail || ''} onChange={set('contactEmail')} /></div>
          <div className="pp-field"><label>Contact title</label><input value={f.contactTitle || ''} onChange={set('contactTitle')} /></div>
        </div>
        <div className="pp-field"><label>Outreach angle</label><input value={f.outreachAngle || ''} onChange={set('outreachAngle')} placeholder="Why we're a fit for them" /></div>
        <div className="pp-modal-actions">
          <button className="pp-btn pp-btn-ghost" onClick={onClose}>Cancel</button>
          <button className="pp-btn pp-btn-primary" onClick={save} disabled={busy}>{busy ? 'Saving…' : 'Add partner'}</button>
        </div>
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
        <h2>Import companies (CSV)</h2>
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
              <b>company</b> (required), website, location, tier (1/2/3), priority (high/medium/low),
              fresher_fit (high/medium/low), outreach_angle, contact_name, contact_email, contact_title, contact_phone, notes.<br />
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
