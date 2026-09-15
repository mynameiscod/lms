/**
 * The content-quality invariants Phase 20 established, held in place.
 *
 * ── WHY THESE ARE TESTS AND NOT JUST A SCRIPT ─────────────────────────────────────────────
 *
 * auditContentQuality.ts reads the database and answers "is the content good right now". It is
 * the right tool for a review and the wrong one for a guard, because it needs a connection and
 * nobody runs it before a commit. Everything below reads the authored bundles directly — no
 * database, no fixtures — so the rules a hundred and seventy-six units were fixed against are
 * checked on every run of the suite.
 *
 * Each assertion here corresponds to a defect that was actually found, not to a rule somebody
 * thought sounded good. The comments say which.
 */

import { ALL_BUNDLES } from '../seeds/careerPilot/allBundles';
import { PilotBundle, PilotMcq } from '../seeds/careerPilot/pilotUnitContent';

const allQuestions: { unitCode: string; kind: string; q: PilotMcq }[] = [];
for (const b of ALL_BUNDLES) {
  for (const q of b.mcqs || []) allQuestions.push({ unitCode: b.unitCode, kind: 'practice', q });
  for (const q of b.checkpoint || []) allQuestions.push({ unitCode: b.unitCode, kind: 'checkpoint', q });
}

const describeQ = (r: { unitCode: string; kind: string; q: PilotMcq }) =>
  `${r.unitCode} [${r.kind}] "${r.q.question.slice(0, 60)}"`;

describe('Year-1 authored questions', () => {
  it('has questions to check', () => {
    expect(allQuestions.length).toBeGreaterThan(900);
  });

  /**
   * Exactly one correct option.
   *
   * The seed derives the answer key from `isCorrect`, and an earlier version fell back to index
   * 0 when it found none — so a question with no correct option became a question whose answer
   * was silently the first one.
   */
  it('gives every question exactly one correct option', () => {
    const bad = allQuestions.filter(r => (r.q.options || []).filter(o => o.isCorrect).length !== 1);
    expect(bad.map(describeQ)).toEqual([]);
  });

  it('gives every question at least three options', () => {
    const bad = allQuestions.filter(r => (r.q.options || []).length < 3);
    expect(bad.map(describeQ)).toEqual([]);
  });

  it('never repeats an option within a question', () => {
    const key = (s: string) => s.trim().toLowerCase().replace(/\s+/g, ' ');
    const bad = allQuestions.filter(r => {
      const texts = (r.q.options || []).map(o => key(o.text));
      return new Set(texts).size !== texts.length;
    });
    expect(bad.map(describeQ)).toEqual([]);
  });

  it('never leaves an option blank', () => {
    const bad = allQuestions.filter(r => (r.q.options || []).some(o => !String(o.text || '').trim()));
    expect(bad.map(describeQ)).toEqual([]);
  });

  /** An explanation is what makes a wrong answer worth having got wrong. */
  it('explains every question in more than a phrase', () => {
    const bad = allQuestions.filter(r => String(r.q.explanation || '').trim().length < 25);
    expect(bad.map(describeQ)).toEqual([]);
  });

  /**
   * No stem appears twice.
   *
   * Three did: one shared between a unit and the milestone that re-tests it, one across two
   * forms units, and one between a unit's own practice and its own checkpoint. A milestone
   * that reuses a question verbatim measures recall of that item rather than the skill.
   */
  it('never asks the same question twice', () => {
    const seen = new Map<string, string[]>();
    for (const r of allQuestions) {
      const k = r.q.question.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
      if (k.length < 20) continue;
      seen.set(k, [...(seen.get(k) || []), `${r.unitCode}/${r.kind}`]);
    }
    const dupes = [...seen.entries()].filter(([, where]) => where.length > 1)
      .map(([k, where]) => `"${k.slice(0, 60)}" in ${where.join(', ')}`);
    expect(dupes).toEqual([]);
  });
});

describe('the answer-length tell', () => {
  /**
   * A student who never reads the material and always picks the longest option.
   *
   * The graded bank scored 90.6% on this before Phase 20 — against about 25% by chance — and
   * checkpoint questions feed SkillEvidence, so the tell did not merely measure badly: it
   * reported a guesser as strong and the composer then built ninety days on that.
   *
   * MEASURED ON A VISIBLE MARGIN. Longest by one character is not a tell a reader can use;
   * the threshold is ten characters AND a sixth of the correct option's own length, which is
   * the point at which one option looks like the essay answer.
   *
   * The practice bank is allowed a higher ceiling because it has not been through the rewrite
   * pass yet and does not feed evidence. Both ceilings are deliberately just above where the
   * bank sits, so an added question that reintroduces the tell fails here rather than shipping.
   */
  const visiblyTells = (q: PilotMcq): boolean => {
    const opts = q.options || [];
    if (opts.length < 3) return false;
    const correct = opts.find(o => o.isCorrect);
    if (!correct) return false;
    const longestDistractor = Math.max(...opts.filter(o => !o.isCorrect).map(o => o.text.length));
    const gap = correct.text.length - longestDistractor;
    return gap >= 10 && gap >= correct.text.length / 6;
  };

  const share = (kind: string) => {
    const rows = allQuestions.filter(r => r.kind === kind);
    return rows.filter(r => visiblyTells(r.q)).length / rows.length;
  };

  it('is at chance in the graded checkpoint bank', () => {
    expect(share('checkpoint')).toBeLessThanOrEqual(0.30);
  });

  it('does not get worse in the practice bank', () => {
    expect(share('practice')).toBeLessThanOrEqual(0.85);
  });
});

