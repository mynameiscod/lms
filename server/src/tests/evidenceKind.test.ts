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
const applied = (i: number, performance: number, sourceType = 'CODING_ASSIGNMENT') => ({
  sourceType, evidenceKind: 'APPLIED', performance, itemKey: `assignment:${i}`,
  evidenceWeight: evidenceWeightFor({ relationship: 'PRIMARY', difficulty: 'MEDIUM', sourceType }),
});

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
  it('understanding only: six right checkpoint answers are 100, MEDIUM, VERIFIED by score — and planned at STANDARD', () => {
    const j = judge([1, 2, 3, 4, 5, 6].map(i => checkpoint(i)));
    expect(j).toMatchObject({ score: 100, confidence: 'MEDIUM', raw: 'VERIFIED', effective: 'STANDARD', capped: true });
    expect(j.basis).toEqual({ weights: { DIAGNOSTIC: 0, UNDERSTANDING: 3, APPLIED: 0 }, rows: { DIAGNOSTIC: 0, UNDERSTANDING: 6, APPLIED: 0 }, understandingOnly: true });
  });

  it('understanding only never lowers a state: a weak or middling result is exactly what it was', () => {
    expect(judge([1, 2, 3, 4, 5, 6].map(i => checkpoint(i, i <= 3 ? 1 : 0)))).toMatchObject({ score: 50, raw: 'GUIDED', effective: 'GUIDED', capped: false });
    expect(judge([1, 2, 3, 4, 5, 6, 7, 8].map(i => checkpoint(i, i <= 6 ? 1 : 0)))).toMatchObject({ score: 75, raw: 'REVISION', effective: 'STANDARD', capped: true });
  });

  it('the cap is in addition to low confidence, not instead of it', () => {
    expect(judge([checkpoint(1)])).toMatchObject({ score: 100, confidence: 'LOW', raw: 'STANDARD', effective: 'STANDARD', capped: false });
  });

  it('diagnostic only: a strong Skill Check keeps its high state', () => {
    expect(judge([1, 2, 3, 4].map(i => paper(i)))).toMatchObject({ score: 100, confidence: 'MEDIUM', raw: 'VERIFIED', effective: 'VERIFIED', capped: false });
  });

  it('applied only: graded work is not capped', () => {
    expect(judge([applied(1, 0.9), applied(2, 0.95), applied(3, 1)])).toMatchObject({ score: 95, confidence: 'MEDIUM', effective: 'VERIFIED', capped: false });
  });

  it('diagnostic and understanding: a diagnostic present lifts the cap', () => {
    expect(judge([...[1, 2, 3, 4].map(i => paper(i)), ...[1, 2, 3, 4].map(i => checkpoint(i))])).toMatchObject({ score: 100, effective: 'VERIFIED', capped: false });
  });

  it('understanding and successful applied work: VERIFIED', () => {
    const j = judge([...[1, 2, 3, 4, 5, 6].map(i => checkpoint(i)), applied(1, 1)]);
    expect(j).toMatchObject({ score: 100, confidence: 'MEDIUM', effective: 'VERIFIED', capped: false });
    expect(j.basis.weights).toEqual({ DIAGNOSTIC: 0, UNDERSTANDING: 3, APPLIED: 1 });
  });

  it('understanding and failed applied work: the failure enters the weighted score at full weight', () => {
    // 6 × 0.5 × 100% + 1 × 20% over a weight of 4 → 80.
    expect(judge([...[1, 2, 3, 4, 5, 6].map(i => checkpoint(i)), applied(1, 0.2)])).toMatchObject({ score: 80, raw: 'REVISION', effective: 'REVISION', capped: false });
  });

  it('diagnostic and failed applied work: the failure pulls a measured skill down', () => {
    expect(judge([...[1, 2, 3, 4].map(i => paper(i)), applied(1, 0.2)])).toMatchObject({ score: 84, effective: 'REVISION' });
  });

  it('repeated applied work is two observations; a regrade of one is not a third', () => {
    const first = applied(1, 0.2);
    const reattempt = { ...applied(1, 0.9), itemKey: 'assignment:1' };
    expect(aggregate([first, reattempt])).toMatchObject({ score: 55, evidenceCount: 2, distinctItems: 1 });
    // A regrade replaces its row (same identity) — the aggregate sees one row at the new grade.
    expect(aggregate([{ ...first, performance: 0.7 }])).toMatchObject({ score: 70, evidenceCount: 1 });
  });
});
