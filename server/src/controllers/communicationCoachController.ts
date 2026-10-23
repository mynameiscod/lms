import { Request, Response } from 'express';
import crypto from 'crypto';
import fs from 'fs';
import mongoose from 'mongoose';
import CommunicationAttempt from '../models/CommunicationAttempt';
import CommunicationProfile from '../models/CommunicationProfile';
import CommunicationStreak from '../models/CommunicationStreak';
import User from '../models/User';
import * as bunny from '../services/bunnyStorageService';
import { transcribeFile } from '../services/speakingService';
import { computeSpeechMetrics } from '../services/communicationEvalService';
import { computeSignals } from '../services/communicationSignalsService';
import { coachCompare, coachStudentDetail, setReadinessOverride } from '../services/communicationCoachService';
import {
  AREAS, AREA_TYPE, Area, MAX_COACH_ATTEMPTS_PER_DAY, isNoSpeechTranscript, isSilentAudio, buildPrompt, coachOverview, coachToday, ensureCoachChallenges, evaluateCoachAnswer,
  getCoachState, readinessFor, signalTips, skillsOf, toEvaluation,
} from '../services/communicationCoachService';
import { evaluateAchievements } from '../services/communicationGamificationService';
import { bumpStreak } from './communicationController';
import { createNotifications } from '../notifications/notificationService';

const tId = (req: Request) => (req as any).tenantId as string;
const uId = (req: Request) => (req as any).user?.id as string;
const cleanup = (p?: string) => { if (p) fs.promises.unlink(p).catch(() => {}); };

/** The student's Coach page: where they are, what to do today. */
export const getCoach = async (req: Request, res: Response) => {
  try { res.json(await getCoachState(tId(req), uId(req))); }
  catch (err: any) { res.status(500).json({ message: err.message }); }
};

/** Recordings being analysed right now, per student: a double click must not make two attempts. */
const inflight = new Set<string>();

/**
 * One recording of a coach session: transcribe with word timings, measure, evaluate, keep it in
 * Bunny, store. Audio or video. Each answer is recorded ONCE: a step already done is refused, and
 * nothing is stored (so nothing is "used up") when we could not hear the student or the evaluator
 * was unavailable: those are our failures, not theirs.
 */
export const submitCoach = async (req: Request, res: Response) => {
  const file = (req as any).file as Express.Multer.File | undefined;
  const tenantId = tId(req); const studentId = uId(req);
  const lock = `${tenantId}:${studentId}`;
  let locked = false;
  try {
    if (!file) return res.status(400).json({ message: 'A recording is required' });
    if (!bunny.isBunnyStorageConfigured()) { cleanup(file.path); return res.status(400).json({ message: 'Recording storage is not configured (Bunny Storage).' }); }
    const area = String(req.body?.area || '') as Area;
    if (!AREAS.includes(area)) { cleanup(file.path); return res.status(400).json({ message: 'Unknown practice area' }); }
    if (inflight.has(lock)) { cleanup(file.path); return res.status(409).json({ message: 'Your last recording is still being analysed. Please wait a moment.' }); }
    inflight.add(lock); locked = true;

    // The step must be one the student's own state offers, and not yet done.
    const state = await getCoachState(tenantId, studentId);
    const idx = Number(req.body?.step);
    const step = state.steps.find((x: any) => x.area === area && x.index === idx && !x.done) || state.steps.find((x: any) => x.area === area && !x.done);
    if (!step) { cleanup(file.path); return res.status(409).json({ message: 'This answer is already recorded. Each one is recorded once and cannot be redone. Move on to the next step.' }); }
    if (state.practisedToday >= MAX_COACH_ATTEMPTS_PER_DAY) { cleanup(file.path); return res.status(429).json({ message: `You have done ${MAX_COACH_ATTEMPTS_PER_DAY} recordings today: that is plenty. Come back tomorrow.` }); }
    const isBaseline = state.mode === 'baseline';
    const prompt = step.prompt;
    const recordingType = req.body?.recordingType === 'video' ? 'video' : 'audio';

    // 1) Words with timings → measured hesitation
    let transcript = ''; let durationSec = 0; let words: any[] | undefined;
    try { const t = await transcribeFile(file.path, tenantId, 'communication_stt', { words: true }); transcript = t.text; durationSec = t.durationSec; words = t.words; } catch { /* handled below */ }
    // Nothing to judge: a muted or wrong microphone gives digital silence, which the speech service turns into "you you you".
    if (transcript.trim().length < 10 || isNoSpeechTranscript(transcript, durationSec) || isSilentAudio(file.size, durationSec, recordingType)) {
      cleanup(file.path);
      return res.status(422).json({ message: 'We could not hear your voice in that recording, so it was not counted. Check that your microphone is not muted and the right one is selected, say a few words while watching the level bar, then record this answer again.' });
    }
    const metrics = computeSpeechMetrics(transcript, durationSec);
    const signals = computeSignals({ words, transcript, durationSec, targetSec: prompt.targetSec, fillerTotal: metrics.fillerWords.total });

    // 2) Judge the content, with the measurements in hand
    const profile = await CommunicationProfile.findOne({ tenantId, studentId }).lean();
    const ev = await evaluateCoachAnswer({ tenantId, prompt, profile, transcript, durationSec, signals, wordsPerMinute: metrics.wordsPerMinute });
    if (!ev.provider) {
      cleanup(file.path);
      return res.status(502).json({ message: 'Our evaluator is busy right now, so nothing was counted. Please try this answer again in a minute.' });
    }
    const skills = skillsOf(ev, signals);
    const tips = signalTips(signals);

    // 3) Keep the recording (video or audio) in Bunny, only now that it is going to count
    const ext = recordingType === 'video' ? 'webm' : 'webm';
    const key = `communication/${tenantId}/${studentId}/coach/${Date.now()}-${crypto.randomBytes(4).toString('hex')}.${ext}`;
    await bunny.uploadStream(key, fs.createReadStream(file.path), file.mimetype || (recordingType === 'video' ? 'video/webm' : 'audio/webm'), file.size);
    cleanup(file.path);

    const holders = await ensureCoachChallenges(tenantId, studentId);
    const u: any = await User.findById(studentId).select('batchId').lean();
    const practiceDate = coachToday();
    const attempt = await CommunicationAttempt.create({
      tenantId, studentId, batchId: u?.batchId, challengeId: holders[area], kind: 'coach',
      challengeTitle: `${isBaseline ? 'Baseline' : step.role}: ${prompt.title}`, challengeType: AREA_TYPE[area], practiceDate,
      attemptNumber: 1, recordingType, recordingKey: key, recordingName: file.originalname, sizeBytes: file.size, recordingDuration: durationSec,
      transcript, wordCount: metrics.wordCount, wordsPerMinute: metrics.wordsPerMinute, status: 'completed',
      evaluation: toEvaluation(ev, signals, metrics, area), submittedAt: new Date(),
      coach: { area, level: prompt.level, step: step.index, isBaseline, role: step.role, ask: prompt.ask, followUp: prompt.followUp, signals, skills, tips },
    });

    await bumpStreak(tenantId, studentId, practiceDate);
    const st: any = await CommunicationStreak.findOne({ tenantId, studentId }).lean();
    if (st) evaluateAchievements(tenantId, studentId, st, attempt.evaluation as any).catch(() => {});
    createNotifications(tenantId, [studentId], 'general', 'Your speaking practice was scored', `${prompt.title}: ${ev.overall}/100. ${ev.coachMessage || ''}`.slice(0, 280), '/ai-communication-lab').catch(() => {});

    const out = attempt.toObject() as any; delete out.recordingKey;
    res.status(201).json({ attempt: out, next: await getCoachState(tenantId, studentId) });
  } catch (err: any) {
    cleanup(file?.path);
    res.status(500).json({ message: err.message || 'Failed to submit recording' });
  } finally {
    if (locked) inflight.delete(lock);
  }
};

