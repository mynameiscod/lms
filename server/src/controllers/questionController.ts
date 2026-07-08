import { Request, Response } from 'express';
import questionService from '../services/questionService';
import quizService from '../services/quizService';
import Quiz from '../models/Quiz';
import { generateQuestionsWithAI, normalizeQuestion } from '../services/aiService';
import Question from '../models/Question';

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

    // Use quizService to properly handle linked questions from Question Bank
    const questions = await quizService.getQuestionsForQuiz(quizId, includeAnswers);
    
    // Shuffle if quiz setting requires it
    const quiz = await Quiz.findById(quizId);
    if (quiz?.shuffleQuestions) {
      for (let i = questions.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [questions[i], questions[j]] = [questions[j], questions[i]];
      }
    }
    
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

// Preview or remove duplicate bank questions. ?dryRun=false to actually delete.
export const dedupeQuestionBank = async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId;
    const dryRun = String(req.query.dryRun ?? 'true') !== 'false';
    const result = await questionService.dedupeBankQuestions(tenantId, dryRun);
    res.json({ ...result, dryRun });
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

// Generate questions using AI (GPT-4o-mini)
export const generateAIQuestions = async (req: Request, res: Response) => {
  try {
    const { topic, type, difficulty, count } = req.body;

    if (!topic || !type || !difficulty || !count) {
      return res.status(400).json({ message: 'topic, type, difficulty, and count are required' });
    }

    const validTypes = ['mcq_single', 'mcq_multiple', 'short_answer'];
    const validDifficulties = ['easy', 'medium', 'hard', 'mixed'];

    if (!validTypes.includes(type)) {
      return res.status(400).json({ message: `Invalid type. Must be one of: ${validTypes.join(', ')}` });
    }
    if (!validDifficulties.includes(difficulty)) {
      return res.status(400).json({ message: `Invalid difficulty. Must be one of: ${validDifficulties.join(', ')}` });
    }

    const countNum = Math.min(Math.max(parseInt(count) || 5, 1), 20);
    const tenantId = (req as any).tenantId;

    // Pull existing bank questions for this topic so the AI doesn't regenerate them
    // (saves cost) and so we can hard-filter any duplicate it returns anyway.
    const term = String(topic).trim();
    const esc = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const existing = tenantId ? await Question.find({
      tenantId,
      $or: [
        { topic: { $regex: esc, $options: 'i' } },
        { tags: { $regex: esc, $options: 'i' } },
        { question: { $regex: esc, $options: 'i' } },
      ],
    }).select('question').limit(300).lean() : [];
    const avoid = existing.map((q: any) => q.question).filter(Boolean);
    const existingKeys = new Set(avoid.map((q: string) => normalizeQuestion(q)));

    let questions = await generateQuestionsWithAI({ topic, type, difficulty, count: countNum, avoid });
    // Hard filter against the DB — never hand back a question that already exists.
    const before = questions.length;
    questions = questions.filter((q: any) => !existingKeys.has(normalizeQuestion(q.question || '')));
    res.json({ questions, skippedDuplicates: before - questions.length, existingChecked: avoid.length });
  } catch (error: any) {
    console.error('AI generation error:', error);
    if (error.status === 401) {
      return res.status(503).json({ message: 'Invalid OpenAI API key. Please check OPENAI_API_KEY in server .env' });
    }
    if (error.message?.includes('OPENAI_API_KEY')) {
      return res.status(503).json({ message: error.message });
    }
    res.status(500).json({ message: error.message || 'Failed to generate questions' });
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

