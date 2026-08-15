/**
 * SKILL_DNA_V1 — how observations become a skill score.
 *
 * Every weight lives here. Scattering `0.25` and `1.2` through services is how two code
 * paths end up computing a student's ability differently, and neither the student nor the
 * admin could tell which one produced the number they are looking at.
 *
 * DELIBERATELY SIMPLE AND EXPLAINABLE. This is a weighted average, not a psychometric
 * model. Every score traces to a list of observations an admin can read, and a formula
 * that fits in a paragraph. A more sophisticated model that nobody can explain to a
 * student who disagrees with their result would be worse, however defensible on paper.
 *
 * NO AI. Nothing asks a model how good somebody is at Java.
 */

export const SKILL_DNA_VERSION = 'SKILL_DNA_V1';

/**
 * How much an observation counts, by what the question was really testing.
 *
 * A secondary mapping is a genuine but glancing signal — the question exercised the skill
 * without being about it — so it contributes at a quarter strength rather than being
 * discarded. Discarding it would waste real information; counting it fully would let a
 * skill be judged mostly on questions that were about something else.
 */
export const RELATIONSHIP_WEIGHT: Record<string, number> = {
  PRIMARY: 1.0,
  SECONDARY: 0.25,
};

/**
 * How much an observation counts, by difficulty.
 *
 * Bounded deliberately close to 1. A hard question should carry a little more than an easy
 * one, but a 3x multiplier would let a single item dominate a skill — one unlucky answer
 * would swing the score further than the evidence justifies.
 */
export const DIFFICULTY_WEIGHT: Record<string, number> = {
  EASY: 0.85,
  MEDIUM: 1.0,
  HARD: 1.15,
};

/**
 * How much a source is trusted. One entry today, because only the personalised assessment
 * has canonical mappings and comparable grading; the shape exists so quizzes and projects
 * can be admitted later at their own reliability rather than silently at full strength.
 */
export const SOURCE_WEIGHT: Record<string, number> = {
  PERSONALIZED_ASSESSMENT: 1.0,
  /**
   * A mock interview answer, graded against a rubric.
   *
   * Real demonstrated evidence — the student said the thing, unprompted, under time — but
   * less controlled than a marked paper: the question is conversational, the rubric is
   * applied to prose, and a strong explainer can outshine a strong engineer. 0.6 says
   * "count it, and do not let it outweigh what was actually measured".
   *
   * This is the ONLY change to Module 7 for interview evidence. The arithmetic below is
   * untouched; the map existed precisely so a second source could be admitted at its own
   * reliability.
   */
  MOCK_INTERVIEW: 0.6,
};

/**
 * Confidence thresholds, on EFFECTIVE weight rather than raw count.
 *
 * Counting rows would let four secondary observations look like four direct ones. These
 * are intentionally conservative: claiming high confidence early is the mistake that makes
 * every later number suspect.
 */
export const CONFIDENCE_THRESHOLDS = {
  MEDIUM: 3,
  HIGH: 7,
};

/**
 * HIGH also requires breadth. Seven observations of the same question is repetition, not
 * corroboration — the student may simply have remembered it.
 */
export const HIGH_CONFIDENCE_MIN_DISTINCT_ITEMS = 3;

export const relationshipWeight = (r: string): number => RELATIONSHIP_WEIGHT[r] ?? RELATIONSHIP_WEIGHT.SECONDARY;
export const difficultyWeight = (d: string): number => DIFFICULTY_WEIGHT[String(d).toUpperCase()] ?? DIFFICULTY_WEIGHT.MEDIUM;
export const sourceWeight = (s: string): number => SOURCE_WEIGHT[s] ?? 1.0;

/**
 * What one observation counts for.
 *
 *   weight = relationship × difficulty × source
 *
 * Multiplicative so the components stay independent: changing how much secondary evidence
 * counts must not disturb how difficulty is treated.
 */
export function evidenceWeightFor(input: {
  relationship: string;
  difficulty: string;
  sourceType: string;
}): number {
  return relationshipWeight(input.relationship)
    * difficultyWeight(input.difficulty)
    * sourceWeight(input.sourceType);
}

