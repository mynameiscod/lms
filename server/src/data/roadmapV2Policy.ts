/**
 * Roadmap V2 — who is on it, and the two numbers it plans with.
 *
 * WHAT V2 IS. A roadmap that fits the days the admin set, at a daily load a college student can
 * actually carry. A student joining Year 2, 3 or 4 is given a bridge of the earlier years'
 * important topics first, then their year — all inside the admin's days. Topics that do not fit
 * are left out by priority (topicPriorityPolicy), never at random, and a MUST topic never is.
 *
 * OFF BY DEFAULT, AND OFF CHANGES NOTHING. Every V2 code path asks `roadmapV2For` first; with the
 * switch off for a learner, the planner behaves exactly as it did before V2 existed. That is what
 * lets this branch merge while it is still being built, and lets a tenant pilot it on named
 * students before anyone else sees it.
 *
 * Pure: no database, so the rules here are tested directly.
 */

/** The daily study load a V2 roadmap plans for when the admin has not set one: 2.5 hours. */
export const DEFAULT_DAILY_MINUTES = 150;
/** Bounds on the daily load. Below an hour a day nothing gets finished; above five is not a student's day. */
export const MIN_DAILY_MINUTES = 60;
export const MAX_DAILY_MINUTES = 300;

/** Revision days an existing member gets before their next year starts, when the admin has not set it. */
export const DEFAULT_REVISION_DAYS = 7;
export const MIN_REVISION_DAYS = 0;
export const MAX_REVISION_DAYS = 30;

/** The stages V2 can plan: the four college years. */
export const ROADMAP_V2_STAGES: readonly string[] = ['foundation', 'build', 'specialize', 'placement'];

export interface RoadmapV2Config {
  /** On for every learner of the tenant. */
  enabled: boolean;
  /** On for learners in these stages only (used to roll out a year at a time). */
  stages: string[];
  /** On for these named learners only (the pilot). Read first. */
  studentIds: string[];
  /** The daily study load a roadmap is planned for, in minutes. */
  dailyMinutes: number;
  /** Revision days for an existing member moving up a year. */
  revisionDays: number;
}

export const DEFAULT_ROADMAP_V2: Readonly<RoadmapV2Config> = Object.freeze({
  enabled: false,
  stages: [],
  studentIds: [],
  dailyMinutes: DEFAULT_DAILY_MINUTES,
  revisionDays: DEFAULT_REVISION_DAYS,
});

const clampInt = (v: unknown, min: number, max: number, fallback: number): number => {
  const n = Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.round(n)));
};

/**
 * The stored setting, made whole. Anything missing or out of range falls back to the default,
 * so a tenant that has never opened the V2 screen reads as OFF with the shipped numbers.
 */
export function resolveRoadmapV2(raw: Partial<RoadmapV2Config> | null | undefined): RoadmapV2Config {
  const r = raw || {};
  const stages = Array.isArray(r.stages)
    ? [...new Set(r.stages.map(s => String(s).toLowerCase().trim()).filter(s => ROADMAP_V2_STAGES.includes(s)))]
    : [];
  const studentIds = Array.isArray(r.studentIds)
    ? [...new Set(r.studentIds.map(s => String(s).trim()).filter(Boolean))]
    : [];
  return {
    enabled: r.enabled === true,
    stages,
    studentIds,
    dailyMinutes: clampInt(r.dailyMinutes, MIN_DAILY_MINUTES, MAX_DAILY_MINUTES, DEFAULT_DAILY_MINUTES),
    revisionDays: clampInt(r.revisionDays, MIN_REVISION_DAYS, MAX_REVISION_DAYS, DEFAULT_REVISION_DAYS),
  };
}

/**
 * Is this learner, in this stage, planned by V2?
 *
 * Same precedence as the curriculum engine switch: a named student first (the pilot), then the
 * stage list (rollout by year), then the tenant switch. Only the four college years can be on V2;
 * a graduate or a learner with no stage never is.
 */
export function roadmapV2For(
  raw: Partial<RoadmapV2Config> | null | undefined,
  studentId: string | null | undefined,
  stageKey: string | null | undefined,
): boolean {
  const stage = String(stageKey || '').toLowerCase().trim();
  if (!ROADMAP_V2_STAGES.includes(stage)) return false;
  const cfg = resolveRoadmapV2(raw);
  if (studentId && cfg.studentIds.includes(String(studentId))) return true;
  if (cfg.stages.includes(stage)) return true;
  return cfg.enabled;
}

/**
 * Check an admin's change before it is stored. Refused rather than clamped: an admin who typed
 * 600 minutes meant something, and silently storing 300 would have them believe a plan they did
 * not choose. Returns the cleaned value, or the reasons it was refused.
 */
export function validateRoadmapV2Patch(
  patch: unknown,
): { ok: true; value: RoadmapV2Config } | { ok: false; errors: string[] } {
  if (!patch || typeof patch !== 'object' || Array.isArray(patch)) {
    return { ok: false, errors: ['roadmapV2 must be an object.'] };
  }
  const p = patch as Record<string, unknown>;
  const errors: string[] = [];
  if (p.enabled !== undefined && typeof p.enabled !== 'boolean') errors.push('roadmapV2.enabled must be true or false.');
  if (p.stages !== undefined) {
    if (!Array.isArray(p.stages)) errors.push('roadmapV2.stages must be a list of stages.');
    else for (const s of p.stages) {
      if (!ROADMAP_V2_STAGES.includes(String(s).toLowerCase().trim())) errors.push(`"${s}" is not a college year V2 can plan.`);
    }
  }
  if (p.studentIds !== undefined && !Array.isArray(p.studentIds)) errors.push('roadmapV2.studentIds must be a list.');
  const inRange = (key: string, min: number, max: number, label: string) => {
    if (p[key] === undefined) return;
    const n = Number(p[key]);
    if (!Number.isInteger(n) || n < min || n > max) errors.push(`${label} must be a whole number from ${min} to ${max}.`);
  };
  inRange('dailyMinutes', MIN_DAILY_MINUTES, MAX_DAILY_MINUTES, 'Daily study time (minutes)');
  inRange('revisionDays', MIN_REVISION_DAYS, MAX_REVISION_DAYS, 'Revision days');
  if (errors.length) return { ok: false, errors };
  return { ok: true, value: resolveRoadmapV2(p as Partial<RoadmapV2Config>) };
}

/** The study budget a roadmap of `days` holds at the tenant's daily load, in minutes. */
export const budgetMinutes = (days: number, dailyMinutes: number): number =>
  Math.max(0, Math.round(days)) * Math.max(0, Math.round(dailyMinutes));
