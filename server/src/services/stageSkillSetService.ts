import StageSkillSet, { IStageSkillSet, IStageSkillRequirement } from '../models/StageSkillSet';
import CareerSkill from '../models/CareerSkill';
import { CAREER_STAGES } from './careerStageService';
import type { ResolvedBlueprint, ResolvedRequirement } from './roleSkillBlueprintService';

/**
 * The skill list for a student who has not chosen a role.
 *
 * Resolved into exactly the shape a role blueprint resolves into, so readiness, the paper
 * builder and the roadmap planner consume it without a second code path. The only thing
 * that differs is where the list came from, and that is stated on the object rather than
 * inferred, so a screen can say "these came from the Foundation set" honestly.
 */

/** The pseudo-role a stage set stands in for. Never a real CareerRole key. */
export const stageRoleKey = (stage: string): string => `STAGE:${String(stage).toUpperCase()}`;

export const isStageRoleKey = (roleKey: string): boolean => String(roleKey || '').startsWith('STAGE:');

export const stageFromRoleKey = (roleKey: string): string =>
  String(roleKey || '').replace(/^STAGE:/, '').toLowerCase();

const labelOf = (stage: string): string =>
  CAREER_STAGES.find(s => s.key === stage)?.label || stage;

/** The stored set for a stage, or null. Tenant-scoped on every path. */
export async function getStageSkillSet(tenantId: string, stage: string): Promise<IStageSkillSet | null> {
  // Falls back rather than throwing. This read sits on the path that decides whether a
  // student gets a plan at all, and a failure here should mean "no stage list configured" —
  // exactly the behaviour before stage sets existed — not a broken screen.
  return StageSkillSet.findOne({ tenantId, stage: String(stage || '').toLowerCase() })
    .lean().catch(() => null) as any;
}

/** Every stage, with its set if one exists — what the admin screen lists. */
export async function listStageSkillSets(tenantId: string): Promise<{
  stage: string; label: string; enabled: boolean; count: number; activeCount: number; version: number;
}[]> {
  const rows = await StageSkillSet.find({ tenantId }).lean() as any[];
  const byStage = new Map(rows.map(r => [r.stage, r]));
  return CAREER_STAGES.map(s => {
    const row = byStage.get(s.key);
    const reqs: IStageSkillRequirement[] = row?.requirements || [];
    return {
      stage: s.key,
      label: row?.label || s.label,
      enabled: !!row?.enabled,
      count: reqs.length,
      activeCount: reqs.filter(r => r.active !== false).length,
      version: row?.version || 0,
    };
  });
}

/**
 * A stage set, joined with its skills, in blueprint shape.
 *
 * Returns null when there is no set, or it is switched off, or every requirement in it is
 * inactive — three different situations that all mean the same thing to a caller: there is
 * no list here, carry on as before. A caller that had to tell them apart would be deciding
 * policy in the wrong place.
 */
export async function getStageBlueprint(tenantId: string, stage: string): Promise<ResolvedBlueprint | null> {
  const key = String(stage || '').toLowerCase();
  if (!key) return null;

  const doc = await getStageSkillSet(tenantId, key);
  if (!doc || !doc.enabled) return null;

  const reqs = (doc.requirements || []).filter(r => r.active !== false);
  if (!reqs.length) return null;

  const skills = await CareerSkill.find({ key: { $in: reqs.map(r => String(r.skillKey).toUpperCase()) } }).lean() as any[];
  const byKey = new Map(skills.map(s => [s.key, s]));

  const requirements: ResolvedRequirement[] = reqs
    .slice()
    .sort((a, b) => (a.displayOrder ?? 100) - (b.displayOrder ?? 100))
    .map(r => {
      const k = String(r.skillKey).toUpperCase();
      const s = byKey.get(k);
      return {
        skillKey: k,
        importance: r.importance,
        weight: r.weight,
        targetLevel: r.targetLevel,
        active: r.active !== false,
        displayOrder: r.displayOrder ?? 100,
        note: r.note,
        skillName: s?.name || k,
        skillDescription: s?.description || '',
        skillNodeType: s?.nodeType || 'SKILL',
        skillDifficulty: s?.difficulty || '',
        parentKey: s?.parentKey ?? null,
        skillActive: s ? s.active !== false : false,
        // Surfaced rather than hidden: a set pointing at a skill that no longer exists is
        // an admin problem, and silently dropping it would make the list quietly shorter
        // than the screen says it is.
        missing: !s,
      } as ResolvedRequirement;
    });

  const active = requirements.filter(r => r.active);
  const byImportance: Record<string, number> = {};
  for (const r of active) byImportance[r.importance] = (byImportance[r.importance] || 0) + 1;

  return {
    roleKey: stageRoleKey(key),
    roleName: doc.label || `${labelOf(key)} foundation set`,
    roleActive: true,
    domainKey: 'SOFTWARE_ENGINEERING',
    published: true,
    version: doc.version || 1,
    requirements,
    summary: {
      total: requirements.length,
      active: active.length,
      byImportance,
      totalWeight: active.reduce((n, r) => n + (r.weight || 0), 0),
      stale: requirements.filter(r => r.missing || !r.skillActive).length,
    },
    updatedAt: doc.updatedAt,
    updatedBy: doc.updatedBy,
  } as ResolvedBlueprint;
}

/** Create or replace a stage's set. Version increments so a screen can detect a stale edit. */
export async function saveStageSkillSet(o: {
  tenantId: string;
  stage: string;
  label?: string;
  enabled?: boolean;
  requirements: IStageSkillRequirement[];
  actor?: string;
}): Promise<IStageSkillSet> {
  const stage = String(o.stage || '').toLowerCase();
  if (!CAREER_STAGES.some(s => s.key === stage)) throw new Error(`Unknown stage: ${o.stage}`);

  const seen = new Set<string>();
  const requirements = (o.requirements || [])
    .map(r => ({
      skillKey: String(r.skillKey || '').toUpperCase().trim(),
      importance: r.importance || 'IMPORTANT',
      weight: typeof r.weight === 'number' ? r.weight : 7,
      targetLevel: r.targetLevel || 'WORKING',
      active: r.active !== false,
      displayOrder: typeof r.displayOrder === 'number' ? r.displayOrder : 100,
      note: r.note,
    }))
    .filter(r => {
      // The same skill twice would be weighted twice in readiness, quietly skewing a score
      // an admin did not mean to change.
      if (!r.skillKey || seen.has(r.skillKey)) return false;
      seen.add(r.skillKey);
      return true;
    });

  const existing = await StageSkillSet.findOne({ tenantId: o.tenantId, stage });
  const doc = existing || new StageSkillSet({ tenantId: o.tenantId, stage });
  doc.label = o.label ?? doc.label ?? labelOf(stage);
  if (o.enabled !== undefined) doc.enabled = !!o.enabled;
  doc.requirements = requirements as any;
  doc.version = (doc.version || 0) + 1;
  doc.updatedBy = o.actor;
  await doc.save();
  return doc.toObject() as any;
}
