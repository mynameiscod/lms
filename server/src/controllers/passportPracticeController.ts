import { Request, Response } from 'express';
import User from '../models/User';
import PassportConfig from '../models/PassportConfig';
import { ProgrammingLanguage } from '../models/Assignment';
import { isEntitled } from '../services/passportEntitlementService';
import { getOrCreateProgress, addXp, completeMissionOnce } from '../services/passportXpService';
import { awardCoins } from '../services/coinService';
import PassportAttempt from '../models/PassportAttempt';
import { ensureContent, poolMapOf, missionsForDay, dayNumber, clampSlots } from '../services/passportMissionService';
import { memberAxes } from '../services/careerStageService';
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
    const { tenantId, studentId, user, cfg, entitled } = await gate(req);
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

    // Solving the problem IS the mission — complete it here rather than making the member
    // walk back to the dashboard and tick a box for work we just watched them do. Only on
    // a first solve, and only for a mission whose link asked for this kind of practice.
    //
    // Wrapped because none of this may cost the member their submission: they wrote code
    // that passed, and a missing attempt or an empty pool must not turn that into a 500.
    let missionCompleted: string | null = null;
    if (firstSolve) {
      try {
        const [attempt, content] = await Promise.all([
          PassportAttempt.findOne({ tenantId, studentId }).sort({ createdAt: -1 }).lean() as any,
          ensureContent(tenantId),
        ]);
        if (attempt) {
          const day = dayNumber(progress.startDate, new Date());
          const pools = poolMapOf(content.missionPools, memberAxes(user));
          const todays = missionsForDay(attempt, day, pools, content.journeyDays || 90, undefined, clampSlots((content as any).missionsPerDay));
          const match = todays.find(m => {
            if (!m.link) return false;
            const kind = new URLSearchParams(m.link.split('?')[1] || '').get('kind');
            return kind === problem.kind;
          });
          if (match && completeMissionOnce(progress, day, match.key, match.xp, new Date())) {
            missionCompleted = match.title;
          }
        }
      } catch (e: any) {
        console.error('[passport] practice -> mission auto-complete failed:', e?.message || e);
      }
    }

    await progress.save();

    // Keyed on the problem, so re-solving it can never pay twice — the daily cap in the
    // rule limits how many DIFFERENT problems earn in a day.
    let coins = 0;
    if (firstSolve) {
      const r = await awardCoins({
        tenantId, studentId, eventKey: 'practice_solved',
        idempotencyKey: `practice:${studentId}:${problem.id}`,
        note: problem.title || problem.id,
      });
      coins = r.awarded;
    }

    res.json({
      ...payload, passed,
      xpAwarded: firstSolve ? problem.xp : 0,
      coins,
      missionCompleted,
      xp: progress.xp, streak: progress.streak, longestStreak: progress.longestStreak,
      alreadySolved: passed && !firstSolve,
    });
  } catch (e: any) {
    console.error('[passport] practice submit:', e);
    res.status(500).json({ message: e.message || 'Submit failed' });
  }
};
