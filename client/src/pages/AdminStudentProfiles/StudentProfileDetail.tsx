import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { studentProfileAPI } from '../../api/studentProfileAPI';
import { Spinner } from '../../components/common';
import './StudentProfileDetail.css';

type DetailTab = 'profile' | 'attendance' | 'quizzes' | 'assignments' | 'snippets';

const avatarColor = (name: string) => {
  const colors = ['#005897', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#0ea5e9', '#ec4899'];
  return colors[(name?.charCodeAt(0) || 0) % colors.length];
};

const ring = (pct: number, size = 80) => {
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
  const [activeTab, setActiveTab] = useState<DetailTab>('profile');
  const [profile, setProfile] = useState<any>(null);
  const [activity, setActivity] = useState<any>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [loadingActivity, setLoadingActivity] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!userId) return;
    setLoadingProfile(true);
    studentProfileAPI.getProfileByUserId(userId)
      .then((res: any) => setProfile(res.data || res))
      .catch((e: any) => setError(e.message || 'Failed to load profile'))
      .finally(() => setLoadingProfile(false));
  }, [userId]);

  useEffect(() => {
    if (!userId || activeTab === 'profile') return;
    if (activity) return; // already loaded
    setLoadingActivity(true);
    studentProfileAPI.getStudentActivity(userId)
      .then((res: any) => setActivity(res.data || res))
      .catch(() => setActivity(null))
      .finally(() => setLoadingActivity(false));
  }, [userId, activeTab, activity]);

  if (loadingProfile) return <div className="spd-loading"><Spinner /></div>;
  if (!profile) return <div className="spd-error">{error || 'Profile not found.'}</div>;

  const p = profile.personalInfo || {};
  const fullName = `${p.firstName || ''} ${p.middleName || ''} ${p.surname || ''}`.trim();
  const pct = profile.profileCompletionPercentage || 0;
  const rg = ring(pct);

  const att = activity?.attendance;
  const quizAttempts: any[] = activity?.quizAttempts || [];
  const assignments: any[] = activity?.assignmentSubmissions || [];
  const snippets: any[] = activity?.snippetSubmissions || [];

  return (
    <div className="spd-page">
      {/* Header */}
      <div className="spd-topbar">
        <button className="spd-back-btn" onClick={() => navigate('/admin/student-profiles')}>
          ← Back to Profiles
        </button>
      </div>

      {/* Hero */}
      <div className="spd-hero">
        <div className="spd-hero-left">
          {p.profilePhoto ? (
            <img src={p.profilePhoto} alt={fullName} className="spd-avatar-img" />
          ) : (
            <div className="spd-avatar-initials" style={{ background: avatarColor(p.firstName || '') }}>
              {(p.firstName?.[0] || '') + (p.surname?.[0] || '')}
            </div>
          )}
          <div className="spd-hero-info">
            <h1 className="spd-hero-name">{fullName}</h1>
            <p className="spd-hero-email">{p.email}</p>
            {p.mobileNumber && <p className="spd-hero-phone">📞 {p.mobileNumber}</p>}
            {p.city && <p className="spd-hero-location">📍 {p.city}{p.state ? `, ${p.state}` : ''}</p>}
            <div className="spd-hero-badges">
              {profile.courseInterest?.interestedCourse && (
                <span className="spd-badge course">{profile.courseInterest.interestedCourse}</span>
              )}
              {profile.technicalBackground?.experienceLevel && (
                <span className="spd-badge exp">{profile.technicalBackground.experienceLevel}</span>
              )}
              {profile.education?.currentStatus && (
                <span className="spd-badge status">{profile.education.currentStatus}</span>
              )}
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
            <span style={{ color: rg.color, fontSize: '1.5rem', fontWeight: 800 }}>{pct}%</span>
            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Profile</span>
          </div>
        </div>
        <div className="spd-hero-links">
          {profile.professionalProfiles?.resumeUrl && (
            <a href={profile.professionalProfiles.resumeUrl} target="_blank" rel="noopener noreferrer" className="spd-link-btn">📄 Resume</a>
          )}
          {profile.professionalProfiles?.linkedInUrl && (
            <a href={profile.professionalProfiles.linkedInUrl} target="_blank" rel="noopener noreferrer" className="spd-link-btn">🔗 LinkedIn</a>
          )}
          {profile.professionalProfiles?.githubUrl && (
            <a href={profile.professionalProfiles.githubUrl} target="_blank" rel="noopener noreferrer" className="spd-link-btn">🐙 GitHub</a>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="spd-tabs">
        {(['profile', 'attendance', 'quizzes', 'assignments', 'snippets'] as DetailTab[]).map(t => (
          <button
            key={t}
            className={`spd-tab ${activeTab === t ? 'active' : ''}`}
            onClick={() => setActiveTab(t)}
          >
            {t === 'profile' ? '👤 Profile' :
             t === 'attendance' ? '📅 Attendance' :
             t === 'quizzes' ? '📝 Quizzes' :
             t === 'assignments' ? '📋 Assignments' : '💻 Code Snippets'}
          </button>
        ))}
      </div>

      <div className="spd-tab-content">
        {/* ── Profile Tab ── */}
        {activeTab === 'profile' && (
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
      </div>
    </div>
  );
};

export default StudentProfileDetail;
