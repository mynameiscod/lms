import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { publicQuizAdminApi } from '../../api';

const APPROVAL_BADGE: Record<string, { cls: string; label: string }> = {
  approved: { cls: 'badge rounded-pill bg-success',      label: 'Approved' },
  rejected: { cls: 'badge rounded-pill bg-danger',       label: 'Rejected' },
  pending:  { cls: 'badge rounded-pill bg-warning text-dark', label: 'Pending' },
};

const STATUS_BADGE: Record<string, { cls: string; label: string }> = {
  completed:    { cls: 'badge rounded-pill bg-success',    label: 'Completed' },
  registered:   { cls: 'badge rounded-pill bg-primary',    label: 'Registered' },
  preregistered:{ cls: 'badge rounded-pill bg-secondary',  label: 'Pre-Reg' },
};

const STATS = (total: number, completed: number, preRegs: number, weeks: number) => [
  { label: 'Total Registrations', value: total,     icon: 'fa-users',           color: '#0d6efd' },
  { label: 'Completed Quiz',      value: completed,  icon: 'fa-circle-check',    color: '#198754' },
  { label: 'Pre-Registrations',   value: preRegs,    icon: 'fa-clock',           color: '#fd7e14' },
  { label: 'Weeks Run',           value: weeks,      icon: 'fa-calendar-week',   color: '#6f42c1' },
];

