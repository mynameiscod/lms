import { Request, Response } from 'express';
import { calculateStudentRoleReadiness, explainReadiness } from '../services/roleReadinessService';

/**
 * Reading a student's readiness against their target role.
 *
 * Derived on every request from data that is already stored, so it is never stale: an
 * admin publishing a new blueprint or a student gaining evidence changes the next answer
 * with nothing to invalidate.
 *
 * The student endpoint resolves the role from their stored context. A request that could
 * name its own role would let somebody measure themselves against whichever one they
 * already match, and the resulting number would be presented as though it meant the same
 * thing as everybody else's.
 *
 * Nothing here mutates anything, and nothing decides what to learn — ranked gaps are an
 * observation, not a plan.
 */

const tenantOf = (req: Request): string =>
  String((req as any).user?.tenantId || (req as any).tenantId || '');
const userIdOf = (req: Request): string => String((req as any).user?.id || (req as any).user?._id || '');

/**
 * What a student is allowed to see.
 *
 * Weight, priority score and the counted-in-readiness flag are configuration and internal
 * arithmetic — useful to an admin, noise to a student, and an invitation to game the
 * ranking if surfaced.
 */
const studentShape = (r: any) => {
  if (!r.available) return r;
  const skill = (s: any) => ({
    skillKey: s.skillKey,
    skillName: s.skillName,
    importance: s.importance,
    targetLevel: s.targetLevel,
    targetScore: s.targetScore,
    studentScore: s.studentScore,
    skillConfidence: s.skillConfidence,
    evidenceCount: s.evidenceCount,
    gapPoints: s.gapPoints,
    status: s.status,
  });

  return {
    available: true,
    role: r.role,
    readiness: r.readiness,
    coverage: r.coverage,
    confidence: r.confidence,
    summary: r.summary,
    skills: r.skills.map(skill),
    topGaps: r.topGaps.map(skill),
    strengths: r.strengths.map(skill),
    assessmentNeeded: r.assessmentNeeded.map(skill),
  };
};

/** GET /passport/me/readiness — the caller's own, against their stored primary role. */
export const getMyRoleReadiness = async (req: Request, res: Response) => {
  try {
    const tenantId = tenantOf(req);
    const studentId = userIdOf(req);
    if (!tenantId || !studentId) return res.status(401).json({ message: 'Not authenticated' });

    const result = await calculateStudentRoleReadiness(tenantId, studentId);

    // An unavailable readiness is a normal state, not an error: no role chosen, no
    // published blueprint, or nothing measured yet. The screen explains each differently.
    res.json(studentShape(result));
  } catch (e: any) {
    console.error('[role-readiness] me:', e?.message || e);
    res.status(500).json({ message: 'Could not work out your readiness.' });
  }
};

/**
 * GET /passport/students/:studentId/readiness — admin view.
 *
 * Returns the full result including weights, priority scores and the workings, so a
 * disputed figure can be traced rather than restated. `?roleKey=` compares against another
 * role — an admin question ("what would they need for Data Engineer?"), never a student's.
 */
export const getStudentRoleReadiness = async (req: Request, res: Response) => {
  try {
    const tenantId = tenantOf(req);
    const studentId = String(req.params.studentId);
    const roleKey = req.query.roleKey ? String(req.query.roleKey).toUpperCase() : undefined;

    // Tenant-scoped throughout: a student id from another tenant resolves to no context,
    // and the blueprint lookup is scoped independently.
    const result = await calculateStudentRoleReadiness(tenantId, studentId, roleKey);

    res.json({
      ...result,
      workings: result.available ? explainReadiness(result) : [],
    });
  } catch (e: any) {
    console.error('[role-readiness] student:', e?.message || e);
    res.status(500).json({ message: 'Could not work out that member’s readiness.' });
  }
};
