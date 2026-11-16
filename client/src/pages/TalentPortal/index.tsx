import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks';
import { talentPortalApi, ShareRow, TalentStatus, STATUS_LABEL, STATUS_ORDER, PARTNER_SETTABLE } from '../../api/talentPoolApi';
import CandidateProfile from '../TalentPool/CandidateProfile';
import { StatusPill, fmtDate } from '../TalentPool/shared';
import '../TalentPool/TalentPool.css';

/**
 * Talent Portal — what a placement office sees after login. Only the candidates the institute
 * shared with this office; nothing else in the platform is reachable from this account.
 */
const Detail: React.FC<{ shareId: string; onClose: () => void; onSaved: (r: { status: TalentStatus; partnerNote: string }) => void }> = ({ shareId, onClose, onSaved }) => {
  const [c, setC] = useState<ShareRow | null>(null);
  const [err, setErr] = useState('');
  const [status, setStatus] = useState<TalentStatus | ''>('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    talentPortalApi.candidate(shareId).then(d => { setC(d); setNote(d.partnerNote || ''); onSaved({ status: d.status, partnerNote: d.partnerNote || '' }); }).catch(e => setErr(e.message));
  }, [shareId]); // eslint-disable-line react-hooks/exhaustive-deps
  const save = async () => {
    if (!status) return;
    setErr(''); setBusy(true);
    try {
      const r = await talentPortalApi.setStatus(shareId, status, note);
      onSaved(r);
      setC(await talentPortalApi.candidate(shareId));
      setStatus('');
    } catch (e: any) { setErr(e.message); } finally { setBusy(false); }
  };
  return (
    <div className="tp-overlay" onClick={onClose}>
      <div className="tp-panel" onClick={e => e.stopPropagation()}>
        <div className="tp-panel-head">
          <div><h3>{c?.fullName || 'Loading…'}</h3>{c && <p>Shared {fmtDate(c.sharedAt)} · <StatusPill s={c.status} /></p>}</div>
          <button className="tp-x" onClick={onClose}>×</button>
        </div>
        {err && <div className="tp-err">{err}</div>}
        {c && <>
          <div className="tp-status-box">
            <b>Update status</b>
            <div className="tp-toolbar">
              {PARTNER_SETTABLE.map(s => <button key={s} className={`tp-btn sm ${status === s ? 'primary' : ''}`} onClick={() => setStatus(s)}>{STATUS_LABEL[s]}</button>)}
            </div>
            <textarea placeholder="Note (optional) — e.g. interview date, feedback" value={note} onChange={e => setNote(e.target.value)} />
            <div className="tp-actions"><button className="tp-btn primary" disabled={!status || busy} onClick={save}>Save status</button></div>
          </div>
          <CandidateProfile c={c} />
          {!!c.statusHistory?.length && (
            <div className="tp-sec"><h5>History</h5>
              <ul className="tp-history">{[...c.statusHistory].reverse().map((h, i) => (
                <li key={i}><StatusPill s={h.status} /> {fmtDate(h.at)} · {h.byRole}{h.note ? ` — ${h.note}` : ''}</li>
              ))}</ul>
            </div>
          )}
        </>}
      </div>
    </div>
  );
};

