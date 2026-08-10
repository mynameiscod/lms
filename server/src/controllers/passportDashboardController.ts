import { Request, Response } from 'express';
import { memberAxes } from '../services/careerStageService';
import User from '../models/User';
import PassportConfig from '../models/PassportConfig';
import PassportAttempt from '../models/PassportAttempt';
import PassportProgress from '../models/PassportProgress';
import PassportInterview from '../models/PassportInterview';
import PassportResume from '../models/PassportResume';
import TechBattle from '../models/TechBattle';
import { membershipActive, entitlementMap } from '../services/passportEntitlementService';
import { ensureContent, poolMapOf, missionsForDay, dayNumber, ymd } from '../services/passportMissionService';
import { awardCoins, getAccount } from '../services/coinService';
import { getOrCreateProgress } from '../services/passportXpService';
import { buildRoadmap } from '../services/passportRoadmapService';
import { PRACTICE_BANK } from '../services/passportPracticeService';
import * as g from '../services/passportGamificationService';

const tenantOf = (req: Request): string => String((req as any).user?.tenantId || (req as any).tenantId || '');
const userIdOf = (req: Request): string => String((req as any).user?.id || '');

/**
 * GET /passport/dashboard — everything the gamified member home renders, in one call.
 *
 * Every figure traces back to stored data (assessment attempt, progress, interviews,
 * resume, tech battles). Where a member has no data yet the field is null and the UI
 * shows an empty state rather than a made-up number.
 */
