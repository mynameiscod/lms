import { passwordProblem } from '../utils/passwordPolicy';

describe('member password policy', () => {
  it('accepts 8+ characters with a capital, a number and a special character', () => {
    expect(passwordProblem('Career@2026')).toBe('');
  });

  it('names every rule a weak password misses', () => {
    expect(passwordProblem('abc')).toBe('Password needs at least 8 characters, one capital letter, one number and one special character.');
  });

  it('names a single missing rule on its own', () => {
    expect(passwordProblem('Career2026')).toBe('Password needs one special character.');
    expect(passwordProblem('career@2026')).toBe('Password needs one capital letter.');
  });
});
