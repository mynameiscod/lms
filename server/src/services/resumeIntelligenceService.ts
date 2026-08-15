import PassportResume from '../models/PassportResume';
import CareerSkill from '../models/CareerSkill';
import { calculateStudentRoleReadiness, RoleReadinessResult } from './roleReadinessService';
import {
  PLACEMENT_READINESS_VERSION, RESUME_WEIGHTS, ResumeDimension,
  ClaimStatus, CLAIM_MESSAGE, CLAIM_EVIDENCE_RATIO,
  MIN_USEFUL_BULLET_CHARS, IMPACT_SIGNALS, MAX_RECOMMENDATIONS,
  RecommendationPriority, weightedScore, clamp100,
} from '../data/placementReadinessPolicy';

/**
 * Is this resume ready for the role the student is aiming at?
 *
 * A DIFFERENT QUESTION FROM "CAN THEY DO THE JOB". Module 8 already answers that. This asks
 * whether the document represents them — a student can be genuinely strong and have a resume
 * that shows none of it, and that is an afternoon's work rather than three months of study.
 * Keeping the two figures apart is the only way a student can tell which problem they have.
 *
 * A RESUME NEVER MOVES SKILL DNA. Nothing in this file writes evidence, a profile or a
 * readiness figure. "Java" on a document is a claim; treating it as a demonstration would
 * turn Skill DNA into a measure of how students describe themselves.
 *
 * DETERMINISTIC, AND DELIBERATELY SO. Every dimension here is answerable from structured
 * resume sections and the role blueprint. Asking a language model whether a phone number
 * exists would be slower, less reliable and billed by the token.
 */

export interface ResumeDimensionScore {
  dimension: ResumeDimension;
  score: number;
  detail: string;
}

export interface SkillClaim {
  skillKey: string;
  skillName: string;
  status: ClaimStatus;
  message: string;
  /** What CareerPilot has actually measured. Null when never measured. */
  measuredScore: number | null;
  requiredByRole: boolean;
}

export interface ResumeRecommendation {
  priority: RecommendationPriority;
  action: string;
  /** The skill it relates to, where there is one. Not every action is a skill. */
  skillKey?: string;
}

export interface ResumeReadiness {
  available: true;
  policyVersion: string;
  role: { key: string; name: string };
  resumeVersion: number;
  blueprintVersion: number;
  readiness: number;
  dimensions: ResumeDimensionScore[];
  claims: SkillClaim[];
  recommendations: ResumeRecommendation[];
  analysedAt: Date;
}

export interface ResumeReadinessUnavailable {
  available: false;
  reason: 'NO_RESUME' | 'ROLE_NOT_SELECTED' | 'ROLE_BLUEPRINT_NOT_READY';
  message: string;
}

export type ResumeReadinessOutcome = ResumeReadiness | ResumeReadinessUnavailable;

/** Everything the resume says, flattened once for keyword and structure checks. */
const resumeText = (sections: any): string => {
  const parts: string[] = [
    sections?.summary || '',
    ...(sections?.skills || []).flatMap((g: any) => [g.category, ...(g.items || [])]),
    ...(sections?.projects || []).flatMap((p: any) => [p.title, p.description, ...(p.bullets || [])]),
    ...(sections?.experience || []).flatMap((e: any) => [e.role, e.company, e.description, ...(e.bullets || [])]),
    ...(sections?.certifications || []).map((c: any) => c.name),
  ];
  return parts.filter(Boolean).join(' \n ').toLowerCase();
};

/**
 * Whether the resume demonstrates a skill anywhere.
 *
 * Matches the skill's canonical name and its configured aliases — the aliases exist on
 * CareerSkill precisely so "Postgres" and "PostgreSQL" are the same thing. It is a presence
 * check on structured text, not an inference: it establishes that the resume MENTIONS the
 * skill, never that the student has it.
 */
const mentions = (text: string, skill: { key: string; name: string; aliases?: string[] }): boolean => {
  const needles = [skill.name, ...(skill.aliases || []), skill.key.replace(/_/g, ' ')]
    .filter(Boolean)
    .map(s => String(s).toLowerCase().trim())
    .filter(s => s.length > 1);
  return needles.some(n => text.includes(n));
};

/**
 * Score a student's resume against the role they are aiming at.
 *
 * Reads Module 8's verdict for what the role requires and what the student has demonstrated;
 * neither is recomputed here.
 */
