import { Request, Response } from 'express';
import crypto from 'crypto';
import fs from 'fs';
import mongoose from 'mongoose';
import CommunicationProfile from '../models/CommunicationProfile';
import CommunicationChallenge from '../models/CommunicationChallenge';
import CommunicationAttempt from '../models/CommunicationAttempt';
import CommunicationStreak from '../models/CommunicationStreak';
import User from '../models/User';
import * as bunny from '../services/bunnyStorageService';
import { transcribeFile } from '../services/speakingService';
import { evaluateIntroduction, computeSpeechMetrics, generateTemplate } from '../services/communicationEvalService';
import { ensureSeedChallenges } from '../seed/communicationChallenges';
import { createNotifications } from '../notifications/notificationService';

const tId = (req: Request) => (req as any).tenantId as string;
const uId = (req: Request) => (req as any).user?.id as string;
const role = (req: Request) => (req as any).user?.role as string;
const isAdminish = (req: Request) => ['SUPER_ADMIN', 'TENANT_ADMIN', 'INSTRUCTOR'].includes(role(req));

const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const validDate = (s: any) => (typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : ymd(new Date()));
function ymdMinus(dateStr: string, n: number): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() - n);
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, '0')}-${String(dt.getUTCDate()).padStart(2, '0')}`;
}
const arr = (v: any) => (Array.isArray(v) ? v : typeof v === 'string' && v ? v.split(',').map((s) => s.trim()).filter(Boolean) : []);
const cleanup = (p?: string) => { if (p) fs.promises.unlink(p).catch(() => {}); };

// ── Today's challenge (rotates per student's progress) ────────────────────────
export const getToday = async (req: Request, res: Response) => {
  try {
    const tenantId = tId(req);
    await ensureSeedChallenges(tenantId, uId(req));
    const today = validDate(req.query.date);

    const me: any = await User.findById(uId(req)).select('batchId').lean();
    const batchFilter: any = me?.batchId
      ? { $or: [{ batchIds: { $size: 0 } }, { batchIds: me.batchId }] }
      : { batchIds: { $size: 0 } };
    const challenges = await CommunicationChallenge.find({ tenantId, challengeType: 'self_introduction', active: true, ...batchFilter })
      .sort({ sequenceNumber: 1 }).lean();
    if (!challenges.length) return res.json({ challenge: null, status: 'not_started' });

    const streak = await CommunicationStreak.findOne({ tenantId, studentId: uId(req) }).lean();

    // Already practised today? then today's challenge is that attempt's challenge.
    const todaysAttempt = await CommunicationAttempt.findOne({ tenantId, studentId: uId(req), practiceDate: today })
      .sort({ createdAt: -1 }).lean();

    let challenge: any;
    let status = 'not_started';
    if (todaysAttempt) {
      challenge = challenges.find((c) => String(c._id) === String(todaysAttempt.challengeId)) || challenges[0];
      status = todaysAttempt.status === 'completed' ? 'completed'
        : todaysAttempt.status === 'failed' ? 'not_started' : 'evaluating';
    } else {
      const idx = ((streak?.totalCompletedDays || 0)) % challenges.length;
      challenge = challenges[idx];
    }

    const lastCompleted = await CommunicationAttempt.findOne({ tenantId, studentId: uId(req), status: 'completed' })
      .sort({ createdAt: -1 }).select('evaluation.overallScore').lean();

    res.json({
      date: today,
      status,
      challenge: {
        _id: challenge._id, title: challenge.title, description: challenge.description,
        instructions: challenge.instructions, suggestedPoints: challenge.suggestedPoints,
        challengeType: challenge.challengeType,
        minSeconds: challenge.minSeconds, targetSeconds: challenge.targetSeconds, maxSeconds: challenge.maxSeconds,
        maxAttempts: challenge.maxAttempts, recordingModes: challenge.recordingModes,
      },
      currentStreak: streak?.currentStreak || 0,
      longestStreak: streak?.longestStreak || 0,
      lastScore: (lastCompleted as any)?.evaluation?.overallScore ?? null,
      todaysAttemptId: todaysAttempt ? String(todaysAttempt._id) : null,
    });
  } catch (err: any) { res.status(500).json({ message: err.message }); }
};

// ── Communication profile ─────────────────────────────────────────────────────
export const getProfile = async (req: Request, res: Response) => {
  try {
    const profile = await CommunicationProfile.findOne({ tenantId: tId(req), studentId: uId(req) }).lean();
    res.json({ profile: profile || null, template: generateTemplate(profile as any) });
  } catch (err: any) { res.status(500).json({ message: err.message }); }
};

export const updateProfile = async (req: Request, res: Response) => {
  try {
    const b = req.body || {};
    const set: any = {};
    const strFields = ['fullName', 'currentCity', 'nativePlace', 'degree', 'specialization', 'college', 'graduationYear', 'cgpaOrPercentage', 'trainingInstitute', 'internshipDetails', 'projectName', 'projectObjective', 'projectResponsibilities', 'shortTermGoal', 'longTermGoal', 'targetRole'];
    const listFields = ['primarySkills', 'secondarySkills', 'projectTechnologies', 'strengths', 'targetCompanies'];
    strFields.forEach((f) => { if (f in b) set[f] = String(b[f] || '').slice(0, 500); });
    listFields.forEach((f) => { if (f in b) set[f] = arr(b[f]).slice(0, 30); });

    const u: any = await User.findById(uId(req)).select('batchId').lean();
    const profile = await CommunicationProfile.findOneAndUpdate(
      { tenantId: tId(req), studentId: uId(req) },
      { $set: { ...set, batchId: u?.batchId } },
      { upsert: true, new: true }
    ).lean();
    res.json({ profile, template: generateTemplate(profile as any) });
  } catch (err: any) { res.status(500).json({ message: err.message }); }
};

// ── Submit a recording → transcribe → store → evaluate → streak ───────────────
export const submit = async (req: Request, res: Response) => {
  const file = (req as any).file as Express.Multer.File | undefined;
  try {
    const tenantId = tId(req);
    const { challengeId, recordingType } = req.body || {};
    const practiceDate = validDate(req.body?.practiceDate);
    if (!file) return res.status(400).json({ message: 'A recording is required' });
    if (!challengeId || !mongoose.isValidObjectId(challengeId)) { cleanup(file.path); return res.status(400).json({ message: 'challengeId is required' }); }
    if (!bunny.isBunnyStorageConfigured()) { cleanup(file.path); return res.status(400).json({ message: 'Recording storage is not configured (Bunny Storage).' }); }

    const challenge = await CommunicationChallenge.findOne({ _id: challengeId, tenantId }).lean();
    if (!challenge) { cleanup(file.path); return res.status(404).json({ message: 'Challenge not found' }); }

    // Enforce max attempts per challenge per day
    const priorCount = await CommunicationAttempt.countDocuments({ tenantId, studentId: uId(req), challengeId, practiceDate });
    if (priorCount >= (challenge.maxAttempts || 2)) { cleanup(file.path); return res.status(429).json({ message: `Maximum ${challenge.maxAttempts} attempts reached for today.` }); }

    // 1) Transcribe (Whisper) from the temp file
    let transcript = ''; let durationSec = 0;
    try { const t = await transcribeFile(file.path, tenantId, 'communication_stt'); transcript = t.text; durationSec = t.durationSec; } catch { /* eval will note low content */ }
    const metrics = computeSpeechMetrics(transcript, durationSec);

    // 2) Upload to Bunny
    const key = `communication/${tenantId}/${uId(req)}/${challengeId}/${Date.now()}-${crypto.randomBytes(4).toString('hex')}.webm`;
    await bunny.uploadStream(key, fs.createReadStream(file.path), file.mimetype || 'video/webm', file.size);
    cleanup(file.path);

    // 3) AI evaluation with the student's profile as context
    const profile = await CommunicationProfile.findOne({ tenantId, studentId: uId(req) }).lean();
    const evaluation = await evaluateIntroduction(profile as any, challenge as any, transcript, durationSec, recordingType === 'audio' ? 'audio' : 'video', tenantId);

    const u: any = await User.findById(uId(req)).select('batchId').lean();
    const attempt = await CommunicationAttempt.create({
      tenantId, studentId: uId(req), batchId: u?.batchId, challengeId,
      challengeTitle: challenge.title, challengeType: challenge.challengeType, practiceDate,
      attemptNumber: priorCount + 1,
      recordingType: recordingType === 'audio' ? 'audio' : 'video',
      recordingKey: key, recordingName: file.originalname, sizeBytes: file.size, recordingDuration: durationSec,
      transcript, detectedLanguage: 'en', wordCount: metrics.wordCount, wordsPerMinute: metrics.wordsPerMinute,
      status: 'completed', evaluation, submittedAt: new Date(),
    });

    // 4) Update the daily streak (server-authoritative)
    await bumpStreak(tenantId, uId(req), practiceDate);

    // 5) Notify
    createNotifications(tenantId, [uId(req)], 'general',
      'Your communication practice was scored',
      `${challenge.title}: ${evaluation.overallScore}/100 — ${evaluation.dailyCoachMessage || 'Keep practising daily.'}`,
      '/ai-communication-lab'
    ).catch(() => {});

    const out = attempt.toObject() as any; delete out.recordingKey;
    res.status(201).json({ attempt: out });
  } catch (err: any) {
    cleanup(file?.path);
    res.status(500).json({ message: err.message || 'Failed to submit recording' });
  }
};

async function bumpStreak(tenantId: string, studentId: string, practiceDate: string) {
  const s = await CommunicationStreak.findOne({ tenantId, studentId });
  if (!s) {
    await CommunicationStreak.create({ tenantId, studentId, currentStreak: 1, longestStreak: 1, totalCompletedDays: 1, lastCompletedDate: practiceDate, completedDates: [practiceDate] });
    return;
  }
  if (s.completedDates.includes(practiceDate)) return; // already counted this day
  const yesterday = ymdMinus(practiceDate, 1);
  if (s.lastCompletedDate === yesterday) s.currentStreak += 1;
  else if (!s.lastCompletedDate || s.lastCompletedDate < practiceDate) s.currentStreak = 1;
  s.totalCompletedDays += 1;
  s.completedDates = [...s.completedDates, practiceDate].slice(-400);
  if (!s.lastCompletedDate || practiceDate > s.lastCompletedDate) s.lastCompletedDate = practiceDate;
  s.longestStreak = Math.max(s.longestStreak, s.currentStreak);
  await s.save();
}

// ── History + single result ──────────────────────────────────────────────────
export const getHistory = async (req: Request, res: Response) => {
  try {
    const q: any = { tenantId: tId(req), studentId: uId(req) };
    if (req.query.type) q.recordingType = req.query.type;
    const items = await CommunicationAttempt.find(q).sort({ createdAt: -1 }).limit(100).select('-recordingKey -transcript').lean();
    res.json({ attempts: items });
  } catch (err: any) { res.status(500).json({ message: err.message }); }
};

export const getAttempt = async (req: Request, res: Response) => {
  try {
    const a = await CommunicationAttempt.findOne({ _id: req.params.id, tenantId: tId(req) }).select('-recordingKey').lean();
    if (!a) return res.status(404).json({ message: 'Not found' });
    if (!isAdminish(req) && String((a as any).studentId) !== uId(req)) return res.status(403).json({ message: 'Forbidden' });
    res.json({ attempt: a });
  } catch (err: any) { res.status(500).json({ message: err.message }); }
};

export const playRecording = async (req: Request, res: Response) => {
  try {
    const a = await CommunicationAttempt.findOne({ _id: req.params.id, tenantId: tId(req) }).select('recordingKey studentId recordingType').lean();
    if (!a) return res.status(404).json({ message: 'Not found' });
    if (!isAdminish(req) && String((a as any).studentId) !== uId(req)) return res.status(403).json({ message: 'Forbidden' });
    const { stream } = await bunny.getFileStream((a as any).recordingKey);
    res.setHeader('Content-Type', (a as any).recordingType === 'audio' ? 'audio/webm' : 'video/webm');
    stream.on('error', () => { if (!res.headersSent) res.status(502).end(); });
    stream.pipe(res);
  } catch (err: any) { res.status(500).json({ message: err.message }); }
};

// ── Progress report ───────────────────────────────────────────────────────────
export const getProgress = async (req: Request, res: Response) => {
  try {
    const tenantId = tId(req);
    const attempts = await CommunicationAttempt.find({ tenantId, studentId: uId(req), status: 'completed' })
      .sort({ createdAt: 1 }).select('practiceDate evaluation.overallScore evaluation.confidenceScore evaluation.grammarScore evaluation.fluencyScore evaluation.clarityScore evaluation.projectExplanationScore wordsPerMinute createdAt').lean();
    const streak = await CommunicationStreak.findOne({ tenantId, studentId: uId(req) }).lean();

    const scores = attempts.map((a: any) => a.evaluation?.overallScore || 0);
    const best = scores.length ? Math.max(...scores) : 0;
    const latest = scores.length ? scores[scores.length - 1] : 0;
    const first = scores.length ? scores[0] : 0;
    const avg = scores.length ? Math.round(scores.reduce((x, y) => x + y, 0) / scores.length) : 0;

    // Strongest / weakest skill from the latest attempt's sub-scores
    const last: any = attempts[attempts.length - 1]?.evaluation || {};
    const skillMap: Record<string, number> = {
      Confidence: last.confidenceScore, Clarity: last.clarityScore, Fluency: last.fluencyScore,
      Grammar: last.grammarScore, 'Project Explanation': last.projectExplanationScore,
    };
    const validSkills = Object.entries(skillMap).filter(([, v]) => typeof v === 'number');
    const strongest = validSkills.sort((a, b) => (b[1] as number) - (a[1] as number))[0]?.[0] || null;
    const weakest = validSkills.sort((a, b) => (a[1] as number) - (b[1] as number))[0]?.[0] || null;

    const level = best >= 90 ? 'Advanced Communicator' : best >= 80 ? 'Interview Ready' : best >= 65 ? 'Confident Speaker' : best >= 45 ? 'Developing Speaker' : 'Beginner Speaker';

    res.json({
      timeline: attempts.map((a: any) => ({ date: a.practiceDate, score: a.evaluation?.overallScore || 0 })),
      totalPracticeDays: streak?.totalCompletedDays || 0,
      currentStreak: streak?.currentStreak || 0,
      longestStreak: streak?.longestStreak || 0,
      best, latest, avg, improvement: latest - first,
      strongestSkill: strongest, weakestSkill: weakest, recommendedFocus: weakest,
      level, totalSpeakingTimeSec: 0,
    });
  } catch (err: any) { res.status(500).json({ message: err.message }); }
};

// ── Admin: challenge management ───────────────────────────────────────────────
export const listChallenges = async (req: Request, res: Response) => {
  try {
    await ensureSeedChallenges(tId(req), uId(req));
    const items = await CommunicationChallenge.find({ tenantId: tId(req) }).sort({ challengeType: 1, sequenceNumber: 1 }).lean();
    res.json({ challenges: items });
  } catch (err: any) { res.status(500).json({ message: err.message }); }
};

export const createChallenge = async (req: Request, res: Response) => {
  try {
    const b = req.body || {};
    if (!b.title) return res.status(400).json({ message: 'title is required' });
    const last = await CommunicationChallenge.findOne({ tenantId: tId(req) }).sort({ sequenceNumber: -1 }).select('sequenceNumber').lean();
    const c = await CommunicationChallenge.create({
      tenantId: tId(req), title: b.title, description: b.description, challengeType: b.challengeType || 'self_introduction',
      instructions: b.instructions, suggestedPoints: arr(b.suggestedPoints),
      minSeconds: Number(b.minSeconds) || 120, targetSeconds: Number(b.targetSeconds) || 180, maxSeconds: Number(b.maxSeconds) || 210,
      maxAttempts: Number(b.maxAttempts) || 2, recordingModes: arr(b.recordingModes).length ? arr(b.recordingModes) : ['audio', 'video'],
      batchIds: arr(b.batchIds).filter((s: string) => mongoose.isValidObjectId(s)).map((s: string) => new mongoose.Types.ObjectId(s)),
      sequenceNumber: (last?.sequenceNumber || 0) + 1, active: b.active !== false, createdBy: uId(req),
    });
    res.status(201).json({ challenge: c });
  } catch (err: any) { res.status(500).json({ message: err.message }); }
};

export const updateChallenge = async (req: Request, res: Response) => {
  try {
    const allowed = ['title', 'description', 'instructions', 'suggestedPoints', 'minSeconds', 'targetSeconds', 'maxSeconds', 'maxAttempts', 'recordingModes', 'sequenceNumber', 'active', 'challengeType', 'batchIds'];
    const listKeys = ['suggestedPoints', 'recordingModes', 'batchIds'];
    const set: any = {};
    for (const k of allowed) if (k in req.body) {
      if (k === 'batchIds') set[k] = arr(req.body[k]).filter((s: string) => mongoose.isValidObjectId(s)).map((s: string) => new mongoose.Types.ObjectId(s));
      else set[k] = listKeys.includes(k) ? arr(req.body[k]) : req.body[k];
    }
    const c = await CommunicationChallenge.findOneAndUpdate({ _id: req.params.id, tenantId: tId(req) }, { $set: set }, { new: true });
    if (!c) return res.status(404).json({ message: 'Not found' });
    res.json({ challenge: c });
  } catch (err: any) { res.status(500).json({ message: err.message }); }
};

export const deleteChallenge = async (req: Request, res: Response) => {
  try {
    const c = await CommunicationChallenge.findOneAndDelete({ _id: req.params.id, tenantId: tId(req) });
    if (!c) return res.status(404).json({ message: 'Not found' });
    res.json({ ok: true });
  } catch (err: any) { res.status(500).json({ message: err.message }); }
};

export const reorderChallenges = async (req: Request, res: Response) => {
  try {
    const order: string[] = Array.isArray(req.body?.order) ? req.body.order : [];
    await Promise.all(order.map((id, i) =>
      CommunicationChallenge.updateOne({ _id: id, tenantId: tId(req) }, { $set: { sequenceNumber: i + 1 } })
    ));
    res.json({ ok: true });
  } catch (err: any) { res.status(500).json({ message: err.message }); }
};

// ── Admin: monitoring dashboard ───────────────────────────────────────────────
export const adminDashboard = async (req: Request, res: Response) => {
  try {
    const tenantId = tId(req);
    const today = validDate(req.query.date);
    const monthAgo = ymdMinus(today, 30);

    const students = await User.find({ tenantId, role: 'STUDENT', isActive: { $ne: false } }).select('_id batchId').lean();
    const totalStudents = students.length;
    const studentIds = students.map((s: any) => s._id);

    const [completedToday, monthAttempts] = await Promise.all([
      CommunicationAttempt.distinct('studentId', { tenantId, practiceDate: today, status: 'completed' }),
      CommunicationAttempt.find({ tenantId, status: 'completed', practiceDate: { $gte: monthAgo } })
        .select('studentId batchId practiceDate evaluation.overallScore').lean(),
    ]);

    const scores = monthAttempts.map((a: any) => a.evaluation?.overallScore || 0);
    const avgScore = scores.length ? Math.round(scores.reduce((x, y) => x + y, 0) / scores.length) : 0;

    // Batch-wise performance
    const batchMap: Record<string, { count: number; sum: number }> = {};
    monthAttempts.forEach((a: any) => {
      const k = String(a.batchId || 'none');
      (batchMap[k] = batchMap[k] || { count: 0, sum: 0 });
      batchMap[k].count++; batchMap[k].sum += a.evaluation?.overallScore || 0;
    });

    res.json({
      date: today,
      totalStudents,
      completedToday: completedToday.length,
      pendingToday: totalStudents - completedToday.length,
      avgScore,
      highestScore: scores.length ? Math.max(...scores) : 0,
      lowestScore: scores.length ? Math.min(...scores) : 0,
      totalAttempts30d: monthAttempts.length,
      byBatch: Object.entries(batchMap).map(([batchId, v]) => ({ batchId, attempts: v.count, avg: Math.round(v.sum / v.count) })),
      activeStudents30d: new Set(monthAttempts.map((a: any) => String(a.studentId))).size,
      _studentIds: studentIds.length, // internal sanity
    });
  } catch (err: any) { res.status(500).json({ message: err.message }); }
};

// ── Admin: per-student monitoring table ───────────────────────────────────────
export const adminStudents = async (req: Request, res: Response) => {
  try {
    const tenantId = tId(req);
    const today = validDate(req.query.date);
    const weekAgo = ymdMinus(today, 7);
    const filter: any = { tenantId, role: 'STUDENT', isActive: { $ne: false } };
    if (req.query.batchId && mongoose.isValidObjectId(String(req.query.batchId))) filter.batchId = new mongoose.Types.ObjectId(String(req.query.batchId));

    const students = await User.find(filter).select('firstName lastName email batchId').lean();
    const ids = students.map((s: any) => s._id);
    const [streaks, weekAttempts, todayDone, lastScores] = await Promise.all([
      CommunicationStreak.find({ tenantId, studentId: { $in: ids } }).lean(),
      CommunicationAttempt.find({ tenantId, studentId: { $in: ids }, status: 'completed', practiceDate: { $gte: weekAgo } }).select('studentId evaluation.overallScore').lean(),
      CommunicationAttempt.distinct('studentId', { tenantId, studentId: { $in: ids }, practiceDate: today, status: 'completed' }),
      CommunicationAttempt.aggregate([
        { $match: { tenantId: new mongoose.Types.ObjectId(tenantId), studentId: { $in: ids }, status: 'completed' } },
        { $sort: { createdAt: -1 } },
        { $group: { _id: '$studentId', last: { $first: '$evaluation.overallScore' } } },
      ]),
    ]);

    const streakMap: Record<string, any> = {}; streaks.forEach((s: any) => { streakMap[String(s.studentId)] = s; });
    const weekMap: Record<string, number[]> = {}; weekAttempts.forEach((a: any) => { (weekMap[String(a.studentId)] = weekMap[String(a.studentId)] || []).push(a.evaluation?.overallScore || 0); });
    const doneToday = new Set(todayDone.map((x: any) => String(x)));
    const lastMap: Record<string, number> = {}; (lastScores as any[]).forEach((r) => { lastMap[String(r._id)] = r.last || 0; });

    const rows = students.map((s: any) => {
      const id = String(s._id);
      const wk = weekMap[id] || [];
      const streak = streakMap[id]?.currentStreak || 0;
      const total = streakMap[id]?.totalCompletedDays || 0;
      const weeklyAvg = wk.length ? Math.round(wk.reduce((x, y) => x + y, 0) / wk.length) : 0;
      const risk = !doneToday.has(id) && streak === 0 && total === 0 ? 'no_activity'
        : (weeklyAvg > 0 && weeklyAvg < 50) ? 'low_score'
        : (streak === 0 && total > 0) ? 'streak_broken' : 'ok';
      return {
        studentId: id, name: [s.firstName, s.lastName].filter(Boolean).join(' ') || s.email, email: s.email,
        batchId: s.batchId ? String(s.batchId) : null,
        todayStatus: doneToday.has(id) ? 'completed' : 'pending',
        currentStreak: streak, weeklyAvg, lastScore: lastMap[id] || 0, totalDays: total, risk,
      };
    });
    res.json({ students: rows });
  } catch (err: any) { res.status(500).json({ message: err.message }); }
};

// ── Admin: single student detail ──────────────────────────────────────────────
export const adminStudentDetail = async (req: Request, res: Response) => {
  try {
    const tenantId = tId(req);
    const studentId = req.params.studentId;
    if (!mongoose.isValidObjectId(studentId)) return res.status(400).json({ message: 'Invalid student' });
    const [user, profile, streak, attempts] = await Promise.all([
      User.findOne({ _id: studentId, tenantId }).select('firstName lastName email batchId').lean(),
      CommunicationProfile.findOne({ tenantId, studentId }).lean(),
      CommunicationStreak.findOne({ tenantId, studentId }).lean(),
      CommunicationAttempt.find({ tenantId, studentId }).sort({ createdAt: -1 }).limit(60).select('-recordingKey -transcript').lean(),
    ]);
    if (!user) return res.status(404).json({ message: 'Student not found' });
    res.json({ student: user, profile, streak, attempts });
  } catch (err: any) { res.status(500).json({ message: err.message }); }
};
