import SkillEvidence, {
  ISkillEvidence, EVIDENCE_CONTRIBUTIONS, EVIDENCE_SOURCE_TYPES,
  EvidenceContribution,
} from '../models/SkillEvidence';
import CareerSkill, { ICareerSkill } from '../models/CareerSkill';
import { DEFAULT_DOMAIN } from './careerDomainService';
import { adapterFor, loadItems, refKey, NormalisedItem, EvidenceDifficulty } from './skillEvidenceSourceRegistry';

/**
 * Which assessment content measures which canonical skill.
 *
 * Reads and validates the evidence layer. It answers what an item measures and what
 * evidence exists for a skill — never how anybody performed. No student appears anywhere
 * in this file, and nothing here computes a score, a gap or a readiness figure.
 *
 * Skill identity comes from Module 3's collection; this module never invents a skill and
 * never keeps its own copy of one. A mapping stores a KEY, so renaming "Java OOP" to
 * something longer changes what an admin reads and nothing about what is stored.
 */

const norm = (v: any): string => String(v ?? '').trim().toUpperCase();

export interface ResolvedEvidence {
  skillKey: string;
  contribution: EvidenceContribution;
  active: boolean;
  /** Joined from CareerSkill for display; the key remains the source of truth. */
  skillName: string;
  skillActive: boolean;
  skillAssessable: boolean;
  /** The key resolves to nothing at all — surfaced so an admin can repair it. */
  missing: boolean;
}

export interface ItemEvidence {
  sourceType: string;
  sourceId: string;
  item: NormalisedItem | null;
  evidence: ResolvedEvidence[];
  primarySkillKey: string | null;
  /** Mapped to something inactive or gone — worth an admin's attention, still usable. */
  stale: boolean;
}

/** Every mapping for one item, with the skills joined in. */
export async function getSkillsForAssessmentItem(
  tenantId: string, sourceType: string, sourceId: string,
): Promise<ItemEvidence> {
  const [rows, itemMap] = await Promise.all([
    SkillEvidence.find({ tenantId, sourceType, sourceId }).lean() as any,
    loadItems(tenantId, [{ sourceType, sourceId }]),
  ]);

  const skills = rows.length
    ? await CareerSkill.find({ key: { $in: rows.map((r: any) => r.skillKey) } }).lean() as any[]
    : [];
  const byKey = new Map(skills.map(s => [s.key, s]));

  const evidence: ResolvedEvidence[] = rows.map((r: any) => {
    const s = byKey.get(r.skillKey);
    return {
      skillKey: r.skillKey,
      contribution: r.contribution,
      active: r.active !== false,
      skillName: s?.name || r.skillKey.replace(/_/g, ' '),
      skillActive: s ? s.active !== false : false,
      skillAssessable: s ? !!s.assessable : false,
      missing: !s,
    };
  });

  return {
    sourceType, sourceId,
    item: itemMap.get(refKey(sourceType, sourceId)) || null,
    evidence,
    primarySkillKey: evidence.find(e => e.contribution === 'PRIMARY' && e.active)?.skillKey || null,
    stale: evidence.some(e => e.missing || !e.skillActive),
  };
}

export async function getPrimarySkillForAssessmentItem(
  tenantId: string, sourceType: string, sourceId: string,
): Promise<string | null> {
  const row = await SkillEvidence.findOne({ tenantId, sourceType, sourceId, contribution: 'PRIMARY', active: true })
    .select('skillKey').lean() as any;
  return row?.skillKey || null;
}

export interface CandidateQuery {
  skillKeys: string[];
  sourceTypes?: string[];
  difficulty?: EvidenceDifficulty;
  contribution?: EvidenceContribution;
  limitPerSkill?: number;
}

export interface CandidatePool {
  skillKey: string;
  items: (NormalisedItem & { contribution: EvidenceContribution })[];
}

/**
 * The evidence pool for a set of skills — what a later generator will draw from.
 *
 * Returns CANDIDATES, not a selection. Choosing which of forty JAVA_OOP questions a
 * particular student sees is a different decision, made with knowledge this module does
 * not have and deliberately does not want.
 *
 * TWO PHASES, NEVER PER SKILL. One query fetches evidence for every skill at once; the
 * items behind it are then loaded one batched query per source type. Twenty skills spread
 * across four content families cost five queries, not twenty.
 */
