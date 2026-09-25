/**
 * The welcome before Day 1: who it blocks, what finishes a day, and what it must never do.
 *
 * The rules that matter to a student: a new member does it first, a member already learning is
 * never locked out by it, a missing microphone cannot block anybody, and nothing here becomes
 * evidence about a skill.
 */

/* The service skips the database when there is no connection; these tests mock the models instead,
   so the connection is reported live and every mock is exercised. */
jest.mock('mongoose', () => {
  const actual = jest.requireActual('mongoose');
  return { __esModule: true, default: { ...actual, connection: { readyState: 1 }, Types: actual.Types } };
});

const programs: any[] = [];
const progresses: any[] = [];
const enrollments: any[] = [];
const awarded: any[] = [];

const lean = (value: any) => ({ lean: async () => value, select: () => lean(value) });

jest.mock('../models/OrientationProgram', () => ({
  __esModule: true,
  default: {
    findOne: (q: any) => lean(programs.find(p => p.tenantId === q.tenantId) || null),
    updateOne: async (q: any, update: any) => {
      const existing = programs.find(p => p.tenantId === q.tenantId);
      if (existing) Object.assign(existing, update.$set);
      else programs.push({ tenantId: q.tenantId, ...update.$set });
      return { acknowledged: true };
    },
  },
}));

/** A stored progress row behaves like a document: mutate, then save. */
const asDoc = (row: any) => Object.assign(row, { save: async () => row });

jest.mock('../models/OrientationProgress', () => ({
  __esModule: true,
  default: {
    findOne: async (q: any) => {
      const row = progresses.find(p => p.tenantId === q.tenantId && String(p.studentId) === String(q.studentId));
      return row ? asDoc(row) : null;
    },
    create: async (doc: any) => { const row = asDoc({ ...doc }); progresses.push(row); return row; },
  },
}));

jest.mock('../models/CurriculumEnrollment', () => ({
  __esModule: true,
  default: { find: (q: any) => lean(enrollments.filter(e => e.tenantId === q.tenantId)) },
}));

jest.mock('../services/gamificationEngine', () => ({
  processGamificationEvent: jest.fn(async (e: any) => { awarded.push(e); return { xpAwarded: 15 }; }),
}));

import {
  orientationFor, orientationBlocksLearning, completeOrientationItem, completeOrientationDay,
  saveOrientationProgram,
} from '../services/orientationService';
import { DEFAULT_ORIENTATION } from '../data/orientationPolicy';

const TENANT = '6aa8e4d702b4b0e2097b221d';
const STUDENT = '5f9d1b2c3a4b5c6d7e8f9999';

/**
 * Let the calendar move on, for a member who is paced.
 *
 * Winding the stored start date back N days is exactly equivalent to N midnights passing, and
 * reads better in a test than freezing the clock: `travel(1)` is "it is tomorrow now".
 *
 * Needed because a paced member gets ONE welcome day per calendar day, so a test that finishes
 * five of them has to let five days pass — which is the rule, not an obstacle to it.
 */
const travel = (days: number) => {
  for (const row of progresses) {
    if (row.pacedFrom) row.pacedFrom = new Date(new Date(row.pacedFrom).getTime() - days * 86_400_000);
  }
};

const finishDay = async (day: number) => {
  const d = DEFAULT_ORIENTATION.find(x => x.dayNumber === day)!;
  /* Each welcome day is a day apart. Day 1 is open the day they join; the rest need a midnight. */
  if (day > 1) travel(1);
  for (const item of d.items.filter(i => i.required)) {
    await completeOrientationItem({ tenantId: TENANT, studentId: STUDENT, dayNumber: day, itemKey: item.key });
  }
  return completeOrientationDay(TENANT, STUDENT, day);
};

beforeEach(() => {
  programs.length = 0; progresses.length = 0; enrollments.length = 0; awarded.length = 0;
});

