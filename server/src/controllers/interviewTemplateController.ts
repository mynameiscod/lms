import { Request, Response } from 'express';
import interviewTemplateService from '../services/interviewTemplateService';

// Template fields the take page needs (no answer keys here)
const STUDENT_TEMPLATE_FIELDS = 'title description interviewCategories totalDuration sectionNavigationMode blockMultipleTabs allowResume showResultImmediately';

/**
 * Strip per-question grading + any correct-answer hints from an attempt before
 * sending it to a student mid-interview. Grades are revealed only via the
 * report endpoint once the attempt is published/evaluated.
 */
function sanitizeAttemptForStudent(attemptDoc: any) {
  const a = attemptDoc && typeof attemptDoc.toObject === 'function' ? attemptDoc.toObject() : attemptDoc;
  if (!a) return a;
  const inProgress = a.status === 'in_progress';
  for (const sec of a.sectionAttempts || []) {
    if (inProgress) {
      delete sec.totalScore; delete sec.percentage; delete sec.passed;
      delete sec.communicationScores; delete sec.hrScores; delete sec.technicalScores;
    }
    for (const qr of sec.questionResponses || []) {
      delete qr.score; delete qr.feedback; delete qr.strengths; delete qr.weaknesses;
      delete qr.missedPoints; delete qr.keywordsCovered; delete qr.keywordsMissed;
      delete qr.categoryScores; delete qr.betterAnswerSuggestion;
      if (Array.isArray(qr.mcqOptions)) {
        qr.mcqOptions = qr.mcqOptions.map((o: any) => ({ label: o.label, text: o.text }));
      }
    }
  }
  return a;
}

async function respondStudentAttempt(res: Response, attempt: any, statusCode = 200) {
  if (attempt && typeof attempt.populate === 'function') {
    try { await attempt.populate('templateId', STUDENT_TEMPLATE_FIELDS); } catch { /* already populated / lean */ }
  }
  res.status(statusCode).json({ success: true, data: sanitizeAttemptForStudent(attempt) });
}

// ─── Template CRUD ───────────────────────────────────────────────────────────

export const createTemplate = async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId;
    const userId = (req as any).userId;
    const template = await interviewTemplateService.createTemplate(req.body, tenantId, userId);
    res.status(201).json({ success: true, data: template });
  } catch (error: any) {
    console.error('Error creating interview template:', error);
    res.status(400).json({ success: false, message: error.message });
  }
};

export const getTemplates = async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId;
    const { status, category, difficulty, search, page, limit } = req.query;
    const result = await interviewTemplateService.getTemplates(tenantId, {
      status: status as string,
      category: category as string,
      difficulty: difficulty as string,
      search: search as string,
      page: page ? parseInt(page as string) : undefined,
      limit: limit ? parseInt(limit as string) : undefined,
    });
    res.json({ success: true, ...result });
  } catch (error: any) {
    console.error('Error getting templates:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getTemplateById = async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId;
    const template = await interviewTemplateService.getTemplateById(req.params.templateId, tenantId);
    if (!template) return res.status(404).json({ success: false, message: 'Template not found' });
    res.json({ success: true, data: template });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateTemplate = async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId;
    const template = await interviewTemplateService.updateTemplate(req.params.templateId, tenantId, req.body);
    if (!template) return res.status(404).json({ success: false, message: 'Template not found' });
    res.json({ success: true, data: template });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const publishTemplate = async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId;
    const template = await interviewTemplateService.publishTemplate(req.params.templateId, tenantId);
    if (!template) return res.status(404).json({ success: false, message: 'Template not found' });
    res.json({ success: true, data: template });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const archiveTemplate = async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId;
    const template = await interviewTemplateService.archiveTemplate(req.params.templateId, tenantId);
    if (!template) return res.status(404).json({ success: false, message: 'Template not found' });
    res.json({ success: true, data: template });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const duplicateTemplate = async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId;
    const userId = (req as any).userId;
    const template = await interviewTemplateService.duplicateTemplate(req.params.templateId, tenantId, userId);
    res.status(201).json({ success: true, data: template });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// ─── Question Bank ───────────────────────────────────────────────────────────

export const createQuestion = async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId;
    const userId = (req as any).userId;
    const question = await interviewTemplateService.createQuestion(req.body, tenantId, userId);
    res.status(201).json({ success: true, data: question });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const bulkCreateQuestions = async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId;
    const userId = (req as any).userId;
    const { questions } = req.body;
    if (!Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({ success: false, message: 'questions array is required' });
    }
    const created = await interviewTemplateService.bulkCreateQuestions(questions, tenantId, userId);
    res.status(201).json({ success: true, data: created, count: created.length });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const aiGenerateQuestions = async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId;
    const userId = (req as any).userId;
    let { specs, persist } = req.body;
    // Accept either { specs: [...] } or a single spec object in the body
    if (!Array.isArray(specs)) {
      specs = req.body && req.body.topic ? [req.body] : [];
    }
    if (!specs.length) {
      return res.status(400).json({ success: false, message: 'specs array (or a single spec) is required' });
    }
    const result = await interviewTemplateService.aiGenerateQuestions(specs, tenantId, userId, {
      persist: persist !== false,
    });
    if (!result.aiEnabled) {
      return res.status(503).json({ success: false, message: 'AI generation is not configured (ANTHROPIC_API_KEY missing).' });
    }
    res.status(201).json({ success: true, data: result.created, count: result.generated });
  } catch (error: any) {
    console.error('Error AI-generating interview questions:', error);
    res.status(400).json({ success: false, message: error.message });
  }
};

