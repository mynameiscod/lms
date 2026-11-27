import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../hooks';
import { userCan } from '../../utils/permissions';
import {
  placementDeskApi, Candidate, CandidateStatus, Company, Drive, Officer, CANDIDATE_STATUSES, STATUS_LABEL,
  JOB_TYPE_LABEL, MODE_LABEL, DRIVE_STATUS_LABEL, fmtDay, fmtPkg,
} from '../../api/placementDeskApi';
import DriveForm from './DriveForm';
import AddCandidates from './AddCandidates';
import './PlacementDesk.css';

const ATTENDED: CandidateStatus[] = ['attended', 'in_process', 'offered', 'rejected', 'offer_accepted', 'offer_declined', 'joined'];
const OFFERS: CandidateStatus[] = ['offered', 'offer_accepted', 'offer_declined', 'joined'];

const DriveDetail: React.FC = () => {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const canManage = userCan(user as any, ['manage_placement_desk'], ['TENANT_ADMIN']);
  const [drive, setDrive] = useState<Drive | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [cands, setCands] = useState<Candidate[]>([]);
  const [officers, setOfficers] = useState<Officer[]>([]);
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');
  const [editing, setEditing] = useState(false);
  const [adding, setAdding] = useState(false);
  const [editCand, setEditCand] = useState<Candidate | null>(null);
  const [picked, setPicked] = useState<Set<string>>(new Set());

  const load = () => placementDeskApi.drive(id).then(r => { setDrive(r.drive); setCompany(r.company); setCands(r.candidates); }).catch(e => setErr(e.message));
  useEffect(() => { load(); placementDeskApi.officers().then(setOfficers).catch(() => {}); }, [id]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (!msg) return; const t = setTimeout(() => setMsg(''), 2500); return () => clearTimeout(t); }, [msg]);

  const counts = useMemo(() => ({
    total: cands.length, attended: cands.filter(c => ATTENDED.includes(c.status)).length, noShow: cands.filter(c => c.status === 'no_show').length,
    offers: cands.filter(c => OFFERS.includes(c.status)).length, rejected: cands.filter(c => c.status === 'rejected').length,
    notMarked: cands.filter(c => c.status === 'eligible').length,
  }), [cands]);

  const setStatus = async (c: Candidate, status: CandidateStatus) => {
    try { const u = await placementDeskApi.updateCandidate(c._id, { status }); setCands(prev => prev.map(x => (x._id === c._id ? u : x))); }
    catch (e: any) { setErr(e.message); }
  };
  const bulk = async (status: CandidateStatus) => {
    try { const r = await placementDeskApi.bulkStatus(id, [...picked], status); setCands(r.data); setPicked(new Set()); setMsg(r.message); }
    catch (e: any) { setErr(e.message); }
  };
  const remove = async (c: Candidate) => {
    if (!window.confirm(`Remove ${c.name} from this drive?`)) return;
    try { await placementDeskApi.removeCandidate(c._id); setCands(prev => prev.filter(x => x._id !== c._id)); }
    catch (e: any) { setErr(e.message); }
  };
  const del = async () => {
    if (!drive || !window.confirm(`Delete the ${drive.companyName} drive and its ${cands.length} candidate record(s)? This cannot be undone.`)) return;
    try { await placementDeskApi.deleteDrive(id); navigate('/placement-desk?tab=drives'); } catch (e: any) { setErr(e.message); }
  };

  if (!drive) return <div className="pd-page">{err ? <div className="pd-err">{err}</div> : <div className="pd-empty">Loading…</div>}</div>;
  const allPicked = cands.length > 0 && cands.every(c => picked.has(c._id));
  const el = drive.eligibility || ({} as any);
  const info: [string, React.ReactNode][] = [
    ['Package', fmtPkg(drive.packageMin, drive.packageMax)],
    ['Job type', `${JOB_TYPE_LABEL[drive.jobType]}${drive.openings ? ` · ${drive.openings} openings` : ''}`],
    ['Mode / location', `${MODE_LABEL[drive.mode]}${drive.location ? ` · ${drive.location}` : ''}`],
    ['Salary details', drive.salaryNotes || '—'],
    ['Bond', drive.bond?.required ? `${drive.bond.months || '?'} months${drive.bond.amount ? ` · ₹${drive.bond.amount.toLocaleString('en-IN')}` : ''}${drive.bond.notes ? ` · ${drive.bond.notes}` : ''}` : 'No bond'],
    ['Conditions', drive.conditions || '—'],
    ['Eligibility', [el.passoutYears?.length ? `Passout ${el.passoutYears.join(', ')}` : '', el.degrees?.length ? el.degrees.join(', ') : '', el.minPercent ? `${el.minPercent}%+` : '', el.skills?.length ? `Skills: ${el.skills.join(', ')}` : '', el.notes || ''].filter(Boolean).join(' · ') || 'Open'],
    ['Rounds', drive.rounds?.length ? drive.rounds.join(' → ') : '—'],
    ['Brought by', drive.officerName || '—'],
    ['Company contact', drive.companyContact?.name ? `${drive.companyContact.name}${drive.companyContact.designation ? ` (${drive.companyContact.designation})` : ''}${drive.companyContact.phone ? ` · ${drive.companyContact.phone}` : ''}${drive.companyContact.email ? ` · ${drive.companyContact.email}` : ''}` : '—'],
    ['Website', company?.website ? <a href={/^https?:/i.test(company.website) ? company.website : `https://${company.website}`} target="_blank" rel="noreferrer">{company.website}</a> : '—'],
    ['Address', company?.address || company?.city || '—'],
  ];

  return (
    <div className="pd-page">
      <button className="pd-back" onClick={() => navigate('/placement-desk?tab=drives')}><i className="fa-solid fa-arrow-left" /> Drives</button>
      <div className="pd-head">
        <div>
          <h1>{drive.companyName} <span className={`pd-dstatus d-${drive.status}`}>{DRIVE_STATUS_LABEL[drive.status]}</span></h1>
          <p>{drive.role} · {fmtDay(drive.day)}</p>
        </div>
        {canManage && <div className="pd-head-actions"><button className="pd-btn" onClick={() => setEditing(true)}><i className="fa-solid fa-pen" /> Edit</button><button className="pd-btn danger" onClick={del}><i className="fa-solid fa-trash" /></button></div>}
      </div>
      {err && <div className="pd-err" onClick={() => setErr('')}>{err}</div>}
      {msg && <div className="pd-ok">{msg}</div>}

      <div className="pd-card"><div className="pd-info">{info.map(([k, v]) => <div key={k}><span>{k}</span><div>{v}</div></div>)}</div>{drive.notes && <p className="pd-notes">{drive.notes}</p>}</div>

      <div className="pd-tiles small">
        {[['Put up', counts.total, 'blue'], ['Attended', counts.attended, 'teal'], ['No-show', counts.noShow, 'grey'], ['Offers', counts.offers, 'green'], ['Rejected', counts.rejected, 'red'], ['Not marked', counts.notMarked, 'amber']].map(([k, v, c]) => (
          <div key={k as string} className={`pd-tile ${c}`}><span>{k}</span><b>{v}</b></div>
        ))}
      </div>

      <div className="pd-card">
        <div className="pd-card-head">
          <h4>Candidates</h4>
          {canManage && <button className="pd-btn primary" onClick={() => setAdding(true)}><i className="fa-solid fa-user-plus" /> Add candidates</button>}
        </div>
        {canManage && picked.size > 0 && (
          <div className="pd-bulk">
            <b>{picked.size} selected</b><span>Mark as:</span>
            {(['attended', 'no_show', 'in_process', 'offered', 'rejected'] as CandidateStatus[]).map(s => <button key={s} className={`pd-status s-${s}`} onClick={() => bulk(s)}>{STATUS_LABEL[s]}</button>)}
            <button className="pd-link" onClick={() => setPicked(new Set())}>Clear</button>
          </div>
        )}
        {cands.length === 0 ? <div className="pd-empty">No one added yet. Add our students or outside candidates.</div> : (
          <div className="pd-table-wrap">
            <table className="pd-table">
              <thead><tr>{canManage && <th><input type="checkbox" checked={allPicked} onChange={() => setPicked(allPicked ? new Set() : new Set(cands.map(c => c._id)))} /></th>}<th>Candidate</th><th>Status</th><th>Round reached</th><th>Offer</th><th>Feedback</th>{canManage && <th />}</tr></thead>
              <tbody>{cands.map(c => (
                <tr key={c._id}>
                  {canManage && <td><input type="checkbox" checked={picked.has(c._id)} onChange={() => setPicked(p => { const n = new Set(p); n.has(c._id) ? n.delete(c._id) : n.add(c._id); return n; })} /></td>}
                  <td data-label="Candidate">
                    {c.kind === 'student' && c.studentId ? <button className="pd-link" onClick={() => navigate(`/users/${c.studentId}`)}>{c.name}</button> : <b>{c.name}</b>}
                    {c.kind === 'external' && <span className="pd-tag">Outside</span>}
                    <small>{[c.phone, c.email, c.college, c.degree, c.passoutYear].filter(Boolean).join(' · ')}</small>
                  </td>
                  <td data-label="Status">{canManage
                    ? <select className={`pd-status-select s-${c.status}`} value={c.status} onChange={e => setStatus(c, e.target.value as CandidateStatus)}>{CANDIDATE_STATUSES.map(s => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}</select>
                    : <span className={`pd-status s-${c.status}`}>{STATUS_LABEL[c.status]}</span>}</td>
                  <td data-label="Round">{c.roundReached || '—'}</td>
                  <td data-label="Offer">{c.offerCtc ? `₹${c.offerCtc} LPA` : '—'}</td>
                  <td data-label="Feedback" className="pd-fb-cell">{c.companyFeedback || c.internalRemarks ? <>{c.companyFeedback && <span>{c.companyFeedback}</span>}{c.internalRemarks && <small><i className="fa-solid fa-lock" /> {c.internalRemarks}</small>}</> : <span className="pd-dim">—</span>}</td>
                  {canManage && <td className="pd-row-actions"><button className="pd-link" onClick={() => setEditCand(c)}>Edit</button><button className="pd-x small" onClick={() => remove(c)} title="Remove">×</button></td>}
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
      </div>

      {editing && <DriveForm drive={drive} officers={officers} onClose={() => setEditing(false)} onSaved={() => { setEditing(false); load(); setMsg('Drive saved'); }} />}
      {adding && <AddCandidates drive={drive} onClose={() => setAdding(false)} onAdded={(list, m) => { setCands(list); setMsg(m); setAdding(false); }} />}
      {editCand && <CandidateEditor cand={editCand} rounds={drive.rounds || []} onClose={() => setEditCand(null)} onSaved={u => { setCands(prev => prev.map(x => (x._id === u._id ? u : x))); setEditCand(null); }} />}
    </div>
  );
};

/** Outcome + feedback for one candidate. */
const CandidateEditor: React.FC<{ cand: Candidate; rounds: string[]; onClose: () => void; onSaved: (c: Candidate) => void }> = ({ cand, rounds, onClose, onSaved }) => {
  const [f, setF] = useState({ status: cand.status, roundReached: cand.roundReached || '', offerCtc: cand.offerCtc ?? '', companyFeedback: cand.companyFeedback || '', internalRemarks: cand.internalRemarks || '' });
  const [err, setErr] = useState('');
  const [saving, setSaving] = useState(false);
  const save = async () => {
    setSaving(true); setErr('');
    try { onSaved(await placementDeskApi.updateCandidate(cand._id, { ...f, offerCtc: f.offerCtc === '' ? null : Number(f.offerCtc) } as any)); }
    catch (e: any) { setErr(e.message); } finally { setSaving(false); }
  };
  return (
    <div className="pd-overlay" onClick={onClose}>
      <div className="pd-modal" onClick={e => e.stopPropagation()}>
        <div className="pd-modal-head"><h3>{cand.name}</h3><button className="pd-x" onClick={onClose}>×</button></div>
        {err && <div className="pd-err">{err}</div>}
        <div className="pd-modal-body">
          <div className="pd-grid">
            <label className="span2"><span>Status</span><select value={f.status} onChange={e => setF({ ...f, status: e.target.value as CandidateStatus })}>{CANDIDATE_STATUSES.map(s => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}</select></label>
            <label><span>Round reached</span><input list="pd-rounds" value={f.roundReached} onChange={e => setF({ ...f, roundReached: e.target.value })} /><datalist id="pd-rounds">{rounds.map(r => <option key={r} value={r} />)}</datalist></label>
            <label><span>Offer (LPA)</span><input type="number" min={0} step="0.1" value={f.offerCtc} onChange={e => setF({ ...f, offerCtc: e.target.value })} /></label>
            <label className="span4"><span>Company feedback</span><textarea rows={3} value={f.companyFeedback} onChange={e => setF({ ...f, companyFeedback: e.target.value })} placeholder="What the company said about this candidate" /></label>
            <label className="span4"><span>Our remarks (internal)</span><textarea rows={2} value={f.internalRemarks} onChange={e => setF({ ...f, internalRemarks: e.target.value })} /></label>
          </div>
          <p className="pd-hint"><i className="fa-solid fa-lock" /> Only the placement team sees this. Students never do.</p>
        </div>
        <div className="pd-modal-foot"><button className="pd-btn" onClick={onClose} disabled={saving}>Cancel</button><button className="pd-btn primary" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save'}</button></div>
      </div>
    </div>
  );
};

export default DriveDetail;
