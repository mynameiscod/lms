import React, { useEffect, useMemo, useState } from 'react';
import { talentPoolApi, Partner, TrackerRow, STATUS_LABEL, STATUS_ORDER, TalentStatus } from '../../api/talentPoolApi';
import { StatusPill } from './shared';

/** Every shared candidate with every office that has them, and each office's status. */
const TrackerTab: React.FC<{ partners: Partner[]; canManage: boolean; refreshKey: number; onChanged: () => void }> = ({ partners, canManage, refreshKey, onChanged }) => {
  const [partnerId, setPartnerId] = useState('');
  const [status, setStatus] = useState<TalentStatus | ''>('');
  const [q, setQ] = useState('');
  const [rows, setRows] = useState<TrackerRow[] | null>(null);
  const [err, setErr] = useState('');
  const load = () => talentPoolApi.tracker({ partnerId: partnerId || undefined, status: status || undefined }).then(setRows).catch(e => { setRows([]); setErr(e.message); });
  useEffect(() => { setRows(null); load(); }, [partnerId, status, refreshKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // Status counts across all offices (one candidate at two offices counts twice).
  const totals = useMemo(() => {
    const t: Partial<Record<TalentStatus, number>> = {};
    for (const p of partners) for (const [s, n] of Object.entries(p.byStatus || {})) t[s as TalentStatus] = (t[s as TalentStatus] || 0) + (n || 0);
    return t;
  }, [partners]);
  const shown = (rows || []).filter(r => !q || `${r.fullName} ${r.phone || ''} ${r.email || ''}`.toLowerCase().includes(q.toLowerCase()));
  const change = async (shareId: string, s: TalentStatus) => { setErr(''); try { await talentPoolApi.setStatus(shareId, s); await load(); onChanged(); } catch (e: any) { setErr(e.message); } };

  return (
    <div className="tp-section">
      <div className="tp-tiles">
        {STATUS_ORDER.map(s => (
          <button key={s} className={`tp-tile ${status === s ? 'on' : ''}`} onClick={() => setStatus(status === s ? '' : s)}>
            <span>{STATUS_LABEL[s]}</span><b>{totals[s] || 0}</b>
          </button>
        ))}
      </div>
      <div className="tp-toolbar">
        <select value={partnerId} onChange={e => setPartnerId(e.target.value)}><option value="">All offices</option>{partners.map(p => <option key={p._id} value={p._id}>{p.name}</option>)}</select>
        <select value={status} onChange={e => setStatus(e.target.value as any)}><option value="">Any status</option>{STATUS_ORDER.map(s => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}</select>
        <input className="tp-search" placeholder="Search candidate" value={q} onChange={e => setQ(e.target.value)} />
        <div className="tp-spacer" />
        <span className="tp-hint">{rows ? `${shown.length} candidates` : 'Loading…'}</span>
      </div>
      {err && <div className="tp-err">{err}</div>}
      <div className="tp-card tp-table-wrap">
        {!rows ? <div className="tp-empty">Loading…</div> : shown.length === 0 ? <div className="tp-empty">Nothing shared yet.</div> : (
          <table className="tp-table">
            <thead><tr><th>Candidate</th><th>Graduation</th><th>Offices</th><th>Status at each office</th></tr></thead>
            <tbody>{shown.map(r => {
              const best = (s: TalentStatus) => r.shares.filter(x => x.status === s).length;
              return (
                <tr key={`${r.kind}:${r.candidateId}`}>
                  <td><b>{r.fullName}</b><small>{r.kind === 'external' ? 'Outside candidate' : r.batchName || 'Student'} · {r.phone || r.email || ''}</small></td>
                  <td>{r.degree || '—'}<small>{r.graduationYear || ''}</small></td>
                  <td>Shared with {r.shares.length}<small>{[best('shortlisted') && `shortlisted by ${best('shortlisted')}`, best('interview') && `interview at ${best('interview')}`, best('selected') && `selected by ${best('selected')}`].filter(Boolean).join(' · ')}</small></td>
                  <td><div className="tp-pills" style={{ flexDirection: 'column', alignItems: 'flex-start' }}>
                    {r.shares.map(s => (
                      <div key={s.shareId} style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                        <span style={{ minWidth: 120 }}>{s.partnerName}</span>
                        {canManage ? (
                          <select value={s.status} onChange={e => change(s.shareId, e.target.value as TalentStatus)}>{STATUS_ORDER.map(x => <option key={x} value={x}>{STATUS_LABEL[x]}</option>)}</select>
                        ) : <StatusPill s={s.status} />}
                      </div>
                    ))}
                  </div></td>
                </tr>
              );
            })}</tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default TrackerTab;
