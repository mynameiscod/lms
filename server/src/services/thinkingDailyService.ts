import mongoose from 'mongoose';
import ThinkingQuestion from '../models/ThinkingQuestion';
import ThinkingDay, { ThinkingAnswer } from '../models/ThinkingDay';
import StudentGameStats from '../models/StudentGameStats';
import User from '../models/User';
import { GamificationConfig, XpLedger } from '../models/GamificationModels';
import { istToday, ymd } from '../utils/planSchedule';
import { aiComplete } from './aiGateway';
import { runAgainstTests } from './drillService';
import { awardLabDay, labStreakSettingsFor, labDayXp } from './labRewardService';
import { advanceLabStreak, labStreakToday } from '../data/labStreakPolicy';
import {
  LabDailySettings, labDailySettings, dayTypes, codingAccess, CodingAccess, topicsCovered, servingOrder,
  ATTEMPTS_PUZZLE, ATTEMPTS_CODING, explanationLongEnough, EXPLANATION_MIN_WORDS, answerMatches,
  StepStatus, puzzleShare, codingShare, stepsByWords,
} from '../data/thinkingDailyPolicy';

/**
 * The CareerPilot Thinking Lab for members: the day's set, answers, and what they earn.
 * Questions come from the shared bank (ThinkingQuestion); the LMS Thinking Lab is separate.
 */

export const today = () => ymd(istToday());
const oid = (id: string) => new mongoose.Types.ObjectId(id);
const PRACTICE_PER_DAY = 10;

export class LabError extends Error { constructor(public status: number, message: string, public code?: string) { super(message); } }

export async function labDailySettingsFor(tenantId: string): Promise<LabDailySettings> {
  const cfg: any = await GamificationConfig.findOne({ tenantId }).select('labDaily').lean();
  return labDailySettings(cfg?.labDaily);
}

interface Member { tenantId: string; studentId: string; name: string; stage: string; demoIds: string[] | null }

async function member(tenantId: string, studentId: string): Promise<Member> {
  const u: any = await User.findById(studentId).select('firstName lastName passport.stage').lean();
  const { demoContext } = await import('./demoService');
  const demo = await demoContext(studentId);
  return {
    tenantId, studentId, name: [u?.firstName, u?.lastName].filter(Boolean).join(' '),
    stage: String(u?.passport?.stage || 'foundation'),
    demoIds: demo ? (demo.config?.thinkingIds || []).map(String) : null,
  };
}

/** Every unit of the member's roadmap for their year, and whether its day is done. */
async function roadmapUnits(tenantId: string, studentId: string, stage: string) {
  const LearningCurriculum = (await import('../models/LearningCurriculum')).default;
  const DayPlan = (await import('../models/DayPlan')).default;
  const CurriculumEnrollment = (await import('../models/CurriculumEnrollment')).default;
  const { FOUNDATION_JOURNEY_KIND } = await import('./foundationJourneyService');
  const j: any = await LearningCurriculum.findOne({ tenantId, personalizedFor: oid(studentId), adaptiveStage: stage, journeyKind: FOUNDATION_JOURNEY_KIND }).select('_id').lean();
  if (!j) return [];
  const [days, enr]: any = await Promise.all([
    DayPlan.find({ curriculumId: j._id }).select('dayNumber unitCodes title').lean(),
    CurriculumEnrollment.findOne({ tenantId, curriculumId: j._id, studentId: oid(studentId) }).select('completedDays').lean(),
  ]);
  const done = new Set<number>(((enr?.completedDays || []) as number[]).map(Number));
  return (days as any[]).flatMap((d) => (d.unitCodes || []).map((code: string) => ({ code, title: d.title, done: done.has(Number(d.dayNumber)) })));
}

export async function codingFor(m: Member): Promise<CodingAccess> {
  if (m.stage === 'foundation') return codingAccess('foundation', []);
  return codingAccess(m.stage, await roadmapUnits(m.tenantId, m.studentId, m.stage));
}

