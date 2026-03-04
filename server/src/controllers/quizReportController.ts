import { Request, Response } from 'express';
import { QuizAnalyticsService } from '../services/quizAnalyticsService';
import Quiz from '../models/Quiz';
import QuizAttempt from '../models/QuizAttempt';
import User from '../models/User';
import Batch from '../models/Batch';

const analyticsService = new QuizAnalyticsService();

/**
 * Get quiz report summary
 * Returns overall quiz statistics
 */
export const getQuizReportSummary = async (req: Request, res: Response) => {
  try {
    const { quizId } = req.params;
    const tenantId = (req as any).tenantId;

    // Verify quiz belongs to tenant
    const quiz = await Quiz.findOne({ _id: quizId, tenantId });
    if (!quiz) {
      return res.status(404).json({ message: 'Quiz not found' });
    }

    // Get performance metrics
    const metrics = await analyticsService.getQuizPerformanceMetrics(quizId);

    res.json(metrics);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * Get all quiz attempts with student details
 * Returns paginated list of all attempts on a quiz
 */
export const getQuizAttempts = async (req: Request, res: Response) => {
  try {
    const { quizId } = req.params;
    const tenantId = (req as any).tenantId;
    const { page = 1, limit = 10, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;

    // Verify quiz belongs to tenant
    const quiz = await Quiz.findOne({ _id: quizId, tenantId });
    if (!quiz) {
      return res.status(404).json({ message: 'Quiz not found' });
    }

    const pageNum = parseInt(page as string) || 1;
    const limitNum = parseInt(limit as string) || 10;
    const skip = (pageNum - 1) * limitNum;
    const sortDir = sortOrder === 'asc' ? 1 : -1;

    // Get attempts with student details
    const attempts = await QuizAttempt.find({
      quizId,
      status: 'submitted'
    })
      .sort({ [sortBy as string]: sortDir })
      .skip(skip)
      .limit(limitNum)
      .lean();

    // Get student details for each attempt
    const attemptsWithStudents = await Promise.all(
      attempts.map(async (attempt) => {
        const student = await User.findById(attempt.studentId).select('firstName lastName email');
        return {
          ...attempt,
          studentName: student ? `${student.firstName} ${student.lastName}`.trim() : 'Unknown',
          studentEmail: student?.email || 'N/A'
        };
      })
    );

    // Get total count
    const total = await QuizAttempt.countDocuments({
      quizId,
      status: 'submitted'
    });

    res.json({
      data: attemptsWithStudents,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      }
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * Get student-wise performance report
 * Returns performance summary for each student
 */
export const getStudentPerformanceReport = async (req: Request, res: Response) => {
  try {
    const { quizId } = req.params;
    const tenantId = (req as any).tenantId;

    // Verify quiz belongs to tenant
    const quiz = await Quiz.findOne({ _id: quizId, tenantId });
    if (!quiz) {
      return res.status(404).json({ message: 'Quiz not found' });
    }

    // Get student performances
    const studentPerformances = await analyticsService.getStudentPerformances(quizId);

    // Sort by average score descending (top performers first)
    studentPerformances.sort((a, b) => b.averageScore - a.averageScore);

    res.json(studentPerformances);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * Get question-wise analytics
 * Returns performance metrics for each question
 */
export const getQuestionAnalytics = async (req: Request, res: Response) => {
  try {
    const { quizId } = req.params;
    const tenantId = (req as any).tenantId;

    // Verify quiz belongs to tenant
    const quiz = await Quiz.findOne({ _id: quizId, tenantId });
    if (!quiz) {
      return res.status(404).json({ message: 'Quiz not found' });
    }

    // Get question analytics
    const questionAnalytics = await analyticsService.getQuestionAnalytics(quizId);

    res.json(questionAnalytics);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * Get complete quiz report
 * Returns comprehensive report with all data
 */
export const getCompleteQuizReport = async (req: Request, res: Response) => {
  try {
    const { quizId } = req.params;
    const tenantId = (req as any).tenantId;

    // Verify quiz belongs to tenant
    const quiz = await Quiz.findOne({ _id: quizId, tenantId });
    if (!quiz) {
      return res.status(404).json({ message: 'Quiz not found' });
    }

    // Get complete report
    const report = await analyticsService.getQuizReport(quizId);

    res.json(report);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * Export quiz report as CSV
 */
export const exportQuizReportCSV = async (req: Request, res: Response) => {
  try {
    const { quizId } = req.params;
    const tenantId = (req as any).tenantId;

    // Verify quiz belongs to tenant
    const quiz = await Quiz.findOne({ _id: quizId, tenantId });
    if (!quiz) {
      return res.status(404).json({ message: 'Quiz not found' });
    }

    // Get CSV data
    const csvData = await analyticsService.exportQuizResultsCSV(quizId);

    // Set response headers for CSV download
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="quiz-report-${quizId}-${new Date().toISOString().split('T')[0]}.csv"`);
    
    res.send(csvData);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * Get top performers for a quiz
 */
export const getTopPerformers = async (req: Request, res: Response) => {
  try {
    const { quizId } = req.params;
    const { limit = 10 } = req.query;
    const tenantId = (req as any).tenantId;

    // Verify quiz belongs to tenant
    const quiz = await Quiz.findOne({ _id: quizId, tenantId });
    if (!quiz) {
      return res.status(404).json({ message: 'Quiz not found' });
    }

    const limitNum = parseInt(limit as string) || 10;

    // Get top performers
    const performers = await QuizAttempt.find({
      quizId,
      status: 'submitted'
    })
      .sort({ obtainedMarks: -1 })
      .limit(limitNum)
      .lean();

    // Get student details
    const topPerformers = await Promise.all(
      performers.map(async (attempt) => {
        const student = await User.findById(attempt.studentId).select('firstName lastName email');
        return {
          studentId: attempt.studentId,
          studentName: student ? `${student.firstName} ${student.lastName}`.trim() : 'Unknown',
          studentEmail: student?.email || 'N/A',
          marks: attempt.obtainedMarks,
          percentage: attempt.percentage,
          timeSpent: attempt.timeSpent,
          attemptNo: attempt.attemptNo,
          submittedAt: attempt.submittedAt
        };
      })
    );

    res.json(topPerformers);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * Get quiz list for reports (with attempt counts)
 */
export const getQuizzesForReporting = async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId;

    // Get all quizzes for the tenant
    const quizzes = await Quiz.find({ tenantId }).lean();

    // Get attempt count for each quiz
    const quizzesWithStats = await Promise.all(
      quizzes.map(async (quiz) => {
        // Count SUBMITTED attempts for statistics
        const submittedAttempts = await QuizAttempt.find({
          quizId: quiz._id,
          status: 'submitted'
        }).lean();

        // Show total attempts (submitted + other relevant statuses for better visibility)
        const totalAttemptCount = await QuizAttempt.countDocuments({
          quizId: quiz._id,
          status: { $in: ['submitted', 'in_progress', 'grading'] }
        });

        const averageScore =
          submittedAttempts.length > 0
            ? submittedAttempts.reduce((sum, att) => sum + (att.obtainedMarks || 0), 0) / submittedAttempts.length
            : 0;

        const passedCount = submittedAttempts.filter((att) => att.passed).length;
        const passRate = submittedAttempts.length > 0 ? (passedCount / submittedAttempts.length) * 100 : 0;

        return {
          _id: quiz._id,
          title: quiz.title,
          description: quiz.description,
          totalAttempts: totalAttemptCount,
          completedAttempts: submittedAttempts.length,
          averageScore: Math.round(averageScore * 100) / 100,
          passRate: Math.round(passRate * 100) / 100,
          createdAt: quiz.createdAt
        };
      })
    );

    res.json(quizzesWithStats);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * Get quiz distribution stats
 * Returns how many students the quiz was sent to, pending, completed, in-progress
 */
export const getQuizDistributionStats = async (req: Request, res: Response) => {
  try {
    const { quizId } = req.params;
    const tenantId = (req as any).tenantId;

    // Verify quiz belongs to tenant
    const quiz = await Quiz.findOne({ _id: quizId, tenantId });
    if (!quiz) {
      return res.status(404).json({ message: 'Quiz not found' });
    }

    // Determine target students based on quiz accessibility
    let targetStudents: any[] = [];
    
    if (quiz.accessibleTo === 'everyone') {
      // Get all students in the tenant
      targetStudents = await User.find({ 
        tenantId, 
        role: 'STUDENT',
        isActive: true 
      }).select('_id firstName lastName email').lean();
    } else if (quiz.accessibleTo === 'batch_wise' && quiz.selectedBatches && quiz.selectedBatches.length > 0) {
      // Get students in selected batches
      targetStudents = await User.find({ 
        tenantId, 
        role: 'STUDENT',
        isActive: true,
        batchId: { $in: quiz.selectedBatches }
      }).select('_id firstName lastName email batchId').lean();
    } else if (quiz.accessibleTo === 'individual' && quiz.selectedStudents && quiz.selectedStudents.length > 0) {
      // Get individual selected students
      targetStudents = await User.find({ 
        _id: { $in: quiz.selectedStudents },
        tenantId,
        role: 'STUDENT',
        isActive: true
      }).select('_id firstName lastName email').lean();
    }

    const totalSentTo = targetStudents.length;

    // Get all attempts for this quiz
    const attempts = await QuizAttempt.find({ quizId }).lean();

    // Map student IDs who have attempted
    const studentAttemptMap = new Map<string, { status: string; attempts: number; latestAttempt: any }>();
    
    attempts.forEach((attempt) => {
      const studentId = attempt.studentId.toString();
      const existing = studentAttemptMap.get(studentId);
      
      if (!existing) {
        studentAttemptMap.set(studentId, {
          status: attempt.status,
          attempts: 1,
          latestAttempt: attempt
        });
      } else {
        existing.attempts++;
        // Update status if this is a more recent attempt
        if (new Date(attempt.startedAt) > new Date(existing.latestAttempt.startedAt)) {
          existing.status = attempt.status;
          existing.latestAttempt = attempt;
        }
      }
    });

    // Calculate counts
    let completed = 0;
    let inProgress = 0;
    let pending = 0;

    const studentDetails: any[] = [];

    targetStudents.forEach((student) => {
      const studentId = student._id.toString();
      const attemptInfo = studentAttemptMap.get(studentId);
      
      let status: 'completed' | 'in_progress' | 'pending';
      let attemptCount = 0;
      let latestScore: number | null = null;

      if (!attemptInfo) {
        status = 'pending';
        pending++;
      } else if (attemptInfo.status === 'submitted') {
        status = 'completed';
        completed++;
        attemptCount = attemptInfo.attempts;
        latestScore = attemptInfo.latestAttempt.percentage;
      } else if (attemptInfo.status === 'in_progress') {
        status = 'in_progress';
        inProgress++;
        attemptCount = attemptInfo.attempts;
      } else {
        // Draft or other statuses count as pending
        status = 'pending';
        pending++;
      }

      studentDetails.push({
        studentId,
        studentName: `${student.firstName} ${student.lastName}`.trim(),
        studentEmail: student.email,
        status,
        attemptCount,
        latestScore
      });
    });

    // Get batch names for batch-wise quizzes
    let batchInfo: any[] = [];
    if (quiz.accessibleTo === 'batch_wise' && quiz.selectedBatches && quiz.selectedBatches.length > 0) {
      const batches = await Batch.find({ _id: { $in: quiz.selectedBatches } }).select('name').lean();
      batchInfo = batches.map(b => ({ id: b._id, name: b.name }));
    }

    res.json({
      quizId: quiz._id,
      quizTitle: quiz.title,
      accessibleTo: quiz.accessibleTo,
      selectedBatches: batchInfo,
      totalSentTo,
      completed,
      inProgress,
      pending,
      completionRate: totalSentTo > 0 ? Math.round((completed / totalSentTo) * 100) : 0,
      studentDetails
    });
  } catch (error: any) {
    console.error('Error getting quiz distribution stats:', error);
    res.status(500).json({ message: error.message });
  }
};
