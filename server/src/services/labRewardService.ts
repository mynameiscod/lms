import { GamificationConfig } from '../models/GamificationModels';
import { processGamificationEvent, recordActiveDay, resolveRule } from './gamificationEngine';
import { LabStreakSettings, labStreakSettings } from '../data/labStreakPolicy';

/**
 * What a CareerPilot member earns in the Thinking Lab and the Communication Lab.
 *
 * No XP of their own: the labs pay through the same engine and ledger as daily missions, priced by
 * the admin in XP & Rewards (THINKING_LAB_DAILY_COMPLETED, COMMUNICATION_DAILY_COMPLETED). One award
 * a day — the source is the day, so the first completion pays and later ones find it paid. Every
 * completion still counts as showing up for the main Day streak, paid or not.
 */

export type Lab = 'thinking' | 'communication';

const EVENT: Record<Lab, string> = {
  thinking: 'THINKING_LAB_DAILY_COMPLETED',
  communication: 'COMMUNICATION_DAILY_COMPLETED',
};

export interface LabDayAward {
  /** XP paid now. 0 when the day was already paid, the activity is switched off, or nothing was earned. */
  awarded: number;
  /** The full amount the day's question pays, so a screen can say "12 of 20 XP". */
  fullXp: number;
  alreadyPaid: boolean;
  /** The main Day streak after this. */
  dayStreak: number;
  streakBonus?: number;
}

/** The tenant's freeze numbers. */
export async function labStreakSettingsFor(tenantId: string): Promise<LabStreakSettings> {
  const cfg: any = await GamificationConfig.findOne({ tenantId }).select('labStreak').lean();
  return labStreakSettings(cfg?.labStreak);
}

/** What the day's question pays in full, or 0 when the admin has switched it off. */
export async function labDayXp(tenantId: string, lab: Lab): Promise<number> {
  const rule: any = await resolveRule(tenantId, EVENT[lab]);
  return rule?.enabled ? Math.max(0, rule.xp || 0) : 0;
}

/**
 * The member completed something in a lab on `day` ('YYYY-MM-DD').
 *
 * `share` is how much of the day's XP it earned, from 0 to 1 (a partly right answer earns part).
 * Never throws: a reward that fails must not fail the submission it rewards.
 */
export async function awardLabDay(opts: {
  tenantId: string; studentId: string; lab: Lab; day: string; share?: number; ref?: string; now?: Date;
}): Promise<LabDayAward> {
  const now = opts.now || new Date();
  const share = Math.min(1, Math.max(0, Number.isFinite(opts.share as number) ? Number(opts.share) : 1));
  try {
    const fullXp = await labDayXp(opts.tenantId, opts.lab);
    const amount = Math.round(fullXp * share);
    let awarded = 0;
    let alreadyPaid = false;
    let dayStreak = 0;
    let streakBonus: number | undefined;
    if (amount > 0) {
      const r = await processGamificationEvent({
        tenantId: opts.tenantId, studentId: opts.studentId, eventKey: EVENT[opts.lab],
        sourceType: opts.lab, sourceId: opts.day, xpOverride: amount,
        metadata: { share, ...(opts.ref ? { ref: opts.ref } : {}) }, now,
      });
      awarded = r.awarded;
      alreadyPaid = r.refused === 'duplicate';
      dayStreak = r.streak;
      streakBonus = r.streakBonus;
    }
    // Not paid (nothing earned, already paid today, or switched off): the day still counts.
    if (!awarded) {
      const d = await recordActiveDay(opts.tenantId, opts.studentId, now);
      dayStreak = d.streak;
      streakBonus = streakBonus ?? d.streakBonus;
    }
    return { awarded, fullXp, alreadyPaid, dayStreak, streakBonus };
  } catch (e: any) {
    console.error(`[labs] ${opts.lab} award failed:`, e?.message || e);
    return { awarded: 0, fullXp: 0, alreadyPaid: false, dayStreak: 0 };
  }
}
