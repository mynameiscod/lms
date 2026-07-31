import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { studentProfileAPI } from '../../api/studentProfileAPI';
import { getStudentReport } from '../../api/studentReportApi';
import { interviewAnalyticsApi } from '../../api/interviewModuleApi';
import { scheduledInterviewApi } from '../../api';
import { candidateProofApi } from '../../api/candidateProofApi';
import {
  listStudentExams, createExam, updateExam, deleteExam,
  ExamRecord, ExamSummary,
} from '../../api/examApi';
import { Spinner } from '../../components/common';
import StudentDashboard from './StudentDashboard';
import AssignmentsPanel from './AssignmentsPanel';
import './StudentProfileDetail.css';
import '../StudentReports/StudentReports.css';

type DetailTab = 'overview' | 'profile' | 'attendance' | 'quizzes' | 'assignments' | 'snippets'
  | 'thinking' | 'communication' | 'interviews' | 'fees' | 'exams';

const ACTIVITY_TABS: DetailTab[] = ['attendance', 'quizzes', 'assignments', 'snippets', 'thinking', 'communication'];
const REPORT_TABS: DetailTab[] = ['overview', 'interviews', 'fees'];
const TAB_LABELS: Record<DetailTab, string> = {
  overview: 'Overview',
  profile: 'Profile',
  attendance: 'Attendance',
  quizzes: 'Quizzes',
  assignments: 'Assignments',
  snippets: 'Code Snippets',
  thinking: 'Thinking Lab',
  communication: 'Communication Lab',
  interviews: 'Interviews',
  fees: 'Fees',
  exams: 'Exams',
};

/**
 * The delivery statuses the server now returns for every assigned item. Staff and the
 * student are looking at the same value — before this, the admin side only ever knew
 * "pending" or whatever an attempt row happened to say.
 */
const STATUS_LABELS: Record<string, string> = {
  not_started: 'Not started',
  in_progress: 'In progress',
  submitted: 'Completed',
  graded: 'Graded',
  late: 'Completed (late)',
  overdue: 'Due',
  missed: 'Missed',
  pending: 'Not started',
};

const StatusChip: React.FC<{ status?: string }> = ({ status }) => {
  const key = String(status || 'not_started').toLowerCase();
  return <span className={`spd-dstatus ${key}`}>{STATUS_LABELS[key] || status}</span>;
};

/** "How did this reach the student" — batch/individual targeting vs a schedule row. */
const SourceChip: React.FC<{ source?: string }> = ({ source }) =>
  source === 'schedule'
    ? <span className="spd-src sched" title="Delivered by an assessment schedule">Scheduled</span>
    : <span className="spd-src" title="Targeted directly on the item">Direct</span>;

interface Tally { total: number; completed: number; pending: number; missed: number; completionRate: number }

/** Assigned-vs-done at a glance, above each work table. */
const WorkTally: React.FC<{ t: Tally; noun: string }> = ({ t, noun }) => (
  <div className="spd-tally">
    <div className="spd-tally-row">
      <span className="spd-tally-item"><b>{t.total}</b> assigned</span>
      <span className="spd-tally-item done"><b>{t.completed}</b> completed</span>
      <span className="spd-tally-item pend"><b>{t.pending}</b> pending</span>
      {t.missed > 0 && <span className="spd-tally-item miss"><b>{t.missed}</b> missed</span>}
      <span className="spd-tally-rate">{t.completionRate}% of {noun} done</span>
    </div>
    <div className="spd-tally-bar"><div className="spd-tally-fill" style={{ width: `${t.completionRate}%` }} /></div>
  </div>
);

