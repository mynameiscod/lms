import { Request, Response } from 'express';
import crypto from 'crypto';
import PublicQuizSubmission from '../models/PublicQuizSubmission';
import WeekConfig from '../models/WeekConfig';
import Tenant from '../models/Tenant';
import Quiz from '../models/Quiz';
import Question from '../models/Question';
import { EmailService } from '../services/emailService';

const emailService = new EmailService();

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function gradeAnswer(question: any, selectedOptions: string[]): { isCorrect: boolean; marksAwarded: number } {
  if (question.type !== 'mcq_single' && question.type !== 'mcq_multiple') {
    return { isCorrect: false, marksAwarded: 0 };
  }

  const resolveOption = (ref: any): string => {
    const s = String(ref ?? '').trim();
    if (!isNaN(Number(s)) && Array.isArray(question.options)) {
      const idx = parseInt(s);
      const opt = question.options[idx];
      if (opt !== undefined) return typeof opt === 'string' ? opt.trim() : (opt?.text?.trim() || s);
    }
    return s;
  };

  const normalizedSelected = selectedOptions.map(o => resolveOption(o)).filter(Boolean).sort();

  let correctTexts: string[] = [];
  if (question.correctAnswers?.length) {
    correctTexts = question.correctAnswers.map((a: any) => resolveOption(a)).filter(Boolean).sort();
  } else if (Array.isArray(question.options)) {
    correctTexts = question.options
      .filter((o: any) => typeof o === 'object' && o.isCorrect)
      .map((o: any) => o.text?.trim() || '')
      .filter(Boolean)
      .sort();
  }

  const isCorrect =
    normalizedSelected.length > 0 &&
    correctTexts.length > 0 &&
    JSON.stringify(normalizedSelected) === JSON.stringify(correctTexts);

  return { isCorrect, marksAwarded: isCorrect ? (question.marks || 1) : 0 };
}

