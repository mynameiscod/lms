import { Request, Response } from 'express';
import mongoose from 'mongoose';
import LearningContentLibrary from '../models/LearningContentLibrary';
import codeRunner from '../services/codeRunnerService';
import { ProgrammingLanguage } from '../models/Assignment';

/**
 * POST /learning-library/:id/practice/:qid/check — run a learner's code against a coding practice
 * question's test cases, hidden ones included.
 *
 * The code practice task used to show the starter code as a picture: nothing could be typed or run.
 * The member's copy of the question never carries the hidden tests (services/studentContentView), so
 * checking against them has to happen here. A hidden test answers pass or fail only — never its
 * input or expected output — so the checks cannot be read off the response.
 */
const RUNNABLE = new Set<string>([
  ProgrammingLanguage.JAVASCRIPT, ProgrammingLanguage.TYPESCRIPT, ProgrammingLanguage.PYTHON,
  ProgrammingLanguage.JAVA, ProgrammingLanguage.CPP, ProgrammingLanguage.C,
  ProgrammingLanguage.CSHARP, ProgrammingLanguage.GO, ProgrammingLanguage.RUST,
]);
const MAX_CODE = 50_000;
const MAX_TESTS = 20;

export const checkPracticeCode = async (req: Request, res: Response) => {
  try {
    const { id, qid } = req.params;
    const language = String(req.body?.language || '').toLowerCase();
    const code = String(req.body?.code || '');
    if (!mongoose.isValidObjectId(id)) return res.status(400).json({ success: false, message: 'That is not a practice item.' });
    if (!code.trim()) return res.status(400).json({ success: false, message: 'Write some code first.' });
    if (code.length > MAX_CODE) return res.status(400).json({ success: false, message: 'That code is too long to run.' });
    if (!RUNNABLE.has(language)) return res.status(400).json({ success: false, message: `"${language}" cannot be run here.` });

    const item: any = await LearningContentLibrary.findOne({ _id: id, isDeleted: { $ne: true } })
      .select('type practiceQuestions').lean();
    if (!item || item.type !== 'practice_coding') return res.status(404).json({ success: false, message: 'Practice item not found.' });
    const qs: any[] = item.practiceQuestions || [];
    // By id; a plain index too, for a question saved before ids were given.
    const q = qs.find((x) => String(x._id) === qid) || (/^\d{1,3}$/.test(qid) ? qs[Number(qid)] : null);
    if (!q || q.type !== 'coding') return res.status(404).json({ success: false, message: 'Question not found.' });
    const allowed: string[] = (q.allowedLanguages || []).map((l: string) => String(l).toLowerCase());
    if (allowed.length && !allowed.includes(language)) return res.status(400).json({ success: false, message: `This question is answered in ${allowed.join(' or ')}.` });

    const tests: any[] = (q.testCases || []).slice(0, MAX_TESTS);
    if (!tests.length) return res.status(400).json({ success: false, message: 'This question has no tests to check against yet.' });

    // One at a time: the runner queues anyway, and a burst from one learner should not jump it.
    const results: any[] = [];
    let unavailable = false;
    for (const t of tests) {
      const r = await codeRunner.execute({
        code, language: language as ProgrammingLanguage, input: t.input || '',
        expectedOutput: t.expectedOutput || '', timeLimit: 10000, memoryLimit: 256,
      });
      if (r.graderUnavailable) unavailable = true;
      const error = r.compilationError || r.error || '';
      results.push(t.isHidden
        ? { hidden: true, pass: !!r.passed, error: error ? 'Your program stopped with an error on this test.' : '' }
        : { hidden: false, pass: !!r.passed, input: t.input || '', expected: t.expectedOutput || '', output: r.output || '', error });
      // A compile error fails every test the same way; one run is enough to say so.
      if (r.compilationError) break;
    }
    const passed = results.filter((r) => r.pass).length;
    res.json({
      success: true,
      data: { passed, total: tests.length, allPassed: passed === tests.length && !unavailable, graderUnavailable: unavailable, results },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err?.message || 'Could not check the code.' });
  }
};
