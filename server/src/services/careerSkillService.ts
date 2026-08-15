import CareerSkill, { ICareerSkill, SKILL_KEY_PATTERN } from '../models/CareerSkill';
import { DEFAULT_DOMAIN } from './careerDomainService';

/**
 * The skill graph: reading it, and refusing to let it become invalid.
 *
 * Two structures live here and they are not the same shape.
 *
 *   The TAXONOMY is a forest. `parentKey` says where a skill sits when you browse, and a
 *   node has exactly one parent, so the whole thing renders as a tree.
 *
 *   The DEPENDENCY graph is a DAG. `prerequisiteKeys` says what must come first, a skill
 *   may need several things, and those things may live anywhere in the taxonomy — Java OOP
 *   depends on the language-agnostic OOP Concepts three branches away.
 *
 * Both must stay acyclic, and neither can be checked one edge at a time: a cycle is a
 * property of the whole graph. Every validator here therefore loads the graph ONCE and
 * walks it in memory. Seventy nodes is a single small query; recursing into Mongo per edge
 * would be dozens of round trips to answer a question the process can answer alone.
 *
 * No AI, and nothing here computes what a student knows. This module answers what exists
 * and what depends on what — not who is good at it.
 */

export interface SkillTreeNode {
  key: string;
  name: string;
  nodeType: string;
  difficulty: string;
  description: string;
  parentKey: string | null;
  prerequisiteKeys: string[];
  aliases: string[];
  displayOrder: number;
  active: boolean;
  assessable: boolean;
  learnable: boolean;
  systemSkill: boolean;
  id: string;
  children: SkillTreeNode[];
}

export interface GraphCheck { ok: boolean; message?: string }

const norm = (k: any): string => String(k ?? '').trim().toUpperCase();

/** Every skill in a domain, in one query. The basis for tree building and validation. */
export async function getAllSkills(domainKey: string = DEFAULT_DOMAIN, includeInactive = true): Promise<ICareerSkill[]> {
  const q: any = { domainKey };
  if (!includeInactive) q.active = true;
  return CareerSkill.find(q).sort({ displayOrder: 1, name: 1 }).lean() as any;
}

export async function getSkillByKey(key: string): Promise<ICareerSkill | null> {
  const k = norm(key);
  if (!k) return null;
  return CareerSkill.findOne({ key: k }).lean() as any;
}

export async function getActiveSkills(domainKey: string = DEFAULT_DOMAIN): Promise<ICareerSkill[]> {
  return getAllSkills(domainKey, false);
}

/** Only these are candidates for a future assessment mapping. Groups are excluded. */
export async function getAssessableSkills(domainKey: string = DEFAULT_DOMAIN): Promise<ICareerSkill[]> {
  return CareerSkill.find({ domainKey, active: true, assessable: true, nodeType: 'SKILL' })
    .sort({ displayOrder: 1, name: 1 }).lean() as any;
}

/** Direct prerequisites, resolved to records. Missing keys are dropped, not faked. */
export async function getPrerequisites(key: string): Promise<ICareerSkill[]> {
  const skill = await getSkillByKey(key);
  if (!skill?.prerequisiteKeys?.length) return [];
  return CareerSkill.find({ key: { $in: skill.prerequisiteKeys.map(norm) } })
    .sort({ displayOrder: 1, name: 1 }).lean() as any;
}

const toNode = (s: any): SkillTreeNode => ({
  id: String(s._id),
  key: s.key, name: s.name, nodeType: s.nodeType, difficulty: s.difficulty,
  description: s.description || '', parentKey: s.parentKey || null,
  prerequisiteKeys: s.prerequisiteKeys || [], aliases: s.aliases || [],
  displayOrder: s.displayOrder ?? 100,
  active: s.active !== false, assessable: !!s.assessable, learnable: !!s.learnable,
  systemSkill: !!s.systemSkill,
  children: [],
});

/**
 * The taxonomy as a tree, built in memory from one query.
 *
 * A node whose parent is missing or inactive is promoted to the root rather than dropped.
 * Losing a subtree because one grouping row was deleted would hide real skills from the
 * only screen that can fix them.
 */
