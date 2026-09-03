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
import { ensureContent, poolMapOf, dayNumber, ymd, clampSlots } from '../services/passportMissionService';
import { awardCoins, getAccount } from '../services/coinService';
import { getOrCreateProgress } from '../services/passportXpService';
import { buildRoadmap } from '../services/passportRoadmapService';
import { PRACTICE_BANK } from '../services/passportPracticeService';
import { getTodaysPlan, toMemberMissions } from '../services/dailyMissionOrchestrator';
import * as g from '../services/passportGamificationService';

const tenantOf = (req: Request): string => String((req as any).user?.tenantId || (req as any).tenantId || '');
const userIdOf = (req: Request): string => String((req as any).user?.id || '');

/** GET /passport/leaderboard — the full board, not the podium. */
export const getLeaderboard = async (req: Request, res: Response) => {
  try {
    const tenantId = tenantOf(req);
    const studentId = userIdOf(req);
    const limit = Math.min(200, Math.max(10, Number(req.query.limit) || 50));

    const board = await PassportProgress.find({ tenantId })
      .select('studentId xp streak').sort({ xp: -1 }).limit(500).lean();
    const users = await User.find({ _id: { $in: board.map((b: any) => b.studentId) } })
      .select('firstName lastName passport.city').lean();
    const byId = new Map(users.map((u: any) => [String(u._id), u]));

    const ranked = board.map((b: any, i: number) => {
      const u: any = byId.get(String(b.studentId));
      return {
        rank: i + 1,
        name: u ? `${u.firstName || ''} ${u.lastName || ''}`.trim() || 'Member' : 'Member',
        city: u?.passport?.city || '',
        xp: b.xp, streak: b.streak || 0,
        me: String(b.studentId) === studentId,
      };
    });

    const mine = ranked.find(r => r.me) || null;
    res.json({
      total: ranked.length,
      rows: ranked.slice(0, limit),
      me: mine,
      percentile: mine && ranked.length > 1
        ? Math.max(1, Math.round((mine.rank / ranked.length) * 100))
        : null,
    });
  } catch (e: any) {
    console.error('[passport] leaderboard:', e);
    res.status(500).json({ message: e.message || 'Could not load the leaderboard' });
  }
};

/**
 * GET /passport/dashboard — everything the gamified member home renders, in one call.
 *
 * Daily work has ONE source of truth: the active CareerRoadmap through getTodaysPlan().
 * The legacy pool roadmap is retained here only for the older journey/coder-score widgets
 * until those widgets are migrated; it never decides what the student should do today.
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

    // SINGLE DAILY-MISSION SOURCE. The dedicated /me/plan/today endpoint calls this same
    // service, so Home and the plan API can no longer disagree about today's work.
    const dailyPlan = await getTodaysPlan(tenantId, studentId, now);
    // Mapped by the orchestrator, not here. Home and /missions/today rendered the same plan
    // through two copies of this block; a field added to one was missing from the other, and
    // the two views of a single day could disagree with nothing to explain why.
    const missions = toMemberMissions(dailyPlan);
    const targetXp = missions.reduce((s, m) => s + (m.xp || 0), 0);

    // Legacy journey remains visual-only during Phase 1. It no longer supplies daily work.
    const completedKeys = new Set(progress.completed.map(c => c.key));
    const roadmap = buildRoadmap({
      attempt, pools, pathways: content.pathways,
      totalDays, startDate: progress.startDate, currentDay: day, completedKeys,
      slotsPerDay: clampSlots((content as any)?.missionsPerDay),
    });

    const [interviews, resume] = await Promise.all([
      PassportInterview.find({ tenantId, studentId, status: 'completed' }).select('evaluation completedAt role').lean(),
      PassportResume.findOne({ tenantId, studentId }).select('score').lean() as any,
    ]);
    const bestInterview = interviews.reduce<number | null>(
      (best, i: any) => Math.max(best ?? 0, i?.evaluation?.overallScore ?? 0) || null, null);

    const codingIds = new Set(PRACTICE_BANK.filter(p => p.kind === 'coding').map(p => p.id));
    const solved = progress.solvedProblems || [];
    const codingSolved = solved.filter(id => codingIds.has(id)).length;

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
    const myRow = ranked.find(r => r.me);
    const leaderboard = ranked.slice(0, 3);
    if (myRow && !leaderboard.some(r => r.me)) leaderboard.push(myRow);

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
        day: dailyPlan.available ? dailyPlan.roadmapDay : day,
        totalDays: dailyPlan.available ? Math.max(1, dailyPlan.weekCount * 7) : totalDays,
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
      dailyPlan,
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

      day: dailyPlan.available ? dailyPlan.roadmapDay : day,

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
