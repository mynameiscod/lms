import React, { useEffect, useMemo, useState } from 'react';
import { Lab } from '../../api/labTrackApi';
import { Spinner } from '../../components/common';

/**
 * Who is actually doing the daily lab — one batch or every batch, over any date range.
 *
 * Students are sorted WORST FIRST by default, because the list exists to find the people who have
 * stopped. A day counts as done only when every question it holds was answered; a day with some of
 * them answered shows as "partly". "Expected" comes from each batch's own calendar, so a batch that
 * has had two holidays is not measured against one that has not. Click a student for their days.
 */

const base = () => (process.env.REACT_APP_API_URL || '/api/v1');
const headers = () => {
  const h: Record<string, string> = { 'Content-Type': 'application/json' };
  const t = localStorage.getItem('token'); if (t) h.Authorization = `Bearer ${t}`;
  const x = localStorage.getItem('tenantId'); if (x) h['X-Tenant-Id'] = x;
  return h;
};
async function get(path: string) {
  const r = await fetch(`${base()}${path}`, { headers: headers() });
  const b = await r.json().catch(() => ({}));
  if (!r.ok || b.success === false) throw new Error(b.message || 'Failed');
  return b.data;
}

/** 'YYYY-MM-DD' in IST, `back` days ago. */
const istDay = (back = 0) => new Date(Date.now() + 5.5 * 3600_000 - back * 86_400_000).toISOString().slice(0, 10);
const fmt = (d?: string | null) =>
  d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '—';
const fmtDay = (ymd: string) =>
  new Date(`${ymd}T00:00:00`).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });

type Status = '' | 'behind' | 'on_track' | 'done_today' | 'never';
type Sort = 'worst' | 'best' | 'name' | 'batch' | 'recent';
const STATUS: [Status, string][] = [['', 'All students'], ['behind', 'Behind'], ['on_track', 'On track'], ['done_today', 'Done today'], ['never', 'Never started']];
const RANGES: [string, number][] = [['Last 7 days', 6], ['Last 30 days', 29], ['Last 90 days', 89]];

