/**
 * The Year-1 map, checked against the rules it is supposed to encode.
 *
 * A seed is data, and data is exactly where a mistake hides longest: nothing fails to compile,
 * nothing throws, and the first symptom is a student being taught the wrong thing months later.
 * These assertions are the review that a JSON-shaped file never otherwise gets.
 */

import {
  FOUNDATION_MODULES, referencedSkillKeys, isMandatoryCategory, FoundationCategory,
} from '../seeds/careerPilot/foundationSkillMap';
import { CAREER_SKILL_TAXONOMY } from '../data/careerSkillTaxonomy';
import { isDirectionKey } from '../data/careerDirectionPolicy';

const allTopics = FOUNDATION_MODULES.flatMap(m => m.topics);

describe('the Year-1 skill map', () => {
  it('covers the fourteen foundation areas', () => {
    expect(FOUNDATION_MODULES).toHaveLength(14);
  });

  /**
   * The single most important property of this file. Every key must resolve against the real
   * taxonomy — a mistyped one would create a mapping to a skill with no blueprint, no questions
   * and no meaning, which would then join students' readiness calculations silently.
   */
  it('references only skills that actually exist', () => {
    const real = new Set(CAREER_SKILL_TAXONOMY.map((s: any) => String(s.key).toUpperCase()));
    const unknown = referencedSkillKeys().filter(k => !real.has(k.toUpperCase()));
    expect(unknown).toEqual([]);
  });

  it('gives every topic at least one skill, or it teaches nothing measurable', () => {
    const orphans = allTopics.filter(t => !t.skillKeys.length).map(t => t.topicCode);
    expect(orphans).toEqual([]);
  });

  it('uses unique topic codes, since assignments are matched by them', () => {
    const codes = allTopics.map(t => t.topicCode);
    expect(new Set(codes).size).toBe(codes.length);
  });

  it('uses unique module codes', () => {
    const codes = FOUNDATION_MODULES.map(m => m.moduleCode);
    expect(new Set(codes).size).toBe(codes.length);
  });

  it('names only real directions', () => {
    const bad = allTopics.flatMap(t => t.applicableDirections).filter(d => !isDirectionKey(d));
    expect(bad).toEqual([]);
  });

  it('gives every topic an outcome a student would recognise', () => {
    const silent = allTopics.filter(t => !t.learningOutcomes.length).map(t => t.topicCode);
    expect(silent).toEqual([]);
  });
});

describe('what is required of every student', () => {
  const universal = allTopics.filter(t => t.category === 'UNIVERSAL');

  /**
   * The rule that stops this becoming the one-size curriculum it replaces. If every area were
   * universal the plan would look personalised and teach everybody everything.
   */
  it('does not make everything mandatory', () => {
    expect(universal.length).toBeLessThan(allTopics.length);
  });

  it('keeps a real foundation rather than making almost nothing required', () => {
    expect(universal.length).toBeGreaterThan(allTopics.length / 3);
  });

  it('marks only UNIVERSAL as mandatory', () => {
    const cats: FoundationCategory[] = ['UNIVERSAL', 'DIRECTION', 'ACADEMIC', 'EXPLORATION', 'ENRICHMENT'];
    for (const c of cats) expect(isMandatoryCategory(c)).toBe(c === 'UNIVERSAL');
  });

  /** A universal topic that is also direction-scoped would contradict itself. */
  it('never scopes a universal topic to one direction', () => {
    const contradictions = universal.filter(t => t.applicableDirections.length).map(t => t.topicCode);
    expect(contradictions).toEqual([]);
  });

  it('keeps Git universal — it does not stop mattering because a student chose AI', () => {
    const git = allTopics.find(t => t.topicCode === 'T_GIT');
    expect(git?.category).toBe('UNIVERSAL');
    expect(git?.applicableDirections).toEqual([]);
  });

  /**
   * C serves a university syllabus, not a career. Making it mandatory would put it in front of
   * students whose course never mentions it.
   */
  it('treats C as academic support rather than a requirement', () => {
    const c = allTopics.find(t => t.topicCode === 'T_C_BASICS');
    expect(c?.category).toBe('ACADEMIC');
    expect(isMandatoryCategory(c!.category)).toBe(false);
  });

  it('scopes web depth to web students', () => {
    const html = allTopics.find(t => t.topicCode === 'T_HTML');
    expect(html?.category).toBe('DIRECTION');
    expect(html?.applicableDirections).toEqual(['WEB_DEVELOPMENT']);
  });

  it('still lets everyone meet the web briefly', () => {
    // Exploration, not depth: an AI student should know what happens when you click a link.
    const http = allTopics.find(t => t.topicCode === 'T_HTTP');
    expect(http?.category).toBe('EXPLORATION');
    expect(http?.applicableDirections).toEqual([]);
  });

  it('scopes statistics to the directions that need it', () => {
    const stats = allTopics.find(t => t.topicCode === 'T_STATS');
    expect(stats?.applicableDirections.sort()).toEqual(['AI_ML', 'DATA']);
  });
});

describe('the order things can be learned in', () => {
  it('does not require a skill the same topic teaches', () => {
    const circular = allTopics
      .filter(t => (t.prerequisiteSkillKeys || []).some(p => t.skillKeys.includes(p)))
      .map(t => t.topicCode);
    expect(circular).toEqual([]);
  });

  it('puts programming fundamentals before the things built on them', () => {
    for (const code of ['T_CONDITIONS', 'T_JS_DOM', 'T_CAPSTONE']) {
      const t = allTopics.find(x => x.topicCode === code);
      expect(t?.prerequisiteSkillKeys).toContain('PROGRAMMING_FUNDAMENTALS');
    }
  });

  it('starts unmeasurable-from-scratch topics at foundation depth', () => {
    const starters = ['T_HARDWARE', 'T_VARIABLES', 'T_LOOPS'];
    for (const code of starters) {
      expect(allTopics.find(t => t.topicCode === code)?.defaultDepth).toBe('FOUNDATION');
    }
  });
});
