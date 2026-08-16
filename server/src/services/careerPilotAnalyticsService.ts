import mongoose from 'mongoose';
import User from '../models/User';
import CareerSkill from '../models/CareerSkill';
import RoleSkillBlueprint from '../models/RoleSkillBlueprint';
import StudentSkillProfile from '../models/StudentSkillProfile';
import PersonalizedAssessment from '../models/PersonalizedAssessment';
import CareerRoadmap from '../models/CareerRoadmap';
import PassportInterview from '../models/PassportInterview';
import PassportResume from '../models/PassportResume';
import MockTestAttempt from '../models/MockTestAttempt';
import { XpLedger } from '../models/GamificationModels';
import { CoinLedger } from '../models/CoinModels';
import { RewardRedemption } from '../models/RewardModels';
import { careerPilotMemberFilter } from './careerPilotPopulation';
import { listCareerRoles } from './careerRoleService';
import { getRoleSkillBlueprint } from './roleSkillBlueprintService';
import { budgetSummary } from './rewardBudgetService';
import { targetScoreFor, classifyGap, isSufficientlyAssessed, GapStatus } from '../data/roleReadinessPolicy';
import { Coverage, DateRange, Metric, rate } from '../data/analyticsPolicy';

/**
 * CareerPilot analytics, by domain.
 *
 * ANALYTICS OWNS NOTHING. Every figure is read from the module that already decides it, and
 * the gap classification below is imported from Module 8's policy rather than restated — a
 * second opinion on what "needs work" means would disagree with the student's own screen.
 *
 * WHAT IS NOT HERE MATTERS AS MUCH AS WHAT IS. Current Role, Resume, Interview and Company
 * Readiness are computed on demand and never persisted, deliberately: a stored figure would
 * be a fourth thing to invalidate whenever a score, a role or a blueprint changed. That
 * makes a COHORT-WIDE distribution of them impossible to obtain without recomputing per
 * student — a fan-out this module refuses. They are reported as `unavailable` with the
 * reason, and the persisted things that are genuinely available are reported under their own
 * accurate names. Nothing is relabelled to fill the gap.
 *
 * BOUNDED. Every function is a fixed number of aggregations whose output is proportional to
 * the SKILL CATALOGUE or the STAGE VOCABULARY, never to the number of students.
 */

const oid = (t: string) => (mongoose.isValidObjectId(t) ? new mongoose.Types.ObjectId(t) : null);

/** Member ids for this tenant. One read, reused by every domain that needs it. */
async function memberIds(tenantId: string): Promise<mongoose.Types.ObjectId[]> {
  const t = oid(tenantId);
  if (!t) return [];
  const rows = await User.find({ tenantId: t, ...careerPilotMemberFilter() }).select('_id').lean() as any[];
  return rows.map(r => r._id);
}

/** The four figures that cannot honestly be aggregated, stated once. */
export const UNAVAILABLE_DISTRIBUTIONS = {
  currentRoleReadinessDistribution: {
    coverage: 'unavailable' as Coverage,
    reason: 'Current readiness is derived on demand from Skill DNA and the published blueprint, '
      + 'and is not persisted at cohort scale. See reassessmentReadinessChange and '
      + 'roadmapReadinessSnapshot for the figures that ARE recorded.',
  },
  currentResumeReadinessDistribution: {
    coverage: 'unavailable' as Coverage,
    reason: 'Module 14 computes resume readiness per request and stores nothing. '
      + 'legacyResumeScoreDistribution is a different, older metric and is reported as such.',
  },
  currentInterviewReadinessDistribution: {
    coverage: 'unavailable' as Coverage,
    reason: 'Module 14 computes interview readiness per request from the latest role interview. '
      + 'interviewEvaluationScoreDistribution is the persisted per-sitting score, not this.',
  },
  currentCompanyReadinessDistribution: {
    coverage: 'unavailable' as Coverage,
    reason: 'Module 15 computes company fit per student per company on demand. A cohort '
      + 'distribution would require recomputing across every student and company.',
  },
};

// ── skills ──────────────────────────────────────────────────────────────────

export interface SkillRow {
  skillKey: string;
  skillName: string;
  /** How many members have this measured well enough to draw a conclusion. */
  assessed: number;
  notAssessed: number;
  limitedEvidence: number;
  /** Mean over SUFFICIENTLY ASSESSED members only. Null when none are. */
  averageScore: number | null;
  targetScore: number | null;
  /** Members classified PRIORITY_GAP or NEEDS_WORK by Module 8's own rule. */
  gapCount: number;
  strongCount: number;
}

