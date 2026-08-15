/**
 * The vocabulary CareerPilot describes a career direction with.
 *
 * Kept in one place so a role is a value with a label rather than a string typed into
 * three screens. The existing career-stage service already works this way (CAREER_STAGES,
 * PROGRAMS) and the same reasoning applies: a magic string that reaches only part of the
 * system is indistinguishable from one that works.
 *
 * SOFTWARE_ENGINEERING is the only live domain. The shape is domain-keyed anyway, because
 * retrofitting a second domain onto a flat list means touching every consumer, while
 * adding one here is an entry in a map. Nothing outside this file may assume the domain.
 *
 * ROLES USED TO LIVE HERE and are now admin configuration — see models/CareerRole and
 * careerRoleService. The hardcoded list was deleted rather than left in place: a second
 * copy of the vocabulary that no production path reads is a copy somebody eventually
 * imports by accident, and it would have gone stale the first time an admin added a role.
 * What remains here is genuinely fixed vocabulary — domains, languages, availability and
 * the supported programs — none of which Module 2 makes configurable.
 */

export type CareerDomainKey = 'SOFTWARE_ENGINEERING';

export interface CareerDomain {
  key: CareerDomainKey;
  label: string;
  /** Live domains accept new members; the rest exist so the type can grow. */
  active: boolean;
  /** Languages offered as an INTEREST, not a claim of ability. See below. */
  languages: string[];
}

/**
 * "Not sure yet" is first and is a real answer, not a skipped question.
 *
 * A first-year student genuinely does not know whether they want backend or mobile, and
 * a form that makes them pick collects a guess that later engines would treat as a
 * decision. Recommending a role is a later module's job; capturing honestly that there
 * is no answer yet is this one's.
 */
export const ROLE_NOT_SURE = 'NOT_SURE';

export const CAREER_DOMAINS: CareerDomain[] = [
  {
    key: 'SOFTWARE_ENGINEERING',
    label: 'Software Engineering',
    active: true,
    languages: ['Java', 'Python', 'JavaScript', 'TypeScript', 'C', 'C++', 'Not Sure'],
  },
];

export const DEFAULT_DOMAIN: CareerDomainKey = 'SOFTWARE_ENGINEERING';

/**
 * Minutes a day, as a number.
 *
 * Stored numerically rather than as "1 hour daily" because a later module has to compare,
 * sum and scale it, and none of that is possible against display text. The labels here are
 * for the UI; the value that reaches the database is always an integer.
 */
export const AVAILABILITY_OPTIONS: { minutes: number; label: string }[] = [
  { minutes: 30,  label: '30 minutes' },
  { minutes: 60,  label: '1 hour' },
  { minutes: 90,  label: '1.5 hours' },
  { minutes: 120, label: '2 hours or more' },
];

/** Programs CareerPilot v1 serves. A subset of the LMS-wide PROGRAMS list, on purpose. */
export const SUPPORTED_PROGRAMS = ['B.Tech', 'B.E', 'B.Sc', 'BCA', 'MCA'];

export const domainOf = (key?: string | null): CareerDomain =>
  CAREER_DOMAINS.find(d => d.key === key) || CAREER_DOMAINS[0];

export function normalizeDomain(key?: string | null): CareerDomainKey {
  const want = String(key || '').trim().toUpperCase();
  const hit = CAREER_DOMAINS.find(d => d.key === want && d.active);
  return hit ? hit.key : DEFAULT_DOMAIN;
}

/** Clamped to the domain's own list, so a typo cannot become a stored preference. */
export function normalizeLanguages(domainKey: string | null | undefined, langs: any): string[] {
  const allowed = domainOf(domainKey).languages;
  const byLower = new Map(allowed.map(l => [l.toLowerCase(), l]));
  return [...new Set(
    (Array.isArray(langs) ? langs : [])
      .map((l: any) => byLower.get(String(l).trim().toLowerCase()))
      .filter(Boolean) as string[],
  )].slice(0, 6);
}

/** Snapped to an offered value; anything else is not a commitment we can plan against. */
export function normalizeMinutes(v: any): number | null {
  const n = Number(v);
  if (!Number.isFinite(n) || n <= 0) return null;
  return AVAILABILITY_OPTIONS.reduce((best, o) =>
    Math.abs(o.minutes - n) < Math.abs(best - n) ? o.minutes : best, AVAILABILITY_OPTIONS[0].minutes);
}

export function normalizeDaysPerWeek(v: any): number | null {
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  return Math.min(7, Math.max(1, Math.round(n)));
}
