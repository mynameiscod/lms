/**
 * The two daily labs in the weekly report (2026-11-26): what the student was expected to do in the
 * AI Communication Lab and the Thinking Lab that week, what they actually did, and how well.
 *
 * "Expected" days, first that applies:
 *   1. the days an admin SCHEDULED a lab challenge for the student's lab batch that week;
 *   2. otherwise, when the institute runs the Daily Practice Pass, every counted working day on
 *      which the pass asks for that lab;
 *   3. otherwise none — what the student did is shown as practice and never marked missed.
 */
import CommunicationSchedule from '../models/CommunicationSchedule';
import CommunicationAttempt from '../models/CommunicationAttempt';
import ScheduledChallenge from '../models/ScheduledChallenge';
import DailyChallenge from '../models/DailyChallenge';

export type ExpectedSource = 'scheduled' | 'practice' | 'none';

export interface LabDay { date: string; weekday: string; expected: boolean; done: boolean }

interface LabCommon {
  source: ExpectedSource;
  days: LabDay[];
  expectedDays: number;
  /** Expected days that were done. */
  doneDays: number;
  missedDays: number;
  /** Days with any activity at all, expected or not. */
  activeDays: number;
}

export interface CommunicationWeek extends LabCommon {
  recordings: number;
  avgScore: number | null;
  lastWeekAvg: number | null;
  skills: { label: string; score: number }[];
  wordsPerMinute: number | null;
  fillersPerRecording: number | null;
  strength: string;
  improve: string;
  focus: string;
}

export interface ThinkingWeek extends LabCommon {
  attempted: number;
  solved: number;
  avgScore: number | null;
  difficulty: { easy: number; medium: number; hard: number };
  hintsUsed: number;
  strength: string;
  weakness: string;
}

/** Practice-pass days as the weekly report already holds them. */
export interface PracticeDayLite { date: string; excused: string | null; required: Record<string, number> }

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const weekdayOf = (ymd: string) => WEEKDAYS[new Date(`${ymd}T00:00:00Z`).getUTCDay()];
const avg = (xs: number[]) => (xs.length ? Math.round(xs.reduce((s, x) => s + x, 0) / xs.length) : null);
const clip = (s: unknown, n = 160) => {
  const t = String(s || '').replace(/\s+/g, ' ').trim();
  return t.length > n ? `${t.slice(0, n - 1).trimEnd()}…` : t;
};

/** The 7 'YYYY-MM-DD' dates of the week, Monday first. */
export function weekDates(startYmd: string): string[] {
  const out: string[] = [];
  const base = new Date(`${startYmd}T00:00:00Z`);
  for (let i = 0; i < 7; i++) {
    const d = new Date(base); d.setUTCDate(d.getUTCDate() + i);
    out.push(d.toISOString().slice(0, 10));
  }
  return out;
}

function expectedFor(
  scheduled: Set<string>, practice: PracticeDayLite[] | null, key: 'communication' | 'thinking_lab',
): { source: ExpectedSource; dates: Set<string> } {
  if (scheduled.size) return { source: 'scheduled', dates: scheduled };
  if (practice) {
    const dates = new Set(practice.filter((d) => !d.excused && (d.required?.[key] || 0) > 0).map((d) => d.date));
    if (dates.size) return { source: 'practice', dates };
  }
  return { source: 'none', dates: new Set() };
}

function tally(dates: string[], expected: Set<string>, doneDates: Set<string>): Omit<LabCommon, 'source'> {
  const days = dates.map((date) => ({ date, weekday: weekdayOf(date), expected: expected.has(date), done: doneDates.has(date) }));
  const expectedDays = days.filter((d) => d.expected).length;
  const doneDays = days.filter((d) => d.expected && d.done).length;
  return { days, expectedDays, doneDays, missedDays: expectedDays - doneDays, activeDays: days.filter((d) => d.done).length };
}

/** The most common non-empty value, newest first on ties. */
function mostCommon(values: string[]): string {
  const counts = new Map<string, number>();
  for (const v of values) if (v) counts.set(v, (counts.get(v) || 0) + 1);
  let best = ''; let n = 0;
  for (const [v, c] of counts) if (c > n) { best = v; n = c; }
  return best;
}

const commScore = (a: any): number | null => {
  if (typeof a.overriddenScore === 'number') return a.overriddenScore;
  const s = a.evaluation?.overallScore;
  return typeof s === 'number' ? s : null;
};

