import mongoose from 'mongoose';
import StudentSkillEvidence from '../models/StudentSkillEvidence';
import CareerSkill from '../models/CareerSkill';
import { recomputeStudentSkills } from './skillDnaService';
import { calculateStudentRoleReadiness, RoleReadinessResult } from './roleReadinessService';
import { evidenceWeightFor, performanceFor, SKILL_DNA_VERSION } from '../data/skillDnaPolicy';
import {
  PLACEMENT_READINESS_VERSION, INTERVIEW_WEIGHTS, InterviewDimension,
  INTERVIEW_MIX, isEvidenceWorthy, weightedScore, clamp100,
} from '../data/placementReadinessPolicy';

/**
 * What a mock interview tells us — about readiness, and about skill.
 *
 * THE SENSITIVE HALF OF MODULE 14. A resume is a claim and can never move a score. An
 * interview answer is different: the student said the thing, unprompted, and was graded
 * against a rubric. That is real demonstrated evidence, and it is admitted — carefully.
 *
 * EVIDENCE GOES THROUGH MODULE 7, NEVER AROUND IT. This file writes StudentSkillEvidence
 * rows and then asks Module 7 to recompute. It never touches StudentSkillProfile, never
 * computes a score, and never writes a readiness figure. Module 7 owns Skill DNA and Module
 * 8 owns readiness; if this file could set either, both would stop meaning anything.
 *
 * AND IT IS WORTH LESS THAN A MARKED PAPER. MOCK_INTERVIEW carries its own weight in
 * SOURCE_WEIGHT, below a controlled assessment — a fluent explainer should not outrank a
 * student who demonstrably solved the problem.
 *
 * SILENCE IS A VALID OUTPUT. An unanswered question, a generic HR question with no canonical
 * skill behind it, and a malformed evaluation all produce no evidence at all. We did not
 * observe anything, so we record nothing.
 */

/** Why a skill is on the paper: the role needs it, they are weak at it, or they are good at it. */
export type InterviewBand = 'core' | 'gaps' | 'strengths';

export interface InterviewQuestionResult {
  /** The canonical skill this question tested. Absent for HR/behavioural questions. */
  skillKey?: string | null;
  questionId: string;
  question: string;
  difficulty?: string;
  answered: boolean;
  score: number | null;
  maxScore: number | null;
  feedback?: string;
}

export interface InterviewDimensionScore {
  dimension: InterviewDimension;
  score: number;
}

export interface InterviewReadiness {
  policyVersion: string;
  role: { key: string; name: string };
  readiness: number;
  dimensions: InterviewDimensionScore[];
  strengths: { skillKey: string; skillName: string; score: number }[];
  needsWork: { skillKey: string; skillName: string; score: number }[];
  /** How many answers became skill evidence. Often fewer than the questions asked. */
  evidenceCreated: number;
  questionsAsked: number;
  questionsAnswered: number;
}

/**
 * How an interview should be composed for this student.
 *
 * Reads Module 8's classification and splits the paper between what the role needs, what the
 * student is weak at, and what they are good at. The last slice matters: an interview that
 * only probes weaknesses is neither realistic nor capable of producing evidence of strength.
 */
export async function planInterviewCoverage(
  tenantId: string, studentId: string, questionBudget: number,
): Promise<{
  ok: boolean;
  message?: string;
  role?: { key: string; name: string };
  stage?: string;
  targets?: { skillKey: string; skillName: string; slots: number; bands: InterviewBand[] }[];
}> {
  const readiness = await calculateStudentRoleReadiness(tenantId, studentId);
  if (!readiness.available) {
    return { ok: false, message: 'Choose a target role before taking a role interview.' };
  }

  const ready = readiness as RoleReadinessResult;
  const active = ready.skills.filter(s => !s.skillInactive);

  const gaps = active.filter(s => s.status === 'PRIORITY_GAP' || s.status === 'NEEDS_WORK');
  const strengths = active.filter(s => s.status === 'STRONG' || s.status === 'ON_TRACK');
  // Core is the role's own weighting, whatever the student's standing — this is what the
  // job actually asks about.
  const core = [...active].sort((a, b) => b.weight - a.weight);

  const slotsFor = (share: number) => Math.max(1, Math.round(questionBudget * share));
  const take = (list: any[], n: number, band: InterviewBand) =>
    list.slice(0, n).map(s => ({ skillKey: s.skillKey, skillName: s.skillName, slots: 1, bands: [band] }));

  const targets = [
    ...take(core, slotsFor(INTERVIEW_MIX.core), 'core'),
    ...take(gaps, slotsFor(INTERVIEW_MIX.gaps), 'gaps'),
    ...take(strengths, slotsFor(INTERVIEW_MIX.strengths), 'strengths'),
  ];

  /**
   * One skill may legitimately be picked for more than one reason — the role weights it
   * heavily AND the student is weak at it. Merge rather than ask about it twice, but keep
   * both reasons: the band is WHY the question is being asked, and collapsing a merged
   * entry to whichever band happened to be listed first would report a gap as routine
   * role coverage, on the exact skill the student most needs to hear about.
   */
  const merged = new Map<string, { skillKey: string; skillName: string; slots: number; bands: InterviewBand[] }>();
  for (const t of targets) {
    const hit = merged.get(t.skillKey);
    if (hit) {
      hit.slots += 1;
      if (!hit.bands.includes(t.bands[0])) hit.bands.push(t.bands[0]);
    } else merged.set(t.skillKey, { ...t, bands: [...t.bands] });
  }

  return {
    ok: true,
    role: { key: ready.role.key, name: ready.role.name },
    targets: [...merged.values()],
  };
}

