import React from 'react';
import './AttendanceCard.css';

interface AttendanceData {
  status: 'present' | 'late' | 'pending' | 'absent';
  inTime?: string;
  outTime?: string;
  totalPresent: number;
  totalAbsent: number;
  attendancePercentage: number;
}

interface AttendanceCardProps {
  date: Date;
  attendance: AttendanceData;
}

const AttendanceCard: React.FC<AttendanceCardProps> = ({ date, attendance }) => {
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'present':
        return { label: 'Present', color: '#10b981', icon: '✓' };
      case 'late':
        return { label: 'Late', color: '#f59e0b', icon: '⏱' };
      case 'pending':
        return { label: 'Pending', color: '#8b5cf6', icon: '—' };
      case 'absent':
        return { label: 'Absent', color: '#ef4444', icon: '✗' };
      default:
        return { label: 'Unknown', color: '#64748b', icon: '?' };
    }
  };

  const badge = getStatusBadge(attendance.status);

  return (
    <div className="attendance-card">
      <div className="card-header">
        <h3>Attendance</h3>
        <div className="card-date">
          {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
        </div>
      </div>

      {/* Status Badge */}
      <div className="status-section" style={{ borderLeftColor: badge.color }}>
        <div className="status-badge" style={{ backgroundColor: badge.color }}>
          <span className="badge-icon">{badge.icon}</span>
          <span className="badge-label">{badge.label}</span>
        </div>
      </div>

      {/* Time Info */}
      <div className="time-section">
        <div className="time-item">
          <span className="time-label">In Time</span>
          <span className="time-value">{attendance.inTime || '—'}</span>
        </div>
        <div className="time-divider"></div>
        <div className="time-item">
          <span className="time-label">Out Time</span>
          <span className="time-value">{attendance.outTime || '—'}</span>
        </div>
      </div>

      {/* Stats */}
      <div className="stats-section">
        <div className="stat-row">
          <span className="stat-label">Total Present</span>
          <span className="stat-value present">{attendance.totalPresent}</span>
        </div>
        <div className="stat-row">
          <span className="stat-label">Total Absent</span>
          <span className="stat-value absent">{attendance.totalAbsent}</span>
        </div>
      </div>

      {/* Attendance Percentage */}
      <div className="percentage-section">
        <div className="percentage-label">Attendance %</div>
        <div className="percentage-bar">
          <div 
            className="percentage-fill" 
            style={{ width: `${attendance.attendancePercentage}%` }}
          ></div>
        </div>
        <div className="percentage-value">{attendance.attendancePercentage}%</div>
      </div>
    </div>
  );
};

export default AttendanceCard;
