import React, { useEffect, useState } from 'react';
import { talentPoolApi, Partner, Workspace, SUB_LABEL, STAGE_LABEL } from '../../api/talentPoolApi';
import { fmtDate } from './shared';
import { Stat, StagePill, Empty, dueText, isOverdue } from '../TalentPortal/ui';
import { OpeningCard } from '../TalentPortal/Companies';
import { SubmissionTable } from '../TalentPortal/Submissions';
import { Funnel } from '../TalentPortal/Dashboard';
import '../TalentPortal/portal.css';

/**
 * What one office is doing with its own companies — read only. The office owns this data;
 * the institute watches it here and never edits it.
 */
type Tab = 'overview' | 'companies' | 'openings' | 'sent';
const OfficeWorkspace: React.FC<{ partner: Partner; onClose: () => void }> = ({ partner, onClose }) => {
  const [w, setW] = useState<Workspace | null>(null);
  const [err, setErr] = useState('');
  const [tab, setTab] = useState<Tab>('overview');
  const [company, setCompany] = useState('');
  useEffect(() => { talentPoolApi.workspace(partner._id).then(setW).catch(e => setErr(e.message)); }, [partner._id]);
  const s = w?.summary;
  const total = (o: Record<string, number | undefined> = {}) => Object.values(o).reduce((a: number, b) => a + (b || 0), 0);
  const subs = (w?.submissions || []).filter(x => !company || x.companyId === company);
  return (
    <div className="tp-overlay" onClick={onClose}>
      <div className="tp-panel wide" onClick={e => e.stopPropagation()}>
        <div className="tp-panel-head">
          <div><h3>{partner.name} — workspace</h3><p>The companies, openings and candidates this office is working on. View only: the office keeps this up to date.</p></div>
          <button className="tp-x" onClick={onClose}>×</button>
        </div>
        {err && <div className="tp-err">{err}</div>}
        {!w || !s ? <div className="tp-empty">Loading…</div> : <>
          <div className="tpo-tabs">
            <button className={tab === 'overview' ? 'on' : ''} onClick={() => setTab('overview')}>Overview</button>
            <button className={tab === 'companies' ? 'on' : ''} onClick={() => setTab('companies')}>Companies <span className="n">{w.companies.length}</span></button>
            <button className={tab === 'openings' ? 'on' : ''} onClick={() => setTab('openings')}>Openings <span className="n">{w.openings.length}</span></button>
            <button className={tab === 'sent' ? 'on' : ''} onClick={() => setTab('sent')}>Candidates sent <span className="n">{w.submissions.length}</span></button>
          </div>

          {tab === 'overview' && <>
            <div className="tpo-stats">
              <Stat icon="fa-building" tone="blue" label="Companies" value={s.companies.total} sub={`${s.companies.byStage.active || 0} hiring`} />
              <Stat icon="fa-briefcase" tone="green" label="Open positions" value={s.openings.positions} sub={`${s.openings.open} openings`} />
              <Stat icon="fa-paper-plane" tone="amber" label="Sent" value={total(s.submissions as any)} />
              <Stat icon="fa-calendar-days" tone="pink" label="Interview" value={s.submissions.interview || 0} />
              <Stat icon="fa-circle-check" tone="green" label="Selected / joined" value={(s.submissions.selected || 0) + (s.submissions.offered || 0) + (s.submissions.joined || 0)} />
              <Stat icon="fa-bell" tone={s.followUpsDueCount ? 'red' : 'grey'} label="Follow-ups due" value={s.followUpsDueCount} />
            </div>
            <div className="tpo-card">
              <h3>At companies</h3>
              {total(s.submissions as any) ? <Funnel data={s.submissions} keys={['sent', 'shortlisted', 'interview', 'selected', 'offered', 'joined', 'rejected']} labels={SUB_LABEL} /> : <p className="tp-hint">This office has not sent any candidates to a company yet.</p>}
            </div>
          </>}

          {tab === 'companies' && (!w.companies.length ? <Empty icon="fa-building" title="No companies yet" text="The office has not added any companies." /> : (
            <div className="tp-card tp-table-wrap">
              <table className="tp-table">
                <thead><tr><th>Company</th><th>Stage</th><th>Contact</th><th>Open positions</th><th>Sent</th><th>Selected</th><th>Next follow-up</th><th /></tr></thead>
                <tbody>{w.companies.map(c => (
                  <tr key={c._id}>
                    <td><b>{c.name}</b><small>{[c.industry, c.location].filter(Boolean).join(' · ')}</small></td>
                    <td><StagePill s={c.stage} /></td>
                    <td>{c.contactName || '—'}<small>{[c.contactPhone, c.contactEmail].filter(Boolean).join(' · ')}</small></td>
                    <td>{c.stats?.positions || 0}</td>
                    <td>{c.stats?.sent || 0}</td>
                    <td>{(c.stats?.byStatus.selected || 0) + (c.stats?.byStatus.offered || 0) + (c.stats?.byStatus.joined || 0)}</td>
                    <td>{c.nextFollowUpAt ? <span className={`tpo-due ${isOverdue(c.nextFollowUpAt) ? 'late' : ''}`}>{dueText(c.nextFollowUpAt)}</span> : '—'}{c.notes && <small title={c.notes}>Notes: {c.notes.slice(0, 60)}{c.notes.length > 60 ? '…' : ''}</small>}</td>
                    <td><button className="tp-link" onClick={() => { setCompany(c._id); setTab('sent'); }}>Candidates</button></td>
                  </tr>
                ))}</tbody>
              </table>
              <p className="tp-hint" style={{ marginTop: 8 }}>Stages: {Object.values(STAGE_LABEL).join(' → ')}. Updated {fmtDate(w.companies[0]?.updatedAt)}.</p>
            </div>
          ))}

          {tab === 'openings' && (!w.openings.length ? <Empty icon="fa-briefcase" title="No openings yet" /> :
            <div className="tpo-cards" style={{ gridTemplateColumns: 'repeat(auto-fill,minmax(320px,1fr))' }}>{w.openings.map(o => <OpeningCard key={o._id} o={o} showCompany readOnly />)}</div>)}

          {tab === 'sent' && <>
            <div className="tp-toolbar">
              <select value={company} onChange={e => setCompany(e.target.value)}><option value="">All companies</option>{w.companies.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}</select>
            </div>
            <div className="tpo-card"><SubmissionTable rows={subs} readOnly /></div>
          </>}
        </>}
      </div>
    </div>
  );
};

export default OfficeWorkspace;
