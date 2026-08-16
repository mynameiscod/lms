/**
 * Five states, not four.
 *
 * Loading, error, unavailable, no-data and zero are different facts. "0% improvement" and
 * "nobody has reassessed yet" point at opposite decisions, and a dashboard that renders the
 * first when it means the second invites an admin to act on a number that was never
 * measured. These are the rules that keep them apart.
 *
 * Nothing here calculates a metric — the server owns every figure. These functions choose
 * WORDS for values it already produced.
 */

import {
  countCell, percentCell, unavailableCell, figure, coverageOf, reasonOf,
  SEVERITY, AREA_STATUS, LAUNCH_STATUS, RANGES, rangeParams,
} from './analyticsPresenters';

describe('a count', () => {
  it('shows a real zero as zero, because nobody doing it yet is a fact', () => {
    expect(countCell(0)).toMatchObject({ state: 'zero', display: '0' });
  });

  it('shows a missing count as no data, not as zero', () => {
    expect(countCell(null)).toMatchObject({ state: 'no-data', display: 'No data' });
    expect(countCell(undefined).display).toBe('No data');
  });

  it('groups large numbers so they can be read at a glance', () => {
    expect(countCell(12500).display).toBe('12,500');
  });
});

describe('a percentage', () => {
  it('renders a measured zero as 0%', () => {
    expect(percentCell(0)).toMatchObject({ state: 'zero', display: '0%' });
  });

  it('renders an empty denominator as no data, with a reason', () => {
    const c = percentCell(null, { denominator: 0 });
    // The whole point: an empty cohort has not achieved 0%, nothing has happened.
    expect(c.state).toBe('no-data');
    expect(c.display).toBe('No data');
    expect(c.note).toMatch(/nobody is in this group/i);
  });

  it('carries a caller-supplied explanation when there is one', () => {
    const c = percentCell(null, { emptyNote: 'No reassessments in this period.' });
    expect(c.note).toBe('No reassessments in this period.');
  });
});

describe('an unavailable metric', () => {
  it('says unavailable and never shows a number', () => {
    const c = unavailableCell('Computed on demand and not persisted.');
    expect(c.state).toBe('unavailable');
    expect(c.display).toBe('Unavailable');
    expect(c.display).not.toMatch(/\d/);
    expect(c.note).toMatch(/not persisted/);
  });

  it('beats the no-data branch, so it never reads as "we looked and found none"', () => {
    const c = figure(null, { coverage: 'unavailable', reason: 'Not persisted at cohort scale.' }, { percent: true });
    expect(c.state).toBe('unavailable');
    expect(c.display).toBe('Unavailable');
  });

  it('still renders an available null as no data', () => {
    expect(figure(null, 'available', { percent: true }).state).toBe('no-data');
  });

  it('reads coverage in either shape the API returns', () => {
    expect(coverageOf('partial')).toBe('partial');
    expect(coverageOf({ coverage: 'unavailable', reason: 'x' })).toBe('unavailable');
    expect(coverageOf(undefined)).toBe('available');
    expect(reasonOf({ coverage: 'unavailable', reason: 'because' })).toBe('because');
    expect(reasonOf('available')).toBeUndefined();
  });
});

describe('severity and status', () => {
  it('never relies on colour alone', () => {
    // Every state carries a word and a glyph as well as a tone, so the meaning survives a
    // monochrome screen and the readers who cannot separate red from green.
    for (const s of [SEVERITY.ERROR, SEVERITY.WARNING, SEVERITY.INFO]) {
      expect(s.label.length).toBeGreaterThan(2);
      expect(s.icon).toMatch(/^bi-/);
      expect(s.tone).toBeTruthy();
    }
    for (const k of ['PASS', 'WARNING', 'FAIL']) {
      expect(AREA_STATUS[k].label.length).toBeGreaterThan(2);
      expect(AREA_STATUS[k].icon).toMatch(/^bi-/);
    }
  });

  it('explains each launch status in words', () => {
    expect(LAUNCH_STATUS.NOT_READY.label).toBe('Not ready');
    expect(LAUNCH_STATUS.READY_WITH_WARNINGS.label).toBe('Ready with warnings');
    expect(LAUNCH_STATUS.READY.label).toBe('Ready');
    // A single error blocks — the copy says so rather than implying a score.
    expect(LAUNCH_STATUS.NOT_READY.blurb).toMatch(/single error blocks|not offset/i);
    expect(LAUNCH_STATUS.READY.blurb).toMatch(/not a guarantee/i);
  });
});

describe('the date range', () => {
  it('offers only windows the server accepts', () => {
    expect(RANGES.map(r => r.days)).toEqual([7, 30, 90]);
  });

  it('sends an ISO window matching the chosen preset', () => {
    const { from, to } = rangeParams(30);
    const days = Math.round((new Date(to).getTime() - new Date(from).getTime()) / 86_400_000);

    expect(days).toBe(30);
    // ISO, so the server parses it the same way wherever the browser is.
    expect(from).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(to).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('never produces a range longer than the server cap', () => {
    const { from, to } = rangeParams(90);
    const days = Math.round((new Date(to).getTime() - new Date(from).getTime()) / 86_400_000);
    expect(days).toBeLessThanOrEqual(400);
  });
});
