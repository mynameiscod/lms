import CareerSkill, { ICareerSkill } from '../models/CareerSkill';
import PersonalizedAssessment from '../models/PersonalizedAssessment';
import { getCareerContext } from './careerContextService';
import { getRoleSkillBlueprint } from './roleSkillBlueprintService';
import { findEvidenceCandidates } from './skillEvidenceService';
import { EvidenceDifficulty, loadItems } from './skillEvidenceSourceRegistry';
import { hashSeed, rng, shuffle } from './paperBuilderService';
import {
  AssessmentPolicy, policyForStage, difficultyQuota, DISCOVERY_SKILL_SCOPE,
} from '../data/assessmentPolicies';
import { ROLE_NOT_SURE } from './careerDomainService';
import { getStageBlueprint } from './stageSkillSetService';
import { resolveAssessmentPolicy } from './assessmentPolicyService';

/**
 * Building one student's personalised assessment.
 *
 * The pipeline is deliberately a sequence of small pure steps — scope, slots, selection,
 * validation — because fairness is the property that has to be tested, and a property you
 * cannot test in isolation is one you will eventually lose. Only the first and last steps
 * touch the database.
 *
 * THE FAIRNESS CONTRACT. Two students at the same stage aiming at the same role receive
 * the same NUMBER of slots, the same SKILLS, the same DIFFICULTY spread and the same
 * maximum score. Only which question fills each slot differs. That is what makes their
 * results comparable while their papers are not identical, and it is why the shape comes
 * from policy rather than from whatever the pools happen to contain.
 *
 * DETERMINISTIC, using the same primitives the existing paper builder has always used
 * rather than a second implementation. The same student, policy and attempt number always
 * produce the same paper: a refresh mid-assessment must not reshuffle, a crashed request
 * must retry to the same result, and a fairness complaint must be reproducible months later.
 *
 * NO AI, and no keyword inference. Skills come from Module 4, evidence from Module 5, and
 * a skill with no mapped evidence produces a clear failure rather than a guess.
 */

export interface AssessmentSlot {
  skillKey: string;
  difficulty: EvidenceDifficulty;
  /** Why this slot exists — carried into the snapshot so selection can be explained. */
  reason: 'role_blueprint' | 'prerequisite' | 'discovery';
}

export interface SelectedItem {
  sourceType: string;
  sourceId: string;
  skillKey: string;
  difficulty: EvidenceDifficulty;
  /** The band actually served, when it differs from the slot's. */
  servedDifficulty: EvidenceDifficulty | null;
  order: number;
  points: number;
  reason: AssessmentSlot['reason'];
}

export interface GenerationReport {
  requestedSlots: number;
  filled: number;
  exactMatches: number;
  difficultyFallbacks: number;
  repeatedFromPreviousAttempt: number;
  /**
   * Slots that had to re-test a fact already covered earlier in the same paper.
   *
   * Zero on a healthy bank. A positive number means some skill has fewer distinct facts than
   * the policy asks slots of it, so the paper measures less than its length suggests.
   */
  repeatedFactsInPaper: number;
  /** Slots no evidence could fill. Non-empty means generation failed. */
  shortfalls: { skillKey: string; difficulty: string; wanted: number; got: number }[];
}

export interface AssessmentSpecification {
  policyKey: string;
  /** Skills in scope that had too little evidence to be measured when this paper was built. */
  notMeasuredSkills?: NotMeasuredSkill[];
  policyVersion: number;
  stage: string;
  roleKey: string;
  blueprintVersion: number;
  slots: AssessmentSlot[];
  skillCoverage: Record<string, number>;
  difficultyCoverage: Record<string, number>;
  totalPoints: number;
}

export interface GenerationInput {
  tenantId: string;
  studentId: string;
  stage: string;
  roleKey: string;
  /** Skills the role expects, already filtered to active assessable ones. */
  roleSkillKeys: string[];
  /**
   * The admin's ordering for those skills, when they came from a stage skill set. Absent
   * for a role blueprint, which keeps ranking exactly as it did.
   */
  skillPriority?: Map<string, { importance: string; weight: number; order: number }>;
  blueprintVersion: number;
  attemptNumber: number;
  /** Items this student has already seen, so a retake can prefer fresh ones. */
  seenSourceIds?: string[];
  /**
   * Facts this student has already been asked about, so a retake is fresh in substance.
   *
   * Ids alone cannot carry this for a generated bank: the same fact appears under a hundred
   * different ids, so every one of them looks unseen and a retake re-asks what the student has
   * already answered — measuring memory and reporting it as improvement.
   */
  seenFactKeys?: string[];
  /**
   * Already-resolved policy, so the build does not re-read tenant config.
   *
   * start() resolves the context — which resolves the policy — and then builds. Reading
   * again here was a wasted round trip, and a way for the two halves of one paper to
   * disagree if an admin saved a change between them.
   */
  policy?: AssessmentPolicy;
  /**
   * Who this paper is for, so audience-tagged items can be offered or withheld. Omitted,
   * the pool is unnarrowed — which is what every caller written before targeting did.
   */
  audience?: { roleKey?: string; year?: string; course?: string; branch?: string };
}

/**
 * Stages where a configured stage skill set replaces the role blueprint as the paper's scope.
 *
 * The first two years. Through second year every student is on the same syllabus whatever they
 * eventually aim at, so measuring two of them differently because one ticked a box at signup
 * would compare scores that were never comparable. The role still steers the ROADMAP at these
 * stages — which topics are relevant — it just does not choose the questions.
 *
 * From `specialize` onward the role is the point: a third-year has committed to a direction and
 * has a year to close the gap to it, and by `placement` measuring against anything but the job
 * would be measuring the wrong thing at the moment it matters most.
 *
 * This list is only expressible because each year now has its own stage. While second and third
 * year shared `build`, no entry here could separate them.
 */
const STAGE_SCOPE_OVERRIDES_ROLE = ['foundation', 'build'];

const norm = (v: any): string => String(v ?? '').trim().toUpperCase();

// ── Step 1: which skills this stage should assess ────────────────────────────

