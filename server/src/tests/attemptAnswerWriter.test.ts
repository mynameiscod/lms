/**
 * The 22 September duplicate-answer bug, and the rules that stop it coming back.
 *
 * 137 of 291 attempts ended up with two records for the same question, 135 of them
 * contradictory, and grading read the first — so four candidates were marked wrong on
 * questions they had answered.
 *
 * Two write paths could not see each other. `saveAnswer` did a guarded atomic upsert.
 * `runCode` loaded the attempt, pushed an element into the in-memory array when it did not
 * find one, and wrote the whole document back with `attempt.save()`. Interleaved, both
 * created the element and the full-document save put a second copy back.
 *
 * These tests drive the two paths against one shared fake collection, in the order that
 * actually broke, and assert the array holds exactly one record per question.
 */
import { writeAnswer, dedupeAnswers, hasDuplicateAnswers } from '../services/attemptAnswerWriter';

/* ── a fake collection that behaves the way Mongo does for these three operations ────────── */

const docs = new Map<string, any>();

const applyUpdate = (filter: any, update: any) => {
  const doc = docs.get(String(filter._id));
  if (!doc) return { matchedCount: 0, modifiedCount: 0 };
  const want = filter['answers.itemId'];

  if (update.$set || update.$inc) {
    const i = doc.answers.findIndex((x: any) => String(x.itemId) === String(want));
    if (i < 0) return { matchedCount: 0, modifiedCount: 0 };
    for (const [p, v] of Object.entries(update.$set || {})) {
      doc.answers[i][p.replace('answers.$.', '')] = v;
    }
    for (const [p, v] of Object.entries(update.$inc || {})) {
      const k = p.replace('answers.$.', '');
      doc.answers[i][k] = (doc.answers[i][k] || 0) + (v as number);
    }
    return { matchedCount: 1, modifiedCount: 1 };
  }

  if (update.$push) {
    // The guard: { 'answers.itemId': { $ne: id } } matches nothing once the element exists.
    const absent = want && typeof want === 'object' ? want.$ne : undefined;
    if (absent !== undefined && doc.answers.some((x: any) => String(x.itemId) === String(absent))) {
      return { matchedCount: 0, modifiedCount: 0 };
    }
    doc.answers.push({ ...update.$push.answers });
    return { matchedCount: 1, modifiedCount: 1 };
  }
  return { matchedCount: 0, modifiedCount: 0 };
};

jest.mock('../models/HackathonExamAttempt', () => ({
  __esModule: true,
  default: {
    updateOne: async (f: any, u: any) => applyUpdate(f, u),
    findOne: (f: any, p?: any) => ({
      lean: async () => {
        const doc = docs.get(String(f._id));
        if (!doc) return null;
        const m = p?.answers?.$elemMatch;
        if (!m) return doc;
        const el = doc.answers.find((x: any) => String(x.itemId) === String(m.itemId));
        return { ...doc, answers: el ? [el] : [] };
      },
    }),
  },
}));

const DRAWN = { itemId: 'q1', sectionKey: 'code' };

beforeEach(() => {
  docs.clear();
  docs.set('a1', { _id: 'a1', answers: [] });
});

const answers = () => docs.get('a1').answers;