const ProgressPanel: React.FC = () => {
  const [batches, setBatches] = useState<any[]>([]);
  const [batchId, setBatchId] = useState('all');
  const [lab, setLab] = useState<Lab>('thinking');
  const [from, setFrom] = useState(istDay(29));
  const [to, setTo] = useState(istDay(0));
  const [status, setStatus] = useState<Status>('');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<Sort>('worst');
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');
  const [open, setOpen] = useState<any>(null);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    fetch(`${base()}/batches`, { headers: headers() })
      .then(r => r.json())
      .then(b => {
        const list = b?.data?.batches || b?.batches || b?.data || [];
        setBatches(Array.isArray(list) ? list : []);
      })
      .catch(() => setBatches([]));
  }, []);

  const qs = useMemo(() => new URLSearchParams({ batchId, lab, from, to }).toString(), [batchId, lab, from, to]);
  useEffect(() => {
    if (!from || !to) return;
    setLoading(true); setErr('');
    get(`/lab-tracks/progress?${qs}`)
      .then(setData)
      .catch(e => { setErr(e.message); setData(null); })
      .finally(() => setLoading(false));
  }, [qs, from, to]);

  const all = batchId === 'all';
  const rows = useMemo(() => {
    const term = search.trim().toLowerCase();
    const list = (data?.students || []).filter((s: any) =>
      (!status || (status === 'behind' ? s.missed > 0 : status === 'on_track' ? s.missed === 0 : s.status === status))
      && (!term || s.name.toLowerCase().includes(term) || String(s.email || '').toLowerCase().includes(term)));
    const by: Record<Sort, (a: any, b: any) => number> = {
      worst: (a, b) => a.rate - b.rate || b.missed - a.missed || a.name.localeCompare(b.name),
      best: (a, b) => b.rate - a.rate || a.name.localeCompare(b.name),
      name: (a, b) => a.name.localeCompare(b.name),
      batch: (a, b) => a.batchName.localeCompare(b.batchName) || a.rate - b.rate,
      recent: (a, b) => (b.lastActivity ? Date.parse(b.lastActivity) : 0) - (a.lastActivity ? Date.parse(a.lastActivity) : 0),
    };
    return list.slice().sort(by[sort]);
  }, [data, status, search, sort]);

  const download = async () => {
    setDownloading(true); setErr('');
    try {
      const r = await fetch(`${base()}/lab-tracks/progress?${qs}&format=xlsx`, { headers: headers() });
      if (!r.ok) throw new Error('Could not build the Excel file');
      const url = URL.createObjectURL(await r.blob());
      const a = document.createElement('a');
      a.href = url; a.download = `${lab}-lab-progress-${from}-to-${to}.xlsx`; a.click();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
    } catch (e: any) { setErr(e.message); } finally { setDownloading(false); }
  };

  const labName = lab === 'thinking' ? 'Thinking' : 'Communication';
  const quick = (n: number) => { setFrom(istDay(n)); setTo(istDay(0)); };
  const activeQuick = to === istDay(0) ? RANGES.find(([, n]) => from === istDay(n))?.[0] : undefined;

  return (
    <div className="lt-assign">
      <div className="lt-form">
        <div className="lt-prog-head">
          <h4>Daily lab progress</h4>
          <button className="lt-btn" onClick={download} disabled={downloading || !data?.assigned}>
            <i className="bi bi-download" aria-hidden /> {downloading ? 'Preparing…' : 'Download Excel'}
          </button>
        </div>
        <div className="lt-form-grid lt-prog-filters">
          <label>Lab
            <select value={lab} onChange={e => setLab(e.target.value as Lab)}>
              <option value="thinking">Thinking Lab</option>
              <option value="communication">Communication Lab</option>
            </select>
          </label>
          <label>Batch
            <select value={batchId} onChange={e => setBatchId(e.target.value)}>
              <option value="all">All batches</option>
              {batches.map((b: any) => <option key={b._id} value={b._id}>{b.name}</option>)}
            </select>
          </label>
          <label>From
            <input type="date" value={from} max={to} onChange={e => setFrom(e.target.value)} />
          </label>
          <label>To
            <input type="date" value={to} min={from} max={istDay(0)} onChange={e => setTo(e.target.value)} />
          </label>
        </div>
        <div className="lt-quick" role="group" aria-label="Quick date ranges">
          {RANGES.map(([label, n]) => (
            <button key={label} className={activeQuick === label ? 'on' : ''} onClick={() => quick(n)}>{label}</button>
          ))}
        </div>
      </div>

      {err && <div className="lt-err">{err}</div>}
      {loading && <div className="lt-loading"><Spinner /></div>}

      {!loading && data && !data.assigned && (
        <p className="lt-hint">
          {all ? `No batch has a ${labName} track attached yet` : `No ${labName} track is attached to this batch`},
          so no daily challenge is being delivered and there is nothing to measure.
        </p>
      )}

      {!loading && data?.assigned && (
        <>
          <div className="lt-prog-cards">
            <div className="lt-pc"><span>Students</span><b>{data.summary.students}</b></div>
            <div className="lt-pc good"><span>Done today</span><b>{data.summary.doneToday}</b></div>
            <div className="lt-pc"><span>On track</span><b>{data.summary.onTrack}</b></div>
            <div className="lt-pc bad"><span>Behind</span><b>{data.summary.behind}</b></div>
            <div className="lt-pc"><span>Never started</span><b>{data.summary.never}</b></div>
            <div className="lt-pc"><span>Avg completion</span><b>{data.summary.avgRate}%</b></div>
          </div>

          {all ? (
            <div className="lt-table-wrap">
              <table className="lt-table lt-batch-table">
                <thead><tr><th>Batch</th><th>Track</th><th>Day now</th><th>Questions today</th><th>Students</th><th>Avg completion</th></tr></thead>
                <tbody>
                  {data.batches.map((b: any) => (
                    <tr key={b.batchId}>
                      <td><button className="lt-linkbtn" onClick={() => setBatchId(b.batchId)}>{b.batchName || 'Batch'}</button></td>
                      <td>{b.track?.name || '—'}</td>
                      <td>{b.currentDay ?? '—'}</td>
                      <td>{b.questionsToday || '—'}</td>
                      <td>{b.students}</td>
                      <td><Rate rate={b.avgRate} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="lt-hint">
              {data.track?.name} · started {fmt(data.startDate)} · {data.expected} learning day(s) in this range ·
              gating <b>{data.gate}</b>
              {data.currentDay === null && ' · today is not a learning day for this batch'}
            </p>
          )}

          <div className="lt-prog-tools">
            <div className="lt-seg" role="group" aria-label="Show">
              {STATUS.map(([k, label]) => (
                <button key={k || 'all'} className={status === k ? 'on' : ''} onClick={() => setStatus(k)}>{label}</button>
              ))}
            </div>
            <input className="lt-prog-search" value={search} onChange={e => setSearch(e.target.value)}
                   placeholder="Search name or email…" aria-label="Search students" />
            <select className="lt-prog-sort" value={sort} onChange={e => setSort(e.target.value as Sort)} aria-label="Sort">
              <option value="worst">Lowest completion first</option>
              <option value="best">Highest completion first</option>
              <option value="name">Name (A–Z)</option>
              {all && <option value="batch">Batch</option>}
              <option value="recent">Recently active</option>
            </select>
          </div>

          {data.students.length === 0 ? (
            <p className="lt-hint">{all ? 'These batches have no active students.' : 'This batch has no active students.'}</p>
          ) : rows.length === 0 ? (
            <p className="lt-hint">No student matches these filters.</p>
          ) : (
            <div className="lt-table-wrap">
              <table className="lt-table lt-prog-table">
                <thead>
                  <tr>
                    <th>Student</th>{all && <th>Batch</th>}<th>Done</th><th>Partly</th><th>Expected</th><th>Missed</th><th>Completion</th><th>Today</th><th>Last activity</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((s: any) => (
                    <tr key={s._id} className="lt-row-click" onClick={() => setOpen(s)} tabIndex={0}
                        onKeyDown={e => { if (e.key === 'Enter') setOpen(s); }} title="See this student's days">
                      <td>
                        <div className="lt-stu">{s.name}</div>
                        <div className="lt-stu-mail">{s.email}</div>
                      </td>
                      {all && <td>{s.batchName}</td>}
                      <td>{s.completed}</td>
                      <td>{s.partial || '0'}</td>
                      <td>{s.expected}</td>
                      <td>{s.missed > 0 ? <b className="lt-bad">{s.missed}</b> : '0'}</td>
                      <td><Rate rate={s.rate} /></td>
                      {/* Words as well as colour — the state must not depend on seeing green. */}
                      <td><TodayPill s={s} /></td>
                      <td>{s.lastActivity ? fmt(s.lastActivity) : <span className="lt-muted">Never</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {open && <StudentDays student={open} lab={lab} from={from} to={to} onClose={() => setOpen(null)} />}
    </div>
  );
};

const Rate: React.FC<{ rate: number }> = ({ rate }) => (
  <span className="lt-rate-cell">
    <span className="lt-prog-bar"><span className={rate >= 80 ? 'ok' : rate >= 50 ? 'warn' : 'bad'} style={{ width: `${rate}%` }} /></span>
    <span className="lt-rate">{rate}%</span>
  </span>
);

const TodayPill: React.FC<{ s: any }> = ({ s }) => {
  if (!s.today) return <span className="lt-muted">—</span>;
  if (s.doneToday) return <span className="lt-pill done">Done{s.today.total > 1 ? ` ${s.today.total}/${s.today.total}` : ''}</span>;
  if (s.today.done > 0) return <span className="lt-pill part">{s.today.done}/{s.today.total} done</span>;
  return <span className="lt-pill wait">Pending</span>;
};

const DAY_WORD: Record<string, string> = { done: 'Done', partial: 'Partly done', missed: 'Missed', today: 'Today' };

/** One student's days in the range: each day's questions, answered or not, and the score. */
const StudentDays: React.FC<{ student: any; lab: Lab; from: string; to: string; onClose: () => void }> = ({ student, lab, from, to, onClose }) => {
  const [d, setD] = useState<any>(null);
  const [err, setErr] = useState('');
  const [show, setShow] = useState<'all' | 'missed'>('all');
  useEffect(() => {
    get(`/lab-tracks/progress/student?${new URLSearchParams({ lab, studentId: student._id, from, to })}`)
      .then(setD).catch(e => setErr(e.message));
  }, [student._id, lab, from, to]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  const days = (d?.days || []).filter((x: any) => show === 'all' || x.status === 'missed' || x.status === 'partial');
  return (
    <div className="lt-modal-back" onClick={onClose} role="presentation">
      <div className="lt-modal lt-sdays" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-label={`${student.name}'s days`}>
        <div className="lt-modal-head">
          <div>
            <h4>{student.name}</h4>
            <div className="lt-stu-mail">{student.email}{student.batchName ? ` · ${student.batchName}` : ''} · {fmtDay(from)} – {fmtDay(to)}</div>
          </div>
          <button onClick={onClose} aria-label="Close">×</button>
        </div>
        {err && <div className="lt-err">{err}</div>}
        {!d && !err && <div className="lt-loading"><Spinner /></div>}
        {d && !d.assigned && <p className="lt-hint">This student's batch has no {lab === 'thinking' ? 'Thinking' : 'Communication'} track attached.</p>}
        {d?.assigned && (
          <>
            <div className="lt-sdays-sum">
              <span className="done"><b>{d.summary.done}</b> done</span>
              <span className="part"><b>{d.summary.partial}</b> partly</span>
              <span className="miss"><b>{d.summary.missed}</b> missed</span>
              <span><b>{d.summary.expected}</b> learning days</span>
            </div>
            <div className="lt-seg small" role="group" aria-label="Show days">
              <button className={show === 'all' ? 'on' : ''} onClick={() => setShow('all')}>All days</button>
              <button className={show === 'missed' ? 'on' : ''} onClick={() => setShow('missed')}>Missed or partly</button>
            </div>
            <div className="lt-sdays-list">
              {days.length === 0 ? <p className="lt-hint">{show === 'missed' ? 'No missed days in this range.' : 'No learning days in this range.'}</p>
                : days.map((x: any) => (
                  <div key={x.date} className={`lt-sday ${x.status}`}>
                    <div className="lt-sday-head">
                      <b>{fmtDay(x.date)}</b>
                      <span className="lt-sday-n">Day {x.dayIndex}</span>
                      <span className={`lt-pill ${x.status === 'done' ? 'done' : x.status === 'partial' ? 'part' : x.status === 'today' ? 'wait' : 'miss'}`}>
                        {DAY_WORD[x.status]}{x.total > 1 ? ` · ${x.done}/${x.total}` : ''}
                      </span>
                      {x.avgScore !== null && <span className="lt-sday-score">{x.avgScore}/100</span>}
                    </div>
                    <ul>
                      {x.questions.map((q: any, i: number) => (
                        <li key={i} className={q.done ? 'yes' : 'no'}>
                          <i className={`bi ${q.done ? 'bi-check-circle-fill' : 'bi-circle'}`} aria-hidden />
                          <span className="t">{q.title}</span>
                          <span className="s">{q.done ? (q.score !== null ? `${q.score}/100` : lab === 'thinking' ? (q.solved ? 'Solved' : 'Submitted') : 'Answered') : 'Not answered'}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ProgressPanel;
