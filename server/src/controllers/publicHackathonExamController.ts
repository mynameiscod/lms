import { Request, Response } from 'express';
import { putChunk, proctorStorageConfigured } from '../services/proctorStorageService';
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
    const r = await sendOtp(String(exam.tenantId), attempt.examToken, attempt.memberMobile, attempt.memberEmail);

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
 * Verifying by exam token, for somebody who arrived on their own link.
 *
 * ── WHY THESE EXIST ALONGSIDE THE SLUG/TEAM-CODE PAIR ─────────────────────────────────────
 *
 * The invite sends a personal link, and that link is enough to READ the instructions but not
 * to start: a WhatsApp message can be forwarded, so the exam still wants the OTP as proof of
 * who is sitting down. Until now the only way to give that proof was the entry form, which
 * asks for the event slug and the team code — two things a candidate who followed their own
 * link has never seen and has no reason to know. They reached the instructions, pressed
 * Start, and were told to verify a mobile number with nothing on the page to verify it with.
 *
 * Nothing about the check is new or weaker. The OTP was always keyed on the attempt's own
 * token — sendOtp and verifyOtp take it directly — and the slug and team code were only ever
 * a way to FIND the attempt. The token identifies it already, so these two hand the same
 * machinery the same key by a shorter route. The code still goes to the registered mobile on
 * the attempt, never to a number supplied by the caller.
 */
export const requestExamOtpByToken = async (req: Request, res: Response) => {
  try {
    const attempt = await exams.attemptByToken(req.params.token);
    const r = await sendOtp(String(attempt.tenantId), attempt.examToken, attempt.memberMobile, attempt.memberEmail);
    res.json({
      success: true,
      data: {
        sent: true,
        channel: r?.channel || 'whatsapp',
        maskedMobile: attempt.memberMobile.replace(/\d(?=\d{4})/g, '•'),
      },
    });
  } catch (e) { fail(res, e); }
};

export const verifyExamOtpByToken = async (req: Request, res: Response) => {
  try {
    const attempt = await exams.attemptByToken(req.params.token);
    const result = await verifyOtp(attempt.examToken, String(req.body?.code || ''));
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
        hackathon: { title: h?.title, bannerUrl: h?.bannerUrl, collegeLogoUrl: h?.collegeLogoUrl },
        exam: {
          title: exam.title, instructions: exam.instructions,
          startAt: exam.startAt, endAt: exam.endAt,
          durationMins: exam.durationMins, navigation: exam.navigation,
          /*
           * Marks are counted from THIS candidate's drawn paper, not from the section's
           * configured marksPerItem. A section can be set to use each item's own marks, in
           * which case the configured number is 0 and telling a candidate their coding
           * problem is worth nothing would be worse than telling them nothing.
           */
          sections: (exam.sections || []).map((s: any) => {
            const mine = attempt.drawnItems.filter((d: any) => d.sectionKey === s.key);
            return {
              key: s.key,
              label: s.label,
              count: mine.length || s.drawCount,
              marks: mine.reduce((t: number, d: any) => t + (d.marks || 0), 0),
            };
          }),
          joinCutoffMins: exam.joinCutoffMins,
          teamScoreDenominator: exam.teamScoreDenominator,
          totalQuestions: attempt.drawnItems.length,
          totalMarks: attempt.drawnItems.reduce((s, d) => s + d.marks, 0),
          runPolicy: exam.runPolicy,
          proctoring: exam.proctoring,
        },
        attempt: {
          otpVerified: !!attempt.otpVerifiedAt,
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

/* ── proctoring recordings ─────────────────────────────────────────────────── */

/**
 * POST /hackathon-exams/attempt/:token/recording/state
 *
 * The browser saying what happened to the camera. Three outcomes matter and they are not
 * the same: recording, the candidate refused, or the device could not do it. A refusal is a
 * decision somebody made and a broken webcam is not, and a reviewer who cannot tell them
 * apart will eventually read one as the other.
 *
 * Refusal never blocks the paper. A denied prompt or a dead camera would otherwise stop a
 * legitimate candidate sitting an exam that is happening now, and that gets discovered in
 * the room, with forty people waiting. It is recorded and flagged instead, and what a
 * no-camera attempt is worth stays a human decision afterwards.
 */
export const setRecordingState = async (req: Request, res: Response) => {
  try {
    const attempt = await exams.attemptByToken(req.params.token);
    const state = String(req.body?.state || '');
    if (!['recording', 'done', 'denied', 'unavailable'].includes(state)) {
      return res.status(400).json({ success: false, message: 'Unknown recording state.' });
    }

    attempt.recording.state = state as any;
    if (state === 'recording' && !attempt.recording.startedAt) attempt.recording.startedAt = new Date();
    if (state === 'done' || state === 'denied' || state === 'unavailable') attempt.recording.endedAt = new Date();
    if (req.body?.note) attempt.recording.note = String(req.body.note).slice(0, 300);
    await attempt.save();

    res.json({ success: true, data: { state: attempt.recording.state } });
  } catch (e) { fail(res, e); }
};

/**
 * POST /hackathon-exams/attempt/:token/recording/chunk
 *
 * One slice of video. Uploaded as it is produced rather than held to the end: a paper that
 * uploads an hour of video on submit loses the lot when the laptop dies, and the laptop
 * dying is one of the cases the recording exists to explain.
 *
 * The sequence number comes from the browser and is trusted only as a filename. It cannot
 * reach anything but this attempt's own prefix, and a repeat simply overwrites itself — a
 * flaky connection retrying is the normal case, not an attack.
 *
 * Failure here must never interrupt the exam. If the storage is down, or the zone is full,
 * or the chunk is too big, the candidate keeps writing their paper and the attempt carries
 * a note saying the footage is incomplete. Losing evidence is bad; losing somebody's exam
 * to protect the evidence is worse.
 */
export const uploadRecordingChunk = async (req: Request, res: Response) => {
  try {
    const attempt = await exams.attemptByToken(req.params.token);
    const file = (req as any).file;
    if (!file?.buffer?.length) return res.status(400).json({ success: false, message: 'No chunk received.' });

    const seq = Number(req.body?.seq);
    if (!Number.isInteger(seq) || seq < 1 || seq > 100000) {
      return res.status(400).json({ success: false, message: 'Bad chunk sequence.' });
    }

    if (!proctorStorageConfigured()) {
      return res.status(503).json({ success: false, message: 'Recording storage is not configured.' });
    }

    const { bytes } = await putChunk(String(attempt.examId), String(attempt._id), seq, file.buffer);
    attempt.recording.chunks = Math.max(attempt.recording.chunks || 0, seq);
    attempt.recording.bytes = (attempt.recording.bytes || 0) + bytes;
    if (attempt.recording.state === 'off') attempt.recording.state = 'recording';
    if (!attempt.recording.startedAt) attempt.recording.startedAt = new Date();
    await attempt.save();

    res.json({ success: true, data: { seq, bytes } });
  } catch (e) { fail(res, e); }
};
