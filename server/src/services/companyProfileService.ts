import CareerSkill from '../models/CareerSkill';
import CompanyRoleProfile, {
  DEFAULT_ROLE_KEY, ICompanySkillRequirement, ICompanyRoundSkills,
} from '../models/CompanyRoleProfile';
import {
  SKILL_IMPORTANCE, SKILL_TARGET_LEVELS, MIN_SKILL_WEIGHT, MAX_SKILL_WEIGHT,
} from '../models/RoleSkillBlueprint';
import { getCareerRole } from './careerRoleService';
import { nullableNumber } from '../utils/nullableNumber';

/**
 * Validating and versioning a company's preparation profile.
 *
 * THE SKILL KEYS ARE THE WHOLE POINT OF THIS FILE. A company requirement that names a skill
 * the catalogue does not have is not a small data error — it is a requirement no evidence
 * can ever be scored against, so it would sit in the profile forever, drag the weighted
 * total down, and read to the student as a permanent gap they cannot close. Rejected on
 * write, loudly, naming the key.
 *
 * AND NO COMPANY-SPECIFIC SKILLS. There is no path here that creates a CareerSkill. An
 * admin who wants AMAZON_DSA has to add DSA to the canonical catalogue instead, where it
 * means the same thing for every company and every role.
 */

export interface ProfileValidation {
  ok: boolean;
  message?: string;
  /** Keys that do not exist in the catalogue, so the message can name them all at once. */
  unknownSkills?: string[];
  inactiveSkills?: string[];
}

export interface DraftInput {
  roleKey?: string;
  skillRequirements?: any[];
  roundSkills?: any[];
  careerStages?: any[];
  sources?: any[];
  preparationNotes?: string;
  effectiveFrom?: any;
  lastReviewedAt?: any;
}

/** Normalise a requirement row, clamping anything a form could get wrong. */
export function cleanRequirements(rows: any[]): ICompanySkillRequirement[] {
  const seen = new Set<string>();
  const out: ICompanySkillRequirement[] = [];

  for (const r of Array.isArray(rows) ? rows : []) {
    const skillKey = String(r?.skillKey || '').toUpperCase().trim();
    if (!skillKey || seen.has(skillKey)) continue;      // last write wins would hide the clash
    seen.add(skillKey);

    /**
     * A cleared weight box means "use the default", not "weight 1".
     *
     * `Number(null)` and `Number('')` are both 0, which the old guard accepted as finite and
     * then clamped up to the minimum — so an admin who emptied the field got the least
     * important weight available rather than the sensible default they expected, silently.
     */
    const weight = nullableNumber(r?.weight);
    out.push({
      skillKey,
      importance: SKILL_IMPORTANCE.includes(r?.importance) ? r.importance : 'IMPORTANT',
      targetLevel: SKILL_TARGET_LEVELS.includes(r?.targetLevel) ? r.targetLevel : 'WORKING',
      weight: weight !== null
        ? Math.min(MAX_SKILL_WEIGHT, Math.max(MIN_SKILL_WEIGHT, Math.round(weight)))
        : 7,
    });
  }
  return out;
}

export function cleanRoundSkills(rows: any[]): ICompanyRoundSkills[] {
  const out: ICompanyRoundSkills[] = [];
  for (const r of Array.isArray(rows) ? rows : []) {
    const roundKey = String(r?.roundKey || '').trim();
    if (!roundKey) continue;
    out.push({
      roundKey,
      skillKeys: [...new Set<string>(
        (Array.isArray(r?.skillKeys) ? r.skillKeys : [])
          .map((k: any) => String(k || '').toUpperCase().trim())
          .filter(Boolean),
      )],
    });
  }
  return out;
}

/**
 * Every skill named anywhere in the profile must exist in the canonical catalogue.
 *
 * Checked against the live collection rather than a cached list, in ONE query for however
 * many keys the profile names. Retired skills are reported separately from unknown ones:
 * an admin who wrote JAVA_OOP correctly and had it retired last week needs a different
 * message from one who invented AMAZON_JAVA.
 */