describe('the shipped welcome', () => {
  it('is five days, and every day has something to do', () => {
    expect(DEFAULT_ORIENTATION).toHaveLength(5);
    expect(DEFAULT_ORIENTATION.every(d => d.items.length > 0)).toBe(true);
  });

  it('never asks a student to record before it lets them past', () => {
    const recordings = DEFAULT_ORIENTATION.flatMap(d => d.items.filter(i => i.kind === 'recording'));
    expect(recordings.length).toBeGreaterThan(0);
    expect(recordings.every(i => i.required === false)).toBe(true);
  });

  it('measures nothing: no quiz, no assessment, no skill', () => {
    const kinds = new Set(DEFAULT_ORIENTATION.flatMap(d => d.items.map(i => i.kind)));
    expect([...kinds].sort()).toEqual(['checklist', 'image', 'notes', 'recording', 'video']);
    expect(JSON.stringify(DEFAULT_ORIENTATION)).not.toMatch(/skillKey|quizId|assessment/i);
  });

  it('ships the videos empty, so an admin can see what is missing', () => {
    const videos = DEFAULT_ORIENTATION.flatMap(d => d.items.filter(i => i.kind === 'video'));
    expect(videos.every(v => v.url === '')).toBe(true);
  });
});

describe('a member who has not started learning', () => {
  it('must finish orientation before their first day', async () => {
    expect(await orientationBlocksLearning(TENANT, STUDENT)).toBe(true);
    const view = await orientationFor(TENANT, STUDENT);
    expect(view).toMatchObject({ enabled: true, mandatory: true, complete: false, nextDay: 1 });
  });

  it('meets the days in order', async () => {
    const view = await orientationFor(TENANT, STUDENT);
    expect(view.days[0].locked).toBe(false);
    expect(view.days.slice(1).every(d => d.locked)).toBe(true);
  });

  it('cannot finish a day while a required part is outstanding', async () => {
    const r = await completeOrientationDay(TENANT, STUDENT, 1);
    expect(r.ok).toBe(false);
    expect(r.outstanding).toEqual(['A word from the founder']);
  });

  it('finishes day one without recording anything', async () => {
    const r = await finishDay(1);
    expect(r.ok).toBe(true);
    const view = await orientationFor(TENANT, STUDENT);
    expect(view.days[0].done).toBe(true);
  });

  /**
   * THE POINT OF PACING, IN ONE TEST.
   *
   * Finishing the welcome in an evening makes it a form to fill in. A member who finishes day
   * one has nothing more to open today — and is told that it opens tomorrow, not that it is
   * locked, because those are different things to hear.
   */
  it('gives a paced member nothing more to open on the day they finish a welcome day', async () => {
    await finishDay(1);
    const today = await orientationFor(TENANT, STUDENT);
    expect(today.paced).toBe(true);
    expect(today.days[1]).toMatchObject({ dayNumber: 2, locked: true, lockedReason: 'NOT_TODAY_YET' });
    expect(today.days[1].opensAt).toBeTruthy();
    expect(today.nextDay).toBeNull();

    travel(1);

    const tomorrow = await orientationFor(TENANT, STUDENT);
    expect(tomorrow.days[1]).toMatchObject({ dayNumber: 2, locked: false });
    expect(tomorrow.days[1].opensAt).toBeNull();
    expect(tomorrow.nextDay).toBe(2);
    /* And still only one: day three waits for its own midnight. */
    expect(tomorrow.days[2]).toMatchObject({ dayNumber: 3, locked: true });
  });

  it('refuses work recorded against a day the calendar has not reached', async () => {
    await finishDay(1);
    const r = await completeOrientationDay(TENANT, STUDENT, 2);
    expect(r.ok).toBe(false);
    expect(r.message).toMatch(/tomorrow/i);
  });

  it('cannot skip ahead to a later day', async () => {
    const r = await completeOrientationDay(TENANT, STUDENT, 3);
    expect(r).toMatchObject({ ok: false, message: 'Finish the day before this one first.' });
  });

  it('is let through once every day is done', async () => {
    for (const d of [1, 2, 3, 4, 5]) expect((await finishDay(d)).ok).toBe(true);
    const view = await orientationFor(TENANT, STUDENT);
    expect(view).toMatchObject({ complete: true, nextDay: null, completedDays: 5 });
    expect(await orientationBlocksLearning(TENANT, STUDENT)).toBe(false);
  });

  it('pays XP once per day, however often the day is submitted', async () => {
    await finishDay(1);
    await completeOrientationDay(TENANT, STUDENT, 1);
    expect(awarded).toHaveLength(2);
    // The engine settles duplicates by source; both carry the same identity so only one is paid.
    expect(new Set(awarded.map(a => a.sourceId))).toEqual(new Set(['day-1']));
    expect(awarded.every(a => a.eventKey === 'ORIENTATION_DAY_COMPLETED' && a.sourceType === 'orientation')).toBe(true);
  });

  it('remembers which lines of a checklist are ticked', async () => {
    /* Day 3 is reached by finishing the two before it AND by the calendar reaching day three. */
    await finishDay(1);
    await finishDay(2);
    travel(1);
    await completeOrientationItem({
      tenantId: TENANT, studentId: STUDENT, dayNumber: 3, itemKey: 'linkedin_todo', checked: [0, 1, 4],
    });
    const view = await orientationFor(TENANT, STUDENT);
    const todo = view.days[2].items.find(i => i.key === 'linkedin_todo');
    expect(todo).toMatchObject({ done: true, checked: [0, 1, 4] });
  });

  /**
   * THE GATE THE PRODUCT ASKS FOR, IN THE TERMS IT WAS ASKED IN.
   *
   * A member joins, starts day 0.1 and does not finish it. Tomorrow arrives. Day 0.2 must still
   * be shut — the welcome is opened by finishing the day before it, never by the calendar — and
   * shut has to mean its content is not served, or the gate is decoration.
   */
  it('keeps the next welcome day shut until the one before it is finished', async () => {
    const before = await orientationFor(TENANT, STUDENT);
    expect(before.days[0]).toMatchObject({ dayNumber: 1, locked: false });
    expect(before.days[1]).toMatchObject({ dayNumber: 2, locked: true });

    await finishDay(1);
    travel(1);   // the completion ladder is the subject here; let the calendar catch up

    const after = await orientationFor(TENANT, STUDENT);
    expect(after.days[0]).toMatchObject({ dayNumber: 1, done: true });
    expect(after.days[1]).toMatchObject({ dayNumber: 2, locked: false });
    expect(after.days[2]).toMatchObject({ dayNumber: 3, locked: true });
  });

  it('serves no content for a locked day, only its name and length', async () => {
    const view = await orientationFor(TENANT, STUDENT);
    const locked = view.days.filter(d => d.locked);
    expect(locked.length).toBeGreaterThan(0);
    for (const d of locked) {
      expect(d.items).toEqual([]);
      /* Named, so the plan can show what is coming. */
      expect(d.title).toBeTruthy();
      expect(d.minutes).toBeGreaterThan(0);
    }
    /* The open day is served in full, or there would be nothing to do. */
    expect(view.days[0].items.length).toBeGreaterThan(0);
  });

  it('records nothing against a day the member cannot open', async () => {
    const r = await completeOrientationItem({
      tenantId: TENANT, studentId: STUDENT, dayNumber: 3, itemKey: 'linkedin_todo', checked: [0],
    });
    expect(r.ok).toBe(false);
    const view = await orientationFor(TENANT, STUDENT);
    expect(view.days[2].items).toEqual([]);
  });

  it('refuses to finish a day out of order, whatever has been ticked', async () => {
    const r = await completeOrientationDay(TENANT, STUDENT, 3);
    expect(r.ok).toBe(false);
    expect(r.message).toMatch(/before this one/i);
  });

  it('lets a finished day be opened again — review is not the same as skipping', async () => {
    await finishDay(1);
    await finishDay(2);
    const view = await orientationFor(TENANT, STUDENT);
    expect(view.days[0]).toMatchObject({ done: true, locked: false });
    expect(view.days[0].items.length).toBeGreaterThan(0);
  });
  it('keeps a recording against the item it answers', async () => {
    await completeOrientationItem({
      tenantId: TENANT, studentId: STUDENT, dayNumber: 1, itemKey: 'self_intro',
      recordingKey: 'orientation/abc.webm', recordingDurationSec: 63,
    });
    const view = await orientationFor(TENANT, STUDENT);
    expect(view.days[0].items.find(i => i.key === 'self_intro')).toMatchObject({ done: true, recordingDurationSec: 63 });
  });
});

