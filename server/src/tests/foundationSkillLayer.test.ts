/**
 * The first-year Foundation layer.
 *
 * The taxonomy was written for students who already had a target role, so it started where a
 * role blueprint starts. A first-year is measured on what they are actually taught in their
 * first two terms — loops, conditionals, reading input, an aptitude round, speaking in
 * English — and none of it had a node, so none of it could be assessed, planned or taught.
 *
 * These pin the properties that make the layer usable rather than merely present: every node
 * is reachable, every prerequisite resolves, and nothing here is graded above a beginner.
 */

import { CAREER_SKILL_TAXONOMY, SeedSkill } from '../data/careerSkillTaxonomy';

/** Every key added for the first-year layer, listed rather than inferred from a pattern. */
const FOUNDATION_LAYER = [
  // Programming, split into what a first term actually covers
  'INPUT_OUTPUT_BASICS', 'CONDITIONALS_BASICS', 'LOOPS_BASICS', 'FUNCTIONS_BASICS',
  // Python, the step before the full collections node
  'PYTHON_LISTS_BASICS',
  // CS fundamentals
  'HOW_COMPUTERS_WORK',
  // Professional skills
  'SELF_INTRODUCTION', 'SPOKEN_ENGLISH_CONFIDENCE', 'WRITTEN_COMMUNICATION_BASICS',
  'PSEUDOCODE_FLOWCHARTS', 'PATTERN_RECOGNITION', 'TECH_CAREER_AWARENESS',
  // Aptitude — the round every campus drive opens with
  'APTITUDE_QUANT_ARITHMETIC', 'APTITUDE_QUANT_TIME', 'APTITUDE_DATA_INTERPRETATION',
  'APTITUDE_REASONING_SERIES', 'APTITUDE_REASONING_LOGIC',
  'APTITUDE_VERBAL_GRAMMAR', 'APTITUDE_VERBAL_READING',
  // Learning habits
  'TYPING_SPEED', 'DAILY_PRACTICE_HABIT', 'SELF_LEARNING',
];

const byKey = new Map<string, SeedSkill>(CAREER_SKILL_TAXONOMY.map(s => [s.key, s]));
const nodes = FOUNDATION_LAYER.map(k => byKey.get(k)).filter(Boolean) as SeedSkill[];

describe('every node in the layer exists', () => {
  it('has all of them in the shipped taxonomy', () => {
    const missing = FOUNDATION_LAYER.filter(k => !byKey.has(k));
    expect(missing).toEqual([]);
  });

  it('uses UPPER_SNAKE_CASE keys, like every other node', () => {
    for (const k of FOUNDATION_LAYER) expect(k).toMatch(/^[A-Z][A-Z0-9_]*$/);
  });
});

describe('nothing in the layer is graded above a beginner', () => {
  /**
   * The point of the layer. A node marked INTERMEDIATE would be filtered out of the
   * foundation stage policy — which only draws FOUNDATION-difficulty skills — and would sit
   * in the taxonomy reachable by nobody it was written for.
   */
  it('marks every node FOUNDATION', () => {
    const wrong = nodes.filter(s => s.difficulty !== 'FOUNDATION').map(s => `${s.key}=${s.difficulty}`);
    expect(wrong).toEqual([]);
  });
});

describe('every node is reachable and every prerequisite resolves', () => {
  it('gives each node a parent that exists', () => {
    const orphans = nodes
      .filter(s => !s.parentKey || !byKey.has(s.parentKey))
      .map(s => `${s.key} -> ${s.parentKey}`);
    expect(orphans).toEqual([]);
  });

  it('gives each node a parent that is a GROUP, never another skill', () => {
    const wrong = nodes
      .filter(s => byKey.get(s.parentKey as string)?.nodeType !== 'GROUP')
      .map(s => `${s.key} -> ${s.parentKey}`);
    expect(wrong).toEqual([]);
  });

  it('resolves every prerequisite to a real key', () => {
    const dangling: string[] = [];
    for (const s of nodes) {
      for (const p of s.prerequisiteKeys || []) if (!byKey.has(p)) dangling.push(`${s.key} needs ${p}`);
    }
    expect(dangling).toEqual([]);
  });

  /** A skill cannot require itself, directly or through the chain it sits in. */
  it('introduces no cycle through the new prerequisites', () => {
    const seen = new Map<string, number>();   // 0 = visiting, 1 = done
    const walk = (key: string, trail: string[]): string[] | null => {
      if (seen.get(key) === 1) return null;
      if (seen.get(key) === 0) return [...trail, key];
      seen.set(key, 0);
      for (const p of byKey.get(key)?.prerequisiteKeys || []) {
        const cycle = walk(p, [...trail, key]);
        if (cycle) return cycle;
      }
      seen.set(key, 1);
      return null;
    };
    const cycles = FOUNDATION_LAYER.map(k => walk(k, [])).filter(Boolean);
    expect(cycles).toEqual([]);
  });
});

