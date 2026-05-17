import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { publicQuizAdminApi } from '../../api';

const APPROVAL_BADGE: Record<string, { cls: string; label: string }> = {
  approved: { cls: 'badge rounded-pill bg-success',          label: 'Approved' },
  rejected: { cls: 'badge rounded-pill bg-danger',           label: 'Rejected' },
  pending:  { cls: 'badge rounded-pill bg-warning text-dark', label: 'Pending' },
};

interface LeaderEntry {
  _id: string; name: string; email: string;
  rank: number; score: number; totalMarks: number;
  percentage: number; timeSpentSeconds: number; passed: boolean;
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

  // Week config panel (always visible)
  const [showWeekPanel,  setShowWeekPanel]   = useState(false);
  const [cfgWeekLabel,   setCfgWeekLabel]    = useState('');
  const [cfgQuizId,      setCfgQuizId]       = useState('');
  const [cfgTopperCount, setCfgTopperCount]  = useState(3);
  const [cfgEventTitle,  setCfgEventTitle]   = useState('');
  const [cfgEventDate,   setCfgEventDate]    = useState('');
  const [cfgEventTime,   setCfgEventTime]    = useState('');
  const [cfgBattleUrl,   setCfgBattleUrl]    = useState('');
  const [cfgSaving,      setCfgSaving]       = useState(false);
  const [cfgLoading,     setCfgLoading]      = useState(false);
  const [cfgMsg,         setCfgMsg]          = useState('');
  const [availQuizzes,   setAvailQuizzes]    = useState<AvailQuiz[]>([]);
  const [quizzesLoaded,  setQuizzesLoaded]   = useState(false);

  // Leaderboard
  const [leaderboard,     setLeaderboard]     = useState<LeaderEntry[]>([]);
  const [lbLoading,       setLbLoading]       = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [lbWeek,          setLbWeek]          = useState('');

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

  // Load available quizzes once when panel opens
  const openWeekPanel = async () => {
    setShowWeekPanel(true);
    setCfgMsg('');
    if (!quizzesLoaded) {
      const data = await publicQuizAdminApi.getAvailableQuizzes().catch(() => []);
      const list = Array.isArray(data) ? data : (data?.quizzes || []);
      setAvailQuizzes(list);
      setQuizzesLoaded(true);
    }
  };

  // Load existing config when a week label is typed/selected in the panel
  const loadCfgForWeek = async (label: string) => {
    if (!label.trim()) { setCfgQuizId(''); setCfgTopperCount(3); return; }
    setCfgLoading(true);
    try {
      const cfg = await publicQuizAdminApi.getWeekConfig(label.trim());
      if (cfg?.quizId) {
        setCfgQuizId(cfg.quizId);
        setCfgTopperCount(cfg.topperCount ?? 3);
        setCfgEventTitle(cfg.eventTitle || '');
        setCfgEventTime(cfg.eventTimeIST || '');
        setCfgBattleUrl(cfg.techBattleUrl || '');
        if (cfg.eventDate) setCfgEventDate(cfg.eventDate.slice(0, 16)); // datetime-local format
      } else {
        setCfgQuizId(''); setCfgTopperCount(3);
        setCfgEventTitle(''); setCfgEventDate(''); setCfgEventTime(''); setCfgBattleUrl('');
      }
    } catch { /* no config yet */ }
    setCfgLoading(false);
  };

  const saveWeekConfig = async () => {
    if (!cfgWeekLabel.trim() || !cfgQuizId) return;
    setCfgSaving(true);
    setCfgMsg('');
    try {
      await publicQuizAdminApi.setWeekConfig(cfgWeekLabel.trim(), cfgQuizId, cfgTopperCount, {
        eventTitle:   cfgEventTitle || undefined,
        eventDate:    cfgEventDate  || undefined,
        eventTimeIST: cfgEventTime  || undefined,
        techBattleUrl:cfgBattleUrl  || undefined,
      });
      setCfgMsg('✅ Week config saved! Approving students in this week will now auto-generate quiz links.');
      // Refresh week labels in dropdown
      fetchData();
    } catch (e: any) {
      setCfgMsg('Save failed: ' + (e.message || 'Unknown error'));
    }
    setCfgSaving(false);
  };

