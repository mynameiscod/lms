import { Request, Response } from 'express';
import User from '../models/User';
import PassportConfig from '../models/PassportConfig';
import { ProgrammingLanguage } from '../models/Assignment';
import { isEntitled } from '../services/passportEntitlementService';
import { getOrCreateProgress, addXp } from '../services/passportXpService';
import {
  listProblems, findProblem, toPublic, runProblem, gradeMcq, PracticeKind,
} from '../services/passportPracticeService';

const tenantOf = (req: Request): string => String((req as any).user?.tenantId || (req as any).tenantId || '');
const userIdOf = (req: Request): string => String((req as any).user?.id || '');

async function gate(req: Request) {
  const tenantId = tenantOf(req);
  const studentId = userIdOf(req);
  const [user, cfg] = await Promise.all([
    User.findById(studentId).select('passport').lean() as any,
    PassportConfig.findOne({ tenantId }).lean(),
  ]);
  return {
    tenantId, studentId, user, cfg,
    entitled: isEntitled(cfg?.entitlements as any, user?.passport, 'practice'),
  };
}

/** GET /passport/practice — the problem list (+ what this member has already solved). */
export const list = async (req: Request, res: Response) => {
  try {
    const { tenantId, studentId, cfg, entitled } = await gate(req);
    const kind = req.query.kind ? String(req.query.kind) as PracticeKind : undefined;
    const category = req.query.category ? String(req.query.category) : undefined;
    const problems = listProblems({ kind, category });

    if (!entitled) {
      return res.json({ locked: true, priceInr: cfg?.priceInr ?? 499, problems, solved: [] });
    }
    const progress = await getOrCreateProgress(tenantId, studentId);
    res.json({
      locked: false, problems,
      solved: progress.solvedProblems || [],
      xp: progress.xp, streak: progress.streak,
    });
  } catch (e: any) {
    console.error('[passport] practice list:', e);
    res.status(500).json({ message: e.message || 'Failed to load practice' });
  }
};

/** GET /passport/practice/:id — one problem, with answers/hidden tests stripped. */
export const get = async (req: Request, res: Response) => {
  try {
    const { tenantId, studentId, cfg, entitled } = await gate(req);
    if (!entitled) return res.status(403).json({ locked: true, priceInr: cfg?.priceInr ?? 499, message: 'Membership required to use the Practice Lab.' });
    const problem = findProblem(String(req.params.id));
    if (!problem) return res.status(404).json({ message: 'Problem not found' });
    const progress = await getOrCreateProgress(tenantId, studentId);
    res.json({ problem: toPublic(problem), solved: (progress.solvedProblems || []).includes(problem.id) });
  } catch (e: any) {
    res.status(500).json({ message: e.message || 'Failed to load problem' });
  }
};

/** POST /passport/practice/:id/run — run the SAMPLE tests only. No XP, no record. */
export const run = async (req: Request, res: Response) => {
  try {
    const { cfg, entitled } = await gate(req);
    if (!entitled) return res.status(403).json({ locked: true, priceInr: cfg?.priceInr ?? 499, message: 'Membership required.' });
    const problem = findProblem(String(req.params.id));
    if (!problem) return res.status(404).json({ message: 'Problem not found' });
    if (problem.kind === 'mcq') return res.status(400).json({ message: 'Use submit for MCQ sets.' });

    const code = String(req.body?.code || '');
    if (!code.trim()) return res.status(400).json({ message: 'Write some code first.' });
    const language = (req.body?.language || ProgrammingLanguage.PYTHON) as ProgrammingLanguage;

    const outcome = await runProblem(problem, code, language, true);
    res.json(outcome);
  } catch (e: any) {
    console.error('[passport] practice run:', e);
    res.status(500).json({ message: e.message || 'Run failed' });
  }
};

/**
 * POST /passport/practice/:id/submit — grade against ALL tests (or the MCQ key) and,
 * on the first full pass, award the problem's XP. Idempotent via solvedProblems.
 */
export const submit = async (req: Request, res: Response) => {
  try {
    const { tenantId, studentId, cfg, entitled } = await gate(req);
    if (!entitled) return res.status(403).json({ locked: true, priceInr: cfg?.priceInr ?? 499, message: 'Membership required.' });
    const problem = findProblem(String(req.params.id));
    if (!problem) return res.status(404).json({ message: 'Problem not found' });

    let passed = false, score = 0, total = 0;
    let payload: any = {};

    if (problem.kind === 'mcq') {
      const answers: number[] = Array.isArray(req.body?.answers) ? req.body.answers.map((n: any) => Number(n)) : [];
      const graded = gradeMcq(problem, answers);
      // An MCQ set counts as solved at 60%+ — it's practice, not an exam.
      passed = graded.total > 0 && graded.correct / graded.total >= 0.6;
      score = graded.correct; total = graded.total;
      payload = { review: graded.review, correct: graded.correct, total: graded.total };
    } else {
      const code = String(req.body?.code || '');
      if (!code.trim()) return res.status(400).json({ message: 'Write some code first.' });
      const language = (req.body?.language || ProgrammingLanguage.PYTHON) as ProgrammingLanguage;
      const outcome = await runProblem(problem, code, language, false);
      passed = outcome.allPassed;
      score = outcome.passedCount; total = outcome.total;
      payload = outcome;
    }

    const progress = await getOrCreateProgress(tenantId, studentId);
    const firstSolve = passed && !(progress.solvedProblems || []).includes(problem.id);
    if (firstSolve) {
      progress.solvedProblems.push(problem.id);
      addXp(progress, problem.xp, true, new Date(), 'practice');
    }
    progress.practice.push({
      problemId: problem.id, kind: problem.kind, passed,
      score, total, xp: firstSolve ? problem.xp : 0, at: new Date(),
    });
    // Keep the attempt log from growing without bound.
    if (progress.practice.length > 200) progress.practice = progress.practice.slice(-200);
    await progress.save();

    res.json({
      ...payload, passed,
      xpAwarded: firstSolve ? problem.xp : 0,
      xp: progress.xp, streak: progress.streak, longestStreak: progress.longestStreak,
      alreadySolved: passed && !firstSolve,
    });
  } catch (e: any) {
    console.error('[passport] practice submit:', e);
    res.status(500).json({ message: e.message || 'Submit failed' });
  }
};