const TalentPortal: React.FC = () => {
  const { user, logout } = useAuth() as any;
  const navigate = useNavigate();
  const [me, setMe] = useState<{ name: string; contactName?: string } | null>(null);
  const [rows, setRows] = useState<ShareRow[] | null>(null);
  const [err, setErr] = useState('');
  const [q, setQ] = useState('');
  const [status, setStatus] = useState<TalentStatus | ''>('');
  const [open, setOpen] = useState<string | null>(null);
  const [brand, setBrand] = useState<{ name?: string; logo?: string } | null>(null);

  useEffect(() => {
    talentPortalApi.me().then(setMe).catch(e => setErr(e.message));
    talentPortalApi.candidates().then(setRows).catch(e => { setRows([]); setErr(e.message); });
    if (user?.tenantId) fetch(`/api/v1/public/branding/${encodeURIComponent(String(user.tenantId))}`).then(r => (r.ok ? r.json() : null)).then(j => j?.success && setBrand(j.data)).catch(() => {});
  }, [user?.tenantId]);

  const counts = useMemo(() => {
    const c: Partial<Record<TalentStatus, number>> = {};
    for (const r of rows || []) c[r.status] = (c[r.status] || 0) + 1;
    return c;
  }, [rows]);
  const shown = (rows || []).filter(r => (!status || r.status === status)
    && (!q || `${r.fullName} ${r.email || ''} ${r.phone || ''} ${r.skills || ''} ${r.degree || ''} ${r.branch || ''} ${r.expectedRole || ''} ${r.preferredLocation || ''}`.toLowerCase().includes(q.toLowerCase())));
  const signOut = () => { logout?.(); navigate('/login'); };

  return (
    <div>
      <div className="tp-portal-bar">
        {brand?.logo && <img src={brand.logo} alt="" />}
        <b>{brand?.name || 'Talent Pool'}</b>
        <span>· {me?.name || ''}</span>
        <div className="tp-spacer" />
        <button className="tp-btn" onClick={signOut}><i className="fa-solid fa-right-from-bracket" /> Sign out</button>
      </div>
      <div className="tp-portal-body">
        <div className="tp-page">
          <div className="tp-head">
            <div><h1><i className="fa-solid fa-people-group" /> Candidates shared with you</h1><p>Open a candidate for the full profile and resume, and update their status as they move through your process.</p></div>
            <button className="tp-btn primary" disabled={!rows?.length} onClick={() => talentPortalApi.export().catch(e => setErr(e.message))}><i className="fa-solid fa-file-excel" /> Download Excel</button>
          </div>
          {err && <div className="tp-err">{err}</div>}
          <div className="tp-section">
            <div className="tp-tiles">
              <button className={`tp-tile ${!status ? 'on' : ''}`} onClick={() => setStatus('')}><span>All</span><b>{rows?.length || 0}</b></button>
              {STATUS_ORDER.map(s => <button key={s} className={`tp-tile ${status === s ? 'on' : ''}`} onClick={() => setStatus(status === s ? '' : s)}><span>{STATUS_LABEL[s]}</span><b>{counts[s] || 0}</b></button>)}
            </div>
            <div className="tp-toolbar"><input className="tp-search" placeholder="Search name, skills, degree, role, location" value={q} onChange={e => setQ(e.target.value)} /></div>
            <div className="tp-card tp-table-wrap">
              {!rows ? <div className="tp-empty">Loading…</div> : shown.length === 0 ? <div className="tp-empty">{rows.length ? 'No candidates match.' : 'No candidates have been shared with you yet.'}</div> : (
                <table className="tp-table">
                  <thead><tr><th>Candidate</th><th>Contact</th><th>10th</th><th>12th</th><th>Graduation</th><th>Expected role</th><th>Resume</th><th>Status</th></tr></thead>
                  <tbody>{shown.map(r => (
                    <tr key={r.shareId} className="tp-click" onClick={() => setOpen(r.shareId)}>
                      <td><b>{r.fullName}</b><small>{[r.gender, r.city].filter(Boolean).join(' · ')}</small></td>
                      <td>{r.phone || '—'}<small>{r.email}</small></td>
                      <td>{r.tenthPercent != null ? `${r.tenthPercent}%` : '—'}<small>{r.tenthYear || ''}</small></td>
                      <td>{r.twelfthPercent != null ? `${r.twelfthPercent}%` : '—'}<small>{r.twelfthYear || ''}</small></td>
                      <td>{[r.degree, r.branch].filter(Boolean).join(' · ') || '—'}<small>{r.graduationYear || ''}{r.graduationPercent != null ? ` · ${r.graduationPercent}%` : ''}</small></td>
                      <td>{r.expectedRole || '—'}<small>{r.preferredLocation}</small></td>
                      <td onClick={e => e.stopPropagation()}>{r.resumeUrl ? <a className="tp-link" href={r.resumeUrl} target="_blank" rel="noreferrer">Open</a> : '—'}</td>
                      <td><StatusPill s={r.status} /></td>
                    </tr>
                  ))}</tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      </div>
      {open && <Detail shareId={open} onClose={() => setOpen(null)} onSaved={r => setRows(rs => (rs || []).map(x => (x.shareId === open ? { ...x, ...r } : x)))} />}
    </div>
  );
};

export default TalentPortal;
