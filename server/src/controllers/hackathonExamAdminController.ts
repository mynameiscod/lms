import { Response } from 'express';
import mongoose from 'mongoose';
import HackathonExam from '../models/HackathonExam';
import HackathonExamAttempt from '../models/HackathonExamAttempt';
import HackathonRegistration from '../models/HackathonRegistration';
import Hackathon from '../models/Hackathon';
import { AuthenticatedRequest } from '../types';
import { checkDrawCoverage, clearDrawPoolCache, sectionFilter } from '../services/hackathonExamDrawService';
import AssessmentItem from '../models/AssessmentItem';
import * as exams from '../services/hackathonExamService';
import { computeLeaderboard, computeTeamResult, drainGradingQueue } from '../services/hackathonExamGradingService';
import { logger } from '../utils/logger';
import { sendInvitations, sendResults, resendInvitation } from '../services/hackathonExamNotifyService';

/**
 * Running the hackathon exam: configure it, prove it can be drawn, invite the teams, watch it
 * happen, and publish.
 *
 * ── THE ORDER IS THE PRODUCT ──────────────────────────────────────────────────────────────
 *
 * Configure → check coverage → provision → invite → live → grade → review → publish. Each step
 * refuses to run before the one before it has, because every one of them is hard to undo in
 * front of 800 people: invitations cannot be unsent, and a paper cannot be re-drawn under a
 * candidate who has started.
 */

const fail = (res: Response, e: any, what: string) => {
  if (e instanceof exams.ExamError) {
    return res.status(e.status).json({ success: false, code: e.code, message: e.message });
  }
  logger.error(`${what} failed`, { error: e?.message });
  return res.status(500).json({ success: false, message: e?.message || what });
};

const examOr404 = async (req: AuthenticatedRequest) => {
  const exam = await HackathonExam.findOne({ _id: req.params.id, tenantId: String(req.tenantId) });
  if (!exam) throw new exams.ExamError('NOT_FOUND', 'Exam not found.', 404);
  return exam;
};

/* ── configure ─────────────────────────────────────────────────────────────── */

export const getExamForHackathon = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const exam = await HackathonExam.findOne({
      tenantId: String(req.tenantId), hackathonId: req.params.hackathonId,
    }).lean();
    res.json({ success: true, data: exam || null });
  } catch (e) { fail(res, e, 'Failed to load exam'); }
};

/**
 * Create or update. One exam per hackathon, enforced by a unique index rather than by hoping
 * two admins do not press save at the same moment.
 */
export const upsertExam = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = String(req.tenantId);
    const hackathonId = String(req.body?.hackathonId || req.params.hackathonId);
    const h = await Hackathon.findOne({ _id: hackathonId, tenantId }).lean();
    if (!h) return res.status(404).json({ success: false, message: 'Hackathon not found.' });

    const allowed = [
      'title', 'instructions', 'startAt', 'endAt', 'durationMins', 'joinCutoffMins',
      'sections', 'navigation', 'runPolicy', 'proctoring', 'reminders',
      'inviteChannels', 'resultChannels', 'teamScoreDenominator', 'status',
    ];
    const patch: any = {};
    for (const k of allowed) if (req.body?.[k] !== undefined) patch[k] = req.body[k];

    const existing = await HackathonExam.findOne({ tenantId, hackathonId });

    /*
     * Editing sections after papers exist would leave already-drawn candidates on the old
     * shape and everyone drawn later on the new one — two different exams sharing a
     * leaderboard. Refused rather than merged.
     */
    if (existing && patch.sections) {
      const drawn = await HackathonExamAttempt.countDocuments({ examId: existing._id });
      if (drawn > 0) {
        const changed = JSON.stringify(existing.sections) !== JSON.stringify(patch.sections);
        if (changed) {
          return res.status(409).json({
            success: false, code: 'PAPERS_EXIST',
            message: `${drawn} paper(s) have already been drawn from the current sections. Clear them before changing the question plan.`,
          });
        }
      }
    }

    const exam = existing
      ? Object.assign(existing, patch)
      : new HackathonExam({ ...patch, tenantId, hackathonId, createdBy: req.user?.id });
    await exam.save();
    clearDrawPoolCache();

    res.json({ success: true, message: 'Exam saved', data: exam });
  } catch (e) { fail(res, e, 'Failed to save exam'); }
};

/** Can the bank fill every section? Answered before invitations, not at the gun. */
export const getExamCoverage = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const exam = await examOr404(req);
    clearDrawPoolCache();
    res.json({ success: true, data: await checkDrawCoverage(exam) });
  } catch (e) { fail(res, e, 'Failed to check coverage'); }
};