/** Questions this member has already been given, in any day. */
async function seenIds(m: Member): Promise<mongoose.Types.ObjectId[]> {
  const days: any[] = await ThinkingDay.find({ tenantId: m.tenantId, studentId: oid(m.studentId) }).select('items.questionId practice.questionId').lean();
  return days.flatMap((d) => [...(d.items || []), ...(d.practice || [])].map((i: any) => i.questionId));
}

/**
 * One question of a type for this member: unseen, published, for their year (or every year), easiest
 * first. Falls back to any year, then to any puzzle type, so a member is not left with nothing while the
 * bank grows. Never coding in Year 1, and coding only on topics they have covered.
 */
async function pick(m: Member, type: string, exclude: mongoose.Types.ObjectId[], access: CodingAccess): Promise<any | null> {
  const base: any = { status: 'PUBLISHED', _id: { $nin: exclude } };
  const tries: any[] = [
    { ...base, type, $or: [{ years: m.stage }, { years: { $size: 0 } }] },
    { ...base, type },
    ...(type === 'coding' ? [] : [{ ...base, type: { $in: ['math', 'logical', 'critical'] }, $or: [{ years: m.stage }, { years: { $size: 0 } }] }, { ...base, type: { $in: ['math', 'logical', 'critical'] } }]),
  ];
  for (const q of tries) {
    const rows: any[] = await ThinkingQuestion.find(q).select('type difficulty order number topics years').limit(400).lean();
    const ok = rows.filter((r) => r.type !== 'coding' || (access.open && topicsCovered(r.topics, access.covered)));
    if (ok.length) return servingOrder(ok)[0];
  }
  return null;
}

/** Today's set for a member, choosing it the first time they open the lab today. */
export async function ensureDay(tenantId: string, studentId: string): Promise<{ day: any; m: Member; access: CodingAccess }> {
  const m = await member(tenantId, studentId);
  const date = today();
  const access = await codingFor(m);
  let day: any = await ThinkingDay.findOne({ tenantId, studentId: oid(studentId), date }).lean();

  /*
   * A DEMO ACCOUNT follows its plan live (data/demoPolicy.ts). Questions the admin picks show all at
   * once, and the day is re-synced to the plan on every open: picking more before a college visit shows
   * them straight away, not tomorrow. Answers live per question, so work on a question still in the plan
   * is kept. A year with nothing picked gets the usual daily set — what the plan screen promises — still
   * marked as a demo day, so attempt limits stay open and nothing counts in problem statistics.
   */
  if (m.demoIds) {
    const items = m.demoIds.length ? await planItems(m.demoIds) : [];
    if (items.length) {
      if (day && day.fromPlan && sameItems(day.items || [], items)) return { day, m, access };
      if (day) {
        await ThinkingDay.updateOne({ _id: day._id }, { $set: { items, demo: true, fromPlan: true, stage: m.stage } });
        day = await ThinkingDay.findById(day._id).lean();
      } else {
        day = await upsertDay(m, date, items, { demo: true, fromPlan: true });
      }
      return { day, m, access };
    }
    // Nothing picked (or every pick has since been deleted): the usual set, rebuilt if today's came from the plan.
    // (A day saved empty — from before an empty plan meant "the usual set" — is rebuilt too.)
    if (day && !day.fromPlan && (day.items || []).length) return { day, m, access };
    const usual = await usualItems(m, access);
    if (day) {
      await ThinkingDay.updateOne({ _id: day._id }, { $set: { items: usual, demo: true, fromPlan: false, stage: m.stage } });
      day = await ThinkingDay.findById(day._id).lean();
    } else {
      day = await upsertDay(m, date, usual, { demo: true });
    }
    return { day, m, access };
  }
  if (day) return { day, m, access };

  const { trialAllowsAnother } = await import('./trialService');
  const trialStop = await trialAllowsAnother(tenantId, studentId, 'thinkingLab');
  if (trialStop && !trialStop.ok) throw new LabError(trialStop.status || 403, trialStop.body?.message || 'Your trial has used its Thinking Lab questions.', 'trial_limit');

  const items = await usualItems(m, access);
  day = await upsertDay(m, date, items, {});
  if (items.length) await ThinkingQuestion.updateMany({ _id: { $in: items.map((i) => i.questionId) } }, { $inc: { timesServed: 1 } });
  return { day, m, access };
}

