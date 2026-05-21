import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { publicQuizAdminApi } from '../../api';

/* ── Types ─────────────────────────────────────────────────────────────── */
interface AvailQuiz { _id: string; title: string; totalQuestions?: number; totalMarks?: number; }
interface LeaderEntry {
  _id: string; name: string; email: string;
  rank: number; score: number; totalMarks: number;
  percentage: number; timeSpentSeconds: number; passed: boolean;
}
interface BatchConfig {
  weekLabel: string;
  quizId?: string;
  quiz?: { _id: string; title: string; totalQuestions?: number; totalMarks?: number };
  eventTitle?: string;
  eventDate?: string;   // UTC ISO string (as stored)
  eventTimeIST?: string;
  techBattleUrl?: string;
  topperCount?: number;
}

/* ── Timezone helpers ──────────────────────────────────────────────────── */
// Convert UTC ISO → IST datetime-local value  (for the <input type="datetime-local">)
const utcToISTInput = (utc: string): string => {
  const d = new Date(utc);
  const ist = new Date(d.getTime() + 5.5 * 3600_000);
  return ist.toISOString().slice(0, 16);
};

// Convert datetime-local value (treated as IST) → ISO string with +05:30
const istInputToISO = (local: string): string => `${local}:00+05:30`;

// Display a UTC date as a human-readable IST string
const formatIST = (utc?: string | null): string => {
  if (!utc) return '';
  return new Date(utc).toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true,
  }) + ' IST';
};

/* ── Constants ─────────────────────────────────────────────────────────── */
const APPROVAL_BADGE: Record<string, { bg: string; color: string; label: string }> = {
  approved: { bg: '#dcfce7', color: '#15803d', label: 'Approved'  },
  rejected: { bg: '#fee2e2', color: '#b91c1c', label: 'Rejected'  },
  pending:  { bg: '#fef9c3', color: '#854d0e', label: 'Pending'   },
};

