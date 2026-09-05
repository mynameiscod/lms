/**
 * Which interview plan a member gets.
 *
 * The whole feature is a precedence rule, and a precedence rule is exactly the kind of thing
 * that keeps working while quietly meaning something else. The cases below are the ones an
 * admin would notice only by wondering why a student is getting the wrong interview:
 *
 *   FIRST MATCH WINS, BY PRIORITY — not "most specific", not "last saved".
 *   THE CATCH-ALL IS ALWAYS LAST, whatever number it carries. A fallback that could outrank
 *   an ordinary plan by having a bigger priority would make that plan unreachable for a
 *   reason invisible on the screen.
 *   EMPTY MEANS EVERYONE, per axis. Get this backwards and every plan reaches nobody.
 *
 * The shadowing warning is here for the same reason: a plan that can never win is not a bug
 * the product reports on its own, and an admin will keep editing it wondering why nothing
 * changes.
 */

import {
  resolvePlan, validatePlans, planTotals, summariseEntitlement, roundKeyFor,
} from '../services/interviewPlanService';
import { EMPTY_MEMBER_AUDIENCE } from '../models/memberAudience';

let seq = 0;
const plan = (over: any = {}): any => ({
  _id: over._id || `p${++seq}`,
  name: 'Plan',
  active: true,
  fallback: false,
  priority: 0,
  rounds: [{ type: 'technical', label: '', questions: 3, minutes: 12 }],
  quota: { perThirtyDays: 4, cooldownHours: 24 },
  notes: '',
  ...over,
  // After the spread, so a partial audience in `over` fills in the axes it left out —
  // an absent axis has to be an empty array, not undefined, or "empty means everyone"
  // would be tested against a shape the database never stores.
  audience: { ...EMPTY_MEMBER_AUDIENCE(), ...(over.audience || {}) },
});

const member = (over: any = {}) => ({
  yearOfStudy: '4th Year', degree: 'B.Tech', program: '', branch: 'CSE',
  primaryRole: 'BACKEND', secondaryRole: '', stage: 'placement', ...over,
});

describe('resolvePlan — precedence', () => {
  it('gives the highest-priority matching plan, not the most specific one', () => {
    const broad    = plan({ _id: 'broad',    name: 'All final year', priority: 50, audience: { years: ['4th Year'] } });
    const specific = plan({ _id: 'specific', name: 'Final-year CSE', priority: 10, audience: { years: ['4th Year'], branches: ['CSE'] } });

    const r = resolvePlan([broad, specific], member());
    expect(r.plan?.name).toBe('All final year');
    // The loser is told it matched — "did not match" would send an admin hunting the audience.
    expect(r.trace.find(t => t.id === 'specific')?.reason).toMatch(/higher-priority/);
  });

  it('falls past a plan whose audience excludes the member, and says which axis did it', () => {
    const mech = plan({ _id: 'mech', name: 'Mechanical', priority: 50, audience: { branches: ['Mechanical'] } });
    const any  = plan({ _id: 'any',  name: 'Everyone else', priority: 10 });

    const r = resolvePlan([mech, any], member({ branch: 'CSE' }));
    expect(r.plan?.name).toBe('Everyone else');
    expect(r.trace.find(t => t.id === 'mech')?.reason).toBe('branch is CSE');
  });

  it('matches case- and padding-insensitively, because these values are hand-typed', () => {
    const p = plan({ audience: { branches: ['  cse '] } });
    expect(resolvePlan([p], member({ branch: 'CSE' })).plan).toBeTruthy();
  });

  it('ANDs across axes and ORs within one', () => {
    const p = plan({ audience: { years: ['3rd Year', '4th Year'], branches: ['CSE'] } });

    expect(resolvePlan([p], member({ yearOfStudy: '3rd Year' })).plan).toBeTruthy();
    expect(resolvePlan([p], member({ yearOfStudy: '2nd Year' })).plan).toBeNull();
    expect(resolvePlan([p], member({ branch: 'ECE' })).plan).toBeNull();
  });

  it('treats an empty axis as everyone, so an untargeted plan reaches a member with nothing set', () => {
    const p = plan({ audience: {} });
    expect(resolvePlan([p], { }).plan).toBeTruthy();
  });

  it('accepts either degree or program for the course axis', () => {
    const p = plan({ audience: { courses: ['MCA'] } });
    expect(resolvePlan([p], member({ degree: '', program: 'MCA' })).plan).toBeTruthy();
  });
});

