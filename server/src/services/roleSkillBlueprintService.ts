import RoleSkillBlueprint, {
  IRoleSkillBlueprint, IRoleSkillRequirement,
  SKILL_IMPORTANCE, SKILL_TARGET_LEVELS, MIN_SKILL_WEIGHT, MAX_SKILL_WEIGHT, DEFAULT_WEIGHT,
  SkillImportance, SkillTargetLevel,
} from '../models/RoleSkillBlueprint';
import CareerSkill, { ICareerSkill } from '../models/CareerSkill';
import { getCareerRole } from './careerRoleService';
import { DEFAULT_DOMAIN } from './careerDomainService';

/**
 * Reading and validating role blueprints.
 *
 * Role validation goes through Module 2's service and skill validation reads Module 3's
 * collection directly — neither is re-implemented here. A second copy of "is this role
 * usable?" would drift from the first, and the drift would only show up as a blueprint
 * referencing something no longer offered.
 *
 * Nothing here computes readiness, a gap, or anything about a student. It answers what a
 * role expects; whether anybody meets it is a later module's question.
 */

const norm = (v: any): string => String(v ?? '').trim().toUpperCase();

export interface ResolvedRequirement extends IRoleSkillRequirement {
  /** Joined from CareerSkill for display. Never stored — the key is the source of truth. */
  skillName: string;
  skillDescription: string;
  skillNodeType: string;
  skillDifficulty: string;
  parentKey: string | null;
  /** False once Module 3 retires the skill. The requirement itself survives. */
  skillActive: boolean;
  /** True when the key resolves to nothing at all — surfaced rather than hidden. */
  missing: boolean;
}

export interface ResolvedBlueprint {
  roleKey: string;
  roleName: string;
  roleActive: boolean;
  domainKey: string;
  published: boolean;
  version: number;
  requirements: ResolvedRequirement[];
  summary: {
    total: number;
    active: number;
    byImportance: Record<string, number>;
    totalWeight: number;
    /** Requirements pointing at a skill that is inactive or gone — worth an admin's eye. */
    stale: number;
  };
  updatedAt?: Date;
  updatedBy?: string;
}

/** The stored blueprint, or null. Tenant-scoped on every path. */
export async function getBlueprintDoc(tenantId: string, roleKey: string): Promise<IRoleSkillBlueprint | null> {
  return RoleSkillBlueprint.findOne({ tenantId, roleKey: norm(roleKey) }).lean() as any;
}

/**
 * A blueprint with its skills joined in.
 *
 * TWO queries regardless of size: one for the blueprint, one for every skill it mentions.
 * Resolving names by looking each key up in turn would be one round trip per requirement,
 * on a screen whose whole purpose is showing twenty of them at once.
 */
export async function getRoleSkillBlueprint(tenantId: string, roleKey: string): Promise<ResolvedBlueprint | null> {
  const key = norm(roleKey);
  const role = await getCareerRole(tenantId, key);
  if (!role) return null;

  const doc = await getBlueprintDoc(tenantId, key);
  const reqs = (doc?.requirements || []) as IRoleSkillRequirement[];

  const skills = reqs.length
    ? await CareerSkill.find({ key: { $in: reqs.map(r => norm(r.skillKey)) } }).lean() as any[]
    : [];
  const byKey = new Map(skills.map(s => [s.key, s]));

  const resolved: ResolvedRequirement[] = reqs.map(r => {
    const s = byKey.get(norm(r.skillKey));
    return {
      ...r,
      skillKey: norm(r.skillKey),
      skillName: s?.name || norm(r.skillKey).replace(/_/g, ' '),
      skillDescription: s?.description || '',
      skillNodeType: s?.nodeType || 'SKILL',
      skillDifficulty: s?.difficulty || 'FOUNDATION',
      parentKey: s?.parentKey || null,
      skillActive: s ? s.active !== false : false,
      missing: !s,
    };
  }).sort((a, b) => a.displayOrder - b.displayOrder || a.skillName.localeCompare(b.skillName));

  const byImportance: Record<string, number> = {};
  for (const i of SKILL_IMPORTANCE) byImportance[i] = 0;
  for (const r of resolved) if (r.active) byImportance[r.importance] = (byImportance[r.importance] || 0) + 1;

  return {
    roleKey: key,
    roleName: role.name,
    roleActive: role.active !== false,
    domainKey: doc?.domainKey || role.domainKey || DEFAULT_DOMAIN,
    published: !!doc?.published,
    version: doc?.version || 0,
    requirements: resolved,
    summary: {
      total: resolved.length,
      active: resolved.filter(r => r.active).length,
      byImportance,
      totalWeight: resolved.filter(r => r.active).reduce((n, r) => n + (r.weight || 0), 0),
      stale: resolved.filter(r => r.missing || !r.skillActive).length,
    },
    updatedAt: doc?.updatedAt,
    updatedBy: doc?.updatedBy,
  };
}

