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
