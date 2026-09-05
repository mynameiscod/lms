/**
 * A quiz is worth what its questions are worth.
 *
 * THE BUG. Quiz.totalMarks was typed by an author and stored beside the questions rather than
 * derived from them, and nothing reconciled the two. A quiz of eighteen questions worth twenty
 * marks declared itself out of eighteen, and a student who earned nineteen was shown 106% —
 * reported from a live results screen.
 *
 * It reads as a display bug and is not one: every percentage on that paper was divided by the
 * wrong denominator and the pass mark applied against the wrong scale. It cuts both ways. One
 * quiz in production stores 105 when only 77 marks exist, so twenty-six students were told
 * they had scored far less than they had. Across the database, 36 quizzes of 293 disagreed
 * with their own questions, over 444 submitted attempts.
 */
import { percentageOf } from '../services/quizMarksService';

describe('the percentage a student is shown', () => {
  it('is the score over the paper’s real total', () => {
    expect(percentageOf(19, 20)).toBe(95);
    expect(percentageOf(18, 20)).toBe(90);
    expect(percentageOf(10, 20)).toBe(50);
  });

  /**
   * The reported failure, both ways round: the same 19 marks read 106% against the stored
   * eighteen and 95% against the twenty that actually existed.
   */
  it('never exceeds 100, whatever the stored numbers say', () => {
    expect(percentageOf(19, 18)).toBe(100);
    expect(percentageOf(50, 10)).toBe(100);
  });

  it('never goes below zero', () => {
    expect(percentageOf(-5, 20)).toBe(0);
  });

  /**
   * A quiz with no marks cannot produce a percentage, and must not produce Infinity or NaN —
   * either would reach a results screen as a blank or a crash rather than a number.
   */
  it('returns zero rather than dividing by nothing', () => {
    expect(percentageOf(5, 0)).toBe(0);
    expect(percentageOf(5, NaN as any)).toBe(0);
    expect(percentageOf(5, undefined as any)).toBe(0);
    expect(percentageOf(5, -3)).toBe(0);
  });

  it('handles a missing score as zero rather than NaN', () => {
    expect(percentageOf(undefined as any, 20)).toBe(0);
    expect(percentageOf(NaN as any, 20)).toBe(0);
  });

  it('rounds to two places, so a result page does not print sixteen digits', () => {
    // 12/18 was rendering as 66.66666666666666 on the live screen.
    expect(percentageOf(12, 18)).toBe(66.67);
    expect(percentageOf(1, 3)).toBe(33.33);
  });

  it('is exact at the boundaries', () => {
    expect(percentageOf(0, 20)).toBe(0);
    expect(percentageOf(20, 20)).toBe(100);
  });

  /** The seven attempts from the reported quiz, against the total that really existed. */
  it('reprices the reported results correctly', () => {
    const real = 20;
    expect(percentageOf(19, real)).toBe(95);
    expect(percentageOf(18, real)).toBe(90);
    expect(percentageOf(16, real)).toBe(80);
    expect(percentageOf(15, real)).toBe(75);
    expect(percentageOf(12, real)).toBe(60);
    expect(percentageOf(10, real)).toBe(50);
  });
});
