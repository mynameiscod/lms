import { Request, Response } from 'express';
import mongoose from 'mongoose';
import fs from 'fs';
import ThinkingProblem, { audienceFilter, PROBLEM_AUDIENCES } from '../models/ThinkingProblem';
import DailyChallenge from '../models/DailyChallenge';
import StudentGameStats from '../models/StudentGameStats';
import ThinkingProfile from '../models/ThinkingProfile';
import ScheduledChallenge from '../models/ScheduledChallenge';
import User from '../models/User';
import { resolveLabDay } from '../services/labTrackService';
import { istToday, ymd } from '../utils/planSchedule';
import * as lab from '../services/thinkingLabService';
import * as game from '../services/gamificationService';
import { transcribeFile } from '../services/speakingService';

// Credit bonus XP (voice/journal) to the student's game stats. Returns coins + new badges.
async function creditBonusXp(req: Request, amount: number) {
  const u: any = await User.findById(uId(req)).select('firstName lastName batchId').lean();
  const gs: any = await StudentGameStats.findOneAndUpdate(
    { tenantId: tId(req), studentId: uId(req) },
    { $setOnInsert: { tenantId: tId(req), studentId: uId(req), studentName: [u?.firstName, u?.lastName].filter(Boolean).join(' '), batchId: u?.batchId } },
    { new: true, upsert: true }
  );
  const r = game.addBonusXp(gs, amount);
  await gs.save();
  return r;
}

const tId = (req: Request) => (req as any).tenantId as string;
const uId = (req: Request) => (req as any).user?.id as string;
const today = () => ymd(istToday());

// Current IST time-of-day as 'HH:MM' (IST = UTC+5:30). Comparable lexicographically.
const istNowHM = (): string => {
  const ist = new Date(Date.now() + 5.5 * 3600 * 1000);
  return `${String(ist.getUTCHours()).padStart(2, '0')}:${String(ist.getUTCMinutes()).padStart(2, '0')}`;
};

// Availability status for a scheduled challenge's window. null = no window (free/all-day).
// Windows are OPT-IN: only a ScheduledChallenge that has startTime/endTime is gated.
const windowStatus = (sc: any, todayStr: string, nowHM: string): 'upcoming' | 'open' | 'closed' | null => {
  if (!sc || (!sc.startTime && !sc.endTime)) return null;
  if (sc.date > todayStr) return 'upcoming';
  if (sc.date < todayStr) return 'closed';
  if (sc.startTime && nowHM < sc.startTime) return 'upcoming';
  if (sc.endTime && nowHM > sc.endTime) return 'closed';
  return 'open';
};
const windowView = (sc: any, status: string | null) =>
  sc && (sc.startTime || sc.endTime) ? { date: sc.date, startTime: sc.startTime || null, endTime: sc.endTime || null, status } : undefined;

const challengeView = (ch: any, p: any) => ({
  challengeId: String(ch._id),
  date: ch.date, seq: ch.seq, status: ch.status, difficulty: ch.difficulty,
  approach: ch.approach || '', approachWordCount: ch.approachWordCount || 0,
  editorUnlocked: !!ch.editorUnlocked, minApproachWords: lab.MIN_APPROACH_WORDS,
  code: ch.code || p?.starterCode || '', language: ch.language,
  attempts: ch.attempts, hintsUsed: ch.hintsUsed, timeSpentSec: ch.timeSpentSec,
  passed: ch.passed, score: ch.score, xpEarned: ch.xpEarned,
  aiFeedback: (ch.status === 'submitted' || ch.status === 'solved') ? ch.aiFeedback : undefined,
  problem: p ? lab.publicProblem(p, ch.hintsUsed) : null,
});

// Adaptive pick: difficulty from recent performance, biased toward weak categories,
// avoiding recently-solved problems.
async function pickProblem(tenantId: string, studentId: string): Promise<any | null> {
  const recent = await DailyChallenge.find({ tenantId, studentId }).sort({ createdAt: -1 }).limit(20)
    .select('passed problemId difficulty').populate('problemId', 'category').lean();
  const solvedIds = recent.filter((r: any) => r.passed).map((r: any) => String(r.problemId?._id || r.problemId));

  // Difficulty nudge from the last 2 attempts.
  const order = ['easy', 'medium', 'hard', 'expert'];
  let target = 'easy';
  const lastTwo = recent.slice(0, 2);
  if (lastTwo.length === 2 && lastTwo.every((r: any) => r.passed)) {
    const cur = order.indexOf(lastTwo[0].difficulty === 'interview' ? 'hard' : lastTwo[0].difficulty);
    target = order[Math.min(order.length - 1, (cur < 0 ? 0 : cur) + 1)];
  } else if (recent[0] && !recent[0].passed) {
    const cur = order.indexOf(recent[0].difficulty === 'interview' ? 'hard' : recent[0].difficulty);
    target = order[Math.max(0, (cur < 0 ? 0 : cur) - 1)];
  } else if (recent[0]) {
    target = order.includes(recent[0].difficulty) ? recent[0].difficulty : 'easy';
  }

  // Weak categories: low solve-rate among those attempted ≥2 times.
  const catAgg: Record<string, { total: number; solved: number }> = {};
  recent.forEach((r: any) => { const c = r.problemId?.category; if (!c) return; const a = catAgg[c] || { total: 0, solved: 0 }; a.total++; if (r.passed) a.solved++; catAgg[c] = a; });
  const weakCats = Object.entries(catAgg).filter(([, v]) => v.total >= 2 && v.solved / v.total < 0.6)
    .sort((a, b) => a[1].solved / a[1].total - b[1].solved / b[1].total).map(([c]) => c);

  // Thinking Lab serves LMS students. Problems opted into CareerPilot only are not theirs,
  // and rows predating the field are read as LMS — so today's behaviour is unchanged.
  const base: any = { tenantId, active: true, ...audienceFilter('lms') };
  const tries: any[] = [];
  if (weakCats.length) tries.push({ ...base, difficulty: target, category: { $in: weakCats }, _id: { $nin: solvedIds } });
  tries.push({ ...base, difficulty: target, _id: { $nin: solvedIds } });
  if (weakCats.length) tries.push({ ...base, category: { $in: weakCats }, _id: { $nin: solvedIds } });
  tries.push({ ...base, _id: { $nin: solvedIds } });
  tries.push({ ...base, difficulty: target });
  tries.push({ ...base });
  for (const q of tries) {
    const n = await ThinkingProblem.countDocuments(q);
    if (n > 0) { const skip = Math.floor(Math.random() * Math.min(n, 20)); const [p] = await ThinkingProblem.find(q).skip(skip).limit(1); if (p) return p; }
  }
  return null;
}