describe('the ordering a first-year is actually taught in', () => {
  const prereqs = (k: string) => byKey.get(k)?.prerequisiteKeys || [];

  it('teaches conditionals before loops, and loops before functions', () => {
    expect(prereqs('LOOPS_BASICS')).toContain('CONDITIONALS_BASICS');
    expect(prereqs('FUNCTIONS_BASICS')).toContain('LOOPS_BASICS');
  });

  /**
   * The existing collections node gained a prerequisite rather than being replaced: it
   * covers tuples, sets and dicts too, and a student who cannot index a list has no
   * business being sent to it.
   */
  it('puts basic lists before the full Python collections node', () => {
    expect(prereqs('PYTHON_COLLECTIONS')).toContain('PYTHON_LISTS_BASICS');
    // The original prerequisite is kept, not swapped out.
    expect(prereqs('PYTHON_COLLECTIONS')).toContain('PYTHON_FUNCTIONS');
  });

  it('starts the aptitude round at arithmetic, and reading after grammar', () => {
    expect(prereqs('APTITUDE_QUANT_TIME')).toContain('APTITUDE_QUANT_ARITHMETIC');
    expect(prereqs('APTITUDE_DATA_INTERPRETATION')).toContain('APTITUDE_QUANT_ARITHMETIC');
    expect(prereqs('APTITUDE_VERBAL_READING')).toContain('APTITUDE_VERBAL_GRAMMAR');
    expect(prereqs('APTITUDE_REASONING_LOGIC')).toContain('APTITUDE_REASONING_SERIES');
  });

  /** Entry points, deliberately: a student can be measured on these on day one. */
  it('leaves the true starting points with no prerequisite', () => {
    for (const k of ['HOW_COMPUTERS_WORK', 'APTITUDE_QUANT_ARITHMETIC',
      'APTITUDE_REASONING_SERIES', 'APTITUDE_VERBAL_GRAMMAR', 'TECH_CAREER_AWARENESS']) {
      expect(prereqs(k)).toHaveLength(0);
    }
  });
});

describe('habits are tracked, not examined', () => {
  /**
   * There is no paper that measures showing up. Marking these assessable would put them in
   * the pool of things a Check can ask about, and produce a score out of questions that
   * cannot exist.
   */
  it('marks the habit nodes unassessable', () => {
    for (const k of ['DAILY_PRACTICE_HABIT', 'SELF_LEARNING']) {
      expect(byKey.get(k)?.assessable).toBe(false);
    }
  });

  it('still lets them be learned and shown', () => {
    for (const k of ['DAILY_PRACTICE_HABIT', 'SELF_LEARNING']) {
      expect(byKey.get(k)?.learnable).not.toBe(false);
    }
  });

  /** Everything else in the layer is a real capability and stays measurable. */
  it('leaves every other node assessable', () => {
    const habits = new Set(['DAILY_PRACTICE_HABIT', 'SELF_LEARNING']);
    for (const s of nodes) {
      if (!habits.has(s.key)) expect(s.assessable).not.toBe(false);
    }
  });
});

describe('the layer says what it covers', () => {
  it('gives every node a one-sentence description', () => {
    const bare = nodes.filter(s => !String(s.description || '').trim()).map(s => s.key);
    expect(bare).toEqual([]);
  });
});
