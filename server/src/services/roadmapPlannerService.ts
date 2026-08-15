import { GapStatus, classifyGap, priorityScore, TARGET_SCORE } from '../data/roleReadinessPolicy';
import {
  ROADMAP_VERSION, PHASES, PhaseKey, WorkType, ReasonCode,
  MIN_BLOCK_MINUTES, ASSESS_BLOCK_MINUTES, REVIEW_BLOCK_MINUTES,
  MAX_SKILL_SHARE, PREREQUISITE_DEPTH, PREREQUISITE_BUDGET,
  VALIDATION_SHARE, MAINTENANCE_SHARE, diagnosticShareFor, effortEstimate,
  capacityFor, weekBudgets, activeSkillsPerWeek, roundBlock, mixFor, planningConfidence,
} from '../data/roadmapPolicy';

/**
 * The planner: gaps, prerequisites and available time in — an ordered, explainable plan out.
 *
 * PURE, AND DELIBERATELY SO. No database, no clock, no randomness, no network. Everything it
 * needs is passed in, which is what makes "same inputs, same plan" (§110, §121) a property
 * that can be tested rather than a claim, and what lets the capacity, prerequisite and
 * fairness rules be exercised without a Mongo instance.
 *
 * IT DOES NOT DECIDE WHO IS WEAK. Module 8 already classified every required skill and
 * ranked the gaps; this module reads that verdict and decides only where the minutes go. A
 * second gap formula here would eventually disagree with the readiness screen, and a student
 * shown two different answers stops believing either.
 *
 * UNKNOWN IS NOT WEAK. A skill nobody has measured earns a diagnostic, never a course from
 * zero. Teaching somebody something they may already know is the most expensive mistake a
 * 90-day plan can make, because the time is gone and the real gap is still there.
 *
 * STRONG COSTS NOTHING. A demonstrated, well-evidenced strength gets no remedial capacity at
 * all. "We don't make every student learn everything from zero" is the promise; spending
 * three weeks on SQL for somebody who scored 90 breaks it in the most visible way possible.
 */

/** What the planner needs to know about one required skill — Module 8's verdict, unchanged. */
export interface PlannerSkill {
  skillKey: string;
  skillName: string;
  importance: string;
  weight: number;
  targetLevel: string;
  targetScore: number;
  studentScore: number | null;
  skillConfidence: string | null;
  gapPoints: number | null;
  status: GapStatus;
  /** Module 8's ranking. The only priority in the system. */
  priorityScore: number;
  skillInactive?: boolean;
}

/** One node of the canonical graph, as far as planning cares. */
export interface PlannerGraphNode {
  key: string;
  name: string;
  nodeType: 'GROUP' | 'SKILL';
  prerequisiteKeys: string[];
  active: boolean;
  assessable?: boolean;
  learnable?: boolean;
}

/** Skill DNA for a skill outside the blueprint — a prerequisite the role never listed. */
export interface PlannerProfile {
  score: number;
  confidence: string;
}

export interface PlannerInput {
  roleKey: string;
  roleName: string;
  /** Shifts the activity mix only. Never a score, a gap or a target. */
  stage: string | null;
  coverage: number;
  roleConfidence: 'LOW' | 'MEDIUM' | 'HIGH';
  minutesPerDay: number;
  daysPerWeek: number;
  roadmapDays: number;
  skills: PlannerSkill[];
  graph: Map<string, PlannerGraphNode>;
  profiles: Map<string, PlannerProfile>;
}

export interface PlannedObjective {
  skillKey: string;
  skillName: string;
  workType: WorkType;
  plannedMinutes: number;
  phase: PhaseKey;
  week: number;
  sequence: number;
  reasonCode: ReasonCode;
  sourceGapStatus: GapStatus;
  targetLevel: string;
  targetScore: number;
  studentScore: number | null;
  /** Set when this exists to unblock another skill — the dependent's key. */
  prerequisiteFor?: string;
  /** Built from the numbers above. Deterministic, and never generated. */
  explanation: string;
}

export interface DeferredObjective {
  skillKey: string;
  skillName: string;
  reasonCode: ReasonCode;
  reason: string;
}

export interface PlannedPhase {
  key: PhaseKey;
  title: string;
  blurb: string;
  fromWeek: number;
  toWeek: number;
  fromDay: number;
  toDay: number;
  plannedMinutes: number;
}