/** The usual daily set for a member's year: the admin's per-day mix, unseen questions, coding only once open. */
async function usualItems(m: Member, access: CodingAccess): Promise<{ questionId: any; type: string }[]> {
  const settings = (await labDailySettingsFor(m.tenantId)).thinking[m.stage] || { perDay: 1, codingPerDay: 0 };
  const dayIndex = await ThinkingDay.countDocuments({ tenantId: m.tenantId, studentId: oid(m.studentId), demo: { $ne: true } });
  const seen = await seenIds(m);
  const items: { questionId: any; type: string }[] = [];
  for (const type of dayTypes(dayIndex, settings, access.open)) {
    const q = await pick(m, type, [...seen, ...items.map((i) => i.questionId)], access)
      // No coding question they can do yet: give a puzzle instead of an empty slot.
      || (type === 'coding' ? await pick(m, 'math', [...seen, ...items.map((i) => i.questionId)], access) : null);
    if (q) items.push({ questionId: q._id, type: q.type });
  }
  return items;
}

/** The demo plan's questions that still exist, in the plan's order. */
async function planItems(planIds: string[]): Promise<{ questionId: any; type: string }[]> {
  const ids = await resolveDemoIds(planIds);
  const qs: any[] = await ThinkingQuestion.find({ _id: { $in: ids } }).select('type').lean();
  const byId = new Map(qs.map((q) => [String(q._id), q.type]));
  const seen = new Set<string>();
  return ids.filter((id) => { const k = String(id); if (!byId.has(k) || seen.has(k)) return false; seen.add(k); return true; })
    .map((id) => ({ questionId: id, type: byId.get(String(id)) as string }));
}

/** Same questions in the same order. */
export const sameItems = (a: { questionId: any }[], b: { questionId: any }[]): boolean =>
  a.length === b.length && a.every((x, i) => String(x.questionId) === String(b[i].questionId));

async function upsertDay(m: Member, date: string, items: any[], flags: { demo?: boolean; fromPlan?: boolean }) {
  // Upsert on the day, so two tabs opening the lab at once still get one set.
  await ThinkingDay.updateOne(
    { tenantId: m.tenantId, studentId: oid(m.studentId), date },
    { $setOnInsert: { tenantId: m.tenantId, studentId: oid(m.studentId), date, stage: m.stage, items, practice: [], ...(flags.demo ? { demo: true } : {}), ...(flags.fromPlan ? { fromPlan: true } : {}) } },
    { upsert: true },
  );
  return ThinkingDay.findOne({ tenantId: m.tenantId, studentId: oid(m.studentId), date }).lean();
}

/** A demo plan may hold ids from the old per-institute bank; they were copied in with `migratedFrom`. */
async function resolveDemoIds(ids: string[]): Promise<mongoose.Types.ObjectId[]> {
  const valid = ids.filter((id) => mongoose.isValidObjectId(id));
  const [direct, copied]: any = await Promise.all([
    ThinkingQuestion.find({ _id: { $in: valid } }).select('_id').lean(),
    ThinkingQuestion.find({ migratedFrom: { $in: valid } }).select('_id migratedFrom').lean(),
  ]);
  const have = new Set((direct as any[]).map((q) => String(q._id)));
  const from = new Map((copied as any[]).map((q) => [String(q.migratedFrom), q._id]));
  return valid.map((id) => (have.has(id) ? oid(id) : from.get(id))).filter(Boolean) as mongoose.Types.ObjectId[];
}