export async function communicationWeek(
  tenantId: string, studentId: string, labBatchId: any, dates: string[], practice: PracticeDayLite[] | null,
): Promise<CommunicationWeek> {
  const first = dates[0], last = dates[6];
  const prev = weekDates(new Date(Date.parse(`${first}T00:00:00Z`) - 7 * 86_400_000).toISOString().slice(0, 10));
  const [sched, attempts, prevAttempts] = await Promise.all([
    labBatchId ? CommunicationSchedule.find({ tenantId, batchId: labBatchId, date: { $gte: first, $lte: last } }).select('date').lean() : [],
    CommunicationAttempt.find({ tenantId, studentId, status: 'completed', practiceDate: { $gte: first, $lte: last } })
      .select('practiceDate evaluation overriddenScore wordsPerMinute createdAt').sort({ createdAt: -1 }).lean(),
    CommunicationAttempt.find({ tenantId, studentId, status: 'completed', practiceDate: { $gte: prev[0], $lte: prev[6] } })
      .select('evaluation overriddenScore').lean(),
  ]);

  const { source, dates: expected } = expectedFor(new Set((sched as any[]).map((s) => s.date)), practice, 'communication');
  const doneDates = new Set((attempts as any[]).map((a) => a.practiceDate));
  const evaluated = (attempts as any[]).filter((a) => a.evaluation);
  const skill = (label: string, k: string) => {
    const v = avg(evaluated.map((a) => a.evaluation?.[k]).filter((x: any) => typeof x === 'number'));
    return v === null ? null : { label, score: v };
  };
  const wpm = (attempts as any[]).map((a) => a.evaluation?.speakingSpeed?.wordsPerMinute ?? a.wordsPerMinute).filter((x: any) => typeof x === 'number' && x > 0);
  const fillers = evaluated.map((a) => a.evaluation?.fillerWords?.total).filter((x: any) => typeof x === 'number');

  return {
    source,
    ...tally(dates, expected, doneDates),
    recordings: attempts.length,
    avgScore: avg((attempts as any[]).map(commScore).filter((x): x is number => x !== null)),
    lastWeekAvg: avg((prevAttempts as any[]).map(commScore).filter((x): x is number => x !== null)),
    skills: [skill('Clarity', 'clarityScore'), skill('Fluency', 'fluencyScore'), skill('Grammar', 'grammarScore'), skill('Confidence', 'confidenceScore')]
      .filter((x): x is { label: string; score: number } => !!x),
    wordsPerMinute: avg(wpm),
    fillersPerRecording: fillers.length ? Math.round((fillers.reduce((s: number, x: number) => s + x, 0) / fillers.length) * 10) / 10 : null,
    strength: clip(mostCommon(evaluated.map((a) => a.evaluation?.strengths?.[0] || ''))),
    improve: clip(mostCommon(evaluated.map((a) => a.evaluation?.areasToImprove?.[0] || ''))),
    focus: clip(evaluated.find((a) => a.evaluation?.nextPracticeFocus)?.evaluation?.nextPracticeFocus || '', 200),
  };
}

const DONE_THINKING = (c: any) => c.passed || c.status === 'solved' || c.status === 'submitted';

export async function thinkingWeek(
  tenantId: string, studentId: string, labBatchId: any, dates: string[], practice: PracticeDayLite[] | null,
): Promise<ThinkingWeek> {
  const first = dates[0], last = dates[6];
  const [sched, challenges] = await Promise.all([
    labBatchId ? ScheduledChallenge.find({ tenantId, batchId: labBatchId, date: { $gte: first, $lte: last } }).select('date').lean() : [],
    DailyChallenge.find({ tenantId, studentId, date: { $gte: first, $lte: last } })
      .select('date status passed score difficulty hintsUsed aiFeedback updatedAt').sort({ updatedAt: -1 }).lean(),
  ]);

  const { source, dates: expected } = expectedFor(new Set((sched as any[]).map((s) => s.date)), practice, 'thinking_lab');
  const done = (challenges as any[]).filter(DONE_THINKING);
  const difficulty = { easy: 0, medium: 0, hard: 0 };
  for (const c of done) {
    const k = String(c.difficulty || 'easy').toLowerCase() as keyof typeof difficulty;
    if (k in difficulty) difficulty[k]++;
  }
  const withFeedback = done.filter((c) => c.aiFeedback);

  return {
    source,
    ...tally(dates, expected, new Set(done.map((c) => c.date))),
    attempted: done.length,
    solved: done.filter((c) => c.passed || c.status === 'solved').length,
    avgScore: avg(done.map((c) => c.score).filter((x: any) => typeof x === 'number')),
    difficulty,
    hintsUsed: (challenges as any[]).reduce((s, c) => s + (c.hintsUsed || 0), 0),
    strength: clip(mostCommon(withFeedback.map((c) => c.aiFeedback?.strengths?.[0] || ''))),
    weakness: clip(mostCommon(withFeedback.map((c) => c.aiFeedback?.weaknesses?.[0] || ''))),
  };
}

/**
 * A lab's part of the overall score, or null when nothing was expected (left out of the score).
 * Completion × quality: every expected day skipped counts as 0; quality is the AI score when there
 * is one, otherwise doing it is what counts.
 */
export function labScore(w: LabCommon & { avgScore: number | null }): number | null {
  if (!w.expectedDays) return null;
  const completion = w.doneDays / w.expectedDays;
  return Math.round(completion * (w.avgScore ?? 100));
}
