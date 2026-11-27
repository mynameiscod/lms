/**
 * Career-track content (stage `track`), held to the standard every year is held to — and to the
 * readiness rule, because a track roadmap is built only from READY units: a lesson without its own
 * practice and checkpoint is left out of every student's plan without anybody being told.
 *
 * Track content is reused by every track that names its topics, so a question here may meet a
 * student who sat any year; it must not repeat a stem from Years 1–4.
 */
import { ALL_TRACK_BUNDLES } from '../seeds/careerPilot/trackBundles';
import { ALL_YEAR4_BUNDLES } from '../seeds/careerPilot/year4Bundles';
import { ALL_YEAR3_BUNDLES } from '../seeds/careerPilot/year3Bundles';
import { ALL_YEAR2_BUNDLES } from '../seeds/careerPilot/year2Bundles';
import { ALL_BUNDLES } from '../seeds/careerPilot/allBundles';
import { TRACK_CONTENT } from '../seeds/careerPilot/trackContent';
import { TRACK_MODULES } from '../seeds/careerPilot/trackStageMap';
import { ATTRIBUTION_TABLES } from '../seeds/careerPilot/trackSkillAttribution';

type Q = { question: string; options: { text: string; isCorrect: boolean }[]; explanation?: string; skillKey?: string };

const rows: { unitCode: string; kind: 'practice' | 'checkpoint'; q: Q }[] = [];
for (const b of ALL_TRACK_BUNDLES) {
  for (const q of b.mcqs || []) rows.push({ unitCode: b.unitCode, kind: 'practice', q: q as Q });
  for (const q of b.checkpoint || []) rows.push({ unitCode: b.unitCode, kind: 'checkpoint', q: q as Q });
}
const stem = (text: string) => text.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

const unitByCode = new Map<string, any>();
const topicOfUnit = new Map<string, string>();
for (const [topicCode, topic] of Object.entries(TRACK_CONTENT as Record<string, any>)) {
  for (const u of topic.units) {
    unitByCode.set(`${topicCode}_${u.slug}`, u);
    topicOfUnit.set(`${topicCode}_${u.slug}`, topicCode);
  }
}
const skillsOf = new Map<string, string[]>();
for (const m of TRACK_MODULES as any[]) for (const t of m.topics) skillsOf.set(t.topicCode, t.skillKeys || []);
const typeOf = (code: string) => String(unitByCode.get(code)?.unitType || 'CONCEPT');

describe('every authored track unit belongs to the dataset', () => {
  it('is authored only for units the dataset defines', () => {
    expect(ALL_TRACK_BUNDLES.filter(b => !unitByCode.has(b.unitCode)).map(b => b.unitCode)).toEqual([]);
  });
  it('is authored only once per unit', () => {
    const seen = new Map<string, number>();
    for (const b of ALL_TRACK_BUNDLES) seen.set(b.unitCode, (seen.get(b.unitCode) || 0) + 1);
    expect([...seen.entries()].filter(([, n]) => n > 1).map(([c]) => c)).toEqual([]);
  });
});

describe('every authored unit is READY — a track roadmap uses nothing less', () => {
  const by = new Map(ALL_TRACK_BUNDLES.map(b => [b.unitCode, b]));
  const missing = (want: (b: any) => boolean, types: string[]) => [...by.values()]
    .filter(b => types.includes(typeOf(b.unitCode)) && !want(b)).map(b => b.unitCode);

  it('a lesson has notes, practice and its own checkpoint', () => {
    expect(missing(b => b.notes?.trim() && b.mcqs?.length >= 2 && b.checkpoint?.length >= 2, ['CONCEPT'])).toEqual([]);
  });
  it('a debugging or practice unit has notes and practice', () => {
    expect(missing(b => b.notes?.trim() && b.mcqs?.length >= 3, ['DEBUG', 'PRACTICE'])).toEqual([]);
  });
  it('a project has a brief and an assignment with a rubric', () => {
    expect(missing(b => b.notes?.trim() && b.assignment?.rubric?.length >= 3 && b.mcqs?.length >= 1, ['PROJECT'])).toEqual([]);
  });
  it('a checkpoint unit asks at least eight questions', () => {
    expect(missing(b => b.notes?.trim() && b.checkpoint?.length >= 8, ['CHECKPOINT'])).toEqual([]);
  });
  it('an assignment sits only on a project or practice unit', () => {
    expect([...by.values()].filter(b => b.assignment && !['PROJECT', 'PRACTICE'].includes(typeOf(b.unitCode))).map(b => b.unitCode)).toEqual([]);
  });
});

describe('every checkpoint question can produce evidence', () => {
  it('attributes every multi-skill topic, and no single-skill one', () => {
    const multiMissing = [...skillsOf.entries()].filter(([c, k]) => k.length > 1 && !ATTRIBUTION_TABLES.TOPIC_DEFAULT[c]).map(([c]) => c);
    const singleListed = [...skillsOf.entries()].filter(([c, k]) => k.length === 1 && ATTRIBUTION_TABLES.TOPIC_DEFAULT[c]).map(([c]) => c);
    expect({ multiMissing, singleListed }).toEqual({ multiMissing: [], singleListed: [] });
  });
  it('never names a skill the topic (or the unit) does not declare', () => {
    const bad: string[] = [];
    for (const [code, key] of Object.entries(ATTRIBUTION_TABLES.TOPIC_DEFAULT)) if (!skillsOf.get(code)?.includes(key)) bad.push(`${code} → ${key}`);
    for (const [unit, key] of Object.entries(ATTRIBUTION_TABLES.OVERRIDES)) {
      const topic = topicOfUnit.get(unit);
      if (!topic) bad.push(`${unit} → no such unit`);
      else if (!skillsOf.get(topic)!.includes(key)) bad.push(`${unit} → ${key}`);
    }
    for (const r of rows.filter(x => x.kind === 'checkpoint' && x.q.skillKey)) {
      const own = unitByCode.get(r.unitCode)?.skillKeys || skillsOf.get(topicOfUnit.get(r.unitCode) || '') || [];
      if (!own.includes(r.q.skillKey!)) bad.push(`${r.unitCode}: question names ${r.q.skillKey}`);
    }
    expect(bad).toEqual([]);
  });
});

