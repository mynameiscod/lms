import { Request, Response } from 'express';
import crypto from 'crypto';
import mongoose from 'mongoose';
import PublicQuizConfig from '../models/PublicQuizConfig';
import PublicQuizSubmission from '../models/PublicQuizSubmission';
import Quiz from '../models/Quiz';
import Question from '../models/Question';
import QuizAttempt from '../models/QuizAttempt';
import QuizSubmission from '../models/QuizSubmission';
import Lead from '../models/Lead';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Evaluate soft eligibility for a registration form submission */
function evaluateEligibility(fields: any[], registrationData: Record<string, any>) {
  const flags: any[] = [];

  for (const field of fields) {
    if (!field.eligibilityRule) continue;
    const { operator, value: ruleValue } = field.eligibilityRule;
    const userValue = String(registrationData[field.id] ?? '').trim();
    let passes = false;

    switch (operator) {
      case 'eq': passes = userValue.toLowerCase() === String(ruleValue).toLowerCase(); break;
      case 'neq': passes = userValue.toLowerCase() !== String(ruleValue).toLowerCase(); break;
      case 'contains': passes = userValue.toLowerCase().includes(String(ruleValue).toLowerCase()); break;
      case 'lt': passes = parseFloat(userValue) < parseFloat(ruleValue); break;
      case 'lte': passes = parseFloat(userValue) <= parseFloat(ruleValue); break;
      case 'gt': passes = parseFloat(userValue) > parseFloat(ruleValue); break;
      case 'gte': passes = parseFloat(userValue) >= parseFloat(ruleValue); break;
      default: passes = true;
    }

    if (!passes) {
      flags.push({
        fieldId: field.id,
        fieldLabel: field.label,
        value: userValue,
        rule: `must be ${operator} "${ruleValue}"`
      });
    }
  }

  return flags;
}

/** Grade a single MCQ answer — mirrors quizService.submitQuizAttempt logic */
function gradeAnswer(question: any, selectedOptions: string[]): { isCorrect: boolean; marksAwarded: number } {
  if (question.type !== 'mcq_single' && question.type !== 'mcq_multiple') {
    return { isCorrect: false, marksAwarded: 0 };
  }

  const normalizedSelected = selectedOptions
    .map(o => String(o || '').trim())
    .filter(Boolean)
    .sort();

  let correctAnswerTexts: string[] = [];
  if (question.correctAnswers && question.correctAnswers.length > 0) {
    correctAnswerTexts = question.correctAnswers
      .map((ans: any) => {
        const ansStr = String(ans).trim();
        if (!isNaN(Number(ansStr))) {
          const idx = parseInt(ansStr);
          const opt = Array.isArray(question.options) ? question.options[idx] : undefined;
          return typeof opt === 'string' ? opt.trim() : (opt?.text?.trim() || '');
        }
        return ansStr;
      })
      .filter(Boolean)
      .sort();
  }

  const isCorrect =
    normalizedSelected.length > 0 &&
    correctAnswerTexts.length > 0 &&
    JSON.stringify(normalizedSelected) === JSON.stringify(correctAnswerTexts);

  return { isCorrect, marksAwarded: isCorrect ? question.marks : 0 };
}

/** Resolve correct answer text for display (index-safe) */
function resolveCorrectAnswerText(question: any): string {
  const opts: any[] = question.options || [];
  const correctOpt = opts.find((o: any) => typeof o === 'object' && o.isCorrect);
  if (correctOpt) return correctOpt.text || '';

  if (question.correctAnswers && question.correctAnswers.length > 0) {
    return question.correctAnswers.map((ans: any) => {
      const idx = parseInt(String(ans));
      if (!isNaN(idx) && opts[idx] !== undefined) {
        const opt = opts[idx];
        return typeof opt === 'string' ? opt : (opt?.text || ans);
      }
      return ans;
    }).join(', ');
  }
  return question.correctAnswerText || '';
}

// ─────────────────────────────────────────────────────────────────────────────
// PUBLIC ENDPOINTS (no auth)
// ─────────────────────────────────────────────────────────────────────────────