// A batch-scheduled problem for today overrides the adaptive pick (same challenge for all).
async function scheduledProblem(tenantId: string, batchId: any, dateStr: string): Promise<any | null> {
  if (!batchId) return null;
  const sc: any = await ScheduledChallenge.findOne({ tenantId, batchId, date: dateStr }).lean();
  if (!sc) return null;
  const p = await ThinkingProblem.findOne({ _id: sc.problemId, tenantId, active: true });
  return p || null;
}

// GET /thinking-lab/today — the student's current challenge (creates one if none today).
export const getToday = async (req: Request, res: Response) => {
  try {
    const d = today();
    const u: any = await User.findById(uId(req)).select('firstName lastName batchId').lean();
    // Admin-scheduled batch challenge (may carry a time window) takes priority.
    let sc: any = u?.batchId ? await ScheduledChallenge.findOne({ tenantId: tId(req), batchId: u.batchId, date: d }).lean() : null;

    // No hand-made row for today? Derive the day from the batch's track. An explicit
    // ScheduledChallenge still WINS, so anything an admin set by hand — including an
    // override for a single day — keeps working exactly as before. This is what stops
    // "no challenge scheduled yet" from being the normal experience: a track is authored
    // once and every batch resolves its own day from it.
    let dayIndex: number | null = null;
    if (!sc && u?.batchId) {
      const r: any = await resolveLabDay(tId(req), String(u.batchId), 'thinking');
      if (r && r.contentId) {
        dayIndex = r.dayIndex;
        sc = {
          tenantId: tId(req), batchId: u.batchId, date: d,
          problemId: r.contentId,
          startTime: r.assignment?.window?.startTime,
          endTime: r.assignment?.window?.endTime,
          fromTrack: true,
        };
      }
    }

    // Still nothing: say WHY, because "not scheduled", "your plan starts Monday" and
    // "today is a rest day" need very different responses from the student.
    if (!sc) {
      const r: any = u?.batchId ? await resolveLabDay(tId(req), String(u.batchId), 'thinking') : { reason: 'no_assignment' };
      const message =
        r?.reason === 'not_started' ? 'Your daily plan has not started yet.'
        : r?.reason === 'non_learning_day' ? 'No challenge today — enjoy the break.'
        : r?.reason === 'track_unpublished' ? 'Your batch plan is still being prepared.'
        : 'No challenge scheduled yet. Your instructor will assign one for your batch.';
      return res.json({ challenge: null, empty: true, reason: r?.reason || 'no_assignment', message });
    }

    const wStatus = windowStatus(sc, d, istNowHM());

    let ch: any = await DailyChallenge.findOne({ tenantId: tId(req), studentId: uId(req), date: d }).sort({ seq: -1 });

    // Window not open yet — don't start the challenge until it opens.
    if (wStatus === 'upcoming' && (!ch || !['submitted', 'solved'].includes(ch.status))) {
      return res.json({ challenge: null, locked: true, window: windowView(sc, 'upcoming'),
        message: `Today's challenge opens at ${sc.startTime} (IST).` });
    }
    // Window closed and the student never completed it — locked/missed.
    if (wStatus === 'closed' && (!ch || !['submitted', 'solved'].includes(ch.status))) {
      return res.json({ challenge: null, locked: true, window: windowView(sc, 'closed'),
        message: `Today's challenge window (closed ${sc.endTime} IST) has ended.` });
    }

    if (!ch) {
      // Schedule-driven only: a student sees a challenge only when an admin has
      // scheduled one for their batch today (via Lab Challenge Windows). No random
      // fallback — a fresh/unscheduled batch sees nothing until the instructor assigns.
      const p = sc ? await ThinkingProblem.findOne({ _id: sc.problemId, tenantId: tId(req), active: true }) : null;
      if (!p) return res.json({ challenge: null, empty: true, message: 'No challenge scheduled yet. Your instructor will assign one for your batch.' });
      ch = await DailyChallenge.create({
        tenantId: tId(req), studentId: uId(req), studentName: [u?.firstName, u?.lastName].filter(Boolean).join(' '), batchId: u?.batchId,
        date: d, seq: 1, problemId: p._id, difficulty: p.difficulty, language: p.language, code: p.starterCode || '',
      });
      await ThinkingProblem.updateOne({ _id: p._id }, { $inc: { timesAssigned: 1 } });
    }
    const p = await ThinkingProblem.findById(ch.problemId).lean();
    res.json({ challenge: challengeView(ch, p), window: windowView(sc, wStatus) });
  } catch (err: any) { res.status(500).json({ message: err.message || 'Failed to load today\'s challenge' }); }
};