/**
 * Expand a role's destination skills back into what a student at this stage can be asked.
 *
 * A foundation student aiming at Backend Engineer should be assessed on HTTP and
 * programming, not on REST API design — the blueprint names the destination, and asking
 * them about it would measure how far they have to go rather than where they are.
 *
 * Depth-limited and deduplicated. The prerequisite graph is connected enough that an
 * unbounded walk reaches most of the taxonomy, which would assess nothing in particular.
 */
export function expandSkillScope(
  roleSkillKeys: string[],
  skills: Map<string, ICareerSkill>,
  policy: AssessmentPolicy,
): { skillKey: string; reason: AssessmentSlot['reason'] }[] {
  const out: { skillKey: string; reason: AssessmentSlot['reason'] }[] = [];
  const seen = new Set<string>();

  const admit = (key: string, reason: AssessmentSlot['reason']) => {
    const k = norm(key);
    if (seen.has(k)) return;
    const s = skills.get(k);
    // Inactive, non-assessable and grouping nodes are never assessed. A new paper must not
    // reach for a skill Module 3 has retired, even when a blueprint still references it.
    if (!s || s.active === false || !s.assessable || s.nodeType === 'GROUP') return;
    if (!policy.allowedSkillDifficulty.includes(s.difficulty)) return;
    seen.add(k);
    out.push({ skillKey: k, reason });
  };

  for (const k of roleSkillKeys) admit(k, 'role_blueprint');

  // Walk back level by level, so nearer prerequisites are admitted before distant ones and
  // the depth limit cuts the least relevant skills rather than an arbitrary branch.
  let frontier = roleSkillKeys.map(norm);
  for (let depth = 0; depth < policy.prerequisiteDepth; depth++) {
    const next: string[] = [];
    for (const key of frontier) {
      for (const p of (skills.get(key)?.prerequisiteKeys || [])) {
        const pk = norm(p);
        if (!seen.has(pk)) admit(pk, 'prerequisite');
        next.push(pk);
      }
    }
    if (!next.length) break;
    frontier = next;
  }

  return out;
}

/**
 * Rank the candidate skills and keep the ones this paper will cover.
 *
 * Deterministic and explainable rather than a scoring model: a foundation skill outranks
 * an advanced one at an early stage, a prerequisite outranks a destination, and ties break
 * on the key so the order never depends on how Mongo returned the rows.
 */
export function rankSkills(
  candidates: { skillKey: string; reason: AssessmentSlot['reason'] }[],
  skills: Map<string, ICareerSkill>,
  policy: AssessmentPolicy,
  /**
   * What the admin said matters, when the scope came from a stage skill set.
   *
   * WITHOUT IT THE ALPHABET DECIDES. A paper covers `maxSkills` — six at foundation — and
   * once reason and difficulty tie, the only remaining tiebreak was the key. A list of 47
   * equally-weighted FOUNDATION skills therefore always produced the six sorting first:
   * every APTITUDE_* key, and never Loops or Conditionals, however the admin had ordered
   * them. Their Importance, Weight and Order columns had no effect on what was measured.
   */
  priority?: Map<string, { importance: string; weight: number; order: number }>,
): { skillKey: string; reason: AssessmentSlot['reason'] }[] {
  const difficultyRank: Record<string, number> = { FOUNDATION: 0, INTERMEDIATE: 1, ADVANCED: 2 };
  const importanceRank: Record<string, number> = {
    ESSENTIAL: 0, IMPORTANT: 1, SUPPORTING: 2, OPTIONAL: 3,
  };
  /**
   * Early stages want the ground floor first; later stages want the destination.
   *
   * Read from the policy rather than inferred from prerequisiteDepth. Inferring it meant that
   * scoping a stage tightly — depth 0 — also inverted its difficulty preference, and a
   * first-year ended up measured on the hardest skills in their curriculum before the basics.
   */
  const preferPrerequisites = policy.preferFoundationalSkills ?? policy.prerequisiteDepth > 0;

  return candidates
    .slice()
    .sort((a, b) => {
      if (preferPrerequisites && a.reason !== b.reason) {
        return a.reason === 'prerequisite' ? -1 : 1;
      }
      const da = difficultyRank[skills.get(a.skillKey)?.difficulty || 'FOUNDATION'] ?? 0;
      const db = difficultyRank[skills.get(b.skillKey)?.difficulty || 'FOUNDATION'] ?? 0;
      if (da !== db) return preferPrerequisites ? da - db : db - da;

      // The admin's own ordering, ahead of the alphabet. Only consulted where a priority
      // was supplied, so a role blueprint ranks exactly as it did before.
      const pa = priority?.get(a.skillKey);
      const pb = priority?.get(b.skillKey);
      if (pa && pb) {
        const ia = importanceRank[pa.importance] ?? 1;
        const ib = importanceRank[pb.importance] ?? 1;
        if (ia !== ib) return ia - ib;
        if (pa.weight !== pb.weight) return pb.weight - pa.weight;   // heavier first
        if (pa.order !== pb.order) return pa.order - pb.order;       // then their own order
      }

      // Last resort, and deterministic: the order must never depend on how Mongo returned
      // the rows, or two students at the same stage would sit different papers.
      return a.skillKey.localeCompare(b.skillKey);
    })
    .slice(0, policy.maxSkills);
}

// ── Step 2: the slots ────────────────────────────────────────────────────────

/**
 * Turn a skill set into the exact list of slots this paper is made of.
 *
 * Every student on the same policy and role gets an identical list. The paper is defined
 * before a single question is looked at, which is precisely what stops the available
 * content from shaping what gets measured.
 */