// ── views ───────────────────────────────────────────────────────────────────

/** A question as the member may see it: the answer, key steps and model solution only once finished. */
export function memberQuestion(q: any, a: any | null) {
  const finished = !!a?.finished;
  const coding = q.type === 'coding';
  const max = coding ? ATTEMPTS_CODING : ATTEMPTS_PUZZLE;
  return {
    id: String(q._id), code: `TQ-${String(q.number).padStart(4, '0')}`, type: q.type, subCategory: q.subCategory || '',
    difficulty: q.difficulty, title: q.title, statement: q.statement, imageUrl: q.imageUrl || '',
    estimatedMinutes: q.estimatedMinutes ?? null,
    answerFormat: coding ? null : (q.answerFormat || 'text'),
    choices: coding ? [] : (q.choices || []),
    hintsTotal: (q.hints || []).length,
    hints: (q.hints || []).slice(0, finished ? (q.hints || []).length : (a?.hintsUsed || 0)),
    language: coding ? (q.language || 'python') : null,
    starterCode: coding ? (q.starterCode || '') : null,
    examples: coding ? (q.examples || []) : [],
    visibleTests: coding ? (q.testCases || []).filter((t: any) => !t.hidden).map((t: any) => ({ input: t.input, expectedOutput: t.expectedOutput })) : [],
    keyStepCount: coding ? 0 : (q.keySteps || []).length,
    attemptsAllowed: max,
    state: !a ? 'new' : finished ? (a.correct ? 'solved' : 'finished') : (a.attempts?.length ? 'trying' : 'new'),
    attemptsUsed: a?.attempts?.length || 0,
    last: a?.attempts?.length ? lastAttemptView(a.attempts[a.attempts.length - 1], q, finished) : null,
    bestShare: a?.bestShare || 0,
    xpEarned: a?.xpEarned || 0,
    // Revealed once finished.
    reveal: finished ? {
      answer: coding ? null : q.answer, keySteps: coding ? [] : q.keySteps, explanation: q.explanation || '',
      referenceSolution: coding ? (q.referenceSolution || '') : null,
    } : null,
  };
}

const lastAttemptView = (t: any, q: any, finished: boolean) => ({
  answer: t.answer ?? null, explanation: t.explanation ?? '', code: t.code ?? null, correct: !!t.correct, share: t.share,
  passed: t.passed ?? null, total: t.total ?? null, feedback: t.feedback || '',
  // The step checklist names the steps only once finished; before, it shows how many were covered.
  steps: (t.steps || []).map((s: string, i: number) => ({ status: s, step: finished ? (q.keySteps || [])[i] || '' : '' })),
});

export async function todayView(tenantId: string, studentId: string) {
  const { day, m, access } = await ensureDay(tenantId, studentId);
  const ids = [...(day.items || []), ...(day.practice || [])].map((i: any) => i.questionId);
  const [qs, answers]: any = await Promise.all([
    ThinkingQuestion.find({ _id: { $in: ids } }).lean(),
    ThinkingAnswer.find({ tenantId, studentId: oid(studentId), questionId: { $in: ids } }).lean(),
  ]);
  const qById = new Map((qs as any[]).map((q) => [String(q._id), q]));
  const aById = new Map((answers as any[]).map((a) => [String(a.questionId), a]));
  const view = (list: any[]) => list.map((i) => qById.get(String(i.questionId))).filter(Boolean).map((q: any) => memberQuestion(q, aById.get(String(q._id)) || null));
  const items = view(day.items || []);
  const settings = (await labDailySettingsFor(tenantId)).thinking[m.stage] || { perDay: 1, codingPerDay: 0 };
  return {
    date: day.date, stage: m.stage, demo: !!day.demo,
    items, practice: view(day.practice || []),
    perDay: day.demo ? items.length : settings.perDay,
    done: items.filter((q) => q.state === 'solved' || q.state === 'finished').length,
    coding: { open: access.open, reason: access.reason, basicsDone: access.basicsDone, basicsTotal: access.basicsTotal },
    bankEmpty: !items.length,
  };
}