// POST /thinking-lab/next — a fresh challenge for today (after the current one is done).
export const nextChallenge = async (req: Request, res: Response) => {
  try {
    const d = today();
    const last: any = await DailyChallenge.findOne({ tenantId: tId(req), studentId: uId(req), date: d }).sort({ seq: -1 });
    if (last && !['submitted', 'solved'].includes(last.status)) {
      const p = await ThinkingProblem.findById(last.problemId).lean();
      return res.json({ challenge: challengeView(last, p) }); // still working on current
    }
    // Schedule-driven: one admin-assigned challenge per day. Once it's done there is no
    // random "next" — the student is finished until the next scheduled challenge.
    res.json({ challenge: null, empty: true, message: "That's today's challenge. Check back when your instructor assigns the next one." });
  } catch (err: any) { res.status(500).json({ message: err.message }); }
};

// POST /thinking-lab/:id/approach { approach } — the think-first gate (>=30 words).
export const saveApproach = async (req: Request, res: Response) => {
  try {
    const ch: any = await DailyChallenge.findOne({ _id: req.params.id, tenantId: tId(req), studentId: uId(req) });
    if (!ch) return res.status(404).json({ message: 'Challenge not found' });
    const approach = String(req.body?.approach || '');
    const wc = lab.wordCount(approach);
    ch.approach = approach.slice(0, 4000); ch.approachWordCount = wc;
    const unlocked = wc >= lab.MIN_APPROACH_WORDS;
    if (unlocked) { ch.editorUnlocked = true; if (ch.status === 'assigned') ch.status = 'thinking_done'; }
    await ch.save();
    res.json({ unlocked, wordCount: wc, minApproachWords: lab.MIN_APPROACH_WORDS });
  } catch (err: any) { res.status(500).json({ message: err.message }); }
};

// POST /thinking-lab/:id/hint — reveal the next hint (costs XP).
export const revealHint = async (req: Request, res: Response) => {
  try {
    const ch: any = await DailyChallenge.findOne({ _id: req.params.id, tenantId: tId(req), studentId: uId(req) });
    if (!ch) return res.status(404).json({ message: 'Challenge not found' });
    const p: any = await ThinkingProblem.findById(ch.problemId).lean();
    const hints: string[] = p?.hints || [];
    if (ch.hintsUsed >= hints.length) return res.status(409).json({ message: 'No more hints for this problem.' });
    const hint = hints[ch.hintsUsed];
    ch.hintsUsed += 1; await ch.save();
    res.json({ hint, hintsUsed: ch.hintsUsed, totalHints: hints.length });
  } catch (err: any) { res.status(500).json({ message: err.message }); }
};

// POST /thinking-lab/:id/run { code, language } — run against tests (editor must be unlocked).
export const run = async (req: Request, res: Response) => {
  try {
    const ch: any = await DailyChallenge.findOne({ _id: req.params.id, tenantId: tId(req), studentId: uId(req) });
    if (!ch) return res.status(404).json({ message: 'Challenge not found' });
    if (!ch.editorUnlocked) return res.status(403).json({ message: 'Explain your approach first (min 30 words) to unlock the editor.' });
    const code = String(req.body?.code || '');
    if (!code.trim()) return res.status(400).json({ message: 'Write some code first.' });
    const p: any = await ThinkingProblem.findById(ch.problemId).lean();
    if (!p) return res.status(404).json({ message: 'Problem not found' });
    ch.code = code.slice(0, 20000); ch.language = req.body?.language || ch.language;
    if (ch.status === 'thinking_done') ch.status = 'in_progress';
    await ch.save();
    const { results, allPassed, compileError } = await lab.runCode(ch.language, code, p.testCases as any);
    res.json({
      results: results.map((r: any) => ({ index: r.index, passed: r.passed, hidden: r.hidden })),
      allPassed, compileError, passedCount: results.filter((r: any) => r.passed).length, total: results.length,
    });
  } catch (err: any) { res.status(500).json({ message: err.message }); }
};

