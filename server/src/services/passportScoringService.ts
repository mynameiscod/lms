// Deterministic Career Readiness scoring — no per-user AI (cheap, scales). Given the
// question bank + the student's answers, produces the Career Score, category scores,
// level, strengths/weaknesses, recommended pathway, and a 7-day roadmap preview.

import { PASSPORT_CATEGORIES } from '../models/PassportAssessment';
import { IPassportPathway } from '../models/PassportContent';
import { matchPathway } from './pathwayMatchService';

export const LEVELS = [
  { min: 0,  key: 'explorer',        label: 'Career Explorer' },
  { min: 30, key: 'foundation',      label: 'Foundation Required' },
  { min: 45, key: 'starter',         label: 'Career Starter' },
  { min: 60, key: 'builder',         label: 'Skill Builder' },
  { min: 75, key: 'internship_ready',label: 'Internship Ready' },
  { min: 85, key: 'placement_ready', label: 'Placement Ready' },
];

export function levelFor(score: number) {
  let cur = LEVELS[0];
  for (const l of LEVELS) if (score >= l.min) cur = l;
  return cur;
}

/**
 * Labels for the four original hard-coded pathways.
 *
 * Only reached when a tenant has no matching rules AND no pathway row for the key — i.e.
 * the pre-rules world. Real labels come from PassportContent, which is the one place an
 * admin can edit them; a second list here is how a renamed pathway used to keep showing
 * its old name on the result page.
 */
const LEGACY_LABELS: Record<string, string> = {
  software_dev: 'Software Development Foundation',
  data_analytics: 'Data Analytics Foundation',
  ai_ready: 'AI-Ready Student',
  it_bridge: 'IT Career Bridge',
};

/** The pre-rules assignment, preserved verbatim so un-ruled tenants behave as before. */
function legacyPathwayFor(careerGoal: string | undefined, cats: { key: string; score: number }[]): string {
  const goal = (careerGoal || '').toLowerCase();
  if (goal.includes('data')) return 'data_analytics';
  if (goal.includes('ai')) return 'ai_ready';
  if (goal.includes('software') || goal.includes('develop')) return 'software_dev';
  const tech = cats.find(c => c.key === 'technical')?.score || 0;
  return tech >= 50 ? 'software_dev' : 'it_bridge';
}

interface ScoredAnswer { questionId: string; category: string; chosen: number }
interface Question { _id?: any; category: string; options: string[]; correctIndex: number; weight: number; selfReport?: boolean }

/** Score a category 0–100 from its answered questions. */
function categoryScore(qs: Question[], answers: Map<string, number>): number {
  if (!qs.length) return 0;
  let got = 0, max = 0;
  for (const q of qs) {
    const w = q.weight || 1;
    max += w;
    const chosen = answers.get(String(q._id));
    if (chosen === undefined || chosen < 0) continue;
    if (q.selfReport || q.correctIndex < 0) {
      // self-report: later option = more readiness → fraction of the max option index
      const n = Math.max(1, (q.options?.length || 1) - 1);
      got += w * (chosen / n);
    } else if (chosen === q.correctIndex) {
      got += w;
    }
  }
  return max > 0 ? Math.round((got / max) * 100) : 0;
}

