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
  listCareerPilotProblems, findCareerPilotProblem,
} from '../services/passportPracticeService';
import ProblemAttempt from '../models/ProblemAttempt';
import { aiComplete } from '../services/aiGateway';
import ThinkingProblem from '../models/ThinkingProblem';

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
    const difficulty = req.query.difficulty ? String(req.query.difficulty) : undefined;
    // Built-ins plus whatever an admin has shared with CareerPilot. Audience-filtered in the
    // query, so an LMS-only problem is never in this list to begin with.
    const problems = await listCareerPilotProblems(tenantId, { kind, category, difficulty });

    if (!entitled) {
      return res.json({ locked: true, priceInr: cfg?.priceInr ?? 499, problems, solved: [] });
    }
    const progress = await getOrCreateProgress(tenantId, studentId);

    /**
     * This member's standing on each problem, in one query rather than one per row.
     *
     * `solvedProblems` still answers "did they solve it" and predates this, so it is merged
     * rather than replaced — a member who solved a built-in last month has no attempt row
     * and must not appear to have lost it.
     */
    const attempts = await ProblemAttempt.find({ tenantId, studentId }).lean() as any[];
    const byId = new Map(attempts.map(a => [a.problemId, a]));
    const solvedIds = new Set(progress.solvedProblems || []);

    res.json({
      locked: false,
      problems: problems.map((p: any) => {
        const a = byId.get(p.id);
        return {
          ...p,
          solved: !!a?.passed || solvedIds.has(p.id),
          attempts: a?.attempts || 0,
          testsPassed: a?.testsPassed ?? null,
          testsTotal: a?.testsTotal ?? null,
        };
      }),
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
    const found = await findCareerPilotProblem(tenantId, String(req.params.id));
    if (!found) return res.status(404).json({ message: 'Problem not found' });
    const { problem, doc } = found;

    const progress = await getOrCreateProgress(tenantId, studentId);
    const attempt: any = await ProblemAttempt.findOne({ tenantId, studentId, problemId: problem.id }).lean();
    const solved = !!attempt?.passed || (progress.solvedProblems || []).includes(problem.id);

    /**
     * The solution unlocks once they have EARNED it — solved it, or failed enough times to
     * be genuinely stuck. `attempts` counts submissions, not runs, so pressing Run cannot
     * buy it.
     *
     * Decided and applied HERE, where the payload is built. Sending the URL and letting the
     * client hide it would put the answer one devtools panel away from every student, which
     * is the same as not gating it at all.
     */
    const threshold = doc ? Number(doc.solutionUnlockAfterAttempts ?? 3) : 3;
    const failed = attempt?.attempts || 0;
    const solutionUnlocked = solved || (threshold >= 0 && failed >= threshold);

    res.json({
      problem: toPublic(problem),
      solved,
      attempts: failed,
      testsPassed: attempt?.testsPassed ?? null,
      testsTotal: attempt?.testsTotal ?? null,
      // Their last editor contents, so reopening a problem resumes rather than restarts.
      savedCode: attempt?.code || '',
      savedLanguage: attempt?.language || '',
      // Always sent: it teaches the problem rather than giving it away.
      explainerVideo: doc?.videoUrl || '',
      explainerVideoKey: doc?.videoKey || '',
      solutionUnlocked,
      attemptsToUnlock: solutionUnlocked ? 0 : Math.max(0, threshold - failed),
      // Withheld entirely until unlocked — absent, not empty-stringed, so there is nothing
      // to read even if the client is lying about what it renders.
      ...(solutionUnlocked
        ? {
          solutionVideo: doc?.referenceVideo || '',
          solutionVideoKey: doc?.solutionVideoKey || '',
          referenceSolution: doc?.referenceSolution || '',
        }
        : {}),
    });
  } catch (e: any) {
    res.status(500).json({ message: e.message || 'Failed to load problem' });
  }
};

/**
 * POST /passport/practice/:id/ai-hint — a nudge aimed at THEIR code.
 *
 * The static hints are written once for everyone and reveal in order; this reads what the
 * student has actually typed and says the next useful thing about it. They are different
 * tools and both are worth having — a hint that says "use a hash map" is useless to somebody
 * whose hash map has an off-by-one.
 *
 * IT MUST NOT SOLVE THE PROBLEM. The prompt says so plainly, and the reason is not
 * politeness: a hint button that returns working code turns the whole bank into a
 * copy-paste exercise and every solve after it means nothing.
 *
 * Counted in `hintsUsed`, which reduces the XP awarded on solve — help is available, and it
 * is not free.
 */