describe('writeAnswer never produces two records for one question', () => {
  it('creates the element on the first write', async () => {
    const el = await writeAnswer('a1', DRAWN, { set: { code: 'x' } });
    expect(answers()).toHaveLength(1);
    expect(el?.code).toBe('x');
    expect(el?.sectionKey).toBe('code');
  });

  it('updates in place on the second write rather than appending', async () => {
    await writeAnswer('a1', DRAWN, { set: { code: 'first' } });
    await writeAnswer('a1', DRAWN, { set: { code: 'second' } });
    expect(answers()).toHaveLength(1);
    expect(answers()[0].code).toBe('second');
  });

  it('holds at one record when two first-writes land together', async () => {
    /* THE BUG. Both callers see an empty array and both decide to create the element. */
    await Promise.all([
      writeAnswer('a1', DRAWN, { set: { code: 'from-save' } }),
      writeAnswer('a1', DRAWN, { inc: { runCount: 1 }, set: { lastRunAt: new Date() } }),
    ]);
    expect(answers()).toHaveLength(1);
    expect(hasDuplicateAnswers(answers())).toBe(false);
  });

  it('holds at one record under a burst of interleaved writes', async () => {
    await Promise.all(
      Array.from({ length: 12 }, (_, i) =>
        i % 2
          ? writeAnswer('a1', DRAWN, { set: { code: `c${i}` } })
          : writeAnswer('a1', DRAWN, { inc: { runCount: 1 } }),
      ),
    );
    expect(answers()).toHaveLength(1);
  });

  it('keeps separate questions separate', async () => {
    await writeAnswer('a1', DRAWN, { set: { code: 'one' } });
    await writeAnswer('a1', { itemId: 'q2', sectionKey: 'mcq' }, { set: { text: 'two' } });
    expect(answers()).toHaveLength(2);
    expect(answers().map((a: any) => a.itemId)).toEqual(['q1', 'q2']);
  });

  it('charges each run exactly once, so two clicks cost two slots', async () => {
    /*
     * runCode used to read runCount, add one and write the document back, so two clicks
     * arriving together both read the same value and the second run was free. The count is
     * now advanced by $inc, which cannot lose a concurrent increment.
     */
    await writeAnswer('a1', DRAWN, { set: { code: 'x' } });
    await Promise.all([
      writeAnswer('a1', DRAWN, { inc: { runCount: 1 } }),
      writeAnswer('a1', DRAWN, { inc: { runCount: 1 } }),
      writeAnswer('a1', DRAWN, { inc: { runCount: 1 } }),
    ]);
    expect(answers()[0].runCount).toBe(3);
  });

  it('starts a counter at the right value when the element is created by the increment', async () => {
    const el = await writeAnswer('a1', DRAWN, { inc: { runCount: 1 } });
    /* $inc on a field that does not exist yet would have started from zero and lost this one. */
    expect(el?.runCount).toBe(1);
  });

  it('returns what is stored, not what was sent', async () => {
    await writeAnswer('a1', DRAWN, { set: { code: 'stored' } });
    const el = await writeAnswer('a1', DRAWN, { inc: { runCount: 1 } });
    /* The throttle reads this. It must carry the code written by the OTHER path too. */
    expect(el?.code).toBe('stored');
    expect(el?.runCount).toBe(1);
  });
});

describe('dedupeAnswers repairs what the race already produced', () => {
  const rec = (over: any = {}) =>
    ({ itemId: 'q1', sectionKey: 'code', runCount: 0, graded: false, ...over } as any);

  it('prefers the record containing work over the empty one', () => {
    /*
     * This is the case that cost four candidates marks. Grading took the first record; the
     * first record was empty; the answer was in the second.
     */
    const kept = dedupeAnswers([rec({}), rec({ code: 'real work' })]);
    expect(kept).toHaveLength(1);
    expect(kept[0].code).toBe('real work');
  });

  it('prefers work even when the empty record is the more recent one', () => {
    const kept = dedupeAnswers([
      rec({ code: 'real work', answeredAt: new Date('2026-09-22T10:00:00Z') }),
      rec({ answeredAt: new Date('2026-09-22T11:00:00Z') }),
    ]);
    expect(kept[0].code).toBe('real work');
  });

  it('takes the later answer when both contain work', () => {
    const kept = dedupeAnswers([
      rec({ code: 'early', answeredAt: new Date('2026-09-22T10:00:00Z') }),
      rec({ code: 'late', answeredAt: new Date('2026-09-22T11:00:00Z') }),
    ]);
    expect(kept[0].code).toBe('late');
  });

  it('treats whitespace-only code as no work', () => {
    const kept = dedupeAnswers([rec({ code: '   \n  ' }), rec({ code: 'x=1' })]);
    expect(kept[0].code).toBe('x=1');
  });

  it('counts a selected MCQ option as work', () => {
    const kept = dedupeAnswers([rec({}), rec({ selectedOptionIds: ['b'] })]);
    expect(kept[0].selectedOptionIds).toEqual(['b']);
  });

  it('preserves draw order across questions', () => {
    const kept = dedupeAnswers([
      rec({ itemId: 'q3' }), rec({ itemId: 'q1' }),
      rec({ itemId: 'q3', code: 'x' }), rec({ itemId: 'q2' }),
    ]);
    expect(kept.map(a => String(a.itemId))).toEqual(['q3', 'q1', 'q2']);
  });

  it('leaves an already-clean paper untouched', () => {
    const clean = [rec({ itemId: 'q1' }), rec({ itemId: 'q2' })];
    expect(dedupeAnswers(clean)).toEqual(clean);
    expect(hasDuplicateAnswers(clean)).toBe(false);
  });

  it('copes with an empty array', () => {
    expect(dedupeAnswers([])).toEqual([]);
    expect(hasDuplicateAnswers([])).toBe(false);
  });

  it('detects duplicates before deciding to repair', () => {
    expect(hasDuplicateAnswers([rec({}), rec({})])).toBe(true);
    expect(hasDuplicateAnswers([rec({ itemId: 'q1' }), rec({ itemId: 'q2' })])).toBe(false);
  });
});
