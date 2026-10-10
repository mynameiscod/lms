import {
  roadmapV2For, resolveRoadmapV2, validateRoadmapV2Patch, budgetMinutes,
  DEFAULT_DAILY_MINUTES, DEFAULT_REVISION_DAYS,
} from '../data/roadmapV2Policy';

/**
 * Roadmap V2 is off unless switched on, and switched on in exactly the order the curriculum
 * engine is: a named student (the pilot), then a year (the rollout), then the tenant.
 */
describe('roadmapV2For', () => {
  it('is off for everybody by default — off changes nothing', () => {
    expect(roadmapV2For(undefined, 's1', 'build')).toBe(false);
    expect(roadmapV2For({}, 's1', 'placement')).toBe(false);
  });

  it('is on for a named pilot student even with the tenant switch off', () => {
    expect(roadmapV2For({ enabled: false, studentIds: ['s1'] }, 's1', 'build')).toBe(true);
    expect(roadmapV2For({ enabled: false, studentIds: ['s1'] }, 's2', 'build')).toBe(false);
  });

  it('can be rolled out one year at a time', () => {
    const cfg = { stages: ['specialize'] };
    expect(roadmapV2For(cfg, 's1', 'specialize')).toBe(true);
    expect(roadmapV2For(cfg, 's1', 'build')).toBe(false);
  });

  it('never applies to a learner who is not in a college year', () => {
    expect(roadmapV2For({ enabled: true, studentIds: ['s1'] }, 's1', 'graduate')).toBe(false);
    expect(roadmapV2For({ enabled: true }, 's1', null)).toBe(false);
  });
});

describe('resolveRoadmapV2', () => {
  it('fills the shipped defaults: 2.5 hours a day and 7 revision days', () => {
    expect(resolveRoadmapV2(null)).toMatchObject({ enabled: false, dailyMinutes: DEFAULT_DAILY_MINUTES, revisionDays: DEFAULT_REVISION_DAYS });
    expect(DEFAULT_DAILY_MINUTES).toBe(150);
  });

  it('drops stages that are not college years and duplicate ids', () => {
    expect(resolveRoadmapV2({ stages: ['build', 'graduate', 'BUILD'], studentIds: ['a', 'a', ' '] }))
      .toMatchObject({ stages: ['build'], studentIds: ['a'] });
  });
});

describe('validateRoadmapV2Patch', () => {
  it('accepts a sensible change', () => {
    const r = validateRoadmapV2Patch({ enabled: true, stages: ['placement'], dailyMinutes: 150, revisionDays: 7 });
    expect(r.ok).toBe(true);
  });

  it('refuses rather than clamps an out-of-range daily load — 600 minutes meant something', () => {
    const r = validateRoadmapV2Patch({ dailyMinutes: 600 });
    expect(r.ok).toBe(false);
  });

  it('refuses a stage V2 cannot plan', () => {
    expect(validateRoadmapV2Patch({ stages: ['graduate'] }).ok).toBe(false);
  });
});

it('a roadmap budget is its days at the daily load', () => {
  expect(budgetMinutes(150, 150)).toBe(22500); // Year 4: 150 days × 2.5 h = 375 h
});
