import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { problemSetAdminApi, ProblemSetAdmin } from '../../api/problemSetApi';
import { pbError } from '../../api/problemBankApi';
import { relTime } from './shared';
import './ProblemBank.css';

/** Tabs shared by the Problem Bank's two admin pages. */
export const BankTabs: React.FC<{ active: 'problems' | 'sets' }> = ({ active }) => {
  const nav = useNavigate();
  return (
    <div className="pb-tabs" style={{ padding: 0, background: 'transparent', marginBottom: 16 }}>
      <button className={active === 'problems' ? 'on' : ''} onClick={() => nav('/problem-bank')}><i className="fa-solid fa-code" /> Problems</button>
      <button className={active === 'sets' ? 'on' : ''} onClick={() => nav('/problem-bank/sets')}><i className="fa-solid fa-layer-group" /> Problem sets</button>
    </div>
  );
};

const statusPill = (s: string) => (
  <span className={`pb-pill ${s === 'published' ? 'pb-badge-ok' : s === 'closed' ? 'pb-badge-warn' : 'pb-badge-neutral'}`}><span className="pb-dot" /> {s[0].toUpperCase() + s.slice(1)}</span>
);

/**
 * Problem sets — how bank problems reach learners. A set is a delivery (which problems, for
 * whom, when, worth what); the problems themselves stay in the bank.
 */
const ProblemSets: React.FC = () => {
  const nav = useNavigate();
  const [rows, setRows] = useState<ProblemSetAdmin[] | null>(null);
  const [err, setErr] = useState('');
  useEffect(() => { problemSetAdminApi.list().then(setRows).catch((e) => setErr(pbError(e))); }, []);

  return (
    <div className="pb-root">
      <div className="pb-page">
        <div className="pb-head">
          <div className="pb-grow">
            <h1>Problem Bank</h1>
            <p>Group problems into sets and assign them to batches, individual students or CareerPilot members — with an opening date, a due date and a live progress report.</p>
          </div>
          <button className="pb-btn pb-btn-primary" onClick={() => nav('/problem-bank/sets/new')}><i className="fa-solid fa-plus" /> New problem set</button>
        </div>
        <BankTabs active="sets" />
        {err && <div className="pb-alert pb-alert-bad">{err}</div>}
        {!rows ? <div className="pb-muted"><span className="pb-spinner" /> Loading…</div> : !rows.length ? (
          <div className="pb-card pb-empty">
            <h2>No problem sets yet</h2>
            <p className="pb-muted">A set is a list of bank problems given to a batch (like a weekly DSA assignment) or to CareerPilot members as a practice track.</p>
            <button className="pb-btn pb-btn-primary" style={{ marginTop: 12 }} onClick={() => nav('/problem-bank/sets/new')}><i className="fa-solid fa-plus" /> Create the first set</button>
          </div>
        ) : (
          <div className="pb-card pb-table-wrap">
            <table className="pb-table">
              <thead><tr><th>Set</th><th>Problems</th><th>For</th><th>Opens</th><th>Due</th><th>Learners</th><th>Status</th><th>Updated</th></tr></thead>
              <tbody>
                {rows.map((s) => (
                  <tr key={s._id} onClick={() => nav(`/problem-bank/sets/${s._id}`)}>
                    <td className="pb-title-cell"><div className="t">{s.title}</div>
                      <div className="sub"><span className="pb-tag">{s.kind === 'practice' ? 'Practice track' : 'Assignment'}</span></div></td>
                    <td>{s.problemCount}</td>
                    <td style={{ maxWidth: 260 }}>{s.audience.length ? s.audience.map((a) => <span key={`${a.type}${a.id}`} className="pb-tag" style={{ margin: '0 4px 4px 0' }}>{a.name}</span>) : <span className="pb-faint">No one yet</span>}</td>
                    <td className="pb-muted">{s.opensAt ? new Date(s.opensAt).toLocaleString() : 'Immediately'}</td>
                    <td className="pb-muted">{s.dueAt ? new Date(s.dueAt).toLocaleString() : '—'}</td>
                    <td className="pb-muted">{s.learners || 0} <span className="pb-faint">· {s.submissions || 0} subs</span></td>
                    <td>{statusPill(s.status)}</td>
                    <td className="pb-muted">{relTime(s.updatedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProblemSets;
