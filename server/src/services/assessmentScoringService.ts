import AssessmentItem, { IAssessmentItem } from '../models/AssessmentItem';
import AssessmentSubmission, {
  IAssessmentSubmission,
  ISubmissionItem,
  ISubScore,
} from '../models/AssessmentSubmission';
import { ASSESSMENT_DIMENSIONS, AssessmentDimension, WAVE_A_TYPES, WAVE_B_TYPES } from '../constants/assessment';
import { gradeCodeItem } from './assessmentCodeGradingService';

/**
 * Scoring service — grades Wave A items (no code execution), rolls responses up
 * into per-dimension sub-scores, a composite Readiness Score (0–100), and a
 * peer percentile.
 *
 * Wave B items (live_code / sql) are graded by the Piston runner in Slice 2; any
 * item left ungraded is simply excluded from the sub-score totals so its absence
 * never penalizes the candidate.
 */

const normalizeOutput = (s: string): string =>
  (s || '')
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((l) => l.replace(/\s+$/g, ''))
    .join('\n')
    .replace(/\n{2,}/g, '\n')
    .trim();

const sameSet = (a: string[] = [], b: string[] = []): boolean => {
  if (a.length !== b.length) return false;
  const sb = new Set(b);
  return a.every((x) => sb.has(x));
};

/** Grade a single Wave A item against the candidate's response. Mutates `resp`. */
export function gradeWaveAItem(item: IAssessmentItem, resp: ISubmissionItem): void {
  const maxScore = item.points ?? 1;
  resp.maxScore = maxScore;
  let isCorrect = false;
  let score = 0;

  switch (item.type) {
    case 'mcq': {
      isCorrect = sameSet(resp.selectedOptionIds || [], item.correctOptionIds || []);
      score = isCorrect ? maxScore : 0;
      break;
    }
    case 'predict_output': {
      isCorrect = normalizeOutput(resp.predictedOutput || '') === normalizeOutput(item.expectedOutput || '');
      score = isCorrect ? maxScore : 0;
      break;
    }
    case 'debug': {
      isCorrect = typeof resp.identifiedLine === 'number' && resp.identifiedLine === item.buggyLineNumber;
      score = isCorrect ? maxScore : 0;
      break;
    }
    case 'complete_code': {
      const blanks = item.blanks || [];
      if (blanks.length) {
        let correctBlanks = 0;
        for (const b of blanks) {
          const given = (resp.blankAnswers || {})[b.id] ?? '';
          const ok = b.acceptedAnswers.some((ans) =>
            b.caseSensitive ? ans === given : ans.toLowerCase().trim() === String(given).toLowerCase().trim()
          );
          if (ok) correctBlanks++;
        }
        score = Math.round((correctBlanks / blanks.length) * maxScore * 100) / 100;
        isCorrect = correctBlanks === blanks.length;
      }
      break;
    }
    default:
      return; // Wave B types handled elsewhere
  }

  resp.graded = true;
  resp.isCorrect = isCorrect;
  resp.score = score;
}

/** Roll graded items up into per-dimension sub-scores (0–100). */
export function computeSubScores(items: ISubmissionItem[]): ISubScore[] {
  const acc: Record<string, { correct: number; total: number }> = {};
  for (const dim of ASSESSMENT_DIMENSIONS) acc[dim] = { correct: 0, total: 0 };

  for (const it of items) {
    if (!it.graded) continue; // ungraded (Wave B not yet scored) → excluded
    const bucket = acc[it.dimension];
    if (!bucket) continue;
    bucket.total += it.maxScore || 0;
    bucket.correct += it.score || 0;
  }

  return ASSESSMENT_DIMENSIONS.filter((d) => acc[d].total > 0).map((d) => ({
    dimension: d as AssessmentDimension,
    correct: Math.round(acc[d].correct * 100) / 100,
    total: acc[d].total,
    percentage: Math.round((acc[d].correct / acc[d].total) * 100),
  }));
}

/** Weighted composite Readiness Score (0–100) using the blueprint's dimension weights. */
export function computeReadinessScore(
  subScores: ISubScore[],
  dimensionWeights: { dimension: AssessmentDimension; weight: number }[]
): number {
  if (!subScores.length) return 0;
  const weightOf = (d: AssessmentDimension) => dimensionWeights.find((w) => w.dimension === d)?.weight ?? 1;
  let weighted = 0;
  let totalWeight = 0;
  for (const s of subScores) {
    const w = weightOf(s.dimension);
    weighted += s.percentage * w;
    totalWeight += w;
  }
  return totalWeight ? Math.round(weighted / totalWeight) : 0;
}

/** Percentile of `readinessScore` vs prior submitted same-segment candidates. */
export async function computePercentile(
  tenantId: string,
  segment: string,
  readinessScore: number
): Promise<number> {
  const [lower, total] = await Promise.all([
    AssessmentSubmission.countDocuments({
      tenantId,
      'candidate.segment': segment,
      status: 'submitted',
      readinessScore: { $lt: readinessScore },
    }),
    AssessmentSubmission.countDocuments({ tenantId, 'candidate.segment': segment, status: 'submitted' }),
  ]);
  if (total < 5) return Math.max(40, Math.min(95, readinessScore)); // not enough peers yet → soft estimate
  return Math.round((lower / total) * 100);
}

/**
 * Grade an entire submission's Wave A items and compute all aggregate scores.
 * Returns the computed pieces; the caller persists them.
 */
export async function gradeSubmission(submission: IAssessmentSubmission): Promise<{
  items: ISubmissionItem[];
  subScores: ISubScore[];
  readinessScore: number;
  percentile: number;
}> {
  const itemIds = submission.items.map((i) => i.itemId);
  const itemDocs = await AssessmentItem.find({ _id: { $in: itemIds } }).lean<IAssessmentItem[]>();
  const byId = new Map(itemDocs.map((d) => [String(d._id), d]));

  const codeGradingTasks: Promise<void>[] = [];
  for (const resp of submission.items) {
    const item = byId.get(String(resp.itemId));
    if (!item) continue;
    if (WAVE_A_TYPES.includes(item.type)) {
      gradeWaveAItem(item, resp);
    } else if (WAVE_B_TYPES.includes(item.type)) {
      // Run live-code / SQL against test cases via Piston (concurrently).
      codeGradingTasks.push(gradeCodeItem(item, resp));
    }
  }
  if (codeGradingTasks.length) await Promise.all(codeGradingTasks);

  const subScores = computeSubScores(submission.items);
  const dimensionWeights =
    (submission.blueprintSnapshot?.dimensions as { dimension: AssessmentDimension; weight: number }[]) || [];
  const readinessScore = computeReadinessScore(subScores, dimensionWeights);
  const percentile = await computePercentile(submission.tenantId, submission.candidate.segment, readinessScore);

  return { items: submission.items, subScores, readinessScore, percentile };
}
