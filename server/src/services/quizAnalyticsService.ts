/**
 * Quiz Results & Analytics Service
 * Generates performance analytics, detailed results, and comparative statistics
 */

import QuizAttempt from '../models/QuizAttempt';
import Quiz from '../models/Quiz';
import User from '../models/User';
import mongoose from 'mongoose';

interface QuizPerformanceMetrics {
  quizId: string;
  quizTitle: string;
  totalAttempts: number;
  averageScore: number;
  highestScore: number;
  lowestScore: number;
  passRate: number; // Percentage of students who passed
  averageTimeSpent: number; // in seconds
  medianScore: number;
  standardDeviation: number;
}

interface StudentPerformance {
  studentId: string;
  studentName: string;
  studentEmail: string;
  attempts: {
    attemptNo: number;
    score: number;
    percentage: number;
    passed: boolean;
    timeSpent: number;
    submittedAt: Date;
    questionsAnswered: number;
  }[];
  bestScore: number;
  averageScore: number;
  totalAttempts: number;
  passed: boolean;
}

interface QuestionAnalytics {
  questionId: string;
  questionText: string;
  difficulty: string;
  totalAttempts: number;
  correctAttempts: number;
  incorrectAttempts: number;
  successRate: number; // Percentage of correct answers
  averageTimeSpent: number; // seconds
  averageMarksAwarded: number;
}

interface QuizReportData {
  quizId: string;
  quizTitle: string;
  generatedAt: Date;
  performanceMetrics: QuizPerformanceMetrics;
  questionAnalytics: QuestionAnalytics[];
  studentPerformances: StudentPerformance[];
  trends: {
    improvementRate: number; // Average improvement between attempts
    attemptDistribution: Record<number, number>; // How many students made 1st, 2nd, 3rd attempt, etc.
  };
}

export class QuizAnalyticsService {
  /**
   * Get detailed results for a single student attempt
   */
  async getStudentAttemptDetails(attemptId: string): Promise<any> {
    const attempt = await QuizAttempt.findById(attemptId)
      .populate('quizId')
      .populate('studentId');

    if (!attempt) {
      throw new Error('Attempt not found');
    }

    const quiz = await Quiz.findById(attempt.quizId);
    const student = await User.findById(attempt.studentId);

    return {
      attemptId: attempt._id,
      quizTitle: quiz?.title,
      studentName: student?.firstName + ' ' + student?.lastName,
      studentEmail: student?.email,
      attemptNo: attempt.attemptNo,
      obtainedMarks: attempt.obtainedMarks,
      totalMarks: attempt.totalMarks,
      percentage: attempt.percentage,
      passed: attempt.passed,
      timeSpent: attempt.timeSpent,
      totalTime: quiz?.totalTime,
      questionsAnswered: attempt.questionsAnswered,
      totalQuestions: quiz?.totalQuestions,
      tabSwitches: attempt.tabSwitchCount,
      tabSwitchWarnings: attempt.tabSwitchWarnings,
      fullScreenMaintained: attempt.isFullScreenMaintained,
      startedAt: attempt.startedAt,
      submittedAt: attempt.submittedAt,
      answers: attempt.answers
    };
  }

  /**
   * Get performance metrics for an entire quiz
   */
  async getQuizPerformanceMetrics(quizId: string): Promise<QuizPerformanceMetrics> {
    const quiz = await Quiz.findById(quizId);
    if (!quiz) {
      throw new Error('Quiz not found');
    }

    const attempts = await QuizAttempt.find({
      quizId,
      status: 'submitted'
    });

    if (attempts.length === 0) {
      return {
        quizId,
        quizTitle: quiz.title,
        totalAttempts: 0,
        averageScore: 0,
        highestScore: 0,
        lowestScore: 0,
        passRate: 0,
        averageTimeSpent: 0,
        medianScore: 0,
        standardDeviation: 0
      };
    }

    const scores = attempts
      .map((att) => att.percentage || 0)
      .sort((a, b) => a - b);

    const timesSpent = attempts.map((att) => att.timeSpent || 0);

    // Calculate statistics
    const totalScore = scores.reduce((a, b) => a + b, 0);
    const averageScore = totalScore / scores.length;
    const medianScore =
      scores.length % 2 === 0
        ? (scores[scores.length / 2 - 1] + scores[scores.length / 2]) / 2
        : scores[Math.floor(scores.length / 2)];

    // Calculate standard deviation
    const variance =
      scores.reduce((sum, score) => sum + Math.pow(score - averageScore, 2), 0) /
      scores.length;
    const standardDeviation = Math.sqrt(variance);

    // Calculate pass rate
    const passThreshold = quiz.passPercentage || 40;
    const passedCount = attempts.filter((att) => (att.percentage || 0) >= passThreshold)
      .length;
    const passRate = (passedCount / attempts.length) * 100;

    // Calculate average time spent
    const totalTime = timesSpent.reduce((a, b) => a + b, 0);
    const averageTimeSpent = totalTime / timesSpent.length;

    return {
      quizId,
      quizTitle: quiz.title,
      totalAttempts: attempts.length,
      averageScore: Math.round(averageScore * 100) / 100,
      highestScore: Math.max(...scores),
      lowestScore: Math.min(...scores),
      passRate: Math.round(passRate * 100) / 100,
      averageTimeSpent: Math.round(averageTimeSpent),
      medianScore: Math.round(medianScore * 100) / 100,
      standardDeviation: Math.round(standardDeviation * 100) / 100
    };
  }

