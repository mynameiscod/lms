import { validateEvidenceMapping, cleanEvidence } from '../services/skillEvidenceService';
import { EVIDENCE_SOURCE_TYPES, EVIDENCE_CONTRIBUTIONS } from '../models/SkillEvidence';
import { SOURCE_ADAPTERS, adapterFor, refKey } from '../services/skillEvidenceSourceRegistry';

/**
 * Module 5 — what an assessment item is allowed to claim it measures.
 *
 * Pure validation over an in-memory skill list, so these run without a database and cover
 * the decisions. A wrong mapping here would eventually mis-measure a student, and nothing
 * downstream could detect it — the item would simply be evidence about the wrong thing.
 */

const SKILL = (key: string, over: any = {}) => ({
  key, name: key, domainKey: 'SOFTWARE_ENGINEERING',
  nodeType: 'SKILL', active: true, assessable: true, ...over,
} as any);

const EV = (skillKey: string, contribution = 'PRIMARY', over: any = {}) =>
  ({ skillKey, contribution, active: true, ...over });

const T = 'assessment_item';

describe('mapping an item to a skill', () => {
  it('accepts one primary skill', () => {
    expect(validateEvidenceMapping({
      sourceType: T, evidence: [EV('JAVA_OOP')], skills: [SKILL('JAVA_OOP')],
    }).ok).toBe(true);
  });

  it('accepts one primary and several secondary', () => {
    const r = validateEvidenceMapping({
      sourceType: T,
      evidence: [EV('DSA_ARRAYS'), EV('JAVA_COLLECTIONS', 'SECONDARY'), EV('PROBLEM_SOLVING', 'SECONDARY')],
      skills: ['DSA_ARRAYS', 'JAVA_COLLECTIONS', 'PROBLEM_SOLVING'].map(k => SKILL(k)),
    });
    expect(r.ok).toBe(true);
  });

  it('rejects two primary skills', () => {
    // "What does this chiefly measure?" is the first question a generator asks.
    const r = validateEvidenceMapping({
      sourceType: T,
      evidence: [EV('JAVA_OOP'), EV('DSA_ARRAYS')],
      skills: [SKILL('JAVA_OOP'), SKILL('DSA_ARRAYS')],
    });
    expect(r.ok).toBe(false);
    expect(r.message).toMatch(/only one primary/i);
  });

  it('rejects the same skill mapped twice, even with different contributions', () => {
    const r = validateEvidenceMapping({
      sourceType: T,
      evidence: [EV('JAVA_OOP', 'PRIMARY'), EV('JAVA_OOP', 'SECONDARY')],
      skills: [SKILL('JAVA_OOP')],
    });
    expect(r.ok).toBe(false);
    expect(r.message).toMatch(/mapped twice/i);
  });

  it('accepts an item with no primary at all — only supporting evidence', () => {
    expect(validateEvidenceMapping({
      sourceType: T, evidence: [EV('COMMUNICATION', 'SECONDARY')], skills: [SKILL('COMMUNICATION')],
    }).ok).toBe(true);
  });

  it('accepts clearing every mapping', () => {
    expect(validateEvidenceMapping({ sourceType: T, evidence: [], skills: [] }).ok).toBe(true);
  });

  it('rejects a skill that does not exist', () => {
    const r = validateEvidenceMapping({ sourceType: T, evidence: [EV('GHOST')], skills: [] });
    expect(r.ok).toBe(false);
    expect(r.message).toMatch(/GHOST does not exist/i);
  });

  it('rejects an unsupported content type', () => {
    const r = validateEvidenceMapping({ sourceType: 'blog_post', evidence: [], skills: [] });
    expect(r.ok).toBe(false);
    expect(r.message).toMatch(/not a supported content type/i);
  });

  it('rejects an unknown contribution', () => {
    const r = validateEvidenceMapping({
      sourceType: T, evidence: [EV('JAVA_OOP', 'CRITICAL')], skills: [SKILL('JAVA_OOP')],
    });
    expect(r.ok).toBe(false);
    expect(r.message).toMatch(/PRIMARY or SECONDARY/i);
  });
});

describe('only measurable skills may be mapped', () => {
  it('rejects a GROUP node', () => {
    const r = validateEvidenceMapping({
      sourceType: T, evidence: [EV('PROGRAMMING')],
      skills: [SKILL('PROGRAMMING', { nodeType: 'GROUP', assessable: false, name: 'Programming' })],
    });
    expect(r.ok).toBe(false);
    expect(r.message).toMatch(/not a measurable skill/i);
  });

  it('rejects a skill Module 3 marks as not assessable', () => {
    const r = validateEvidenceMapping({
      sourceType: T, evidence: [EV('SOMETHING')],
      skills: [SKILL('SOMETHING', { assessable: false, name: 'Something' })],
    });
    expect(r.ok).toBe(false);
    expect(r.message).toMatch(/not a measurable skill/i);
  });

  it('rejects a skill from another career domain', () => {
    const r = validateEvidenceMapping({
      sourceType: T, evidence: [EV('FOREIGN')],
      skills: [SKILL('FOREIGN', { domainKey: 'HEALTHCARE', name: 'Foreign' })],
    });
    expect(r.ok).toBe(false);
    expect(r.message).toMatch(/different career domain/i);
  });
});