/** The member's lab header: streak, freezes, XP, today's pay, coding. */
export async function memberSummary(tenantId: string, studentId: string) {
  const sid = oid(studentId);
  const date = today();
  const [gs, settings, dayXp, labXp, paid, solved]: any = await Promise.all([
    StudentGameStats.findOne({ tenantId, studentId }).select('currentStreak longestStreak lastSolvedDate freezes').lean(),
    labStreakSettingsFor(tenantId),
    labDayXp(tenantId, 'thinking'),
    XpLedger.aggregate([{ $match: { tenantId, studentId: sid, eventKey: { $in: ['THINKING_LAB_DAILY_COMPLETED', 'THINKING_LAB_XP_MOVED'] } } }, { $group: { _id: null, n: { $sum: '$amount' } } }]),
    XpLedger.findOne({ tenantId, studentId: sid, eventKey: 'THINKING_LAB_DAILY_COMPLETED', sourceId: date }).select('amount').lean(),
    ThinkingAnswer.countDocuments({ tenantId, studentId: sid, correct: true }),
  ]);
  const view = labStreakToday({ current: gs?.currentStreak || 0, longest: gs?.longestStreak || 0, lastDate: gs?.lastSolvedDate, freezes: gs?.freezes || 0 }, date);
  return {
    streak: view.current, streakAtRisk: view.atRisk, longestStreak: gs?.longestStreak || 0,
    freezes: gs?.freezes || 0, freezeEvery: settings.freezeEvery, freezeMax: settings.freezeMax,
    labXp: labXp[0]?.n || 0, dayXp, paidToday: paid ? paid.amount : 0, solvedTotal: solved,
  };
}

/** The last 35 days, for the streak calendar: done, frozen (a freeze covered it) or nothing. */
export async function streakCalendar(tenantId: string, studentId: string) {
  const since = new Date(istToday()); since.setDate(since.getDate() - 34);
  const [finished, gs]: any = await Promise.all([
    ThinkingAnswer.find({ tenantId, studentId: oid(studentId), finished: true, practice: false, finishedAt: { $gte: since } }).select('date').lean(),
    StudentGameStats.findOne({ tenantId, studentId }).select('frozenDates').lean(),
  ]);
  const done = new Set((finished as any[]).map((a) => a.date));
  const frozen = new Set<string>(gs?.frozenDates || []);
  const out: { date: string; state: 'done' | 'frozen' | 'none' }[] = [];
  for (let i = 34; i >= 0; i--) {
    const d = new Date(istToday()); d.setDate(d.getDate() - i);
    const k = ymd(d);
    out.push({ date: k, state: done.has(k) ? 'done' : frozen.has(k) ? 'frozen' : 'none' });
  }
  return out;
}

// ── answering ───────────────────────────────────────────────────────────────

/** The question, if today's set (or today's practice) holds it for this member. */
async function questionToday(tenantId: string, studentId: string, questionId: string) {
  if (!mongoose.isValidObjectId(questionId)) throw new LabError(404, 'Question not found.');
  const day: any = await ThinkingDay.findOne({ tenantId, studentId: oid(studentId), date: today() }).lean();
  const inSet = (day?.items || []).some((i: any) => String(i.questionId) === questionId);
  const inPractice = (day?.practice || []).some((i: any) => String(i.questionId) === questionId);
  if (!inSet && !inPractice) throw new LabError(404, 'This question is not in today’s set. Open the Thinking Lab again to load today’s questions.');
  const q: any = await ThinkingQuestion.findById(questionId).lean();
  if (!q) throw new LabError(404, 'Question not found.');
  return { q, practice: !inSet, demo: !!day?.demo };
}

