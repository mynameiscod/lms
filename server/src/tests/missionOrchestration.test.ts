import {
  selectTodaysMissions, missionKey, SelectableObjective, SelectionInput,
} from '../services/dailyMissionOrchestrator';
import {
  MAX_MISSIONS_PER_DAY, MIN_MISSION_MINUTES, dailyBudget, dailySliceOf,
  MISSION_ORCHESTRATION_VERSION, ASSESSMENT_ROUTE, assessmentRouteForSkill,
} from '../data/missionOrchestrationPolicy';

/**
 * Module 10 — turning this week's roadmap into today's work.
 *
 * The properties that carry it:
 *
 *   IT FITS THE DAY.      A student who said 60 minutes gets about 60 minutes. A plan that
 *                         asks for three hours is one they fail on day one.
 *   ORDER SURVIVES.       Module 9 put the prerequisite first; a day that offered both at
 *                         once would throw that away.
 *   IT IS THE SAME LIST.  A refresh, and finishing one task, must not reshuffle the rest.
 *   IT NEVER INVENTS.     Nothing is filled in from a title guess, and an empty week stays
 *                         empty rather than being padded.
 */

const obj = (over: Partial<SelectableObjective> & { sequence: number; skillKey: string }): SelectableObjective => ({
  skillName: over.skillKey.replace(/_/g, ' '),
  workType: 'PRACTICE',
  plannedMinutes: 120,
  week: 1,
  reasonCode: 'PRIORITY_GAP',
  explanation: 'because',
  ...over,
});

function select(over: Partial<SelectionInput> & { objectives: SelectableObjective[] }) {
  return selectTodaysMissions({
    roadmapId: 'rm1',
    date: '2026-08-17',
    week: 1,
    minutesPerDay: 60,
    daysPerWeek: 6,
    creditedBefore: new Map(),
    completedToday: new Set(),
    resources: new Map(),
    ...over,
  });
}

const total = (ms: { plannedMinutes: number }[]) => ms.reduce((n, m) => n + m.plannedMinutes, 0);

describe('the day fits the commitment', () => {
  const busy = [
    obj({ sequence: 1, skillKey: 'OOP' }),
    obj({ sequence: 2, skillKey: 'DSA_ARRAYS' }),
    obj({ sequence: 3, skillKey: 'REST_API' }),
    obj({ sequence: 4, skillKey: 'SQL' }),
    obj({ sequence: 5, skillKey: 'GIT' }),
  ];

  it('never plans more than the student said they had', () => {
    for (const minutesPerDay of [30, 60, 120]) {
      const missions = select({ objectives: busy, minutesPerDay });
      expect(total(missions)).toBeLessThanOrEqual(dailyBudget(minutesPerDay));
    }
  });

  it('keeps the list short enough to finish', () => {
    expect(select({ objectives: busy, minutesPerDay: 240 }).length).toBeLessThanOrEqual(MAX_MISSIONS_PER_DAY);
  });

  it('never surfaces a task too small to be worth opening', () => {
    for (const m of select({ objectives: busy, minutesPerDay: 30 })) {
      expect(m.plannedMinutes).toBeGreaterThanOrEqual(MIN_MISSION_MINUTES);
    }
  });

  it('gives a student with more time more of the day, not different work', () => {
    const small = select({ objectives: busy, minutesPerDay: 30 });
    const large = select({ objectives: busy, minutesPerDay: 120 });
    expect(total(large)).toBeGreaterThan(total(small));
    // Same roadmap, so the same objectives lead — capacity changes how much, not what.
    expect(large[0].skillKey).toBe(small[0].skillKey);
  });

  it('spreads a week-sized objective across the days the student studies', () => {
    // 120 minutes over 6 days is a sitting, not a marathon.
    const one = select({ objectives: [obj({ sequence: 1, skillKey: 'OOP', plannedMinutes: 120 })] });
    expect(one[0].plannedMinutes).toBeLessThan(120);
    expect(dailySliceOf(120, 0, 6)).toBeLessThan(120);
  });

  it('does not overrun on the last day of an objective', () => {
    // 110 of 120 minutes already credited: today is the remaining 10, not another slice.
    const missions = select({
      objectives: [obj({ sequence: 1, skillKey: 'OOP', plannedMinutes: 120 })],
      creditedBefore: new Map([[1, 110]]),
    });
    expect(total(missions)).toBeLessThanOrEqual(10);
  });
});

describe('prerequisite order survives into the day', () => {
  const chain = [
    obj({ sequence: 1, skillKey: 'HTTP', workType: 'LEARN', prerequisiteFor: 'REST_API', reasonCode: 'PREREQUISITE' }),
    obj({ sequence: 2, skillKey: 'REST_API' }),
  ];

  it('does not offer the dependent while its prerequisite is unfinished', () => {
    const missions = select({ objectives: chain, minutesPerDay: 240 });
    expect(missions.map(m => m.skillKey)).toEqual(['HTTP']);
  });

  it('releases the dependent once the prerequisite is done', () => {
    const missions = select({
      objectives: chain, minutesPerDay: 240,
      creditedBefore: new Map([[1, 120]]),
    });
    expect(missions.map(m => m.skillKey)).toContain('REST_API');
  });

  it('does not block an unrelated skill behind somebody else’s prerequisite', () => {
    const missions = select({
      objectives: [...chain, obj({ sequence: 3, skillKey: 'SQL' })],
      minutesPerDay: 240,
    });
    expect(missions.map(m => m.skillKey)).toContain('SQL');
  });
});

