import StudentSkillProfile from '../models/StudentSkillProfile';
import CareerSkill from '../models/CareerSkill';
import CompanyRoleProfile, { DEFAULT_ROLE_KEY, ICompanyRoleProfile } from '../models/CompanyRoleProfile';
import { getCareerContext } from './careerContextService';
import { ROLE_NOT_SURE } from './careerDomainService';
import {
  targetScoreFor, classifyGap, skillRatio, priorityScore, isSufficientlyAssessed,
  roleConfidence, STATUS_ORDER, GapStatus,
} from '../data/roleReadinessPolicy';
import {
  COMPANY_FIT_VERSION, classifyFit, FitClassification, FitUnavailable, FIT_UNAVAILABLE_MESSAGE,
} from '../data/companyFitPolicy';

/**
 * How far a student is from what one company expects for one role.
 *
 * SAME ARITHMETIC AS MODULE 8, DIFFERENT REQUIREMENTS. Every judgement about what a score
 * means — the target for a level, when a gap is a priority, what counts as sufficiently
 * assessed, how confidence follows from coverage — is imported from roleReadinessPolicy
 * rather than restated. The company changes the WEIGHTS and TARGETS, not the meaning of a
 * measurement, and that is exactly why the same student can be 74% for TCS and 51% for
 * Amazon on one unchanged Skill DNA.
 *
 * IT READS AND DERIVES. Nothing is persisted, nothing is mutated, and Module 8's role
 * readiness is neither called nor touched. A stored fit figure would be a fourth thing to
 * invalidate whenever a score, a role or a profile changed, and it is cheap to recompute.
 *
 * UNKNOWN IS NOT ZERO. A company requiring System Design of a student nobody has ever asked
 * about produces "needs validation", not 0% — the skill is excluded from the average
 * entirely. Scoring it zero would make somebody who has not been assessed look identical to
 * somebody who cannot do it, which is the one mistake that would send a student to practise
 * the wrong thing.
 *
 * NO AI, no randomness, and nothing about the company's brand or reputation. Comparing two
 * numbers does not need a language model, and a result nobody can reproduce cannot be
 * defended to the student it describes.
 */

export interface CompanySkillFit {
  skillKey: string;
  skillName: string;
  importance: string;
  weight: number;
  targetLevel: string;
  targetScore: number;

  /** Null when never measured — never 0, which would assert a failure we did not observe. */
  studentScore: number | null;
  skillConfidence: string | null;
  evidenceCount: number;

  gapPoints: number | null;
  status: GapStatus;
  priorityScore: number;

  skillInactive: boolean;
  countedInFit: boolean;
}

export interface CompanyFitResult {
  available: true;
  policyVersion: string;
  company: { slug: string };
  role: { key: string; matched: boolean };
  profileVersion: number;
  profileLastReviewedAt?: Date | null;

  /** Null when nothing is sufficiently assessed — not 0, which would assert unreadiness. */
  readiness: number | null;
  coverage: number;
  confidence: 'LOW' | 'MEDIUM' | 'HIGH';
  classification: FitClassification | null;

  summary: {
    requiredSkills: number;
    assessedSkills: number;
    priorityGaps: number;
    needsWork: number;
    onTrack: number;
    strong: number;
    limitedEvidence: number;
    notAssessed: number;
    essentialTotal: number;
    essentialAssessed: number;
  };

  skills: CompanySkillFit[];
  strengths: CompanySkillFit[];
  gaps: CompanySkillFit[];
  /** Required by this company, never measured. Unknowns, deliberately not weaknesses. */
  unknowns: CompanySkillFit[];
  roundSkills: { roundKey: string; skillKeys: string[] }[];
  preparationNotes: string;
}

export interface CompanyFitUnavailable {
  available: false;
  reason: FitUnavailable;
  message: string;
  company: { slug: string };
  role?: { key: string };
}

export type CompanyFitOutcome = CompanyFitResult | CompanyFitUnavailable;

/**
 * The profile in force for a company and role.
 *
 * Role-specific first, then the company-wide default. A company that has said nothing about
 * backend engineers specifically may still have said something about everyone, and using it
 * is better than telling a student we know nothing — but inventing a comparison from another
 * role's expectations would be worse than either.
 *
 * PUBLISHED ONLY. A draft is somebody's work in progress; measuring a student against it
 * would report a standard nobody has agreed to, and the number would move when it was
 * finished.
 */
export async function resolveCompanyProfile(
  tenantId: string, companySlug: string, roleKey: string,
): Promise<{ profile: ICompanyRoleProfile | null; matched: boolean }> {
  const wanted = (roleKey || '').toUpperCase();

  if (wanted && wanted !== DEFAULT_ROLE_KEY) {
    const exact = await CompanyRoleProfile.findOne({
      tenantId, companySlug, roleKey: wanted, status: 'PUBLISHED',
    }).lean() as any;
    if (exact) return { profile: exact, matched: true };
  }

  const fallback = await CompanyRoleProfile.findOne({
    tenantId, companySlug, roleKey: DEFAULT_ROLE_KEY, status: 'PUBLISHED',
  }).lean() as any;
  return { profile: fallback, matched: false };
}

