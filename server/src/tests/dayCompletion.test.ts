/**
 * A day finishes when the work on it is finished — and an empty day never finishes itself.
 *
 * The rule was `items.every(itemDone)`, and `[].every(...)` is `true`. A day carrying no items
 * completed the moment a student opened it: no work, no click, nothing they could have done
 * differently, and `currentDay` advanced past content they were never given. A day whose items
 * are all optional did the same, because `itemDone` answers true for those by design.
 *
 * Both are reachable — a composed day goes empty when the content behind its unit is unpublished
 * or deleted after the plan was written, which `verifyStageJourneys` already counts as
 * EMPTY_DAYS — and the check runs on a GET, so LOOKING at such a day was enough to bank it.
 */

import { dayIsComplete, itemDone } from '../controllers/enrollmentPlanController';

const content = (id: string, extra: any = {}) => ({ kind: 'content', contentId: id, required: true, ...extra });
const quiz = (id: string, extra: any = {}) => ({ kind: 'quiz', sourceId: id, required: true, ...extra });
const ticked = (id: string, day = 1) => ({ contentId: id, dayNumber: day });

describe('an unfinished day stays unfinished', () => {
  it('is not complete while a content item is untouched', () => {
    expect(dayIsComplete([content('a'), content('b')], 1, [ticked('a')], {})).toBe(false);
  });

  it('is not complete while its checkpoint has not been attempted', () => {
    expect(dayIsComplete([content('a'), quiz('q')], 1, [ticked('a')], {})).toBe(false);
  });

  it('counts a tick only for the day it was earned on', () => {
    expect(dayIsComplete([content('a')], 2, [ticked('a', 1)], {})).toBe(false);
  });
});

describe('a finished day finishes', () => {
  it('is complete when every required item is done', () => {
    expect(dayIsComplete(
      [content('a'), quiz('q')], 1, [ticked('a')], { q: { attempted: true } },
    )).toBe(true);
  });

  it('does not wait for an optional item', () => {
    expect(dayIsComplete(
      [content('a'), content('b', { required: false })], 1, [ticked('a')], {},
    )).toBe(true);
  });
});

describe('a day with nothing required is BROKEN, not finished', () => {
  it('never completes an empty day — this is the bug', () => {
    expect(dayIsComplete([], 1, [], {})).toBe(false);
    /* The old rule, for contrast: `[].every(...)` is true. */
    expect(([] as any[]).every(i => itemDone(i, 1, [], {}))).toBe(true);
  });

  it('never completes a day whose every item is optional', () => {
    const optionalOnly = [content('a', { required: false }), quiz('q', { required: false })];
    expect(dayIsComplete(optionalOnly, 1, [], {})).toBe(false);
    /* Each of those items IS individually "done" — which is exactly why the old rule banked it. */
    expect(optionalOnly.every(i => itemDone(i, 1, [], {}))).toBe(true);
  });

  it('still completes when one required item sits among optional ones', () => {
    expect(dayIsComplete(
      [content('a'), content('b', { required: false })], 1, [ticked('a')], {},
    )).toBe(true);
  });
});