/**
 * Turn a completed interview into a readiness figure and, where justified, skill evidence.
 *
 * Idempotent by the same discipline Module 7 already uses: the evidence rows carry a unique
 * (assessmentId, itemSourceType, itemSourceId, skillKey) key, so a replayed completion
 * writes the same rows rather than a second set.
 */
export async function projectInterviewToEvidence(input: {
  tenantId: string;
  studentId: string;
  /** The interview sitting. Becomes the evidence's source id. */
  interviewId: string;
  attemptNumber?: number;
  questions: InterviewQuestionResult[];
  /** Dimension scores from the existing evaluator, 0–100. */
  dimensionScores: Partial<Record<InterviewDimension, number>>;
  now?: Date;
}): Promise<InterviewReadiness> {
  const now = input.now || new Date();
  const { tenantId, studentId } = input;

  const readiness = await calculateStudentRoleReadiness(tenantId, studentId);
  const role = readiness.available
    ? (readiness as RoleReadinessResult).role
    : { key: 'UNKNOWN', name: 'your target role' };

  // ── evidence ──
  //
  // Only answers that were actually given, to questions that map to a real canonical skill,
  // with a usable rubric score. Everything else is skipped in silence.
  const worthy = input.questions.filter(q => isEvidenceWorthy(q));

  const skillDocs = worthy.length
    ? await CareerSkill.find({ key: { $in: [...new Set(worthy.map(q => q.skillKey!))] } })
        .select('key name active').lean() as any[]
    : [];
  const knownSkills = new Set(skillDocs.filter(s => s.active !== false).map(s => s.key));

  const rows = worthy
    .filter(q => knownSkills.has(q.skillKey!))
    .map(q => {
      const performance = performanceFor(q.score!, q.maxScore!);
      return {
        updateOne: {
          filter: {
            assessmentId: new mongoose.Types.ObjectId(input.interviewId),
            itemSourceType: 'interview_question',
            itemSourceId: q.questionId,
            skillKey: q.skillKey,
          },
          update: {
            $setOnInsert: {
              tenantId, studentId,
              skillKey: q.skillKey,
              // The source is what makes this weigh less than a marked paper.
              sourceType: 'MOCK_INTERVIEW',
              assessmentId: new mongoose.Types.ObjectId(input.interviewId),
              attemptNumber: input.attemptNumber || 1,
              itemSourceType: 'interview_question',
              itemSourceId: q.questionId,
              relationship: 'PRIMARY',
              difficulty: (q.difficulty || 'MEDIUM').toUpperCase(),
              earnedPoints: q.score,
              maxPoints: q.maxScore,
              performance,
              evidenceWeight: evidenceWeightFor({
                relationship: 'PRIMARY',
                difficulty: (q.difficulty || 'MEDIUM').toUpperCase(),
                sourceType: 'MOCK_INTERVIEW',
              }),
              policyVersion: SKILL_DNA_VERSION,
              observedAt: now,
            },
          },
          upsert: true,
        },
      };
    });

  let evidenceCreated = 0;
  if (rows.length) {
    const res: any = await StudentSkillEvidence.bulkWrite(rows as any, { ordered: false });
    evidenceCreated = (res?.upsertedCount ?? 0);

    /**
     * Module 7 recomputes. This file does not.
     *
     * The skill profile is rebuilt from ALL of a student's evidence by Module 7's own
     * aggregation, so an interview answer takes its place beside their assessment history at
     * its configured weight rather than overwriting anything.
     */
    await recomputeStudentSkills(tenantId, studentId, [...new Set(rows.map((r: any) =>
      r.updateOne.update.$setOnInsert.skillKey))]);
  }

  // ── readiness ──
  //
  // Its own figure, deliberately separate from Module 8's. "Can you show it under interview
  // conditions" is not the same question as "do you have the skill".
  const dimensions: InterviewDimensionScore[] = (Object.keys(INTERVIEW_WEIGHTS) as InterviewDimension[])
    .filter(d => typeof input.dimensionScores[d] === 'number')
    .map(d => ({ dimension: d, score: clamp100(input.dimensionScores[d]!) }));

  const bySkill = new Map<string, { name: string; total: number; max: number }>();
  for (const q of input.questions) {
    if (!q.skillKey || !q.answered || typeof q.score !== 'number' || typeof q.maxScore !== 'number') continue;
    const hit = bySkill.get(q.skillKey) || { name: q.skillKey.replace(/_/g, ' '), total: 0, max: 0 };
    hit.total += q.score;
    hit.max += q.maxScore;
    bySkill.set(q.skillKey, hit);
  }

  const perSkill = [...bySkill.entries()]
    .map(([skillKey, v]) => ({
      skillKey,
      skillName: skillDocs.find(s => s.key === skillKey)?.name || v.name,
      score: v.max > 0 ? clamp100((v.total / v.max) * 100) : 0,
    }))
    .sort((a, b) => b.score - a.score);

  return {
    policyVersion: PLACEMENT_READINESS_VERSION,
    role,
    readiness: weightedScore(
      dimensions.map(d => ({ key: d.dimension, score: d.score })),
      INTERVIEW_WEIGHTS,
    ),
    dimensions,
    strengths: perSkill.filter(s => s.score >= 60).slice(0, 3),
    needsWork: perSkill.filter(s => s.score < 60).slice(-3).reverse(),
    evidenceCreated,
    questionsAsked: input.questions.length,
    questionsAnswered: input.questions.filter(q => q.answered).length,
  };
}

