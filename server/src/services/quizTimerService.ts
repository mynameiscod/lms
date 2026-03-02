/**
 * Quiz Timer Service
 * Handles quiz countdown, timeout detection, and auto-submission
 */

import QuizAttempt from '../models/QuizAttempt';
import Quiz from '../models/Quiz';

interface TimerStatus {
  quizId: string;
  attemptId: string;
  totalTimeAllowed: number; // in seconds
  timeElapsed: number; // in seconds
  timeRemaining: number; // in seconds
  isExpired: boolean;
  expiresAt: Date;
  warningThreshold: number; // seconds before timeout to show warning
}

export class QuizTimerService {
  /**
   * Get current timer status for a quiz attempt
   */
  async getTimerStatus(attemptId: string): Promise<TimerStatus | null> {
    const attempt = await QuizAttempt.findById(attemptId);
    if (!attempt) return null;

    const quiz = await Quiz.findById(attempt.quizId);
    if (!quiz) return null;

    const now = new Date();
    const startedAt = new Date(attempt.startedAt);
    
    // Calculate total time allowed in seconds
    const totalTimeAllowed = quiz.totalTime * 60;
    
    // Calculate time elapsed
    const timeElapsed = Math.floor((now.getTime() - startedAt.getTime()) / 1000);
    
    // Calculate time remaining
    const timeRemaining = Math.max(0, totalTimeAllowed - timeElapsed);
    
    // Calculate expiration time
    const expiresAt = new Date(startedAt.getTime() + totalTimeAllowed * 1000);
    
    return {
      quizId: attempt.quizId,
      attemptId: attempt._id?.toString() || '',
      totalTimeAllowed,
      timeElapsed,
      timeRemaining,
      isExpired: timeRemaining === 0,
      expiresAt,
      warningThreshold: 300 // 5 minutes warning
    };
  }

  /**
   * Check if quiz attempt has exceeded time limit
   */
  async isTimeExpired(attemptId: string): Promise<boolean> {
    const attempt = await QuizAttempt.findById(attemptId);
    if (!attempt) return true;

    const quiz = await Quiz.findById(attempt.quizId);
    if (!quiz) return true;

    const now = new Date();
    const startedAt = new Date(attempt.startedAt);
    const totalTimeAllowed = quiz.totalTime * 60 * 1000; // Convert to milliseconds
    const timeElapsed = now.getTime() - startedAt.getTime();

    return timeElapsed >= totalTimeAllowed;
  }

  /**
   * Get time warning level (0 = OK, 1 = 5 min warning, 2 = URGENT)
   */
  async getWarningLevel(attemptId: string): Promise<number> {
    const timer = await this.getTimerStatus(attemptId);
    if (!timer) return 2; // URGENT - attempt not found

    if (timer.isExpired) return 2; // URGENT - time expired
    if (timer.timeRemaining <= 60) return 2; // URGENT - less than 1 minute
    if (timer.timeRemaining <= 300) return 1; // WARNING - less than 5 minutes
    
    return 0; // OK
  }

  /**
   * Format time remaining for display
   * Returns: "1h 23m 45s" or "23m 45s" or "45s"
   */
  formatTimeRemaining(secondsRemaining: number): string {
    if (secondsRemaining <= 0) return '0s';

    const hours = Math.floor(secondsRemaining / 3600);
    const minutes = Math.floor((secondsRemaining % 3600) / 60);
    const seconds = secondsRemaining % 60;

    const parts = [];
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    parts.push(`${seconds}s`);

    return parts.join(' ');
  }

  /**
   * Update time spent on quiz attempt
   * Called periodically during quiz taking
   */
  async updateTimeSpent(attemptId: string): Promise<number> {
    const attempt = await QuizAttempt.findById(attemptId);
    if (!attempt) throw new Error('Attempt not found');

    const now = new Date();
    const startedAt = new Date(attempt.startedAt);
    const timeSpent = Math.floor((now.getTime() - startedAt.getTime()) / 1000);

    await QuizAttempt.updateOne(
      { _id: attemptId },
      { timeSpent }
    );

    return timeSpent;
  }

  /**
   * Auto-submit quiz when time expires
   */
  async autoSubmitOnTimeout(attemptId: string): Promise<boolean> {
    const attempt = await QuizAttempt.findById(attemptId);
    if (!attempt || attempt.status !== 'in_progress') {
      return false;
    }

    // Mark as submitted with time expired
    await QuizAttempt.updateOne(
      { _id: attemptId },
      {
        status: 'submitted',
        submittedAt: new Date(),
        $set: { 'metadata.autoSubmitted': true, 'metadata.reason': 'time_expired' }
      }
    );

    return true;
  }

  /**
   * Pause time tracking (if needed)
   */
  async pauseAttempt(attemptId: string): Promise<void> {
    await QuizAttempt.updateOne(
      { _id: attemptId },
      { $set: { 'metadata.paused': true, 'metadata.pausedAt': new Date() } }
    );
  }

  /**
   * Resume time tracking
   */
  async resumeAttempt(attemptId: string): Promise<void> {
    const attempt = await QuizAttempt.findById(attemptId);
    if (!attempt) throw new Error('Attempt not found');

    const metadata = (attempt as any).metadata || {};
    const pausedAt = metadata.pausedAt ? new Date(metadata.pausedAt) : new Date();
    const resumeAt = new Date();
    const pausedDuration = Math.floor((resumeAt.getTime() - pausedAt.getTime()) / 1000);

    // Add paused duration to total time spent to account for pause
    await QuizAttempt.updateOne(
      { _id: attemptId },
      {
        $set: {
          'metadata.paused': false,
          'metadata.pausedAt': null,
          'metadata.totalPausedTime': (metadata.totalPausedTime || 0) + pausedDuration
        }
      }
    );
  }
}

export default new QuizTimerService();
