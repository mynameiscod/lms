import { Request, Response } from 'express';
import { resolveRange, ANALYTICS_VERSION } from '../data/analyticsPolicy';
import { buildLearningFunnel } from '../services/careerPilotLearningFunnelService';
import {
  skillAnalytics, improvementAnalytics, roadmapAnalytics, engagementAnalytics,
  rewardAnalytics, interviewAnalytics, resumeAnalytics, companyAnalytics,
  UNAVAILABLE_DISTRIBUTIONS,
} from '../services/careerPilotAnalyticsService';

/**
 * CareerPilot analytics, for the admin.
 *
 * FIVE ENDPOINTS GROUPED BY QUESTION, not thirty grouped by collection. An admin opening
 * the Skills tab wants every skill figure in one request; splitting them into a route per
 * metric would turn one screen into a dozen round trips and a dozen chances to disagree
 * about the range.
 *
 * THE TENANT COMES FROM THE TOKEN. Never a query parameter — that would let any admin point
 * an analytics endpoint at another organisation.
 *
 * EVERY RESPONSE CARRIES ITS RANGE, its generation time and its coverage, so a reader can
 * see which window a figure describes and which figures are missing and why.
 */

const tenantOf = (req: Request): string =>
  String((req as any).user?.tenantId || (req as any).tenantId || '');

/** Resolve the range or answer 400 — an unbounded range is an unbounded scan. */
const withRange = (req: Request, res: Response) => {
  const r = resolveRange({ from: req.query.from, to: req.query.to });
  if (!r.ok) {
    // Cast at the boundary, as the rest of the project does — it builds without
    // strictNullChecks, so the discriminant does not narrow on its own.
    res.status(400).json({ message: (r as any).message });
    return null;
  }
  return r;
};

const envelope = (range: any, data: any, coverage: Record<string, any> = {}) => ({
  policyVersion: ANALYTICS_VERSION,
  range: { from: range.from, to: range.to, days: range.days, timezone: 'UTC' },
  generatedAt: new Date().toISOString(),
  data,
  coverage,
});

const fail = (res: Response, what: string, e: any) => {
  console.error(`[cp-analytics] ${what}:`, e?.message || e);
  res.status(500).json({ message: `Could not build ${what}.` });
};

/** GET /passport/admin/analytics/overview — cohorts and the product funnel. */
export const overview = async (req: Request, res: Response) => {
  const range = withRange(req, res);
  if (!range) return;
  try {
    res.json(envelope(range, await buildLearningFunnel(tenantOf(req), range)));
  } catch (e) { fail(res, 'the overview', e); }
};

/** GET /passport/admin/analytics/skills */
export const skills = async (req: Request, res: Response) => {
  const range = withRange(req, res);
  if (!range) return;
  try {
    const data = await skillAnalytics(tenantOf(req));
    res.json(envelope(range, data, {
      skills: data.coverage,
      currentRoleReadinessDistribution: UNAVAILABLE_DISTRIBUTIONS.currentRoleReadinessDistribution,
    }));
  } catch (e) { fail(res, 'skill analytics', e); }
};

/** GET /passport/admin/analytics/progress — improvement and roadmap together. */
export const progress = async (req: Request, res: Response) => {
  const range = withRange(req, res);
  if (!range) return;
  try {
    const tenantId = tenantOf(req);
    const [improvement, roadmap] = await Promise.all([
      improvementAnalytics(tenantId, range),
      roadmapAnalytics(tenantId),
    ]);
    res.json(envelope(range, { improvement, roadmap }, {
      // Improvement is a PERIOD metric over frozen snapshots; roadmap counts are current state.
      reassessmentReadinessChange: 'available',
      roadmapReadinessSnapshot: roadmap.roadmapReadinessSnapshot ? 'available' : 'unavailable',
      currentRoleReadinessDistribution: UNAVAILABLE_DISTRIBUTIONS.currentRoleReadinessDistribution,
    }));
  } catch (e) { fail(res, 'progress analytics', e); }
};

/** GET /passport/admin/analytics/engagement — activity, missions, XP. */
export const engagement = async (req: Request, res: Response) => {
  const range = withRange(req, res);
  if (!range) return;
  try {
    res.json(envelope(range, await engagementAnalytics(tenantOf(req), range)));
  } catch (e) { fail(res, 'engagement analytics', e); }
};

/** GET /passport/admin/analytics/economy — coins, budget, redemptions. */
export const economy = async (req: Request, res: Response) => {
  const range = withRange(req, res);
  if (!range) return;
  try {
    const data = await rewardAnalytics(tenantOf(req));
    res.json(envelope(range, data, { coins: 'available', budget: data.budget.coverage }));
  } catch (e) { fail(res, 'reward analytics', e); }
};

/**
 * GET /passport/admin/analytics/placement — resume, interview and company.
 *
 * The three CURRENT readiness distributions are reported as unavailable with their reasons
 * rather than substituted. What is persisted appears under its own accurate name.
 */
export const placement = async (req: Request, res: Response) => {
  const range = withRange(req, res);
  if (!range) return;
  try {
    const tenantId = tenantOf(req);
    const [resume, interview, companies] = await Promise.all([
      resumeAnalytics(tenantId),
      interviewAnalytics(tenantId, range),
      companyAnalytics(tenantId, range),
    ]);
    res.json(envelope(range, { resume, interview, companies }, {
      legacyResumeScoreDistribution: 'available',
      interviewEvaluationScoreDistribution: 'available',
      currentResumeReadinessDistribution: UNAVAILABLE_DISTRIBUTIONS.currentResumeReadinessDistribution,
      currentInterviewReadinessDistribution: UNAVAILABLE_DISTRIBUTIONS.currentInterviewReadinessDistribution,
      currentCompanyReadinessDistribution: UNAVAILABLE_DISTRIBUTIONS.currentCompanyReadinessDistribution,
    }));
  } catch (e) { fail(res, 'placement analytics', e); }
};
