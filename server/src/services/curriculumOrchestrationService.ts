/**
 * Where a curriculum trigger is routed to the engine that plans the student.
 *
 * ── ONE DECISION, AT THE SEAM THAT ALREADY EXISTED ────────────────────────────────────────
 *
 * The adaptive events — a diagnostic landed, a checkpoint recorded evidence, a direction changed
 * — were wired straight to the TOPIC replanner. They still are, for every student the engine
 * resolver puts on TOPIC: that call is made with exactly the input it always received. A student
 * on UNIT goes to the Foundation journey instead. The engine is resolved once per trigger by
 * curriculumEngineService; nothing here restates which switch wins.
 *
 * ── ONE TRIGGER AT A TIME PER STUDENT ─────────────────────────────────────────────────────
 *
 * A checkpoint and a direction change can land together. Two recompositions of one journey in
 * parallel would each read the same days and interleave their writes, so triggers for the same
 * student run in sequence within the process. Across processes the database indexes are the
 * guarantee: one journey per student and stage, one day per number, one enrollment per journey.
 */

import { ReplanTrigger } from '../data/adaptiveCurriculumPolicy';
import { replanForTrigger, ReplanOutcome } from './curriculumReplanningService';
import { resolveCurriculumEngine, EngineResolution } from './curriculumEngineService';
import { applyFoundationTrigger, FoundationTriggerOutcome } from './foundationJourneyTriggerService';

/** Where a trigger came from, when that changes how a TOPIC learner is treated. */
export type TriggerOrigin = 'CAREER_CONTEXT';

export interface CurriculumTriggerInput {
  tenantId: string;
  studentId: string;
  curriculumId?: string;
  trigger: ReplanTrigger;
  assessmentId?: string;
  origin?: TriggerOrigin | string;
}

export type CurriculumTriggerOutcome =
  | { engine: 'TOPIC'; resolution: EngineResolution; topic: ReplanOutcome | null; skipped?: string }
  | { engine: 'UNIT'; resolution: EngineResolution; unit: FoundationTriggerOutcome }
  | { engine: 'UNRESOLVED'; reason: string };

const inFlight = new Map<string, Promise<unknown>>();

function serialised<T>(key: string, work: () => Promise<T>): Promise<T> {
  const previous = inFlight.get(key) || Promise.resolve();
  const next = previous.catch(() => undefined).then(work);
  const tail = next.catch(() => undefined);
  inFlight.set(key, tail);
  tail.then(() => { if (inFlight.get(key) === tail) inFlight.delete(key); });
  return next;
}

/**
 * Route one trigger. Never throws.
 *
 * If the engine cannot be resolved — the configuration could not be read — nothing is planned by
 * either engine. Falling back to TOPIC there would rebuild a TOPIC plan for a student who may be
 * on UNIT, and the next successful trigger would have two plans to reconcile.
 */
export function handleCurriculumTrigger(input: CurriculumTriggerInput): Promise<CurriculumTriggerOutcome> {
  return serialised(`${input.tenantId}:${input.studentId}`, async (): Promise<CurriculumTriggerOutcome> => {
    let resolution: EngineResolution;
    try {
      resolution = await resolveCurriculumEngine({ tenantId: input.tenantId, studentId: input.studentId });
    } catch (e: any) {
      console.error('[curriculum-engine] could not resolve the engine:', e?.message || e);
      return { engine: 'UNRESOLVED', reason: e?.message || 'engine resolution failed' };
    }

    if (resolution.engine === 'UNIT') {
      const unit = await applyFoundationTrigger({
        tenantId: input.tenantId,
        studentId: input.studentId,
        trigger: input.trigger,
        stageKey: resolution.stageKey || 'foundation',
      });
      console.log(`[curriculum-engine] ${input.trigger} for ${input.studentId} → UNIT ${unit.action}`
        + `${unit.reason && unit.reason !== input.trigger ? ` (${unit.reason})` : ''}`);
      return { engine: 'UNIT', resolution, unit };
    }

    /**
     * TOPIC learners are served exactly as before this seam existed — including where nothing
     * happened before.
     *
     * DIRECTION_CHANGED was never published by a career-context save until the unit engine needed
     * it. The TOPIC replanner would treat it as an automatic rebuild, which would be a new
     * behaviour for every TOPIC learner who edits their role. So that one origin is not delivered
     * to TOPIC; every event TOPIC already received still is, unchanged.
     */
    if (input.trigger === 'DIRECTION_CHANGED' && input.origin === 'CAREER_CONTEXT') {
      return {
        engine: 'TOPIC', resolution, topic: null,
        skipped: 'a career-context direction change does not replan a TOPIC plan',
      };
    }

    const { origin: _origin, ...topicInput } = input;
    const topic = await replanForTrigger(topicInput);
    return { engine: 'TOPIC', resolution, topic };
  });
}
