import HackathonExamAttempt, { IAttemptAnswer } from '../models/HackathonExamAttempt';

/**
 * The only supported way to write one element of an attempt's `answers` array.
 *
 * ── WHY THIS EXISTS ────────────────────────────────────────────────────────────────────────
 *
 * On 22 September 137 of 291 attempts ended up with two or more answer records for the same
 * question, and 135 of those pairs disagreed with each other. Grading reads the first match,
 * so four candidates were marked wrong on questions they had in fact answered.
 *
 * The cause was two write paths that could not see each other. `saveAnswer` did a guarded,
 * atomic upsert straight against the database. `runCode` did the opposite: it loaded the
 * attempt, looked for an answer element in the in-memory array, pushed one when it did not
 * find it, and then called `attempt.save()` to write the whole document back. Interleave them
 * and both create the element — the atomic one in the database, the in-memory one in a copy
 * that was loaded before it existed — and the full-document save puts a second copy back.
 *
 * A unique index cannot prevent this. MongoDB's unique constraint is across documents; within
 * a single document's array it de-duplicates keys before checking, so two identical
 * `answers.itemId` values in one attempt do not violate it. The fix has to be at the write.
 *
 * So: no caller pushes to the array and no caller calls `attempt.save()` to persist an answer.
 * Everything goes through here, and every write is a single atomic operation against one array
 * element.
 */

export interface AnswerWrite {
  /** Fields to overwrite, unprefixed: `{ code: '...' }` becomes `answers.$.code`. */
  set?: Record<string, unknown>;
  /** Counters to advance atomically, unprefixed: `{ runCount: 1 }`. */
  inc?: Record<string, number>;
}

function prefix(obj: Record<string, unknown> | undefined): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj || {})) out[`answers.$.${k}`] = v;
  return out;
}

/**
 * Create-or-update the answer for one drawn question and return it as stored.
 *
 * The returned element is re-read from the database rather than assembled locally, because
 * callers make decisions on it — the run throttle reads `runCount`, and a value that is one
 * behind hands out a free run to anyone who clicks twice.
 *
 * Returns `undefined` only if the attempt itself has gone, which a caller should treat as the
 * attempt being deleted mid-request rather than as an empty answer.
 */
export async function writeAnswer(
  attemptId: unknown,
  drawn: { itemId: unknown; sectionKey: string },
  ops: AnswerWrite,
): Promise<IAttemptAnswer | undefined> {
  const update: Record<string, unknown> = {};
  const set = prefix(ops.set);
  const inc = prefix(ops.inc);
  if (Object.keys(set).length) update.$set = set;
  if (Object.keys(inc).length) update.$inc = inc;
  if (!Object.keys(update).length) return readAnswer(attemptId, drawn.itemId);

  /* The common case by a wide margin: the element already exists, one round trip. */
  const hit = await HackathonExamAttempt.updateOne(
    { _id: attemptId, 'answers.itemId': drawn.itemId },
    update,
  );

  if (!hit.matchedCount) {
    /*
     * First write for this question. The guard `answers.itemId: { $ne }` is what makes two
     * simultaneous first-writes produce one element instead of two: the loser matches nothing
     * and does nothing. Initial counter values are folded into the pushed element, because
     * $inc on a field that does not exist yet would start from zero and lose this increment.
     */
    await HackathonExamAttempt.updateOne(
      { _id: attemptId, 'answers.itemId': { $ne: drawn.itemId } },
      {
        $push: {
          answers: {
            itemId: drawn.itemId,
            sectionKey: drawn.sectionKey,
            runCount: 0,
            graded: false,
            ...(ops.set || {}),
            ...(ops.inc || {}),
          } as never,
        },
      },
    );

    /*
     * If the guard lost that race the element exists but carries the winner's values, not
     * ours, so apply them. Re-running $inc here would double-count, so only $set is replayed;
     * losing one increment to a genuine simultaneous first run is the safe direction to err.
     */
    if (Object.keys(set).length) {
      await HackathonExamAttempt.updateOne(
        { _id: attemptId, 'answers.itemId': drawn.itemId },
        { $set: set },
      );
    }
  }

  return readAnswer(attemptId, drawn.itemId);
}

/** Read back a single answer element without pulling the whole paper into memory. */
export async function readAnswer(
  attemptId: unknown,
  itemId: unknown,
): Promise<IAttemptAnswer | undefined> {
  const doc = await HackathonExamAttempt.findOne(
    { _id: attemptId },
    { answers: { $elemMatch: { itemId } } },
  ).lean() as { answers?: IAttemptAnswer[] } | null;
  return doc?.answers?.[0];
}

/**
 * Collapse duplicate answer records down to one per question, best evidence first.
 *
 * Read-side repair for the attempts already damaged on 22 September, and a permanent backstop
 * for anything that slips past the write path. "Best" is the record a human would pick if you
 * showed them both: one that actually contains work beats an empty shell, and among records
 * that both contain work the most recently answered one wins, because that is the candidate's
 * final intent.
 *
 * Order within the array is otherwise preserved, so a deduped paper still reads in draw order.
 */
export function dedupeAnswers<T extends IAttemptAnswer>(answers: T[]): T[] {
  const best = new Map<string, T>();
  const order: string[] = [];

  for (const a of answers || []) {
    const key = String(a.itemId);
    const prev = best.get(key);
    if (!prev) {
      best.set(key, a);
      order.push(key);
      continue;
    }
    if (scoreEvidence(a) > scoreEvidence(prev)) best.set(key, a);
  }

  return order.map(k => best.get(k) as T);
}

/** How much a candidate would mind losing this record. Higher wins. */
function scoreEvidence(a: IAttemptAnswer): number {
  const hasWork =
    (a.selectedOptionIds && a.selectedOptionIds.length > 0) ||
    (a.code && a.code.trim().length > 0) ||
    (a.text && a.text.trim().length > 0);

  // A record with work always beats one without, whatever the timestamps say.
  const base = hasWork ? 1e15 : 0;
  const when = a.answeredAt ? new Date(a.answeredAt).getTime() : 0;
  const runs = a.runCount || 0;
  return base + when + runs;
}

/** True if this attempt carries more than one record for any question. */
export function hasDuplicateAnswers(answers: IAttemptAnswer[]): boolean {
  const seen = new Set<string>();
  for (const a of answers || []) {
    const key = String(a.itemId);
    if (seen.has(key)) return true;
    seen.add(key);
  }
  return false;
}