export const getQuestions = async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId;
    const { interviewCategory, questionType, topic, difficulty, roleTarget, experienceLevel, tags, isActive, search, page, limit } = req.query;
    const result = await interviewTemplateService.getQuestions(tenantId, {
      interviewCategory: interviewCategory as string,
      questionType: questionType as string,
      topic: topic as string,
      difficulty: difficulty as string,
      roleTarget: roleTarget as string,
      experienceLevel: experienceLevel as string,
      tags: tags ? (tags as string).split(',') : undefined,
      isActive: isActive !== undefined ? isActive === 'true' : undefined,
      search: search as string,
      page: page ? parseInt(page as string) : undefined,
      limit: limit ? parseInt(limit as string) : undefined,
    });
    res.json({ success: true, ...result });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getQuestionById = async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId;
    const question = await interviewTemplateService.getQuestionById(req.params.questionId, tenantId);
    if (!question) return res.status(404).json({ success: false, message: 'Question not found' });
    res.json({ success: true, data: question });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateQuestion = async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId;
    const question = await interviewTemplateService.updateQuestion(req.params.questionId, tenantId, req.body);
    if (!question) return res.status(404).json({ success: false, message: 'Question not found' });
    res.json({ success: true, data: question });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const deactivateQuestion = async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId;
    const question = await interviewTemplateService.deactivateQuestion(req.params.questionId, tenantId);
    if (!question) return res.status(404).json({ success: false, message: 'Question not found' });
    res.json({ success: true, data: question });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getQuestionTopics = async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId;
    const { category } = req.query;
    const topics = await interviewTemplateService.getQuestionTopics(tenantId, category as string);
    res.json({ success: true, data: topics });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getQuestionTags = async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId;
    const tags = await interviewTemplateService.getQuestionTags(tenantId);
    res.json({ success: true, data: tags });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── Assignment (Push-based) ─────────────────────────────────────────────────

