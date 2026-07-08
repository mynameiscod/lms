import { Request, Response } from 'express';
import mongoose from 'mongoose';
import DrillAttempt from '../models/DrillAttempt';
import User from '../models/User';
import { generateProblem, evaluatePlan, runAgainstTests, hintForFailure, scoreDrill, DRILL_CONCEPTS } from '../services/drillService';

const tId = (req: Request) => (req as any).tenantId as string;
const uId = (req: Request) => (req as any).user?.id as string;
const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const publicAttempt = (a: any) => ({ attemptId: String(a._id), concept: a.concept, difficulty: a.difficulty, language: a.language, prompt: a.prompt, starterCode: a.starterCode, examples: a.examples, status: a.status });

// GET /drills/concepts
export const concepts = (_req: Request, res: Response) => res.json({ concepts: DRILL_CONCEPTS });

// POST /drills/new  { concept, difficulty, language }
export const newProblem = async (req: Request, res: Response) => {
  try {
    const { concept, difficulty, language } = req.body || {};
    if (!concept) return res.status(400).json({ message: 'concept is required' });
    const p = await generateProblem(tId(req), concept, difficulty || 'easy', language || 'javascript');
    if (!p) return res.status(503).json({ message: "Couldn't generate a problem right now — try again (check the AI key / Piston service)." });
    const u: any = await User.findById(uId(req)).select('firstName lastName batchId').lean();
    const a = await DrillAttempt.create({
      tenantId: tId(req), studentId: uId(req), studentName: [u?.firstName, u?.lastName].filter(Boolean).join(' '), batchId: u?.batchId,
      concept, difficulty: ['easy', 'medium', 'hard'].includes(difficulty) ? difficulty : 'easy', language: p.language,
      prompt: p.prompt, starterCode: p.starterCode, examples: p.examples, testCases: p.testCases, status: 'in_progress', attempts: 0, hintsUsed: 0,
    });
    res.status(201).json({ problem: publicAttempt(a) });
  } catch (err: any) { res.status(500).json({ message: err.message || 'Failed to create problem' }); }
};

// POST /drills/:id/plan  { plan }
export const checkPlan = async (req: Request, res: Response) => {
  try {
    const a = await DrillAttempt.findOne({ _id: req.params.id, tenantId: tId(req), studentId: uId(req) });
    if (!a) return res.status(404).json({ message: 'Attempt not found' });
    const { ok, hint } = await evaluatePlan(a.prompt, req.body?.plan || '');
    a.plan = String(req.body?.plan || '').slice(0, 3000); a.planOk = ok; await a.save();
    res.json({ ok, hint });
  } catch (err: any) { res.status(500).json({ message: err.message }); }
};

// POST /drills/:id/run  { code }
export const run = async (req: Request, res: Response) => {
  try {
    const a = await DrillAttempt.findOne({ _id: req.params.id, tenantId: tId(req), studentId: uId(req) });
    if (!a) return res.status(404).json({ message: 'Attempt not found' });
    if (a.status === 'solved') return res.json({ allPassed: true, alreadySolved: true, score: a.score });
    const code = String(req.body?.code || '');
    if (!code.trim()) return res.status(400).json({ message: 'Write some code first.' });
    a.code = code.slice(0, 20000); a.attempts += 1;

    const { results, allPassed, firstFail, compileError } = await runAgainstTests(a.language, code, a.testCases as any);
    let hint = ''; let score: number | undefined;
    if (allPassed) {
      a.passed = true; a.status = 'solved'; a.solvedAt = new Date();
      a.score = scoreDrill(!!a.planOk, a.attempts, a.hintsUsed); score = a.score;
    } else if (firstFail) {
      hint = await hintForFailure(a.prompt, code, firstFail); a.hintsUsed += 1;
    }
    await a.save();
    res.json({
      results: results.map((r) => ({ index: r.index, passed: r.passed, hidden: r.hidden })),
      allPassed, score, hint, compileError,
      passedCount: results.filter((r) => r.passed).length, total: results.length,
    });
  } catch (err: any) { res.status(500).json({ message: err.message }); }
};

// GET /drills/my-progress
export const myProgress = async (req: Request, res: Response) => {
  try {
    const solved = await DrillAttempt.find({ tenantId: tId(req), studentId: uId(req), status: 'solved' }).select('concept score solvedAt').lean();
    const days = new Set(solved.map((s: any) => ymd(new Date(s.solvedAt))));
    // streak of consecutive days ending today or yesterday
    const d = new Date();
    if (!days.has(ymd(d))) d.setDate(d.getDate() - 1);
    let streak = 0;
    while (days.has(ymd(d))) { streak++; d.setDate(d.getDate() - 1); }
    const today = solved.filter((s: any) => ymd(new Date(s.solvedAt)) === ymd(new Date())).length;
    const byConcept: Record<string, { solved: number; avg: number }> = {};
    solved.forEach((s: any) => { const c = byConcept[s.concept] || { solved: 0, avg: 0 }; c.avg = (c.avg * c.solved + (s.score || 0)) / (c.solved + 1); c.solved += 1; byConcept[s.concept] = c; });
    Object.values(byConcept).forEach((c) => { c.avg = Math.round(c.avg); });
    res.json({ solvedTotal: solved.length, streak, today, byConcept });
  } catch (err: any) { res.status(500).json({ message: err.message }); }
};

// GET /drills/admin/overview?batchId=...
export const adminOverview = async (req: Request, res: Response) => {
  try {
    const match: any = { tenantId: tId(req) };
    if (req.query.batchId) match.batchId = new mongoose.Types.ObjectId(String(req.query.batchId));
    const agg = await DrillAttempt.aggregate([
      { $match: match },
      { $group: {
        _id: '$studentId', name: { $first: '$studentName' },
        attempts: { $sum: 1 },
        solved: { $sum: { $cond: [{ $eq: ['$status', 'solved'] }, 1, 0] } },
        avg: { $avg: { $cond: [{ $eq: ['$status', 'solved'] }, '$score', null] } },
        last: { $max: '$updatedAt' },
      } },
      { $sort: { solved: -1, avg: -1 } },
      { $limit: 500 },
    ]);
    // weakest concepts overall (low solve rate)
    const byConcept = await DrillAttempt.aggregate([
      { $match: match },
      { $group: { _id: '$concept', total: { $sum: 1 }, solved: { $sum: { $cond: [{ $eq: ['$status', 'solved'] }, 1, 0] } } } },
      { $project: { concept: '$_id', total: 1, solved: 1, rate: { $cond: [{ $gt: ['$total', 0] }, { $divide: ['$solved', '$total'] }, 1] } } },
      { $sort: { rate: 1 } },
    ]);
    res.json({
      students: agg.map((r: any) => ({ studentId: String(r._id), name: r.name || 'Student', attempts: r.attempts, solved: r.solved, avg: Math.round(r.avg || 0), last: r.last })),
      weakConcepts: byConcept.map((c: any) => ({ concept: c.concept, total: c.total, solved: c.solved, rate: Math.round((c.rate || 0) * 100) })),
    });
  } catch (err: any) { res.status(500).json({ message: err.message }); }
};