async function answerDoc(tenantId: string, studentId: string, questionId: string, practice: boolean) {
  await ThinkingAnswer.updateOne(
    { tenantId, studentId: oid(studentId), questionId: oid(questionId) },
    { $setOnInsert: { tenantId, studentId: oid(studentId), questionId: oid(questionId), date: today(), practice } },
    { upsert: true },
  );
  return ThinkingAnswer.findOne({ tenantId, studentId: oid(studentId), questionId: oid(questionId) });
}

export async function revealHint(tenantId: string, studentId: string, questionId: string) {
  const { q, practice } = await questionToday(tenantId, studentId, questionId);
  const a: any = await answerDoc(tenantId, studentId, questionId, practice);
  if ((a.hintsUsed || 0) >= (q.hints || []).length) throw new LabError(409, 'No more hints for this question.');
  a.hintsUsed = (a.hintsUsed || 0) + 1;
  await a.save();
  return { hints: (q.hints || []).slice(0, a.hintsUsed), hintsTotal: (q.hints || []).length };
}

/**
 * Which key steps an explanation covers. The AI reads it against the steps; if the AI is unavailable the
 * word check stands in (generous on purpose), so an outage never costs a member their XP.
 */
export async function checkSteps(tenantId: string, studentId: string, q: any, answer: string, explanation: string): Promise<{ steps: StepStatus[]; feedback: string }> {
  const steps: string[] = q.keySteps || [];
  if (!steps.length) return { steps: [], feedback: '' };
  try {
    const text = await aiComplete({
      tenantId, studentId, module: 'thinking_lab_steps', product: 'careerpilot', maxTokens: 500,
      system: 'You check a student\'s reasoning against the key steps of a correct solution. Judge meaning, not wording: a step is "covered" if the student clearly made that deduction, "partial" if they hinted at it or made it with a small slip, "missing" otherwise. Be fair and consistent. Output ONLY raw JSON.',
      user: `QUESTION:\n"""${String(q.statement).slice(0, 2500)}"""\n\nKEY STEPS:\n${steps.map((s, i) => `${i + 1}. ${s}`).join('\n')}\n\nSTUDENT'S FINAL ANSWER: ${String(answer || '').slice(0, 200)}\nSTUDENT'S EXPLANATION:\n"""${String(explanation).slice(0, 2500)}"""\n\nReturn {"steps":["covered|partial|missing", ... one per key step in order],"feedback":"one or two encouraging sentences on the reasoning, without giving away the answer"}`,
    });
    const j = JSON.parse(String(text).replace(/^```(?:json)?/i, '').replace(/```$/i, '').trim());
    const got: StepStatus[] = (Array.isArray(j?.steps) ? j.steps : []).map((s: any) => (['covered', 'partial', 'missing'].includes(s) ? s : 'missing'));
    if (got.length === steps.length) return { steps: got, feedback: String(j.feedback || '').slice(0, 400) };
  } catch { /* fall through to the word check */ }
  return { steps: stepsByWords(steps, explanation), feedback: '' };
}

