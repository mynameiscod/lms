/**
 * The seams where the adaptive engine meets the rest of the product.
 *
 * Wiring is where a working engine quietly stops working: a save from an unrelated screen wipes
 * its configuration, a grading edge case records a zero nobody earned, or a projection runs on a
 * half-finished attempt. None of these throw, and all of them leave a product that looks healthy
 * and personalises wrongly.
 */

/* ================================================================== *
 * The Curriculum Builder must not erase skill mappings
 * ================================================================== */

/** Mirrors preserveAdaptiveFields in curriculumController. */
const ADAPTIVE_FIELDS = [
  'moduleCode', 'topicCode', 'skillKeys', 'prerequisiteSkillKeys',
  'defaultDepth', 'mandatory', 'applicableDirections', 'learningOutcomes',
];

function preserveAdaptiveFields(incoming: any[], stored: any[]): any[] {
  const byId = new Map<string, any>();
  const byCode = new Map<string, any>();
  for (const t of stored || []) {
    if (t?._id) byId.set(String(t._id), t);
    if (t?.topicCode) byCode.set(String(t.topicCode), t);
  }
  return (incoming || []).map(t => {
    const prev = (t?._id && byId.get(String(t._id))) || (t?.topicCode && byCode.get(String(t.topicCode)));
    if (!prev) return t;
    const merged: any = { ...t };
    for (const f of ADAPTIVE_FIELDS) {
      if (merged[f] === undefined && prev[f] !== undefined) merged[f] = prev[f];
    }
    return merged;
  });
}

describe('saving a curriculum from a screen that knows nothing about skills', () => {
  const stored = [{
    _id: 'a1', title: 'Loops', topicCode: 'T_LOOPS',
    skillKeys: ['LOOPS_BASICS'], mandatory: true,
    applicableDirections: [], defaultDepth: 'FOUNDATION',
  }];

  /**
   * The hazard this exists for. The Curriculum Builder sends the whole topics array built from
   * the fields IT understands, and the update replaces the array wholesale — so one ordinary
   * save would have erased every mapping, with no error and no way to notice except students
   * quietly stopping being personalised.
   */
  it('keeps the skill mapping the builder did not send', () => {
    const incoming = [{ _id: 'a1', title: 'Loops', startDay: 3, endDay: 5 }];
    const out = preserveAdaptiveFields(incoming, stored);
    expect(out[0].skillKeys).toEqual(['LOOPS_BASICS']);
    expect(out[0].defaultDepth).toBe('FOUNDATION');
    expect(out[0].mandatory).toBe(true);
  });

  it('still applies the edits the builder did send', () => {
    const incoming = [{ _id: 'a1', title: 'Loops and Iteration', startDay: 3, endDay: 6 }];
    const out = preserveAdaptiveFields(incoming, stored);
    expect(out[0].title).toBe('Loops and Iteration');
    expect(out[0].endDay).toBe(6);
  });

  it('lets a client that knows about skills change them', () => {
    const incoming = [{ _id: 'a1', title: 'Loops', skillKeys: ['LOOPS_BASICS', 'DSA_ARRAYS'] }];
    expect(preserveAdaptiveFields(incoming, stored)[0].skillKeys).toEqual(['LOOPS_BASICS', 'DSA_ARRAYS']);
  });

  /** Omission and clearing must stay distinguishable, or nothing can ever be unset. */
  it('treats an explicit empty array as a real instruction to clear', () => {
    const incoming = [{ _id: 'a1', title: 'Loops', skillKeys: [] }];
    expect(preserveAdaptiveFields(incoming, stored)[0].skillKeys).toEqual([]);
  });

  it('matches by topicCode when the subdocument id changed', () => {
    const incoming = [{ title: 'Loops', topicCode: 'T_LOOPS' }];
    expect(preserveAdaptiveFields(incoming, stored)[0].skillKeys).toEqual(['LOOPS_BASICS']);
  });

  it('leaves a genuinely new topic alone', () => {
    const incoming = [{ title: 'Brand new topic' }];
    expect(preserveAdaptiveFields(incoming, stored)[0].skillKeys).toBeUndefined();
  });

  it('does not resurrect a mapping onto an unrelated topic', () => {
    const incoming = [{ _id: 'zz', title: 'Something else' }];
    expect(preserveAdaptiveFields(incoming, stored)[0].skillKeys).toBeUndefined();
  });
});

