import { Request, Response } from 'express';
import HackathonExam from '../models/HackathonExam';
import HackathonExamAttempt from '../models/HackathonExamAttempt';
import Hackathon from '../models/Hackathon';
import * as exams from '../services/hackathonExamService';
import { ExamError } from '../services/hackathonExamService';
import { sendOtp, verifyOtp } from '../services/assessmentOtpService';
import { logger } from '../utils/logger';

/**
 * The candidate's side of the hackathon exam. UNAUTHENTICATED, by design — a team was given a
 * code, not an account.
 *
 * ── WHAT STANDS IN FOR A LOGIN ────────────────────────────────────────────────────────────
 *
 * The team code identifies the TEAM and is known to everyone on it. The mobile picks the
 * person, and an OTP to that number proves it is them. Without the OTP step the team code
 * alone would let one member sit all four papers, which is precisely the cheat a team average
 * rewards.
 *
 * ── EVERY HANDLER RE-READS THE ATTEMPT ────────────────────────────────────────────────────
 *
 * Nothing is carried in a cookie or a client-held session. The exam token is the credential,
 * and the state that decides what is allowed — started, submitted, how many runs are left — is
 * loaded fresh each time. A tab left open for an hour cannot act on what it remembers.
 */

const ip = (req: Request): string =>
  String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.socket.remoteAddress || '';

const fail = (res: Response, e: any) => {
  if (e instanceof ExamError) return res.status(e.status).json({ success: false, code: e.code, message: e.message });
  logger.error('hackathon exam public failed', { error: e?.message });
  return res.status(500).json({ success: false, message: 'Something went wrong. Please try again.' });
};

/** The live exam for a hackathon slug, or nothing. Used by the landing page. */
export const getExamBySlug = async (req: Request, res: Response) => {
  try {
    const h = await Hackathon.findOne({ slug: String(req.params.slug).toLowerCase() }).lean() as any;
    if (!h) return res.status(404).json({ success: false, message: 'Hackathon not found.' });

    const exam = await HackathonExam.findOne({ hackathonId: h._id }).lean() as any;
    if (!exam || exam.status === 'draft') {
      return res.status(404).json({ success: false, message: 'No exam has been published for this hackathon yet.' });
    }

    res.json({
      success: true,
      data: {
        hackathon: { title: h.title, slug: h.slug, bannerUrl: h.bannerUrl, collegeLogoUrl: h.collegeLogoUrl, venue: h.venue },
        exam: {
          title: exam.title,
          instructions: exam.instructions,
          startAt: exam.startAt,
          endAt: exam.endAt,
          durationMins: exam.durationMins,
          joinCutoffMins: exam.joinCutoffMins,
          status: exam.status,
          navigation: exam.navigation,
          sections: (exam.sections || []).map((s: any) => ({
            key: s.key, label: s.label, count: s.drawCount, types: s.types,
          })),
          runPolicy: {
            enabled: exam.runPolicy?.enabled,
            maxRunsPerQuestion: exam.runPolicy?.maxRunsPerQuestion,
            cooldownSeconds: exam.runPolicy?.cooldownSeconds,
          },
          proctoring: {
            tabSwitch: exam.proctoring?.tabSwitch?.enabled ? exam.proctoring.tabSwitch : null,
            fullscreenRequired: !!exam.proctoring?.fullscreen?.required,
            copyPasteBlocked: !!exam.proctoring?.copyPasteBlocked,
            camera: !!exam.proctoring?.camera?.enabled,
          },
        },
      },
    });
  } catch (e) { fail(res, e); }
};

/**
 * Step one: team code + mobile → an OTP.
 *
 * Deliberately says nothing about whether the team exists, whether the mobile is on it, or
 * whether that member has already finished. A public endpoint that distinguishes those is a
 * way to enumerate who registered.
 */
export const requestExamOtp = async (req: Request, res: Response) => {
  try {
    const { slug, teamCode, mobile } = req.body || {};
    const h = await Hackathon.findOne({ slug: String(slug || '').toLowerCase() }).lean() as any;
    if (!h) throw new ExamError('NOT_FOUND', 'We could not match that team code and mobile number.', 404);

    const exam = await HackathonExam.findOne({ hackathonId: h._id });
    if (!exam) throw new ExamError('NOT_FOUND', 'We could not match that team code and mobile number.', 404);

    const attempt = await exams.findAttemptByTeamCode(String(exam._id), teamCode, mobile);
    const r = await sendOtp(String(exam.tenantId), attempt.examToken, attempt.memberMobile);

    res.json({
      success: true,
      data: { sent: true, channel: r?.channel || 'whatsapp', maskedMobile: attempt.memberMobile.replace(/\d(?=\d{4})/g, '•') },
    });
  } catch (e) { fail(res, e); }
};

