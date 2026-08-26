import mongoose from 'mongoose';
import User from '../models/User';
import PersonalizedAssessment from '../models/PersonalizedAssessment';
import StudentSkillProfile from '../models/StudentSkillProfile';
import CareerRoadmap from '../models/CareerRoadmap';
import PassportInterview from '../models/PassportInterview';
import PassportResume from '../models/PassportResume';
import { XpLedger } from '../models/GamificationModels';
import {
  careerPilotMemberFilter, activeMemberFilter, expiredMemberFilter,
  freeMemberFilter, onboardedMemberFilter,
} from './careerPilotPopulation';
import { ROLE_NOT_SURE } from './careerDomainService';
import { Metric, rate, DateRange } from '../data/analyticsPolicy';

/**
 * How far members get through CareerPilot — the PRODUCT funnel.
 *
 * NOT THE SALES FUNNEL. passportFunnelService answers "who do I ring today", ranking people
 * by how close they are to paying. This answers "where does the product lose people",
 * measuring how far they get through the thing they signed up for. Same members, different
 * question, and collapsing them would produce a screen that serves neither: a sales caller
 * does not care that somebody has a roadmap, and a product owner does not care that they
 * opened Razorpay.
 *
 * READ-ONLY, AND NOT THE OWNER OF ANY NUMBER. Every stage is counted from the module that
 * already decides it — Module 6's assessments, Module 7's skill profiles, Module 9's
 * roadmaps, Module 11's XP ledger, Modules 14 and 15's own records. Analytics that computed
 * its own version of "has a roadmap" would be a second truth that drifts silently.
 *
 * ONE DENOMINATOR, STATED. Every stage is a share of the CareerPilot member population as
 * Module 15's shared predicate defines it — never of all LMS users, and never of the stage
 * above, which would turn a funnel into a chain of unrelated percentages.
 *
 * COUNTS, NOT DOCUMENTS. Every stage is a countDocuments or a distinct-count aggregation
 * bounded by tenant. Nothing loads a member list into Node; the whole funnel is a handful of
 * counts regardless of whether the tenant has fifty members or fifty thousand.
 */

export type LearningStageKey =
  | 'member'
  | 'context_completed'
  | 'role_selected'
  | 'assessment_started'
  | 'assessment_completed'
  | 'skill_dna'
  | 'roadmap_generated'
  | 'first_mission'
  | 'active_7d'
  | 'reassessment_completed'
  | 'resume_analysed'
  | 'mock_interview_completed'
  | 'company_target_selected';

export interface LearningStage {
  key: LearningStageKey;
  label: string;
  /** What being in this stage actually means, in the reader's terms. */
  meaning: string;
  /** Which collection decides it — so a disputed number can be checked at source. */
  source: string;
  count: number;
  /** Share of the member population. Null when there are no members at all. */
  shareOfMembers: number | null;
}

export interface CohortCounts {
  members: number;
  active: number;
  free: number;
  expired: number;
  onboarded: number;
}

