import { passoutYearOf } from '../services/whatsAppTemplateService';

describe('passoutYearOf — the year Meta lead forms store under free-form keys', () => {
  it('reads the emoji-prefixed Meta form key', () => {
    expect(passoutYearOf({ '🎓_passout_year': '2026', full_name: 'Raja' })).toBe('2026');
  });

  it('finds the year inside a longer answer', () => {
    expect(passoutYearOf({ year_of_passing: 'Passed out in 2025 (B.Tech)' })).toBe('2025');
    expect(passoutYearOf({ graduation: '2024_or_earlier' })).toBe('2024');
  });

  it('returns empty when the form had no year', () => {
    expect(passoutYearOf({ full_name: 'Raja', phone_number: '+918978932241' })).toBe('');
    expect(passoutYearOf(undefined)).toBe('');
    expect(passoutYearOf({ passout_year: 'final_year_student' })).toBe('');
  });

  it('does not mistake a phone number for a year', () => {
    expect(passoutYearOf({ phone_number: '+912026123456' })).toBe('');
  });
});