// POST /thinking-lab/:id/submit { code, language } — run + full-rubric AI eval + XP.
export const submit = async (req: Request, res: Response) => {
  try {
    const ch: any = await DailyChallenge.findOne({ _id: req.params.id, tenantId: tId(req), studentId: uId(req) });
    if (!ch) return res.status(404).json({ message: 'Challenge not found' });
    // Enforce the scheduled availability window (opt-in: only if a window is set for this batch+date).
    if (ch.batchId) {
      const sc: any = await ScheduledChallenge.findOne({ tenantId: tId(req), batchId: ch.batchId, date: ch.date }).lean();
      const w = windowStatus(sc, today(), istNowHM());
      if (w === 'upcoming') return res.status(403).json({ message: `This challenge opens at ${sc.startTime} (IST).` });
      if (w === 'closed') return res.status(403).json({ message: `This challenge's window closed at ${sc.endTime} (IST). Submissions are no longer accepted.` });
    }
    if (!ch.editorUnlocked) return res.status(403).json({ message: 'Explain your approach first to unlock the editor.' });
    const code = String(req.body?.code || ch.code || '');
    if (!code.trim()) return res.status(400).json({ message: 'Write some code before submitting.' });
    const p: any = await ThinkingProblem.findById(ch.problemId).lean();
    if (!p) return res.status(404).json({ message: 'Problem not found' });

    ch.code = code.slice(0, 20000); ch.language = req.body?.language || ch.language; ch.attempts += 1;
    if (typeof req.body?.timeSpentSec === 'number') ch.timeSpentSec = Math.max(ch.timeSpentSec, Math.min(86400, req.body.timeSpentSec));

    const { results, allPassed } = await lab.runCode(ch.language, code, p.testCases as any);
    const passedCount = results.filter((r: any) => r.passed).length;

    const feedback = await lab.evaluateSubmission({
      statement: p.statement, approach: ch.approach || '', code, language: ch.language,
      allPassed, passedCount, total: results.length,
      expectedTime: p.expectedTimeComplexity, expectedSpace: p.expectedSpaceComplexity,
      premium: p.difficulty === 'interview', tenantId: tId(req),
    });

    const xp = lab.computeXp({ problemXp: p.xp, allPassed, attempts: ch.attempts, hintsUsed: ch.hintsUsed, explainedThinking: (ch.approachWordCount || 0) >= lab.MIN_APPROACH_WORDS });
    ch.aiFeedback = feedback; ch.score = feedback?.overall ?? (allPassed ? 80 : Math.round(passedCount / Math.max(1, results.length) * 60));
    ch.passed = allPassed; ch.xpEarned = xp; ch.status = allPassed ? 'solved' : 'submitted'; ch.submittedAt = new Date();

    // Gamification: award XP/coins/badges once, only on a first-time solve of this challenge.
    let newBadges: any[] = []; let coinsEarned = 0;
    const firstSolve = allPassed && !ch.gameAwarded;
    if (firstSolve) {
      const u: any = await User.findById(uId(req)).select('firstName lastName batchId').lean();
      const gs: any = await StudentGameStats.findOneAndUpdate(
        { tenantId: tId(req), studentId: uId(req) },
        { $setOnInsert: { tenantId: tId(req), studentId: uId(req), studentName: [u?.firstName, u?.lastName].filter(Boolean).join(' '), batchId: u?.batchId } },
        { new: true, upsert: true }
      );
      const r = game.applySolve(gs, { xpEarned: xp, category: p.category, difficulty: p.difficulty, hintsUsed: ch.hintsUsed, perfect: (ch.attempts <= 1 && ch.hintsUsed === 0), dateStr: today() });
      await gs.save();
      newBadges = r.newBadges; coinsEarned = r.coinsEarned;
      (ch as any).gameAwarded = true;
    }
    await ch.save();
    if (allPassed) await ThinkingProblem.updateOne({ _id: p._id }, { $inc: { timesSolved: 1 } });

    res.json({
      allPassed, passedCount, total: results.length,
      results: results.map((r: any) => ({ index: r.index, passed: r.passed, hidden: r.hidden })),
      feedback, xpEarned: xp, coinsEarned, newBadges, status: ch.status,
    });
  } catch (err: any) { res.status(500).json({ message: err.message || 'Failed to submit' }); }
};

// GET /thinking-lab/stats — XP/level/streak/coins for the header (from game stats).
export const stats = async (req: Request, res: Response) => {
  try {
    const gs: any = await StudentGameStats.findOne({ tenantId: tId(req), studentId: uId(req) }).lean();
    const solvedToday = await DailyChallenge.countDocuments({ tenantId: tId(req), studentId: uId(req), passed: true, date: today() });
    res.json({
      xpTotal: gs?.xpTotal || 0, level: gs?.level || 1, coins: gs?.coins || 0,
      streak: gs?.currentStreak || 0, longestStreak: gs?.longestStreak || 0,
      solvedTotal: gs?.solvedTotal || 0, solvedToday, badgeCount: (gs?.badges || []).length,
    });
  } catch (err: any) { res.status(500).json({ message: err.message }); }
};

// GET /thinking-lab/badges — full catalog with which the student has earned.
export const badges = async (req: Request, res: Response) => {
  try {
    const gs: any = await StudentGameStats.findOne({ tenantId: tId(req), studentId: uId(req) }).lean();
    res.json({ badges: game.badgeStatus(gs) });
  } catch (err: any) { res.status(500).json({ message: err.message }); }
};

// GET /thinking-lab/leaderboard?scope=overall|weekly|monthly|batch&limit=
export const leaderboard = async (req: Request, res: Response) => {
  try {
    const scope = String(req.query.scope || 'overall');
    const limit = Math.min(50, Math.max(5, Number(req.query.limit) || 20));
    const me: any = await StudentGameStats.findOne({ tenantId: tId(req), studentId: uId(req) }).lean();

    let rows: any[] = [];
    if (scope === 'weekly' || scope === 'monthly') {
      // XP earned in the current period, aggregated from solves.
      const d = istToday();
      if (scope === 'weekly') { const dow = (d.getDay() + 6) % 7; d.setDate(d.getDate() - dow); } // Monday
      else d.setDate(1);
      const since = ymd(d);
      const agg = await DailyChallenge.aggregate([
        { $match: { tenantId: tId(req), passed: true, date: { $gte: since } } },
        { $group: { _id: '$studentId', name: { $first: '$studentName' }, xp: { $sum: '$xpEarned' }, solved: { $sum: 1 } } },
        { $sort: { xp: -1 } }, { $limit: limit },
      ]);
      rows = agg.map((r: any) => ({ studentId: String(r._id), name: r.name || 'Student', xp: r.xp, solved: r.solved }));
    } else {
      const q: any = { tenantId: tId(req) };
      if (scope === 'batch' && me?.batchId) q.batchId = me.batchId;
      const gsRows = await StudentGameStats.find(q).sort({ xpTotal: -1 }).limit(limit)
        .select('studentId studentName xpTotal level solvedTotal currentStreak').lean();
      rows = gsRows.map((r: any) => ({ studentId: String(r.studentId), name: r.studentName || 'Student', xp: r.xpTotal, level: r.level, solved: r.solvedTotal, streak: r.currentStreak }));
    }
    const myId = String(uId(req));
    const myRankIdx = rows.findIndex(r => r.studentId === myId);
    res.json({ scope, leaderboard: rows.map((r, i) => ({ rank: i + 1, ...r, isMe: r.studentId === myId })), myRank: myRankIdx >= 0 ? myRankIdx + 1 : null });
  } catch (err: any) { res.status(500).json({ message: err.message }); }
};

