import { Request, Response } from 'express';
import questionService from '../services/questionService';

export const createQuestion = async (req: Request, res: Response) => {
  try {
    const { quizId } = req.params;
    const tenantId = (req as any).tenantId;
    const { type, question, marks, ...rest } = req.body;

    if (!type || !question || !marks) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const newQuestion = await questionService.createQuestion(
      quizId,
      { type, question, marks, ...rest } as any,
      tenantId
    );

    res.status(201).json(newQuestion);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getQuestionsForQuiz = async (req: Request, res: Response) => {
  try {
    const { quizId } = req.params;
    const includeAnswers = req.query.includeAnswers === 'true';

    const questions = await questionService.getQuestionsForQuiz(quizId, includeAnswers);
    res.json(questions);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getQuestionById = async (req: Request, res: Response) => {
  try {
    const { questionId } = req.params;
    const includeAnswers = req.query.includeAnswers === 'true';

    const question = await questionService.getQuestionById(questionId, includeAnswers);

    if (!question) {
      return res.status(404).json({ message: 'Question not found' });
    }

    res.json(question);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const updateQuestion = async (req: Request, res: Response) => {
  try {
    const { questionId } = req.params;
    const question = await questionService.updateQuestion(questionId, req.body);

    if (!question) {
      return res.status(404).json({ message: 'Question not found' });
    }

    res.json(question);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const deleteQuestion = async (req: Request, res: Response) => {
  try {
    const { questionId } = req.params;
    const success = await questionService.deleteQuestion(questionId);

    if (!success) {
      return res.status(404).json({ message: 'Question not found' });
    }

    res.json({ message: 'Question deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const bulkCreateQuestions = async (req: Request, res: Response) => {
  try {
    const { quizId } = req.params;
    const tenantId = (req as any).tenantId;
    const { questions } = req.body;

    if (!Array.isArray(questions)) {
      return res.status(400).json({ message: 'Questions must be an array' });
    }

    const created = await questionService.bulkCreateQuestions(quizId, questions, tenantId);
    res.status(201).json(created);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const validateAnswer = async (req: Request, res: Response) => {
  try {
    const { questionId } = req.params;
    const { answer } = req.body;

    const result = await questionService.validateAnswer(questionId, answer);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// ========== QUESTION BANK ENDPOINTS ==========

// Create question in Question Bank
export const createQuestionBankQuestion = async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId;
    const userId = (req as any).userId;
    const { type, question, marks, ...rest } = req.body;

    if (!type || !question || !marks) {
      return res.status(400).json({ message: 'Missing required fields: type, question, marks' });
    }

    const newQuestion = await questionService.createQuestionBankQuestion(
      { type, question, marks, ...rest } as any,
      tenantId,
      userId
    );

    res.status(201).json(newQuestion);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// Get all questions in Question Bank
export const getQuestionBank = async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId;
    const { tags, difficulty, type, source, search } = req.query;

    const filters: any = {};
    if (tags) filters.tags = (tags as string).split(',');
    if (difficulty) filters.difficulty = difficulty;
    if (type) filters.questionType = type;
    if (source) filters.source = source;
    if (search) filters.search = search;

    const questions = await questionService.getQuestionBank(tenantId, filters);
    res.json(questions);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// Search questions in Question Bank
export const searchQuestionsInBank = async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId;
    const { q } = req.query;

    if (!q) {
      return res.status(400).json({ message: 'Search term (q) is required' });
    }

    const results = await questionService.searchQuestions(tenantId, q as string);
    res.json(results);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// Check for duplicate questions
export const checkDuplicate = async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId;
    const { questionText } = req.body;

    if (!questionText) {
      return res.status(400).json({ message: 'questionText is required' });
    }

    const duplicate = await questionService.checkDuplicateQuestion(questionText, tenantId);
    res.json({ isDuplicate: !!duplicate, duplicateQuestion: duplicate });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// Get questions by tags
export const getQuestionsByTags = async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId;
    const { tags } = req.query;

    if (!tags) {
      return res.status(400).json({ message: 'tags query parameter is required' });
    }

    const tagsArray = (tags as string).split(',');
    const questions = await questionService.getQuestionsByTags(tenantId, tagsArray);
    res.json(questions);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// Get all unique tags
export const getAllTags = async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId;
    const tags = await questionService.getAllTags(tenantId);
    res.json({ tags });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// Get Question Bank statistics
export const getQuestionBankStats = async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId;
    const stats = await questionService.getQuestionBankStats(tenantId);
    res.json(stats);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// Delete from Question Bank
export const deleteQuestionBankQuestion = async (req: Request, res: Response) => {
  try {
    const { questionId } = req.params;
    const success = await questionService.deleteQuestionBankQuestion(questionId);

    if (!success) {
      return res.status(404).json({ message: 'Question not found' });
    }

    res.json({ message: 'Question deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// Mark question as duplicate
export const markAsDuplicate = async (req: Request, res: Response) => {
  try {
    const { questionId } = req.params;
    const { duplicateOfId } = req.body;

    if (!duplicateOfId) {
      return res.status(400).json({ message: 'duplicateOfId is required' });
    }

    const question = await questionService.markAsDuplicate(questionId, duplicateOfId);

    if (!question) {
      return res.status(404).json({ message: 'Question not found' });
    }

    res.json(question);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