/** Step two: the code they were sent. Success hands back the exam token. */
export const verifyExamOtp = async (req: Request, res: Response) => {
  try {
    const { slug, teamCode, mobile, code } = req.body || {};
    const h = await Hackathon.findOne({ slug: String(slug || '').toLowerCase() }).lean() as any;
    if (!h) throw new ExamError('NOT_FOUND', 'We could not match that team code and mobile number.', 404);
    const exam = await HackathonExam.findOne({ hackathonId: h._id });
    if (!exam) throw new ExamError('NOT_FOUND', 'We could not match that team code and mobile number.', 404);

    const attempt = await exams.findAttemptByTeamCode(String(exam._id), teamCode, mobile);
    const result = await verifyOtp(attempt.examToken, String(code || ''));

    if (result !== 'ok') {
      const messages: Record<string, string> = {
        invalid: 'That code is not right. Check it and try again.',
        expired: 'That code has expired. Ask for a new one.',
        too_many_attempts: 'Too many tries. Ask for a new code.',
        not_found: 'Ask for a code first.',
      };
      throw new ExamError(result.toUpperCase(), messages[result] || 'Verification failed.', 400);
    }

    if (!attempt.otpVerifiedAt) {
      attempt.otpVerifiedAt = new Date();
      if (attempt.status === 'invited') attempt.status = 'verified';
      await attempt.save();
    }

    res.json({ success: true, data: { examToken: attempt.examToken, memberName: attempt.memberName, teamName: attempt.teamName } });
  } catch (e) { fail(res, e); }
};

/**
 * The instructions page, and everything needed to decide what to show.
 *
 * Returned whether or not the window is open: a candidate arriving early needs the countdown
 * and the rules, and one arriving late needs to be told plainly rather than shown a dead page.
 */
export const getExamOverview = async (req: Request, res: Response) => {
  try {
    const attempt = await exams.attemptByToken(req.params.token);
    const exam = await exams.examForAttempt(attempt);
    const h = await Hackathon.findById(exam.hackathonId).lean() as any;
    const gate = exams.windowError(exam, attempt);

    res.json({
      success: true,
      data: {
        candidate: { name: attempt.memberName, teamName: attempt.teamName, teamCode: attempt.registrationCode },
        hackathon: { title: h?.title, bannerUrl: h?.bannerUrl },
        exam: {
          title: exam.title, instructions: exam.instructions,
          startAt: exam.startAt, endAt: exam.endAt,
          durationMins: exam.durationMins, navigation: exam.navigation,
          sections: (exam.sections || []).map((s: any) => ({ key: s.key, label: s.label, count: s.drawCount })),
          totalQuestions: attempt.drawnItems.length,
          totalMarks: attempt.drawnItems.reduce((s, d) => s + d.marks, 0),
          runPolicy: exam.runPolicy,
          proctoring: exam.proctoring,
        },
        attempt: {
          status: attempt.status,
          startedAt: attempt.startedAt,
          submittedAt: attempt.submittedAt,
          endsAt: attempt.expiresAt,
          violations: attempt.violationCount,
        },
        gate: gate ? { code: gate.code, message: gate.message } : null,
      },
    });
  } catch (e) { fail(res, e); }
};

/** Begin or resume, and hand over the paper. */
export const startExam = async (req: Request, res: Response) => {
  try {
    const attempt = await exams.attemptByToken(req.params.token);
    const exam = await exams.examForAttempt(attempt);

    const sessionId = String(req.body?.sessionId || req.headers['x-session-id'] || '');
    if (exams.secondDeviceConflict(attempt, sessionId)) {
      await exams.recordViolation(exam, attempt, 'second_device', { sessionId });
      throw new ExamError('ANOTHER_DEVICE', 'This exam is already open on another device. Close it there first.', 409);
    }

    const { startedAt, endsAt, resumed } = await exams.startAttempt(exam, attempt, {
      sessionId,
      ip: ip(req),
      userAgent: String(req.headers['user-agent'] || ''),
      fingerprint: String(req.body?.fingerprint || ''),
    });

    const questions = await exams.buildPaper(exam, attempt);
    res.json({ success: true, data: { startedAt, endsAt, resumed, serverNow: new Date(), questions } });
  } catch (e) { fail(res, e); }
};

/**
 * Keep the session alive, and let the server end a paper whose time is up.
 *
 * The countdown a candidate sees is drawn from `serverNow` and `endsAt`, never from their own
 * clock — which can be wrong, and can be changed.
 */
