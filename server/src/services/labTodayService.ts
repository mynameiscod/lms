import { Request, Response } from 'express';
import mongoose from 'mongoose';
import User from '../models/User';
import StudentGameStats from '../models/StudentGameStats';
import CommunicationStreak from '../models/CommunicationStreak';
import CommunicationAttempt from '../models/CommunicationAttempt';
import { ThinkingAnswer } from '../models/ThinkingDay';
import { XpLedger } from '../models/GamificationModels';
import { labStreakToday } from '../data/labStreakPolicy';
import { labDailySettingsFor, today } from './thinkingDailyService';
import { labDayXp } from './labRewardService';

/**
 * GET /careerpilot/labs/today — both labs for a member today, for the "Daily practice" card on My N Days
 * and the goal on the Communication Lab: how many of the day's questions / tasks are done, the streaks,
 * freezes, and whether today's XP has been earned.
 */
export const labsToday = async (req: Request, res: Response) => {
  try {
    const tenantId = String((req as any).tenantId || (req as any).user?.tenantId || '');
    const studentId = String((req as any).user?.id || '');
    const sid = new mongoose.Types.ObjectId(studentId);
    const date = today();
    const u: any = await User.findById(studentId).select('passport.stage').lean();
    const stage = String(u?.passport?.stage || 'foundation');
    const ThinkingDay = (await import('../models/ThinkingDay')).default;
    const [settings, gs, cs, day, commDone, paid, thinkXp, commXp]: any = await Promise.all([
      labDailySettingsFor(tenantId),
      StudentGameStats.findOne({ tenantId, studentId }).select('currentStreak lastSolvedDate freezes').lean(),
      CommunicationStreak.findOne({ tenantId, studentId: sid }).select('currentStreak lastCompletedDate freezes').lean(),
      ThinkingDay.findOne({ tenantId, studentId: sid, date }).select('items').lean(),
      CommunicationAttempt.countDocuments({ tenantId, studentId: sid, practiceDate: date, status: 'completed' }),
      XpLedger.find({ tenantId, studentId: sid, sourceId: date, eventKey: { $in: ['THINKING_LAB_DAILY_COMPLETED', 'COMMUNICATION_DAILY_COMPLETED'] } }).select('eventKey amount').lean(),
      labDayXp(tenantId, 'thinking'),
      labDayXp(tenantId, 'communication'),
    ]);
    const ids = (day?.items || []).map((i: any) => i.questionId);
    const thinkDone = ids.length ? await ThinkingAnswer.countDocuments({ tenantId, studentId: sid, questionId: { $in: ids }, finished: true }) : 0;
    const paidOf = (k: string) => (paid as any[]).find((p) => p.eventKey === k)?.amount || 0;
    const t = labStreakToday({ current: gs?.currentStreak || 0, longest: 0, lastDate: gs?.lastSolvedDate, freezes: gs?.freezes || 0 }, date);
    const c = labStreakToday({ current: cs?.currentStreak || 0, longest: 0, lastDate: cs?.lastCompletedDate, freezes: cs?.freezes || 0 }, date);
    const thinkTarget = settings.thinking[stage]?.perDay || 1;
    const commTarget = settings.communication[stage]?.perDay || 1;
    res.json({
      date,
      thinking: { target: thinkTarget, done: Math.min(thinkDone, thinkTarget), streak: t.current, atRisk: t.atRisk, freezes: gs?.freezes || 0, dayXp: thinkXp, earned: paidOf('THINKING_LAB_DAILY_COMPLETED') },
      communication: { target: commTarget, done: Math.min(commDone, commTarget), streak: c.current, atRisk: c.atRisk, freezes: cs?.freezes || 0, dayXp: commXp, earned: paidOf('COMMUNICATION_DAILY_COMPLETED') },
    });
  } catch (e: any) {
    console.error('[labs] today:', e?.message || e);
    res.status(500).json({ message: 'Could not load today’s practice.' });
  }
};