const avatarColor = (name: string) => {
  const colors = ['#005897', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#0ea5e9', '#ec4899'];
  return colors[(name?.charCodeAt(0) || 0) % colors.length];
};

// Ensure an external profile URL has a protocol — users often save
// "www.linkedin.com/in/..." which would otherwise resolve as a relative path.
const extUrl = (u?: string) => !u ? '#' : (/^https?:\/\//i.test(u) ? u : `https://${u.replace(/^\/+/, '')}`);

const ring = (pct: number, size = 92) => {
  const r = size * 0.38;
  const circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;
  const color = pct >= 80 ? '#22c55e' : pct >= 60 ? '#f59e0b' : '#ef4444';
  return { r, circ, offset, color, cx: size / 2, cy: size / 2, size };
};

const fmt = (date: string | undefined) => {
  if (!date) return '—';
  return new Date(date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
};

// Seconds → "12m 5s" / "1h 3m" / "—"
const fmtDur = (secs: number | undefined) => {
  if (!secs || secs <= 0) return '—';
  const h = Math.floor(secs / 3600), m = Math.floor((secs % 3600) / 60), s = secs % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
};

const StudentProfileDetail: React.FC = () => {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  // Active tab lives in the URL (?tab=assignments) so a refresh, a bookmark or a link
  // shared with a colleague all land on the same tab instead of resetting to Overview.
  const ALL_TABS: DetailTab[] = ['overview', 'profile', 'attendance', 'quizzes', 'assignments',
    'snippets', 'thinking', 'communication', 'interviews', 'exams', 'fees'];
  const tabFromUrl = (): DetailTab => {
    const t = new URLSearchParams(location.search).get('tab') as DetailTab | null;
    return t && ALL_TABS.includes(t) ? t : 'overview';
  };
  const [activeTab, setActiveTabState] = useState<DetailTab>(tabFromUrl);
  const setActiveTab = (t: DetailTab) => {
    setActiveTabState(t);
    const qs = new URLSearchParams(location.search);
    qs.set('tab', t);
    navigate({ pathname: location.pathname, search: qs.toString() }, { replace: true });
  };
  useEffect(() => { setActiveTabState(tabFromUrl()); }, [location.search]);
  const [profile, setProfile] = useState<any>(null);
  const [activity, setActivity] = useState<any>(null);
  const [report, setReport] = useState<any>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [loadingActivity, setLoadingActivity] = useState(false);
  const [loadingReport, setLoadingReport] = useState(false);
  const [error, setError] = useState('');
  const [notes, setNotes] = useState<any[]>([]);
  const [noteText, setNoteText] = useState('');
  const [savingNote, setSavingNote] = useState(false);
  const [aiInterviews, setAiInterviews] = useState<any[] | null>(null);
  const [mockData, setMockData] = useState<{ interviews: any[]; feedback: any[] } | null>(null);
  const [sendingReminder, setSendingReminder] = useState(false);
  const [reminderMsg, setReminderMsg] = useState('');

  const handleSendReminder = async () => {
    if (!userId) return;
    setSendingReminder(true); setReminderMsg('');
    try {
      const res = await studentProfileAPI.sendProfileReminder(userId);
      setReminderMsg(res.message || 'Reminder email sent.');
    } catch (e: any) {
      setReminderMsg(e?.response?.data?.message || 'Failed to send reminder.');
    } finally { setSendingReminder(false); }
  };

  useEffect(() => {
    if (!userId) return;
    setLoadingProfile(true);
    studentProfileAPI.getProfileByUserId(userId)
      .then((res: any) => { const pr = res.data || res; setProfile(pr); setNotes(pr?.adminNotes || []); })
      .catch((e: any) => setError(e.message || 'Failed to load profile'))
      .finally(() => setLoadingProfile(false));
  }, [userId]);

  const handleAddNote = async () => {
    if (!noteText.trim() || !userId) return;
    setSavingNote(true);
    try {
      const res = await studentProfileAPI.addStudentNote(userId, noteText.trim());
      setNotes(res.data || []);
      setNoteText('');
    } catch { /* ignore */ } finally { setSavingNote(false); }
  };

  const handleDeleteNote = async (noteId: string) => {
    if (!userId) return;
    try {
      const res = await studentProfileAPI.deleteStudentNote(userId, noteId);
      setNotes(res.data || []);
    } catch { /* ignore */ }
  };

  useEffect(() => {
    if (!userId || !ACTIVITY_TABS.includes(activeTab)) return;
    if (activity) return; // already loaded
    setLoadingActivity(true);
    studentProfileAPI.getStudentActivity(userId)
      .then((res: any) => setActivity(res.data || res))
      .catch(() => setActivity(null))
      .finally(() => setLoadingActivity(false));
  }, [userId, activeTab, activity]);

  useEffect(() => {
    if (!userId || !REPORT_TABS.includes(activeTab)) return;
    if (report) return; // already loaded
    setLoadingReport(true);
    getStudentReport(userId)
      .then((r: any) => setReport(r?.data || r))
      .catch(() => setReport(null))
      .finally(() => setLoadingReport(false));
  }, [userId, activeTab, report]);

  // AI mock-interview attempts (load when the Interviews tab opens)
  useEffect(() => {
    if (!userId || activeTab !== 'interviews' || aiInterviews !== null) return;
    interviewAnalyticsApi.getStudentAttempts(userId)
      .then((r: any) => setAiInterviews(r?.attempts || r?.data || []))
      .catch(() => setAiInterviews([]));
  }, [userId, activeTab, aiInterviews]);

  // Physical / scheduled mock interviews + feedback (load on Interviews tab)
  useEffect(() => {
    if (!userId || activeTab !== 'interviews' || mockData !== null) return;
    scheduledInterviewApi.getStudentInterviews(userId)
      .then((r: any) => setMockData(r?.data || { interviews: [], feedback: [] }))
      .catch(() => setMockData({ interviews: [], feedback: [] }));
  }, [userId, activeTab, mockData]);

  const publishAttempt = async (a: any) => {
    try {
      if (a.status === 'submitted' || a.status === 'under_review') {
        await interviewAnalyticsApi.evaluateAttempt(a._id, {});
      }
      await interviewAnalyticsApi.publishResult(a._id);
      setAiInterviews(null);   // refetch
    } catch (e: any) { alert(e.message || 'Failed to publish'); }
  };

  if (loadingProfile) return <div className="spd-loading"><Spinner /></div>;

  // A student may not have a StudentProfile yet — don't hard-fail. Fall back to
  // the basic user info passed from the Users list so the page (and the
  // activity/report tabs, which only need userId) still works.
  const passedUser = (location.state as any)?.user;
  const hasProfile = !!profile;
  const p = profile?.personalInfo || {};
  const firstName = p.firstName || passedUser?.firstName || '';
  const surname = p.surname || passedUser?.lastName || '';
  const fullName = `${firstName} ${p.middleName || ''} ${surname}`.trim() || 'Student';
  const email = p.email || passedUser?.email || '';
  const pct = profile?.completeness ?? profile?.profileCompletionPercentage ?? 0;
  const rg = ring(pct);

  const att = activity?.attendance;
  const quizAttempts: any[] = activity?.quizAttempts || [];
  const assignments: any[] = activity?.assignmentSubmissions || [];
  const snippets: any[] = activity?.snippetSubmissions || [];
  const thinking = activity?.thinkingLab;
  const communication = activity?.communicationLab;
  const totals = activity?.totals;

  // Overview-derived values
  const asg = report?.assignments;
  const submittedCount = asg ? ((asg.graded ?? 0) + (asg.pending ?? 0)) || (asg.submitted ?? 0) : 0;
  const assignmentRate = asg?.total ? Math.round((submittedCount / asg.total) * 100) : 0;
  const recentActivity: { title: string; time: string; badge?: string }[] = [];
  if (report?.quizzes?.completed) recentActivity.push({ title: `${report.quizzes.completed} quizzes completed`, time: `Average ${report.quizzes.averageScore ?? 0}%`, badge: `${report.quizzes.averageScore ?? 0}%` });
  if (report?.assignments?.graded) recentActivity.push({ title: `${report.assignments.graded} assignments graded`, time: `Submitted ${submittedCount}/${report.assignments.total ?? 0}`, badge: 'Submitted' });
  if (profile?.lastUpdated) recentActivity.push({ title: 'Profile updated', time: new Date(profile.lastUpdated).toLocaleString() });
  if (profile?.createdAt) recentActivity.push({ title: 'Account created', time: new Date(profile.createdAt).toLocaleString() });

  return (
    <div className="spd-page">
      {/* Header */}
      <div className="spd-topbar">
        <nav className="spd-crumbs" aria-label="Breadcrumb">
          <button onClick={() => navigate('/users')}>Users</button>
          <span className="sep">/</span>
          <span>Candidates</span>
          <span className="sep">/</span>
          <span className="current">{fullName || 'Candidate'}</span>
        </nav>
        <button className="spd-back-btn" onClick={() => navigate('/users')}>
          ← Back to Users
        </button>
      </div>

      {/* Hero */}
      <div className="spd-hero">
        <div className="spd-hero-left">
          {p.profilePhoto ? (
            <img src={p.profilePhoto} alt={fullName} className="spd-avatar-img" />
          ) : (
            <div className="spd-avatar-initials" style={{ background: avatarColor(firstName || 'S') }}>
              {((firstName[0] || '') + (surname[0] || '')) || 'S'}
            </div>
          )}
          <div className="spd-hero-info">
            <h1 className="spd-hero-name">{fullName}</h1>
            <p className="spd-hero-email">{email}</p>
            {p.mobileNumber && <p className="spd-hero-phone">📞 {p.mobileNumber}</p>}
            {p.city && <p className="spd-hero-location">📍 {p.city}{p.state ? `, ${p.state}` : ''}</p>}
            <div className="spd-hero-badges">
              {profile?.courseInterest?.interestedCourse && (
                <span className="spd-badge course">{profile.courseInterest.interestedCourse}</span>
              )}
              {profile?.technicalBackground?.experienceLevel && (
                <span className="spd-badge exp">{profile.technicalBackground.experienceLevel}</span>
              )}
              {profile?.education?.currentStatus && (
                <span className="spd-badge status">{profile.education.currentStatus}</span>
              )}
              {!hasProfile && <span className="spd-badge status">No profile yet</span>}
            </div>
          </div>
        </div>
        <div className="spd-hero-ring">
          <svg width={rg.size} height={rg.size}>
            <circle cx={rg.cx} cy={rg.cy} r={rg.r} fill="none" stroke="#e2e8f0" strokeWidth="7" />
            <circle cx={rg.cx} cy={rg.cy} r={rg.r} fill="none" stroke={rg.color} strokeWidth="7"
              strokeLinecap="round" strokeDasharray={rg.circ} strokeDashoffset={rg.offset}
              transform={`rotate(-90 ${rg.cx} ${rg.cy})`} />
          </svg>
          <div className="spd-ring-label">
            <span style={{ color: rg.color, fontSize: '1.1rem', fontWeight: 800, lineHeight: 1 }}>{pct}%</span>
            <span style={{ fontSize: '0.62rem', color: '#64748b', marginTop: 2 }}>Profile</span>
          </div>
        </div>
        <div className="spd-hero-links">
          {profile?.professionalProfiles?.resumeUrl && (
            <a href={profile.professionalProfiles.resumeUrl} target="_blank" rel="noopener noreferrer" className="spd-link-btn">📄 Resume</a>
          )}
          {profile?.professionalProfiles?.linkedInUrl && (
            <a href={extUrl(profile.professionalProfiles.linkedInUrl)} target="_blank" rel="noopener noreferrer" className="spd-link-btn">🔗 LinkedIn</a>
          )}
          {profile?.professionalProfiles?.githubUrl && (
            <a href={extUrl(profile.professionalProfiles.githubUrl)} target="_blank" rel="noopener noreferrer" className="spd-link-btn">🐙 GitHub</a>
          )}
        </div>
      </div>

      {/* Candidate Proof Profile — shareable HR-facing link */}
      {userId && <ProofPanel userId={userId} name={fullName} />}

      {/* Profile completeness breakdown + reminder email */}
      {hasProfile && Array.isArray(profile?.missing) && profile.missing.length > 0 && (
        <div style={{ background: '#fff', border: '1px solid #eef1f6', borderRadius: 14, padding: 16, margin: '0 0 16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginBottom: 12 }}>
            <div>
              <b style={{ fontSize: 15, color: '#0f172a' }}>Profile is {pct}% complete</b>
              <span style={{ color: '#64748b', fontSize: 13, marginLeft: 8 }}>
                {profile.missing.reduce((n: number, s: any) => n + s.fields.length, 0)} item(s) missing — that's why it's not 100%.
              </span>
            </div>
            <button onClick={handleSendReminder} disabled={sendingReminder}
              style={{ background: 'linear-gradient(90deg,#6366f1,#4f46e5)', color: '#fff', border: 'none', borderRadius: 9, padding: '9px 16px', fontWeight: 700, fontSize: 13.5, cursor: sendingReminder ? 'default' : 'pointer', opacity: sendingReminder ? 0.7 : 1 }}>
              {sendingReminder ? 'Sending…' : '📧 Email student to complete'}
            </button>
          </div>
          {reminderMsg && <div style={{ fontSize: 13, color: '#0f766e', background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: 8, padding: '8px 12px', marginBottom: 12 }}>{reminderMsg}</div>}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
            {profile.missing.map((sec: any, i: number) => (
              <div key={i} style={{ border: '1px solid #f1f5f9', borderRadius: 10, padding: '10px 12px' }}>
                <div style={{ fontSize: 12.5, fontWeight: 800, color: '#334155', marginBottom: 6 }}>{sec.section}</div>
                {sec.fields.map((f: string, j: number) => (
                  <div key={j} style={{ fontSize: 13, color: '#64748b', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                    <span style={{ color: '#f59e0b' }}>⚠</span> {f}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="spd-tabs">
        {(['overview', 'profile', 'attendance', 'quizzes', 'assignments', 'snippets', 'thinking', 'communication', 'interviews', 'exams', 'fees'] as DetailTab[]).map(t => (
          <button
            key={t}
            className={`spd-tab ${activeTab === t ? 'active' : ''}`}
            onClick={() => setActiveTab(t)}
          >
            {TAB_LABELS[t]}
          </button>
        ))}
      </div>

      <div className="spd-tab-content">
        {/* ── Overview Tab (dashboard) ── */}
        {/* -- Overview Tab: the redesigned dashboard -- */}
        {activeTab === 'overview' && userId && <StudentDashboard userId={userId} />}

        {/* ── Profile Tab ── */}
        {activeTab === 'profile' && (
          !hasProfile ? <p className="spd-empty">This student hasn't created a profile yet.</p> :
          <div className="spd-profile-sections">
            {/* Education */}
            {profile.education && (
              <div className="spd-section">
                <h3>🎓 Education</h3>
                <div className="spd-grid">
                  {profile.education.highestQualification && <div><label>Qualification</label><span>{profile.education.highestQualification}</span></div>}
                  {profile.education.degree?.name && <div><label>Degree</label><span>{profile.education.degree.name} — {profile.education.degree.branch}</span></div>}
                  {profile.education.degree?.college && <div><label>College</label><span>{profile.education.degree.college}</span></div>}
                  {profile.education.degree?.percentage !== undefined && <div><label>Degree %</label><span>{profile.education.degree.percentage}%</span></div>}
                  {profile.education.degree?.graduationYear && <div><label>Graduation Year</label><span>{profile.education.degree.graduationYear}</span></div>}
                  {profile.education.intermediate?.percentage !== undefined && <div><label>Intermediate %</label><span>{profile.education.intermediate.percentage}%</span></div>}
                  {profile.education.tenthClass?.percentage !== undefined && <div><label>10th %</label><span>{profile.education.tenthClass.percentage}%</span></div>}
                  {profile.education.currentStatus && <div><label>Status</label><span>{profile.education.currentStatus}</span></div>}
                </div>
              </div>
            )}
            {/* Technical */}
            {profile.technicalBackground && (
              <div className="spd-section">
                <h3>💻 Technical Background</h3>
                <div className="spd-grid">
                  {profile.technicalBackground.experienceLevel && <div><label>Experience</label><span>{profile.technicalBackground.experienceLevel}</span></div>}
                  {profile.technicalBackground.programmingLanguages?.length > 0 && (
                    <div className="full"><label>Languages</label>
                      <div className="spd-tags">{profile.technicalBackground.programmingLanguages.map((l: string) => <span key={l} className="spd-tag">{l}</span>)}</div>
                    </div>
                  )}
                  {profile.technicalBackground.technologies?.length > 0 && (
                    <div className="full"><label>Technologies</label>
                      <div className="spd-tags">{profile.technicalBackground.technologies.map((t: string) => <span key={t} className="spd-tag blue">{t}</span>)}</div>
                    </div>
                  )}
                </div>
              </div>
            )}
            {/* Course Interest */}
            {profile.courseInterest && (
              <div className="spd-section">
                <h3>📚 Course Interest</h3>
                <div className="spd-grid">
                  {profile.courseInterest.interestedCourse && <div><label>Course</label><span>{profile.courseInterest.interestedCourse}</span></div>}
                  {profile.courseInterest.preferredLearningMode && <div><label>Mode</label><span>{profile.courseInterest.preferredLearningMode}</span></div>}
                  {profile.courseInterest.preferredBatchTime && <div><label>Preferred Time</label><span>{profile.courseInterest.preferredBatchTime}</span></div>}
                </div>
              </div>
            )}
            {/* Career Goal */}
            {profile.additionalInfo?.careerGoal && (
              <div className="spd-section">
                <h3>🎯 Career Goal</h3>
                <p className="spd-career-goal">{profile.additionalInfo.careerGoal}</p>
              </div>
            )}
          </div>
        )}

        {/* ── Attendance Tab ── */}
        {activeTab === 'attendance' && (
          loadingActivity ? <div className="spd-tab-loading"><Spinner /></div> :
          !att ? <p className="spd-empty">No attendance data found.</p> :
          <div>
            <div className="spd-att-summary">
              <div className="spd-att-card green"><span className="spd-att-num">{att.summary.present}</span><span>Present</span></div>
              <div className="spd-att-card red"><span className="spd-att-num">{att.summary.absent}</span><span>Absent</span></div>
              <div className="spd-att-card orange"><span className="spd-att-num">{att.summary.late}</span><span>Late</span></div>
              <div className="spd-att-card blue">
                <span className="spd-att-num">{att.summary.percentage}%</span><span>Attendance</span>
              </div>
            </div>
            {att.recent.length > 0 && (
              <div className="spd-table-wrap">
                <table className="spd-table">
                  <thead><tr><th>Date</th><th>Status</th><th>In Time</th><th>Out Time</th><th>Remarks</th></tr></thead>
                  <tbody>
                    {att.recent.map((a: any, i: number) => (
                      <tr key={i}>
                        <td>{fmt(a.date)}</td>
                        <td><span className={`spd-status-badge ${a.status}`}>{a.status}</span></td>
                        <td>{a.inTime || '—'}</td>
                        <td>{a.outTime || '—'}</td>
                        <td>{a.remarks || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ── Quizzes Tab ── */}
        {activeTab === 'quizzes' && (
          loadingActivity ? <div className="spd-tab-loading"><Spinner /></div> :
          quizAttempts.length === 0 ? <p className="spd-empty">No quizzes assigned.</p> :
          <div className="spd-table-wrap">
            {totals?.quizzes && <WorkTally t={totals.quizzes} noun="quizzes" />}
            <table className="spd-table">
              <thead><tr><th>Quiz</th><th>Score</th><th>Time Taken</th><th>Status</th><th>Due</th><th>Assigned via</th><th>Date</th></tr></thead>
              <tbody>
                {quizAttempts.map((a: any, i: number) => {
                  const marks = a.obtainedMarks ?? a.score;
                  return (
                  <tr key={i}>
                    <td>{a.quizTitle || a.quizId || '—'}</td>
                    <td>{marks !== undefined && marks !== null
                      ? `${marks}/${a.totalMarks ?? '?'}${a.percentage != null ? ` (${a.percentage}%)` : ''}`
                      : '—'}</td>
                    <td>{fmtDur(a.timeSpent)}</td>
                    <td><StatusChip status={a.status} /></td>
                    <td>{fmt(a.dueAt)}</td>
                    <td><SourceChip source={a.source} /></td>
                    <td>{fmt(a.submittedAt || a.createdAt)}</td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* ── Assignments Tab ── */}
        {activeTab === 'assignments' && (
          <AssignmentsPanel rows={assignments} loading={loadingActivity} />
        )}

        {/* ── Code Snippets Tab ── */}
        {activeTab === 'snippets' && (
          loadingActivity ? <div className="spd-tab-loading"><Spinner /></div> :
          snippets.length === 0 ? <p className="spd-empty">No code assessments assigned.</p> :
          <div className="spd-table-wrap">
            <table className="spd-table">
              <thead><tr><th>Assessment</th><th>Language</th><th>Score</th><th>Status</th><th>Submitted</th></tr></thead>
              <tbody>
                {snippets.map((s: any, i: number) => (
                  <tr key={i}>
                    <td>{(s.assessmentId as any)?.title || '—'}</td>
                    <td>{(s.assessmentId as any)?.language || '—'}</td>
                    <td>{s.totalMarksAwarded !== undefined && s.totalMarksAwarded !== null ? `${s.totalMarksAwarded}/${(s.assessmentId as any)?.totalMarks || '?'}` : '—'}</td>
                    <td><StatusChip status={s.status} /></td>
                    <td>{fmt(s.submittedAt || s.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ── Thinking Lab Tab ── */}
        {activeTab === 'thinking' && (
          loadingActivity ? <div className="spd-tab-loading"><Spinner /></div> :
          !thinking ? <p className="spd-empty">No Thinking Lab activity yet.</p> :
          <div>
            <div className="report-stats-grid">
              <div className="stat-box"><span className="stat-label">XP</span><span className="stat-value">{thinking.summary.xp}</span></div>
              <div className="stat-box"><span className="stat-label">Level</span><span className="stat-value">{thinking.summary.level}</span></div>
              <div className="stat-box present"><span className="stat-label">Solved</span><span className="stat-value">{thinking.summary.solvedTotal}</span></div>
              <div className="stat-box percentage"><span className="stat-label">Streak</span><span className="stat-value">{thinking.summary.currentStreak}</span></div>
              <div className="stat-box"><span className="stat-label">Best Streak</span><span className="stat-value">{thinking.summary.longestStreak}</span></div>
              <div className="stat-box"><span className="stat-label">Badges</span><span className="stat-value">{thinking.summary.badges}</span></div>
            </div>

            {(thinking.strengths?.length > 0 || thinking.weaknesses?.length > 0 || thinking.traits?.length > 0) && (
              <div className="spd-lab-insight">
                {thinking.strengths?.length > 0 && (
                  <div><h5>Strengths</h5><ul>{thinking.strengths.map((s: string, i: number) => <li key={i}>{s}</li>)}</ul></div>
                )}
                {thinking.weaknesses?.length > 0 && (
                  <div><h5>Needs work</h5><ul>{thinking.weaknesses.map((s: string, i: number) => <li key={i}>{s}</li>)}</ul></div>
                )}
                {thinking.traits?.length > 0 && (
                  <div><h5>Traits</h5><ul>{thinking.traits.map((t: any, i: number) => <li key={i}>{t.label}{t.note ? ` — ${t.note}` : ''}</li>)}</ul></div>
                )}
              </div>
            )}

            <h4>Recent Challenges</h4>
            {thinking.recent.length === 0 ? <p className="spd-empty">No challenges attempted yet.</p> : (
              <div className="spd-table-wrap">
                <table className="spd-table">
                  <thead><tr><th>Date</th><th>Difficulty</th><th>Status</th><th>Score</th><th>Hints Used</th></tr></thead>
                  <tbody>
                    {thinking.recent.map((c: any, i: number) => (
                      <tr key={i}>
                        <td>{c.date || '—'}</td>
                        <td>{c.difficulty || '—'}</td>
                        <td><span className={`spd-status-badge ${c.status}`}>{c.status}</span></td>
                        <td>{c.score != null ? `${c.score}/10` : '—'}</td>
                        <td>{c.hintsUsed ?? 0}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ── Communication Lab Tab ── */}
        {activeTab === 'communication' && (
          loadingActivity ? <div className="spd-tab-loading"><Spinner /></div> :
          !communication ? <p className="spd-empty">No Communication Lab activity yet.</p> :
          <div>
            <div className="report-stats-grid">
              <div className="stat-box"><span className="stat-label">Attempts</span><span className="stat-value">{communication.summary.attempts}</span></div>
              <div className="stat-box present"><span className="stat-label">Completed</span><span className="stat-value">{communication.summary.completed}</span></div>
              <div className="stat-box percentage"><span className="stat-label">Avg Overall</span><span className="stat-value">{communication.summary.averageOverall}</span></div>
              <div className="stat-box"><span className="stat-label">Avg Fluency</span><span className="stat-value">{communication.summary.averageFluency}</span></div>
              <div className="stat-box"><span className="stat-label">Avg Confidence</span><span className="stat-value">{communication.summary.averageConfidence}</span></div>
              <div className="stat-box"><span className="stat-label">Streak</span><span className="stat-value">{communication.summary.currentStreak}</span></div>
            </div>

            <div className="spd-lab-sub">
              Completed days: <b>{communication.summary.completedDays}</b> · Missed days: <b>{communication.summary.missedDays}</b> · Best streak: <b>{communication.summary.longestStreak}</b>
            </div>

            <h4>Recent Practice</h4>
            {communication.recent.length === 0 ? <p className="spd-empty">No practice sessions yet.</p> : (
              <div className="spd-table-wrap">
                <table className="spd-table">
                  <thead><tr><th>Date</th><th>Status</th><th>Overall</th><th>Fluency</th><th>Confidence</th><th>Grammar</th></tr></thead>
                  <tbody>
                    {communication.recent.map((a: any, i: number) => (
                      <tr key={i}>
                        <td>{fmt(a.date)}</td>
                        <td><span className={`spd-status-badge ${a.status}`}>{a.status}</span></td>
                        <td>{a.overall ?? '—'}</td>
                        <td>{a.fluency ?? '—'}</td>
                        <td>{a.confidence ?? '—'}</td>
                        <td>{a.grammar ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ── Interviews Tab ── */}
        {activeTab === 'interviews' && (
          loadingReport ? <div className="spd-tab-loading"><Spinner /></div> :
          !report ? <p className="spd-empty">No interview data found.</p> :
          <div className="detail-section">
            <div className="stats-row">
              <div className="stat-box"><span className="stat-label">Total</span><span className="stat-value">{report.interviews?.total ?? 0}</span></div>
              <div className="stat-box"><span className="stat-label">Mock</span><span className="stat-value">{report.interviews?.mock ?? 0}</span></div>
              <div className="stat-box"><span className="stat-label">Real</span><span className="stat-value">{report.interviews?.real ?? 0}</span></div>
              <div className="stat-box present"><span className="stat-label">Attended</span><span className="stat-value">{report.interviews?.attended ?? 0}</span></div>
              <div className="stat-box present"><span className="stat-label">Passed</span><span className="stat-value">{report.interviews?.passed ?? 0}</span></div>
              <div className="stat-box percentage"><span className="stat-label">Overall Avg</span><span className="stat-value">{report.interviews?.averageScore ?? 0}%</span></div>
            </div>
            <div className="scores-row">
              <div className="score-card"><div className="score-label">Communication Score</div><div className="score-value">{report.interviews?.communicationAvg ?? 0}%</div><div className="score-bar"><div className="score-fill" style={{ width: `${report.interviews?.communicationAvg ?? 0}%` }}></div></div></div>
              <div className="score-card"><div className="score-label">Technical Score</div><div className="score-value">{report.interviews?.technicalAvg ?? 0}%</div><div className="score-bar"><div className="score-fill" style={{ width: `${report.interviews?.technicalAvg ?? 0}%` }}></div></div></div>
            </div>
            <h4>Recent Interviews</h4>
            <table className="data-table">
              <thead><tr><th>Date</th><th>Type</th><th>Company</th><th>Overall Score</th><th>Status</th><th>Result</th></tr></thead>
              <tbody>
                {(report.interviews?.recentInterviews || []).length === 0 ? (
                  <tr><td colSpan={6} className="no-data">No interview records found</td></tr>
                ) : (
                  report.interviews.recentInterviews.map((iv: any, idx: number) => (
                    <tr key={idx}>
                      <td>{new Date(iv.date).toLocaleDateString()}</td>
                      <td>{iv.type}</td>
                      <td>{iv.companyName || '-'}</td>
                      <td>{iv.scores?.overall || 0}%</td>
                      <td><span className={`status-badge ${iv.status}`}>{iv.status}</span></td>
                      <td><span className={`status-badge ${iv.result || 'pending'}`}>{iv.result || 'pending'}</span></td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>

            {/* ── AI Mock Interviews ── */}
            <h4 style={{ marginTop: 28 }}>🤖 AI Mock Interviews</h4>
            {aiInterviews === null ? <p className="spd-empty">Loading…</p> :
              aiInterviews.length === 0 ? <p className="spd-empty">No AI mock interviews attempted yet.</p> : (
                <table className="data-table">
                  <thead><tr><th>Date</th><th>Interview</th><th>Score</th><th>Readiness</th><th>Status</th><th></th></tr></thead>
                  <tbody>
                    {aiInterviews.map((a: any) => (
                      <tr key={a._id}>
                        <td>{new Date(a.createdAt).toLocaleDateString()}</td>
                        <td>{a.templateId?.title || 'Interview'}</td>
                        <td>{(a.overallPercentage ?? 0).toFixed(0)}%</td>
                        <td style={{ textTransform: 'capitalize' }}>{(a.readinessLevel || '—').replace(/_/g, ' ')}</td>
                        <td><span className={`status-badge ${a.passStatus || a.status}`}>{a.status === 'submitted' ? 'awaiting review' : (a.passStatus || a.status)}</span></td>
                        <td style={{ display: 'flex', gap: 6 }}>
                          {!['in_progress', 'not_started'].includes(a.status) && (
                            <button className="spd-pill blue" style={{ border: 'none', cursor: 'pointer' }}
                              onClick={() => navigate(`/admin/interviews/report/${a._id}`)}>View report</button>
                          )}
                          {['submitted', 'under_review', 'evaluated'].includes(a.status) && (
                            <button className="spd-pill green" style={{ border: 'none', cursor: 'pointer' }}
                              onClick={() => publishAttempt(a)} title="Make results visible to the student">Publish to student</button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

            {/* ── Physical / Scheduled Mock Interviews ── */}
            <h4 style={{ marginTop: 28 }}>🧑‍💼 Mock Interviews (Scheduled)</h4>
            {mockData === null ? <p className="spd-empty">Loading…</p> :
              mockData.interviews.length === 0 ? <p className="spd-empty">No scheduled mock interviews for this student.</p> : (() => {
                const fbMap = new Map(mockData.feedback.map((f: any) => [String(f.interviewId), f]));
                return (
                  <table className="data-table">
                    <thead><tr><th>Date</th><th>Interview</th><th>Interviewer</th><th>Status</th><th>Score</th><th>Feedback</th></tr></thead>
                    <tbody>
                      {mockData.interviews.map((iv: any) => {
                        const fb: any = fbMap.get(String(iv._id));
                        return (
                          <tr key={iv._id}>
                            <td>{new Date(iv.date).toLocaleDateString()}</td>
                            <td>{iv.title}</td>
                            <td>{iv.interviewerName || '-'}</td>
                            <td><span className={`status-badge ${iv.status}`}>{iv.status}</span></td>
                            <td>{fb?.overallScore != null ? `${fb.overallScore.toFixed(1)}/10` : '—'}</td>
                            <td>{fb ? (fb.releasedToStudent ? '✅ Released' : '📝 Recorded (not released)') : '—'}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                );
              })()}
          </div>
        )}

        {/* ── Fees Tab ── */}
        {activeTab === 'fees' && (
          loadingReport ? <div className="spd-tab-loading"><Spinner /></div> :
          !report ? <p className="spd-empty">No fee data found.</p> :
          <div className="detail-section">
            <div className="stats-row">
              <div className="stat-box"><span className="stat-label">Total Amount</span><span className="stat-value">₹{(report.fees?.totalAmount ?? 0).toLocaleString()}</span></div>
              <div className="stat-box present"><span className="stat-label">Paid</span><span className="stat-value">₹{(report.fees?.paidAmount ?? 0).toLocaleString()}</span></div>
              <div className="stat-box absent"><span className="stat-label">Due</span><span className="stat-value">₹{(report.fees?.dueAmount ?? 0).toLocaleString()}</span></div>
              <div className="stat-box"><span className="stat-label">Status</span><span className={`stat-value status-${report.fees?.status}`}>{(report.fees?.status || '—').toUpperCase()}</span></div>
            </div>
            <h4>Payment History</h4>
            <table className="data-table">
              <thead><tr><th>Date</th><th>Amount</th><th>Method</th><th>Transaction ID</th><th>Received By</th></tr></thead>
              <tbody>
                {(report.fees?.payments || []).length === 0 ? (
                  <tr><td colSpan={5} className="no-data">No payment records found</td></tr>
                ) : (
                  report.fees.payments.map((payment: any, idx: number) => (
                    <tr key={idx}>
                      <td>{new Date(payment.paymentDate).toLocaleDateString()}</td>
                      <td>₹{(payment.amount ?? 0).toLocaleString()}</td>
                      <td>{payment.paymentMethod}</td>
                      <td>{payment.transactionId || '-'}</td>
                      <td>{payment.receivedBy?.firstName || '-'} {payment.receivedBy?.lastName || ''}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* ── Exams Tab ── */}
        {activeTab === 'exams' && userId && <ExamsPanel userId={userId} />}
      </div>
    </div>
  );
};

/**
 * Exam records — the tab that could never show anything.
 *
 * The Exam model and this tab both shipped long ago, but no endpoint existed to CREATE
 * an exam, so it was permanently empty and offline/placement marks had nowhere to live.
 * This panel is the missing write side: record a result, correct it, remove it.
 */
const BLANK_EXAM = {
  examName: '', examType: 'internal', date: new Date().toISOString().slice(0, 10),
  maxScore: 100, scoredMarks: 0, result: '', remarks: '',
};

const ExamsPanel: React.FC<{ userId: string }> = ({ userId }) => {
  const [exams, setExams] = useState<ExamRecord[]>([]);
  const [summary, setSummary] = useState<ExamSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<any>({ ...BLANK_EXAM });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  const load = () => {
    setLoading(true);
    listStudentExams(userId)
      .then(d => { setExams(d.exams || []); setSummary(d.summary); setErr(''); })
      .catch(e => setErr(e.message || 'Failed to load exams'))
      .finally(() => setLoading(false));
  };
  useEffect(load, [userId]);

  const openNew = () => { setForm({ ...BLANK_EXAM }); setEditingId(null); setShowForm(true); setErr(''); };
  const openEdit = (e: ExamRecord) => {
    setForm({
      examName: e.examName, examType: e.examType, date: new Date(e.date).toISOString().slice(0, 10),
      maxScore: e.maxScore, scoredMarks: e.scoredMarks, result: e.result, remarks: e.remarks || '',
    });
    setEditingId(e._id); setShowForm(true); setErr('');
  };

  const save = async () => {
    setSaving(true); setErr('');
    try {
      const payload = {
        ...form,
        maxScore: Number(form.maxScore),
        scoredMarks: Number(form.scoredMarks),
        // Blank means "work it out from the marks" — don't send an empty string.
        ...(form.result ? { result: form.result } : {}),
      };
      if (editingId) await updateExam(editingId, payload);
      else await createExam({ ...payload, studentId: userId });
      setShowForm(false);
      load();
    } catch (e: any) {
      setErr(e.message || 'Failed to save');
    } finally { setSaving(false); }
  };

  const remove = async (e: ExamRecord) => {
    if (!window.confirm(`Delete "${e.examName}"? This cannot be undone.`)) return;
    try { await deleteExam(e._id); load(); }
    catch (ex: any) { setErr(ex.message || 'Failed to delete'); }
  };

  const pct = Number(form.maxScore) > 0
    ? Math.round((Number(form.scoredMarks) || 0) / Number(form.maxScore) * 100) : 0;

  if (loading) return <div className="spd-tab-loading"><Spinner /></div>;

  return (
    <div className="detail-section">
      <div className="spd-exam-head">
        <h4>Exam Records</h4>
        <button className="spd-btn-primary" onClick={openNew}>+ Record Exam</button>
      </div>

      {err && <div className="spd-exam-error">{err}</div>}

      {summary && (
        <div className="stats-row">
          <div className="stat-box"><span className="stat-label">Total</span><span className="stat-value">{summary.total}</span></div>
          <div className="stat-box present"><span className="stat-label">Passed</span><span className="stat-value">{summary.passed}</span></div>
          <div className="stat-box absent"><span className="stat-label">Failed</span><span className="stat-value">{summary.failed}</span></div>
          <div className="stat-box percentage"><span className="stat-label">Average %</span><span className="stat-value">{summary.averagePercentage}%</span></div>
        </div>
      )}

      {showForm && (
        <div className="spd-exam-form">
          <div className="spd-exam-grid">
            <label>Exam Name
              <input value={form.examName} onChange={e => setForm({ ...form, examName: e.target.value })}
                placeholder="e.g. Java Internal 1" />
            </label>
            <label>Type
              <select value={form.examType} onChange={e => setForm({ ...form, examType: e.target.value })}>
                <option value="internal">Internal</option>
                <option value="external">External</option>
                <option value="certification">Certification</option>
                <option value="placement">Placement</option>
              </select>
            </label>
            <label>Date
              <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
            </label>
            <label>Max Score
              <input type="number" min={1} value={form.maxScore}
                onChange={e => setForm({ ...form, maxScore: e.target.value })} />
            </label>
            <label>Scored Marks
              <input type="number" min={0} value={form.scoredMarks}
                onChange={e => setForm({ ...form, scoredMarks: e.target.value })} />
            </label>
            <label>Result
              <select value={form.result} onChange={e => setForm({ ...form, result: e.target.value })}>
                <option value="">Auto ({pct >= 40 ? 'pass' : 'fail'} at {pct}%)</option>
                <option value="pass">Pass</option>
                <option value="fail">Fail</option>
                <option value="pending">Pending</option>
              </select>
            </label>
            <label className="spd-exam-wide">Remarks
              <input value={form.remarks} onChange={e => setForm({ ...form, remarks: e.target.value })}
                placeholder="Optional note" />
            </label>
          </div>
          <div className="spd-exam-actions">
            <span className="spd-exam-pct">{pct}%</span>
            <button className="spd-btn-ghost" onClick={() => setShowForm(false)} disabled={saving}>Cancel</button>
            <button className="spd-btn-primary" onClick={save} disabled={saving}>
              {saving ? 'Saving…' : editingId ? 'Update' : 'Save'}
            </button>
          </div>
        </div>
      )}

      <div className="spd-table-wrap">
        <table className="spd-table">
          <thead><tr><th>Exam Name</th><th>Type</th><th>Date</th><th>Score</th><th>%</th><th>Grade</th><th>Result</th><th>Remarks</th><th></th></tr></thead>
          <tbody>
            {exams.length === 0 ? (
              <tr><td colSpan={9} className="no-data">No exam records yet. Use “Record Exam” to add one.</td></tr>
            ) : exams.map(e => (
              <tr key={e._id}>
                <td>{e.examName}</td>
                <td>{e.examType}</td>
                <td>{new Date(e.date).toLocaleDateString()}</td>
                <td>{e.scoredMarks}/{e.maxScore}</td>
                <td>{e.percentage}%</td>
                <td>{e.grade || '—'}</td>
                <td><span className={`status-badge ${e.result}`}>{e.result}</span></td>
                <td>{e.remarks || '—'}</td>
                <td className="spd-exam-row-actions">
                  <button className="spd-btn-ghost" onClick={() => openEdit(e)}>Edit</button>
                  <button className="spd-btn-danger" onClick={() => remove(e)}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ── Candidate Proof Profile panel (placement team: publish + copy the HR link) ──
const ProofPanel: React.FC<{ userId: string; name: string }> = ({ userId, name }) => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    candidateProofApi.get(userId)
      .then((r) => setData(r.data.data))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [userId]);

  const publish = async () => {
    setBusy(true);
    try {
      const r = await candidateProofApi.publish(userId);
      setData((d: any) => ({ ...(d || {}), published: true, shareToken: r.data.data.shareToken, url: r.data.data.url }));
      copy(r.data.data.url);
    } catch { /* ignore */ } finally { setBusy(false); }
  };
  const unpublish = async () => {
    setBusy(true);
    try { await candidateProofApi.unpublish(userId); setData((d: any) => ({ ...(d || {}), published: false })); }
    catch { /* ignore */ } finally { setBusy(false); }
  };
  const copy = (url?: string) => {
    if (!url) return;
    navigator.clipboard?.writeText(url).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1800); }).catch(() => {});
  };

  const pf = data?.profile;
  const live = data?.published && data?.url;
  const readiness = pf?.assessment?.readiness, interview = pf?.interview?.score, comm = pf?.communication?.score;

  return (
    <div className="spd-proof">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div className="spd-proof-title">Candidate Proof Profile</div>
          <div className="spd-proof-sub">A shareable, HR-facing page with {name.split(' ')[0]}'s verified scores — send it instead of a plain resume.</div>
        </div>
        {!loading && (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {!live && <button onClick={publish} disabled={busy} style={btnT}>{busy ? 'Publishing…' : '🔗 Publish & copy link'}</button>}
            {live && <>
              <a href={data.url} target="_blank" rel="noreferrer" style={btnG}>👁 Preview ↗</a>
              <button onClick={() => copy(data.url)} style={btnT}>{copied ? '✓ Copied' : '📋 Copy link'}</button>
              <button onClick={unpublish} disabled={busy} style={btnGhost}>Disable</button>
            </>}
          </div>
        )}
      </div>
      {!loading && (
        <div style={{ display: 'flex', gap: 14, marginTop: 14, flexWrap: 'wrap', fontSize: 12.5 }}>
          <ProofStat label="Readiness" v={readiness} suffix="%" />
          <ProofStat label="Mock Interview" v={interview} />
          <ProofStat label="Communication" v={comm} />
          {live && <div style={{ flex: 1, minWidth: 200, alignSelf: 'center', color: '#93c5fd', fontSize: 11.5, wordBreak: 'break-all' }}>{data.url}</div>}
        </div>
      )}
      {!loading && !readiness && !interview && !comm && (
        <div className="spd-proof-warn">⚠ This student has little proof data yet (no assessment / mock-interview / communication scores). The page will still work but look thin.</div>
      )}
    </div>
  );
};

const ProofStat: React.FC<{ label: string; v?: number; suffix?: string }> = ({ label, v, suffix = '' }) => (
  <div className="spd-proof-stat">
    <div style={{ fontSize: 20, fontWeight: 800, color: v == null ? '#94a3b8' : v >= 80 ? '#4ade80' : v >= 60 ? '#fbbf24' : '#f87171' }}>{v != null ? `${v}${suffix}` : '—'}</div>
    <div style={{ color: '#c3cfe6', fontSize: 11 }}>{label}</div>
  </div>
);

// Buttons re-tuned for a light card; they were built for the old dark background.
const btnT: React.CSSProperties = { background: '#005897', color: '#fff', border: 'none', borderRadius: 9, padding: '9px 15px', fontWeight: 700, fontSize: 13, cursor: 'pointer' };
const btnG: React.CSSProperties = { background: '#fff', color: '#005897', border: '1px solid #cbd5e1', borderRadius: 9, padding: '9px 15px', fontWeight: 700, fontSize: 13, textDecoration: 'none', cursor: 'pointer' };
const btnGhost: React.CSSProperties = { background: '#fff', color: '#64748b', border: '1px solid #e2e8f0', borderRadius: 9, padding: '9px 15px', fontWeight: 600, fontSize: 13, cursor: 'pointer' };

export default StudentProfileDetail;
