/**
 * The one place that decides whether a skill key may be authored against.
 *
 * ── WHY THIS EXISTS AS A SERVICE ──────────────────────────────────────────────────────────
 *
 * Topics and Learning Units are two halves of the same hierarchy and they validated skills
 * differently: topics checked existence, units checked nothing at all until P8C.0, and the
 * Admin selector offered a third answer again — active skills only. Three rules for one
 * question is how a curriculum ends up with keys that pass one screen and fail another.
 *
 * ── THE RULE, FOR NEW AUTHORING ───────────────────────────────────────────────────────────
 *
 * A key may be authored only if it names an ACTIVE node of type SKILL.
 *
 *   not in the registry  a typo. The unit saves, publishes, composes, and never matches a
 *                        student's profile — unteachable rather than visibly broken.
 *   inactive             retired on purpose. Teaching towards it is teaching towards something
 *                        the platform has stopped measuring.
 *   GROUP                an organiser, not a capability. "Programming" is where skills live; it
 *                        is not itself a thing a student can be measured against, so a unit
 *                        claiming to teach it could never be matched to anybody.
 *
 * ── AND WHY READING IS DELIBERATELY LOOSER ────────────────────────────────────────────────
 *
 * `describeSkills` resolves ANY key, active or not, GROUP or SKILL. A record written years ago
 * against a key since retired must still render — showing "not in the registry" for a key that
 * is merely inactive would be a lie, and refusing to load it would be a destructive migration
 * dressed up as validation. Historical rows stay readable; only NEW selections are constrained.
 *
 * ── GLOBAL, WITH NO TENANT ────────────────────────────────────────────────────────────────
 *
 * CareerSkill deliberately has no tenantId — see the model for the full argument. Querying it
 * with one matches nothing and reports no error, which is exactly the bug this replaced: the
 * Year-1 seed believed the registry was empty and fell back to validating keys against the
 * curriculum's own usage, a check that can only catch a typo nothing else repeats.
 */

import CareerSkill from '../models/CareerSkill';

export interface AuthorableSkill {
  key: string;
  name: string;
  difficulty?: string;
  parentKey?: string | null;
}

const upper = (v: any): string => String(v ?? '').trim().toUpperCase();

/** A 400-shaped error: the author's to fix, not a server fault. */
const authorError = (message: string) =>
  Object.assign(new Error(message), { status: 400 });

/**
 * Every skill an author may pick, for a selector.
 *
 * Sorted by name because that is what the author is reading; the key is the contract but the
 * name is the thing they recognise.
 */
export async function listAuthorableSkills(): Promise<AuthorableSkill[]> {
  const rows = await CareerSkill
    .find({ active: true, nodeType: 'SKILL' })
    .select('key name difficulty parentKey')
    .lean() as any[];

  return rows
    .map(r => ({
      key: upper(r.key),
      name: String(r.name || r.key),
      difficulty: r.difficulty,
      parentKey: r.parentKey ?? null,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Accept these keys for authoring, or refuse and say exactly why.
 *
 * The three reasons are reported SEPARATELY. "JAVA_OOPS does not exist" sends an author looking
 * for a typo; "PROGRAMMING is a group" sends them looking for the skill inside it. One merged
 * message would make the second case look like the first and waste the search.
 */
export async function requireAuthorableSkills(
  keys: string[] | undefined,
  label = 'skill',
): Promise<string[]> {
  if (!keys || !keys.length) return [];

  const wanted = [...new Set(keys.map(upper).filter(Boolean))];
  if (!wanted.length) return [];

  const found = await CareerSkill
    .find({ key: { $in: wanted } })
    .select('key nodeType active')
    .lean() as any[];

  const byKey = new Map<string, any>(found.map(r => [upper(r.key), r]));

  const missing = wanted.filter(k => !byKey.has(k));
  const groups = wanted.filter(k => byKey.get(k)?.nodeType === 'GROUP');
  const inactive = wanted.filter(k => byKey.has(k)
    && byKey.get(k)?.nodeType !== 'GROUP'
    && byKey.get(k)?.active === false);

  const problems: string[] = [];
  if (missing.length) {
    problems.push(`no ${label} exists with ${missing.length === 1 ? 'the key' : 'the keys'} `
      + `${missing.join(', ')}`);
  }
  if (groups.length) {
    problems.push(`${groups.join(', ')} ${groups.length === 1 ? 'is a group' : 'are groups'}, `
      + 'which organise skills rather than being one — pick the skill inside');
  }
  if (inactive.length) {
    problems.push(`${inactive.join(', ')} ${inactive.length === 1 ? 'is' : 'are'} retired and `
      + 'cannot be newly selected');
  }

  if (problems.length) throw authorError(problems.join('; ') + '.');

  return wanted;
}

/**
 * Resolve keys for DISPLAY, including ones that could not be newly authored.
 *
 * Returns a row per requested key so a caller can show what it has; `authorable` says whether
 * the key would still be accepted today, which is how a screen marks a retired key as retired
 * rather than as a mistake.
 */
export async function describeSkills(keys: string[]): Promise<
  { key: string; name: string | null; nodeType: string | null; active: boolean; authorable: boolean }[]
> {
  const wanted = [...new Set((keys || []).map(upper).filter(Boolean))];
  if (!wanted.length) return [];

  const found = await CareerSkill
    .find({ key: { $in: wanted } })
    .select('key name nodeType active')
    .lean() as any[];
  const byKey = new Map<string, any>(found.map(r => [upper(r.key), r]));

  return wanted.map(k => {
    const row = byKey.get(k);
    const active = row ? row.active !== false : false;
    return {
      key: k,
      name: row ? String(row.name || k) : null,
      nodeType: row ? String(row.nodeType) : null,
      active,
      authorable: !!row && active && row.nodeType === 'SKILL',
    };
  });
}