export function buildSlots(
  scopedSkills: { skillKey: string; reason: AssessmentSlot['reason'] }[],
  policy: AssessmentPolicy,
): AssessmentSlot[] {
  if (!scopedSkills.length) return [];

  /**
   * MEASURE FEWER SKILLS PROPERLY RATHER THAN MORE OF THEM BADLY.
   *
   * The per-skill floor is not a preference, it is what makes a skill count: below it the
   * evidence stays LOW confidence and readiness ignores the result, so a skill measured under
   * the floor was not measured at all. When more skills arrive than the budget can fund at the
   * floor, the surplus is therefore dropped rather than every skill being thinned to fit.
   *
   * Callers normally rank and cut to maxSkills before reaching here, so this changes nothing in
   * the ordinary path. It matters when a policy sets the floor equal to the ceiling — the
   * balancing loop below can only shrink a skill's share down to the floor, so with no room
   * between them it cannot shrink at all, and eight skills on a twenty-four-slot policy quietly
   * produced a thirty-two-item paper: longer than its own specification, and no longer
   * comparable with anybody else's.
   */
  const affordable = Math.max(1, Math.floor(policy.skillSlots / policy.minItemsPerSkill));
  if (scopedSkills.length > affordable) scopedSkills = scopedSkills.slice(0, affordable);

  const perSkill = Math.max(
    policy.minItemsPerSkill,
    Math.min(policy.maxItemsPerSkill, Math.floor(policy.skillSlots / scopedSkills.length)),
  );

  // Spread the whole budget: give each skill its share, then hand out what rounding left
  // over in rank order, so the total always equals the policy exactly.
  const counts = new Map(scopedSkills.map(s => [s.skillKey, perSkill]));
  let assigned = perSkill * scopedSkills.length;
  let i = 0;
  while (assigned < policy.skillSlots && i < scopedSkills.length * policy.maxItemsPerSkill) {
    const s = scopedSkills[i % scopedSkills.length];
    const cur = counts.get(s.skillKey)!;
    if (cur < policy.maxItemsPerSkill) { counts.set(s.skillKey, cur + 1); assigned++; }
    i++;
  }
  while (assigned > policy.skillSlots) {
    const s = scopedSkills[(assigned - 1) % scopedSkills.length];
    const cur = counts.get(s.skillKey)!;
    if (cur > policy.minItemsPerSkill) { counts.set(s.skillKey, cur - 1); assigned--; }
    else break;
  }

  // INTERLEAVED, not skill by skill. Laying out A,A,A,B,B,B and then handing out bands in
  // order puts every hard question on the last skill: the scarcest band is still unspent
  // when the walk reaches it. Round-robin — A,B,C,A,B,C — spreads difficulty across the
  // paper, so no single skill carries all of it.
  const order: { skillKey: string; reason: AssessmentSlot['reason'] }[] = [];
  const remaining = new Map(counts);
  let placed = 0;
  while (placed < assigned) {
    let movedThisPass = false;
    for (const s of scopedSkills) {
      const n = remaining.get(s.skillKey) || 0;
      if (n <= 0) continue;
      remaining.set(s.skillKey, n - 1);
      order.push({ skillKey: s.skillKey, reason: s.reason });
      placed++; movedThisPass = true;
      if (placed >= assigned) break;
    }
    if (!movedThisPass) break;
  }

  const quota = difficultyQuota(assigned, policy.difficultyMix);
  const bands: EvidenceDifficulty[] = ['EASY', 'MEDIUM', 'HARD'];
  const left = { ...quota };

  return order.map(({ skillKey, reason }) => {
    // Whichever band has the most left to place. Ties break on the fixed band order, so
    // the result is deterministic rather than dependent on object key iteration.
    const band = bands.slice().sort((a, b) => left[b] - left[a] || bands.indexOf(a) - bands.indexOf(b))[0];
    left[band]--;
    return { skillKey, difficulty: band, reason };
  });
}

// ── Step 3: fill the slots ───────────────────────────────────────────────────

export interface PoolItem {
  sourceType: string;
  sourceId: string;
  difficulty: EvidenceDifficulty | null;
  contribution?: string;
  /** Constrained audience axes on the mapping. 0 = universal. Drives the preference below. */
  audienceSpecificity?: number;
  /**
   * The curriculum facts this item tests, where the bank is generated rather than authored.
   *
   * Absent for hand-written questions, where one item is one question and the id says all
   * there is to say. Present for the foundation bank, where forty thousand rows rest on about
   * three hundred and forty facts and two different ids are routinely the same question.
   */
  factKeys?: string[];
}

/**
 * A skill the stage covers that today's content cannot measure.
 *
 * Carries the arithmetic rather than a verdict, because the number is what anyone acting on this
 * needs: "HTML 0/4" says author four questions, where "not measurable" says nothing at all.
 */
export interface NotMeasuredSkill {
  skillKey: string;
  reasonCode: 'INSUFFICIENT_EVIDENCE';
  /** Distinct PRIMARY questions that exist now. */
  availablePrimary: number;
  /** What this stage's policy asks of every skill it measures. */
  requiredPrimary: number;
}

/**
 * How many genuinely different PRIMARY questions a pool holds.
 *
 * DISTINCT BY FACT, not by row. A generated bank reaches its size by recombining a small set of
 * claims, so a hundred rows can rest on one fact — counting rows would call a skill measurable
 * on the strength of a single question repeated, and the paper would then ask it four times.
 * Anything hand-authored carries no factKeys and counts once per item, which is correct there.
 */
export function distinctPrimaryCount(items: PoolItem[]): number {
  const facts = new Set<string>();
  const rows = new Set<string>();
  for (const i of items) {
    if (i.contribution && i.contribution !== 'PRIMARY') continue;
    rows.add(`${i.sourceType}:${i.sourceId}`);
    if (i.factKeys?.length) for (const f of i.factKeys) facts.add(f);
    else facts.add(`item:${i.sourceType}:${i.sourceId}`);
  }
  /**
   * The LESSER of the two, because two different limits apply and either can bind.
   *
   * Filling four slots needs four distinct ITEMS — the selector never uses one twice, so two
   * items carrying four facts between them can only fill two slots. Measuring honestly needs
   * four distinct FACTS — a hundred rows resting on one claim can fill four slots and has
   * measured one thing. Reporting the larger of the two would promise a paper that cannot be
   * built, or a measurement that has not happened.
   */
  return Math.min(rows.size, facts.size);
}

/**
 * Choose the questions, deterministically.
 *
 * Candidates are sorted by a stable key BEFORE the seeded shuffle: relying on the order
 * Mongo happened to return would make the same seed produce different papers on different
 * servers, which is the whole guarantee gone.
 *
 * An item already used in this paper is never reused, however many skills it maps to.
 * Items the student saw in an earlier attempt are pushed to the back rather than excluded,
 * so a retake is fresh where the pool allows and still possible where it does not.
 */
