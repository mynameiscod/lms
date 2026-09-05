import PassportProgress from '../models/PassportProgress';
import { recordStepCompletion } from './conceptLearningResolverService';

/**
 * Recording a CareerPilot daily mission as done — atomically.
 *
 * WHY THIS EXISTS RATHER THAN completeMissionOnce.
 * That helper guards against a repeat by scanning an in-memory array, which is correct for
 * one request at a time and useless against two. Its callers do read → mutate → save, so
 * two simultaneous requests both load a document with no completion, both push one, and
 * both save: two completion records, two XP awards, and the same roadmap minutes credited
 * twice. A double-clicked button on a slow connection is enough to hit it.
 *
 * The fix is to let the DATABASE decide the winner. The guard and the write are one
 * conditional update, so exactly one of any number of concurrent requests matches a document
 * that does not already contain the key — and the losers modify nothing at all.
 *
 * WHY THE LEGACY HELPER IS UNTOUCHED. Its callers are the existing daily missions, and
 * changing shared behaviour to fix a CareerPilot bug would put every member's streak and XP
 * at risk for no benefit. It keeps its semantics; this is a sibling, and the two write the
 * same shapes to the same collection.
 *
 * WHAT IT DOES NOT DO. It writes no evidence and touches no skill profile. Completing a
 * task is not proof of a skill, and there is deliberately no path from here to Module 7.
 *
 * IT NO LONGER AWARDS XP EITHER. Module 11 moved every CareerPilot award behind the
 * gamification engine so the amount is configurable, ledgered and auditable in one place.
 * This claims the completion and credits the roadmap; the caller then raises the event and
 * the engine decides what it is worth. Both halves are independently idempotent, so a retry
 * repeats neither.
 */

export interface CareerMissionTrace {
  roadmapId: string;
  objectiveSequence: number;
  skillKey: string;
  workType: string;
  /** The server's own figure for this slice — never a duration supplied by the caller. */
  minutes: number;
  /**
   * Where in an authored journey this mission came from, when it came from one.
   *
   * Recorded rather than inferred. Working out afterwards which step a completed mission
   * corresponded to would mean re-running the resolver against a student whose progress has
   * since moved — and matching on a title string, which is how a rename silently breaks
   * somebody's sequence. Absent for legacy missions, which is most of them.
   */
  learningUnitId?: string;
  learningUnitVersion?: number;
  learningStepId?: string;
  resourceId?: string;
}

export interface CompletionResult {
  /** False when another request had already recorded this exact mission. */
  newlyCompleted: boolean;
}

export async function completeCareerMission(input: {
  tenantId: string;
  studentId: string;
  /** Roadmap day, for the completion record. Not part of the identity. */
  day: number;
  /** The stable business identity. Deterministic per (roadmap, objective, date). */
  key: string;
  trace: CareerMissionTrace;
  startDate?: Date;
  now?: Date;
}): Promise<CompletionResult> {
  const now = input.now || new Date();
  const { tenantId, studentId, key } = input;

  // A member reaching their plan before any other CareerPilot activity may have no progress
  // document yet. Upsert rather than create, so two first-time requests cannot race into a
  // duplicate-key error on the unique (tenantId, studentId) index.
  await PassportProgress.updateOne(
    { tenantId, studentId },
    { $setOnInsert: { startDate: input.startDate || now } },
    { upsert: true },
  ).catch((e: any) => {
    if (e?.code !== 11000) throw e;
  });

  /**
   * The claim.
   *
   * `completed.key: { $ne: key }` is both the idempotency guard and the concurrency guard.
   * MongoDB applies an update to a single document atomically, so of two simultaneous
   * requests only the first finds a document without the key; the second matches nothing and
   * credits nothing.
   */
  const res: any = await PassportProgress.updateOne(
    { tenantId, studentId, 'completed.key': { $ne: key } },
    { $push: { completed: { day: input.day, key, at: now, careerpilot: input.trace } } },
  );

  const newlyCompleted = (res?.modifiedCount ?? res?.nModified ?? 0) === 1;

  /**
   * Advance the learning journey, but only for a completion that actually happened.
   *
   * Guarded on `newlyCompleted` so a retried request cannot push the student a second step
   * forward — the progress writer is idempotent on its own, but a mission that was already
   * finished should not touch anything at all.
   *
   * Never fatal. The mission is recorded, the minutes are credited and the XP is paid before
   * this runs; a journey that failed to advance is repaired by the next completion, whereas
   * throwing here would lose a completion the student had genuinely earned.
   */
  const t = input.trace;
  if (newlyCompleted && t.learningUnitId && t.learningStepId) {
    try {
      await recordStepCompletion({
        tenantId, studentId, skillKey: t.skillKey,
        learningUnitId: t.learningUnitId,
        learningUnitVersion: t.learningUnitVersion || 1,
        stepId: t.learningStepId,
        missionKey: key,
        resourceId: t.resourceId,
        creditedMinutes: t.minutes,
        now,
      });
    } catch (e: any) {
      console.error('[concept-learning] step completion failed', key, e?.message || e);
    }
  }

  return { newlyCompleted };
}