export async function analyseResume(
  tenantId: string, studentId: string, now: Date = new Date(),
): Promise<ResumeReadinessOutcome> {
  const [resume, readiness] = await Promise.all([
    PassportResume.findOne({ tenantId, studentId }).lean() as any,
    calculateStudentRoleReadiness(tenantId, studentId),
  ]);

  if (!resume) {
    return { available: false, reason: 'NO_RESUME', message: 'Build your resume first and we will review it against your target role.' };
  }
  if (!readiness.available) {
    const un = readiness as { reason: string };
    return {
      available: false,
      reason: un.reason === 'ROLE_NOT_SELECTED' ? 'ROLE_NOT_SELECTED' : 'ROLE_BLUEPRINT_NOT_READY',
      message: un.reason === 'ROLE_NOT_SELECTED'
        ? 'Choose a target role and we will review your resume against it.'
        : 'This role is not configured yet, so we cannot review your resume against it.',
    };
  }

  const ready = readiness as RoleReadinessResult;
  const sections = resume.sections || {};
  const text = resumeText(sections);

  const skillDocs = await CareerSkill
    .find({ key: { $in: ready.skills.map(s => s.skillKey) } })
    .select('key name aliases').lean() as any[];
  const skillMeta = new Map(skillDocs.map(s => [s.key, s]));

  // ── the claim/evidence comparison, which is the genuinely new thing here ──
  const claims: SkillClaim[] = ready.skills.map(s => {
    const meta = skillMeta.get(s.skillKey) || { key: s.skillKey, name: s.skillName };
    const onResume = mentions(text, meta as any);
    const measured = s.studentScore;

    let status: ClaimStatus;
    if (onResume && measured === null) status = 'NEEDS_VALIDATION';
    else if (onResume && measured !== null && measured < s.targetScore * CLAIM_EVIDENCE_RATIO) status = 'CLAIM_EXCEEDS_EVIDENCE';
    else if (onResume) status = 'VERIFIED';
    // Demonstrated but absent from the document — the reverse gap, and easy to fix.
    else if (measured !== null && s.status !== 'PRIORITY_GAP') status = 'MISSING_FROM_RESUME';
    else status = 'MISSING_FROM_RESUME';

    return {
      skillKey: s.skillKey,
      skillName: s.skillName,
      status,
      message: CLAIM_MESSAGE[status],
      measuredScore: measured,
      requiredByRole: true,
    };
  });

  // ── dimensions ──
  const projects = sections.projects || [];
  const allBullets = projects.flatMap((p: any) => [...(p.bullets || []), p.description || '']).filter(Boolean);

  const has = (v: any) => !!(v && String(v).trim());
  const completenessChecks = [
    has(sections.contact?.email),
    has(sections.contact?.phone),
    has(sections.contact?.name),
    (sections.education || []).length > 0,
    (sections.skills || []).length > 0,
    projects.length > 0,
    has(sections.contact?.github) || has(sections.contact?.linkedin),
  ];
  const completeness = clamp100((completenessChecks.filter(Boolean).length / completenessChecks.length) * 100);

  const mentioned = claims.filter(c => c.status !== 'MISSING_FROM_RESUME').length;
  const roleAlignment = clamp100(ready.skills.length ? (mentioned / ready.skills.length) * 100 : 0);

  // Only VERIFIED counts here: the resume says it AND something measured it.
  const verified = claims.filter(c => c.status === 'VERIFIED').length;
  const skillEvidence = clamp100(ready.skills.length ? (verified / ready.skills.length) * 100 : 0);

  const strongBullets = allBullets.filter((b: string) => String(b).length >= MIN_USEFUL_BULLET_CHARS).length;
  const projectStrength = projects.length === 0
    ? 0
    : clamp100(Math.min(100, (projects.length / 3) * 50 + (allBullets.length ? (strongBullets / allBullets.length) * 50 : 0)));

  const withImpact = allBullets.filter((b: string) =>
    IMPACT_SIGNALS.some(sig => String(b).toLowerCase().includes(sig))).length;
  const impact = clamp100(allBullets.length ? (withImpact / allBullets.length) * 100 : 0);

  const atsChecks = [
    (sections.education || []).length > 0,
    (sections.skills || []).length > 0,
    projects.length > 0,
    has(sections.summary),
    allBullets.length >= 3,
  ];
  const atsQuality = clamp100((atsChecks.filter(Boolean).length / atsChecks.length) * 100);

  const dimensions: ResumeDimensionScore[] = [
    { dimension: 'COMPLETENESS', score: completeness, detail: `${completenessChecks.filter(Boolean).length} of ${completenessChecks.length} essentials present` },
    { dimension: 'ROLE_ALIGNMENT', score: roleAlignment, detail: `${mentioned} of ${ready.skills.length} role skills appear` },
    { dimension: 'SKILL_EVIDENCE', score: skillEvidence, detail: `${verified} role skills both claimed and measured` },
    { dimension: 'PROJECT_STRENGTH', score: projectStrength, detail: `${projects.length} project${projects.length === 1 ? '' : 's'}, ${strongBullets} substantial bullet${strongBullets === 1 ? '' : 's'}` },
    { dimension: 'IMPACT', score: impact, detail: `${withImpact} of ${allBullets.length} bullets show a measurable outcome` },
    { dimension: 'ATS_QUALITY', score: atsQuality, detail: `${atsChecks.filter(Boolean).length} of ${atsChecks.length} structural checks pass` },
  ];

  return {
    available: true,
    policyVersion: PLACEMENT_READINESS_VERSION,
    role: { key: ready.role.key, name: ready.role.name },
    resumeVersion: resume.version || 1,
    blueprintVersion: ready.blueprintVersion,
    readiness: weightedScore(
      dimensions.map(d => ({ key: d.dimension, score: d.score })),
      RESUME_WEIGHTS,
    ),
    dimensions,
    claims,
    recommendations: recommendationsFrom(claims, dimensions, sections, ready),
    analysedAt: now,
  };
}

