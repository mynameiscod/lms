import CareerSkill, { ICareerSkill } from '../models/CareerSkill';
import PersonalizedAssessment from '../models/PersonalizedAssessment';
import { getCareerContext } from './careerContextService';
import { getRoleSkillBlueprint } from './roleSkillBlueprintService';
import { findEvidenceCandidates } from './skillEvidenceService';
import { EvidenceDifficulty } from './skillEvidenceSourceRegistry';
import { hashSeed, rng, shuffle } from './paperBuilderService';
import {
  AssessmentPolicy, policyForStage, difficultyQuota, DISCOVERY_SKILL_SCOPE,
} from '../data/assessmentPolicies';
import { ROLE_NOT_SURE } from './careerDomainService';
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
  /** Slots no evidence could fill. Non-empty means generation failed. */
  shortfalls: { skillKey: string; difficulty: string; wanted: number; got: number }[];
}

export interface AssessmentSpecification {
  policyKey: string;
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
  blueprintVersion: number;
  attemptNumber: number;
  /** Items this student has already seen, so a retake can prefer fresh ones. */
  seenSourceIds?: string[];
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
): { skillKey: string; reason: AssessmentSlot['reason'] }[] {
  const difficultyRank: Record<string, number> = { FOUNDATION: 0, INTERMEDIATE: 1, ADVANCED: 2 };
  // Early stages want the ground floor first; later stages want the destination.
  const preferPrerequisites = policy.prerequisiteDepth > 0;

  return candidates
    .slice()
    .sort((a, b) => {
      if (preferPrerequisites && a.reason !== b.reason) {
        return a.reason === 'prerequisite' ? -1 : 1;
      }
      const da = difficultyRank[skills.get(a.skillKey)?.difficulty || 'FOUNDATION'] ?? 0;
      const db = difficultyRank[skills.get(b.skillKey)?.difficulty || 'FOUNDATION'] ?? 0;
      if (da !== db) return preferPrerequisites ? da - db : db - da;
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
  opts: { allowDifficultyFallback: boolean; seenSourceIds?: string[] } = { allowDifficultyFallback: true },
): { items: SelectedItem[]; report: GenerationReport } {
  const rand = rng(hashSeed(seed));
  const seen = new Set((opts.seenSourceIds || []).map(String));
  const used = new Set<string>();

  const items: SelectedItem[] = [];
  const report: GenerationReport = {
    requestedSlots: slots.length, filled: 0, exactMatches: 0,
    difficultyFallbacks: 0, repeatedFromPreviousAttempt: 0, shortfalls: [],
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
        ...byPreference(drawn.filter(i => !seen.has(i.sourceId))),
        ...byPreference(drawn.filter(i => seen.has(i.sourceId))),
      ]);
    }
    return shuffled.get(skillKey)!;
  };

  const adjacent: Record<EvidenceDifficulty, EvidenceDifficulty[]> = {
    EASY: ['MEDIUM'], MEDIUM: ['EASY', 'HARD'], HARD: ['MEDIUM'],
  };

  for (const slot of slots) {
    const pool = poolFor(slot.skillKey);

    let chosen = pool.find(i => !used.has(i.sourceId) && i.difficulty === slot.difficulty);
    let served: EvidenceDifficulty | null = null;

    // An item with no difficulty of its own (CareerPilot's own bank has none) counts for
    // any band rather than being unusable.
    if (!chosen) chosen = pool.find(i => !used.has(i.sourceId) && i.difficulty === null);

    if (!chosen && opts.allowDifficultyFallback) {
      for (const alt of adjacent[slot.difficulty]) {
        chosen = pool.find(i => !used.has(i.sourceId) && i.difficulty === alt);
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
    if (seen.has(chosen.sourceId)) report.repeatedFromPreviousAttempt++;
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
  | 'QUESTION_POOL_EMPTY';

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

  // A member who has not chosen a role gets the broad discovery scope. No role is inferred
  // and none is assigned — saying "not sure" is an answer, and recommending one is a later
  // module's job.
  if (roleKey === ROLE_NOT_SURE) {
    return { ok: true, stage, roleKey, policy, discovery: true, roleSkillKeys: DISCOVERY_SKILL_SCOPE, blueprintVersion: 0 };
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
  specification?: AssessmentSpecification;
  items?: SelectedItem[];
  report?: GenerationReport;
  seed?: string;
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

  const scoped = rankSkills(expandSkillScope(input.roleSkillKeys, skills, policy), skills, policy);
  if (!scoped.length) {
    return { ok: false, message: 'No assessable skills are configured for your stage and role yet.' };
  }

  const slots = buildSlots(scoped, policy);

  // ONE batched evidence query for every skill at once — Module 5 was built for this, and
  // a query per slot would be twenty round trips per student.
  const pools = await findEvidenceCandidates(input.tenantId, {
    skillKeys: scoped.map(s => s.skillKey),
    contribution: 'PRIMARY',
    // Defaults to the paper's own role when the caller did not spell out an audience, so a
    // role-tagged question reaches the right students without every call site being updated.
    audience: input.audience || (input.roleKey ? { roleKey: input.roleKey } : undefined),
  });
  const poolMap = new Map<string, PoolItem[]>(pools.map(p => [p.skillKey, p.items.map(i => ({
    sourceType: i.sourceType, sourceId: i.sourceId, difficulty: i.difficulty as any, contribution: i.contribution,
    audienceSpecificity: (i as any).audienceSpecificity ?? 0,
  }))]));

  const seed = generationSeed(input.studentId, policy.key, policy.version, input.attemptNumber);
  const { items, report } = selectItems(slots, poolMap, seed, {
    allowDifficultyFallback: policy.allowDifficultyFallback,
    seenSourceIds: input.seenSourceIds,
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
    },
    items, report, seed,
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
