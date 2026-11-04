import { readFileSync } from 'fs';
import { join } from 'path';
import { DSA_CURRICULUM, DSA_SEED_VERSION } from '../data/dsaCurriculum';
import { VISUALIZER_SEED } from '../services/visualizer/visualizerSeed';
import { PB_TOPICS } from '../config/problemBankTaxonomy';
import { DSA_MODULE_STAGES } from '../models/DsaModule';

/** Widget keys the client registers in pages/CodeVisualizer/concepts/index.ts. Keep in step with it. */
const CLIENT_WIDGETS = new Set(['time_complexity', 'space_complexity', 'linked_list']);

const FULL_LESSONS = ['foundations-complexity', 'arrays', 'strings', 'searching', 'sorting', 'linked-lists'];

describe('DSA curriculum seed', () => {
  const slugs = DSA_CURRICULUM.map((m) => m.slug);

  it('has the 22 modules in order with unique slugs', () => {
    expect(DSA_CURRICULUM).toHaveLength(22);
    expect(new Set(slugs).size).toBe(22);
    expect(DSA_CURRICULUM.map((m) => m.order)).toEqual(Array.from({ length: 22 }, (_, i) => i + 1));
  });

  it('only names prerequisites that exist and come earlier or are foundational', () => {
    for (const m of DSA_CURRICULUM) {
      for (const p of m.prerequisites) {
        expect(slugs).toContain(p);
        expect(p).not.toBe(m.slug);
      }
    }
  });

  it('links only real Problem Bank topics, Visualizer items and client widgets', () => {
    const topics = new Set(PB_TOPICS.map((t) => t.key));
    const vz = new Set(VISUALIZER_SEED.map((v) => v.slug));
    for (const m of DSA_CURRICULUM) {
      expect(DSA_MODULE_STAGES).toContain(m.stage);
      expect(m.problemTopics.length).toBeGreaterThan(0);
      for (const t of m.problemTopics) expect(topics.has(t)).toBe(true);
      for (const v of m.visualizerSlugs || []) expect(vz.has(v)).toBe(true);
      for (const w of m.widgets || []) expect(CLIENT_WIDGETS.has(w)).toBe(true);
    }
  });

  it.each(FULL_LESSONS)('%s is a complete lesson', (slug) => {
    const m = DSA_CURRICULUM.find((x) => x.slug === slug)!;
    expect(m.overview && m.overview.length).toBeGreaterThan(100);
    expect((m.objectives || []).length).toBeGreaterThanOrEqual(3);
    expect((m.concepts || []).length).toBeGreaterThanOrEqual(3);
    expect((m.javaExamples || []).length).toBeGreaterThanOrEqual(2);
    expect((m.complexity || []).length).toBeGreaterThanOrEqual(3);
    expect((m.mistakes || []).length).toBeGreaterThanOrEqual(3);
    expect((m.interviewQuestions || []).length).toBeGreaterThanOrEqual(3);
    expect((m.assignments || []).length).toBeGreaterThanOrEqual(1);
  });

  it('gives every Java example one public class and an expected output', () => {
    for (const m of DSA_CURRICULUM) {
      for (const e of m.javaExamples || []) {
        expect(e.code.match(/public class \w+/g)).toHaveLength(1);
        expect(e.code).toContain('public static void main(String[] args)');
        expect((e.output || '').length).toBeGreaterThan(0);
      }
    }
  });

  it('matches the client copy (run scripts/gen-dsa-curriculum-client.js after editing the seed)', () => {
    const clientCopy = JSON.parse(readFileSync(join(__dirname, '../../../client/src/pages/CodeVisualizer/learn/curriculum.json'), 'utf8'));
    expect(clientCopy.version).toBe(DSA_SEED_VERSION);
    expect(clientCopy.modules).toEqual(JSON.parse(JSON.stringify(DSA_CURRICULUM)));
  });
});