export interface PlannedRoadmap {
  policyVersion: string;
  roadmapDays: number;
  weekCount: number;
  capacity: {
    minutesPerDay: number;
    daysPerWeek: number;
    weeklyCapacityMinutes: number;
    weeklyPlannableMinutes: number;
    theoreticalMinutes: number;
    plannableMinutes: number;
    plannedMinutes: number;
  };
  planningConfidence: 'LOW' | 'MEDIUM' | 'HIGH';
  phases: PlannedPhase[];
  objectives: PlannedObjective[];
  deferred: DeferredObjective[];
  report: {
    priorityGaps: number;
    needsWork: number;
    limitedEvidence: number;
    notAssessed: number;
    strengthsSkipped: number;
    prerequisitesAdded: number;
    prerequisitesSatisfiedSkipped: number;
    objectivesScheduled: number;
    objectivesDeferred: number;
    diagnosticMinutes: number;
    gapMinutes: number;
    validationMinutes: number;
    maintenanceMinutes: number;
  };
}

/**
 * What a prerequisite outside the blueprint is measured against.
 *
 * FOUNDATION, not the dependent's target: a prerequisite has to be good enough to build on,
 * not mastered. Requiring PROFICIENT in every ancestor would make one gap unreachable behind
 * a wall of skills the role never asked for.
 */
const PREREQUISITE_TARGET_LEVEL = 'FOUNDATION';
const PREREQUISITE_TARGET_SCORE = TARGET_SCORE.FOUNDATION;

const byPriority = <T extends { priorityScore: number; skillKey: string }>(a: T, b: T) =>
  b.priorityScore - a.priorityScore || a.skillKey.localeCompare(b.skillKey);

/** A gap we intend to close, before it has been given any minutes. */
interface Candidate {
  skillKey: string;
  skillName: string;
  importance: string;
  weight: number;
  targetLevel: string;
  targetScore: number;
  studentScore: number | null;
  status: GapStatus;
  priorityScore: number;
  /** Depth in the prerequisite chain: 0 is the role's own requirement. */
  depth: number;
  prerequisiteFor?: string;
}

/**
 * Walk back up the prerequisite chain from the demonstrated gaps.
 *
 * BOUNDED AND CYCLE-SAFE. `seen` spans every root, so a shared ancestor is added once and
 * attributed to the highest-priority skill that needed it, and a graph an admin has managed
 * to make circular terminates instead of hanging. Depth and budget are both capped because
 * 90 days has room for a few missing foundations, not for a whole ancestry.
 *
 * GROUPS ARE TRAVERSED, NEVER SCHEDULED. A grouping node organises the taxonomy; it is not
 * something a student can sit down and learn, so its own prerequisites are substituted in
 * its place.
 */
function expandPrerequisites(
  roots: Candidate[],
  input: PlannerInput,
): { added: Candidate[]; satisfiedSkipped: number } {
  const seen = new Set<string>(roots.map(r => r.skillKey));
  const seenGroups = new Set<string>();
  const added: Candidate[] = [];
  let satisfiedSkipped = 0;

  /** Prerequisites of `keys`, with any GROUP replaced by what it in turn depends on. */
  const schedulablePrereqsOf = (keys: string[]): string[] => {
    const out: string[] = [];
    const stack = keys.flatMap(k => [...(input.graph.get(k)?.prerequisiteKeys || [])].sort());
    let guard = 0;
    while (stack.length && guard++ < 200) {
      const k = stack.shift()!;
      const node = input.graph.get(k);
      if (!node || !node.active) continue;
      if (node.nodeType === 'GROUP') {
        if (seenGroups.has(k)) continue;
        seenGroups.add(k);
        stack.push(...[...node.prerequisiteKeys].sort());
        continue;
      }
      out.push(k);
    }
    return out;
  };

  for (const root of roots) {
    let frontier = [root.skillKey];

    for (let depth = 1; depth <= PREREQUISITE_DEPTH && frontier.length; depth++) {
      const next: string[] = [];

      // Walked one parent at a time so each prerequisite is attributed to the skill that
      // IMMEDIATELY needs it. Attributing the whole chain to the original gap read as "OOP
      // comes before Spring Boot" when the true and more useful statement is "OOP comes
      // before Java" — and, more importantly, left nothing ordering OOP against Java.
      for (const parent of frontier) {
        for (const key of schedulablePrereqsOf([parent])) {
          if (seen.has(key)) continue;
          seen.add(key);
          next.push(key);

          if (added.length >= PREREQUISITE_BUDGET) continue;

          const node = input.graph.get(key)!;
          const profile = input.profiles.get(key) || null;
          const status = classifyGap({
            studentScore: profile ? profile.score : null,
            targetScore: PREREQUISITE_TARGET_SCORE,
            confidence: profile ? profile.confidence : null,
          });

          // Already good enough to build on. Scheduling it anyway is exactly the waste this
          // module exists to avoid — and the student would notice, because they know they
          // can already do it.
          if (status === 'ON_TRACK' || status === 'STRONG') { satisfiedSkipped++; continue; }

          added.push({
            skillKey: key,
            skillName: node.name || key.replace(/_/g, ' '),
            importance: root.importance,
            weight: root.weight,
            targetLevel: PREREQUISITE_TARGET_LEVEL,
            targetScore: PREREQUISITE_TARGET_SCORE,
            studentScore: profile ? profile.score : null,
            status,
            // Module 8's formula, applied to this skill's own numbers. Not a second priority
            // model — the same one, which is the point of §29.
            priorityScore: profile
              ? priorityScore({
                  studentScore: profile.score,
                  targetScore: PREREQUISITE_TARGET_SCORE,
                  weight: root.weight,
                  importance: root.importance,
                })
              : 0,
            depth,
            prerequisiteFor: parent,
          });
        }
      }

      frontier = next;
    }
  }

  return { added, satisfiedSkipped };
}