export function selectItems(
  slots: AssessmentSlot[],
  pools: Map<string, PoolItem[]>,
  seed: string,
  opts: {
    allowDifficultyFallback: boolean;
    seenSourceIds?: string[];
    /** Facts this student has already been asked about, from earlier attempts. */
    seenFactKeys?: string[];
  } = { allowDifficultyFallback: true },
): { items: SelectedItem[]; report: GenerationReport } {
  const rand = rng(hashSeed(seed));
  const seen = new Set((opts.seenSourceIds || []).map(String));
  const seenFacts = new Set((opts.seenFactKeys || []).map(String));
  const used = new Set<string>();
  /** Facts already spent in THIS paper, so no two slots test the same knowledge. */
  const usedFacts = new Set<string>();

  /**
   * Has this student already been asked what this item asks?
   *
   * By id for authored content. By fact for a generated bank, where a hundred and twenty rows
   * share one fact and id-matching would call a question fresh that the student has answered
   * before — the retake would then measure recall and report it as progress. An item counts as
   * seen once EVERY fact in it is seen: one new fact among three old ones is still something
   * not asked before, and treating it as stale would empty the pool for no gain.
   */
  const alreadySeen = (i: PoolItem): boolean =>
    seen.has(i.sourceId)
    || (!!i.factKeys?.length && i.factKeys.every(f => seenFacts.has(f)));

  /** Would this item repeat knowledge already tested earlier in the same paper? */
  const repeatsInThisPaper = (i: PoolItem): boolean =>
    !!i.factKeys?.length && i.factKeys.some(f => usedFacts.has(f));

  const items: SelectedItem[] = [];
  const report: GenerationReport = {
    requestedSlots: slots.length, filled: 0, exactMatches: 0,
    difficultyFallbacks: 0, repeatedFromPreviousAttempt: 0, repeatedFactsInPaper: 0, shortfalls: [],
  };

  /** Shuffled once per skill, so repeated slots for one skill draw different items. */
  const shuffled = new Map<string, PoolItem[]>();
  const poolFor = (skillKey: string): PoolItem[] => {
    if (!shuffled.has(skillKey)) {
      const stable = (pools.get(skillKey) || [])
        .slice()
        .sort((a, b) => `${a.sourceType}:${a.sourceId}`.localeCompare(`${b.sourceType}:${b.sourceId}`));
      const drawn = shuffle(stable, rand);

      /**
       * TARGETED BEFORE UNIVERSAL, unseen before seen.
       *
       * The query keeps a question when it is untagged OR tagged for this student, which
       * makes both equally eligible — and the shuffle then treated them alike. Five
       * questions written for first-year CSE sitting among two hundred universal ones came
       * up about 2% of the time, so tagging appeared to do nothing and the same paper
       * reached every year.
       *
       * Preference, not exclusion: universal questions still fill the slot when the targeted
       * ones run out, which is what stops a thinly-tagged skill from producing a short paper.
       *
       * Unseen stays the OUTER partition. A repeat across attempts reads as broken to a
       * student in a way that a slightly less specific question never does.
       */
      const byPreference = (list: PoolItem[]) => list
        .slice()
        .sort((a, b) => (b.audienceSpecificity ?? 0) - (a.audienceSpecificity ?? 0));

      shuffled.set(skillKey, [
        ...byPreference(drawn.filter(i => !alreadySeen(i))),
        ...byPreference(drawn.filter(i => alreadySeen(i))),
      ]);
    }
    return shuffled.get(skillKey)!;
  };

  const adjacent: Record<EvidenceDifficulty, EvidenceDifficulty[]> = {
    EASY: ['MEDIUM'], MEDIUM: ['EASY', 'HARD'], HARD: ['MEDIUM'],
  };

  for (const slot of slots) {
    const pool = poolFor(slot.skillKey);

    /**
     * A candidate must be unused, and must not re-test knowledge already spent in this paper.
     *
     * Both passes exist because the fact rule can empty a pool. Four slots on a skill with ten
     * facts is comfortable; four slots on a skill with two would find nothing on the third, and
     * an unfilled slot refuses the whole assessment. So a second pass drops the fact rule and
     * takes a repeat rather than turning the student away — a paper that measures one fact twice
     * is worse than one that does not, and far better than none at all. The relaxation is
     * counted, so a skill that keeps needing it can be found and given more content.
     */
    const pick = (match: (i: PoolItem) => boolean): PoolItem | undefined =>
      pool.find(i => !used.has(i.sourceId) && !repeatsInThisPaper(i) && match(i))
      ?? pool.find(i => !used.has(i.sourceId) && match(i));

    let chosen = pick(i => i.difficulty === slot.difficulty);
    let served: EvidenceDifficulty | null = null;

    // An item with no difficulty of its own (CareerPilot's own bank has none) counts for
    // any band rather than being unusable.
    if (!chosen) chosen = pick(i => i.difficulty === null);

    if (!chosen && opts.allowDifficultyFallback) {
      for (const alt of adjacent[slot.difficulty]) {
        chosen = pick(i => i.difficulty === alt);
        if (chosen) { served = alt; break; }
      }
    }

    if (!chosen) {
      const existing = report.shortfalls.find(s => s.skillKey === slot.skillKey && s.difficulty === slot.difficulty);
      if (existing) existing.wanted++;
      else report.shortfalls.push({ skillKey: slot.skillKey, difficulty: slot.difficulty, wanted: 1, got: 0 });
      continue;
    }

    used.add(chosen.sourceId);
    if (repeatsInThisPaper(chosen)) report.repeatedFactsInPaper++;
    chosen.factKeys?.forEach(f => usedFacts.add(f));
    if (alreadySeen(chosen)) report.repeatedFromPreviousAttempt++;
    if (served) report.difficultyFallbacks++; else report.exactMatches++;

    items.push({
      sourceType: chosen.sourceType, sourceId: chosen.sourceId,
      skillKey: slot.skillKey, difficulty: slot.difficulty, servedDifficulty: served,
      order: items.length, points: 1, reason: slot.reason,
    });
  }

  report.filled = items.length;
  for (const s of report.shortfalls) {
    s.got = slots.filter(x => x.skillKey === s.skillKey && x.difficulty === s.difficulty).length - s.wanted;
  }
  return { items, report };
}

/**
 * Is this paper fit to sit?
 *
 * Every slot filled, or none of it is used. A paper three questions short of its
 * specification measures something different from its peers, and that difference is
 * invisible in the score — so a clean failure an admin can act on beats a paper that
 * quietly means less.
 */
