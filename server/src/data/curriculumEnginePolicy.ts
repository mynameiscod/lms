/**
 * Which curriculum engine plans a student's learning.
 *
 * ── WHY A GATE AT ALL ─────────────────────────────────────────────────────────────────────
 *
 * Two engines can answer "what should this student learn next", and only one may. The TOPIC
 * engine has been serving every student for months: thirty-nine curriculum topics projected onto
 * a calendar. The UNIT engine plans from Learning Units, which is the whole point of the mega
 * curriculum and is useless until units are authored.
 *
 * Running both for the same journey is not a smaller risk than switching — it is a larger one.
 * CareerPilot has twice had two systems answering one question, and both times the symptom was
 * a student shown a plan that disagreed with the plan the system believed they were on. The gate
 * exists so there is exactly one answer per student, decided in one place, and so the switch can
 * be made for a handful of test accounts before it is made for anybody who paid.
 *
 * ── OFF IS NOT A DEGRADED MODE ────────────────────────────────────────────────────────────
 *
 * With the gate off, everything behaves exactly as it did before Learning Units existed. That is
 * the same promise `conceptLearningEnabled` makes on PassportConfig, and it is what makes this
 * safe to ship before any unit is written: the code can be live for weeks while the content is
 * authored, and nothing about a student's experience changes until somebody decides it should.
 *
 * ── WHY AN ALLOWLIST RATHER THAN A PERCENTAGE ─────────────────────────────────────────────
 *
 * A percentage rollout would put real paying members on an engine whose curriculum is half
 * written, chosen by a hash they cannot see. Curriculum is not a UI colour: a student on a
 * half-authored plan loses weeks, not a click. Named accounts, switched on deliberately, is the
 * only rollout shape that lets somebody be accountable for who is on it.
 */

export type CurriculumEngine = 'TOPIC' | 'UNIT';

/** The shipped default. Every tenant, every student, until somebody says otherwise. */
export const DEFAULT_CURRICULUM_ENGINE: CurriculumEngine = 'TOPIC';

export interface CurriculumEngineConfig {
  /** Turn the unit engine on for this tenant. Off by default. */
  megaCurriculumEnabled?: boolean;
  /**
   * Student ids on the unit engine regardless of the tenant switch.
   *
   * Read BEFORE the tenant switch, so a test account can be moved over while the tenant as a
   * whole stays on topics — which is the entire point of gating this rather than deploying it.
   */
  megaCurriculumStudentIds?: string[];
  /**
   * Stages on the unit engine regardless of the tenant switch.
   *
   * Year one can move while later stages stay put: the foundation curriculum is the one being
   * authored as units, and the others have no units to plan from.
   */
  megaCurriculumStages?: string[];
}

/**
 * Which engine serves this student, now.
 *
 * Deliberately pure and synchronous. It is called from planning paths that already hold the
 * config they were given, and a version that fetched would make the engine choice an async
 * decision inside services that cannot fail safely.
 */
export function curriculumEngineFor(input: {
  config?: CurriculumEngineConfig | null;
  studentId?: string | null;
  stageKey?: string | null;
}): CurriculumEngine {
  return curriculumEngineDecision(input).engine;
}

/** Which switch decided the engine. The precedence below is the only statement of it. */
export type EngineBasis = 'NO_CONFIG' | 'STUDENT_ALLOWLIST' | 'STAGE_LIST' | 'TENANT_SWITCH' | 'NOT_ENABLED';

/**
 * The engine the switches select, and which switch selected it.
 *
 * PRECEDENCE, STATED ONCE: a named student, then a named stage, then the tenant switch, then
 * TOPIC. The lists are ALLOW-lists — they can only move somebody onto UNIT, never hold
 * somebody back — so "not in the list" means "decided by the next rule down", which is TOPIC
 * unless something below it says otherwise. `curriculumEngineFor` is this with the reason
 * dropped; nothing else may restate the order.
 */
export function curriculumEngineDecision(input: {
  config?: CurriculumEngineConfig | null;
  studentId?: string | null;
  stageKey?: string | null;
}): { engine: CurriculumEngine; basis: EngineBasis } {
  const cfg = input.config;
  if (!cfg) return { engine: DEFAULT_CURRICULUM_ENGINE, basis: 'NO_CONFIG' };

  const sid = input.studentId ? String(input.studentId) : '';
  if (sid && (cfg.megaCurriculumStudentIds || []).some(id => String(id) === sid)) {
    return { engine: 'UNIT', basis: 'STUDENT_ALLOWLIST' };
  }

  const stage = input.stageKey ? String(input.stageKey).toLowerCase() : '';
  if (stage && (cfg.megaCurriculumStages || []).some(s => String(s).toLowerCase() === stage)) {
    return { engine: 'UNIT', basis: 'STAGE_LIST' };
  }

  return cfg.megaCurriculumEnabled
    ? { engine: 'UNIT', basis: 'TENANT_SWITCH' }
    : { engine: DEFAULT_CURRICULUM_ENGINE, basis: 'NOT_ENABLED' };
}

/**
 * Whether anything at all has been switched over.
 *
 * For admin screens and reports that need to say "this tenant is still on topics" without
 * knowing about a particular student.
 */
export const megaCurriculumInUse = (cfg?: CurriculumEngineConfig | null): boolean =>
  !!cfg && (
    !!cfg.megaCurriculumEnabled
    || (cfg.megaCurriculumStudentIds || []).length > 0
    || (cfg.megaCurriculumStages || []).length > 0
  );

/* ------------------------------------------------------------------ *
 * Capability — what the unit engine can actually plan
 * ------------------------------------------------------------------ */

