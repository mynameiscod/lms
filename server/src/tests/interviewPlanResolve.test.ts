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

import { resolvePlan, validatePlans, planTotals } from '../services/interviewPlanService';
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

  it('warns past the point where per-question coaching stops being produced', () => {
    // 14 questions, but evaluateTranscript only ever stores feedback for the first 12.
    const p = plan({ _id: 'big', rounds: [
      { type: 'technical', label: '', questions: 7, minutes: 20 },
      { type: 'hr',        label: '', questions: 7, minutes: 20 },
    ] });
    expect(planTotals(p.rounds).questions).toBe(14);
    expect(validatePlans([p]).some(x => x.planId === 'big' && /coaching/.test(x.message))).toBe(true);
  });
});
