import { Request, Response } from 'express';
import mongoose from 'mongoose';
import ThinkingProblem from '../models/ThinkingProblem';
import DailyChallenge from '../models/DailyChallenge';
import StudentGameStats from '../models/StudentGameStats';
import User from '../models/User';
import { istToday, ymd } from '../utils/planSchedule';
import * as lab from '../services/thinkingLabService';
import * as game from '../services/gamificationService';

const tId = (req: Request) => (req as any).tenantId as string;
const uId = (req: Request) => (req as any).user?.id as string;
const today = () => ymd(istToday());

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

// Pick an adaptive problem: difficulty from recent performance, avoid recently-solved.
async function pickProblem(tenantId: string, studentId: string): Promise<any | null> {
  const recent = await DailyChallenge.find({ tenantId, studentId }).sort({ createdAt: -1 }).limit(5).select('passed problemId difficulty').lean();
  const solvedIds = recent.filter((r: any) => r.passed).map((r: any) => String(r.problemId));
  // Adaptive nudge: last 2 solved with no fails → step up; recent fails → keep/step down.
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

  const base: any = { tenantId, active: true };
  // Prefer target difficulty + unseen, then relax constraints so we always return something.
  const tries = [
    { ...base, difficulty: target, _id: { $nin: solvedIds } },
    { ...base, difficulty: target },
    { ...base, _id: { $nin: solvedIds } },
    { ...base },
  ];
  for (const q of tries) {
    const n = await ThinkingProblem.countDocuments(q);
    if (n > 0) { const skip = Math.floor(Math.random() * Math.min(n, 20)); const [p] = await ThinkingProblem.find(q).skip(skip).limit(1); if (p) return p; }
  }
  return null;
}

// GET /thinking-lab/today — the student's current challenge (creates one if none today).
export const getToday = async (req: Request, res: Response) => {
  try {
    const d = today();
    let ch: any = await DailyChallenge.findOne({ tenantId: tId(req), studentId: uId(req), date: d }).sort({ seq: -1 });
    if (!ch) {
      const p = await pickProblem(tId(req), uId(req));
      if (!p) return res.json({ challenge: null, empty: true, message: 'No problems in the bank yet. Ask your admin to add challenges.' });
      const u: any = await User.findById(uId(req)).select('firstName lastName batchId').lean();
      ch = await DailyChallenge.create({
        tenantId: tId(req), studentId: uId(req), studentName: [u?.firstName, u?.lastName].filter(Boolean).join(' '), batchId: u?.batchId,
        date: d, seq: 1, problemId: p._id, difficulty: p.difficulty, language: p.language, code: p.starterCode || '',
      });
      await ThinkingProblem.updateOne({ _id: p._id }, { $inc: { timesAssigned: 1 } });
    }
    const p = await ThinkingProblem.findById(ch.problemId).lean();
    res.json({ challenge: challengeView(ch, p) });
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
    const p = await pickProblem(tId(req), uId(req));
    if (!p) return res.json({ challenge: null, empty: true });
    const u: any = await User.findById(uId(req)).select('firstName lastName batchId').lean();
    const ch = await DailyChallenge.create({
      tenantId: tId(req), studentId: uId(req), studentName: [u?.firstName, u?.lastName].filter(Boolean).join(' '), batchId: u?.batchId,
      date: d, seq: (last?.seq || 0) + 1, problemId: p._id, difficulty: p.difficulty, language: p.language, code: p.starterCode || '',
    });
    await ThinkingProblem.updateOne({ _id: p._id }, { $inc: { timesAssigned: 1 } });
    res.json({ challenge: challengeView(ch, p) });
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
      premium: p.difficulty === 'interview',
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

// ── Admin ────────────────────────────────────────────────────────────────────

// GET /thinking-lab/admin/problems?category=&difficulty=
export const listProblems = async (req: Request, res: Response) => {
  try {
    const filter: any = { tenantId: tId(req) };
    if (req.query.category) filter.category = req.query.category;
    if (req.query.difficulty) filter.difficulty = req.query.difficulty;
    const rows = await ThinkingProblem.find(filter).sort({ createdAt: -1 }).limit(500)
      .select('title category difficulty language xp active timesAssigned timesSolved createdAt').lean();
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
