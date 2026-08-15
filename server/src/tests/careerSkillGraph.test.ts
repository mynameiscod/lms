import {
  parentWouldCycle, prerequisiteWouldCycle, validateSkillGraph, edgeMaps,
  cleanPrerequisites, isValidSkillKey, suggestSkillKey,
} from '../services/careerSkillService';
import { auditTaxonomy } from '../services/careerSkillSeedService';
import { CAREER_SKILL_TAXONOMY } from '../data/careerSkillTaxonomy';
import { SKILL_KEY_PATTERN } from '../models/CareerSkill';

/**
 * Module 3 — the skill graph's integrity rules.
 *
 * Pure functions over an in-memory graph, so these run without a database and cover the
 * part that actually matters: a taxonomy that has developed a loop is not a cosmetic
 * problem — anything that later walks it to plan learning would never terminate.
 */

const S = (key: string, over: any = {}) => ({
  key, name: key, domainKey: 'SOFTWARE_ENGINEERING',
  parentKey: null, prerequisiteKeys: [], active: true, nodeType: 'SKILL',
  ...over,
} as any);

describe('parent cycles', () => {
  it('rejects a skill being its own parent', () => {
    const all = [S('JAVA')];
    const r = validateSkillGraph({ key: 'JAVA', domainKey: 'SOFTWARE_ENGINEERING', parentKey: 'JAVA', all });
    expect(r.ok).toBe(false);
    expect(r.message).toMatch(/its own parent/i);
  });

  it('rejects a two-node loop', () => {
    // JAVA_OOP already sits under JAVA; putting JAVA under JAVA_OOP closes the loop.
    const all = [S('JAVA'), S('JAVA_OOP', { parentKey: 'JAVA' })];
    const r = validateSkillGraph({ key: 'JAVA', domainKey: 'SOFTWARE_ENGINEERING', parentKey: 'JAVA_OOP', all });
    expect(r.ok).toBe(false);
    expect(r.message).toMatch(/loop/i);
  });

  it('rejects a deep loop, A → B → C → A', () => {
    const all = [S('A'), S('B', { parentKey: 'A' }), S('C', { parentKey: 'B' })];
    const r = validateSkillGraph({ key: 'A', domainKey: 'SOFTWARE_ENGINEERING', parentKey: 'C', all });
    expect(r.ok).toBe(false);
  });

  it('accepts a legitimate move that does not close a loop', () => {
    const all = [S('PROGRAMMING'), S('JAVA', { parentKey: 'PROGRAMMING' }), S('JAVA_OOP', { parentKey: 'JAVA' })];
    const r = validateSkillGraph({ key: 'JAVA_OOP', domainKey: 'SOFTWARE_ENGINEERING', parentKey: 'PROGRAMMING', all });
    expect(r.ok).toBe(true);
  });

  it('rejects a parent that does not exist', () => {
    const r = validateSkillGraph({ key: 'X', domainKey: 'SOFTWARE_ENGINEERING', parentKey: 'NOPE', all: [S('X')] });
    expect(r.ok).toBe(false);
    expect(r.message).toMatch(/no skill with the key NOPE/i);
  });

  it('rejects a parent from another domain', () => {
    const all = [S('X'), S('OTHER', { domainKey: 'HEALTHCARE' })];
    const r = validateSkillGraph({ key: 'X', domainKey: 'SOFTWARE_ENGINEERING', parentKey: 'OTHER', all });
    expect(r.ok).toBe(false);
    expect(r.message).toMatch(/different career domain/i);
  });

  it('terminates on a graph that is ALREADY looped rather than hanging', () => {
    // Defensive: a pre-existing loop from any source must not spin the walk forever.
    const edges = new Map<string, string | null>([['A', 'B'], ['B', 'A']]);
    expect(parentWouldCycle('Z', 'A', edges)).toBe(false);
  });
});