describe('a skill deactivated after it was mapped', () => {
  /**
   * The correction carried through from Module 3 and Module 4. The active rule is about a
   * CHOICE; re-checking a standing mapping would make the item uneditable the moment any
   * skill it references was retired.
   */
  it('may be kept, so the item stays editable', () => {
    expect(validateEvidenceMapping({
      sourceType: T, evidence: [EV('JAVA_CONCURRENCY')],
      skills: [SKILL('JAVA_CONCURRENCY', { active: false, name: 'Java Concurrency' })],
      existingSkillKeys: ['JAVA_CONCURRENCY'],
    }).ok).toBe(true);
  });

  it('may be kept while an active secondary is added — Scenario E', () => {
    expect(validateEvidenceMapping({
      sourceType: T,
      evidence: [EV('JAVA_CONCURRENCY'), EV('PROBLEM_SOLVING', 'SECONDARY')],
      skills: [
        SKILL('JAVA_CONCURRENCY', { active: false }),
        SKILL('PROBLEM_SOLVING'),
      ],
      existingSkillKeys: ['JAVA_CONCURRENCY'],
    }).ok).toBe(true);
  });

  it('is refused when NEWLY mapped — Scenario D', () => {
    const r = validateEvidenceMapping({
      sourceType: T, evidence: [EV('JAVA_CONCURRENCY')],
      skills: [SKILL('JAVA_CONCURRENCY', { active: false, name: 'Java Concurrency' })],
      existingSkillKeys: [],
    });
    expect(r.ok).toBe(false);
    expect(r.message).toMatch(/inactive and cannot be newly mapped/i);
  });

  it('is refused when newly mapped to a DIFFERENT item', () => {
    const r = validateEvidenceMapping({
      sourceType: T, evidence: [EV('JAVA_CONCURRENCY')],
      skills: [SKILL('JAVA_CONCURRENCY', { active: false })],
      existingSkillKeys: ['SOMETHING_ELSE'],
    });
    expect(r.ok).toBe(false);
  });

  it('can be removed outright', () => {
    expect(validateEvidenceMapping({
      sourceType: T, evidence: [], skills: [], existingSkillKeys: ['JAVA_CONCURRENCY'],
    }).ok).toBe(true);
  });

  it('does not let a retained key bypass the other checks', () => {
    // Only the active rule relaxes. A group is still a group.
    expect(validateEvidenceMapping({
      sourceType: T, evidence: [EV('GRP')],
      skills: [SKILL('GRP', { nodeType: 'GROUP', assessable: false, active: false })],
      existingSkillKeys: ['GRP'],
    }).ok).toBe(false);

    expect(validateEvidenceMapping({
      sourceType: T, evidence: [EV('GONE')], skills: [], existingSkillKeys: ['GONE'],
    }).ok).toBe(false);
  });
});

describe('shaping a submitted mapping', () => {
  it('uppercases keys', () => {
    expect(cleanEvidence([{ skillKey: 'java_oop', contribution: 'PRIMARY' }])[0].skillKey).toBe('JAVA_OOP');
  });

  it('defaults to SECONDARY — the safer assumption', () => {
    // A missing contribution should not silently claim to be an item's main subject.
    expect(cleanEvidence([{ skillKey: 'A' }])[0].contribution).toBe('SECONDARY');
  });

  it('drops entries with no skill', () => {
    expect(cleanEvidence([{ skillKey: '' }, { skillKey: 'A' }])).toHaveLength(1);
  });

  it('survives rubbish input', () => {
    expect(cleanEvidence(null)).toEqual([]);
    expect(cleanEvidence('nope')).toEqual([]);
  });
});

describe('the source registry', () => {
  it('covers exactly the four content families that exist', () => {
    expect(EVIDENCE_SOURCE_TYPES.sort()).toEqual(
      ['assessment_item', 'passport_question', 'question', 'thinking_problem'].sort(),
    );
  });

  it('has an adapter for every declared type — no type without a reader', () => {
    for (const t of EVIDENCE_SOURCE_TYPES) {
      expect(adapterFor(t)).toBeTruthy();
      expect(typeof SOURCE_ADAPTERS[t].loadMany).toBe('function');
      expect(typeof SOURCE_ADAPTERS[t].list).toBe('function');
    }
  });

  it('rejects an unknown type rather than guessing', () => {
    expect(adapterFor('nonsense')).toBeNull();
  });

  it('gives every adapter a human label for the screen', () => {
    for (const t of EVIDENCE_SOURCE_TYPES) expect(SOURCE_ADAPTERS[t].label.length).toBeGreaterThan(3);
  });

  it('builds a stable reference key', () => {
    expect(refKey('assessment_item', 'abc')).toBe('assessment_item:abc');
  });
});

describe('module boundaries', () => {
  it('offers exactly two contribution levels, not a scale', () => {
    // A 1-10 evidence strength would be answered inconsistently and read as precision
    // nobody has.
    expect(EVIDENCE_CONTRIBUTIONS).toEqual(['PRIMARY', 'SECONDARY']);
  });

  it('has no notion of a student anywhere in its vocabulary', () => {
    // Module 5 answers what an item measures, never how anyone did on it.
    const service = require('../services/skillEvidenceService');
    const exported = Object.keys(service).join(' ').toLowerCase();
    for (const forbidden of ['student', 'mastery', 'readiness', 'gap', 'score']) {
      expect(exported).not.toContain(forbidden);
    }
  });
});
