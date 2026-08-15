import PassportProgress from '../models/PassportProgress';
import { DEFAULT_MISSION_XP } from './passportXpService';
import { ymd } from './passportMissionService';

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
 */

export interface CareerMissionTrace {
  roadmapId: string;
  objectiveSequence: number;
  skillKey: string;
  workType: string;
  /** The server's own figure for this slice — never a duration supplied by the caller. */
  minutes: number;
}

export interface CompletionResult {
  /** False when another request had already recorded this exact mission. */
  newlyCompleted: boolean;
  xp: number;
  streak: number;
  longestStreak: number;
}

/** How many XP-log entries the existing service keeps. Matched so the two agree. */
const XP_LOG_LIMIT = 400;

/**
 * Mark one mission complete, exactly once.
 *
 * The streak figures are computed from the document as read and applied in the same
 * conditional update. That is safe under a race for a reason worth stating: the calculation
 * depends only on `lastCompletedDate`, which changes at most once per day, so two concurrent
 * requests necessarily compute the same values — and only one of them writes anything.
 */
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
    // Somebody else inserted it between the check and the write. That is the outcome we
    // wanted anyway.
    if (e?.code !== 11000) throw e;
  });

  const doc: any = await PassportProgress.findOne({ tenantId, studentId })
    .select('xp streak longestStreak lastCompletedDate').lean();

  const today = ymd(now);
  const gain = DEFAULT_MISSION_XP;

  // Exactly the rule addXp applies, and applied only on the first completion of a day.
  const streakUpdate: Record<string, any> = {};
  if (doc && doc.lastCompletedDate !== today) {
    const yesterday = ymd(new Date(now.getTime() - 86400000));
    const streak = doc.lastCompletedDate === yesterday ? (doc.streak || 0) + 1 : 1;
    streakUpdate.streak = streak;
    streakUpdate.longestStreak = Math.max(doc.longestStreak || 0, streak);
    streakUpdate.lastCompletedDate = today;
  }

  /**
   * The claim.
   *
   * `completed.key: { $ne: key }` is both the idempotency guard and the concurrency guard.
   * MongoDB applies an update to a single document atomically, so of two simultaneous
   * requests only the first finds a document without the key; the second matches nothing and
   * awards nothing.
   */
  const res: any = await PassportProgress.updateOne(
    { tenantId, studentId, 'completed.key': { $ne: key } },
    {
      $push: {
        completed: { day: input.day, key, at: now, careerpilot: input.trace },
        xpLog: { $each: [{ at: now, amount: gain, source: 'mission' }], $slice: -XP_LOG_LIMIT },
      },
      $inc: { xp: gain },
      ...(Object.keys(streakUpdate).length ? { $set: streakUpdate } : {}),
    },
  );

  const newlyCompleted = (res?.modifiedCount ?? res?.nModified ?? 0) === 1;

  const after: any = await PassportProgress.findOne({ tenantId, studentId })
    .select('xp streak longestStreak').lean();

  return {
    newlyCompleted,
    xp: after?.xp || 0,
    streak: after?.streak || 0,
    longestStreak: after?.longestStreak || 0,
  };
}
