import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useStudentFeatures } from '../../contexts/StudentFeaturesContext';
import { Spinner } from '../../components/common';
import { attendanceApi, dashboardApi, leadApi, collegeSnapshotApi, placementDriveApi, alumniApi } from '../../api';
import AdminOverview from './AdminOverview';
import './DashboardPage.css';

interface DashboardData {
  course: {
    _id: string;
    title: string;
    description: string;
  } | null;
  courseProgress: {
    completed: number;
    total: number;
    percentage: number;
  };
  upcomingDeadlines: {
    assignments: Array<{
      _id: string;
      title: string;
      type: string;
      difficulty: string;
      dueDate: string;
      totalPoints: number;
      isSubmitted: boolean;
      daysUntilDue: number;
    }>;
    quizzes: Array<{
      _id: string;
      title: string;
      passingScore: number;
      timeLimit: number;
      endDate: string | null;
      totalQuestions: number;
      isAttempted: boolean;
      daysUntilEnd: number | null;
    }>;
    snippets: Array<{
      _id: string;
      title: string;
      language: string;
      totalMarks: number;
      dueDate: string | null;
      isAttempted: boolean;
      daysUntilDue: number | null;
    }>;
  };
  recentActivity: Array<{
    type: string;
    title: string;
    timestamp: string;
    status: string;
    score?: number;
    icon: string;
  }>;
  stats: {
    totalAssignments: number;
    completedAssignments: number;
    pendingAssignments: number;
    totalQuizzes: number;
    completedQuizzes: number;
    pendingQuizzes: number;
    totalSnippets: number;
    completedSnippets: number;
    pendingSnippets: number;
    courseProgress: number;
  };
}

interface AttendanceData {
  status: 'present' | 'late' | 'pending' | 'absent';
  inTime?: string;
  outTime?: string;
  totalPresent: number;
  totalAbsent: number;
  attendancePercentage: number;
}

interface DashboardStats {
  totalStudents: number;
  activeCourses: number;
  totalContent: number;
}

interface CollegeSnapshot {
  activeDrives: number;
  applicantsThisMonth: number;
  placedStudents: number;
  topCompany: string;
}

interface UpcomingDrive {
  _id: string;
  companyName: string;
  role: string;
  applicationDeadline?: string;
  ctcMin?: number;
  ctcMax?: number;
}

interface AlumniStats {
  total: number;
  mentorsAvailable: number;
  topCompany: string;
}

