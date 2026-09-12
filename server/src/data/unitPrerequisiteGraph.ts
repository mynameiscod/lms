/**
 * Prerequisite structure between Learning Units, and the one thing that must never be true of it.
 *
 * ── WHY A CYCLE IS UNRECOVERABLE ──────────────────────────────────────────────────────────
 *
 * The composer schedules a unit only once every unit it depends on is already in the plan or
 * already mastered. A cycle — A needs B needs C needs A — means no member of the loop is ever
 * takeable, so all of them silently vanish from every plan produced from then on. Nothing
 * errors. The units simply stop being taught, and the only visible symptom is a plan that is
 * shorter or duller than it should be, weeks later.
 *
 * ── EXTRACTED, NOT REINVENTED ─────────────────────────────────────────────────────────────
 *
 * This is the walk the Year-1 expansion seed already performed before writing anything. It is
 * lifted here verbatim in behaviour so the seed and the Admin save path cannot disagree about
 * what a cycle is: a second implementation would eventually accept through one door what the
 * other refuses, and the curriculum would depend on which one an author happened to use.
 *
 * ── THE GRAPH IS ALWAYS THE WHOLE CURRICULUM ──────────────────────────────────────────────
 *
 * A cycle created by editing one unit almost always runs through units nobody touched:
 * A(edited) -> B(old) -> C(old) -> A. Checking only what changed would miss precisely the
 * cycles that an edit can introduce, so callers pass every unit and the edit is applied on top.
 */

export interface PrerequisiteNode {
  unitCode: string;
  prerequisiteUnitCodes?: string[];
}

const WHITE = 0;
const GREY = 1;
const BLACK = 2;

/**
 * Build the dependency map, with `override` replacing or adding one unit's edges.
 *
 * Passing the pending edit as an override rather than mutating the stored rows is what lets a
 * save be checked BEFORE it is written — refusing a cycle is only useful if it happens while
 * the cycle is still hypothetical.
 */
export function buildPrerequisiteGraph(
  units: PrerequisiteNode[],
  override?: PrerequisiteNode,
): Map<string, string[]> {
  const deps = new Map<string, string[]>();
  for (const u of units) {
    deps.set(String(u.unitCode).toUpperCase(),
      (u.prerequisiteUnitCodes || []).map(c => String(c).toUpperCase()));
  }
  if (override) {
    deps.set(String(override.unitCode).toUpperCase(),
      (override.prerequisiteUnitCodes || []).map(c => String(c).toUpperCase()));
  }
  return deps;
}

/**
 * Every cycle reachable in the graph, each rendered as "A -> B -> C -> A".
 *
 * Edges pointing at codes the graph does not contain are SKIPPED rather than treated as
 * missing: existence is a separate check with a separate message, and conflating the two would
 * report "cycle" for what is actually a typo.
 */
export function findPrerequisiteCycles(deps: Map<string, string[]>): string[] {
  const colour = new Map<string, number>();
  const cycles: string[] = [];

  const walk = (code: string, path: string[]) => {
    colour.set(code, GREY);
    for (const next of deps.get(code) || []) {
      if (!deps.has(next)) continue;
      const c = colour.get(next) ?? WHITE;
      if (c === GREY) {
        cycles.push([...path, code, next].join(' -> '));
      } else if (c === WHITE) {
        walk(next, [...path, code]);
      }
    }
    colour.set(code, BLACK);
  };

  for (const code of deps.keys()) {
    if ((colour.get(code) ?? WHITE) === WHITE) walk(code, []);
  }

  return [...new Set(cycles)];
}

/**
 * The cycles one unit's proposed prerequisites would create, or an empty list.
 *
 * Only cycles THROUGH the edited unit are reported. A curriculum can contain a pre-existing
 * cycle elsewhere — data predating this check, or a seed run before it existed — and blaming an
 * unrelated edit for it would make that unit uneditable with an error naming units the author
 * has never seen.
 */
export function cyclesIntroducedBy(
  units: PrerequisiteNode[],
  edit: PrerequisiteNode,
): string[] {
  const code = String(edit.unitCode).toUpperCase();
  const graph = buildPrerequisiteGraph(units, edit);
  return findPrerequisiteCycles(graph).filter(c => c.split(' -> ').includes(code));
}