/** The student's own comparison: today vs yesterday, this week vs last, this month vs last. */
export const getCoachCompare = async (req: Request, res: Response) => {
  try { res.json({ comparisons: await coachCompare(tId(req), uId(req)) }); }
  catch (err: any) { res.status(500).json({ message: err.message }); }
};

/** Trainer: who needs help, who has gone quiet, who is ready. */
export const adminCoachOverview = async (req: Request, res: Response) => {
  try { res.json(await coachOverview(tId(req), req.query.batchId as string | undefined)); }
  catch (err: any) { res.status(500).json({ message: err.message }); }
};

/** Placement: is this one student ready to face a company? */
export const adminStudentReadiness = async (req: Request, res: Response) => {
  try {
    if (!mongoose.isValidObjectId(req.params.studentId)) return res.status(400).json({ message: 'Invalid student' });
    res.json(await readinessFor(tId(req), req.params.studentId));
  } catch (err: any) { res.status(500).json({ message: err.message }); }
};

/** Trainer: one student's picture: skills, steadiness over time, and recent recordings with what was measured. */
export const adminCoachStudent = async (req: Request, res: Response) => {
  try {
    if (!mongoose.isValidObjectId(req.params.studentId)) return res.status(400).json({ message: 'Invalid student' });
    const d = await coachStudentDetail(tId(req), req.params.studentId);
    if (!d) return res.status(404).json({ message: 'Student not found' });
    res.json(d);
  } catch (err: any) { res.status(500).json({ message: err.message }); }
};

/** Trainer: release one student from the readiness gate for some days (0 removes it). Needs a reason; it is audited. */
export const adminReadinessOverride = async (req: Request, res: Response) => {
  try {
    const { studentId, days, reason } = req.body || {};
    if (!mongoose.isValidObjectId(studentId)) return res.status(400).json({ message: 'Invalid student' });
    if (Number(days) > 0 && !String(reason || '').trim()) return res.status(400).json({ message: 'Give a reason: it is kept on the record.' });
    const exists = await User.exists({ _id: studentId, tenantId: tId(req), role: 'STUDENT' });
    if (!exists) return res.status(404).json({ message: 'Student not found' });
    res.json(await setReadinessOverride(tId(req), studentId, Number(days) || 0, String(reason || ''), uId(req)));
  } catch (err: any) { res.status(500).json({ message: err.message }); }
};
