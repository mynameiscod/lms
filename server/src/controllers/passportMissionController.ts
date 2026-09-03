import { Request, Response } from 'express';
import { memberAxes } from '../services/careerStageService';
import User from '../models/User';
import PassportConfig from '../models/PassportConfig';
import PassportAssessment, { categoriesOf } from '../models/PassportAssessment';
import { resolveAssessedState } from '../services/memberAssessmentStateService';
import PassportProgress from '../models/PassportProgress';
import { isEntitled } from '../services/passportEntitlementService';
import { missionsForDay, dayNumber, ensureContent, poolMapOf, ymd, clampSlots } from '../services/passportMissionService';
import { curriculumFor } from '../services/curriculumService';
import { completeMissionOnce } from '../services/passportXpService';
import PassportInterview from '../models/PassportInterview';
import PassportResume from '../models/PassportResume';
import { awardCoins } from '../services/coinService';
import { reviewAnswer } from '../services/passportAnswerAIService';
import { getTodaysPlan, planUnavailable } from '../services/dailyMissionOrchestrator';
import { completeCareerMission } from '../services/careerMissionCompletionService';
import { processGamificationEvent, evaluateRoadmapBadges } from '../services/gamificationEngine';

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
  return {
    tenantId, studentId, user, cfg, content,
    pools: poolMapOf(content.missionPools, memberAxes(user)),
    curriculum: await curriculumFor(tenantId, user?.passport?.pathway, user?.passport?.stage),
    journeyDays: content.journeyDays || 90,
    slots: clampSlots((content as any).missionsPerDay),
  };
}

/** Student: legacy day browser. Current-day Home no longer uses this list. */
export const getToday = async (req: Request, res: Response) => {
  try {
    const { tenantId, studentId, user, cfg, content, pools, curriculum, journeyDays, slots } = await ctx(req);
    if (!isEntitled(cfg?.entitlements as any, user?.passport, 'daily_missions')) {
      return res.json({ locked: true, priceInr: cfg?.priceInr ?? 499, reason: 'Membership required to unlock daily missions.' });
    }

    const assessed = await resolveAssessedState({
      tenantId, studentId,
      passport: user?.passport,
      categories: categoriesOf(await PassportAssessment.findOne({ tenantId }).lean() as any),
      defaultPathway: content.pathways?.[0] || null,
    });
    if (!assessed.assessed) return res.json({ locked: false, needsAssessment: true });
    const attempt = assessed.attempt as any;

    let progress = await PassportProgress.findOne({ tenantId, studentId });
    if (!progress) progress = await PassportProgress.create({ tenantId, studentId, startDate: user?.passport?.activatedAt || new Date() });

    const now = new Date();
    const today = dayNumber(progress.startDate, now);
    const asked = Number(req.query.day);
    const day = Number.isFinite(asked) ? Math.min(today, Math.max(1, Math.round(asked))) : today;

    const missions = missionsForDay(attempt, day, pools, journeyDays, curriculum, slots);
    const doneKeys = new Set(progress.completed.filter(c => c.day === day).map(c => c.key));

    res.json({
      locked: false, day, today, isPast: day < today,
      streak: progress.streak, longestStreak: progress.longestStreak, xp: progress.xp,
      missions: missions.map(m => ({ ...m, done: doneKeys.has(m.key) })),
      allDone: missions.length > 0 && missions.every(m => doneKeys.has(m.key)),
    });
  } catch (e: any) { console.error('[passport] getToday:', e); res.status(500).json({ message: e.message || 'Failed to load missions' }); }
};

/**
 * Compatibility bridge for the existing Dashboard UI.
 * New roadmap mission keys start with `cp:`. The existing button still posts to this route,
 * so roadmap keys are completed through the same services as /me/plan/complete. Legacy pool
 * keys continue down the old path for past-day/history compatibility during migration.
 */
async function completeRoadmapMission(req: Request, res: Response, key: string) {
  const tenantId = tenantOf(req);
  const studentId = userIdOf(req);
  const plan = await getTodaysPlan(tenantId, studentId);
  if (planUnavailable(plan)) {
    return res.status(plan.reason === 'MEMBERSHIP_REQUIRED' ? 403 : 409).json(plan);
  }

  const mission = plan.missions.find(m => m.key === key);
  if (!mission) return res.status(400).json({ message: 'That mission is not on today’s plan.' });

  const user: any = await User.findOne({ _id: studentId, tenantId }).select('passport').lean();
  const outcome = await completeCareerMission({
    tenantId, studentId,
    day: plan.roadmapDay,
    key,
    trace: {
      roadmapId: mission.roadmapId,
      objectiveSequence: mission.objectiveSequence,
      skillKey: mission.skillKey,
      workType: mission.workType,
      minutes: mission.plannedMinutes,
    },
    startDate: user?.passport?.activatedAt,
  });

  const award = outcome.newlyCompleted
    ? await processGamificationEvent({
        tenantId, studentId,
        eventKey: 'CAREER_MISSION_COMPLETED',
        sourceType: 'mission', sourceId: key,
        metadata: { skillKey: mission.skillKey, workType: mission.workType },
        xpOverride: mission.resource?.xp ?? undefined,
      })
    : null;
  const roadmapBadges = outcome.newlyCompleted
    ? await evaluateRoadmapBadges(tenantId, studentId)
    : [];
  const after = await getTodaysPlan(tenantId, studentId);
  const allDone = after.available ? after.missions.length > 0 && after.missions.every(m => m.done) : false;

  return res.json({
    ok: true,
    completed: true,
    newlyCompleted: outcome.newlyCompleted,
    xpAwarded: award?.awarded || 0,
    xp: award?.xpTotal ?? null,
    streak: award?.streak ?? null,
    longestStreak: null,
    badges: [...(award?.badges || []), ...roadmapBadges],
    streakBonus: award?.streakBonus,
    allDone,
    feedback: null,
  });
}

