import React, { useCallback, useEffect, useState } from 'react';
import { workflowApi, Run } from '../../api/workflowApi';
import { STEPS } from './meta';

/** Who is in which workflow, where they are, and what happened — with Stop / Continue now. */
const fmt = (d?: string | null) => (d ? new Date(d).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }) : '');
const STATUS_LABEL: Record<Run['status'], string> = { running: 'Running', waiting: 'Waiting', completed: 'Completed', stopped: 'Stopped', failed: 'Failed' };

export function whereText(r: Run): string {
  if (r.status !== 'waiting' && r.status !== 'running') return r.endReason || STATUS_LABEL[r.status];
  const step = r.currentStep ? `Step ${r.currentStep.number} · ${STEPS[r.currentStep.type]?.label || r.currentStep.type}` : '';
  if (r.waitingFor === 'reply') return `${step} — waiting for their reply${r.resumeAt ? ` (until ${fmt(r.resumeAt)})` : ''}`;
  if (r.waitingFor === 'time') return `${step} — next at ${fmt(r.resumeAt)}`;
  return step || 'Running';
}

const Runs: React.FC<{ workflowId?: string; compact?: boolean }> = ({ workflowId, compact }) => {
  const [status, setStatus] = useState('live');
  const [rows, setRows] = useState<Run[] | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [err, setErr] = useState('');
  const load = useCallback(() => {
    setErr('');
    workflowApi.runs({ workflowId, status: status === 'all' ? undefined : status, limit: 100 }).then(setRows).catch(e => { setRows([]); setErr(e.message); });
  }, [workflowId, status]);
  useEffect(() => { load(); }, [load]);

  const act = async (fn: () => Promise<any>) => { try { await fn(); load(); } catch (e: any) { setErr(e.message); } };

  return (
    <div>
      <div className="wf-row" style={{ marginBottom: 10 }}>
        <div className="wf-chips" style={{ marginTop: 0 }}>
          {[['live', 'In progress'], ['completed', 'Completed'], ['stopped', 'Stopped'], ['failed', 'Failed'], ['all', 'All']].map(([v, l]) => (
            <button key={v} className={`wf-chip ${status === v ? 'on' : ''}`} onClick={() => setStatus(v)}>{l}</button>
          ))}
        </div>
        <span className="wf-spacer" />
        <button className="wf-btn sm" onClick={load}><i className="fa-solid fa-rotate" /> Refresh</button>
      </div>
      {err && <div className="wf-err">{err}</div>}
      {!rows ? <p className="wf-muted">Loading…</p> : !rows.length ? (
        <p className="wf-muted" style={{ padding: '20px 0' }}>{status === 'live' ? 'Nobody is in a workflow right now.' : 'No runs here yet.'}</p>
      ) : (
        <div className="wf-card" style={{ overflow: 'hidden' }}>
          <table className="wf-table">
            <thead><tr><th>Person</th>{!workflowId && <th>Workflow</th>}<th>Status</th><th>Where</th>{!compact && <th>Started</th>}<th /></tr></thead>
            <tbody>
              {rows.map(r => (
                <React.Fragment key={r._id}>
                  <tr className="click" onClick={() => setOpen(o => (o === r._id ? null : r._id))}>
                    <td><div className="wf-name">{r.lead?.name || `+${r.phone}`}{r.test && <span className="wf-pill draft" style={{ marginLeft: 6 }}>test</span>}</div><div className="wf-small wf-muted">{r.lead?.phone || r.phone}</div></td>
                    {!workflowId && <td>{r.workflowName}</td>}
                    <td><span className={`wf-pill ${r.status}`}>{STATUS_LABEL[r.status]}</span></td>
                    <td className="wf-small">{whereText(r)}</td>
                    {!compact && <td className="wf-small wf-muted">{fmt(r.createdAt)}</td>}
                    <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }} onClick={e => e.stopPropagation()}>
                      {r.status === 'waiting' && r.waitingFor === 'time' && <button className="wf-btn sm ghost" title="Do the next step now" onClick={() => act(() => workflowApi.continueRun(r._id))}><i className="fa-solid fa-forward" /></button>}
                      {(r.status === 'waiting' || r.status === 'running') && <button className="wf-btn sm ghost danger" onClick={() => { if (window.confirm('Stop this run? Nothing more will be sent to this person by this workflow.')) act(() => workflowApi.stopRun(r._id)); }}>Stop</button>}
                    </td>
                  </tr>
                  {open === r._id && (
                    <tr><td colSpan={workflowId ? 5 : 6} style={{ background: '#FAFBFF' }}>
                      {!!Object.keys(r.answers || {}).length && <div className="wf-answers">{Object.entries(r.answers).map(([k, v]) => <span key={k}><b>{k}:</b> {v || '—'}</span>)}</div>}
                      <ul className="wf-log">
                        {r.log.map((l, i) => <li key={i} className={l.ok ? '' : 'bad'}><time>{fmt(l.at)}</time>{l.note}</li>)}
                      </ul>
                      {r.lead && <a className="wf-small" href={`/leads/${r.lead._id}`}>Open lead →</a>}
                    </td></tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default Runs;
