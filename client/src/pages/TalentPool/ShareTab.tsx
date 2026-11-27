import React, { useEffect, useMemo, useState } from 'react';
import { talentPoolApi, Partner, Meta, Candidate } from '../../api/talentPoolApi';

/** Pick an office, filter candidates, tick, share. Each office's list is its own. */
const ShareTab: React.FC<{ meta: Meta; partners: Partner[]; canManage: boolean; onShared: () => void }> = ({ meta, partners, canManage, onShared }) => {
  const active = partners.filter(p => p.active);
  const [partnerId, setPartnerId] = useState('');
  const [kind, setKind] = useState<'student' | 'external'>('student');
  const [f, setF] = useState({ q: '', batchId: '', passoutYear: '', degree: '', minPercent: '', hasResume: false, ready: false });
  const [rows, setRows] = useState<Candidate[] | null>(null);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [msg, setMsg] = useState<{ ok?: string; err?: string }>({});

  const params = useMemo(() => ({
    kind, partnerId: partnerId || undefined, q: f.q || undefined, batchId: f.batchId || undefined,
    passoutYear: f.passoutYear || undefined, degree: f.degree || undefined, minPercent: f.minPercent || undefined,
    hasResume: f.hasResume || undefined, ready: f.ready || undefined,
  }), [kind, partnerId, f]);
  useEffect(() => {
    setRows(null);
    const t = setTimeout(() => talentPoolApi.candidates(params).then(setRows).catch(e => { setRows([]); setMsg({ err: e.message }); }), 250);
    return () => clearTimeout(t);
  }, [params]);
  useEffect(() => { setPicked(new Set()); }, [kind, partnerId]);

  const selectable = (rows || []).filter(r => !r.alreadyShared);
  const allOn = selectable.length > 0 && selectable.every(r => picked.has(r.candidateId));
  const toggle = (id: string) => { const n = new Set(picked); if (n.has(id)) n.delete(id); else n.add(id); setPicked(n); };
  const share = async () => {
    setMsg({});
    try {
      const ids = [...picked];
      const r = await talentPoolApi.share(partnerId, kind === 'student' ? ids : [], kind === 'external' ? ids : []);
      const office = partners.find(p => p._id === partnerId)?.name;
      setMsg({ ok: `${r.added} candidate${r.added === 1 ? '' : 's'} shared with ${office}.${r.alreadyShared ? ` ${r.alreadyShared} already had it.` : ''}` });
      setPicked(new Set());
      setRows(await talentPoolApi.candidates(params));
      onShared();
    } catch (e: any) { setMsg({ err: e.message }); }
  };
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setF({ ...f, [k]: e.target.type === 'checkbox' ? (e.target as HTMLInputElement).checked : e.target.value });

  if (!active.length) return <div className="tp-card tp-empty">Add a placement office first (Offices tab).</div>;
  return (
    <div className="tp-section">
      <div className="tp-toolbar">
        <select value={partnerId} onChange={e => setPartnerId(e.target.value)}><option value="">Share with which office?</option>{active.map(p => <option key={p._id} value={p._id}>{p.name}</option>)}</select>
        <select value={kind} onChange={e => setKind(e.target.value as any)}><option value="student">LMS students</option><option value="external">Outside candidates</option></select>
        <input className="tp-search" placeholder="Search name, email, phone" value={f.q} onChange={set('q')} />
        {kind === 'student' && <select value={f.batchId} onChange={set('batchId')}><option value="">All batches</option>{meta.batches.map(b => <option key={b._id} value={b._id}>{b.name}</option>)}</select>}
        <input style={{ width: 120 }} placeholder="Passed out (year)" value={f.passoutYear} onChange={set('passoutYear')} />
        <input style={{ width: 120 }} placeholder="Degree / branch" value={f.degree} onChange={set('degree')} />
        <input style={{ width: 110 }} placeholder="Min grad %" value={f.minPercent} onChange={set('minPercent')} />
        <label className="tp-hint"><input type="checkbox" checked={f.hasResume} onChange={set('hasResume')} /> Has resume</label>
        <label className="tp-hint"><input type="checkbox" checked={f.ready} onChange={set('ready')} /> Complete profiles only</label>
      </div>
      {msg.ok && <div className="tp-ok">{msg.ok}</div>}
      {msg.err && <div className="tp-err">{msg.err}</div>}
      <div className="tp-toolbar">
        <span className="tp-hint">{rows ? `${rows.length} candidates` : 'Loading…'}{picked.size ? ` · ${picked.size} selected` : ''}</span>
        <div className="tp-spacer" />
        {canManage && <button className="tp-btn primary" disabled={!partnerId || !picked.size} onClick={share}><i className="fa-solid fa-share-nodes" /> Share {picked.size || ''} with office</button>}
      </div>
      {!partnerId && <p className="tp-hint">Choose an office to see who it already has and to share.</p>}
      <div className="tp-card tp-table-wrap">
        {!rows ? <div className="tp-empty">Loading…</div> : rows.length === 0 ? <div className="tp-empty">No candidates match.</div> : (
          <table className="tp-table">
            <thead><tr>
              {canManage && <th><input type="checkbox" disabled={!partnerId} checked={allOn} onChange={() => setPicked(allOn ? new Set() : new Set(selectable.map(r => r.candidateId)))} /></th>}
              <th>Candidate</th><th>Contact</th><th>10th / 12th / Grad</th><th>Graduation</th><th>Profile</th><th>Offices</th>
            </tr></thead>
            <tbody>{rows.map(r => (
              <tr key={r.candidateId} className={r.alreadyShared ? 'tp-muted' : ''}>
                {canManage && <td><input type="checkbox" disabled={!partnerId || r.alreadyShared} checked={picked.has(r.candidateId)} onChange={() => toggle(r.candidateId)} /></td>}
                <td><b>{r.fullName}</b><small>{r.kind === 'student' ? r.batchName || 'No batch' : 'Outside candidate'}{r.expectedRole ? ` · wants ${r.expectedRole}` : ''}</small></td>
                <td>{r.phone || '—'}<small>{r.email}</small></td>
                <td>{[r.tenthPercent, r.twelfthPercent, r.graduationPercent].map(v => (v == null ? '—' : `${v}%`)).join(' / ')}</td>
                <td>{[r.degree, r.branch].filter(Boolean).join(' · ') || '—'}<small>{r.graduationYear || ''}{r.college ? ` · ${r.college}` : ''}</small></td>
                <td>{r.missing?.length ? <span className="tp-pill amber" title={`Missing: ${r.missing.join(', ')}`}>Missing {r.missing.length}</span> : <span className="tp-pill green">Complete</span>}
                  {r.missing?.length ? <small>{r.missing.join(', ')}</small> : null}</td>
                <td>{r.alreadyShared ? <span className="tp-pill blue">Already shared</span> : r.sharedCount ? `${r.sharedCount}` : '—'}</td>
              </tr>
            ))}</tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default ShareTab;