/**
 * Share a pool of minutes across gaps in proportion to Module 8's priority.
 *
 * Three constraints make this more than a division.
 *
 * The GLOBAL CAP stops one enormous gap eating the programme — a student should finish 90
 * days having moved several things, not one.
 *
 * The EFFORT CEILING stops the opposite mistake. Pure proportional sharing re-distributed a
 * capped skill's surplus to whatever was left, so a student with plenty of time could be
 * given twenty hours against a seven-point shortfall — work nobody thought was needed,
 * scheduled purely because the hours existed. Capacity decides how much of the needed work
 * fits; it never invents more.
 *
 * The FLOOR is the honest one: when the pool cannot give a skill a usable block, that skill
 * is deferred and said to be deferred, rather than handed nine minutes and counted as
 * planned. Dropping the lowest-priority one and re-sharing is what turns a shortage into a
 * prioritised subset instead of a uniformly useless plan.
 */
function shareByPriority(
  entries: { key: string; priorityScore: number; ceiling: number }[],
  pool: number,
  cap: number,
): { allocated: Map<string, number>; dropped: string[] } {
  const allocated = new Map<string, number>();
  const dropped: string[] = [];

  let list = entries
    .filter(e => e.priorityScore > 0)
    .sort((a, b) => b.priorityScore - a.priorityScore || a.key.localeCompare(b.key));
  // A gap with no priority score cannot be ranked against the others and is not a
  // demonstrated deficit; it belongs in the diagnostic path, not this one.
  for (const e of entries) if (e.priorityScore <= 0) dropped.push(e.key);

  let remaining = Math.max(0, pool);

  for (let pass = 0; pass < 40 && list.length; pass++) {
    const sum = list.reduce((n, e) => n + e.priorityScore, 0);
    if (sum <= 0 || remaining < MIN_BLOCK_MINUTES) {
      dropped.push(...list.map(e => e.key));
      list = [];
      break;
    }

    const raw = new Map(list.map(e => [e.key, (e.priorityScore / sum) * remaining]));
    const ceilingOf = (e: { ceiling: number }) => Math.min(cap, Math.max(MIN_BLOCK_MINUTES, e.ceiling));

    // Anything over its ceiling is settled there, and what it gives up is re-shared among
    // the rest — who are themselves capped, so the surplus stops rather than piling onto
    // whatever happens to be last in the list.
    const over = list.filter(e => (raw.get(e.key) || 0) > ceilingOf(e));
    if (over.length) {
      for (const e of over) {
        const settled = roundBlock(ceilingOf(e));
        allocated.set(e.key, settled);
        remaining -= settled;
      }
      const capped = new Set(over.map(e => e.key));
      list = list.filter(e => !capped.has(e.key));
      continue;
    }

    const under = list.filter(e => (raw.get(e.key) || 0) < MIN_BLOCK_MINUTES);
    if (under.length) {
      const worst = under[under.length - 1];     // list is priority-ordered, so this is the least urgent
      dropped.push(worst.key);
      list = list.filter(e => e.key !== worst.key);
      continue;
    }

    for (const e of list) allocated.set(e.key, roundBlock(raw.get(e.key) || 0));
    list = [];
  }

  return { allocated, dropped };
}

/** Why this objective is in the plan, in the student's terms. Built, never generated. */
function explain(o: {
  skillName: string;
  roleName: string;
  workType: WorkType;
  reasonCode: ReasonCode;
  studentScore: number | null;
  targetScore: number;
  prerequisiteForName?: string;
}): string {
  switch (o.reasonCode) {
    case 'PREREQUISITE':
      return o.workType === 'ASSESS'
        ? `${o.skillName} comes before ${o.prerequisiteForName}, and we have not measured it yet — so this checks where you stand before we plan any learning.`
        : `Scheduled before ${o.prerequisiteForName} because ${o.skillName} is a prerequisite for it.`;
    case 'PRIORITY_GAP':
      return `${o.skillName} is a priority skill for ${o.roleName}. Your demonstrated score is ${o.studentScore} against a target of ${o.targetScore}.`;
    case 'NEEDS_WORK':
      return `${o.skillName} is close to what ${o.roleName} expects — ${o.studentScore} against a target of ${o.targetScore}.`;
    case 'ASSESSMENT_NEEDED':
      return `${o.skillName} is a required skill for ${o.roleName} that we have not measured. We check first rather than assume you need to learn it.`;
    case 'LIMITED_EVIDENCE':
      return `We have only measured ${o.skillName} briefly. This confirms the ${o.studentScore} we recorded before spending time on it.`;
    case 'VALIDATION':
      return `Re-measures ${o.skillName} after the work above, so your next plan is built on what actually changed.`;
    case 'MAINTENANCE':
      return `${o.skillName} is already at the level ${o.roleName} expects — a short review to keep it there.`;
    default:
      return `${o.skillName} is part of your plan for ${o.roleName}.`;
  }
}

