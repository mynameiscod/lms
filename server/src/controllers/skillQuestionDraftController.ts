import { Request, Response } from 'express';
import SkillQuestionDraft from '../models/SkillQuestionDraft';
import AuditLog from '../models/AuditLog';
import {
  generateDrafts, approveDraft, rejectDraft, poolCoverage,
} from '../services/skillQuestionDraftService';

/**
 * The admin side of AI question drafting.
 *
 * Generation is the only path here that spends money, and it is the only one rate-limited.
 * Reviewing is ordinary work and must never be throttled — a limiter that interrupts an
 * admin halfway through a queue of forty drafts is worse than the spend it protects.
 */

const tenantOf = (req: Request): string =>
  String((req as any).user?.tenantId || (req as any).tenantId || '');
const whoOf = (req: Request): string => String((req as any).user?.email || '');

async function audit(req: Request, action: 'CREATE' | 'UPDATE' | 'DELETE', details: string, meta: any) {
  try {
    await AuditLog.create({
      tenantId: (req as any).user?.tenantId || (req as any).tenantId,
      userId: (req as any).user?.id || (req as any).user?._id,
      action, module: 'SYSTEM',
      targetType: 'SkillQuestionDraft',
      details, metadata: meta,
    });
  } catch (e: any) {
    console.warn('[question-drafts] audit write failed:', e?.message || e);
  }
}

/**
 * GET /passport/question-drafts/coverage
 *
 * Where the pool is thin, worst first. This is the screen's landing state because the
 * useful question is not "how many questions do we have" but "which skill will produce a
 * repetitive paper tomorrow".
 */
export const coverage = async (req: Request, res: Response) => {
  try {
    res.json({ success: true, skills: await poolCoverage(tenantOf(req)) });
  } catch (e: any) {
    res.status(500).json({ success: false, message: e?.message || 'Could not read pool coverage' });
  }
};

/** GET /passport/question-drafts — the review queue. */
export const list = async (req: Request, res: Response) => {
  try {
    const tenantId = tenantOf(req);
    const status = String(req.query.status || 'pending');
    const q: any = { tenantId };
    if (status !== 'all') q.status = status;
    if (req.query.skillKey) q.skillKey = String(req.query.skillKey);
    if (req.query.batchId) q.batchId = String(req.query.batchId);

    const limit = Math.min(100, Math.max(5, Number(req.query.limit) || 25));
    const page = Math.max(0, Number(req.query.page) || 0);

    const [rows, total] = await Promise.all([
      SkillQuestionDraft.find(q).sort({ createdAt: -1 }).skip(page * limit).limit(limit).lean(),
      SkillQuestionDraft.countDocuments(q),
    ]);
    res.json({ success: true, drafts: rows, total, page, limit });
  } catch (e: any) {
    res.status(500).json({ success: false, message: e?.message || 'Could not list drafts' });
  }
};

/**
 * POST /passport/question-drafts/generate
 *
 * Body: { skillKey, difficulty, count }
 *
 * Returns the batch report rather than the drafts. What the admin needs to decide whether
 * the batch was worth running is how many survived the automatic checks and what was thrown
 * away — a prompt that drops half its output is a prompt problem, and the report is where
 * that becomes visible.
 */
export const generate = async (req: Request, res: Response) => {
  try {
    const tenantId = tenantOf(req);
    const b = req.body || {};
    const skillKey = String(b.skillKey || '').trim().toUpperCase();
    if (!skillKey) return res.status(400).json({ success: false, message: 'skillKey is required' });

    const difficulty = ['easy', 'medium', 'hard'].includes(b.difficulty) ? b.difficulty : 'medium';

    const report = await generateDrafts({
      tenantId, skillKey, difficulty,
      count: Number(b.count) || 5,
      generatedBy: whoOf(req),
    });

    await audit(req, 'CREATE', `Drafted ${report.stored} questions for ${skillKey}`, report);
    res.json({ success: true, report });
  } catch (e: any) {
    // A model that returns unparseable text, or no configured provider, is a 502 rather
    // than a 500: the fault is upstream and retrying is a reasonable thing for the caller
    // to do, which is not true of a bad request.
    const upstream = /provider|JSON|question list|Unexpected token/i.test(e?.message || '');
    res.status(upstream ? 502 : 400).json({
      success: false,
      message: e?.message || 'Could not draft questions',
    });
  }
};

/** POST /passport/question-drafts/:id/approve — becomes a Question + its evidence row. */
export const approve = async (req: Request, res: Response) => {
  try {
    const tenantId = tenantOf(req);
    const { questionId } = await approveDraft({
      tenantId,
      draftId: String(req.params.id),
      reviewedBy: whoOf(req),
      edits: req.body?.edits,
      note: req.body?.note,
    });
    await audit(req, 'UPDATE', `Approved draft ${req.params.id}`, { questionId });
    res.json({ success: true, questionId });
  } catch (e: any) {
    res.status(400).json({ success: false, message: e?.message || 'Could not approve' });
  }
};

/** POST /passport/question-drafts/:id/reject */
export const reject = async (req: Request, res: Response) => {
  try {
    await rejectDraft({
      tenantId: tenantOf(req),
      draftId: String(req.params.id),
      reviewedBy: whoOf(req),
      note: req.body?.note,
    });
    await audit(req, 'UPDATE', `Rejected draft ${req.params.id}`, { note: req.body?.note });
    res.json({ success: true });
  } catch (e: any) {
    res.status(400).json({ success: false, message: e?.message || 'Could not reject' });
  }
};