describe('prerequisite cycles', () => {
  it('rejects a skill requiring itself', () => {
    const all = [S('A')];
    const r = validateSkillGraph({ key: 'A', domainKey: 'SOFTWARE_ENGINEERING', prerequisiteKeys: ['A'], all });
    expect(r.ok).toBe(false);
    expect(r.message).toMatch(/its own prerequisite/i);
  });

  it('rejects a two-step loop', () => {
    const all = [S('A', { prerequisiteKeys: ['B'] }), S('B')];
    const r = validateSkillGraph({ key: 'B', domainKey: 'SOFTWARE_ENGINEERING', prerequisiteKeys: ['A'], all });
    expect(r.ok).toBe(false);
    expect(r.message).toMatch(/loop/i);
  });

  it('rejects a deep loop — A needs B, B needs C, then C needs A', () => {
    const all = [S('A', { prerequisiteKeys: ['B'] }), S('B', { prerequisiteKeys: ['C'] }), S('C')];
    const r = validateSkillGraph({ key: 'C', domainKey: 'SOFTWARE_ENGINEERING', prerequisiteKeys: ['A'], all });
    expect(r.ok).toBe(false);
  });

  it('accepts a diamond — two paths to one root is not a cycle', () => {
    // D needs B and C; both need A. Valid, and a naive visited-check might reject it.
    const all = [S('A'), S('B', { prerequisiteKeys: ['A'] }), S('C', { prerequisiteKeys: ['A'] }), S('D')];
    const r = validateSkillGraph({ key: 'D', domainKey: 'SOFTWARE_ENGINEERING', prerequisiteKeys: ['B', 'C'], all });
    expect(r.ok).toBe(true);
  });

  it('accepts several prerequisites across different branches', () => {
    const all = [S('JAVA_METHODS'), S('OOP_CONCEPTS', { parentKey: 'CS' }), S('CS'), S('JAVA_OOP')];
    const r = validateSkillGraph({
      key: 'JAVA_OOP', domainKey: 'SOFTWARE_ENGINEERING',
      prerequisiteKeys: ['JAVA_METHODS', 'OOP_CONCEPTS'], all,
    });
    expect(r.ok).toBe(true);
  });

  it('rejects a prerequisite that does not exist', () => {
    const r = validateSkillGraph({ key: 'A', domainKey: 'SOFTWARE_ENGINEERING', prerequisiteKeys: ['GHOST'], all: [S('A')] });
    expect(r.ok).toBe(false);
    expect(r.message).toMatch(/no skill with the key GHOST/i);
  });

  it('rejects a prerequisite from another domain', () => {
    const all = [S('A'), S('FOREIGN', { domainKey: 'FINANCE' })];
    const r = validateSkillGraph({ key: 'A', domainKey: 'SOFTWARE_ENGINEERING', prerequisiteKeys: ['FOREIGN'], all });
    expect(r.ok).toBe(false);
    expect(r.message).toMatch(/different career domain/i);
  });

  it('rejects a DEACTIVATED skill as a new prerequisite', () => {
    const all = [S('A'), S('RETIRED', { active: false, name: 'Retired Skill' })];
    const r = validateSkillGraph({ key: 'A', domainKey: 'SOFTWARE_ENGINEERING', prerequisiteKeys: ['RETIRED'], all });
    expect(r.ok).toBe(false);
    expect(r.message).toMatch(/deactivated/i);
  });

  it('terminates on an already-looped dependency graph', () => {
    const edges = new Map<string, string[]>([['A', ['B']], ['B', ['A']]]);
    expect(prerequisiteWouldCycle('Z', ['A'], edges)).toBe(false);
  });
});

describe('prerequisite hygiene', () => {
  it('de-duplicates and uppercases', () => {
    expect(cleanPrerequisites(['java_oop', 'JAVA_OOP', 'DSA_ARRAYS'], 'X'))
      .toEqual(['JAVA_OOP', 'DSA_ARRAYS']);
  });
  it('silently drops a self-reference rather than erroring on a duplicate', () => {
    expect(cleanPrerequisites(['A', 'B'], 'A')).toEqual(['B']);
  });
  it('survives rubbish input', () => {
    expect(cleanPrerequisites(null, 'A')).toEqual([]);
    expect(cleanPrerequisites('not-an-array', 'A')).toEqual([]);
    expect(cleanPrerequisites([''], 'A')).toEqual([]);
  });
});

describe('skill keys', () => {
  it.each(['JAVA', 'JAVA_OOP', 'DSA_LINKED_LIST', 'SQL_JOINS', 'HTML'])('accepts %s', (k) => {
    expect(isValidSkillKey(k)).toBe(true);
  });
  it.each(['Java OOP', 'java-oop', '_LEADING', 'TRAILING_', 'A__B', 'Java!'])('rejects %s', (k) => {
    expect(SKILL_KEY_PATTERN.test(k)).toBe(false);
  });
  it('suggests a key from a name', () => {
    expect(suggestSkillKey('Java Generics')).toBe('JAVA_GENERICS');
    expect(suggestSkillKey('SQL Filtering & Aggregation')).toBe('SQL_FILTERING_AGGREGATION');
  });
});