/** Student: mark one mission done. Roadmap keys use the new engine; legacy keys remain compatible. */
export const completeMission = async (req: Request, res: Response) => {
  try {
    const requestedKey = String(req.body?.key || '').trim();
    if (requestedKey.startsWith('cp:')) {
      return await completeRoadmapMission(req, res, requestedKey);
    }

    const { tenantId, studentId, user, cfg, content, pools, curriculum, journeyDays, slots } = await ctx(req);
    if (!isEntitled(cfg?.entitlements as any, user?.passport, 'daily_missions')) {
      return res.status(403).json({ message: 'Membership required.' });
    }
    const assessed = await resolveAssessedState({
      tenantId, studentId,
      passport: user?.passport,
      categories: categoriesOf(await PassportAssessment.findOne({ tenantId }).lean() as any),
      defaultPathway: content.pathways?.[0] || null,
    });
    if (!assessed.assessed) return res.status(400).json({ message: 'Take the assessment first.' });
    const attempt = assessed.attempt as any;

    let progress = await PassportProgress.findOne({ tenantId, studentId });
    if (!progress) progress = await PassportProgress.create({ tenantId, studentId, startDate: user?.passport?.activatedAt || new Date() });

    const now = new Date();
    const day = dayNumber(progress.startDate, now);
    const key = requestedKey;
    const answer = String(req.body?.answer || '').trim();
    const valid = missionsForDay(attempt, day, pools, journeyDays, curriculum, slots).find(m => m.key === key);
    if (!valid) return res.status(400).json({ message: 'Unknown mission.' });

    if (valid.needsAnswer && answer.length < 10) {
      return res.status(400).json({ message: 'Write a short answer (at least 10 characters) to complete this one.' });
    }

    if (valid.verify === 'interview') {
      const done = await PassportInterview.countDocuments({
        tenantId, studentId, status: 'completed',
        completedAt: { $gte: new Date(new Date(now).setHours(0, 0, 0, 0)) },
      });
      if (!done) {
        return res.status(400).json({
          message: 'Finish a mock interview to complete this one — it will tick itself when you do.',
        });
      }
    }

    if (valid.verify === 'resume') {
      const focus = new URLSearchParams((valid.link || '').split('?')[1] || '').get('focus') || 'basics';
      const s = (await PassportResume.findOne({ tenantId, studentId }).lean() as any)?.sections;
      const missing: string[] = [];

      if (focus === 'projects') {
        const projects = Array.isArray(s?.projects) ? s.projects.filter((p: any) => p?.name?.trim()) : [];
        if (!projects.length) missing.push('one project with a name');
      } else if (focus === 'title') {
        if (!s?.contact?.title?.trim()) missing.push('a target title in your contact details');
      } else {
        if (!s?.contact?.name?.trim() || !s?.contact?.email?.trim() || !s?.contact?.phone?.trim()) {
          missing.push('your name, email and phone');
        }
        if (!(Array.isArray(s?.education) && s.education.length)) missing.push('one education entry');
        const skills = Array.isArray(s?.skills)
          ? s.skills.reduce((n: number, g: any) => n + (Array.isArray(g?.items) ? g.items.filter((i: any) => String(i || '').trim()).length : 0), 0)
          : 0;
        if (skills < 3) missing.push(`${3 - skills} more skill${3 - skills === 1 ? '' : 's'}`);
      }

      if (missing.length) {
        return res.status(400).json({
          message: `Add ${missing.join(', ')} in the Resume Center, then tick this again.`,
        });
      }
    }

    const newlyDone = completeMissionOnce(progress, day, key, valid.xp, now, valid.needsAnswer ? answer : undefined);

    let feedback: string | null = null;
    if (newlyDone && valid.needsAnswer && answer) {
      const reviewed = await reviewAnswer({
        tenantId, studentId, missionTitle: valid.title, missionDetail: valid.detail, answer,
      });
      if (reviewed) {
        const rec = progress.completed.find(c => c.day === day && c.key === key);
        if (rec) { rec.feedback = reviewed.feedback; rec.extract = reviewed.extract as any; }
        feedback = reviewed.feedback;
      }
    }

    if (newlyDone) await progress.save();

    const doneKeys = new Set(progress.completed.filter(c => c.day === day).map(c => c.key));
    const missions = missionsForDay(attempt, day, pools, journeyDays, curriculum, slots);
    const allDone = missions.every(m => doneKeys.has(m.key));

    let coins = 0;
    if (newlyDone) {
      const today = ymd(now);
      const base = { tenantId, studentId, note: valid.title };
      const one = await awardCoins({ ...base, eventKey: 'mission_complete', idempotencyKey: `mission:${studentId}:${day}:${key}` });
      coins += one.awarded;

      if (allDone) {
        const all = await awardCoins({ ...base, eventKey: 'mission_all_done', note: 'All missions done', idempotencyKey: `missions_all:${studentId}:${today}` });
        coins += all.awarded;
      }
      if (progress.streak > 0 && progress.streak % 7 === 0) {
        const st = await awardCoins({ ...base, eventKey: 'streak_7', note: `${progress.streak}-day streak`, idempotencyKey: `streak:${studentId}:${progress.streak}` });
        coins += st.awarded;
      }
    }

    res.json({
      ok: true, xp: progress.xp, streak: progress.streak, longestStreak: progress.longestStreak,
      coins, allDone, feedback,
    });
  } catch (e: any) { console.error('[passport] completeMission:', e); res.status(500).json({ message: e.message || 'Failed' }); }
};