describe('resolvePlan — the catch-all', () => {
  it('is used only when no ordinary plan matched, even holding the highest priority', () => {
    const catchAll = plan({ _id: 'fb', name: 'Everyone', priority: 999, fallback: true });
    const ordinary = plan({ _id: 'cse', name: 'CSE', priority: 1, audience: { branches: ['CSE'] } });

    expect(resolvePlan([catchAll, ordinary], member({ branch: 'CSE' })).plan?.name).toBe('CSE');
    expect(resolvePlan([catchAll, ordinary], member({ branch: 'Civil' })).plan?.name).toBe('Everyone');
  });

  it('leaves the member on the built-in default when there is no catch-all', () => {
    const ordinary = plan({ audience: { branches: ['CSE'] } });
    const r = resolvePlan([ordinary], member({ branch: 'Civil' }));

    expect(r.plan).toBeNull();
    // Still a usable shape — the runtime must never be handed an interview with no rounds.
    expect(r.rounds.length).toBeGreaterThan(0);
    expect(r.quota.perThirtyDays).toBe(0);
  });
});

describe('resolvePlan — inactive plans', () => {
  it('skips them entirely and does not clutter the trace with them', () => {
    const off = plan({ _id: 'off', name: 'Retired', priority: 99, active: false });
    const on  = plan({ _id: 'on',  name: 'Live',    priority: 1 });

    const r = resolvePlan([off, on], member());
    expect(r.plan?.name).toBe('Live');
    expect(r.trace.some(t => t.id === 'off')).toBe(false);
  });
});

describe('validatePlans', () => {
  it('flags a plan that can never win because a broader one sits above it', () => {
    const above = plan({ _id: 'a', name: 'All CSE',  priority: 50, audience: { branches: ['CSE'] } });
    const below = plan({ _id: 'b', name: '4th CSE',  priority: 10, audience: { branches: ['CSE'], years: ['4th Year'] } });

    const w = validatePlans([above, below]);
    expect(w.some(x => x.planId === 'b' && /never match/.test(x.message))).toBe(true);
  });

  it('does not flag a narrower plan that sits ABOVE the broad one', () => {
    const above = plan({ _id: 'a', name: '4th CSE', priority: 50, audience: { branches: ['CSE'], years: ['4th Year'] } });
    const below = plan({ _id: 'b', name: 'All CSE', priority: 10, audience: { branches: ['CSE'] } });

    expect(validatePlans([above, below]).some(x => x.planId === 'b' && /never match/.test(x.message))).toBe(false);
  });

  it('warns when nothing catches the members no plan matched', () => {
    const w = validatePlans([plan({ audience: { branches: ['CSE'] } })]);
    expect(w.some(x => x.level === 'warn' && /catch-all/.test(x.message))).toBe(true);
  });

  it('warns when the allowance cannot pay for all the rounds offered', () => {
    // Three cards on the member's screen, two interviews a month — one is unreachable, and
    // nothing else on either screen would say so.
    const p = plan({ _id: 'short', quota: { perThirtyDays: 2, cooldownHours: 0 }, rounds: [
      { type: 'technical',     label: '', questions: 3, minutes: 12 },
      { type: 'hr',            label: '', questions: 2, minutes: 8 },
      { type: 'communication', label: '', questions: 1, minutes: 4 },
    ] });
    expect(planTotals(p.rounds).questions).toBe(6);
    expect(validatePlans([p]).some(x => x.planId === 'short' && /never sit them all/.test(x.message))).toBe(true);
  });

  it('does not warn when the allowance covers every round', () => {
    const p = plan({ _id: 'ok', quota: { perThirtyDays: 4, cooldownHours: 0 }, rounds: [
      { type: 'technical', label: '', questions: 3, minutes: 12 },
      { type: 'hr',        label: '', questions: 2, minutes: 8 },
    ] });
    expect(validatePlans([p]).some(x => x.planId === 'ok' && /never sit them all/.test(x.message))).toBe(false);
  });
});

/**
 * What a member is entitled to, and when they run out.
 *
 * These are the numbers a student is SHOWN and then held to, which is why they are computed
 * by a pure function and tested without a database: the screen saying "2 left" and start()
 * refusing the next one have to be the same arithmetic, or the product tells a member they
 * have an interview and then denies it.
 */