/* ── provision ─────────────────────────────────────────────────────────────── */

/**
 * Draw a paper for every member of every confirmed team.
 *
 * Refuses while coverage is short. Provisioning against an unfillable section would create
 * some papers and then throw partway, leaving half the event with an exam and half without.
 */
export const provisionExamAttempts = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const exam = await examOr404(req);
    clearDrawPoolCache();

    const coverage = await checkDrawCoverage(exam);
    if (!coverage.ok) {
      return res.status(409).json({
        success: false, code: 'COVERAGE',
        message: 'The question bank cannot fill every section yet.',
        data: coverage,
      });
    }

    const result = await exams.provisionAttempts(exam);
    if (exam.status === 'draft') { exam.status = 'ready'; await exam.save(); }

    res.json({ success: true, message: `${result.created} paper(s) drawn.`, data: { ...result, coverage } });
  } catch (e) { fail(res, e, 'Failed to provision attempts'); }
};

/* ── the live dashboard ────────────────────────────────────────────────────── */

/**
 * One screen, one request: where every candidate is right now.
 *
 * Counted by aggregation rather than by loading 800 documents to tally them in Node. The same
 * mistake on the battle leaderboard pulled 22,275 documents off disk to answer one count; this
 * runs every few seconds while an admin watches, so it has to be the cheap version.
 */
export const getExamDashboard = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const exam = await examOr404(req);
    const examId = exam._id;

    const [byStatus, byGrading, flagged, teamsTotal, recent] = await Promise.all([
      HackathonExamAttempt.aggregate([
        { $match: { examId } },
        { $group: { _id: '$status', n: { $sum: 1 } } },
      ]),
      HackathonExamAttempt.aggregate([
        { $match: { examId } },
        { $group: { _id: '$grading.status', n: { $sum: 1 } } },
      ]),
      HackathonExamAttempt.countDocuments({ examId, violationCount: { $gt: 0 } }),
      HackathonExamAttempt.distinct('registrationCode', { examId }),
      HackathonExamAttempt.find({ examId, submittedAt: { $ne: null } })
        .sort({ submittedAt: -1 }).limit(12)
        .select('memberName teamName registrationCode submittedAt timeSpentSec violationCount status')
        .lean(),
    ]);

    const count = (rows: any[], key: string) => rows.find(r => r._id === key)?.n || 0;
    const statuses = {
      invited: count(byStatus, 'invited'),
      verified: count(byStatus, 'verified'),
      started: count(byStatus, 'started'),
      submitted: count(byStatus, 'submitted'),
      autoSubmitted: count(byStatus, 'auto_submitted'),
      noShow: count(byStatus, 'no_show'),
    };
    const total = Object.values(statuses).reduce((a, b) => a + b, 0);

    const now = new Date();
    res.json({
      success: true,
      data: {
        exam: {
          id: String(exam._id), title: exam.title, status: exam.status,
          startAt: exam.startAt, endAt: exam.endAt, durationMins: exam.durationMins,
          publishedAt: exam.publishedAt,
        },
        serverNow: now,
        totals: {
          teams: teamsTotal.length,
          candidates: total,
          ...statuses,
          /** Anyone whose paper is open right now. */
          inProgress: statuses.started,
          finished: statuses.submitted + statuses.autoSubmitted,
          notStarted: statuses.invited + statuses.verified,
        },
        grading: {
          pending: count(byGrading, 'pending'),
          grading: count(byGrading, 'grading'),
          graded: count(byGrading, 'graded'),
          reviewRequired: count(byGrading, 'review_required'),
        },
        integrity: { flaggedCandidates: flagged },
        recentSubmissions: recent,
      },
    });
  } catch (e) { fail(res, e, 'Failed to load dashboard'); }
};

/** Everyone, filterable — the table under the dashboard counters. */
export const listExamAttempts = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const exam = await examOr404(req);
    const { status, flagged, team, search } = req.query as any;

    const filter: any = { examId: exam._id };
    if (status) filter.status = status;
    if (flagged === 'true') filter.violationCount = { $gt: 0 };
    if (team) filter.registrationCode = String(team).toUpperCase();
    if (search) {
      const rx = new RegExp(String(search).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      filter.$or = [{ memberName: rx }, { memberMobile: rx }, { teamName: rx }, { registrationCode: rx }];
    }

    const rows = await HackathonExamAttempt.find(filter)
      .sort({ submittedAt: -1, memberName: 1 })
      .limit(1000)
      .select('memberName memberMobile memberEmail teamName registrationCode status startedAt submittedAt timeSpentSec score totalMarks percentage violationCount grading ipAddress invitesSent')
      .lean();

    res.json({ success: true, data: rows });
  } catch (e) { fail(res, e, 'Failed to list attempts'); }
};