export interface BlueprintCoverage {
  selectableRoles: number;
  /** A blueprint resolves — possibly via Module 4's seeded fallback. */
  effectiveBlueprintAvailable: number;
  /** This tenant has authored and stored a blueprint document of its own. */
  tenantAuthoredBlueprint: number;
}

export async function skillAnalytics(tenantId: string): Promise<{
  coverage: Coverage;
  blueprints: BlueprintCoverage;
  topGaps: SkillRow[];
  strongest: SkillRow[];
  skills: SkillRow[];
  unknownEvidence: { notAssessed: number; limitedEvidence: number };
}> {
  const t = oid(tenantId);
  const empty = {
    coverage: 'unavailable' as Coverage,
    blueprints: { selectableRoles: 0, effectiveBlueprintAvailable: 0, tenantAuthoredBlueprint: 0 },
    topGaps: [], strongest: [], skills: [],
    unknownEvidence: { notAssessed: 0, limitedEvidence: 0 },
  };
  if (!t) return empty;

  const roles = await listCareerRoles(tenantId);
  const selectable = roles.filter((r: any) => r.active !== false && r.studentSelectable !== false);

  /**
   * Two different questions, deliberately kept apart.
   *
   * `effectiveBlueprintAvailable` is what RUNTIME sees: Module 4 falls back to a seeded
   * blueprint, so readiness works. `tenantAuthoredBlueprint` is what this tenant actually
   * decided. Reporting the first as configuration would tell an admin they had authored
   * standards they have never seen.
   */
  const authored = await RoleSkillBlueprint.find({ tenantId }).select('roleKey').lean() as any[];
  const authoredKeys = new Set(authored.map(b => b.roleKey));

  let effective = 0;
  const targets = new Map<string, number>();      // skillKey → highest required target
  for (const role of selectable) {
    const bp = await getRoleSkillBlueprint(tenantId, (role as any).key);
    if (!bp) continue;
    effective += 1;
    for (const req of bp.requirements) {
      if (!req.active) continue;
      const target = targetScoreFor(req.targetLevel);
      // The strictest requirement wins: a skill needed at PROFICIENT by one role is not
      // satisfied by clearing a WORKING bar set by another.
      targets.set(req.skillKey, Math.max(targets.get(req.skillKey) ?? 0, target));
    }
  }

  const blueprints: BlueprintCoverage = {
    selectableRoles: selectable.length,
    effectiveBlueprintAvailable: effective,
    tenantAuthoredBlueprint: selectable.filter((r: any) => authoredKeys.has(r.key)).length,
  };

  if (!targets.size) return { ...empty, coverage: 'partial', blueprints };

  const ids = await memberIds(tenantId);
  if (!ids.length) return { ...empty, coverage: 'available', blueprints };

  /**
   * One aggregation for every skill, grouped in the database.
   *
   * GROUPED BY DISTINCT OBSERVATION, NOT BY SKILL. The obvious shape — group by skillKey and
   * `$push` each member's score — returns one array per skill holding a row PER MEMBER, so
   * its output grows with the cohort and eventually exceeds MongoDB's 16MB document limit
   * and fails outright. Grouping by (skill, score, confidence) and counting instead bounds
   * the result by the skill catalogue times the score range times three confidences: a few
   * thousand rows at most, and the same for fifty members and fifty thousand.
   *
   * The classification still runs in Node through Module 8's own `classifyGap`, once per
   * distinct observation rather than once per member. Re-expressing that rule as aggregation
   * operators would create a second opinion that drifts from the screen it describes.
   */
  const rows = await StudentSkillProfile.aggregate([
    { $match: { tenantId, studentId: { $in: ids }, skillKey: { $in: [...targets.keys()] } } },
    {
      $group: {
        // Only MEDIUM/HIGH confidence counts toward the average — Module 8's rule, and the
        // reason an unmeasured skill can never drag a mean down. Confidence is part of the
        // key so that rule can still be applied to each bucket.
        _id: { skillKey: '$skillKey', score: '$score', confidence: '$confidence' },
        n: { $sum: 1 },
      },
    },
  ]);

  const skillDocs = await CareerSkill.find({ key: { $in: [...targets.keys()] } })
    .select('key name').lean() as any[];
  const nameOf = new Map(skillDocs.map(s => [s.key, s.name]));

  /** skillKey → the distinct (score, confidence) buckets seen for it, each with a count. */
  const measured = new Map<string, Array<{ score: number; confidence: string; n: number }>>();
  for (const r of rows as any[]) {
    const bucket = { score: r._id.score, confidence: r._id.confidence, n: r.n };
    const list = measured.get(r._id.skillKey);
    if (list) list.push(bucket); else measured.set(r._id.skillKey, [bucket]);
  }

  const skills: SkillRow[] = [...targets.entries()].map(([skillKey, targetScore]) => {
    const observations = measured.get(skillKey) || [];
    let assessed = 0; let limited = 0; let sum = 0; let observed = 0;
    const counts: Record<string, number> = {};

    for (const o of observations) {
      // Classified once per distinct observation, then weighted by how many members share
      // it — the same totals the per-member loop produced, at a fraction of the reads.
      const status: GapStatus = classifyGap({
        studentScore: o.score, targetScore, confidence: o.confidence,
      });
      observed += o.n;
      counts[status] = (counts[status] || 0) + o.n;
      if (isSufficientlyAssessed(o.confidence)) { assessed += o.n; sum += o.score * o.n; }
      else limited += o.n;
    }

    return {
      skillKey,
      skillName: nameOf.get(skillKey) || skillKey.replace(/_/g, ' '),
      assessed,
      // Never measured at all — a member with no row for this skill.
      notAssessed: ids.length - observed + (counts.NOT_ASSESSED || 0),
      limitedEvidence: limited,
      // NULL, not 0, when nobody is sufficiently assessed. Averaging an unknown as zero is
      // the single mistake this whole module exists to avoid.
      averageScore: assessed ? Math.round(sum / assessed) : null,
      targetScore,
      gapCount: (counts.PRIORITY_GAP || 0) + (counts.NEEDS_WORK || 0),
      strongCount: (counts.STRONG || 0) + (counts.ON_TRACK || 0),
    };
  });

  const byGap = skills.slice().sort((a, b) => b.gapCount - a.gapCount || a.skillName.localeCompare(b.skillName));
  const byStrength = skills.slice()
    .filter(s => s.averageScore !== null)
    .sort((a, b) => (b.averageScore! - a.averageScore!) || a.skillName.localeCompare(b.skillName));

  return {
    coverage: 'available',
    blueprints,
    topGaps: byGap.filter(s => s.gapCount > 0).slice(0, 10),
    strongest: byStrength.slice(0, 10),
    skills,
    unknownEvidence: {
      notAssessed: skills.reduce((n, s) => n + s.notAssessed, 0),
      limitedEvidence: skills.reduce((n, s) => n + s.limitedEvidence, 0),
    },
  };
}