describe('summariseEntitlement', () => {
  const twoRoundPlan = () => resolvePlan([plan({
    _id: 'p', name: 'Final year',
    rounds: [
      { type: 'technical',     label: 'DSA', questions: 3, minutes: 12 },
      { type: 'communication', label: '',    questions: 1, minutes: 4 },
    ],
    quota: { perThirtyDays: 3, cooldownHours: 12 },
  })], member());

  const sat = (daysAgo: number, key: string | null, engaged = true) => ({
    planRoundKey: key,
    createdAt: new Date(Date.now() - daysAgo * 86400_000),
    engaged,
  });

  it('names every round, and keeps the admin label separate from the title', () => {
    const e = summariseEntitlement(twoRoundPlan(), []);
    expect(e.rounds.map(r => r.title)).toEqual(['Technical Interview', 'Communication Round']);
    expect(e.rounds[0].label).toBe('DSA');
    // Unnamed by the admin, so the card has nothing to put under the title.
    expect(e.rounds[1].label).toBe('');
  });

  it('counts usage per round as well as overall', () => {
    const e = summariseEntitlement(twoRoundPlan(), [sat(1, 'technical'), sat(2, 'technical')]);
    expect(e.used).toBe(2);
    expect(e.remaining).toBe(1);
    expect(e.rounds.find(r => r.key === 'technical')!.used).toBe(2);
    expect(e.rounds.find(r => r.key === 'communication')!.used).toBe(0);
  });

  it('ignores sittings the member never answered, so a failed start costs them nothing', () => {
    const e = summariseEntitlement(twoRoundPlan(), [sat(1, 'technical', false), sat(2, 'technical', false)]);
    expect(e.used).toBe(0);
    expect(e.canStart).toBe(true);
  });

  it('ignores sittings that have aged out of the rolling window', () => {
    const e = summariseEntitlement(twoRoundPlan(), [sat(45, 'technical'), sat(31, 'technical')]);
    expect(e.used).toBe(0);
  });

  it('blocks at the limit and says when an attempt comes back', () => {
    const e = summariseEntitlement(twoRoundPlan(), [sat(29, 'technical'), sat(20, 'technical'), sat(15, 'technical')]);
    expect(e.remaining).toBe(0);
    expect(e.canStart).toBe(false);
    expect(e.blockedReason).toMatch(/all 3/);
    // The OLDEST counted sitting is the one whose expiry frees an attempt — 29 days ago, so
    // roughly a day from now, not thirty.
    const backIn = new Date(e.windowResetsAt!).getTime() - Date.now();
    expect(backIn).toBeLessThan(2 * 86400_000);
    expect(backIn).toBeGreaterThan(0);
  });

  it('holds them to the cooldown even with attempts left', () => {
    const e = summariseEntitlement(twoRoundPlan(), [
      { planRoundKey: 'technical', createdAt: new Date(Date.now() - 2 * 3600_000), engaged: true },
    ]);
    expect(e.remaining).toBe(2);
    expect(e.canStart).toBe(false);
    expect(e.nextAvailableAt).toBeTruthy();
  });

  it('lets them straight back in once the cooldown has passed', () => {
    const e = summariseEntitlement(twoRoundPlan(), [
      { planRoundKey: 'technical', createdAt: new Date(Date.now() - 13 * 3600_000), engaged: true },
    ]);
    expect(e.canStart).toBe(true);
    expect(e.nextAvailableAt).toBeNull();
  });

  it('is unlimited when the plan sets no limit', () => {
    const r = resolvePlan([plan({ quota: { perThirtyDays: 0, cooldownHours: 0 } })], member());
    const e = summariseEntitlement(r, [sat(1, 'technical'), sat(2, 'technical'), sat(3, 'technical')]);
    expect(e.remaining).toBeNull();
    expect(e.canStart).toBe(true);
  });

  it('still gives a member no plan matches the built-in rounds, unlimited', () => {
    const r = resolvePlan([plan({ audience: { branches: ['Mechanical'] } })], member({ branch: 'CSE' }));
    const e = summariseEntitlement(r, []);
    expect(r.plan).toBeNull();
    expect(e.planName).toBeNull();
    expect(e.rounds.length).toBeGreaterThan(0);
    expect(e.canStart).toBe(true);
  });
});

describe('roundKeyFor', () => {
  it('keys on the type, so renaming a round does not reset a member usage count', () => {
    const before = [{ type: 'technical', label: 'Technical', questions: 3, minutes: 12 }] as any;
    const after  = [{ type: 'technical', label: 'DSA & fundamentals', questions: 3, minutes: 12 }] as any;
    expect(roundKeyFor(before, 0)).toBe(roundKeyFor(after, 0));
  });

  it('distinguishes two rounds of the same type without colliding', () => {
    const rounds = [
      { type: 'technical', label: 'Round 1', questions: 3, minutes: 12 },
      { type: 'hr',        label: '',        questions: 2, minutes: 8 },
      { type: 'technical', label: 'Round 2', questions: 3, minutes: 12 },
    ] as any;
    expect([0, 1, 2].map(i => roundKeyFor(rounds, i))).toEqual(['technical', 'hr', 'technical-1']);
  });
});
