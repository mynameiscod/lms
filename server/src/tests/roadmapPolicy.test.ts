import {
  ROADMAP_VERSION, MAX_ROADMAP_DAYS, PLANNING_UTILIZATION, MIN_BLOCK_MINUTES,
  MAX_SKILL_SHARE, DIAGNOSTIC_SHARE, VALIDATION_SHARE, MAINTENANCE_SHARE,
  capacityFor, weekBudgets, roundBlock, gapSeverity, mixFor, STAGE_MIX,
  activeSkillsPerWeek, diagnosticShareFor, planningConfidence, LOW_COVERAGE_PERCENT,
} from '../data/roadmapPolicy';
import { CAREER_STAGES } from '../services/careerStageService';

/**
 * ROADMAP_V1 — the arithmetic a plan is built on.
 *
 * The property under most pressure is that a plan FITS. Everything else about a roadmap can
 * be argued over; a plan that quietly asks for more hours than the student said they had is
 * simply false, and they discover it in week one.
 */

describe('the window', () => {
  it('is 90 days and says so in one place', () => {
    expect(MAX_ROADMAP_DAYS).toBe(90);
    expect(ROADMAP_VERSION).toBe('ROADMAP_V1');
  });

  it('leaves real headroom rather than filling the diary', () => {
    // The gap between 1.0 and this is the missed evening and the week that ran long.
    expect(PLANNING_UTILIZATION).toBeGreaterThanOrEqual(0.8);
    expect(PLANNING_UTILIZATION).toBeLessThanOrEqual(0.9);
  });
});

describe('capacity', () => {
  it('comes from the commitment, never the calendar', () => {
    const light = capacityFor({ minutesPerDay: 30, daysPerWeek: 5, roadmapDays: 90 });
    const heavy = capacityFor({ minutesPerDay: 120, daysPerWeek: 6, roadmapDays: 90 });

    expect(light.weeklyCapacityMinutes).toBe(150);
    expect(heavy.weeklyCapacityMinutes).toBe(720);
    // Same 90 days, nearly five times the plan. Treating these two students alike is the
    // single most common way a roadmap becomes fiction.
    expect(heavy.plannableMinutes).toBeGreaterThan(light.plannableMinutes * 4);
  });

  it('plans below the theoretical maximum', () => {
    const c = capacityFor({ minutesPerDay: 60, daysPerWeek: 6, roadmapDays: 90 });
    expect(c.weeklyCapacityMinutes).toBe(360);
    expect(c.plannableMinutes).toBeLessThan(c.theoreticalMinutes);
    expect(c.weeklyPlannableMinutes).toBe(Math.round(360 * PLANNING_UTILIZATION));
  });

  it('does not divide by a zero commitment', () => {
    const c = capacityFor({ minutesPerDay: 0, daysPerWeek: 0, roadmapDays: 90 });
    expect(c.plannableMinutes).toBe(0);
    expect(c.weekCount).toBeGreaterThanOrEqual(1);
  });
});

describe('week budgets', () => {
  it('treats 90 days as twelve weeks and a part, not thirteen whole ones', () => {
    const budgets = weekBudgets(90, 300);
    expect(budgets).toHaveLength(13);
    for (let i = 0; i < 12; i++) expect(budgets[i]).toBe(300);
    // The last week has two days, and is budgeted for two days.
    expect(budgets[12]).toBeLessThan(300);
    expect(budgets[12]).toBe(Math.round((300 * 6) / 7));
  });

  it('sums to about the whole window rather than over it', () => {
    const total = weekBudgets(90, 300).reduce((a, b) => a + b, 0);
    expect(total).toBeLessThanOrEqual(300 * 13);
  });

  it('handles a window shorter than one week', () => {
    const budgets = weekBudgets(4, 350);
    expect(budgets).toHaveLength(1);
    expect(budgets[0]).toBeLessThan(350);
  });
});