export function validateGeneration(
  report: GenerationReport,
): { ok: boolean; message?: string; adminMessage?: string } {
  /**
   * TWO MESSAGES, BECAUSE THERE ARE TWO AUDIENCES.
   *
   * There was one, and it read: "Not enough mapped questions for DSA_LINKED_LIST at medium
   * difficulty. Needed 1 more. Map more assessment content to this skill and try again."
   * That is a work instruction for an administrator, and it was being shown to students —
   * naming an internal skill key, describing an internal data model, and telling a member
   * to do something they have no access to do. A student reading it learns only that the
   * product is broken and that it is somehow their move.
   *
   * `message` is what the member sees: honest that it is our gap, not their fault, and with
   * nothing in it they cannot act on. `adminMessage` keeps the full diagnostic for the
   * preview screen and the logs, where it is exactly what is wanted.
   */
  if (report.shortfalls.length) {
    const first = report.shortfalls[0];
    const skills = [...new Set(report.shortfalls.map(s => s.skillKey))];
    return {
      ok: false,
      message: 'Your assessment is not ready yet — we are still adding questions for some of '
        + 'the skills your target role needs. Nothing is wrong with your account, and there '
        + 'is nothing for you to fix. Please check back shortly.',
      adminMessage: `Not enough mapped questions for ${first.skillKey} at ${first.difficulty.toLowerCase()} difficulty. `
        + `Needed ${first.wanted} more. `
        + (skills.length > 1 ? `${skills.length} skills are short: ${skills.join(', ')}. ` : '')
        + 'Map more assessment content to these skills, or draft questions for them, and try again.',
    };
  }
  if (report.filled < report.requestedSlots) {
    return {
      ok: false,
      message: 'Your assessment is not ready yet — we are still adding questions for your '
        + 'target role. Please check back shortly.',
      adminMessage: `Only ${report.filled} of ${report.requestedSlots} slots could be filled from the available pool.`,
    };
  }
  return { ok: true };
}

/** The seed. Never sent to a client — knowing it would reveal other students' papers. */
export const generationSeed = (studentId: string, policyKey: string, policyVersion: number, attemptNumber: number): string =>
  `${studentId}:${policyKey}:v${policyVersion}:a${attemptNumber}`;

// ── The database-touching ends of the pipeline ───────────────────────────────

/**
 * Why a personalized assessment cannot start.
 *
 * A stable code so the client can choose a state to render without parsing prose or
 * re-deriving the rule. The message stays the human sentence; nothing internal is exposed.
 */
export type AssessmentUnavailableReason =
  | 'ACCOUNT_NOT_FOUND'
  | 'CONTEXT_INCOMPLETE'
  | 'STAGE_UNKNOWN'
  | 'ROLE_NOT_CONFIGURED'
  | 'BLUEPRINT_UNPUBLISHED'
  | 'BLUEPRINT_EMPTY'
  | 'SKILLS_NOT_CONFIGURED'
  | 'QUESTION_POOL_EMPTY'
  /** The stage's skills exist and are intended; none of them has enough questions yet. */
  | 'INSUFFICIENT_EVIDENCE';

export interface ResolvedContext {
  ok: boolean;
  message?: string;
  /** Set whenever ok is false. Additive — callers reading ok/message are unaffected. */
  reasonCode?: AssessmentUnavailableReason;
  stage?: string;
  roleKey?: string;
  roleSkillKeys?: string[];
  blueprintVersion?: number;
  policy?: AssessmentPolicy;
  discovery?: boolean;
  /**
   * The admin's own ordering for the skills in scope, when it came from a stage skill set.
   *
   * Without this the ranking falls through to alphabetical, so a list of 47 equally-weighted
   * foundation skills always yields the six whose keys sort first — an all-aptitude paper
   * for a first-year, with Loops and Conditionals never appearing. Absent for a role
   * blueprint, which keeps its existing order.
   */
  skillPriority?: Map<string, { importance: string; weight: number; order: number }>;
  /**
   * The member's own role, year and course, so audience-tagged questions can be matched
   * against them. Optional: a discovery paper resolves without one, and a caller that
   * ignores it gets the unnarrowed pool, which is the pre-targeting behaviour.
   */
  audience?: { roleKey?: string; year?: string; course?: string; branch?: string };
}

/**
 * Everything about the student that shapes their paper, resolved SERVER-SIDE.
 *
 * Nothing here is read from the request. A student choosing their own role or stage could
 * sit an easier paper than their peers and their score would still be presented as
 * comparable, which is the one thing that would make every number in the product suspect.
 */
