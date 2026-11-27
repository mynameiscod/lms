import React, { useEffect, useMemo, useState } from 'react';
import { talentPortalApi, Submission, SubStatus, SUB_LABEL, SUB_ORDER, Company } from '../../api/talentPoolApi';
import { fmtDate } from '../TalentPool/shared';
import { Avatar, Drawer, PageHead, Pager, RowMenu, Stat, SubPill, usePaged, Empty, fmtDateTime, toDateTimeInput } from './ui';

/** Change one candidate's status at one company (interview time when it's an interview). */
export const SubStatusEditor: React.FC<{
  sub: { _id: string; fullName: string; companyName: string; openingTitle: string | null; status: SubStatus; note?: string; interviewAt?: string | null };
  onClose: () => void; onSaved: (s: Submission) => void;
}> = ({ sub, onClose, onSaved }) => {
  const [status, setStatus] = useState<SubStatus>(sub.status);
  const [note, setNote] = useState(sub.note || '');
  const [at, setAt] = useState(toDateTimeInput(sub.interviewAt));
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const save = async () => {
    setErr(''); setBusy(true);
    try { onSaved(await talentPortalApi.setSubStatus(sub._id, status, note, status === 'interview' ? (at ? new Date(at).toISOString() : null) : undefined)); }
    catch (e: any) { setErr(e.message); } finally { setBusy(false); }
  };
  return (
    <Drawer title={sub.fullName} sub={`${sub.companyName}${sub.openingTitle ? ` — ${sub.openingTitle}` : ''}`} onClose={onClose}>
      {err && <div className="tp-err">{err}</div>}
      <div className="tp-status-box">
        <b>Status at this company</b>
        <div className="tpo-statusbtns">{SUB_ORDER.map(s => <button key={s} className={status === s ? 'on' : ''} onClick={() => setStatus(s)}>{SUB_LABEL[s]}</button>)}</div>
        {status === 'interview' && <label className="tp-hint" style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>Interview date & time<input type="datetime-local" value={at} onChange={e => setAt(e.target.value)} style={{ padding: '7px 10px', border: '1px solid #CBD5E1', borderRadius: 8, maxWidth: 260 }} /></label>}
        <textarea placeholder="Remarks — feedback, round, offer details…" value={note} onChange={e => setNote(e.target.value)} />
        <p className="tp-hint">Moving a candidate forward here also moves your own status for them (Shortlisted → Interview → Selected).</p>
        <div className="tp-actions"><button className="tpo-btn" onClick={onClose}>Cancel</button><button className="tpo-btn primary sm" disabled={busy} onClick={save}>Save</button></div>
      </div>
    </Drawer>
  );
};

/** A table of submissions — used on the Submissions page and inside a company. */
export const SubmissionTable: React.FC<{
  rows: Submission[]; hideCompany?: boolean; readOnly?: boolean;
  onChanged?: (s: Submission) => void; onRemoved?: (id: string) => void; onOpenCandidate?: (shareId: string) => void;
}> = ({ rows, hideCompany, readOnly, onChanged, onRemoved, onOpenCandidate }) => {
  const [edit, setEdit] = useState<Submission | null>(null);
  const [err, setErr] = useState('');
  const pg = usePaged(rows, [rows.length]);
  const remove = async (s: Submission) => {
    if (!window.confirm(`Remove ${s.fullName} from ${s.companyName}? Their history at this company is deleted.`)) return;
    try { await talentPortalApi.deleteSubmission(s._id); onRemoved?.(s._id); } catch (e: any) { setErr(e.message); }
  };
  if (!rows.length) return <Empty icon="fa-paper-plane" title="Nothing sent yet" text="Send shortlisted candidates to a company from the Candidates screen, then track their status here." />;
  return (
    <>
      {err && <div className="tp-err">{err}</div>}
      <div className="tpo-table-wrap">
        <table className="tpo-table">
          <thead><tr><th>Candidate</th>{!hideCompany && <th>Company</th>}<th>Position</th><th>Graduation</th><th>Status</th><th>Interview</th><th>Remarks</th><th>Sent</th>{!readOnly && <th />}</tr></thead>
          <tbody>{pg.slice.map(s => (
            <tr key={s._id} className={readOnly ? '' : 'click'} onClick={() => !readOnly && setEdit(s)}>
              <td><div className="tpo-cand" style={{ minWidth: 170 }}><Avatar small name={s.fullName} /><div><b>{s.fullName}</b><small>{s.phone || s.email || ''}</small></div></div></td>
              {!hideCompany && <td><b>{s.companyName}</b></td>}
              <td>{s.openingTitle || <span className="tpo-muted">General</span>}</td>
              <td>{[s.degree, s.graduationYear].filter(Boolean).join(' • ') || '—'}<small>{s.graduationPercent != null ? `${s.graduationPercent}%` : ''}</small></td>
              <td><SubPill s={s.status} /></td>
              <td>{s.interviewAt ? fmtDateTime(s.interviewAt) : <span className="tpo-muted">—</span>}</td>
              <td style={{ maxWidth: 240 }}>{s.note || <span className="tpo-muted">—</span>}</td>
              <td>{fmtDate(s.sentAt)}</td>
              {!readOnly && <td><RowMenu items={[
                { label: 'Update status', icon: 'fa-pen-to-square', onClick: () => setEdit(s) },
                ...(onOpenCandidate ? [{ label: 'Open candidate', icon: 'fa-id-card', onClick: () => onOpenCandidate(s.shareId) }] : []),
                ...(s.resumeUrl ? [{ label: 'Open resume', icon: 'fa-file-arrow-down', onClick: () => window.open(s.resumeUrl, '_blank', 'noopener') }] : []),
                { label: 'Remove from company', icon: 'fa-trash', danger: true, onClick: () => remove(s) },
              ]} /></td>}
            </tr>
          ))}</tbody>
        </table>
      </div>
      <Pager pg={pg} noun="candidate" />
      {edit && <SubStatusEditor sub={edit} onClose={() => setEdit(null)} onSaved={s => { setEdit(null); onChanged?.(s); }} />}
    </>
  );
};

