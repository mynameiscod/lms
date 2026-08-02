import { Request, Response } from 'express';
import User from '../models/User';
import PassportConfig from '../models/PassportConfig';
import PassportAttempt from '../models/PassportAttempt';
import PassportProgress from '../models/PassportProgress';
import { isEntitled } from '../services/passportEntitlementService';
import { missionsForDay, dayNumber, ensureContent, poolMapOf } from '../services/passportMissionService';
import { addXp } from '../services/passportXpService';

const tenantOf = (req: Request): string => String((req as any).user?.tenantId || (req as any).tenantId || '');
const userIdOf = (req: Request): string => String((req as any).user?.id || '');

async function ctx(req: Request) {
  const tenantId = tenantOf(req);
  const studentId = userIdOf(req);
  const [user, cfg, content] = await Promise.all([
    User.findById(studentId).select('passport firstName lastName').lean() as any,
    PassportConfig.findOne({ tenantId }).lean(),
    ensureContent(tenantId),
  ]);
  // Missions come from the tenant's admin-editable pools (PassportContent).
  return { tenantId, studentId, user, cfg, pools: poolMapOf(content.missionPools, { stage: user?.passport?.stage || null, background: user?.passport?.background || null }) };
}

/** Student: today's missions + streak/xp. Gated behind the `daily_missions` entitlement. */
export const getToday = async (req: Request, res: Response) => {
  try {
    const { tenantId, studentId, user, cfg, pools } = await ctx(req);
    if (!isEntitled(cfg?.entitlements as any, user?.passport, 'daily_missions')) {
      return res.json({ locked: true, priceInr: cfg?.priceInr ?? 499, reason: 'Membership required to unlock daily missions.' });
    }

    const attempt = await PassportAttempt.findOne({ tenantId, studentId }).sort({ createdAt: -1 }).lean() as any;
    if (!attempt) return res.json({ locked: false, needsAssessment: true });

    let progress = await PassportProgress.findOne({ tenantId, studentId });
    if (!progress) progress = await PassportProgress.create({ tenantId, studentId, startDate: user?.passport?.activatedAt || new Date() });

    const now = new Date();
    const day = dayNumber(progress.startDate, now);
    const missions = missionsForDay(attempt, day, pools);
    const doneKeys = new Set(progress.completed.filter(c => c.day === day).map(c => c.key));

    res.json({
      locked: false,
      day,
      streak: progress.streak,
      longestStreak: progress.longestStreak,
      xp: progress.xp,
      missions: missions.map(m => ({ ...m, done: doneKeys.has(m.key) })),
      allDone: missions.length > 0 && missions.every(m => doneKeys.has(m.key)),
    });
  } catch (e: any) { console.error('[passport] getToday:', e); res.status(500).json({ message: e.message || 'Failed to load missions' }); }
};

/** Student: mark one mission done → award XP + update streak. Idempotent per (day,key). */
export const completeMission = async (req: Request, res: Response) => {
  try {
    const { tenantId, studentId, user, cfg, pools } = await ctx(req);
    if (!isEntitled(cfg?.entitlements as any, user?.passport, 'daily_missions')) {
      return res.status(403).json({ message: 'Membership required.' });
    }
    const attempt = await PassportAttempt.findOne({ tenantId, studentId }).sort({ createdAt: -1 }).lean() as any;
    if (!attempt) return res.status(400).json({ message: 'Take the assessment first.' });

    let progress = await PassportProgress.findOne({ tenantId, studentId });
    if (!progress) progress = await PassportProgress.create({ tenantId, studentId, startDate: user?.passport?.activatedAt || new Date() });

    const now = new Date();
    const day = dayNumber(progress.startDate, now);
    const key = String(req.body?.key || '');
    const valid = missionsForDay(attempt, day, pools).find(m => m.key === key);
    if (!valid) return res.status(400).json({ message: 'Unknown mission.' });

    const already = progress.completed.some(c => c.day === day && c.key === key);
    if (!already) {
      progress.completed.push({ day, key, at: now });
      // addXp also writes the XP event log and bumps the streak once per calendar day.
      addXp(progress, valid.xp || 10, true, now, 'mission');
      await progress.save();
    }

    const doneKeys = new Set(progress.completed.filter(c => c.day === day).map(c => c.key));
    const missions = missionsForDay(attempt, day, pools);
    res.json({
      ok: true, xp: progress.xp, streak: progress.streak, longestStreak: progress.longestStreak,
      allDone: missions.every(m => doneKeys.has(m.key)),
    });
  } catch (e: any) { console.error('[passport] completeMission:', e); res.status(500).json({ message: e.message || 'Failed' }); }
};