/**
 * POST /:id/attempts/:attemptId/resend-invite — one candidate, again.
 *
 * The bulk send skips anyone already invited, which is correct for it and leaves no way to
 * reach the person whose first invitation was wrong or never arrived. One at a time and
 * never in bulk: each of these costs money, and a mistake here should cost one message.
 */
export const resendAttemptInvite = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const exam = await examOr404(req);
    const attempt = await HackathonExamAttempt.findOne({ _id: req.params.attemptId, examId: exam._id });
    if (!attempt) return res.status(404).json({ success: false, message: 'Attempt not found.' });

    const counts = await resendInvitation(exam, attempt);
    if (!counts.email && !counts.whatsapp) {
      return res.status(502).json({
        success: false,
        message: 'Neither channel accepted the message. Check the invite channels on this exam.',
      });
    }
    const via = [counts.email && 'email', counts.whatsapp && 'WhatsApp'].filter(Boolean).join(' and ');
    res.json({ success: true, message: `Invitation re-sent by ${via}.`, data: counts });
  } catch (e) { fail(res, e, 'Failed to resend the invitation'); }
};

/** One candidate in full, violations included — what an admin opens when a team is flagged. */
export const getExamAttempt = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const exam = await examOr404(req);
    const attempt = await HackathonExamAttempt.findOne({ examId: exam._id, _id: req.params.attemptId }).lean();
    if (!attempt) return res.status(404).json({ success: false, message: 'Attempt not found.' });
    res.json({ success: true, data: attempt });
  } catch (e) { fail(res, e, 'Failed to load attempt'); }
};

/* ── grading ───────────────────────────────────────────────────────────────── */

/** Push the queue along by hand. The cron does this too; this is for watching it move. */
export const runGradingPass = async (req: AuthenticatedRequest, res: Response) => {
  try {
    await examOr404(req);
    res.json({ success: true, data: await drainGradingQueue(Number(req.body?.max) || 25) });
  } catch (e) { fail(res, e, 'Grading pass failed'); }
};

/**
 * Score an attempt by hand.
 *
 * For the attempts that reached `review_required` because the execution tier failed them — not
 * because they were wrong. The reason is recorded, because a hand-entered score on a public
 * leaderboard has to be explainable later.
 */
export const overrideAttemptScore = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const exam = await examOr404(req);
    const { score, note } = req.body || {};
    if (typeof score !== 'number' || score < 0) {
      return res.status(400).json({ success: false, message: 'A score of zero or more is required.' });
    }
    const attempt = await HackathonExamAttempt.findOne({ examId: exam._id, _id: req.params.attemptId });
    if (!attempt) return res.status(404).json({ success: false, message: 'Attempt not found.' });

    attempt.score = score;
    attempt.totalMarks = attempt.totalMarks || attempt.drawnItems.reduce((s, d) => s + d.marks, 0);
    attempt.percentage = attempt.totalMarks ? Math.round((score / attempt.totalMarks) * 10000) / 100 : 0;
    attempt.grading.status = 'graded';
    attempt.grading.completedAt = new Date();
    attempt.grading.lastError = `Manually scored by ${req.user?.email || req.user?.id || 'admin'}${note ? `: ${note}` : ''}`;
    await attempt.save();

    res.json({ success: true, message: 'Score recorded.', data: attempt });
  } catch (e) { fail(res, e, 'Failed to override score'); }
};

/* ── results ───────────────────────────────────────────────────────────────── */

export const getExamLeaderboard = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const exam = await examOr404(req);
    res.json({ success: true, data: await computeLeaderboard(String(exam._id)) });
  } catch (e) { fail(res, e, 'Failed to build leaderboard'); }
};

/**
 * Release results.
 *
 * Refuses while anything is still ungraded or awaiting review, unless explicitly forced. A
 * leaderboard published mid-grading reorders itself in public while people are looking at it,
 * and a team told they came fourth and later third will not accept the second answer.
 */
