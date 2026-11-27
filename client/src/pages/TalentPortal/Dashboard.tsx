import React, { useEffect, useState } from 'react';
import { talentPortalApi, PortalDashboard, SUB_LABEL, SubStatus, STATUS_LABEL, TalentStatus } from '../../api/talentPoolApi';
import { PageHead, Stat, SubPill, Avatar, Empty, dueText, fmtDateTime } from './ui';

export type View = 'dashboard' | 'candidates' | 'shortlist' | 'interviews' | 'companies' | 'openings' | 'submissions' | 'followups';

/** Funnel bars: how many candidates reached each stage. */
export const Funnel: React.FC<{ data: Partial<Record<string, number>>; keys: string[]; labels: Record<string, string> }> = ({ data, keys, labels }) => {
  const max = Math.max(1, ...keys.map(k => data[k] || 0));
  return (
    <div className="tpo-funnel">
      {keys.map(k => (
        <div key={k} className="tpo-funnel-row"><span>{labels[k]}</span><div className="tpo-funnel-bar"><span style={{ width: `${((data[k] || 0) / max) * 100}%` }} /></div><b>{data[k] || 0}</b></div>
      ))}
    </div>
  );
};

const Dashboard: React.FC<{ officeName: string; contactName?: string; go: (v: View) => void; onOpenCompany: (id: string) => void; onOpenCandidate: (shareId: string) => void; refreshKey: number }> = ({ officeName, contactName, go, onOpenCompany, onOpenCandidate, refreshKey }) => {
  const [d, setD] = useState<PortalDashboard | null>(null);
  const [err, setErr] = useState('');
  useEffect(() => { talentPortalApi.dashboard().then(setD).catch(e => setErr(e.message)); }, [refreshKey]);
  const total = (o: Partial<Record<string, number>>) => Object.values(o || {}).reduce((a: number, b) => a + (b || 0), 0);
  const placed = d ? (d.submissions.selected || 0) + (d.submissions.offered || 0) + (d.submissions.joined || 0) : 0;
  const hour = new Date().getHours();
  return (
    <>
      <PageHead icon="fa-gauge-high" title={`Good ${hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening'}${contactName ? `, ${contactName.split(' ')[0]}` : ''}`} sub={`Here is where things stand at ${officeName}.`} />
      {err && <div className="tp-err">{err}</div>}
      {!d ? <div className="tp-empty">Loading…</div> : <>
        <div className="tpo-stats">
          <Stat icon="fa-users" tone="violet" label="Candidates" value={total(d.candidates)} sub={`${d.candidates.shared || 0} new`} onClick={() => go('candidates')} />
          <Stat icon="fa-building" tone="blue" label="Companies" value={d.companies.total} sub={`${d.companies.byStage.active || 0} hiring`} onClick={() => go('companies')} />
          <Stat icon="fa-briefcase" tone="green" label="Open positions" value={d.openings.positions} sub={`${d.openings.open} opening${d.openings.open === 1 ? '' : 's'}`} onClick={() => go('openings')} />
          <Stat icon="fa-paper-plane" tone="amber" label="Sent to companies" value={total(d.submissions)} onClick={() => go('submissions')} />
          <Stat icon="fa-calendar-days" tone="pink" label="In interview" value={d.submissions.interview || 0} onClick={() => go('submissions')} />
          <Stat icon="fa-circle-check" tone="green" label="Selected" value={placed} onClick={() => go('submissions')} />
          <Stat icon="fa-bell" tone={d.followUpsDueCount ? 'red' : 'grey'} label="Follow-ups due" value={d.followUpsDueCount} onClick={() => go('followups')} />
        </div>

        <div className="tpo-grid2">
          <div className="tpo-card">
            <h3><i className="fa-solid fa-bell" style={{ color: '#DC2626' }} /> Follow-ups due <span className="tp-spacer" /><button className="tpo-reset" onClick={() => go('followups')}>All follow-ups</button></h3>
            {!d.followUpsDue.length ? <p className="tp-hint">Nothing due today. 🎉</p> : (
              <ul className="tpo-list">{d.followUpsDue.map(f => (
                <li key={f._id}>
                  <span className="tpo-logo" style={{ width: 34, height: 34, fontSize: 12 }}>{f.companyName.slice(0, 2).toUpperCase()}</span>
                  <div className="grow"><b>{f.companyName}</b><small>{f.note || 'Follow up'}</small></div>
                  <span className={`tpo-due ${f.overdue ? 'late' : ''}`}>{dueText(f.dueAt)}</span>
                  <button className="tpo-btn sm" onClick={() => onOpenCompany(f.companyId)}>Open</button>
                </li>
              ))}</ul>
            )}
          </div>

          <div className="tpo-card">
            <h3><i className="fa-solid fa-calendar-days" style={{ color: '#7C3AED' }} /> Upcoming interviews</h3>
            {!d.upcomingInterviews?.length ? <p className="tp-hint">No interviews scheduled. Set the interview time when you move a candidate to Interview.</p> : (
              <ul className="tpo-list">{d.upcomingInterviews.map(s => (
                <li key={s._id}>
                  <Avatar small name={s.fullName} />
                  <div className="grow"><b>{s.fullName}</b><small>{s.companyName}{s.openingTitle ? ` — ${s.openingTitle}` : ''}</small></div>
                  <span className="tpo-due">{fmtDateTime(s.interviewAt)}</span>
                </li>
              ))}</ul>
            )}
          </div>

          <div className="tpo-card">
            <h3><i className="fa-solid fa-filter" style={{ color: '#4F46E5' }} /> At companies</h3>
            {total(d.submissions) ? <Funnel data={d.submissions} keys={['sent', 'shortlisted', 'interview', 'selected', 'offered', 'joined', 'rejected']} labels={SUB_LABEL} />
              : <Empty icon="fa-paper-plane" title="Nothing sent yet" text="Shortlist candidates, then send them to a company." action={<button className="tpo-btn primary sm" onClick={() => go('candidates')}>Go to candidates</button>} />}
          </div>

          <div className="tpo-card">
            <h3><i className="fa-solid fa-users" style={{ color: '#0284C7' }} /> Your candidates</h3>
            <Funnel data={d.candidates} keys={['shared', 'viewed', 'shortlisted', 'interview', 'selected', 'rejected', 'on_hold']} labels={STATUS_LABEL as Record<TalentStatus, string>} />
          </div>
        </div>

        <div className="tpo-card">
          <h3><i className="fa-solid fa-clock-rotate-left" style={{ color: '#64748B' }} /> Recent activity <span className="tp-spacer" /><button className="tpo-reset" onClick={() => go('submissions')}>See all</button></h3>
          {!d.recent?.length ? <p className="tp-hint">No activity yet.</p> : (
            <ul className="tpo-list">{d.recent.map(s => (
              <li key={s._id}>
                <Avatar small name={s.fullName} />
                <div className="grow"><b><button className="tpo-link" style={{ textDecoration: 'none' }} onClick={() => onOpenCandidate(s.shareId)}>{s.fullName}</button></b><small>{s.companyName}{s.openingTitle ? ` — ${s.openingTitle}` : ''}{s.note ? ` · ${s.note}` : ''}</small></div>
                <SubPill s={s.status as SubStatus} />
              </li>
            ))}</ul>
          )}
        </div>
      </>}
    </>
  );
};

export default Dashboard;