const unavailable = (
  reason: FitUnavailable, companySlug: string, roleKey?: string,
): CompanyFitUnavailable => ({
  available: false,
  reason,
  message: FIT_UNAVAILABLE_MESSAGE[reason],
  company: { slug: companySlug },
  ...(roleKey ? { role: { key: roleKey } } : {}),
});

/**
 * Calculate one student's fit with one company.
 *
 * THREE QUERIES whatever the profile's size: context, the profile, and then skill profiles
 * and skill metadata in one batch each. A lookup per required skill would be twenty round
 * trips for one page, and the company listing calls this for a whole grid.
 */
export async function calculateCompanyFit(
  tenantId: string,
  studentId: string,
  companySlug: string,
  opts: { roleKeyOverride?: string } = {},
): Promise<CompanyFitOutcome> {
  const context = await getCareerContext(tenantId, studentId);
  if (!context) return unavailable('ROLE_NOT_SELECTED', companySlug);

  /**
   * The student's own stored role, unless an admin explicitly asked about another.
   *
   * Never read from a student's request. Choosing your own target role against a company
   * would let somebody pick the role they already match and read it as being ready.
   */
  const roleKey = (opts.roleKeyOverride || context.career.primaryRole || '').toUpperCase();
  if (!roleKey || roleKey === ROLE_NOT_SURE) {
    return unavailable('ROLE_NOT_SELECTED', companySlug);
  }

  const { profile, matched } = await resolveCompanyProfile(tenantId, companySlug, roleKey);
  if (!profile) return unavailable('PROFILE_NOT_CONFIGURED', companySlug, roleKey);

  const requirements = profile.skillRequirements || [];
  if (!requirements.length) return unavailable('REQUIREMENTS_NOT_CONFIGURED', companySlug, roleKey);

  const skillKeys = requirements.map(r => r.skillKey);
  const [profiles, skillDocs] = await Promise.all([
    StudentSkillProfile.find({ tenantId, studentId, skillKey: { $in: skillKeys } }).lean() as any,
    CareerSkill.find({ key: { $in: skillKeys } }).select('key name active').lean() as any,
  ]);

  const profileByKey = new Map<string, any>((profiles as any[]).map(p => [p.skillKey, p]));
  const skillByKey = new Map<string, any>((skillDocs as any[]).map(s => [s.key, s]));

  const skills: CompanySkillFit[] = requirements.map(req => {
    const measured = profileByKey.get(req.skillKey);
    const skill = skillByKey.get(req.skillKey);
    const targetScore = targetScoreFor(req.targetLevel);

    const studentScore = measured ? measured.score : null;
    const confidence = measured ? measured.confidence : null;
    const status = classifyGap({ studentScore, targetScore, confidence });
    const counted = isSufficientlyAssessed(confidence);

    return {
      skillKey: req.skillKey,
      skillName: skill?.name || req.skillKey.replace(/_/g, ' '),
      importance: req.importance,
      weight: req.weight,
      targetLevel: req.targetLevel,
      targetScore,
      studentScore,
      skillConfidence: confidence,
      evidenceCount: measured?.evidenceCount || 0,
      // Only a measured shortfall is a gap. An unmeasured skill has no gap, because we have
      // not established one.
      gapPoints: studentScore !== null ? Math.max(0, targetScore - studentScore) : null,
      status,
      priorityScore: counted && studentScore !== null
        ? priorityScore({ studentScore, targetScore, weight: req.weight, importance: req.importance })
        : 0,
      skillInactive: skill ? skill.active === false : true,
      countedInFit: counted,
    };
  });

  // ── the two figures, kept apart ──
  // Readiness is how the student performs against what we have measured; coverage is how
  // much of the company's requirement we have measured at all. One number could not tell a
  // well-evidenced near-miss from three lucky answers.
  const counted = skills.filter(s => s.countedInFit && s.studentScore !== null);
  const countedWeight = counted.reduce((n, s) => n + s.weight, 0);
  const totalWeight = skills.reduce((n, s) => n + s.weight, 0);

  const readiness = countedWeight > 0
    ? Math.round(
        (counted.reduce((n, s) => n + skillRatio(s.studentScore!, s.targetScore) * s.weight, 0) / countedWeight) * 100,
      )
    : null;

  const coverage = totalWeight > 0 ? Math.round((countedWeight / totalWeight) * 100) : 0;

  const essentialTotal = skills.filter(s => s.importance === 'ESSENTIAL').length;
  const essentialAssessed = skills.filter(s => s.importance === 'ESSENTIAL' && s.countedInFit).length;

  const confidence = roleConfidence({ coveragePercent: coverage, essentialTotal, essentialAssessed });

  const sorted = skills.slice().sort((a, b) =>
    STATUS_ORDER[a.status] - STATUS_ORDER[b.status]
    || b.priorityScore - a.priorityScore
    || b.weight - a.weight
    || a.skillName.localeCompare(b.skillName));

  const count = (s: GapStatus) => skills.filter(x => x.status === s).length;

  return {
    available: true,
    policyVersion: COMPANY_FIT_VERSION,
    company: { slug: companySlug },
    role: { key: roleKey, matched },
    profileVersion: profile.version,
    profileLastReviewedAt: profile.lastReviewedAt ?? null,

    readiness,
    coverage,
    confidence,
    classification: classifyFit(readiness),

    summary: {
      requiredSkills: skills.length,
      assessedSkills: counted.length,
      priorityGaps: count('PRIORITY_GAP'),
      needsWork: count('NEEDS_WORK'),
      onTrack: count('ON_TRACK'),
      strong: count('STRONG'),
      limitedEvidence: count('LIMITED_EVIDENCE'),
      notAssessed: count('NOT_ASSESSED'),
      essentialTotal, essentialAssessed,
    },

    skills: sorted,
    strengths: sorted.filter(s => s.status === 'STRONG' || s.status === 'ON_TRACK').slice(0, 5),
    gaps: sorted.filter(s => s.status === 'PRIORITY_GAP' || s.status === 'NEEDS_WORK').slice(0, 5),
    unknowns: sorted.filter(s => s.status === 'NOT_ASSESSED' || s.status === 'LIMITED_EVIDENCE'),
    roundSkills: (profile.roundSkills || []).map(r => ({ roundKey: r.roundKey, skillKeys: r.skillKeys || [] })),
    preparationNotes: profile.preparationNotes || '',
  };
}