// POST /thinking-lab/:id/voice (multipart 'recording') — "Explain to AI" voice eval.
export const voiceExplain = async (req: Request, res: Response) => {
  const file = (req as any).file;
  try {
    const ch: any = await DailyChallenge.findOne({ _id: req.params.id, tenantId: tId(req), studentId: uId(req) });
    if (!ch) return res.status(404).json({ message: 'Challenge not found' });
    if (!file) return res.status(400).json({ message: 'No recording uploaded.' });
    const p: any = await ThinkingProblem.findById(ch.problemId).lean();

    const { text, durationSec } = await transcribeFile(file.path, tId(req), 'thinking_lab_voice_stt');
    if (!text.trim()) return res.status(422).json({ message: "Couldn't hear a clear explanation — try recording again in a quieter spot." });
    const evalRes = await lab.evaluateVoiceExplanation({ statement: p?.statement || '', transcript: text, durationSec, tenantId: tId(req) });
    const voiceEval = { transcript: text, durationSec, ...evalRes };
    ch.voiceEval = voiceEval;

    // Award the voice-explanation bonus once.
    let bonus: any = null;
    if (!ch.voiceXpAwarded) { bonus = await creditBonusXp(req, 30); ch.voiceXpAwarded = true; }
    await ch.save();
    res.json({ voiceEval, xpEarned: ch.voiceXpAwarded && bonus ? 30 : 0, coinsEarned: bonus?.coinsEarned || 0, newBadges: bonus?.newBadges || [] });
  } catch (err: any) {
    res.status(500).json({ message: err.message || 'Voice evaluation failed' });
  } finally {
    if (file?.path) { try { fs.unlinkSync(file.path); } catch { /* ignore */ } }
  }
};

// POST /thinking-lab/:id/journal { firstThought, gotStuck, learned } — the mandatory reflection.
export const saveJournal = async (req: Request, res: Response) => {
  try {
    const ch: any = await DailyChallenge.findOne({ _id: req.params.id, tenantId: tId(req), studentId: uId(req) });
    if (!ch) return res.status(404).json({ message: 'Challenge not found' });
    const { firstThought, gotStuck, learned } = req.body || {};
    ch.journal = {
      firstThought: String(firstThought || '').slice(0, 1500),
      gotStuck: String(gotStuck || '').slice(0, 1500),
      learned: String(learned || '').slice(0, 1500),
      answeredAt: new Date(),
    };
    let bonus: any = null;
    if (!ch.journalXpAwarded) { bonus = await creditBonusXp(req, 15); ch.journalXpAwarded = true; }
    await ch.save();
    res.json({ saved: true, xpEarned: bonus ? 15 : 0, coinsEarned: bonus?.coinsEarned || 0, newBadges: bonus?.newBadges || [] });
  } catch (err: any) { res.status(500).json({ message: err.message }); }
};

// GET /thinking-lab/profile — the rolling Thinking Profile (recomputed when stale).
export const getProfile = async (req: Request, res: Response) => {
  try {
    const force = req.query.refresh === '1';
    const journalCount = await DailyChallenge.countDocuments({ tenantId: tId(req), studentId: uId(req), 'journal.answeredAt': { $exists: true } });
    let prof: any = await ThinkingProfile.findOne({ tenantId: tId(req), studentId: uId(req) });

    const stale = !prof || force || (journalCount - (prof.basedOnCount || 0) >= 3);
    if (journalCount < 2 && !prof) {
      return res.json({ profile: null, journalCount, needMore: Math.max(0, 2 - journalCount) });
    }
    if (stale && journalCount >= 2) {
      const rows = await DailyChallenge.find({ tenantId: tId(req), studentId: uId(req) })
        .sort({ createdAt: -1 }).limit(40)
        .select('difficulty passed aiFeedback journal voiceEval problemId').populate('problemId', 'category').lean();
      const samples = rows.map((r: any) => ({
        category: r.problemId?.category || 'General', difficulty: r.difficulty, passed: r.passed,
        scores: r.aiFeedback, journal: r.journal, voice: r.voiceEval,
      }));
      const computed = await lab.computeThinkingProfile({ samples, tenantId: tId(req) });
      prof = await ThinkingProfile.findOneAndUpdate(
        { tenantId: tId(req), studentId: uId(req) },
        { $set: { ...computed, basedOnCount: journalCount, computedAt: new Date() } },
        { new: true, upsert: true }
      );
    }
    res.json({ profile: prof ? { summary: prof.summary, strengths: prof.strengths, weaknesses: prof.weaknesses, traits: prof.traits, recommendations: prof.recommendations, basedOnCount: prof.basedOnCount, computedAt: prof.computedAt } : null, journalCount });
  } catch (err: any) { res.status(500).json({ message: err.message }); }
};

