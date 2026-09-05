/**
 * A role means one thing. What a role requires OF YOU depends on how far through you are.
 *
 * THE FAULT THIS FIXES. One blueprint per role was the whole model, and a requirement had no
 * year on it, so a first-year and a final-year who both chose Software Engineer were measured
 * against the identical 22 skills at identical targets. The first-year was scored on System
 * Design and REST APIs and shown a readiness figure in the low teens — which reads as "this
 * product thinks I am hopeless" rather than "you are in your first year". Stage could not fix
 * it: stage shifts the learn/practice mix and by design never touches a score or a target.
 *
 * Two separate questions, deliberately separated in the model:
 *   years       — does this requirement apply to me at all?
 *   yearTargets — and if it does, how high is the bar?
 *
 * The second is not the first with extra steps. OOP applies to a second year AND a final year;
 * what differs is that one should reach FOUNDATION and the other PROFICIENT.
 */
import { requirementForYear, yearMatches } from '../models/RoleSkillBlueprint';

const req = (over: any = {}) => ({
  skillKey: 'OOP_CONCEPTS',
  targetLevel: 'WORKING' as const,
  years: [] as string[],
  yearTargets: [] as { year: string; targetLevel: any }[],
  ...over,
});

describe('year matching', () => {
  it('ignores case and spacing, because two screens wrote the same intent differently', () => {
    expect(yearMatches('2nd Year', '2nd year')).toBe(true);
    expect(yearMatches('2nd  Year', '2nd Year')).toBe(true);
    expect(yearMatches(' 3rd Year ', '3rd Year')).toBe(true);
  });

  it('does not match different years', () => {
    expect(yearMatches('2nd Year', '3rd Year')).toBe(false);
  });

  it('treats absent values as not matching, rather than as a wildcard', () => {
    expect(yearMatches('', '2nd Year')).toBe(false);
  });
});

describe('does the requirement apply', () => {
  it('applies to everyone when no years are set — every existing blueprint', () => {
    expect(requirementForYear(req(), '1st Year').applies).toBe(true);
    expect(requirementForYear(req(), '4th Year').applies).toBe(true);
  });

  it('applies only to the years named', () => {
    const r = req({ years: ['3rd Year', '4th Year'] });
    expect(requirementForYear(r, '3rd Year').applies).toBe(true);
    expect(requirementForYear(r, '4th Year').applies).toBe(true);
    expect(requirementForYear(r, '1st Year').applies).toBe(false);
    expect(requirementForYear(r, '2nd Year').applies).toBe(false);
  });

  it('keeps a first-year clear of final-year expectations', () => {
    const systemDesign = req({ skillKey: 'SYSTEM_DESIGN_BASICS', years: ['4th Year'] });
    expect(requirementForYear(systemDesign, '1st Year').applies).toBe(false);
  });

  /**
   * The dangerous default, chosen deliberately. A member who skipped the onboarding field has
   * no year; refusing every targeted requirement would shrink their blueprint and INFLATE
   * their readiness, so an unknown year sees everything rather than nothing.
   */
  it('applies everything when the student has no year recorded', () => {
    const r = req({ years: ['4th Year'] });
    expect(requirementForYear(r, null).applies).toBe(true);
    expect(requirementForYear(r, '').applies).toBe(true);
    expect(requirementForYear(r, undefined).applies).toBe(true);
  });
});

describe('how high the bar is set', () => {
  it('uses the role default when nothing is overridden', () => {
    expect(requirementForYear(req(), '2nd Year').targetLevel).toBe('WORKING');
  });

  it('raises the bar for a later year, on the same requirement', () => {
    const r = req({
      targetLevel: 'WORKING',
      yearTargets: [
        { year: '2nd Year', targetLevel: 'FOUNDATION' },
        { year: '4th Year', targetLevel: 'PROFICIENT' },
      ],
    });
    expect(requirementForYear(r, '2nd Year').targetLevel).toBe('FOUNDATION');
    expect(requirementForYear(r, '4th Year').targetLevel).toBe('PROFICIENT');
  });

  it('falls back to the default for a year with no override', () => {
    const r = req({ targetLevel: 'WORKING', yearTargets: [{ year: '4th Year', targetLevel: 'PROFICIENT' }] });
    expect(requirementForYear(r, '3rd Year').targetLevel).toBe('WORKING');
  });

  it('matches an override case-insensitively too', () => {
    const r = req({ yearTargets: [{ year: '4th year', targetLevel: 'ADVANCED' }] });
    expect(requirementForYear(r, '4th Year').targetLevel).toBe('ADVANCED');
  });

  it('ignores an override when the student has no year', () => {
    const r = req({ targetLevel: 'WORKING', yearTargets: [{ year: '4th Year', targetLevel: 'ADVANCED' }] });
    expect(requirementForYear(r, null).targetLevel).toBe('WORKING');
  });
});

describe('the two axes are independent', () => {
  it('can apply to one year and still carry a different target for another', () => {
    // Nonsense configuration on purpose: an override for a year the requirement excludes must
    // not accidentally re-include it.
    const r = req({ years: ['2nd Year'], yearTargets: [{ year: '4th Year', targetLevel: 'ADVANCED' }] });
    const fourth = requirementForYear(r, '4th Year');
    expect(fourth.applies).toBe(false);
  });

  it('describes a real blueprint row end to end', () => {
    const oop = req({
      skillKey: 'OOP_CONCEPTS',
      targetLevel: 'WORKING',
      years: ['2nd Year', '3rd Year', '4th Year'],
      yearTargets: [
        { year: '2nd Year', targetLevel: 'FOUNDATION' },
        { year: '4th Year', targetLevel: 'PROFICIENT' },
      ],
    });
    expect(requirementForYear(oop, '1st Year')).toEqual({ applies: false, targetLevel: 'WORKING' });
    expect(requirementForYear(oop, '2nd Year')).toEqual({ applies: true, targetLevel: 'FOUNDATION' });
    expect(requirementForYear(oop, '3rd Year')).toEqual({ applies: true, targetLevel: 'WORKING' });
    expect(requirementForYear(oop, '4th Year')).toEqual({ applies: true, targetLevel: 'PROFICIENT' });
  });
});