export const publishExamResults = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const exam = await examOr404(req);
    const force = req.body?.force === true;

    const outstanding = await HackathonExamAttempt.countDocuments({
      examId: exam._id,
      submittedAt: { $ne: null },
      'grading.status': { $in: ['pending', 'grading', 'review_required'] },
    });

    if (outstanding > 0 && !force) {
      return res.status(409).json({
        success: false, code: 'GRADING_INCOMPLETE',
        message: `${outstanding} attempt(s) are still being graded or waiting for review. Publishing now would reorder the leaderboard in public.`,
        data: { outstanding },
      });
    }

    exam.status = 'published';
    exam.publishedAt = new Date();
    exam.publishedBy = req.user?.email || req.user?.id;
    await exam.save();

    res.json({ success: true, message: 'Results published.', data: { publishedAt: exam.publishedAt, outstanding } });
  } catch (e) { fail(res, e, 'Failed to publish results'); }
};

/** Close the window by hand, sweeping anyone still open or never started. */
export const closeExam = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const exam = await examOr404(req);
    const swept = await exams.sweepExpiredAttempts(exam, new Date());
    exam.status = 'closed';
    await exam.save();
    res.json({ success: true, message: 'Exam closed.', data: swept });
  } catch (e) { fail(res, e, 'Failed to close exam'); }
};

/** Which confirmed teams have no papers yet — the gap between registration and provisioning. */
export const getExamReadiness = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const exam = await examOr404(req);
    const [coverage, confirmedTeams, provisionedCodes] = await Promise.all([
      checkDrawCoverage(exam),
      HackathonRegistration.countDocuments({ hackathonId: exam.hackathonId, status: 'confirmed' }),
      HackathonExamAttempt.distinct('registrationCode', { examId: exam._id }),
    ]);
    res.json({
      success: true,
      data: {
        coverage,
        confirmedTeams,
        provisionedTeams: provisionedCodes.length,
        teamsWithoutPapers: Math.max(0, confirmedTeams - provisionedCodes.length),
      },
    });
  } catch (e) { fail(res, e, 'Failed to check readiness'); }
};

/* ── telling people ────────────────────────────────────────────────────────── */

/**
 * Send the exam link to everyone who has not had it.
 *
 * Safe to press twice, and meant to be: teams keep registering after the first send, and the
 * people already invited are skipped rather than messaged again.
 */
export const sendExamInvitations = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const exam = await examOr404(req);
    const counts = await sendInvitations(exam);
    res.json({
      success: true,
      message: `Invitations sent — ${counts.email} email, ${counts.whatsapp} WhatsApp.`,
      data: counts,
    });
  } catch (e) { fail(res, e, 'Failed to send invitations'); }
};

/** Send results. Refuses on an unpublished exam — a score sent early cannot be recalled. */
export const sendExamResults = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const exam = await examOr404(req);
    const counts = await sendResults(exam);
    res.json({
      success: true,
      message: `Results sent — ${counts.email} email, ${counts.whatsapp} WhatsApp.`,
      data: counts,
    });
  } catch (e) { fail(res, e, 'Failed to send results'); }
};

/**
 * GET /:id/sections/:key/pool — the questions one section will actually draw from.
 *
 * Coverage says "142 items match". This says WHICH — because "142" is only reassuring until
 * you notice the section was meant to be this event's hundred and is quietly pulling in
 * everything else tagged the same way. An admin should be able to look before 800 people do.
 *
 * The answer key is not included. This screen is behind admin auth, but the shape that leaves
 * the server for a question list is the same shape a candidate's paper uses, and keeping one
 * of them safe by remembering to is how the other one leaks.
 */
export const getSectionPool = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const exam = await examOr404(req);
    const section = (exam.sections || []).find((s: any) => s.key === req.params.key);
    if (!section) return res.status(404).json({ success: false, message: 'Section not found.' });

    const items = await AssessmentItem
      .find(sectionFilter(String(exam.tenantId), section))
      .select('_id type difficulty language points tags prompt')
      .sort({ difficulty: 1, _id: 1 })
      .limit(500)
      .lean() as any[];

    res.json({
      success: true,
      data: {
        section: { key: section.key, label: section.label, drawCount: section.drawCount },
        available: items.length,
        items: items.map((i) => ({
          id: String(i._id),
          type: i.type,
          difficulty: i.difficulty,
          language: i.language,
          marks: section.marksPerItem > 0 ? section.marksPerItem : i.points,
          tags: i.tags,
          prompt: String(i.prompt || '').slice(0, 160),
        })),
      },
    });
  } catch (e) { fail(res, e, 'Failed to load the pool'); }
};