export async function getSkillTree(domainKey: string = DEFAULT_DOMAIN, includeInactive = true): Promise<SkillTreeNode[]> {
  const all = await getAllSkills(domainKey, includeInactive);
  const byKey = new Map<string, SkillTreeNode>();
  for (const s of all) byKey.set(s.key, toNode(s));

  const roots: SkillTreeNode[] = [];
  for (const node of byKey.values()) {
    const parent = node.parentKey ? byKey.get(node.parentKey) : null;
    if (parent) parent.children.push(node);
    else roots.push(node);
  }

  const sort = (ns: SkillTreeNode[]) => {
    ns.sort((a, b) => a.displayOrder - b.displayOrder || a.name.localeCompare(b.name));
    ns.forEach(n => sort(n.children));
  };
  sort(roots);
  return roots;
}

// ── Graph validation ─────────────────────────────────────────────────────────────

/**
 * Would setting `parentKey` on `key` create a cycle?
 *
 * Walks UP from the proposed parent. If the walk reaches `key`, the edge would close a
 * loop — the two-node case (A→B, B→A) and the deep case (A→B→C→A) are the same walk, so
 * there is one check rather than a special case that would eventually miss something.
 *
 * `edges` is the current parent map; passing it in keeps this pure and testable, and means
 * one database read serves a whole request.
 */
export function parentWouldCycle(key: string, parentKey: string, edges: Map<string, string | null>): boolean {
  const target = norm(key);
  let cur: string | null = norm(parentKey);
  const seen = new Set<string>();

  while (cur) {
    if (cur === target) return true;
    // A pre-existing loop elsewhere must not spin forever — bail rather than hang.
    if (seen.has(cur)) return false;
    seen.add(cur);
    cur = edges.get(cur) ?? null;
  }
  return false;
}

/**
 * Would `key` requiring `prereqs` create a dependency cycle?
 *
 * Depth-first from each proposed prerequisite through the existing dependency edges,
 * looking for a way back to `key`. Iterative rather than recursive: a deep chain should
 * not be able to overflow a stack on an admin's typo.
 */
export function prerequisiteWouldCycle(
  key: string,
  prereqs: string[],
  edges: Map<string, string[]>,
): boolean {
  const target = norm(key);
  const stack = prereqs.map(norm).filter(Boolean);
  const seen = new Set<string>();

  while (stack.length) {
    const cur = stack.pop()!;
    if (cur === target) return true;
    if (seen.has(cur)) continue;
    seen.add(cur);
    for (const next of (edges.get(cur) || [])) stack.push(norm(next));
  }
  return false;
}

/** Parent maps for the two graphs, from one load. */
export function edgeMaps(all: ICareerSkill[]) {
  const parents = new Map<string, string | null>();
  const prereqs = new Map<string, string[]>();
  for (const s of all) {
    parents.set(s.key, s.parentKey ? norm(s.parentKey) : null);
    prereqs.set(s.key, (s.prerequisiteKeys || []).map(norm));
  }
  return { parents, prereqs };
}

export interface ValidateInput {
  key: string;
  domainKey: string;
  parentKey?: string | null;
  prerequisiteKeys?: string[];
  /**
   * What this skill ALREADY requires, on an edit.
   *
   * The "is it active?" rule applies to a new choice, not to a standing one. Without this
   * distinction the rule locks the record: the update path always sends the whole
   * prerequisite array, so the moment any prerequisite is deactivated, every later edit to
   * that skill — a rename, a difficulty correction, reactivating it — is refused for a
   * relationship the admin never touched.
   *
   * Absent means a create, where every key is new by definition.
   */
  existingPrerequisiteKeys?: string[];
  /** The graph as it stands. Loaded once by the caller and reused across both checks. */
  all: ICareerSkill[];
  /** A create has no existing record; an edit compares against itself. */
  isCreate?: boolean;
}

