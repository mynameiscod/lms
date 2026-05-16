import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { publicQuizAdminApi } from '../../api';

const APPROVAL_BADGE: Record<string, { cls: string; label: string }> = {
  approved: { cls: 'badge rounded-pill bg-success',          label: 'Approved' },
  rejected: { cls: 'badge rounded-pill bg-danger',           label: 'Rejected' },
  pending:  { cls: 'badge rounded-pill bg-warning text-dark', label: 'Pending' },
};

interface WeekCfg {
  quizId: string;
  topperCount: number;
  quiz?: { title: string };
}

interface LeaderEntry {
  _id: string;
  name: string;
  email: string;
  rank: number;
  score: number;
  totalMarks: number;
  percentage: number;
  timeSpentSeconds: number;
  passed: boolean;
}

interface AvailQuiz { _id: string; title: string; }

const AllRegistrations: React.FC = () => {
  const navigate = useNavigate();
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [weekLabels, setWeekLabels]   = useState<string[]>([]);
  const [total,      setTotal]        = useState(0);
  const [page,       setPage]         = useState(1);
  const [search,     setSearch]       = useState('');
  const [weekFilter, setWeekFilter]   = useState('');
  const [loading,    setLoading]      = useState(true);

  // Week settings panel
  const [weekCfg,        setWeekCfg]        = useState<WeekCfg | null>(null);
  const [cfgLoading,     setCfgLoading]     = useState(false);
  const [cfgSaving,      setCfgSaving]      = useState(false);
  const [cfgQuizId,      setCfgQuizId]      = useState('');
  const [cfgTopperCount, setCfgTopperCount] = useState(3);
  const [cfgMsg,         setCfgMsg]         = useState('');
  const [availQuizzes,   setAvailQuizzes]   = useState<AvailQuiz[]>([]);

  // Leaderboard
  const [leaderboard,   setLeaderboard]   = useState<LeaderEntry[]>([]);
  const [lbLoading,     setLbLoading]     = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);

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
      setWeekLabels(result.weekLabels || []);
    } catch (e: any) {
      console.error(e);
    }
    setLoading(false);
  }, [page, search, weekFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Load week config + available quizzes when a real week is selected
  useEffect(() => {
    if (!weekFilter || weekFilter === '__pre__') {
      setWeekCfg(null);
      setLeaderboard([]);
      setShowLeaderboard(false);
      return;
    }
    setCfgLoading(true);
    setCfgMsg('');
    Promise.all([
      publicQuizAdminApi.getWeekConfig(weekFilter),
      publicQuizAdminApi.getAvailableQuizzes(),
    ]).then(([cfg, quizzes]) => {
      setAvailQuizzes(quizzes.quizzes || []);
      if (cfg && cfg.quizId) {
        setWeekCfg(cfg);
        setCfgQuizId(cfg.quizId);
        setCfgTopperCount(cfg.topperCount ?? 3);
      } else {
        setWeekCfg(null);
        setCfgQuizId('');
        setCfgTopperCount(3);
      }
    }).catch(console.error).finally(() => setCfgLoading(false));
  }, [weekFilter]);

  const saveWeekConfig = async () => {
    if (!weekFilter || !cfgQuizId) return;
    setCfgSaving(true);
    setCfgMsg('');
    try {
      await publicQuizAdminApi.setWeekConfig(weekFilter, cfgQuizId, cfgTopperCount);
      setCfgMsg('Saved successfully!');
      // Reload config
      const cfg = await publicQuizAdminApi.getWeekConfig(weekFilter);
      setWeekCfg(cfg);
    } catch (e: any) {
      setCfgMsg('Save failed: ' + (e.message || 'Unknown error'));
    }
    setCfgSaving(false);
  };

  const loadLeaderboard = async () => {
    if (!weekFilter) return;
    setLbLoading(true);
    try {
      const data = await publicQuizAdminApi.getLeaderboard(weekFilter);
      setLeaderboard(data.leaderboard || []);
      setShowLeaderboard(true);
    } catch (e: any) {
      console.error(e);
    }
    setLbLoading(false);
  };

  const exportCSV = () => {
    if (!submissions.length) return;
    const headers = ['Week', 'Name', 'Email', 'Phone', 'Approval', 'Registered At'];
    const rows = submissions.map(s => {
      const phone  = s.registrationData?.phone || s.registrationData?.mobile || '';
      const week   = s.weekLabel || (s.isPreRegistration ? 'Pre-Registration' : '—');
      const appr   = s.isApproved === true ? 'Approved' : s.isApproved === false ? 'Rejected' : 'Pending';
      return [`"${week}"`, `"${s.name}"`, `"${s.email}"`, `"${phone}"`, appr,
        new Date(s.createdAt).toLocaleString('en-IN')];
    });
    const csv  = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a    = document.createElement('a');
    a.href     = URL.createObjectURL(blob);
    a.download = 'all-registrations.csv';
    a.click();
  };

  const approved  = submissions.filter(s => s.isApproved === true).length;
  const pending   = submissions.filter(s => s.isApproved == null).length;
  const totalPages = Math.ceil(total / limit);

  const STATS = [
    { label: 'Total Registrations', value: total,    icon: 'fa-users',        color: '#0d6efd' },
    { label: 'Approved',            value: approved,  icon: 'fa-circle-check', color: '#198754' },
    { label: 'Pending Review',      value: pending,   icon: 'fa-clock',        color: '#fd7e14' },
    { label: 'Weeks',               value: weekLabels.length, icon: 'fa-calendar-week', color: '#6f42c1' },
  ];

  const isRealWeek = weekFilter && weekFilter !== '__pre__';

  return (
    <div style={{ padding: '24px 28px', maxWidth: 1280, width: '100%' }}>

      {/* ── Page Header ─────────────────────────────────────────── */}
      <div className="d-flex align-items-center justify-content-between mb-4 flex-wrap gap-3">
        <div>
          <h4 className="mb-0 fw-bold text-dark">All Registrations</h4>
          <p className="text-muted mb-0" style={{ fontSize: 13 }}>Every registration received from the website</p>
        </div>
        <button className="btn btn-outline-secondary btn-sm d-flex align-items-center gap-2" onClick={exportCSV}>
          <i className="fa-solid fa-download" />
          Export CSV
        </button>
      </div>

      {/* ── Stat Cards ──────────────────────────────────────────── */}
      <div className="row g-3 mb-4">
        {STATS.map(s => (
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
                {weekLabels.map(w => (
                  <option key={w} value={w}>{w}</option>
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

      {/* ── Week Settings Panel (shown when a real week is selected) ── */}
      {isRealWeek && (
        <div className="card border-0 shadow-sm mb-4" style={{ borderRadius: 12 }}>
          <div className="card-header fw-semibold d-flex align-items-center justify-content-between bg-white border-bottom" style={{ borderRadius: '12px 12px 0 0' }}>
            <span>
              <i className="fa-solid fa-gear me-2 text-primary" />
              Week Settings — <em>{weekFilter}</em>
            </span>
            <button
              className="btn btn-sm btn-outline-primary d-flex align-items-center gap-1"
              onClick={loadLeaderboard}
              disabled={lbLoading}
            >
              {lbLoading
                ? <><span className="spinner-border spinner-border-sm" /> Loading…</>
                : <><i className="fa-solid fa-trophy" /> View Leaderboard</>}
            </button>
          </div>
          <div className="card-body px-4 py-3">
            {cfgLoading ? (
              <div className="text-center py-3 text-muted">
                <span className="spinner-border spinner-border-sm me-2" />Loading config…
              </div>
            ) : (
              <div className="row g-3 align-items-end">
                <div className="col-12 col-md-5">
                  <label className="form-label small fw-semibold mb-1">Quiz for this week</label>
                  <select
                    className="form-select form-select-sm"
                    value={cfgQuizId}
                    onChange={e => setCfgQuizId(e.target.value)}
                  >
                    <option value="">— Select a quiz —</option>
                    {availQuizzes.map(q => (
                      <option key={q._id} value={q._id}>{q.title}</option>
                    ))}
                  </select>
                  <div className="form-text">Approved candidates will receive a link to this quiz.</div>
                </div>
                <div className="col-12 col-md-3">
                  <label className="form-label small fw-semibold mb-1">Topper count</label>
                  <input
                    type="number"
                    className="form-control form-control-sm"
                    min={1}
                    max={50}
                    value={cfgTopperCount}
                    onChange={e => setCfgTopperCount(Number(e.target.value))}
                  />
                  <div className="form-text">How many top positions to track (1st, 2nd…)</div>
                </div>
                <div className="col-12 col-md-4 d-flex align-items-end gap-2">
                  <button
                    className="btn btn-primary btn-sm px-4"
                    disabled={cfgSaving || !cfgQuizId}
                    onClick={saveWeekConfig}
                  >
                    {cfgSaving ? <><span className="spinner-border spinner-border-sm me-1" />Saving…</> : 'Save Config'}
                  </button>
                  {cfgMsg && (
                    <span className={`small ${cfgMsg.startsWith('Saved') ? 'text-success' : 'text-danger'}`}>
                      {cfgMsg}
                    </span>
                  )}
                </div>
                {weekCfg?.quiz && (
                  <div className="col-12">
                    <div className="alert alert-info py-2 mb-0 small">
                      <i className="fa-solid fa-circle-info me-1" />
                      Currently configured quiz: <strong>{weekCfg.quiz.title}</strong> — {cfgTopperCount} topper position{cfgTopperCount !== 1 ? 's' : ''} tracked.
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Leaderboard ─────────────────────────────────────────── */}
      {showLeaderboard && isRealWeek && (
        <div className="card border-0 shadow-sm mb-4" style={{ borderRadius: 12 }}>
          <div className="card-header fw-semibold d-flex align-items-center justify-content-between bg-white border-bottom" style={{ borderRadius: '12px 12px 0 0' }}>
            <span><i className="fa-solid fa-trophy me-2 text-warning" />Leaderboard — {weekFilter}</span>
            <button className="btn btn-sm btn-outline-secondary" onClick={() => setShowLeaderboard(false)}>Hide</button>
          </div>
          <div className="table-responsive">
            <table className="table table-hover mb-0 align-middle" style={{ fontSize: 13 }}>
              <thead style={{ background: '#f8f9fa' }}>
                <tr>
                  <th className="ps-4 text-muted fw-semibold" style={{ fontSize: 12, width: 60 }}>RANK</th>
                  <th className="text-muted fw-semibold" style={{ fontSize: 12 }}>NAME</th>
                  <th className="text-muted fw-semibold" style={{ fontSize: 12 }}>EMAIL</th>
                  <th className="text-muted fw-semibold" style={{ fontSize: 12 }}>SCORE</th>
                  <th className="text-muted fw-semibold" style={{ fontSize: 12 }}>%</th>
                  <th className="text-muted fw-semibold pe-4" style={{ fontSize: 12 }}>TIME</th>
                </tr>
              </thead>
              <tbody>
                {leaderboard.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center text-muted py-4">
                      No completed quiz attempts yet for this week.
                    </td>
                  </tr>
                ) : leaderboard.map(entry => {
                  const medal = entry.rank === 1 ? '🥇' : entry.rank === 2 ? '🥈' : entry.rank === 3 ? '🥉' : `#${entry.rank}`;
                  const mins  = Math.floor(entry.timeSpentSeconds / 60);
                  const secs  = entry.timeSpentSeconds % 60;
                  const timeStr = `${mins}m ${secs}s`;
                  return (
                    <tr key={entry._id} className={entry.rank <= 3 ? 'table-warning' : ''}>
                      <td className="ps-4 fw-bold" style={{ fontSize: 16 }}>{medal}</td>
                      <td className="fw-semibold">{entry.name}</td>
                      <td className="text-muted">{entry.email}</td>
                      <td>{entry.score}/{entry.totalMarks}</td>
                      <td>
                        <span className={`badge ${entry.passed ? 'bg-success' : 'bg-secondary'}`}>
                          {entry.percentage?.toFixed(1)}%
                        </span>
                      </td>
                      <td className="pe-4 text-muted">{timeStr}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

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
                <th className="text-muted fw-semibold" style={{ fontSize: 12, minWidth: 100 }}>DATE</th>
                <th className="text-muted fw-semibold pe-4" style={{ fontSize: 12, minWidth: 100 }}>APPROVAL</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={7} className="text-center text-muted py-5">
                    <div className="spinner-border spinner-border-sm me-2" role="status" />
                    Loading registrations...
                  </td>
                </tr>
              )}
              {!loading && submissions.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center text-muted py-5">
                    <i className="fa-solid fa-inbox mb-2 d-block" style={{ fontSize: 28, opacity: .3 }} />
                    No registrations found
                  </td>
                </tr>
              )}
              {!loading && submissions.map((s, i) => {
                const phone   = s.registrationData?.phone || s.registrationData?.mobile || '—';
                const isPreReg = s.isPreRegistration;
                const apprKey = s.isApproved === true ? 'approved' : s.isApproved === false ? 'rejected' : 'pending';

                return (
                  <tr
                    key={s._id}
                    style={{ cursor: 'pointer' }}
                    onClick={() => navigate(`/registrations/${s._id}`)}
                  >
                    <td className="ps-4 text-muted">{(page - 1) * limit + i + 1}</td>

                    <td>
                      {isPreReg ? (
                        <span className="badge rounded-pill fw-normal" style={{ background: '#fff8e1', color: '#b45309', border: '1px solid #fcd34d', fontSize: 11 }}>
                          Pre-Reg
                        </span>
                      ) : s.weekLabel ? (
                        <span className="badge rounded-pill fw-normal" style={{ background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', fontSize: 11 }}>
                          {s.weekLabel}
                        </span>
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                    </td>

                    <td><span className="fw-semibold text-dark">{s.name}</span></td>
                    <td className="text-muted">{s.email}</td>
                    <td className="text-muted">{phone}</td>
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

        {totalPages > 1 && (
          <div className="card-footer bg-white border-top d-flex align-items-center justify-content-between px-4 py-3" style={{ borderRadius: '0 0 12px 12px' }}>
            <span className="text-muted" style={{ fontSize: 13 }}>Page {page} of {totalPages}</span>
            <div className="d-flex gap-2">
              <button className="btn btn-sm btn-outline-secondary" disabled={page === 1} onClick={() => setPage(p => p - 1)}>← Previous</button>
              <button className="btn btn-sm btn-outline-secondary" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Next →</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AllRegistrations;
