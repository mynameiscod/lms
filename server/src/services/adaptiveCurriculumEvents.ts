/**
 * The seam between "something happened" and "the plan should react".
 *
 * WHY NOT JUST CALL THE SERVICE. Because the alternative is what the brief warns against: quiz
 * controllers growing adaptive business logic. A controller that finishes a submission should
 * announce that fact and return; deciding whether a plan needs rebuilding is not its job, and
 * wiring it in directly means every new trigger edits every controller that could produce one.
 *
 * IN-PROCESS AND DELIBERATELY SMALL. No queue, no broker, no retries — this app is a single
 * Node process and a message bus would be infrastructure bought to solve a problem nobody has.
 * If handlers ever need durability, this module is the one place to change.
 *
 * A HANDLER MAY NEVER BREAK ITS PUBLISHER. Every handler runs inside its own catch, and publish
 * resolves whatever they do. A student who has just submitted work must not see an error because
 * a downstream listener failed — the submission is the thing that matters and it is already
 * saved by the time anything here runs.
 */

import { ReplanTrigger } from '../data/adaptiveCurriculumPolicy';
import { replanForTrigger } from './curriculumReplanningService';

export type AdaptiveEventName =
  | 'DIAGNOSTIC_COMPLETED'
  | 'MODULE_ASSESSMENT_COMPLETED'
  | 'PRACTICE_COMPLETED'
  | 'PROJECT_EVALUATED'
  | 'SKILL_MASTERY_CHANGED'
  | 'DIRECTION_CHANGED'
  | 'AVAILABILITY_CHANGED'
  | 'CURRICULUM_REPLAN_REQUIRED';

export interface AdaptiveEvent {
  name: AdaptiveEventName;
  tenantId: string;
  studentId: string;
  curriculumId?: string;
  assessmentId?: string;
  /** Skills whose scores moved, when the publisher knows them. */
  skillKeys?: string[];
  meta?: Record<string, any>;
}

type Handler = (e: AdaptiveEvent) => Promise<void> | void;

const handlers = new Map<AdaptiveEventName, Handler[]>();

export function on(name: AdaptiveEventName, handler: Handler): void {
  if (!handlers.has(name)) handlers.set(name, []);
  handlers.get(name)!.push(handler);
}

/**
 * Announce that something happened.
 *
 * Awaited rather than fired and forgotten, so a caller that wants to report the outcome can —
 * but every failure is swallowed per handler, so awaiting it can only cost time, never
 * correctness. Handlers run in sequence: they are few, and two of them replanning the same
 * student at once would race on the one-active-plan index.
 */
export async function publish(event: AdaptiveEvent): Promise<void> {
  const list = handlers.get(event.name) || [];
  for (const h of list) {
    try {
      await h(event);
    } catch (e: any) {
      console.error(`[adaptive] handler for ${event.name} failed:`, e?.message || e);
    }
  }
}

/** Which events map to which replan trigger. Events without one are observational. */
const TRIGGER_FOR: Partial<Record<AdaptiveEventName, ReplanTrigger>> = {
  DIAGNOSTIC_COMPLETED: 'DIAGNOSTIC_COMPLETED',
  MODULE_ASSESSMENT_COMPLETED: 'MODULE_ASSESSMENT_COMPLETED',
  PROJECT_EVALUATED: 'PROJECT_EVALUATED',
  SKILL_MASTERY_CHANGED: 'SIGNIFICANT_MASTERY_CHANGE',
  DIRECTION_CHANGED: 'DIRECTION_CHANGED',
  AVAILABILITY_CHANGED: 'AVAILABILITY_CHANGED',
  CURRICULUM_REPLAN_REQUIRED: 'SIGNIFICANT_MASTERY_CHANGE',
};

let wired = false;

/**
 * Connect the replanner to the events that concern it.
 *
 * Idempotent: called from app start-up, and calling it twice would otherwise register every
 * handler twice and replan each student once per registration.
 *
 * PRACTICE_COMPLETED is deliberately not wired. One practice question is not a reason to
 * rebuild a plan, and treating it as one is exactly the churn the design avoids.
 */
export function registerAdaptiveHandlers(): void {
  if (wired) return;
  wired = true;

  for (const [name, trigger] of Object.entries(TRIGGER_FOR) as [AdaptiveEventName, ReplanTrigger][]) {
    on(name, async (e) => {
      await replanForTrigger({
        tenantId: e.tenantId,
        studentId: e.studentId,
        curriculumId: e.curriculumId,
        trigger,
        assessmentId: e.assessmentId,
      });
    });
  }

  console.log('[adaptive] event handlers registered');
}

/** Test seam. Never called in production. */
export function __resetHandlers(): void {
  handlers.clear();
  wired = false;
}
