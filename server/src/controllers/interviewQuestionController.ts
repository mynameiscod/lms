import { Response } from 'express';
import { AuthenticatedRequest, ApiResponse } from '../types';
import { InterviewQuestionService } from '../services/interviewQuestionService';

const interviewQuestionService = new InterviewQuestionService();

// ==================== ADMIN OPERATIONS ====================

export const createQuestion = async (
  req: AuthenticatedRequest,
  res: Response<ApiResponse<any>>
) => {
  try {
    const {
      chapterId,
      subjectId,
      courseId,
      question,
      answer,
      explanation,
      difficulty,
      category,
      companyTags,
      tags
    } = req.body;

    if (!chapterId || !subjectId || !courseId || !question || !answer) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields',
        error: 'Chapter ID, Subject ID, Course ID, question, and answer are required'
      });
    }

    const questionData = {
      chapterId,
      subjectId,
      courseId,
      tenantId: req.tenantId,
      question,
      answer,
      explanation,
      difficulty: difficulty || 'medium',
      category: category || 'conceptual',
      companyTags: companyTags || [],
      tags: tags || [],
      createdBy: req.userId
    } as any;

    const newQuestion = await interviewQuestionService.createQuestion(questionData);

    res.status(201).json({
      success: true,
      message: 'Interview question created successfully',
      data: newQuestion
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message,
      error: error.message
    });
  }
};

export const bulkCreateQuestions = async (
  req: AuthenticatedRequest,
  res: Response<ApiResponse<any>>
) => {
  try {
    const { questions } = req.body;

    if (!questions || !Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Questions array is required',
        error: 'Please provide an array of questions'
      });
    }

    // Add tenant and creator info to all questions
    const questionsWithMeta = questions.map(q => ({
      ...q,
      tenantId: req.tenantId,
      createdBy: req.userId
    }));

    const createdQuestions = await interviewQuestionService.bulkCreateQuestions(questionsWithMeta);

    res.status(201).json({
      success: true,
      message: `${createdQuestions.length} interview questions created successfully`,
      data: createdQuestions
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message,
      error: error.message
    });
  }
};

export const updateQuestion = async (
  req: AuthenticatedRequest,
  res: Response<ApiResponse<any>>
) => {
  try {
    const { questionId } = req.params;
    const updateData = req.body;

    // Remove fields that shouldn't be updated
    delete updateData.tenantId;
    delete updateData.createdBy;
    delete updateData.viewCount;
    delete updateData.helpfulCount;

    const updated = await interviewQuestionService.updateQuestion(questionId, updateData);

    if (!updated) {
      return res.status(404).json({
        success: false,
        message: 'Question not found',
        error: 'Interview question not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Interview question updated successfully',
      data: updated
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message,
      error: error.message
    });
  }
};

export const deleteQuestion = async (
  req: AuthenticatedRequest,
  res: Response<ApiResponse<any>>
) => {
  try {
    const { questionId } = req.params;

    const deleted = await interviewQuestionService.deleteQuestion(questionId);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: 'Question not found',
        error: 'Interview question not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Interview question deleted successfully',
      data: deleted
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message,
      error: error.message
    });
  }
};

export const reorderQuestions = async (
  req: AuthenticatedRequest,
  res: Response<ApiResponse<any>>
) => {
  try {
    const { chapterId } = req.params;
    const { orders } = req.body;

    if (!orders || !Array.isArray(orders)) {
      return res.status(400).json({
        success: false,
        message: 'Orders array is required',
        error: 'Please provide an array of { questionId, order }'
      });
    }

    await interviewQuestionService.reorderQuestions(chapterId, orders);

    res.status(200).json({
      success: true,
      message: 'Questions reordered successfully',
      data: null
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message,
      error: error.message
    });
  }
};

// ==================== QUERY OPERATIONS ====================

export const getQuestionsByChapter = async (
  req: AuthenticatedRequest,
  res: Response<ApiResponse<any>>
) => {
  try {
    const { chapterId } = req.params;

    const questions = await interviewQuestionService.getQuestionsByChapter(chapterId, req.tenantId!);

    res.status(200).json({
      success: true,
      message: 'Interview questions fetched successfully',
      data: questions
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message,
      error: error.message
    });
  }
};

