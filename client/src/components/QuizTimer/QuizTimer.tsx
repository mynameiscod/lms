import React, { useEffect, useState } from 'react';
import './QuizTimer.css';

interface QuizTimerProps {
  attemptId: string;
  totalTime: number; // in minutes
  onTimeExpired: () => void;
  onWarning?: (level: number) => void;
}

const QuizTimer: React.FC<QuizTimerProps> = ({
  attemptId,
  totalTime,
  onTimeExpired,
  onWarning
}) => {
  const [timeRemaining, setTimeRemaining] = useState<number>(totalTime * 60); // in seconds
  const [warningLevel, setWarningLevel] = useState<number>(0); // 0 = OK, 1 = Warning, 2 = Urgent
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    const timerInterval = setInterval(() => {
      setTimeRemaining((prev) => {
        const newTime = Math.max(0, prev - 1);

        // Determine warning level
        let newWarning = 0;
        if (newTime === 0) {
          clearInterval(timerInterval);
          setIsExpired(true);
          onTimeExpired();
          newWarning = 2;
        } else if (newTime <= 60) {
          newWarning = 2; // Urgent - less than 1 minute
        } else if (newTime <= 300) {
          newWarning = 1; // Warning - less than 5 minutes
        }

        setWarningLevel(newWarning);
        if (onWarning) {
          onWarning(newWarning);
        }

        return newTime;
      });
    }, 1000);

    return () => clearInterval(timerInterval);
  }, [onTimeExpired, onWarning]);

  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(
        2,
        '0'
      )}`;
    }

    return `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const getTimerClass = (): string => {
    if (isExpired) return 'timer-expired';
    if (warningLevel === 2) return 'timer-urgent';
    if (warningLevel === 1) return 'timer-warning';
    return 'timer-normal';
  };

  const getWarningMessage = (): string => {
    if (isExpired) return 'Time Expired!';
    if (warningLevel === 2) return '⚠️ URGENT: Time running out!';
    if (warningLevel === 1) return '⚠️ 5 minutes remaining';
    return '';
  };

  return (
    <div className={`quiz-timer ${getTimerClass()}`}>
      <div className="timer-display">
        <div className="timer-icon">⏱️</div>
        <div className="timer-time">{formatTime(timeRemaining)}</div>
      </div>

      {warningLevel > 0 && (
        <div className={`timer-warning-message warning-level-${warningLevel}`}>
          {getWarningMessage()}
        </div>
      )}

      <div className="timer-progress">
        <div
          className="timer-progress-bar"
          style={{
            width: `${((totalTime * 60 - timeRemaining) / (totalTime * 60)) * 100}%`,
            backgroundColor:
              warningLevel === 0 ? '#4caf50' : warningLevel === 1 ? '#ff9800' : '#f44336'
          }}
        ></div>
      </div>
    </div>
  );
};

export default QuizTimer;
