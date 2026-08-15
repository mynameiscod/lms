import { Request, Response } from 'express';
import PassportInterview from '../models/PassportInterview';
import { analyseResume } from '../services/resumeIntelligenceService';
import { planInterviewCoverage, adaptPassportInterview } from '../services/interviewIntelligenceService';
import { calculateStudentRoleReadiness, RoleReadinessResult } from '../services/roleReadinessService';
import {
  PLACEMENT_READINESS_VERSION, INTERVIEW_WEIGHTS, weightedScore,
} from '../data/placementReadinessPolicy';

/**
 * Placement readiness — three answers, never one.
 *
 * THE NUMBERS ARE NOT AVERAGED, HERE OR ANYWHERE. Skill readiness, resume readiness and
 * interview readiness measure different things and are actionable in different timeframes.
 * A member with strong skills and a weak resume needs an afternoon; the reverse needs three
 * months. A single blended figure would tell them which of those they face: nothing.
 *
 * THE STUDENT IS ALWAYS THE AUTHENTICATED USER. No tenant or student identifier is read from
 * the request body on any member route, so nobody can score somebody else's resume or write
 * evidence against another member.
 *
 * READ-ONLY. Every endpoint here derives its answer from data other modules own. Nothing in
 * this file writes a skill score, a readiness figure, a roadmap or a reward.
 */

const tenantOf = (req: Request): string =>
  String((req as any).user?.tenantId || (req as any).tenantId || '');
const userIdOf = (req: Request): string =>
  String((req as any).user?.id || (req as any).user?._id || '');

/**
 * The interview half of the picture, from what the member has actually sat.
 *
 * Reads the most recent completed ROLE interview — the only kind whose areas map to
 * canonical skills. A member who has only done pathway mocks has no interview readiness
 * figure, and is told so rather than shown a zero: never measured and measured badly are
 * different states.
 */
async function latestInterviewReadiness(tenantId: string, studentId: string) {
  const session = await PassportInterview.findOne({
    tenantId, studentId, status: 'completed',
    'skillTargets.0': { $exists: true },
  }).sort({ completedAt: -1 }).lean() as any;

  if (!session) {
    return {
      available: false,
      reason: 'NO_ROLE_INTERVIEW',
      message: 'Take a role interview and we will show how you perform under interview conditions.',
    };
  }

  const adapted = adaptPassportInterview(session);
  const dimensions = Object.entries(adapted.dimensionScores)
    .map(([dimension, score]) => ({ dimension, score: score as number }));

  /**
   * A sitting that measured nothing reports nothing.
   *
   * The AI can decline to grade, or grade under headings that match no target. Averaging an
   * empty set gives 0, and a member told they scored 0% in an interview they actually
   * completed would go and practise the wrong thing entirely — the same reason Module 8
   * reports null rather than 0 for an unassessed skill.
   */
  if (!dimensions.length) {
    return {
      available: false,
      reason: 'INTERVIEW_NOT_SCORED',
      message: 'Your last role interview could not be scored. Take another and we will show how it went.',
    };
  }

  return {
    available: true,
    policyVersion: PLACEMENT_READINESS_VERSION,
    interviewId: String(session._id),
    role: session.role,
    completedAt: session.completedAt,
    readiness: weightedScore(
      dimensions.map(d => ({ key: d.dimension, score: d.score })),
      INTERVIEW_WEIGHTS,
    ),
    dimensions,
    // What the sitting measured, per skill — not what it changed. Skill DNA moved through
    // Module 7 at the interview's own weight, which is lower than a marked paper's.
    perSkill: adapted.questions
      .filter(q => q.skillKey && typeof q.score === 'number')
      .map(q => ({ skillKey: q.skillKey, area: q.question, score: q.score })),
    evidenceProjectedAt: session.evidenceProjectedAt || null,
  };
}

