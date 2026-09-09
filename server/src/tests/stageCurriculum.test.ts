import { nameFromModuleCode } from '../services/stageCurriculumService';

/**
 * The stage curriculum view — the parts that are pure.
 *
 * The tree assembly and question counting need a database and are covered by the integration
 * test; what belongs here is the display fallback, because it is the one piece of this feature
 * that every existing curriculum depends on. No curriculum recorded module names before the
 * metadata existed, so until each is edited by hand every module on the screen is named by this
 * function. A bad guess is not cosmetic: an admin looking for "Web Fundamentals" and finding
 * "M05_WEB_FUNDAMENTALS" cannot tell whether the module is misconfigured or merely unnamed.
 */

describe('naming a module from its code', () => {
  it('turns a seeded code into something readable', () => {
    expect(nameFromModuleCode('M05_WEB_FUNDAMENTALS')).toBe('Web Fundamentals');
    expect(nameFromModuleCode('M02_COMPUTATIONAL_THINKING')).toBe('Computational Thinking');
  });

  it('keeps acronyms as acronyms', () => {
    // "Dsa Foundation" and "Sql Basics" read as mistakes rather than as titles.
    expect(nameFromModuleCode('M07_DSA')).toBe('DSA');
    expect(nameFromModuleCode('M11_AI_LITERACY')).toBe('AI Literacy');
    expect(nameFromModuleCode('M01_CS_FUNDAMENTALS')).toBe('CS Fundamentals');
  });

  it('survives a code with no index, and one that is only an index', () => {
    expect(nameFromModuleCode('TESTING')).toBe('Testing');
    // Nothing left after stripping the index: showing the raw code beats showing nothing.
    expect(nameFromModuleCode('M12')).toBe('M12');
  });

  it('never returns an empty label', () => {
    // A blank heading would make a module look like a rendering fault.
    for (const code of ['', '   ', '_', 'M__']) {
      expect(nameFromModuleCode(code).trim().length === 0).toBe(false);
    }
  });
});
