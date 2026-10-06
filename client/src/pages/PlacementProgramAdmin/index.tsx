import React, { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  placementProgramApi, placementAdminApi, PlacementCandidate, PlacementEvent, Booking, PLACEMENT_STAGES, stageLabel, istTime, recLabel, needsMarking, errMsg,
} from '../../api/placementProgramApi';
import PlacementSettings from './Settings';
import PlacementInterviewers from './Interviewers';
import PlacementInterviews from './Interviews';
import PlacementBoard from './Board';
import ScorecardModal from './ScorecardModal';
import { AddStudentsModal, StageMessageModal } from './Growth';
import ChatPanel from '../../components/WhatsAppChat/ChatPanel';
import { whatsAppChatApi, canChat } from '../../api/whatsAppChatApi';
import { useAuth } from '../../contexts/AuthContext';
import './placementProgramAdmin.css';

/**
 * Placement Program — the admin pipeline: every candidate from the ad form (and later, pushed LMS
 * students), which ad brought them, their fee and interview, stage, notes and timeline. Tabs hold the
 * interviews, the interview team and the settings. Agreement and cheque arrive in Phase 4.
 */

const EXP: Record<string, string> = { fresher: 'Fresher', '0-1': '< 1 yr', '1-3': '1–3 yrs', '3+': '3+ yrs' };
const when = (d?: string) => (d ? new Date(d).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '');
const adOf = (c: PlacementCandidate) => {
  const t = c.attribution?.last_touch || c.attribution?.first_touch;
  if (!t) return c.source === 'lms_push' ? 'LMS student' : c.source === 'website' ? 'Website form' : 'Direct';
  return [t.utm_source || (t.fbclid ? 'facebook' : t.gclid ? 'google' : ''), t.utm_campaign].filter(Boolean).join(' · ') || 'Direct';
};

