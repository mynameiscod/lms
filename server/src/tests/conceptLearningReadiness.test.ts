/**
 * What may reach a student, and what must not.
 *
 * The publish gate exists because a half-written journey is worse than no journey: a student
 * served steps one and two of a unit whose step three was never authored has been given an
 * introduction and then abandoned, and they will read that as the product being broken.
 *
 * The split between blocking and advisory is the part worth pinning. Requiring a video
 * globally would push authors into making one for concepts that are better taught in writing;
 * requiring something to LEARN and something to PRACTICE is the minimum that makes a journey
 * a journey.
 */
import {
  PUBLISH_REQUIREMENTS, PUBLISH_ADVISORIES, readinessPercent,
} from '../data/conceptLearningPolicy';

describe('the publish policy', () => {
  it('blocks on the things without which a unit cannot teach', () => {
    const keys = PUBLISH_REQUIREMENTS.map(r => r.key);
    expect(keys).toContain('learn_step');
    expect(keys).toContain('practice_step');
    expect(keys).toContain('resources');
    expect(keys).toContain('sequence');
  });

  it('does not block on a video, because some concepts are better read', () => {
    const advisoryKeys = PUBLISH_ADVISORIES.map(a => a.key);
    expect(advisoryKeys).toContain('video');
    expect(PUBLISH_REQUIREMENTS.map(r => r.key)).not.toContain('video');
  });

  it('does not block on review or applied material either', () => {
    const advisoryKeys = PUBLISH_ADVISORIES.map(a => a.key);
    expect(advisoryKeys).toContain('review_step');
    expect(advisoryKeys).toContain('apply_step');
  });

  it('treats a skill check as advisory, and says why in the hint', () => {
    const check = PUBLISH_ADVISORIES.find(a => a.key === 'check_step')!;
    expect(check).toBeTruthy();
    expect(check.hint).toMatch(/evidence/i);
  });

  it('gives every check a label an admin can act on', () => {
    for (const c of [...PUBLISH_REQUIREMENTS, ...PUBLISH_ADVISORIES]) {
      expect(c.label.length).toBeGreaterThan(2);
      expect(c.hint.length).toBeGreaterThan(10);
    }
  });
});

describe('readiness percentage', () => {
  const total = PUBLISH_REQUIREMENTS.length + PUBLISH_ADVISORIES.length;

  it('is 100 only when everything passes, advisories included', () => {
    expect(readinessPercent(PUBLISH_REQUIREMENTS.length, PUBLISH_ADVISORIES.length)).toBe(100);
  });

  it('does not read 100 for a unit that merely clears the bar', () => {
    // The number exists to say how much better a sparse unit could be. A publishable unit
    // with no video, no review and no project is publishable and not finished.
    const pct = readinessPercent(PUBLISH_REQUIREMENTS.length, 0);
    expect(pct).toBeLessThan(100);
    expect(pct).toBeGreaterThan(50);
  });

  it('is 0 for an empty unit', () => {
    expect(readinessPercent(0, 0)).toBe(0);
  });

  it('counts every check equally, so the figure is explainable', () => {
    expect(readinessPercent(1, 0)).toBe(Math.round((1 / total) * 100));
  });
});
