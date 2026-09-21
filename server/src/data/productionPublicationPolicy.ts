/**
 * Which READY Foundation units are deliberately NOT part of the production publish set.
 *
 * ── WHY THIS IS A NAMED LIST ──────────────────────────────────────────────────────────────
 *
 * The recommended publish set is derived: the union of every unit a certification scenario reaches,
 * closed under prerequisites. That is the right way to find what production needs, and the wrong way
 * to record a decision not to publish something. Three JS/DOM lessons were withheld by decision; for as
 * long as no scenario happened to reach them, the derivation "agreed". The moment the composer freed
 * capacity for learners with STANDARD evidence, three recomposition scenarios reached them on the READY
 * pool and the derivation proposed publishing them — a decision reversed by a side effect.
 *
 * So the decision is written here, by unit code, and the derivation consults it.
 *
 * ── WHAT THE LIST IS, AND WHAT IT IS NOT ──────────────────────────────────────────────────
 *
 * Publication and certification policy ONLY. A listed unit stays exactly what it is: authored, READY,
 * editable in Admin, with its content, prerequisites and suitability untouched. It is simply never
 * promoted into the recommended production set, and it must stay unpublished — production composes
 * from PUBLISHED && READY, so an unpublished unit never reaches a student whatever this list says.
 *
 * Nothing is inferred. Not "every draft", not a topic, not a prefix, not current reachability: a READY
 * unpublished unit that is NOT named here and that a scenario reaches is recommended exactly as before,
 * so a unit left unpublished by accident is still caught.
 */

/** Withheld from production by decision. Exact unit codes; nothing is matched by pattern. */
export const INTENTIONALLY_WITHHELD_READY: readonly string[] = Object.freeze([
  'T_JS_DOM_ARRAYS_AND_OBJECTS',
  'T_JS_DOM_FUNCTIONS',
  'T_JS_DOM_VALUES_AND_VARIABLES',
]);

/**
 * Units authored and seeded as DRAFT, awaiting an admin's review. NOT part of the certified inventory.
 *
 * ── WHY A SEPARATE LIST, AND NOT THE WITHHELD ONE ─────────────────────────────────────────
 *
 * Withheld units are part of certification: they sit in the READY universe the scenarios compose from, and
 * only their promotion is refused. That is right for a finished unit held back by decision, and wrong for a
 * draft nobody has approved. Composing certification scenarios over unreviewed drafts let them displace
 * PUBLISHED units from every scenario — the derivation then proposed returning a live lesson to DRAFT because
 * of content no student can see.
 *
 * So a unit named here is outside certification entirely: it is not counted in the inventory totals, not in
 * the READY universe, and never published by provisioning. It stays DRAFT and reaches no student.
 *
 * APPROVING ONE: remove a topic's codes from this list in the same change that publishes the topic and
 * re-certifies (auditProductionComposerReadiness --write-artifacts, then CERTIFIED_FOUNDATION).
 * Exact codes only; nothing is matched by pattern.
 */
export const PENDING_REVIEW_UNITS: readonly string[] = Object.freeze([
  /*
   * Direction topics authored so that Software & Backend and Mobile have units of their own, and Data and
   * Cybersecurity stop sharing an identical plan with AI/ML and Cloud & DevOps.
   */
  // T_FIRST_BACKEND
  'T_FIRST_BACKEND_WHAT_A_SERVER_DOES',
  'T_FIRST_BACKEND_ROUTES',
  'T_FIRST_BACKEND_JSON',
  'T_FIRST_BACKEND_READING_INPUT',
  'T_FIRST_BACKEND_STATUS_CODES',
  'T_FIRST_BACKEND_KEEPING_DATA',
  'T_FIRST_BACKEND_DEBUGGING',
  'T_FIRST_BACKEND_PRACTICE',
  'T_FIRST_BACKEND_MINI_PROJECT',
  // T_MOBILE_APPS
  'T_MOBILE_APPS_WHAT_MAKES_APPS_DIFFERENT',
  'T_MOBILE_APPS_NATIVE_OR_CROSS_PLATFORM',
  'T_MOBILE_APPS_WIDGETS',
  'T_MOBILE_APPS_LAYOUT',
  'T_MOBILE_APPS_STATE',
  'T_MOBILE_APPS_NAVIGATION_AND_DATA',
  'T_MOBILE_APPS_DEBUGGING',
  'T_MOBILE_APPS_PRACTICE',
  'T_MOBILE_APPS_MINI_PROJECT',
  // T_DATA_WRANGLING
  'T_DATA_WRANGLING_TABLES_AND_CSV',
  'T_DATA_WRANGLING_LOADING',
  'T_DATA_WRANGLING_CLEANING',
  'T_DATA_WRANGLING_FILTER_AND_SORT',
  'T_DATA_WRANGLING_GROUPING',
  'T_DATA_WRANGLING_CHARTS',
  'T_DATA_WRANGLING_DEBUGGING',
  'T_DATA_WRANGLING_PRACTICE',
  'T_DATA_WRANGLING_MINI_PROJECT',
  // T_SECURITY_THINKING
  'T_SECURITY_THINKING_WHAT_SECURITY_PROTECTS',
  'T_SECURITY_THINKING_PASSWORDS',
  'T_SECURITY_THINKING_PHISHING',
  'T_SECURITY_THINKING_UNTRUSTED_INPUT',
  'T_SECURITY_THINKING_LEAST_PRIVILEGE',
  'T_SECURITY_THINKING_PATCHING_AND_ETHICS',
  'T_SECURITY_THINKING_DEBUGGING',
  'T_SECURITY_THINKING_PRACTICE',
  'T_SECURITY_THINKING_MINI_PROJECT',
]);

