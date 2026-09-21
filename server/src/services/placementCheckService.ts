/**
 * The placement check: a paper a student asks for on a topic they believe they already know.
 *
 * ── WHY IT EXISTS ─────────────────────────────────────────────────────────────────────────
 *
 * A beginner and somebody who has been programming for two years were being given the same
 * ninety days, because one entry assessment spread across dozens of skills can never produce
 * enough evidence on any single skill to be believed. The plan had no way to find out that a
 * topic was already theirs, so it taught it anyway.
 *
 * This is that way: four fresh questions per skill on one topic, marked the same way everything
 * else is marked, written as ordinary observations. The composer then does what it already does
 * when it believes a skill is held — it stops teaching it — and the days ahead are recomposed.
 *
 * ── WHY IT CANNOT BE GAMED INTO A SHORTCUT ────────────────────────────────────────────────
 *
 *  · Its evidence is UNDERSTANDING, not DIAGNOSTIC. Recognising the right answer among four is
 *    not writing the code, so on its own this check tops out at STANDARD — exactly what
 *    suppressing a foundation, guided or standard-depth lesson needs, and never enough to skip
 *    the practice and projects that REVISION and VERIFIED stand for.
 *  · It is weighted 0.8, so four questions buy confidence rather than three, and no paper this
 *    size can reach HIGH.
 *  · Questions come from facts the student has not already been asked. A check that re-asks the
 *    entry assessment measures memory, and the reward here is skipping the teaching.
 *  · One sitting per topic per cooldown, and a topic already under way cannot be tested out of.
 *  · Evidence is added, never replaced, so a retake is blended rather than substituted.
 *
 * Nothing here marks a topic "done" on the plan. It records what the student demonstrated; the
 * plan is recomposed from that, like every other piece of evidence.
 */

import mongoose from 'mongoose';
import PersonalizedAssessment from '../models/PersonalizedAssessment';
import CurriculumLearningUnit from '../models/CurriculumLearningUnit';
import CareerSkill from '../models/CareerSkill';
import CurriculumEnrollment from '../models/CurriculumEnrollment';
import LearningCurriculum from '../models/LearningCurriculum';
import DayPlan from '../models/DayPlan';
import { buildPersonalizedAssessment, seenFactKeysFor, distinctPrimaryCount } from './personalizedAssessmentService';
import { findEvidenceCandidates } from './skillEvidenceService';
import { resolveAssessmentPolicy } from './assessmentPolicyService';
import { gradeSubmittedAnswers } from './assessmentAnswerGradingService';
import { loadItems } from './skillEvidenceSourceRegistry';
import { projectModuleAssessment } from './moduleAssessmentEvidenceService';
import { publish } from './adaptiveCurriculumEvents';
import { FOUNDATION_JOURNEY_KIND } from './foundationJourneyService';

/** Four per skill: at 0.8 a piece that is weight 3.2, just past the line where a belief is believed. */
export const ITEMS_PER_SKILL = 4;
/** A topic is a handful of skills; more than this is a module, and a different conversation. */
export const MAX_SKILLS = 5;
/** Long enough that a second sitting is a decision, not a reflex. */
export const COOLDOWN_DAYS = 14;

export type PlacementRefusal =
  | 'NO_JOURNEY' | 'TOPIC_NOT_IN_PLAN' | 'TOPIC_STARTED' | 'NOTHING_MEASURABLE'
  | 'COOLDOWN_ACTIVE' | 'ASSESSMENT_IN_PROGRESS' | 'NOT_ENOUGH_FRESH_QUESTIONS';

export interface PlacementAvailability {
  available: boolean;
  topicCode: string;
  topicTitle: string | null;
  /** Days of this topic still ahead of the student — what passing could save them. */
  daysAhead: number;
  skillKeys: string[];
  questions: number;
  refused?: PlacementRefusal;
  message?: string;
  /** When a cooldown is what stands in the way. */
  availableAt?: string | null;
}

/**
 * The topic as this student's own journey holds it: which days are still ahead, and which skills
 * those days teach. Read from the plan, never from the curriculum at large — a day they have
 * already done is not a day anybody can test out of, and a day they were never given is not
 * something to examine them on.
 */