/** An objective before it has been given a week. */
interface Draft {
  skillKey: string;
  skillName: string;
  workType: WorkType;
  plannedMinutes: number;
  phase: PhaseKey;
  reasonCode: ReasonCode;
  sourceGapStatus: GapStatus;
  targetLevel: string;
  targetScore: number;
  studentScore: number | null;
  prerequisiteFor?: string;
  explanation: string;
  /** Ordering within a phase: prerequisites deepest-first, then Module 8 priority. */
  order: number;
}

export function buildRoadmapPlan(input: PlannerInput): PlannedRoadmap {
  const capacity = capacityFor({
    minutesPerDay: input.minutesPerDay,
    daysPerWeek: input.daysPerWeek,
    roadmapDays: input.roadmapDays,
  });

  // A requirement whose canonical skill has since been retired is not planned against.
  // History keeps whatever an earlier plan said about it (§112); a new plan uses the
  // configuration that is true now.
  const skills = input.skills
    .filter(s => !s.skillInactive && input.graph.get(s.skillKey)?.active !== false)
    .slice()
    .sort(byPriority);

  const of = (status: GapStatus) => skills.filter(s => s.status === status);
  const gaps = [...of('PRIORITY_GAP'), ...of('NEEDS_WORK')].sort(byPriority);

  const roots: Candidate[] = gaps.map(s => ({
    skillKey: s.skillKey, skillName: s.skillName, importance: s.importance, weight: s.weight,
    targetLevel: s.targetLevel, targetScore: s.targetScore, studentScore: s.studentScore,
    status: s.status, priorityScore: s.priorityScore, depth: 0,
  }));

  const { added: prerequisites, satisfiedSkipped } = expandPrerequisites(roots, input);

  const drafts: Draft[] = [];
  const deferred: DeferredObjective[] = [];
  const nameOf = (key: string) =>
    skills.find(s => s.skillKey === key)?.skillName
    || input.graph.get(key)?.name
    || key.replace(/_/g, ' ');

  // ── 1. Diagnostics ────────────────────────────────────────────────────────────────
  //
  // Bought first, and at a fixed small price. They are what stops the other 80% of the
  // plan being spent on a guess: every unknown resolved here is either a gap worth
  // closing or a skill the student never has to sit through.

  const diagnosticBudget = Math.floor(capacity.plannableMinutes * diagnosticShareFor(input.coverage));

  const diagnosticCandidates: { skill: PlannerSkill | Candidate; reason: ReasonCode; prerequisiteFor?: string }[] = [
    // A high score we do not trust is the cheapest thing in the plan to settle, and the
    // one most likely to save weeks of unnecessary teaching.
    ...of('LIMITED_EVIDENCE').map(s => ({ skill: s, reason: 'LIMITED_EVIDENCE' as ReasonCode })),
    // Unknown prerequisites next: they block work that is already scheduled.
    ...prerequisites
      .filter(p => p.status === 'NOT_ASSESSED' || p.status === 'LIMITED_EVIDENCE')
      .map(p => ({ skill: p, reason: 'PREREQUISITE' as ReasonCode, prerequisiteFor: p.prerequisiteFor })),
    // Then required skills nobody has measured — essential ones first, because an
    // unmeasured essential is the largest hole in the picture (§100).
    ...of('NOT_ASSESSED')
      .slice()
      .sort((a, b) =>
        Number(b.importance === 'ESSENTIAL') - Number(a.importance === 'ESSENTIAL')
        || b.weight - a.weight
        || a.skillKey.localeCompare(b.skillKey))
      .map(s => ({ skill: s, reason: 'ASSESSMENT_NEEDED' as ReasonCode })),
  ];

  let diagnosticMinutes = 0;
  for (const c of diagnosticCandidates) {
    const s = c.skill;
    if (diagnosticMinutes + ASSESS_BLOCK_MINUTES > diagnosticBudget) {
      // Not ignored — recorded, because at renewal this is the first thing worth doing.
      deferred.push({
        skillKey: s.skillKey, skillName: s.skillName, reasonCode: c.reason,
        reason: 'Higher-priority work filled this roadmap. Measuring this comes first next time.',
      });
      continue;
    }
    diagnosticMinutes += ASSESS_BLOCK_MINUTES;
    drafts.push({
      skillKey: s.skillKey, skillName: s.skillName, workType: 'ASSESS',
      plannedMinutes: ASSESS_BLOCK_MINUTES,
      phase: 'FOUNDATION',
      reasonCode: c.reason,
      sourceGapStatus: s.status,
      targetLevel: s.targetLevel, targetScore: s.targetScore, studentScore: s.studentScore,
      prerequisiteFor: c.prerequisiteFor,
      explanation: explain({
        skillName: s.skillName, roleName: input.roleName, workType: 'ASSESS',
        reasonCode: c.reason, studentScore: s.studentScore, targetScore: s.targetScore,
        prerequisiteForName: c.prerequisiteFor ? nameOf(c.prerequisiteFor) : undefined,
      }),
      // Diagnostics lead the plan, and the DEEPER a prerequisite sits the earlier it goes:
      // the thing at the bottom of the chain is the thing everything else waits on.
      order: -1000 - ('depth' in s ? (s as Candidate).depth : 0),
    });
  }

  // ── 2. Gap capacity ───────────────────────────────────────────────────────────────

  const validationReserve = Math.floor(capacity.plannableMinutes * VALIDATION_SHARE);
  const maintenanceReserve = Math.floor(capacity.plannableMinutes * MAINTENANCE_SHARE);
  const gapPool = Math.max(0, capacity.plannableMinutes - diagnosticMinutes - validationReserve - maintenanceReserve);

  // Prerequisites with a demonstrated gap are learning work, alongside the role's own gaps.
  const learnable: Candidate[] = [
    ...prerequisites.filter(p => p.status === 'PRIORITY_GAP' || p.status === 'NEEDS_WORK'),
    ...roots,
  ];

  const { allocated, dropped } = shareByPriority(
    learnable.map(c => ({
      key: c.skillKey,
      priorityScore: c.priorityScore,
      ceiling: effortEstimate({ status: c.status, studentScore: c.studentScore, targetScore: c.targetScore }),
    })),
    gapPool,
    capacity.plannableMinutes * MAX_SKILL_SHARE,
  );

  for (const key of dropped) {
    const c = learnable.find(x => x.skillKey === key);
    if (!c) continue;
    deferred.push({
      skillKey: c.skillKey, skillName: c.skillName,
      reasonCode: c.prerequisiteFor ? 'PREREQUISITE' : (c.status === 'PRIORITY_GAP' ? 'PRIORITY_GAP' : 'NEEDS_WORK'),
      reason: 'Higher-priority gaps and prerequisites used this roadmap’s capacity.',
    });
  }

  const mix = mixFor(input.stage);
  let gapMinutes = 0;
  const worked: Candidate[] = [];

  for (const c of learnable) {
    const total = allocated.get(c.skillKey);
    if (!total) continue;
    worked.push(c);
    gapMinutes += total;

    const reasonCode: ReasonCode = c.prerequisiteFor
      ? 'PREREQUISITE'
      : (c.status === 'PRIORITY_GAP' ? 'PRIORITY_GAP' : 'NEEDS_WORK');

    // Prerequisites sit in the foundation phase so they always precede what they unblock;
    // everything else learns in phase 2 and applies in phase 3.
    const learnPhase: PhaseKey = c.prerequisiteFor ? 'FOUNDATION' : 'CORE_GAPS';
    const practicePhase: PhaseKey = c.prerequisiteFor ? 'FOUNDATION' : 'APPLICATION';

    const base = {
      skillKey: c.skillKey, skillName: c.skillName,
      reasonCode, sourceGapStatus: c.status,
      targetLevel: c.targetLevel, targetScore: c.targetScore, studentScore: c.studentScore,
      prerequisiteFor: c.prerequisiteFor,
      order: c.prerequisiteFor ? -500 - c.depth : 0 - c.priorityScore,
    };

    const explainFor = (workType: WorkType) => explain({
      skillName: c.skillName, roleName: input.roleName, workType, reasonCode,
      studentScore: c.studentScore, targetScore: c.targetScore,
      prerequisiteForName: c.prerequisiteFor ? nameOf(c.prerequisiteFor) : undefined,
    });

    // Too small to be two useful sessions: give it the one that fits the gap. A real
    // deficit is taught; a near-miss is practised.
    if (total < MIN_BLOCK_MINUTES * 2) {
      const workType: WorkType = c.status === 'PRIORITY_GAP' ? 'LEARN' : 'PRACTICE';
      drafts.push({
        ...base, workType, plannedMinutes: total,
        phase: workType === 'LEARN' ? learnPhase : practicePhase,
        explanation: explainFor(workType),
      });
      continue;
    }

    // Both halves have to be worth doing. A placement-stage mix on a modest allocation once
    // produced a fifteen-minute LEARN block beside a long practice one — the split is meant
    // to shift emphasis, not to manufacture an item too small to sit down to.
    const learn = Math.max(MIN_BLOCK_MINUTES, roundBlock(total * mix.learn));
    const practice = Math.max(MIN_BLOCK_MINUTES, total - learn);
    drafts.push({ ...base, workType: 'LEARN', plannedMinutes: learn, phase: learnPhase, explanation: explainFor('LEARN') });
    drafts.push({ ...base, workType: 'PRACTICE', plannedMinutes: practice, phase: practicePhase, explanation: explainFor('PRACTICE') });
    gapMinutes += (learn + practice) - total;
  }

  // ── 3. Validation ─────────────────────────────────────────────────────────────────
  //
  // Every skill given real capacity is re-measured at the end. Without this the next plan
  // would be built from evidence collected before any of the work happened, and the student
  // would be told to study the same things again.

  let validationMinutes = 0;
  for (const c of [...worked].sort((a, b) => byPriority(
    { priorityScore: a.priorityScore, skillKey: a.skillKey },
    { priorityScore: b.priorityScore, skillKey: b.skillKey },
  ))) {
    if (validationMinutes + ASSESS_BLOCK_MINUTES > validationReserve) break;
    validationMinutes += ASSESS_BLOCK_MINUTES;
    drafts.push({
      skillKey: c.skillKey, skillName: c.skillName, workType: 'ASSESS',
      plannedMinutes: ASSESS_BLOCK_MINUTES, phase: 'VALIDATION',
      reasonCode: 'VALIDATION', sourceGapStatus: c.status,
      targetLevel: c.targetLevel, targetScore: c.targetScore, studentScore: c.studentScore,
      explanation: explain({
        skillName: c.skillName, roleName: input.roleName, workType: 'ASSESS',
        reasonCode: 'VALIDATION', studentScore: c.studentScore, targetScore: c.targetScore,
      }),
      order: 0 - c.priorityScore,
    });
  }

  // ── 4. Maintenance ────────────────────────────────────────────────────────────────
  //
  // Only from what is left, and only for ON_TRACK. A STRONG skill gets nothing: it is
  // demonstrated, well-evidenced, and the student's 90 days are better spent elsewhere.

  let maintenanceMinutes = 0;
  for (const s of of('ON_TRACK').sort((a, b) => b.weight - a.weight || a.skillKey.localeCompare(b.skillKey))) {
    if (maintenanceMinutes + REVIEW_BLOCK_MINUTES > maintenanceReserve) break;
    maintenanceMinutes += REVIEW_BLOCK_MINUTES;
    drafts.push({
      skillKey: s.skillKey, skillName: s.skillName, workType: 'REVIEW',
      plannedMinutes: REVIEW_BLOCK_MINUTES, phase: 'VALIDATION',
      reasonCode: 'MAINTENANCE', sourceGapStatus: s.status,
      targetLevel: s.targetLevel, targetScore: s.targetScore, studentScore: s.studentScore,
      explanation: explain({
        skillName: s.skillName, roleName: input.roleName, workType: 'REVIEW',
        reasonCode: 'MAINTENANCE', studentScore: s.studentScore, targetScore: s.targetScore,
      }),
      order: 500,
    });
  }

  // ── 5. Phases, then weeks ─────────────────────────────────────────────────────────

  const budgets = weekBudgets(input.roadmapDays, capacity.weeklyPlannableMinutes);
  const perWeekSkillCap = activeSkillsPerWeek(capacity.weeklyPlannableMinutes);

  const sortDrafts = (list: Draft[]) => list.sort((a, b) => a.order - b.order
    || a.skillKey.localeCompare(b.skillKey)
    || a.workType.localeCompare(b.workType));

  let activePhases = PHASES
    .map(p => ({ ...p, drafts: sortDrafts(drafts.filter(d => d.phase === p.key)) }))
    .filter(p => p.drafts.length > 0);

  const totalPlanned = drafts.reduce((n, d) => n + d.plannedMinutes, 0);

  // Phase lengths come from the plan, not from a template: a student with little evidence
  // gets a longer diagnostic phase because that is where their minutes actually went.
  let spans = allocateWeeks(
    activePhases.map(p => p.drafts.reduce((n, d) => n + d.plannedMinutes, 0)),
    budgets.length,
  );

  /**
   * A window too short to give every phase a week.
   *
   * Reachable whenever a membership expires inside the next few weeks, and the failure was
   * silent: a phase allotted no weeks had nowhere to put its objectives, so they vanished
   * into "deferred" while the plan still claimed the phase existed. Folding those drafts
   * into the preceding phase keeps the work and drops only the label, which is the right
   * thing to lose when there is genuinely no room for four stages.
   */
  if (spans.some(s => s <= 0)) {
    const kept: typeof activePhases = [];
    const keptSpans: number[] = [];
    activePhases.forEach((p, i) => {
      if (spans[i] > 0) { kept.push(p); keptSpans.push(spans[i]); return; }
      const target = kept.length ? kept[kept.length - 1] : null;
      if (target) target.drafts = sortDrafts([...target.drafts, ...p.drafts]);
      else if (activePhases[i + 1]) activePhases[i + 1].drafts = sortDrafts([...activePhases[i + 1].drafts, ...p.drafts]);
    });
    activePhases = kept;
    spans = keptSpans;
  }

  // Phase week ranges are settled first, because a phase is a LABEL for a stretch of the
  // plan rather than a container. An objective takes the phase of the week it lands in.
  const phases: PlannedPhase[] = [];
  let weekCursor = 1;
  activePhases.forEach((phase, i) => {
    const fromWeek = weekCursor;
    const toWeek = weekCursor + spans[i] - 1;
    weekCursor = toWeek + 1;
    phases.push({
      key: phase.key, title: phase.title, blurb: phase.blurb,
      fromWeek, toWeek,
      fromDay: (fromWeek - 1) * 7 + 1,
      toDay: Math.min(input.roadmapDays, toWeek * 7),
      plannedMinutes: 0,
    });
  });

  const phaseOfWeek = (w: number): PhaseKey =>
    (phases.find(p => w >= p.fromWeek && w <= p.toWeek) || phases[phases.length - 1]).key;

  // Remaining budget per week, and who is already busy in it. Global rather than per phase.
  const remaining = new Map<number, number>();
  const skillsIn = new Map<number, Set<string>>();
  for (let w = 1; w <= budgets.length; w++) {
    remaining.set(w, budgets[w - 1]);
    skillsIn.set(w, new Set());
  }

  /**
   * The last week a skill's prerequisites occupy — the earliest it may itself begin.
   *
   * SEQUENCE IS SEPARATE FROM PRIORITY. REST APIs can be the most urgent thing in the plan
   * and still cannot come first, because HTTP has to. Leaving the order to fall out of which
   * phase things landed in was too weak a guarantee: one phase boundary moving by a week
   * could put a skill alongside the prerequisite it depends on.
   */
  const unblockedAfter = new Map<string, number>();

  const objectives: PlannedObjective[] = [];
  let sequence = 0;

  activePhases.forEach((phase, i) => {
    const phaseStart = phases[i].fromWeek;

    for (const d of phase.drafts) {
      let left = d.plannedMinutes;
      const minWeek = Math.max(phaseStart, (unblockedAfter.get(d.skillKey) || 0) + 1);

      /**
       * Runs to the end of the plan, not to the end of the phase.
       *
       * Stopping at the phase boundary meant a block that overshot by ten minutes was
       * dropped in its entirety while later weeks sat half empty — the student lost real
       * work to a rounding decision about a label. Weeks are the scarce thing; phases are
       * only how we describe them.
       */
      for (let w = minWeek; w <= budgets.length && left > 0; w++) {
        const free = remaining.get(w) ?? 0;
        const busy = skillsIn.get(w)!;

        /**
         * Focus over coverage — but only where focus is the point.
         *
         * A week already carrying its share of distinct skills to LEARN or PRACTICE does not
         * take another. Diagnostics and reviews are exempt: they are short, they demand no
         * sustained attention, and counting them against the limit meant a validation week
         * could hold four 45-minute checks and then turn the rest away with five hours of
         * its budget unspent. Six students' worth of "re-measure this" ended up deferred
         * from a plan that had ample room for them.
         */
        const needsFocus = d.workType === 'LEARN' || d.workType === 'PRACTICE';
        if (needsFocus && !busy.has(d.skillKey) && busy.size >= perWeekSkillCap) continue;
        if (free < MIN_BLOCK_MINUTES) continue;

        /**
         * Split only where BOTH parts are worth doing — by trimming, not by skipping.
         *
         * Filling the week and carrying the difference forward left stubs: a 100-minute
         * block against 80 free minutes produced a 20-minute objective the following week.
         * Refusing to split at all was worse, and much harder to see: a 330-minute block
         * against a 306-minute week would have left 24 minutes over, so it declined every
         * identical week in turn, fell through to the short final week, and lost the
         * remainder to "deferred" while eleven weeks sat almost empty.
         *
         * Taking slightly less than the week has free is the answer. Both parts clear the
         * minimum, nothing is overbooked, and the work stays in the plan.
         */
        const take = left <= free
          ? left
          : (left - free >= MIN_BLOCK_MINUTES
            ? free
            : (left - MIN_BLOCK_MINUTES >= MIN_BLOCK_MINUTES ? left - MIN_BLOCK_MINUTES : 0));
        if (!take) continue;
        objectives.push({
          skillKey: d.skillKey, skillName: d.skillName, workType: d.workType,
          plannedMinutes: take, phase: phaseOfWeek(w), week: w, sequence: sequence++,
          reasonCode: d.reasonCode, sourceGapStatus: d.sourceGapStatus,
          targetLevel: d.targetLevel, targetScore: d.targetScore, studentScore: d.studentScore,
          prerequisiteFor: d.prerequisiteFor, explanation: d.explanation,
        });
        remaining.set(w, free - take);
        if (needsFocus) busy.add(d.skillKey);
        left -= take;

        // Whatever this unblocks cannot start until the week it finishes in.
        if (d.prerequisiteFor) {
          unblockedAfter.set(d.prerequisiteFor, Math.max(unblockedAfter.get(d.prerequisiteFor) || 0, w));
        }
      }

      // Genuinely no room left in the whole plan. Recorded rather than silently dropped, and
      // never crammed into a week that cannot hold it.
      if (left >= MIN_BLOCK_MINUTES) {
        deferred.push({
          skillKey: d.skillKey, skillName: d.skillName, reasonCode: d.reasonCode,
          reason: 'There was not enough time left in this roadmap for the whole block.',
        });
      }
    }
  });

  for (const p of phases) {
    p.plannedMinutes = objectives
      .filter(o => o.phase === p.key)
      .reduce((n, o) => n + o.plannedMinutes, 0);
  }

  const plannedMinutes = objectives.reduce((n, o) => n + o.plannedMinutes, 0);

  return {
    policyVersion: ROADMAP_VERSION,
    roadmapDays: input.roadmapDays,
    weekCount: budgets.length,
    capacity: {
      minutesPerDay: input.minutesPerDay,
      daysPerWeek: input.daysPerWeek,
      weeklyCapacityMinutes: capacity.weeklyCapacityMinutes,
      weeklyPlannableMinutes: capacity.weeklyPlannableMinutes,
      theoreticalMinutes: capacity.theoreticalMinutes,
      plannableMinutes: capacity.plannableMinutes,
      plannedMinutes,
    },
    planningConfidence: planningConfidence({
      roleConfidence: input.roleConfidence,
      diagnosticMinutes,
      plannedMinutes: plannedMinutes || totalPlanned,
    }),
    phases,
    objectives,
    deferred,
    report: {
      priorityGaps: of('PRIORITY_GAP').length,
      needsWork: of('NEEDS_WORK').length,
      limitedEvidence: of('LIMITED_EVIDENCE').length,
      notAssessed: of('NOT_ASSESSED').length,
      strengthsSkipped: of('STRONG').length,
      prerequisitesAdded: prerequisites.length,
      prerequisitesSatisfiedSkipped: satisfiedSkipped,
      objectivesScheduled: objectives.length,
      objectivesDeferred: deferred.length,
      diagnosticMinutes,
      gapMinutes,
      validationMinutes,
      maintenanceMinutes,
    },
  };
}

