import AssessmentItem from '../models/AssessmentItem';
import Question from '../models/Question';
import PassportAssessment from '../models/PassportAssessment';
import ThinkingProblem from '../models/ThinkingProblem';

/**
 * Grading one answer, per content family.
 *
 * The bridge Module 6 left open: it generates a paper and freezes it, and nothing marked
 * the result. This does not introduce a grading ENGINE — each family already declares what
 * a right answer is, in its own way, and this reads that declaration rather than inventing
 * a second opinion about correctness.
 *
 * Four families, four vocabularies, established long before CareerPilot:
 *
 *   AssessmentItem       correctOptionIds[]  — ids, and may be multi-select
 *   Question             options[].isCorrect — the flag lives on the option
 *   PassportAssessment   correctIndex        — a position, or -1 for a self-report
 *   ThinkingProblem      code only           — no answer key to compare against
 *
 * Anything this cannot grade confidently returns `gradable: false` rather than a zero. An
 * ungraded answer must not become evidence that a student got something wrong, because
 * downstream that is indistinguishable from a real failure and would quietly drag their
 * skill profile down for a reason nobody could trace.
 */

export interface GradedAnswer {
  sourceType: string;
  sourceId: string;
  /** False when this content type has no answer key we can trust. */
  gradable: boolean;
  earnedPoints: number;
  maxPoints: number;
  /** Null when the item was presented but never answered. */
  answered: boolean;
  reason?: string;
}

export interface SubmittedAnswer {
  sourceType: string;
  sourceId: string;
  /** Whatever the client sent — an index, an id, several ids, or free text. */
  response?: any;
}

const asArray = (v: any): string[] =>
  (Array.isArray(v) ? v : v === undefined || v === null || v === '' ? [] : [v]).map(String);

const ungradable = (a: SubmittedAnswer, reason: string): GradedAnswer => ({
  sourceType: a.sourceType, sourceId: a.sourceId,
  gradable: false, earnedPoints: 0, maxPoints: 0, answered: false, reason,
});

/**
 * Grade a whole submission — one batched query per content family, never one per answer.
 *
 * A paper is thirty answers across up to four families, so this is at most four reads
 * however long the assessment is.
 */
export async function gradeSubmittedAnswers(
  tenantId: string,
  answers: SubmittedAnswer[],
): Promise<GradedAnswer[]> {
  const byType = new Map<string, SubmittedAnswer[]>();
  for (const a of answers) {
    const list = byType.get(a.sourceType) || [];
    list.push(a);
    byType.set(a.sourceType, list);
  }

  const out: GradedAnswer[] = [];

  for (const [type, list] of byType) {
    const ids = list.map(a => String(a.sourceId));

    if (type === 'assessment_item') {
      const rows = await AssessmentItem.find({ tenantId, _id: { $in: ids } }).lean() as any[];
      const byId = new Map(rows.map(r => [String(r._id), r]));
      for (const a of list) {
        const item = byId.get(String(a.sourceId));
        if (!item) { out.push(ungradable(a, 'content no longer exists')); continue; }

        const key = asArray(item.correctOptionIds);
        // No key means a coding or open item. Those are graded by the existing code
        // service on their own path; marking them wrong here would be a fabrication.
        if (!key.length) { out.push(ungradable(a, 'no answer key — graded elsewhere')); continue; }

        const given = asArray(a.response);
        const answered = given.length > 0;
        // Multi-select is all-or-nothing: partial credit on a set question needs a rule
        // nobody has agreed, and inventing one here would be a silent product decision.
        const correct = answered
          && given.length === key.length
          && given.every(g => key.includes(g));

        out.push({
          sourceType: type, sourceId: a.sourceId, gradable: true, answered,
          earnedPoints: correct ? 1 : 0, maxPoints: 1,
        });
      }
      continue;
    }

    if (type === 'question') {
      const rows = await Question.find({ tenantId, _id: { $in: ids } }).lean() as any[];
      const byId = new Map(rows.map(r => [String(r._id), r]));
      for (const a of list) {
        const q = byId.get(String(a.sourceId));
        if (!q) { out.push(ungradable(a, 'content no longer exists')); continue; }

        const opts = (q.options || []) as any[];
        if (!opts.length || !opts.some(o => o.isCorrect)) {
          out.push(ungradable(a, 'no answer key — graded elsewhere'));
          continue;
        }

        // Options are identified by their own id, or by position when they have none.
        const key = opts.map((o, i) => ({ id: String(o._id ?? i), isCorrect: !!o.isCorrect }))
          .filter(o => o.isCorrect).map(o => o.id);
        const given = asArray(a.response);
        const answered = given.length > 0;
        const correct = answered && given.length === key.length && given.every(g => key.includes(g));

        out.push({
          sourceType: type, sourceId: a.sourceId, gradable: true, answered,
          earnedPoints: correct ? 1 : 0, maxPoints: 1,
        });
      }
      continue;
    }

    if (type === 'passport_question') {
      const doc: any = await PassportAssessment.findOne({ tenantId }).lean();
      const byId = new Map((doc?.questions || []).map((q: any) => [String(q._id), q]));
      for (const a of list) {
        const q: any = byId.get(String(a.sourceId));
        if (!q) { out.push(ungradable(a, 'content no longer exists')); continue; }

        // A self-report has no right answer — it records what somebody says about
        // themselves. Treating an opinion as a wrong answer would be meaningless.
        if (q.selfReport || Number(q.correctIndex) < 0) {
          out.push(ungradable(a, 'self-report — not a right-or-wrong question'));
          continue;
        }

        const given = asArray(a.response)[0];
        const answered = given !== undefined && given !== '';
        out.push({
          sourceType: type, sourceId: a.sourceId, gradable: true, answered,
          earnedPoints: answered && Number(given) === Number(q.correctIndex) ? 1 : 0,
          maxPoints: 1,
        });
      }
      continue;
    }

    if (type === 'thinking_problem') {
      const rows = await ThinkingProblem.find({ tenantId, _id: { $in: ids } }).select('_id').lean() as any[];
      const known = new Set(rows.map(r => String(r._id)));
      for (const a of list) {
        // These are code and reasoning problems with no multiple-choice key. Their grading
        // belongs to the existing code service, on its own path.
        out.push(ungradable(a, known.has(String(a.sourceId))
          ? 'code problem — graded elsewhere'
          : 'content no longer exists'));
      }
      continue;
    }

    for (const a of list) out.push(ungradable(a, `unsupported content type ${type}`));
  }

  return out;
}
