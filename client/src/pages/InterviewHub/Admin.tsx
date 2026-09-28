import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { interviewHubApi, ExpFull, HubRound, InvitePreview, InviteRow } from '../../api/interviewHubApi';
import { problemSetAdminApi } from '../../api/problemSetApi';
import { Modal, useToast, relTime } from '../ProblemBank/shared';
import { CompanyLogo, OutcomePill, RoundsEditor, RecordingPlayer, StatusPillHub, fmtDate, ModeIcon } from './parts';
import { AutomationPanel, InsightsPanel } from './Automation';
import '../ProblemBank/ProblemBank.css';
import './hub.css';

/**
 * Interview Experiences — admin. Review what candidates post (fix, publish, or send back),
 * copy the questions into the company question bank, and invite people to share after an
 * interview — one student, a batch, or everyone who applied to a placement drive.
 */
type Tab = 'pending' | 'published' | 'rejected' | 'draft' | 'invites' | 'automation' | 'insights';
const inr = (n: number) => `₹${(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

/* ── Review one report ─────────────────────────────────────────────────────────────────── */
const ReviewModal: React.FC<{ id: string; onClose: () => void; onChanged: (msg: string) => void }> = ({ id, onClose, onChanged }) => {
  const [e, setE] = useState<ExpFull | null>(null);
  const [rounds, setRounds] = useState<HubRound[]>([]);
  const [tips, setTips] = useState('');
  const [elim, setElim] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [role, setRole] = useState('');
  const [anonymous, setAnonymous] = useState(false);
  const [shareGlobal, setShareGlobal] = useState(true);
  const [shareRecording, setShareRecording] = useState(false);
  const [note, setNote] = useState('');
  const [picks, setPicks] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [editing, setEditing] = useState(false);

  const load = useCallback(() => interviewHubApi.experience(id).then((x) => {
    setE(x); setRounds(x.rounds); setTips(x.tips); setElim(x.eliminationSummary); setCompanyName(x.companyName); setRole(x.role);
    setAnonymous(!!x.anonymous); setShareGlobal(x.shareGlobal !== false); setShareRecording(!!x.shareRecording); setNote(x.reviewNote || '');
    const done = new Set(x.promotedQuestionIds || []);
    const p: Record<string, boolean> = {};
    x.rounds.forEach((r, i) => r.questions.forEach((_, j) => { if (!done.has(`${i}:${j}`)) p[`${i}:${j}`] = true; }));
    setPicks(p);
  }).catch((x) => setErr(x?.response?.data?.message || 'Could not load.')), [id]);
  useEffect(() => { load(); }, [load]);

  const act = async (status?: string) => {
    if (status === 'rejected' && !note.trim()) { setErr('Say what needs changing — the candidate sees this note.'); return; }
    setBusy(true); setErr('');
    try {
      await interviewHubApi.admin.moderate(id, { companyName, role, rounds, tips, eliminationSummary: elim, anonymous, shareGlobal, shareRecording, ...(status ? { status, reviewNote: note } : {}) });
      onChanged(status === 'published' ? 'Published — every student can read it now.' : status === 'rejected' ? 'Sent back to the candidate with your note.' : 'Saved.');
    } catch (x: any) { setErr(x?.response?.data?.message || 'Could not save.'); }
    setBusy(false);
  };

  const promote = async () => {
    const list = Object.entries(picks).filter(([, v]) => v).map(([k]) => { const [round, question] = k.split(':').map(Number); return { round, question }; });
    if (!list.length) return;
    setBusy(true); setErr('');
    try {
      await interviewHubApi.admin.moderate(id, { rounds });
      const r = await interviewHubApi.admin.promote(id, list);
      onChanged(`${r.added} question(s) added to the ${companyName} question bank.`);
    } catch (x: any) { setErr(x?.response?.data?.message || 'Could not add them.'); }
    setBusy(false);
  };

  if (!e) return <Modal title="Loading…" onClose={onClose}>{err ? <div className="pb-alert pb-alert-bad">{err}</div> : <span className="pb-spinner" />}</Modal>;
  const done = new Set(e.promotedQuestionIds || []);
  const pickCount = Object.values(picks).filter(Boolean).length;

  return (
    <Modal wide title={<span className="pb-row"><CompanyLogo name={e.companyName} /> {e.companyName} <StatusPillHub s={e.status || 'pending'} /></span>} onClose={onClose} footer={<>
      {err && <span className="pb-grow" style={{ color: 'var(--pb-bad)', fontSize: 13 }}>{err}</span>}
      {!err && <span className="pb-grow" />}
      <button className="pb-btn pb-btn-ghost" disabled={busy} onClick={async () => { if (!window.confirm('Delete this report for good?')) return; await interviewHubApi.admin.remove(id); onChanged('Deleted.'); }}><i className="fa-regular fa-trash-can" /></button>
      <button className="pb-btn" disabled={busy} onClick={() => act()}>Save edits</button>
      {e.status !== 'rejected' && <button className="pb-btn pb-btn-danger" disabled={busy} onClick={() => act('rejected')}>Send back</button>}
      {e.status !== 'published'
        ? <button className="pb-btn pb-btn-success" disabled={busy} onClick={() => act('published')}>{busy ? <span className="pb-spinner" /> : <i className="fa-solid fa-check" />} Approve & publish</button>
        : <button className="pb-btn" disabled={busy} onClick={() => act('pending')}>Unpublish</button>}
    </>}>
      <div className="pb-muted" style={{ marginBottom: 10, fontSize: 13 }}>
        {e.student ? <><b>{e.student.name}</b> ({e.student.email}) · </> : null}{e.role || 'Role not given'} · interviewed {fmtDate(e.interviewedOn)} · <OutcomePill o={e.outcome} /> · <ModeIcon mode={e.captureMode} /> {e.aiStructured ? 'organised by AI from their account' : 'typed by them'}
      </div>
      {e.recording && <div style={{ marginBottom: 12 }}><RecordingPlayer id={e.id} contentType={e.recording.contentType} durationSec={e.recording.durationSec} /></div>}
      {e.transcript && <details style={{ marginBottom: 12 }}><summary className="pb-muted" style={{ cursor: 'pointer' }}>Transcript</summary><p style={{ whiteSpace: 'pre-wrap', fontSize: 13 }}>{e.transcript}</p></details>}
      {!!e.review && !e.rounds.length && <div className="pb-alert pb-alert-info" style={{ whiteSpace: 'pre-wrap' }}>{e.review}</div>}

      <div className="pb-field-row">
        <div><label className="pb-label">Company</label><input className="pb-input" value={companyName} onChange={(x) => setCompanyName(x.target.value)} /></div>
        <div><label className="pb-label">Role</label><input className="pb-input" value={role} onChange={(x) => setRole(x.target.value)} /></div>
      </div>

      <div className="pb-row" style={{ margin: '14px 0 6px' }}>
        <h3 className="pb-grow" style={{ margin: 0 }}>Rounds & questions</h3>
        <button className="pb-btn pb-btn-sm" onClick={() => setEditing(!editing)}>{editing ? 'Done editing' : <><i className="fa-solid fa-pen" /> Edit</>}</button>
      </div>
      {editing ? <RoundsEditor rounds={rounds} onChange={setRounds} /> : (
        rounds.map((r, i) => (
          <div key={i} className="pb-card" style={{ padding: 12, marginBottom: 8 }}>
            <b>{i + 1}. {r.name}</b> {r.cleared === false && <span className="pb-pill pb-badge-bad">Eliminated here</span>}
            {r.questions.map((q, j) => {
              const k = `${i}:${j}`;
              return (
                <label key={j} className="pb-row" style={{ alignItems: 'flex-start', padding: '6px 0', borderTop: '1px dashed var(--pb-line)', marginTop: 6, cursor: done.has(k) ? 'default' : 'pointer' }}>
                  <input type="checkbox" disabled={done.has(k)} checked={done.has(k) || !!picks[k]} onChange={(x) => setPicks({ ...picks, [k]: x.target.checked })} style={{ marginTop: 3 }} />
                  <span className="pb-grow" style={{ whiteSpace: 'pre-wrap' }}>{q.text}{q.answerHint ? <div className="pb-faint" style={{ fontSize: 12 }}>Answer: {q.answerHint}</div> : null}</span>
                  {done.has(k) && <span className="pb-pill pb-badge-ok">In bank</span>}
                </label>
              );
            })}
          </div>
        ))
      )}
      {!editing && (
        <div className="pb-row" style={{ margin: '6px 0 12px' }}>
          <span className="pb-muted pb-grow" style={{ fontSize: 13 }}>Ticked questions go into the {companyName} question bank (mock tests and CareerPilot company pages draw from it).</span>
          <button className="pb-btn pb-btn-sm" disabled={busy || !pickCount} onClick={promote}><i className="fa-solid fa-database" /> Add {pickCount} to question bank</button>
        </div>
      )}

      <label className="pb-label">Where people were eliminated</label>
      <textarea className="pb-textarea" rows={2} value={elim} onChange={(x) => setElim(x.target.value)} />
      <label className="pb-label">Advice for the next candidate</label>
      <textarea className="pb-textarea" rows={2} value={tips} onChange={(x) => setTips(x.target.value)} />

      <div className="pb-row" style={{ gap: 18, flexWrap: 'wrap', marginTop: 12 }}>
        <label className="pb-switch"><input type="checkbox" checked={anonymous} onChange={(x) => setAnonymous(x.target.checked)} /> Hide the candidate's name</label>
        <label className="pb-switch"><input type="checkbox" checked={shareGlobal} onChange={(x) => setShareGlobal(x.target.checked)} /> Share with other institutes (anonymised)</label>
        {e.recording && <label className="pb-switch"><input type="checkbox" checked={shareRecording} onChange={(x) => setShareRecording(x.target.checked)} /> Students can play the recording</label>}
      </div>
      <label className="pb-label">Note to the candidate <small>required when sending back</small></label>
      <input className="pb-input" value={note} onChange={(x) => setNote(x.target.value)} placeholder="e.g. Please add the coding questions from round 1 exactly." />
    </Modal>
  );
};

/* ── Invite people to share ─────────────────────────────────────────────────────────────── */
const InviteModal: React.FC<{ onClose: () => void; onSent: (msg: string) => void }> = ({ onClose, onSent }) => {
  const [src, setSrc] = useState<'drive' | 'batch' | 'students'>('drive');
  const [sources, setSources] = useState<Awaited<ReturnType<typeof interviewHubApi.admin.sources>> | null>(null);
  const [driveId, setDriveId] = useState('');
  const [batchId, setBatchId] = useState('');
  const [picked, setPicked] = useState<{ _id: string; name: string }[]>([]);
  const [q, setQ] = useState('');
  const [hits, setHits] = useState<{ _id: string; name: string; email: string; role: string }[]>([]);
  const [companyName, setCompanyName] = useState('');
  const [role, setRole] = useState('');
  const [interviewedOn, setInterviewedOn] = useState('');
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState(true);
  const [wa, setWa] = useState(false);
  const [pv, setPv] = useState<InvitePreview | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => { interviewHubApi.admin.sources().then(setSources).catch(() => undefined); }, []);
  useEffect(() => {
    if (q.trim().length < 2) { setHits([]); return; }
    const t = setTimeout(() => problemSetAdminApi.users(q).then((r) => setHits(r.filter((x) => x.role === 'STUDENT'))).catch(() => undefined), 300);
    return () => clearTimeout(t);
  }, [q]);

  const body = () => ({
    ...(src === 'drive' ? { driveId } : src === 'batch' ? { batchId } : { userIds: picked.map((p) => p._id) }),
    companyName, role, interviewedOn: interviewedOn || undefined, message,
    channels: [...(email ? ['email'] : []), ...(wa ? ['whatsapp'] : [])],
  });
  const targetChosen = src === 'drive' ? !!driveId : src === 'batch' ? !!batchId : picked.length > 0;
  const ready = targetChosen && (companyName.trim().length >= 2 || src === 'drive') && (email || wa);

  useEffect(() => {
    setPv(null); setErr('');
    if (!ready) return;
    const t = setTimeout(() => interviewHubApi.admin.invite({ ...body(), dryRun: true }).then(setPv).catch((x) => setErr(x?.response?.data?.message || 'Could not count.')), 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src, driveId, batchId, picked, companyName, email, wa]);

  const send = async () => {
    if (!pv) return;
    const lines = [`Invite ${pv.recipients} student(s) to share their ${pv.companyName} interview?`, ''];
    if (email) lines.push(`• Email: ${pv.withEmail} — free`);
    if (wa) lines.push(`• WhatsApp: ${pv.withPhone} — about ${inr(pv.estimatedCostInr)}`);
    if (!window.confirm(lines.join('\n'))) return;
    setBusy(true); setErr('');
    try { const r = await interviewHubApi.admin.invite(body()); onSent(`${r.created} invite(s) sent. A free email reminder goes out automatically after 2 days.`); } catch (x: any) { setErr(x?.response?.data?.message || 'Could not send.'); }
    setBusy(false);
  };

  return (
    <Modal title="Invite students to share their interview" onClose={onClose} footer={<>
      <span className="pb-grow pb-muted" style={{ fontSize: 13 }}>{pv ? <><b>{pv.recipients}</b> to invite{pv.alreadyInvited ? ` · ${pv.alreadyInvited} already invited` : ''}{pv.alreadyPosted ? ` · ${pv.alreadyPosted} already posted` : ''}{wa && pv.whatsappTemplateReady ? <> · WhatsApp ≈ <b>{inr(pv.estimatedCostInr)}</b></> : null}</> : null}</span>
      <button className="pb-btn" onClick={onClose}>Cancel</button>
      <button className="pb-btn pb-btn-primary" disabled={busy || !pv || !pv.recipients} onClick={send}>{busy ? <span className="pb-spinner" /> : <i className="fa-solid fa-paper-plane" />} Send invites</button>
    </>}>
      <label className="pb-label" style={{ marginTop: 0 }}>Who faced the interview?</label>
      <div className="pb-seg">
        <button className={src === 'drive' ? 'on' : ''} onClick={() => setSrc('drive')}>Placement drive</button>
        <button className={src === 'batch' ? 'on' : ''} onClick={() => setSrc('batch')}>A batch</button>
        <button className={src === 'students' ? 'on' : ''} onClick={() => setSrc('students')}>Pick students</button>
      </div>
      {src === 'drive' && (
        <select className="pb-select" style={{ marginTop: 10 }} value={driveId} onChange={(x) => {
          setDriveId(x.target.value);
          const d = sources?.drives.find((y) => y.id === x.target.value);
          if (d) { setCompanyName(d.companyName); setRole(d.role); if (d.driveDate) setInterviewedOn(d.driveDate.slice(0, 10)); }
        }}>
          <option value="">Choose a drive…</option>
          {sources?.drives.map((d) => <option key={d.id} value={d.id}>{d.companyName}{d.role ? ` — ${d.role}` : ''}{d.driveDate ? ` · ${fmtDate(d.driveDate)}` : ''} · {d.applicants} applied</option>)}
        </select>
      )}
      {src === 'batch' && (
        <select className="pb-select" style={{ marginTop: 10 }} value={batchId} onChange={(x) => setBatchId(x.target.value)}>
          <option value="">Choose a batch…</option>{sources?.batches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
      )}
      {src === 'students' && (
        <div style={{ marginTop: 10 }}>
          <input className="pb-input" placeholder="Search a student by name or email" value={q} onChange={(x) => setQ(x.target.value)} />
          {!!hits.length && (
            <div className="pb-card" style={{ marginTop: 6, maxHeight: 180, overflow: 'auto' }}>
              {hits.map((h) => (
                <div key={h._id} className="pb-row" style={{ padding: '6px 10px', borderBottom: '1px solid var(--pb-line)' }}>
                  <span className="pb-grow"><b>{h.name}</b> <span className="pb-muted">{h.email}</span></span>
                  <button className="pb-btn pb-btn-sm" disabled={picked.some((p) => p._id === h._id)} onClick={() => { setPicked([...picked, { _id: h._id, name: h.name }]); setQ(''); }}>Add</button>
                </div>
              ))}
            </div>
          )}
          {!!picked.length && <div className="pb-chips" style={{ marginTop: 8 }}>{picked.map((p) => <span key={p._id} className="pb-chip on" onClick={() => setPicked(picked.filter((x) => x._id !== p._id))}>{p.name} ✕</span>)}</div>}
        </div>
      )}

      <div className="pb-field-row">
        <div><label className="pb-label">Company</label><input className="pb-input" value={companyName} onChange={(x) => setCompanyName(x.target.value)} placeholder="e.g. Infosys" /></div>
        <div><label className="pb-label">Role <small>optional</small></label><input className="pb-input" value={role} onChange={(x) => setRole(x.target.value)} /></div>
        <div><label className="pb-label">Interview date <small>optional</small></label><input className="pb-input" type="date" value={interviewedOn} onChange={(x) => setInterviewedOn(x.target.value)} /></div>
      </div>
      <label className="pb-label">Message <small>optional — shown in the invite</small></label>
      <input className="pb-input" value={message} onChange={(x) => setMessage(x.target.value)} placeholder="The next batch faces them on Monday — please share today." />
      <label className="pb-label">Send by</label>
      <div className="pb-row" style={{ gap: 16 }}>
        <label className="pb-switch"><input type="checkbox" checked={email} onChange={(x) => setEmail(x.target.checked)} /> ✉️ Email <small className="pb-faint">free</small></label>
        <label className="pb-switch"><input type="checkbox" checked={wa} onChange={(x) => setWa(x.target.checked)} /> 💬 WhatsApp <small className="pb-faint">{pv ? `${inr(pv.costPerMessageInr)} per message` : 'paid per message'}</small></label>
      </div>
      {wa && pv && !pv.whatsappTemplateReady && <div className="pb-alert pb-alert-warn" style={{ marginTop: 10 }}>No WhatsApp template is assigned for <b>Interview experience — invite</b>. Create one in Admin → WhatsApp Templates → Where used{email ? ' — email still goes out.' : '.'}</div>}
      {pv && !!pv.sample.length && <div className="pb-help">Invites: {pv.sample.join(', ')}{pv.recipients > pv.sample.length ? ` and ${pv.recipients - pv.sample.length} more` : ''}</div>}
      <div className="pb-help">Every invited student also sees a "Share now" banner on their Interview Experiences page. Nobody is blocked if they do not post.</div>
      {err && <div className="pb-alert pb-alert-bad" style={{ marginTop: 10 }}>{err}</div>}
    </Modal>
  );
};

/* ── Page ───────────────────────────────────────────────────────────────────────────────── */
const InterviewHubAdmin: React.FC = () => {
  const nav = useNavigate();
  const toast = useToast();
  const [tab, setTab] = useState<Tab>('pending');
  const [q, setQ] = useState('');
  const [list, setList] = useState<Awaited<ReturnType<typeof interviewHubApi.admin.list>> | null>(null);
  const [inv, setInv] = useState<{ counts: Record<string, number>; items: InviteRow[] } | null>(null);
  const [invFilter, setInvFilter] = useState('');
  const [open, setOpen] = useState<string | null>(null);
  const [inviting, setInviting] = useState(false);

  const load = useCallback(() => {
    if (tab === 'automation' || tab === 'insights') return;
    if (tab === 'invites') interviewHubApi.admin.invites(invFilter || undefined).then(setInv).catch(() => undefined);
    else interviewHubApi.admin.list({ status: tab, q: q || undefined }).then(setList).catch(() => undefined);
  }, [tab, q, invFilter]);
  useEffect(() => { const t = setTimeout(load, q ? 300 : 0); return () => clearTimeout(t); }, [load, q]);
  useEffect(() => { interviewHubApi.admin.invites().then(setInv).catch(() => undefined); }, []);

  const counts = list?.counts || {};
  return (
    <div className="pb-root">
      <div className="pb-page">
        <div className="pb-head">
          <div className="pb-grow">
            <h1>Interview Experiences</h1>
            <p>What candidates were asked in real interviews. Review and publish what students post, copy the questions into the company question bank, and invite people to share right after an interview — while they still remember.</p>
          </div>
          <button className="pb-btn" onClick={() => nav('/interview-experiences')}><i className="fa-regular fa-eye" /> Student view</button>
          <button className="pb-btn pb-btn-primary" onClick={() => setInviting(true)}><i className="fa-solid fa-envelope-open-text" /> Invite to share</button>
        </div>

        <div className="pb-card pb-tabs" style={{ marginBottom: 12, borderRadius: 14 }}>
          {([['pending', 'To review'], ['published', 'Published'], ['rejected', 'Sent back'], ['draft', 'Drafts'], ['invites', 'Invites'], ['automation', 'Automation'], ['insights', 'Insights']] as [Tab, string][]).map(([k, l]) => (
            <button key={k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>
              {l} {k === 'invites'
                ? (inv?.counts.overdue ? <span className="cnt" style={{ background: 'var(--pb-bad-soft)', color: 'var(--pb-bad)' }}>{inv.counts.overdue} overdue</span> : null)
                : k === 'automation' || k === 'insights' ? null
                  : counts[k] ? <span className="cnt">{counts[k]}</span> : null}
            </button>
          ))}
        </div>

        {tab === 'automation' ? <AutomationPanel toast={toast.show} />
          : tab === 'insights' ? <InsightsPanel />
          : tab !== 'invites' ? <>
          <div className="pb-card pb-filters">
            <div className="pb-search"><i className="fa-solid fa-magnifying-glass" /><input className="pb-input" placeholder="Search company or role" value={q} onChange={(e) => setQ(e.target.value)} /></div>
          </div>
          <div className="pb-card pb-table-wrap">
            <table className="pb-table">
              <thead><tr><th>Company</th><th>Candidate</th><th>Interviewed</th><th>Result</th><th>Rounds</th><th>Questions</th><th>Shared as</th><th>Updated</th></tr></thead>
              <tbody>
                {!list && <tr><td colSpan={8} style={{ textAlign: 'center', padding: 24 }}><span className="pb-spinner" /></td></tr>}
                {list && !list.items.length && <tr><td colSpan={8} className="pb-muted" style={{ textAlign: 'center', padding: 28 }}>{tab === 'pending' ? 'Nothing waiting for review. Invite students who interviewed recently to share.' : 'Nothing here.'}</td></tr>}
                {list?.items.map((e) => (
                  <tr key={e.id} onClick={() => setOpen(e.id)}>
                    <td><span className="pb-row"><CompanyLogo name={e.companyName} /><span><b>{e.companyName}</b><div className="pb-faint" style={{ fontSize: 12 }}>{e.role}</div></span></span></td>
                    <td>{e.student}<div className="pb-faint" style={{ fontSize: 12 }}>{e.fromInvite ? 'invited' : 'posted on their own'}</div></td>
                    <td className="pb-muted">{fmtDate(e.interviewedOn)}</td>
                    <td><OutcomePill o={e.outcome} /></td>
                    <td>{e.rounds.length}</td>
                    <td>{e.questionCount}</td>
                    <td><ModeIcon mode={e.captureMode} recording={e.hasMedia} /></td>
                    <td className="pb-muted">{relTime(e.submittedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </> : <>
          <div className="pb-card pb-filters">
            <div className="pb-chips">
              {[['', 'All'], ['overdue', `Overdue (${inv?.counts.overdue || 0})`], ['sent', `Waiting (${inv?.counts.sent || 0})`], ['submitted', `Answered (${inv?.counts.submitted || 0})`]].map(([k, l]) => (
                <button key={k} className={`pb-chip ${invFilter === k ? 'on' : ''}`} onClick={() => setInvFilter(k)}>{l}</button>
              ))}
            </div>
            <span className="pb-grow" />
            <span className="pb-muted" style={{ fontSize: 12.5 }}>A free email reminder goes out automatically 2 days after an unanswered invite; after 3 days it shows as overdue.</span>
          </div>
          <div className="pb-card pb-table-wrap">
            <table className="pb-table">
              <thead><tr><th>Student</th><th>Company</th><th>Sent</th><th>Channels</th><th>Status</th><th /></tr></thead>
              <tbody>
                {!inv && <tr><td colSpan={6} style={{ textAlign: 'center', padding: 24 }}><span className="pb-spinner" /></td></tr>}
                {inv && !inv.items.length && <tr><td colSpan={6} className="pb-muted" style={{ textAlign: 'center', padding: 28 }}>No invites yet. After a drive, invite everyone who attended.</td></tr>}
                {inv?.items.map((i) => (
                  <tr key={i.id} style={{ cursor: 'default' }}>
                    <td><b>{i.student || '—'}</b></td>
                    <td>{i.companyName}<div className="pb-faint" style={{ fontSize: 12 }}>{i.role}{i.interviewedOn ? ` · ${fmtDate(i.interviewedOn)}` : ''}</div></td>
                    <td className="pb-muted">{relTime(i.createdAt)}{i.remindedAt ? <div style={{ fontSize: 12 }}>reminded {relTime(i.remindedAt)}</div> : null}</td>
                    <td style={{ fontSize: 12.5 }}>{i.channels.includes('email') && <span title={i.emailSent ? 'Delivered' : 'Not sent'}>✉️{i.emailSent ? '✓' : '✗'} </span>}{i.channels.includes('whatsapp') && <span title={i.whatsappSent ? 'Delivered' : 'Not sent'}>💬{i.whatsappSent ? '✓' : '✗'}</span>}</td>
                    <td>{i.status === 'submitted' ? <span className="pb-pill pb-badge-ok">Answered</span> : i.status === 'cancelled' ? <span className="pb-pill pb-badge-neutral">Cancelled</span> : i.overdue ? <span className="pb-pill pb-badge-bad">Overdue</span> : <span className="pb-pill pb-badge-warn">Waiting</span>}</td>
                    <td style={{ whiteSpace: 'nowrap', textAlign: 'right' }}>
                      {i.status === 'submitted' && i.experienceId && <button className="pb-btn pb-btn-sm" onClick={() => setOpen(i.experienceId)}>Review</button>}
                      {i.status === 'sent' && <>
                        <button className="pb-btn pb-btn-sm" onClick={async () => { const r = await interviewHubApi.admin.remind(i.id, ['email']); toast.show(r.email ? 'Reminder emailed.' : 'Could not email them.', !r.email); load(); }}>Remind ✉️</button>
                        <button className="pb-btn pb-btn-sm" title="WhatsApp costs per message" onClick={async () => { const r = await interviewHubApi.admin.remind(i.id, ['whatsapp']); toast.show(r.whatsapp ? 'WhatsApp reminder sent.' : (r.whatsappError || 'Could not WhatsApp them.'), !r.whatsapp); load(); }}>💬</button>
                        <button className="pb-btn pb-btn-sm pb-btn-ghost" onClick={async () => { await interviewHubApi.admin.cancel(i.id); load(); }}>Cancel</button>
                      </>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>}
      </div>
      {open && <ReviewModal id={open} onClose={() => setOpen(null)} onChanged={(m) => { setOpen(null); toast.show(m); load(); }} />}
      {inviting && <InviteModal onClose={() => setInviting(false)} onSent={(m) => { setInviting(false); toast.show(m); setTab('invites'); load(); }} />}
      {toast.node}
    </div>
  );
};

export default InterviewHubAdmin;
