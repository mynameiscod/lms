import { Request, Response } from 'express';
import PersonalizedAssessment from '../models/PersonalizedAssessment';
import {
  resolvePersonalizedAssessmentContext, buildPersonalizedAssessment,
} from '../services/personalizedAssessmentService';
import { loadItems, refKey } from '../services/skillEvidenceSourceRegistry';
import { policyForStage, ASSESSMENT_POLICIES } from '../data/assessmentPolicies';
import { getCareerContext } from '../services/careerContextService';

/**
 * Starting a personalised CareerPilot assessment.
 *
 * ADDITIVE. The existing assessment flow is untouched and still serves every student who
 * uses it; this is a separate endpoint, so incomplete skill-evidence mapping can never
 * break a working exam. Nothing here changes scoring, roadmaps, missions or any student
 * record beyond creating the attempt itself.
 *
 * THE STUDENT DECIDES NOTHING ABOUT THEIR OWN PAPER. Role, stage, skills, counts,
 * difficulty and the questions themselves are all resolved server-side from Module 1's
 * context. A request that could name its own role would let somebody sit an easier paper
 * whose score was still presented as comparable.
 */

const tenantOf = (req: Request): string =>
  String((req as any).user?.tenantId || (req as any).tenantId || '');
const userIdOf = (req: Request): string => String((req as any).user?.id || (req as any).user?._id || '');

/**
 * What a student is allowed to see.
 *
 * Correct answers, hidden tests and expected output are never included — the item text
 * comes from the content's own record, and everything else is metadata about the slot.
 * The seed, the unused pools and the other candidates are all withheld: between them they
 * would let somebody reconstruct another student's paper.
 */
const studentShape = (a: any, texts: Map<string, any>) => ({
  id: String(a._id),
  attemptNumber: a.attemptNumber,
  status: a.status,
  startedAt: a.startedAt,
  totalQuestions: a.items.length,
  items: (a.items || []).slice().sort((x: any, y: any) => x.order - y.order).map((i: any) => {
    const src = texts.get(refKey(i.sourceType, i.sourceId));
    return {
      order: i.order,
      sourceType: i.sourceType,
      sourceId: i.sourceId,
      text: src?.text || '',
      itemType: src?.itemType || 'mcq',
      points: i.points,
    };
  }),
});

/**
 * POST /passport/me/assessment/personalized/start
 *
 * Idempotent. An open attempt is RETURNED rather than replaced, so a double-clicked button
 * or a retried request after a dropped connection cannot cost somebody the answers they
 * have already given.
 */
export const startPersonalizedAssessment = async (req: Request, res: Response) => {
  try {
    const tenantId = tenantOf(req);
    const studentId = userIdOf(req);
    if (!tenantId || !studentId) return res.status(401).json({ message: 'Not authenticated' });

    const open = await PersonalizedAssessment.findOne({ tenantId, studentId, status: 'IN_PROGRESS' }).lean() as any;
    if (open) {
      const texts = await loadItems(tenantId, open.items.map((i: any) => ({ sourceType: i.sourceType, sourceId: i.sourceId })));
      return res.json({ assessment: studentShape(open, texts), resumed: true });
    }

    const ctx = await resolvePersonalizedAssessmentContext(tenantId, studentId);
    if (!ctx.ok) return res.status(400).json({ message: ctx.message });

    const prior = await PersonalizedAssessment.find({ tenantId, studentId })
      .select('attemptNumber items').sort({ attemptNumber: -1 }).lean() as any[];
    const attemptNumber = (prior[0]?.attemptNumber || 0) + 1;
    const seen = prior.flatMap((p: any) => (p.items || []).map((i: any) => i.sourceId));

    // Built in full BEFORE anything is written. A half-generated attempt would be a paper
    // that quietly measures less than its peers, and the score would not show it.
    const built = await buildPersonalizedAssessment({
      tenantId, studentId,
      stage: ctx.stage!, roleKey: ctx.roleKey!,
      roleSkillKeys: ctx.roleSkillKeys!,
      blueprintVersion: ctx.blueprintVersion!,
      attemptNumber,
      seenSourceIds: seen,
    });

    if (!built.ok) {
      // A coverage failure is a configuration problem, not the student's. It says what is
      // missing without exposing anything internal.
      return res.status(409).json({
        message: built.message,
        coverage: built.report?.shortfalls || [],
      });
    }

    let created: any;
    try {
      created = await PersonalizedAssessment.create({
        tenantId, studentId, attemptNumber, status: 'IN_PROGRESS',
        policyKey: built.specification!.policyKey,
        policyVersion: built.specification!.policyVersion,
        stage: ctx.stage, roleKey: ctx.roleKey,
        blueprintVersion: ctx.blueprintVersion, discovery: !!ctx.discovery,
        generationSeed: built.seed,
        specification: {
          slots: built.specification!.slots,
          skillCoverage: built.specification!.skillCoverage,
          difficultyCoverage: built.specification!.difficultyCoverage,
          totalPoints: built.specification!.totalPoints,
        },
        items: built.items,
        generationReport: {
          requestedSlots: built.report!.requestedSlots,
          filled: built.report!.filled,
          exactMatches: built.report!.exactMatches,
          difficultyFallbacks: built.report!.difficultyFallbacks,
          repeatedFromPreviousAttempt: built.report!.repeatedFromPreviousAttempt,
        },
      });
    } catch (e: any) {
      // Two concurrent starts raced and the partial unique index refused the second. The
      // other request won; return its paper rather than an error the student cannot act on.
      if (e?.code === 11000) {
        const existing = await PersonalizedAssessment.findOne({ tenantId, studentId, status: 'IN_PROGRESS' }).lean() as any;
        if (existing) {
          const texts = await loadItems(tenantId, existing.items.map((i: any) => ({ sourceType: i.sourceType, sourceId: i.sourceId })));
          return res.json({ assessment: studentShape(existing, texts), resumed: true });
        }
      }
      throw e;
    }

    const texts = await loadItems(tenantId, created.items.map((i: any) => ({ sourceType: i.sourceType, sourceId: i.sourceId })));
    res.status(201).json({ assessment: studentShape(created, texts), resumed: false });
  } catch (e: any) {
    console.error('[personalized-assessment] start:', e?.message || e);
    res.status(500).json({ message: 'Could not start your assessment. Please try again.' });
  }
};

