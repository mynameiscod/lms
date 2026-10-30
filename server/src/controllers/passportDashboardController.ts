import { Request, Response } from 'express';
import { memberAxes } from '../services/careerStageService';
import User from '../models/User';
import PassportConfig from '../models/PassportConfig';
import PassportProgress from '../models/PassportProgress';
import PassportInterview from '../models/PassportInterview';
import PassportResume from '../models/PassportResume';
import TechBattle from '../models/TechBattle';
import { membershipActive, entitlementMap } from '../services/passportEntitlementService';
import { lockedSections, lockedSectionViews } from '../data/memberAccessPolicy';
import { hiddenCareerPilotFeatures } from '../services/careerPilotFeatureService';
import { ensureContent, poolMapOf, dayNumber, ymd, clampSlots } from '../services/passportMissionService';
import { liveStreak } from '../services/passportXpService';
import { awardCoins, getAccount } from '../services/coinService';
import { getOrCreateProgress } from '../services/passportXpService';
import { buildRoadmap } from '../services/passportRoadmapService';
import { memberLibraryStats } from '../services/problemLibraryService';
import { getTodaysPlan, toMemberMissions } from '../services/dailyMissionOrchestrator';
import PassportAssessment, { categoriesOf } from '../models/PassportAssessment';
import { resolveAssessedState } from '../services/memberAssessmentStateService';
import * as g from '../services/passportGamificationService';
import { journeyDayGoal, journeyCompletion } from '../services/foundationJourneyXpService';
import { calculateStudentRoleReadiness } from '../services/roleReadinessService';
import { skillDnaByArea } from '../services/skillDnaService';
import { programDaysFor } from '../services/foundationProgramLengthService';
import { membershipPriceFor } from '../services/membershipPricingService';

const tenantOf = (req: Request): string => String((req as any).user?.tenantId || (req as any).tenantId || '');
const userIdOf = (req: Request): string => String((req as any).user?.id || '');

