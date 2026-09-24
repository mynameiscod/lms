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
import { readChunk, purgeAttemptRecording } from '../services/proctorStorageService';

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

    /*
     * Say out loud when it was a PARTIAL success. The old message reported only the count that
     * worked, so a run that failed on member three of eighty read as "2 paper(s) drawn." and
     * looked like there had simply been nothing to do.
     */
    const parts = [`${result.created} paper(s) drawn.`];
    if (result.existing) parts.push(`${result.existing} already had one.`);
    if (result.failedMembers.length) {
      parts.push(`${result.failedMembers.length} member(s) COULD NOT be provisioned — see failedMembers.`);
    }
    if (result.skippedTeams.length) parts.push(`${result.skippedTeams.length} team(s) skipped.`);
    if (result.membersWithoutEmail.length) {
      parts.push(`${result.membersWithoutEmail.length} member(s) have no email: WhatsApp OTP only.`);
    }

    res.json({
      success: true,
      partial: result.failedMembers.length > 0,
      message: parts.join(' '),
      data: { ...result, coverage },
    });
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
      .select('memberName memberMobile memberEmail teamName registrationCode status startedAt submittedAt timeSpentSec score totalMarks percentage violationCount grading ipAddress invitesSent otpVerifiedAt otpVerifiedBy recording')
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
    const counts = await sendInvitations(exam, { resend: String(req.query.resend || req.body?.resend || '') === 'true' });
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

/**
 * GET /:id/attempts/:attemptId/recording/:seq — one slice of a candidate's recording.
 *
 * Streamed through here rather than handed out as a storage URL. This is video of a
 * student's face: every view should pass the same admin check as the rest of this screen,
 * and a link that keeps working after it is pasted somewhere is the opposite of that.
 */
export const streamAttemptRecording = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const exam = await examOr404(req);
    const attempt = await HackathonExamAttempt.findOne({ _id: req.params.attemptId, examId: exam._id }).lean() as any;
    if (!attempt) return res.status(404).json({ success: false, message: 'Attempt not found.' });

    const seq = Number(req.params.seq);
    if (!Number.isInteger(seq) || seq < 1 || seq > (attempt.recording?.chunks || 0)) {
      return res.status(404).json({ success: false, message: 'No such chunk on this attempt.' });
    }

    const { stream, size } = await readChunk(String(exam._id), String(attempt._id), seq);
    res.setHeader('Content-Type', 'video/webm');
    if (size) res.setHeader('Content-Length', String(size));
    stream.pipe(res);
  } catch (e) { fail(res, e, 'Could not read that recording'); }
};

/**
 * DELETE /:id/attempts/:attemptId/recording — throw one candidate's footage away.
 *
 * Deliberately a button and not a schedule. The footage exists to settle a dispute about one
 * sitting; once that is settled it is a liability rather than an asset, but deciding it is
 * settled is a person's judgement on a date they chose, not a cron's.
 */
export const deleteAttemptRecording = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const exam = await examOr404(req);
    const attempt = await HackathonExamAttempt.findOne({ _id: req.params.attemptId, examId: exam._id });
    if (!attempt) return res.status(404).json({ success: false, message: 'Attempt not found.' });

    const removed = await purgeAttemptRecording(String(exam._id), String(attempt._id), attempt.recording?.chunks || 0);
    attempt.recording.chunks = 0;
    attempt.recording.bytes = 0;
    attempt.recording.note = `Deleted by admin on ${new Date().toISOString().slice(0, 10)}.`;
    await attempt.save();
    res.json({ success: true, message: `${removed} chunk(s) deleted.`, data: { removed } });
  } catch (e) { fail(res, e, 'Could not delete that recording'); }
};

/**
 * POST /:id/attempts/:attemptId/verify — let a candidate in without a code.
 *
 * ── WHAT THIS ACTUALLY IS ─────────────────────────────────────────────────────────────────
 *
 * The OTP proves the person holds the registered phone. This exam is sat remotely, so an
 * admin pressing this has not seen anybody: it is not a check performed by other means, it
 * is that check waived. Worth being plain about, because the button will be pressed under
 * pressure by somebody who just wants the candidate to get on with it.
 *
 * So it records WHO waived it. The name sits on the attempt and shows in the candidate list
 * beside the score it made possible, which is the only thing that makes it reviewable
 * afterwards. An unattributed waiver is indistinguishable from a bypass.
 *
 * It is deliberately per-candidate. There is no "verify everyone", because the one case
 * where that gets used is the case where nobody checked anything at all.
 */
export const verifyAttemptManually = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const exam = await examOr404(req);
    const attempt = await HackathonExamAttempt.findOne({ _id: req.params.attemptId, examId: exam._id });
    if (!attempt) return res.status(404).json({ success: false, message: 'Attempt not found.' });
    if (attempt.otpVerifiedAt) {
      return res.json({ success: true, message: 'Already verified.', data: { alreadyVerified: true } });
    }

    const who = String((req as any).user?.email || (req as any).user?.name || 'an admin');
    attempt.otpVerifiedAt = new Date();
    attempt.otpVerifiedBy = who;
    if (attempt.status === 'invited') attempt.status = 'verified';
    await attempt.save();

    res.json({
      success: true,
      message: `${attempt.memberName} can now start without a code. Recorded against ${who}.`,
      data: { verifiedBy: who, at: attempt.otpVerifiedAt },
    });
  } catch (e) { fail(res, e, 'Could not verify that candidate'); }
};

/**
 * PATCH /:id/attempts/:attemptId/mobile — correct a wrong number.
 *
 * These cohorts are imported from a spreadsheet, so a mistyped digit is the likeliest single
 * reason a code never arrives — and until now it was unfixable: the number was set at import
 * and nothing could change it, so that candidate simply could not sit the exam.
 *
 * Changing it clears any verification already on the attempt. A candidate verified against
 * the old number has proved they hold a phone that is no longer the one on record, and
 * carrying that forward would quietly turn a typo fix into an identity swap.
 */
export const updateAttemptMobile = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const exam = await examOr404(req);
    const attempt = await HackathonExamAttempt.findOne({ _id: req.params.attemptId, examId: exam._id });
    if (!attempt) return res.status(404).json({ success: false, message: 'Attempt not found.' });

    const mobile = String(req.body?.mobile || '').replace(/\D/g, '').slice(-10);
    if (mobile.length !== 10) {
      return res.status(400).json({ success: false, message: 'A 10-digit mobile number is required.' });
    }
    if (attempt.submittedAt) {
      return res.status(409).json({ success: false, message: 'This paper is already submitted — changing the number now changes nothing.' });
    }

    const was = attempt.memberMobile;
    attempt.memberMobile = mobile;
    if (attempt.otpVerifiedAt) {
      attempt.otpVerifiedAt = null;
      attempt.otpVerifiedBy = undefined;
      if (attempt.status === 'verified') attempt.status = 'invited';
    }
    /* The old invitation went to the old number, so it has not been delivered to this one. */
    attempt.invitesSent.whatsapp = false;
    await attempt.save();

    res.json({
      success: true,
      message: `Changed from ${was} to ${mobile}. Send them the invitation again.`,
      data: { mobile },
    });
  } catch (e) { fail(res, e, 'Could not change that number'); }
};