async function topicInPlan(tenantId: string, studentId: string, topicCode: string): Promise<{
  found: boolean; daysAhead: number; unitCodes: string[]; title: string | null;
}> {
  const sid = new mongoose.Types.ObjectId(studentId);
  const curriculum: any = await LearningCurriculum.findOne({
    tenantId, personalizedFor: sid, adaptiveStage: 'foundation', journeyKind: FOUNDATION_JOURNEY_KIND,
  }).select('_id').lean();
  if (!curriculum) return { found: false, daysAhead: 0, unitCodes: [], title: null };

  const [days, enrollment] = await Promise.all([
    DayPlan.find({ curriculumId: curriculum._id, topicId: topicCode })
      .select('dayNumber primaryUnitCode title').sort({ dayNumber: 1 }).lean() as any,
    CurriculumEnrollment.findOne({ tenantId, curriculumId: curriculum._id, studentId: sid })
      .select('completedDays currentDay').lean() as any,
  ]);
  if (!(days as any[]).length) return { found: false, daysAhead: 0, unitCodes: [], title: null };

  const done = new Set<number>(((enrollment?.completedDays || []) as number[]).map(Number));
  const current = Number(enrollment?.currentDay || 1);
  const ahead = (days as any[]).filter(d => !done.has(Number(d.dayNumber)) && Number(d.dayNumber) > current);

  return {
    found: true,
    daysAhead: ahead.length,
    unitCodes: ahead.map(d => String(d.primaryUnitCode || '')).filter(Boolean),
    title: (days as any[])[0]?.title || null,
  };
}

/**
 * The topic a day of this student's own plan belongs to.
 *
 * The member asks about a DAY, never a topic code: codes are internal and stay off the wire, and
 * resolving the day here means nobody can ask to be examined on a topic their plan does not hold.
 */
export async function topicCodeForDay(tenantId: string, studentId: string, day: number): Promise<string | null> {
  if (!Number.isInteger(day) || day < 1) return null;
  const curriculum: any = await LearningCurriculum.findOne({
    tenantId, personalizedFor: new mongoose.Types.ObjectId(studentId), adaptiveStage: 'foundation', journeyKind: FOUNDATION_JOURNEY_KIND,
  }).select('_id').lean();
  if (!curriculum) return null;
  const plan: any = await DayPlan.findOne({ curriculumId: curriculum._id, dayNumber: day }).select('topicId').lean();
  return plan?.topicId ? String(plan.topicId) : null;
}

/** Lesson depths a placement check can lift a student past. Its evidence never rises above STANDARD. */
const LIFTABLE_DEPTHS = new Set(['FOUNDATION', 'GUIDED', 'STANDARD']);
const LESSON_TYPES = new Set(['CONCEPT', 'WORKED_EXAMPLE']);

/**
 * What a placement check on these days can honestly ask about, and whether passing it could change anything.
 *
 * A lesson leaves the plan only when EVERY skill it teaches is reliably shown (knownInstruction). So a
 * skill with no questions of its own is not a smaller check — it is a lesson that can never be taken
 * out, however well the student answers. The scope is therefore built from the lessons ahead whose
 * every skill has enough PRIMARY questions of its own, and a topic with no such lesson is not offered:
 * a student who scores 100% and keeps every day has been handed a test that could not pay out.
 *
 * Questions are counted the way the paper builder counts them — distinct PRIMARY questions for that
 * exact skill — so what is promised here is what the builder can fill.
 */
