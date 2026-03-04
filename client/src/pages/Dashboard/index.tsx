import React, { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Spinner } from '../../components/common';
import { userApi, courseApi, attendanceApi } from '../../api';
import { contentAPI } from '../../api/contentAPI';
import WeekNavigator from '../../components/dashboard/WeekNavigator';
import DailyActivityPanel from '../../components/dashboard/DailyActivityPanel';
import ActivityLog from '../../components/dashboard/ActivityLog';
import AttendanceCard from '../../components/dashboard/AttendanceCard';
import TimeSpentCard from '../../components/profile/TimeSpentCard';
import './DashboardPage.css';

interface ActivityItem {
  id: string;
  type: 'note' | 'assignment' | 'announcement' | 'cheatsheet' | 'snippet';
  title: string;
  content: string;
  author: string;
  timestamp: string;
  icon: string;
}

interface LogEntry {
  id: string;
  action: string;
  message: string;
  timestamp: string;
  icon: string;
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
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    totalStudents: 0,
    activeCourses: 0,
    totalContent: 0,
  });
  const [attendance, setAttendance] = useState<AttendanceData>({
    status: 'pending',
    inTime: undefined,
    outTime: undefined,
    totalPresent: 8,
    totalAbsent: 2,
    attendancePercentage: 80,
  });

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

  // Fetch dashboard stats
  const fetchStats = async () => {
    try {
      const [usersRes, coursesRes, contentRes] = await Promise.all([
        userApi.getUsers().catch(() => ({ data: [] })),
        courseApi.getCourses().catch(() => ({ data: [] })),
        contentAPI.getAllContent(1, 1000).catch(() => ({ data: { content: [] } }))
      ]);

      const allUsers = usersRes.data || [];
      const students = allUsers.filter((u: any) => u.role === 'STUDENT');
      const totalStudents = students.length;

      const allCourses = coursesRes.data || [];
      const activeCourses = allCourses.filter((c: any) => c.isActive !== false).length;

      const contentData = contentRes.data?.content || [];
      const totalContent = contentData.length;

      setStats({
        totalStudents,
        activeCourses,
        totalContent,
      });
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      // Keep default values if fetch fails
    }
  };

  const fetchDashboardData = async () => {
    const mockActivities: ActivityItem[] = [
      {
        id: '1',
        type: 'note',
        title: 'Class Notes: React Hooks',
        content: 'Understanding useState, useEffect, and custom hooks for managing component state and side effects.',
        author: 'Prof. Smith',
        timestamp: '09:30 AM',
        icon: '📝',
      },
      {
        id: '2',
        type: 'announcement',
        title: 'Announcement: Midterm Exam Scheduled',
        content: 'The midterm exam will be held on March 15, 2026. It will cover chapters 1-5 and will be 2 hours long.',
        author: 'Admin',
        timestamp: '10:00 AM',
        icon: '📣',
      },
      {
        id: '3',
        type: 'assignment',
        title: 'Assignment: Build a Todo App',
        content: 'Create a todo application using React with add, edit, and delete functionality. Due by Friday 11:59 PM.',
        author: 'Prof. Johnson',
        timestamp: '11:00 AM',
        icon: '✏️',
      },
      {
        id: '4',
        type: 'cheatsheet',
        title: 'JavaScript Array Methods Cheatsheet',
        content: 'Quick reference for map, filter, reduce, sort, and other essential array methods with examples.',
        author: 'Prof. Sarah',
        timestamp: '02:30 PM',
        icon: '📋',
      },
      {
        id: '5',
        type: 'snippet',
        title: 'Code Snippet: API Call with Error Handling',
        content: 'async function fetchData() { try { const res = await fetch(url); } catch(e) { console.error(e); } }',
        author: 'Prof. Johnson',
        timestamp: '03:45 PM',
        icon: '🔧',
      },
    ];

    const mockLogs: LogEntry[] = [
      {
        id: '1',
        action: 'Logged In',
        message: 'Logged into the system',
        timestamp: '09:15 AM',
        icon: '🔓',
      },
      {
        id: '2',
        action: 'Opened Chapter',
        message: 'Opened Chapter 5: Advanced React Patterns',
        timestamp: '09:45 AM',
        icon: '📖',
      },
      {
        id: '3',
        action: 'Attempted Quiz',
        message: 'Completed JavaScript Basics Quiz (Score: 85/100)',
        timestamp: '10:30 AM',
        icon: '✅',
      },
      {
        id: '4',
        action: 'Submitted Assignment',
        message: 'Submitted "Build Calculator" assignment',
        timestamp: '11:20 AM',
        icon: '📤',
      },
      {
        id: '5',
        action: 'Downloaded Resource',
        message: 'Downloaded: React_Best_Practices.pdf',
        timestamp: '02:15 PM',
        icon: '⬇️',
      },
      {
        id: '6',
        action: 'Posted Comment',
        message: 'Added comment to discussion thread',
        timestamp: '03:00 PM',
        icon: '💬',
      },
    ];

    setActivities(mockActivities);
    setLogs(mockLogs);

    // Fetch real attendance data for students
    if (user?._id && user?.role === 'STUDENT') {
      try {
        // Get selected date for attendance check
        const dateStr = selectedDate.toISOString().split('T')[0];
        console.log('[Dashboard] Fetching attendance for:', { userId: user._id, batchId: user.batchId, date: dateStr });
        
        // Fetch summary (total present/absent/percentage) - batchId is optional
        const summaryRes = await attendanceApi.getStudentAttendanceSummary(user._id, user.batchId);
        const summary = summaryRes.data || summaryRes;
        console.log('[Dashboard] Attendance summary:', summary);
        
        // Fetch today's attendance record
        const todayRes = await attendanceApi.getStudentAttendance(user._id, dateStr, dateStr);
        const todayRecords = todayRes.data || todayRes || [];
        console.log('[Dashboard] Today attendance records:', todayRecords);
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
        console.error('[Dashboard] Error fetching attendance:', error);
        // Set default values on error
        setAttendance({
          status: 'pending',
          inTime: undefined,
          outTime: undefined,
          totalPresent: 0,
          totalAbsent: 0,
          attendancePercentage: 0,
        });
      }
    }

    // Fetch statistics
    fetchStats();
    setLoading(false);
  };

  // Fetch dashboard data on mount or when selectedDate changes
  useEffect(() => {
    fetchDashboardData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate]); // Only re-run when selectedDate changes

  const handlePrevWeek = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() - 7);
    setSelectedDate(newDate);
  };

  const handleNextWeek = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + 7);
    setSelectedDate(newDate);
  };

  // Get minimum date for student calendar (batch join date or account creation date)
  const getMinDate = (): Date | undefined => {
    if (user?.role !== 'STUDENT') return undefined;
    // Use batchJoinedDate if available, otherwise fall back to createdAt
    const minDateStr = (user as any).batchJoinedDate || user?.createdAt;
    if (minDateStr) {
      return new Date(minDateStr);
    }
    return undefined;
  };

  if (loading) return <Spinner fullScreen />;

  // Redirect unauthenticated users
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

  // Route to appropriate dashboard based on role
  const isAdmin = user.role === 'TENANT_ADMIN' || user.role === 'SUPER_ADMIN';

  if (isAdmin) {
    // Admin Dashboard
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
                <a href="/admin/content" className="action-link">
                  📄 Manage Content
                </a>
                <a href="/users" className="action-link">
                  👥 Manage Users
                </a>
                <a href="/courses" className="action-link">
                  📚 Manage Courses
                </a>
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
        </div>
      </div>
    );
  }

  // Student Dashboard - Original Full Layout
  return (
    <div className="student-dashboard">
      <div className="dashboard-title">
        <h1>{getGreeting()}, {user?.firstName}</h1>
        <p>{getMotivation()}</p>
      </div>

      {/* Week Navigator */}
      <WeekNavigator
        selectedDate={selectedDate}
        onDateSelect={setSelectedDate}
        onPrevWeek={handlePrevWeek}
        onNextWeek={handleNextWeek}
        minDate={getMinDate()}
      />

      {/* Main Layout - Bootstrap Grid Style */}
      <div className="dashboard-grid">
        {/* Left Column (Main Content) */}
        <div className="dashboard-main">
          {/* Daily Activity Panel */}
          <DailyActivityPanel date={selectedDate} activities={activities} />

          {/* Activity Log */}
          <ActivityLog logs={logs} />
        </div>

        {/* Right Column (Sidebar) */}
        <div className="dashboard-sidebar">
          {/* Time Spent Card */}
          <TimeSpentCard />

          {/* Attendance Card */}
          <AttendanceCard date={selectedDate} attendance={attendance} />

          {/* Quick Stats Card */}
          <div className="quick-stats-card">
            <h3>This Week's Stats</h3>
            <div className="stats-grid-vertical">
              <div className="stat-item">
                <span className="stat-icon">📚</span>
                <div className="stat-info">
                  <span className="stat-label">Classes</span>
                  <span className="stat-value">8</span>
                </div>
              </div>
              <div className="stat-item">
                <span className="stat-icon">✏️</span>
                <div className="stat-info">
                  <span className="stat-label">Assignments</span>
                  <span className="stat-value">3</span>
                </div>
              </div>
              <div className="stat-item">
                <span className="stat-icon">📝</span>
                <div className="stat-info">
                  <span className="stat-label">Quizzes</span>
                  <span className="stat-value">2</span>
                </div>
              </div>
              <div className="stat-item">
                <span className="stat-icon">🎯</span>
                <div className="stat-info">
                  <span className="stat-label">Progress</span>
                  <span className="stat-value">75%</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;