// ── improvement (Module 13) ─────────────────────────────────────────────────

/**
 * Improvement, from the frozen snapshots and nothing else.
 *
 * Module 13 captures `beforeSnapshot` and `afterSnapshot` at reassessment time and never
 * rewrites them. A student who scored 54, reassessed at 68 and has since reached 75
 * improved by 14 — reconstructing the "before" from today's Skill DNA would report 21 and
 * quietly restate history every time the student learned something.
 *
 * COMPARABLE ONLY. A pair is comparable when both snapshots carry a readiness figure for
 * the SAME role under the SAME blueprint version. Comparing across a role change or a
 * republished blueprint measures the standard moving, not the student.
 */
export async function improvementAnalytics(tenantId: string, range: DateRange) {
  const ids = await memberIds(tenantId);
  if (!ids.length) {
    return {
      coverage: 'available' as Coverage,
      reassessed: 0, comparable: 0, improved: 0, regressed: 0, unchanged: 0,
      averageReadinessDelta: null as number | null,
      incomparable: 0,
    };
  }

  const rows = await PersonalizedAssessment.find({
    tenantId, studentId: { $in: ids }, status: 'SUBMITTED',
    purpose: { $ne: 'INITIAL' },
    submittedAt: { $gte: range.from, $lte: range.to },
  }).select('beforeSnapshot afterSnapshot').lean() as any[];

  let improved = 0; let regressed = 0; let unchanged = 0; let incomparable = 0;
  let deltaSum = 0; let comparable = 0;

  for (const r of rows) {
    const b = r.beforeSnapshot; const a = r.afterSnapshot;
    const usable = b && a
      && typeof b.readiness === 'number' && typeof a.readiness === 'number'
      && b.roleKey === a.roleKey
      && b.blueprintVersion === a.blueprintVersion;

    if (!usable) { incomparable += 1; continue; }

    const delta = a.readiness - b.readiness;
    comparable += 1;
    deltaSum += delta;
    if (delta > 0) improved += 1;
    else if (delta < 0) regressed += 1;
    else unchanged += 1;
  }

  return {
    coverage: 'available' as Coverage,
    reassessed: rows.length,
    comparable, improved, regressed, unchanged, incomparable,
    // Null rather than 0 when nothing is comparable — no reassessment is not no change.
    averageReadinessDelta: comparable ? Math.round(deltaSum / comparable) : null,
  };
}

