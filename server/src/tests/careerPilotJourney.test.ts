import { VISITOR_STAGE, JOIN_EVENTS, cumulative, median, parseRange, tidyName } from '../services/careerPilotJourneyService';

describe('the journey funnel arithmetic', () => {
  it('counts a visitor at every stage they reached, so the funnel can only go down', () => {
    // 5 visitors: 1 only looked, 1 started, 1 pressed Create, 1 got the OTP, 1 verified
    const c = cumulative([1, 2, 3, 4, 5], 5);
    expect(c).toEqual([5, 4, 3, 2, 1]);
    for (let i = 1; i < c.length; i++) expect(c[i]).toBeLessThanOrEqual(c[i - 1]);
  });

  it('knows the page events by one shared list, and ranks them in order', () => {
    expect(VISITOR_STAGE[JOIN_EVENTS.view]).toBeLessThan(VISITOR_STAGE[JOIN_EVENTS.started]);
    expect(VISITOR_STAGE[JOIN_EVENTS.started]).toBeLessThan(VISITOR_STAGE[JOIN_EVENTS.pressed]);
    expect(VISITOR_STAGE[JOIN_EVENTS.pressed]).toBeLessThan(VISITOR_STAGE[JOIN_EVENTS.sent]);
    expect(VISITOR_STAGE[JOIN_EVENTS.sent]).toBeLessThan(VISITOR_STAGE[JOIN_EVENTS.verified]);
    expect(VISITOR_STAGE[JOIN_EVENTS.otpScreen]).toBe(VISITOR_STAGE[JOIN_EVENTS.sent]);
  });

  it('takes the median of times, even or odd, and nothing when there are none', () => {
    expect(median([])).toBeNull();
    expect(median([5])).toBe(5);
    expect(median([1, 9, 3])).toBe(3);
    expect(median([2, 4, 6, 8])).toBe(5);
  });

  it('hides record ids so twenty practice problems count as one page', () => {
    expect(tidyName('Opened /careerpilot/practice/6ac4e3107ab13d78f5eda95e')).toBe('Opened /careerpilot/practice/:id');
  });

  it('reads a range from a preset or from dates, and never returns an invalid one', () => {
    const week = parseRange({ preset: '7d' });
    expect(week.to.getTime() - week.from.getTime()).toBeGreaterThan(6.9 * 86400000);
    const bad = parseRange({ from: 'nonsense', to: 'nope' });
    expect(isNaN(bad.from.getTime())).toBe(false);
    expect(parseRange({ from: '2026-10-01', to: '2026-10-02' }).from.toISOString().slice(0, 10)).toBe('2026-10-01');
  });
});

describe('the sign-up page and the journey screen use the same event names', () => {
  const fs = require('fs'); const path = require('path');
  const track = fs.readFileSync(path.join(__dirname, '../../../client/src/pages/Passport/journeyTrack.ts'), 'utf-8');
  it('every event the funnel counts is one the page sends', () => {
    for (const name of Object.values(JOIN_EVENTS)) expect([name, track.includes(`'${name}'`)]).toEqual([name, true]);
  });
  it('the Journey page is routed, in the menu, and under the members feature', () => {
    const app = fs.readFileSync(path.join(__dirname, '../../../client/src/App.tsx'), 'utf-8');
    const menu = fs.readFileSync(path.join(__dirname, '../../../client/src/components/layout/Sidebar.tsx'), 'utf-8');
    const mods = fs.readFileSync(path.join(__dirname, '../../../client/src/config/tenantModules.ts'), 'utf-8');
    expect(app).toContain('/admin/passport/journey');
    expect(menu).toContain('/admin/passport/journey');
    expect(mods).toContain("['/admin/passport/journey', 'cpMembers']");
  });
});