export const pushAssignment = async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId;
    const userId = (req as any).userId;
    const { templateId, studentIds, pushReason, pushNote, dueDate, expiresAt, maxAttempts } = req.body;

    if (!templateId || !studentIds || !Array.isArray(studentIds) || studentIds.length === 0) {
      return res.status(400).json({ success: false, message: 'templateId and studentIds array required' });
    }

    const result = await interviewTemplateService.pushAssignment(
      templateId, studentIds, tenantId, userId,
      { pushReason, pushNote, dueDate: dueDate ? new Date(dueDate) : undefined, expiresAt: expiresAt ? new Date(expiresAt) : undefined, maxAttempts }
    );

    res.status(201).json({ success: true, ...result });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const pushAssignmentToBatch = async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId;
    const userId = (req as any).userId;
    const { templateId, batchIds, pushReason, pushNote, dueDate, expiresAt, maxAttempts } = req.body;

    if (!templateId || !batchIds || !Array.isArray(batchIds) || batchIds.length === 0) {
      return res.status(400).json({ success: false, message: 'templateId and batchIds array required' });
    }

    const result = await interviewTemplateService.pushAssignmentToBatch(
      templateId, batchIds, tenantId, userId,
      { pushReason, pushNote, dueDate: dueDate ? new Date(dueDate) : undefined, expiresAt: expiresAt ? new Date(expiresAt) : undefined, maxAttempts }
    );

    res.status(201).json({ success: true, ...result });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const pushAssignmentToCourse = async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId;
    const userId = (req as any).userId;
    const { templateId, courseIds, pushReason, pushNote, dueDate, expiresAt, maxAttempts } = req.body;

    if (!templateId || !courseIds || !Array.isArray(courseIds) || courseIds.length === 0) {
      return res.status(400).json({ success: false, message: 'templateId and courseIds array required' });
    }

    const result = await interviewTemplateService.pushAssignmentToCourse(
      templateId, courseIds, tenantId, userId,
      { pushReason, pushNote, dueDate: dueDate ? new Date(dueDate) : undefined, expiresAt: expiresAt ? new Date(expiresAt) : undefined, maxAttempts }
    );

    res.status(201).json({ success: true, ...result });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const getAssignments = async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId;
    const { studentId, templateId, assignedBy, status, page, limit } = req.query;
    const result = await interviewTemplateService.getAssignments(tenantId, {
      studentId: studentId as string,
      templateId: templateId as string,
      assignedBy: assignedBy as string,
      status: status as string,
      page: page ? parseInt(page as string) : undefined,
      limit: limit ? parseInt(limit as string) : undefined,
    });
    res.json({ success: true, ...result });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const cancelAssignment = async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId;
    const assignment = await interviewTemplateService.cancelAssignment(req.params.assignmentId, tenantId);
    if (!assignment) return res.status(404).json({ success: false, message: 'Assignment not found or not cancellable' });
    res.json({ success: true, data: assignment });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── Student Endpoints ───────────────────────────────────────────────────────

