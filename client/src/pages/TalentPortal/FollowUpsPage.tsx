import React, { useEffect, useState } from 'react';
import { talentPortalApi, FollowUpRow } from '../../api/talentPoolApi';
import { fmtDate } from '../TalentPool/shared';
import { PageHead, Stat, Empty, StagePill, dueText, isOverdue } from './ui';

/** Every open follow-up across the office's companies: overdue, today, upcoming. */
const FollowUpsPage: React.FC<{ refreshKey: number; onOpenCompany: (id: string) => void; onChanged: () => void }> = ({ refreshKey, onOpenCompany, onChanged }) => {
  const [rows, setRows] = useState<FollowUpRow[] | null>(null);
  const [showDone, setShowDone] = useState(false);
  const [err, setErr] = useState('');
  const load = () => talentPortalApi.followUps(showDone).then(setRows).catch(e => { setRows([]); setErr(e.message); });
  useEffect(() => { load(); }, [refreshKey, showDone]); // eslint-disable-line react-hooks/exhaustive-deps
  const today = new Date(); today.setHours(23, 59, 59, 999);
  const open = (rows || []).filter(r => !r.done);
  const overdue = open.filter(r => isOverdue(r.dueAt));
  const dueToday = open.filter(r => !isOverdue(r.dueAt) && new Date(r.dueAt) <= today);
  const later = open.filter(r => new Date(r.dueAt) > today);
  const done = (rows || []).filter(r => r.done);
  const complete = async (r: FollowUpRow) => {
    const outcome = r.done ? undefined : window.prompt('What happened? (optional)', '');
    if (outcome === null) return;
    try { await talentPortalApi.updateFollowUp(r.companyId, r._id, { done: !r.done, ...(outcome !== undefined ? { outcome } : {}) }); load(); onChanged(); } catch (e: any) { setErr(e.message); }
  };
  const Group: React.FC<{ title: string; list: FollowUpRow[]; tone?: string }> = ({ title, list, tone }) => (!list.length ? null : (
    <div className="tpo-card">
      <h3 style={tone ? { color: tone } : undefined}>{title} <span className="tp-pill grey">{list.length}</span></h3>
      {list.map(r => (
        <div key={r._id} className={`tpo-fu ${r.done ? 'done' : ''}`}>
          <input type="checkbox" checked={r.done} onChange={() => complete(r)} aria-label="Done" />
          <div className="grow">
            <span className={`tpo-due ${!r.done && isOverdue(r.dueAt) ? 'late' : ''}`}>{r.done ? `Done ${fmtDate(r.doneAt)}` : dueText(r.dueAt)} · {fmtDate(r.dueAt)}</span>
            <p><button className="tpo-link" style={{ textDecoration: 'none' }} onClick={() => onOpenCompany(r.companyId)}>{r.companyName}</button> — {r.note || 'Follow up'}</p>
            <small className="tp-hint">{[r.contactName, r.contactPhone, r.contactEmail].filter(Boolean).join(' · ')}{r.outcome ? ` · Outcome: ${r.outcome}` : ''}</small>
          </div>
          <StagePill s={r.stage} />
          {r.contactPhone && <a className="tpo-btn sm" href={`tel:${r.contactPhone}`}><i className="fa-solid fa-phone" /></a>}
        </div>
      ))}
    </div>
  ));
  return (
    <>
      <PageHead icon="fa-bell" title="Follow-ups" sub="Calls and emails you planned with companies. Tick one off when it is done.">
        <button className="tpo-btn" onClick={() => setShowDone(s => !s)}>{showDone ? 'Hide done' : 'Show done'}</button>
      </PageHead>
      {err && <div className="tp-err">{err}</div>}
      <div className="tpo-stats">
        <Stat icon="fa-triangle-exclamation" tone="red" label="Overdue" value={overdue.length} />
        <Stat icon="fa-calendar-day" tone="amber" label="Today" value={dueToday.length} />
        <Stat icon="fa-calendar-week" tone="blue" label="Upcoming" value={later.length} />
      </div>
      {!rows ? <div className="tp-empty">Loading…</div> : !open.length && !done.length ? (
        <div className="tpo-card"><Empty icon="fa-bell" title="No follow-ups" text="Open a company and add a follow-up — a date and what to do. It shows up here and on your dashboard when it is due." /></div>
      ) : <>
        <Group title="Overdue" list={overdue} tone="#DC2626" />
        <Group title="Today" list={dueToday} />
        <Group title="Upcoming" list={later} />
        {showDone && <Group title="Done" list={done} />}
      </>}
    </>
  );
};

export default FollowUpsPage;