// GET /thinking-lab/analytics — heatmap + accuracy + times + score averages + topics.
export const analytics = async (req: Request, res: Response) => {
  try {
    const rows = await DailyChallenge.find({ tenantId: tId(req), studentId: uId(req) })
      .sort({ createdAt: -1 }).limit(400)
      .select('passed status date timeSpentSec aiFeedback voiceEval difficulty problemId').populate('problemId', 'category').lean();

    const attempted = rows.filter((r: any) => r.status === 'submitted' || r.status === 'solved');
    const solved = rows.filter((r: any) => r.passed);
    const accuracy = attempted.length ? Math.round((solved.length / attempted.length) * 100) : 0;

    // Heatmap: solves per day.
    const heat: Record<string, number> = {};
    solved.forEach((r: any) => { heat[r.date] = (heat[r.date] || 0) + 1; });
    const heatmap = Object.entries(heat).map(([date, count]) => ({ date, count }));

    const avg = (arr: number[]) => arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : 0;
    const withFb = attempted.filter((r: any) => r.aiFeedback);
    const avgThinking = avg(withFb.map((r: any) => r.aiFeedback.logicalThinking || r.aiFeedback.overall || 0).filter(Boolean));
    const avgCoding = avg(withFb.map((r: any) => r.aiFeedback.overall || 0).filter(Boolean));
    const commScores = [
      ...withFb.map((r: any) => r.aiFeedback.communication).filter((x: any) => typeof x === 'number'),
      ...rows.filter((r: any) => r.voiceEval).map((r: any) => r.voiceEval.communication).filter((x: any) => typeof x === 'number'),
    ];
    const avgCommunication = avg(commScores);
    const avgTimeSec = avg(attempted.map((r: any) => r.timeSpentSec || 0).filter(Boolean));

    // Per-category performance.
    const cat: Record<string, { total: number; solved: number; scoreSum: number; scoreN: number }> = {};
    attempted.forEach((r: any) => {
      const c = r.problemId?.category || 'General';
      const a = cat[c] || { total: 0, solved: 0, scoreSum: 0, scoreN: 0 };
      a.total++; if (r.passed) a.solved++;
      if (r.aiFeedback?.overall) { a.scoreSum += r.aiFeedback.overall; a.scoreN++; }
      cat[c] = a;
    });
    const byCategory = Object.entries(cat).map(([category, v]) => ({
      category, total: v.total, solved: v.solved, rate: Math.round((v.solved / v.total) * 100), avgScore: v.scoreN ? Math.round(v.scoreSum / v.scoreN) : 0,
    }));
    const ranked = [...byCategory].filter(c => c.total >= 2).sort((a, b) => b.rate - a.rate);
    const strongTopics = ranked.slice(0, 3).filter(c => c.rate >= 60).map(c => c.category);
    const weakTopics = ranked.slice(-3).reverse().filter(c => c.rate < 60).map(c => c.category);

    res.json({
      heatmap, solvedTotal: solved.length, attempted: attempted.length, accuracy,
      avgThinking, avgCoding, avgCommunication, avgTimeSec,
      byCategory: byCategory.sort((a, b) => b.total - a.total), strongTopics, weakTopics,
    });
  } catch (err: any) { res.status(500).json({ message: err.message }); }
};

// POST /thinking-lab/:id/explain — step-by-step dry run of the student's solution.
export const explain = async (req: Request, res: Response) => {
  try {
    const ch: any = await DailyChallenge.findOne({ _id: req.params.id, tenantId: tId(req), studentId: uId(req) }).lean();
    if (!ch) return res.status(404).json({ message: 'Challenge not found' });
    if (!ch.code) return res.status(400).json({ message: 'Submit a solution first.' });
    const p: any = await ThinkingProblem.findById(ch.problemId).lean();
    const out = await lab.explainStepByStep({ statement: p?.statement || '', code: ch.code, language: ch.language, expectedTime: p?.expectedTimeComplexity, tenantId: tId(req) });
    res.json({ explanation: out });
  } catch (err: any) { res.status(500).json({ message: err.message }); }
};

// ── Admin ────────────────────────────────────────────────────────────────────

// GET /thinking-lab/admin/problems?category=&difficulty=
export const listProblems = async (req: Request, res: Response) => {
  try {
    const filter: any = { tenantId: tId(req) };
    if (req.query.category) filter.category = req.query.category;
    if (req.query.difficulty) filter.difficulty = req.query.difficulty;
    const rows = await ThinkingProblem.find(filter).sort({ createdAt: -1 }).limit(500)
      .select('title category difficulty language xp active timesAssigned timesSolved attemptCount audiences createdAt').lean();
    const total = await ThinkingProblem.countDocuments({ tenantId: tId(req) });
    res.json({ problems: rows.map((p: any) => ({ ...p, id: String(p._id) })), total });
  } catch (err: any) { res.status(500).json({ message: err.message }); }
};

// GET /thinking-lab/admin/meta — categories + difficulties for the admin UI.
export const meta = (_req: Request, res: Response) =>
  res.json({ categories: lab.THINKING_CATEGORIES, difficulties: lab.THINKING_DIFFICULTIES });