/**
 * Split `weeks` between phases in proportion to their planned minutes.
 *
 * Every phase that has work gets at least one week — a phase squeezed to zero would put its
 * objectives nowhere — and largest-remainder makes the parts sum to exactly the window
 * rather than drifting a week short on a long plan.
 *
 * The exception is a window with fewer weeks than phases, which a membership expiring soon
 * can produce. Then the phases carrying the most work get the weeks and the rest get none;
 * the caller folds their objectives into a surviving phase rather than losing them. The
 * result always sums to exactly `weeks`, which is what stops a phase being handed a week
 * the plan does not have.
 */
export function allocateWeeks(minutesPerPhase: number[], weeks: number): number[] {
  const n = minutesPerPhase.length;
  if (!n) return [];
  if (weeks <= 0) return minutesPerPhase.map(() => 0);

  if (weeks < n) {
    const winners = new Set(
      minutesPerPhase
        .map((m, i) => ({ m, i }))
        .sort((a, b) => b.m - a.m || a.i - b.i)
        .slice(0, weeks)
        .map(x => x.i),
    );
    return minutesPerPhase.map((_, i) => (winners.has(i) ? 1 : 0));
  }
  if (weeks === n) return minutesPerPhase.map(() => 1);

  const total = minutesPerPhase.reduce((a, b) => a + b, 0);
  if (total <= 0) {
    const even = Math.floor(weeks / n);
    const out = minutesPerPhase.map(() => even);
    for (let i = 0; i < weeks - even * n; i++) out[i]++;
    return out;
  }

  const spare = weeks - n;                       // one week each is already reserved
  const exact = minutesPerPhase.map(m => (m / total) * spare);
  const out = exact.map(e => 1 + Math.floor(e));
  let used = out.reduce((a, b) => a + b, 0);

  const order = exact
    .map((e, i) => ({ i, frac: e - Math.floor(e) }))
    .sort((a, b) => b.frac - a.frac || a.i - b.i);
  for (let k = 0; used < weeks; k++) { out[order[k % n].i]++; used++; }

  return out;
}
