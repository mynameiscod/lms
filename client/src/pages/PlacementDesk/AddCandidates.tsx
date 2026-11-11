import React, { useEffect, useMemo, useState } from 'react';
import { batchApi } from '../../api';
import { placementDeskApi, Candidate, Drive, ExternalInput, Suggestion } from '../../api/placementDeskApi';

/**
 * Add people to a drive: our LMS students (sorted by how well they match the eligibility), or
 * outside candidates typed in or pasted one per line.
 */
const MATCH_LABEL = { yes: 'Eligible', unknown: 'Profile incomplete', no: 'Not eligible' };
const emptyRow = (): ExternalInput => ({ name: '', phone: '', email: '', college: '', degree: '', passoutYear: '' });

const AddCandidates: React.FC<{ drive: Drive; onClose: () => void; onAdded: (list: Candidate[], msg: string) => void }> = ({ drive, onClose, onAdded }) => {
  const [mode, setMode] = useState<'students' | 'outside'>('students');
  const [rows, setRows] = useState<Suggestion[] | null>(null);
  const [batches, setBatches] = useState<{ _id: string; name: string }[]>([]);
  const [batchId, setBatchId] = useState('');
  const [q, setQ] = useState('');
  const [show, setShow] = useState<'match' | 'all'>('match');
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [ext, setExt] = useState<ExternalInput[]>([emptyRow()]);
  const [paste, setPaste] = useState('');
  const [err, setErr] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => { batchApi.getBatches().then((r: any) => setBatches((r.data || []).filter((b: any) => b.isActive !== false))).catch(() => {}); }, []);
  useEffect(() => { setRows(null); placementDeskApi.suggest(drive._id, batchId || undefined).then(setRows).catch(e => setErr(e.message)); }, [drive._id, batchId]);

  const visible = useMemo(() => {
    const s = q.trim().toLowerCase();
    return (rows || []).filter(r => !r.added && (show === 'all' || r.match !== 'no') && (!s || `${r.name} ${r.email} ${r.batchName}`.toLowerCase().includes(s)));
  }, [rows, q, show]);
  const allPicked = visible.length > 0 && visible.every(r => picked.has(r._id));

  const parsePaste = () => {
    const parsed = paste.split('\n').map(l => l.split(/[,\t]/).map(x => x.trim())).filter(p => p[0])
      .map(([name, phone, email, college, degree, passoutYear]) => ({ name, phone, email, college, degree, passoutYear }));
    if (parsed.length) { setExt(prev => [...prev.filter(r => r.name.trim()), ...parsed]); setPaste(''); }
  };

  const save = async () => {
    setSaving(true); setErr('');
    try {
      const body = mode === 'students'
        ? { studentIds: [...picked] }
        : { externals: ext.filter(r => r.name.trim()).map(r => ({ ...r, passoutYear: r.passoutYear ? Number(r.passoutYear) : undefined })) };
      const r = await placementDeskApi.addCandidates(drive._id, body);
      onAdded(r.data, r.message);
    } catch (e: any) { setErr(e.message); } finally { setSaving(false); }
  };
  const count = mode === 'students' ? picked.size : ext.filter(r => r.name.trim()).length;

  return (
    <div className="pd-overlay" onClick={onClose}>
      <div className="pd-modal wide" onClick={e => e.stopPropagation()}>
        <div className="pd-modal-head"><h3>Add candidates — {drive.companyName}</h3><button className="pd-x" onClick={onClose}>×</button></div>
        <div className="pd-seg pd-seg-pad">
          <button className={mode === 'students' ? 'on' : ''} onClick={() => setMode('students')}>Our students</button>
          <button className={mode === 'outside' ? 'on' : ''} onClick={() => setMode('outside')}>Outside candidates</button>
        </div>
        {err && <div className="pd-err">{err}</div>}
        <div className="pd-modal-body">
          {mode === 'students' ? (
            <>
              <div className="pd-toolbar">
                <select value={batchId} onChange={e => setBatchId(e.target.value)}><option value="">{drive.eligibility?.batchIds?.length ? 'Batches set on the drive' : 'All batches'}</option>{batches.map(b => <option key={b._id} value={b._id}>{b.name}</option>)}</select>
                <input className="pd-search" placeholder="Search name, email, batch" value={q} onChange={e => setQ(e.target.value)} />
                <div className="pd-seg"><button className={show === 'match' ? 'on' : ''} onClick={() => setShow('match')}>Eligible + incomplete</button><button className={show === 'all' ? 'on' : ''} onClick={() => setShow('all')}>Everyone</button></div>
              </div>
              {!rows ? <div className="pd-empty">Checking eligibility…</div> : visible.length === 0 ? <div className="pd-empty">No students match.</div> : (
                <div className="pd-pick">
                  <label className="pd-pick-row head"><input type="checkbox" checked={allPicked} onChange={() => setPicked(p => { const n = new Set(p); visible.forEach(r => (allPicked ? n.delete(r._id) : n.add(r._id))); return n; })} /><span>Select all {visible.length}</span></label>
                  {visible.map(r => (
                    <label key={r._id} className={`pd-pick-row ${picked.has(r._id) ? 'on' : ''}`}>
                      <input type="checkbox" checked={picked.has(r._id)} onChange={() => setPicked(p => { const n = new Set(p); n.has(r._id) ? n.delete(r._id) : n.add(r._id); return n; })} />
                      <div><b>{r.name}</b><small>{[r.batchName, r.degree, r.passoutYear, r.percent != null ? `${r.percent}%` : ''].filter(Boolean).join(' · ') || r.email}</small></div>
                      <span className={`pd-match m-${r.match}`} title={r.reasons.join(', ')}>{MATCH_LABEL[r.match]}{r.reasons.length ? ` · ${r.reasons[0]}` : ''}</span>
                    </label>
                  ))}
                </div>
              )}
              {rows && rows.some(r => r.added) && <p className="pd-hint">{rows.filter(r => r.added).length} student(s) already on this drive are hidden.</p>}
            </>
          ) : (
            <>
              <div className="pd-ext">
                <div className="pd-ext-row head"><span>Name *</span><span>Phone</span><span>Email</span><span>College</span><span>Degree</span><span>Passout</span><span /></div>
                {ext.map((r, i) => (
                  <div key={i} className="pd-ext-row">
                    {(['name', 'phone', 'email', 'college', 'degree', 'passoutYear'] as (keyof ExternalInput)[]).map(k => (
                      <input key={k} value={(r[k] as any) || ''} onChange={e => setExt(prev => prev.map((x, j) => (j === i ? { ...x, [k]: e.target.value } : x)))} />
                    ))}
                    <button className="pd-x small" onClick={() => setExt(prev => (prev.length > 1 ? prev.filter((_, j) => j !== i) : [emptyRow()]))}>×</button>
                  </div>
                ))}
                <button className="pd-link" onClick={() => setExt(prev => [...prev, emptyRow()])}>+ Add row</button>
              </div>
              <label className="pd-paste"><span>Or paste a list — one per line: name, phone, email, college, degree, passout year</span>
                <textarea rows={3} value={paste} onChange={e => setPaste(e.target.value)} placeholder={'Ravi Kumar, 9876543210, ravi@mail.com, JNTU, B.Tech, 2025'} />
              </label>
              {paste.trim() && <button className="pd-btn" onClick={parsePaste}>Add pasted lines</button>}
            </>
          )}
        </div>
        <div className="pd-modal-foot"><button className="pd-btn" onClick={onClose} disabled={saving}>Cancel</button><button className="pd-btn primary" onClick={save} disabled={saving || count === 0}>{saving ? 'Adding…' : `Add ${count || ''}`.trim()}</button></div>
      </div>
    </div>
  );
};

export default AddCandidates;