export function scoreAttempt(
  questions: Question[],
  answers: ScoredAnswer[],
  // `categories` is passed in rather than imported so an admin-defined list scores
  // correctly. Falling back to the constant keeps every existing caller working.
  ctx: {
    careerGoal?: string;
    categories?: { key: string; label: string; weight: number }[];
    // Matching axes and the rules themselves are passed in rather than loaded here, so
    // this stays a pure function the preview and re-evaluate screens can run over any
    // member without touching the database.
    stage?: string | null;
    background?: string | null;
    pathways?: IPassportPathway[];
  } = {},
) {
  const ansMap = new Map<string, number>(answers.map(a => [String(a.questionId), a.chosen]));

  const cats = ctx.categories?.length ? ctx.categories : PASSPORT_CATEGORIES;

  // Only categories this member was ACTUALLY ASKED about. A category with no questions
  // on the paper scores 0 through no fault of theirs, and averaging that 0 in drags the
  // Career Score down: the moment an admin adds a category, every score falls until
  // questions exist for it. It would also plot a false 0 on the result page's radar,
  // which reads as "you are terrible at this" rather than "we never asked".
  const categoryScores = cats
    .map(c => ({ c, qs: questions.filter(q => q.category === c.key) }))
    .filter(x => x.qs.length > 0)
    .map(({ c, qs }) => ({
      key: c.key, label: c.label,
      score: categoryScore(qs, ansMap),
      weight: c.weight ?? 1,
    }));

  // Weighted Career Score
  const totW = categoryScores.reduce((s, c) => s + c.weight, 0);
  const careerScore = Math.round(categoryScores.reduce((s, c) => s + c.score * c.weight, 0) / (totW || 1));

  const lvl = levelFor(careerScore);
  const sorted = [...categoryScores].sort((a, b) => b.score - a.score);
  const strengths = sorted.slice(0, 2).map(c => c.label);
  const weaknesses = sorted.slice(-2).map(c => c.label);

  // Pathway: admin-authored matching rules, evaluated against everything we now know
  // about this member — including the scores computed just above, which is why this sits
  // here rather than at the start.
  const matched = matchPathway(ctx.pathways || [], {
    careerGoal: ctx.careerGoal,
    stage: ctx.stage,
    background: ctx.background,
    careerScore,
    categoryScores: categoryScores.map(c => ({ key: c.key, score: c.score })),
  });

  // The legacy rules, kept as a fallback for one case only: a tenant whose pathways carry
  // no rules at all, where dropping to `it_bridge` for everybody would be a silent
  // downgrade of an assignment that used to work.
  const pathway = matched.pathway?.key || legacyPathwayFor(ctx.careerGoal, categoryScores);
  const pathwayLabel = matched.pathway?.label
    || (ctx.pathways || []).find(p => p.key === pathway)?.label
    || LEGACY_LABELS[pathway]
    || 'IT Career Bridge';

  // 7-day preview: seed from the two weakest categories.
  const weakKeys = sorted.slice(-2).map(c => c.key);
  const weekPreview = build7Day(weakKeys, pathway);

  return {
    careerScore,
    level: lvl.label, levelKey: lvl.key,
    categoryScores: categoryScores.map(({ key, label, score }) => ({ key, label, score })),
    strengths, weaknesses,
    pathway, pathwayLabel,
    /** How the pathway was reached — surfaced in the admin trace, ignored by students. */
    pathwayVia: matched.via,
    weekPreview,
  };
}

function build7Day(weakKeys: string[], pathway: string): { day: number; title: string; detail: string }[] {
  const byCat: Record<string, { title: string; detail: string }[]> = {
    career_clarity:    [{ title: 'Define your target role', detail: 'Write down 1 role + 3 skills it needs.' }],
    aptitude:          [{ title: 'Aptitude warm-up', detail: '10 quantitative questions.' }],
    logical_reasoning: [{ title: 'Reasoning puzzles', detail: '10 series & pattern questions.' }],
    technical:         [{ title: 'Programming basics', detail: 'Variables, loops, conditionals — 1 lesson + 2 MCQs.' }],
    communication:     [{ title: 'Self-introduction', detail: 'Record a 2-minute intro; get AI feedback.' }],
    employability:     [{ title: 'Resume kickoff', detail: 'Fill your name, education, and 3 skills.' }],
  };
  const base = [
    { title: 'Your Career Snapshot', detail: 'Review your Career Score & focus areas.' },
    ...(weakKeys[0] && byCat[weakKeys[0]] ? byCat[weakKeys[0]] : [{ title: 'Foundations', detail: 'Start your pathway basics.' }]),
    ...(weakKeys[1] && byCat[weakKeys[1]] ? byCat[weakKeys[1]] : [{ title: 'Practice', detail: 'A short daily practice.' }]),
    { title: 'First coding practice', detail: 'Solve one beginner problem.' },
    { title: 'Communication rep', detail: 'One speaking or writing task.' },
    { title: 'Aptitude set', detail: '10 timed questions.' },
    { title: 'Weekly review', detail: 'See what improved + set next week.' },
  ];
  return base.slice(0, 7).map((d, i) => ({ day: i + 1, ...d }));
}