describe('a question a student can actually answer', () => {
  it('has exactly one correct option', () => {
    expect(rows.filter(r => r.q.options.filter(o => o.isCorrect).length !== 1).map(r => `${r.unitCode}: ${r.q.question.slice(0, 50)}`)).toEqual([]);
  });
  it('offers at least three options', () => {
    expect(rows.filter(r => r.q.options.length < 3).map(r => r.unitCode)).toEqual([]);
  });
  it('never repeats or blanks an option', () => {
    expect(rows.filter(r => {
      const t = r.q.options.map(o => o.text.trim().toLowerCase());
      return t.some(x => !x) || new Set(t).size !== t.length;
    }).map(r => r.unitCode)).toEqual([]);
  });
  it('explains the answer, rather than asserting it', () => {
    expect(rows.filter(r => (r.q.explanation || '').trim().length < 25).map(r => `${r.unitCode}: ${r.q.question.slice(0, 50)}`)).toEqual([]);
  });
});

describe('no question is asked twice', () => {
  it('within track content', () => {
    const seen = new Map<string, string>();
    const repeats: string[] = [];
    for (const r of rows) {
      const s = stem(r.q.question);
      if (s.length < 20) continue;
      if (seen.has(s)) repeats.push(`${r.unitCode} repeats ${seen.get(s)}: ${r.q.question.slice(0, 50)}`);
      else seen.set(s, r.unitCode);
    }
    expect(repeats).toEqual([]);
  });
  it('or repeated from any year', () => {
    const earlier = new Set<string>();
    for (const b of [...ALL_BUNDLES, ...ALL_YEAR2_BUNDLES, ...ALL_YEAR3_BUNDLES, ...ALL_YEAR4_BUNDLES]) {
      for (const q of [...(b.mcqs || []), ...(b.checkpoint || [])]) earlier.add(stem((q as Q).question));
    }
    expect(rows.filter(r => stem(r.q.question).length >= 20 && earlier.has(stem(r.q.question))).map(r => `${r.unitCode}: ${r.q.question.slice(0, 50)}`)).toEqual([]);
  });
});

describe('the answer-length tell', () => {
  const tells = (q: Q) => {
    const correct = q.options.find(o => o.isCorrect);
    if (!correct || q.options.length < 3) return false;
    const longest = Math.max(...q.options.filter(o => !o.isCorrect).map(o => o.text.length));
    const gap = correct.text.length - longest;
    return gap >= 10 && gap >= correct.text.length / 6;
  };
  const share = (kind: string) => {
    const of = rows.filter(r => r.kind === kind);
    return of.length ? of.filter(r => tells(r.q)).length / of.length : 0;
  };
  it('is gone from the graded checkpoint bank', () => { expect(share('checkpoint')).toBeLessThanOrEqual(0.10); });
  it('is at or below chance in the practice bank', () => { expect(share('practice')).toBeLessThanOrEqual(0.35); });

  /*
   * The subtler tell. A correct option only a few characters longer than every distractor passes
   * the check above, but if it is the longest option in most questions a student learns "pick the
   * longest" and passes without the skill. With three or four options chance is a quarter to a
   * third; no topic's bank may sit far above it.
   */
  it('is the longest option about as often as chance, in every topic', () => {
    const byTopic = new Map<string, { n: number; longest: number }>();
    for (const r of rows) {
      const topic = topicOfUnit.get(r.unitCode) || r.unitCode;
      const c = r.q.options.find(o => o.isCorrect);
      if (!c) continue;
      const s = byTopic.get(topic) || { n: 0, longest: 0 };
      s.n++;
      if (r.q.options.every(o => o === c || o.text.length < c.text.length)) s.longest++;
      byTopic.set(topic, s);
    }
    // Never-longest is a tell too ("pick anything but the longest"), so the floor is not zero.
    const over = [...byTopic.entries()].filter(([, s]) => s.n >= 10 && (s.longest / s.n > 0.35 || s.longest / s.n < 0.10))
      .map(([t, s]) => `${t}: ${s.longest}/${s.n}`);
    expect(over).toEqual([]);
  });
});

describe('the answer-position tell', () => {
  it('puts the correct option in no one position for most of a topic', () => {
    const byTopic = new Map<string, number[]>();
    for (const r of rows) {
      const topic = topicOfUnit.get(r.unitCode) || r.unitCode;
      const at = r.q.options.findIndex(o => o.isCorrect);
      const counts = byTopic.get(topic) || [0, 0, 0, 0, 0, 0];
      counts[at]++;
      byTopic.set(topic, counts);
    }
    const over = [...byTopic.entries()].filter(([, c]) => {
      const n = c.reduce((s, x) => s + x, 0);
      return n >= 10 && Math.max(...c) / n > 0.45;
    }).map(([t, c]) => `${t}: ${c.join('/')}`);
    expect(over).toEqual([]);
  });
});
