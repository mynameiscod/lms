import { DirectionKey, isDirectionKey, CAREER_DIRECTIONS } from './careerDirectionPolicy';

/**
 * When a direction stops being a preference and becomes the thing the year IS.
 *
 * ── WHY THIS IS SEPARATE FROM DirectionStatus ─────────────────────────────────────────────
 *
 * careerDirectionPolicy states, deliberately and at length, that SELECTED "is not a commitment
 * and must never be treated as one". That is right for Years 1 and 2, where a direction filters
 * enrichment and a first-year saying "I think backend" must stay free to change their mind
 * without the product having quietly decided their career.
 *
 * Year 3 is a different product. The specialization is most of what a third-year is there for —
 * six topics, a track of their own and a project — and it cannot be composed at all until the
 * direction is known. The product owner was explicit that role-related courses are compulsory.
 *
 * So this does NOT redefine SELECTED. Changing what that word means would reach back into every
 * first- and second-year plan that has ever used it, to serve a rule that only applies to a year
 * those students are not in. A commitment is its own thing, scoped to the stages that require
 * one, and Years 1 and 2 are untouched by every line here.
 *
 * ── CHOSEN AT PURCHASE, CHANGEABLE UNTIL STAGE 2 ──────────────────────────────────────────
 *
 * A student picks when they buy, so the whole plan is direction-aware from day one rather than
 * generic for a third of the year. It stays changeable through Stage 1 and is confirmed at
 * S11_DIRECTION, which is the module written for exactly that decision.
 *
 * After that it locks, because by then the plan has been composed around it and the projects
 * have started. Changing it later is not a preference change; it is a different year, and the
 * honest answer is a conversation rather than a silent recomposition that discards work.
 */

/** Stages where a plan cannot be composed without a direction. */
export const DIRECTION_REQUIRED_STAGES: readonly string[] = ['specialize'];

/**
 * The module at which the choice is confirmed and locked.
 *
 * Named rather than numbered so the map can be reordered without this drifting: the lock
 * belongs to the discovery module wherever it sits.
 */
export const DIRECTION_LOCK_MODULE = 'S11_DIRECTION';

export const directionRequiredFor = (stageKey?: string | null): boolean =>
  DIRECTION_REQUIRED_STAGES.includes(String(stageKey || '').toLowerCase().trim());

export interface DirectionCommitment {
  /** The direction the plan is built around. */
  direction: DirectionKey;
  /** Whether it may still be changed. False once Stage 2 has been reached. */
  changeable: boolean;
}

export type CommitmentRefusal =
  | 'NOT_REQUIRED'        // this stage does not need one
  | 'NO_DIRECTION'        // nothing chosen yet, and the stage cannot plan without it
  | 'UNKNOWN_DIRECTION'   // a key that is not one of ours
  | 'LOCKED';             // chosen, started, and past the point where changing is free

/**
 * What this student's direction is for a stage, or why there is no answer.
 *
 * Returns a refusal rather than a null so the caller can say something useful: "choose a
 * direction to see your plan" and "your direction is locked in" are different sentences, and a
 * screen that cannot tell them apart says neither.
 */
export function commitmentFor(input: {
  stageKey?: string | null;
  /** What the student has chosen, from their passport. */
  selectedDirection?: string | null;
  /** Whether their plan has reached the module that confirms it. */
  reachedLockModule?: boolean;
}): { ok: true; commitment: DirectionCommitment } | { ok: false; refusal: CommitmentRefusal } {
  if (!directionRequiredFor(input.stageKey)) return { ok: false, refusal: 'NOT_REQUIRED' };

  const raw = String(input.selectedDirection || '').toUpperCase().trim();
  if (!raw) return { ok: false, refusal: 'NO_DIRECTION' };
  if (!isDirectionKey(raw)) return { ok: false, refusal: 'UNKNOWN_DIRECTION' };

  return {
    ok: true,
    commitment: { direction: raw as DirectionKey, changeable: !input.reachedLockModule },
  };
}

/**
 * Whether a student may change their direction right now.
 *
 * Kept as its own question because the answer is asked at a different moment from the one above
 * — a screen offering the change needs it before anybody has picked anything new.
 */
export function mayChangeDirection(input: {
  stageKey?: string | null;
  reachedLockModule?: boolean;
}): boolean {
  if (!directionRequiredFor(input.stageKey)) return true;
  return !input.reachedLockModule;
}

/** The directions a student may pick from, for a picker that must not invent one. */
export const choosableDirections = () =>
  CAREER_DIRECTIONS.map(d => ({ key: d.key, name: d.name, blurb: d.blurb }));