export const getQuestionsBySubject = async (
  req: AuthenticatedRequest,
  res: Response<ApiResponse<any>>
) => {
  try {
    const { subjectId } = req.params;

    const questions = await interviewQuestionService.getQuestionsBySubject(subjectId, req.tenantId!);

    res.status(200).json({
      success: true,
      message: 'Interview questions fetched successfully',
      data: questions
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message,
      error: error.message
    });
  }
};

export const getQuestionsByCourse = async (
  req: AuthenticatedRequest,
  res: Response<ApiResponse<any>>
) => {
  try {
    const { courseId } = req.params;

    const questions = await interviewQuestionService.getQuestionsByCourse(courseId, req.tenantId!);

    res.status(200).json({
      success: true,
      message: 'Interview questions fetched successfully',
      data: questions
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message,
      error: error.message
    });
  }
};

export const getQuestionById = async (
  req: AuthenticatedRequest,
  res: Response<ApiResponse<any>>
) => {
  try {
    const { questionId } = req.params;

    const question = await interviewQuestionService.getQuestionById(questionId);

    if (!question) {
      return res.status(404).json({
        success: false,
        message: 'Question not found',
        error: 'Interview question not found'
      });
    }

    // Increment view count
    await interviewQuestionService.incrementViewCount(questionId);

    res.status(200).json({
      success: true,
      message: 'Interview question fetched successfully',
      data: question
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message,
      error: error.message
    });
  }
};

export const getAllQuestions = async (
  req: AuthenticatedRequest,
  res: Response<ApiResponse<any>>
) => {
  try {
    const { difficulty, category, companyTag, search } = req.query;

    const questions = await interviewQuestionService.getQuestionsByTenant(req.tenantId!, {
      difficulty: difficulty as string,
      category: category as string,
      companyTag: companyTag as string,
      search: search as string
    });

    res.status(200).json({
      success: true,
      message: 'Interview questions fetched successfully',
      data: questions
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message,
      error: error.message
    });
  }
};

export const markHelpful = async (
  req: AuthenticatedRequest,
  res: Response<ApiResponse<any>>
) => {
  try {
    const { questionId } = req.params;

    await interviewQuestionService.incrementHelpfulCount(questionId);

    res.status(200).json({
      success: true,
      message: 'Marked as helpful',
      data: null
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message,
      error: error.message
    });
  }
};

// ==================== STUDENT PROGRESS ====================

export const getStudentProgress = async (
  req: AuthenticatedRequest,
  res: Response<ApiResponse<any>>
) => {
  try {
    const { chapterId } = req.params;

    const progress = await interviewQuestionService.getStudentProgress(req.userId!, chapterId);

    res.status(200).json({
      success: true,
      message: 'Student progress fetched successfully',
      data: progress
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message,
      error: error.message
    });
  }
};

export const getStudentCourseProgress = async (
  req: AuthenticatedRequest,
  res: Response<ApiResponse<any>>
) => {
  try {
    const { courseId } = req.params;

    const progress = await interviewQuestionService.getStudentProgressForCourse(
      req.userId!,
      courseId,
      req.tenantId!
    );

    res.status(200).json({
      success: true,
      message: 'Student course progress fetched successfully',
      data: progress
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message,
      error: error.message
    });
  }
};

export const updateStudentProgress = async (
  req: AuthenticatedRequest,
  res: Response<ApiResponse<any>>
) => {
  try {
    const { questionId } = req.params;
    const { status, notes, chapterId } = req.body;

    if (!status || !chapterId) {
      return res.status(400).json({
        success: false,
        message: 'Status and chapterId are required',
        error: 'Please provide status and chapterId'
      });
    }

    const validStatuses = ['not_reviewed', 'reviewing', 'understood', 'confident'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status',
        error: `Status must be one of: ${validStatuses.join(', ')}`
      });
    }

    const progress = await interviewQuestionService.updateStudentProgress(
      req.userId!,
      questionId,
      chapterId,
      req.tenantId!,
      status,
      notes
    );

    res.status(200).json({
      success: true,
      message: 'Progress updated successfully',
      data: progress
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message,
      error: error.message
    });
  }
};

export const getChapterStats = async (
  req: AuthenticatedRequest,
  res: Response<ApiResponse<any>>
) => {
  try {
    const { chapterId } = req.params;

    const stats = await interviewQuestionService.getChapterConfidenceStats(chapterId, req.tenantId!);

    res.status(200).json({
      success: true,
      message: 'Chapter stats fetched successfully',
      data: stats
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message,
      error: error.message
    });
  }
};
