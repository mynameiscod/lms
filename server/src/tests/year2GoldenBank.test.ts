/**
 * The rules the Year-2 golden bank holds to.
 *
 * These are the same rules the importer enforces, checked here instead — where a failure names
 * the offending row in a second rather than after a database round trip, and where they run on
 * every commit rather than on the day somebody remembers to import.
 *
 * The per-skill and per-level totals are the substantive ones. A skill with forty questions and
 * a gap at D5 still imports cleanly and still produces a paper; what it cannot do is tell a
 * strong student from an average one, which is the entire purpose of the bank.
 */

import { YEAR2_BANK } from '../data/goldenBank/year2Bank';
import { BANDS, PER_LEVEL_TOTAL, PER_SKILL_TOTAL, GoldenItem } from '../data/goldenBank/year2Bank/types';
import { CAREER_SKILL_TAXONOMY } from '../data/careerSkillTaxonomy';
import { present } from '../data/goldenBank/year2Bank/present';

const skills = [...new Set(YEAR2_BANK.map(i => i.skillKey))];
const bySkill = (k: string) => YEAR2_BANK.filter(i => i.skillKey === k);

describe('the bank is structurally sound', () => {
  it('gives every question a unique id', () => {
    const seen = new Map<string, number>();
    for (const i of YEAR2_BANK) seen.set(i.questionId, (seen.get(i.questionId) || 0) + 1);
    expect([...seen.entries()].filter(([, n]) => n > 1).map(([q]) => q)).toEqual([]);
  });

  it('names a skill that exists in the taxonomy', () => {
    const known = new Set(CAREER_SKILL_TAXONOMY.map((s: any) => String(s.key)));
    expect(skills.filter(k => !known.has(k))).toEqual([]);
  });

  it('offers exactly four distinct options', () => {
    const bad = YEAR2_BANK
      .filter(i => i.options.length !== 4 || new Set(i.options.map(o => o.trim())).size !== 4)
      .map(i => i.questionId);
    expect(bad).toEqual([]);
  });

  it('never leaves an option blank', () => {
    const bad = YEAR2_BANK
      .filter(i => i.options.some(o => !String(o).trim()))
      .map(i => i.questionId);
    expect(bad).toEqual([]);
  });

  it('points correctIndex at a real option', () => {
    const bad = YEAR2_BANK
      .filter(i => !(i.correctIndex >= 0 && i.correctIndex <= 3))
      .map(i => i.questionId);
    expect(bad).toEqual([]);
  });

  it('explains the answer rather than asserting it', () => {
    const bad = YEAR2_BANK
      .filter(i => String(i.explanation || '').trim().length < 40)
      .map(i => i.questionId);
    expect(bad).toEqual([]);
  });

  it('asks a real question', () => {
    const bad = YEAR2_BANK
      .filter(i => String(i.prompt || '').trim().length < 15)
      .map(i => i.questionId);
    expect(bad).toEqual([]);
  });
});

describe('the bank measures across the whole range', () => {
  it.each(skills)('%s carries fifty questions', (skill) => {
    expect(bySkill(skill).length).toBe(PER_SKILL_TOTAL);
  });

  it.each(skills)('%s carries ten at each band', (skill) => {
    const counts = BANDS.map(b => bySkill(skill).filter(i => i.difficulty === b).length);
    expect(counts).toEqual(BANDS.map(() => PER_LEVEL_TOTAL));
  });
});

describe('a measurement is not repeated as a wording variant', () => {
  /**
   * Two items sharing a family are the same probe at different difficulties, which is fine.
   * Two sharing a family AND a band are two ways of asking one question at one level — the
   * padding this design exists to prevent.
   */
  it('never repeats a family within one difficulty band', () => {
    const seen = new Map<string, string[]>();
    for (const i of YEAR2_BANK) {
      const k = `${i.familyId}@${i.difficulty}`;
      seen.set(k, [...(seen.get(k) || []), i.questionId]);
    }
    expect([...seen.entries()].filter(([, q]) => q.length > 1)
      .map(([k, q]) => `${k}: ${q.join(', ')}`)).toEqual([]);
  });

  it('keeps every reassessment group inside one skill', () => {
    const skillsOf = new Map<string, Set<string>>();
    for (const i of YEAR2_BANK) {
      skillsOf.set(i.reassessmentGroup, (skillsOf.get(i.reassessmentGroup) || new Set()).add(i.skillKey));
    }
    expect([...skillsOf.entries()].filter(([, s]) => s.size > 1).map(([g]) => g)).toEqual([]);
  });

  it('never asks the same prompt twice', () => {
    const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
    const seen = new Map<string, string[]>();
    for (const i of YEAR2_BANK) {
      const k = norm(i.prompt);
      seen.set(k, [...(seen.get(k) || []), i.questionId]);
    }
    expect([...seen.entries()].filter(([, q]) => q.length > 1).map(([, q]) => q.join(', '))).toEqual([]);
  });
});

describe('the answer is not guessable from its shape', () => {
  /**
   * The same rule the Year-2 content holds. A correct option markedly longer than every
   * distractor is answerable without reading the question, and a bank that leaks this way
   * measures test-taking rather than the skill.
   */
  const tells = (i: GoldenItem) => {
    const correct = i.options[i.correctIndex];
    const longest = Math.max(...i.options.filter((_, n) => n !== i.correctIndex).map(o => o.length));
    const gap = correct.length - longest;
    return gap >= 10 && gap >= correct.length / 6;
  };

  it('keeps the answer-length tell at or below one in ten', () => {
    const share = YEAR2_BANK.filter(tells).length / (YEAR2_BANK.length || 1);
    expect(share).toBeLessThanOrEqual(0.10);
  });

  /**
   * Checked on the PRESENTED order, not the authored one.
   *
   * The source files put the answer first by convention, so that an author is never tracking a
   * slot index while writing; `present` decides the real position. Testing the authored order
   * would therefore fail by design and prove nothing about what a student sees.
   */
  it('spreads the correct answer across all four positions', () => {
    const counts = [0, 1, 2, 3].map(n => YEAR2_BANK.filter(i => present(i).correctIndex === n).length);
    const share = Math.max(...counts) / (YEAR2_BANK.length || 1);
    /* Chance is 0.25; anything above 0.45 is a pattern a student can learn. */
    expect(share).toBeLessThanOrEqual(0.45);
  });

  it('presents the same question the same way every time', () => {
    const drift = YEAR2_BANK
      .filter(i => JSON.stringify(present(i)) !== JSON.stringify(present(i)))
      .map(i => i.questionId);
    expect(drift).toEqual([]);
  });

  it('keeps the correct text pointing at the correct option after shuffling', () => {
    const wrong = YEAR2_BANK
      .filter(i => present(i).correctText !== i.options[i.correctIndex])
      .map(i => i.questionId);
    expect(wrong).toEqual([]);
  });
});
