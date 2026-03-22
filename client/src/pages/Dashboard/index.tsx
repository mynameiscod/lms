import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useStudentFeatures } from '../../contexts/StudentFeaturesContext';
import { Spinner } from '../../components/common';
import { attendanceApi, dashboardApi, leadApi } from '../../api';
import AttendanceCard from '../../components/dashboard/AttendanceCard';
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

  // Lead follow-up notifications for staff/admin users
  const [leadPerf, setLeadPerf] = useState<{ todayFollowUps: number; overdueFollowUps: number; totalAssigned: number } | null>(null);
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
        await Promise.all([fetchStudentDashboard(), fetchAttendance()]);
      } else {
        await Promise.all([
          fetchAdminStats(),
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

  if (isAdmin) {
    return (
      <div className="dashboard-container">
        <div className="admin-dashboard">
          <div className="dashboard-header">
            <h1>Admin Dashboard</h1>
            <p>Welcome back, <strong>{user.firstName}!</strong></p>
          </div>

          <div className="dashboard-grid">
            <div className="dashboard-card">
              <h2>📊 Overview</h2>
              <div className="card-content">
                <div className="stat-item">
                  <span className="stat-label">Total Students</span>
                  <span className="stat-value">{stats.totalStudents}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Active Courses</span>
                  <span className="stat-value">{stats.activeCourses}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Total Content</span>
                  <span className="stat-value">{stats.totalContent}</span>
                </div>
              </div>
            </div>

            <div className="dashboard-card">
              <h2>📝 Recent Activity</h2>
              <div className="card-content">
                <p style={{ color: '#999', textAlign: 'center', padding: '20px' }}>
                  No recent activity yet
                </p>
              </div>
            </div>

            <div className="dashboard-card">
              <h2>⚙️ Quick Actions</h2>
              <div className="card-content">
                <a href="/admin/content" className="action-link">📄 Manage Content</a>
                <a href="/users" className="action-link">👥 Manage Users</a>
                <a href="/courses" className="action-link">📚 Manage Courses</a>
                {hasLeadPermission && <a href="/leads" className="action-link">🎯 Manage Leads</a>}
              </div>
            </div>

            <div className="dashboard-card">
              <h2>📈 Statistics</h2>
              <div className="card-content">
                <p style={{ color: '#999', textAlign: 'center', padding: '20px' }}>
                  Analytics coming soon
                </p>
              </div>
            </div>
          </div>

          {/* Follow-up Reminders Widget — only for users with lead access */}
          {hasLeadPermission && leadPerf && (
            <div className="followup-reminder-section">
              <div className="followup-header">
                <h2>🔔 Follow-up Reminders</h2>
                <button className="btn-link-sm" onClick={() => navigate('/leads')}>View All Leads →</button>
              </div>
              <div className="followup-cards">
                <div className="followup-card followup-assigned" onClick={() => navigate('/leads')}>
                  <div className="followup-card-icon">👥</div>
                  <div className="followup-card-info">
                    <span className="followup-card-value">{leadPerf.totalAssigned}</span>
                    <span className="followup-card-label">Total Assigned</span>
                  </div>
                </div>
                <div
                  className={`followup-card ${leadPerf.todayFollowUps > 0 ? 'followup-today' : 'followup-done'}`}
                  onClick={() => navigate('/leads')}
                >
                  <div className="followup-card-icon">{leadPerf.todayFollowUps > 0 ? '📅' : '✅'}</div>
                  <div className="followup-card-info">
                    <span className="followup-card-value">{leadPerf.todayFollowUps}</span>
                    <span className="followup-card-label">Today's Follow-ups</span>
                  </div>
                  {leadPerf.todayFollowUps > 0 && <span className="followup-badge warn">{leadPerf.todayFollowUps} due</span>}
                </div>
                <div
                  className={`followup-card ${leadPerf.overdueFollowUps > 0 ? 'followup-overdue' : 'followup-done'}`}
                  onClick={() => navigate('/leads')}
                >
                  <div className="followup-card-icon">{leadPerf.overdueFollowUps > 0 ? '⚠️' : '✅'}</div>
                  <div className="followup-card-info">
                    <span className="followup-card-value">{leadPerf.overdueFollowUps}</span>
                    <span className="followup-card-label">Overdue Follow-ups</span>
                  </div>
                  {leadPerf.overdueFollowUps > 0 && <span className="followup-badge danger">Needs attention</span>}
                </div>
                <div className="followup-card followup-action" onClick={() => navigate('/my-performance')}>
                  <div className="followup-card-icon">📊</div>
                  <div className="followup-card-info">
                    <span className="followup-card-value" style={{ fontSize: '1rem', fontWeight: 700 }}>Track</span>
                    <span className="followup-card-label">My Performance</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Student Dashboard - Redesigned Option A
  const data = dashboardData;

  return (
    <div className="student-dashboard-v2">
      {/* Header with Greeting */}
      <div className="dashboard-header-v2">
        <div className="greeting-section">
          <h1>{getGreeting()}, {user?.firstName}!</h1>
          <p className="motivation">{getMotivation()}</p>
        </div>
      </div>

      {/* Quick Stats Row */}
      <div className="quick-stats-row">
        {isFeatureEnabled('myCourse') && (
        <div className="stat-card" onClick={() => navigate('/my-course')}>
          <div className="stat-icon-circle blue">📚</div>
          <div className="stat-content">
            <span className="stat-number">{data?.courseProgress.percentage || 0}%</span>
            <span className="stat-label">Course Progress</span>
          </div>
        </div>
        )}
        {isFeatureEnabled('assignments') && (
        <>
        <div className="stat-card" onClick={() => navigate('/assignments')}>
          <div className="stat-icon-circle green">✅</div>
          <div className="stat-content">
            <span className="stat-number">{data?.stats.completedAssignments || 0}</span>
            <span className="stat-label">Assignments Done</span>
          </div>
        </div>
        <div className="stat-card" onClick={() => navigate('/assignments')}>
          <div className="stat-icon-circle orange">⏰</div>
          <div className="stat-content">
            <span className="stat-number">{data?.stats.pendingAssignments || 0}</span>
            <span className="stat-label">Assignments Pending</span>
          </div>
        </div>
        </>
        )}
        {isFeatureEnabled('attendance') && (
        <div className="stat-card">
          <div className="stat-icon-circle purple">📊</div>
          <div className="stat-content">
            <span className="stat-number">{attendance.attendancePercentage}%</span>
            <span className="stat-label">Attendance</span>
          </div>
        </div>
        )}
      </div>

      {/* Main Grid */}
      <div className="dashboard-main-grid">
        {/* Left Column */}
        <div className="dashboard-left">
          {/* Course Progress Card */}
          {isFeatureEnabled('myCourse') && data?.course && (
            <div className="dashboard-card-v2">
              <div className="card-header-v2">
                <h3>📈 My Progress</h3>
                <button className="btn-link" onClick={() => navigate('/my-course')}>View Course</button>
              </div>
              <div className="course-progress-section">
                <div className="course-info">
                  <h4>{data.course.title}</h4>
                  <p className="course-desc">{data.course.description}</p>
                </div>
                <div className="progress-bar-container">
                  <div className="progress-bar-v2">
                    <div 
                      className="progress-fill-v2" 
                      style={{ width: `${data.courseProgress.percentage}%` }}
                    />
                  </div>
                  <div className="progress-text">
                    <span>{data.courseProgress.completed} / {data.courseProgress.total} chapters</span>
                    <span className="progress-percentage">{data.courseProgress.percentage}%</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Upcoming Deadlines */}
          <div className="dashboard-card-v2">
            <div className="card-header-v2">
              <h3>📅 Upcoming Deadlines</h3>
            </div>
            <div className="deadlines-section">
              {(!data?.upcomingDeadlines.assignments.length && !data?.upcomingDeadlines.quizzes.length) ? (
                <div className="empty-state">
                  <span className="empty-icon">🎉</span>
                  <p>No pending deadlines!</p>
                </div>
              ) : (
                <div className="deadline-list">
                  {data?.upcomingDeadlines.assignments.map((a) => (
                    <div 
                      key={a._id} 
                      className="deadline-item" 
                      onClick={() => navigate(`/assignments/${a._id}/workspace`)}
                    >
                      <div className="deadline-icon assignment">✏️</div>
                      <div className="deadline-info">
                        <span className="deadline-title">{a.title}</span>
                        <span className="deadline-meta">{a.type} • {a.totalPoints} pts</span>
                      </div>
                      <div className={`deadline-due ${a.daysUntilDue <= 2 ? 'urgent' : ''}`}>
                        {formatDate(a.dueDate)}
                      </div>
                    </div>
                  ))}
                  {data?.upcomingDeadlines.quizzes.map((q) => (
                    <div 
                      key={q._id} 
                      className="deadline-item"
                      onClick={() => navigate(`/quizzes/${q._id}`)}
                    >
                      <div className="deadline-icon quiz">📝</div>
                      <div className="deadline-info">
                        <span className="deadline-title">{q.title}</span>
                        <span className="deadline-meta">{q.totalQuestions} questions • {q.timeLimit} min</span>
                      </div>
                      {q.daysUntilEnd && (
                        <div className={`deadline-due ${q.daysUntilEnd <= 2 ? 'urgent' : ''}`}>
                          {formatDate(q.endDate!)}
                        </div>
                      )}
                    </div>
                  ))}
                  {data?.upcomingDeadlines.snippets?.map((s) => (
                    <div 
                      key={s._id} 
                      className="deadline-item"
                      onClick={() => navigate(`/code-snippets/${s._id}`)}
                    >
                      <div className="deadline-icon quiz">💻</div>
                      <div className="deadline-info">
                        <span className="deadline-title">{s.title}</span>
                        <span className="deadline-meta">{s.language} • {s.totalMarks} marks</span>
                      </div>
                      {s.dueDate && s.daysUntilDue !== null && (
                        <div className={`deadline-due ${s.daysUntilDue <= 2 ? 'urgent' : ''}`}>
                          {formatDate(s.dueDate)}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Recent Activity */}
          <div className="dashboard-card-v2">
            <div className="card-header-v2">
              <h3>📝 Recent Activity</h3>
            </div>
            <div className="activity-section">
              {!data?.recentActivity.length ? (
                <div className="empty-state">
                  <span className="empty-icon">📭</span>
                  <p>No recent activity</p>
                </div>
              ) : (
                <div className="activity-list">
                  {data.recentActivity.map((activity, idx) => (
                    <div key={idx} className="activity-item">
                      <div className="activity-icon">{activity.icon}</div>
                      <div className="activity-info">
                        <span className="activity-title">{activity.title}</span>
                        <span className="activity-meta">
                          {activity.type === 'assignment' ? 'Assignment' : activity.type === 'snippet' ? 'Code Snippet' : 'Quiz'}
                          {activity.score !== undefined && ` • Score: ${activity.score}`}
                        </span>
                      </div>
                      <div className="activity-time">{formatTimestamp(activity.timestamp)}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="dashboard-right">
          {/* Attendance Card */}
          {isFeatureEnabled('attendance') && (
            <AttendanceCard date={selectedDate} attendance={attendance} />
          )}
        </div>
      </div>

      {/* Bottom Row - Quick Actions & Summary */}
      <div className="dashboard-bottom-row">
        {/* Quick Actions */}
        <div className="dashboard-card-v2">
          <div className="card-header-v2">
            <h3>⚡ Quick Actions</h3>
          </div>
          <div className="quick-actions">
            {isFeatureEnabled('myCourse') && (
            <button className="quick-action-btn" onClick={() => navigate('/my-course')}>
              <span className="action-icon">📚</span>
              <span>My Course</span>
            </button>
            )}
            {isFeatureEnabled('assignments') && (
            <button className="quick-action-btn" onClick={() => navigate('/assignments')}>
              <span className="action-icon">✏️</span>
              <span>Assignments</span>
            </button>
            )}
            {isFeatureEnabled('quizzes') && (
            <button className="quick-action-btn" onClick={() => navigate('/quizzes')}>
              <span className="action-icon">📝</span>
              <span>Quizzes</span>
            </button>
            )}
            {isFeatureEnabled('codingSnippets') && (
            <button className="quick-action-btn" onClick={() => navigate('/code-snippets')}>
              <span className="action-icon">💻</span>
              <span>Code Snippets</span>
            </button>
            )}
            {isFeatureEnabled('attendance') && (
            <button className="quick-action-btn" onClick={() => navigate('/my-attendance')}>
              <span className="action-icon">☑</span>
              <span>Attendance</span>
            </button>
            )}
          </div>
        </div>

        {/* Summary */}
        <div className="dashboard-card-v2">
          <div className="card-header-v2">
            <h3>📊 Summary</h3>
          </div>
          <div className="summary-stats horizontal">
            {isFeatureEnabled('assignments') && (
            <div className="summary-item">
              <div className="summary-icon-box s-green">✏️</div>
              <div className="summary-info">
                <span className="summary-label">Assignments</span>
                <span className="summary-value">{data?.stats.completedAssignments || 0}<span className="summary-total"> / {data?.stats.totalAssignments || 0}</span></span>
                <div className="summary-bar"><div className="summary-bar-fill s-green" style={{ width: `${data?.stats.totalAssignments ? Math.round(((data.stats.completedAssignments || 0) / data.stats.totalAssignments) * 100) : 0}%` }} /></div>
              </div>
            </div>
            )}
            {isFeatureEnabled('quizzes') && (
            <div className="summary-item">
              <div className="summary-icon-box s-blue">📝</div>
              <div className="summary-info">
                <span className="summary-label">Quizzes</span>
                <span className="summary-value">{data?.stats.completedQuizzes || 0}<span className="summary-total"> / {data?.stats.totalQuizzes || 0}</span></span>
                <div className="summary-bar"><div className="summary-bar-fill s-blue" style={{ width: `${data?.stats.totalQuizzes ? Math.round(((data.stats.completedQuizzes || 0) / data.stats.totalQuizzes) * 100) : 0}%` }} /></div>
              </div>
            </div>
            )}
            {isFeatureEnabled('myCourse') && (
            <div className="summary-item">
              <div className="summary-icon-box s-purple">📖</div>
              <div className="summary-info">
                <span className="summary-label">Chapters</span>
                <span className="summary-value">{data?.courseProgress.completed || 0}<span className="summary-total"> / {data?.courseProgress.total || 0}</span></span>
                <div className="summary-bar"><div className="summary-bar-fill s-purple" style={{ width: `${data?.courseProgress.total ? Math.round(((data.courseProgress.completed || 0) / data.courseProgress.total) * 100) : 0}%` }} /></div>
              </div>
            </div>
            )}
            {isFeatureEnabled('codingSnippets') && (
            <div className="summary-item">
              <div className="summary-icon-box s-orange">💻</div>
              <div className="summary-info">
                <span className="summary-label">Code Snippets</span>
                <span className="summary-value">{data?.stats.completedSnippets || 0}<span className="summary-total"> / {data?.stats.totalSnippets || 0}</span></span>
                <div className="summary-bar"><div className="summary-bar-fill s-orange" style={{ width: `${data?.stats.totalSnippets ? Math.round(((data.stats.completedSnippets || 0) / data.stats.totalSnippets) * 100) : 0}%` }} /></div>
              </div>
            </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;