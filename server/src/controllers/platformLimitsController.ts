import { Request, Response } from 'express';
import PlatformLimits, { PLATFORM_LIMITS_KEY } from '../models/PlatformLimits';
import { labDailySettings, LAB_YEARS, PER_DAY_MAX, PRACTICE_PER_DAY_MAX } from '../data/thinkingDailyPolicy';

/**
 * CareerPilot Limits — the super admin's one set of limits for every institute.
 *
 * This screen holds the Thinking Lab day and how long a left-open interview stays resumable. The mock
 * interview plans (rounds, questions, minutes, interviews per 30 days, cooldown) are on the same screen
 * but saved through /platform/interview-plans, which reuses the plan editor.
 */

export const STALE_HOURS_DEFAULT = 6;
export const STALE_HOURS_BOUNDS = { min: 1, max: 72 };

const staleHoursOf = (v: any): number => {
  const n = Number(v);
  return Number.isInteger(n) && n >= STALE_HOURS_BOUNDS.min && n <= STALE_HOURS_BOUNDS.max ? n : STALE_HOURS_DEFAULT;
};

/** Hours an interview left open stays resumable before it is closed (and graded, if answered). */
export async function interviewStaleHours(): Promise<number> {
  const doc: any = await PlatformLimits.findOne({ key: PLATFORM_LIMITS_KEY }).select('interviewStaleHours').lean();
  return staleHoursOf(doc?.interviewStaleHours);
}

const view = (doc: any) => ({
  thinking: labDailySettings({ thinking: doc?.thinking }).thinking,
  thinkingSaved: !!doc?.thinking,
  interviewStaleHours: staleHoursOf(doc?.interviewStaleHours),
  years: LAB_YEARS,
  bounds: { perDayMax: PER_DAY_MAX, practicePerDayMax: PRACTICE_PER_DAY_MAX, staleHours: STALE_HOURS_BOUNDS },
  updatedAt: doc?.updatedAt || null,
});

/** GET /passport/platform/limits */
export const getLimits = async (_req: Request, res: Response) => {
  try {
    res.json(view(await PlatformLimits.findOne({ key: PLATFORM_LIMITS_KEY }).lean()));
  } catch (e: any) {
    res.status(500).json({ message: e.message || 'Could not load the limits' });
  }
};

/** PUT /passport/platform/limits  { thinking: { year: { perDay, codingPerDay, practicePerDay } }, interviewStaleHours } */
export const updateLimits = async (req: Request, res: Response) => {
  try {
    const set: any = { updatedBy: String((req as any).user?.id || '') };
    if (req.body?.thinking) set.thinking = labDailySettings({ thinking: req.body.thinking }).thinking;
    if (req.body?.interviewStaleHours !== undefined) set.interviewStaleHours = staleHoursOf(req.body.interviewStaleHours);
    const doc = await PlatformLimits.findOneAndUpdate(
      { key: PLATFORM_LIMITS_KEY }, { $set: set, $setOnInsert: { key: PLATFORM_LIMITS_KEY } }, { new: true, upsert: true },
    ).lean();
    res.json(view(doc));
  } catch (e: any) {
    console.error('[passport] platform limits:', e);
    res.status(500).json({ message: e.message || 'Could not save the limits' });
  }
};