const AllRegistrations: React.FC = () => {
  const navigate = useNavigate();
  const [submissions, setSubmissions]   = useState<any[]>([]);
  const [configs,     setConfigs]       = useState<any[]>([]);
  const [total,       setTotal]         = useState(0);
  const [page,        setPage]          = useState(1);
  const [search,      setSearch]        = useState('');
  const [weekFilter,  setWeekFilter]    = useState('');
  const [loading,     setLoading]       = useState(true);

  const limit = 100;

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const clean: Record<string, string> = { page: String(page), limit: String(limit) };
      if (search)     clean.search = search;
      if (weekFilter) clean.week   = weekFilter;
      const result = await publicQuizAdminApi.getAllRegistrations(clean as any);
      setSubmissions(result.submissions || []);
      setTotal(result.total || 0);
      setConfigs(result.configs || []);
    } catch (e: any) {
      console.error(e);
    }
    setLoading(false);
  }, [page, search, weekFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const exportCSV = () => {
    if (!submissions.length) return;
    const headers = ['Week', 'Name', 'Email', 'Phone', 'Status', 'Score', '%', 'Passed', 'Approval', 'Registered At'];
    const rows = submissions.map(s => {
      const cfg    = s.publicQuizConfigId;
      const week   = cfg?.weekLabel || cfg?.title || (s.isPreRegistration ? 'Pre-Registration' : '—');
      const phone  = s.registrationData?.phone || s.registrationData?.mobile || '';
      const status = s.isPreRegistration ? 'Pre-Reg' : s.quizAttemptId ? 'Completed' : 'Registered';
      const appr   = s.isApproved === true ? 'Approved' : s.isApproved === false ? 'Rejected' : 'Pending';
      return [`"${week}"`, `"${s.name}"`, `"${s.email}"`, `"${phone}"`, status,
        s.score ?? '', s.percentage != null ? Math.round(s.percentage) : '',
        s.passed != null ? (s.passed ? 'Yes' : 'No') : '', appr,
        new Date(s.createdAt).toLocaleString('en-IN')];
    });
    const csv  = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a    = document.createElement('a');
    a.href     = URL.createObjectURL(blob);
    a.download = 'all-registrations.csv';
    a.click();
  };

  const weekOptions = configs
    .filter(c => c.weekLabel || c.title)
    .map(c => ({ value: c.weekLabel || c.title, label: c.weekLabel ? `${c.weekLabel} — ${c.title}` : c.title }));

  const completed = submissions.filter(s => s.quizAttemptId).length;
  const preRegs   = submissions.filter(s => s.isPreRegistration).length;
  const totalPages = Math.ceil(total / limit);

  return (
    <div style={{ padding: '24px 28px', maxWidth: 1280, width: '100%' }}>

      {/* ── Page Header ─────────────────────────────────────────── */}
      <div className="d-flex align-items-center justify-content-between mb-4 flex-wrap gap-3">
        <div>
          <button
            className="btn btn-sm btn-link text-secondary p-0 mb-1 d-flex align-items-center gap-1"
            style={{ textDecoration: 'none', fontSize: 13 }}
            onClick={() => navigate('/public-quiz-admin')}
          >
            <i className="fa-solid fa-arrow-left" style={{ fontSize: 11 }} /> Back to Quizzes
          </button>
          <h4 className="mb-0 fw-bold text-dark">All Registrations</h4>
          <p className="text-muted mb-0" style={{ fontSize: 13 }}>Every registration across all weekly quizzes</p>
        </div>
        <button className="btn btn-outline-secondary btn-sm d-flex align-items-center gap-2" onClick={exportCSV}>
          <i className="fa-solid fa-download" />
          Export CSV
        </button>
      </div>

      {/* ── Stat Cards ──────────────────────────────────────────── */}
      <div className="row g-3 mb-4">
        {STATS(total, completed, preRegs, configs.length).map(s => (
          <div key={s.label} className="col-6 col-md-3">
            <div className="card border-0 shadow-sm h-100" style={{ borderRadius: 12 }}>
              <div className="card-body d-flex align-items-center gap-3 py-3">
                <div
                  className="d-flex align-items-center justify-content-center rounded-3 flex-shrink-0"
                  style={{ width: 44, height: 44, background: s.color + '18' }}
                >
                  <i className={`fa-solid ${s.icon}`} style={{ color: s.color, fontSize: 18 }} />
                </div>
                <div>
                  <div className="fw-bold" style={{ fontSize: 22, lineHeight: 1, color: s.color }}>{s.value}</div>
                  <div className="text-muted" style={{ fontSize: 12, marginTop: 2 }}>{s.label}</div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Filter Toolbar ──────────────────────────────────────── */}
      <div className="card border-0 shadow-sm mb-4" style={{ borderRadius: 12 }}>
        <div className="card-body py-3 px-4">
          <div className="row g-3 align-items-center">
            <div className="col-12 col-md-5">
              <div className="input-group input-group-sm">
                <span className="input-group-text bg-white border-end-0">
                  <i className="fa-solid fa-magnifying-glass text-muted" style={{ fontSize: 12 }} />
                </span>
                <input
                  className="form-control border-start-0 ps-0"
                  placeholder="Search by name or email..."
                  value={search}
                  onChange={e => { setSearch(e.target.value); setPage(1); }}
                />
              </div>
            </div>
            <div className="col-12 col-md-4">
              <select
                className="form-select form-select-sm"
                value={weekFilter}
                onChange={e => { setWeekFilter(e.target.value); setPage(1); }}
              >
                <option value="">All Weeks</option>
                <option value="__pre__">Pre-Registrations only</option>
                {weekOptions.map(w => (
                  <option key={w.value} value={w.value}>{w.label}</option>
                ))}
              </select>
            </div>
            <div className="col-12 col-md-3 text-md-end">
              <span className="text-muted" style={{ fontSize: 13 }}>
                {loading ? 'Loading...' : `Showing ${submissions.length} of ${total} records`}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Table ───────────────────────────────────────────────── */}
      <div className="card border-0 shadow-sm" style={{ borderRadius: 12 }}>
        <div className="table-responsive">
          <table className="table table-hover mb-0 align-middle" style={{ fontSize: 13 }}>
            <thead style={{ background: '#f8f9fa' }}>
              <tr>
                <th className="ps-4 text-muted fw-semibold" style={{ width: 48, fontSize: 12 }}>#</th>
                <th className="text-muted fw-semibold" style={{ fontSize: 12, minWidth: 120 }}>WEEK</th>
                <th className="text-muted fw-semibold" style={{ fontSize: 12, minWidth: 150 }}>NAME</th>
                <th className="text-muted fw-semibold" style={{ fontSize: 12, minWidth: 180 }}>EMAIL</th>
                <th className="text-muted fw-semibold" style={{ fontSize: 12, minWidth: 120 }}>PHONE</th>
                <th className="text-muted fw-semibold" style={{ fontSize: 12, minWidth: 110 }}>STATUS</th>
                <th className="text-muted fw-semibold text-center" style={{ fontSize: 12, minWidth: 90 }}>SCORE</th>
                <th className="text-muted fw-semibold text-center" style={{ fontSize: 12, width: 70 }}>%</th>
                <th className="text-muted fw-semibold" style={{ fontSize: 12, minWidth: 100 }}>DATE</th>
                <th className="text-muted fw-semibold pe-4" style={{ fontSize: 12, minWidth: 100 }}>APPROVAL</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={10} className="text-center text-muted py-5">
                    <div className="spinner-border spinner-border-sm me-2" role="status" />
                    Loading registrations...
                  </td>
                </tr>
              )}
              {!loading && submissions.length === 0 && (
                <tr>
                  <td colSpan={10} className="text-center text-muted py-5">
                    <i className="fa-solid fa-inbox mb-2 d-block" style={{ fontSize: 28, opacity: .3 }} />
                    No registrations found
                  </td>
                </tr>
              )}
              {!loading && submissions.map((s, i) => {
                const cfg       = s.publicQuizConfigId;
                const weekLabel = cfg?.weekLabel || cfg?.title || null;
                const phone     = s.registrationData?.phone || s.registrationData?.mobile || '—';
                const isPreReg  = s.isPreRegistration;
                const hasAttempt = !!s.quizAttemptId;

                const statusKey = isPreReg ? 'preregistered' : hasAttempt ? 'completed' : 'registered';
                const apprKey   = s.isApproved === true ? 'approved' : s.isApproved === false ? 'rejected' : 'pending';

                return (
                  <tr
                    key={s._id}
                    style={{ cursor: 'pointer' }}
                    onClick={() => navigate(`/public-quiz-admin/registration/${s._id}`)}
                  >
                    <td className="ps-4 text-muted">{(page - 1) * limit + i + 1}</td>

                    <td>
                      {isPreReg ? (
                        <span
                          className="badge rounded-pill fw-normal"
                          style={{ background: '#fff8e1', color: '#b45309', border: '1px solid #fcd34d', fontSize: 11 }}
                        >
                          Pre-Reg
                        </span>
                      ) : weekLabel ? (
                        <span
                          className="badge rounded-pill fw-normal"
                          style={{ background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', fontSize: 11 }}
                        >
                          {weekLabel}
                        </span>
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                    </td>

                    <td>
                      <span className="fw-semibold text-dark">{s.name}</span>
                    </td>

                    <td className="text-muted">{s.email}</td>

                    <td className="text-muted">{phone}</td>

                    <td>
                      <span className={STATUS_BADGE[statusKey].cls} style={{ fontSize: 11 }}>
                        {STATUS_BADGE[statusKey].label}
                      </span>
                    </td>

                    <td className="text-center">
                      {hasAttempt
                        ? <span className="text-dark fw-semibold">{s.score ?? '—'}<span className="text-muted fw-normal">/{s.totalMarks ?? '—'}</span></span>
                        : <span className="text-muted">—</span>}
                    </td>

                    <td className="text-center">
                      {s.percentage != null ? (
                        <span className={`badge rounded-pill ${s.passed ? 'bg-success' : 'bg-danger'}`} style={{ fontSize: 11 }}>
                          {Math.round(s.percentage)}%
                        </span>
                      ) : <span className="text-muted">—</span>}
                    </td>

                    <td className="text-muted" style={{ fontSize: 12 }}>
                      {new Date(s.createdAt).toLocaleDateString('en-IN')}
                    </td>

                    <td className="pe-4" onClick={e => e.stopPropagation()}>
                      <span className={APPROVAL_BADGE[apprKey].cls} style={{ fontSize: 11 }}>
                        {APPROVAL_BADGE[apprKey].label}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="card-footer bg-white border-top d-flex align-items-center justify-content-between px-4 py-3" style={{ borderRadius: '0 0 12px 12px' }}>
            <span className="text-muted" style={{ fontSize: 13 }}>
              Page {page} of {totalPages}
            </span>
            <div className="d-flex gap-2">
              <button
                className="btn btn-sm btn-outline-secondary"
                disabled={page === 1}
                onClick={() => setPage(p => p - 1)}
              >
                ← Previous
              </button>
              <button
                className="btn btn-sm btn-outline-secondary"
                disabled={page >= totalPages}
                onClick={() => setPage(p => p + 1)}
              >
                Next →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AllRegistrations;