export async function resolvePersonalizedAssessmentContext(tenantId: string, studentId: string): Promise<ResolvedContext> {
  const context = await getCareerContext(tenantId, studentId);

  /**
   * WHO THIS PAPER IS FOR — built once, returned by every successful path.
   *
   * The role path returned an audience and the stage-set and discovery paths did not, so a
   * member with no target role reached the generator with no year and no course. The builder
   * then falls back to a role-only audience, which reads as "year unknown" and excludes every
   * year-tagged question — and the one foundation skill whose questions are all tagged
   * "1st Year" came back with an empty pool, three items short, refusing the assessment for
   * exactly the first-years those questions were written for.
   *
   * Defining it above the branches is the fix that lasts: a future return path cannot omit it.
   */
  const audienceOf = (roleKey?: string) => ({
    roleKey,
    year: context?.education?.currentAcademicYear || undefined,
    course: context?.education?.degree || undefined,
    branch: context?.education?.branch || undefined,
  });
  if (!context) return { ok: false, reasonCode: 'ACCOUNT_NOT_FOUND', message: 'Account not found.' };

  if (!context.status.onboardingCompleted) {
    return { ok: false, reasonCode: 'CONTEXT_INCOMPLETE', message: 'Complete your CareerPilot setup before starting the assessment.' };
  }

  const stage = context.derived.stage;
  if (!stage) {
    return { ok: false, reasonCode: 'STAGE_UNKNOWN', message: 'We could not work out your academic stage. Check your course and year in CareerPilot setup.' };
  }

  // The tenant's policy, not the shipped one — an admin can change the size and feel of a
  // paper per stage. The rules that keep papers comparable stay in code.
  const policy = await resolveAssessmentPolicy(tenantId, stage);
  const roleKey = context.career.primaryRole || ROLE_NOT_SURE;

  /**
   * AT AN EARLY STAGE, THE STAGE DECIDES — NOT THE ROLE.
   *
   * A first-year who names a target role was measured against that role's blueprint, which
   * describes a job: system design, frameworks, the things the role needs on the day somebody
   * is hired. Measuring a first-term student against it says only how far away they are, and
   * it means two first-years learning the same syllabus are assessed on different things
   * because one of them ticked a box during signup.
   *
   * The stage skill set is what a student at this point should be measured on, and it is
   * authored from the curriculum they are actually being taught. So where one is configured
   * for an early stage, it wins over the role, and the role does what it is good for — steering
   * DIRECTION in the plan, deciding which topics are relevant, not which questions are asked.
   *
   * Only where a stage set is configured. A tenant that has set one up has said what it wants;
   * one that has not keeps the previous behaviour exactly.
   */
  const stageOwnsTheScope = STAGE_SCOPE_OVERRIDES_ROLE.includes(stage);

  if (roleKey === ROLE_NOT_SURE || stageOwnsTheScope) {
    /**
     * THE ADMIN'S LIST WINS OVER THE BUILT-IN ONE.
     *
     * DISCOVERY_SKILL_SCOPE is twelve hardcoded keys, and a first-year who said "not sure"
     * was measured against them no matter what their college had configured — which is how
     * a question about waiting on database access at work reached somebody in their first
     * term. The stage skill set exists precisely to answer "what should this student be
     * measured on", and this is where it has to be read.
     *
     * Falls back to the built-in list when no set is enabled, so a tenant that has
     * configured nothing behaves exactly as before.
     */
    const stageSet = await getStageBlueprint(tenantId, stage);
    const stageKeys = (stageSet?.requirements || [])
      .filter(r => r.active && r.skillActive && !r.missing)
      .map(r => r.skillKey);

    /**
     * Falls through to the role blueprint when the set is empty or disabled, so turning a
     * stage set off restores the role path rather than leaving a member with nothing.
     */
    if (stageKeys.length) {
      const skillPriority = new Map(
        (stageSet!.requirements || []).map(r => [r.skillKey, {
          importance: r.importance, weight: r.weight, order: r.displayOrder,
        }]),
      );
      /**
       * A stage skill set is already the right scope, so it is not expanded.
       *
       * The set is authored from the stage's own curriculum: the skills a first-year should be
       * measured on, in the order they are taught. Walking back into prerequisites from there
       * reaches past the syllabus — a first-year was measured on quantitative aptitude and Java
       * specifics nothing in their plan would ever cover, and those slots came out of the
       * skills that ARE taught, leaving the paper short and refusing the assessment outright.
       *
       * Overridden here rather than in the policy because only this branch knows the scope came
       * from a curriculum-derived list. The role path keeps its expansion, which it needs: a
       * blueprint names destinations, and a first-year aiming at Backend has to be asked about
       * HTTP rather than REST API design.
       */
      return {
        ok: true, stage, roleKey, discovery: true,
        policy: { ...policy, prerequisiteDepth: 0 },
        roleSkillKeys: stageKeys, skillPriority, blueprintVersion: stageSet!.version || 0,
        audience: audienceOf(roleKey),
      };
    }
    /**
     * No stage set configured, so this stage has no opinion of its own.
     *
     * A member who named a role falls through to their blueprint — the branch above claims a
     * stage set can replace a role, and where there is no stage set there is nothing to replace
     * it with. Returning the built-in discovery list here instead would have quietly ignored a
     * role the student chose AND skipped every check on their blueprint: a draft or emptied one
     * would have produced a paper rather than the refusal an admin needs to see.
     *
     * Only a member with no role gets the built-in list, which is what it is for.
     */
    if (roleKey !== ROLE_NOT_SURE) {
      // fall through to the blueprint path below
    } else {
      return { ok: true, stage, roleKey, policy, discovery: true, roleSkillKeys: DISCOVERY_SKILL_SCOPE, blueprintVersion: 0, audience: audienceOf(roleKey) };
    }
  }

  const blueprint = await getRoleSkillBlueprint(tenantId, roleKey);
  if (!blueprint) return { ok: false, reasonCode: 'ROLE_NOT_CONFIGURED', message: `Your target role is not configured yet.` };

  // Draft blueprints are somebody's work in progress; assessing a student against one
  // would measure a standard nobody has agreed to.
  if (!blueprint.published) {
    return { ok: false, reasonCode: 'BLUEPRINT_UNPUBLISHED', message: `The ${blueprint.roleName} skill blueprint has not been published yet. Ask your administrator to publish it.` };
  }

  const roleSkillKeys = blueprint.requirements
    .filter(r => r.active && r.skillActive && !r.missing)
    .map(r => r.skillKey);

  if (!roleSkillKeys.length) {
    return { ok: false, reasonCode: 'BLUEPRINT_EMPTY', message: `The ${blueprint.roleName} blueprint has no usable skills yet.` };
  }

  return {
    ok: true, stage, roleKey, policy, roleSkillKeys, blueprintVersion: blueprint.version,
    // Year and course come straight from the member's own CareerPilot setup, so an admin
    // tagging a question "2nd Year" targets the same value the student chose there.
    audience: {
      roleKey,
      year: context.education?.currentAcademicYear || undefined,
      /**
       * COURSE IS THE DEGREE. It read `branch || degree`, which meant a question tagged
       * "B.Tech" did not reach any member who had a branch recorded — course resolved to
       * "CSE" and never matched. The single tagged mapping in production carries B.E,
       * B.TECH and MCA, so degree was always the intent; branch now has its own axis and
       * the two no longer stand in for each other.
       */
      course: context.education?.degree || undefined,
      branch: context.education?.branch || undefined,
    },
  };
}

