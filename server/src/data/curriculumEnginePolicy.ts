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

/**
 * Which of the two authorised states a tenant's switches are in — for gates, not for planning.
 *
 * OFF is the state before activation. FOUNDATION_UNIT is the one activation that was certified:
 * the Foundation stage on units, nothing switched tenant-wide and no named accounts. Anything else
 * — a tenant switch, an allow-list, another stage listed — is UNAUTHORIZED, so a gate that accepts
 * the activation still refuses every other way of turning the engine on.
 */
export type EngineActivationState = 'OFF' | 'FOUNDATION_UNIT' | 'UNAUTHORIZED';

export function engineActivationState(configs: (CurriculumEngineConfig | null | undefined)[]): EngineActivationState {
  const inUse = configs.filter(c => megaCurriculumInUse(c)) as CurriculumEngineConfig[];
  if (!inUse.length) return 'OFF';
  const authorised = inUse.every(c => !c.megaCurriculumEnabled
    && !(c.megaCurriculumStudentIds || []).length
    && JSON.stringify((c.megaCurriculumStages || []).map(s => String(s).toLowerCase().trim())) === JSON.stringify([...UNIT_ENGINE_STAGES]));
  return authorised ? 'FOUNDATION_UNIT' : 'UNAUTHORIZED';
}

/* ------------------------------------------------------------------ *
 * Capability — what the unit engine can actually plan
 * ------------------------------------------------------------------ */

/**
 * Stages the UNIT engine can plan.
 *
 * Only Foundation has a Learning Unit curriculum, a composer and a ninety-day journey. A later
 * stage switched onto UNIT would have nothing to plan from, so it stays on TOPIC however the
 * switches are set. The capability is part of the answer rather than a check each caller has to
 * remember — a student routed to an engine that cannot serve them is a student with no plan.
 */
export const UNIT_ENGINE_STAGES: readonly string[] = ['foundation'];

export const unitEngineServesStage = (stageKey?: string | null): boolean =>
  !!stageKey && UNIT_ENGINE_STAGES.includes(String(stageKey).toLowerCase().trim());

export interface EffectiveEngine {
  /** The engine that will actually plan this student. */
  engine: CurriculumEngine;
  /** What the switches alone selected, before capability. */
  requested: CurriculumEngine;
  basis: EngineBasis | 'NO_UNIT_CURRICULUM_FOR_STAGE';
  stageKey: string | null;
}

/**
 * The engine that serves this student — the switches, then capability.
 *
 * The one resolver production planning paths use (through curriculumEngineService, which only
 * loads the config). TOPIC stays the answer whenever UNIT is not both selected and possible.
 */
export function effectiveCurriculumEngine(input: {
  config?: CurriculumEngineConfig | null;
  studentId?: string | null;
  stageKey?: string | null;
}): EffectiveEngine {
  const decision = curriculumEngineDecision(input);
  const stageKey = input.stageKey ? String(input.stageKey).toLowerCase().trim() : null;
  if (decision.engine === 'UNIT' && !unitEngineServesStage(stageKey)) {
    return { engine: DEFAULT_CURRICULUM_ENGINE, requested: 'UNIT', basis: 'NO_UNIT_CURRICULUM_FOR_STAGE', stageKey };
  }
  return { engine: decision.engine, requested: decision.engine, basis: decision.basis, stageKey };
}