export async function submitAnswer(tenantId: string, studentId: string, questionId: string, body: any) {
  const { q, practice, demo } = await questionToday(tenantId, studentId, questionId);
  const a: any = await answerDoc(tenantId, studentId, questionId, practice);
  if (a.finished) throw new LabError(409, 'You have finished this question.');
  const coding = q.type === 'coding';
  const max = coding ? ATTEMPTS_CODING : ATTEMPTS_PUZZLE;
  if ((a.attempts || []).length >= max && !demo) throw new LabError(409, 'No attempts left on this question.');

  const explanation = String(body?.explanation || '').trim().slice(0, 4000);
  if (!explanationLongEnough(explanation)) throw new LabError(400, `Explain your thinking in at least ${EXPLANATION_MIN_WORDS} words.`);

  let attempt: any;
  if (coding) {
    const code = String(body?.code || '').slice(0, 20000);
    if (!code.trim()) throw new LabError(400, 'Write some code first.');
    const language = String(body?.language || q.language || 'python');
    const run = await runAgainstTests(language, code, q.testCases || []);
    const passed = run.results.filter((r: any) => r.passed).length;
    const total = run.results.length;
    attempt = { code, language, explanation, correct: run.allPassed, steps: [], share: codingShare(passed, total), passed, total, feedback: run.compileError ? 'Your code did not run. Check the error and try again.' : '', at: new Date() };
  } else {
    const given = String(body?.answer ?? '').trim().slice(0, 300);
    if (!given) throw new LabError(400, 'Give your final answer.');
    const correct = answerMatches(q.answerFormat || 'text', given, q.answer || '', q.acceptedAnswers || []);
    const check = await checkSteps(tenantId, studentId, q, given, explanation);
    attempt = { answer: given, explanation, correct, steps: check.steps, share: puzzleShare(correct, check.steps), feedback: check.feedback, at: new Date() };
  }

  a.attempts.push(attempt);
  a.bestShare = Math.max(a.bestShare || 0, attempt.share);
  const finishing = attempt.correct || a.attempts.length >= max;
  if (attempt.correct && !a.correct) {
    a.correct = true;
    if (!demo) await ThinkingQuestion.updateOne({ _id: q._id }, { $inc: { timesSolved: 1 } });
  }
  let reward: any = null;
  if (finishing && !a.finished) {
    a.finished = true;
    a.finishedAt = new Date();
    // Practice is never paid; today's set pays the day once (labRewardService).
    if (!practice) {
      reward = await questionFinished(tenantId, studentId, a.bestShare, String(q._id));
      a.xpEarned = reward.xpNow;
    }
  }
  await a.save();
  return { question: memberQuestion(q, a.toObject()), reward };
}

/**
 * A question in today's set is finished: the lab streak moves (one question done is a streak day) and
 * the day's XP is paid — once a day, at this question's share.
 */
async function questionFinished(tenantId: string, studentId: string, share: number, ref: string) {
  const day = today();
  const settings = await labStreakSettingsFor(tenantId);
  const gs: any = await StudentGameStats.findOneAndUpdate(
    { tenantId, studentId },
    { $setOnInsert: { tenantId, studentId } },
    { new: true, upsert: true },
  );
  const st = advanceLabStreak({ current: gs.currentStreak, longest: gs.longestStreak, lastDate: gs.lastSolvedDate, freezes: gs.freezes || 0 }, day, settings);
  if (st.advanced) {
    gs.currentStreak = st.current; gs.longestStreak = st.longest; gs.lastSolvedDate = st.lastDate; gs.freezes = st.freezes;
    if (st.frozenDates.length) gs.frozenDates = [...(gs.frozenDates || []), ...st.frozenDates].slice(-60);
    await gs.save();
  }
  const award = await awardLabDay({ tenantId, studentId, lab: 'thinking', day, share, ref });
  return {
    xpNow: award.awarded, fullXp: award.fullXp, share, alreadyPaid: award.alreadyPaid, dayStreak: award.dayStreak, streakBonus: award.streakBonus || 0,
    labStreak: { current: st.advanced ? st.current : gs.currentStreak, longest: st.advanced ? st.longest : gs.longestStreak, freezes: st.advanced ? st.freezes : (gs.freezes || 0), earnedFreeze: st.earnedFreeze, usedFreezes: st.frozenDates.length },
  };
}

