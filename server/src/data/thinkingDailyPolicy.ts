/**
 * The Thinking Lab day for a CareerPilot member, and how an answer is scored. Pure: no database.
 *
 * THE DAY. An admin sets, per year, how many questions a member gets a day (default 1) and how many of
 * those are coding once coding is open (default 0 = coding takes its turn in the rotation). The other
 * questions rotate math → logical → critical, so a member meets every kind. Missed days do not pile up.
 *
 * CODING opens only from Year 2, and only once the member has finished the basics topics in their
 * roadmap (a track's _START/_BASICS topics, or the Year 1 programming fundamentals a bridge gives them).
 * A coding question is given only when its topics are among what they have covered.
 *
 * SCORING. Half the day's XP is for the right answer and half for the reasoning: each key step the
 * member's explanation covers counts 1, a partly covered one ½. A wrong answer with good reasoning still
 * earns up to half. Coding: all tests passing is full marks; otherwise half × the share of tests passed.
 */
import { QuestionType } from './thinkingBankPolicy';

export const LAB_YEARS = ['foundation', 'build', 'specialize', 'placement'] as const;

/** practicePerDay: extra, unpaid questions after the day's set is done. 0 turns Practise More off. */
export interface ThinkingYearSettings { perDay: number; codingPerDay: number; practicePerDay: number }
export interface LabDailySettings {
  thinking: Record<string, ThinkingYearSettings>;
  communication: Record<string, { perDay: number }>;
}
export const PER_DAY_MAX = 5;
export const PRACTICE_PER_DAY_MAX = 30;
export const PRACTICE_PER_DAY_DEFAULT = 10;

export const LAB_DAILY_DEFAULTS: LabDailySettings = {
  thinking: Object.fromEntries(LAB_YEARS.map((y) => [y, { perDay: 1, codingPerDay: 0, practicePerDay: PRACTICE_PER_DAY_DEFAULT }])),
  communication: Object.fromEntries(LAB_YEARS.map((y) => [y, { perDay: 1 }])),
};

const intIn = (v: any, lo: number, hi: number, d: number) => { const n = Number(v); return Number.isInteger(n) && n >= lo && n <= hi ? n : d; };

/** The admin's numbers, checked. Year 1 never has coding, and coding never exceeds the day's count. */
export function labDailySettings(raw: any): LabDailySettings {
  const out: LabDailySettings = { thinking: {}, communication: {} };
  for (const y of LAB_YEARS) {
    const t = raw?.thinking?.[y] || {};
    const perDay = intIn(t.perDay, 1, PER_DAY_MAX, 1);
    out.thinking[y] = {
      perDay,
      codingPerDay: y === 'foundation' ? 0 : Math.min(perDay, intIn(t.codingPerDay, 0, PER_DAY_MAX, 0)),
      practicePerDay: intIn(t.practicePerDay, 0, PRACTICE_PER_DAY_MAX, PRACTICE_PER_DAY_DEFAULT),
    };
    out.communication[y] = { perDay: intIn(raw?.communication?.[y]?.perDay, 1, PER_DAY_MAX, 1) };
  }
  return out;
}

const PUZZLES: QuestionType[] = ['math', 'logical', 'critical'];

/**
 * The kinds of question for one day, in order. `dayIndex` is how many days this member has had before,
 * so the rotation carries on from where they left off rather than restarting.
 */
export function dayTypes(dayIndex: number, s: Pick<ThinkingYearSettings, 'perDay' | 'codingPerDay'>, codingOpen: boolean): QuestionType[] {
  const coding = codingOpen ? s.codingPerDay : 0;
  // With no fixed coding count, coding (once open) simply takes a turn in the rotation.
  const pool: QuestionType[] = codingOpen && s.codingPerDay === 0 ? [...PUZZLES, 'coding'] : PUZZLES;
  const out: QuestionType[] = [];
  for (let i = 0; i < coding; i++) out.push('coding');
  for (let i = 0; out.length < s.perDay; i++) out.push(pool[(dayIndex * s.perDay + i) % pool.length]);
  return out;
}

/** Topic codes that make up "the basics": a track's start/basics topics, and the Year 1 programming fundamentals. */
export const BASICS_UNIT = /^(JT_[A-Z]+_(START|BASICS)|T_C_BASICS|MB_RN_BASICS|T_(FIRST|VARIABLES|CONDITIONS|LOOPS|FUNCTIONS))_/;

/** What finishing the basics covers, and what later units add (by unit code or title). */
const BASICS_COVERS = ['conditions', 'loops', 'strings', 'lists', 'functions'];
const TOPIC_UNITS: Record<string, RegExp> = {
  dictionaries: /DICT|HASH|MAP/i, sorting: /SORT|SEARCH/i, strings: /STRING/i, lists: /LIST|ARRAY/i,
};

export interface CodingAccess { open: boolean; reason: 'year1' | 'basics' | 'open'; basicsDone: number; basicsTotal: number; covered: string[] }

/**
 * Whether coding is open, from the member's year and roadmap. `units` is every unit in the roadmap with
 * whether its day is done. A roadmap with no basics units (a member past them) is open from Year 2.
 */