// POST /thinking-lab/admin/generate { category, difficulty, language, brief?, count? }
export const generateProblems = async (req: Request, res: Response) => {
  try {
    const { category, difficulty, language, brief } = req.body || {};
    const count = Math.max(1, Math.min(10, Number(req.body?.count) || 1));
    if (!category || !lab.THINKING_CATEGORIES.includes(category)) return res.status(400).json({ message: 'Valid category required' });
    if (!lab.THINKING_DIFFICULTIES.includes(difficulty)) return res.status(400).json({ message: 'Valid difficulty required' });

    const created: any[] = [];
    for (let i = 0; i < count; i++) {
      const gen = await lab.generateThinkingProblem(tId(req), category, difficulty, language || 'javascript', brief);
      if (!gen) continue;
      const doc = await ThinkingProblem.create({ ...gen, tenantId: tId(req), createdBy: uId(req) });
      created.push({ id: String(doc._id), title: doc.title, difficulty: doc.difficulty });
    }
    if (!created.length) return res.status(503).json({ message: "AI couldn't generate any problems right now — try again in a moment." });
    res.status(201).json({ created: created.length, problems: created });
  } catch (err: any) { res.status(500).json({ message: err.message || 'Failed to generate' }); }
};

// PATCH /thinking-lab/admin/problems/:id  { active }
export const toggleProblem = async (req: Request, res: Response) => {
  try {
    const p = await ThinkingProblem.findOneAndUpdate({ _id: req.params.id, tenantId: tId(req) }, { $set: { active: !!req.body?.active } }, { new: true });
    if (!p) return res.status(404).json({ message: 'Not found' });
    res.json({ id: String(p._id), active: p.active });
  } catch (err: any) { res.status(500).json({ message: err.message }); }
};

// DELETE /thinking-lab/admin/problems/:id
export const deleteProblem = async (req: Request, res: Response) => {
  try {
    const r = await ThinkingProblem.deleteOne({ _id: req.params.id, tenantId: tId(req) });
    res.json({ deleted: r.deletedCount || 0 });
  } catch (err: any) { res.status(500).json({ message: err.message }); }
};

// GET /thinking-lab/admin/problems/:id — full detail for editing (incl. test cases).
export const getProblemDetail = async (req: Request, res: Response) => {
  try {
    const p: any = await ThinkingProblem.findOne({ _id: req.params.id, tenantId: tId(req) }).lean();
    if (!p) return res.status(404).json({ message: 'Not found' });
    res.json({ problem: { ...p, id: String(p._id) } });
  } catch (err: any) { res.status(500).json({ message: err.message }); }
};

// Shape + validate an admin-authored problem payload.
function sanitizeProblemInput(b: any) {
  const difficulty = lab.THINKING_DIFFICULTIES.includes(b.difficulty) ? b.difficulty : 'easy';
  const testCases = (Array.isArray(b.testCases) ? b.testCases : [])
    .filter((t: any) => t && typeof t.expectedOutput === 'string')
    .map((t: any) => ({ input: String(t.input || ''), expectedOutput: String(t.expectedOutput || ''), hidden: !!t.hidden }));
  const examples = (Array.isArray(b.examples) ? b.examples : [])
    .map((e: any) => ({ input: String(e.input || ''), expectedOutput: String(e.expectedOutput || ''), explanation: e.explanation ? String(e.explanation) : undefined }));
  const out: any = {
    title: String(b.title || '').slice(0, 120),
    category: lab.THINKING_CATEGORIES.includes(b.category) ? b.category : 'Brain Teasers',
    difficulty, language: String(b.language || 'javascript'),
    statement: String(b.statement || '').slice(0, 8000),
    examples, testCases,
    constraints: b.constraints ? String(b.constraints).slice(0, 800) : undefined,
    notes: b.notes ? String(b.notes).slice(0, 800) : undefined,
    starterCode: b.starterCode ? String(b.starterCode).slice(0, 8000) : '',
    hints: (Array.isArray(b.hints) ? b.hints : []).slice(0, 3).map((h: any) => String(h).slice(0, 400)),
    referenceSolution: b.referenceSolution ? String(b.referenceSolution).slice(0, 8000) : undefined,
    expectedTimeComplexity: b.expectedTimeComplexity ? String(b.expectedTimeComplexity).slice(0, 60) : undefined,
    expectedSpaceComplexity: b.expectedSpaceComplexity ? String(b.expectedSpaceComplexity).slice(0, 60) : undefined,
    imageUrl: b.imageUrl ? String(b.imageUrl).slice(0, 1000) : undefined,
    videoUrl: b.videoUrl ? String(b.videoUrl).slice(0, 1000) : undefined,
    referenceVideo: b.referenceVideo ? String(b.referenceVideo).slice(0, 1000) : undefined,
    xp: Number(b.xp) > 0 ? Math.min(500, Number(b.xp)) : (lab.XP_BY_DIFFICULTY[difficulty] || 50),
    estimatedMinutes: Number(b.estimatedMinutes) > 0 ? Math.min(120, Number(b.estimatedMinutes)) : 15,
    tags: (Array.isArray(b.tags) ? b.tags : []).map((t: any) => String(t).slice(0, 40)).slice(0, 10),
  } as any;

  /**
   * The new fields are added ONLY when the caller sent them, unlike everything above.
   *
   * updateProblem $sets this whole object, so a key that is always present overwrites on
   * every save. For title or xp that is what you want — the form always carries them. For
   * audiences it is not: an API call or an older client that omits the field would silently
   * reset a problem shared with CareerPilot back to LMS-only, and nobody would see it happen.
   * Absent means "leave as it is"; the schema default covers creation.
   */
  if (Array.isArray(b.audiences)) {
    const picked = b.audiences.filter((a: any) => PROBLEM_AUDIENCES.includes(a));
    // A problem for nobody is not a state worth saving — an empty pick keeps the LMS.
    out.audiences = picked.length ? [...new Set(picked)] : ['lms'];
  }
  if (b.solutionUnlockAfterAttempts !== undefined) {
    const n = Number(b.solutionUnlockAfterAttempts);
    // 0 means "never hide it". Capped so a typo cannot make the video unreachable forever.
    out.solutionUnlockAfterAttempts = Number.isFinite(n) ? Math.max(0, Math.min(20, Math.round(n))) : 3;
  }
  if (b.videoKey !== undefined) out.videoKey = String(b.videoKey || '').slice(0, 400);
  if (b.solutionVideoKey !== undefined) out.solutionVideoKey = String(b.solutionVideoKey || '').slice(0, 400);

  return out;
}