/* ── Component ─────────────────────────────────────────────────────────── */
const AllRegistrations: React.FC = () => {
  const navigate = useNavigate();
  const limit = 100;

  /* Table */
  const [submissions, setSubmissions]   = useState<any[]>([]);
  const [weekLabels,  setWeekLabels]    = useState<string[]>([]);
  const [total,       setTotal]         = useState(0);
  const [page,        setPage]          = useState(1);
  const [search,      setSearch]        = useState('');
  const [weekFilter,  setWeekFilter]    = useState('');
  const [loading,     setLoading]       = useState(true);

  /* Batch configs */
  const [batchConfigs, setBatchConfigs] = useState<Record<string, BatchConfig>>({});

  /* Available quizzes */
  const [availQuizzes,  setAvailQuizzes]  = useState<AvailQuiz[]>([]);
  const [quizzesLoaded, setQuizzesLoaded] = useState(false);

  /* Edit panel:  'closed' | '__new__' | '<weekLabel>' */
  const [editMode,       setEditMode]       = useState<string>('closed');
  const [cfgWeekLabel,   setCfgWeekLabel]   = useState('');
  const [cfgQuizId,      setCfgQuizId]      = useState('');
  const [cfgEventDate,   setCfgEventDate]   = useState('');   // IST local string
  const [cfgEventTitle,  setCfgEventTitle]  = useState('');
  const [cfgBattleUrl,   setCfgBattleUrl]   = useState('');
  const [cfgTopperCount, setCfgTopperCount] = useState(3);
  const [cfgSaving,      setCfgSaving]      = useState(false);
  const [cfgMsg,         setCfgMsg]         = useState('');

  /* Send quiz links */
  const [sendingWeek, setSendingWeek] = useState('');
  const [sendResults, setSendResults] = useState<Record<string, string>>({});

  /* Leaderboard */
  const [leaderboard, setLeaderboard] = useState<LeaderEntry[]>([]);
  const [lbLoading,   setLbLoading]   = useState(false);
  const [lbWeek,      setLbWeek]      = useState('');

  /* ── Data ─────────────────────────────────────────────────────────────── */
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = { page: String(page), limit: String(limit) };
      if (search)     params.search = search;
      if (weekFilter) params.week   = weekFilter;
      const result = await publicQuizAdminApi.getAllRegistrations(params as any);
      setSubmissions(result.submissions || []);
      setTotal(result.total || 0);
      setWeekLabels(result.weekLabels || []);
    } catch (e) { console.error(e); }
    setLoading(false);
  }, [page, search, weekFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  /* Load all batch configs directly */
  useEffect(() => {
    const loadBatchConfigs = async () => {
      try {
        const configs = await publicQuizAdminApi.getAllBatchConfigs();
        const record: Record<string, BatchConfig> = {};
        (Array.isArray(configs) ? configs : []).forEach((cfg: any) => {
          record[cfg.weekLabel] = { ...cfg, weekLabel: cfg.weekLabel };
        });
        setBatchConfigs(record);
        // Also set week labels from batch configs so they always show
        setWeekLabels(Object.keys(record).sort());
      } catch { /* failed to load batch configs */ }
    };
    loadBatchConfigs();
  }, []);

  const ensureQuizzes = async () => {
    if (quizzesLoaded) return;
    const data = await publicQuizAdminApi.getAvailableQuizzes().catch(() => []);
    setAvailQuizzes(Array.isArray(data) ? data : (data?.quizzes || []));
    setQuizzesLoaded(true);
  };

  /* ── Edit panel open/close ────────────────────────────────────────────── */
  const openNew = async () => {
    await ensureQuizzes();
    setEditMode('__new__');
    setCfgWeekLabel(''); setCfgQuizId(''); setCfgEventDate('');
    setCfgEventTitle(''); setCfgBattleUrl(''); setCfgTopperCount(3);
    setCfgMsg('');
  };

  const openEdit = async (label: string) => {
    await ensureQuizzes();
    const cfg = batchConfigs[label];
    setEditMode(label);
    setCfgWeekLabel(label);
    setCfgQuizId(cfg?.quizId || '');
    setCfgEventDate(cfg?.eventDate ? utcToISTInput(cfg.eventDate) : '');
    setCfgEventTitle(cfg?.eventTitle || '');
    setCfgBattleUrl(cfg?.techBattleUrl || '');
    setCfgTopperCount(cfg?.topperCount ?? 3);
    setCfgMsg('');
  };

  const closeEdit = () => { setEditMode('closed'); setCfgMsg(''); };

  /* ── Save batch ───────────────────────────────────────────────────────── */
  const saveBatch = async () => {
    if (!cfgWeekLabel.trim() || !cfgQuizId) return;
    setCfgSaving(true);
    setCfgMsg('');
    try {
      // Treat the datetime-local input as IST by appending timezone offset
      const eventDateISO = cfgEventDate ? istInputToISO(cfgEventDate) : undefined;

      // Auto-derive "7:00 PM IST" display string for emails
      let eventTimeIST: string | undefined;
      if (cfgEventDate) {
        eventTimeIST = new Date(cfgEventDate + ':00+05:30').toLocaleTimeString('en-IN', {
          timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: true,
        }) + ' IST';
      }

      const result = await publicQuizAdminApi.setWeekConfig(
        cfgWeekLabel.trim(), cfgQuizId, cfgTopperCount,
        { eventTitle: cfgEventTitle || undefined, eventDate: eventDateISO,
          eventTimeIST, techBattleUrl: cfgBattleUrl || undefined },
      );

      // Update local batch map immediately (optimistic)
      const quizObj = availQuizzes.find(q => q._id === cfgQuizId);
      setBatchConfigs(prev => ({
        ...prev,
        [cfgWeekLabel.trim()]: {
          weekLabel:    cfgWeekLabel.trim(),
          quizId:       cfgQuizId,
          quiz:         quizObj ? { _id: quizObj._id, title: quizObj.title, totalQuestions: quizObj.totalQuestions } : undefined,
          eventTitle:   cfgEventTitle || undefined,
          eventDate:    eventDateISO ? new Date(eventDateISO).toISOString() : undefined,
          eventTimeIST,
          techBattleUrl: cfgBattleUrl || undefined,
          topperCount:  cfgTopperCount,
        },
      }));

      const backfill = (result?.tokenizedCount ?? 0) > 0
        ? ` Quiz tokens assigned to ${result.tokenizedCount} already-approved student${result.tokenizedCount !== 1 ? 's' : ''}.`
        : '';
      setCfgMsg(`✅ Saved!${backfill}`);
      fetchData();
      setTimeout(closeEdit, 1600);
    } catch (e: any) {
      setCfgMsg('❌ ' + (e.message || 'Save failed'));
    }
    setCfgSaving(false);
  };

  /* ── Send quiz links ──────────────────────────────────────────────────── */
  const sendLinks = async (weekLabel: string) => {
    if (!window.confirm(`Send quiz links to all approved students in "${weekLabel}"?`)) return;
    setSendingWeek(weekLabel);
    setSendResults(prev => ({ ...prev, [weekLabel]: '' }));
    try {
      const res = await publicQuizAdminApi.sendWeekQuizLinks(weekLabel);
      setSendResults(prev => ({
        ...prev, [weekLabel]: `✅ Sent to ${res.sent} student${res.sent !== 1 ? 's' : ''}`,
      }));
      fetchData();
    } catch (e: any) {
      setSendResults(prev => ({ ...prev, [weekLabel]: '❌ Failed to send' }));
    }
    setSendingWeek('');
  };

  /* ── Leaderboard ──────────────────────────────────────────────────────── */
  const loadLeaderboard = async (week: string) => {
    setLbLoading(true);
    setLbWeek(week);
    try {
      const data = await publicQuizAdminApi.getLeaderboard(week);
      setLeaderboard(data.leaderboard || data.toppers || []);
    } catch { }
    setLbLoading(false);
  };

  /* ── Export CSV ───────────────────────────────────────────────────────── */
  const exportCSV = () => {
    if (!submissions.length) return;
    const headers = ['Batch', 'Name', 'Email', 'Phone', 'Quiz Link', 'Approval', 'Registered At'];
    const rows = submissions.map(s => {
      const phone  = s.registrationData?.phone || s.registrationData?.mobile || '';
      const batch  = s.weekLabel || (s.isPreRegistration ? 'Pre-Registration' : '—');
      const appr   = s.isApproved === true ? 'Approved' : s.isApproved === false ? 'Rejected' : 'Pending';
      const linked = s.quizToken ? 'Assigned' : '—';
      return [`"${batch}"`, `"${s.name}"`, `"${s.email}"`, `"${phone}"`, linked, appr,
        new Date(s.createdAt).toLocaleString('en-IN')];
    });
    const csv  = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a    = document.createElement('a');
    a.href     = URL.createObjectURL(blob);
    a.download = 'registrations.csv';
    a.click();
  };

  /* ── Derived stats ────────────────────────────────────────────────────── */
  const approvedCount  = submissions.filter(s => s.isApproved === true).length;
  const pendingCount   = submissions.filter(s => s.isApproved == null).length;
  const withTokenCount = submissions.filter(s => !!s.quizToken).length;
  const totalPages     = Math.ceil(total / limit);

  /* ══════════════════════ RENDER ══════════════════════════════════════════ */
  return (
    <div style={{ padding: '24px 28px', maxWidth: 1100, width: '100%' }}>

      {/* ── Page header ── */}
      <div className="d-flex align-items-center justify-content-between mb-4 flex-wrap gap-2">
        <div>
          <h4 className="mb-0 fw-bold">All Registrations</h4>
          <p className="text-muted mb-0" style={{ fontSize: 13 }}>
            Manage quiz batches, approve students, and send quiz links
          </p>
        </div>
        <button className="btn btn-outline-secondary btn-sm d-flex align-items-center gap-2" onClick={exportCSV}>
          <i className="fa-solid fa-download" />Export CSV
        </button>
      </div>

      {/* ══ QUIZ BATCHES ════════════════════════════════════════════════════ */}
      <div className="mb-4">
        <div className="d-flex align-items-center justify-content-between mb-3">
          <div>
            <span className="fw-semibold" style={{ fontSize: 15 }}>Quiz Batches</span>
            <span className="text-muted ms-2" style={{ fontSize: 13 }}>
              Each batch is one quiz event — select a batch to filter students below
            </span>
          </div>
          <button
            className="btn btn-primary btn-sm d-flex align-items-center gap-2"
            onClick={editMode === '__new__' ? closeEdit : openNew}
          >
            <i className={`fa-solid ${editMode === '__new__' ? 'fa-times' : 'fa-plus'}`} />
            {editMode === '__new__' ? 'Cancel' : 'New Batch'}
          </button>
        </div>

        {/* Batch cards */}
        {weekLabels.length === 0 && editMode !== '__new__' ? (
          <div
            className="rounded-3 d-flex align-items-center justify-content-center"
            style={{ border: '2px dashed #cbd5e1', height: 100, cursor: 'pointer', color: '#94a3b8' }}
            onClick={openNew}
          >
            <div className="text-center">
              <i className="fa-solid fa-plus-circle d-block mb-1" style={{ fontSize: 22 }} />
              <span style={{ fontSize: 14 }}>Create your first quiz batch to get started</span>
            </div>
          </div>
        ) : (
          <div className="d-flex flex-wrap gap-3">
            {weekLabels.map(label => {
              const cfg        = batchConfigs[label];
              const isSelected = weekFilter === label;
              const isSending  = sendingWeek === label;
              const sendResult = sendResults[label];
              const hasConfig  = !!cfg?.quizId;
              return (
                <div
                  key={label}
                  onClick={() => { setWeekFilter(isSelected ? '' : label); setPage(1); }}
                  style={{
                    cursor: 'pointer', minWidth: 230, maxWidth: 280, borderRadius: 14,
                    background: '#fff', flex: '0 0 auto',
                    boxShadow: isSelected
                      ? '0 0 0 2px #3b82f6, 0 4px 16px rgba(59,130,246,.15)'
                      : '0 1px 4px rgba(0,0,0,.08)',
                    border: isSelected ? '1px solid #3b82f6' : '1px solid #e2e8f0',
                    transition: 'box-shadow .15s, border-color .15s',
                  }}
                >
                  <div style={{ padding: '14px 16px' }}>
                    {/* Batch title row */}
                    <div className="d-flex align-items-start justify-content-between mb-1 gap-2">
                      <div>
                        <div className="fw-bold" style={{ fontSize: 15, color: '#1e293b' }}>{label}</div>
                        {hasConfig && cfg?.quiz?.title && (
                          <div style={{ fontSize: 12, color: '#64748b', marginTop: 1 }}>
                            <i className="fa-solid fa-file-circle-question me-1 text-primary" />
                            {cfg.quiz.title}
                          </div>
                        )}
                        {!hasConfig && (
                          <div style={{ fontSize: 12, color: '#ef4444', marginTop: 1 }}>
                            <i className="fa-solid fa-triangle-exclamation me-1" />
                            No quiz assigned
                          </div>
                        )}
                      </div>
                      <button
                        className="btn btn-link btn-sm p-0"
                        style={{ color: '#94a3b8', flexShrink: 0, fontSize: 13 }}
                        title="Edit batch settings"
                        onClick={e => { e.stopPropagation(); openEdit(label); }}
                      >
                        <i className="fa-solid fa-pen-to-square" />
                      </button>
                    </div>

                    {/* Opens at */}
                    {cfg?.eventDate ? (
                      <div style={{ fontSize: 12, color: '#475569', marginTop: 6 }}>
                        <i className="fa-regular fa-clock me-1" />
                        Opens: <strong>{formatIST(cfg.eventDate)}</strong>
                      </div>
                    ) : hasConfig ? (
                      <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 6 }}>
                        <i className="fa-regular fa-clock me-1" />No open time set (quiz always open)
                      </div>
                    ) : null}

                    {/* Send result feedback */}
                    {sendResult && (
                      <div style={{
                        fontSize: 12, marginTop: 8,
                        color: sendResult.startsWith('✅') ? '#15803d' : '#b91c1c',
                        fontWeight: 600,
                      }}>
                        {sendResult}
                      </div>
                    )}

                    {/* Actions */}
                    <div className="d-flex gap-2 mt-3" onClick={e => e.stopPropagation()}>
                      <button
                        className="btn btn-success btn-sm flex-grow-1"
                        style={{ fontSize: 12 }}
                        disabled={!hasConfig || isSending}
                        title={hasConfig ? 'Email quiz links to all approved students in this batch' : 'Configure this batch first'}
                        onClick={() => sendLinks(label)}
                      >
                        {isSending
                          ? <><span className="spinner-border spinner-border-sm me-1" style={{ width: 10, height: 10 }} />Sending…</>
                          : <><i className="fa-solid fa-paper-plane me-1" />Send Quiz Links</>}
                      </button>
                      <button
                        className="btn btn-outline-warning btn-sm"
                        style={{ fontSize: 12 }}
                        disabled={lbLoading}
                        title="View leaderboard"
                        onClick={() => loadLeaderboard(label)}
                      >
                        <i className="fa-solid fa-trophy" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── Create / Edit panel ── */}
        {editMode !== 'closed' && (
          <div
            className="card border-0 shadow-sm mt-4"
            style={{ borderRadius: 14, borderLeft: '4px solid #3b82f6' }}
          >
            <div className="card-header bg-white d-flex align-items-center justify-content-between border-0 pt-4 pb-2 px-4">
              <div>
                <span className="fw-bold" style={{ fontSize: 16 }}>
                  {editMode === '__new__' ? 'Create New Batch' : `Edit Batch — ${editMode}`}
                </span>
                {editMode === '__new__' && (
                  <p className="text-muted mb-0" style={{ fontSize: 13 }}>
                    A batch links a group of registrations to one quiz event
                  </p>
                )}
              </div>
              <button className="btn btn-sm btn-outline-secondary" onClick={closeEdit}>✕</button>
            </div>

            <div className="card-body px-4 pb-4">
              <div className="row g-3">

                {/* Batch Name */}
                <div className="col-12 col-md-4">
                  <label className="form-label fw-semibold small mb-1">
                    Batch Name <span className="text-danger">*</span>
                  </label>
                  <input
                    className="form-control"
                    placeholder="e.g. Week 1, May Batch, Round 2"
                    value={cfgWeekLabel}
                    disabled={editMode !== '__new__'}
                    onChange={e => setCfgWeekLabel(e.target.value)}
                  />
                  <div className="form-text">
                    {editMode !== '__new__'
                      ? 'Batch name is fixed after creation'
                      : 'Unique name shown on student registrations'}
                  </div>
                </div>

                {/* Quiz */}
                <div className="col-12 col-md-4">
                  <label className="form-label fw-semibold small mb-1">
                    Quiz to assign <span className="text-danger">*</span>
                  </label>
                  <select
                    className="form-select"
                    value={cfgQuizId}
                    onChange={e => setCfgQuizId(e.target.value)}
                  >
                    <option value="">— select a quiz —</option>
                    {availQuizzes.map(q => (
                      <option key={q._id} value={q._id}>
                        {q.title}{q.totalQuestions ? ` · ${q.totalQuestions}Q` : ''}
                      </option>
                    ))}
                  </select>
                  {quizzesLoaded && availQuizzes.length === 0 && (
                    <div className="text-danger small mt-1">
                      No active quizzes found — create one in Manage Quizzes first.
                    </div>
                  )}
                </div>

                {/* Quiz Opens At (IST) */}
                <div className="col-12 col-md-4">
                  <label className="form-label fw-semibold small mb-1">
                    Quiz Opens At{' '}
                    <span
                      className="fw-normal text-muted"
                      style={{
                        background: '#eff6ff', color: '#1d4ed8',
                        borderRadius: 4, padding: '1px 6px', fontSize: 11,
                      }}
                    >
                      India Time (IST)
                    </span>
                  </label>
                  <input
                    type="datetime-local"
                    className="form-control"
                    value={cfgEventDate}
                    onChange={e => setCfgEventDate(e.target.value)}
                  />
                  <div className="form-text">
                    {cfgEventDate
                      ? <><i className="fa-solid fa-check text-success me-1" />
                          Students cannot open the quiz before{' '}
                          <strong>{formatIST(cfgEventDate + ':00+05:30')}</strong></>
                      : 'Leave empty → quiz is always accessible after approval'}
                  </div>
                </div>

                {/* Event Title */}
                <div className="col-12 col-md-4">
                  <label className="form-label fw-semibold small mb-1">
                    Event Title <span className="text-muted fw-normal">(shown in email)</span>
                  </label>
                  <input
                    className="form-control"
                    placeholder="Weekly Tech Battle 2026"
                    value={cfgEventTitle}
                    onChange={e => setCfgEventTitle(e.target.value)}
                  />
                </div>

                {/* Battle URL */}
                <div className="col-12 col-md-5">
                  <label className="form-label fw-semibold small mb-1">
                    Event Page URL <span className="text-muted fw-normal">(optional)</span>
                  </label>
                  <input
                    className="form-control"
                    placeholder="https://codebegun.com/battle"
                    value={cfgBattleUrl}
                    onChange={e => setCfgBattleUrl(e.target.value)}
                  />
                </div>

                {/* Topper count */}
                <div className="col-12 col-md-3">
                  <label className="form-label fw-semibold small mb-1">
                    Leaderboard Size
                  </label>
                  <input
                    type="number" min={1} max={50}
                    className="form-control"
                    value={cfgTopperCount}
                    onChange={e => setCfgTopperCount(Number(e.target.value))}
                  />
                  <div className="form-text">Top N positions tracked</div>
                </div>
              </div>

              {/* Actions */}
              <div className="d-flex align-items-center gap-3 mt-4 flex-wrap">
                <button
                  className="btn btn-primary px-4"
                  disabled={cfgSaving || !cfgWeekLabel.trim() || !cfgQuizId}
                  onClick={saveBatch}
                >
                  {cfgSaving
                    ? <><span className="spinner-border spinner-border-sm me-2" />Saving…</>
                    : <><i className="fa-solid fa-check me-2" />Save Batch</>}
                </button>
                <button className="btn btn-outline-secondary" onClick={closeEdit}>Cancel</button>
              </div>

              {cfgMsg && (
                <div className={`alert py-2 mt-3 mb-0 small ${cfgMsg.startsWith('✅') ? 'alert-success' : 'alert-danger'}`}>
                  {cfgMsg}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Leaderboard ── */}
      {lbWeek && (
        <div className="card border-0 shadow-sm mb-4" style={{ borderRadius: 12 }}>
          <div
            className="card-header fw-semibold d-flex align-items-center justify-content-between bg-white"
            style={{ borderRadius: '12px 12px 0 0' }}
          >
            <span><i className="fa-solid fa-trophy me-2 text-warning" />Leaderboard — {lbWeek}</span>
            <button className="btn btn-sm btn-outline-secondary" onClick={() => setLbWeek('')}>Hide</button>
          </div>
          <div className="table-responsive">
            <table className="table table-hover mb-0 align-middle" style={{ fontSize: 13 }}>
              <thead style={{ background: '#f8f9fa' }}>
                <tr>
                  <th className="ps-4" style={{ fontSize: 11, color: '#94a3b8', fontWeight: 700, width: 60 }}>RANK</th>
                  <th style={{ fontSize: 11, color: '#94a3b8', fontWeight: 700 }}>NAME</th>
                  <th style={{ fontSize: 11, color: '#94a3b8', fontWeight: 700 }}>SCORE</th>
                  <th style={{ fontSize: 11, color: '#94a3b8', fontWeight: 700 }}>%</th>
                  <th className="pe-4" style={{ fontSize: 11, color: '#94a3b8', fontWeight: 700 }}>TIME</th>
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
                      <td>
                        <span className={`badge ${entry.passed ? 'bg-success' : 'bg-secondary'}`}>
                          {entry.percentage?.toFixed(1)}%
                        </span>
                      </td>
                      <td className="pe-4 text-muted">{mins}m {secs}s</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Stats (context-aware) ── */}
      <div className="row g-3 mb-3">
        {[
          {
            label: weekFilter ? `Total in "${weekFilter}"` : 'Total Registrations',
            value: total, color: '#0d6efd', icon: 'fa-users',
          },
          { label: 'Approved', value: approvedCount, color: '#15803d', icon: 'fa-circle-check' },
          { label: 'Pending Approval', value: pendingCount, color: '#b45309', icon: 'fa-clock' },
          {
            label: 'Have Quiz Links',
            value: withTokenCount,
            color: '#7c3aed',
            icon: 'fa-link',
          },
        ].map(s => (
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
                  <div className="fw-bold" style={{ fontSize: 22, color: s.color }}>{s.value}</div>
                  <div className="text-muted" style={{ fontSize: 12 }}>{s.label}</div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Filter bar ── */}
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
                <option value="">All Batches</option>
                <option value="__pre__">Pre-Registrations only</option>
                {weekLabels.map(w => <option key={w} value={w}>{w}</option>)}
              </select>
            </div>
            <div className="col-12 col-md-3 text-md-end">
              <span className="text-muted" style={{ fontSize: 13 }}>
                {loading ? 'Loading…' : `${submissions.length} of ${total}`}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Registrations table ── */}
      <div className="card border-0 shadow-sm" style={{ borderRadius: 12, overflow: 'hidden' }}>
        <table className="table table-hover mb-0 align-middle" style={{ fontSize: 13 }}>
          <thead style={{ background: '#f8fafc' }}>
            <tr>
              <th className="ps-4" style={{ fontSize: 11, color: '#94a3b8', fontWeight: 700, width: 40 }}>#</th>
              <th style={{ fontSize: 11, color: '#94a3b8', fontWeight: 700 }}>NAME &amp; EMAIL</th>
              <th style={{ fontSize: 11, color: '#94a3b8', fontWeight: 700 }}>BATCH</th>
              <th style={{ fontSize: 11, color: '#94a3b8', fontWeight: 700 }}>QUIZ LINK</th>
              <th style={{ fontSize: 11, color: '#94a3b8', fontWeight: 700 }}>REGISTERED</th>
              <th className="pe-4" style={{ fontSize: 11, color: '#94a3b8', fontWeight: 700 }}>APPROVAL</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={6} className="text-center text-muted py-5">
                  <span className="spinner-border spinner-border-sm me-2" />Loading…
                </td>
              </tr>
            )}
            {!loading && submissions.length === 0 && (
              <tr>
                <td colSpan={6} className="text-center text-muted py-5">
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
                      <span style={{
                        background: '#fff8e1', color: '#b45309',
                        border: '1px solid #fcd34d', borderRadius: 20,
                        padding: '3px 10px', fontSize: 11, fontWeight: 600,
                      }}>Pre-Reg</span>
                    ) : s.weekLabel ? (
                      <span style={{
                        background: '#eff6ff', color: '#1d4ed8',
                        border: '1px solid #bfdbfe', borderRadius: 20,
                        padding: '3px 10px', fontSize: 11, fontWeight: 600,
                      }}>{s.weekLabel}</span>
                    ) : (
                      <span className="text-muted">—</span>
                    )}
                  </td>
                  <td onClick={e => e.stopPropagation()}>
                    {s.quizToken ? (
                      <span style={{
                        background: '#f0fdf4', color: '#15803d',
                        borderRadius: 20, padding: '3px 10px', fontSize: 11, fontWeight: 600,
                      }}>
                        <i className="fa-solid fa-check me-1" />Assigned
                      </span>
                    ) : s.isApproved === true ? (
                      <span style={{
                        background: '#fef3c7', color: '#92400e',
                        borderRadius: 20, padding: '3px 10px', fontSize: 11, fontWeight: 600,
                      }}>
                        <i className="fa-solid fa-hourglass-half me-1" />Pending
                      </span>
                    ) : (
                      <span className="text-muted" style={{ fontSize: 12 }}>—</span>
                    )}
                  </td>
                  <td className="text-muted" style={{ fontSize: 12 }}>
                    {new Date(s.createdAt).toLocaleDateString('en-IN', {
                      day: 'numeric', month: 'short', year: 'numeric',
                    })}
                  </td>
                  <td className="pe-4" onClick={e => e.stopPropagation()}>
                    <span style={{
                      background: badge.bg, color: badge.color,
                      borderRadius: 20, padding: '3px 12px', fontSize: 11, fontWeight: 600,
                    }}>
                      {badge.label}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {totalPages > 1 && (
          <div
            className="d-flex align-items-center justify-content-between px-4 py-3"
            style={{ borderTop: '1px solid #f1f5f9' }}
          >
            <span className="text-muted" style={{ fontSize: 13 }}>Page {page} of {totalPages}</span>
            <div className="d-flex gap-2">
              <button
                className="btn btn-sm btn-outline-secondary"
                disabled={page === 1}
                onClick={() => setPage(p => p - 1)}
              >← Prev</button>
              <button
                className="btn btn-sm btn-outline-secondary"
                disabled={page >= totalPages}
                onClick={() => setPage(p => p + 1)}
              >Next →</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AllRegistrations;
