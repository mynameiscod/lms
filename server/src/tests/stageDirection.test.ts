/**
 * A committed direction — and why it is a separate idea from DirectionStatus.
 *
 * careerDirectionPolicy states deliberately that SELECTED "is not a commitment and must never be
 * treated as one". That is right for Years 1 and 2, where a direction filters enrichment and a
 * first-year saying "I think backend" must stay free to change their mind.
 *
 * Year 3 is a different product: the specialization is six topics, a track and a project, and
 * `applicableDirections` keeps every one of them out of a plan with no direction. So the rule is
 * stage-scoped rather than a redefinition of SELECTED — changing what that word means would
 * reach back into every first- and second-year plan ever composed, to serve a year those
 * students are not in. These tests exist mostly to hold that line.
 */

import {
  commitmentFor, mayChangeDirection, directionRequiredFor,
  DIRECTION_REQUIRED_STAGES, DIRECTION_LOCK_MODULE, choosableDirections,
} from '../data/stageDirectionPolicy';
import { DIRECTION_KEYS } from '../data/careerDirectionPolicy';

describe('which stages require a direction', () => {
  it('requires one for Year 3, where the specialization is the year', () => {
    expect(directionRequiredFor('specialize')).toBe(true);
  });

  /**
   * The line this whole file exists to hold. In Year 2 a direction filters enrichment, so a
   * student without one gets a slightly plainer plan and nothing is wrong.
   */
  it('requires none for Years 1 and 2, which are unchanged by any of this', () => {
    expect(directionRequiredFor('foundation')).toBe(false);
    expect(directionRequiredFor('build')).toBe(false);
    expect(directionRequiredFor(null)).toBe(false);
    expect(directionRequiredFor(undefined)).toBe(false);
  });

  it('names the stages explicitly rather than inferring them', () => {
    expect([...DIRECTION_REQUIRED_STAGES]).toEqual(['specialize']);
  });
});

describe('what a student is committed to', () => {
  it('reports the direction they chose, and that it can still change', () => {
    const r = commitmentFor({ stageKey: 'specialize', selectedDirection: 'CYBERSECURITY' });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.commitment.direction).toBe('CYBERSECURITY');
      expect(r.commitment.changeable).toBe(true);
    }
  });

  it('locks it once the plan has reached the confirming module', () => {
    const r = commitmentFor({ stageKey: 'specialize', selectedDirection: 'AI_ML', reachedLockModule: true });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.commitment.changeable).toBe(false);
  });

  /**
   * Three refusals rather than one null, because they are three different sentences on screen:
   * "choose a direction", "that is not one of ours", and "this year does not need one".
   */
  it('says WHY there is no commitment, not merely that there is none', () => {
    expect(commitmentFor({ stageKey: 'specialize', selectedDirection: '' }))
      .toEqual({ ok: false, refusal: 'NO_DIRECTION' });
    expect(commitmentFor({ stageKey: 'specialize', selectedDirection: 'ASTRONAUT' }))
      .toEqual({ ok: false, refusal: 'UNKNOWN_DIRECTION' });
    expect(commitmentFor({ stageKey: 'build', selectedDirection: 'AI_ML' }))
      .toEqual({ ok: false, refusal: 'NOT_REQUIRED' });
  });

  it('accepts a direction however it was cased on the way in', () => {
    const r = commitmentFor({ stageKey: 'specialize', selectedDirection: '  ai_ml  ' });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.commitment.direction).toBe('AI_ML');
  });
});

describe('when a direction may still be changed', () => {
  it('may be changed through Stage 1', () => {
    expect(mayChangeDirection({ stageKey: 'specialize' })).toBe(true);
  });

  it('may not once Stage 2 has been reached', () => {
    expect(mayChangeDirection({ stageKey: 'specialize', reachedLockModule: true })).toBe(false);
  });

  /** Nothing is locked in a year that never required a choice in the first place. */
  it('is always free in the years that do not require one', () => {
    expect(mayChangeDirection({ stageKey: 'build', reachedLockModule: true })).toBe(true);
    expect(mayChangeDirection({ stageKey: 'foundation', reachedLockModule: true })).toBe(true);
  });

  it('names the lock point rather than hard-coding a module order', () => {
    expect(DIRECTION_LOCK_MODULE).toBe('S11_DIRECTION');
  });
});

describe('what a student may choose from', () => {
  it('offers exactly the canonical directions, so a picker cannot invent one', () => {
    expect(choosableDirections().map(d => d.key).sort()).toEqual([...DIRECTION_KEYS].sort());
  });

  it('gives each one something to read, so the choice is informed', () => {
    for (const d of choosableDirections()) {
      expect(d.name).toBeTruthy();
      expect(d.blurb).toBeTruthy();
    }
  });
});