// ── roadmap (Module 9) ──────────────────────────────────────────────────────

export async function roadmapAnalytics(tenantId: string) {
  const ids = await memberIds(tenantId);
  if (!ids.length) {
    return { coverage: 'available' as Coverage, generated: 0, active: 0, superseded: 0, readinessSnapshot: null as any };
  }

  const [byStatus, snapshot] = await Promise.all([
    CareerRoadmap.aggregate([
      { $match: { tenantId, studentId: { $in: ids } } },
      { $group: { _id: '$status', n: { $sum: 1 }, students: { $addToSet: '$studentId' } } },
    ]),
    // The readiness Module 9 recorded when it generated the plan. A historical figure,
    // named for what it is — never presented as current readiness.
    CareerRoadmap.aggregate([
      { $match: { tenantId, studentId: { $in: ids }, 'input.readiness': { $ne: null } } },
      { $group: { _id: null, n: { $sum: 1 }, avg: { $avg: '$input.readiness' } } },
    ]),
  ]);

  const of = (s: string) => byStatus.find((r: any) => r._id === s);
  const distinct = new Set(byStatus.flatMap((r: any) => r.students.map(String)));

  return {
    coverage: 'available' as Coverage,
    generated: distinct.size,
    active: of('ACTIVE')?.n || 0,
    superseded: of('SUPERSEDED')?.n || 0,
    roadmapReadinessSnapshot: snapshot[0]
      ? { members: snapshot[0].n, averageReadinessAtGeneration: Math.round(snapshot[0].avg) }
      : null,
  };
}

// ── engagement + gamification (Modules 10 + 11) ─────────────────────────────

export async function engagementAnalytics(tenantId: string, range: DateRange) {
  const ids = await memberIds(tenantId);
  const members = ids.length;
  if (!members) {
    return {
      coverage: 'available' as Coverage, members: 0,
      activeToday: 0, active7d: 0, active30d: 0,
      missionsCompleted: 0, membersCompletingMissions: 0,
      xpIssued: 0, xpByEvent: [] as any[],
    };
  }

  const since = (d: number) => new Date(Date.now() - d * 86_400_000);
  const activeSince = async (d: number) => {
    const [row] = await XpLedger.aggregate([
      { $match: { tenantId, studentId: { $in: ids }, at: { $gte: since(d) } } },
      { $group: { _id: '$studentId' } }, { $count: 'n' },
    ]);
    return row?.n || 0;
  };

  const [activeToday, active7d, active30d, missions, xp] = await Promise.all([
    activeSince(1), activeSince(7), activeSince(30),
    XpLedger.aggregate([
      { $match: { tenantId, studentId: { $in: ids }, eventKey: 'CAREER_MISSION_COMPLETED', at: { $gte: range.from, $lte: range.to } } },
      { $group: { _id: null, events: { $sum: 1 }, students: { $addToSet: '$studentId' } } },
    ]),
    // Grouped by event so a total can be explained rather than merely stated.
    XpLedger.aggregate([
      { $match: { tenantId, studentId: { $in: ids }, at: { $gte: range.from, $lte: range.to } } },
      { $group: { _id: '$eventKey', amount: { $sum: '$amount' }, events: { $sum: 1 } } },
      { $sort: { amount: -1 } },
    ]),
  ]);

  return {
    coverage: 'available' as Coverage,
    members,
    activeToday, active7d, active30d,
    missionsCompleted: missions[0]?.events || 0,
    membersCompletingMissions: missions[0]?.students?.length || 0,
    xpIssued: xp.reduce((n: number, r: any) => n + r.amount, 0),
    xpByEvent: xp.map((r: any) => ({ eventKey: r._id, amount: r.amount, events: r.events })),
  };
}

// ── rewards (Module 12) ─────────────────────────────────────────────────────