const DEFS: { key: LearningStageKey; label: string; meaning: string; source: string }[] = [
  { key: 'member', label: 'CareerPilot members', source: 'User.passport enrolment marker',
    meaning: 'Enrolled in CareerPilot, free or paid. The denominator for every stage below.' },
  { key: 'context_completed', label: 'Career context completed', source: 'User.passport.contextCompletedAt',
    meaning: 'Finished CareerPilot onboarding — told us their course, role and time budget.' },
  { key: 'role_selected', label: 'Target role chosen', source: 'User.passport.primaryRole',
    meaning: 'Picked a role to aim at. NOT_SURE is an answer, but not a chosen role.' },
  { key: 'assessment_started', label: 'Assessment started', source: 'PersonalizedAssessment',
    meaning: 'Opened a personalised assessment, whether or not they finished it.' },
  { key: 'assessment_completed', label: 'Assessment completed', source: 'PersonalizedAssessment.submittedAt',
    meaning: 'Submitted an assessment, so their answers were graded.' },
  { key: 'skill_dna', label: 'Skill DNA available', source: 'StudentSkillProfile',
    meaning: 'At least one skill has been measured, so readiness can be calculated.' },
  { key: 'roadmap_generated', label: 'Roadmap generated', source: 'CareerRoadmap',
    meaning: 'A 90-day plan exists, active or since superseded.' },
  { key: 'first_mission', label: 'First mission completed', source: 'XpLedger CAREER_MISSION_COMPLETED',
    meaning: 'Did one day of the plan. The first real act of using the product.' },
  { key: 'active_7d', label: 'Active in the last 7 days', source: 'XpLedger',
    meaning: 'Earned XP in the last seven days — activity the server witnessed, not a page view.' },
  { key: 'reassessment_completed', label: 'Reassessed', source: 'PersonalizedAssessment purpose',
    meaning: 'Sat a second assessment, so improvement can be measured against a frozen before.' },
  { key: 'resume_analysed', label: 'Resume analysed', source: 'PassportResume',
    meaning: 'Has a resume CareerPilot has scored.' },
  { key: 'mock_interview_completed', label: 'Mock interview completed', source: 'PassportInterview',
    meaning: 'Finished and had graded at least one mock interview.' },
  { key: 'company_target_selected', label: 'Target company chosen', source: 'User.passport.targetCompanies',
    meaning: 'Picked at least one company to prepare for.' },
];

/** Members of this tenant, as ObjectIds, for the collections keyed by studentId. */
async function memberIds(tenantId: string): Promise<mongoose.Types.ObjectId[]> {
  if (!mongoose.isValidObjectId(tenantId)) return [];
  const rows = await User.find({
    tenantId: new mongoose.Types.ObjectId(tenantId),
    ...careerPilotMemberFilter(),
  }).select('_id').lean() as any[];
  return rows.map(r => r._id);
}

/**
 * How many distinct members appear in a collection keyed by studentId.
 *
 * `$group` on studentId rather than countDocuments, because a member with three assessments
 * is one member who reached the assessment stage, not three. Counting rows would let a
 * single enthusiastic student push a stage above 100%.
 */
async function distinctMembers(
  model: any, ids: mongoose.Types.ObjectId[], match: Record<string, any>,
): Promise<number> {
  if (!ids.length) return 0;
  const [row] = await model.aggregate([
    { $match: { studentId: { $in: ids }, ...match } },
    { $group: { _id: '$studentId' } },
    { $count: 'n' },
  ]);
  return row?.n || 0;
}

export interface LearningFunnelResult {
  cohorts: CohortCounts;
  stages: LearningStage[];
  metrics: Metric[];
}

/**
 * Build the product funnel for one tenant.
 *
 * The member list is read ONCE and reused as an id filter for every downstream count, so
 * this is a fixed number of queries rather than one per stage per member.
 */
