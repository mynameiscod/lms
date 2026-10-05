/**
 * An author's order beats the type order, and partial numbering does not scramble the rest.
 *
 * The day's sequence was a rule about TYPES — video, notes, worked example, then practice. It is
 * right for most days and cannot express "the notes set this video up", so an author adding a
 * second video watched it land at the bottom with nothing to move it with.
 *
 * The risk in fixing that is the half-numbered day: number two items and the other three must
 * keep their places rather than being flung somewhere. That is what most of this file is about.
 */

import { inTeachingOrder } from '../data/contentBundlePolicy';

const row = (id: string, type: string, extra: any = {}) =>
  ({ _id: id, type, createdAt: new Date('2026-01-01'), ...extra });

const ids = (rows: any[]) => rows.map(r => String(r._id));

describe('without an author order, the type order still decides', () => {
  it('teaches before it practises, whatever order the rows arrive in', () => {
    const out = inTeachingOrder([
      row('practice', 'practice_theory'),
      row('notes', 'notes'),
      row('video', 'video'),
    ]);
    expect(ids(out)).toEqual(['video', 'notes', 'practice']);
  });

  it('breaks a tie on canonical, then on age, then on id — never on luck', () => {
    const out = inTeachingOrder([
      row('b', 'video', { createdAt: new Date('2026-02-01') }),
      row('a', 'video', { createdAt: new Date('2026-01-01') }),
      row('c', 'video', { createdAt: new Date('2026-01-01'), canonical: true }),
    ]);
    expect(ids(out)).toEqual(['c', 'a', 'b']);
  });
});

describe('an author order wins', () => {
  it('puts the notes before the video when that is what was asked for', () => {
    const out = inTeachingOrder([
      row('video', 'video', { unitOrder: 1 }),
      row('notes', 'notes', { unitOrder: 0 }),
    ]);
    expect(ids(out)).toEqual(['notes', 'video']);
  });

  it('lets a second video sit after the practice', () => {
    const out = inTeachingOrder([
      row('v1', 'video', { unitOrder: 0 }),
      row('p', 'practice_theory', { unitOrder: 1 }),
      row('v2', 'video', { unitOrder: 2 }),
    ]);
    expect(ids(out)).toEqual(['v1', 'p', 'v2']);
  });

  it('is stable: ordering an already-ordered day changes nothing', () => {
    const rows = [
      row('a', 'practice_theory', { unitOrder: 0 }),
      row('b', 'video', { unitOrder: 1 }),
      row('c', 'notes', { unitOrder: 2 }),
    ];
    expect(ids(inTeachingOrder(inTeachingOrder(rows)))).toEqual(['a', 'b', 'c']);
  });
});

describe('a half-numbered day keeps its head', () => {
  it('places the numbered rows first and leaves the rest in type order behind them', () => {
    const out = inTeachingOrder([
      row('notes', 'notes'),
      row('practice', 'practice_theory'),
      row('video2', 'video', { unitOrder: 0 }),
    ]);
    /* The placed row leads; the unplaced two keep teaching order relative to each other
       rather than being shuffled by the change. */
    expect(ids(out)).toEqual(['video2', 'notes', 'practice']);
  });

  it('treats 0 as a position, not as "unset"', () => {
    const out = inTeachingOrder([
      row('video', 'video'),
      row('practice', 'practice_theory', { unitOrder: 0 }),
    ]);
    expect(ids(out)).toEqual(['practice', 'video']);
  });

  it('ignores a null, which is how a cleared position arrives from Mongo', () => {
    const out = inTeachingOrder([
      row('practice', 'practice_theory', { unitOrder: null }),
      row('video', 'video', { unitOrder: null }),
    ]);
    expect(ids(out)).toEqual(['video', 'practice']);
  });
});

describe('the caller\'s array is never reordered underneath them', () => {
  it('returns a new array and leaves the input alone', () => {
    const input = [row('practice', 'practice_theory'), row('video', 'video')];
    const out = inTeachingOrder(input);
    expect(ids(input)).toEqual(['practice', 'video']);
    expect(ids(out)).toEqual(['video', 'practice']);
  });
});