/** Run coding against the visible tests only, without using an attempt. */
export async function runCode(tenantId: string, studentId: string, questionId: string, body: any) {
  const { q } = await questionToday(tenantId, studentId, questionId);
  if (q.type !== 'coding') throw new LabError(400, 'Only coding questions can be run.');
  const code = String(body?.code || '');
  if (!code.trim()) throw new LabError(400, 'Write some code first.');
  const tests = (q.testCases || []).filter((t: any) => !t.hidden);
  const run = await runAgainstTests(String(body?.language || q.language || 'python'), code, tests.length ? tests : (q.testCases || []).slice(0, 1));
  return {
    compileError: run.compileError || null,
    results: run.results.map((r: any, i: number) => ({ index: i, passed: r.passed, input: tests[i]?.input ?? '', expected: tests[i]?.expectedOutput ?? '' })),
    firstFail: run.compileError ? null : (run.firstFail || null),
  };
}

/** One more question for practice: never paid, at most PRACTICE_PER_DAY a day. */
export async function practiceMore(tenantId: string, studentId: string, type?: string) {
  const { day, m, access } = await ensureDay(tenantId, studentId);
  if ((day.items || []).length && !(await setFinished(tenantId, studentId, day))) {
    throw new LabError(409, 'Finish today’s questions first.');
  }
  if ((day.practice || []).length >= PRACTICE_PER_DAY) throw new LabError(429, `That is ${PRACTICE_PER_DAY} practice questions today. Come back tomorrow.`);
  const want = ['math', 'logical', 'critical', 'coding'].includes(String(type)) ? String(type) : (['math', 'logical', 'critical'][(day.practice || []).length % 3]);
  if (want === 'coding' && !access.open) throw new LabError(403, 'Coding opens once you finish the basics in your roadmap.');
  const q = await pick(m, want, await seenIds(m), access);
  if (!q) throw new LabError(404, 'You have answered every question we have for now. New ones are added regularly.');
  await ThinkingDay.updateOne({ _id: day._id }, { $push: { practice: { questionId: q._id, type: q.type } } });
  await ThinkingQuestion.updateOne({ _id: q._id }, { $inc: { timesServed: 1 } });
  return todayView(tenantId, studentId);
}

async function setFinished(tenantId: string, studentId: string, day: any) {
  const ids = (day.items || []).map((i: any) => i.questionId);
  const n = await ThinkingAnswer.countDocuments({ tenantId, studentId: oid(studentId), questionId: { $in: ids }, finished: true });
  return n >= ids.length;
}

/** A question the member finished on any day, to read again from History. Unfinished ones stay closed. */
export async function finishedQuestion(tenantId: string, studentId: string, questionId: string) {
  if (!mongoose.isValidObjectId(questionId)) throw new LabError(404, 'Question not found.');
  const a: any = await ThinkingAnswer.findOne({ tenantId, studentId: oid(studentId), questionId: oid(questionId) }).lean();
  if (!a?.finished) throw new LabError(404, 'You can review a question once you have finished it.');
  const q: any = await ThinkingQuestion.findById(questionId).lean();
  if (!q) throw new LabError(404, 'Question not found.');
  return { question: memberQuestion(q, a), date: a.date, practice: !!a.practice };
}

/** Finished questions, newest first. */
export async function history(tenantId: string, studentId: string, page = 1) {
  const per = 20;
  const rows: any[] = await ThinkingAnswer.find({ tenantId, studentId: oid(studentId), finished: true })
    .sort({ finishedAt: -1 }).skip((page - 1) * per).limit(per).lean();
  const qs: any[] = await ThinkingQuestion.find({ _id: { $in: rows.map((r) => r.questionId) } }).select('title type difficulty number').lean();
  const byId = new Map(qs.map((q) => [String(q._id), q]));
  return rows.map((r) => {
    const q = byId.get(String(r.questionId));
    return { id: String(r.questionId), title: q?.title || 'Question', type: q?.type || '', difficulty: q?.difficulty || '', date: r.date, correct: r.correct, share: r.bestShare, xpEarned: r.xpEarned, practice: r.practice };
  });
}
