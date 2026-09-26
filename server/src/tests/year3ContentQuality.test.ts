/**
 * Year-3 content, held to the standard Years 1 and 2 are held to.
 *
 * The same rules, for the same reasons: a question with two correct answers is unanswerable, an
 * explanation of four words teaches nothing, a repeated stem measures recall of that item rather
 * than the skill, and an answer that is visibly the longest option can be picked without reading it.
 *
 * It also checks what only a third year can get wrong: a question repeated from EITHER earlier
 * year. A Year-3 student has sat both, so a stem borrowed from Year 1 measures what they
 * remember of their first year rather than what they have just been taught.
 *
 * ── WHY THIS DOES NOT DEMAND FULL COVERAGE ────────────────────────────────────────────────
 *
 * Year 3's 453 units are being authored in batches, so `ALL_YEAR3_BUNDLES` is incomplete by
 * design and will be for some time. These checks are therefore about the QUALITY of what has
 * been written, not the QUANTITY — every rule below applies to the bundles that exist and none
 * of them fails because a unit has not been reached yet.
 *
 * The count is guarded elsewhere: the release certification refuses to publish a year with
 * unauthored units, which is the right place for that question and the wrong place is here,
 * where it would go red on every commit for months.
 */

import { ALL_YEAR3_BUNDLES } from '../seeds/careerPilot/year3Bundles';
import { ALL_YEAR2_BUNDLES } from '../seeds/careerPilot/year2Bundles';
import { ALL_BUNDLES } from '../seeds/careerPilot/allBundles';
import { YEAR3 } from '../seeds/careerPilot/year3MegaCurriculum';
import { SPECIALIZE_MODULES } from '../seeds/careerPilot/year3StageMap';

type Q = { question: string; options: { text: string; isCorrect: boolean }[]; explanation?: string; skillKey?: string };

const rows: { unitCode: string; kind: 'practice' | 'checkpoint'; q: Q }[] = [];
for (const b of ALL_YEAR3_BUNDLES) {
  for (const q of b.mcqs || []) rows.push({ unitCode: b.unitCode, kind: 'practice', q: q as Q });
  for (const q of b.checkpoint || []) rows.push({ unitCode: b.unitCode, kind: 'checkpoint', q: q as Q });
}

const stem = (text: string) => text.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

/** unitCode → its unit, for the units Year 3 actually defines. */
const unitByCode = new Map<string, any>();
for (const [topicCode, topic] of Object.entries(YEAR3 as Record<string, any>)) {
  for (const u of topic.units) unitByCode.set(`${topicCode}_${u.slug}`, u);
}

describe('every authored Year-3 unit belongs to the curriculum', () => {
  it('is authored only for units the dataset defines', () => {
    expect(ALL_YEAR3_BUNDLES.filter(b => !unitByCode.has(b.unitCode)).map(b => b.unitCode)).toEqual([]);
  });

  it('is authored only once per unit', () => {
    const seen = new Map<string, number>();
    for (const b of ALL_YEAR3_BUNDLES) seen.set(b.unitCode, (seen.get(b.unitCode) || 0) + 1);
    expect([...seen.entries()].filter(([, n]) => n > 1).map(([c]) => c)).toEqual([]);
  });

  it('gives a project unit an assignment', () => {
    const missing = ALL_YEAR3_BUNDLES
      .filter(b => unitByCode.get(b.unitCode)?.unitType === 'PROJECT' && !b.assignment)
      .map(b => b.unitCode);
    expect(missing).toEqual([]);
  });

  it('gives every authored unit notes and something to answer', () => {
    const thin = ALL_YEAR3_BUNDLES
      .filter(b => !b.notes?.trim() || !((b.mcqs?.length || 0) + (b.checkpoint?.length || 0) + (b.coding?.length || 0)))
      .map(b => b.unitCode);
    expect(thin).toEqual([]);
  });

  it('keeps every topic it authors inside a module of the Year-3 map', () => {
    const mapped = new Set((SPECIALIZE_MODULES as any[]).flatMap(m => m.topics.map((t: any) => t.topicCode)));
    const stray = [...new Set(ALL_YEAR3_BUNDLES.map(b => {
      const parts = b.unitCode.split('_');
      // The topic is the longest prefix that the map knows, since slugs contain underscores too.
      for (let n = parts.length - 1; n >= 2; n--) {
        const candidate = parts.slice(0, n).join('_');
        if (mapped.has(candidate)) return '';
      }
      return b.unitCode;
    }))].filter(Boolean);
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
    expect(rows.filter(r => r.q.options.length < 3).map(r => r.unitCode)).toEqual([]);
  });

  it('never repeats or blanks an option', () => {
    const bad = rows.filter(r => {
      const texts = r.q.options.map(o => o.text.trim());
      return texts.some(t => !t) || new Set(texts).size !== texts.length;
    }).map(r => `${r.unitCode}: ${r.q.question.slice(0, 60)}`);
    expect(bad).toEqual([]);
  });

  it('explains the answer, rather than asserting it', () => {
    const thin = rows.filter(r => (r.q.explanation || '').trim().length < 20)
      .map(r => `${r.unitCode}: ${r.q.question.slice(0, 60)}`);
    expect(thin).toEqual([]);
  });
});

describe('no question is asked twice', () => {
  it('within Year 3', () => {
    const seen = new Map<string, string>();
    const repeats: string[] = [];
    for (const r of rows) {
      const s = stem(r.q.question);
      if (s.length < 20) continue;
      if (seen.has(s)) repeats.push(`${r.unitCode} repeats ${seen.get(s)}: ${r.q.question.slice(0, 60)}`);
      else seen.set(s, r.unitCode);
    }
    expect(repeats).toEqual([]);
  });

  /**
   * A Year-3 student has sat both earlier years, so a borrowed stem measures what they remember
   * of them rather than what this year taught.
   */
  it('or repeated from Year 1 or Year 2, which this student has already been asked', () => {
    const earlier = new Set<string>();
    for (const b of [...ALL_BUNDLES, ...ALL_YEAR2_BUNDLES]) {
      for (const q of [...(b.mcqs || []), ...(b.checkpoint || [])]) earlier.add(stem((q as Q).question));
    }
    const repeats = rows.filter(r => stem(r.q.question).length >= 20 && earlier.has(stem(r.q.question)))
      .map(r => `${r.unitCode}: ${r.q.question.slice(0, 60)}`);
    expect(repeats).toEqual([]);
  });
});

describe('the answer-length tell', () => {
  /** The same threshold the other two years use: ten characters clear, and a sixth of the answer. */
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
