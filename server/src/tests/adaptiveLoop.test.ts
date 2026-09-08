/**
 * The loop that makes the plan adaptive rather than one-shot.
 *
 * Direction resolution, content selection, evidence weighting and replan triggering — the four
 * places where the system decides something about a student between assessments. Each has a
 * failure mode that produces a plausible-looking plan and a wrong one, which is why they are
 * pinned rather than trusted.
 */

import {
  resolveDirection, directionsFromInterests, describeDirection,
} from '../services/careerDirectionService';
import { depthFallbacks } from '../services/adaptiveContentResolver';
import { sourceWeight, evidenceWeightFor, confidenceFor } from '../data/skillDnaPolicy';
import { EVIDENCE_SOURCES } from '../models/StudentSkillEvidence';
import { publish, on, __resetHandlers, AdaptiveEvent } from '../services/adaptiveCurriculumEvents';

/* ================================================================== *
 * Direction resolution
 * ================================================================== */

describe('working out where a student is heading', () => {
  it('takes an explicit choice at face value', () => {
    const r = resolveDirection({ selectedDirection: 'AI_ML' });
    expect(r.direction?.key).toBe('AI_ML');
    expect(r.status).toBe('SELECTED');
  });

  it('infers the direction from a chosen role', () => {
    const r = resolveDirection({ primaryRole: 'BACKEND_ENGINEER' });
    expect(r.direction?.key).toBe('SOFTWARE_BACKEND');
    expect(r.status).toBe('SELECTED');
  });

  /**
   * NOT_SURE is stored as a real value precisely so it can be told apart from a blank. Turning
   * it into a guess would throw away the one honest answer the student gave.
   */
  it('never invents a direction for a student who said they do not know', () => {
    const r = resolveDirection({ primaryRole: 'NOT_SURE' });
    expect(r.direction).toBeNull();
    expect(r.status).toBe('UNDECIDED');
    expect(r.basis).toBe('NOT_SURE');
  });

  it('distinguishes "said they do not know" from "was never asked"', () => {
    expect(resolveDirection({ primaryRole: 'NOT_SURE' }).basis).toBe('NOT_SURE');
    expect(resolveDirection({}).basis).toBe('NOT_ANSWERED');
  });

  it('gives an undecided student a field to explore rather than nothing', () => {
    const r = resolveDirection({});
    expect(r.explorationDirections.length).toBeGreaterThan(0);
    expect(r.explorationDirections.length).toBeLessThanOrEqual(4);
  });

  /** An interest is a hint about what to show, never a career decision made on their behalf. */
  it('uses interests to narrow exploration but not to declare a direction', () => {
    const r = resolveDirection({ preferredTechnologies: ['React', 'CSS'] });
    expect(r.direction).toBeNull();
    expect(r.status).toBe('EXPLORING');
    expect(r.explorationDirections).toContain('WEB_DEVELOPMENT');
  });

  it('reads several interests and ranks by how often they point somewhere', () => {
    const dirs = directionsFromInterests(['python', 'pandas', 'sql', 'react']);
    expect(dirs[0]).toBe('DATA');
    expect(dirs).toContain('WEB_DEVELOPMENT');
  });

  it('ignores a technology it does not recognise rather than bucketing it', () => {
    expect(directionsFromInterests(['COBOL', 'Fortran'])).toEqual([]);
  });

  /**
   * A role with no direction mapped yet is EXPLORING, not SELECTED: the student told us
   * something real, but we cannot honestly claim to know what to narrow their teaching to.
   */
  it('shows breadth for a role it cannot place, rather than pretending', () => {
    const r = resolveDirection({ primaryRole: 'QUANTUM_ENGINEER' });
    expect(r.status).toBe('EXPLORING');
    expect(r.explorationDirections.length).toBeGreaterThan(0);
  });

  it('never tells a student their choice is permanent', () => {
    const text = describeDirection(resolveDirection({ selectedDirection: 'AI_ML' }));
    expect(text).toMatch(/change this whenever/i);
  });

  it('does not shame a student who has not decided', () => {
    const text = describeDirection(resolveDirection({}));
    expect(text).not.toMatch(/fail|should|must|need to decide/i);
  });
});

/* ================================================================== *
 * Content substitution
 * ================================================================== */