/**
 * The coin economy, from the LEDGER rather than from balances.
 *
 * CoinLedger stores a signed `coins` per row, so issued and spent are two halves of one
 * grouped sum and cannot double-count. Reading account balances instead would report a
 * derived number as if it were the accounting.
 */
export async function rewardAnalytics(tenantId: string) {
  const ids = await memberIds(tenantId);

  const [ledger, redemptions, budget] = await Promise.all([
    ids.length
      ? CoinLedger.aggregate([
          { $match: { tenantId, studentId: { $in: ids } } },
          {
            $group: {
              _id: null,
              issued: { $sum: { $cond: [{ $gt: ['$coins', 0] }, '$coins', 0] } },
              spent: { $sum: { $cond: [{ $lt: ['$coins', 0] }, { $abs: '$coins' }, 0] } },
            },
          },
        ])
      : Promise.resolve([]),
    RewardRedemption.aggregate([
      { $match: { tenantId } },
      { $group: { _id: '$status', n: { $sum: 1 }, coins: { $sum: '$coinsSpent' } } },
    ]),
    budgetSummary(tenantId).catch(() => null),
  ]);

  const issued = ledger[0]?.issued || 0;
  const spent = ledger[0]?.spent || 0;
  const state = (s: string) => redemptions.find((r: any) => r._id === s)?.n || 0;

  return {
    coverage: 'available' as Coverage,
    coinsIssued: issued,
    coinsSpent: spent,
    // What members still hold, and therefore what the tenant may still owe.
    coinsOutstanding: issued - spent,
    redemptions: {
      pending: state('PENDING'), reserved: state('RESERVED'),
      fulfilled: state('FULFILLED'), cancelled: state('CANCELLED'),
    },
    budget: budget
      ? {
          coverage: 'available' as Coverage,
          enabled: budget.enabled,
          period: budget.period,
          effectiveBudgetPaise: budget.effectiveBudgetPaise,
          committedPaise: budget.reservedPaise + budget.redeemedPaise,
          availablePaise: budget.availablePaise,
          utilisationPercent: budget.effectiveBudgetPaise
            ? Math.round(((budget.reservedPaise + budget.redeemedPaise) / budget.effectiveBudgetPaise) * 100)
            : null,
        }
      : { coverage: 'unavailable' as Coverage, reason: 'Reward budgeting is not configured for this tenant.' },
  };
}

// ── interview + resume, persisted figures only (Module 14) ──────────────────

const bucket = (score: number) =>
  score >= 80 ? '80-100' : score >= 60 ? '60-79' : score >= 40 ? '40-59' : score >= 20 ? '20-39' : '0-19';

export async function interviewAnalytics(tenantId: string, range: DateRange) {
  const ids = await memberIds(tenantId);
  if (!ids.length) {
    return {
      coverage: 'available' as Coverage,
      started: 0, completed: 0, abandoned: 0, finalizing: 0, inProgress: 0,
      completionRate: null as number | null,
      interviewEvaluationScoreDistribution: { coverage: 'available' as Coverage, buckets: {}, scored: 0, average: null as number | null },
      currentInterviewReadinessDistribution: UNAVAILABLE_DISTRIBUTIONS.currentInterviewReadinessDistribution,
    };
  }

  const [byStatus, scores] = await Promise.all([
    PassportInterview.aggregate([
      { $match: { tenantId, studentId: { $in: ids }, createdAt: { $gte: range.from, $lte: range.to } } },
      { $group: { _id: '$status', n: { $sum: 1 } } },
    ]),
    PassportInterview.aggregate([
      {
        $match: {
          tenantId, studentId: { $in: ids }, status: 'completed',
          'evaluation.overallScore': { $ne: null },
          completedAt: { $gte: range.from, $lte: range.to },
        },
      },
      { $group: { _id: null, n: { $sum: 1 }, avg: { $avg: '$evaluation.overallScore' }, all: { $push: '$evaluation.overallScore' } } },
    ]),
  ]);

  const of = (s: string) => byStatus.find((r: any) => r._id === s)?.n || 0;
  const completed = of('completed');
  const started = byStatus.reduce((n: number, r: any) => n + r.n, 0);

  const buckets: Record<string, number> = {};
  for (const s of scores[0]?.all || []) buckets[bucket(s)] = (buckets[bucket(s)] || 0) + 1;

  return {
    coverage: 'available' as Coverage,
    started, completed,
    abandoned: of('abandoned'),
    finalizing: of('finalizing'),
    inProgress: of('in_progress'),
    completionRate: rate(completed, started),
    /**
     * The score Module 14 STORED on each graded sitting. Not Interview Readiness, which is
     * a weighted, on-demand computation over the latest role interview's dimensions.
     */
    interviewEvaluationScoreDistribution: {
      coverage: 'available' as Coverage,
      scored: scores[0]?.n || 0,
      average: scores[0] ? Math.round(scores[0].avg) : null,
      buckets,
    },
    currentInterviewReadinessDistribution: UNAVAILABLE_DISTRIBUTIONS.currentInterviewReadinessDistribution,
  };
}