export const getDashboard = async (req: Request, res: Response) => {
  try {
    const tenantId = tenantOf(req);
    const studentId = userIdOf(req);

    const [user, cfg, content] = await Promise.all([
      User.findById(studentId).select('passport firstName lastName').lean() as any,
      PassportConfig.findOne({ tenantId }).lean(),
      ensureContent(tenantId),
    ]);

    const active = membershipActive(user?.passport);
    const attempt = await PassportAttempt.findOne({ tenantId, studentId }).sort({ createdAt: -1 }).lean() as any;

    // Not a member, or hasn't taken the assessment → the client shows the landing /
    // unlock states instead of the dashboard.
    if (!active || !attempt) {
      return res.json({
        active,
        hasAssessment: !!attempt,
        careerScore: attempt?.careerScore ?? null,
        level: attempt?.level ?? null,
        priceInr: cfg?.priceInr ?? 499,
        entitled: entitlementMap(cfg?.entitlements as any, user?.passport),
      });
    }

    const progress = await getOrCreateProgress(tenantId, studentId, user?.passport?.activatedAt || new Date());
    const pools = poolMapOf(content.missionPools, memberAxes(user));
    const now = new Date();
    const day = dayNumber(progress.startDate, now);
    const totalDays = content.journeyDays || 90;

    // Today's missions + completion state
    const todaysMissions = missionsForDay(attempt, day, pools, totalDays);
    // Carry the saved answer back so a completed reflective mission shows what the
    // member wrote, rather than just a tick they cannot review.
    const todayDone = new Map(progress.completed.filter(c => c.day === day).map(c => [c.key, c]));
    const missions = todaysMissions.map(m => ({
      ...m,
      done: todayDone.has(m.key),
      answer: todayDone.get(m.key)?.answer || undefined,
      feedback: todayDone.get(m.key)?.feedback || undefined,
    }));
    const targetXp = todaysMissions.reduce((s, m) => s + (m.xp || 0), 0);

    // Roadmap — used for the journey stepper and the completed-days figure
    const completedKeys = new Set(progress.completed.map(c => c.key));
    const roadmap = buildRoadmap({
      attempt, pools, pathways: content.pathways,
      totalDays, startDate: progress.startDate, currentDay: day, completedKeys,
    });

    // Interviews + resume
    const [interviews, resume] = await Promise.all([
      PassportInterview.find({ tenantId, studentId, status: 'completed' }).select('evaluation completedAt role').lean(),
      PassportResume.findOne({ tenantId, studentId }).select('score').lean() as any,
    ]);
    const bestInterview = interviews.reduce<number | null>(
      (best, i: any) => Math.max(best ?? 0, i?.evaluation?.overallScore ?? 0) || null, null);

    // Practice
    const codingIds = new Set(PRACTICE_BANK.filter(p => p.kind === 'coding').map(p => p.id));
    const solved = progress.solvedProblems || [];
    const codingSolved = solved.filter(id => codingIds.has(id)).length;

    // Leaderboard — this tenant's Passport members by XP (top 3 + where I sit)
    const board = await PassportProgress.find({ tenantId })
      .select('studentId xp').sort({ xp: -1 }).limit(200).lean();
    const boardIds = board.map(b => b.studentId);
    const boardUsers = await User.find({ _id: { $in: boardIds } }).select('firstName lastName').lean();
    const nameOf = new Map(boardUsers.map((u: any) => [String(u._id), `${u.firstName || ''} ${u.lastName || ''}`.trim() || 'Member']));
    const ranked = board.map((b, i) => ({
      rank: i + 1,
      name: nameOf.get(String(b.studentId)) || 'Member',
      xp: b.xp,
      me: String(b.studentId) === studentId,
    }));
    // Top 3 only, plus the member's own row when they are not in it. A longer
    // board mostly showed strangers; what a member acts on is the podium and
    // their own standing. `rank` is the TRUE position within the whole cohort,
    // so the client can render the jump (1,2,3 … 27) honestly rather than
    // implying the person sitting below third place is fourth.
    const myRow = ranked.find(r => r.me);
    const leaderboard = ranked.slice(0, 3);
    if (myRow && !leaderboard.some(r => r.me)) leaderboard.push(myRow);

    // Upcoming Tech Battles (a real, separate CodeBegun product — surfaced, not faked)
    const contests = await TechBattle.find({ tenantId, status: 'live', startAt: { $gt: now } })
      .select('title prize startAt slug').sort({ startAt: 1 }).limit(3).lean();

    const level = g.levelFromXp(progress.xp);
    const score = g.coderScore({
      careerScore: attempt.careerScore ?? null,
      solvedCount: solved.length,
      totalProblems: PRACTICE_BANK.length,
      completedDays: roadmap.completedDays,
      totalDays,
      interviewsCompleted: interviews.length,
      bestInterviewScore: bestInterview,
      resumeScore: resume?.score?.total ?? null,
    });

    res.json({
      active: true,
      hasAssessment: true,
      name: `${user?.firstName || ''} ${user?.lastName || ''}`.trim(),
      firstName: user?.firstName || '',

      level,
      coderScore: score,
      percentileAhead: g.percentileAhead(progress.xp, board.map(b => b.xp)),

      // Skill radar — the 6 assessment categories, exactly
      skills: (attempt.categoryScores || []).map((c: any) => ({ key: c.key, label: c.label, score: c.score })),
      careerScore: attempt.careerScore,
      careerLevel: attempt.level,
      pathwayLabel: attempt.pathwayLabel,

      stats: {
        solved: solved.length,
        solvedToday: g.solvedToday(progress, now),
        totalProblems: PRACTICE_BANK.length,
        accuracy: g.accuracy(progress),
        streak: progress.streak,
        longestStreak: progress.longestStreak,
        xp: progress.xp,
        day, totalDays,
        completedDays: roadmap.completedDays,
        interviews: interviews.length,
        bestInterview,
        resumeScore: resume?.score?.total ?? null,
        cohortRank: ranked.find(r => r.me)?.rank ?? null,
        cohortSize: ranked.length,
      },
      weekly: g.weeklyStats(progress, now),
      recentActivity: g.recentActivity(progress, 6, now),

      missions,
      allDone: missions.length > 0 && missions.every(m => m.done),
      dailyGoal: g.dailyGoal(progress, targetXp, now),
      streakWeek: g.streakWeek(progress, now),
      activity: g.activitySeries(progress, 7, now),

      badges: g.badges({
        solvedCount: solved.length,
        codingSolved,
        totalCoding: codingIds.size,
        streak: progress.streak,
        longestStreak: progress.longestStreak,
        completedDays: roadmap.completedDays,
        interviewsCompleted: interviews.length,
        resumeScore: resume?.score?.total ?? null,
        careerScore: attempt.careerScore ?? null,
      }),

      journey: roadmap.phases.map(p => ({
        key: p.key, label: p.label, fromDay: p.fromDay, toDay: p.toDay,
        done: day > p.toDay,
        current: day >= p.fromDay && day <= p.toDay,
      })),

      leaderboard,
      contests: contests.map((c: any) => ({
        id: String(c._id), title: c.title, prize: c.prize || null,
        startAt: c.startAt, slug: c.slug || null,
      })),

      // Opening the dashboard IS the daily visit — there is no separate login event to
      // hook, and a member who never opens this screen has not shown up in any sense
      // worth paying for. Keyed on the calendar day, so refreshing costs nothing.
      coins: await (async () => {
        try {
          await awardCoins({
            tenantId, studentId, eventKey: 'daily_login',
            idempotencyKey: `login:${studentId}:${ymd(new Date())}`,
            note: 'Daily visit',
          });
          const acct = await getAccount(tenantId, studentId);
          return { balance: acct.balance, lifetimeEarned: acct.lifetimeEarned };
        } catch {
          // The dashboard is the member's home screen. It renders with or without coins.
          return null;
        }
      })(),

      shareSlug: user?.passport?.shareSlug || null,
      passwordSet: !!user?.passport?.passwordSet,
      entitled: entitlementMap(cfg?.entitlements as any, user?.passport),
    });
  } catch (e: any) {
    console.error('[passport] getDashboard:', e);
    res.status(500).json({ message: e.message || 'Failed to load dashboard' });
  }
};
