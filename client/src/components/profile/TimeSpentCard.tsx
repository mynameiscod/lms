import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import './TimeSpentCard.css';

const TimeSpentCard: React.FC = () => {
  const { user } = useAuth();
  const [sessionTime, setSessionTime] = useState<number>(0);
  const [totalTimeToday, setTotalTimeToday] = useState<number>(0);
  const [isActive, setIsActive] = useState<boolean>(true);
  const lastActivityRef = useRef<number>(Date.now());
  const activeSessionStartRef = useRef<number>(Date.now());
  const IDLE_TIMEOUT = 2 * 60 * 1000; // 2 minutes of inactivity

  // Track user activity
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    const handleActivity = () => {
      lastActivityRef.current = Date.now();
      if (!isActive) {
        setIsActive(true);
        activeSessionStartRef.current = Date.now();
      }
    };

    // Listen for user interactions
    window.addEventListener('mousedown', handleActivity);
    window.addEventListener('keydown', handleActivity);
    window.addEventListener('click', handleActivity);
    window.addEventListener('scroll', handleActivity);
    window.addEventListener('touchstart', handleActivity);

    return () => {
      window.removeEventListener('mousedown', handleActivity);
      window.removeEventListener('keydown', handleActivity);
      window.removeEventListener('click', handleActivity);
      window.removeEventListener('scroll', handleActivity);
      window.removeEventListener('touchstart', handleActivity);
    };
  }, [isActive]);

  // Main timer and idle detection
  useEffect(() => {
    if (!user?._id) return;

    // Get today's date
    const today = new Date().toISOString().split('T')[0];
    const totalTimeKey = `total_active_time_${user._id}_${today}`;

    // Get total active time from previous sessions today
    const storedTotalTime = localStorage.getItem(totalTimeKey);
    const totalTimeAtStart = storedTotalTime ? parseInt(storedTotalTime) : 0;

    // Update timer every second
    const interval = setInterval(() => {
      const timeSinceLastActivity = Date.now() - lastActivityRef.current;
      const wasActive = isActive;

      // Check if user is idle
      if (timeSinceLastActivity > IDLE_TIMEOUT) {
        if (wasActive) {
          setIsActive(false);
        }
      }

      // Calculate current session active time
      if (isActive) {
        const activeElapsed = Math.floor((Date.now() - activeSessionStartRef.current) / 1000);
        const total = totalTimeAtStart + activeElapsed;

        setSessionTime(activeElapsed);
        setTotalTimeToday(total);

        // Save total time periodically (every 30 seconds)
        if (activeElapsed % 30 === 0) {
          localStorage.setItem(totalTimeKey, total.toString());
        }
      }
    }, 1000);

    // Cleanup: save total time when component unmounts
    return () => {
      clearInterval(interval);
      const activeElapsed = Math.floor((Date.now() - activeSessionStartRef.current) / 1000);
      if (activeElapsed > 0 && isActive) {
        const finalTotal = totalTimeAtStart + activeElapsed;
        localStorage.setItem(totalTimeKey, finalTotal.toString());
      }
    };
    }, [user?._id, isActive, IDLE_TIMEOUT]);
  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    } else {
      return `${secs}s`;
    }
  };

  return (
    <div className="time-spent-card">
      <div className="card-header">
        <h3>Time Spent Today</h3>
        <span className={`card-icon ${isActive ? 'active' : 'idle'}`}>
          {isActive ? '🟢' : '⏸️'}
        </span>
      </div>

      <div className="activity-status">
        <span className={`status-badge ${isActive ? 'active' : 'idle'}`}>
          {isActive ? 'Active' : 'Idle'}
        </span>
      </div>

      <div className="time-stats">
        <div className="time-stat">
          <div className="stat-label">Current Session</div>
          <div className="stat-value session">{formatTime(sessionTime)}</div>
        </div>

        <div className="divider"></div>

        <div className="time-stat">
          <div className="stat-label">Total Today</div>
          <div className="stat-value total">{formatTime(totalTimeToday)}</div>
        </div>
      </div>

      <div className="time-progress">
        <div className="progress-label">Daily Activity</div>
        <div className="progress-bar">
          <div
            className="progress-fill"
            style={{ width: `${Math.min((totalTimeToday / 28800) * 100, 100)}%` }}
          ></div>
        </div>
        <div className="progress-info">
          {Math.min(totalTimeToday / 3600, 8).toFixed(1)} / 8 hour goal
        </div>
      </div>

      <div className="status-note">
        <small>{isActive ? '✓ Actively engaged' : '⚠ No activity for 2+ minutes'}</small>
      </div>
    </div>
  );
};

export default TimeSpentCard;