export async function resumeAnalytics(tenantId: string) {
  const ids = await memberIds(tenantId);
  if (!ids.length) {
    return {
      coverage: 'available' as Coverage, membersWithResume: 0,
      legacyResumeScoreDistribution: { coverage: 'available' as Coverage, scored: 0, average: null as number | null, buckets: {} },
      currentResumeReadinessDistribution: UNAVAILABLE_DISTRIBUTIONS.currentResumeReadinessDistribution,
    };
  }

  const [held, scored] = await Promise.all([
    PassportResume.aggregate([
      { $match: { tenantId, studentId: { $in: ids } } },
      { $group: { _id: '$studentId' } }, { $count: 'n' },
    ]),
    PassportResume.aggregate([
      { $match: { tenantId, studentId: { $in: ids }, 'score.total': { $ne: null } } },
      { $group: { _id: null, n: { $sum: 1 }, avg: { $avg: '$score.total' }, all: { $push: '$score.total' } } },
    ]),
  ]);

  const buckets: Record<string, number> = {};
  for (const s of scored[0]?.all || []) buckets[bucket(s)] = (buckets[bucket(s)] || 0) + 1;

  return {
    coverage: 'available' as Coverage,
    membersWithResume: held[0]?.n || 0,
    /** The older stored resume score. Deliberately NOT called Resume Readiness. */
    legacyResumeScoreDistribution: {
      coverage: 'available' as Coverage,
      scored: scored[0]?.n || 0,
      average: scored[0] ? Math.round(scored[0].avg) : null,
      buckets,
    },
    currentResumeReadinessDistribution: UNAVAILABLE_DISTRIBUTIONS.currentResumeReadinessDistribution,
  };
}

// ── companies (Module 15) ───────────────────────────────────────────────────

export async function companyAnalytics(tenantId: string, range: DateRange) {
  const t = oid(tenantId);
  if (!t) {
    return {
      coverage: 'available' as Coverage, membersWithTarget: 0, topTargets: [], mockTestsCompleted: 0,
      currentCompanyReadinessDistribution: UNAVAILABLE_DISTRIBUTIONS.currentCompanyReadinessDistribution,
    };
  }

  const ids = await memberIds(tenantId);

  // One aggregation over the member documents: unwind the short target list and count.
  // Output is proportional to the number of COMPANIES, not to the number of students.
  const [targets, mocks] = await Promise.all([
    User.aggregate([
      { $match: { tenantId: t, ...careerPilotMemberFilter(), 'passport.targetCompanies.0': { $exists: true } } },
      { $unwind: '$passport.targetCompanies' },
      {
        $group: {
          _id: '$passport.targetCompanies.slug',
          members: { $sum: 1 },
          primary: { $sum: { $cond: ['$passport.targetCompanies.primary', 1, 0] } },
        },
      },
      { $sort: { members: -1 } },
      { $limit: 25 },
    ]),
    ids.length
      ? MockTestAttempt.aggregate([
          { $match: { tenantId, studentId: { $in: ids }, status: 'submitted', submittedAt: { $gte: range.from, $lte: range.to } } },
          { $group: { _id: null, n: { $sum: 1 }, students: { $addToSet: '$studentId' } } },
        ])
      : Promise.resolve([]),
  ]);

  const withTarget = await User.countDocuments({
    tenantId: t, ...careerPilotMemberFilter(), 'passport.targetCompanies.0': { $exists: true },
  });

  return {
    coverage: 'available' as Coverage,
    membersWithTarget: withTarget,
    topTargets: targets.map((r: any) => ({ companySlug: r._id, members: r.members, primaryFor: r.primary })),
    mockTestsCompleted: mocks[0]?.n || 0,
    membersCompletingMockTests: mocks[0]?.students?.length || 0,
    /** Company fit is per student per company, on demand. See the reason. */
    currentCompanyReadinessDistribution: UNAVAILABLE_DISTRIBUTIONS.currentCompanyReadinessDistribution,
  };
}