/**
 * What to actually do about it.
 *
 * NAMED AND SPECIFIC. "Improve your resume" is not an action. Every line below names the
 * thing to change, and where the fix is about the role, it names the skill too.
 *
 * NOTHING IS INVENTED. A recommendation asks the student to add something TRUE — a project
 * they built, a metric they have. It never supplies the fact.
 */
function recommendationsFrom(
  claims: SkillClaim[],
  dimensions: ResumeDimensionScore[],
  sections: any,
  ready: RoleReadinessResult,
): ResumeRecommendation[] {
  const out: ResumeRecommendation[] = [];
  const dim = (d: ResumeDimension) => dimensions.find(x => x.dimension === d)?.score ?? 0;

  // Demonstrated and unmentioned is the cheapest win on the whole page: they already have
  // the evidence, the document just does not say so.
  for (const c of claims.filter(c => c.status === 'MISSING_FROM_RESUME' && c.measuredScore !== null).slice(0, 2)) {
    out.push({
      priority: 'CRITICAL',
      action: `Add a project or bullet showing your ${c.skillName} work — you have demonstrated it, but your resume does not show it.`,
      skillKey: c.skillKey,
    });
  }

  const unshown = claims.filter(c => c.status === 'MISSING_FROM_RESUME' && c.measuredScore === null);
  if (unshown.length) {
    out.push({
      priority: 'CRITICAL',
      action: `${ready.role.name} roles expect ${unshown.slice(0, 3).map(c => c.skillName).join(', ')}. Your resume does not demonstrate ${unshown.length === 1 ? 'it' : 'them'} yet.`,
    });
  }

  if (dim('IMPACT') < 40 && (sections.projects || []).length > 0) {
    out.push({
      priority: 'IMPORTANT',
      // Asks for a real number; never offers one.
      action: 'Add a measurable outcome to at least one project bullet — what it handled, sped up or replaced.',
    });
  }

  if (dim('PROJECT_STRENGTH') < 50) {
    out.push({
      priority: 'IMPORTANT',
      action: 'Expand your project bullets to say what you built and which technologies you used, not just what the project was.',
    });
  }

  const contact = sections.contact || {};
  if (!contact.github && !contact.linkedin) {
    out.push({ priority: 'IMPORTANT', action: 'Add your GitHub or LinkedIn link.' });
  }

  for (const c of claims.filter(c => c.status === 'NEEDS_VALIDATION').slice(0, 1)) {
    out.push({
      priority: 'OPTIONAL',
      action: `Take a skill check-in covering ${c.skillName} so your resume claim is backed by measured evidence.`,
      skillKey: c.skillKey,
    });
  }

  const order: RecommendationPriority[] = ['CRITICAL', 'IMPORTANT', 'OPTIONAL'];
  return out
    .sort((a, b) => order.indexOf(a.priority) - order.indexOf(b.priority))
    .slice(0, MAX_RECOMMENDATIONS);
}
