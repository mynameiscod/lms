/**
 * The setup page's language rules: "Not sure" stands alone, one main language at a time, and
 * JavaScript/TypeScript can go alongside the main language.
 */
import { toggleLanguage, languageBlocked } from './languageChoice';

describe('language choice', () => {
  it('"Not sure" clears everything else, and nothing else can be picked while it is chosen', () => {
    expect(toggleLanguage(['Java', 'JavaScript'], 'Not Sure')).toEqual(['Not Sure']);
    expect(languageBlocked(['Not Sure'], 'Java')).toMatch(/Untick/);
    expect(languageBlocked(['Not Sure'], 'JavaScript')).toMatch(/Untick/);
    expect(languageBlocked(['Not Sure'], 'Not Sure')).toBe('');
  });

  it('choosing a language takes "Not sure" off', () => {
    expect(toggleLanguage(['Not Sure'], 'Python')).toEqual(['Python']);
  });

  it('allows one main language: Java blocks Python and C#, and the other way round', () => {
    expect(languageBlocked(['Java'], 'Python')).toMatch(/You chose Java/);
    expect(languageBlocked(['Java'], 'C#')).toMatch(/You chose Java/);
    expect(languageBlocked(['Python'], 'Java')).toMatch(/You chose Python/);
    // Even if called directly, the main language is swapped, never doubled.
    expect(toggleLanguage(['Java'], 'Python')).toEqual(['Python']);
  });

  it('lets JavaScript and TypeScript sit beside the main language', () => {
    expect(languageBlocked(['Java'], 'JavaScript')).toBe('');
    expect(toggleLanguage(['Java'], 'JavaScript')).toEqual(['Java', 'JavaScript']);
    expect(toggleLanguage(['Java', 'JavaScript'], 'TypeScript')).toEqual(['Java', 'JavaScript', 'TypeScript']);
  });

  it('unticking frees the others again', () => {
    expect(toggleLanguage(['Java', 'JavaScript'], 'Java')).toEqual(['JavaScript']);
    expect(languageBlocked(['JavaScript'], 'Python')).toBe('');
  });
});
