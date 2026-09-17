/**
 * Evidence kinds and the understanding-only cap.
 *
 * DIAGNOSTIC, UNDERSTANDING and APPLIED say what an observation can demonstrate; the weights say how much it counts.
 * The weights, the state bands and the confidence thresholds are unchanged — these tests pin that too, so the kind
 * model cannot quietly become a recalibration.
 */

import {
  evidenceKindOf, evidenceBasis, aggregate, evidenceWeightFor, CONFIDENCE_THRESHOLDS,
  HIGH_CONFIDENCE_MIN_DISTINCT_ITEMS, EVIDENCE_KIND_FOR_SOURCE,
} from '../data/skillDnaPolicy';
import { stateForScore, SCORE_BANDS } from '../data/adaptiveCurriculumPolicy';

const checkpoint = (i: number, performance = 1) => ({
  sourceType: 'MODULE_ASSESSMENT', performance, itemKey: `question:${i}`,
  evidenceWeight: evidenceWeightFor({ relationship: 'PRIMARY', difficulty: 'MEDIUM', sourceType: 'MODULE_ASSESSMENT' }),
});
const paper = (i: number, performance = 1, difficulty = 'MEDIUM') => ({
  sourceType: 'PERSONALIZED_ASSESSMENT', performance, itemKey: `paper:${i}`,
  evidenceWeight: evidenceWeightFor({ relationship: 'PRIMARY', difficulty, sourceType: 'PERSONALIZED_ASSESSMENT' }),
});
/** Graded work, with the verdict appliedEvidenceService records: coding assignments pass at 60 of 100, projects at 40. */
const applied = (i: number, performance: number, sourceType = 'CODING_ASSIGNMENT') => {
  const passStandard = sourceType === 'CODING_ASSIGNMENT' ? 0.6 : 0.4;
  return {
    sourceType, evidenceKind: 'APPLIED', performance, itemKey: `assignment:${i}`, passStandard,
    meetsPassStandard: performance + 1e-9 >= passStandard,
    evidenceWeight: evidenceWeightFor({ relationship: 'PRIMARY', difficulty: 'MEDIUM', sourceType }),
  };
};

/** Everything the plan reads about one skill, raw and effective. */
function judge(rows: any[]) {
  const r = aggregate(rows);
  const basis = evidenceBasis(rows);
  const raw = stateForScore({ score: r.score, confidence: r.confidence });
  const effective = stateForScore({ score: r.score, confidence: r.confidence, understandingOnly: basis.understandingOnly });
  return { score: r.score, confidence: r.confidence, raw, effective, capped: raw !== effective, basis };
}

describe('the numbers the kind model must not move', () => {
  it('keeps every weight, band and confidence threshold', () => {
    expect(evidenceWeightFor({ relationship: 'PRIMARY', difficulty: 'MEDIUM', sourceType: 'MODULE_ASSESSMENT' })).toBe(0.5);
    expect(['EASY', 'MEDIUM', 'HARD'].map(d => evidenceWeightFor({ relationship: 'PRIMARY', difficulty: d, sourceType: 'PERSONALIZED_ASSESSMENT' }))).toEqual([0.85, 1, 1.15]);
    expect(evidenceWeightFor({ relationship: 'PRIMARY', difficulty: 'MEDIUM', sourceType: 'MOCK_INTERVIEW' })).toBe(0.6);
    expect(SCORE_BANDS).toEqual({ FOUNDATION_REQUIRED_MAX: 39, GUIDED_MAX: 59, STANDARD_MAX: 74, REVISION_MAX: 84 });
    expect(CONFIDENCE_THRESHOLDS).toEqual({ MEDIUM: 3, HIGH: 7 });
    expect(HIGH_CONFIDENCE_MIN_DISTINCT_ITEMS).toBe(3);
  });

  it('admits graded coding and project work at weight 1.0', () => {
    expect(evidenceWeightFor({ relationship: 'PRIMARY', difficulty: 'MEDIUM', sourceType: 'CODING_ASSIGNMENT' })).toBe(1);
    expect(evidenceWeightFor({ relationship: 'PRIMARY', difficulty: 'MEDIUM', sourceType: 'PROJECT_EVALUATION' })).toBe(1);
  });
});