const TONE: Record<SubStatus, [string, string]> = {
  sent: ['fa-paper-plane', 'blue'], shortlisted: ['fa-award', 'amber'], interview: ['fa-calendar-days', 'violet'], selected: ['fa-circle-check', 'green'],
  offered: ['fa-file-signature', 'green'], joined: ['fa-briefcase', 'green'], rejected: ['fa-circle-xmark', 'red'], on_hold: ['fa-circle-pause', 'grey'], withdrawn: ['fa-person-walking-arrow-right', 'grey'],
};

const Submissions: React.FC<{ companies: Company[]; onOpenCandidate: (shareId: string) => void; refreshKey: number; onSendNew: () => void }> = ({ companies, onOpenCandidate, refreshKey, onSendNew }) => {
  const [rows, setRows] = useState<Submission[] | null>(null);
  const [err, setErr] = useState('');
  const [q, setQ] = useState('');
  const [companyId, setCompanyId] = useState('');
  const [status, setStatus] = useState<SubStatus | ''>('');
  useEffect(() => { talentPortalApi.submissions().then(setRows).catch(e => { setRows([]); setErr(e.message); }); }, [refreshKey]);
  const all = useMemo(() => rows || [], [rows]);
  const counts = useMemo(() => { const c: Partial<Record<SubStatus, number>> = {}; for (const r of all) c[r.status] = (c[r.status] || 0) + 1; return c; }, [all]);
  const shown = all.filter(r => (!companyId || r.companyId === companyId) && (!status || r.status === status)
    && (!q || `${r.fullName} ${r.companyName} ${r.openingTitle || ''} ${r.phone || ''} ${r.email || ''}`.toLowerCase().includes(q.toLowerCase())));
  return (
    <>
      <PageHead icon="fa-diagram-project" title="Sent to Companies" sub="Every candidate you have sent to a company, and where they stand there.">
        <button className="tpo-btn primary" onClick={onSendNew}><i className="fa-solid fa-paper-plane" /> Send candidates</button>
      </PageHead>
      {err && <div className="tp-err">{err}</div>}
      <div className="tpo-stats">
        <Stat icon="fa-layer-group" tone="violet" label="All" value={all.length} on={!status} onClick={() => setStatus('')} />
        {SUB_ORDER.filter(s => s !== 'withdrawn' || counts.withdrawn).map(s => <Stat key={s} icon={TONE[s][0]} tone={TONE[s][1]} label={SUB_LABEL[s]} value={counts[s] || 0} on={status === s} onClick={() => setStatus(status === s ? '' : s)} />)}
      </div>
      <div className="tpo-card tpo-filters">
        <div className="tpo-search"><i className="fa-solid fa-magnifying-glass" /><input placeholder="Search candidate, company, position…" value={q} onChange={e => setQ(e.target.value)} /></div>
        <span className="tpo-spacer" />
        <select value={companyId} onChange={e => setCompanyId(e.target.value)}><option value="">All companies</option>{companies.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}</select>
        <select value={status} onChange={e => setStatus(e.target.value as SubStatus | '')}><option value="">Status</option>{SUB_ORDER.map(s => <option key={s} value={s}>{SUB_LABEL[s]}</option>)}</select>
        <button className="tpo-reset" onClick={() => { setQ(''); setCompanyId(''); setStatus(''); }}><i className="fa-solid fa-rotate-right" /> Reset</button>
      </div>
      <div className="tpo-card">
        {!rows ? <div className="tp-empty">Loading…</div> : (
          <SubmissionTable rows={shown} onOpenCandidate={onOpenCandidate}
            onChanged={s => setRows(rs => (rs || []).map(x => (x._id === s._id ? s : x)))}
            onRemoved={id => setRows(rs => (rs || []).filter(x => x._id !== id))} />
        )}
      </div>
    </>
  );
};

export default Submissions;