/**
 * Performance on one item, as a fraction.
 *
 * Partial credit is preserved — a coding item worth 7 of 10 is genuinely different from a
 * wrong answer, and flattening it to a boolean would throw away the most informative
 * signal in the paper. Nonsense from a grader clamps to 0..1 rather than corrupting an
 * average that somebody will later be judged on.
 */
export function performanceFor(earnedPoints: number, maxPoints: number): number {
  const max = Number(maxPoints);
  const earned = Number(earnedPoints);
  if (!Number.isFinite(max) || max <= 0) return 0;
  if (!Number.isFinite(earned) || earned <= 0) return 0;
  return Math.min(1, earned / max);
}

export interface AggregationInput {
  performance: number;
  evidenceWeight: number;
  itemKey: string;
}

export interface AggregationResult {
  score: number;
  confidence: 'LOW' | 'MEDIUM' | 'HIGH';
  evidenceCount: number;
  effectiveEvidenceWeight: number;
  distinctItems: number;
}

/**
 * The whole formula:
 *
 *   score = 100 × Σ(performance × weight) / Σ(weight)
 *
 * Rounded only at the end, for storage and display. Confidence is computed from the same
 * inputs but answers an entirely different question — see below.
 */
export function aggregate(evidence: AggregationInput[]): AggregationResult {
  if (!evidence.length) {
    return { score: 0, confidence: 'LOW', evidenceCount: 0, effectiveEvidenceWeight: 0, distinctItems: 0 };
  }

  let weighted = 0;
  let total = 0;
  const items = new Set<string>();

  for (const e of evidence) {
    const w = Number.isFinite(e.evidenceWeight) && e.evidenceWeight > 0 ? e.evidenceWeight : 0;
    const p = Math.min(1, Math.max(0, Number(e.performance) || 0));
    weighted += p * w;
    total += w;
    items.add(e.itemKey);
  }

  // Every observation weighed zero — no opinion is possible, and 0 would read as failure.
  const score = total > 0 ? Math.round((weighted / total) * 100) : 0;

  return {
    score: Math.min(100, Math.max(0, score)),
    confidence: confidenceFor(total, items.size),
    evidenceCount: evidence.length,
    effectiveEvidenceWeight: Math.round(total * 100) / 100,
    distinctItems: items.size,
  };
}

/**
 * How much we have to go on — NOT how well they did.
 *
 * This never looks at the score. A consistently low score across twelve questions deserves
 * HIGH confidence: we are quite sure they are struggling, and that is one of the most
 * useful things the product can know. Letting a high score imply high confidence would
 * invert exactly the case where certainty matters most.
 */
export function confidenceFor(effectiveWeight: number, distinctItems: number): 'LOW' | 'MEDIUM' | 'HIGH' {
  if (effectiveWeight >= CONFIDENCE_THRESHOLDS.HIGH && distinctItems >= HIGH_CONFIDENCE_MIN_DISTINCT_ITEMS) {
    return 'HIGH';
  }
  if (effectiveWeight >= CONFIDENCE_THRESHOLDS.MEDIUM) return 'MEDIUM';
  return 'LOW';
}

/**
 * The arithmetic behind one score, in the order it was applied.
 *
 * For admin inspection: a student who disputes their result deserves an answer better than
 * "the system calculated it", and an admin needs to see the same rows the formula saw.
 */
export function explain(evidence: (AggregationInput & {
  itemSourceId?: string; difficulty?: string; relationship?: string;
})[]): { lines: string[]; score: number } {
  const r = aggregate(evidence);
  const lines = evidence.map(e =>
    `${e.itemKey}  performance ${(e.performance * 100).toFixed(0)}%  × weight ${e.evidenceWeight.toFixed(2)}`
    + `${e.difficulty ? `  (${e.difficulty.toLowerCase()}` : ''}${e.relationship ? `, ${e.relationship.toLowerCase()})` : e.difficulty ? ')' : ''}`);
  lines.push(`— weighted total ÷ weight total × 100 = ${r.score}`);
  return { lines, score: r.score };
}
