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
  const cfg = input.config;
  if (!cfg) return DEFAULT_CURRICULUM_ENGINE;

  const sid = input.studentId ? String(input.studentId) : '';
  if (sid && (cfg.megaCurriculumStudentIds || []).some(id => String(id) === sid)) return 'UNIT';

  const stage = input.stageKey ? String(input.stageKey).toLowerCase() : '';
  if (stage && (cfg.megaCurriculumStages || []).some(s => String(s).toLowerCase() === stage)) {
    return 'UNIT';
  }

  return cfg.megaCurriculumEnabled ? 'UNIT' : DEFAULT_CURRICULUM_ENGINE;
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
