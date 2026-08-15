import {
  resolveCareerProfile, stageFromCourse, deriveBackground, monthsFromCourse,
} from '../services/careerStageService';
import {
  normalizeDomain, normalizeLanguages, normalizeMinutes, normalizeDaysPerWeek,
  ROLE_NOT_SURE, DEFAULT_DOMAIN,
} from '../services/careerDomainService';
import { missingFor } from '../services/careerContextService';

/**
 * Module 1 — Student Career Context.
 *
 * These cover the pure resolution layer: stage, background and the vocabulary clamps.
 * That is where the product decisions live, and it runs without a database, so the suite
 * stays fast and deterministic.
 *
 * `NOW` is fixed. A stage suite that reads the real clock passes in one month and fails
 * in another, which teaches the team to ignore it.
 */
const NOW = new Date('2026-08-15T00:00:00Z');

describe('career stage — position in the course, not months on a clock', () => {
  const cases: [string, string, string][] = [
    ['B.Tech', '1st Year', 'foundation'],
    ['B.Tech', '2nd Year', 'build'],
    ['B.Tech', '3rd Year', 'build'],
    ['B.Tech', '4th Year', 'placement'],
    ['B.E',    '1st Year', 'foundation'],
    ['B.E',    '4th Year', 'placement'],
    ['B.Sc',   '1st Year', 'foundation'],
    ['B.Sc',   '2nd Year', 'build'],
    ['B.Sc',   '3rd Year', 'placement'],
    ['BCA',    '1st Year', 'foundation'],
    ['BCA',    '2nd Year', 'build'],
    ['BCA',    '3rd Year', 'placement'],
    ['MCA',    '1st Year', 'build'],
    ['MCA',    '2nd Year', 'placement'],
  ];

  it.each(cases)('%s %s → %s', (degree, year, expected) => {
    expect(stageFromCourse(degree, year)).toBe(expected);
  });

  it('treats a 3rd year as final in a 3-year course but mid-course in a 4-year one', () => {
    // The single distinction the whole design exists for.
    expect(stageFromCourse('B.Sc', '3rd Year')).toBe('placement');
    expect(stageFromCourse('B.Tech', '3rd Year')).toBe('build');
  });

  it('starts postgraduates at build — they already hold a degree', () => {
    expect(stageFromCourse('MCA', '1st Year')).toBe('build');
    expect(stageFromCourse('B.Tech', '1st Year')).toBe('foundation');
  });

  it.each(['Graduated', 'graduated', 'Passed out', 'Completed'])('%s → job_seeker', (year) => {
    expect(stageFromCourse('B.Tech', year)).toBe('job_seeker');
  });

  it('refuses to guess at an unrecognised course rather than assuming a length', () => {
    expect(stageFromCourse('B.Pharm', '2nd Year')).toBeNull();
    expect(stageFromCourse('', '2nd Year')).toBeNull();
    expect(stageFromCourse('B.Tech', '')).toBeNull();
  });
});

describe('career stage — course position wins over a graduation date', () => {
  it('puts a 2nd-year B.Tech in build, not foundation', () => {
    // 34 months out. A pure time rule calls that foundation and hands a student a year
    // into programming the first-week material — the regression this ordering prevents.
    const r = resolveCareerProfile({
      degree: 'B.Tech', yearOfStudy: '2nd Year', graduationYear: 2029, graduationMonth: 6, now: NOW,
    });
    expect(r.stage).toBe('build');
  });

  it('keeps the date for the months COUNT, where it is genuinely more precise', () => {
    const r = resolveCareerProfile({
      degree: 'B.Tech', yearOfStudy: '1st Year', graduationYear: 2030, graduationMonth: 6, now: NOW,
    });
    expect(r.stage).toBe('foundation');
    expect(r.monthsToGraduation).toBe(46);   // whole months, not "4 years"
  });

  it('falls back to the date when course position cannot be read', () => {
    const r = resolveCareerProfile({
      degree: 'B.Pharm', yearOfStudy: '2nd Year', graduationYear: 2027, graduationMonth: 6, now: NOW,
    });
    expect(r.stage).toBe('placement');       // ~10 months out
  });

  it('resolves to no stage when nothing is known, rather than picking one', () => {
    expect(resolveCareerProfile({ now: NOW }).stage).toBeNull();
  });

  it('short-circuits to job_seeker for a graduate whatever the date says', () => {
    const r = resolveCareerProfile({
      degree: 'B.Tech', yearOfStudy: '1st Year', graduationYear: 2030, graduated: true, now: NOW,
    });
    expect(r.stage).toBe('job_seeker');
  });
});