describe('kind, recorded or derived', () => {
  it('derives the kind of a row recorded before kinds existed from its source, without rewriting it', () => {
    expect(evidenceKindOf({ sourceType: 'PERSONALIZED_ASSESSMENT' })).toBe('DIAGNOSTIC');
    expect(evidenceKindOf({ sourceType: 'MODULE_ASSESSMENT' })).toBe('UNDERSTANDING');
    expect(evidenceKindOf({ sourceType: 'CODING_ASSIGNMENT' })).toBe('APPLIED');
    expect(evidenceKindOf({ sourceType: 'PROJECT_EVALUATION' })).toBe('APPLIED');
    // The model's default source, for the very oldest rows.
    expect(evidenceKindOf({})).toBe('DIAGNOSTIC');
  });

  it('keeps a mock interview at its existing semantics: never capped', () => {
    expect(EVIDENCE_KIND_FOR_SOURCE.MOCK_INTERVIEW).toBe('DIAGNOSTIC');
    const rows = [1, 2, 3, 4, 5, 6].map(i => ({ sourceType: 'MOCK_INTERVIEW', performance: 1, itemKey: `interview_question:${i}`, evidenceWeight: 0.6 }));
    expect(judge(rows)).toMatchObject({ raw: 'VERIFIED', effective: 'VERIFIED', capped: false });
  });

  it('prefers the recorded kind to the derived one', () => {
    expect(evidenceKindOf({ sourceType: 'MODULE_ASSESSMENT', evidenceKind: 'APPLIED' })).toBe('APPLIED');
    expect(evidenceKindOf({ sourceType: 'MODULE_ASSESSMENT', evidenceKind: 'NONSENSE' })).toBe('UNDERSTANDING');
  });
});