async function placementScope(tenantId: string, unitCodes: string[]): Promise<{ skills: string[]; liftable: number }> {
  if (!unitCodes.length) return { skills: [], liftable: 0 };
  const units = await CurriculumLearningUnit.find({ tenantId, unitCode: { $in: unitCodes } })
    .select('unitCode unitType skillKeys defaultDepth suitableStates').lean() as any[];
  const order = new Map(unitCodes.map((c, i) => [String(c).toUpperCase(), i]));
  const lessons = units
    .filter(u => LESSON_TYPES.has(String(u.unitType))
      && !(u.suitableStates || []).length
      && LIFTABLE_DEPTHS.has(String(u.defaultDepth || 'STANDARD'))
      && (u.skillKeys || []).length)
    .sort((a, b) => (order.get(String(a.unitCode).toUpperCase()) ?? 0) - (order.get(String(b.unitCode).toUpperCase()) ?? 0));
  const keys = [...new Set(lessons.flatMap(u => (u.skillKeys || []).map((k: string) => String(k).toUpperCase())))];
  if (!keys.length) return { skills: [], liftable: 0 };

  const [assessable, pools] = await Promise.all([
    CareerSkill.find({ key: { $in: keys }, assessable: { $ne: false }, active: { $ne: false }, nodeType: { $ne: 'GROUP' } })
      .select('key').lean() as Promise<any[]>,
    findEvidenceCandidates(tenantId, { skillKeys: keys, contribution: 'PRIMARY', audience: { roleKey: 'FOUNDATION' } }),
  ]);
  const real = new Set(assessable.map(r => String(r.key).toUpperCase()));
  const measurable = new Set(pools
    .filter(p => real.has(String(p.skillKey).toUpperCase())
      && distinctPrimaryCount(p.items.map((i: any) => ({
        sourceType: i.sourceType, sourceId: i.sourceId, difficulty: i.difficulty,
        contribution: i.contribution, factKeys: i.factKeys,
      })) as any) >= ITEMS_PER_SKILL)
    .map(p => String(p.skillKey).toUpperCase()));

  /* Lessons in plan order, while their skills fit in one paper. */
  const scope = new Set<string>();
  let liftable = 0;
  for (const u of lessons) {
    const need = (u.skillKeys || []).map((k: string) => String(k).toUpperCase());
    if (!need.every((k: string) => measurable.has(k))) continue;
    const next = new Set([...scope, ...need]);
    if (next.size > MAX_SKILLS) continue;
    need.forEach((k: string) => scope.add(k));
    liftable++;
  }
  return { skills: [...scope], liftable };
}

/** The last placement check this student finished, for the cooldown. */
/**
 * The cooldown is per topic. What it guards against is sitting the same topic until the paper comes
 * up favourable; a student who already knows two topics has every right to test out of both in a week.
 */
async function lastCompleted(tenantId: string, studentId: string, topicCode: string): Promise<Date | null> {
  const row: any = await PersonalizedAssessment.findOne({
    tenantId, studentId, purpose: 'PLACEMENT_CHECK', status: 'SUBMITTED', placementTopicCode: topicCode,
  }).sort({ submittedAt: -1 }).select('submittedAt').lean();
  return row?.submittedAt ? new Date(row.submittedAt) : null;
}

export async function placementCheckAvailability(
  tenantId: string, studentId: string, topicCode: string,
): Promise<PlacementAvailability> {
  const base = { available: false, topicCode, topicTitle: null as string | null, daysAhead: 0, skillKeys: [] as string[], questions: 0 };

  const topic = await topicInPlan(tenantId, studentId, topicCode);
  if (!topic.found) {
    return { ...base, refused: 'TOPIC_NOT_IN_PLAN', message: 'That topic is not part of your plan.' };
  }
  base.topicTitle = topic.title;
  base.daysAhead = topic.daysAhead;

  if (!topic.daysAhead) {
    return { ...base, refused: 'TOPIC_STARTED', message: 'You are already working through this topic, so there is nothing left to test out of.' };
  }

  const { skills } = await placementScope(tenantId, topic.unitCodes);
  base.skillKeys = skills;
  base.questions = skills.length * ITEMS_PER_SKILL;
  if (!skills.length) {
    return { ...base, refused: 'NOTHING_MEASURABLE', message: 'No lesson in this topic can be tested out of yet.' };
  }

  const open = await PersonalizedAssessment.countDocuments({ tenantId, studentId, status: 'IN_PROGRESS' });
  if (open) {
    return { ...base, refused: 'ASSESSMENT_IN_PROGRESS', message: 'Finish the paper you already have open first.' };
  }

  const last = await lastCompleted(tenantId, studentId, topicCode);
  if (last) {
    const nextAt = new Date(last.getTime() + COOLDOWN_DAYS * 24 * 60 * 60 * 1000);
    if (nextAt > new Date()) {
      return {
        ...base, refused: 'COOLDOWN_ACTIVE', availableAt: nextAt.toISOString(),
        message: `You can test out of this topic again after ${nextAt.toDateString()}.`,
      };
    }
  }

  return { ...base, available: true, message: `${skills.length * ITEMS_PER_SKILL} questions. Pass and the days ahead are rebuilt without what you already know.` };
}

export interface PlacementStart {
  ok: boolean;
  refused?: PlacementRefusal;
  message?: string;
  assessmentId?: string;
  topicCode?: string;
  skillKeys?: string[];
  questions?: number;
}

