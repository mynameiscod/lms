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
  // Missions come from the tenant's admin-editable pools (PassportContent). The journey
  // length rides along because mission emphasis tapers over the WHOLE journey, and a
  // tenant may run 150, 300 or 365 days rather than the default 90.
  return {
    tenantId, studentId, user, cfg, content,
    pools: poolMapOf(content.missionPools, memberAxes(user)),
    curriculum: await curriculumFor(tenantId, user?.passport?.pathway, user?.passport?.stage),
    journeyDays: content.journeyDays || 90,
    // Read once here so every path in this file — list, complete, and the answer review —
    // agrees on how many missions today has. Two paths disagreeing about the day's shape is
    // what produced "Take the assessment first" on a mission the member could see.
    slots: clampSlots((content as any).missionsPerDay),
  };
}

/** Student: today's missions + streak/xp. Gated behind the `daily_missions` entitlement. */
export const getToday = async (req: Request, res: Response) => {
  try {
    const { tenantId, studentId, user, cfg, content, pools, curriculum, journeyDays, slots } = await ctx(req);
    if (!isEntitled(cfg?.entitlements as any, user?.passport, 'daily_missions')) {
      return res.json({ locked: true, priceInr: cfg?.priceInr ?? 499, reason: 'Membership required to unlock daily missions.' });
    }

    /**
     * Same gate as the roadmap, same reason: this looked for a PassportAttempt, which only
     * the legacy questionnaire writes, so a member measured by the skill assessment was
     * told their missions needed an assessment they had already sat.
     */
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

    /**
     * B9 — look back at an earlier day.
     *
     * Missions were only ever generated for TODAY, so a member who missed Tuesday had no
     * way to see what Tuesday had asked of them. `missionsForDay` is deterministic in
     * (attempt, day, journeyDays), so any past day can be rebuilt exactly as it was.
     *
     * Clamped forward at today on purpose: showing tomorrow would leak the pacing the
     * roadmap exists to enforce, and let a member burn through a week in an afternoon.
     */
    const asked = Number(req.query.day);
    const day = Number.isFinite(asked) ? Math.min(today, Math.max(1, Math.round(asked))) : today;

    const missions = missionsForDay(attempt, day, pools, journeyDays, curriculum, slots);
    const doneKeys = new Set(progress.completed.filter(c => c.day === day).map(c => c.key));

    res.json({
      locked: false,
      day,
      today,
      isPast: day < today,
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
    const { tenantId, studentId, user, cfg, content, pools, curriculum, journeyDays, slots } = await ctx(req);
    if (!isEntitled(cfg?.entitlements as any, user?.passport, 'daily_missions')) {
      return res.status(403).json({ message: 'Membership required.' });
    }
    /**
     * The SAME gate getToday uses, for the same reason — and it had to be the same one.
     *
     * getToday was moved onto resolveAssessedState because a PassportAttempt is only ever
     * written by the legacy questionnaire, so a member measured by the skill assessment was
     * told to sit an assessment they had already sat. This half was left behind, and the
     * result was worse than the original bug: the missions rendered, the member wrote their
     * answer, and only on saving were they told to "Take the assessment first" — about an
     * assessment they had completed. Seen in production: careerScore 12, one SUBMITTED
     * PersonalizedAssessment, zero PassportAttempt rows.
     *
     * A read path and a write path disagreeing about who is allowed in is the shape of the
     * bug; keeping them on one resolver is the fix.
     */
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
    const key = String(req.body?.key || '');
    const answer = String(req.body?.answer || '').trim();
    const valid = missionsForDay(attempt, day, pools, journeyDays, curriculum, slots).find(m => m.key === key);
    if (!valid) return res.status(400).json({ message: 'Unknown mission.' });

    // A mission with no surface to do it on completes by writing the answer. Ticking a
    // box was the only option before, which made XP a claim rather than work — and threw
    // away the very thing worth keeping: the member's own words about the role they want
    // and the gaps they see.
    if (valid.needsAnswer && answer.length < 10) {
      return res.status(400).json({ message: 'Write a short answer (at least 10 characters) to complete this one.' });
    }

    // M5 — a mission the product can CHECK cannot be closed by asserting it. Ticking the
    // box was the only evidence that a mock interview had happened, so the XP, the coins
    // and the streak were all available without doing one. The interview closes this
    // mission itself when it finishes (see passportInterviewController.finish).
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

    /**
     * A resume mission is checked against the saved resume rather than asserted.
     *
     * Unlike the interview there is no single "finished" event to hang this on — the
     * Resume Center saves continuously — so this is read at the moment the member ticks.
     * The bar is exactly the three sections the mission text names, and exactly what the
     * Resume Center's own done-markers use, so a member who sees three green ticks there
     * can never be told here that they have not finished.
     */
    if (valid.verify === 'resume') {
      // WHICH part of the resume, from the link's own ?focus= — the same seam the
      // interview uses for ?mode=. Three resume missions ask for three different things,
      // so one blanket "is the resume filled in" bar would tell a member who had just
      // added a project that they had not done it.
      const focus = new URLSearchParams((valid.link || '').split('?')[1] || '').get('focus') || 'basics';
      const s = (await PassportResume.findOne({ tenantId, studentId }).lean() as any)?.sections;
      const missing: string[] = [];

      if (focus === 'projects') {
        const projects = Array.isArray(s?.projects) ? s.projects.filter((p: any) => p?.name?.trim()) : [];
        if (!projects.length) missing.push('one project with a name');
      } else if (focus === 'title') {
        if (!s?.contact?.title?.trim()) missing.push('a target title in your contact details');
      } else {
        // The three sections "Resume kickoff" names — and exactly the criteria the Resume
        // Center's own done-markers use, so a member looking at three green ticks there
        // can never be told here that they have not finished.
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

    // Coach the answer AFTER the mission is already recorded. The order matters: this is
    // a network call to a third party, and a provider outage must cost the member their
    // feedback, never their progress or their XP. Feedback is a bonus on top of a
    // completion that has already happened.
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

    // Coins are awarded AFTER the completion is saved, and each key names the event
    // rather than the request — the calendar day for the daily ones, the day+key for a
    // single mission. Re-submitting the same mission cannot mint a second award, and a
    // failure here cannot cost the member the mission itself.
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
      // A streak pays once per completed week, not once per day it stays alive.
      if (progress.streak > 0 && progress.streak % 7 === 0) {
        const st = await awardCoins({ ...base, eventKey: 'streak_7', note: `${progress.streak}-day streak`, idempotencyKey: `streak:${studentId}:${progress.streak}` });
        coins += st.awarded;
      }
    }

    res.json({
      ok: true, xp: progress.xp, streak: progress.streak, longestStreak: progress.longestStreak,
      coins,
      allDone,
      // null when AI is unavailable — the client shows the completion without coaching
      // rather than pretending the feature is broken.
      feedback,
    });
  } catch (e: any) { console.error('[passport] completeMission:', e); res.status(500).json({ message: e.message || 'Failed' }); }
};