/** GET /api/public-quiz/:slug  — landing page + form config */
export const getPublicQuizPage = async (req: Request, res: Response) => {
  try {
    const config = await PublicQuizConfig.findOne({ slug: req.params.slug, isActive: true });
    if (!config) return res.status(404).json({ message: 'Quiz not found or not available' });

    const quiz = await Quiz.findById(config.quizId).select('title totalQuestions totalMarks totalTime description');
    if (!quiz) return res.status(404).json({ message: 'Quiz not found' });

    res.json({
      configId: config._id,
      slug: config.slug,
      title: config.title,
      quiz: {
        title: quiz.title,
        description: quiz.description,
        totalQuestions: quiz.totalQuestions,
        totalMarks: quiz.totalMarks,
        totalTime: quiz.totalTime
      },
      landingPage: config.landingPage,
      registrationForm: config.registrationForm,
      resultSettings: {
        showScore: config.resultSettings.showScore,
        showAnswers: config.resultSettings.showAnswers,
        showCertificate: config.resultSettings.showCertificate,
        showThankYouMessage: config.resultSettings.showThankYouMessage,
        thankYouMessage: config.resultSettings.thankYouMessage
      }
    });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

/** POST /api/public-quiz/:slug/register  — submit registration form */
export const registerForPublicQuiz = async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;
    const registrationData: Record<string, any> = req.body;

    const config = await PublicQuizConfig.findOne({ slug, isActive: true });
    if (!config) return res.status(404).json({ message: 'Quiz not found or not available' });

    // Extract name + email from registrationData (fields labeled 'name'/'email' or first text/email field)
    let email = '';
    let name = '';
    for (const field of config.registrationForm.fields) {
      const val = registrationData[field.id] || '';
      if (field.type === 'email' || field.label.toLowerCase().includes('email')) email = String(val).trim().toLowerCase();
      if (field.label.toLowerCase().includes('name') && !name) name = String(val).trim();
    }
    if (!email) return res.status(400).json({ message: 'Email is required in registration form' });
    if (!name) name = email;

    // Check prior submissions
    const priorSubmissions = await PublicQuizSubmission.find({
      publicQuizConfigId: config._id,
      email
    }).sort({ createdAt: 1 });

    const attemptNumber = priorSubmissions.length + 1;
    const canTakeQuiz = priorSubmissions.filter(s => s.canTakeQuiz === false || s.quizAttemptId).length === 0;

    // Soft eligibility check
    const eligibilityFlags = evaluateEligibility(config.registrationForm.fields, registrationData);
    const eligibilityStatus = eligibilityFlags.length > 0 ? 'flagged' : 'qualified';

    // Create submission record
    const submission = new PublicQuizSubmission({
      publicQuizConfigId: config._id,
      quizId: config.quizId.toString(),
      tenantId: config.tenantId,
      email,
      name,
      registrationData,
      eligibilityStatus,
      eligibilityFlags,
      attemptNumber,
      canTakeQuiz,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'] || ''
    });
    await submission.save();

    // Increment config total
    await PublicQuizConfig.findByIdAndUpdate(config._id, { $inc: { totalSubmissions: 1 } });

    if (!canTakeQuiz) {
      return res.status(200).json({
        canTakeQuiz: false,
        message: 'You have already taken this quiz. Your form submission has been recorded.',
        submissionId: submission._id
      });
    }

    res.json({
      canTakeQuiz: true,
      submissionId: submission._id,
      eligibilityStatus,
      message: eligibilityStatus === 'flagged'
        ? 'You can proceed with the quiz. Note: some eligibility criteria were not met.'
        : 'Registration successful. You may now begin the quiz.'
    });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

/** GET /api/public-quiz/session/:submissionId/questions  — get quiz questions */
export const getPublicQuizQuestions = async (req: Request, res: Response) => {
  try {
    const submission = await PublicQuizSubmission.findById(req.params.submissionId);
    if (!submission) return res.status(404).json({ message: 'Session not found' });
    if (!submission.canTakeQuiz) return res.status(403).json({ message: 'You have already completed this quiz' });

    const config = await PublicQuizConfig.findById(submission.publicQuizConfigId);
    if (!config || !config.isActive) return res.status(404).json({ message: 'Quiz not available' });

    const quiz = await Quiz.findById(submission.quizId);
    if (!quiz) return res.status(404).json({ message: 'Quiz not found' });

    // Get questions — either from questionIds or legacy
    let questions: any[] = [];
    if (quiz.questionIds && quiz.questionIds.length > 0) {
      questions = await Question.find({ _id: { $in: quiz.questionIds } })
        .select('-explanation -__v');
    } else {
      questions = await Question.find({ quizId: quiz._id }).select('-explanation -__v');
    }

    if (quiz.shuffleQuestions) {
      questions = questions.sort(() => Math.random() - 0.5);
    }

    // Strip isCorrect from options
    const sanitized = questions.map(q => {
      const qObj = q.toObject();
      delete qObj.explanation;
      if (Array.isArray(qObj.options)) {
        qObj.options = qObj.options.map((o: any) =>
          typeof o === 'string' ? o : (o?.text || '')
        );
      }
      if (qObj.correctAnswers) delete qObj.correctAnswers;
      if (qObj.correctAnswerText) delete qObj.correctAnswerText;
      return qObj;
    });

    res.json({
      questions: sanitized,
      quiz: {
        title: quiz.title,
        totalTime: quiz.totalTime,
        totalMarks: quiz.totalMarks,
        shuffleQuestions: quiz.shuffleQuestions,
        showAnswersAfterSubmit: quiz.showAnswersAfterSubmit
      }
    });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

/** POST /api/public-quiz/session/:submissionId/submit  — submit quiz */
export const submitPublicQuiz = async (req: Request, res: Response) => {
  try {
    const submission = await PublicQuizSubmission.findById(req.params.submissionId);
    if (!submission) return res.status(404).json({ message: 'Session not found' });
    if (!submission.canTakeQuiz) return res.status(403).json({ message: 'Already submitted' });
    if (submission.quizAttemptId) return res.status(403).json({ message: 'Already submitted' });

    const { answers, timeSpent } = req.body; // answers: [{questionId, selectedOptions: []}]

    const quiz = await Quiz.findById(submission.quizId);
    if (!quiz) return res.status(404).json({ message: 'Quiz not found' });

    // Create a QuizAttempt record (studentId = submissionId since no user account)
    const attempt = new QuizAttempt({
      quizId: quiz._id.toString(),
      studentId: submission._id.toString(), // virtual student identifier
      tenantId: submission.tenantId,
      attemptNo: 1,
      startedAt: new Date(Date.now() - (timeSpent || 0) * 1000),
      submittedAt: new Date(),
      status: 'submitted',
      totalMarks: quiz.totalMarks,
      timeSpent: timeSpent || 0,
      questionsAnswered: answers.length,
      shareToken: crypto.randomUUID()
    });

    let obtainedMarks = 0;
    const gradedAnswers: any[] = [];

    for (const answer of answers) {
      const question = await Question.findById(answer.questionId);
      if (!question) continue;

      const selectedOptions: string[] = Array.isArray(answer.selectedOptions)
        ? answer.selectedOptions.map((o: any) => String(o).trim())
        : [];

      const { isCorrect, marksAwarded } = gradeAnswer(question, selectedOptions);
      obtainedMarks += marksAwarded;

      gradedAnswers.push({
        questionId: answer.questionId,
        isCorrect,
        marksAwarded,
        selectedOptions,
        correctAnswer: resolveCorrectAnswerText(question)
      });

      await new QuizSubmission({
        quizAttemptId: attempt._id.toString(),
        quizId: quiz._id.toString(),
        questionId: answer.questionId,
        studentId: submission._id.toString(),
        tenantId: submission.tenantId,
        questionNo: answer.questionNo || 1,
        questionType: question.type,
        studentAnswer: selectedOptions.join(', '),
        selectedOptions,
        isCorrect,
        marksAwarded
      }).save();
    }

    const percentage = quiz.totalMarks > 0 ? (obtainedMarks / quiz.totalMarks) * 100 : 0;
    const passed = quiz.passPercentage ? percentage >= quiz.passPercentage : (quiz.passingMarks ? obtainedMarks >= quiz.passingMarks : false);

    attempt.obtainedMarks = obtainedMarks;
    attempt.percentage = percentage;
    attempt.passed = passed;
    await attempt.save();

    // Lock submission from re-taking and store result
    submission.canTakeQuiz = false;
    submission.quizAttemptId = attempt._id as unknown as mongoose.Types.ObjectId;
    submission.score = obtainedMarks;
    submission.totalMarks = quiz.totalMarks;
    submission.percentage = percentage;
    submission.passed = passed;
    submission.completedAt = new Date();
    submission.shareToken = attempt.shareToken;
    await submission.save();

    res.json({
      submissionId: submission._id,
      shareToken: attempt.shareToken,
      score: obtainedMarks,
      totalMarks: quiz.totalMarks,
      percentage: Math.round(percentage),
      passed,
      message: 'Quiz submitted successfully'
    });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

/** GET /api/public-quiz/session/:submissionId/results  — get detailed results */
export const getPublicQuizResults = async (req: Request, res: Response) => {
  try {
    const submission = await PublicQuizSubmission.findById(req.params.submissionId).lean();
    if (!submission) return res.status(404).json({ message: 'Session not found' });
    if (!submission.quizAttemptId) return res.status(404).json({ message: 'Quiz not yet submitted' });

    const config = await PublicQuizConfig.findById(submission.publicQuizConfigId).lean();
    if (!config) return res.status(404).json({ message: 'Config not found' });

    const quiz = await Quiz.findById(submission.quizId).select('title totalMarks passPercentage passingMarks').lean();

    const resultSettings = config.resultSettings;

    // Build answer review if allowed
    let answers: any[] = [];
    if (resultSettings.showAnswers || resultSettings.showScore) {
      const quizSubs = await QuizSubmission.find({ quizAttemptId: submission.quizAttemptId.toString() }).lean();
      const questionIds = quizSubs.map(s => s.questionId);
      const questions = await Question.find({ _id: { $in: questionIds } }).lean();
      const qMap = new Map(questions.map(q => [q._id.toString(), q]));

      answers = quizSubs.map(sub => {
        const q = qMap.get(sub.questionId?.toString() || '');
        return {
          questionId: sub.questionId,
          questionText: q?.question || '',
          isCorrect: sub.isCorrect,
          selectedAnswer: sub.studentAnswer || '',
          correctAnswer: resultSettings.showAnswers ? resolveCorrectAnswerText(q) : undefined,
          marksAwarded: sub.marksAwarded || 0,
          maxMarks: q?.marks || 0,
          explanation: resultSettings.showAnswers ? (q as any)?.explanation || '' : undefined
        };
      });
    }

    // Build social share config
    const social = resultSettings.social || {};
    const shareMsg = (social.shareMessage || 'I scored {{score}}% on {{quizTitle}}! {{hashtags}}')
      .replace('{{score}}', String(Math.round(submission.percentage || 0)))
      .replace('{{quizTitle}}', quiz?.title || '')
      .replace('{{name}}', submission.name)
      .replace('{{hashtags}}', (social.hashtags || []).map((h: string) => `#${h}`).join(' '));

    res.json({
      submission: {
        id: submission._id,
        name: submission.name,
        email: submission.email,
        score: submission.score,
        totalMarks: submission.totalMarks,
        percentage: Math.round(submission.percentage || 0),
        passed: submission.passed,
        completedAt: submission.completedAt,
        shareToken: submission.shareToken
      },
      quiz: { title: quiz?.title },
      resultSettings,
      answers: resultSettings.showAnswers ? answers : (resultSettings.showScore ? answers.map(a => ({ ...a, correctAnswer: undefined, explanation: undefined })) : []),
      socialShare: {
        message: shareMsg,
        hashtags: social.hashtags || [],
        instagramHandle: social.instagramHandle,
        twitterHandle: social.twitterHandle,
        linkedinCompanyUrl: social.linkedinCompanyUrl,
        twitterUrl: `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareMsg)}${social.twitterHandle ? `&via=${social.twitterHandle.replace('@', '')}` : ''}`,
        linkedinUrl: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(social.linkedinCompanyUrl || 'https://codebegun.com')}&summary=${encodeURIComponent(shareMsg)}`
      }
    });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

/** GET /api/public-quiz/certificate/:shareToken  — render certificate HTML */
export const getPublicCertificate = async (req: Request, res: Response) => {
  try {
    const submission = await PublicQuizSubmission.findOne({ shareToken: req.params.shareToken }).lean();
    if (!submission) return res.status(404).json({ message: 'Certificate not found' });

    const config = await PublicQuizConfig.findById(submission.publicQuizConfigId).lean();
    if (!config) return res.status(404).json({ message: 'Config not found' });

    const quiz = await Quiz.findById(submission.quizId).select('title').lean();

    // Check passing requirement
    if (config.resultSettings.passingPercentage && (submission.percentage || 0) < config.resultSettings.passingPercentage) {
      return res.status(403).json({ message: 'Certificate is only available for passing scores' });
    }

    const date = submission.completedAt
      ? new Date(submission.completedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
      : new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });

    // Use custom template or default
    const template = config.certificateTemplate || getDefaultCertificateTemplate();

    const html = template
      .replace(/{{name}}/g, submission.name)
      .replace(/{{score}}/g, String(submission.score ?? 0))
      .replace(/{{maxScore}}/g, String(submission.totalMarks ?? 0))
      .replace(/{{percentage}}/g, String(Math.round(submission.percentage ?? 0)))
      .replace(/{{quizTitle}}/g, quiz?.title || config.title)
      .replace(/{{date}}/g, date)
      .replace(/{{tenantName}}/g, config.title);

    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

function getDefaultCertificateTemplate(): string {
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<title>Certificate of Achievement</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700&family=Open+Sans:wght@400;600&display=swap');
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Open Sans', sans-serif; background: #f8fafc; display: flex; justify-content: center; align-items: center; min-height: 100vh; padding: 20px; }
  .cert { width: 800px; background: #fff; border: 12px solid #005897; padding: 60px; text-align: center; box-shadow: 0 20px 60px rgba(0,0,0,0.15); }
  .cert-inner { border: 2px solid #e2c96e; padding: 40px; }
  .badge { font-size: 3rem; margin-bottom: 16px; }
  .cert-title { font-family: 'Playfair Display', serif; font-size: 2.2rem; color: #005897; letter-spacing: 4px; text-transform: uppercase; margin-bottom: 8px; }
  .cert-subtitle { font-size: 0.9rem; color: #888; letter-spacing: 2px; text-transform: uppercase; margin-bottom: 32px; }
  .cert-presented { font-size: 1rem; color: #555; margin-bottom: 12px; }
  .cert-name { font-family: 'Playfair Display', serif; font-size: 2.8rem; color: #1a1a1a; border-bottom: 2px solid #e2c96e; display: inline-block; padding-bottom: 8px; margin-bottom: 24px; }
  .cert-body { font-size: 1rem; color: #555; line-height: 1.8; margin-bottom: 28px; }
  .cert-quiz { font-weight: 700; color: #005897; font-size: 1.2rem; }
  .cert-score { display: inline-block; background: #005897; color: #fff; padding: 10px 28px; border-radius: 40px; font-size: 1.1rem; font-weight: 600; margin-bottom: 28px; }
  .cert-date { font-size: 0.9rem; color: #888; margin-top: 24px; }
  .cert-footer { margin-top: 32px; border-top: 1px solid #eee; padding-top: 20px; font-size: 0.8rem; color: #aaa; }
</style>
</head>
<body>
<div class="cert">
  <div class="cert-inner">
    <div class="badge">🏆</div>
    <div class="cert-title">Certificate of Achievement</div>
    <div class="cert-subtitle">This certifies that</div>
    <div class="cert-name">{{name}}</div>
    <div class="cert-body">
      has successfully completed<br/>
      <span class="cert-quiz">{{quizTitle}}</span>
    </div>
    <div class="cert-score">Score: {{score}} / {{maxScore}} ({{percentage}}%)</div>
    <div class="cert-date">Issued on {{date}}</div>
    <div class="cert-footer">{{tenantName}} &nbsp;|&nbsp; Powered by CodeBegun LMS</div>
  </div>
</div>
</body>
</html>`;
}

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN ENDPOINTS (authenticated)
// ─────────────────────────────────────────────────────────────────────────────

/** GET /api/public-quizzes  — list all configs for tenant */
export const listPublicQuizConfigs = async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).user?.tenantId;
    const configs = await PublicQuizConfig.find({ tenantId })
      .populate('quizId', 'title totalQuestions totalMarks')
      .sort({ createdAt: -1 });
    res.json(configs);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

/** POST /api/public-quizzes  — create new config */
export const createPublicQuizConfig = async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).user?.tenantId;
    const userId = (req as any).user?.userId;

    // Generate slug from title if not provided
    let slug = req.body.slug || req.body.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

    // Ensure uniqueness
    const existing = await PublicQuizConfig.findOne({ slug });
    if (existing) slug = `${slug}-${Date.now()}`;

    const config = new PublicQuizConfig({
      ...req.body,
      slug,
      tenantId,
      createdBy: userId
    });
    await config.save();
    res.status(201).json(config);
  } catch (err: any) {
    res.status(400).json({ message: err.message });
  }
};

/** GET /api/public-quizzes/:id  — get one config */
export const getPublicQuizConfig = async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).user?.tenantId;
    const config = await PublicQuizConfig.findOne({ _id: req.params.id, tenantId })
      .populate('quizId', 'title totalQuestions totalMarks totalTime');
    if (!config) return res.status(404).json({ message: 'Not found' });
    res.json(config);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

/** PUT /api/public-quizzes/:id  — update config */
export const updatePublicQuizConfig = async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).user?.tenantId;
    const { slug, ...rest } = req.body; // prevent slug change via this endpoint

    const config = await PublicQuizConfig.findOneAndUpdate(
      { _id: req.params.id, tenantId },
      { $set: rest },
      { new: true }
    );
    if (!config) return res.status(404).json({ message: 'Not found' });
    res.json(config);
  } catch (err: any) {
    res.status(400).json({ message: err.message });
  }
};

/** DELETE /api/public-quizzes/:id  — delete config */
export const deletePublicQuizConfig = async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).user?.tenantId;
    await PublicQuizConfig.findOneAndDelete({ _id: req.params.id, tenantId });
    await PublicQuizSubmission.deleteMany({ publicQuizConfigId: req.params.id });
    res.json({ message: 'Deleted' });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