export async function startPlacementCheck(input: {
  tenantId: string; studentId: string; topicCode: string;
}): Promise<PlacementStart> {
  const { tenantId, studentId, topicCode } = input;

  const availability = await placementCheckAvailability(tenantId, studentId, topicCode);
  if (!availability.available) {
    return { ok: false, refused: availability.refused, message: availability.message };
  }
  const scope = availability.skillKeys;

  const prior = await PersonalizedAssessment.find({ tenantId, studentId })
    .select('attemptNumber items').sort({ attemptNumber: -1 }).lean() as any[];
  const priorItems = prior.flatMap(p => (p.items || []).map((i: any) => ({
    sourceType: String(i.sourceType), sourceId: String(i.sourceId),
  })));
  const attemptNumber = (prior[0]?.attemptNumber || 0) + 1;

  const policy = await resolveAssessmentPolicy(tenantId, 'foundation');

  const built = await buildPersonalizedAssessment({
    tenantId, studentId, stage: 'foundation', roleKey: 'FOUNDATION',
    roleSkillKeys: scope,
    blueprintVersion: 0,
    attemptNumber,
    seenSourceIds: priorItems.map(i => i.sourceId),
    /* The half that matters: a fact they have already been asked measures memory, not mastery. */
    seenFactKeys: await seenFactKeysFor(tenantId, priorItems),
    policy: {
      ...policy,
      skillSlots: scope.length * ITEMS_PER_SKILL,
      maxSkills: scope.length,
      /* Only the topic's own skills. With expansion on, a skill short of questions was quietly
         replaced by its prerequisite, and the student's answers were recorded against a skill
         the check was never about — so the topic's lessons could not leave however well they did. */
      prerequisiteDepth: 0,
      preferFoundationalSkills: false,
      minItemsPerSkill: ITEMS_PER_SKILL,
      maxItemsPerSkill: ITEMS_PER_SKILL,
      /* Harder than the entry paper: a sixty-per-cent-easy mix is the wrong instrument for
         asking somebody to prove they can skip the teaching. */
      difficultyMix: { EASY: 0.2, MEDIUM: 0.5, HARD: 0.3 },
    } as any,
  } as any);

  if (!built.ok) {
    return {
      ok: false, refused: 'NOT_ENOUGH_FRESH_QUESTIONS',
      message: built.message
        || 'There are not enough unseen questions left to build a fair check on this topic yet.',
    };
  }

  /**
   * THE PAPER IS CHECKED, NOT TRUSTED. Every question must be about one of the skills in scope, and
   * every skill must have its full four. A paper that fell short — unseen questions ran out, or the
   * builder filled a slot some other way — cannot prove what it was built to, so it is not offered.
   */
  const perSkill = new Map<string, number>();
  const offTopic = (built.items || []).filter((i: any) => !scope.includes(String(i.skillKey || '').toUpperCase()));
  for (const i of built.items || []) {
    const k = String((i as any).skillKey || '').toUpperCase();
    perSkill.set(k, (perSkill.get(k) || 0) + 1);
  }
  if (offTopic.length || scope.some(k => (perSkill.get(k) || 0) < ITEMS_PER_SKILL)) {
    return {
      ok: false, refused: 'NOT_ENOUGH_FRESH_QUESTIONS',
      message: 'There are not enough unseen questions left to build a fair check on this topic yet.',
    };
  }

  const created: any = await PersonalizedAssessment.create({
    tenantId, studentId, attemptNumber, status: 'IN_PROGRESS',
    purpose: 'PLACEMENT_CHECK',
    targetSkillKeys: scope,
    policyKey: built.specification!.policyKey,
    policyVersion: built.specification!.policyVersion,
    stage: 'foundation', roleKey: 'FOUNDATION', blueprintVersion: 0,
    discovery: false, timeLimitMinutes: 0,
    generationSeed: built.seed,
    specification: {
      slots: built.specification!.slots,
      skillCoverage: built.specification!.skillCoverage,
      difficultyCoverage: built.specification!.difficultyCoverage,
      totalPoints: built.specification!.totalPoints,
    },
    items: built.items,
    generationReport: {
      requestedSlots: built.report!.requestedSlots,
      filled: built.report!.filled,
      exactMatches: built.report!.exactMatches,
      difficultyFallbacks: built.report!.difficultyFallbacks,
      repeatedFromPreviousAttempt: built.report!.repeatedFromPreviousAttempt,
    },
    placementTopicCode: topicCode,
  });

  return {
    ok: true,
    assessmentId: String(created._id),
    topicCode,
    skillKeys: scope,
    questions: (built.items || []).length,
  };
}