/** GET /passport/me/assessment/personalized — the open attempt, if there is one. */
export const getMyPersonalizedAssessment = async (req: Request, res: Response) => {
  try {
    const tenantId = tenantOf(req);
    const studentId = userIdOf(req);
    const open = await PersonalizedAssessment.findOne({ tenantId, studentId, status: 'IN_PROGRESS' }).lean() as any;
    if (!open) return res.json({ assessment: null });

    const texts = await loadItems(tenantId, open.items.map((i: any) => ({ sourceType: i.sourceType, sourceId: i.sourceId })));
    res.json({ assessment: studentShape(open, texts) });
  } catch (e: any) {
    res.status(500).json({ message: 'Could not load your assessment.' });
  }
};

/**
 * POST /passport/assessment/personalized/preview — admin diagnostic.
 *
 * Runs the SAME pipeline a student would, and persists nothing: no attempt, no history, no
 * effect on anybody's paper. Sharing the code path is the point — a preview that
 * approximated generation would eventually disagree with it, and the disagreement would
 * only surface as a student complaint.
 */
export const previewPersonalizedAssessment = async (req: Request, res: Response) => {
  try {
    const tenantId = tenantOf(req);
    const studentId = String(req.body?.studentId || '').trim();
    if (!studentId) return res.status(400).json({ message: 'Choose a member to preview for.' });

    const ctx = await resolvePersonalizedAssessmentContext(tenantId, studentId);
    if (!ctx.ok) return res.status(400).json({ message: ctx.message });

    const built = await buildPersonalizedAssessment({
      tenantId, studentId,
      stage: ctx.stage!, roleKey: ctx.roleKey!,
      roleSkillKeys: ctx.roleSkillKeys!,
      blueprintVersion: ctx.blueprintVersion!,
      attemptNumber: Number(req.body?.attemptNumber) || 1,
    });

    const context = await getCareerContext(tenantId, studentId);
    const policy = policyForStage(ctx.stage);

    if (!built.ok) {
      return res.json({
        ok: false, message: built.message,
        context: { stage: ctx.stage, roleKey: ctx.roleKey, discovery: !!ctx.discovery, policy: policy.label },
        shortfalls: built.report?.shortfalls || [],
      });
    }

    // The admin sees the shape and the chosen items; the seed stays server-side even here,
    // because an admin screen is not a place to publish something that predicts papers.
    const texts = await loadItems(tenantId, built.items!.map(i => ({ sourceType: i.sourceType, sourceId: i.sourceId })));

    res.json({
      ok: true,
      context: {
        name: context ? `${context.education.degree || ''} ${context.education.currentAcademicYear || ''}`.trim() : '',
        stage: ctx.stage, roleKey: ctx.roleKey, discovery: !!ctx.discovery,
        policy: policy.label, policyKey: policy.key, policyVersion: policy.version,
        blueprintVersion: ctx.blueprintVersion,
      },
      specification: built.specification,
      report: built.report,
      items: built.items!.map(i => ({
        order: i.order, skillKey: i.skillKey, difficulty: i.difficulty,
        servedDifficulty: i.servedDifficulty, reason: i.reason,
        sourceType: i.sourceType,
        text: texts.get(refKey(i.sourceType, i.sourceId))?.text || '',
      })),
    });
  } catch (e: any) {
    console.error('[personalized-assessment] preview:', e?.message || e);
    res.status(500).json({ message: e.message || 'Could not build a preview' });
  }
};

/** GET /passport/assessment/personalized/policies — the configured shapes, for admin. */
export const listPolicies = async (_req: Request, res: Response) => {
  res.json({
    policies: ASSESSMENT_POLICIES.map(p => ({
      key: p.key, stage: p.stage, label: p.label, version: p.version,
      skillSlots: p.skillSlots, maxSkills: p.maxSkills,
      difficultyMix: p.difficultyMix,
      prerequisiteDepth: p.prerequisiteDepth,
      allowedSkillDifficulty: p.allowedSkillDifficulty,
    })),
  });
};