/** GET /api/public-quizzes/:id/submissions  — list all submissions */
export const getPublicQuizSubmissions = async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).user?.tenantId;
    const config = await PublicQuizConfig.findOne({ _id: req.params.id, tenantId });
    if (!config) return res.status(404).json({ message: 'Not found' });

    const { page = 1, limit = 50, eligibility } = req.query;
    const query: any = { publicQuizConfigId: config._id };
    if (eligibility) query.eligibilityStatus = eligibility;

    const total = await PublicQuizSubmission.countDocuments(query);
    const submissions = await PublicQuizSubmission.find(query)
      .sort({ createdAt: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit));

    res.json({ submissions, total, page: Number(page), limit: Number(limit) });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

/** POST /api/public-quizzes/:id/submissions/:subId/convert-to-lead  — convert to lead */
export const convertSubmissionToLead = async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).user?.tenantId;
    const userId = (req as any).user?.userId;

    const submission = await PublicQuizSubmission.findOne({
      _id: req.params.subId,
      tenantId
    });
    if (!submission) return res.status(404).json({ message: 'Submission not found' });

    // Check if lead already exists with this email
    const existing = await Lead.findOne({ email: submission.email, tenantId });
    if (existing) return res.status(409).json({ message: 'Lead already exists for this email', leadId: existing._id });

    const lead = new Lead({
      tenantId,
      name: submission.name,
      email: submission.email,
      phone: submission.registrationData?.phone || submission.registrationData?.mobile || '',
      source: 'public_quiz',
      sourceDetails: { platform: 'website' },
      notes: `Converted from Public Quiz submission. Score: ${submission.score}/${submission.totalMarks} (${Math.round(submission.percentage || 0)}%). Eligibility: ${submission.eligibilityStatus}.`,
      assignedTo: userId,
      createdBy: userId,
      status: 'new'
    });
    await lead.save();

    res.json({ message: 'Lead created', leadId: lead._id });
  } catch (err: any) {
    res.status(400).json({ message: err.message });
  }
};

/** GET /api/public-quizzes/available-quizzes  — quizzes available to make public */
export const getAvailableQuizzesForPublic = async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).user?.tenantId;
    const quizzes = await Quiz.find({ tenantId, isActive: true })
      .select('title totalQuestions totalMarks totalTime')
      .sort({ createdAt: -1 });
    res.json(quizzes);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};
