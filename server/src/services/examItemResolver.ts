import AssessmentItem from '../models/AssessmentItem';
import CodingProblem, { CodingProblemTestCase } from '../models/CodingProblem';

/**
 * Load the items an exam attempt drew, from whichever store each one came from.
 *
 * Hackathon exams were built on AssessmentItem. Sections can now also draw from the Problem
 * Bank; this is the one place that knows the difference. A bank problem is returned in the
 * shape the exam code already reads (prompt, language, starterCode, testCases with `hidden`)
 * plus `pb` — the judge's view of the problem — so the run and grade paths can use the bank's
 * judge, which is what applies the hidden header/footer wrapper code.
 *
 * Items are looked up by id with NO status filter: archiving a problem in the middle of an
 * event must not void the question for candidates who already drew it.
 */

export interface ExamItem {
  _id: any;
  source: 'assessment_bank' | 'problem_bank';
  type: string;
  prompt: string;
  codeSnippet?: string;
  language?: string;
  starterCode?: string;
  functionSignature?: string;
  testCases: { input: string; expectedOutput: string; hidden: boolean; weight?: number }[];
  /** Problem Bank only: every language the candidate may use, with its starter. */
  languages?: { language: string; starterCode: string }[];
  /** Problem Bank only: what problemJudgeService.judge needs. Never sent to a browser. */
  pb?: { kind: 'code' | 'sql'; languages: any[]; sqlSetup: string; limits: any; comparisonMode: any; marks: number };
  [k: string]: any;
}

function problemPrompt(p: any): string {
  return [
    p.title ? `### ${p.title}` : '',
    p.statement,
    p.inputFormat ? `**Input**\n\n${p.inputFormat}` : '',
    p.outputFormat ? `**Output**\n\n${p.outputFormat}` : '',
    p.constraints ? `**Constraints**\n\n${p.constraints}` : '',
  ].filter((x) => x && String(x).trim()).join('\n\n');
}

export async function loadExamItems(drawn: { itemId: any; source?: string }[]): Promise<Map<string, ExamItem>> {
  const pbIds = drawn.filter((d) => d.source === 'problem_bank').map((d) => d.itemId);
  const aiIds = drawn.filter((d) => d.source !== 'problem_bank').map((d) => d.itemId);
  const out = new Map<string, ExamItem>();

  if (aiIds.length) {
    const items = await AssessmentItem.find({ _id: { $in: aiIds } }).lean() as any[];
    for (const i of items) out.set(String(i._id), { ...i, source: 'assessment_bank', testCases: i.testCases || [] });
  }

  if (pbIds.length) {
    const [problems, tests] = await Promise.all([
      CodingProblem.find({ _id: { $in: pbIds } }).lean() as Promise<any[]>,
      CodingProblemTestCase.find({ problemId: { $in: pbIds } }).sort({ order: 1 }).lean() as Promise<any[]>,
    ]);
    const byProblem = new Map<string, any[]>();
    for (const t of tests) {
      const k = String(t.problemId);
      if (!byProblem.has(k)) byProblem.set(k, []);
      byProblem.get(k)!.push(t);
    }
    for (const p of problems) {
      const langs = (p.languages || []).map((l: any) => ({ language: l.language, starterCode: l.starterCode || '' }));
      out.set(String(p._id), {
        _id: p._id,
        source: 'problem_bank',
        type: p.kind === 'sql' ? 'sql' : 'live_code',
        prompt: problemPrompt(p),
        language: langs[0]?.language,
        starterCode: langs[0]?.starterCode || '',
        languages: langs,
        testCases: (byProblem.get(String(p._id)) || []).map((t) => ({
          input: t.input, expectedOutput: t.expectedOutput, hidden: !t.isSample, weight: t.weight,
        })),
        pb: {
          kind: p.kind, languages: p.languages, sqlSetup: p.sqlSetup, limits: p.limits,
          comparisonMode: p.comparisonMode, marks: p.marks,
        },
      });
    }
  }
  return out;
}

export async function loadExamItem(drawnItem: { itemId: any; source?: string }): Promise<ExamItem | null> {
  if (drawnItem.source !== 'problem_bank') {
    const i: any = await AssessmentItem.findById(drawnItem.itemId).lean();
    return i ? { ...i, source: 'assessment_bank', testCases: i.testCases || [] } : null;
  }
  return (await loadExamItems([drawnItem])).get(String(drawnItem.itemId)) || null;
}
