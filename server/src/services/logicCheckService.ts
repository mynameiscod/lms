/**
 * "Think first, then code": before the code editor opens, a coding question's written logic is checked against
 * the problem and its model solution. Used by both Thinking Labs (CareerPilot members and the LMS daily lab).
 *
 *   good     the plan would solve the problem
 *   partial  the right direction, with a gap or a small slip      → the editor still opens
 *   off      does not address the problem (restates it, unrelated, filler, or a different problem)
 *
 * Only `off` keeps the editor locked. The feedback never gives the answer or code away.
 *
 * If the AI is unavailable (or a question has been checked many times already) a word check stands in: the logic
 * has to use several of the problem's own terms and some action words (read, loop, compare, print …). It is
 * generous on purpose, so an outage never locks a student out of the editor.
 */
import { aiComplete } from './aiGateway';

export type LogicVerdict = 'good' | 'partial' | 'off';
export interface LogicResult { verdict: LogicVerdict; ok: boolean; feedback: string; source: 'ai' | 'words' }

/** How many AI checks one student gets on one question; later checks use the word check. */
export const LOGIC_AI_CHECKS = 6;

const STOP = new Set(('the a an and or of to in on for with by is are be it this that from as at into then than if else each every your you ' +
  'will would should can could print prints output input read reads number numbers line lines value values given one two first ' +
  'next using use get gets make makes find finds give gives step steps also just so we i my me our its which when what how').split(/\s+/));
const ACTIONS = /\b(read|take|input|loop|iterate|go through|for each|count|sum|add|total|compare|check|if|else|condition|sort|split|store|keep|track|map|dictionary|list|array|string|reverse|divide|multiply|subtract|remainder|modulo|max|min|largest|smallest|print|output|return|append|increment|until|while)\b/i;

const terms = (s: string) => new Set(String(s || '').toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter((w) => w.length >= 4 && !STOP.has(w)));

/**
 * Pasting the question back is not a plan. Share of the plan's word triples that appear in the question:
 * at or above half, it is mostly the question's own sentences.
 */
export function copiedFromQuestion(logic: string, statement: string): boolean {
  const toks = (x: string) => String(x || '').toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(Boolean);
  const tri = (w: string[]) => { const out: string[] = []; for (let i = 0; i + 2 < w.length; i++) out.push(`${w[i]} ${w[i + 1]} ${w[i + 2]}`); return out; };
  const mine = tri(toks(logic));
  if (mine.length < 3) return false;
  const theirs = new Set(tri(toks(statement)));
  return mine.filter((t) => theirs.has(t)).length / mine.length >= 0.5;
}
const COPIED: LogicResult = {
  verdict: 'off', ok: false, source: 'words',
  feedback: 'That repeats the question. In your own words, say how you would solve it: what you read, what you work out step by step, and what you print.',
};

/** The fallback: does the logic talk about this problem and describe doing something? */
export function logicByWords(logic: string, problemText: string): LogicResult {
  const mine = terms(logic);
  const theirs = terms(problemText);
  let shared = 0;
  mine.forEach((w) => { if (theirs.has(w)) shared++; });
  const acts = ACTIONS.test(logic);
  const ok = shared >= 2 && acts;
  return {
    verdict: ok ? 'partial' : 'off', ok, source: 'words',
    feedback: ok ? 'Now turn your plan into code, one step at a time.'
      : 'Describe how you would solve this problem: what you read, what you work out step by step, and what you print.',
  };
}

export async function judgeLogic(o: {
  tenantId: string; studentId: string; product: 'careerpilot' | 'lms';
  statement: string; reference?: string; explanation?: string; logic: string; aiAllowed?: boolean;
}): Promise<LogicResult> {
  const problemText = `${o.statement}\n${o.explanation || ''}\n${o.reference || ''}`;
  if (copiedFromQuestion(o.logic, o.statement)) return COPIED;
  if (o.aiAllowed === false) return logicByWords(o.logic, problemText);
  try {
    const text = await aiComplete({
      tenantId: o.tenantId, studentId: o.studentId, module: 'thinking_lab_logic', product: o.product, maxTokens: 300,
      system: 'You check a student\'s plan for a coding problem BEFORE they write code. Judge meaning, not wording or grammar. '
        + '"good": the plan would solve the problem. "partial": the right idea with a gap, a missed case or a small slip. '
        + '"off": it does not address this problem — it only restates the question, is unrelated, is filler, or solves something else. '
        + 'Be fair to beginners: a short plain-English plan in the right direction is at least "partial". Never give the answer or code. Output ONLY raw JSON.',
      user: `PROBLEM:\n"""${String(o.statement).slice(0, 2500)}"""\n\n`
        + (o.explanation ? `HOW TO THINK ABOUT IT (for you only):\n"""${String(o.explanation).slice(0, 1500)}"""\n\n` : '')
        + (o.reference ? `MODEL SOLUTION (for you only):\n"""${String(o.reference).slice(0, 2500)}"""\n\n` : '')
        + `STUDENT'S PLAN:\n"""${String(o.logic).slice(0, 2500)}"""\n\n`
        + 'Return {"verdict":"good|partial|off","feedback":"one or two short, encouraging sentences: what is right, and (if partial or off) what to think about next, without revealing the solution"}',
    });
    const j = JSON.parse(String(text).replace(/^```(?:json)?/i, '').replace(/```$/i, '').trim());
    const verdict: LogicVerdict = ['good', 'partial', 'off'].includes(j?.verdict) ? j.verdict : 'partial';
    return { verdict, ok: verdict !== 'off', feedback: String(j?.feedback || '').slice(0, 400), source: 'ai' };
  } catch {
    return logicByWords(o.logic, problemText);
  }
}