export async function findEvidenceCandidates(tenantId: string, q: CandidateQuery): Promise<CandidatePool[]> {
  const keys = [...new Set((q.skillKeys || []).map(norm).filter(Boolean))];
  if (!keys.length) return [];

  const filter: any = { tenantId, skillKey: { $in: keys }, active: true };
  if (q.sourceTypes?.length) filter.sourceType = { $in: q.sourceTypes };
  if (q.contribution) filter.contribution = q.contribution;

  const rows = await SkillEvidence.find(filter).lean() as any[];
  if (!rows.length) return keys.map(skillKey => ({ skillKey, items: [] }));

  const itemMap = await loadItems(tenantId, rows.map(r => ({ sourceType: r.sourceType, sourceId: r.sourceId })));

  const pools = new Map<string, CandidatePool>(keys.map(k => [k, { skillKey: k, items: [] }]));
  for (const r of rows) {
    const item = itemMap.get(refKey(r.sourceType, r.sourceId));
    // A mapping whose content has since been deleted is skipped rather than returned as a
    // hollow candidate. It stays visible on the admin screen, which is where it can be fixed.
    if (!item) continue;
    // Difficulty is filtered here rather than in the query because each family expresses it
    // differently; the registry has already normalised it onto the loaded item.
    if (q.difficulty && item.difficulty !== q.difficulty) continue;
    pools.get(r.skillKey)?.items.push({ ...item, contribution: r.contribution });
  }

  if (q.limitPerSkill) {
    for (const p of pools.values()) p.items = p.items.slice(0, q.limitPerSkill);
  }
  return [...pools.values()];
}

export interface SkillCoverage {
  skillKey: string;
  skillName: string;
  active: boolean;
  assessable: boolean;
  total: number;
  primary: number;
  byType: Record<string, number>;
}

/**
 * How much evidence exists per skill — one aggregate, not a query per skill.
 *
 * Configuration completeness, not analytics: it says whether a future assessment could be
 * built for a skill, and nothing about any student.
 */
export async function getEvidenceCoverage(tenantId: string, skillKeys?: string[]): Promise<SkillCoverage[]> {
  const match: any = { tenantId, active: true };
  if (skillKeys?.length) match.skillKey = { $in: skillKeys.map(norm) };

  const [agg, skills] = await Promise.all([
    SkillEvidence.aggregate([
      { $match: match },
      { $group: {
        _id: { skillKey: '$skillKey', sourceType: '$sourceType' },
        n: { $sum: 1 },
        primary: { $sum: { $cond: [{ $eq: ['$contribution', 'PRIMARY'] }, 1, 0] } },
      } },
    ]),
    CareerSkill.find({ domainKey: DEFAULT_DOMAIN, nodeType: 'SKILL' })
      .select('key name active assessable displayOrder').sort({ displayOrder: 1 }).lean() as any,
  ]);

  const byKey = new Map<string, SkillCoverage>();
  for (const s of skills) {
    if (skillKeys?.length && !skillKeys.map(norm).includes(s.key)) continue;
    byKey.set(s.key, {
      skillKey: s.key, skillName: s.name,
      active: s.active !== false, assessable: !!s.assessable,
      total: 0, primary: 0, byType: {},
    });
  }

  for (const row of agg) {
    const { skillKey, sourceType } = row._id;
    // A mapping to a skill no longer in the graph still appears, so it can be found and fixed.
    const entry = byKey.get(skillKey) || {
      skillKey, skillName: skillKey.replace(/_/g, ' '),
      active: false, assessable: false, total: 0, primary: 0, byType: {},
    };
    entry.total += row.n;
    entry.primary += row.primary;
    entry.byType[sourceType] = (entry.byType[sourceType] || 0) + row.n;
    byKey.set(skillKey, entry);
  }

  return [...byKey.values()];
}

export interface EvidenceValidation { ok: boolean; message?: string }

