import React, { useCallback, useEffect, useState } from 'react';
import { workflowApi, Run, RunSummary } from '../../api/workflowApi';
import { STEPS } from './meta';
import './workflowsHome.css';

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

const FILTERS: [string, string][] = [['live', 'In Progress'], ['completed', 'Completed'], ['stopped', 'Stopped'], ['failed', 'Failed'], ['all', 'All']];
const PERIODS: [number, string][] = [[1, 'Today'], [7, 'Last 7 days'], [30, 'Last 30 days'], [90, 'Last 90 days'], [0, 'All time']];
const EMPTY: Record<string, [string, string]> = {
  live: ['No runs in progress', 'Nobody is in a workflow right now.'],
  completed: ['No completed runs', 'Nobody finished a workflow in this period.'],
  stopped: ['No stopped runs', 'No workflow was stopped in this period.'],
  failed: ['No failed runs', 'Nothing went wrong in this period.'],
  all: ['No runs yet', 'Nobody has gone through a workflow in this period.'],
};

export const StatCard: React.FC<{ tone: string; icon: string; label: string; value: React.ReactNode }> = ({ tone, icon, label, value }) => (
  <div className={`wf-stat ${tone}`}>
    <span className="wf-stat-ico"><i className={icon.includes(' ') ? icon : `fa-solid ${icon}`} /></span>
    <span><span className="wf-stat-label">{label}</span><b className="wf-stat-value">{value}</b></span>
  </div>
);

const Runs: React.FC<{ workflowId?: string; compact?: boolean; onStart?: () => void; onGoWorkflows?: () => void }> = ({ workflowId, compact, onStart, onGoWorkflows }) => {
  const [status, setStatus] = useState('live');
  const [days, setDays] = useState(compact ? 0 : 7);
  const [rows, setRows] = useState<Run[] | null>(null);
  const [sum, setSum] = useState<RunSummary | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [err, setErr] = useState('');
  const load = useCallback(() => {
    setErr('');
    workflowApi.runs({ workflowId, status: status === 'all' ? undefined : status, limit: 100, days: days || undefined }).then(setRows).catch(e => { setRows([]); setErr(e.message); });
    if (!compact) workflowApi.runsSummary({ workflowId, days: days || undefined }).then(setSum).catch(() => undefined);
  }, [workflowId, status, days, compact]);
  useEffect(() => { load(); }, [load]);

  const act = async (fn: () => Promise<any>) => { try { await fn(); load(); } catch (e: any) { setErr(e.message); } };
  const [title, line] = EMPTY[status] || EMPTY.all;

  return (
    <div>
      {!compact && (
        <div className="wf-stats five">
          <StatCard tone="blue" icon="fa-play" label="In Progress" value={sum?.live ?? '–'} />
          <StatCard tone="green" icon="fa-check" label="Completed" value={sum?.completed ?? '–'} />
          <StatCard tone="amber" icon="fa-pause" label="Stopped" value={sum?.stopped ?? '–'} />
          <StatCard tone="red" icon="fa-xmark" label="Failed" value={sum?.failed ?? '–'} />
          <StatCard tone="plain" icon="fa-layer-group" label="Total Runs" value={sum?.total ?? '–'} />
        </div>
      )}
      <div className="wf-row" style={{ margin: compact ? '0 0 10px' : '4px 0 14px' }}>
        <div className="wf-seg">
          {FILTERS.map(([v, l]) => (
            <button key={v} className={status === v ? 'on' : ''} onClick={() => setStatus(v)}>{l}</button>
          ))}
        </div>
        <span className="wf-spacer" />
        {!compact && (
          <label className="wf-period">
            <i className="fa-regular fa-calendar" />
            <select value={days} onChange={e => setDays(Number(e.target.value))} aria-label="Period">
              {PERIODS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </label>
        )}
        <button className="wf-btn" onClick={load}><i className="fa-solid fa-rotate" /> Refresh</button>
      </div>
      {err && <div className="wf-err">{err}</div>}
      {!rows ? <p className="wf-muted">Loading…</p> : !rows.length ? (
        compact ? <p className="wf-muted" style={{ padding: '20px 0' }}>{line}</p> : (
          <div className="wf-card wf-empty">
            <div className="wf-empty-art" aria-hidden>
              <span className="spark" />
              <div className="screen"><i className="fa-solid fa-play" /></div>
              <div className="base" />
              <span className="badge"><i className="fa-solid fa-diagram-project" /></span>
            </div>
            <h3>{title}</h3>
            <p>{line}</p>
            {onStart && <button className="wf-btn primary lg" onClick={onStart}><i className="fa-solid fa-play" /> Start a Workflow</button>}
            {onGoWorkflows && <button className="wf-link" onClick={onGoWorkflows}>Go to Workflows <i className="fa-solid fa-arrow-right" /></button>}
            <div className="wf-tip"><i className="fa-regular fa-lightbulb" /><span><b>Tip:</b> Create a workflow (e.g., demo reminder, follow-up sequence) and switch it on to see real-time progress here.</span></div>
          </div>
        )
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
                    <td><span className={`wf-pill dot ${r.status}`}>{STATUS_LABEL[r.status]}</span></td>
                    <td className="wf-small">{whereText(r)}</td>
                    {!compact && <td className="wf-small wf-muted">{fmt(r.createdAt)}</td>}
                    <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }} onClick={e => e.stopPropagation()}>
                      {r.status === 'waiting' && r.waitingFor === 'time' && <button className="wf-btn sm ghost" title="Do the next step now" onClick={() => act(() => workflowApi.continueRun(r._id))}><i className="fa-solid fa-forward" /></button>}
                      {(r.status === 'waiting' || r.status === 'running') && <button className="wf-btn sm ghost danger" onClick={() => { if (window.confirm('Stop this run? Nothing more will be sent to this person by this workflow.')) act(() => workflowApi.stopRun(r._id)); }}>Stop</button>}
                    </td>
                  </tr>
                  {open === r._id && (
                    <tr><td colSpan={(workflowId ? 4 : 5) + (compact ? 0 : 1)} style={{ background: '#FAFBFF' }}>
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
