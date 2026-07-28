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
export function addXp(progress: IPassportProgress, amount: number, bumpStreak = true, now = new Date()) {
  progress.xp += Math.max(0, amount || 0);
  if (!bumpStreak) return;
  const today = ymd(now);
  if (progress.lastCompletedDate !== today) {
    const yesterday = ymd(new Date(now.getTime() - 86400000));
    progress.streak = progress.lastCompletedDate === yesterday ? progress.streak + 1 : 1;
    progress.longestStreak = Math.max(progress.longestStreak, progress.streak);
    progress.lastCompletedDate = today;
  }
}