export interface PlacementResult {
  ok: boolean;
  message?: string;
  score?: number;
  /** What the student demonstrated, skill by skill, as the projection reports it. */
  skillScores?: { skillKey: string; earned: number; max: number; percentage: number }[];
  recorded?: number;
  topicCode?: string;
  /**
   * Days of this topic still ahead, before and after the replan. Measured from the plan itself,
   * so "you saved 9 days" is a count of days that actually left it, not a promise.
   */
  daysBefore?: number;
  daysAfter?: number;
}

export async function submitPlacementCheck(input: {
  tenantId: string; studentId: string; assessmentId: string;
  answers: { sourceType: string; sourceId: string; response: any }[];
}): Promise<PlacementResult> {
  const { tenantId, studentId, assessmentId } = input;

  const paper: any = await PersonalizedAssessment.findOne({
    _id: assessmentId, tenantId, studentId, purpose: 'PLACEMENT_CHECK',
  });
  if (!paper) return { ok: false, message: 'That placement check does not exist.' };
  if (paper.status === 'SUBMITTED') return { ok: false, message: 'That check has already been submitted.' };

  /* Graded against the frozen paper, every item whether answered or not — a skipped question is
     an observation, and leaving it out would read as mastery of what was avoided. */
  const onPaper = new Map<string, any>((paper.items || []).map((i: any) => [`${i.sourceType}:${i.sourceId}`, i]));
  const submitted = (input.answers || []).filter(a => onPaper.has(`${a.sourceType}:${a.sourceId}`));
  const all = (paper.items || []).map((i: any) => {
    const given = submitted.find(s => s.sourceType === i.sourceType && String(s.sourceId) === String(i.sourceId));
    return { sourceType: i.sourceType, sourceId: String(i.sourceId), response: given?.response };
  });

  const graded = await gradeSubmittedAnswers(tenantId, all as any);

  paper.status = 'SUBMITTED';
  paper.submittedAt = new Date();
  paper.answers = all;
  await paper.save();

  const topicCode = paper.placementTopicCode ? String(paper.placementTopicCode) : '';
  const daysBefore = topicCode ? (await topicInPlan(tenantId, studentId, topicCode)).daysAhead : undefined;

  const bySource = new Map<string, any>((paper.items || []).map((i: any) => [`${i.sourceType}:${i.sourceId}`, i]));
  const loaded = await loadItems(tenantId, all.map((a: any) => ({ sourceType: a.sourceType, sourceId: a.sourceId })));

  const answers = graded.filter(g => g.gradable).map(g => {
    const frozen = bySource.get(`${g.sourceType}:${g.sourceId}`);
    const item = loaded.get(`${g.sourceType}:${g.sourceId}`);
    return {
      itemId: String(g.sourceId),
      itemSourceType: String(g.sourceType),
      /* The skill the slot was filled for, from the frozen paper — never a fresh lookup, which
         would let a mapping change between sitting and grading. */
      skillKey: frozen?.skillKey || null,
      difficulty: item?.difficulty || frozen?.difficulty || 'MEDIUM',
      earnedPoints: g.earnedPoints,
      maxPoints: g.maxPoints,
    };
  });

  const result = await projectModuleAssessment({
    tenantId, studentId,
    assessmentRef: String(paper._id),
    answers,
    sourceType: 'PLACEMENT_CHECK',
  });

  /**
   * The same trigger a checkpoint sends. The days ahead are recomposed from what the student is
   * now believed to hold; days they have finished are frozen where they are.
   */
  await publish({
    name: 'MODULE_ASSESSMENT_COMPLETED',
    tenantId,
    studentId,
    assessmentId: String(paper._id),
  } as any).catch(() => { /* the evidence is written; a replan failure must not lose it */ });

  // publish awaits its handlers, so the plan read here is the replanned one.
  const daysAfter = topicCode ? (await topicInPlan(tenantId, studentId, topicCode)).daysAhead : undefined;

  return {
    ok: true,
    score: result.moduleScore,
    skillScores: result.skillScores,
    recorded: result.recorded,
    topicCode: topicCode || undefined,
    daysBefore,
    daysAfter,
  };
}