  /**
   * Get all students' performance for a quiz
   */
  async getStudentPerformances(quizId: string): Promise<StudentPerformance[]> {
    const attempts = await QuizAttempt.find({
      quizId,
      status: 'submitted'
    }).sort({ studentId: 1, attemptNo: 1 });

    // Group by student
    const studentMap = new Map<string, StudentPerformance>();

    for (const attempt of attempts) {
      const student = await User.findById(attempt.studentId);
      if (!student) continue;

      if (!studentMap.has(attempt.studentId)) {
        studentMap.set(attempt.studentId, {
          studentId: attempt.studentId,
          studentName: `${student.firstName} ${student.lastName}`,
          studentEmail: student.email,
          attempts: [],
          bestScore: 0,
          averageScore: 0,
          totalAttempts: 0,
          passed: false
        });
      }

      const perf = studentMap.get(attempt.studentId)!;
      perf.attempts.push({
        attemptNo: attempt.attemptNo,
        score: attempt.obtainedMarks || 0,
        percentage: attempt.percentage || 0,
        passed: attempt.passed || false,
        timeSpent: attempt.timeSpent || 0,
        submittedAt: attempt.submittedAt || new Date(),
        questionsAnswered: attempt.questionsAnswered || 0
      });
    }

    // Calculate summary stats
    for (const perf of studentMap.values()) {
      if (perf.attempts.length > 0) {
        const percentages = perf.attempts.map((a) => a.percentage);
        perf.bestScore = Math.max(...percentages);
        perf.averageScore =
          percentages.reduce((a, b) => a + b, 0) / percentages.length;
        perf.totalAttempts = perf.attempts.length;
        perf.passed = perf.bestScore >= 40; // Assuming 40% pass mark
      }
    }

    return Array.from(studentMap.values());
  }

  /**
   * Get analytics for individual questions
   */
  async getQuestionAnalytics(quizId: string): Promise<QuestionAnalytics[]> {
    const quiz = await Quiz.findById(quizId).populate('questionIds');
    if (!quiz) {
      throw new Error('Quiz not found');
    }

    const attempts = await QuizAttempt.find({
      quizId,
      status: 'submitted'
    });

    const analytics: QuestionAnalytics[] = [];

    for (const questionId of quiz.questionIds || []) {
      const question = await Question.findById(questionId);
      if (!question) continue;

      let totalAttempts = 0;
      let correctAttempts = 0;
      let totalMarksAwarded = 0;
      const timeSpents: number[] = [];

      for (const attempt of attempts) {
        const answerData = (attempt.answers || []).find((ans: any) => ans.questionId === questionId);
        if (!answerData) continue;

        totalAttempts++;
        if (answerData.isCorrect) correctAttempts++;
        if (answerData.marksAwarded !== undefined) {
          totalMarksAwarded += answerData.marksAwarded;
        }
        if (answerData.timeSpent) {
          timeSpents.push(answerData.timeSpent);
        }
      }

      const successRate =
        totalAttempts > 0 ? (correctAttempts / totalAttempts) * 100 : 0;
      const averageTimeSpent =
        timeSpents.length > 0
          ? timeSpents.reduce((a, b) => a + b, 0) / timeSpents.length
          : 0;
      const averageMarksAwarded =
        totalAttempts > 0 ? totalMarksAwarded / totalAttempts : 0;

      analytics.push({
        questionId: questionId,
        questionText: question.question,
        difficulty: question.difficultyLevel,
        totalAttempts,
        correctAttempts,
        incorrectAttempts: totalAttempts - correctAttempts,
        successRate: Math.round(successRate * 100) / 100,
        averageTimeSpent: Math.round(averageTimeSpent),
        averageMarksAwarded: Math.round(averageMarksAwarded * 100) / 100
      });
    }

    return analytics;
  }

  /**
   * Export quiz results as CSV
   */
  async exportQuizResultsCSV(quizId: string): Promise<string> {
    const performances = await this.getStudentPerformances(quizId);

    let csv = 'Student Name,Email,Attempt,Score,Percentage,Passed,Time Spent (min),Questions Answered\n';

    for (const perf of performances) {
      for (const attempt of perf.attempts) {
        const timeSpentMin = Math.round((attempt.timeSpent / 60) * 100) / 100;
        csv += `"${perf.studentName}","${perf.studentEmail}",${attempt.attemptNo},${attempt.score},${attempt.percentage}%,${attempt.passed ? 'Yes' : 'No'},${timeSpentMin},${attempt.questionsAnswered}\n`;
      }
    }

    return csv;
  }

  /**
   * Get comprehensive quiz report
   */
  async getQuizReport(quizId: string): Promise<QuizReportData> {
    const metrics = await this.getQuizPerformanceMetrics(quizId);
    const questionAnalytics = await this.getQuestionAnalytics(quizId);
    const studentPerformances = await this.getStudentPerformances(quizId);

    // Calculate trends
    const improvementRates: number[] = [];
    for (const perf of studentPerformances) {
      if (perf.attempts.length > 1) {
        const firstAttempt = perf.attempts[0].percentage;
        const lastAttempt = perf.attempts[perf.attempts.length - 1].percentage;
        improvementRates.push(lastAttempt - firstAttempt);
      }
    }

    const averageImprovement =
      improvementRates.length > 0
        ? improvementRates.reduce((a, b) => a + b, 0) / improvementRates.length
        : 0;

    // Attempt distribution
    const attemptDistribution: Record<number, number> = {};
    for (const perf of studentPerformances) {
      const attempts = perf.totalAttempts;
      attemptDistribution[attempts] = (attemptDistribution[attempts] || 0) + 1;
    }

    return {
      quizId,
      quizTitle: metrics.quizTitle,
      generatedAt: new Date(),
      performanceMetrics: metrics,
      questionAnalytics,
      studentPerformances,
      trends: {
        improvementRate: Math.round(averageImprovement * 100) / 100,
        attemptDistribution
      }
    };
  }
}

// Import Question model
import Question from '../models/Question';

export default new QuizAnalyticsService();
