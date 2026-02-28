import React, { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Spinner } from '../../components/common';
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

const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
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

  // Generate mock data for activities and logs
  useEffect(() => {
    const mockActivities: ActivityItem[] = [
      {
        id: '1',
        type: 'announcement',
        title: 'Important: Test Reschedule',
        content: 'The java programming test has been rescheduled to next Friday. Please prepare accordingly.',
        author: 'Prof. Johnson',
        timestamp: '09:30 AM',
        icon: '📢',
      },
      {
        id: '2',
        type: 'note',
        title: 'React Hooks - useEffect Deep Dive',
        content: 'Today we covered the useEffect hook lifecycle, dependency arrays, and cleanup functions. Remember to always handle side effects properly.',
        author: 'Prof. Sarah',
        timestamp: '10:15 AM',
        icon: '📝',
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

    // Set attendance based on selected date
    const today = new Date();
    if (selectedDate.toDateString() === today.toDateString()) {
      setAttendance({
        status: 'present',
        inTime: '09:15 AM',
        outTime: undefined,
        totalPresent: 8,
        totalAbsent: 2,
        attendancePercentage: 80,
      });
    } else {
      setAttendance({
        status: 'absent',
        inTime: undefined,
        outTime: undefined,
        totalPresent: 8,
        totalAbsent: 2,
        attendancePercentage: 80,
      });
    }

    setLoading(false);
  }, [selectedDate]);

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

  if (loading) return <Spinner fullScreen />;

  // Only show student dashboard if user is a student
  if (user?.role !== 'STUDENT') {
    return (
      <div className="dashboard-container">
        <div className="access-denied">
          <h1>Access Denied</h1>
          <p>This dashboard is only available for students.</p>
        </div>
      </div>
    );
  }

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