describe('a member who was already learning when orientation arrived', () => {
  beforeEach(() => {
    enrollments.push({ tenantId: TENANT, studentId: STUDENT, completedDays: [1, 2, 3], currentDay: 4 });
  });

  it('is offered it and never blocked by it', async () => {
    const view = await orientationFor(TENANT, STUDENT);
    expect(view).toMatchObject({ enabled: true, mandatory: false, complete: false });
    expect(await orientationBlocksLearning(TENANT, STUDENT)).toBe(false);
  });

  it('keeps that answer even after finishing a later day of their programme', async () => {
    await orientationFor(TENANT, STUDENT);
    enrollments[0].completedDays = [1, 2, 3, 4, 5];
    const view = await orientationFor(TENANT, STUDENT);
    expect(view.mandatory).toBe(false);
  });
});

describe('a tenant that switches orientation off', () => {
  beforeEach(() => { programs.push({ tenantId: TENANT, enabled: false, days: DEFAULT_ORIENTATION }); });

  it('shows nobody the welcome and holds nobody at it', async () => {
    const view = await orientationFor(TENANT, STUDENT);
    expect(view).toMatchObject({ enabled: false, complete: true, days: [] });
    expect(await orientationBlocksLearning(TENANT, STUDENT)).toBe(false);
  });
});