describe('the shipped taxonomy is internally consistent', () => {
  it('has no dangling parents, no dangling prerequisites and no cycles', () => {
    // This is the check that stops a typo in the seed data shipping as a broken tree.
    expect(auditTaxonomy()).toEqual([]);
  });

  it('is the intended size — meaningful nodes, not a textbook index', () => {
    expect(CAREER_SKILL_TAXONOMY.length).toBeGreaterThanOrEqual(40);
    expect(CAREER_SKILL_TAXONOMY.length).toBeLessThanOrEqual(80);
  });

  it('has unique keys', () => {
    const keys = CAREER_SKILL_TAXONOMY.map(s => s.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('uses valid keys throughout', () => {
    for (const s of CAREER_SKILL_TAXONOMY) expect(SKILL_KEY_PATTERN.test(s.key)).toBe(true);
  });

  it('marks groups as neither assessable nor learnable', () => {
    // "Programming" is a shelf. Measuring it as one number would say nothing useful.
    for (const s of CAREER_SKILL_TAXONOMY.filter(x => x.nodeType === 'GROUP')) {
      expect(s.assessable).toBe(false);
      expect(s.learnable).toBe(false);
    }
  });

  it('covers the seven intended areas', () => {
    const roots = CAREER_SKILL_TAXONOMY.filter(s => !s.parentKey).map(s => s.key).sort();
    expect(roots).toEqual([
      'CS_FUNDAMENTALS', 'DATABASES', 'DSA', 'PROFESSIONAL_SKILLS',
      'PROGRAMMING', 'SE_PRACTICES', 'WEB_FUNDAMENTALS',
    ]);
  });

  it('does NOT duplicate the assessment scoring dimensions', () => {
    // aptitude and logical_reasoning are owned by PassportAssessment. Two owners for one
    // concept is the ambiguity the audit exists to prevent.
    const keys = CAREER_SKILL_TAXONOMY.map(s => s.key);
    expect(keys).not.toContain('APTITUDE');
    expect(keys).not.toContain('LOGICAL_REASONING');
    expect(keys).not.toContain('QUANTITATIVE_APTITUDE');
    expect(keys).not.toContain('VERBAL_ABILITY');
  });

  it('separates language-agnostic OOP from OOP in a language', () => {
    const keys = CAREER_SKILL_TAXONOMY.map(s => s.key);
    expect(keys).toContain('OOP_CONCEPTS');
    expect(keys).toContain('JAVA_OOP');
    // And the language version depends on the concept, which is the whole point of
    // keeping prerequisites separate from the tree.
    const javaOop = CAREER_SKILL_TAXONOMY.find(s => s.key === 'JAVA_OOP')!;
    expect(javaOop.prerequisiteKeys).toContain('OOP_CONCEPTS');
    expect(javaOop.parentKey).toBe('JAVA');
  });

  it('does not put every student on a Java-only path', () => {
    const keys = CAREER_SKILL_TAXONOMY.map(s => s.key);
    expect(keys).toContain('PYTHON_BASICS');
    expect(keys).toContain('JS_BASICS');
  });

  it('catches a deliberately broken taxonomy', () => {
    // Proving the audit actually detects faults, rather than always returning [].
    expect(auditTaxonomy([{ key: 'A', name: 'A', parentKey: 'MISSING' }] as any))
      .toContain('A has unknown parent MISSING');
    expect(auditTaxonomy([{ key: 'A', name: 'A', prerequisiteKeys: ['A'] }] as any))
      .toContain('A is its own prerequisite');
    expect(auditTaxonomy([
      { key: 'A', name: 'A', parentKey: 'B' }, { key: 'B', name: 'B', parentKey: 'A' },
    ] as any).some(p => /parent cycle/.test(p))).toBe(true);
    expect(auditTaxonomy([
      { key: 'A', name: 'A', prerequisiteKeys: ['B'] }, { key: 'B', name: 'B', prerequisiteKeys: ['A'] },
    ] as any).some(p => /prerequisite cycle/.test(p))).toBe(true);
  });
});

describe('edge maps', () => {
  it('reads both graphs from one pass', () => {
    const { parents, prereqs } = edgeMaps([
      S('A'), S('B', { parentKey: 'A', prerequisiteKeys: ['A'] }),
    ]);
    expect(parents.get('B')).toBe('A');
    expect(parents.get('A')).toBeNull();
    expect(prereqs.get('B')).toEqual(['A']);
  });
});