describe('the day is stable', () => {
  const objectives = [
    obj({ sequence: 1, skillKey: 'OOP' }),
    obj({ sequence: 2, skillKey: 'DSA_ARRAYS' }),
    obj({ sequence: 3, skillKey: 'REST_API' }),
  ];

  it('returns the same list every time it is asked', () => {
    expect(select({ objectives })).toEqual(select({ objectives }));
  });

  it('does not reshuffle when one mission is completed mid-day', () => {
    const before = select({ objectives });
    const after = select({ objectives, completedToday: new Set([before[0].key]) });

    expect(after.map(m => m.key)).toEqual(before.map(m => m.key));
    expect(after[0].done).toBe(true);
    expect(after[1].done).toBe(false);
  });

  it('gives every mission an identity traceable to its objective', () => {
    for (const m of select({ objectives })) {
      expect(m.key).toBe(missionKey('rm1', m.objectiveSequence, '2026-08-17'));
      expect(m.roadmapId).toBe('rm1');
      expect(m.skillKey).toBeTruthy();
      expect(m.workType).toBeTruthy();
    }
  });

  it('gives different days different keys, so yesterday cannot be completed twice', () => {
    const today = select({ objectives });
    const tomorrow = select({ objectives, date: '2026-08-18' });
    expect(tomorrow[0].key).not.toBe(today[0].key);
  });
});

describe('resources', () => {
  const objectives = [obj({ sequence: 1, skillKey: 'DSA_ARRAYS', workType: 'PRACTICE' })];
  const mapped = new Map([['DSA_ARRAYS:PRACTICE', {
    type: 'practice', id: 'c-second-largest', title: 'Second Largest', route: '/careerpilot/practice/c-second-largest',
  }]]);

  it('sends the student to the mapped activity when one exists', () => {
    const [m] = select({ objectives, resources: mapped });
    expect(m.resourceState).toBe('READY');
    expect(m.resource?.route).toBe('/careerpilot/practice/c-second-largest');
  });

  it('still shows the objective when nothing is mapped, flagged as a configuration gap', () => {
    // §46: do not attach a random resource, and do not drop the work either.
    const [m] = select({ objectives });
    expect(m.resourceState).toBe('RESOURCE_NOT_CONFIGURED');
    expect(m.resource).toBeUndefined();
    expect(m.skillName).toBeTruthy();
  });

  it('does not use a mapping meant for different work', () => {
    // A coding problem is practice. Offering it as LEARN would test somebody on something
    // nobody has taught them.
    const [m] = select({
      objectives: [obj({ sequence: 1, skillKey: 'DSA_ARRAYS', workType: 'LEARN' })],
      resources: mapped,
    });
    expect(m.resourceState).toBe('RESOURCE_NOT_CONFIGURED');
  });

  it('routes validation work to the assessment without needing a mapping', () => {
    const [m] = select({ objectives: [obj({ sequence: 1, skillKey: 'DOCKER', workType: 'ASSESS' })] });
    expect(m.resourceState).toBe('READY');
    // Asserted against the policy helper rather than a literal: the route is a product
    // decision that lives in one place, and a copy here would silently rot.
    expect(m.resource?.route).toBe(assessmentRouteForSkill('DOCKER'));
    // The skill has to TRAVEL. The bare route builds a paper across the whole role, so a
    // mission that says "DOCKER — Check" would measure everything and confirm nothing it
    // named. Asserted separately because the helper could regress to the bare constant and
    // the comparison above would still pass.
    expect(m.resource?.route).not.toBe(ASSESSMENT_ROUTE);
    expect(m.resource?.route).toContain('skill=DOCKER');
  });
});

describe('what it refuses to do', () => {
  it('returns nothing when this week has no work left', () => {
    const missions = select({
      objectives: [obj({ sequence: 1, skillKey: 'OOP', plannedMinutes: 60 })],
      creditedBefore: new Map([[1, 60]]),
    });
    // §139: an empty day is an honest answer. Inventing filler to keep somebody busy is not.
    expect(missions).toEqual([]);
  });

  it('never pulls work forward from a later week', () => {
    // §62: week 8's objective is not today's problem just because today looks quiet.
    const missions = select({
      objectives: [obj({ sequence: 9, skillKey: 'DOCKER', week: 8 })],
      week: 2,
    });
    expect(missions).toEqual([]);
  });

  it('plans nothing for a student with no stated capacity', () => {
    expect(select({ objectives: [obj({ sequence: 1, skillKey: 'OOP' })], minutesPerDay: 0 })).toEqual([]);
  });

  it('carries Module 9’s own explanation rather than writing a new one', () => {
    // §70: the reason a student sees is the reason the planner recorded.
    const [m] = select({
      objectives: [obj({ sequence: 1, skillKey: 'OOP', explanation: 'OOP is a prerequisite for REST APIs.' })],
    });
    expect(m.explanation).toBe('OOP is a prerequisite for REST APIs.');
    expect(m.reasonCode).toBe('PRIORITY_GAP');
  });
});

describe('the policy is versioned and owns only today', () => {
  it('declares its own version, separate from the roadmap policy', () => {
    expect(MISSION_ORCHESTRATION_VERSION).toBe('MISSION_ORCHESTRATION_V1');
  });

  it('knows nothing about gaps, priority or readiness — Module 8 and 9 own those', () => {
    const policy = require('../data/missionOrchestrationPolicy');
    const exported = Object.keys(policy).join(' ').toLowerCase();
    for (const forbidden of ['priority', 'readiness', 'coverage', 'gap', 'confidence']) {
      expect(exported).not.toContain(forbidden);
    }
  });
});