describe('background — no unsafe substring matching', () => {
  const cases: [string, string, string][] = [
    ['B.Tech', 'Computer Science / IT',     'cs'],
    ['B.Tech', 'CSE',                       'cs'],
    ['B.Tech', 'IT',                        'cs'],
    ['B.Tech', 'Data Science / AI',         'cs'],
    ['B.Sc',   'Computer Science',          'cs'],
    ['BCA',    '',                          'cs'],
    ['MCA',    '',                          'cs'],
  ];
  it.each(cases)('%s + %s → %s', (degree, branch, expected) => {
    expect(deriveBackground(null, branch, degree)).toBe(expected);
  });

  it('does not read "ai" inside Aeronautical or "it" inside ordinary words', () => {
    // The point is that neither is mistaken for COMPUTING. Both are informative branches
    // that happen to contain the letters, so non_cs is the right answer — 'cs' would mean
    // the whole-word guard had failed.
    expect(deriveBackground(null, 'Aeronautical Engineering', 'B.Tech')).toBe('non_cs');
    expect(deriveBackground(null, 'Maintenance Engineering', 'B.Tech')).toBe('non_cs');
  });

  it('treats an uninformative answer as unknown rather than as non-computing', () => {
    // "Other" is not a statement that they are outside IT.
    expect(deriveBackground(null, 'Other', 'B.Tech')).toBe('any');
  });

  it('returns any — not non_cs — for a bare degree with no branch', () => {
    // A B.Tech is CSE and Civil alike. Guessing would tag CSE students as outsiders.
    expect(deriveBackground(null, null, 'B.Tech')).toBe('any');
    expect(deriveBackground(null, 'Other', 'B.Tech')).toBe('any');
  });

  it('classifies a clearly non-computing branch away from cs', () => {
    for (const branch of ['Civil', 'Mechanical', 'Physics']) {
      expect(deriveBackground(null, branch, 'B.Tech')).not.toBe('cs');
    }
  });
});

describe('months remaining', () => {
  it('derives from course length when no date was collected', () => {
    expect(monthsFromCourse('B.Tech', '1st Year')).toBe(36);
    expect(monthsFromCourse('B.Sc', '1st Year')).toBe(24);
    expect(monthsFromCourse('MCA', '1st Year')).toBe(12);
  });
  it('clamps rather than returning a negative for a year past the course length', () => {
    expect(monthsFromCourse('B.Sc', '4th Year')).toBe(0);
  });
});

describe('career vocabulary — nothing unknown is ever stored', () => {
  // Role validation moved to careerRoleService when roles became admin configuration
  // (Module 2). The same guarantees — NOT_SURE accepted, an invented role refused,
  // case-insensitive input — are asserted against the real mechanism in careerRole.test.ts
  // and careerRoleContext.test.ts. Re-asserting them here against a deleted constant would
  // have been coverage of a code path nothing runs.
  it('resolves an unknown or inactive domain to the live one', () => {
    expect(normalizeDomain('HEALTHCARE')).toBe(DEFAULT_DOMAIN);
    expect(normalizeDomain(null)).toBe(DEFAULT_DOMAIN);
  });
  it('clamps languages to the domain list and de-duplicates', () => {
    expect(normalizeLanguages(DEFAULT_DOMAIN, ['java', 'Java', 'Klingon', 'Python']))
      .toEqual(['Java', 'Python']);
  });
  it('snaps availability to an offered value and rejects nonsense', () => {
    expect(normalizeMinutes(60)).toBe(60);
    expect(normalizeMinutes(45)).toBe(30);      // nearest offered
    expect(normalizeMinutes(1000)).toBe(120);
    expect(normalizeMinutes(0)).toBeNull();
    expect(normalizeMinutes('abc')).toBeNull();
  });
  it('bounds days per week to a real week', () => {
    expect(normalizeDaysPerWeek(5)).toBe(5);
    expect(normalizeDaysPerWeek(99)).toBe(7);
    expect(normalizeDaysPerWeek(0)).toBe(1);
  });
});

