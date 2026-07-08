import { Request, Response } from 'express';
import mongoose from 'mongoose';
import DrillAttempt from '../models/DrillAttempt';
import DrillAssignment from '../models/DrillAssignment';
import User from '../models/User';
import { createNotifications } from '../notifications/notificationService';
import { generateProblem, evaluatePlan, runAgainstTests, hintForFailure, scoreDrill, DRILL_CONCEPTS } from '../services/drillService';

const tId = (req: Request) => (req as any).tenantId as string;
const uId = (req: Request) => (req as any).user?.id as string;
const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const publicAttempt = (a: any) => ({ attemptId: String(a._id), concept: a.concept, difficulty: a.difficulty, language: a.language, prompt: a.prompt, starterCode: a.starterCode, examples: a.examples, status: a.status });

// GET /drills/concepts
export const concepts = (_req: Request, res: Response) => res.json({ concepts: DRILL_CONCEPTS });

// POST /drills/new  { assignmentId }
// Problems are instructor-assigned only. The problem was AI-generated once by the admin
// at assign time — opening it here just materialises an attempt (NO AI call).
export const newProblem = async (req: Request, res: Response) => {
  try {
    const { assignmentId } = req.body || {};
    if (!assignmentId) return res.status(403).json({ message: 'Logic Building problems are assigned by your instructor. Open one from "Assigned to you".' });
    const assignment: any = await DrillAssignment.findOne({ _id: assignmentId, tenantId: tId(req), studentId: uId(req) });
    if (!assignment) return res.status(404).json({ message: 'Assignment not found' });
    if (assignment.status === 'completed') return res.status(409).json({ message: 'You already completed this assigned problem.' });
    if (!assignment.prompt || !Array.isArray(assignment.testCases) || !assignment.testCases.length) {
      return res.status(409).json({ message: 'This assigned problem is not ready yet. Ask your instructor to re-assign it.' });
    }

    // Reuse an in-progress attempt if the student already opened this assignment.
    let a: any = assignment.attemptId ? await DrillAttempt.findOne({ _id: assignment.attemptId, tenantId: tId(req), studentId: uId(req), status: 'in_progress' }) : null;
    if (!a) {
      const u: any = await User.findById(uId(req)).select('firstName lastName batchId').lean();
      a = await DrillAttempt.create({
        tenantId: tId(req), studentId: uId(req), studentName: [u?.firstName, u?.lastName].filter(Boolean).join(' '), batchId: u?.batchId,
        concept: assignment.concept, difficulty: assignment.difficulty, language: assignment.language,
        prompt: assignment.prompt, starterCode: assignment.starterCode || '', examples: assignment.examples || [], testCases: assignment.testCases,
        status: 'in_progress', attempts: 0, hintsUsed: 0, assignmentId: assignment._id,
      });
      assignment.status = 'in_progress'; assignment.attemptId = a._id; await assignment.save();
    }
    res.status(201).json({ problem: publicAttempt(a) });
  } catch (err: any) { res.status(500).json({ message: err.message || 'Failed to open problem' }); }
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
      // Mark the linked admin assignment complete, if any.
      if (a.assignmentId) {
        await DrillAssignment.updateOne(
          { _id: a.assignmentId, tenantId: tId(req), studentId: uId(req) },
          { $set: { status: 'completed', score: a.score, completedAt: new Date(), attemptId: a._id } }
        );
      }
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

// POST /drills/admin/preview  { concept, difficulty, language, customPrompt? }
// Admin-only: AI-generate a problem for review before assigning. Returns the full
// problem incl. test cases. This is the ONLY place students never reach — keeps AI
// generation (and its cost) admin-triggered.
export const previewProblem = async (req: Request, res: Response) => {
  try {
    const { concept, difficulty, language, customPrompt } = req.body || {};
    if (!concept || !DRILL_CONCEPTS.includes(concept)) return res.status(400).json({ message: 'Valid concept is required' });
    const diff = ['easy', 'medium', 'hard'].includes(difficulty) ? difficulty : 'easy';
    const p = await generateProblem(tId(req), concept, diff, language || 'javascript', customPrompt);
    if (!p) return res.status(503).json({ message: "AI couldn't generate a problem right now — try again in a moment (check the AI key / Piston service)." });
    res.json({ problem: { concept, difficulty: diff, language: p.language, prompt: p.prompt, starterCode: p.starterCode, examples: p.examples, testCases: p.testCases } });
  } catch (err: any) { res.status(500).json({ message: err.message || 'Failed to generate' }); }
};

// POST /drills/admin/assign  { concept, difficulty, language, studentIds?[], batchId?, note?, customPrompt?, dueDate?, problem? }
// AI-generates the problem ONCE (or reuses a previewed `problem`) and stores it on
// every assignment, so students never trigger generation.
export const assignProblem = async (req: Request, res: Response) => {
  try {
    const { concept, difficulty, language, studentIds, batchId, note, customPrompt, dueDate, problem } = req.body || {};
    if (!concept) return res.status(400).json({ message: 'concept is required' });
    if (!DRILL_CONCEPTS.includes(concept)) return res.status(400).json({ message: 'Unknown concept' });

    // Resolve target students: explicit list, or whole batch.
    let targets: any[] = [];
    if (Array.isArray(studentIds) && studentIds.length) {
      targets = await User.find({ _id: { $in: studentIds }, tenantId: tId(req), role: 'STUDENT' }).select('firstName lastName batchId').lean();
    } else if (batchId) {
      targets = await User.find({ batchId, tenantId: tId(req), role: 'STUDENT', isActive: { $ne: false } }).select('firstName lastName batchId').lean();
    }
    if (!targets.length) return res.status(400).json({ message: 'Select at least one student or a batch with students.' });

    const diff = ['easy', 'medium', 'hard'].includes(difficulty) ? difficulty : 'easy';

    // Use a previewed problem if the admin already generated one; otherwise generate now.
    let p: any = (problem && problem.prompt && Array.isArray(problem.testCases) && problem.testCases.length) ? problem : null;
    if (!p) p = await generateProblem(tId(req), concept, diff, language || 'javascript', customPrompt);
    if (!p || !p.prompt || !Array.isArray(p.testCases) || !p.testCases.length) {
      return res.status(503).json({ message: "AI couldn't generate the problem right now — try again in a moment (check the AI key / Piston service)." });
    }

    const docs = targets.map((u: any) => ({
      tenantId: tId(req), assignedBy: uId(req), studentId: u._id,
      studentName: [u.firstName, u.lastName].filter(Boolean).join(' '), batchId: u.batchId,
      concept, difficulty: diff, language: p.language || language || 'javascript',
      customPrompt: customPrompt || undefined, note: note || undefined,
      dueDate: dueDate ? new Date(dueDate) : undefined, status: 'assigned',
      prompt: p.prompt, starterCode: p.starterCode || '', examples: p.examples || [], testCases: p.testCases,
    }));
    const created = await DrillAssignment.insertMany(docs);

    // In-app bell notification.
    const due = dueDate ? ` (due ${new Date(dueDate).toLocaleDateString('en-IN', { dateStyle: 'medium' } as any)})` : '';
    await createNotifications(
      String(tId(req)), targets.map((u: any) => String(u._id)), 'general',
      '🧩 New Logic Building problem assigned',
      `${concept} · ${diff}${due} — open Logic Building to solve it.`,
      '/logic-gym'
    );
    res.status(201).json({ created: created.length });
  } catch (err: any) { res.status(500).json({ message: err.message || 'Failed to assign' }); }
};

// GET /drills/admin/assignments?batchId=&status=
export const listAssignments = async (req: Request, res: Response) => {
  try {
    const filter: any = { tenantId: tId(req) };
    if (req.query.batchId) filter.batchId = new mongoose.Types.ObjectId(String(req.query.batchId));
    if (req.query.status) filter.status = req.query.status;
    const rows = await DrillAssignment.find(filter).sort({ createdAt: -1 }).limit(500).lean();
    res.json({ assignments: rows.map((a: any) => ({
      _id: String(a._id), studentName: a.studentName || 'Student', concept: a.concept, difficulty: a.difficulty,
      language: a.language, note: a.note, dueDate: a.dueDate, status: a.status, score: a.score, createdAt: a.createdAt,
    })) });
  } catch (err: any) { res.status(500).json({ message: err.message }); }
};

// GET /drills/assigned — the student's own assigned problems (open ones first)
export const myAssignments = async (req: Request, res: Response) => {
  try {
    const rows = await DrillAssignment.find({ tenantId: tId(req), studentId: uId(req) }).sort({ status: 1, createdAt: -1 }).limit(100).lean();
    res.json({ assignments: rows.map((a: any) => ({
      _id: String(a._id), concept: a.concept, difficulty: a.difficulty, language: a.language,
      note: a.note, dueDate: a.dueDate, status: a.status, score: a.score,
    })) });
  } catch (err: any) { res.status(500).json({ message: err.message }); }
};