export async function validateProfile(
  tenantId: string,
  input: { roleKey: string; skillRequirements: ICompanySkillRequirement[]; roundSkills: ICompanyRoundSkills[] },
): Promise<ProfileValidation> {
  if (!input.skillRequirements.length) {
    return { ok: false, message: 'Add at least one skill requirement before saving.' };
  }

  const roleKey = (input.roleKey || '').toUpperCase();
  if (roleKey !== DEFAULT_ROLE_KEY) {
    const role = await getCareerRole(tenantId, roleKey);
    if (!role) {
      return { ok: false, message: `${roleKey} is not a career role in this tenant.` };
    }
  }

  const keys = [...new Set([
    ...input.skillRequirements.map(r => r.skillKey),
    ...input.roundSkills.flatMap(r => r.skillKeys),
  ])];

  const found = await CareerSkill.find({ key: { $in: keys } }).select('key active').lean() as any[];
  const byKey = new Map(found.map(s => [s.key, s]));

  const unknownSkills = keys.filter(k => !byKey.has(k));
  if (unknownSkills.length) {
    return {
      ok: false,
      unknownSkills,
      message: `Not skills in the catalogue: ${unknownSkills.join(', ')}. Add them to the skill graph first — company-specific skills are not allowed.`,
    };
  }

  const inactiveSkills = keys.filter(k => byKey.get(k)?.active === false);
  if (inactiveSkills.length) {
    return {
      ok: false,
      inactiveSkills,
      message: `These skills have been retired: ${inactiveSkills.join(', ')}. Measuring against a retired skill would produce a gap nobody can close.`,
    };
  }

  return { ok: true };
}

/** The next version number for a company and role, across every status. */
export async function nextVersion(tenantId: string, companySlug: string, roleKey: string): Promise<number> {
  const latest = await CompanyRoleProfile
    .findOne({ tenantId, companySlug, roleKey })
    .sort({ version: -1 }).select('version').lean() as any;
  return (latest?.version || 0) + 1;
}

/**
 * Publish a draft, and retire whatever it replaces.
 *
 * ARCHIVE FIRST, THEN PROMOTE. The partial unique index permits exactly one PUBLISHED
 * profile per company and role, so promoting before archiving would collide with the
 * profile being replaced. Doing it in this order leaves a window of a few milliseconds with
 * no published profile, during which a reader is told the profile is not configured — which
 * is true, momentarily, and is a far better failure than two live profiles where company
 * readiness depends on which one the query returned first.
 */
export async function publishProfile(
  tenantId: string, companySlug: string, roleKey: string, draftId: string, publishedBy: string,
): Promise<{ ok: boolean; message?: string; profile?: any }> {
  const draft = await CompanyRoleProfile.findOne({ _id: draftId, tenantId, companySlug, roleKey });
  if (!draft) return { ok: false, message: 'That draft no longer exists.' };
  if (draft.status === 'PUBLISHED') return { ok: true, profile: draft };
  if (!draft.skillRequirements?.length) {
    return { ok: false, message: 'A profile with no skill requirements cannot be published.' };
  }

  await CompanyRoleProfile.updateMany(
    { tenantId, companySlug, roleKey, status: 'PUBLISHED', _id: { $ne: draft._id } },
    { $set: { status: 'ARCHIVED' } },
  );

  draft.status = 'PUBLISHED';
  draft.publishedAt = new Date();
  draft.publishedBy = publishedBy as any;
  if (!draft.effectiveFrom) draft.effectiveFrom = draft.publishedAt;
  draft.lastReviewedAt = draft.publishedAt;
  await draft.save();

  return { ok: true, profile: draft };
}

/**
 * How long since a profile was last checked, for the admin's freshness column.
 *
 * Reported as a NUMBER OF DAYS and never as a judgement about correctness. Hiring patterns
 * change, but an old profile is not automatically a wrong one, and marking it false because
 * of the calendar would train admins to ignore the flag.
 */
export const daysSinceReview = (lastReviewedAt?: Date | null): number | null =>
  lastReviewedAt ? Math.floor((Date.now() - new Date(lastReviewedAt).getTime()) / 86_400_000) : null;

/** Beyond this, the admin screen asks for a look. Not a claim that anything is wrong. */
export const REVIEW_DUE_DAYS = 180;
