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

describe('a prerequisite that was already there', () => {
  /**
   * The rule is about a CHOICE, not a standing relationship.
   *
   * Without the distinction the record locks itself: the update path always sends the
   * whole prerequisite array, so once any prerequisite is deactivated, every later edit to
   * that skill is refused over a relationship the admin never touched.
   */
  it('lets an unrelated edit succeed after a prerequisite is deactivated', () => {
    // JAVA_OOP has always required JAVA_METHODS. Someone retires JAVA_METHODS. The admin
    // now just wants to rename JAVA_OOP.
    const all = [
      S('JAVA_OOP', { prerequisiteKeys: ['JAVA_METHODS'] }),
      S('JAVA_METHODS', { active: false, name: 'Java Methods' }),
    ];
    const r = validateSkillGraph({
      key: 'JAVA_OOP', domainKey: 'SOFTWARE_ENGINEERING',
      prerequisiteKeys: ['JAVA_METHODS'],
      existingPrerequisiteKeys: ['JAVA_METHODS'],
      all,
    });
    expect(r.ok).toBe(true);
  });

  it('may be kept while a different, active prerequisite is added', () => {
    const all = [
      S('JAVA_OOP', { prerequisiteKeys: ['JAVA_METHODS'] }),
      S('JAVA_METHODS', { active: false, name: 'Java Methods' }),
      S('OOP_CONCEPTS', { active: true, name: 'OOP Concepts' }),
    ];
    const r = validateSkillGraph({
      key: 'JAVA_OOP', domainKey: 'SOFTWARE_ENGINEERING',
      prerequisiteKeys: ['JAVA_METHODS', 'OOP_CONCEPTS'],
      existingPrerequisiteKeys: ['JAVA_METHODS'],
      all,
    });
    expect(r.ok).toBe(true);
  });

  it('still refuses a NEWLY added inactive prerequisite', () => {
    // The retained one is fine; the new one is almost certainly a mistake.
    const all = [
      S('JAVA_OOP', { prerequisiteKeys: ['JAVA_METHODS'] }),
      S('JAVA_METHODS', { active: false, name: 'Java Methods' }),
      S('RETIRED', { active: false, name: 'Retired Skill' }),
    ];
    const r = validateSkillGraph({
      key: 'JAVA_OOP', domainKey: 'SOFTWARE_ENGINEERING',
      prerequisiteKeys: ['JAVA_METHODS', 'RETIRED'],
      existingPrerequisiteKeys: ['JAVA_METHODS'],
      all,
    });
    expect(r.ok).toBe(false);
    expect(r.message).toMatch(/Retired Skill is deactivated/i);
  });

  it('treats every key as new when nothing was there before — a create', () => {
    const all = [S('A'), S('RETIRED', { active: false, name: 'Retired Skill' })];
    const r = validateSkillGraph({
      key: 'A', domainKey: 'SOFTWARE_ENGINEERING', prerequisiteKeys: ['RETIRED'], all,
    });
    expect(r.ok).toBe(false);
  });

  it('does not let a retained key smuggle past the OTHER checks', () => {
    // Only the active rule is relaxed. A cycle is still a cycle, however long it has
    // been there, and a missing or cross-domain key is still refused.
    const cyclic = [S('A', { prerequisiteKeys: ['B'] }), S('B', { prerequisiteKeys: ['A'] })];
    expect(validateSkillGraph({
      key: 'B', domainKey: 'SOFTWARE_ENGINEERING',
      prerequisiteKeys: ['A'], existingPrerequisiteKeys: ['A'], all: cyclic,
    }).ok).toBe(false);

    expect(validateSkillGraph({
      key: 'A', domainKey: 'SOFTWARE_ENGINEERING',
      prerequisiteKeys: ['GONE'], existingPrerequisiteKeys: ['GONE'], all: [S('A')],
    }).ok).toBe(false);

    const foreign = [S('A'), S('FOREIGN', { domainKey: 'FINANCE', active: true })];
    expect(validateSkillGraph({
      key: 'A', domainKey: 'SOFTWARE_ENGINEERING',
      prerequisiteKeys: ['FOREIGN'], existingPrerequisiteKeys: ['FOREIGN'], all: foreign,
    }).ok).toBe(false);
  });

  it('allows removing a deactivated prerequisite outright', () => {
    const all = [
      S('JAVA_OOP', { prerequisiteKeys: ['JAVA_METHODS'] }),
      S('JAVA_METHODS', { active: false }),
    ];
    const r = validateSkillGraph({
      key: 'JAVA_OOP', domainKey: 'SOFTWARE_ENGINEERING',
      prerequisiteKeys: [], existingPrerequisiteKeys: ['JAVA_METHODS'], all,
    });
    expect(r.ok).toBe(true);
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
    /**
     * The ceiling moved from 80 to 120 when the first-year Foundation layer landed: the
     * taxonomy had been written for students who already had a target role, and measuring a
     * first-year needed nodes for the things they are actually taught — loops, conditionals,
     * aptitude, spoken English.
     *
     * The guard is not removed, because the reason for it has not changed. Every node here
     * must still be something you can say "this student is 62% there" about; a taxonomy that
     * grows without that test becomes a textbook index nobody can navigate.
     */
    expect(CAREER_SKILL_TAXONOMY.length).toBeGreaterThanOrEqual(40);
    expect(CAREER_SKILL_TAXONOMY.length).toBeLessThanOrEqual(120);
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

  it('covers the nine intended areas', () => {
    // APTITUDE and LEARNING_SKILLS joined with the first-year layer: a campus drive opens
    // with an aptitude round, and whether a student shows up decides whether any of the
    // rest happens. Listed exactly rather than counted, so a stray new root fails here.
    const roots = CAREER_SKILL_TAXONOMY.filter(s => !s.parentKey).map(s => s.key).sort();
    expect(roots).toEqual([
      'APTITUDE', 'CS_FUNDAMENTALS', 'DATABASES', 'DSA', 'LEARNING_SKILLS',
      'PROFESSIONAL_SKILLS', 'PROGRAMMING', 'SE_PRACTICES', 'WEB_FUNDAMENTALS',
    ]);
  });

  it('does not duplicate a scoring dimension with a bare, ambiguous key', () => {
    /**
     * NARROWED DELIBERATELY, and worth reading before widening it again.
     *
     * This forbade APTITUDE outright because `aptitude` and `logical_reasoning` are scoring
     * dimensions of PASSPORT_CATEGORIES, and two owners for one concept is real ambiguity.
     * That held while the legacy questionnaire was the only instrument: it scored six
     * categories, and a skill node of the same name would have been a second, disagreeing
     * answer to the same question.
     *
     * The personalised assessment measures SKILLS, not categories, and a campus drive opens
     * with an aptitude round that a first-year has to be measured on somehow. So the group
     * exists — but every node under it is namespaced (APTITUDE_QUANT_ARITHMETIC, not
     * QUANTITATIVE_APTITUDE), which is what keeps the two vocabularies distinguishable.
     *
     * The bare names stay banned: those are the ones that would read as the category.
     */
    const keys = CAREER_SKILL_TAXONOMY.map(s => s.key);
    expect(keys).not.toContain('LOGICAL_REASONING');
    expect(keys).not.toContain('QUANTITATIVE_APTITUDE');
    expect(keys).not.toContain('VERBAL_ABILITY');
    expect(keys).not.toContain('CAREER_CLARITY');
    expect(keys).not.toContain('EMPLOYABILITY');

    // Everything under the aptitude group carries the namespace, so no node can be mistaken
    // for the category that shares its subject.
    const aptitude = CAREER_SKILL_TAXONOMY.filter(s => s.parentKey === 'APTITUDE');
    expect(aptitude.length).toBeGreaterThan(0);
    for (const s of aptitude) expect(s.key.startsWith('APTITUDE_')).toBe(true);
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