describe('block sizes', () => {
  it('never plans something too small to sit down to', () => {
    expect(roundBlock(7)).toBeGreaterThanOrEqual(15);
    expect(MIN_BLOCK_MINUTES).toBeGreaterThanOrEqual(30);
  });

  it('rounds to real study sessions', () => {
    expect(roundBlock(43)).toBe(45);
    expect(roundBlock(112)).toBe(105);
    expect(roundBlock(0)).toBe(0);
  });
});

describe('reserved shares', () => {
  it('cannot between them consume the whole plan', () => {
    // Diagnostics, validation and maintenance are all taken before gap capacity is shared
    // out. If they summed to 1 there would be no roadmap left to close a gap with.
    expect(DIAGNOSTIC_SHARE.lowCoverage + VALIDATION_SHARE + MAINTENANCE_SHARE).toBeLessThan(0.75);
  });

  it('spends more on finding out when little has been measured', () => {
    expect(diagnosticShareFor(10)).toBeGreaterThan(diagnosticShareFor(90));
    expect(diagnosticShareFor(LOW_COVERAGE_PERCENT)).toBe(DIAGNOSTIC_SHARE.normal);
  });

  it('stops one skill owning the programme', () => {
    expect(MAX_SKILL_SHARE).toBeLessThanOrEqual(0.35);
  });
});

describe('focus', () => {
  it('lets a student with more time carry more at once, within reason', () => {
    expect(activeSkillsPerWeek(150)).toBeLessThan(activeSkillsPerWeek(600));
    expect(activeSkillsPerWeek(600)).toBeLessThanOrEqual(4);
  });
});

describe('gap severity', () => {
  it('is larger the further the student is from the target', () => {
    expect(gapSeverity(35, 75)).toBeGreaterThan(gapSeverity(68, 75));
  });

  it('is zero for an unmeasured skill — absence is not distance', () => {
    expect(gapSeverity(null, 75)).toBe(0);
  });

  it('is bounded, so one catastrophic gap cannot dominate arithmetically', () => {
    expect(gapSeverity(-500, 75)).toBeLessThanOrEqual(1);
    expect(gapSeverity(100, 75)).toBe(0);
  });
});

describe('stage mix', () => {
  it('covers every stage the product can derive', () => {
    for (const s of CAREER_STAGES) expect(STAGE_MIX[s.key]).toBeDefined();
  });

  it('moves from instruction toward application as the student gets closer to work', () => {
    expect(STAGE_MIX.foundation.learn).toBeGreaterThan(STAGE_MIX.build.learn);
    expect(STAGE_MIX.build.learn).toBeGreaterThan(STAGE_MIX.placement.learn);
  });

  it('always splits the whole allocation', () => {
    for (const key of Object.keys(STAGE_MIX)) {
      expect(STAGE_MIX[key].learn + STAGE_MIX[key].practice).toBeCloseTo(1);
    }
  });

  it('plans an even split rather than guessing when the stage is unknown', () => {
    expect(mixFor(null).learn).toBe(0.5);
    expect(mixFor('nonsense').learn).toBe(0.5);
  });
});

describe('planning confidence', () => {
  it('is never derived from readiness — a confident low score deserves a confident plan', () => {
    expect(planningConfidence({
      roleConfidence: 'HIGH', diagnosticMinutes: 100, plannedMinutes: 1000,
    })).toBe('HIGH');
  });

  it('drops when the plan is mostly about finding out', () => {
    expect(planningConfidence({
      roleConfidence: 'HIGH', diagnosticMinutes: 800, plannedMinutes: 1000,
    })).toBe('MEDIUM');
  });

  it('cannot fall below LOW', () => {
    expect(planningConfidence({
      roleConfidence: 'LOW', diagnosticMinutes: 900, plannedMinutes: 1000,
    })).toBe('LOW');
  });
});

describe('the policy promises nothing about employment', () => {
  it('names no job, hire or placement probability', () => {
    const policy = require('../data/roadmapPolicy');
    const exported = Object.keys(policy).join(' ').toLowerCase();
    for (const forbidden of ['jobchance', 'placementprobability', 'hireprobability', 'guarantee']) {
      expect(exported).not.toContain(forbidden);
    }
  });
});