export async function buildLearningFunnel(
  tenantId: string,
  range: DateRange,
): Promise<LearningFunnelResult> {
  const tenantOid = mongoose.isValidObjectId(tenantId) ? new mongoose.Types.ObjectId(tenantId) : null;
  const empty: CohortCounts = { members: 0, active: 0, free: 0, expired: 0, onboarded: 0 };
  if (!tenantOid) {
    return { cohorts: empty, stages: [], metrics: [] };
  }

  const base = { tenantId: tenantOid };
  const ids = await memberIds(tenantId);
  const members = ids.length;

  const sevenDaysAgo = new Date(Date.now() - 7 * 86_400_000);

  const [
    active, free, expired, onboarded,
    roleSelected,
    started, completed, reassessed,
    skillDna, roadmaps, firstMission, active7d,
    resumes, interviews, targets,
  ] = await Promise.all([
    User.countDocuments({ ...base, ...activeMemberFilter() }),
    User.countDocuments({ ...base, ...freeMemberFilter() }),
    User.countDocuments({ ...base, ...expiredMemberFilter() }),
    User.countDocuments({ ...base, ...onboardedMemberFilter() }),
    User.countDocuments({
      ...base, ...careerPilotMemberFilter(),
      'passport.primaryRole': { $exists: true, $nin: [null, '', ROLE_NOT_SURE] },
    }),
    distinctMembers(PersonalizedAssessment, ids, { tenantId }),
    distinctMembers(PersonalizedAssessment, ids, { tenantId, status: 'SUBMITTED' }),
    // Reassessments only. This used to read "anything other than INITIAL", which was true
    // when those were the only two kinds; SKILL_CHECK — the one-skill paper a daily plan
    // item opens — would otherwise be reported as a check-in nobody performed.
    distinctMembers(PersonalizedAssessment, ids, {
      tenantId, status: 'SUBMITTED', purpose: 'REASSESSMENT',
    }),
    distinctMembers(StudentSkillProfile, ids, { tenantId }),
    distinctMembers(CareerRoadmap, ids, { tenantId }),
    distinctMembers(XpLedger, ids, { tenantId, eventKey: 'CAREER_MISSION_COMPLETED' }),
    distinctMembers(XpLedger, ids, { tenantId, at: { $gte: sevenDaysAgo } }),
    distinctMembers(PassportResume, ids, { tenantId }),
    distinctMembers(PassportInterview, ids, { tenantId, status: 'completed' }),
    User.countDocuments({
      ...base, ...careerPilotMemberFilter(),
      'passport.targetCompanies.0': { $exists: true },
    }),
  ]);

  const contextCompleted = onboarded;   // the same authoritative field, named for the funnel

  const counts: Record<LearningStageKey, number> = {
    member: members,
    context_completed: contextCompleted,
    role_selected: roleSelected,
    assessment_started: started,
    assessment_completed: completed,
    skill_dna: skillDna,
    roadmap_generated: roadmaps,
    first_mission: firstMission,
    active_7d: active7d,
    reassessment_completed: reassessed,
    resume_analysed: resumes,
    mock_interview_completed: interviews,
    company_target_selected: targets,
  };

  const stages: LearningStage[] = DEFS.map(d => ({
    ...d,
    count: counts[d.key],
    // Every stage is a share of the MEMBER population, never of the stage above — a chain
    // of stage-to-stage percentages cannot be compared with each other or added up.
    shareOfMembers: rate(counts[d.key], members),
  }));

  const metrics: Metric[] = [
    {
      key: 'members', label: 'CareerPilot members', kind: 'SNAPSHOT',
      value: members, cohort: 'CareerPilot member', coverage: 'available',
    },
    {
      key: 'active_members', label: 'Active members', kind: 'SNAPSHOT',
      value: active, cohort: 'CareerPilot member', coverage: 'available',
      note: 'Membership entitlement is live right now. Not the same as recently active.',
    },
    {
      key: 'onboarding_completion', label: 'Onboarding completion', kind: 'SNAPSHOT',
      value: rate(contextCompleted, members), numerator: contextCompleted, denominator: members,
      cohort: 'CareerPilot member', coverage: 'available',
    },
    {
      key: 'assessment_completion', label: 'Assessment completion', kind: 'SNAPSHOT',
      value: rate(completed, members), numerator: completed, denominator: members,
      cohort: 'CareerPilot member', coverage: 'available',
      note: 'Members who submitted a personalised assessment, over all members.',
    },
    {
      key: 'roadmap_adoption', label: 'Roadmap adoption', kind: 'SNAPSHOT',
      value: rate(roadmaps, members), numerator: roadmaps, denominator: members,
      cohort: 'CareerPilot member', coverage: 'available',
    },
    {
      key: 'active_7d', label: 'Active in the last 7 days', kind: 'PERIOD',
      value: rate(active7d, members), numerator: active7d, denominator: members,
      cohort: 'CareerPilot member', coverage: 'available',
      note: 'A fixed seven-day window ending now — it does not follow the selected range.',
    },
    {
      key: 'reassessment_participation', label: 'Reassessment participation', kind: 'SNAPSHOT',
      value: rate(reassessed, completed), numerator: reassessed, denominator: completed,
      cohort: 'Members who completed a first assessment', coverage: 'available',
      note: 'Only somebody who has sat one assessment can sit a second, so the denominator '
        + 'is completions rather than members.',
    },
  ];

  return {
    cohorts: { members, active, free, expired, onboarded },
    stages,
    metrics,
  };
}