/** Recompute ranks for all finishers in a week. Sort: score DESC → timeSpentSeconds ASC */
async function computeWeekRanks(tenantId: string, weekLabel: string): Promise<void> {
  const submissions = await PublicQuizSubmission.find({
    tenantId,
    weekLabel,
    quizCompletedAt: { $exists: true },
    score: { $exists: true }
  }).select('_id score timeSpentSeconds');

  submissions.sort((a, b) => {
    const scoreDiff = (b.score ?? 0) - (a.score ?? 0);
    if (scoreDiff !== 0) return scoreDiff;
    return (a.timeSpentSeconds ?? 999999) - (b.timeSpentSeconds ?? 999999);
  });

  if (!submissions.length) return;

  await PublicQuizSubmission.bulkWrite(
    submissions.map((s, i) => ({
      updateOne: { filter: { _id: s._id }, update: { $set: { rank: i + 1 } } }
    }))
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// WEBSITE INTEGRATION (public, no auth)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * POST /api/v1/public/:tenantSlug/weekly-quiz-register
 * Body (multipart): { name, email, phone, weekLabel?, [extra fields + files] }
 */
export const registerForWeeklyQuizFromWebsite = async (req: Request, res: Response) => {
  try {
    const { tenantSlug } = req.params;
    const tenant = await Tenant.findOne({ slug: tenantSlug });
    if (!tenant) return res.status(404).json({ message: 'Organization not found' });

    const { name, email, phone, weekLabel, ...extraFields } = req.body as Record<string, any>;
    if (!email) return res.status(400).json({ message: 'email is required' });
    if (!name)  return res.status(400).json({ message: 'name is required' });

    const normalizedEmail = String(email).trim().toLowerCase();
    const tenantId = tenant._id.toString();

    const files = (req as any).files as Array<{ fieldname: string; filename: string; mimetype: string; originalname: string }> || [];
    const uploadedFiles = files.map(f => ({
      fieldName:    f.fieldname,
      filePath:     `/uploads/registrations/${f.filename}`,
      mimeType:     f.mimetype,
      originalName: f.originalname
    }));

    const registrationData: Record<string, any> = { name, email: normalizedEmail, phone: phone || '', ...extraFields };

    // Duplicate: same email + same weekLabel
    const dupQuery: any = { tenantId, email: normalizedEmail };
    if (weekLabel) dupQuery.weekLabel = weekLabel.trim();
    const existing = await PublicQuizSubmission.findOne(dupQuery);
    if (existing) {
      return res.status(200).json({ success: true, alreadyRegistered: true, message: 'You are already registered!' });
    }

    const submission = new PublicQuizSubmission({
      tenantId,
      email:            normalizedEmail,
      name:             String(name).trim(),
      registrationData,
      weekLabel:        weekLabel ? String(weekLabel).trim() : undefined,
      isPreRegistration:!weekLabel,
      uploadedFiles,
      ipAddress:  req.ip,
      userAgent:  req.headers['user-agent'] || ''
    });
    await submission.save();

    return res.status(201).json({ success: true, message: 'Registration successful! We will review your details and contact you soon.' });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// PUBLIC QUIZ BY TOKEN (no auth — token IS the credential)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /api/v1/public/quiz/:token
 * Returns quiz questions. Sets quizStartedAt on first access.
 */
export const getQuizByToken = async (req: Request, res: Response) => {
  try {
    const submission = await PublicQuizSubmission.findOne({ quizToken: req.params.token });
    if (!submission) return res.status(404).json({ message: 'Invalid quiz link.', code: 'NOT_FOUND' });
    if (submission.isApproved !== true) return res.status(403).json({ message: 'Your registration is not yet approved.', code: 'NOT_APPROVED' });
    if (submission.quizCompletedAt) return res.status(403).json({ message: 'You have already submitted this quiz.', code: 'ALREADY_SUBMITTED' });

    // Time-lock: check if quiz is scheduled for a future time
    if (submission.weekLabel) {
      const weekConfig = await WeekConfig.findOne({ tenantId: submission.tenantId, weekLabel: submission.weekLabel });
      if (weekConfig?.eventDate && new Date() < weekConfig.eventDate) {
        return res.status(403).json({
          code: 'NOT_YET',
          message: 'Quiz is not open yet.',
          opensAt: weekConfig.eventDate,
          eventTimeIST: weekConfig.eventTimeIST || '',
        });
      }
    }

    const quiz = await Quiz.findById(submission.quizId).select('title totalMarks totalTime passPercentage passingMarks shuffleQuestions instructions');
    if (!quiz) return res.status(404).json({ message: 'Quiz not found.', code: 'QUIZ_NOT_FOUND' });

    // Set startedAt on first open
    if (!submission.quizStartedAt) {
      submission.quizStartedAt = new Date();
      await submission.save();
    }

    // Load questions
    let questions: any[] = [];
    if ((quiz as any).questionIds?.length) {
      questions = await Question.find({ _id: { $in: (quiz as any).questionIds } }).select('-explanation -__v');
    } else {
      questions = await Question.find({ quizId: quiz._id.toString() }).select('-explanation -__v');
    }

    if ((quiz as any).shuffleQuestions) {
      questions = questions.sort(() => Math.random() - 0.5);
    }

    // Strip correct answers; keep options as { text } objects for the client
    const sanitized = questions.map(q => {
      const obj = q.toObject();
      delete obj.explanation;
      if (Array.isArray(obj.options)) {
        obj.options = obj.options.map((o: any) =>
          typeof o === 'string' ? { text: o } : { text: o?.text || String(o) }
        );
      }
      delete obj.correctAnswers;
      delete obj.correctAnswerText;
      return obj;
    });

    res.json({
      // field names the QuizSession component expects
      candidate:      { name: submission.name, email: submission.email },
      candidateName:  submission.name,        // backward compat
      quizToken:      req.params.token,
      quizStartedAt:  submission.quizStartedAt,
      startedAt:      submission.quizStartedAt, // backward compat
      quiz: {
        title:        quiz.title,
        timeLimit:    (quiz as any).totalTime,  // component uses timeLimit
        totalTime:    (quiz as any).totalTime,
        totalMarks:   quiz.totalMarks,
        instructions: (quiz as any).instructions || ''
      },
      questions: sanitized
    });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

/**
 * POST /api/v1/public/quiz/:token/submit
 * Body: { answers: [{ questionId, selectedOptions: string[] }] }
 */
export const submitQuizByToken = async (req: Request, res: Response) => {
  try {
    const submission = await PublicQuizSubmission.findOne({ quizToken: req.params.token });
    if (!submission) return res.status(404).json({ message: 'Invalid quiz link.', code: 'NOT_FOUND' });
    if (submission.isApproved !== true) return res.status(403).json({ message: 'Not approved.', code: 'NOT_APPROVED' });
    if (submission.quizCompletedAt) return res.status(403).json({ message: 'Already submitted.', code: 'ALREADY_SUBMITTED' });

    const quiz = await Quiz.findById(submission.quizId).select('totalMarks passPercentage passingMarks questionIds');
    if (!quiz) return res.status(404).json({ message: 'Quiz not found.' });

    const { answers = [] } = req.body as { answers: Array<{ questionId: string; selectedOptions: string[] }> };

    let obtainedMarks = 0;
    const gradedAnswers: any[] = [];

    for (const answer of answers) {
      const question = await Question.findById(answer.questionId);
      if (!question) continue;

      const selected = Array.isArray(answer.selectedOptions)
        ? answer.selectedOptions.map(o => String(o).trim())
        : [];

      const { isCorrect, marksAwarded } = gradeAnswer(question, selected);
      obtainedMarks += marksAwarded;

      gradedAnswers.push({
        questionId:      answer.questionId,
        selectedOptions: selected,
        isCorrect,
        marksAwarded
      });
    }

    const now = new Date();
    const startedAt = submission.quizStartedAt || now;
    const timeSpentSeconds = Math.floor((now.getTime() - startedAt.getTime()) / 1000);
    const percentage = quiz.totalMarks > 0 ? (obtainedMarks / quiz.totalMarks) * 100 : 0;
    const passed = (quiz as any).passPercentage
      ? percentage >= (quiz as any).passPercentage
      : (quiz as any).passingMarks
        ? obtainedMarks >= (quiz as any).passingMarks
        : false;

    submission.quizCompletedAt  = now;
    submission.timeSpentSeconds = timeSpentSeconds;
    submission.score      = obtainedMarks;
    submission.totalMarks = quiz.totalMarks;
    submission.percentage = percentage;
    submission.passed     = passed;
    await submission.save();

    // Recompute ranks for this week
    if (submission.weekLabel) {
      await computeWeekRanks(submission.tenantId, submission.weekLabel);
      const updated = await PublicQuizSubmission.findById(submission._id).select('rank');
      submission.rank = updated?.rank;
    }

    const mins = Math.floor(timeSpentSeconds / 60);
    const secs = timeSpentSeconds % 60;

    res.json({
      score:       obtainedMarks,
      totalMarks:  quiz.totalMarks,
      percentage:  Math.round(percentage),
      passed,
      rank:        (submission as any).rank ?? null,
      timeSpent:   `${mins}m ${secs}s`,
      message:     'Quiz submitted successfully!'
    });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN — WEEK CONFIG
// ─────────────────────────────────────────────────────────────────────────────

/** GET /api/public-quizzes/all-batch-configs — all configured batches for tenant */
export const getAllBatchConfigs = async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).user?.tenantId;
    const configs = await WeekConfig.find({ tenantId }).sort({ createdAt: -1 });

    // Attach quiz info for each config
    const enriched = await Promise.all(
      configs.map(async (cfg: any) => {
        const quiz = cfg.quizId
          ? await Quiz.findById(cfg.quizId).select('title totalQuestions totalMarks totalTime')
          : null;
        return { ...cfg.toObject(), quiz };
      })
    );

    res.json(enriched);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

/** GET /api/public-quizzes/week-config?weekLabel=Week+1 */
export const getWeekConfig = async (req: Request, res: Response) => {
  try {
    const tenantId  = (req as any).user?.tenantId;
    const weekLabel = String(req.query.weekLabel || '');
    if (!weekLabel) return res.status(400).json({ message: 'weekLabel is required' });

    const config = await WeekConfig.findOne({ tenantId, weekLabel });
    if (!config) return res.json(null);

    const quiz = config.quizId
      ? await Quiz.findById(config.quizId).select('title totalQuestions totalMarks totalTime')
      : null;

    res.json({ ...config.toObject(), quiz });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

/** PUT /api/public-quizzes/week-config  — upsert */
export const setWeekConfig = async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).user?.tenantId;
    const { weekLabel, quizId, topperCount, eventTitle, eventDate, eventTimeIST, techBattleUrl } = req.body;
    if (!weekLabel || !quizId) return res.status(400).json({ message: 'weekLabel and quizId are required' });

    const update: any = { quizId, topperCount: topperCount || 3 };
    if (eventTitle)    update.eventTitle    = eventTitle;
    if (eventDate)     update.eventDate     = new Date(eventDate);
    if (eventTimeIST)  update.eventTimeIST  = eventTimeIST;
    if (techBattleUrl) update.techBattleUrl = techBattleUrl;

    const config = await WeekConfig.findOneAndUpdate(
      { tenantId, weekLabel },
      { $set: update },
      { upsert: true, new: true }
    );

    // Backfill quiz tokens for already-approved students who were approved before this config was saved
    const needsToken = await PublicQuizSubmission.find({
      tenantId,
      weekLabel,
      isApproved: true,
      $or: [{ quizToken: { $exists: false } }, { quizToken: '' }, { quizToken: null }],
    }).select('_id');

    if (needsToken.length > 0) {
      await PublicQuizSubmission.bulkWrite(
        needsToken.map(s => ({
          updateOne: {
            filter: { _id: s._id },
            update: { $set: { quizId, quizToken: crypto.randomUUID() } },
          },
        }))
      );
    }

    res.json({ ...config.toObject(), tokenizedCount: needsToken.length });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN — LEADERBOARD
// ─────────────────────────────────────────────────────────────────────────────

/** GET /api/public-quizzes/leaderboard?weekLabel=Week+1 */
export const getLeaderboard = async (req: Request, res: Response) => {
  try {
    const tenantId  = (req as any).user?.tenantId;
    const weekLabel = String(req.query.weekLabel || '');
    if (!weekLabel) return res.status(400).json({ message: 'weekLabel is required' });

    const config = await WeekConfig.findOne({ tenantId, weekLabel });
    const topperCount = config?.topperCount || 3;

    const toppers = await PublicQuizSubmission.find({
      tenantId,
      weekLabel,
      quizCompletedAt: { $exists: true },
      rank: { $exists: true }
    })
      .sort({ rank: 1 })
      .limit(topperCount)
      .select('name email rank score totalMarks percentage passed timeSpentSeconds quizCompletedAt');

    res.json({ toppers, topperCount, weekLabel });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN — REGISTRATIONS
// ─────────────────────────────────────────────────────────────────────────────

/** GET /api/public-quizzes/all-registrations */
export const getAllRegistrations = async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).user?.tenantId;
    const { page = 1, limit = 100, search = '', week = '' } = req.query;

    const query: any = { tenantId };
    if (search) {
      const re = new RegExp(String(search), 'i');
      query.$or = [{ name: re }, { email: re }];
    }
    if (String(week) === '__pre__') {
      query.isPreRegistration = true;
    } else if (week) {
      query.weekLabel = String(week);
    }

    const total = await PublicQuizSubmission.countDocuments(query);
    const submissions = await PublicQuizSubmission.find(query)
      .sort({ createdAt: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit));

    const weekLabels = await PublicQuizSubmission.distinct('weekLabel', {
      tenantId, weekLabel: { $exists: true, $ne: '' }
    });

    res.json({ submissions, total, page: Number(page), limit: Number(limit), weekLabels });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

/** GET /api/public-quizzes/registrations/:subId */
export const getRegistrationDetail = async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).user?.tenantId;
    const submission = await PublicQuizSubmission.findOne({ _id: req.params.subId, tenantId });
    if (!submission) return res.status(404).json({ message: 'Not found' });

    // Attach quiz info if assigned
    let quizInfo = null;
    if (submission.quizId) {
      quizInfo = await Quiz.findById(submission.quizId).select('title totalMarks totalTime');
    }

    res.json({ ...submission.toObject(), quizInfo });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

/** PUT /api/public-quizzes/registrations/:subId/approve */
export const approveRegistration = async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).user?.tenantId;
    const userId   = (req as any).user?.id;

    const submission = await PublicQuizSubmission.findOne({ _id: req.params.subId, tenantId });
    if (!submission) return res.status(404).json({ message: 'Not found' });

    // Look up the week's quiz assignment
    let quizToken: string | undefined;
    let quizId: string | undefined;

    if (submission.weekLabel) {
      const weekConfig = await WeekConfig.findOne({ tenantId, weekLabel: submission.weekLabel });
      if (weekConfig?.quizId) {
        quizId    = weekConfig.quizId;
        quizToken = crypto.randomUUID();
      }
    }

    submission.isApproved      = true;
    submission.approvedBy      = userId;
    submission.approvedAt      = new Date();
    submission.rejectionReason = undefined;
    if (quizId)    submission.quizId    = quizId;
    if (quizToken) submission.quizToken = quizToken;

    await submission.save();

    // Build quiz URL
    const frontendBase = process.env.FRONTEND_URL || 'https://platform.codebegun.com';
    const quizUrl = quizToken ? `${frontendBase}/quiz/${quizToken}` : null;

    // Send approval confirmation email (non-blocking)
    const weekConfig = submission.weekLabel
      ? await WeekConfig.findOne({ tenantId, weekLabel: submission.weekLabel })
      : null;

    // Send confirmation email WITHOUT quiz link (quiz opens at scheduled time)
    emailService.sendTechBattleApprovalEmail({
      email:        submission.email,
      name:         submission.name,
      quizUrl:      '',  // No link yet — student will receive it when quiz goes live
      eventTitle:   weekConfig?.eventTitle || 'Weekly Tech Battle',
      eventDate:    weekConfig?.eventDate,
      eventTimeIST: weekConfig?.eventTimeIST,
      techBattleUrl:weekConfig?.techBattleUrl,
    }).catch(() => {/* non-fatal */});

    res.json({ success: true, message: 'Registration approved.', quizUrl, quizToken, hasQuiz: !!quizToken });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

/** PUT /api/public-quizzes/registrations/:subId/reject */
export const rejectRegistration = async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).user?.tenantId;
    const { reason } = req.body;

    const submission = await PublicQuizSubmission.findOne({ _id: req.params.subId, tenantId });
    if (!submission) return res.status(404).json({ message: 'Not found' });

    submission.isApproved      = false;
    submission.rejectionReason = reason || 'Rejected by admin';
    await submission.save();

    res.json({ success: true, message: 'Registration rejected.' });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

/**
 * PUT /api/public-quizzes/registrations/:subId/generate-link
 * Directly assigns a quiz to any registration (approved or not) and generates/regenerates a quiz token.
 * Body: { quizId, weekLabel? }
 * Used when:
 *  - Student was approved before week config was saved (no token generated)
 *  - Student is Pre-Reg and admin wants to assign a quiz directly
 */
export const generateQuizLink = async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).user?.tenantId;
    const userId   = (req as any).user?.id;
    const { quizId, weekLabel } = req.body;

    if (!quizId) return res.status(400).json({ message: 'quizId is required' });

    const quiz = await Quiz.findOne({ _id: quizId, tenantId });
    if (!quiz) return res.status(404).json({ message: 'Quiz not found' });

    const submission = await PublicQuizSubmission.findOne({ _id: req.params.subId, tenantId });
    if (!submission) return res.status(404).json({ message: 'Registration not found' });

    const quizToken = crypto.randomUUID();

    submission.isApproved = true;
    submission.approvedBy = userId;
    submission.approvedAt = new Date();
    submission.quizId     = quizId;
    submission.quizToken  = quizToken;
    if (weekLabel) {
      submission.weekLabel        = String(weekLabel).trim();
      submission.isPreRegistration = false;
    }

    await submission.save();

    const frontendBase = process.env.FRONTEND_URL || 'https://platform.codebegun.com';
    const quizUrl      = `${frontendBase}/quiz/${quizToken}`;

    // Look up week config for event details (non-blocking email)
    const wkLabel = weekLabel || submission.weekLabel;
    const wCfg    = wkLabel ? await WeekConfig.findOne({ tenantId, weekLabel: wkLabel }) : null;

    emailService.sendTechBattleApprovalEmail({
      email:        submission.email,
      name:         submission.name,
      quizUrl,
      eventTitle:   wCfg?.eventTitle || 'Weekly Tech Battle',
      eventDate:    wCfg?.eventDate,
      eventTimeIST: wCfg?.eventTimeIST,
      techBattleUrl:wCfg?.techBattleUrl,
    }).catch(() => {/* non-fatal */});

    res.json({ success: true, quizUrl, quizToken });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN — Available quizzes list (for week-config dropdown)
// ─────────────────────────────────────────────────────────────────────────────

/** GET /api/public-quizzes/available-quizzes */
export const getAvailableQuizzes = async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).user?.tenantId;
    const quizzes  = await Quiz.find({ tenantId, isActive: true })
      .select('title totalQuestions totalMarks totalTime')
      .sort({ createdAt: -1 });
    res.json(quizzes);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN — Send quiz links to all approved students in a week
// ─────────────────────────────────────────────────────────────────────────────

/**
 * POST /api/public-quizzes/send-quiz-links
 * Body: { weekLabel }
 * Sends the quiz URL to every approved student in the week who has a quizToken.
 */
export const sendWeekQuizLinks = async (req: Request, res: Response) => {
  try {
    const tenantId  = (req as any).user?.tenantId;
    const { weekLabel } = req.body;
    if (!weekLabel) return res.status(400).json({ message: 'weekLabel is required' });

    const weekConfig = await WeekConfig.findOne({ tenantId, weekLabel });
    if (!weekConfig) return res.status(404).json({ message: 'Week not configured. Save the week config first.' });

    const frontendBase = process.env.FRONTEND_URL || 'https://platform.codebegun.com';

    // Backfill tokens for approved students who were approved before the week config existed
    const needsToken = await PublicQuizSubmission.find({
      tenantId,
      weekLabel,
      isApproved: true,
      $or: [{ quizToken: { $exists: false } }, { quizToken: '' }, { quizToken: null }],
    }).select('_id');

    if (needsToken.length > 0) {
      await PublicQuizSubmission.bulkWrite(
        needsToken.map(s => ({
          updateOne: {
            filter: { _id: s._id },
            update: { $set: { quizId: weekConfig.quizId, quizToken: crypto.randomUUID() } },
          },
        }))
      );
    }

    // Find all approved students in this week who have a quiz token
    const submissions = await PublicQuizSubmission.find({
      tenantId,
      weekLabel,
      isApproved: true,
      quizToken:  { $exists: true, $ne: '' },
    }).select('email name quizToken');

    let sent = 0;
    for (const sub of submissions) {
      const quizUrl = `${frontendBase}/quiz/${sub.quizToken}`;
      await emailService.sendTechBattleApprovalEmail({
        email:        sub.email,
        name:         sub.name,
        quizUrl,
        eventTitle:   weekConfig.eventTitle || 'Weekly Tech Battle',
        eventDate:    weekConfig.eventDate,
        eventTimeIST: weekConfig.eventTimeIST,
        techBattleUrl:weekConfig.techBattleUrl,
      }).catch(() => {/* non-fatal */});
      sent++;
    }

    res.json({ success: true, sent, total: submissions.length });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};