export function codingAccess(stage: string, units: { code: string; title?: string; done: boolean }[]): CodingAccess {
  if (!stage || stage === 'foundation') return { open: false, reason: 'year1', basicsDone: 0, basicsTotal: 0, covered: [] };
  const basics = units.filter((u) => BASICS_UNIT.test(u.code));
  const done = basics.filter((u) => u.done).length;
  const open = done === basics.length;
  const covered = new Set<string>(open ? BASICS_COVERS : []);
  for (const u of units) {
    if (!u.done) continue;
    for (const [topic, rx] of Object.entries(TOPIC_UNITS)) if (rx.test(u.code) || rx.test(u.title || '')) covered.add(topic);
  }
  return { open, reason: open ? 'open' : 'basics', basicsDone: done, basicsTotal: basics.length, covered: [...covered] };
}

/** A coding question may be given when every topic it needs has been covered (no topics = basics only). */
export const topicsCovered = (topics: string[], covered: string[]) =>
  (topics || []).every((t) => covered.includes(String(t).toLowerCase().trim()));

const RANK: Record<string, number> = { easy: 0, medium: 1, hard: 2 };

/** Easiest first, then the admin's order, then oldest — the order a member meets a type's questions. */
export function servingOrder<T extends { difficulty: string; order?: number | null; number: number }>(rows: T[]): T[] {
  return [...rows].sort((a, b) => (RANK[a.difficulty] ?? 1) - (RANK[b.difficulty] ?? 1)
    || (a.order ?? 1e9) - (b.order ?? 1e9) || a.number - b.number);
}

// ── answers ─────────────────────────────────────────────────────────────────

export const ATTEMPTS_PUZZLE = 3;
export const ATTEMPTS_CODING = 5;
export const EXPLANATION_MIN_WORDS = 8;

const words = (s: string) => String(s || '').trim().split(/\s+/).filter(Boolean).length;
export const explanationLongEnough = (s: string) => words(s) >= EXPLANATION_MIN_WORDS;

const normText = (s: string) => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '');
const asNumber = (s: string): number | null => {
  const t = String(s || '').replace(/,/g, '').replace(/[^\d./-]+$/g, '').replace(/^[^\d.-]+/, '').trim();
  if (/^-?\d+\/\d+$/.test(t)) { const [a, b] = t.split('/').map(Number); return b ? a / b : null; }
  const n = Number(t);
  return t !== '' && Number.isFinite(n) ? n : null;
};

/** Whether a final answer matches the question's answer or one of its accepted answers. */
export function answerMatches(format: string, given: string, answer: string, accepted: string[] = []): boolean {
  const g = String(given ?? '').trim();
  if (!g) return false;
  const all = [answer, ...(accepted || [])].filter((x) => x != null && String(x).trim() !== '');
  if (format === 'number') {
    const n = asNumber(g);
    if (n == null) return all.some((a) => normText(a) === normText(g));
    return all.some((a) => {
      const e = asNumber(a);
      if (e == null) return normText(a) === normText(g);
      // As precise as the stored answer: "183.33" accepts 183.333…; "150" needs 150.
      const dp = (String(a).split('.')[1] || '').length;
      return dp ? Math.abs(n - e) <= 0.5 * 10 ** -dp + 1e-9 : Math.abs(n - e) < 1e-9;
    });
  }
  if (format === 'choice') return all.some((a) => String(a).trim() === g);
  return all.some((a) => normText(a) === normText(g));
}

export type StepStatus = 'covered' | 'partial' | 'missing';

/** Key steps covered, 0–1: covered 1, partly ½. */
export const stepScore = (steps: StepStatus[]) =>
  steps.length ? steps.reduce((n, s) => n + (s === 'covered' ? 1 : s === 'partial' ? 0.5 : 0), 0) / steps.length : 0;

/** Share of the day's XP: half for the answer, half for the reasoning. */
export const puzzleShare = (correct: boolean, steps: StepStatus[]) =>
  Math.round(((correct ? 0.5 : 0) + 0.5 * stepScore(steps)) * 100) / 100;

export const codingShare = (passed: number, total: number) =>
  total > 0 && passed >= total ? 1 : Math.round(0.5 * (total > 0 ? passed / total : 0) * 100) / 100;

const STOP = new Set('the a an of to and or is are be it its that this with for in on at by from as so then than into their there they we you your our has have had was were will would can could should must each which what when how why who whom also not no yes all any one two'.split(' '));
const keyWords = (s: string) => String(s || '').toLowerCase().match(/[a-z]{4,}|\d+(?:\.\d+)?/g)?.filter((w) => !STOP.has(w)) || [];

/**
 * A rough check of the key steps when the AI is unavailable: a step counts as covered when most of its
 * important words and numbers appear in the explanation. Deliberately generous — it only ever stands in
 * for the AI check, and a member must not lose XP to an outage.
 */
export function stepsByWords(keySteps: string[], explanation: string): StepStatus[] {
  const have = new Set(keyWords(explanation));
  return keySteps.map((step) => {
    const need = [...new Set(keyWords(step))];
    if (!need.length) return 'covered';
    const hit = need.filter((w) => have.has(w) || [...have].some((h) => h.length > 4 && (h.startsWith(w.slice(0, 5)) || w.startsWith(h.slice(0, 5))))).length / need.length;
    return hit >= 0.6 ? 'covered' : hit >= 0.3 ? 'partial' : 'missing';
  });
}