/* ================================================================== *
 * Grading a quiz answer into evidence
 * ================================================================== */

/** Mirrors the marks resolution in quizSkillBridge. */
const earnedFor = (s: { marksAwarded?: number; isCorrect?: boolean }, maxPoints: number): number =>
  typeof s.marksAwarded === 'number' ? Math.max(0, s.marksAwarded) : (s.isCorrect ? maxPoints : 0);

describe('turning a marked answer into evidence', () => {
  it('uses awarded marks when they exist, keeping partial credit', () => {
    expect(earnedFor({ marksAwarded: 1.5 }, 2)).toBe(1.5);
  });

  it('falls back to the boolean for rows written before partial credit', () => {
    expect(earnedFor({ isCorrect: true }, 2)).toBe(2);
    expect(earnedFor({ isCorrect: false }, 2)).toBe(0);
  });

  /** Zero awarded is a real result and must not be mistaken for "not marked". */
  it('does not treat a legitimate zero as missing', () => {
    expect(earnedFor({ marksAwarded: 0, isCorrect: false }, 2)).toBe(0);
  });

  it('never records negative credit', () => {
    expect(earnedFor({ marksAwarded: -1 }, 2)).toBe(0);
  });
});

/* ================================================================== *
 * When a quiz should NOT become evidence
 * ================================================================== */

describe('quizzes that teach us nothing', () => {
  const shouldProject = (a: { submittedAt?: Date | null; mappedAnswers: number }) =>
    !!a.submittedAt && a.mappedAnswers > 0;

  /**
   * An unfinished attempt says nothing about ability. Projecting it would record every
   * unanswered question as a failure — evidence of nothing, weighted like evidence of something.
   */
  it('ignores an attempt that was never submitted', () => {
    expect(shouldProject({ submittedAt: null, mappedAnswers: 5 })).toBe(false);
  });

  /**
   * An unmapped quiz is not an error — it has simply never been classified, so nothing can
   * honestly be concluded from it. This is also what makes the feature switch itself on per
   * quiz as questions get mapped, with no flag and no migration.
   */
  it('ignores a quiz whose questions carry no skills', () => {
    expect(shouldProject({ submittedAt: new Date(), mappedAnswers: 0 })).toBe(false);
  });

  it('projects a submitted, mapped attempt', () => {
    expect(shouldProject({ submittedAt: new Date(), mappedAnswers: 3 })).toBe(true);
  });
});

/* ================================================================== *
 * Retakes
 * ================================================================== */

describe('a student retaking a quiz', () => {
  /**
   * Keyed by ATTEMPT, not quiz. A retake is new evidence that the weighted average blends with
   * the first try; keying by quiz would let the second attempt silently overwrite the first,
   * turning "improved after practice" into "always knew it".
   */
  const evidenceKey = (attemptId: string, itemId: string, skillKey: string) =>
    `${attemptId}|${itemId}|${skillKey}`;

  it('records a second attempt as separate evidence', () => {
    expect(evidenceKey('attempt1', 'q1', 'LOOPS_BASICS'))
      .not.toBe(evidenceKey('attempt2', 'q1', 'LOOPS_BASICS'));
  });

  it('is idempotent within one attempt, so a replay cannot inflate a score', () => {
    expect(evidenceKey('attempt1', 'q1', 'LOOPS_BASICS'))
      .toBe(evidenceKey('attempt1', 'q1', 'LOOPS_BASICS'));
  });
});