export interface ValidateInput {
  sourceType: string;
  /** The proposed complete set for one item. */
  evidence: { skillKey: string; contribution?: string; active?: boolean }[];
  /** Every skill mentioned, loaded once by the caller. */
  skills: ICareerSkill[];
  /** What this item was already mapped to, so a retired skill can be kept. */
  existingSkillKeys?: string[];
}

/**
 * Everything that would make a mapping wrong, checked before anything is written.
 *
 * The inactive-skill rule is the one corrected in Module 3 and carried through Module 4:
 * it applies to a skill being ADDED. Re-checking a standing mapping would make an item
 * uneditable the moment any skill it references was retired — on the screen where somebody
 * would go to fix exactly that.
 */
export function validateEvidenceMapping(input: ValidateInput): EvidenceValidation {
  if (!adapterFor(input.sourceType)) {
    return { ok: false, message: `${input.sourceType} is not a supported content type.` };
  }

  const bySkill = new Map(input.skills.map(s => [s.key, s]));
  const already = new Set((input.existingSkillKeys || []).map(norm));
  const seen = new Set<string>();
  let primaries = 0;

  for (const e of input.evidence) {
    const skillKey = norm(e.skillKey);
    if (!skillKey) return { ok: false, message: 'Every mapping needs a skill.' };

    // Rejected rather than merged: one row saying an item's main subject is JAVA_OOP and
    // another saying it is incidental are contradictory, and nothing could say which held.
    if (seen.has(skillKey)) {
      return { ok: false, message: `${skillKey} is mapped twice. An item measures a skill once.` };
    }
    seen.add(skillKey);

    const contribution = e.contribution || 'PRIMARY';
    if (!EVIDENCE_CONTRIBUTIONS.includes(contribution as EvidenceContribution)) {
      return { ok: false, message: `Contribution must be PRIMARY or SECONDARY.` };
    }
    if (contribution === 'PRIMARY') primaries++;

    const skill = bySkill.get(skillKey);
    if (!skill) return { ok: false, message: `Skill ${skillKey} does not exist.` };

    if (skill.domainKey !== DEFAULT_DOMAIN) {
      return { ok: false, message: `${skill.name} belongs to a different career domain.` };
    }

    // A group is a shelf. Evidence pointing at "Programming" could never be measured, and
    // Module 3 marks exactly these as not assessable.
    if (skill.nodeType === 'GROUP' || !skill.assessable) {
      return { ok: false, message: `${skill.name} is not a measurable skill. Map the specific skill it contains instead.` };
    }

    if (skill.active === false && !already.has(skillKey)) {
      return { ok: false, message: `${skill.name} is inactive and cannot be newly mapped.` };
    }
  }

  // One main subject per item. Two would make "what does this chiefly measure?"
  // unanswerable, which is the question a later generator asks first.
  if (primaries > 1) {
    return { ok: false, message: 'An item can have only one primary skill. Mark the others as secondary.' };
  }

  return { ok: true };
}

/** Shape a submitted list. Validation is separate and runs first. */
export function cleanEvidence(raw: any): { skillKey: string; contribution: EvidenceContribution; active: boolean }[] {
  return (Array.isArray(raw) ? raw : []).map((e: any) => ({
    skillKey: norm(e?.skillKey),
    contribution: (EVIDENCE_CONTRIBUTIONS.includes(e?.contribution) ? e.contribution : 'SECONDARY') as EvidenceContribution,
    active: e?.active !== false,
  })).filter(e => e.skillKey);
}

/** Load every skill a submitted list mentions, in one query. */
export async function loadSkillsFor(evidence: { skillKey?: string }[]): Promise<ICareerSkill[]> {
  const keys = [...new Set(evidence.map(e => norm(e.skillKey)).filter(Boolean))];
  if (!keys.length) return [];
  return CareerSkill.find({ key: { $in: keys } }).lean() as any;
}

/** Which items reference a skill — asked before retiring one. */
export async function itemsUsingSkill(tenantId: string, skillKey: string): Promise<number> {
  return SkillEvidence.countDocuments({ tenantId, skillKey: norm(skillKey) });
}

export const SUPPORTED_SOURCE_TYPES = EVIDENCE_SOURCE_TYPES;
