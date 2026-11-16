import React, { useEffect, useState } from 'react';
import { talentPortalApi, Opening, Company, OpeningStatus } from '../../api/talentPoolApi';
import { PageHead, Stat, Empty } from './ui';
import { OpeningForm } from './forms';
import { OpeningCard, SendTarget } from './Companies';

/** Every job across the office's companies. */
const Openings: React.FC<{ companies: Company[]; refreshKey: number; onChanged: () => void; onSend: (t: SendTarget) => void; onAddCompany: () => void }> = ({ companies, refreshKey, onChanged, onSend, onAddCompany }) => {
  const [rows, setRows] = useState<Opening[] | null>(null);
  const [err, setErr] = useState('');
  const [q, setQ] = useState('');
  const [status, setStatus] = useState<OpeningStatus | ''>('open');
  const [companyId, setCompanyId] = useState('');
  const [edit, setEdit] = useState<Partial<Opening> | null>(null);
  const load = () => talentPortalApi.openings().then(setRows).catch(e => { setRows([]); setErr(e.message); });
  useEffect(() => { load(); }, [refreshKey]);
  const all = rows || [];
  const count = (s: OpeningStatus) => all.filter(o => o.status === s).length;
  const positions = all.filter(o => o.status === 'open').reduce((n, o) => n + (o.positions || 0), 0);
  const shown = all.filter(o => (!status || o.status === status) && (!companyId || o.companyId === companyId)
    && (!q || `${o.title} ${o.companyName} ${o.location || ''} ${o.skills || ''}`.toLowerCase().includes(q.toLowerCase())));
  const del = async (o: Opening) => {
    if (!window.confirm(`Delete the opening "${o.title}"? Candidates sent to it are removed from the company.`)) return;
    try { await talentPortalApi.deleteOpening(o._id); load(); onChanged(); } catch (e: any) { setErr(e.message); }
  };
  return (
    <>
      <PageHead icon="fa-briefcase" title="Openings" sub="Jobs at your companies — JD, openings, experience, salary, bond, location and interview process.">
        <button className="tpo-btn primary" onClick={() => (companies.length ? setEdit({ companyId: companyId || undefined }) : onAddCompany())}><i className="fa-solid fa-plus" /> Add opening</button>
      </PageHead>
      {err && <div className="tp-err">{err}</div>}
      <div className="tpo-stats">
        <Stat icon="fa-briefcase" tone="green" label="Open" value={count('open')} sub={`${positions} position${positions === 1 ? '' : 's'}`} on={status === 'open'} onClick={() => setStatus('open')} />
        <Stat icon="fa-circle-pause" tone="amber" label="On hold" value={count('on_hold')} on={status === 'on_hold'} onClick={() => setStatus('on_hold')} />
        <Stat icon="fa-lock" tone="grey" label="Closed" value={count('closed')} on={status === 'closed'} onClick={() => setStatus('closed')} />
        <Stat icon="fa-layer-group" tone="violet" label="All" value={all.length} on={!status} onClick={() => setStatus('')} />
      </div>
      <div className="tpo-card tpo-filters">
        <div className="tpo-search"><i className="fa-solid fa-magnifying-glass" /><input placeholder="Search job, company, location, skills…" value={q} onChange={e => setQ(e.target.value)} /></div>
        <span className="tpo-spacer" />
        <select value={companyId} onChange={e => setCompanyId(e.target.value)}><option value="">All companies</option>{companies.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}</select>
      </div>
      {!rows ? <div className="tp-empty">Loading…</div> : !shown.length ? (
        <div className="tpo-card">{all.length ? <Empty icon="fa-filter" title="No openings match" /> : <Empty icon="fa-briefcase" title="No openings yet" text={companies.length ? 'Add a job a company is hiring for.' : 'Add a company first, then its openings.'} action={<button className="tpo-btn primary" onClick={() => (companies.length ? setEdit({}) : onAddCompany())}><i className="fa-solid fa-plus" /> {companies.length ? 'Add opening' : 'Add company'}</button>} />}</div>
      ) : (
        <div className="tpo-cards" style={{ gridTemplateColumns: 'repeat(auto-fill,minmax(360px,1fr))' }}>
          {shown.map(o => <div key={o._id} className="tpo-card" style={{ padding: 0, border: 0 }}><OpeningCard o={o} showCompany onEdit={() => setEdit(o)} onDelete={() => del(o)} onSend={() => onSend({ companyId: o.companyId, openingId: o._id })} /></div>)}
        </div>
      )}
      {edit && <OpeningForm initial={edit} companies={companies} onClose={() => setEdit(null)} onSaved={() => { setEdit(null); load(); onChanged(); }} />}
    </>
  );
};

export default Openings;
