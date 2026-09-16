/**
 * The roadmap presents a persisted journey; it never decides access and never reorders a day.
 */

import {
  dayState, canOpenDay, planLinkFor, groupJourneyDays, dayRanges, initialDay,
} from './foundationRoadmapPresenter';
import type { FoundationJourneyDaySummary } from '../../api/passportApi';

const day = (n: number, over: Partial<FoundationJourneyDaySummary> = {}): FoundationJourneyDaySummary => ({
  day: n, title: `Day ${n} title`, activities: 3, minutes: 30, status: 'UPCOMING', locked: true,
  topic: null, module: null, kind: 'LESSON', objective: null, ...over,
});

const journey = (topicOf: (n: number) => string | null, completed: number) =>
  Array.from({ length: 90 }, (_, i) => {
    const n = i + 1;
    return day(n, {
      topic: topicOf(n), module: topicOf(n) ? 'Module' : null,
      status: n <= completed ? 'COMPLETED' : n === completed + 1 ? 'CURRENT' : 'UPCOMING',
      locked: n > completed + 1,
    });
  });

describe('a day’s state comes from the server, never from the client', () => {
  it('treats a locked day as locked and not openable', () => {
    expect(dayState({ status: 'UPCOMING', locked: true })).toBe('LOCKED');
    expect(canOpenDay({ status: 'UPCOMING', locked: true })).toBe(false);
  });

  it('opens the current day and completed days', () => {
    expect(dayState({ status: 'CURRENT', locked: false })).toBe('CURRENT');
    expect(dayState({ status: 'COMPLETED', locked: false })).toBe('COMPLETED');
    expect(canOpenDay({ status: 'CURRENT', locked: false })).toBe(true);
    expect(canOpenDay({ status: 'COMPLETED', locked: false })).toBe(true);
  });

  it('shows an open day that is not today as available, not locked', () => {
    expect(dayState({ status: 'UPCOMING', locked: false })).toBe('AVAILABLE');
  });

  it('links an open day to My 90 Days on that day', () => {
    expect(planLinkFor(47)).toBe('/careerpilot/plan?day=47');
  });
});

describe('grouping is presentational', () => {
  it('gathers consecutive days of one topic and keeps the plan’s order', () => {
    const topicOf = (n: number) => (n <= 9 ? 'Hardware' : n <= 14 ? 'Variables' : n <= 26 ? 'Git' : 'Later');
    const groups = groupJourneyDays(journey(topicOf, 0));
    expect(groups.slice(0, 3).map(g => [g.topic, g.fromDay, g.toDay])).toEqual([
      ['Hardware', 1, 9], ['Variables', 10, 14], ['Git', 15, 26],
    ]);
    expect(groups.flatMap(g => g.days.map(d => d.day))).toEqual(Array.from({ length: 90 }, (_, i) => i + 1));
  });

  it('does not merge a topic that returns later into its earlier run', () => {
    const topicOf = (n: number) => (n <= 5 || (n >= 11 && n <= 12) ? 'Functions' : 'Other');
    const groups = groupJourneyDays(journey(topicOf, 0));
    expect(groups.filter(g => g.topic === 'Functions').map(g => [g.fromDay, g.toDay])).toEqual([[1, 5], [11, 12]]);
  });

  it('shows individual days when there is no topic metadata, rather than inventing a grouping', () => {
    const groups = groupJourneyDays(journey(() => null, 0));
    expect(groups).toHaveLength(90);
    expect(groups.every(g => g.days.length === 1)).toBe(true);
  });

  it('never reorders days delivered out of order', () => {
    const shuffled = journey(() => 'T', 0).reverse();
    expect(groupJourneyDays(shuffled)[0].days.map(d => d.day)).toEqual(Array.from({ length: 90 }, (_, i) => i + 1));
  });

  it('summarises a group from its days: completed, current, locked', () => {
    const topicOf = (n: number) => (n <= 5 ? 'A' : n <= 10 ? 'B' : 'C');
    const [a, b, c] = groupJourneyDays(journey(topicOf, 7));
    expect(a.state).toBe('COMPLETED');
    expect(b.state).toBe('CURRENT');
    expect(b.completed).toBe(2);
    expect(c.state).toBe('LOCKED');
  });

  it('differs for different personalised journeys', () => {
    const one = groupJourneyDays(journey(n => (n <= 9 ? 'Hardware' : 'Variables'), 0)).map(g => g.topic);
    const two = groupJourneyDays(journey(n => (n <= 20 ? 'SQL' : 'Arrays'), 0)).map(g => g.topic);
    expect(one).not.toEqual(two);
  });
});

describe('all ninety days are reachable', () => {
  it('pages cover day 1 to day 90 with no gaps, Day 90 included', () => {
    const ranges = dayRanges(90);
    expect(ranges.map(r => [r.from, r.to])).toEqual([[1, 30], [31, 60], [61, 90]]);
    const covered = new Set<number>();
    for (const r of ranges) for (let d = r.from; d <= r.to; d++) covered.add(d);
    expect(covered.size).toBe(90);
    expect(covered.has(90)).toBe(true);
  });

  it('opens My 90 Days on a requested day, and otherwise on the current day', () => {
    expect(initialDay('90', 1, 90)).toBe(90);
    expect(initialDay('47', 6, 90)).toBe(47);
    expect(initialDay(null, 6, 90)).toBe(6);
    for (const bad of ['0', '91', 'x', '2.5']) expect(initialDay(bad, 6, 90)).toBe(6);
  });
});
