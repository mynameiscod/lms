/**
 * The setup page's language rules (server mirror: careerDomainService.normalizeLanguages).
 *
 *   - "Not Sure" stands alone: choosing it clears everything else, and while it is chosen
 *     nothing else can be picked.
 *   - One MAIN language at a time — the roadmap and career track are built around a single
 *     language (Java, Python, C#, C or C++). Choosing one disables the others until it is
 *     unticked.
 *   - JavaScript and TypeScript go alongside the main language (the web half of full stack).
 */
const norm = (l: string) => String(l || '').trim().toLowerCase();

export const isNotSure = (l: string) => norm(l) === 'not sure' || norm(l) === 'not_sure';
export const MAIN_LANGUAGES = ['java', 'python', 'c#', 'c', 'c++'];
export const isMainLanguage = (l: string) => MAIN_LANGUAGES.includes(norm(l));

export function toggleLanguage(selected: string[], l: string): string[] {
  const has = selected.some(x => norm(x) === norm(l));
  if (has) return selected.filter(x => norm(x) !== norm(l));
  if (isNotSure(l)) return [l];
  let next = selected.filter(x => !isNotSure(x));
  if (isMainLanguage(l)) next = next.filter(x => !isMainLanguage(x));
  return [...next, l];
}

/** Why an option cannot be picked right now, or '' when it can. */
export function languageBlocked(selected: string[], l: string): string {
  if (selected.some(x => norm(x) === norm(l))) return '';
  if (selected.some(isNotSure) && !isNotSure(l)) return 'Untick “Not sure” to choose a language.';
  const main = selected.find(isMainLanguage);
  if (main && isMainLanguage(l)) return `You chose ${main}. Untick it to choose ${l} instead.`;
  return '';
}
