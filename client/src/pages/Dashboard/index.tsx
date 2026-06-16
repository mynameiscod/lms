import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Spinner } from '../../components/common';
import { attendanceApi, dashboardApi, leadApi, collegeSnapshotApi, placementDriveApi, alumniApi } from '../../api';
import { enrollmentPlanApi } from '../../api/enrollmentPlanApi';
import AdminOverview from './AdminOverview';
import StudentDashboard from './StudentDashboard';
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
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [selectedDate] = useState(new Date());
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [, setStats] = useState<DashboardStats>({
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

  // Student-specific extras (fetched for analytics; not shown on the new dashboard)
  const [, setUpcomingDrives] = useState<UpcomingDrive[]>([]);
  const [, setAlumniStats] = useState<AlumniStats | null>(null);
  const [todayPlan, setTodayPlan] = useState<any>(null);

  // Lead follow-up notifications for staff/admin users
  const [, setLeadPerf] = useState<{ todayFollowUps: number; overdueFollowUps: number; totalAssigned: number } | null>(null);
  const [, setCollegeSnapshot] = useState<CollegeSnapshot | null>(null);
  const hasLeadPermission = user?.permissions?.some((p: string) => ['view_leads', 'manage_leads', 'create_leads'].includes(p)) ?? false;

  // Determine if user should see admin dashboard
  // Any non-STUDENT role (TENANT_ADMIN, SUPER_ADMIN, INSTRUCTOR, STAFF, ATTENDANCE_ADMIN, etc.)
  // should see admin dashboard. Also STUDENT with admin permissions should see admin dashboard.
  const isAdminUser = user ? (
    user.role !== 'STUDENT' ||
    (user.permissions && user.permissions.length > 0 && 
      ['manage_tenant_users', 'view_analytics', 'view_reports', 'create_courses', 'edit_courses', 'manage_tenant', 'mark_attendance', 'create_quiz', 'manage_assignments', 'manage_interviews'].some(p => user.permissions!.includes(p)))
  ) : false;

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

  // Today's plan from the student's active curriculum enrollment
  const fetchTodayPlan = async () => {
    try {
      const enrollments = await enrollmentPlanApi.getMyEnrollments();
      const active = (enrollments || []).find((e: any) => e.status === 'active') || (enrollments || [])[0];
      if (!active) return;
      const day = active.currentDay || (active as any).todayPlanDay || 1;
      const plan = await enrollmentPlanApi.getDayPlan(active._id, day);
      setTodayPlan({ ...plan, enrollmentId: active._id });
    } catch {
      // optional widget
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
        await Promise.all([fetchStudentDashboard(), fetchAttendance(), fetchUpcomingDrives(), fetchAlumniStats(), fetchTodayPlan()]);
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

  // Student Dashboard — data computed here, rendered by <StudentDashboard/>
  const data = dashboardData;
  const totalPending = (data?.stats.pendingAssignments || 0) + (data?.stats.pendingQuizzes || 0) + (data?.stats.pendingSnippets || 0);

  // Quiz average from recent activity
  const quizScores = data?.recentActivity.filter(a => a.type === 'quiz' && a.score !== undefined).map(a => a.score!) || [];
  const quizAvg = quizScores.length > 0 ? Math.round(quizScores.reduce((a, b) => a + b, 0) / quizScores.length) : 0;

  // Combined sorted deadline list
  const allDeadlines = [
    ...(data?.upcomingDeadlines.assignments.map(a => ({ ...a, kind: 'assignment' as const, due: a.dueDate, daysLeft: a.daysUntilDue })) || []),
    ...(data?.upcomingDeadlines.quizzes.filter(q => q.endDate).map(q => ({ ...q, kind: 'quiz' as const, due: q.endDate!, daysLeft: q.daysUntilEnd! })) || []),
    ...(data?.upcomingDeadlines.snippets?.filter(s => s.dueDate).map(s => ({ ...s, kind: 'snippet' as const, due: s.dueDate!, daysLeft: s.daysUntilDue! })) || []),
  ].sort((a, b) => a.daysLeft - b.daysLeft).slice(0, 5);

  return (
    <StudentDashboard
      firstName={user?.firstName || 'there'}
      data={data}
      attendance={attendance}
      todayPlan={todayPlan}
      allDeadlines={allDeadlines}
      quizAvg={quizAvg}
      totalPending={totalPending}
      navigate={navigate}
    />
  );
};

export default DashboardPage;