  const loadLeaderboard = async (week: string) => {
    if (!week) return;
    setLbLoading(true);
    setLbWeek(week);
    try {
      const data = await publicQuizAdminApi.getLeaderboard(week);
      setLeaderboard(data.leaderboard || data.toppers || []);
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
      const phone = s.registrationData?.phone || s.registrationData?.mobile || '';
      const week  = s.weekLabel || (s.isPreRegistration ? 'Pre-Registration' : '—');
      const appr  = s.isApproved === true ? 'Approved' : s.isApproved === false ? 'Rejected' : 'Pending';
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

  const approved   = submissions.filter(s => s.isApproved === true).length;
  const pending    = submissions.filter(s => s.isApproved == null).length;
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
        <div className="d-flex gap-2">
          <button
            className="btn btn-primary btn-sm d-flex align-items-center gap-2"
            onClick={showWeekPanel ? () => setShowWeekPanel(false) : openWeekPanel}
          >
            <i className="fa-solid fa-gear" />
            {showWeekPanel ? 'Hide Week Config' : 'Configure Week'}
          </button>
          <button className="btn btn-outline-secondary btn-sm d-flex align-items-center gap-2" onClick={exportCSV}>
            <i className="fa-solid fa-download" />
            Export CSV
          </button>
        </div>
      </div>

      {/* ── Week Configuration Panel (always accessible) ────────── */}
      {showWeekPanel && (
        <div className="card border-0 shadow mb-4" style={{ borderRadius: 12, borderLeft: '4px solid #0d6efd' }}>
          <div className="card-header fw-semibold bg-white d-flex align-items-center gap-2" style={{ borderRadius: '12px 12px 0 0' }}>
            <i className="fa-solid fa-gear text-primary" />
            Week Configuration
            <span className="text-muted fw-normal small ms-1">— Set which quiz runs for a week so quiz links are auto-generated on approval</span>
          </div>
          <div className="card-body px-4 py-3">
            <div className="row g-3 align-items-end">
              {/* Week label input + existing week selector */}
              <div className="col-12 col-md-3">
                <label className="form-label small fw-semibold mb-1">Week Label <span className="text-danger">*</span></label>
                <input
                  className="form-control form-control-sm"
                  placeholder='e.g. Week 1'
                  value={cfgWeekLabel}
                  onChange={e => { setCfgWeekLabel(e.target.value); setCfgMsg(''); }}
                  onBlur={e => loadCfgForWeek(e.target.value)}
                />
                {weekLabels.length > 0 && (
                  <select
                    className="form-select form-select-sm mt-1"
                    value=""
                    onChange={e => {
                      if (!e.target.value) return;
                      setCfgWeekLabel(e.target.value);
                      setCfgMsg('');
                      loadCfgForWeek(e.target.value);
                    }}
                  >
                    <option value="">Or pick existing…</option>
                    {weekLabels.map(w => <option key={w} value={w}>{w}</option>)}
                  </select>
                )}
              </div>

              {/* Quiz selector */}
              <div className="col-12 col-md-4">
                <label className="form-label small fw-semibold mb-1">Quiz for this week <span className="text-danger">*</span></label>
                {cfgLoading ? (
                  <div className="text-muted small"><span className="spinner-border spinner-border-sm me-1" />Loading…</div>
                ) : (
                  <select
                    className="form-select form-select-sm"
                    value={cfgQuizId}
                    onChange={e => setCfgQuizId(e.target.value)}
                  >
                    <option value="">— Select a quiz —</option>
                    {availQuizzes.map(q => <option key={q._id} value={q._id}>{q.title}</option>)}
                  </select>
                )}
                {quizzesLoaded && availQuizzes.length === 0 && (
                  <div className="text-danger small mt-1">No active quizzes. Create one in Manage Quizzes first.</div>
                )}
                <div className="form-text">Approved students in this week will receive a link to this quiz.</div>
              </div>

              {/* Topper count */}
              <div className="col-12 col-md-2">
                <label className="form-label small fw-semibold mb-1">Topper count</label>
                <input
                  type="number" min={1} max={50}
                  className="form-control form-control-sm"
                  value={cfgTopperCount}
                  onChange={e => setCfgTopperCount(Number(e.target.value))}
                />
                <div className="form-text">Top N positions tracked</div>
              </div>

              {/* Event details — used in approval email */}
              <div className="col-12">
                <hr className="my-1" />
                <p className="small fw-semibold text-muted mb-2">Email details (sent to students on approval)</p>
              </div>
              <div className="col-12 col-md-4">
                <label className="form-label small fw-semibold mb-1">Event Title</label>
                <input
                  className="form-control form-control-sm"
                  placeholder="e.g. Weekly Tech Battle 2026"
                  value={cfgEventTitle}
                  onChange={e => setCfgEventTitle(e.target.value)}
                />
              </div>
              <div className="col-12 col-md-3">
                <label className="form-label small fw-semibold mb-1">Event Date &amp; Time</label>
                <input
                  type="datetime-local"
                  className="form-control form-control-sm"
                  value={cfgEventDate}
                  onChange={e => setCfgEventDate(e.target.value)}
                />
                <div className="form-text">Used for "Add to Calendar" link</div>
              </div>
              <div className="col-12 col-md-2">
                <label className="form-label small fw-semibold mb-1">Display Time</label>
                <input
                  className="form-control form-control-sm"
                  placeholder="e.g. 7:00 PM IST"
                  value={cfgEventTime}
                  onChange={e => setCfgEventTime(e.target.value)}
                />
                <div className="form-text">Shown in the email</div>
              </div>
              <div className="col-12 col-md-3">
                <label className="form-label small fw-semibold mb-1">Tech Battle Page URL</label>
                <input
                  className="form-control form-control-sm"
                  placeholder="https://codebegun.com/battle"
                  value={cfgBattleUrl}
                  onChange={e => setCfgBattleUrl(e.target.value)}
                />
              </div>

              {/* Save */}
              <div className="col-12 col-md-3 d-flex align-items-end gap-2 flex-wrap">
                <button
                  className="btn btn-primary btn-sm px-4"
                  disabled={cfgSaving || !cfgQuizId || !cfgWeekLabel.trim()}
                  onClick={saveWeekConfig}
                >
                  {cfgSaving ? <><span className="spinner-border spinner-border-sm me-1" />Saving…</> : 'Save Config'}
                </button>
                {weekLabels.length > 0 && (
                  <button
                    className="btn btn-outline-secondary btn-sm"
                    disabled={lbLoading || !cfgWeekLabel.trim()}
                    onClick={() => loadLeaderboard(cfgWeekLabel.trim())}
                  >
                    <i className="fa-solid fa-trophy me-1" />Leaderboard
                  </button>
                )}
              </div>

              {cfgMsg && (
                <div className="col-12">
                  <div className={`alert py-2 mb-0 small ${cfgMsg.startsWith('✅') ? 'alert-success' : 'alert-danger'}`}>
                    {cfgMsg}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Leaderboard ─────────────────────────────────────────── */}
      {showLeaderboard && (
        <div className="card border-0 shadow-sm mb-4" style={{ borderRadius: 12 }}>
          <div className="card-header fw-semibold d-flex align-items-center justify-content-between bg-white" style={{ borderRadius: '12px 12px 0 0' }}>
            <span><i className="fa-solid fa-trophy me-2 text-warning" />Leaderboard — {lbWeek}</span>
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
                {lbLoading ? (
                  <tr><td colSpan={6} className="text-center py-4"><span className="spinner-border spinner-border-sm" /></td></tr>
                ) : leaderboard.length === 0 ? (
                  <tr><td colSpan={6} className="text-center text-muted py-4">No completed quiz attempts yet for this week.</td></tr>
                ) : leaderboard.map(entry => {
                  const medal  = entry.rank === 1 ? '🥇' : entry.rank === 2 ? '🥈' : entry.rank === 3 ? '🥉' : `#${entry.rank}`;
                  const mins   = Math.floor(entry.timeSpentSeconds / 60);
                  const secs   = entry.timeSpentSeconds % 60;
                  return (
                    <tr key={entry._id} className={entry.rank <= 3 ? 'table-warning' : ''}>
                      <td className="ps-4 fw-bold" style={{ fontSize: 16 }}>{medal}</td>
                      <td className="fw-semibold">{entry.name}</td>
                      <td className="text-muted">{entry.email}</td>
                      <td>{entry.score}/{entry.totalMarks}</td>
                      <td><span className={`badge ${entry.passed ? 'bg-success' : 'bg-secondary'}`}>{entry.percentage?.toFixed(1)}%</span></td>
                      <td className="pe-4 text-muted">{mins}m {secs}s</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

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
                {weekLabels.map(w => <option key={w} value={w}>{w}</option>)}
              </select>
            </div>
            <div className="col-12 col-md-3 d-flex align-items-center justify-content-md-end gap-2 flex-wrap">
              {isRealWeek && (
                <button
                  className="btn btn-sm btn-outline-warning"
                  disabled={lbLoading}
                  onClick={() => loadLeaderboard(weekFilter)}
                >
                  <i className="fa-solid fa-trophy me-1" />
                  {lbLoading ? 'Loading…' : 'Leaderboard'}
                </button>
              )}
              <span className="text-muted" style={{ fontSize: 13 }}>
                {loading ? 'Loading...' : `${submissions.length} of ${total}`}
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
                <th className="text-muted fw-semibold" style={{ fontSize: 12, minWidth: 100 }}>DATE</th>
                <th className="text-muted fw-semibold pe-4" style={{ fontSize: 12, minWidth: 100 }}>APPROVAL</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={7} className="text-center text-muted py-5">
                    <div className="spinner-border spinner-border-sm me-2" />Loading registrations...
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
                const phone    = s.registrationData?.phone || s.registrationData?.mobile || '—';
                const isPreReg = s.isPreRegistration && !s.weekLabel;
                const apprKey  = s.isApproved === true ? 'approved' : s.isApproved === false ? 'rejected' : 'pending';

                return (
                  <tr key={s._id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/registrations/${s._id}`)}>
                    <td className="ps-4 text-muted">{(page - 1) * limit + i + 1}</td>
                    <td>
                      {isPreReg ? (
                        <span className="badge rounded-pill fw-normal" style={{ background: '#fff8e1', color: '#b45309', border: '1px solid #fcd34d', fontSize: 11 }}>Pre-Reg</span>
                      ) : s.weekLabel ? (
                        <span className="badge rounded-pill fw-normal" style={{ background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', fontSize: 11 }}>{s.weekLabel}</span>
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                    </td>
                    <td><span className="fw-semibold text-dark">{s.name}</span></td>
                    <td className="text-muted">{s.email}</td>
                    <td className="text-muted">{phone}</td>
                    <td className="text-muted" style={{ fontSize: 12 }}>{new Date(s.createdAt).toLocaleDateString('en-IN')}</td>
                    <td className="pe-4" onClick={e => e.stopPropagation()}>
                      <span className={APPROVAL_BADGE[apprKey].cls} style={{ fontSize: 11 }}>{APPROVAL_BADGE[apprKey].label}</span>
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
