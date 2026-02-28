import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import './TimeSpentCard.css';

const TimeSpentCard: React.FC = () => {
  const { user } = useAuth();
  const [sessionTime, setSessionTime] = useState<number>(0);
  const [totalTimeToday, setTotalTimeToday] = useState<number>(0);

  useEffect(() => {
    if (!user?._id) return;

    // Get today's date
    const today = new Date().toISOString().split('T')[0];
    const storageKey = `session_start_${user._id}_${today}`;
    const totalTimeKey = `total_time_${user._id}_${today}`;

    // Initialize session start time
    let sessionStartTime = localStorage.getItem(storageKey);
    if (!sessionStartTime) {
      sessionStartTime = Date.now().toString();
      localStorage.setItem(storageKey, sessionStartTime);
    }

    // Get total time from previous sessions today
    const storedTotalTime = localStorage.getItem(totalTimeKey);
    const totalTimeAtStart = storedTotalTime ? parseInt(storedTotalTime) : 0;

    // Update session time every second
    const interval = setInterval(() => {
      const startTime = parseInt(sessionStartTime!);
      const elapsed = Math.floor((Date.now() - startTime) / 1000); // in seconds
      const total = totalTimeAtStart + elapsed;

      setSessionTime(elapsed);
      setTotalTimeToday(total);

      // Save total time periodically (every 30 seconds)
      if (elapsed % 30 === 0) {
        localStorage.setItem(totalTimeKey, total.toString());
      }
    }, 1000);

    // Cleanup: save total time when component unmounts
    return () => {
      clearInterval(interval);
      const startTime = parseInt(sessionStartTime!);
      const finalElapsed = Math.floor((Date.now() - startTime) / 1000);
      const finalTotal = totalTimeAtStart + finalElapsed;
      localStorage.setItem(totalTimeKey, finalTotal.toString());
    };
  }, [user?._id]);

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
        <span className="card-icon">⏱️</span>
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
    </div>
  );
};

export default TimeSpentCard;
