import CareerSkill from '../models/CareerSkill';
import { CAREER_SKILL_TAXONOMY, SeedSkill } from '../data/careerSkillTaxonomy';
import { DEFAULT_DOMAIN } from './careerDomainService';

/**
 * Installing the canonical taxonomy.
 *
 * EXPLICIT, NOT ON A READ PATH. Module 2 seeds seven roles lazily when a student asks for
 * options, which is fine at that size. Seventy nodes is not: it would put a scan and a
 * conditional bulk insert behind an ordinary page load, and the cost would grow every time
 * an admin extended the taxonomy. This runs when somebody asks for it — a script, or the
 * button on the admin screen — and never as a side effect of reading.
 *
 * INSERT-ONLY, ALWAYS. A key that already exists is left completely alone. That single
 * rule is what makes the seed safe to run repeatedly and safe to run on a live system:
 *
 *   an admin's renamed skill keeps its name
 *   a deactivated skill stays deactivated
 *   edited prerequisites are not reverted to the shipped ones
 *   a re-run after adding new canonical skills installs only the new ones
 *
 * The alternative — upserting the shipped values — would quietly undo an admin's work
 * every time anybody pressed the button, and they would have no way to tell what happened.
 */

export interface SeedReport {
  inserted: string[];
  skipped: string[];
  /** Keys the taxonomy references that do not resolve — a fault in the seed data itself. */
  danglingReferences: string[];
  total: number;
}

/**
 * Check the shipped data before trusting it.
 *
 * A typo in a parent or prerequisite key would install a taxonomy with edges pointing at
 * nothing, and the graph would look fine until something walked it. Cheaper to catch here
 * than to debug later from a tree with a missing branch.
 */
export function auditTaxonomy(taxonomy: SeedSkill[] = CAREER_SKILL_TAXONOMY): string[] {
  const keys = new Set(taxonomy.map(s => s.key));
  const problems: string[] = [];

  const seen = new Set<string>();
  for (const s of taxonomy) {
    if (seen.has(s.key)) problems.push(`duplicate key ${s.key}`);
    seen.add(s.key);

    if (s.parentKey && !keys.has(s.parentKey)) problems.push(`${s.key} has unknown parent ${s.parentKey}`);
    for (const p of (s.prerequisiteKeys || [])) {
      if (!keys.has(p)) problems.push(`${s.key} has unknown prerequisite ${p}`);
      if (p === s.key) problems.push(`${s.key} is its own prerequisite`);
    }
    if (s.parentKey === s.key) problems.push(`${s.key} is its own parent`);
  }

  // Cycles in the shipped data, in both graphs.
  const parentOf = new Map(taxonomy.map(s => [s.key, s.parentKey || null]));
  for (const s of taxonomy) {
    const seenUp = new Set<string>();
    let cur = s.parentKey || null;
    while (cur) {
      if (cur === s.key) { problems.push(`parent cycle at ${s.key}`); break; }
      if (seenUp.has(cur)) break;
      seenUp.add(cur);
      cur = parentOf.get(cur) || null;
    }
  }

  const prereqOf = new Map(taxonomy.map(s => [s.key, s.prerequisiteKeys || []]));
  for (const s of taxonomy) {
    const stack = [...(s.prerequisiteKeys || [])];
    const seenDeps = new Set<string>();
    while (stack.length) {
      const cur = stack.pop()!;
      if (cur === s.key) { problems.push(`prerequisite cycle at ${s.key}`); break; }
      if (seenDeps.has(cur)) continue;
      seenDeps.add(cur);
      for (const n of (prereqOf.get(cur) || [])) stack.push(n);
    }
  }

  return problems;
}

/**
 * Install anything missing. Safe to run any number of times.
 *
 * `dryRun` reports what WOULD be installed without writing, so somebody can see the effect
 * on a live system before causing it.
 */
export async function seedCareerSkills(opts: { dryRun?: boolean; updatedBy?: string } = {}): Promise<SeedReport> {
  const problems = auditTaxonomy();
  if (problems.length) {
    // Refused rather than partially applied: half a taxonomy is harder to reason about
    // than none, and this only fires on a genuine defect in the shipped data.
    throw new Error(`The shipped taxonomy is inconsistent and was not installed: ${problems.join('; ')}`);
  }

  const existing = await CareerSkill.find({}).select('key').lean() as any[];
  const have = new Set(existing.map(s => s.key));

  const missing = CAREER_SKILL_TAXONOMY.filter(s => !have.has(s.key));
  const report: SeedReport = {
    inserted: missing.map(s => s.key),
    skipped: CAREER_SKILL_TAXONOMY.filter(s => have.has(s.key)).map(s => s.key),
    danglingReferences: [],
    total: CAREER_SKILL_TAXONOMY.length,
  };

  if (opts.dryRun || !missing.length) return report;

  await CareerSkill.insertMany(
    missing.map(s => ({
      domainKey: DEFAULT_DOMAIN,
      key: s.key,
      name: s.name,
      description: s.description || '',
      nodeType: s.nodeType || 'SKILL',
      parentKey: s.parentKey || null,
      prerequisiteKeys: s.prerequisiteKeys || [],
      difficulty: s.difficulty || 'FOUNDATION',
      aliases: s.aliases || [],
      displayOrder: s.displayOrder ?? 100,
      active: true,
      assessable: s.assessable !== undefined ? s.assessable : (s.nodeType || 'SKILL') === 'SKILL',
      learnable: s.learnable !== undefined ? s.learnable : (s.nodeType || 'SKILL') === 'SKILL',
      systemSkill: true,
      createdBy: opts.updatedBy, updatedBy: opts.updatedBy,
    })),
    // A concurrent run may win a race; a duplicate key there means the row exists, which
    // is the state we wanted anyway.
    { ordered: false },
  ).catch((e: any) => {
    if (e?.code !== 11000 && !/E11000/.test(String(e?.message))) throw e;
  });

  return report;
}