/**
 * Everything that would make the graph invalid, checked before anything is written.
 *
 * Returns the FIRST problem rather than a list: these are structural errors an admin fixes
 * one at a time, and a wall of them is harder to act on than the one that matters.
 */
export function validateSkillGraph(input: ValidateInput): GraphCheck {
  const key = norm(input.key);
  const byKey = new Map(input.all.map(s => [s.key, s]));
  const { parents, prereqs } = edgeMaps(input.all);

  // ── parent ──
  if (input.parentKey !== undefined && input.parentKey !== null && norm(input.parentKey) !== '') {
    const parentKey = norm(input.parentKey);

    if (parentKey === key) return { ok: false, message: 'A skill cannot be its own parent.' };

    const parent = byKey.get(parentKey);
    if (!parent) return { ok: false, message: `There is no skill with the key ${parentKey} to use as a parent.` };
    if (parent.domainKey !== input.domainKey) {
      return { ok: false, message: `${parent.name} belongs to a different career domain and cannot be the parent.` };
    }

    // The candidate's own edge is excluded so an edit is checked against where it WOULD
    // sit, not where it currently sits.
    const probe = new Map(parents);
    probe.delete(key);
    if (parentWouldCycle(key, parentKey, probe)) {
      return { ok: false, message: `That would put ${key} inside its own branch — the taxonomy would loop.` };
    }
  }

  // ── prerequisites ──
  if (input.prerequisiteKeys !== undefined) {
    const wanted = input.prerequisiteKeys.map(norm).filter(Boolean);

    if (wanted.includes(key)) return { ok: false, message: 'A skill cannot be its own prerequisite.' };

    // What was already there, so a standing relationship can be told from a new choice.
    const already = new Set((input.existingPrerequisiteKeys || []).map(norm));

    for (const pk of new Set(wanted)) {
      const p = byKey.get(pk);
      if (!p) return { ok: false, message: `There is no skill with the key ${pk} to use as a prerequisite.` };
      if (p.domainKey !== input.domainKey) {
        return { ok: false, message: `${p.name} belongs to a different career domain and cannot be a prerequisite.` };
      }
      // Deactivation is checked only for a key being ADDED. Choosing a retired skill now
      // is almost certainly a mistake and is refused; keeping one that was chosen while it
      // was live is history, and re-litigating it would make the skill uneditable for a
      // relationship the admin never touched. They can still remove it deliberately.
      if (p.active === false && !already.has(pk)) {
        return { ok: false, message: `${p.name} is deactivated and cannot be added as a prerequisite.` };
      }
    }

    const probe = new Map(prereqs);
    probe.delete(key);
    if (prerequisiteWouldCycle(key, wanted, probe)) {
      return { ok: false, message: 'Those prerequisites would form a loop — something would need to be learned before itself.' };
    }
  }

  return { ok: true };
}

/** Uppercased, de-duplicated, self-reference removed. Duplicates are a typo, not an error. */
export function cleanPrerequisites(raw: any, selfKey: string): string[] {
  const self = norm(selfKey);
  return [...new Set(
    (Array.isArray(raw) ? raw : []).map(norm).filter((k: string) => k && k !== self),
  )].slice(0, 20);
}

export const isValidSkillKey = (key: string): boolean => SKILL_KEY_PATTERN.test(norm(key));

/** "Java Generics" → "JAVA_GENERICS". Suggested to the admin, never forced. */
export function suggestSkillKey(name: string): string {
  return String(name || '').trim().toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 60);
}

/** Does `key` appear anywhere in another skill's parent or prerequisite edges? */
export async function findSkillReferences(key: string): Promise<{ children: string[]; dependents: string[] }> {
  const k = norm(key);
  const [children, dependents] = await Promise.all([
    CareerSkill.find({ parentKey: k }).select('key name').lean() as any,
    CareerSkill.find({ prerequisiteKeys: k }).select('key name').lean() as any,
  ]);
  return {
    children: children.map((c: any) => c.name || c.key),
    dependents: dependents.map((d: any) => d.name || d.key),
  };
}