/**
 * Every role with a count of what it expects — one query, not one per role.
 *
 * §41 asks for this on the roles list, and asks for it not to cost a query per row.
 */
export async function getBlueprintSummaries(tenantId: string): Promise<Record<string, { total: number; active: number; published: boolean }>> {
  const docs = await RoleSkillBlueprint.find({ tenantId })
    .select('roleKey requirements published').lean() as any[];

  const out: Record<string, { total: number; active: number; published: boolean }> = {};
  for (const d of docs) {
    const reqs = d.requirements || [];
    out[d.roleKey] = {
      total: reqs.length,
      active: reqs.filter((r: any) => r.active !== false).length,
      published: !!d.published,
    };
  }
  return out;
}

/** Active requirements only — the shape a later engine will want. Nothing consumes it yet. */
export async function getActiveRoleRequirements(tenantId: string, roleKey: string): Promise<IRoleSkillRequirement[]> {
  const doc = await getBlueprintDoc(tenantId, roleKey);
  return (doc?.requirements || []).filter(r => r.active !== false);
}

/** The skill keys a role treats as non-negotiable. Configuration, not a measurement. */
export async function getRequiredSkillKeys(tenantId: string, roleKey: string): Promise<string[]> {
  const reqs = await getActiveRoleRequirements(tenantId, roleKey);
  return reqs.filter(r => r.importance === 'ESSENTIAL' || r.importance === 'IMPORTANT').map(r => norm(r.skillKey));
}

export interface BlueprintValidation { ok: boolean; message?: string }

export interface ValidateInput {
  domainKey: string;
  requirements: Partial<IRoleSkillRequirement>[];
  /** Every skill mentioned, loaded once by the caller. */
  skills: ICareerSkill[];
  /** What the blueprint already required, so a since-retired skill can be kept. */
  existingSkillKeys?: string[];
}

/**
 * Everything that would make a blueprint invalid, before anything is written.
 *
 * The inactive-skill rule follows the correction made in Module 3: it applies to a skill
 * being ADDED, not to one already there. Re-checking a standing requirement would make the
 * whole blueprint uneditable the moment any one of its skills was retired — locking an
 * admin out of the very screen where they would fix it.
 */