/**
 * The facts a student has already been asked about, read from the papers they have sat.
 *
 * WHY THIS IS NOT OPTIONAL. `seenSourceIds` alone is enough only where one question is one piece
 * of knowledge. The Foundation Golden bank is not built that way: its four hundred and eighty
 * facts carry three and a half questions each, so a retake that excludes only the ids it has
 * already shown can hand the student a different item resting on the fact they answered last
 * month — and read the remembered answer as improvement. The selector has always known how to
 * prevent that; it was simply never told what had been seen, because both callers passed ids and
 * nothing else.
 *
 * A frozen paper records the item's id, not its facts, so they are read back through the
 * registry — one batched query per source family, however many papers there are. Content that
 * carries no facts contributes nothing, which is correct for a hand-authored bank where the id
 * already identifies the question.
 */
export async function seenFactKeysFor(
  tenantId: string,
  items: { sourceType: string; sourceId: string }[],
): Promise<string[]> {
  if (!items.length) return [];
  const loaded = await loadItems(tenantId, items).catch(() => new Map());
  const facts = new Set<string>();
  for (const item of loaded.values()) {
    for (const f of (item as any).factKeys || []) facts.add(f);
  }
  return [...facts];
}

/**
 * Build the whole specification and fill it — WITHOUT persisting anything.
 *
 * Used by both the student start and the admin preview, which is what makes the preview
 * trustworthy: it exercises the identical code path rather than an approximation that
 * could drift from what students actually receive.
 */
export async function buildPersonalizedAssessment(input: GenerationInput): Promise<{
  ok: boolean;
  message?: string;
  /** The full diagnostic, for the admin preview and the logs — never for a member. */
  adminMessage?: string;
  reasonCode?: AssessmentUnavailableReason;
  specification?: AssessmentSpecification;
  items?: SelectedItem[];
  report?: GenerationReport;
  seed?: string;
  /**
   * Skills the stage covers that this paper could not measure, with the counts.
   *
   * Returned on SUCCESS as well as failure, and stored on the specification. A student asking
   * "why is HTML not in my skill map" has an answer, and an admin can see what to author without
   * reading a log.
   */
  notMeasuredSkills?: NotMeasuredSkill[];
}> {
  /**
   * The policy the CALLER already resolved, when it has one.
   *
   * start() resolves the context (which resolves the policy) and then builds, so reading
   * the tenant config a second time here was both a wasted round trip and a way for the two
   * halves of one paper to disagree if an admin saved between them.
   */
  const policy = input.policy || await resolveAssessmentPolicy(input.tenantId, input.stage);

  const skillDocs = await CareerSkill.find({
    key: { $in: [...new Set(input.roleSkillKeys.map(norm))] },
  }).lean() as any[];

  // Prerequisites may reach beyond the blueprint's own skills, so the graph is loaded once
  // more for them rather than one lookup per edge.
  const prereqKeys = [...new Set(skillDocs.flatMap(s => (s.prerequisiteKeys || []).map(norm)))];
  const extra = prereqKeys.length
    ? await CareerSkill.find({ key: { $in: prereqKeys } }).lean() as any[]
    : [];

  const skills = new Map<string, ICareerSkill>([...skillDocs, ...extra].map(s => [s.key, s]));

  const candidates = expandSkillScope(input.roleSkillKeys, skills, policy);
  if (!candidates.length) {
    return { ok: false, message: 'No assessable skills are configured for your stage and role yet.' };
  }

  /**
   * EVIDENCE IS COUNTED BEFORE THE PAPER IS SHAPED, NOT AFTER.
   *
   * The order used to be the other way round: shape the paper from the whole scope, then look
   * for questions, then refuse the entire assessment if any slot could not be filled. That made
   * one unanswerable skill fatal to a paper the other thirty could have supported — a first-year
   * was turned away because nothing had been authored for Git yet.
   *
   * It also pushed the problem into the stage skill set, which was then pruned to whatever the
   * bank happened to contain. So the definition of what a stage is about drifted with the
   * content, and eighteen skills the curriculum teaches vanished from it when a bank was cleared.
   *
   * Counting first separates the two questions properly. What SHOULD be measured is the stage
   * set — intent, stable. What CAN be measured today is arithmetic over the evidence. A skill
   * that fails the second is skipped and reported, never silently dropped and never fatal.
   */
  const pools = await findEvidenceCandidates(input.tenantId, {
    skillKeys: candidates.map(s => s.skillKey),
    contribution: 'PRIMARY',
    // Defaults to the paper's own role when the caller did not spell out an audience, so a
    // role-tagged question reaches the right students without every call site being updated.
    audience: input.audience || (input.roleKey ? { roleKey: input.roleKey } : undefined),
  });
  const poolMap = new Map<string, PoolItem[]>(pools.map(p => [p.skillKey, p.items.map(i => ({
    sourceType: i.sourceType, sourceId: i.sourceId, difficulty: i.difficulty as any, contribution: i.contribution,
    audienceSpecificity: (i as any).audienceSpecificity ?? 0,
    factKeys: (i as any).factKeys,
  }))]));

  const required = policy.minItemsPerSkill;
  const notMeasuredSkills: NotMeasuredSkill[] = [];
  const measurable = candidates.filter(c => {
    const available = distinctPrimaryCount(poolMap.get(c.skillKey) || []);
    if (available >= required) return true;
    notMeasuredSkills.push({
      skillKey: c.skillKey,
      reasonCode: 'INSUFFICIENT_EVIDENCE',
      availablePrimary: available,
      requiredPrimary: required,
    });
    return false;
  });

  /**
   * Nothing measurable is the one case that must still fail.
   *
   * A paper with no questions is not a shorter paper, and telling a student their skills are
   * unknown after they sat nothing would be worse than telling them to come back.
   */
  if (!measurable.length) {
    return {
      ok: false,
      reasonCode: 'INSUFFICIENT_EVIDENCE',
      notMeasuredSkills,
      message: 'Your assessment is not ready yet — we are still adding questions for the skills '
        + 'your stage covers. Nothing is wrong with your account, and there is nothing for you '
        + 'to fix. Please check back shortly.',
      adminMessage: `None of the ${candidates.length} skills in scope has the ${required} `
        + `PRIMARY questions this stage needs. Shortest gaps: `
        + notMeasuredSkills
          .slice()
          .sort((a, b) => b.availablePrimary - a.availablePrimary)
          .slice(0, 5)
          .map(n => `${n.skillKey} ${n.availablePrimary}/${n.requiredPrimary}`)
          .join(', ')
        + '. Author or map questions for them and try again.',
    };
  }

  const scoped = rankSkills(measurable, skills, policy, input.skillPriority);
  const slots = buildSlots(scoped, policy);

  const seed = generationSeed(input.studentId, policy.key, policy.version, input.attemptNumber);
  const { items, report } = selectItems(slots, poolMap, seed, {
    allowDifficultyFallback: policy.allowDifficultyFallback,
    seenSourceIds: input.seenSourceIds,
    seenFactKeys: input.seenFactKeys,
  });

  const valid = validateGeneration(report);
  if (!valid.ok) return { ok: false, message: valid.message, adminMessage: valid.adminMessage, report };

  const skillCoverage: Record<string, number> = {};
  const difficultyCoverage: Record<string, number> = {};
  for (const s of slots) {
    skillCoverage[s.skillKey] = (skillCoverage[s.skillKey] || 0) + 1;
    difficultyCoverage[s.difficulty] = (difficultyCoverage[s.difficulty] || 0) + 1;
  }

  return {
    ok: true,
    specification: {
      policyKey: policy.key, policyVersion: policy.version,
      stage: input.stage, roleKey: input.roleKey,
      blueprintVersion: input.blueprintVersion,
      slots, skillCoverage, difficultyCoverage,
      totalPoints: items.reduce((n, i) => n + i.points, 0),
      // Recorded with the paper so "why was I not measured on HTML" is answerable months
      // later, when the content has changed and the counts no longer reproduce.
      notMeasuredSkills: notMeasuredSkills.length ? notMeasuredSkills : undefined,
    },
    items, report, seed,
    notMeasuredSkills,
  };
}

