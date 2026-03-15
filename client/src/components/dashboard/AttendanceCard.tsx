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
  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'present':
        return { label: 'Present', color: '#10b981', bg: '#ecfdf5', icon: '✓' };
      case 'late':
        return { label: 'Late', color: '#f59e0b', bg: '#fffbeb', icon: '⏱' };
      case 'pending':
        return { label: 'Pending', color: '#8b5cf6', bg: '#f5f3ff', icon: '◷' };
      case 'absent':
        return { label: 'Absent', color: '#ef4444', bg: '#fef2f2', icon: '✗' };
      default:
        return { label: 'Unknown', color: '#64748b', bg: '#f8fafc', icon: '?' };
    }
  };

  const status = getStatusConfig(attendance.status);
  const totalDays = attendance.totalPresent + attendance.totalAbsent;
  const pct = attendance.attendancePercentage;
  const pctColor = pct >= 75 ? '#10b981' : pct >= 50 ? '#f59e0b' : '#ef4444';

  return (
    <div className="att-card">
      {/* Header */}
      <div className="att-header">
        <div className="att-header-left">
          <span className="att-icon">📋</span>
          <span className="att-title">Attendance</span>
        </div>
        <span className="att-date">
          {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
        </span>
      </div>

      {/* Today's Status */}
      <div className="att-status" style={{ backgroundColor: status.bg }}>
        <div className="att-status-dot" style={{ backgroundColor: status.color }} />
        <span className="att-status-label" style={{ color: status.color }}>{status.label}</span>
        <div className="att-times">
          <span className="att-time">
            <span className="att-time-icon">↓</span>
            {attendance.inTime || '--:--'}
          </span>
          <span className="att-time">
            <span className="att-time-icon">↑</span>
            {attendance.outTime || '--:--'}
          </span>
        </div>
      </div>

      {/* Circular Progress */}
      <div className="att-progress-section">
        <div className="att-ring-wrap">
          <svg className="att-ring" viewBox="0 0 80 80">
            <circle cx="40" cy="40" r="34" fill="none" stroke="#e5e7eb" strokeWidth="6" />
            <circle
              cx="40" cy="40" r="34" fill="none"
              stroke={pctColor}
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={`${(pct / 100) * 213.6} 213.6`}
              transform="rotate(-90 40 40)"
            />
          </svg>
          <div className="att-ring-text">
            <span className="att-ring-val" style={{ color: pctColor }}>{pct}%</span>
          </div>
        </div>
        <div className="att-ring-label">Overall</div>
      </div>

      {/* Stats Row */}
      <div className="att-stats">
        <div className="att-stat">
          <span className="att-stat-num" style={{ color: '#10b981' }}>{attendance.totalPresent}</span>
          <span className="att-stat-lbl">Present</span>
        </div>
        <div className="att-stat-divider" />
        <div className="att-stat">
          <span className="att-stat-num" style={{ color: '#ef4444' }}>{attendance.totalAbsent}</span>
          <span className="att-stat-lbl">Absent</span>
        </div>
        <div className="att-stat-divider" />
        <div className="att-stat">
          <span className="att-stat-num" style={{ color: '#64748b' }}>{totalDays}</span>
          <span className="att-stat-lbl">Total</span>
        </div>
      </div>
    </div>
  );
};

export default AttendanceCard;
