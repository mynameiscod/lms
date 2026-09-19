/**
 * The rules a CareerPilot member's password must meet. The client shows the same four rules as a live checklist,
 * so the wording here is what the member sees if anything slips past it.
 */
export const PASSWORD_RULES: Array<{ key: string; label: string; test: (p: string) => boolean }> = [
  { key: 'length', label: 'at least 8 characters', test: p => p.length >= 8 },
  { key: 'upper', label: 'one capital letter', test: p => /[A-Z]/.test(p) },
  { key: 'number', label: 'one number', test: p => /\d/.test(p) },
  { key: 'special', label: 'one special character', test: p => /[^A-Za-z0-9\s]/.test(p) },
];

/** The message to show when the password misses a rule, or '' when it meets them all. */
export function passwordProblem(password: string): string {
  const missing = PASSWORD_RULES.filter(r => !r.test(password)).map(r => r.label);
  if (!missing.length) return '';
  return `Password needs ${missing.length > 1 ? `${missing.slice(0, -1).join(', ')} and ${missing[missing.length - 1]}` : missing[0]}.`;
}
