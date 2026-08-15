import {
  ROLE_READINESS_VERSION, TARGET_SCORE, targetScoreFor, classifyGap, skillRatio,
  priorityScore, isSufficientlyAssessed, roleConfidence, STATUS_ORDER,
  COVERAGE_THRESHOLDS, ESSENTIAL_COVERAGE_FOR_HIGH, STRONG_MARGIN, IMPORTANCE_PRIORITY,
} from '../data/roleReadinessPolicy';
import { SKILL_TARGET_LEVELS, SKILL_IMPORTANCE } from '../models/RoleSkillBlueprint';

/**
 * Module 8 — comparing what a role needs with what a student has shown.
 *
 * The property under most pressure here is that UNKNOWN is not ZERO. A student who has
 * never been asked about Docker must not look like one who cannot do it, and every layer
 * — classification, readiness, coverage, priority — has to preserve that distinction or
 * the whole figure becomes a punishment for gaps in our own assessment coverage.
 */

describe('target levels', () => {
  it('covers every level Module 4 can configure', () => {
    for (const level of SKILL_TARGET_LEVELS) {
      expect(TARGET_SCORE[level]).toBeGreaterThan(0);
    }
  });

  it('increases with depth', () => {
    expect(TARGET_SCORE.FOUNDATION).toBeLessThan(TARGET_SCORE.WORKING);
    expect(TARGET_SCORE.WORKING).toBeLessThan(TARGET_SCORE.PROFICIENT);
    expect(TARGET_SCORE.PROFICIENT).toBeLessThan(TARGET_SCORE.ADVANCED);
  });

  it('falls back to WORKING for anything unrecognised', () => {
    expect(targetScoreFor('NONSENSE')).toBe(TARGET_SCORE.WORKING);
  });
});

describe('classifying one required skill', () => {
  it('is NOT_ASSESSED with no evidence — never a zero score', () => {
    expect(classifyGap({ studentScore: null, targetScore: 75, confidence: null })).toBe('NOT_ASSESSED');
  });

  it('is LIMITED_EVIDENCE on low confidence, distinct from unmeasured', () => {
    // "We looked a little and are unsure" is a different statement from "we never asked".
    expect(classifyGap({ studentScore: 90, targetScore: 60, confidence: 'LOW' })).toBe('LIMITED_EVIDENCE');
    expect(classifyGap({ studentScore: 20, targetScore: 60, confidence: 'LOW' })).toBe('LIMITED_EVIDENCE');
  });

  it('is ON_TRACK at or above target', () => {
    expect(classifyGap({ studentScore: 60, targetScore: 60, confidence: 'HIGH' })).toBe('ON_TRACK');
    expect(classifyGap({ studentScore: 72, targetScore: 60, confidence: 'MEDIUM' })).toBe('ON_TRACK');
  });

  it('is STRONG only when clearly above target AND well evidenced — Scenario B', () => {
    expect(classifyGap({ studentScore: 60 + STRONG_MARGIN, targetScore: 60, confidence: 'HIGH' })).toBe('STRONG');
    // A perfect score on thin evidence is not a proven strength.
    expect(classifyGap({ studentScore: 100, targetScore: 60, confidence: 'LOW' })).toBe('LIMITED_EVIDENCE');
    expect(classifyGap({ studentScore: 100, targetScore: 60, confidence: 'MEDIUM' })).toBe('ON_TRACK');
  });

  it('separates a nudge from a real deficit', () => {
    expect(classifyGap({ studentScore: 64, targetScore: 75, confidence: 'HIGH' })).toBe('NEEDS_WORK');
    expect(classifyGap({ studentScore: 42, targetScore: 75, confidence: 'HIGH' })).toBe('PRIORITY_GAP');
  });

  it('measures distance to the REQUIREMENT, not to perfection', () => {
    // 72 against a target of 60 is fine, however far it is from 100.
    expect(classifyGap({ studentScore: 72, targetScore: 60, confidence: 'HIGH' })).not.toBe('NEEDS_WORK');
  });
});

describe('skill ratio', () => {
  it('is the fraction of the requirement met', () => {
    expect(skillRatio(60, 75)).toBeCloseTo(0.8);
    expect(skillRatio(75, 75)).toBe(1);
  });

  it('is CAPPED at 1 — excellence cannot offset absence', () => {
    // Scenario J: 100 on SQL must not compensate for 0 on REST.
    expect(skillRatio(100, 60)).toBe(1);
    expect(skillRatio(1000, 60)).toBe(1);
  });

  it('never goes below zero', () => {
    expect(skillRatio(-20, 60)).toBe(0);
  });

  it('treats a zero target as satisfied rather than dividing by zero', () => {
    expect(skillRatio(0, 0)).toBe(1);
  });
});

