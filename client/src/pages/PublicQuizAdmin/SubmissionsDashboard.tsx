import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { publicQuizAdminApi } from '../../api';
import './PublicQuizAdmin.css';

const SubmissionsDashboard: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [config, setConfig] = useState<any>(null);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [eligibilityFilter, setEligibilityFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [converting, setConverting] = useState<string | null>(null);
  const [message, setMessage] = useState('');

  const limit = 50;

  const fetchData = async () => {
    setLoading(true);
    try {
      const [cfg, subs] = await Promise.all([
        publicQuizAdminApi.getConfig(id!),
        publicQuizAdminApi.getSubmissions(id!, { page, limit, eligibility: eligibilityFilter || undefined })
      ]);
      setConfig(cfg);
      setSubmissions(subs.submissions);
      setTotal(subs.total);
    } catch (e: any) {
      console.error(e);
    }
    setLoading(false);
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { fetchData(); }, [id, page, eligibilityFilter]);

  const convertToLead = async (subId: string) => {
    setConverting(subId);
    try {
      await publicQuizAdminApi.convertToLead(id!, subId);
      setMessage('Lead created successfully!');
      setTimeout(() => setMessage(''), 3000);
    } catch (e: any) {
      setMessage(e.message);
      setTimeout(() => setMessage(''), 5000);
    }
    setConverting(null);
  };

  const exportCSV = () => {
    if (!submissions.length) return;
    const headers = ['Name', 'Email', 'Score', 'Total', '%', 'Passed', 'Eligibility', 'Attempt #', 'Submitted At'];
    const rows = submissions.map(s => [
      `"${s.name}"`,
      `"${s.email}"`,
      s.score ?? '',
      s.totalMarks ?? '',
      s.percentage != null ? Math.round(s.percentage) : '',
      s.passed != null ? (s.passed ? 'Yes' : 'No') : '',
      s.eligibilityStatus,
      s.attemptNumber,
      new Date(s.createdAt).toLocaleString('en-IN')
    ]);
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
    a.download = `submissions-${config?.title || id}.csv`; a.click();
  };

  const qualified = submissions.filter(s => s.eligibilityStatus === 'qualified').length;
  const flagged = submissions.filter(s => s.eligibilityStatus === 'flagged').length;
  const completed = submissions.filter(s => s.quizAttemptId).length;

  if (loading && !config) return <div className="pq-loading">Loading...</div>;

  return (
    <div className="pq-page">
      <div className="pq-header">
        <div>
          <button className="btn btn-sm btn-outline-secondary mb-2" onClick={() => navigate('/public-quiz-admin')}>
            ← Back to List
          </button>
          <h1 className="pq-title">{config?.title} — Submissions</h1>
          <p className="pq-subtitle">{total} total form submissions</p>
        </div>
        <button className="btn btn-outline-secondary" onClick={exportCSV}>⬇️ Export CSV</button>
      </div>

      {message && <div className={`alert ${message.includes('successfully') ? 'alert-success' : 'alert-danger'}`}>{message}</div>}

      {/* Summary cards */}
      <div className="row g-3 mb-4">
        {[
          { label: 'Total Submissions', value: total, color: '#005897' },
          { label: 'Quiz Completed', value: completed, color: '#10b981' },
          { label: 'Qualified', value: qualified, color: '#22c55e' },
          { label: 'Flagged (soft)', value: flagged, color: '#f59e0b' },
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
        <div>
          <label className="form-label mb-0 me-2">Eligibility:</label>
          <select className="form-select form-select-sm d-inline-block" style={{ width: 160 }} value={eligibilityFilter} onChange={e => { setEligibilityFilter(e.target.value); setPage(1); }}>
            <option value="">All</option>
            <option value="qualified">Qualified</option>
            <option value="flagged">Flagged</option>
          </select>
        </div>
        <span className="text-muted small">Showing {submissions.length} of {total}</span>
      </div>

      {/* Table */}
      <div className="table-responsive">
        <table className="table table-hover table-sm pq-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Name</th>
              <th>Email</th>
              <th>Score</th>
              <th>%</th>
              <th>Eligibility</th>
              <th>Attempts</th>
              <th>Completed</th>
              <th>Submitted</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {submissions.map((s, i) => (
              <tr key={s._id}>
                <td>{(page - 1) * limit + i + 1}</td>
                <td><strong>{s.name}</strong></td>
                <td>{s.email}</td>
                <td>{s.quizAttemptId ? `${s.score ?? '-'}/${s.totalMarks ?? '-'}` : <span className="text-muted">Not taken</span>}</td>
                <td>
                  {s.percentage != null
                    ? <span className={`badge ${s.passed ? 'bg-success' : 'bg-danger'}`}>{Math.round(s.percentage)}%</span>
                    : '—'}
                </td>
                <td>
                  <span className={`badge ${s.eligibilityStatus === 'qualified' ? 'bg-success' : 'bg-warning text-dark'}`}>
                    {s.eligibilityStatus}
                  </span>
                  {s.eligibilityFlags?.length > 0 && (
                    <div className="small text-muted mt-1">
                      {s.eligibilityFlags.map((f: any, fi: number) => (
                        <div key={fi}>⚠ {f.fieldLabel}: "{f.value}" ({f.rule})</div>
                      ))}
                    </div>
                  )}
                </td>
                <td>{s.attemptNumber}</td>
                <td>{s.quizAttemptId ? '✅' : '—'}</td>
                <td className="text-muted small">{new Date(s.createdAt).toLocaleDateString('en-IN')}</td>
                <td>
                  {s.shareToken && (
                    <a
                      href={`/api/v1/public-quiz/certificate/${s.shareToken}`}
                      target="_blank"
                      rel="noreferrer"
                      className="btn btn-xs btn-outline-info me-1"
                      title="View Certificate"
                    >📜</a>
                  )}
                  <button
                    className="btn btn-xs btn-outline-success"
                    onClick={() => convertToLead(s._id)}
                    disabled={converting === s._id}
                    title="Convert to Lead"
                  >
                    {converting === s._id ? '...' : '→ Lead'}
                  </button>
                </td>
              </tr>
            ))}
            {submissions.length === 0 && (
              <tr><td colSpan={10} className="text-center text-muted py-4">No submissions yet</td></tr>
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

export default SubmissionsDashboard;
