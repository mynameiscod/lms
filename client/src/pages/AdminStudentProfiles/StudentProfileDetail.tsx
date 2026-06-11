import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { studentProfileAPI } from '../../api/studentProfileAPI';
import { getStudentReport } from '../../api/studentReportApi';
import { Spinner } from '../../components/common';
import './StudentProfileDetail.css';
import '../StudentReports/StudentReports.css';

type DetailTab = 'overview' | 'profile' | 'attendance' | 'quizzes' | 'assignments' | 'snippets' | 'interviews' | 'fees' | 'exams';

const ACTIVITY_TABS: DetailTab[] = ['attendance', 'quizzes', 'assignments', 'snippets'];
const REPORT_TABS: DetailTab[] = ['overview', 'interviews', 'fees', 'exams'];
const TAB_LABELS: Record<DetailTab, string> = {
  overview: '📊 Overview',
  profile: '👤 Profile',
  attendance: '📅 Attendance',
  quizzes: '📝 Quizzes',
  assignments: '📋 Assignments',
  snippets: '💻 Code Snippets',
  interviews: '🎤 Interviews',
  fees: '💰 Fees',
  exams: '📄 Exams',
};

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

const StudentProfileDetail: React.FC = () => {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState<DetailTab>('overview');
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
  const pct = profile?.profileCompletionPercentage || 0;
  const rg = ring(pct);

  const att = activity?.attendance;
  const quizAttempts: any[] = activity?.quizAttempts || [];
  const assignments: any[] = activity?.assignmentSubmissions || [];
  const snippets: any[] = activity?.snippetSubmissions || [];

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

      {/* Tabs */}
      <div className="spd-tabs">
        {(['overview', 'attendance', 'quizzes', 'assignments', 'exams', 'fees', 'snippets'] as DetailTab[]).map(t => (
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
        {activeTab === 'overview' && (
          <div className="spd-ov">
            {/* Stat cards */}
            <div className="spd-ov-stats">
              <div className="spd-ovc">
                <div className="spd-ovc-head"><span className="spd-ovc-ic blue">📅</span><span className="spd-ovc-label">Attendance</span></div>
                <div className="spd-ovc-val">{report?.attendance?.percentage ?? 0}%</div>
                <div className="spd-ovc-sub">Overall Attendance</div>
                <div className="spd-ovc-bar"><div className="spd-ovc-fill blue" style={{ width: `${report?.attendance?.percentage ?? 0}%` }} /></div>
                <div className="spd-ovc-foot">Last 30 days</div>
              </div>
              <div className="spd-ovc">
                <div className="spd-ovc-head"><span className="spd-ovc-ic purple">📝</span><span className="spd-ovc-label">Quizzes</span></div>
                <div className="spd-ovc-val">{report?.quizzes?.averageScore ?? 0}%</div>
                <div className="spd-ovc-sub">Average Score</div>
                <div className="spd-ovc-bar"><div className="spd-ovc-fill purple" style={{ width: `${report?.quizzes?.averageScore ?? 0}%` }} /></div>
                <div className="spd-ovc-foot">Total Quizzes: {report?.quizzes?.total ?? 0}</div>
              </div>
              <div className="spd-ovc">
                <div className="spd-ovc-head"><span className="spd-ovc-ic indigo">📋</span><span className="spd-ovc-label">Assignments</span></div>
                <div className="spd-ovc-val">{assignmentRate}%</div>
                <div className="spd-ovc-sub">Submission Rate</div>
                <div className="spd-ovc-bar"><div className="spd-ovc-fill indigo" style={{ width: `${assignmentRate}%` }} /></div>
                <div className="spd-ovc-foot">Submitted: {submittedCount}/{report?.assignments?.total ?? 0}</div>
              </div>
              <div className="spd-ovc">
                <div className="spd-ovc-head"><span className="spd-ovc-ic orange">💰</span><span className="spd-ovc-label">Fees Status</span></div>
                <div className="spd-ovc-val">₹{report?.fees?.dueAmount ?? 0}</div>
                <div className="spd-ovc-sub">Total Due</div>
                <button className="spd-ovc-link" onClick={() => setActiveTab('fees')}>View Details →</button>
              </div>
            </div>

            {/* Personal Information + Education */}
            <div className="spd-ov-2col">
              <div className="spd-card">
                <h3 className="spd-card-title">🪪 Personal Information</h3>
                <div className="spd-kv">
                  <div><label>Full Name</label><span>{fullName}</span></div>
                  <div><label>Email</label><span>{email || '—'}</span></div>
                  <div><label>Phone</label><span>{p.mobileNumber || '—'}</span></div>
                  <div><label>Location</label><span>{[p.city, p.state].filter(Boolean).join(', ') || '—'}</span></div>
                  <div><label>Date of Birth</label><span>{p.dateOfBirth ? fmt(p.dateOfBirth) : '—'}</span></div>
                  <div><label>Gender</label><span>{p.gender || '—'}</span></div>
                  <div><label>Profile Status</label><span>{profile?.isProfileComplete ? <span className="spd-pill green">Completed</span> : <span className="spd-pill amber">Incomplete</span>}</span></div>
                  <div><label>Member Since</label><span>{fmt(profile?.createdAt)}</span></div>
                </div>
              </div>
              <div className="spd-card">
                <h3 className="spd-card-title">🎓 Education</h3>
                {profile?.education ? (
                  <div className="spd-kv">
                    <div><label>Qualification</label><span>{profile.education.highestQualification || '—'}</span></div>
                    <div><label>College</label><span>{profile.education.degree?.college || '—'}</span></div>
                    <div><label>Degree %</label><span>{profile.education.degree?.percentage ?? '—'}{profile.education.degree?.percentage !== undefined ? '%' : ''}</span></div>
                    <div><label>Intermediate %</label><span>{profile.education.intermediate?.percentage ?? '—'}{profile.education.intermediate?.percentage !== undefined ? '%' : ''}</span></div>
                    <div><label>10th %</label><span>{profile.education.tenthClass?.percentage ?? '—'}{profile.education.tenthClass?.percentage !== undefined ? '%' : ''}</span></div>
                    <div><label>Graduation Year</label><span>{profile.education.degree?.graduationYear || '—'}</span></div>
                    <div><label>Status</label><span>{profile.education.currentStatus ? <span className="spd-pill green">{profile.education.currentStatus}</span> : '—'}</span></div>
                  </div>
                ) : <p className="spd-empty">No education info.</p>}
              </div>
            </div>

            {/* Technical Background */}
            <div className="spd-card">
              <h3 className="spd-card-title">💻 Technical Background</h3>
              {profile?.technicalBackground || profile?.courseInterest ? (
                <div className="spd-tech-grid">
                  <div>
                    <div className="spd-tech-label">Experience Level</div>
                    {profile?.technicalBackground?.experienceLevel ? <span className="spd-pill green">{profile.technicalBackground.experienceLevel}</span> : '—'}
                    <div className="spd-tech-label" style={{ marginTop: 14 }}>Languages</div>
                    <div className="spd-tags">{(profile?.technicalBackground?.programmingLanguages || []).map((l: string) => <span key={l} className="spd-tag">{l}</span>)}</div>
                    <div className="spd-tech-label" style={{ marginTop: 14 }}>Technologies</div>
                    <div className="spd-tags">{(profile?.technicalBackground?.technologies || []).map((t: string) => <span key={t} className="spd-tag blue">{t}</span>)}</div>
                  </div>
                  <div>
                    <div className="spd-tech-label">Course Interest</div>
                    {profile?.courseInterest?.interestedCourse ? <span className="spd-tag blue">{profile.courseInterest.interestedCourse}</span> : '—'}
                    <div className="spd-tech-label" style={{ marginTop: 14 }}>Preferred Batch</div>
                    {profile?.courseInterest?.preferredBatchTime ? <span className="spd-tag blue">{profile.courseInterest.preferredBatchTime}</span> : '—'}
                    <div className="spd-tech-label" style={{ marginTop: 14 }}>Preferred Timings</div>
                    <div>{profile?.courseInterest?.preferredLearningMode || '—'}</div>
                  </div>
                </div>
              ) : <p className="spd-empty">No technical background info.</p>}
            </div>

            {/* Payment Summary + Recent Activity */}
            <div className="spd-ov-2col">
              <div className="spd-card">
                <h3 className="spd-card-title">💳 Payment Summary</h3>
                <div className="spd-pay-boxes">
                  <div className="spd-pay-box"><span>Total Amount</span><b>₹{report?.fees?.totalAmount ?? 0}</b></div>
                  <div className="spd-pay-box green"><span>Paid Amount</span><b>₹{report?.fees?.paidAmount ?? 0}</b></div>
                  <div className="spd-pay-box red"><span>Due Amount</span><b>₹{report?.fees?.dueAmount ?? 0}</b></div>
                  <div className="spd-pay-box"><span>Status</span><b>{(report?.fees?.status || 'N/A').toUpperCase()}</b></div>
                </div>
                <h4 className="spd-subh">Payment History</h4>
                {(report?.fees?.payments || []).length === 0 ? <div className="spd-nodata">No payment records found</div> : (
                  <table className="spd-table"><thead><tr><th>Date</th><th>Amount</th><th>Method</th></tr></thead><tbody>
                    {report.fees.payments.map((pay: any, i: number) => <tr key={i}><td>{new Date(pay.paymentDate).toLocaleDateString()}</td><td>₹{pay.amount}</td><td>{pay.paymentMethod}</td></tr>)}
                  </tbody></table>
                )}
              </div>
              <div className="spd-card">
                <h3 className="spd-card-title">🕑 Recent Activity</h3>
                {recentActivity.length === 0 ? <p className="spd-empty">No recent activity.</p> : (
                  <div className="spd-timeline">
                    {recentActivity.map((a, i) => (
                      <div key={i} className="spd-tl-item">
                        <span className="spd-tl-dot" />
                        <div className="spd-tl-body">
                          <div className="spd-tl-title">{a.title}{a.badge && <span className="spd-pill green">{a.badge}</span>}</div>
                          <div className="spd-tl-time">{a.time}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Notes */}
            <div className="spd-card">
              <h3 className="spd-card-title">🗒️ Notes</h3>
              <div className="spd-note-add">
                <input className="spd-note-input" placeholder="Add a note about this student..." value={noteText}
                  onChange={e => setNoteText(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') handleAddNote(); }} />
                <button className="spd-note-btn" onClick={handleAddNote} disabled={savingNote || !noteText.trim()}>{savingNote ? '…' : 'Add Note'}</button>
              </div>
              {notes.length === 0 ? <p className="spd-empty">No notes yet.</p> : (
                notes.slice().reverse().map((n: any) => (
                  <div key={n._id} className="spd-note">
                    <span className="spd-note-avatar">{(n.authorName || 'A').split(' ').map((s: string) => s[0]).slice(0, 2).join('')}</span>
                    <div className="spd-note-body">
                      <div className="spd-note-head">
                        <b>{n.authorName || 'Admin'}</b>
                        {n.authorRole && <span className="spd-note-role">({n.authorRole})</span>}
                        <span className="spd-note-time">{new Date(n.createdAt).toLocaleString()}</span>
                        <button className="spd-note-del" onClick={() => handleDeleteNote(n._id)} title="Delete note">🗑️</button>
                      </div>
                      <div className="spd-note-text">{n.text}</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

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
          quizAttempts.length === 0 ? <p className="spd-empty">No quiz attempts found.</p> :
          <div className="spd-table-wrap">
            <table className="spd-table">
              <thead><tr><th>Quiz</th><th>Score</th><th>Status</th><th>Date</th></tr></thead>
              <tbody>
                {quizAttempts.map((a: any, i: number) => (
                  <tr key={i}>
                    <td>{a.quizId || '—'}</td>
                    <td>{a.score !== undefined ? `${a.score}/${a.totalMarks || '?'}` : '—'}</td>
                    <td><span className={`spd-status-badge ${a.status}`}>{a.status}</span></td>
                    <td>{fmt(a.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ── Assignments Tab ── */}
        {activeTab === 'assignments' && (
          loadingActivity ? <div className="spd-tab-loading"><Spinner /></div> :
          assignments.length === 0 ? <p className="spd-empty">No assignment submissions found.</p> :
          <div className="spd-table-wrap">
            <table className="spd-table">
              <thead><tr><th>Assignment</th><th>Type</th><th>Score</th><th>Status</th><th>Submitted</th></tr></thead>
              <tbody>
                {assignments.map((s: any, i: number) => (
                  <tr key={i}>
                    <td>{(s.assignment as any)?.title || s.assignmentId || '—'}</td>
                    <td>{(s.assignment as any)?.type || '—'}</td>
                    <td>{s.finalScore !== undefined ? `${s.finalScore}/${(s.assignment as any)?.totalPoints || '?'}` : '—'}</td>
                    <td><span className={`spd-status-badge ${s.status?.toLowerCase().replace('_', '-')}`}>{s.status}</span></td>
                    <td>{fmt(s.submittedAt || s.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ── Code Snippets Tab ── */}
        {activeTab === 'snippets' && (
          loadingActivity ? <div className="spd-tab-loading"><Spinner /></div> :
          snippets.length === 0 ? <p className="spd-empty">No code snippet submissions found.</p> :
          <div className="spd-table-wrap">
            <table className="spd-table">
              <thead><tr><th>Assessment</th><th>Language</th><th>Score</th><th>Status</th><th>Submitted</th></tr></thead>
              <tbody>
                {snippets.map((s: any, i: number) => (
                  <tr key={i}>
                    <td>{(s.assessmentId as any)?.title || '—'}</td>
                    <td>{(s.assessmentId as any)?.language || '—'}</td>
                    <td>{s.totalMarksAwarded !== undefined ? `${s.totalMarksAwarded}/${(s.assessmentId as any)?.totalMarks || '?'}` : '—'}</td>
                    <td><span className={`spd-status-badge ${s.status}`}>{s.status}</span></td>
                    <td>{fmt(s.submittedAt || s.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
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
        {activeTab === 'exams' && (
          loadingReport ? <div className="spd-tab-loading"><Spinner /></div> :
          !report ? <p className="spd-empty">No exam data found.</p> :
          <div className="detail-section">
            <div className="stats-row">
              <div className="stat-box"><span className="stat-label">Total</span><span className="stat-value">{report.exams?.total ?? 0}</span></div>
              <div className="stat-box present"><span className="stat-label">Passed</span><span className="stat-value">{report.exams?.passed ?? 0}</span></div>
              <div className="stat-box absent"><span className="stat-label">Failed</span><span className="stat-value">{report.exams?.failed ?? 0}</span></div>
              <div className="stat-box percentage"><span className="stat-label">Average %</span><span className="stat-value">{report.exams?.averagePercentage ?? 0}%</span></div>
            </div>
            <h4>Recent Exams</h4>
            <table className="data-table">
              <thead><tr><th>Exam Name</th><th>Type</th><th>Date</th><th>Score</th><th>Percentage</th><th>Result</th></tr></thead>
              <tbody>
                {(report.exams?.recentExams || []).length === 0 ? (
                  <tr><td colSpan={6} className="no-data">No exam records found</td></tr>
                ) : (
                  report.exams.recentExams.map((exam: any, idx: number) => (
                    <tr key={idx}>
                      <td>{exam.examName}</td>
                      <td>{exam.examType}</td>
                      <td>{new Date(exam.date).toLocaleDateString()}</td>
                      <td>{exam.scoredMarks}/{exam.maxScore}</td>
                      <td>{exam.percentage}%</td>
                      <td><span className={`status-badge ${exam.result}`}>{exam.result}</span></td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default StudentProfileDetail;