describe('when the exact depth of material does not exist', () => {
  /**
   * Substitution walks toward MORE support. Handing a struggling student the recap written for
   * somebody revising is how they conclude they are stupid; handing a confident student the
   * full build is merely slow.
   */
  it('prefers richer material over leaner when foundation is missing', () => {
    const order = depthFallbacks('STANDARD');
    expect(order[0]).toBe('STANDARD');
    expect(order.indexOf('GUIDED')).toBeLessThan(order.indexOf('REVISION'));
    expect(order.indexOf('FOUNDATION')).toBeLessThan(order.indexOf('CHALLENGE'));
  });

  it('offers every depth eventually rather than giving up', () => {
    expect(depthFallbacks('FOUNDATION')).toHaveLength(5);
    expect(new Set(depthFallbacks('CHALLENGE')).size).toBe(5);
  });

  it('always tries the requested depth first', () => {
    for (const d of ['FOUNDATION', 'GUIDED', 'STANDARD', 'REVISION', 'CHALLENGE'] as const) {
      expect(depthFallbacks(d)[0]).toBe(d);
    }
  });
});

/* ================================================================== *
 * Module assessments as evidence
 * ================================================================== */

describe('admitting module assessments into Skill DNA', () => {
  it('is a recognised source', () => {
    expect(EVIDENCE_SOURCES).toContain('MODULE_ASSESSMENT');
  });

  /**
   * The reason it is weighted below a marked paper is not that it is graded less carefully —
   * it is that it can be retaken until the result is favourable, and repeatable evidence is
   * weaker evidence.
   */
  it('counts for less than a proctored assessment', () => {
    expect(sourceWeight('MODULE_ASSESSMENT')).toBeLessThan(sourceWeight('PERSONALIZED_ASSESSMENT'));
  });

  it('counts for something real, not a token', () => {
    expect(sourceWeight('MODULE_ASSESSMENT')).toBeGreaterThan(0.25);
  });

  it('leaves the existing sources untouched', () => {
    expect(sourceWeight('PERSONALIZED_ASSESSMENT')).toBe(1.0);
    expect(sourceWeight('MOCK_INTERVIEW')).toBe(0.6);
  });

  it('still multiplies through relationship and difficulty like every other source', () => {
    const primaryHard = evidenceWeightFor({ relationship: 'PRIMARY', difficulty: 'HARD', sourceType: 'MODULE_ASSESSMENT' });
    const secondaryEasy = evidenceWeightFor({ relationship: 'SECONDARY', difficulty: 'EASY', sourceType: 'MODULE_ASSESSMENT' });
    expect(primaryHard).toBeGreaterThan(secondaryEasy);
  });

  /**
   * Roughly two module assessments to one marked paper. Stated as a test because it is the
   * product decision, not an implementation detail — if it changes, it should change on purpose.
   */
  it('needs about twice as many observations to carry the same weight', () => {
    const module = evidenceWeightFor({ relationship: 'PRIMARY', difficulty: 'MEDIUM', sourceType: 'MODULE_ASSESSMENT' });
    const paper = evidenceWeightFor({ relationship: 'PRIMARY', difficulty: 'MEDIUM', sourceType: 'PERSONALIZED_ASSESSMENT' });
    expect(module * 2).toBeCloseTo(paper, 5);
  });

  it('can reach MEDIUM confidence on its own, with enough of it', () => {
    // Six primary medium module answers = 3.0 effective weight = MEDIUM. Coursework alone
    // should be able to say something, just not as quickly.
    const per = evidenceWeightFor({ relationship: 'PRIMARY', difficulty: 'MEDIUM', sourceType: 'MODULE_ASSESSMENT' });
    expect(confidenceFor(per * 6, 6)).not.toBe('LOW');
  });
});

/* ================================================================== *
 * Events
 * ================================================================== */

describe('the event seam', () => {
  beforeEach(() => __resetHandlers());
  afterAll(() => __resetHandlers());

  const evt = (name: any): AdaptiveEvent => ({ name, tenantId: 't', studentId: 's' });

  it('delivers an event to its handler', async () => {
    const seen: string[] = [];
    on('MODULE_ASSESSMENT_COMPLETED', e => { seen.push(e.studentId); });
    await publish(evt('MODULE_ASSESSMENT_COMPLETED'));
    expect(seen).toEqual(['s']);
  });

  /**
   * A student who has just submitted work must never see an error because a listener failed.
   * The submission is already saved by the time anything here runs.
   */
  it('does not let a failing handler break the publisher', async () => {
    on('DIAGNOSTIC_COMPLETED', () => { throw new Error('handler exploded'); });
    await expect(publish(evt('DIAGNOSTIC_COMPLETED'))).resolves.toBeUndefined();
  });

  it('still runs the other handlers when one fails', async () => {
    const seen: string[] = [];
    on('DIAGNOSTIC_COMPLETED', () => { throw new Error('first one exploded'); });
    on('DIAGNOSTIC_COMPLETED', () => { seen.push('second ran'); });
    await publish(evt('DIAGNOSTIC_COMPLETED'));
    expect(seen).toEqual(['second ran']);
  });

  it('is silent for an event nobody listens to', async () => {
    await expect(publish(evt('PRACTICE_COMPLETED'))).resolves.toBeUndefined();
  });
});