export const examHeartbeat = async (req: Request, res: Response) => {
  try {
    const attempt = await exams.attemptByToken(req.params.token);
    const exam = await exams.examForAttempt(attempt);
    const sessionId = String(req.body?.sessionId || req.headers['x-session-id'] || '');

    if (attempt.submittedAt) {
      return res.json({ success: true, data: { submitted: true, serverNow: new Date() } });
    }
    if (exams.secondDeviceConflict(attempt, sessionId)) {
      throw new ExamError('ANOTHER_DEVICE', 'This exam is open on another device.', 409);
    }

    const now = new Date();
    if (attempt.expiresAt && now >= new Date(attempt.expiresAt)) {
      await exams.submitAttempt(exam, attempt, 'auto', 'Time ran out.');
      return res.json({ success: true, data: { submitted: true, reason: 'TIME_UP', serverNow: now } });
    }

    attempt.lastHeartbeat = now;
    attempt.activeSessionId = sessionId || attempt.activeSessionId;
    await attempt.save();
    res.json({ success: true, data: { submitted: false, endsAt: attempt.expiresAt, serverNow: now } });
  } catch (e) { fail(res, e); }
};

/** Autosave one answer. Called constantly; deliberately cheap and always idempotent. */
export const saveExamAnswer = async (req: Request, res: Response) => {
  try {
    const attempt = await exams.attemptByToken(req.params.token);
    const { itemId, selectedOptionIds, code, language, text } = req.body || {};
    await exams.saveAnswer(attempt, String(itemId), { selectedOptionIds, code, language, text });
    res.json({ success: true, data: { saved: true, at: new Date() } });
  } catch (e) { fail(res, e); }
};

/** Report a proctoring signal. The server decides what it costs. */
export const reportExamViolation = async (req: Request, res: Response) => {
  try {
    const attempt = await exams.attemptByToken(req.params.token);
    const exam = await exams.examForAttempt(attempt);
    const outcome = await exams.recordViolation(exam, attempt, String(req.body?.kind) as any, req.body?.meta);
    res.json({ success: true, data: outcome });
  } catch (e) { fail(res, e); }
};

/** Run the candidate's code against the visible sample cases, within the run policy. */
export const runExamCode = async (req: Request, res: Response) => {
  try {
    const attempt = await exams.attemptByToken(req.params.token);
    const exam = await exams.examForAttempt(attempt);
    const { itemId, code, language } = req.body || {};
    const out = await exams.runCandidateCode(exam, attempt, String(itemId), String(code || ''), language);
    res.json({ success: true, data: out });
  } catch (e) { fail(res, e); }
};

/**
 * Finish.
 *
 * Returns no score. Grading has not run, and results are released by an admin — telling a
 * candidate anything here would be either a lie or a leak.
 */
export const submitExam = async (req: Request, res: Response) => {
  try {
    const attempt = await exams.attemptByToken(req.params.token);
    const exam = await exams.examForAttempt(attempt);
    const r = await exams.submitAttempt(exam, attempt, 'candidate');
    res.json({
      success: true,
      data: {
        submittedAt: r.submittedAt,
        timeSpentSec: r.timeSpentSec,
        answered: attempt.answers.filter(a => a.selectedOptionIds?.length || a.code || a.text).length,
        totalQuestions: attempt.drawnItems.length,
        message: 'Your answers are in. Results will be published by the organisers.',
      },
    });
  } catch (e) { fail(res, e); }
};

/**
 * The candidate's own result — and only once an admin has published.
 *
 * Before that it reports "submitted" and nothing else, because a leaderboard position that
 * moves while grading is still running is worse than no number at all.
 */
export const getExamResult = async (req: Request, res: Response) => {
  try {
    const attempt = await exams.attemptByToken(req.params.token);
    const exam = await exams.examForAttempt(attempt);

    if (!attempt.submittedAt) throw new ExamError('NOT_SUBMITTED', 'You have not submitted this exam yet.', 400);

    if (exam.status !== 'published' || !exam.publishedAt) {
      return res.json({
        success: true,
        data: { published: false, submittedAt: attempt.submittedAt, timeSpentSec: attempt.timeSpentSec,
          message: 'Your answers are recorded. Results will be published by the organisers.' },
      });
    }

    const teamAttempts = await HackathonExamAttempt.find({
      examId: exam._id, registrationCode: attempt.registrationCode,
    }).lean() as any[];
    const { computeTeamResult } = await import('../services/hackathonExamGradingService');
    const team = computeTeamResult(exam, teamAttempts);

    res.json({
      success: true,
      data: {
        published: true,
        member: {
          name: attempt.memberName,
          score: attempt.score ?? 0,
          totalMarks: attempt.totalMarks ?? 0,
          percentage: attempt.percentage ?? 0,
          timeSpentSec: attempt.timeSpentSec ?? 0,
        },
        team: {
          name: team.teamName, code: team.registrationCode,
          teamScore: team.teamScore, registeredMembers: team.registeredMembers,
          attemptedMembers: team.attemptedMembers,
        },
      },
    });
  } catch (e) { fail(res, e); }
};