/**
 * Stages the UNIT engine CAN plan.
 *
 * A student routed to an engine that cannot serve them is a student with no plan, so capability
 * is part of the answer rather than a check each caller has to remember. A stage absent from
 * this list stays on TOPIC however the switches are set, and the config route refuses to accept
 * it in `megaCurriculumStages` at all.
 *
 * Build joined Foundation once Year 2 had what the engine needs: a Learning Unit curriculum
 * under `adaptiveStage: 'build'`, 296 published units, and a composer that never asked what
 * stage it was planning in the first place.
 *
 * CAPABLE IS NOT THE SAME AS COMPULSORY — see UNIT_MANDATORY_STAGES immediately below. This
 * list only makes a stage eligible to be switched on; it does not switch it on.
 */
/**
 * EVERY COLLEGE YEAR IS PLANNED THE SAME WAY.
 *
 * A third- or final-year used to fall through to the topic engine, which means the old roadmap:
 * a pathway template with mission pools, nothing to do with the curriculum they would be taught.
 * The product has one flow — a welcome, then a personalised plan of units — and a student does
 * not leave it by being a year older.
 *
 * A STAGE WITH NO CURRICULUM SAYS SO. Adding a stage here does not invent content for it: the
 * readiness check answers NOT_CONFIGURED and the screen tells the student their programme has
 * not been set up yet. That is the honest answer, and it is a far better one than quietly
 * serving a plan from a different product and letting them believe it is theirs.
 *
 * `job_seeker` is deliberately absent. It is not a year of a course — it is somebody who has
 * graduated and is in the market now — so it has no year-long programme to be planned into.
 */
export const UNIT_ENGINE_STAGES: readonly string[] = ['foundation', 'build', 'specialize', 'placement'];

export const unitEngineServesStage = (stageKey?: string | null): boolean =>
  !!stageKey && UNIT_ENGINE_STAGES.includes(String(stageKey).toLowerCase().trim());

/**
 * Stages that are on the UNIT engine whatever the switches say.
 *
 * ── WHY THIS IS A SECOND LIST AND NOT THE ONE ABOVE ───────────────────────────────────────
 *
 * It used to be one list, and the resolver read it as "unconditionally UNIT": the first branch
 * of effectiveCurriculumEngine returns UNIT on a match before any switch is consulted. That was
 * right while Foundation was the only member, because Foundation IS unconditional — every
 * first-year receives exactly ninety days, and a tenant that cannot serve that is told
 * NOT_CONFIGURED out loud rather than quietly handed the topic roadmap.
 *
 * Adding `build` to that same list would have carried the unconditional part with it: every
 * second-year on every tenant moved to the unit engine at once, and off the topic roadmap,
 * including tenants with no Year-2 content at all. A one-line change with a full-population
 * blast radius.
 *
 * So the two ideas are separated. Foundation keeps its guarantee. Build is capable, and reaches
 * the unit engine only where a tenant has opted in — by stage, by student, or by the tenant
 * switch — which is what the allow-lists in curriculumEngineDecision were always for.
 */
export const UNIT_MANDATORY_STAGES: readonly string[] = ['foundation'];

export const unitEngineIsMandatoryFor = (stageKey?: string | null): boolean =>
  !!stageKey && UNIT_MANDATORY_STAGES.includes(String(stageKey).toLowerCase().trim());

export interface EffectiveEngine {
  /** The engine that will actually plan this student. */
  engine: CurriculumEngine;
  /** What the switches alone selected, before capability. */
  requested: CurriculumEngine;
  basis: EngineBasis | 'NO_UNIT_CURRICULUM_FOR_STAGE' | 'FOUNDATION_PRODUCT';
  stageKey: string | null;
}

/**
 * The engine that serves this student.
 *
 * The one resolver production planning paths use (through curriculumEngineService).
 *
 * ── FOUNDATION IS THE UNIT ENGINE. ALWAYS. ────────────────────────────────────────────────
 *
 * A Foundation learner is planned by Learning Units whatever any tenant switch says. That is the
 * product: every first-year receives exactly ninety days. It used to be a per-tenant switch that
 * defaulted to TOPIC, so any tenant or database nobody had activated by hand gave its first-years
 * the topic roadmap — a 21- or 28-day plan presented as theirs. A tenant that cannot serve the
 * journey is now NOT_CONFIGURED, said out loud (see foundationReadinessService); it is never
 * quietly moved to the other engine.
 *
 * Every other stage has no Learning Unit curriculum, so the unit engine cannot plan it: those stay
 * TOPIC however the switches are set. The switches are still read for them, and still validated,
 * but today they cannot move anybody — capability decides first.
 */
export function effectiveCurriculumEngine(input: {
  config?: CurriculumEngineConfig | null;
  studentId?: string | null;
  stageKey?: string | null;
}): EffectiveEngine {
  const stageKey = input.stageKey ? String(input.stageKey).toLowerCase().trim() : null;
  if (unitEngineIsMandatoryFor(stageKey)) {
    return { engine: 'UNIT', requested: 'UNIT', basis: 'FOUNDATION_PRODUCT', stageKey };
  }
  const decision = curriculumEngineDecision(input);
  if (decision.engine === 'UNIT' && !unitEngineServesStage(stageKey)) {
    return { engine: DEFAULT_CURRICULUM_ENGINE, requested: 'UNIT', basis: 'NO_UNIT_CURRICULUM_FOR_STAGE', stageKey };
  }
  return { engine: decision.engine, requested: decision.engine, basis: decision.basis, stageKey };
}