/** What the student's UI needs to decide between a CTA and a "not ready" state. */
export interface AssessmentAvailability {
  assessmentAvailable: boolean;
  reasonCode?: AssessmentUnavailableReason;
  message?: string;
  /** True when the member has no chosen role and would sit the broad discovery paper. */
  discovery: boolean;
  /** An attempt already open AND partly answered — the CTA should resume, not start. */
  inProgress: boolean;
  /**
   * The member has already submitted an assessment. The page should show that rather than
   * offering "Start" as the default action, which is how a completed member acquires a
   * second, untouched paper with one stray click.
   */
  alreadyCompleted?: boolean;
}

/**
 * Can this member actually start a personalized assessment right now?
 *
 * Preflight for the onboarding CTA. Onboarding used to end on a "Start My Assessment"
 * button that called start() and discovered only then that the tenant has no published
 * blueprint or no question pool — the student finished setup, clicked, and got an error.
 * Routing someone into a known failure is worse than telling them the path is not ready.
 *
 * Deliberately reuses resolvePersonalizedAssessmentContext and findEvidenceCandidates
 * rather than restating their rules, so this cannot drift from what start() will do.
 * It stops short of generating a paper: generation is seeded per attempt and rate-limited
 * as an AI operation, and a preflight that consumed that budget on every page view would
 * be its own problem. It therefore answers "is the configuration there", not "will every
 * slot fill" — a coverage shortfall is still reported by start(), as before.
 */
export async function getPersonalizedAssessmentAvailability(
  tenantId: string,
  studentId: string,
): Promise<AssessmentAvailability> {
  const [open, completed] = await Promise.all([
    PersonalizedAssessment.findOne({ tenantId, studentId, status: 'IN_PROGRESS' }).select('_id answers').lean() as any,
    /**
     * HAVE THEY ALREADY SAT ONE?
     *
     * Without this the assessment page offers "Start assessment" to a member who finished
     * minutes ago, with nothing on screen saying so — one stray click and they have a
     * second paper. That is exactly how a member ended up with attempt #1 submitted 20 of
     * 20 at 08:26 and an untouched attempt #2 at 08:27, then being told to go and finish
     * the assessment they had just completed.
     *
     * The page needs to know, so it can show the result and make a retake deliberate
     * rather than the default action.
     */
    // `exists` rather than a sorted findOne: the only question is whether one has ever been
    // submitted, and asking for the newest means fetching and ordering rows to answer yes.
    PersonalizedAssessment.exists({ tenantId, studentId, status: 'SUBMITTED' }),
  ]);
  const alreadyCompleted = !!completed;

  const ctx = await resolvePersonalizedAssessmentContext(tenantId, studentId);
  const discovery = !!ctx.discovery;

  if (!ctx.ok) {
    return { assessmentAvailable: false, reasonCode: ctx.reasonCode, message: ctx.message, discovery, inProgress: false, alreadyCompleted };
  }

  /**
   * An attempt in progress is startable by definition — it exists. But `inProgress` is
   * reported only when the member has actually ANSWERED something: an untouched row is a
   * mis-click, not work to resume, and calling it "continue where you left off" is how the
   * phantom attempt above became a nag.
   */
  const started = (open?.answers || []).some(
    (a: any) => a && a.response !== undefined && a.response !== null && a.response !== '',
  );
  if (open) return { assessmentAvailable: true, discovery, inProgress: started, alreadyCompleted };

  // The skill graph has to exist before anything can be asked. NOT_SURE reaches here too:
  // discovery scopes to a broad skill set, which is just as absent on a tenant that has
  // not configured skills, and that is exactly the case that used to fail after the click.
  const skillKeys = [...new Set((ctx.roleSkillKeys || []).map(k => String(k || '').trim().toUpperCase()))].filter(Boolean);
  const skillCount = skillKeys.length
    ? await CareerSkill.countDocuments({ key: { $in: skillKeys } })
    : 0;
  if (!skillCount) {
    return {
      assessmentAvailable: false,
      reasonCode: 'SKILLS_NOT_CONFIGURED',
      message: 'This career path is not ready for assessment yet.',
      discovery, inProgress: false, alreadyCompleted,
    };
  }

  const pools = await findEvidenceCandidates(tenantId, { skillKeys, contribution: 'PRIMARY' });
  const anyQuestions = pools.some(p => (p.items || []).length > 0);
  if (!anyQuestions) {
    return {
      assessmentAvailable: false,
      reasonCode: 'QUESTION_POOL_EMPTY',
      message: 'This career path is not ready for assessment yet.',
      discovery, inProgress: false, alreadyCompleted,
    };
  }

  return { assessmentAvailable: true, discovery, inProgress: false, alreadyCompleted };
}