// POST /thinking-lab/admin/problems — manual authoring.
export const createProblem = async (req: Request, res: Response) => {
  try {
    const data = sanitizeProblemInput(req.body || {});
    if (!data.title || !data.statement) return res.status(400).json({ message: 'Title and problem statement are required.' });
    if (!data.testCases.length) return res.status(400).json({ message: 'Add at least one test case (with expected output).' });
    const doc = await ThinkingProblem.create({ ...data, tenantId: tId(req), source: 'manual', active: true, createdBy: uId(req) });
    res.status(201).json({ id: String(doc._id) });
  } catch (err: any) { res.status(500).json({ message: err.message || 'Failed to create' }); }
};

// PUT /thinking-lab/admin/problems/:id — edit.
export const updateProblem = async (req: Request, res: Response) => {
  try {
    const data = sanitizeProblemInput(req.body || {});
    if (!data.title || !data.statement) return res.status(400).json({ message: 'Title and statement are required.' });
    const p = await ThinkingProblem.findOneAndUpdate({ _id: req.params.id, tenantId: tId(req) }, { $set: data }, { new: true });
    if (!p) return res.status(404).json({ message: 'Not found' });
    res.json({ id: String(p._id) });
  } catch (err: any) { res.status(500).json({ message: err.message }); }
};

// POST /thinking-lab/admin/generate-bulk { items:[{category,difficulty,count}], language, brief? }
export const generateBulk = async (req: Request, res: Response) => {
  try {
    const items = Array.isArray(req.body?.items) ? req.body.items : [];
    const language = req.body?.language || 'javascript';
    const brief = req.body?.brief;
    if (!items.length) return res.status(400).json({ message: 'Provide items to generate.' });
    let totalWanted = 0; const jobs: { category: string; difficulty: string }[] = [];
    for (const it of items) {
      if (!lab.THINKING_CATEGORIES.includes(it.category) || !lab.THINKING_DIFFICULTIES.includes(it.difficulty)) continue;
      const c = Math.max(1, Math.min(10, Number(it.count) || 1));
      for (let i = 0; i < c && totalWanted < 40; i++) { jobs.push({ category: it.category, difficulty: it.difficulty }); totalWanted++; }
    }
    let created = 0;
    for (const j of jobs) {
      const gen = await lab.generateThinkingProblem(tId(req), j.category, j.difficulty, language, brief);
      if (gen) { await ThinkingProblem.create({ ...gen, tenantId: tId(req), createdBy: uId(req) }); created++; }
    }
    res.status(201).json({ created, requested: totalWanted });
  } catch (err: any) { res.status(500).json({ message: err.message || 'Failed to generate' }); }
};

// ── Admin: scheduling (batch + date → fixed challenge) ───────────────────────
export const listSchedule = async (req: Request, res: Response) => {
  try {
    const filter: any = { tenantId: tId(req) };
    if (req.query.batchId) filter.batchId = new mongoose.Types.ObjectId(String(req.query.batchId));
    const rows = await ScheduledChallenge.find(filter).sort({ date: -1 }).limit(200).populate('problemId', 'title category difficulty').lean();
    res.json({ schedule: rows.map((s: any) => ({ id: String(s._id), batchId: String(s.batchId), date: s.date, startTime: s.startTime || null, endTime: s.endTime || null, problem: s.problemId ? { id: String(s.problemId._id), title: s.problemId.title, category: s.problemId.category, difficulty: s.problemId.difficulty } : null })) });
  } catch (err: any) { res.status(500).json({ message: err.message }); }
};

export const scheduleChallenge = async (req: Request, res: Response) => {
  try {
    const { batchId, date, problemId, startTime, endTime } = req.body || {};
    if (!batchId || !/^\d{4}-\d{2}-\d{2}$/.test(String(date)) || !problemId) return res.status(400).json({ message: 'batchId, date (YYYY-MM-DD) and problemId are required.' });
    const hm = /^\d{2}:\d{2}$/;
    if ((startTime && !hm.test(String(startTime))) || (endTime && !hm.test(String(endTime)))) return res.status(400).json({ message: 'startTime/endTime must be HH:MM.' });
    if (startTime && endTime && String(endTime) <= String(startTime)) return res.status(400).json({ message: 'End time must be after start time.' });
    const prob = await ThinkingProblem.findOne({ _id: problemId, tenantId: tId(req) }).select('_id').lean();
    if (!prob) return res.status(404).json({ message: 'Problem not found' });
    const doc = await ScheduledChallenge.findOneAndUpdate(
      { tenantId: tId(req), batchId, date },
      { $set: { problemId, startTime: startTime || undefined, endTime: endTime || undefined, createdBy: uId(req) } },
      { new: true, upsert: true }
    );
    res.status(201).json({ id: String(doc._id) });
  } catch (err: any) { res.status(500).json({ message: err.message }); }
};

export const deleteSchedule = async (req: Request, res: Response) => {
  try {
    const r = await ScheduledChallenge.deleteOne({ _id: req.params.id, tenantId: tId(req) });
    res.json({ deleted: r.deletedCount || 0 });
  } catch (err: any) { res.status(500).json({ message: err.message }); }
};
