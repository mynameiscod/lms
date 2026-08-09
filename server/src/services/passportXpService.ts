// Shared progress/XP helpers for the paid Passport surfaces (missions, practice,
// interviews, resume). Everything a member earns lands on the SAME PassportProgress
// doc, so streak + XP stay one number across the whole product.

import PassportProgress, { IPassportProgress } from '../models/PassportProgress';
import { ymd } from './passportMissionService';

export async function getOrCreateProgress(
  tenantId: string, studentId: string, startDate?: Date | null,
): Promise<IPassportProgress> {
  let progress = await PassportProgress.findOne({ tenantId, studentId });
  if (!progress) {
    progress = await PassportProgress.create({ tenantId, studentId, startDate: startDate || new Date() });
  }
  return progress;
}

/**
 * Add XP and (optionally) count today as an active day for the streak. `bumpStreak`
 * is idempotent per calendar day, so practice + missions on the same day don't
 * double-count.
 */
export function addXp(
  progress: IPassportProgress,
  amount: number,
  bumpStreak = true,
  now = new Date(),
  source = 'other',
) {
  const gain = Math.max(0, amount || 0);
  progress.xp += gain;
  if (gain > 0) {
    if (!progress.xpLog) progress.xpLog = [] as any;
    progress.xpLog.push({ at: now, amount: gain, source });
    if (progress.xpLog.length > 400) progress.xpLog = progress.xpLog.slice(-400);
  }
  if (!bumpStreak) return;
  const today = ymd(now);
  if (progress.lastCompletedDate !== today) {
    const yesterday = ymd(new Date(now.getTime() - 86400000));
    progress.streak = progress.lastCompletedDate === yesterday ? progress.streak + 1 : 1;
    progress.longestStreak = Math.max(progress.longestStreak, progress.streak);
    progress.lastCompletedDate = today;
  }
}

/**
 * Record a mission as done exactly once, awarding its XP and bumping the streak.
 * Returns true when it was newly completed, false when it already was.
 *
 * Extracted because completion now has TWO callers: the member ticking it, and the
 * Practice Lab completing it automatically when the linked problem is solved. Leaving
 * the logic inline in the controller would have meant a second copy of the
 * already-completed guard, and a mission that awarded XP twice the first time someone
 * solved a problem and then also ticked the box.
 */
export function completeMissionOnce(
  progress: IPassportProgress,
  day: number,
  key: string,
  xp: number,
  now = new Date(),
  answer?: string,
): boolean {
  if (progress.completed.some(c => c.day === day && c.key === key)) return false;
  progress.completed.push({ day, key, at: now, ...(answer ? { answer } : {}) });
  addXp(progress, xp || 10, true, now, 'mission');
  return true;
}
