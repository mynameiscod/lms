/**
 * The order a unit's content is taught in.
 *
 * A content row carries no sequence number — the `order` on LearningContentLibrary belongs to the
 * questions inside a Q&A row, not to the row itself. So order has to come from somewhere, and
 * these tests hold the two properties that make deriving it safe rather than arbitrary: it
 * follows teaching shape, and it never changes between calls.
 *
 * The second is easy to under-rate. A bundle that reshuffles between page loads reads as broken
 * even when every item in it is correct, and it is the kind of fault that survives review because
 * nobody looks at the same screen twice in a row.
 */

import {
  inTeachingOrder, teachingRank, roleOf, teaches, TEACHING_ORDER,
} from '../data/contentBundlePolicy';

const row = (over: any = {}) => ({
  _id: over._id || Math.random().toString(36).slice(2, 10),
  type: over.type || 'notes',
  canonical: over.canonical,
  createdAt: over.createdAt || new Date('2026-01-01T00:00:00Z'),
  ...over,
});

const titles = (rows: any[]) => rows.map(r => r.type);

describe('teaching order', () => {
  it('is watch, read, see it done, practise, prove', () => {
    const shuffled = [
      row({ type: 'practice_coding' }),
      row({ type: 'notes' }),
      row({ type: 'video' }),
      row({ type: 'practice_theory' }),
      row({ type: 'worked_example' }),
    ];

    expect(titles(inTeachingOrder(shuffled)))
      .toEqual(['video', 'notes', 'worked_example', 'practice_theory', 'practice_coding']);
  });

  it('puts an unknown type last rather than first', () => {
    const rows = [row({ type: 'something_new' }), row({ type: 'video' })];
    // A type nobody has classified is more likely to be supplementary than to be the thing a
    // student should open first.
    expect(titles(inTeachingOrder(rows))).toEqual(['video', 'something_new']);
    expect(teachingRank('something_new')).toBe(TEACHING_ORDER.length);
  });

  it('leads each type with the row somebody marked canonical', () => {
    const rows = [
      row({ _id: 'b', type: 'video', canonical: false }),
      row({ _id: 'a', type: 'video', canonical: true }),
    ];
    // AI generation has produced near-duplicates for years; canonical makes the pick a decision
    // rather than an accident of insertion order.
    expect(inTeachingOrder(rows).map(r => r._id)).toEqual(['a', 'b']);
  });

  it('falls back to age, then to id, so two calls never disagree', () => {
    const same = new Date('2026-02-02T00:00:00Z');
    const rows = [
      row({ _id: 'zzz', type: 'notes', createdAt: same }),
      row({ _id: 'aaa', type: 'notes', createdAt: same }),
      row({ _id: 'mmm', type: 'notes', createdAt: new Date('2026-01-01T00:00:00Z') }),
    ];

    const first = inTeachingOrder(rows).map(r => r._id);
    const second = inTeachingOrder([...rows].reverse()).map(r => r._id);

    expect(first).toEqual(['mmm', 'aaa', 'zzz']);
    // Same rows in, same order out, whatever order they arrived in.
    expect(second).toEqual(first);
  });

  it('does not reorder the caller’s array', () => {
    const rows = [row({ type: 'practice_coding' }), row({ type: 'video' })];
    const before = rows.map(r => r.type);
    inTeachingOrder(rows);
    // Sorting in place would shuffle a lean() result something else is still reading.
    expect(rows.map(r => r.type)).toEqual(before);
  });
});

describe('what a type is for', () => {
  it('separates teaching from practice', () => {
    expect(roleOf('video')).toBe('TEACH');
    expect(roleOf('worked_example')).toBe('TEACH');
    expect(roleOf('practice_coding')).toBe('PRACTISE');
    expect(roleOf('tech_qa')).toBe('REINFORCE');
    expect(roleOf('something_new')).toBe('OTHER');
  });

  it('knows that practice alone is not a lesson', () => {
    // The publish gate turns on this: a unit with exercises and no explanation is a blank page
    // with homework attached.
    expect(teaches('practice_coding')).toBe(false);
    expect(teaches('video')).toBe(true);
    expect(teaches('worked_example')).toBe(true);
  });
});