describe('onboarding completeness — separate from the LMS profile', () => {
  const base = (over: any = {}) => ({
    tenantId: 't', studentId: 's',
    education: { program: 'B.Tech', degree: 'B.Tech', branch: 'CSE', currentAcademicYear: '1st Year',
      graduationYear: null, graduationMonth: null, collegeName: null, university: null, ...over.education },
    location: { country: null, state: null, city: null },
    career: { domain: DEFAULT_DOMAIN, primaryRole: ROLE_NOT_SURE, secondaryRole: null, careerGoal: null,
      preferredProgrammingLanguages: [], preferredTechnologies: [], knownProgrammingLanguages: [], ...over.career },
    availability: { minutesPerDay: 60, daysPerWeek: null, ...over.availability },
    derived: { stage: 'foundation', background: 'cs', monthsToGraduation: 36, computedAt: NOW },
  });

  it('is satisfied by NOT_SURE — a first-year is not blocked on a role', () => {
    expect(missingFor(base() as any)).toEqual([]);
  });
  it('does not require a branch, which is meaningless for some programs', () => {
    expect(missingFor(base({ education: { branch: null } }) as any)).toEqual([]);
  });
  it('reports each genuinely missing answer', () => {
    expect(missingFor(base({ availability: { minutesPerDay: null } }) as any))
      .toContain('availability.minutesPerDay');
    expect(missingFor(base({ education: { currentAcademicYear: null } }) as any))
      .toContain('education.currentAcademicYear');
  });
});

describe('acceptance scenarios', () => {
  it('A — Rahul, B.Tech CSE 1st year → foundation / cs', () => {
    const r = resolveCareerProfile({
      degree: 'B.Tech', branch: 'CSE', yearOfStudy: '1st Year', graduationYear: 2030, now: NOW,
    });
    expect(r.stage).toBe('foundation');
    expect(r.background).toBe('cs');
    // The role half of this scenario is asserted end to end in careerRoleContext.test.ts,
    // where it runs against the configured role rather than a constant.
  });

  it('B — Priya, B.Sc Computer Science 3rd year → placement, NOT build', () => {
    const r = resolveCareerProfile({ degree: 'B.Sc', branch: 'Computer Science', yearOfStudy: '3rd Year', now: NOW });
    expect(r.stage).toBe('placement');
    expect(r.background).toBe('cs');
    // The trap: the same year number in a 4-year course means something else.
    expect(resolveCareerProfile({ degree: 'B.Tech', yearOfStudy: '3rd Year', now: NOW }).stage).toBe('build');
  });

  it('C — Arjun, MCA 1st year → build', () => {
    expect(resolveCareerProfile({ degree: 'MCA', yearOfStudy: '1st Year', now: NOW }).stage).toBe('build');
  });

  it('D — a first-year with no idea is accepted, not forced to choose', () => {
    expect(missingFor({
      education: { degree: 'B.Tech', currentAcademicYear: '1st Year' },
      career: { domain: DEFAULT_DOMAIN, primaryRole: ROLE_NOT_SURE },
      availability: { minutesPerDay: 30 },
    } as any)).toEqual([]);
  });
});

describe('backward compatibility — a member from before this existed', () => {
  it('resolves without any of the new fields, and without throwing', () => {
    const r = resolveCareerProfile({ degree: 'B.Tech', yearOfStudy: '2nd Year', now: NOW });
    expect(r.stage).toBe('build');
    expect(r.background).toBe('any');          // no branch on record — not a guess
  });
  it('reads absent preferences as empty rather than crashing on undefined', () => {
    expect(normalizeLanguages(undefined, undefined)).toEqual([]);
  });
});