describe('an admin editing the welcome', () => {
  it('refuses two days with the same number', async () => {
    const r = await saveOrientationProgram(TENANT, [
      { dayNumber: 1, title: 'One', blurb: '', items: [] },
      { dayNumber: 1, title: 'Also one', blurb: '', items: [] },
    ] as any, true);
    expect(r).toMatchObject({ ok: false, message: 'Day 1 appears twice.' });
  });

  it('refuses two items keyed the same, which would confuse everyone\'s progress', async () => {
    const r = await saveOrientationProgram(TENANT, [{
      dayNumber: 1, title: 'One', blurb: '', items: [
        { key: 'a', kind: 'video', title: 'First', required: true, estimatedMinutes: 5 },
        { key: 'a', kind: 'notes', title: 'Second', required: true, estimatedMinutes: 5 },
      ],
    }] as any, true);
    expect(r).toMatchObject({ ok: false, message: 'Day 1 has two items keyed "a".' });
  });

  it('refuses a day with no title', async () => {
    const r = await saveOrientationProgram(TENANT, [{ dayNumber: 1, title: '  ', blurb: '', items: [] }] as any, true);
    expect(r).toMatchObject({ ok: false, message: 'Day 1 needs a title.' });
  });

  it('saves a welcome of its own, and members see that instead of the default', async () => {
    const days = [{
      dayNumber: 1, title: 'Welcome to our college programme', blurb: 'Start here', items: [
        { key: 'hello', kind: 'video', title: 'Hello', required: true, estimatedMinutes: 4, url: 'https://example.test/v' },
      ],
    }];
    expect(await saveOrientationProgram(TENANT, days as any, true)).toMatchObject({ ok: true });
    const view = await orientationFor(TENANT, STUDENT);
    expect(view.totalDays).toBe(1);
    expect(view.days[0].title).toBe('Welcome to our college programme');
  });
});
