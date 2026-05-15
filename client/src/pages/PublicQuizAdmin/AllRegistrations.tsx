import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { publicQuizAdminApi } from '../../api';
import './PublicQuizAdmin.css';

const AllRegistrations: React.FC = () => {
  const navigate = useNavigate();
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [configs, setConfigs] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [weekFilter, setWeekFilter] = useState('');
  const [loading, setLoading] = useState(true);

  const limit = 100;

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const result = await publicQuizAdminApi.getAllRegistrations({
        page,
        limit,
        search: search || undefined,
        week: weekFilter || undefined,
      } as any);
      setSubmissions(result.submissions);
      setTotal(result.total);
      setConfigs(result.configs || []);
    } catch (e: any) {
      console.error(e);
    }
    setLoading(false);
  }, [page, search, weekFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const exportCSV = () => {
    if (!submissions.length) return;
    const headers = ['Week', 'Name', 'Email', 'Phone', 'Status', 'Score', '%', 'Passed', 'Registered At'];
    const rows = submissions.map(s => {
      const cfg = s.publicQuizConfigId;
      const weekLabel = cfg?.weekLabel || cfg?.title || (s.isPreRegistration ? 'Pre-Registration' : '—');
      const phone = s.registrationData?.phone || s.registrationData?.mobile || '';
      const status = s.isPreRegistration ? 'Pre-Registered' : s.quizAttemptId ? 'Completed' : 'Registered';
      return [
        `"${weekLabel}"`,
        `"${s.name}"`,
        `"${s.email}"`,
        `"${phone}"`,
        status,
        s.score != null ? s.score : '',
        s.percentage != null ? Math.round(s.percentage) : '',
        s.passed != null ? (s.passed ? 'Yes' : 'No') : '',
        new Date(s.createdAt).toLocaleString('en-IN'),
      ];
    });
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `all-registrations.csv`;
    a.click();
  };

  // Derive week options from configs
  const weekOptions = configs
    .filter(c => c.weekLabel || c.title)
    .map(c => ({ value: c.weekLabel || c.title, label: c.weekLabel ? `${c.weekLabel} — ${c.title}` : c.title }));

  const completed = submissions.filter(s => s.quizAttemptId).length;
  const preRegs = submissions.filter(s => s.isPreRegistration).length;

  return (
    <div className="pq-page">
      <div className="pq-header">
        <div>
          <button className="btn btn-sm btn-outline-secondary mb-2" onClick={() => navigate('/public-quiz-admin')}>
            ← Back to Quizzes
          </button>
          <h1 className="pq-title">All Registrations</h1>
          <p className="pq-subtitle">Every registration across all weekly quizzes</p>
        </div>
        <button className="btn btn-outline-secondary" onClick={exportCSV}>⬇️ Export CSV</button>
      </div>

      {/* Summary */}
      <div className="row g-3 mb-4">
        {[
          { label: 'Total Registrations', value: total, color: '#005897' },
          { label: 'Quiz Completed', value: completed, color: '#10b981' },
          { label: 'Pre-Registrations', value: preRegs, color: '#f59e0b' },
          { label: 'Weeks Run', value: configs.length, color: '#8b5cf6' },
        ].map(stat => (
          <div key={stat.label} className="col-6 col-md-3">
            <div className="pq-stat-card" style={{ borderTop: `3px solid ${stat.color}` }}>
              <div className="pq-stat-value" style={{ color: stat.color }}>{stat.value}</div>
              <div className="pq-stat-label">{stat.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="d-flex gap-3 mb-3 align-items-center flex-wrap">
        <input
          className="form-control form-control-sm"
          style={{ maxWidth: 240 }}
          placeholder="Search name or email..."
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1); }}
        />
        <select
          className="form-select form-select-sm"
          style={{ maxWidth: 260 }}
          value={weekFilter}
          onChange={e => { setWeekFilter(e.target.value); setPage(1); }}
        >
          <option value="">All Weeks</option>
          <option value="__pre__">Pre-Registrations only</option>
          {weekOptions.map(w => (
            <option key={w.value} value={w.value}>{w.label}</option>
          ))}
        </select>
        <span className="text-muted small">Showing {submissions.length} of {total}</span>
        {loading && <span className="text-muted small">Loading...</span>}
      </div>

      {/* Table */}
      <div className="table-responsive">
        <table className="table table-hover table-sm pq-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Week</th>
              <th>Name</th>
              <th>Email</th>
              <th>Phone</th>
              <th>Status</th>
              <th>Score</th>
              <th>%</th>
              <th>Registered At</th>
              <th>Approval</th>
            </tr>
          </thead>
          <tbody>
            {submissions.map((s, i) => {
              const cfg = s.publicQuizConfigId;
              const weekLabel = cfg?.weekLabel || cfg?.title || null;
              const phone = s.registrationData?.phone || s.registrationData?.mobile || '—';
              const isPreReg = s.isPreRegistration;
              const hasAttempt = !!s.quizAttemptId;

              return (
                <tr
                  key={s._id}
                  style={{ cursor: 'pointer' }}
                  onClick={() => navigate(`/public-quiz-admin/registration/${s._id}`)}
                >
                  <td className="text-muted">{(page - 1) * limit + i + 1}</td>
                  <td>
                    {isPreReg ? (
                      <span className="badge" style={{ background: '#fff3cd', color: '#856404', border: '1px solid #ffc107' }}>Pre-Registration</span>
                    ) : weekLabel ? (
                      <span className="badge" style={{ background: '#e8f0fe', color: '#1a56db', border: '1px solid #b3c9fc' }}>{weekLabel}</span>
                    ) : (
                      <span className="text-muted small">—</span>
                    )}
                  </td>
                  <td><strong>{s.name}</strong></td>
                  <td>{s.email}</td>
                  <td className="text-muted">{phone}</td>
                  <td>
                    {isPreReg ? (
                      <span className="badge bg-warning text-dark">Pre-Registered</span>
                    ) : hasAttempt ? (
                      <span className="badge bg-success">Completed</span>
                    ) : (
                      <span className="badge bg-secondary">Registered</span>
                    )}
                  </td>
                  <td>
                    {hasAttempt ? `${s.score ?? '—'}/${s.totalMarks ?? '—'}` : <span className="text-muted">—</span>}
                  </td>
                  <td>
                    {s.percentage != null ? (
                      <span className={`badge ${s.passed ? 'bg-success' : 'bg-danger'}`}>{Math.round(s.percentage)}%</span>
                    ) : '—'}
                  </td>
                  <td className="text-muted small">{new Date(s.createdAt).toLocaleDateString('en-IN')}</td>
                  <td onClick={e => e.stopPropagation()}>
                    {s.isApproved === true
                      ? <span className="badge bg-success">Approved</span>
                      : s.isApproved === false
                      ? <span className="badge bg-danger">Rejected</span>
                      : <span className="badge bg-warning text-dark">Pending</span>}
                  </td>
                </tr>
              );
            })}
            {!loading && submissions.length === 0 && (
              <tr><td colSpan={10} className="text-center text-muted py-4">No registrations found</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {total > limit && (
        <div className="d-flex gap-2 justify-content-center mt-3">
          <button className="btn btn-sm btn-outline-secondary" disabled={page === 1} onClick={() => setPage(p => p - 1)}>← Prev</button>
          <span className="btn btn-sm disabled">Page {page} of {Math.ceil(total / limit)}</span>
          <button className="btn btn-sm btn-outline-secondary" disabled={page >= Math.ceil(total / limit)} onClick={() => setPage(p => p + 1)}>Next →</button>
        </div>
      )}
    </div>
  );
};

export default AllRegistrations;
