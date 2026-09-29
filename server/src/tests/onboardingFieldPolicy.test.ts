import { normaliseOnboardingFields, registrationWindowState, validateSignupAnswers, slugKey } from '../data/onboardingFieldPolicy';

const LOCKED = [
  { key: 'name', label: 'Full Name', type: 'text', required: true, locked: true, order: 1 },
  { key: 'mobile', label: 'Mobile', type: 'phone', required: true, locked: true, order: 2 },
  { key: 'email', label: 'Email', type: 'email', required: true, locked: true, order: 3 },
] as any[];
const STORED = [...LOCKED, { key: 'branch', label: 'Branch', type: 'select', required: false, order: 4, options: ['CSE', 'ECE'] }] as any[];

describe('normaliseOnboardingFields', () => {
  it('restores locked fields a save left out, first and required', () => {
    const r = normaliseOnboardingFields([{ key: 'branch', label: 'Branch', type: 'select', options: ['CSE'] }], STORED);
    expect(r.errors).toEqual([]);
    expect(r.fields!.map(f => f.key)).toEqual(['name', 'mobile', 'email', 'branch']);
    expect(r.fields!.slice(0, 3).every(f => f.required && f.locked && f.enabled)).toBe(true);
  });

  it('will not un-require, rename or switch off a locked field', () => {
    const r = normaliseOnboardingFields([{ key: 'email', label: 'Hacked', type: 'text', required: false, enabled: false }], STORED);
    const email = r.fields!.find(f => f.key === 'email')!;
    expect(email).toMatchObject({ label: 'Email', type: 'email', required: true, enabled: true });
  });

  it('gives a new custom field a slug key that never collides with a stored one', () => {
    const r = normaliseOnboardingFields([...STORED, { label: 'Branch', type: 'text' }], STORED);
    const added = r.fields!.find(f => f.custom)!;
    expect(added.key).toBe('branch_2');
    expect(slugKey('Why do you want to join?')).toBe('why_do_you_want_to_join');
  });

  it('refuses unknown types, empty names and a dropdown with no choices', () => {
    expect(normaliseOnboardingFields([{ label: 'X', type: 'colour' }], STORED).errors[0]).toMatch(/unknown type/);
    expect(normaliseOnboardingFields([{ label: '  ', type: 'text' }], STORED).errors[0]).toMatch(/needs a name/);
    expect(normaliseOnboardingFields([{ label: 'Pick', type: 'select', options: [] }], STORED).errors[0]).toMatch(/no choices/);
  });

  it('accepts the new textarea and date types with a placeholder', () => {
    const r = normaliseOnboardingFields([{ label: 'Best work', type: 'textarea', placeholder: 'Tell us' }, { label: 'Start', type: 'date' }], STORED);
    expect(r.errors).toEqual([]);
    expect(r.fields!.find(f => f.key === 'best_work')).toMatchObject({ type: 'textarea', placeholder: 'Tell us', custom: true });
  });
});

describe('registrationWindowState', () => {
  const at = (s: string) => new Date(s);
  it('is open with no dates', () => expect(registrationWindowState(null, null).open).toBe(true));
  it('is not yet open before the start', () =>
    expect(registrationWindowState('2026-10-01', null, at('2026-09-30T12:00:00Z')).reason).toBe('NOT_YET_OPEN'));
  it('stays open for the whole closing day, then closes', () => {
    expect(registrationWindowState(null, '2026-09-30', at('2026-09-30T20:00:00Z')).open).toBe(true);
    expect(registrationWindowState(null, '2026-09-30', at('2026-10-01T01:00:00Z')).reason).toBe('CLOSED');
  });
});

describe('validateSignupAnswers', () => {
  const fields = [
    ...LOCKED,
    { key: 'branch', label: 'Branch', type: 'select', required: true, options: ['CSE', 'ECE'] },
    { key: 'start', label: 'Start date', type: 'date', required: false },
    { key: 'hidden', label: 'Hidden', type: 'text', required: true, enabled: false },
  ] as any[];

  it('enforces required, dropdown choices and dates; ignores switched-off fields', () => {
    const r = validateSignupAnswers(fields, { branch: 'MECH', start: '30/09/2026' });
    expect(r.errors).toEqual(['Choose Branch from the list.', 'Start date must be a date.']);
  });

  it('returns trimmed clean values', () => {
    const r = validateSignupAnswers(fields, { branch: ' CSE ', start: '2026-09-30' });
    expect(r).toEqual({ values: { branch: 'CSE', start: '2026-09-30' }, errors: [] });
  });
});