describe('priority', () => {
  it('is zero when the target is met', () => {
    expect(priorityScore({ studentScore: 80, targetScore: 75, weight: 10, importance: 'ESSENTIAL' })).toBe(0);
  });

  it('rises with the size of the gap', () => {
    const small = priorityScore({ studentScore: 70, targetScore: 75, weight: 8, importance: 'IMPORTANT' });
    const large = priorityScore({ studentScore: 30, targetScore: 75, weight: 8, importance: 'IMPORTANT' });
    expect(large).toBeGreaterThan(small);
  });

  it('rises with the role’s own weight', () => {
    const light = priorityScore({ studentScore: 40, targetScore: 75, weight: 3, importance: 'IMPORTANT' });
    const heavy = priorityScore({ studentScore: 40, targetScore: 75, weight: 10, importance: 'IMPORTANT' });
    expect(heavy).toBeGreaterThan(light);
  });

  it('ranks an essential gap above an optional one of the same size', () => {
    const essential = priorityScore({ studentScore: 40, targetScore: 75, weight: 8, importance: 'ESSENTIAL' });
    const optional = priorityScore({ studentScore: 40, targetScore: 75, weight: 8, importance: 'OPTIONAL' });
    expect(essential).toBeGreaterThan(optional);
  });

  it('is proportional — the same points matter more against a lower target', () => {
    // Missing 20 points of FOUNDATION is missing the basics; 20 short of ADVANCED is not.
    const foundation = priorityScore({ studentScore: 20, targetScore: 40, weight: 8, importance: 'IMPORTANT' });
    const advanced = priorityScore({ studentScore: 70, targetScore: 90, weight: 8, importance: 'IMPORTANT' });
    expect(foundation).toBeGreaterThan(advanced);
  });

  it('covers every importance Module 4 can configure', () => {
    for (const i of SKILL_IMPORTANCE) expect(IMPORTANCE_PRIORITY[i]).toBeGreaterThan(0);
  });
});

describe('what counts as sufficiently assessed', () => {
  it('accepts MEDIUM and HIGH, not LOW', () => {
    expect(isSufficientlyAssessed('HIGH')).toBe(true);
    expect(isSufficientlyAssessed('MEDIUM')).toBe(true);
    expect(isSufficientlyAssessed('LOW')).toBe(false);
    expect(isSufficientlyAssessed(null)).toBe(false);
    expect(isSufficientlyAssessed(undefined)).toBe(false);
  });
});

describe('role confidence', () => {
  it('never derives from the readiness figure', () => {
    // Scenario L: a confidently-measured 55% must stay confident. Treating low readiness
    // as low confidence would hide exactly the students who most need to know.
    const wellCovered = { coveragePercent: 90, essentialTotal: 6, essentialAssessed: 6 };
    expect(roleConfidence(wellCovered)).toBe('HIGH');
  });

  it('is LOW when little of the role has been measured — Scenario K', () => {
    expect(roleConfidence({ coveragePercent: 25, essentialTotal: 6, essentialAssessed: 2 })).toBe('LOW');
  });

  it('refuses HIGH when essential skills are largely unmeasured', () => {
    // Broad coverage of the easy-to-assess parts is not a confident picture.
    expect(roleConfidence({ coveragePercent: 80, essentialTotal: 7, essentialAssessed: 2 })).toBe('MEDIUM');
  });

  it('reaches HIGH with both broad coverage and essential coverage', () => {
    const essentialAssessed = Math.ceil(7 * ESSENTIAL_COVERAGE_FOR_HIGH);
    expect(roleConfidence({
      coveragePercent: COVERAGE_THRESHOLDS.HIGH, essentialTotal: 7, essentialAssessed,
    })).toBe('HIGH');
  });

  it('does not punish a blueprint with no essential skills', () => {
    expect(roleConfidence({ coveragePercent: 90, essentialTotal: 0, essentialAssessed: 0 })).toBe('HIGH');
  });
});

describe('reading order', () => {
  it('puts what to act on before what is already fine', () => {
    expect(STATUS_ORDER.PRIORITY_GAP).toBeLessThan(STATUS_ORDER.NEEDS_WORK);
    expect(STATUS_ORDER.NEEDS_WORK).toBeLessThan(STATUS_ORDER.ON_TRACK);
    expect(STATUS_ORDER.ON_TRACK).toBeLessThan(STATUS_ORDER.STRONG);
  });

  it('places unknowns after known gaps but before settled skills', () => {
    // An unassessed skill is not a weakness, so it must not head the list — but it is
    // still more actionable than something already on track.
    expect(STATUS_ORDER.NOT_ASSESSED).toBeGreaterThan(STATUS_ORDER.PRIORITY_GAP);
    expect(STATUS_ORDER.NOT_ASSESSED).toBeLessThan(STATUS_ORDER.ON_TRACK);
  });
});

describe('the policy is versioned and self-contained', () => {
  it('declares one version', () => {
    expect(ROLE_READINESS_VERSION).toBe('ROLE_READINESS_V1');
  });

  it('knows nothing about degree, year or stage', () => {
    // Those shaped which assessment was generated; they must not manufacture capability.
    const policy = require('../data/roleReadinessPolicy');
    const exported = Object.keys(policy).join(' ').toLowerCase();
    for (const forbidden of ['degree', 'year', 'stage', 'branch']) {
      expect(exported).not.toContain(forbidden);
    }
  });

  it('promises nothing about employment', () => {
    const policy = require('../data/roleReadinessPolicy');
    const exported = Object.keys(policy).join(' ').toLowerCase();
    for (const forbidden of ['job', 'hire', 'placement', 'probability', 'chance']) {
      expect(exported).not.toContain(forbidden);
    }
  });
});
