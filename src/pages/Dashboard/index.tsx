import React, { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { enrollmentApi } from '../../api';
import { Card, Spinner } from '../../components/common';
import { Enrollment } from '../../types';
import './DashboardPage.css';

const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, completed: 0, inProgress: 0 });

  useEffect(() => {
    const fetchEnrollments = async () => {
      try {
        const response = await enrollmentApi.getMyEnrollments();
        const enrollmentData = response.data || [];
        setEnrollments(enrollmentData);

        // Calculate stats
        const total = enrollmentData.length;
        const completed = enrollmentData.filter((e: Enrollment) => e.status === 'completed').length;
        const inProgress = enrollmentData.filter((e: Enrollment) => e.status === 'enrolled').length;

        setStats({ total, completed, inProgress });
      } catch (error) {
        console.error('Failed to fetch enrollments:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchEnrollments();
  }, []);

  if (loading) return <Spinner fullScreen />;

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1>Welcome back, {user?.firstName}! 👋</h1>
        <p className="dashboard-subtitle">Role: {user?.role}</p>
      </div>

      <div className="stats-grid">
        <Card title="Total Courses">
          <div className="stat-value">{stats.total}</div>
        </Card>
        <Card title="Completed">
          <div className="stat-value completed">{stats.completed}</div>
        </Card>
        <Card title="In Progress">
          <div className="stat-value inprogress">{stats.inProgress}</div>
        </Card>
      </div>

      <Card title="Your Enrollments" className="enrollments-card">
        {enrollments.length === 0 ? (
          <p className="no-data">No enrollments yet. Start by exploring our courses!</p>
        ) : (
          <div className="enrollments-list">
            {enrollments.map((enrollment) => (
              <div key={enrollment._id} className="enrollment-item">
                <div className="enrollment-info">
                  <h4>Course ID: {enrollment.courseId}</h4>
                  <div className="enrollment-meta">
                    <span className={`status-badge status-${enrollment.status}`}>
                      {enrollment.status}
                    </span>
                    <span className="progress">{enrollment.progress}% Complete</span>
                  </div>
                </div>
                <div className="progress-bar">
                  <div 
                    className="progress-fill" 
                    style={{ width: `${enrollment.progress}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};

export default DashboardPage;