/**
 * Adapt a finished passport mock interview into the projector's input.
 *
 * WHY AN ADAPTER RATHER THAN A REWRITE. The mock-interview stack already exists, is in use,
 * and grades transcripts by topic area. Module 14 does not get to redefine how an interview
 * is conducted or graded; it reads what that stack produced and decides what, if anything,
 * it justifies.
 *
 * ONLY ROLE INTERVIEWS CAN PRODUCE EVIDENCE. A sitting carries `skillTargets` only when its
 * areas were chosen FROM the student's role blueprint at start. A legacy pathway interview
 * covers topics like "Learning mindset" that map to no canonical skill, so it returns nothing
 * — correctly, because nothing about a canonical skill was observed.
 *
 * THE DIMENSIONS ARE PARTIAL, ON PURPOSE. Today's evaluator measures topic performance; it
 * does not separately grade problem solving, communication or delivery. Rather than invent
 * three numbers from prose feedback, only TECHNICAL is supplied and the weighted average
 * re-normalises over what actually exists. A missing measurement is reported as missing.
 */
export function adaptPassportInterview(session: {
  _id: any;
  skillTargets?: { skillKey: string; skillName: string }[];
  evaluation?: {
    overallScore?: number;
    areaScores?: { title: string; percentage: number; feedback?: string }[];
  } | null;
}): { questions: InterviewQuestionResult[]; dimensionScores: Partial<Record<InterviewDimension, number>> } {
  const targets = session.skillTargets || [];
  const areas = session.evaluation?.areaScores || [];

  const bySkillName = new Map(targets.map(t => [t.skillName.toLowerCase().trim(), t.skillKey]));

  const questions: InterviewQuestionResult[] = areas.map((a, i) => {
    const skillKey = bySkillName.get(String(a.title || '').toLowerCase().trim()) || null;
    return {
      skillKey,
      // Stable across replays: the same sitting graded twice writes the same evidence row.
      questionId: `area:${i}:${String(a.title || '').slice(0, 40)}`,
      question: String(a.title || ''),
      // The AI graded the area, so an area score IS an answered, graded observation. An area
      // it declined to score is filtered out by isEvidenceWorthy.
      answered: typeof a.percentage === 'number',
      score: typeof a.percentage === 'number' ? a.percentage : null,
      maxScore: typeof a.percentage === 'number' ? 100 : null,
      feedback: a.feedback,
    };
  });

  const scored = questions.filter(q => q.skillKey && typeof q.score === 'number');
  const technical = scored.length
    ? Math.round(scored.reduce((n, q) => n + (q.score as number), 0) / scored.length)
    : null;

  return {
    questions,
    dimensionScores: technical === null ? {} : { TECHNICAL: technical },
  };
}

export { INTERVIEW_MIX };