const Detail: React.FC<{ id: string; onClose: () => void; onChanged: () => void; unread?: number }> = ({ id, onClose, onChanged, unread }) => {
  const { user } = useAuth();
  const chatAllowed = canChat(user as any);
  const [view, setView] = useState<'details' | 'chat'>('details');
  const [data, setData] = useState<{ candidate: PlacementCandidate & { hasPortal?: boolean }; events: PlacementEvent[]; bookings: Booking[] } | null>(null);
  const [copied, setCopied] = useState('');
  const [scoring, setScoring] = useState<Booking | null>(null);
  const [stage, setStage] = useState('');
  const [stageNote, setStageNote] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const load = useCallback(() => placementProgramApi.get(id).then(r => { setData(r); setStage(r.candidate.stage); }).catch(e => setErr(errMsg(e))), [id]);
  useEffect(() => { load(); }, [load]);

  const saveStage = async () => {
    if (!data || stage === data.candidate.stage) return;
    setBusy(true); setErr('');
    try { await placementProgramApi.setStage(id, stage, stageNote || undefined); setStageNote(''); await load(); onChanged(); }
    catch (e) { setErr(errMsg(e)); }
    setBusy(false);
  };
  const saveNote = async () => {
    if (!note.trim()) return;
    setBusy(true); setErr('');
    try { await placementProgramApi.addNote(id, note); setNote(''); await load(); }
    catch (e) { setErr(errMsg(e)); }
    setBusy(false);
  };

  const act = async (fn: () => Promise<any>, after?: string) => {
    setBusy(true); setErr('');
    try { await fn(); await load(); onChanged(); if (after) { setCopied(after); setTimeout(() => setCopied(''), 2500); } }
    catch (e) { setErr(errMsg(e)); }
    setBusy(false);
  };
  const copyPortal = () => act(async () => {
    const { url } = await placementAdminApi.portalLink(id);
    try { await navigator.clipboard.writeText(url); } catch { window.prompt('Copy the candidate page link:', url); }
  }, 'Link copied');
  const refundPct = data?.candidate.fee?.refundablePct ?? 50;
  const refundAmt = Math.floor(((data?.candidate.fee?.amountInr || 0) * refundPct) / 100);
  const feeText = (c?: PlacementCandidate) => {
    if (!c) return '';
    if (c.fee?.waived) return 'Waived';
    if (c.fee?.status === 'paid') return `Paid ₹${(c.fee.amountInr || 0).toLocaleString('en-IN')}`;
    if (c.fee?.status === 'refunded') return `Refunded ₹${(c.fee.refund?.amountInr || 0).toLocaleString('en-IN')}`;
    if (c.fee?.status === 'created') return 'Payment started, not completed';
    return 'Not paid';
  };

  const c = data?.candidate;
  const touch = c?.attribution?.first_touch;
  const last = c?.attribution?.last_touch;
  return (
    <div className="ppa-drawer-wrap" onClick={onClose}>
      <aside className="ppa-drawer" onClick={e => e.stopPropagation()} aria-label="Candidate">
        <button className="ppa-x" onClick={onClose} aria-label="Close"><i className="bi bi-x-lg" /></button>
        {!c ? <div className="ppa-muted">{err || 'Loading…'}</div> : (
          <>
            <h2>{c.name}</h2>
            <div className="ppa-sub">
              <a href={`https://wa.me/91${c.mobile}`} target="_blank" rel="noreferrer"><i className="bi bi-whatsapp" /> +91 {c.mobile}</a>
              {c.email && <a href={`mailto:${c.email}`}><i className="bi bi-envelope" /> {c.email}</a>}
            </div>
            {err && <div className="ppa-err">{err}</div>}

            {chatAllowed && (
              <div className="ppa-tabs ppa-drawer-tabs" role="tablist">
                <button role="tab" aria-selected={view === 'details'} className={view === 'details' ? 'on' : ''} onClick={() => setView('details')}>Details</button>
                <button role="tab" aria-selected={view === 'chat'} className={view === 'chat' ? 'on' : ''} onClick={() => { setView('chat'); onChanged(); }}>
                  <i className="bi bi-whatsapp" /> WhatsApp{!!unread && view !== 'chat' && <span className="wac-badge">{unread}</span>}
                </button>
              </div>
            )}

            {view === 'chat' && chatAllowed ? <ChatPanel phone={c.mobile} name={c.name} /> : <>
            <div className="ppa-box">
              <div className="ppa-kv"><span>College</span><b>{c.college || '—'}</b></div>
              <div className="ppa-kv"><span>Degree / branch</span><b>{[c.degree, c.branch].filter(Boolean).join(' · ') || '—'}</b></div>
              <div className="ppa-kv"><span>Graduation</span><b>{c.graduationYear || '—'}</b></div>
              <div className="ppa-kv"><span>Experience</span><b>{c.experience ? EXP[c.experience] || c.experience : '—'}</b></div>
              <div className="ppa-kv"><span>Role wanted</span><b>{c.targetRole || '—'}</b></div>
              <div className="ppa-kv"><span>City</span><b>{c.city || '—'}</b></div>
              {c.skills && <div className="ppa-kv full"><span>Skills</span><b>{c.skills}</b></div>}
            </div>

            <h3>Fee &amp; interview</h3>
            <div className="ppa-box">
              <div className="ppa-kv"><span>Interview fee</span><b>{feeText(c)}</b></div>
              <div className="ppa-kv"><span>Interview</span><b>{c.interview?.startsAt ? istTime(c.interview.startsAt) : 'Not booked'}</b></div>
            </div>
            <div className="ppa-acts wrap">
              <button className="ppa-btn ghost" disabled={busy} onClick={copyPortal}><i className="bi bi-link-45deg" /> Copy candidate page link</button>
              {c.fee?.status !== 'paid' && c.fee?.status !== 'refunded' && (
                <button className="ppa-btn ghost" disabled={busy} onClick={() => act(() => placementAdminApi.waive(id, !c.fee?.waived))}>
                  {c.fee?.waived ? 'Charge the fee' : 'Waive the fee'}
                </button>
              )}
              {c.fee?.status === 'paid' && (
                <button className="ppa-btn ghost danger" disabled={busy} onClick={() => {
                  const reason = window.prompt(`Refund ₹${refundAmt.toLocaleString('en-IN')} (${refundPct}% of the fee) to this candidate? Reason:`, 'Not selected');
                  if (reason !== null) act(() => placementAdminApi.refund(id, reason), 'Refund issued');
                }}>Refund {refundPct}%</button>
              )}
              {copied && <span className="ppa-ok">{copied}</span>}
            </div>
            {data!.bookings.length > 0 && (
              <ul className="ppa-bookings">
                {data!.bookings.map(b => (
                  <li key={b._id}>
                    <span><b>{istTime(b.startsAt)}</b> · {b.interviewerId?.name || '—'} · {b.status === 'booked' ? (needsMarking(b) ? 'Needs marking' : 'Booked') : b.status === 'attended' ? 'Attended' : b.status === 'no_show' ? 'No-show' : 'Cancelled'}</span>
                    {b.status === 'booked' && (
                      <span className="ppa-acts">
                        {new Date(b.startsAt).getTime() <= Date.now() ? <>
                          <button className="ppa-btn ghost" disabled={busy} onClick={() => setScoring(b)}>Attended</button>
                          <button className="ppa-btn ghost" disabled={busy} onClick={() => { if (window.confirm('Mark as a no-show?')) act(() => placementAdminApi.outcome(b._id, 'no_show')); }}>No-show</button>
                        </> : <button className="ppa-btn ghost" disabled={busy} onClick={() => { const r = window.prompt('Reason for cancelling:', 'Interviewer unavailable'); if (r !== null) act(() => placementAdminApi.cancelBooking(b._id, r)); }}>Cancel</button>}
                      </span>
                    )}
                    {b.scorecard && (
                      <div className="ppa-scorecard">
                        <div className="head"><b>{b.scorecard.average}/5</b> · {recLabel(b.scorecard.recommendation)}</div>
                        <div className="rows">{b.scorecard.ratings.map(r => <span key={r.criterion}>{r.criterion}: <b>{r.score}</b></span>)}</div>
                        {b.scorecard.notes && <p>{b.scorecard.notes}</p>}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
            <h3>Agreement</h3>
            <div className="ppa-box">
              <div className="ppa-kv"><span>Status</span><b>{
                c.agreement?.signedAt ? `Signed by ${c.agreement.signedName}` : c.agreement?.sentAt ? 'Sent — waiting for signature' : 'Not sent'
              }</b></div>
              <div className="ppa-kv"><span>{c.agreement?.signedAt ? 'Signed' : 'Sent'}</span><b>{
                c.agreement?.signedAt ? istTime(c.agreement.signedAt) : c.agreement?.sentAt ? `${istTime(c.agreement.sentAt)} · v${c.agreement.version}` : '—'
              }</b></div>
              {c.agreement?.signedAt && <div className="ppa-kv full"><span>Evidence</span><b className="ppa-mono">WhatsApp code verified · IP {c.agreement.signedIp || '—'} · SHA-256 {String(c.agreement.textHash || '').slice(0, 16)}…</b></div>}
            </div>
            <div className="ppa-acts wrap">
              {!c.agreement?.signedAt && ['selected', 'agreement_sent', 'agreement_signed', 'cheque_verified', 'active', 'placed'].includes(c.stage) && (
                <button className="ppa-btn" disabled={busy} onClick={() => act(() => placementAdminApi.sendAgreement(id), c.agreement?.sentAt ? 'Agreement re-sent' : 'Agreement sent')}>
                  {c.agreement?.sentAt ? 'Resend agreement' : 'Send agreement'}
                </button>
              )}
              {!c.agreement?.sentAt && !['selected', 'agreement_sent', 'agreement_signed', 'cheque_verified', 'active', 'placed'].includes(c.stage) && (
                <span className="ppa-note" style={{ margin: 0 }}>The agreement can be sent once the candidate is selected.</span>
              )}
              {c.agreement?.sentAt && <button className="ppa-btn ghost" disabled={busy} onClick={() => placementAdminApi.openPrivate('agreement.pdf', id).catch(e => setErr(errMsg(e)))}><i className="bi bi-file-earmark-pdf" /> PDF</button>}
            </div>

            <h3>Security cheque</h3>
            {!c.cheque?.status ? (
              <p className="ppa-note" style={{ marginTop: 0 }}>{c.agreement?.signedAt ? 'Waiting for the candidate to upload it on their page.' : 'The candidate uploads it after signing the agreement.'}</p>
            ) : (
              <>
                <div className="ppa-box">
                  <div className="ppa-kv"><span>Status</span><b>{({ received: 'Received — to verify', verified: 'Verified', held: 'Held as security', returned: 'Returned', deposited: 'Deposited' } as Record<string, string>)[c.cheque.status]}</b></div>
                  <div className="ppa-kv"><span>Cheque</span><b>No. {c.cheque.number} · {c.cheque.bank}</b></div>
                  <div className="ppa-kv"><span>Amount</span><b>₹{(c.cheque.amountInr || 0).toLocaleString('en-IN')}</b></div>
                  <div className="ppa-kv"><span>Date on cheque</span><b>{c.cheque.date ? new Date(c.cheque.date).toLocaleDateString('en-IN') : '—'}</b></div>
                  {c.cheque.depositReason && <div className="ppa-kv full"><span>Deposit reason</span><b>{c.cheque.depositReason}</b></div>}
                </div>
                <div className="ppa-acts wrap">
                  <button className="ppa-btn ghost" disabled={busy} onClick={() => placementAdminApi.openPrivate('cheque/file', id).catch(e => setErr(errMsg(e)))}><i className="bi bi-image" /> View photo</button>
                  {c.cheque.status === 'received' && <button className="ppa-btn" disabled={busy} onClick={() => act(() => placementAdminApi.chequeStatus(id, 'verified'))}>Mark verified</button>}
                  {c.cheque.status === 'verified' && <button className="ppa-btn ghost" disabled={busy} onClick={() => act(() => placementAdminApi.chequeStatus(id, 'held'))}>Hold as security</button>}
                  {['verified', 'held'].includes(c.cheque.status) && <button className="ppa-btn ghost" disabled={busy} onClick={() => { if (window.confirm('Mark the cheque as returned to the candidate?')) act(() => placementAdminApi.chequeStatus(id, 'returned')); }}>Returned</button>}
                  {['verified', 'held'].includes(c.cheque.status) && <button className="ppa-btn ghost danger" disabled={busy} onClick={() => {
                    const r = window.prompt('Depositing a security cheque needs a written reason — which part of the agreement was breached?');
                    if (r !== null) act(() => placementAdminApi.chequeStatus(id, 'deposited', r));
                  }}>Deposit</button>}
                </div>
              </>
            )}

            {c.stage === 'interview_attended' && (
              <div className="ppa-decide">
                <span>Decision after the interview:</span>
                <button className="ppa-btn" disabled={busy} onClick={() => act(() => placementProgramApi.setStage(id, 'selected', 'Selected after interview'))}>Selected</button>
                <button className="ppa-btn ghost danger" disabled={busy} onClick={() => act(() => placementProgramApi.setStage(id, 'rejected', 'Not selected after interview'))}>Not selected</button>
              </div>
            )}
            {scoring && <ScorecardModal bookingId={scoring._id} candidateName={c.name} onClose={() => setScoring(null)} onSaved={() => { setScoring(null); load(); onChanged(); }} />}

            <h3>Where they came from</h3>
            <div className="ppa-box">
              <div className="ppa-kv"><span>First ad</span><b>{touch ? [touch.utm_source, touch.utm_medium, touch.utm_campaign, touch.utm_content].filter(Boolean).join(' · ') || 'Direct' : (c.source === 'lms_push' ? 'LMS student' : c.source === 'website' ? 'Website form' : 'Direct')}</b></div>
              {last && last !== touch && <div className="ppa-kv"><span>Latest ad</span><b>{[last.utm_source, last.utm_campaign, last.utm_content].filter(Boolean).join(' · ') || 'Direct'}</b></div>}
              <div className="ppa-kv"><span>Submissions</span><b>{c.submissions}</b></div>
              <div className="ppa-kv"><span>Registered</span><b>{when(c.createdAt)}</b></div>
            </div>

            <h3>Stage</h3>
            <div className="ppa-row">
              <select value={stage} onChange={e => setStage(e.target.value)}>
                {PLACEMENT_STAGES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
              </select>
              <input placeholder="Reason (optional)" value={stageNote} onChange={e => setStageNote(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') saveStage(); }} />
              <button className="ppa-btn" disabled={busy || stage === c.stage} onClick={saveStage}>Update</button>
            </div>

            <h3>Add a note</h3>
            <div className="ppa-row">
              <input placeholder="e.g. Called — will pay tomorrow" value={note} onChange={e => setNote(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') saveNote(); }} />
              <button className="ppa-btn" disabled={busy || !note.trim()} onClick={saveNote}>Add</button>
            </div>

            <h3>Timeline</h3>
            <ul className="ppa-timeline">
              {data!.events.map(ev => (
                <li key={ev._id} className={`k-${ev.kind}`}>
                  <span className="dot" />
                  <div>
                    <div className="msg">{ev.message}</div>
                    <div className="meta">{when(ev.createdAt)}{ev.actorId ? ` · ${[ev.actorId.firstName, ev.actorId.lastName].filter(Boolean).join(' ')}` : ''}</div>
                  </div>
                </li>
              ))}
            </ul>
            </>}
          </>
        )}
      </aside>
    </div>
  );
};

type Tab = 'candidates' | 'board' | 'interviews' | 'interviewers' | 'settings';

const PlacementProgramAdmin: React.FC = () => {
  const [tab, setTab] = useState<Tab>('candidates');
  const [stage, setStage] = useState('');
  const [source, setSource] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState<{ rows: PlacementCandidate[]; total: number; limit: number; byStage: Record<string, number> } | null>(null);
  const [err, setErr] = useState('');
  const [params] = useSearchParams();
  // ?open=<id> opens a candidate directly — the WhatsApp Inbox links here.
  const [open, setOpen] = useState<string | null>(() => params.get('open'));
  const [copied, setCopied] = useState(false);
  const [adding, setAdding] = useState(false);
  const [messaging, setMessaging] = useState(false);
  const { user } = useAuth();
  const chatAllowed = canChat(user as any);
  const [unread, setUnread] = useState<Record<string, number>>({});

  const load = useCallback(() => {
    placementProgramApi.list({ stage: stage || undefined, source: source || undefined, search: search.trim() || undefined, page, limit: 25 })
      .then(r => { setData(r); setErr(''); }).catch(e => setErr(errMsg(e)));
  }, [stage, source, search, page]);
  useEffect(() => { const t = setTimeout(load, search ? 300 : 0); return () => clearTimeout(t); }, [load, search]);
  // Unread WhatsApp replies for the rows on screen.
  useEffect(() => {
    if (!chatAllowed || !data?.rows.length) { setUnread({}); return; }
    whatsAppChatApi.unread(data.rows.map(r => r.mobile)).then(setUnread).catch(() => {});
  }, [chatAllowed, data]);

  const all = data ? Object.values(data.byStage).reduce((a, b) => a + b, 0) : 0;
  const pages = data ? Math.max(1, Math.ceil(data.total / data.limit)) : 1;

  const copyLink = async () => {
    const tenant = localStorage.getItem('tenantId') || '';
    const url = `${window.location.origin}/placement-program?tenant=${tenant}&utm_source=instagram&utm_medium=paid&utm_campaign=placement`;
    try { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 2500); } catch { window.prompt('Copy this link:', url); }
  };

  return (
    <div className="ppa">
      <div className="ppa-head">
        <div>
          <h1><i className="bi bi-briefcase-fill" /> Placement Program</h1>
          <p>Everyone who registered from your ads, which ad brought them, and where they are now.</p>
        </div>
        <div className="ppa-head-actions">
          <button className="ppa-btn ghost" onClick={() => setAdding(true)}><i className="bi bi-person-plus" /> Add LMS students</button>
          <button className="ppa-btn ghost" onClick={() => setMessaging(true)}><i className="bi bi-whatsapp" /> Message a stage</button>
          <a className="ppa-btn ghost" href="/placement-program" target="_blank" rel="noreferrer"><i className="bi bi-box-arrow-up-right" /> View form</a>
          <button className="ppa-btn" onClick={copyLink}><i className="bi bi-link-45deg" /> {copied ? 'Copied' : 'Copy form link'}</button>
        </div>
      </div>
      <div className="ppa-tabs" role="tablist">
        {([['candidates', 'Candidates'], ['board', 'Board'], ['interviews', 'Interviews'], ['interviewers', 'Interviewers'], ['settings', 'Settings']] as [Tab, string][]).map(([k, l]) => (
          <button key={k} role="tab" aria-selected={tab === k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>{l}</button>
        ))}
      </div>

      {tab === 'board' && <PlacementBoard onOpenCandidate={setOpen} />}
      {tab === 'interviews' && <PlacementInterviews onOpenCandidate={setOpen} />}
      {tab === 'interviewers' && <PlacementInterviewers />}
      {tab === 'settings' && <PlacementSettings />}

      {tab === 'candidates' && <>
      <p className="ppa-hint">
        The copied link is an example for Instagram — change <code>utm_source</code> (instagram / youtube / google) and <code>utm_campaign</code> for each ad so you can see which one works.
      </p>

      <div className="ppa-stages" role="tablist">
        <button className={!stage ? 'on' : ''} onClick={() => { setStage(''); setPage(1); }}>All <span>{all}</span></button>
        {PLACEMENT_STAGES.filter(([k]) => data?.byStage?.[k]).map(([k, l]) => (
          <button key={k} className={stage === k ? 'on' : ''} onClick={() => { setStage(k); setPage(1); }}>{l} <span>{data!.byStage[k]}</span></button>
        ))}
      </div>

      <div className="ppa-filters">
        <input placeholder="Search name, mobile, email, college, campaign" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
        <select value={source} onChange={e => { setSource(e.target.value); setPage(1); }}>
          <option value="">All sources</option><option value="ad">From ads</option><option value="website">Website form</option><option value="lms_push">LMS students</option><option value="manual">Added manually</option>
        </select>
      </div>

      {err && <div className="ppa-err">{err}</div>}
      <div className="ppa-table-wrap">
        <table className="ppa-table">
          <thead><tr><th>Name</th><th>Mobile</th><th>College / year</th><th>Role wanted</th><th>Came from</th><th>Stage</th><th>Registered</th></tr></thead>
          <tbody>
            {!data ? <tr><td colSpan={7} className="ppa-muted">Loading…</td></tr> : !data.rows.length ? (
              <tr><td colSpan={7} className="ppa-muted">No candidates yet. Share the form link in your ads.</td></tr>
            ) : data.rows.map(c => (
              <tr key={c._id} onClick={() => setOpen(c._id)}>
                <td><b>{c.name}</b>{c.submissions > 1 && <span className="ppa-tag">×{c.submissions}</span>}{!!unread[c.mobile] && <span className="wac-badge" title="Unread WhatsApp messages"><i className="bi bi-whatsapp" /> {unread[c.mobile]}</span>}</td>
                <td>+91 {c.mobile}</td>
                <td>{c.college || '—'}{c.graduationYear ? ` · ${c.graduationYear}` : ''}</td>
                <td>{c.targetRole || '—'}</td>
                <td>{adOf(c)}</td>
                <td><span className={`ppa-stage s-${c.stage}`}>{stageLabel(c.stage)}</span></td>
                <td>{when(c.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {data && data.total > data.limit && (
        <div className="ppa-pager">
          <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}>‹ Prev</button>
          <span>Page {page} of {pages} · {data.total} candidates</span>
          <button disabled={page >= pages} onClick={() => setPage(p => p + 1)}>Next ›</button>
        </div>
      )}

      </>}

      {open && <Detail id={open} onClose={() => setOpen(null)} onChanged={load} unread={unread[data?.rows.find(r => r._id === open)?.mobile || ''] || 0} />}
      {adding && <AddStudentsModal onClose={() => setAdding(false)} onDone={load} />}
      {messaging && <StageMessageModal initialStage={stage || undefined} counts={data?.byStage || {}} onClose={() => setMessaging(false)} />}
    </div>
  );
};

export default PlacementProgramAdmin;