const DashboardPage: React.FC = () => {
  const { user, isAuthenticated } = useAuth();
  const { isFeatureEnabled } = useStudentFeatures();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [selectedDate] = useState(new Date());
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [stats, setStats] = useState<DashboardStats>({
    totalStudents: 0,
    activeCourses: 0,
    totalContent: 0,
  });
  const [attendance, setAttendance] = useState<AttendanceData>({
    status: 'pending',
    inTime: undefined,
    outTime: undefined,
    totalPresent: 0,
    totalAbsent: 0,
    attendancePercentage: 0,
  });

  // Student-specific extras
  const [upcomingDrives, setUpcomingDrives] = useState<UpcomingDrive[]>([]);
  const [alumniStats, setAlumniStats] = useState<AlumniStats | null>(null);

  // Lead follow-up notifications for staff/admin users
  const [leadPerf, setLeadPerf] = useState<{ todayFollowUps: number; overdueFollowUps: number; totalAssigned: number } | null>(null);
  const [collegeSnapshot, setCollegeSnapshot] = useState<CollegeSnapshot | null>(null);
  const hasLeadPermission = user?.permissions?.some((p: string) => ['view_leads', 'manage_leads', 'create_leads'].includes(p)) ?? false;

  // Determine if user should see admin dashboard
  // Any non-STUDENT role (TENANT_ADMIN, SUPER_ADMIN, INSTRUCTOR, STAFF, ATTENDANCE_ADMIN, etc.)
  // should see admin dashboard. Also STUDENT with admin permissions should see admin dashboard.
  const isAdminUser = user ? (
    user.role !== 'STUDENT' ||
    (user.permissions && user.permissions.length > 0 && 
      ['manage_tenant_users', 'view_analytics', 'view_reports', 'create_courses', 'edit_courses', 'manage_tenant', 'mark_attendance', 'create_quiz', 'manage_assignments', 'manage_interviews'].some(p => user.permissions!.includes(p)))
  ) : false;

  // Get greeting based on time of day
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 18) return 'Good Afternoon';
    return 'Good Evening';
  };

  // Daily motivation messages
  const motivationMessages = [
    'Every step forward is progress. Keep pushing!',
    'Success is the sum of small efforts repeated day in and out.',
    'You are capable of amazing things. Start today!',
    'The only way to do great work is to love what you do.',
    'Your potential is endless. Make today count!',
    'Don\'t watch the clock; do what it does. Keep going.',
    'Excellence is not a skill, it\'s an attitude.',
    'Today is the perfect day to learn something new.',
    'You are stronger than you think. Keep learning!',
    'Every expert was once a beginner. Stay focused!',
  ];

  // Get random motivation message
  const getMotivation = () => {
    const today = new Date().toDateString();
    const seed = today.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return motivationMessages[seed % motivationMessages.length];
  };

  // Fetch admin stats
  const fetchAdminStats = async () => {
    try {
      const res = await dashboardApi.getAdminStats();
      if (res.success && res.data) {
        setStats({
          totalStudents: res.data.totalStudents,
          activeCourses: res.data.activeCourses,
          totalContent: res.data.totalContent,
        });
      }
    } catch (error) {
      console.error('Error fetching admin stats:', error);
    }
  };

  const fetchCollegeSnapshot = async () => {
    try {
      const res = await collegeSnapshotApi.getSnapshot();
      if (res.success && res.data) setCollegeSnapshot(res.data);
    } catch {
      // Optional widget — silently ignore
    }
  };

  // Fetch lead follow-up stats for users with lead access
  const fetchLeadFollowUps = async () => {
    try {
      const res = await leadApi.getMyPerformance();
      if (res.success && res.data) {
        setLeadPerf({
          todayFollowUps: res.data.todayFollowUps || 0,
          overdueFollowUps: res.data.overdueFollowUps || 0,
          totalAssigned: res.data.totalAssigned || 0,
        });
      }
    } catch {
      // Lead permissions not available for this user - silently ignore
    }
  };

  // Fetch student dashboard data
  const fetchStudentDashboard = async () => {
    try {
      const response = await dashboardApi.getStudentDashboard();
      if (response.success && response.data) {
        setDashboardData(response.data);
      }
    } catch (error) {
      console.error('Error fetching student dashboard:', error);
    }
  };

  const fetchUpcomingDrives = async () => {
    try {
      const res = await placementDriveApi.list('active');
      if (res.success && Array.isArray(res.data)) {
        setUpcomingDrives(res.data.slice(0, 3));
      }
    } catch {
      // Optional — silently ignore
    }
  };

  const fetchAlumniStats = async () => {
    try {
      const res = await alumniApi.getStats();
      if (res.success && res.data) {
        setAlumniStats({
          total: res.data.total || 0,
          mentorsAvailable: res.data.mentorsAvailable || 0,
          topCompany: res.data.topCompanies?.[0]?.company || ''
        });
      }
    } catch {
      // Optional — silently ignore
    }
  };

  // Fetch attendance data
  const fetchAttendance = async () => {
    if (!user?._id || user?.role !== 'STUDENT') return;
    
    try {
      const now = selectedDate;
      const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      const [summaryRes, todayRes] = await Promise.all([
        attendanceApi.getStudentAttendanceSummary(user._id, user.batchId),
        attendanceApi.getStudentAttendance(user._id, dateStr, dateStr)
      ]);

      const summary = summaryRes.data || summaryRes;
      const todayRecords = todayRes.data || todayRes || [];
      const todayRecord = Array.isArray(todayRecords) && todayRecords.length > 0 ? todayRecords[0] : null;

      setAttendance({
        status: todayRecord?.status || 'pending',
        inTime: todayRecord?.inTime || undefined,
        outTime: todayRecord?.outTime || undefined,
        totalPresent: summary?.present || 0,
        totalAbsent: summary?.absent || 0,
        attendancePercentage: summary?.percentage || 0,
      });
    } catch (error) {
      console.error('Error fetching attendance:', error);
    }
  };

  useEffect(() => {
    const loadDashboard = async () => {
      setLoading(true);
      
      if (user?.role === 'STUDENT' && !isAdminUser) {
        await Promise.all([fetchStudentDashboard(), fetchAttendance(), fetchUpcomingDrives(), fetchAlumniStats()]);
      } else {
        await Promise.all([
          fetchAdminStats(),
          fetchCollegeSnapshot(),
          ...(hasLeadPermission ? [fetchLeadFollowUps()] : [])
        ]);
      }
      
      setLoading(false);
    };

    if (user) {
      loadDashboard();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Format date for display
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffTime = date.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Tomorrow';
    if (diffDays < 7) return `${diffDays} days`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  // Format timestamp for activity
  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffTime = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  if (loading) return <Spinner fullScreen />;

  if (!isAuthenticated || !user) {
    return (
      <div className="dashboard-container">
        <div className="access-denied">
          <h1>Access Denied</h1>
          <p>Please log in to access the dashboard.</p>
        </div>
      </div>
    );
  }

  // Admin Dashboard
  const isAdmin = isAdminUser;
  // The rich overview (org-wide revenue, leads, placements…) is for org admins only.
  const isOrgAdmin = user?.role === 'SUPER_ADMIN' || user?.role === 'TENANT_ADMIN';

  if (isOrgAdmin) {
    return <AdminOverview firstName={user.firstName} />;
  }

  // Other staff/instructor roles — a simple welcome with quick links, no org metrics.
  if (isAdmin) {
    return (
      <div className="dashboard-container">
        <div className="admin-dashboard">
          <div className="dashboard-header">
            <h1>Dashboard</h1>
            <p>Welcome back, <strong>{user.firstName}!</strong></p>
          </div>
          <div className="dashboard-grid">
            <div className="dashboard-card">
              <h2>⚙️ Quick Actions</h2>
              <div className="card-content">
                <a href="/learning-library" className="action-link">📚 Content Library</a>
                <a href="/admin/assignments" className="action-link">📝 Assignments</a>
                <a href="/quiz-management" className="action-link">❓ Quizzes</a>
                <a href="/attendance" className="action-link">✅ Attendance</a>
                {hasLeadPermission && <a href="/leads" className="action-link">🎯 Leads</a>}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Student Dashboard - Redesigned to match screenshot theme
  const data = dashboardData;
  const totalPending = (data?.stats.pendingAssignments || 0) + (data?.stats.pendingQuizzes || 0) + (data?.stats.pendingSnippets || 0);
  const totalDays = attendance.totalPresent + attendance.totalAbsent;
  const attPct = attendance.attendancePercentage;
  const attColor = attPct >= 75 ? '#359aad' : attPct >= 50 ? '#f59e0b' : '#ef4444';
  const attLabel = attPct >= 85 ? 'Good' : attPct >= 75 ? 'Average' : attPct >= 50 ? 'Low' : 'Critical';

  // Compute quiz average from recent activity
  const quizScores = data?.recentActivity.filter(a => a.type === 'quiz' && a.score !== undefined).map(a => a.score!) || [];
  const quizAvg = quizScores.length > 0 ? Math.round(quizScores.reduce((a, b) => a + b, 0) / quizScores.length) : 0;

  // Combine deadlines into a single sorted list
  const allDeadlines = [
    ...(data?.upcomingDeadlines.assignments.map(a => ({ ...a, kind: 'assignment' as const, due: a.dueDate, daysLeft: a.daysUntilDue })) || []),
    ...(data?.upcomingDeadlines.quizzes.filter(q => q.endDate).map(q => ({ ...q, kind: 'quiz' as const, due: q.endDate!, daysLeft: q.daysUntilEnd! })) || []),
    ...(data?.upcomingDeadlines.snippets?.filter(s => s.dueDate).map(s => ({ ...s, kind: 'snippet' as const, due: s.dueDate!, daysLeft: s.daysUntilDue! })) || []),
  ].sort((a, b) => a.daysLeft - b.daysLeft).slice(0, 5);

  const getDeadlineColor = (days: number) => {
    if (days <= 1) return '#ef4444';
    if (days <= 3) return '#f59e0b';
    return '#359aad';
  };

  return (
    <div className="sd">
      {/* Hero Banner */}
      {isFeatureEnabled('myCourse') && data?.course && (
        <div className="sd-hero">
          <div className="sd-hero-content">
            <span className="sd-hero-label">CURRENTLY LEARNING</span>
            <h2 className="sd-hero-title">{data.course.title}</h2>
            <p className="sd-hero-meta">
              {data.courseProgress.completed} of {data.courseProgress.total} chapters completed
            </p>
            <div className="sd-hero-bar-wrap">
              <div className="sd-hero-bar">
                <div className="sd-hero-bar-fill" style={{ width: `${data.courseProgress.percentage}%` }} />
              </div>
              <span className="sd-hero-bar-text">{data.courseProgress.percentage}% complete</span>
            </div>
          </div>
          <div className="sd-hero-right">
            <div className="sd-hero-pct">{data.courseProgress.percentage}%</div>
            <span className="sd-hero-pct-label">course progress</span>
            <button className="sd-hero-btn" onClick={() => navigate('/my-learning')}>
              <i className="fa-solid fa-play"></i> Resume lesson
            </button>
          </div>
        </div>
      )}

      {/* Stats Row */}
      <div className="sd-stats-row">
        {isFeatureEnabled('assignments') && (
          <div className="sd-stat-card" onClick={() => navigate('/assignments')}>
            <div className="sd-stat-icon sd-stat-green"><i className="fa-solid fa-check"></i></div>
            {(data?.stats.completedAssignments || 0) > 0 && <span className="sd-stat-badge sd-badge-teal">+1 today</span>}
            <div className="sd-stat-number">{data?.stats.completedAssignments || 0}</div>
            <div className="sd-stat-label">Assignments done</div>
            <div className="sd-stat-sub">{data?.stats.completedAssignments || 0} of {data?.stats.totalAssignments || 0} total · {data?.stats.pendingAssignments || 0} pending</div>
          </div>
        )}
        <div className="sd-stat-card">
          <div className="sd-stat-icon sd-stat-orange"><i className="fa-solid fa-clock"></i></div>
          {totalPending > 0 && <span className="sd-stat-badge sd-badge-red">Due soon</span>}
          <div className="sd-stat-number">{totalPending}</div>
          <div className="sd-stat-label">Pending tasks</div>
          <div className="sd-stat-sub">{data?.upcomingDeadlines.assignments.filter(a => a.daysUntilDue <= 1).length || 0} due tomorrow · {data?.upcomingDeadlines.assignments.filter(a => a.daysUntilDue <= 7).length || 0} this week</div>
        </div>
        {isFeatureEnabled('quizzes') && (
          <div className="sd-stat-card" onClick={() => navigate('/quizzes')}>
            <div className="sd-stat-icon sd-stat-star"><i className="fa-solid fa-star"></i></div>
            {quizAvg > 0 && <span className="sd-stat-badge sd-badge-teal">Last: {quizScores[0]}%</span>}
            <div className="sd-stat-number">{quizAvg}%</div>
            <div className="sd-stat-label">Quiz avg score</div>
            <div className="sd-stat-sub">{data?.stats.completedQuizzes || 0} quizzes taken · {quizAvg >= 70 ? 'above avg' : 'needs work'}</div>
          </div>
        )}
        {isFeatureEnabled('attendance') && (
          <div className="sd-stat-card" onClick={() => navigate('/my-attendance')}>
            <div className="sd-stat-icon sd-stat-monitor"><i className="fa-solid fa-desktop"></i></div>
            <span className={`sd-stat-badge ${attPct >= 75 ? 'sd-badge-teal' : 'sd-badge-red'}`}>{attLabel}</span>
            <div className="sd-stat-number">{attPct}%</div>
            <div className="sd-stat-label">Attendance</div>
            <div className="sd-stat-sub">{attendance.totalPresent} present · {attendance.totalAbsent} absent · {totalDays} total</div>
          </div>
        )}
      </div>

      {/* Main Content Grid */}
      <div className="sd-main-grid">
        {/* Left: Course progress + Recent activity */}
        <div className="sd-main-left">
          {/* Course Progress Card */}
          {isFeatureEnabled('myCourse') && (
            <div className="sd-card">
              <div className="sd-card-header">
                <h3>Course progress</h3>
                <button className="sd-link" onClick={() => navigate('/my-learning')}>View all modules →</button>
              </div>
              <div className="sd-course-list">
                {data?.course && (
                  <div className="sd-course-item">
                    <div className={`sd-course-icon ${data.courseProgress.percentage === 100 ? 'sd-ci-done' : 'sd-ci-progress'}`}>
                      {data.courseProgress.percentage === 100 ? <i className="fa-solid fa-check"></i> : <i className="fa-solid fa-play"></i>}
                    </div>
                    <div className="sd-course-info">
                      <div className="sd-course-name">{data.course.title}</div>
                      <div className="sd-course-meta">{data.courseProgress.total} chapters · {data.courseProgress.completed} completed</div>
                      <div className="sd-course-bar">
                        <div className="sd-course-bar-fill" style={{ width: `${data.courseProgress.percentage}%` }} />
                      </div>
                      <span className="sd-course-pct">{data.courseProgress.percentage}%</span>
                    </div>
                    <div className="sd-course-status">
                      {data.courseProgress.percentage === 100 ? (
                        <span className="sd-status-done">Completed</span>
                      ) : (
                        <span className="sd-status-progress">In progress</span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Recent Activity */}
          <div className="sd-card">
            <div className="sd-card-header">
              <h3>Recent activity</h3>
              <button className="sd-link" onClick={() => navigate('/assignments')}>View full history</button>
            </div>
            <div className="sd-activity-list">
              {!data?.recentActivity.length ? (
                <div className="sd-empty">No recent activity</div>
              ) : (
                data.recentActivity.map((act, idx) => (
                  <div key={idx} className="sd-activity-item">
                    <div className={`sd-activity-dot ${act.status === 'graded' ? 'sd-dot-green' : act.type === 'quiz' ? 'sd-dot-orange' : 'sd-dot-teal'}`}>
                      {act.status === 'graded' ? <i className="fa-solid fa-check"></i> : act.type === 'quiz' ? <i className="fa-solid fa-circle"></i> : <i className="fa-solid fa-play"></i>}
                    </div>
                    <div className="sd-activity-content">
                      <div className="sd-activity-text">
                        {act.status === 'graded' ? 'Submitted' : act.type === 'quiz' ? 'Scored' : 'Watched'}{' '}
                        <strong>{act.title}</strong>
                        {act.score !== undefined && ` — ${act.type === 'assignment' ? 'assignment marked complete' : `${act.score}%`}`}
                      </div>
                      <div className="sd-activity-meta">
                        {formatTimestamp(act.timestamp)} · {new Date(act.timestamp).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
                      </div>
                      <span className={`sd-activity-tag ${act.type === 'assignment' ? 'sd-tag-teal' : act.type === 'quiz' ? 'sd-tag-orange' : 'sd-tag-blue'}`}>
                        {act.type === 'assignment' ? 'Assignment' : act.type === 'quiz' ? 'Quiz' : act.type === 'snippet' ? 'Code' : 'Video'}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right: Attendance + Deadlines */}
        <div className="sd-main-right">
          {/* Attendance Card */}
          {isFeatureEnabled('attendance') && (
            <div className="sd-card">
              <div className="sd-card-header">
                <h3>Attendance</h3>
                <button className="sd-link" onClick={() => navigate('/my-attendance')}>Details</button>
              </div>
              <div className="sd-att-ring-wrap">
                <svg className="sd-att-ring" viewBox="0 0 120 120">
                  <circle cx="60" cy="60" r="50" fill="none" stroke="#e5e7eb" strokeWidth="10" />
                  <circle
                    cx="60" cy="60" r="50" fill="none"
                    stroke={attColor}
                    strokeWidth="10"
                    strokeLinecap="round"
                    strokeDasharray={`${(attPct / 100) * 314.16} 314.16`}
                    transform="rotate(-90 60 60)"
                  />
                </svg>
                <div className="sd-att-ring-center">
                  <span className="sd-att-ring-val">{attPct}%</span>
                  <span className="sd-att-ring-sub">overall</span>
                </div>
              </div>
              <div className="sd-att-stats">
                <div className="sd-att-stat">
                  <span className="sd-att-stat-num" style={{ color: '#359aad' }}>{attendance.totalPresent}</span>
                  <span className="sd-att-stat-lbl">Present</span>
                </div>
                <div className="sd-att-stat">
                  <span className="sd-att-stat-num" style={{ color: '#ef4444' }}>{attendance.totalAbsent}</span>
                  <span className="sd-att-stat-lbl">Absent</span>
                </div>
                <div className="sd-att-stat">
                  <span className="sd-att-stat-num" style={{ color: '#051d64' }}>{totalDays}</span>
                  <span className="sd-att-stat-lbl">Total</span>
                </div>
              </div>
            </div>
          )}

          {/* Deadlines */}
          <div className="sd-card">
            <div className="sd-card-header">
              <h3>Deadlines</h3>
              <button className="sd-link" onClick={() => navigate('/assignments')}>All tasks</button>
            </div>
            <div className="sd-deadline-list">
              {allDeadlines.length === 0 ? (
                <div className="sd-empty">No upcoming deadlines</div>
              ) : (
                allDeadlines.map((d, idx) => (
                  <div
                    key={idx}
                    className="sd-deadline-item"
                    onClick={() => navigate(d.kind === 'assignment' ? `/assignments/${d._id}/workspace` : d.kind === 'quiz' ? `/quizzes/${d._id}` : `/code-snippets/${d._id}`)}
                  >
                    <div className="sd-deadline-bar" style={{ backgroundColor: getDeadlineColor(d.daysLeft) }} />
                    <div className="sd-deadline-info">
                      <span className="sd-deadline-title">{d.title}</span>
                      <span className="sd-deadline-meta">Due {new Date(d.due).toLocaleDateString('en-US', { day: 'numeric', month: 'short' })}</span>
                    </div>
                    <span className="sd-deadline-days" style={{ color: getDeadlineColor(d.daysLeft) }}>
                      {d.daysLeft <= 0 ? 'Today' : d.daysLeft === 1 ? '1 day' : `${d.daysLeft} days`}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Upcoming Placement Drives */}
          {upcomingDrives.length > 0 && (
            <div className="sd-card">
              <div className="sd-card-header">
                <h3>Open Drives</h3>
                <button className="sd-link" onClick={() => navigate('/student/my-applications')}>View all →</button>
              </div>
              <div className="sd-deadline-list">
                {upcomingDrives.map(d => (
                  <div key={d._id} className="sd-deadline-item" style={{ cursor: 'default' }}>
                    <div className="sd-deadline-bar" style={{ backgroundColor: 'var(--bs-primary)' }} />
                    <div className="sd-deadline-info">
                      <span className="sd-deadline-title">{d.companyName}</span>
                      <span className="sd-deadline-meta">{d.role}{d.ctcMin ? ` · ₹${d.ctcMin}–${d.ctcMax || d.ctcMin} LPA` : ''}</span>
                    </div>
                    {d.applicationDeadline && (
                      <span className="sd-deadline-days" style={{ color: '#475569', fontSize: '0.78rem' }}>
                        Till {new Date(d.applicationDeadline).toLocaleDateString('en-US', { day: 'numeric', month: 'short' })}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Alumni Network Quick Widget */}
          {alumniStats && alumniStats.total > 0 && (
            <div className="sd-card">
              <div className="sd-card-header">
                <h3>Alumni Network</h3>
                <button className="sd-link" onClick={() => navigate('/student/alumni-directory')}>Browse →</button>
              </div>
              <div className="sd-att-stats" style={{ margin: '0.5rem 0 0.25rem' }}>
                <div className="sd-att-stat">
                  <span className="sd-att-stat-num" style={{ color: 'var(--bs-primary)' }}>{alumniStats.total}</span>
                  <span className="sd-att-stat-lbl">Alumni</span>
                </div>
                <div className="sd-att-stat">
                  <span className="sd-att-stat-num" style={{ color: '#22c55e' }}>{alumniStats.mentorsAvailable}</span>
                  <span className="sd-att-stat-lbl">Mentors</span>
                </div>
              </div>
              {alumniStats.topCompany && (
                <p style={{ fontSize: '0.82rem', color: '#64748b', margin: '0.5rem 0 0', textAlign: 'center' }}>
                  Top recruiter: <strong>{alumniStats.topCompany}</strong>
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;