export function validateBlueprint(input: ValidateInput): BlueprintValidation {
  const bySkill = new Map(input.skills.map(s => [s.key, s]));
  const already = new Set((input.existingSkillKeys || []).map(norm));
  const seen = new Set<string>();

  for (const r of input.requirements) {
    const skillKey = norm(r.skillKey);
    if (!skillKey) return { ok: false, message: 'Every requirement needs a skill.' };

    // Rejected rather than de-duplicated: two entries for one skill means the caller
    // believes something about the blueprint that is not true, and quietly collapsing
    // them would hide whichever configuration was wrong.
    if (seen.has(skillKey)) {
      return { ok: false, message: `${skillKey} appears twice. A role can expect a skill once.` };
    }
    seen.add(skillKey);

    const skill = bySkill.get(skillKey);
    if (!skill) return { ok: false, message: `Skill ${skillKey} does not exist.` };

    if (skill.domainKey !== input.domainKey) {
      return { ok: false, message: `${skill.name} belongs to a different career domain and cannot be required by this role.` };
    }

    // A group is a shelf — "Programming" is not a thing anybody can be measured against,
    // so requiring it would produce a blueprint entry nothing downstream could use.
    if (skill.nodeType === 'GROUP') {
      return { ok: false, message: `${skill.name} is a grouping, not a measurable skill. Require the skills inside it instead.` };
    }

    if (skill.active === false && !already.has(skillKey)) {
      return { ok: false, message: `${skill.name} is inactive and cannot be newly added.` };
    }

    if (r.importance !== undefined && !SKILL_IMPORTANCE.includes(r.importance as SkillImportance)) {
      return { ok: false, message: `Importance must be one of ${SKILL_IMPORTANCE.join(', ')}.` };
    }
    if (r.targetLevel !== undefined && !SKILL_TARGET_LEVELS.includes(r.targetLevel as SkillTargetLevel)) {
      return { ok: false, message: `Target level must be one of ${SKILL_TARGET_LEVELS.join(', ')}.` };
    }
    if (r.weight !== undefined) {
      const w = Number(r.weight);
      if (!Number.isFinite(w) || !Number.isInteger(w) || w < MIN_SKILL_WEIGHT || w > MAX_SKILL_WEIGHT) {
        return { ok: false, message: `Weight must be a whole number between ${MIN_SKILL_WEIGHT} and ${MAX_SKILL_WEIGHT}.` };
      }
    }
  }

  return { ok: true };
}

/** Shape a submitted list, applying defaults. Validation is separate and runs first. */
export function cleanRequirements(raw: any): IRoleSkillRequirement[] {
  return (Array.isArray(raw) ? raw : []).map((r: any, i: number): IRoleSkillRequirement => {
    const importance: SkillImportance = SKILL_IMPORTANCE.includes(r?.importance) ? r.importance : 'IMPORTANT';
    const w = Number(r?.weight);
    return {
      skillKey: norm(r?.skillKey),
      importance,
      // Falls back to the importance's suggested weight rather than a fixed number, so an
      // omitted weight is at least consistent with what the admin did say.
      weight: Number.isFinite(w) ? Math.round(w) : DEFAULT_WEIGHT[importance],
      targetLevel: SKILL_TARGET_LEVELS.includes(r?.targetLevel) ? r.targetLevel : 'WORKING',
      // Empty means every year, which is what every blueprint written before this said.
      years: Array.isArray(r?.years)
        ? r.years.map((v: any) => String(v).trim()).filter(Boolean).slice(0, 12) : [],
      // Only overrides naming a real level are kept — an unrecognised one would silently
      // become the default and read as a deliberate choice nobody made.
      yearTargets: Array.isArray(r?.yearTargets)
        ? r.yearTargets
            .filter((t: any) => t?.year && SKILL_TARGET_LEVELS.includes(t?.targetLevel))
            .map((t: any) => ({ year: String(t.year).trim(), targetLevel: t.targetLevel }))
            .slice(0, 12)
        : [],
      active: r?.active !== false,
      displayOrder: Number.isFinite(Number(r?.displayOrder)) ? Number(r.displayOrder) : (i + 1) * 10,
      note: r?.note ? String(r.note).trim().slice(0, 240) : undefined,
    };
  }).filter(r => r.skillKey);
}

/** Load every skill a submitted list mentions, in one query. */
export async function loadSkillsFor(requirements: { skillKey?: string }[]): Promise<ICareerSkill[]> {
  const keys = [...new Set(requirements.map(r => norm(r.skillKey)).filter(Boolean))];
  if (!keys.length) return [];
  return CareerSkill.find({ key: { $in: keys } }).lean() as any;
}

/** Which roles in this tenant expect a given skill — asked before retiring one. */
export async function rolesRequiringSkill(tenantId: string, skillKey: string): Promise<string[]> {
  const docs = await RoleSkillBlueprint.find({ tenantId, 'requirements.skillKey': norm(skillKey) })
    .select('roleKey').lean() as any[];
  return docs.map(d => d.roleKey);
}