export const getStudentAssignments = async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId;
    const userId = (req as any).userId;
    const { status } = req.query;
    const assignments = await interviewTemplateService.getStudentAssignments(userId, tenantId, {
      status: status as string,
    });
    res.json({ success: true, data: assignments });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const startAttempt = async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId;
    const userId = (req as any).userId;
    const { templateId, assignmentId } = req.body;

    if (!templateId) {
      return res.status(400).json({ success: false, message: 'templateId is required' });
    }

    const attempt = await interviewTemplateService.startAttempt(templateId, userId, tenantId, assignmentId);
    await respondStudentAttempt(res, attempt, 201);
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const getAttempt = async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId;
    const attempt = await interviewTemplateService.getAttempt(req.params.attemptId, tenantId);
    if (!attempt) return res.status(404).json({ success: false, message: 'Attempt not found' });
    await respondStudentAttempt(res, attempt);
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const saveAnswer = async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId;
    const userId = (req as any).userId;
    const { sectionIndex, questionIndex, answerText, answerCode, selectedMCQOption, answerAudioUrl, responseTimeSeconds } = req.body;

    if (sectionIndex === undefined || questionIndex === undefined) {
      return res.status(400).json({ success: false, message: 'sectionIndex and questionIndex are required' });
    }

    const attempt = await interviewTemplateService.saveAnswer(
      req.params.attemptId, tenantId, userId, sectionIndex, questionIndex,
      { answerText, answerCode, selectedMCQOption, answerAudioUrl, responseTimeSeconds }
    );

    await respondStudentAttempt(res, attempt);
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const skipQuestion = async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId;
    const userId = (req as any).userId;
    const { sectionIndex, questionIndex } = req.body;

    const attempt = await interviewTemplateService.skipQuestion(
      req.params.attemptId, tenantId, userId, sectionIndex, questionIndex
    );

    await respondStudentAttempt(res, attempt);
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const completeSection = async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId;
    const userId = (req as any).userId;
    const { sectionIndex } = req.body;

    const attempt = await interviewTemplateService.completeSection(
      req.params.attemptId, tenantId, userId, sectionIndex
    );

    await respondStudentAttempt(res, attempt);
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const submitAttempt = async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId;
    const userId = (req as any).userId;

    const attempt = await interviewTemplateService.submitAttempt(
      req.params.attemptId, tenantId, userId
    );

    res.json({ success: true, data: attempt });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const evaluateAttempt = async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId;
    const userId = (req as any).userId;

    const attempt = await interviewTemplateService.evaluateAttempt(
      req.params.attemptId, tenantId, userId, req.body
    );

    res.json({ success: true, data: attempt });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const publishAttemptResult = async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId;

    const attempt = await interviewTemplateService.publishAttemptResult(
      req.params.attemptId, tenantId
    );
    if (!attempt) return res.status(404).json({ success: false, message: 'Attempt not found or not evaluatable' });

    res.json({ success: true, data: attempt });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const getStudentAttempts = async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId;
    const userId = (req as any).userId;
    const { templateId, status, page, limit } = req.query;

    const result = await interviewTemplateService.getStudentAttempts(userId, tenantId, {
      templateId: templateId as string,
      status: status as string,
      page: page ? parseInt(page as string) : undefined,
      limit: limit ? parseInt(limit as string) : undefined,
    });

    res.json({ success: true, ...result });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getAttemptReport = async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId;
    const userId = (req as any).userId;
    const userRole = (req as any).user?.role;

    // Students can only see their own reports; admins can see all
    const studentId = ['STUDENT'].includes(userRole) ? userId : undefined;

    const attempt = await interviewTemplateService.getAttemptReport(
      req.params.attemptId, tenantId, studentId
    );

    if (!attempt) return res.status(404).json({ success: false, message: 'Report not found or not yet published' });
    res.json({ success: true, data: attempt });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── Analytics ───────────────────────────────────────────────────────────────

export const getAdminAnalytics = async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId;
    const analytics = await interviewTemplateService.getAdminAnalytics(tenantId);
    res.json({ success: true, data: analytics });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getStudentAnalytics = async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId;
    const userId = (req as any).userId;
    const analytics = await interviewTemplateService.getStudentAnalytics(userId, tenantId);
    res.json({ success: true, data: analytics });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── Upload answer recording (audio/video per question) ──────────────────────

export const uploadAnswerRecording = async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId;
    const userId = (req as any).userId;
    const { attemptId } = req.params;
    const { sectionIndex, questionIndex } = req.body;
    const file = (req as any).file;

    if (!file) {
      return res.status(400).json({ success: false, message: 'No recording file uploaded' });
    }

    const fileUrl = `/uploads/interview-recordings/${file.filename}`;
    const isVideo = file.mimetype.startsWith('video/');

    // Save the media URL into the attempt via the existing saveAnswer method
    const answerData: any = {
      responseTimeSeconds: req.body.responseTimeSeconds ? parseInt(req.body.responseTimeSeconds) : undefined,
    };
    if (isVideo) {
      answerData.answerVideoUrl = fileUrl;
    } else {
      answerData.answerAudioUrl = fileUrl;
    }

    const attempt = await interviewTemplateService.saveAnswer(
      attemptId,
      tenantId,
      userId,
      parseInt(sectionIndex),
      parseInt(questionIndex),
      answerData
    );

    res.json({
      success: true,
      data: attempt,
      fileUrl,
      fileType: isVideo ? 'video' : 'audio',
      fileSize: file.size,
    });
  } catch (error: any) {
    console.error('Error uploading answer recording:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};