export const aiHint = async (req: Request, res: Response) => {
  try {
    const { tenantId, studentId, cfg, entitled } = await gate(req);
    if (!entitled) return res.status(403).json({ locked: true, priceInr: cfg?.priceInr ?? 499, message: 'Membership required.' });

    const found = await findCareerPilotProblem(tenantId, String(req.params.id));
    if (!found) return res.status(404).json({ message: 'Problem not found' });
    const { problem } = found;

    const code = String(req.body?.code || '').slice(0, 6000);

    const system = [
      'You are a patient programming tutor helping a student who is stuck on a practice problem.',
      'Give ONE short nudge — two sentences at most — that moves them forward from where they are.',
      'NEVER write the solution, or a corrected version of their code, or more than a single line of illustrative syntax.',
      'If their code is close, name the specific thing that is wrong. If it is empty or barely started,',
      'suggest how to approach the problem, not what to type.',
      'Plain sentences. No markdown, no code fences, no headings.',
    ].join(' ');

    const user = [
      `Problem: ${problem.title}`,
      problem.prompt ? `Statement: ${String(problem.prompt).slice(0, 2000)}` : '',
      code.trim() ? `Their code so far:\n${code}` : 'They have not written anything yet.',
    ].filter(Boolean).join('\n\n');

    const hint = await aiComplete({
      tenantId, studentId, module: 'practice_hint', product: 'careerpilot',
      system, user, maxTokens: 160,
    });

    // Recorded AFTER the model answered — a provider outage should not cost them XP for a
    // hint they never received.
    await ProblemAttempt.updateOne(
      { tenantId, studentId, problemId: problem.id },
      { $inc: { hintsUsed: 1 }, $setOnInsert: { surface: 'careerpilot' } },
      { upsert: true },
    ).catch(() => { /* the hint stands */ });

    res.json({ hint: String(hint || '').trim() });
  } catch (e: any) {
    console.error('[passport] practice ai-hint:', e?.message || e);
    // Upstream, not the member's fault, and retrying is reasonable.
    res.status(502).json({ message: 'The hint service is unavailable right now. The written hints are still there.' });
  }
};

/** POST /passport/practice/:id/run — run the SAMPLE tests only. No XP, no record. */
export const run = async (req: Request, res: Response) => {
  try {
    const { tenantId, studentId, cfg, entitled } = await gate(req);
    if (!entitled) return res.status(403).json({ locked: true, priceInr: cfg?.priceInr ?? 499, message: 'Membership required.' });
    const found = await findCareerPilotProblem(tenantId, String(req.params.id));
    if (!found) return res.status(404).json({ message: 'Problem not found' });
    const { problem } = found;
    if (problem.kind === 'mcq') return res.status(400).json({ message: 'Use submit for MCQ sets.' });

    const code = String(req.body?.code || '');
    if (!code.trim()) return res.status(400).json({ message: 'Write some code first.' });
    const language = (req.body?.language || ProgrammingLanguage.PYTHON) as ProgrammingLanguage;

    const outcome = await runProblem(problem, code, language, true);

    /**
     * Save the draft, but do NOT touch `attempts`.
     *
     * Running is how you work; submitting is how you answer. Counting runs would let a
     * student unlock the solution video by pressing Run four times without writing anything,
     * and would make "3 attempts" mean something different from what the admin set.
     *
     * Best-effort: a member who just ran their code successfully must not see a 500 because
     * the draft could not be written.
     */
    await ProblemAttempt.updateOne(
      { tenantId, studentId, problemId: problem.id },
      { $set: { code, language, lastRunAt: new Date() }, $setOnInsert: { surface: 'careerpilot' } },
      { upsert: true },
    ).catch(() => { /* the run stands on its own */ });
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
    const found = await findCareerPilotProblem(tenantId, String(req.params.id));
    if (!found) return res.status(404).json({ message: 'Problem not found' });
    const { problem } = found;

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

    /**
     * The durable record, and the counters the list and the admin read.
     *
     * `attempts` increments on every SUBMIT — this is what the solution-video threshold
     * counts, and why Run deliberately does not touch it.
     *
     * `firstPass` is computed from the attempt row rather than from `solvedProblems`,
     * because the row is what the unique index protects: two tabs submitting a passing
     * solution at once both read `solvedProblems` before either writes, and both would
     * think they were first. The upsert cannot be raced the same way.
     *
     * All of it is best-effort. The member wrote code that passed and has been told so;
     * a counter that failed to move must not turn their submission into a 500.
     */
    try {
      const before: any = await ProblemAttempt.findOneAndUpdate(
        { tenantId, studentId, problemId: problem.id },
        {
          $inc: { attempts: 1 },
          $set: {
            testsPassed: score, testsTotal: total, passed,
            ...(problem.kind !== 'mcq' ? { code: String(req.body?.code || ''), language: String(req.body?.language || '') } : {}),
          },
          $setOnInsert: { surface: 'careerpilot' },
        },
        { upsert: true, new: false },
      ).lean();

      const firstPass = passed && !before?.passed;
      if (firstPass) {
        await ProblemAttempt.updateOne(
          { tenantId, studentId, problemId: problem.id },
          { $set: { solvedAt: new Date(), xpAwarded: firstSolve ? problem.xp : 0 } },
        );
      }

      // Counters live on the problem only when the problem HAS a row — the built-ins are
      // code and have nowhere to count. `attemptCount` counts people, not submissions, so
      // it moves only when this member's row was created.
      if (problem.id.startsWith('db:')) {
        const inc: any = {};
        if (!before) inc.attemptCount = 1;
        if (firstPass) inc.timesSolved = 1;
        if (Object.keys(inc).length) {
          await ThinkingProblem.updateOne({ _id: problem.id.slice(3), tenantId }, { $inc: inc });
        }
      }
    } catch (e: any) {
      console.error('[passport] practice attempt record:', e?.message || e);
    }

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
