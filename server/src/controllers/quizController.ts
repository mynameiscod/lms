import { Request, Response } from 'express';
import quizService from '../services/quizService';
import questionService from '../services/questionService';

export const createQuiz = async (req: Request, res: Response) => {
  try {
    const { title, description, startDate, endDate, startTime, endTime, totalMarks, totalTime, ...rest } = req.body;
    const tenantId = (req as any).tenantId;
    const userId = (req as any).userId;

    if (!title || !totalMarks || !totalTime) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const quiz = await quizService.createQuiz(
      {
        title,
        description,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        startTime,
        endTime,
        totalMarks,
        totalTime,
        createdBy: userId,
        ...rest
      },
      tenantId
    );

    res.status(201).json(quiz);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getQuizzes = async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId;
    const quizzes = await quizService.getQuizzes(tenantId, req.query);
    res.json(quizzes);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getQuizById = async (req: Request, res: Response) => {
  try {
    const { quizId } = req.params;
    const quiz = await quizService.getQuizById(quizId);

    if (!quiz) {
      return res.status(404).json({ message: 'Quiz not found' });
    }

    res.json(quiz);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const updateQuiz = async (req: Request, res: Response) => {
  try {
    const { quizId } = req.params;
    const quiz = await quizService.updateQuiz(quizId, req.body);

    if (!quiz) {
      return res.status(404).json({ message: 'Quiz not found' });
    }

    res.json(quiz);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const deleteQuiz = async (req: Request, res: Response) => {
  try {
    const { quizId } = req.params;
    const success = await quizService.deleteQuiz(quizId);

    if (!success) {
      return res.status(404).json({ message: 'Quiz not found' });
    }

    res.json({ message: 'Quiz deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const checkQuizAccess = async (req: Request, res: Response) => {
  try {
    const { quizId } = req.params;
    const studentId = (req as any).userId;

    const canAccess = await quizService.canStudentAccessQuiz(quizId, studentId);
    res.json({ canAccess });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const checkQuizAvailability = async (req: Request, res: Response) => {
  try {
    const { quizId } = req.params;
    const result = await quizService.isQuizAvailable(quizId);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const startQuizAttempt = async (req: Request, res: Response) => {
  try {
    const { quizId } = req.params;
    const studentId = (req as any).userId;
    const tenantId = (req as any).tenantId;

    const attempt = await quizService.startQuizAttempt(quizId, studentId, tenantId);
    res.status(201).json(attempt);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const getQuizQuestions = async (req: Request, res: Response) => {
  try {
    const { quizId } = req.params;
    const questions = await quizService.getQuizQuestions(quizId, false);
    res.json(questions);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const submitQuizAttempt = async (req: Request, res: Response) => {
  try {
    const { attemptId } = req.params;
    const { answers } = req.body;

    if (!Array.isArray(answers)) {
      return res.status(400).json({ message: 'Answers must be an array' });
    }

    const result = await quizService.submitQuizAttempt(attemptId, answers);
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const getQuizResults = async (req: Request, res: Response) => {
  try {
    const { attemptId } = req.params;
    const results = await quizService.getQuizResults(attemptId);
    res.json(results);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getStudentQuizzes = async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId;
    // Get all available quizzes for this student
    // Implementation would check access and availability
    const quizzes = await quizService.getQuizzes(tenantId);
    res.json(quizzes);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
