import { Request, Response } from 'express';
import { appliesToMember } from '../services/careerStageService';
import PassportAssessment, { DEFAULT_QUESTIONS } from '../models/PassportAssessment';
import PassportAttempt from '../models/PassportAttempt';
import User from '../models/User';
import { scoreAttempt } from '../services/passportScoringService';

const tenantOf = (req: Request): string => String((req as any).user?.tenantId || (req as any).tenantId || '');
const userIdOf = (req: Request): string => String((req as any).user?.id || '');

async function ensureAssessment(tenantId: string) {
  let a = await PassportAssessment.findOne({ tenantId });
  if (!a) a = await PassportAssessment.create({ tenantId, questions: DEFAULT_QUESTIONS });
  return a;
}

/** Student: fetch the assessment (correct answers stripped). */
/** The member's stage and background, for filtering. Absent values mean "serve all". */
async function memberProfile(req: Request): Promise<{ stage: string | null; background: string | null }> {
  const User = (await import('../models/User')).default;
  const u: any = await User.findById(userIdOf(req)).select('passport.stage passport.background').lean();
  return { stage: u?.passport?.stage || null, background: u?.passport?.background || null };
}

export const getAssessment = async (req: Request, res: Response) => {
  try {
    const a = await ensureAssessment(tenantOf(req));

    // Serve only what applies to this member's stage and background. Asking a first-year
    // student to describe an internship they have not had scores them zero on something
    // that does not exist yet — the low score is then used to build a roadmap aimed at
    // gaps they do not have. Untagged questions still reach everyone.
    const me = await memberProfile(req);
    const questions = a.questions.filter((q: any) => appliesToMember(q, me));

    res.json({
      title: a.title,
      stage: me.stage || null,
      questions: questions.map((q: any) => ({ id: String(q._id), category: q.category, text: q.text, options: q.options })),
    });
  } catch (e: any) { res.status(500).json({ message: e.message || 'Failed to load assessment' }); }
};

/** Student: submit answers → score → store attempt → return the result. */
export const submitAssessment = async (req: Request, res: Response) => {
  try {
    const tenantId = tenantOf(req);
    const studentId = userIdOf(req);
    const a = await ensureAssessment(tenantId);
    const rawAnswers: { questionId: string; chosen: number }[] = (req.body?.answers || []);

    const qById = new Map(a.questions.map((q: any) => [String(q._id), q]));
    const answers = rawAnswers
      .filter(x => qById.has(String(x.questionId)))
      .map(x => ({ questionId: String(x.questionId), category: (qById.get(String(x.questionId)) as any).category, chosen: Number(x.chosen) }));

    const user = await User.findById(studentId).select('passport').lean() as any;
    const result = scoreAttempt(a.questions as any, answers, { careerGoal: user?.passport?.careerGoal });

    const attempt = await PassportAttempt.create({ tenantId, studentId, answers, ...result });

    // Cache pathway + score + level on the student for personalization and the card.
    if (user) await User.updateOne({ _id: studentId }, { $set: {
      'passport.pathway': result.pathway,
      'passport.careerScore': result.careerScore,
      'passport.level': result.level,
    } });

    res.json({ result: publicResult(attempt) });
  } catch (e: any) { console.error('[passport] submit failed:', e); res.status(500).json({ message: e.message || 'Failed to submit' }); }
};

/** Student: latest result. */
export const getResult = async (req: Request, res: Response) => {
  try {
    const tenantId = tenantOf(req), studentId = userIdOf(req);
    const [attempt, attempts] = await Promise.all([
      PassportAttempt.findOne({ tenantId, studentId }).sort({ createdAt: -1 }).lean(),
      PassportAttempt.countDocuments({ tenantId, studentId }),
    ]);
    if (!attempt) return res.json({ result: null });
    res.json({ result: { ...publicResult(attempt), attempts } });
  } catch (e: any) { res.status(500).json({ message: e.message || 'Failed to load result' }); }
};

function publicResult(a: any) {
  return {
    careerScore: a.careerScore, level: a.level, levelKey: a.levelKey,
    categoryScores: a.categoryScores, strengths: a.strengths, weaknesses: a.weaknesses,
    pathway: a.pathway, pathwayLabel: a.pathwayLabel, weekPreview: a.weekPreview,
    takenAt: a.createdAt,
  };
}

// ── Admin ──
export const getAssessmentAdmin = async (req: Request, res: Response) => {
  const a = await ensureAssessment(tenantOf(req));
  res.json({ assessment: a });
};

export const saveAssessment = async (req: Request, res: Response) => {
  const tenantId = tenantOf(req);
  await ensureAssessment(tenantId);
  const $set: any = {};
  if (req.body.title !== undefined) $set.title = req.body.title;
  if (Array.isArray(req.body.questions)) $set.questions = req.body.questions;
  const a = await PassportAssessment.findOneAndUpdate({ tenantId }, { $set }, { new: true });
  res.json({ assessment: a });
};

export const resetAssessment = async (req: Request, res: Response) => {
  const tenantId = tenantOf(req);
  const a = await PassportAssessment.findOneAndUpdate({ tenantId }, { $set: { questions: DEFAULT_QUESTIONS } }, { new: true, upsert: true });
  res.json({ assessment: a });
};
