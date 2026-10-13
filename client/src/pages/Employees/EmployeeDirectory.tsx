import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks';
import { userCan } from '../../utils/permissions';
import { employeesApi, empErr, EmployeeConfig, EmployeeRow, EmployeeStatus, EmployeeSummary } from '../../api/employeesApi';
import './employees.css';
import './employeesAdmin.css';

const LIMIT = 25;

export const STATUS_LABEL: Record<EmployeeStatus, string> = {
  active: 'Active', probation: 'On probation', on_notice: 'On notice', on_leave: 'On leave', exited: 'Exited',
};
const STATUS_TONE: Record<EmployeeStatus, string> = { active: 'green', probation: 'amber', on_notice: 'red', on_leave: 'blue', exited: 'grey' };

const fmtDate = (s?: string) => (s ? new Date(s).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '');
const initials = (n: string) => n.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join('') || '?';

const MiniList: React.FC<{ title: string; items: { id: string; name: string; note: string }[]; onOpen: (id: string) => void }> = ({ title, items, onOpen }) => {
  if (!items.length) return null;
  return (
    <div className="emp-card" style={{ marginBottom: 0 }}>
      <h3 style={{ marginTop: 0 }}>{title}</h3>
      <ul className="emp-dir-mini">
        {items.slice(0, 6).map((i) => (
          <li key={i.id}>
            <button type="button" className="emp-dir-link" onClick={() => onOpen(i.id)}>{i.name}</button>
            <span className="emp-muted"> · {i.note}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};

const EmployeeDirectory: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const canManage = userCan(user, ['manage_employees']);
  const [summary, setSummary] = useState<EmployeeSummary | null>(null);
  const [config, setConfig] = useState<EmployeeConfig | null>(null);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [department, setDepartment] = useState('');
  const [status, setStatus] = useState('current');
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<EmployeeRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    employeesApi.summary().then(setSummary).catch(() => setSummary(null));
    employeesApi.config().then(setConfig).catch(() => setConfig(null));
  }, []);

  useEffect(() => {
    const t = setTimeout(() => { setSearch(searchInput.trim()); setPage(1); }, 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    let live = true;
    setLoading(true);
    setError('');
    employeesApi.list({ search, department, status, page, limit: LIMIT })
      .then((r) => { if (live) { setRows(r.rows); setTotal(r.total); } })
      .catch((e) => { if (live) setError(empErr(e, 'Could not load employees')); })
      .finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, [search, department, status, page]);

  const open = (id: string) => navigate(`/employees/${id}`);
  const pages = Math.max(1, Math.ceil(total / LIMIT));
  const by = summary?.byStatus || {};

  return (
    <div className="emp-page">
      <div className="emp-head">
        <div>
          <h1>Employees</h1>
          <p className="emp-sub">Your own team: profiles, jobs, pay history, logins and documents.</p>
        </div>
        {canManage && (
          <div className="emp-actions">
            <button type="button" className="emp-btn ghost" onClick={() => navigate('/employee-settings')}>Employee settings</button>
            <button type="button" className="emp-btn" onClick={() => navigate('/employees/new')}>Add employee</button>
          </div>
        )}
      </div>

      {summary && (
        <>
          <div className="emp-grid c4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', marginBottom: 14 }}>
            <div className="emp-stat"><b>{summary.headcount}</b><span>Headcount</span></div>
            <div className="emp-stat"><b>{by.active || 0}</b><span>Active</span></div>
            <div className="emp-stat"><b>{by.probation || 0}</b><span>On probation</span></div>
            <div className="emp-stat"><b>{by.on_notice || 0}</b><span>On notice</span></div>
            <div className="emp-stat"><b>{by.on_leave || 0}</b><span>On leave</span></div>
          </div>
          <div className="emp-grid c4" style={{ marginBottom: 14, gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
            <MiniList title="Birthdays (next 14 days)" onOpen={open}
              items={summary.birthdays.map((b) => ({ id: b._id, name: b.name, note: b.inDays === 0 ? 'today' : `in ${b.inDays}d (${fmtDate(b.date)})` }))} />
            <MiniList title="Work anniversaries" onOpen={open}
              items={summary.anniversaries.map((a) => ({ id: a._id, name: a.name, note: `${a.years ? `${a.years} yr, ` : ''}${a.inDays === 0 ? 'today' : `in ${a.inDays}d`}` }))} />
            <MiniList title="Probation ending (30 days)" onOpen={open}
              items={summary.probationEnding.map((p) => ({ id: p._id, name: p.name, note: fmtDate(p.probationEndDate) }))} />
            <MiniList title="New joiners (30 days)" onOpen={open}
              items={summary.newJoiners.map((j) => ({ id: j._id, name: j.name, note: fmtDate(j.joiningDate) }))} />
          </div>
        </>
      )}

      <div className="emp-card">
        <div className="emp-grid c3" style={{ marginBottom: 12 }}>
          <div className="emp-field">
            <label htmlFor="dir-search">Search</label>
            <input id="dir-search" className="emp-input" placeholder="Name, code, email or phone" value={searchInput} onChange={(e) => setSearchInput(e.target.value)} />
          </div>
          <div className="emp-field">
            <label htmlFor="dir-dept">Department</label>
            <select id="dir-dept" className="emp-select" value={department} onChange={(e) => { setDepartment(e.target.value); setPage(1); }}>
              <option value="">All departments</option>
              {(config?.departments || []).map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div className="emp-field">
            <label htmlFor="dir-status">Status</label>
            <select id="dir-status" className="emp-select" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
              <option value="current">Current (not exited)</option>
              {(Object.keys(STATUS_LABEL) as EmployeeStatus[]).map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
            </select>
          </div>
        </div>

        {error && <div className="emp-msg err" role="alert">{error}</div>}
        {loading ? (
          <div className="emp-empty">Loading employees…</div>
        ) : rows.length === 0 ? (
          <div className="emp-empty">No employees match these filters.</div>
        ) : (
          <div className="emp-table-wrap">
            <table className="emp-table">
              <thead>
                <tr><th>Employee</th><th>Designation</th><th>Department</th><th>Status</th><th>Work mode</th><th>Manager</th><th>Joined</th><th>Login</th></tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r._id} className="click" onClick={() => open(r._id)}>
                    <td>
                      <div className="emp-row" style={{ flexWrap: 'nowrap' }}>
                        <span className="emp-avatar">{initials(r.name)}</span>
                        <div>
                          <b>{r.name}</b>
                          <div className="emp-muted" style={{ fontSize: 12 }}>{r.employeeCode}</div>
                        </div>
                      </div>
                    </td>
                    <td>{r.designation || '—'}</td>
                    <td>{r.department || '—'}</td>
                    <td><span className={`emp-badge ${STATUS_TONE[r.status]}`}>{STATUS_LABEL[r.status]}</span></td>
                    <td style={{ textTransform: 'capitalize' }}>{r.workMode || '—'}</td>
                    <td>{r.managerName || '—'}</td>
                    <td>{fmtDate(r.joiningDate) || '—'}</td>
                    <td><span className={`emp-badge ${r.hasLogin ? 'green' : 'grey'}`}>{r.hasLogin ? 'Has login' : 'No login'}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {total > LIMIT && (
          <div className="emp-row" style={{ justifyContent: 'space-between', marginTop: 12 }}>
            <span className="emp-muted">{total} employees · page {page} of {pages}</span>
            <div className="emp-actions">
              <button type="button" className="emp-btn ghost sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</button>
              <button type="button" className="emp-btn ghost sm" disabled={page >= pages} onClick={() => setPage(page + 1)}>Next</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default EmployeeDirectory;
