/**
 * A Year-2 golden bank item, as authored.
 *
 * ── WHY THIS IS TYPESCRIPT AND NOT CSV ────────────────────────────────────────────────────
 *
 * Year 1's bank lives in CSV because it was assembled from several earlier banks and reviewed in
 * a spreadsheet. Year 2's is authored from nothing, and authoring three hundred rows of quoted
 * CSV by hand invites exactly the errors the importer then rejects: a comma inside a prompt, a
 * correctOption letter that does not match correctAnswerText, four options that are really three.
 *
 * Writing them typed removes that class of mistake entirely. `correctIndex` points into
 * `options`, so the letter and the answer text are DERIVED when the CSV is emitted rather than
 * repeated and kept in step by hand. The emitter produces the same master format Year 1 uses, so
 * the importer, its validation and its stable ids are shared rather than reimplemented.
 *
 * ── WHAT A ROW IS ─────────────────────────────────────────────────────────────────────────
 *
 * One fact, measured one way, at one difficulty. `factId` names the piece of knowledge;
 * `familyId` names the measurement that probes it. Several items may share a family — that is
 * how a family spans the difficulty band it can honestly carry — but two items sharing a family
 * must never appear in one paper, which is what `reassessmentGroup` and the selector's fact
 * awareness between them prevent.
 */

export type Band = 'D1' | 'D2' | 'D3' | 'D4' | 'D5';

export type Cognitive = 'REMEMBER' | 'UNDERSTAND' | 'APPLY' | 'ANALYZE' | 'EVALUATE';

export interface GoldenItem {
  /** Unique across the whole Year-2 bank. Prefix GB2_, then a skill tag, then a number. */
  questionId: string;
  skillKey: string;
  /** The area of the skill this sits in. */
  conceptId: string;
  /** The specific thing being known. */
  factId: string;
  /** The measurement. Items sharing one are variants of the same probe. */
  familyId: string;
  /** Items in one group must not be served to the same student as evidence of progress. */
  reassessmentGroup: string;
  difficulty: Band;
  cognitiveLevel: Cognitive;
  prompt: string;
  /** Exactly four, all distinct. */
  options: [string, string, string, string];
  /** Index into `options`. The letter and the answer text are derived from it. */
  correctIndex: 0 | 1 | 2 | 3;
  /**
   * Why the answer is right — and, where it earns its place, why the tempting wrong one is
   * wrong. A student reads this after answering; it is teaching, not justification.
   */
  explanation: string;
}

/** The per-skill and per-level totals Year 1 holds to, and Year 2 matches. */
export const PER_SKILL_TOTAL = 50;
export const PER_LEVEL_TOTAL = 10;
export const BANDS: Band[] = ['D1', 'D2', 'D3', 'D4', 'D5'];
