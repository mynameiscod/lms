import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { publicQuizAdminApi } from '../../api';

const APPROVAL_BADGE: Record<string, { bg: string; color: string; label: string }> = {
  approved: { bg: '#dcfce7', color: '#15803d', label: 'Approved' },
  rejected: { bg: '#fee2e2', color: '#b91c1c', label: 'Rejected' },
  pending:  { bg: '#fef9c3', color: '#854d0e', label: 'Pending'  },
};

interface LeaderEntry {
  _id: string; name: string; email: string;
  rank: number; score: number; totalMarks: number;
  percentage: number; timeSpentSeconds: number; passed: boolean;
}

interface AvailQuiz { _id: string; title: string; totalQuestions?: number; totalMarks?: number; }

const AllRegistrations: React.FC = () => {
  const navigate = useNavigate();
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [weekLabels, setWeekLabels]   = useState<string[]>([]);
  const [total,      setTotal]        = useState(0);
  const [page,       setPage]         = useState(1);
  const [search,     setSearch]       = useState('');
  const [weekFilter, setWeekFilter]   = useState('');
  const [loading,    setLoading]      = useState(true);

  // Week config panel
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
  const [sending,        setSending]         = useState(false);
  const [sendMsg,        setSendMsg]         = useState('');

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

  const openWeekPanel = async () => {
    setShowWeekPanel(true);
    setCfgMsg('');
    setSendMsg('');
    if (!quizzesLoaded) {
      const data = await publicQuizAdminApi.getAvailableQuizzes().catch(() => []);
      const list = Array.isArray(data) ? data : (data?.quizzes || []);
      setAvailQuizzes(list);
      setQuizzesLoaded(true);
    }
  };

  const loadCfgForWeek = async (label: string) => {
    if (!label.trim()) {
      setCfgQuizId(''); setCfgTopperCount(3);
      setCfgEventTitle(''); setCfgEventDate(''); setCfgEventTime(''); setCfgBattleUrl('');
      return;
    }
    setCfgLoading(true);
    try {
      const cfg = await publicQuizAdminApi.getWeekConfig(label.trim());
      if (cfg?.quizId) {
        setCfgQuizId(cfg.quizId);
        setCfgTopperCount(cfg.topperCount ?? 3);
        setCfgEventTitle(cfg.eventTitle || '');
        setCfgEventTime(cfg.eventTimeIST || '');
        setCfgBattleUrl(cfg.techBattleUrl || '');
        if (cfg.eventDate) setCfgEventDate(cfg.eventDate.slice(0, 16));
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
      setCfgMsg('✅ Saved! Approved students will receive quiz links when you click "Send Quiz Links".');
      fetchData();
    } catch (e: any) {
      setCfgMsg('❌ Save failed: ' + (e.message || 'Unknown error'));
    }
    setCfgSaving(false);
  };

  const handleSendQuizLinks = async () => {
    if (!cfgWeekLabel.trim()) return;
    if (!window.confirm(`Send quiz links to all approved students in "${cfgWeekLabel}"?`)) return;
    setSending(true);
    setSendMsg('');
    try {
      const res = await publicQuizAdminApi.sendWeekQuizLinks(cfgWeekLabel.trim());
      setSendMsg(`✅ Sent to ${res.sent} student${res.sent !== 1 ? 's' : ''}.`);
    } catch (e: any) {
      setSendMsg('❌ Failed: ' + (e.message || 'Unknown error'));
    }
    setSending(false);
  };

  const loadLeaderboard = async (week: string) => {
    if (!week) return;
    setLbLoading(true);
    setLbWeek(week);
    try {
      const data = await publicQuizAdminApi.getLeaderboard(week);
      setLeaderboard(data.leaderboard || data.toppers || []);
      setShowLeaderboard(true);
    } catch (e: any) { console.error(e); }
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
    { label: 'Total',    value: total,          color: '#0d6efd', icon: 'fa-users' },
    { label: 'Approved', value: approved,        color: '#15803d', icon: 'fa-circle-check' },
    { label: 'Pending',  value: pending,         color: '#b45309', icon: 'fa-clock' },
    { label: 'Weeks',    value: weekLabels.length, color: '#7c3aed', icon: 'fa-calendar-week' },
  ];

  const isRealWeek = weekFilter && weekFilter !== '__pre__';
  const selectedQuiz = availQuizzes.find(q => q._id === cfgQuizId);

  return (
    <div style={{ padding: '24px 28px', maxWidth: 1100, width: '100%' }}>

      {/* ── Header ── */}
      <div className="d-flex align-items-center justify-content-between mb-4 flex-wrap gap-2">
        <div>
          <h4 className="mb-0 fw-bold">All Registrations</h4>
          <p className="text-muted mb-0" style={{ fontSize: 13 }}>Every registration received via the website</p>
        </div>
        <div className="d-flex gap-2">
          <button
            className={`btn btn-sm ${showWeekPanel ? 'btn-primary' : 'btn-outline-primary'} d-flex align-items-center gap-2`}
            onClick={showWeekPanel ? () => setShowWeekPanel(false) : openWeekPanel}
          >
            <i className="fa-solid fa-gear" />
            Configure Week Quiz
          </button>
          <button className="btn btn-outline-secondary btn-sm d-flex align-items-center gap-2" onClick={exportCSV}>
            <i className="fa-solid fa-download" />
            Export CSV
          </button>
        </div>
      </div>

      {/* ── Configure Week Panel ── */}
      {showWeekPanel && (
        <div className="card border-0 shadow mb-4" style={{ borderRadius: 14 }}>
          <div className="card-header bg-white fw-bold d-flex align-items-center gap-2 border-0 pt-4 pb-0 px-4" style={{ borderRadius: '14px 14px 0 0' }}>
            <span style={{ background: '#eff6ff', color: '#1d4ed8', borderRadius: 8, padding: '4px 12px', fontSize: 13 }}>
              Week Quiz Setup
            </span>
          </div>
          <div className="card-body px-4 py-4">

            {/* ── Step 1: Week ── */}
            <div className="mb-4 pb-4" style={{ borderBottom: '1px solid #e2e8f0' }}>
              <p className="mb-2" style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, color: '#94a3b8', textTransform: 'uppercase' }}>
                Step 1 — Identify the Week
              </p>
              <div className="row g-3">
                <div className="col-12 col-md-5">
                  <label className="form-label small fw-semibold mb-1">
                    Week Label <span className="text-danger">*</span>
                  </label>
                  <input
                    className="form-control"
                    placeholder="e.g. Week 1, May Batch, Round 2..."
                    value={cfgWeekLabel}
                    onChange={e => { setCfgWeekLabel(e.target.value); setCfgMsg(''); setSendMsg(''); }}
                    onBlur={e => loadCfgForWeek(e.target.value)}
                  />
                  <div className="form-text">A label for this quiz batch — shown on registrations</div>
                </div>
                {weekLabels.length > 0 && (
                  <div className="col-12 col-md-4">
                    <label className="form-label small fw-semibold mb-1">Load existing week</label>
                    <select
                      className="form-select"
                      value=""
                      onChange={e => {
                        if (!e.target.value) return;
                        setCfgWeekLabel(e.target.value);
                        setCfgMsg('');
                        setSendMsg('');
                        loadCfgForWeek(e.target.value);
                      }}
                    >
                      <option value="">— pick to load —</option>
                      {weekLabels.map(w => <option key={w} value={w}>{w}</option>)}
                    </select>
                    <div className="form-text">Loads saved config for that week</div>
                  </div>
                )}
              </div>
            </div>

            {/* ── Step 2: Quiz & Schedule ── */}
            <div className="mb-4 pb-4" style={{ borderBottom: '1px solid #e2e8f0' }}>
              <p className="mb-2" style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, color: '#94a3b8', textTransform: 'uppercase' }}>
                Step 2 — Quiz &amp; Schedule
              </p>
              <div className="row g-3 align-items-start">
                <div className="col-12 col-md-5">
                  <label className="form-label small fw-semibold mb-1">
                    Quiz <span className="text-danger">*</span>
                  </label>
                  {cfgLoading ? (
                    <div className="text-muted small py-2"><span className="spinner-border spinner-border-sm me-2" />Loading…</div>
                  ) : (
                    <select
                      className="form-select"
                      value={cfgQuizId}
                      onChange={e => setCfgQuizId(e.target.value)}
                    >
                      <option value="">— select a quiz —</option>
                      {availQuizzes.map(q => (
                        <option key={q._id} value={q._id}>
                          {q.title}{q.totalQuestions ? ` (${q.totalQuestions}Q)` : ''}
                        </option>
                      ))}
                    </select>
                  )}
                  {quizzesLoaded && availQuizzes.length === 0 && (
                    <div className="text-danger small mt-1">No active quizzes — create one in Manage Quizzes first.</div>
                  )}
                  {selectedQuiz && (
                    <div className="form-text text-success">
                      ✓ {selectedQuiz.title}{selectedQuiz.totalMarks ? ` · ${selectedQuiz.totalMarks} marks` : ''}
                    </div>
                  )}
                </div>

                <div className="col-12 col-md-4">
                  <label className="form-label small fw-semibold mb-1">Quiz Opens At</label>
                  <input
                    type="datetime-local"
                    className="form-control"
                    value={cfgEventDate}
                    onChange={e => setCfgEventDate(e.target.value)}
                  />
                  <div className="form-text">Students cannot access the quiz before this time</div>
                </div>

                <div className="col-12 col-md-3">
                  <label className="form-label small fw-semibold mb-1">Display Time (IST)</label>
                  <input
                    className="form-control"
                    placeholder="7:00 PM IST"
                    value={cfgEventTime}
                    onChange={e => setCfgEventTime(e.target.value)}
                  />
                  <div className="form-text">Shown in approval email to students</div>
                </div>
              </div>
            </div>

            {/* ── Step 3: Branding ── */}
            <div className="mb-4">
              <p className="mb-2" style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, color: '#94a3b8', textTransform: 'uppercase' }}>
                Step 3 — Event Branding (Optional)
              </p>
              <div className="row g-3">
                <div className="col-12 col-md-5">
                  <label className="form-label small fw-semibold mb-1">Event Title</label>
                  <input
                    className="form-control"
                    placeholder="Weekly Tech Battle 2026"
                    value={cfgEventTitle}
                    onChange={e => setCfgEventTitle(e.target.value)}
                  />
                </div>
                <div className="col-12 col-md-4">
                  <label className="form-label small fw-semibold mb-1">Tech Battle Page URL</label>
                  <input
                    className="form-control"
                    placeholder="https://codebegun.com/battle"
                    value={cfgBattleUrl}
                    onChange={e => setCfgBattleUrl(e.target.value)}
                  />
                </div>
                <div className="col-12 col-md-3">
                  <label className="form-label small fw-semibold mb-1">Topper Count</label>
                  <input
                    type="number" min={1} max={50}
                    className="form-control"
                    value={cfgTopperCount}
                    onChange={e => setCfgTopperCount(Number(e.target.value))}
                  />
                  <div className="form-text">Top N positions tracked in leaderboard</div>
                </div>
              </div>
            </div>

            {/* ── Actions ── */}
            <div className="d-flex gap-3 flex-wrap align-items-center">
              <button
                className="btn btn-primary px-4"
                disabled={cfgSaving || !cfgQuizId || !cfgWeekLabel.trim()}
                onClick={saveWeekConfig}
              >
                {cfgSaving
                  ? <><span className="spinner-border spinner-border-sm me-2" />Saving…</>
                  : '✓ Save Week Config'}
              </button>

              <button
                className="btn btn-success px-4"
                disabled={sending || !cfgWeekLabel.trim()}
                onClick={handleSendQuizLinks}
                title="Sends quiz link emails to every approved student in this week who has a quiz token"
              >
                {sending
                  ? <><span className="spinner-border spinner-border-sm me-2" />Sending…</>
                  : <><i className="fa-solid fa-paper-plane me-2" />Send Quiz Links to Approved</>}
              </button>

              {weekLabels.length > 0 && (
                <button
                  className="btn btn-outline-warning px-3"
                  disabled={lbLoading || !cfgWeekLabel.trim()}
                  onClick={() => loadLeaderboard(cfgWeekLabel.trim())}
                >
                  <i className="fa-solid fa-trophy me-1" />Leaderboard
                </button>
              )}
            </div>

            {cfgMsg && (
              <div className={`alert py-2 mt-3 mb-0 small ${cfgMsg.startsWith('✅') ? 'alert-success' : 'alert-danger'}`}>
                {cfgMsg}
              </div>
            )}
            {sendMsg && (
              <div className={`alert py-2 mt-2 mb-0 small ${sendMsg.startsWith('✅') ? 'alert-success' : 'alert-danger'}`}>
                {sendMsg}
              </div>
            )}

            {/* Flow explanation */}
            <div className="mt-4 p-3 rounded" style={{ background: '#f8fafc', border: '1px solid #e2e8f0', fontSize: 13 }}>
              <p className="fw-semibold mb-2" style={{ color: '#475569' }}>How this works:</p>
              <ol className="mb-0" style={{ color: '#64748b', paddingLeft: 18, lineHeight: 1.9 }}>
                <li>Admin <strong>saves week config</strong> — links a Week Label → Quiz → opens-at time</li>
                <li>Students register on website → Admin <strong>approves</strong> them → confirmation email sent (no quiz link yet)</li>
                <li>Before quiz time, admin clicks <strong>"Send Quiz Links to Approved"</strong> → each approved student gets their personal quiz link</li>
                <li>At quiz time, students click the link → quiz unlocks automatically</li>
                <li>After quiz, view results in <strong>Leaderboard</strong></li>
              </ol>
            </div>
          </div>
        </div>
      )}

      {/* ── Leaderboard ── */}
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
                  <th className="ps-4" style={{ fontSize: 12, color: '#6b7280', width: 60 }}>RANK</th>
                  <th style={{ fontSize: 12, color: '#6b7280' }}>NAME</th>
                  <th style={{ fontSize: 12, color: '#6b7280' }}>SCORE</th>
                  <th style={{ fontSize: 12, color: '#6b7280' }}>%</th>
                  <th className="pe-4" style={{ fontSize: 12, color: '#6b7280' }}>TIME</th>
                </tr>
              </thead>
              <tbody>
                {lbLoading ? (
                  <tr><td colSpan={5} className="text-center py-4"><span className="spinner-border spinner-border-sm" /></td></tr>
                ) : leaderboard.length === 0 ? (
                  <tr><td colSpan={5} className="text-center text-muted py-4">No completed attempts yet.</td></tr>
                ) : leaderboard.map(entry => {
                  const medal = entry.rank === 1 ? '🥇' : entry.rank === 2 ? '🥈' : entry.rank === 3 ? '🥉' : `#${entry.rank}`;
                  const mins  = Math.floor(entry.timeSpentSeconds / 60);
                  const secs  = entry.timeSpentSeconds % 60;
                  return (
                    <tr key={entry._id} className={entry.rank <= 3 ? 'table-warning' : ''}>
                      <td className="ps-4 fw-bold" style={{ fontSize: 18 }}>{medal}</td>
                      <td>
                        <div className="fw-semibold">{entry.name}</div>
                        <div className="text-muted" style={{ fontSize: 12 }}>{entry.email}</div>
                      </td>
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

      {/* ── Stats ── */}
      <div className="row g-3 mb-4">
        {STATS.map(s => (
          <div key={s.label} className="col-6 col-md-3">
            <div className="card border-0 shadow-sm h-100" style={{ borderRadius: 12 }}>
              <div className="card-body d-flex align-items-center gap-3 py-3">
                <div className="d-flex align-items-center justify-content-center rounded-3 flex-shrink-0"
                  style={{ width: 44, height: 44, background: s.color + '18' }}>
                  <i className={`fa-solid ${s.icon}`} style={{ color: s.color, fontSize: 18 }} />
                </div>
                <div>
                  <div className="fw-bold" style={{ fontSize: 22, color: s.color }}>{s.value}</div>
                  <div className="text-muted" style={{ fontSize: 12 }}>{s.label}</div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Filter Toolbar ── */}
      <div className="card border-0 shadow-sm mb-3" style={{ borderRadius: 12 }}>
        <div className="card-body py-3 px-4">
          <div className="row g-2 align-items-center">
            <div className="col-12 col-md-5">
              <div className="input-group">
                <span className="input-group-text bg-white border-end-0">
                  <i className="fa-solid fa-magnifying-glass text-muted" style={{ fontSize: 12 }} />
                </span>
                <input
                  className="form-control border-start-0 ps-0"
                  placeholder="Search by name or email…"
                  value={search}
                  onChange={e => { setSearch(e.target.value); setPage(1); }}
                />
              </div>
            </div>
            <div className="col-12 col-md-4">
              <select
                className="form-select"
                value={weekFilter}
                onChange={e => { setWeekFilter(e.target.value); setPage(1); }}
              >
                <option value="">All Weeks</option>
                <option value="__pre__">Pre-Registrations only</option>
                {weekLabels.map(w => <option key={w} value={w}>{w}</option>)}
              </select>
            </div>
            <div className="col-12 col-md-3 d-flex justify-content-md-end align-items-center gap-2">
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
                {loading ? 'Loading…' : `${submissions.length} of ${total}`}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Table ── */}
      <div className="card border-0 shadow-sm" style={{ borderRadius: 12, overflow: 'hidden' }}>
        <table className="table table-hover mb-0 align-middle" style={{ fontSize: 13 }}>
          <thead style={{ background: '#f8fafc' }}>
            <tr>
              <th className="ps-4" style={{ fontSize: 11, color: '#94a3b8', fontWeight: 700, width: 40 }}>#</th>
              <th style={{ fontSize: 11, color: '#94a3b8', fontWeight: 700 }}>NAME &amp; EMAIL</th>
              <th style={{ fontSize: 11, color: '#94a3b8', fontWeight: 700 }}>WEEK</th>
              <th style={{ fontSize: 11, color: '#94a3b8', fontWeight: 700 }}>REGISTERED</th>
              <th className="pe-4" style={{ fontSize: 11, color: '#94a3b8', fontWeight: 700 }}>STATUS</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={5} className="text-center text-muted py-5">
                  <span className="spinner-border spinner-border-sm me-2" />Loading…
                </td>
              </tr>
            )}
            {!loading && submissions.length === 0 && (
              <tr>
                <td colSpan={5} className="text-center text-muted py-5">
                  <i className="fa-solid fa-inbox mb-2 d-block" style={{ fontSize: 28, opacity: .25 }} />
                  No registrations found
                </td>
              </tr>
            )}
            {!loading && submissions.map((s, i) => {
              const isPreReg = s.isPreRegistration && !s.weekLabel;
              const apprKey  = s.isApproved === true ? 'approved' : s.isApproved === false ? 'rejected' : 'pending';
              const badge    = APPROVAL_BADGE[apprKey];

              return (
                <tr
                  key={s._id}
                  style={{ cursor: 'pointer' }}
                  onClick={() => navigate(`/registrations/${s._id}`)}
                >
                  <td className="ps-4 text-muted">{(page - 1) * limit + i + 1}</td>
                  <td>
                    <div className="fw-semibold text-dark">{s.name}</div>
                    <div className="text-muted" style={{ fontSize: 12 }}>{s.email}</div>
                  </td>
                  <td>
                    {isPreReg ? (
                      <span style={{ background: '#fff8e1', color: '#b45309', border: '1px solid #fcd34d', borderRadius: 20, padding: '3px 10px', fontSize: 11, fontWeight: 600 }}>
                        Pre-Reg
                      </span>
                    ) : s.weekLabel ? (
                      <span style={{ background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', borderRadius: 20, padding: '3px 10px', fontSize: 11, fontWeight: 600 }}>
                        {s.weekLabel}
                      </span>
                    ) : (
                      <span className="text-muted">—</span>
                    )}
                  </td>
                  <td className="text-muted" style={{ fontSize: 12 }}>
                    {new Date(s.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </td>
                  <td className="pe-4" onClick={e => e.stopPropagation()}>
                    <span style={{ background: badge.bg, color: badge.color, borderRadius: 20, padding: '3px 12px', fontSize: 11, fontWeight: 600 }}>
                      {badge.label}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {totalPages > 1 && (
          <div className="d-flex align-items-center justify-content-between px-4 py-3" style={{ borderTop: '1px solid #f1f5f9' }}>
            <span className="text-muted" style={{ fontSize: 13 }}>Page {page} of {totalPages}</span>
            <div className="d-flex gap-2">
              <button className="btn btn-sm btn-outline-secondary" disabled={page === 1} onClick={() => setPage(p => p - 1)}>← Prev</button>
              <button className="btn btn-sm btn-outline-secondary" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Next →</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AllRegistrations;
