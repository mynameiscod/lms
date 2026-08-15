import { Request, Response } from 'express';
import PersonalizedAssessment from '../models/PersonalizedAssessment';
import { gradeSubmittedAnswers } from '../services/assessmentAnswerGradingService';
import {
  projectAssessmentToSkillDna, rebuildSkillDnaForStudent, getSkillDna, explainSkill,
} from '../services/skillDnaService';
import { processGamificationEvent } from '../services/gamificationEngine';

/**
 * Submitting a personalised assessment, and reading the Skill DNA it produces.
 *
 * GRADING IS AUTHORITATIVE, PROJECTION IS NOT. If the skill projection fails, the
 * submission still stands: the answers are graded, the attempt is closed, and the student
 * is told they finished. Losing somebody's completed assessment because a derived
 * projection threw would be the worst possible trade, and the projection can be rebuilt
 * from the same stored data at any time.
 *
 * Nothing here computes a gap, a readiness figure or a roadmap. It records what a student
 * demonstrated; what that means for their target role is a later module's question.
 */

const tenantOf = (req: Request): string =>
  String((req as any).user?.tenantId || (req as any).tenantId || '');
const userIdOf = (req: Request): string => String((req as any).user?.id || (req as any).user?._id || '');

/**
 * POST /passport/me/assessment/personalized/submit
 *
 * Grades the answers with each content family's own answer key, closes the attempt, then
 * projects the result into skill evidence.
 */
export const submitPersonalizedAssessment = async (req: Request, res: Response) => {
  try {
    const tenantId = tenantOf(req);
    const studentId = userIdOf(req);
    if (!tenantId || !studentId) return res.status(401).json({ message: 'Not authenticated' });

    const open: any = await PersonalizedAssessment.findOne({ tenantId, studentId, status: 'IN_PROGRESS' });
    if (!open) return res.status(404).json({ message: 'You have no assessment in progress.' });

    // Answers are matched against the FROZEN paper. Anything the student sends that was not
    // on their paper is discarded — a client cannot introduce questions it prefers.
    const onPaper = new Map<string, any>((open.items || []).map((i: any) => [`${i.sourceType}:${i.sourceId}`, i]));
    const submitted = (Array.isArray(req.body?.answers) ? req.body.answers : [])
      .map((a: any) => ({
        sourceType: String(a?.sourceType || ''),
        sourceId: String(a?.sourceId || ''),
        response: a?.response,
      }))
      .filter((a: any) => onPaper.has(`${a.sourceType}:${a.sourceId}`));

    // Every item on the paper is graded, answered or not. Silently dropping the unanswered
    // ones would bias every score upward — a skipped question is a real observation.
    const all = (open.items || []).map((i: any) => {
      const given = submitted.find((s: any) => s.sourceType === i.sourceType && s.sourceId === i.sourceId);
      return { sourceType: i.sourceType, sourceId: i.sourceId, response: given?.response };
    });

    const graded = await gradeSubmittedAnswers(tenantId, all);

    const gradable = graded.filter(g => g.gradable);
    const earned = gradable.reduce((n, g) => n + g.earnedPoints, 0);
    const max = gradable.reduce((n, g) => n + g.maxPoints, 0);

    open.status = 'SUBMITTED';
    open.submittedAt = new Date();
    // Stored so a failed projection can be replayed against what the student actually
    // answered. Without this a rebuild would re-grade an empty paper and record that they
    // got everything wrong.
    open.answers = all;
    await open.save();

    // Projection is derived state and must never cost somebody their submission. A failure
    // is logged and reported as recoverable; the rebuild endpoint replays it from the same
    // stored answers without the student doing anything again.
    let projection: any = null;
    let projectionError: string | null = null;
    try {
      projection = await projectAssessmentToSkillDna(tenantId, String(open._id), graded);
    } catch (e: any) {
      projectionError = e?.message || 'Skill projection failed';
      console.error('[skill-dna] projection failed for assessment', String(open._id), projectionError);
    }

    /**
     * Engagement credit for FINISHING, not for scoring well.
     *
     * One award per assessment, keyed on the attempt id, so a retried submission cannot pay
     * twice. Deliberately flat: paying per correct answer would put a price on a diagnostic
     * and give students a reason to game the one instrument that tells them the truth about
     * themselves. Correctness already has a home — it becomes skill evidence, above.
     *
     * Failure here costs nothing but the points; the submission is already saved.
     */
    let award: any = null;
    try {
      award = await processGamificationEvent({
        tenantId, studentId,
        eventKey: 'PERSONALIZED_ASSESSMENT_COMPLETED',
        sourceType: 'assessment', sourceId: String(open._id),
      });
    } catch (e: any) {
      console.error('[gamification] assessment award failed', String(open._id), e?.message || e);
    }

    res.json({
      submitted: true,
      xpAwarded: award?.awarded || 0,
      badges: award?.badges || [],
      result: {
        answered: gradable.filter(g => g.answered).length,
        graded: gradable.length,
        notGradable: graded.length - gradable.length,
        earnedPoints: earned,
        maxPoints: max,
      },
      skillDna: projection
        ? { skillsAffected: projection.skillsAffected.length, evidenceCreated: projection.evidenceCreated }
        : null,
      // Surfaced honestly rather than hidden — the submission is safe either way.
      skillDnaPending: !!projectionError,
    });
  } catch (e: any) {
    console.error('[skill-dna] submit:', e?.message || e);
    res.status(500).json({ message: 'Could not submit your assessment. Please try again.' });
  }
};

