import React, { useCallback, useEffect, useMemo, useState } from 'react';
import './employees.css';
import './activityReview.css';
import { activityApi, employeesApi, empErr, BoardRow, ReviewRow, MonthReport, LogStatus } from '../../api/employeesApi';

type Tab = 'today' | 'review' | 'report';

const indiaToday = () => new Date(Date.now() + 330 * 60000).toISOString().slice(0, 10);
const shiftDate = (iso: string, days: number) => {
  const t = new Date(`${iso}T00:00:00Z`);
  t.setUTCDate(t.getUTCDate() + days);
  return t.toISOString().slice(0, 10);
};
const fmtDate = (s?: string) => (s ? new Date(s.length === 10 ? `${s}T00:00:00` : s).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—');
const fmtTime = (s?: string) => (s ? new Date(s).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' }) : '—');
const hrs = (n: number) => `${Math.round((n || 0) * 100) / 100} h`;

const STATE_LABEL: Record<BoardRow['state'], string> = {
  not_started: 'Not started', checked_in: 'Checked in', checked_out: 'Checked out', open: 'In progress', submitted: 'Submitted', approved: 'Approved', returned: 'Returned',
};
const STATE_COLOR: Record<BoardRow['state'], string> = {
  not_started: 'grey', checked_in: 'blue', checked_out: 'violet', open: 'blue', submitted: 'amber', approved: 'green', returned: 'red',
};
const CHIP_STATES: BoardRow['state'][] = ['not_started', 'checked_in', 'checked_out', 'submitted', 'approved', 'returned'];
const LOG_COLOR: Record<LogStatus, string> = { open: 'grey', submitted: 'amber', approved: 'green', returned: 'red' };
const LOG_LABEL: Record<LogStatus, string> = { open: 'Open', submitted: 'Submitted', approved: 'Approved', returned: 'Returned' };
const TASK_COLOR: Record<string, string> = { done: 'green', in_progress: 'blue', blocked: 'red' };
const TASK_LABEL: Record<string, string> = { done: 'Done', in_progress: 'In progress', blocked: 'Blocked' };

const Badge: React.FC<{ color: string; children: React.ReactNode }> = ({ color, children }) => <span className={`emp-badge ${color}`}>{children}</span>;

// ── Day drawer ───────────────────────────────────────────────────────────────

const DayModal: React.FC<{ logId: string; onClose: () => void; onChanged: (msg: string) => void }> = ({ logId, onClose, onChanged }) => {
  const [log, setLog] = useState<(ReviewRow & { canReview: boolean }) | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    activityApi.log(logId)
      .then(l => { if (alive) setLog(l); })
      .catch(e => { if (alive) setErr(empErr(e, 'Could not load this day')); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [logId]);

  const run = async (kind: 'approve' | 'return' | 'reopen') => {
    if ((kind === 'return' || kind === 'reopen') && !note.trim()) { setErr('Please add a note for the employee.'); return; }
    setBusy(true); setErr('');
    try {
      if (kind === 'reopen') await activityApi.reopen(logId, note.trim());
      else await activityApi.review(logId, kind, note.trim() || undefined);
      onChanged(kind === 'approve' ? 'Day approved.' : kind === 'return' ? 'Sent back to the employee.' : 'Day reopened for correction.');
    } catch (e) { setErr(empErr(e)); } finally { setBusy(false); }
  };

  return (
    <div className="emp-modal-back" onClick={onClose}>
      <div className="emp-modal wide" role="dialog" aria-modal="true" aria-label="Day details" onClick={e => e.stopPropagation()}>
        <div className="emp-ar-modal-head">
          <h2>{log ? `${log.employeeName}${log.employeeCode ? ` (${log.employeeCode})` : ''}` : 'Day details'}</h2>
          <button className="emp-btn ghost sm" onClick={onClose}>Close</button>
        </div>
        {loading && <div className="emp-empty">Loading…</div>}
        {err && <div className="emp-msg err">{err}</div>}
        {log && (
          <>
            <div className="emp-ar-meta">
              <div><span>Date</span><b>{fmtDate(log.date)}</b></div>
              <div><span>Work mode</span><b style={{ textTransform: 'capitalize' }}>{log.workMode}</b></div>
              <div><span>Check-in</span><b>{fmtTime(log.checkInAt)} {log.late && <Badge color="amber">Late</Badge>}</b></div>
              <div><span>Check-out</span><b>{fmtTime(log.checkOutAt)}</b></div>
              <div><span>Total hours</span><b>{hrs(log.totalHours)}</b></div>
              <div><span>Status</span><b><Badge color={LOG_COLOR[log.status]}>{LOG_LABEL[log.status]}</Badge></b></div>
            </div>
            <h3>Tasks</h3>
            {log.tasks.length === 0 ? <div className="emp-empty">No tasks logged.</div> : (
              <div className="emp-table-wrap">
                <table className="emp-table">
                  <thead><tr><th>Task</th><th>Category</th><th className="num">Hours</th><th>Status</th><th>Note</th></tr></thead>
                  <tbody>
                    {log.tasks.map((t, i) => (
                      <tr key={i}>
                        <td>{t.title}</td><td>{t.category || '—'}</td><td className="num">{t.hours}</td>
                        <td><Badge color={TASK_COLOR[t.status] || 'grey'}>{TASK_LABEL[t.status] || t.status}</Badge></td>
                        <td>{t.note || ''}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {log.summary && <><h3>Summary</h3><p className="emp-ar-text">{log.summary}</p></>}
            {log.blockers && <div className="emp-ar-warn"><b>Blockers:</b> <span className="emp-ar-text">{log.blockers}</span></div>}
            {log.tomorrowPlan && <><h3>Tomorrow&apos;s plan</h3><p className="emp-ar-text">{log.tomorrowPlan}</p></>}
            {log.reviewNote && (
              <>
                <h3>Previous review note</h3>
                <p className="emp-ar-text">{log.reviewNote}</p>
                <div className="emp-ar-sub">{log.reviewerName ? `by ${log.reviewerName}` : ''} {log.reviewedAt ? `on ${fmtDate(log.reviewedAt)}` : ''}</div>
              </>
            )}
            {log.canReview && (log.status === 'submitted' || log.status === 'approved') && (
              <div style={{ marginTop: 14 }}>
                <div className="emp-field">
                  <label htmlFor="ar-note">{log.status === 'submitted' ? 'Note (required to send back)' : 'Reason for reopening (required)'}</label>
                  <textarea id="ar-note" className="emp-textarea" value={note} onChange={e => setNote(e.target.value)} />
                </div>
                <div className="emp-actions" style={{ marginTop: 10 }}>
                  {log.status === 'submitted' ? (
                    <>
                      <button className="emp-btn good" disabled={busy} onClick={() => run('approve')}>Approve</button>
                      <button className="emp-btn danger" disabled={busy} onClick={() => run('return')}>Send back</button>
                    </>
                  ) : (
                    <button className="emp-btn ghost" disabled={busy} onClick={() => run('reopen')}>Reopen for correction</button>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

// ── Today ────────────────────────────────────────────────────────────────────

const TodayTab: React.FC<{ onOpen: (id: string) => void; refreshKey: number }> = ({ onOpen, refreshKey }) => {
  const [date, setDate] = useState(indiaToday());
  const [rows, setRows] = useState<BoardRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [filter, setFilter] = useState<BoardRow['state'] | ''>('');

  const load = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true);
    try { setRows(await activityApi.board(date)); setErr(''); }
    catch (e) { setErr(empErr(e, 'Could not load the board')); }
    finally { setLoading(false); }
  }, [date]);

  useEffect(() => { load(); }, [load, refreshKey]);
  useEffect(() => {
    const t = setInterval(() => { if (document.visibilityState === 'visible') load(true); }, 60000);
    return () => clearInterval(t);
  }, [load]);

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    rows.forEach(r => { c[r.state] = (c[r.state] || 0) + 1; });
    return c;
  }, [rows]);
  const shown = filter ? rows.filter(r => r.state === filter) : rows;

  return (
    <div className="emp-card">
      <div className="emp-ar-filters">
        <div className="emp-field">
          <label htmlFor="ar-date">Date</label>
          <input id="ar-date" type="date" className="emp-input" value={date} max={indiaToday()} onChange={e => e.target.value && setDate(e.target.value)} />
        </div>
      </div>
      <div className="emp-ar-chips">
        <button className={`emp-chip ${filter === '' ? 'on' : ''}`} onClick={() => setFilter('')}>All {rows.length}</button>
        {CHIP_STATES.map(s => (
          <button key={s} className={`emp-chip ${filter === s ? 'on' : ''}`} onClick={() => setFilter(filter === s ? '' : s)}>{STATE_LABEL[s]} {counts[s] || 0}</button>
        ))}
      </div>
      {err && <div className="emp-msg err">{err}</div>}
      {loading ? <div className="emp-empty">Loading…</div> : shown.length === 0 && !err ? <div className="emp-empty">No employees to show.</div> : (
        <div className="emp-table-wrap">
          <table className="emp-table">
            <thead><tr><th>Employee</th><th>Department</th><th>State</th><th>Mode</th><th>Check-in</th><th>Check-out</th><th className="num">Hours</th><th className="num">Tasks</th></tr></thead>
            <tbody>
              {shown.map(r => (
                <tr key={r.employeeId} className={r.logId ? 'click' : ''} onClick={() => r.logId && onOpen(r.logId)}>
                  <td><b>{r.name}</b><div className="emp-ar-sub">{r.code}</div></td>
                  <td>{r.department || '—'}</td>
                  <td><Badge color={STATE_COLOR[r.state]}>{STATE_LABEL[r.state]}</Badge></td>
                  <td style={{ textTransform: 'capitalize' }}>{r.workMode || '—'}</td>
                  <td>{fmtTime(r.checkInAt)} {r.late && <Badge color="amber">Late</Badge>}</td>
                  <td>{fmtTime(r.checkOutAt)}</td>
                  <td className="num">{r.totalHours ? hrs(r.totalHours) : '—'}</td>
                  <td className="num">{r.taskCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

// ── Review ───────────────────────────────────────────────────────────────────

type Pick = { _id: string; name: string; code: string };

const ReviewTab: React.FC<{ onOpen: (id: string) => void; refreshKey: number; departments: string[]; people: Pick[] | null }> = ({ onOpen, refreshKey, departments, people }) => {
  const [from, setFrom] = useState(shiftDate(indiaToday(), -7));
  const [to, setTo] = useState(indiaToday());
  const [status, setStatus] = useState('submitted');
  const [department, setDepartment] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [rows, setRows] = useState<ReviewRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try { setRows(await activityApi.list({ from, to, status: status === 'all' ? undefined : status, employeeId, department })); setErr(''); }
    catch (e) { setErr(empErr(e, 'Could not load the logs')); }
    finally { setLoading(false); }
  }, [from, to, status, employeeId, department]);
  useEffect(() => { load(); }, [load, refreshKey]);

  return (
    <div className="emp-card">
      <div className="emp-ar-filters">
        <div className="emp-field"><label htmlFor="rv-from">From</label><input id="rv-from" type="date" className="emp-input" value={from} onChange={e => setFrom(e.target.value)} /></div>
        <div className="emp-field"><label htmlFor="rv-to">To</label><input id="rv-to" type="date" className="emp-input" value={to} onChange={e => setTo(e.target.value)} /></div>
        <div className="emp-field">
          <label htmlFor="rv-status">Status</label>
          <select id="rv-status" className="emp-select" value={status} onChange={e => setStatus(e.target.value)}>
            <option value="submitted">Waiting for review</option>
            <option value="approved">Approved</option>
            <option value="returned">Sent back</option>
            <option value="open">Open</option>
            <option value="all">All</option>
          </select>
        </div>
        <div className="emp-field">
          <label htmlFor="rv-dept">Department</label>
          <select id="rv-dept" className="emp-select" value={department} onChange={e => setDepartment(e.target.value)}>
            <option value="">All departments</option>
            {departments.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
        {people && (
          <div className="emp-field">
            <label htmlFor="rv-emp">Employee</label>
            <select id="rv-emp" className="emp-select" value={employeeId} onChange={e => setEmployeeId(e.target.value)}>
              <option value="">Everyone</option>
              {people.map(p => <option key={p._id} value={p._id}>{p.name} ({p.code})</option>)}
            </select>
          </div>
        )}
      </div>
      {err && <div className="emp-msg err">{err}</div>}
      {loading ? <div className="emp-empty">Loading…</div> : rows.length === 0 && !err ? <div className="emp-empty">Nothing here for these filters.</div> : (
        <div className="emp-table-wrap">
          <table className="emp-table">
            <thead><tr><th>Date</th><th>Employee</th><th>Mode</th><th className="num">Hours</th><th className="num">Tasks</th><th>Status</th><th>Reviewer</th></tr></thead>
            <tbody>
              {rows.map(r => (
                <tr key={r._id} className="click" onClick={() => onOpen(r._id)}>
                  <td>{fmtDate(r.date)}</td>
                  <td><b>{r.employeeName}</b><div className="emp-ar-sub">{r.employeeCode}</div></td>
                  <td style={{ textTransform: 'capitalize' }}>{r.workMode}</td>
                  <td className="num">{hrs(r.totalHours)}</td>
                  <td className="num">{r.tasks.length}</td>
                  <td><Badge color={LOG_COLOR[r.status]}>{LOG_LABEL[r.status]}</Badge></td>
                  <td>{r.reviewerName || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

// ── Monthly report ───────────────────────────────────────────────────────────

const csvCell = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;

const ReportTab: React.FC<{ departments: string[] }> = ({ departments }) => {
  const [month, setMonth] = useState(indiaToday().slice(0, 7));
  const [department, setDepartment] = useState('');
  const [data, setData] = useState<MonthReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  useEffect(() => {
    let alive = true;
    setLoading(true);
    activityApi.report(month, department || undefined)
      .then(r => { if (alive) { setData(r); setErr(''); } })
      .catch(e => { if (alive) setErr(empErr(e, 'Could not load the report')); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [month, department]);

  const download = () => {
    if (!data) return;
    const head = ['Employee', 'Code', 'Department', 'Days logged', 'Approved', 'Pending', 'Returned', 'On leave', 'Remote', 'Field', 'Late', 'Missing', 'Total hours', 'Avg hours/day'];
    const lines = [head.map(csvCell).join(',')].concat(data.rows.map(r =>
      [r.name, r.code, r.department || '', r.daysLogged, r.daysApproved, r.daysPending, r.daysReturned, r.daysOnLeave, r.remoteDays, r.fieldDays, r.lateDays, r.missingDays, r.totalHours, r.avgHours].map(csvCell).join(',')));
    const url = URL.createObjectURL(new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url; a.download = `employee-activity-${month}.csv`; document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="emp-card">
      <div className="emp-ar-filters">
        <div className="emp-field"><label htmlFor="rp-month">Month</label><input id="rp-month" type="month" className="emp-input" value={month} onChange={e => e.target.value && setMonth(e.target.value)} /></div>
        <div className="emp-field">
          <label htmlFor="rp-dept">Department</label>
          <select id="rp-dept" className="emp-select" value={department} onChange={e => setDepartment(e.target.value)}>
            <option value="">All departments</option>
            {departments.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
        <div><button className="emp-btn ghost" disabled={!data || data.rows.length === 0} onClick={download}>Download CSV</button></div>
      </div>
      {err && <div className="emp-msg err">{err}</div>}
      {data && <p className="emp-sub" style={{ marginBottom: 10 }}>{data.workingDays} working days so far · expected {data.expectedHours} h/day</p>}
      {loading ? <div className="emp-empty">Loading…</div> : data && data.rows.length === 0 ? <div className="emp-empty">No employees in this report.</div> : data && (
        <div className="emp-table-wrap">
          <table className="emp-table">
            <thead><tr><th>Employee</th><th className="num">Days logged</th><th className="num">Approved</th><th className="num">Pending</th><th className="num">Returned</th><th className="num">On leave</th><th className="num">Remote</th><th className="num">Field</th><th className="num">Late</th><th className="num">Missing</th><th className="num">Total hours</th><th className="num">Avg h/day</th></tr></thead>
            <tbody>
              {data.rows.map(r => (
                <tr key={r.employeeId}>
                  <td><b>{r.name}</b><div className="emp-ar-sub">{r.code}{r.department ? ` · ${r.department}` : ''}</div></td>
                  <td className="num">{r.daysLogged}</td><td className="num">{r.daysApproved}</td><td className="num">{r.daysPending}</td><td className="num">{r.daysReturned}</td>
                  <td className="num">{r.daysOnLeave}</td><td className="num">{r.remoteDays}</td><td className="num">{r.fieldDays}</td><td className="num">{r.lateDays}</td>
                  <td className={`num ${r.missingDays > 0 ? 'emp-ar-red' : ''}`}>{r.missingDays}</td>
                  <td className="num">{r.totalHours}</td>
                  <td className={`num ${r.avgHours < data.expectedHours ? 'emp-ar-low' : ''}`}>{r.avgHours}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

// ── Page ─────────────────────────────────────────────────────────────────────

const ActivityReview: React.FC = () => {
  const [tab, setTab] = useState<Tab>('today');
  const [openId, setOpenId] = useState<string | null>(null);
  const [msg, setMsg] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  const [departments, setDepartments] = useState<string[]>([]);
  const [people, setPeople] = useState<Pick[] | null>(null);

  useEffect(() => {
    employeesApi.config().then(c => setDepartments(c.departments || [])).catch(() => setDepartments([]));
    employeesApi.pick().then(p => setPeople(p)).catch(() => setPeople(null));
  }, []);

  const changed = (m: string) => { setOpenId(null); setMsg(m); setRefreshKey(k => k + 1); };

  return (
    <div className="emp-page">
      <div className="emp-head">
        <div><h1>Employee activity</h1><p className="emp-sub">Daily check-ins, work logs and reviews for your team.</p></div>
      </div>
      {msg && <div className="emp-msg ok" role="status">{msg}</div>}
      <div className="emp-tabs" role="tablist">
        {([['today', 'Today'], ['review', 'Review'], ['report', 'Monthly report']] as [Tab, string][]).map(([k, l]) => (
          <button key={k} role="tab" aria-selected={tab === k} className={`emp-tab ${tab === k ? 'on' : ''}`} onClick={() => { setTab(k); setMsg(''); }}>{l}</button>
        ))}
      </div>
      {tab === 'today' && <TodayTab onOpen={setOpenId} refreshKey={refreshKey} />}
      {tab === 'review' && <ReviewTab onOpen={setOpenId} refreshKey={refreshKey} departments={departments} people={people} />}
      {tab === 'report' && <ReportTab departments={departments} />}
      {openId && <DayModal logId={openId} onClose={() => setOpenId(null)} onChanged={changed} />}
    </div>
  );
};

export default ActivityReview;
