import { Request, Response } from 'express';
import QuizAttempt from '../models/QuizAttempt';
import Quiz from '../models/Quiz';
import User from '../models/User';
import Submission from '../models/Submission';
import Assignment from '../models/Assignment';
import CodeSnippetSubmission from '../models/CodeSnippetSubmission';
import CodeSnippetAssessment from '../models/CodeSnippetAssessment';

export const getQuizResult = async (req: Request, res: Response): Promise<void> => {
  try {
    const { token } = req.params;
    const attempt = await QuizAttempt.findOne({ shareToken: token });
    if (!attempt) {
      res.status(404).json({ success: false, message: 'Certificate not found' });
      return;
    }

    const [quiz, student] = await Promise.all([
      Quiz.findById(attempt.quizId).select('title'),
      User.findById(attempt.studentId).select('firstName lastName'),
    ]);

    res.json({
      success: true,
      data: {
        type: 'quiz',
        title: (quiz as any)?.title || 'Quiz',
        studentName: student
          ? `${(student as any).firstName} ${(student as any).lastName}`.trim()
          : 'Student',
        score: attempt.obtainedMarks ?? 0,
        totalMarks: attempt.totalMarks,
        percentage: attempt.percentage ?? 0,
        passed: attempt.passed ?? false,
        submittedAt: attempt.submittedAt,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to load certificate' });
  }
};

export const getAssignmentResult = async (req: Request, res: Response): Promise<void> => {
  try {
    const { token } = req.params;
    const submission = await Submission.findOne({ shareToken: token })
      .populate('assignment', 'title totalPoints')
      .populate('student', 'firstName lastName');

    if (!submission) {
      res.status(404).json({ success: false, message: 'Certificate not found' });
      return;
    }

    const assignment = submission.assignment as any;
    const student = submission.student as any;

    res.json({
      success: true,
      data: {
        type: 'assignment',
        title: assignment?.title || 'Assignment',
        studentName: student
          ? `${student.firstName} ${student.lastName}`.trim()
          : 'Student',
        score: submission.finalScore ?? 0,
        totalPoints: assignment?.totalPoints ?? 0,
        percentage: submission.percentage ?? 0,
        isPassing: submission.isPassing,
        status: submission.status,
        submittedAt: submission.submittedAt,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to load certificate' });
  }
};

export const getSnippetResult = async (req: Request, res: Response): Promise<void> => {
  try {
    const { token } = req.params;
    const submission = await CodeSnippetSubmission.findOne({ shareToken: token })
      .populate('assessmentId', 'title totalMarks')
      .populate('studentId', 'firstName lastName');

    if (!submission) {
      res.status(404).json({ success: false, message: 'Certificate not found' });
      return;
    }

    const assessment = submission.assessmentId as any;
    const student = submission.studentId as any;
    const total = assessment?.totalMarks ?? 0;
    const score = submission.totalMarksAwarded ?? 0;

    res.json({
      success: true,
      data: {
        type: 'snippet',
        title: assessment?.title || 'Code Assessment',
        studentName: student
          ? `${student.firstName} ${student.lastName}`.trim()
          : 'Student',
        score,
        totalMarks: total,
        percentage: total > 0 ? Math.round((score / total) * 100) : 0,
        status: submission.status,
        submittedAt: submission.submittedAt,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to load certificate' });
  }
};
