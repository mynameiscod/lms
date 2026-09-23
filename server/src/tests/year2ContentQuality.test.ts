/**
 * Year-2 content, held to the standard Year 1 is held to.
 *
 * The same rules, for the same reasons: a question with two correct answers is unanswerable, an
 * explanation of four words teaches nothing, a repeated stem measures recall of that item rather
 * than the skill, and an answer that is visibly the longest option can be picked without reading it.
 *
 * It also checks what only a second year can get wrong: a unit authored for a topic that does not
 * exist, or a question repeated from Year 1, which a continuing student has already been asked.
 */

import { ALL_YEAR2_BUNDLES } from '../seeds/careerPilot/year2Bundles';
import { ALL_BUNDLES } from '../seeds/careerPilot/allBundles';
import { YEAR2 } from '../seeds/careerPilot/year2MegaCurriculum';
import { BUILD_MODULES } from '../seeds/careerPilot/year2StageMap';

type Q = { question: string; options: { text: string; isCorrect: boolean }[]; explanation?: string; skillKey?: string };

const rows: { unitCode: string; kind: 'practice' | 'checkpoint'; q: Q }[] = [];
for (const b of ALL_YEAR2_BUNDLES) {
  for (const q of b.mcqs || []) rows.push({ unitCode: b.unitCode, kind: 'practice', q: q as Q });
  for (const q of b.checkpoint || []) rows.push({ unitCode: b.unitCode, kind: 'checkpoint', q: q as Q });
}

const stem = (text: string) => text.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

describe('every authored Year-2 unit belongs to the curriculum', () => {
  const authored = new Set(
    Object.entries(YEAR2).flatMap(([topic, t]: [string, any]) => t.units.map((u: any) => `${topic}_${u.slug}`)),
  );

  it('is authored only for units the dataset defines', () => {
    const unknown = ALL_YEAR2_BUNDLES.map(b => b.unitCode).filter(c => !authored.has(c));
    expect(unknown).toEqual([]);
  });

  it('gives a project unit an assignment, and no other unit one', () => {
    const typeOf = new Map<string, string>(
      Object.entries(YEAR2).flatMap(([topic, t]: [string, any]) =>
        t.units.map((u: any) => [`${topic}_${u.slug}`, u.unitType || 'CONCEPT'] as [string, string])),
    );
    const wrong = ALL_YEAR2_BUNDLES
      .filter(b => (typeOf.get(b.unitCode) === 'PROJECT') !== !!b.assignment)
      .map(b => `${b.unitCode} (${typeOf.get(b.unitCode)}, assignment ${!!b.assignment})`);
    expect(wrong).toEqual([]);
  });

  it('gives every teaching unit notes and questions to answer', () => {
    const thin = ALL_YEAR2_BUNDLES
      .filter(b => !b.assignment)
      .filter(b => !b.notes || String(b.notes).length < 400 || !(b.mcqs || []).length || !(b.checkpoint || []).length)
      .map(b => b.unitCode);
    expect(thin).toEqual([]);
  });

  it('keeps every topic it authors inside a module of the Year-2 map', () => {
    const inMap: string[] = BUILD_MODULES.flatMap((m: any) => m.topics.map((t: any) => t.topicCode));
    const stray = ALL_YEAR2_BUNDLES
      .map(b => b.unitCode)
      .filter(code => !inMap.some(topic => code.startsWith(`${topic}_`)));
    expect(stray).toEqual([]);
  });
});

describe('a question a student can actually answer', () => {
  it('has exactly one correct option', () => {
    const bad = rows.filter(r => r.q.options.filter(o => o.isCorrect).length !== 1)
      .map(r => `${r.unitCode}: ${r.q.question.slice(0, 60)}`);
    expect(bad).toEqual([]);
  });

  it('offers at least three options', () => {
    const bad = rows.filter(r => r.q.options.length < 3).map(r => `${r.unitCode}: ${r.q.question.slice(0, 60)}`);
    expect(bad).toEqual([]);
  });

  it('never repeats or blanks an option', () => {
    const bad = rows.filter(r => {
      const texts = r.q.options.map(o => o.text.trim());
      return texts.some(t => !t) || new Set(texts).size !== texts.length;
    }).map(r => `${r.unitCode}: ${r.q.question.slice(0, 60)}`);
    expect(bad).toEqual([]);
  });

  it('explains the answer, rather than asserting it', () => {
    const bad = rows.filter(r => String(r.q.explanation || '').trim().length < 25)
      .map(r => `${r.unitCode}: ${r.q.question.slice(0, 60)}`);
    expect(bad).toEqual([]);
  });
});

describe('no question is asked twice', () => {
  it('within Year 2', () => {
    const seen = new Map<string, string[]>();
    for (const r of rows) {
      const k = stem(r.q.question);
      if (k.length < 20) continue;
      seen.set(k, [...(seen.get(k) || []), `${r.unitCode}/${r.kind}`]);
    }
    expect([...seen.entries()].filter(([, where]) => where.length > 1)
      .map(([k, where]) => `"${k.slice(0, 50)}" in ${where.join(', ')}`)).toEqual([]);
  });

  it('or repeated from Year 1, which a continuing student has already been asked', () => {
    const year1 = new Set<string>();
    for (const b of ALL_BUNDLES) {
      for (const q of [...(b.mcqs || []), ...(b.checkpoint || [])]) year1.add(stem((q as Q).question));
    }
    const repeats = rows.filter(r => stem(r.q.question).length >= 20 && year1.has(stem(r.q.question)))
      .map(r => `${r.unitCode}: ${r.q.question.slice(0, 60)}`);
    expect(repeats).toEqual([]);
  });
});

describe('the answer-length tell', () => {
  /** The same threshold Year 1 uses: ten characters clear, and a sixth of the answer's own length. */
  const visiblyTells = (q: Q) => {
    const correct = q.options.find(o => o.isCorrect);
    if (!correct || q.options.length < 3) return false;
    const longest = Math.max(...q.options.filter(o => !o.isCorrect).map(o => o.text.length));
    const gap = correct.text.length - longest;
    return gap >= 10 && gap >= correct.text.length / 6;
  };
  const share = (kind: string) => {
    const of = rows.filter(r => r.kind === kind);
    return of.length ? of.filter(r => visiblyTells(r.q)).length / of.length : 0;
  };

  it('is gone from the graded checkpoint bank', () => {
    expect(share('checkpoint')).toBeLessThanOrEqual(0.10);
  });

  it('is at or below chance in the practice bank', () => {
    expect(share('practice')).toBeLessThanOrEqual(0.35);
  });
});