describe('the evidence mixes', () => {
  const right = (n: number) => Array.from({ length: n }, (_, i) => checkpoint(i));

  it('understanding only, all correct: 100 by score, planned at STANDARD', () => {
    const j = judge(right(6));
    expect(j).toMatchObject({ score: 100, confidence: 'MEDIUM', raw: 'VERIFIED', effective: 'STANDARD', capped: true });
    expect(j.basis).toMatchObject({ weights: { DIAGNOSTIC: 0, UNDERSTANDING: 3, APPLIED: 0 }, qualifyingApplied: { rows: 0, weight: 0 }, understandingOnly: true });
    expect(judge(right(18))).toMatchObject({ score: 100, confidence: 'HIGH', raw: 'VERIFIED', effective: 'STANDARD', capped: true });
  });

  it('understanding only, mixed: the cap never lowers a state', () => {
    expect(judge([1, 2, 3, 4, 5, 6].map(i => checkpoint(i, i <= 3 ? 1 : 0)))).toMatchObject({ score: 50, raw: 'GUIDED', effective: 'GUIDED', capped: false });
    expect(judge([1, 2, 3, 4, 5, 6, 7, 8].map(i => checkpoint(i, i <= 6 ? 1 : 0)))).toMatchObject({ score: 75, raw: 'REVISION', effective: 'STANDARD', capped: true });
  });

  it('the cap is in addition to low confidence, not instead of it', () => {
    expect(judge([checkpoint(1)])).toMatchObject({ score: 100, confidence: 'LOW', raw: 'STANDARD', effective: 'STANDARD', capped: false });
  });

  it('understanding + a failed practical (20%): the grade counts in the score, and the cap stays', () => {
    // 18 × 0.5 × 100% + 1 × 20% over a weight of 10 → 92: VERIFIED by score, which a failed attempt must not unlock.
    const j = judge([...right(18), applied(1, 0.2)]);
    expect(j).toMatchObject({ score: 92, confidence: 'HIGH', raw: 'VERIFIED', effective: 'STANDARD', capped: true });
    expect(j.basis).toMatchObject({ weights: { UNDERSTANDING: 9, APPLIED: 1 }, qualifyingApplied: { rows: 0 }, understandingOnly: true });
    expect(judge([...right(6), applied(1, 0.2)])).toMatchObject({ score: 80, raw: 'REVISION', effective: 'STANDARD', capped: true });
  });

  it('understanding + a practical just below its pass line: still capped', () => {
    expect(judge([...right(18), applied(1, 0.59)])).toMatchObject({ score: 96, raw: 'VERIFIED', effective: 'STANDARD', capped: true });
    expect(judge([...right(18), applied(1, 0.39, 'PROJECT_EVALUATION')])).toMatchObject({ effective: 'STANDARD', capped: true });
  });

  it('understanding + a practical exactly at its pass line: demonstrated, normal thresholds apply', () => {
    const j = judge([...right(18), applied(1, 0.6)]);
    expect(j).toMatchObject({ score: 96, raw: 'VERIFIED', effective: 'VERIFIED', capped: false });
    expect(j.basis.qualifyingApplied).toEqual({ rows: 1, weight: 1 });
    expect(judge([...right(18), applied(1, 0.4, 'PROJECT_EVALUATION')])).toMatchObject({ effective: 'VERIFIED', capped: false });
  });

  it('understanding + a high practical: VERIFIED', () => {
    expect(judge([...right(6), applied(1, 1)])).toMatchObject({ score: 100, confidence: 'MEDIUM', effective: 'VERIFIED', capped: false });
  });

  it('a qualifying practical does not rescue a low score: states still follow score and confidence', () => {
    expect(judge([...[1, 2, 3, 4, 5, 6].map(i => checkpoint(i, 0)), applied(1, 0.6)])).toMatchObject({ score: 15, effective: 'FOUNDATION_REQUIRED' });
  });

  it('applied only: passing work is not capped; failing work scores below the pass line anyway', () => {
    expect(judge([applied(1, 0.9), applied(2, 0.95), applied(3, 1)])).toMatchObject({ score: 95, confidence: 'MEDIUM', effective: 'VERIFIED', capped: false });
    expect(judge([applied(1, 0.5), applied(2, 0.55), applied(3, 0.5)])).toMatchObject({ score: 52, effective: 'GUIDED', capped: false });
  });

  it('an APPLIED row with no recorded verdict does not unlock anything', () => {
    const unknown = { ...applied(1, 1), meetsPassStandard: undefined };
    expect(judge([...right(18), unknown])).toMatchObject({ effective: 'STANDARD', capped: true });
  });

  it('failed then passed, and passed then failed, give the same Skill DNA: both attempts count, order does not', () => {
    const failedThenPassed = judge([...right(18), applied(1, 0.2), { ...applied(1, 0.9), itemKey: 'assignment:1' }]);
    const passedThenFailed = judge([...right(18), applied(1, 0.9), { ...applied(1, 0.2), itemKey: 'assignment:1' }]);
    expect(failedThenPassed).toMatchObject({ score: 92, effective: 'VERIFIED', capped: false });
    expect(passedThenFailed).toEqual(failedThenPassed);
  });

  it('diagnostic present: the cap does not apply, and a failed practical pulls the score down at full weight', () => {
    expect(judge([1, 2, 3, 4].map(i => paper(i)))).toMatchObject({ score: 100, confidence: 'MEDIUM', effective: 'VERIFIED', capped: false });
    expect(judge([...[1, 2, 3, 4].map(i => paper(i)), ...[1, 2, 3, 4].map(i => checkpoint(i))])).toMatchObject({ score: 100, effective: 'VERIFIED', capped: false });
    // Four items: one failed practical drops VERIFIED to REVISION. Eight items: it does not, by the normal arithmetic.
    expect(judge([...[1, 2, 3, 4].map(i => paper(i)), applied(1, 0.2)])).toMatchObject({ score: 84, effective: 'REVISION' });
    const eight = [1, 2, 3, 4, 5, 6, 7, 8].map(i => paper(i, 1, ['EASY', 'MEDIUM', 'MEDIUM', 'HARD'][i % 4]));
    expect(judge([...eight, applied(1, 0.2)])).toMatchObject({ score: 91, effective: 'VERIFIED' });
    expect(judge([...eight, applied(1, 0.2), applied(2, 0.2)])).toMatchObject({ score: 84, effective: 'REVISION' });
  });

  it('weak diagnostic + successful practicals: each pass moves the score; twelve lift a zero diagnostic to REVISION', () => {
    const zero = [1, 2, 3, 4].map(i => paper(i, 0));
    expect(judge([...zero, applied(1, 1)])).toMatchObject({ score: 20, effective: 'FOUNDATION_REQUIRED' });
    const reached = (state: string) => {
      for (let n = 1; n <= 60; n++) if (judge([...zero, ...Array.from({ length: n }, (_, i) => applied(i, 1))]).effective === state) return n;
      return null;
    };
    expect({ GUIDED: reached('GUIDED'), STANDARD: reached('STANDARD'), REVISION: reached('REVISION'), VERIFIED: reached('VERIFIED') })
      .toEqual({ GUIDED: 3, STANDARD: 6, REVISION: 12, VERIFIED: 22 });
  });

  it('a reassessment is averaged with the sitting before it, in either direction', () => {
    const initial = (p: number) => [1, 2, 3, 4].map(i => paper(i, p));
    const reassess = (p: number) => [5, 6, 7, 8].map(i => paper(i, p));
    expect(judge([...initial(0), ...reassess(1)])).toMatchObject({ score: 50, confidence: 'HIGH', effective: 'GUIDED' });
    expect(judge([...initial(1), ...reassess(0)])).toMatchObject({ score: 50, confidence: 'HIGH', effective: 'GUIDED' });
  });
});