/** GET /passport/leaderboard — the full board, not the podium. */
export const getLeaderboard = async (req: Request, res: Response) => {
  try {
    const tenantId = tenantOf(req);
    const studentId = userIdOf(req);
    const limit = Math.min(200, Math.max(10, Number(req.query.limit) || 50));

    const board = await PassportProgress.find({ tenantId })
      .select('studentId xp streak lastCompletedDate').sort({ xp: -1 }).limit(500).lean();
    const users = await User.find({ _id: { $in: board.map((b: any) => b.studentId) } })
      .select('firstName lastName passport.city').lean();
    const byId = new Map(users.map((u: any) => [String(u._id), u]));

    const ranked = board.map((b: any, i: number) => {
      const u: any = byId.get(String(b.studentId));
      return {
        rank: i + 1,
        name: u ? `${u.firstName || ''} ${u.lastName || ''}`.trim() || 'Member' : 'Member',
        city: u?.passport?.city || '',
        xp: b.xp, streak: liveStreak(b),
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

    /**
     * ASKED ABOUT THE MEMBER, NOT ABOUT A COLLECTION.
     *
     * This looked for a PassportAttempt, which ONLY the legacy Career Readiness
     * questionnaire creates. A member who sat the personalised skill assessment has a
     * PersonalizedAssessment and a Skill DNA profile instead — so `attempt` was null,
     * `hasAssessment` came back false, and Home rendered Mission Control telling them to
     * "Start Skill Assessment": the one thing they had already finished.
     *
     * Worse, `!attempt` short-circuited before the plan was ever built, so the same member
     * also saw no missions, 0 XP and a 0-day streak — three symptoms, one wrong question.
     *
     * memberAssessmentStateService was written for exactly this and already fixed the
     * roadmap and the missions endpoint; this controller was simply never moved onto it. It
     * returns the real attempt when one exists, so every existing member is unaffected, and
     * a synthesised one shaped identically when the measurement came from Skill DNA.
     */
    const assessedState = await resolveAssessedState({
      tenantId,
      studentId,
      passport: user?.passport,
      categories: categoriesOf(await PassportAssessment.findOne({ tenantId }).lean() as any),
    });
    const attempt = assessedState.attempt as any;

    const entitled = entitlementMap(cfg?.entitlements as any, user?.passport);
    const lockedKeys = lockedSections(entitled);
    const locked = lockedSectionViews(entitled);

    /**
     * Not measured yet. There is nothing to show and one thing to do, so this stays the short
     * answer it always was — a dashboard full of locks would bury the assessment under nine
     * things they cannot use until they have taken it.
     */
    /**
     * `contextCompletedAt` is the honest marker for onboarding, exactly as /passport/me reads
     * it. Sent on every branch because the home screen has to know whether "take your
     * assessment" should go to the paper or finish setup first — it used to get this from a
     * second endpoint, and only Mission Control called that one.
     */
    const setupCompleted = !!user?.passport?.contextCompletedAt;

    if (!assessedState.assessed) {
      return res.json({
        active,
        hasAssessment: false,
        setupCompleted,
        careerScore: assessedState.careerScore,
        level: assessedState.level,
        name: `${user?.firstName || ''} ${user?.lastName || ''}`.trim(),
        firstName: user?.firstName || '',
        skills: [],
        /**
         * THE PRICE AND THE LENGTH FOLLOW THE LEARNER'S STAGE, ON THIS BRANCH TOO.
         *
         * This is the response a NON-MEMBER gets, which makes it the one place the price has
         * to be right: it is what the unlock button quotes. Reading the tenant's single
         * `priceInr` offered a second-year their 110-day Build membership at 499 and then
         * charged them 1999 at checkout, because the checkout already resolved by stage.
         *
         * `programDays` and `stage` travel for the same reason: without them the navigation
         * falls back to "My 90 Days" for a learner whose plan is 110.
         */
        priceInr: await membershipPriceFor(tenantId, user?.passport?.stage),
        programDays: await programDaysFor(tenantId, user?.passport?.stage),
        stage: user?.passport?.stage || null,
        shareSlug: user?.passport?.shareSlug || null,
        passwordSet: !!user?.passport?.passwordSet,
        entitled,
        locked,
        hidden: await hiddenCareerPilotFeatures(tenantId),
      });
    }

    /**
     * MEASURED, BUT NOT A MEMBER — the real dashboard, minus what membership pays for.
     *
     * This used to return the same six fields as the not-measured case, which is why the
     * client sent these students to a paywall screen instead: there was nothing to render. A
     * paywall as the first thing they see asks them to buy before they have seen anything, and
     * it hides the work they already did.
     *
     * So their own numbers come back — the score, the skills, the pathway, all of it the
     * result of a paper THEY sat — and everything membership buys is named in `locked` for the
     * client to draw a lock over. The zeroed structures below exist so the dashboard's panels
     * still have a shape to lay out behind those locks; none of their values is ever displayed,
     * because every panel they belong to is in `locked`.
     */
    if (!active) {
      const scoreVisible = !lockedKeys.includes('score');
      return res.json({
        active: false,
        hasAssessment: true,
        setupCompleted,
        name: `${user?.firstName || ''} ${user?.lastName || ''}`.trim(),
        firstName: user?.firstName || '',

        careerScore: scoreVisible ? assessedState.careerScore : null,
        careerLevel: scoreVisible ? assessedState.level : null,
        level: assessedState.level,
        pathwayLabel: scoreVisible ? (attempt?.pathwayLabel ?? null) : null,
        skills: scoreVisible
          ? (attempt?.categoryScores || []).map((c: any) => ({ key: c.key, label: c.label, score: c.score }))
          : [],

        // Shape without substance, for the panels a lock is drawn over.
        stats: null,
        missions: [],
        dailyPlan: { available: false, reason: 'MEMBERSHIP_REQUIRED', message: 'A CareerPilot membership is needed for your daily plan.' },
        journey: [],
        badges: [],
        leaderboard: [],

        /**
         * THE PRICE AND THE LENGTH FOLLOW THE LEARNER'S STAGE, ON THIS BRANCH TOO.
         *
         * This is the response a NON-MEMBER gets, which makes it the one place the price has
         * to be right: it is what the unlock button quotes. Reading the tenant's single
         * `priceInr` offered a second-year their 110-day Build membership at 499 and then
         * charged them 1999 at checkout, because the checkout already resolved by stage.
         *
         * `programDays` and `stage` travel for the same reason: without them the navigation
         * falls back to "My 90 Days" for a learner whose plan is 110.
         */
        priceInr: await membershipPriceFor(tenantId, user?.passport?.stage),
        programDays: await programDaysFor(tenantId, user?.passport?.stage),
        stage: user?.passport?.stage || null,
        shareSlug: user?.passport?.shareSlug || null,
        passwordSet: !!user?.passport?.passwordSet,
        entitled,
        locked,
        hidden: await hiddenCareerPilotFeatures(tenantId),
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
    // A Foundation member's goal is their journey day — its tasks and bonus, and the XP paid for those (see the service).
    const journeyGoal = await journeyDayGoal(tenantId, studentId);

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
    // Best evaluated interview, 0–100. A real 0 stays 0; only "no evaluated interview" is null.
    const interviewScores = interviews.map((i: any) => i?.evaluation?.overallScore).filter((n: any) => typeof n === 'number' && Number.isFinite(n));
    const bestInterview = interviewScores.length ? Math.max(...interviewScores) : null;

    // Practice now comes from the Problem Bank. The old built-in exercises a member solved before
    // that still count: they are kept in solvedProblems and simply added.
    const library = await memberLibraryStats(tenantId, studentId);
    const legacySolved = (progress.solvedProblems || []).length;
    const solvedCount = library.solved + legacySolved;

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
    /*
     * THE ASSESSMENT PART reads the current readiness-based Career Score (careerScoreService, written
     * when at least 40% of the role is measured). Below that, the whole-role readiness — the same
     * ratios with every unmeasured skill counted as 0 — so a member who sat the paper is neither
     * scored 0 nor flattered by the few skills measured so far. A legacy questionnaire score is the
     * last resort, for members who only ever had one.
     */
    const passportScore = user?.passport?.careerScoreSource === 'role_readiness' && typeof user?.passport?.careerScore === 'number'
      ? user.passport.careerScore : null;
    let assessmentScore: number | null = passportScore;
    if (assessmentScore === null && assessedState.source === 'skill_dna') {
      const r: any = await calculateStudentRoleReadiness(tenantId, studentId).catch(() => null);
      if (r?.available) assessmentScore = r.wholeRoleReadiness;
    }
    if (assessmentScore === null && assessedState.source === 'attempt') assessmentScore = attempt.careerScore ?? null;
    // THE MISSIONS PART is the member's journey: days completed of the journey's days. The retired
    // mission roadmap is used only by a member who has no journey.
    const journey = await journeyCompletion(tenantId, studentId);
    const score = g.coderScore({
      careerScore: assessmentScore,
      solvedCount,
      totalProblems: g.PRACTICE_TARGET,
      completedDays: journey ? journey.completedDays : roadmap.completedDays,
      totalDays: journey ? journey.totalDays : totalDays,
      interviewsCompleted: interviews.length,
      bestInterviewScore: bestInterview,
      resumeScore: resume?.score?.total ?? null,
    });

    const dnaAreas = await skillDnaByArea(tenantId, studentId).catch(() => []);

    res.json({
      active: true,
      hasAssessment: true,
      setupCompleted,
      /**
       * The learner's own plan length and stage, for the screens that name them.
       *
       * The navigation read "My 90 Days" from a constant, which was wrong for every
       * second-year — whose plan is 110 — and already wrong for any tenant that had changed
       * the Foundation length. A number in the navigation has to come from the learner.
       */
      stage: user?.passport?.stage || null,
      programDays: await programDaysFor(tenantId, user?.passport?.stage),
      name: `${user?.firstName || ''} ${user?.lastName || ''}`.trim(),
      firstName: user?.firstName || '',

      level,
      coderScore: score,
      percentileAhead: g.percentileAhead(progress.xp, board.map(b => b.xp)),

      // The skill meter: Skill DNA by skill area. A member with no Skill DNA keeps their questionnaire categories.
      skills: dnaAreas.length
        ? dnaAreas.map(a => ({ key: a.key, label: a.label, score: a.score, early: a.early }))
        : assessedState.source === 'attempt'
          ? (attempt.categoryScores || []).map((c: any) => ({ key: c.key, label: c.label, score: c.score }))
          : [],
      // The same figure the coder score's assessment part uses (see assessmentScore above).
      careerScore: assessmentScore,
      careerLevel: assessedState.level,
      pathwayLabel: attempt.pathwayLabel,

      stats: {
        solved: solvedCount,
        solvedToday: g.solvedToday(progress, now),
        totalProblems: library.total,
        accuracy: g.accuracy(progress),
        streak: liveStreak(progress, now),
        longestStreak: progress.longestStreak,
        xp: progress.xp,
        day: dailyPlan.available ? dailyPlan.roadmapDay : day,
        totalDays: dailyPlan.available ? Math.max(1, dailyPlan.weekCount * 7) : totalDays,
        completedDays: journey ? journey.completedDays : roadmap.completedDays,
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
      dailyGoal: journeyGoal
        ? {
          earned: journeyGoal.earned, target: journeyGoal.target,
          pct: Math.min(100, Math.round((journeyGoal.earned / Math.max(1, journeyGoal.target)) * 100)),
          met: journeyGoal.earned >= journeyGoal.target,
        }
        : g.dailyGoal(progress, targetXp, now),
      streakWeek: g.streakWeek(progress, now),
      activity: g.activitySeries(progress, 7, now),

      badges: g.badges({
        solvedCount,
        codingSolved: solvedCount,
        totalCoding: g.PRACTICE_TARGET,
        streak: liveStreak(progress, now),
        longestStreak: progress.longestStreak,
        completedDays: journey ? journey.completedDays : roadmap.completedDays,
        interviewsCompleted: interviews.length,
        resumeScore: resume?.score?.total ?? null,
        careerScore: assessmentScore,
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
      entitled,
      // Empty for a paying member at default settings, but not necessarily: a tenant may sell
      // tiers, and the client draws its locks from this either way.
      locked,
      // Parts of the menu the institute's admin has switched off for CareerPilot students.
      hidden: await hiddenCareerPilotFeatures(tenantId),
    });
  } catch (e: any) {
    console.error('[passport] getDashboard:', e);
    res.status(500).json({ message: e.message || 'Failed to load dashboard' });
  }
};