describe('authored text', () => {
  const texts: { where: string; text: string }[] = [];
  for (const b of ALL_BUNDLES as PilotBundle[]) {
    texts.push({ where: `${b.unitCode}.notes`, text: b.notes });
    if (b.workedExample) texts.push({ where: `${b.unitCode}.workedExample`, text: b.workedExample });
    if (b.assignment) texts.push({ where: `${b.unitCode}.assignment`, text: b.assignment.instructions });
    for (const q of [...(b.mcqs || []), ...(b.checkpoint || [])]) {
      texts.push({ where: `${b.unitCode}.question`, text: `${q.question}\n${q.explanation}` });
    }
  }

  /** `PLACEHOLDER` in caps or brackets only: "a placeholder is not a label" is correct prose. */
  it('carries no unfinished-work markers', () => {
    const marker = /(?<!["'`])\b(TODO|TBD|FIXME)\b(?!["'`])|\b(lorem ipsum|coming soon|to be written)\b|\bPLACEHOLDER\b/;
    const bad = texts.filter(t => marker.test(t.text)).map(t => t.where);
    expect(bad).toEqual([]);
  });

  /**
   * A character from a script this curriculum is not written in.
   *
   * Always corruption rather than content — a homoglyph substituted mid-word by an editor or a
   * paste. One reached production prose: "Three cards 是 1002px against a 900px row."
   */
  it('carries no foreign-script corruption', () => {
    const foreign = /[Ѐ-ӿ؀-ۿऀ-ॿ぀-ヿ一-鿿가-힯]/;
    const bad = texts.filter(t => foreign.test(t.text))
      .map(t => `${t.where}: ${t.text.match(foreign)![0]}`);
    expect(bad).toEqual([]);
  });

  /** An unpaired fence swallows the rest of the page into a code block. */
  it('balances its code fences', () => {
    const bad = texts.filter(t => ((t.text.match(/```/g) || []).length % 2) !== 0).map(t => t.where);
    expect(bad).toEqual([]);
  });

  /** A seed-script binding that survived into stored prose. */
  it('leaks no authoring variables', () => {
    const leaked = /\$\{\s*(unit|bundle|b|c|q|t|i)\s*[.}[]/;
    const bad = texts.filter(t => leaked.test(t.text)).map(t => t.where);
    expect(bad).toEqual([]);
  });
});

describe('coding practice', () => {
  const tasks = ALL_BUNDLES.flatMap(b => (b.coding || []).map(c => ({ unitCode: b.unitCode, c })));

  it('has coding tasks to check', () => {
    expect(tasks.length).toBeGreaterThan(0);
  });

  it('gives every task a language, a starter and at least one test', () => {
    const bad = tasks.filter(t => !t.c.language || !String(t.c.starter || '').trim() || !(t.c.tests || []).length)
      .map(t => `${t.unitCode}: ${t.c.title}`);
    expect(bad).toEqual([]);
  });

  /**
   * A task that reads no input publishes its answer in a visible test case.
   *
   * Eight diagnostic tasks — "print the number of the matching cause for each of these four
   * symptoms" — had exactly one possible test case, shown to the student with its expected
   * output. The answer key was on the page.
   */
  it('hides the expected output of a task that takes no input', () => {
    const bad = tasks
      .filter(t => (t.c.tests || []).length
        && !(t.c.tests || []).some(x => String(x.input ?? '').trim())
        && (t.c.tests || []).some(x => !x.isHidden))
      .map(t => `${t.unitCode}: ${t.c.title}`);
    expect(bad).toEqual([]);
  });

  /** A task that DOES read input needs several cases, and one the student can see. */
  it('gives an input-reading task several cases, at least one visible', () => {
    const reading = tasks.filter(t => (t.c.tests || []).some(x => String(x.input ?? '').trim()));
    const bad = reading
      .filter(t => (t.c.tests || []).length < 2 || (t.c.tests || []).every(x => x.isHidden))
      .map(t => `${t.unitCode}: ${t.c.title}`);
    expect(bad).toEqual([]);
  });

  it('expects some output from at least one test of every task', () => {
    const bad = tasks
      .filter(t => (t.c.tests || []).length && (t.c.tests || []).every(x => !String(x.expectedOutput ?? '').length))
      .map(t => `${t.unitCode}: ${t.c.title}`);
    expect(bad).toEqual([]);
  });
});

describe('project briefs', () => {
  const briefs = ALL_BUNDLES.filter(b => b.assignment).map(b => ({ unitCode: b.unitCode, a: b.assignment! }));

  it('has briefs to check', () => {
    expect(briefs.length).toBeGreaterThan(0);
  });

  /**
   * A brief states its own requirements.
   *
   * One said "meet every requirement in the unit brief" while the brief lived in the unit's
   * notes — which a student working in the assignment screen never sees.
   */
  it('states the specification in the instructions themselves', () => {
    const bad = briefs.filter(b => b.a.instructions.length < 400).map(b => b.unitCode);
    expect(bad).toEqual([]);
  });

  it('gives every brief a rubric whose points are real and add up', () => {
    const bad = briefs.filter(b => {
      const rubric = b.a.rubric || [];
      if (!rubric.length) return true;
      if (rubric.some(r => !r.criterion.trim() || !(r.maxPoints > 0))) return true;
      return rubric.reduce((n, r) => n + r.maxPoints, 0) !== b.a.totalPoints;
    }).map(b => b.unitCode);
    expect(bad).toEqual([]);
  });
});
