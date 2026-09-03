import { Request, Response } from 'express';
import SkillQuestionDraft from '../models/SkillQuestionDraft';
import AuditLog from '../models/AuditLog';
import {
  generateDrafts, approveDraft, rejectDraft, poolCoverage, createManualQuestion,
  assessmentCoverage,
} from '../services/skillQuestionDraftService';
import { listCareerRoles } from '../services/careerRoleService';
import { SUPPORTED_PROGRAMS } from '../services/careerDomainService';

/** The same list the member picks from in setup — see the audiences handler. */
const ACADEMIC_YEARS = ['1st Year', '2nd Year', '3rd Year', '4th Year', 'Graduated'];

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
/**
 * GET /passport/question-drafts/role-coverage
 *
 * Role x skill x difficulty, split by whether the question is CareerPilot's own or borrowed
 * from the LMS quiz bank. The older `coverage` above answers "how much evidence exists per
 * skill", which cannot tell you that a paper will fail because one difficulty is empty, nor
 * how much of the pool would disappear if the borrowed half were retired.
 */
export const roleCoverage = async (req: Request, res: Response) => {
  try {
    res.json({ success: true, ...(await assessmentCoverage(tenantOf(req))) });
  } catch (e: any) {
    console.error('[question-drafts] role coverage:', e?.message || e);
    res.status(500).json({ success: false, message: e?.message || 'Could not read coverage' });
  }
};

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

/**
 * GET /passport/question-drafts/audiences — the values a question may be targeted at.
 *
 * Served from here rather than reusing the member context endpoint, which needs a CareerPilot
 * profile the admin may not have. The YEAR list is the same one the student picks from in
 * setup, deliberately: a question tagged "2nd Year" has to match the string the member
 * actually stored, and two lists that drift would target nobody.
 */
export const audiences = async (req: Request, res: Response) => {
  try {
    const tenantId = tenantOf(req);
    // EVERY role, not just the selectable ones for one domain: an admin may legitimately
    // aim a question at a role students cannot pick themselves yet.
    const roles = await listCareerRoles(tenantId).catch(() => []);
    res.json({
      success: true,
      roles: (roles as any[]).filter(r => r.active !== false).map(r => ({ key: r.key, label: r.label || r.key })),
      years: ACADEMIC_YEARS,
      courses: SUPPORTED_PROGRAMS,
    });
  } catch (e: any) {
    res.status(500).json({ success: false, message: e?.message || 'Could not load audiences' });
  }
};

/**
 * POST /passport/question-drafts/approve-bulk — approve a selection in one request.
 *
 * Each draft is approved INDEPENDENTLY and a failure is reported rather than thrown. The
 * whole point of selecting twenty is not to babysit them; one near-duplicate in the middle
 * must not discard the nineteen that were fine, and the reviewer needs to know which one it
 * was. So this always returns 200 with a per-id outcome, never a half-applied error.
 */
export const approveBulk = async (req: Request, res: Response) => {
  try {
    const tenantId = tenantOf(req);
    const ids = Array.isArray(req.body?.ids) ? req.body.ids.map(String).filter(Boolean) : [];
    if (!ids.length) return res.status(400).json({ success: false, message: 'Select at least one draft.' });
    if (ids.length > 100) return res.status(400).json({ success: false, message: 'Approve at most 100 at a time.' });

    const approved: string[] = [];
    const failed: { id: string; message: string }[] = [];
    // Sequential on purpose: approval reads the live pool to reject duplicates, and running
    // them in parallel would let two near-identical drafts in the same batch both pass.
    for (const id of ids) {
      try {
        await approveDraft({ tenantId, draftId: id, reviewedBy: whoOf(req) });
        approved.push(id);
      } catch (e: any) {
        failed.push({ id, message: e?.message || 'Could not approve' });
      }
    }

    await audit(req, 'UPDATE', `Bulk-approved ${approved.length}/${ids.length} drafts`, { approved: approved.length, failed: failed.length });
    res.json({ success: true, approved, failed });
  } catch (e: any) {
    res.status(400).json({ success: false, message: e?.message || 'Could not approve the selection' });
  }
};

/**
 * POST /passport/question-drafts/manual — an admin writes a question themselves.
 *
 * Goes live immediately: there is no second reviewer to wait for when the author IS the
 * reviewer, and a pending queue that only its own writer can clear is just a delay.
 */
export const createManual = async (req: Request, res: Response) => {
  try {
    const b = req.body || {};
    const difficulty = ['easy', 'medium', 'hard'].includes(b.difficulty) ? b.difficulty : 'medium';
    const result = await createManualQuestion({
      tenantId: tenantOf(req),
      createdBy: whoOf(req),
      skillKey: String(b.skillKey || ''),
      difficulty,
      question: String(b.question || ''),
      options: Array.isArray(b.options) ? b.options : [],
      explanation: b.explanation ? String(b.explanation) : undefined,
      codeSnippet: b.codeSnippet ? String(b.codeSnippet) : undefined,
      language: b.language ? String(b.language) : undefined,
      audienceRoles: Array.isArray(b.audienceRoles) ? b.audienceRoles : [],
      audienceYears: Array.isArray(b.audienceYears) ? b.audienceYears : [],
      audienceCourses: Array.isArray(b.audienceCourses) ? b.audienceCourses : [],
    });
    await audit(req, 'CREATE', `Wrote a question for ${String(b.skillKey || '').toUpperCase()}`, result);
    res.json({ success: true, ...result });
  } catch (e: any) {
    // A rejected question is the admin's to fix (a blank option, a duplicate stem), so the
    // reason goes back verbatim rather than as a generic failure.
    res.status(400).json({ success: false, message: e?.message || 'Could not save the question' });
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
