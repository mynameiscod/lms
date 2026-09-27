/**
 * Year-4 content, held to the standard the other three years are held to.
 *
 * The same rules, for the same reasons: a question with two correct answers is unanswerable, an
 * explanation of four words teaches nothing, a repeated stem measures recall of that item rather
 * than the skill, and an answer that is visibly the longest option can be picked without reading
 * it.
 *
 * It also checks what only a fourth year can get wrong: a question repeated from ANY of the three
 * earlier years. A Year-4 student has sat all of them, so a stem borrowed from Year 1 measures
 * what they remember of their first year rather than what they have just been taught — and with
 * three years of bank behind it, that is the collision most likely to happen by accident.
 *
 * ── WHY THIS DOES NOT DEMAND FULL COVERAGE ────────────────────────────────────────────────
 *
 * Year 4's 439 units are being authored in batches, so `ALL_YEAR4_BUNDLES` is incomplete by
 * design and will be for some time. These checks are therefore about the QUALITY of what has
 * been written, not the QUANTITY — every rule below applies to the bundles that exist and none
 * of them fails because a unit has not been reached yet.
 *
 * The count is guarded elsewhere: the release certification refuses to publish a year with
 * unauthored units, which is the right place for that question and the wrong place is here,
 * where it would go red on every commit for months.
 */

import { ALL_YEAR4_BUNDLES } from '../seeds/careerPilot/year4Bundles';
import { ALL_YEAR3_BUNDLES } from '../seeds/careerPilot/year3Bundles';
import { ALL_YEAR2_BUNDLES } from '../seeds/careerPilot/year2Bundles';
import { ALL_BUNDLES } from '../seeds/careerPilot/allBundles';
import { YEAR4 } from '../seeds/careerPilot/year4MegaCurriculum';
import { PLACEMENT_MODULES } from '../seeds/careerPilot/year4StageMap';
import { ATTRIBUTION_TABLES } from '../seeds/careerPilot/year4SkillAttribution';

type Q = { question: string; options: { text: string; isCorrect: boolean }[]; explanation?: string };

const rows: { unitCode: string; kind: 'practice' | 'checkpoint'; q: Q }[] = [];
for (const b of ALL_YEAR4_BUNDLES) {
  for (const q of b.mcqs || []) rows.push({ unitCode: b.unitCode, kind: 'practice', q: q as Q });
  for (const q of b.checkpoint || []) rows.push({ unitCode: b.unitCode, kind: 'checkpoint', q: q as Q });
}

const stem = (text: string) => text.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

/** unitCode → its unit, for the units Year 4 actually defines. */
const unitByCode = new Map<string, any>();
const topicOfUnit = new Map<string, string>();
for (const [topicCode, topic] of Object.entries(YEAR4 as Record<string, any>)) {
  for (const u of topic.units) {
    unitByCode.set(`${topicCode}_${u.slug}`, u);
    topicOfUnit.set(`${topicCode}_${u.slug}`, topicCode);
  }
}

describe('every authored Year-4 unit belongs to the curriculum', () => {
  it('is authored only for units the dataset defines', () => {
    expect(ALL_YEAR4_BUNDLES.filter(b => !unitByCode.has(b.unitCode)).map(b => b.unitCode)).toEqual([]);
  });

  it('is authored only once per unit', () => {
    const seen = new Map<string, number>();
    for (const b of ALL_YEAR4_BUNDLES) seen.set(b.unitCode, (seen.get(b.unitCode) || 0) + 1);
    expect([...seen.entries()].filter(([, n]) => n > 1).map(([c]) => c)).toEqual([]);
  });

  it('gives a project unit an assignment', () => {
    const missing = ALL_YEAR4_BUNDLES
      .filter(b => unitByCode.get(b.unitCode)?.unitType === 'PROJECT' && !b.assignment)
      .map(b => b.unitCode);
    expect(missing).toEqual([]);
  });

  /**
   * The seeder's rule, which it applies SILENTLY: a PROJECT unit's assignment is stored as a
   * brief and anything else's is stored as a coding task. An assignment on the wrong side of
   * that line is skipped without an error, so the unit publishes and holds nothing.
   */
  it('pairs every assignment with a unit type the seeder will store it on', () => {
    const wrong = ALL_YEAR4_BUNDLES.filter(b => {
      if (!b.assignment) return false;
      const isProject = unitByCode.get(b.unitCode)?.unitType === 'PROJECT';
      return isProject ? !!b.assignment.coding : !b.assignment.coding;
    }).map(b => b.unitCode);
    expect(wrong).toEqual([]);
  });

  it('gives every authored unit notes and something to answer', () => {
    const thin = ALL_YEAR4_BUNDLES
      .filter(b => !b.notes?.trim() || !((b.mcqs?.length || 0) + (b.checkpoint?.length || 0) + (b.coding?.length || 0)))
      .map(b => b.unitCode);
    expect(thin).toEqual([]);
  });

  it('keeps every topic it authors inside a module of the Year-4 map', () => {
    const mapped = new Set((PLACEMENT_MODULES as any[]).flatMap(m => m.topics.map((t: any) => t.topicCode)));
    const stray = ALL_YEAR4_BUNDLES
      .filter(b => !mapped.has(topicOfUnit.get(b.unitCode) || ''))
      .map(b => b.unitCode);
    expect(stray).toEqual([]);
  });
});