/** GET /passport/me/skills — the caller's own Skill DNA. */
export const getMySkillDna = async (req: Request, res: Response) => {
  try {
    const tenantId = tenantOf(req);
    const studentId = userIdOf(req);
    if (!tenantId || !studentId) return res.status(401).json({ message: 'Not authenticated' });

    const skills = await getSkillDna(tenantId, studentId);

    res.json({
      // An empty list means NOT ASSESSED. The UI must say so rather than showing zeros,
      // which would read as "you know nothing" instead of "we have not measured you".
      skills,
      assessed: skills.length > 0,
    });
  } catch (e: any) {
    console.error('[skill-dna] me:', e?.message || e);
    res.status(500).json({ message: 'Could not load your skills.' });
  }
};

/** GET /passport/students/:studentId/skills — admin view of one member's Skill DNA. */
export const getStudentSkillDna = async (req: Request, res: Response) => {
  try {
    const tenantId = tenantOf(req);
    // Tenant-scoped: an id from another tenant resolves to nothing rather than to data.
    const skills = await getSkillDna(tenantId, String(req.params.studentId));
    res.json({ skills, assessed: skills.length > 0 });
  } catch (e: any) {
    res.status(500).json({ message: 'Could not load that member’s skills.' });
  }
};

/**
 * GET /passport/students/:studentId/skills/:skillKey — why this score.
 *
 * Every observation behind it and the arithmetic applied, so a disputed result has an
 * answer better than "the system calculated it".
 */
export const explainStudentSkill = async (req: Request, res: Response) => {
  try {
    const tenantId = tenantOf(req);
    const detail = await explainSkill(tenantId, String(req.params.studentId), String(req.params.skillKey));
    res.json(detail);
  } catch (e: any) {
    res.status(500).json({ message: 'Could not explain that skill.' });
  }
};

/**
 * POST /passport/students/:studentId/skills/rebuild — recovery.
 *
 * Recomputes profiles from stored evidence. Idempotent, and never asks the student to sit
 * anything again. Admin-only: a student rebuilding their own profile has no legitimate use
 * and every incentive to try if a result disappoints them.
 */
export const rebuildStudentSkillDna = async (req: Request, res: Response) => {
  try {
    const tenantId = tenantOf(req);
    const studentId = String(req.params.studentId);
    const result = await rebuildSkillDnaForStudent(tenantId, studentId);

    console.log(`[skill-dna] ${(req as any).user?.email} rebuilt Skill DNA for ${studentId}: ${result.skills} skill(s)`);
    res.json({ ...result, skills: await getSkillDna(tenantId, studentId) });
  } catch (e: any) {
    console.error('[skill-dna] rebuild:', e?.message || e);
    res.status(500).json({ message: 'Could not rebuild that member’s skills.' });
  }
};

/**
 * POST /passport/assessments/:assessmentId/reproject — replay a failed projection.
 *
 * The recovery path when grading succeeded and the projection did not. Re-grades the same
 * frozen paper and re-projects; the evidence identity makes it safe to run repeatedly.
 */
export const reprojectAssessment = async (req: Request, res: Response) => {
  try {
    const tenantId = tenantOf(req);
    const assessment: any = await PersonalizedAssessment.findOne({
      _id: String(req.params.assessmentId), tenantId,
    }).lean();
    if (!assessment) return res.status(404).json({ message: 'No such assessment.' });
    if (assessment.status !== 'SUBMITTED') {
      return res.status(400).json({ message: 'That assessment has not been submitted yet.' });
    }

    // Replayed against what the student ACTUALLY answered. Re-grading without their
    // responses would score every item zero and record a failure that never happened, so
    // an assessment with no stored answers is refused rather than guessed at.
    if (!assessment.answers?.length) {
      return res.status(409).json({
        message: 'That assessment was submitted before answers were retained, so its skill evidence cannot be rebuilt. '
          + 'Rebuilding profiles from existing evidence is still available.',
      });
    }

    const graded = await gradeSubmittedAnswers(tenantId, assessment.answers);

    const report = await projectAssessmentToSkillDna(tenantId, String(assessment._id), graded);
    res.json({ report });
  } catch (e: any) {
    console.error('[skill-dna] reproject:', e?.message || e);
    res.status(500).json({ message: e.message || 'Could not reproject that assessment.' });
  }
};