/**
 * A cheap fit figure for every company on the listing.
 *
 * ONE read of the student's Skill DNA and ONE read of the published profiles, then the
 * comparison in memory — not calculateCompanyFit() in a loop, which would be two queries per
 * card and forty on a page of twenty companies. It answers the only two questions a card
 * asks: how ready, and how many gaps.
 */
export async function summariseCompanyFits(
  tenantId: string,
  studentId: string,
  companySlugs: string[],
  roleKey: string,
): Promise<Map<string, { readiness: number | null; classification: FitClassification | null; gaps: number }>> {
  const out = new Map<string, { readiness: number | null; classification: FitClassification | null; gaps: number }>();
  const wanted = (roleKey || '').toUpperCase();
  if (!companySlugs.length || !wanted || wanted === ROLE_NOT_SURE) return out;

  const profiles = await CompanyRoleProfile.find({
    tenantId,
    companySlug: { $in: companySlugs },
    roleKey: { $in: [wanted, DEFAULT_ROLE_KEY] },
    status: 'PUBLISHED',
  }).lean() as any[];
  if (!profiles.length) return out;

  // Role-specific beats the company-wide default, exactly as resolveCompanyProfile decides
  // it for the detail page. The two must not disagree, or a card and the page it opens would
  // show different numbers.
  const bySlug = new Map<string, any>();
  for (const p of profiles) {
    const existing = bySlug.get(p.companySlug);
    if (!existing || (p.roleKey === wanted && existing.roleKey !== wanted)) bySlug.set(p.companySlug, p);
  }

  const skillKeys = [...new Set(
    [...bySlug.values()].flatMap((p: any) => (p.skillRequirements || []).map((r: any) => r.skillKey)),
  )];
  if (!skillKeys.length) return out;

  const measured = await StudentSkillProfile
    .find({ tenantId, studentId, skillKey: { $in: skillKeys } })
    .select('skillKey score confidence').lean() as any[];
  const byKey = new Map<string, any>(measured.map(m => [m.skillKey, m]));

  for (const [slug, profile] of bySlug) {
    let countedWeight = 0;
    let ratioWeight = 0;
    let gaps = 0;

    for (const req of (profile.skillRequirements || [])) {
      const m = byKey.get(req.skillKey);
      const targetScore = targetScoreFor(req.targetLevel);
      const status = classifyGap({
        studentScore: m ? m.score : null,
        targetScore,
        confidence: m ? m.confidence : null,
      });
      if (status === 'PRIORITY_GAP' || status === 'NEEDS_WORK') gaps += 1;
      if (!m || !isSufficientlyAssessed(m.confidence)) continue;
      countedWeight += req.weight;
      ratioWeight += skillRatio(m.score, targetScore) * req.weight;
    }

    const readiness = countedWeight > 0 ? Math.round((ratioWeight / countedWeight) * 100) : null;
    out.set(slug, { readiness, classification: classifyFit(readiness), gaps });
  }

  return out;
}
