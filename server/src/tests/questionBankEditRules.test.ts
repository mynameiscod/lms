/**
 * What the question bank is allowed to change, and what it must refuse.
 *
 * The bank exists because targeting could only be set at the moment a draft was approved,
 * and no screen listed approved questions afterwards — 638 of 640 sat untargeted with no
 * way to tag them. Giving admins an editor over live assessment content introduces two ways
 * to do real damage, and these pin the refusals.
 *
 * ONE: A RECORDED ANSWER NAMES AN OPTION BY POSITION. Options carry no id, so an answer is
 * stored as `response: ["3"]` — the array index. Adding, removing or reordering an option on
 * a question somebody has answered rewrites what their answer meant: a student who chose C
 * silently becomes one who chose D, and their skill score is wrong with nothing on any
 * screen to show it. Wording may still be corrected, because fixing a typo in option C
 * leaves C as C.
 *
 * TWO: A BORROWED QUESTION IS SHARED WITH THE LMS. 184 of these live in the `questions`
 * collection alongside 293 LMS quizzes. Editing one in place edits it for the LMS too, so
 * the bank copies it into CareerPilot first and edits the copy.
 *
 * The decisions are reproduced rather than imported: the controller opens Mongo on every
 * path, and these are tests about which edit is permitted.
 */

import { normalizeDifficulty, isOwned } from '../services/questionBankService';

type Q = { owned: boolean; answers: number; optionCount: number };

/** Exactly the controller's decision for an incoming option array. */
function optionEditAllowed(q: Q, incomingCount: number): 'ok' | 'BORROWED' | 'ANSWERED' {
  if (!q.owned) return 'BORROWED';
  const structural = incomingCount !== q.optionCount;
  if (q.answers > 0 && structural) return 'ANSWERED';
  return 'ok';
}

/** Exactly the controller's delete rule. */
const mayHardDelete = (q: Q): boolean => q.answers === 0;

const OWNED = (answers = 0, optionCount = 4): Q => ({ owned: true, answers, optionCount });
const BORROWED = (answers = 0, optionCount = 4): Q => ({ owned: false, answers, optionCount });

describe('option structure is frozen once anyone has answered', () => {
  it('refuses to add an option to an answered question', () => {
    expect(optionEditAllowed(OWNED(12), 5)).toBe('ANSWERED');
  });

  it('refuses to remove one', () => {
    expect(optionEditAllowed(OWNED(12), 3)).toBe('ANSWERED');
  });

  /** THE POINT OF THE RULE: same count means positions still mean what they meant. */
  it('allows wording to be corrected in place', () => {
    expect(optionEditAllowed(OWNED(12), 4)).toBe('ok');
  });

  it('allows anything on a question nobody has answered', () => {
    expect(optionEditAllowed(OWNED(0), 6)).toBe('ok');
    expect(optionEditAllowed(OWNED(0), 2)).toBe('ok');
  });

  /** One answer is enough. The damage does not scale with the count. */
  it('treats a single recorded answer as binding', () => {
    expect(optionEditAllowed(OWNED(1), 5)).toBe('ANSWERED');
  });
});

describe('borrowed questions are copied, never edited in place', () => {
  it('refuses an edit to a question shared with the LMS bank', () => {
    expect(optionEditAllowed(BORROWED(0), 4)).toBe('BORROWED');
  });

  /** Borrowed loses to answered: it is refused even where the edit would be structurally safe. */
  it('refuses even when nothing has been answered', () => {
    expect(optionEditAllowed(BORROWED(0), 4)).not.toBe('ok');
  });

  it('recognises ownership from the CareerPilot tag', () => {
    expect(isOwned({ tags: ['careerpilot-drafted', 'SQL_JOINS'] })).toBe(true);
    expect(isOwned({ tags: ['careerpilot-owned'] })).toBe(true);
  });

  it('treats an untagged LMS question as borrowed', () => {
    expect(isOwned({ tags: ['java', 'oop'] })).toBe(false);
    expect(isOwned({ tags: [] })).toBe(false);
    expect(isOwned({})).toBe(false);
  });
});

describe('deleting versus retiring', () => {
  it('allows a hard delete only when nothing references the question', () => {
    expect(mayHardDelete(OWNED(0))).toBe(true);
  });

  /**
   * A question somebody answered is part of their recorded score. Deleting it would leave
   * their attempt pointing at nothing and make the score unexplainable, so the screen offers
   * Retire — which removes it from future pools and leaves the past readable.
   */
  it('refuses to delete a question that has been answered', () => {
    expect(mayHardDelete(OWNED(1))).toBe(false);
    expect(mayHardDelete(BORROWED(40))).toBe(false);
  });
});

describe('one vocabulary for difficulty', () => {
  /**
   * LMS questions grade easy/medium/hard in lower case; assessment items grade 1-5. A filter
   * that compared raw values matched neither reliably — the coverage script read zero for all
   * 43 skills once for exactly this reason.
   */
  it('normalises the LMS wording', () => {
    expect(normalizeDifficulty('medium')).toBe('MEDIUM');
    expect(normalizeDifficulty('Easy')).toBe('EASY');
    expect(normalizeDifficulty('HARD')).toBe('HARD');
  });

  it('folds a numeric scale into the three bands', () => {
    expect(normalizeDifficulty(1)).toBe('EASY');
    expect(normalizeDifficulty(2)).toBe('EASY');
    expect(normalizeDifficulty(3)).toBe('MEDIUM');
    expect(normalizeDifficulty(5)).toBe('HARD');
  });

  it('returns null rather than guessing', () => {
    expect(normalizeDifficulty(undefined)).toBeNull();
    expect(normalizeDifficulty('')).toBeNull();
    expect(normalizeDifficulty('tricky')).toBeNull();
  });
});

describe('one question, one audience', () => {
  /**
   * Targeting is stored per question-per-skill. A question measuring two skills can hold two
   * audiences that disagree — a state no screen can render honestly. Writing to every
   * mapping of a question is what keeps that impossible.
   */
  const applyToAll = (mappings: any[], audience: any) => mappings.map(m => ({ ...m, ...audience }));

  it('writes the same audience to every mapping of a question', () => {
    const before = [{ skillKey: 'SQL_JOINS', audienceYears: [] }, { skillKey: 'DB_FUNDAMENTALS', audienceYears: ['4th Year'] }];
    const after = applyToAll(before, { audienceYears: ['1st Year'] });
    expect(after.every(m => JSON.stringify(m.audienceYears) === JSON.stringify(['1st Year']))).toBe(true);
  });

  it('clearing targeting empties every mapping, so the question reaches everyone again', () => {
    const after = applyToAll(
      [{ audienceYears: ['1st Year'] }, { audienceYears: ['1st Year'] }],
      { audienceRoles: [], audienceYears: [], audienceCourses: [], audienceBranches: [] },
    );
    expect(after.every(m => m.audienceYears.length === 0)).toBe(true);
  });
});