/**
 * Attribution is checked here rather than only at seed time, because the failure it prevents is
 * silent: a checkpoint question with no PRIMARY skill is written, bound, marked gradeable and
 * invisible to Skill DNA, and the unit reports READY while holding nothing.
 */
describe('every checkpoint question can produce evidence', () => {
  const skillsOf = new Map<string, string[]>();
  for (const m of PLACEMENT_MODULES as any[]) {
    for (const t of m.topics) skillsOf.set(t.topicCode, t.skillKeys || []);
  }

  it('attributes every multi-skill topic, and no single-skill one', () => {
    const multiMissing = [...skillsOf.entries()]
      .filter(([code, keys]) => keys.length > 1 && !ATTRIBUTION_TABLES.TOPIC_DEFAULT[code])
      .map(([code]) => code);
    const singleListed = [...skillsOf.entries()]
      .filter(([code, keys]) => keys.length === 1 && ATTRIBUTION_TABLES.TOPIC_DEFAULT[code])
      .map(([code]) => code);
    expect({ multiMissing, singleListed }).toEqual({ multiMissing: [], singleListed: [] });
  });

  it('never names a skill the topic does not declare', () => {
    const bad: string[] = [];
    for (const [code, key] of Object.entries(ATTRIBUTION_TABLES.TOPIC_DEFAULT)) {
      if (!skillsOf.get(code)?.includes(key)) bad.push(`${code} → ${key}`);
    }
    for (const [unit, key] of Object.entries(ATTRIBUTION_TABLES.OVERRIDES)) {
      const topic = topicOfUnit.get(unit);
      if (!topic) bad.push(`${unit} → no such unit`);
      else if (!skillsOf.get(topic)!.includes(key)) bad.push(`${unit} → ${key}`);
    }
    expect(bad).toEqual([]);
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

  /**
   * Twenty-five characters, matching Year 2 rather than Year 3's twenty.
   *
   * Year 3 relaxed it to twenty and the result was a run of explanations like "One question per
   * column." — true, and not an explanation of anything. The stricter bar is the one worth
   * holding for a year whose questions are meant to survive an interviewer's follow-up.
   */
  it('explains the answer, rather than asserting it', () => {
    const thin = rows.filter(r => (r.q.explanation || '').trim().length < 25)
      .map(r => `${r.unitCode}: ${r.q.question.slice(0, 60)}`);
    expect(thin).toEqual([]);
  });
});

describe('no question is asked twice', () => {
  it('within Year 4', () => {
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
   * A Year-4 student has sat all three earlier years, so a borrowed stem measures what they
   * remember of them rather than what this year taught. With three years of bank behind it this
   * is the collision most likely to happen by accident.
   */
  it('or repeated from Year 1, 2 or 3, which this student has already been asked', () => {
    const earlier = new Set<string>();
    for (const b of [...ALL_BUNDLES, ...ALL_YEAR2_BUNDLES, ...ALL_YEAR3_BUNDLES]) {
      for (const q of [...(b.mcqs || []), ...(b.checkpoint || [])]) earlier.add(stem((q as Q).question));
    }
    const repeats = rows.filter(r => stem(r.q.question).length >= 20 && earlier.has(stem(r.q.question)))
      .map(r => `${r.unitCode}: ${r.q.question.slice(0, 60)}`);
    expect(repeats).toEqual([]);
  });
});

describe('the answer-length tell', () => {
  /** The same threshold the other three years use: ten characters clear, and a sixth of the answer. */
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