const PENDING = new Set(PENDING_REVIEW_UNITS);
/** True for a unit awaiting review — outside the certified inventory. */
export const isPendingReview = (unitCode: string): boolean => PENDING.has(String(unitCode));

export interface PrerequisiteBearing {
  unitCode: string;
  prerequisiteUnitCodes: string[];
}

export interface RecommendedSetDerivation {
  /** The production publish set: reached units and everything they require, never a withheld unit. */
  recommended: Set<string>;
  /** Named withheld units present in the READY universe, sorted. */
  withheldReady: string[];
  /** READY units neither recommended nor named — reported normally, never assumed intentional. */
  notRecommended: string[];
  /**
   * A recommended unit that REQUIRES a withheld one. Neither silently published nor silently dropped:
   * the set could not be prerequisite-closed without reversing the decision, so it is a policy conflict
   * for a person to resolve.
   */
  withheldRequired: { unitCode: string; requires: string }[];
}

/**
 * Close the reached units under their prerequisites, honouring the named withheld list.
 *
 * Only units in `universe` (the READY inventory being certified) are added; a prerequisite outside it
 * is left for the certifier's own prerequisite checks to report, as before.
 */
export function deriveRecommendedPublishSet(args: {
  reached: Iterable<string>;
  universe: PrerequisiteBearing[];
  withheld?: readonly string[];
}): RecommendedSetDerivation {
  const withheld = new Set(args.withheld ?? INTENTIONALLY_WITHHELD_READY);
  const byCode = new Map(args.universe.map(u => [u.unitCode, u]));
  const recommended = new Set<string>();
  const withheldRequired: { unitCode: string; requires: string }[] = [];

  const visit = (code: string, requiredBy: string | null) => {
    if (!byCode.has(code)) return;
    if (withheld.has(code)) {
      if (requiredBy) withheldRequired.push({ unitCode: requiredBy, requires: code });
      return;
    }
    if (recommended.has(code)) return;
    recommended.add(code);
    for (const p of byCode.get(code)!.prerequisiteUnitCodes) visit(p, code);
  };
  for (const code of args.reached) visit(code, null);

  const universeCodes = args.universe.map(u => u.unitCode);
  return {
    recommended,
    withheldReady: universeCodes.filter(c => withheld.has(c)).sort(),
    notRecommended: universeCodes.filter(c => !recommended.has(c) && !withheld.has(c)).sort(),
    withheldRequired: withheldRequired
      .filter((x, i, all) => all.findIndex(y => y.unitCode === x.unitCode && y.requires === x.requires) === i)
      .sort((a, b) => a.unitCode.localeCompare(b.unitCode) || a.requires.localeCompare(b.requires)),
  };
}

export interface PublicationDrift {
  ok: boolean;
  /** Published but not certified. */
  extra: string[];
  /** Certified but not published. */
  missing: string[];
  /** Named withheld units that are published — always a failure. */
  withheldPublished: string[];
  /** Named withheld units that are no longer READY — the list has gone stale and needs a decision. */
  withheldNotReady: string[];
}

/**
 * Does production publication match the certified set?
 *
 * The withheld units are not drift by being unpublished — that is the decision working. Everything else
 * is compared exactly: one extra or one missing publication fails, as it always has.
 */
export function publicationDrift(args: {
  published: string[];
  certified: string[];
  ready: string[];
  withheld?: readonly string[];
}): PublicationDrift {
  const withheld = [...(args.withheld ?? INTENTIONALLY_WITHHELD_READY)];
  const published = new Set(args.published);
  const certified = new Set(args.certified);
  const ready = new Set(args.ready);
  const extra = [...published].filter(c => !certified.has(c)).sort();
  const missing = [...certified].filter(c => !published.has(c)).sort();
  const withheldPublished = withheld.filter(c => published.has(c)).sort();
  const withheldNotReady = withheld.filter(c => !ready.has(c)).sort();
  return {
    ok: !extra.length && !missing.length && !withheldPublished.length && !withheldNotReady.length,
    extra, missing, withheldPublished, withheldNotReady,
  };
}
