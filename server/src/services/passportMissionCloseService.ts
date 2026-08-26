import PassportProgress from '../models/PassportProgress';
import PassportAttempt from '../models/PassportAttempt';
import User from '../models/User';
import { ensureContent, poolMapOf, missionsForDay, dayNumber, ymd, clampSlots } from './passportMissionService';
import { memberAxes } from './careerStageService';
import { completeMissionOnce } from './passportXpService';
import { awardCoins } from './coinService';

/**
 * Close missions that the member has just PROVED, rather than asserted.
 *
 * The Practice Lab already does this inline: solve the problem and the mission that asked
 * for it ticks itself. The mock interview did not, so its mission could only be closed by
 * hand — which meant it could be closed WITHOUT the interview, and the XP, coins and
 * streak were all free.
 *
 * Extracted rather than written inline a second time: the two callers now share one
 * definition of "which of today's missions does this activity satisfy", so they cannot
 * drift apart, and a third activity (resume, assessment) can reuse it.
 */
export async function completeInterviewMissions(
  tenantId: string, studentId: string, now = new Date(),
): Promise<{ key: string; title: string }[]> {
  const [user, progress] = await Promise.all([
    User.findById(studentId).select('passport').lean() as any,
    PassportProgress.findOne({ tenantId, studentId }),
  ]);
  if (!progress) return [];

  const [attempt, content] = await Promise.all([
    PassportAttempt.findOne({ tenantId, studentId }).sort({ createdAt: -1 }).lean() as any,
    ensureContent(tenantId),
  ]);
  if (!attempt) return [];

  const day = dayNumber(progress.startDate, now);
  const pools = poolMapOf(content.missionPools, memberAxes(user));
  // Must match what the member was SHOWN, or a finished interview closes nothing.
  const todays = missionsForDay(attempt, day, pools, content.journeyDays || 90, undefined, clampSlots((content as any).missionsPerDay));

  // Keyed by mission KEY, not title: the dashboard path awards coins on the key, and a
  // title-based key here would let one mission pay twice — once down each route.
  const closed: { key: string; title: string }[] = [];
  for (const m of todays) {
    if (m.verify !== 'interview') continue;
    if (!completeMissionOnce(progress, day, m.key, m.xp, now)) continue;
    closed.push({ key: m.key, title: m.title });
  }
  if (!closed.length) return [];

  await progress.save();

  // Same keys the dashboard path uses, so a mission closed here and one ticked there can
  // never both pay for the same day.
  const today = ymd(now);
  for (const m of closed) {
    await awardCoins({
      tenantId, studentId, eventKey: 'mission_complete', note: m.title,
      idempotencyKey: `mission:${studentId}:${day}:${m.key}`,
    });
  }
  const doneKeys = new Set(progress.completed.filter(c => c.day === day).map(c => c.key));
  if (todays.every(m => doneKeys.has(m.key))) {
    await awardCoins({
      tenantId, studentId, eventKey: 'mission_all_done', note: 'All missions done',
      idempotencyKey: `missions_all:${studentId}:${today}`,
    });
  }
  return closed;
}