/** GET /passport/me/placement-readiness — the three figures, side by side and unblended. */
export const getMyPlacementReadiness = async (req: Request, res: Response) => {
  try {
    const tenantId = tenantOf(req);
    const studentId = userIdOf(req);
    if (!tenantId || !studentId) return res.status(401).json({ message: 'Not authenticated' });

    const [skill, resume, interview] = await Promise.all([
      calculateStudentRoleReadiness(tenantId, studentId),
      analyseResume(tenantId, studentId),
      latestInterviewReadiness(tenantId, studentId),
    ]);

    res.json({
      policyVersion: PLACEMENT_READINESS_VERSION,
      // Module 8's figure, passed through untouched. Reported here for comparison only;
      // nothing in Module 14 recomputes or adjusts it.
      skill: skill.available
        ? {
            available: true,
            role: (skill as RoleReadinessResult).role,
            // Nullable by Module 8's own design: nothing sufficiently assessed reports
            // null, never 0. Passed through as-is, because 0 would assert unreadiness.
            readiness: (skill as RoleReadinessResult).readiness,
            coverage: (skill as RoleReadinessResult).coverage,
            confidence: (skill as RoleReadinessResult).confidence,
          }
        : { available: false, reason: (skill as any).reason },
      resume,
      interview,
    });
  } catch (e: any) {
    console.error('[placement] readiness:', e?.message || e);
    res.status(500).json({ message: 'Could not load your placement readiness.' });
  }
};

/** GET /passport/me/resume-readiness — the resume review on its own. */
export const getMyResumeReadiness = async (req: Request, res: Response) => {
  try {
    const tenantId = tenantOf(req);
    const studentId = userIdOf(req);
    if (!tenantId || !studentId) return res.status(401).json({ message: 'Not authenticated' });

    res.json(await analyseResume(tenantId, studentId));
  } catch (e: any) {
    console.error('[placement] resume readiness:', e?.message || e);
    res.status(500).json({ message: 'Could not review your resume.' });
  }
};

/**
 * GET /passport/me/interview/coverage — what a role interview would cover.
 *
 * Shown before the member starts, so an interview is not a black box. Advisory only: the
 * sitting resolves its own coverage server-side at start, from the same function.
 */
export const getMyInterviewCoverage = async (req: Request, res: Response) => {
  try {
    const tenantId = tenantOf(req);
    const studentId = userIdOf(req);
    if (!tenantId || !studentId) return res.status(401).json({ message: 'Not authenticated' });

    res.json(await planInterviewCoverage(tenantId, studentId, 6));
  } catch (e: any) {
    console.error('[placement] interview coverage:', e?.message || e);
    res.status(500).json({ message: 'Could not plan your interview.' });
  }
};

/** GET /passport/students/:studentId/placement-readiness — the same picture, for staff. */
export const getStudentPlacementReadiness = async (req: Request, res: Response) => {
  try {
    const tenantId = tenantOf(req);
    const studentId = String(req.params.studentId || '');
    if (!tenantId) return res.status(401).json({ message: 'Not authenticated' });
    if (!studentId) return res.status(400).json({ message: 'Student is required.' });

    const [skill, resume, interview] = await Promise.all([
      calculateStudentRoleReadiness(tenantId, studentId),
      analyseResume(tenantId, studentId),
      latestInterviewReadiness(tenantId, studentId),
    ]);

    res.json({
      policyVersion: PLACEMENT_READINESS_VERSION,
      skill: skill.available
        ? {
            available: true, role: (skill as RoleReadinessResult).role,
            readiness: (skill as RoleReadinessResult).readiness,
            coverage: (skill as RoleReadinessResult).coverage,
            confidence: (skill as RoleReadinessResult).confidence,
          }
        : { available: false, reason: (skill as any).reason },
      resume,
      interview,
    });
  } catch (e: any) {
    console.error('[placement] student readiness:', e?.message || e);
    res.status(500).json({ message: 'Could not load placement readiness.' });
  }
};
