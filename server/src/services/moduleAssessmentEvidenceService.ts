/**
 * Turn a completed module assessment into skill evidence.
 *
 * WHY THIS CLOSES THE LOOP. Until now the only things that could move a skill score were a
 * proctored assessment and a mock interview — both one-off events. A student could work through
 * an entire module, pass its assessment, and Skill DNA would not notice: their plan still said
 * they were weak at loops because the only evidence was the diagnostic they took in week one.
 * Learning had no effect on the measurement of learning.
 *
 * MODULE SCORE AND SKILL SCORES ARE DIFFERENT THINGS, and the brief is right to insist on both.
 * "74% on Module 3" is a grade; "loops 62, lists 54, functions 76" is a diagnosis. Only the
 * second can change what gets taught next, which is the entire point of recording it.
 *
 * IDEMPOTENT. The same submission projected twice produces the same rows and the same numbers —
 * the unique index on (assessment, item, skill) is the guarantee, and a retry after a crash is
 * therefore safe rather than a way to inflate a score by resubmitting.
 *
 * IT DOES NOT DECIDE ANYTHING. It records observations and asks the aggregator to recompute.
 * Whether the plan should change is curriculumReplanningService's question.
 */

import mongoose from 'mongoose';
import StudentSkillEvidence from '../models/StudentSkillEvidence';
import CareerSkill from '../models/CareerSkill';
import SkillEvidence from '../models/SkillEvidence';
import { recomputeStudentSkills } from './skillDnaService';
import { evidenceWeightFor } from '../data/skillDnaPolicy';

/** One graded answer from a module assessment. */
export interface GradedModuleAnswer {
  /** Stable identifier of the question within its source collection. */
  itemId: string;
  /** Which collection it came from, so the pair is unique across sources. */
  itemSourceType: string;
  /** Canonical skill the question primarily measures. Unmapped items are skipped. */
  skillKey?: string | null;
  difficulty?: 'EASY' | 'MEDIUM' | 'HARD' | string;
  earnedPoints: number;
  maxPoints: number;
}

export interface ProjectModuleResult {
  recorded: number;
  skipped: number;
  skillKeys: string[];
  /** Per-skill scores for this assessment alone — the diagnosis, not the grade. */
  skillScores: { skillKey: string; earned: number; max: number; percentage: number }[];
  moduleScore: number;
}

/**
 * Record a module assessment as evidence.
 *
 * `assessmentRef` must be stable and unique per attempt — it is half of the idempotency key. A
 * retake is a DIFFERENT attempt and therefore new evidence, which is deliberate: a student who
 * retakes and does better has demonstrated something, and the weighted average is what stops
 * the newer attempt simply erasing the older one.
 */
export async function projectModuleAssessment(input: {
  tenantId: string;
  studentId: string;
  assessmentRef: string;
  answers: GradedModuleAnswer[];
}): Promise<ProjectModuleResult> {
  const { tenantId, studentId, assessmentRef } = input;

  const totals = input.answers.reduce(
    (acc, a) => ({ earned: acc.earned + (a.earnedPoints || 0), max: acc.max + (a.maxPoints || 0) }),
    { earned: 0, max: 0 },
  );
  const moduleScore = totals.max > 0 ? Math.round((totals.earned / totals.max) * 100) : 0;

  /**
   * Items carrying no skill are skipped, not guessed at.
   *
   * A module assessment written before skill mapping existed has questions nobody has
   * classified. Attributing them to the module's "main" skill would manufacture evidence
   * about a capability nobody measured, which is exactly the failure the NOT_EXPOSED
   * distinction exists to prevent.
   */
  const mapped = input.answers.filter(a => a.skillKey && String(a.skillKey).trim());
  const skipped = input.answers.length - mapped.length;

  if (!mapped.length) {
    return { recorded: 0, skipped, skillKeys: [], skillScores: [], moduleScore };
  }

  const wantedKeys = Array.from(new Set(mapped.map(a => String(a.skillKey).toUpperCase())));

  /**
   * Only real, assessable skills. A GROUP node is a shelf, not a capability — evidence against
   * one would give a heading a score.
   */
  const skills = await CareerSkill.find({
    key: { $in: wantedKeys }, active: true, assessable: true, nodeType: { $ne: 'GROUP' },
  }).select('key').lean() as any[];
  const valid = new Set(skills.map(s => String(s.key).toUpperCase()));

  const ops: any[] = [];
  const perSkill = new Map<string, { earned: number; max: number }>();
  let dropped = 0;

  for (const a of mapped) {
    const primary = String(a.skillKey).toUpperCase();
    if (!valid.has(primary)) { dropped++; continue; }

    const maxPoints = Math.max(1, Number(a.maxPoints) || 1);
    const earned = Math.max(0, Number(a.earnedPoints) || 0);
    const performance = Math.min(1, earned / maxPoints);
    const difficulty = String(a.difficulty || 'MEDIUM').toUpperCase();

    const agg = perSkill.get(primary) || { earned: 0, max: 0 };
    agg.earned += earned; agg.max += maxPoints;
    perSkill.set(primary, agg);

    ops.push(evidenceOp({
      tenantId, studentId, skillKey: primary, assessmentRef,
      itemSourceType: a.itemSourceType, itemSourceId: a.itemId,
      relationship: 'PRIMARY', difficulty, earned, maxPoints, performance,
    }));

    /**
     * SECONDARY skills the same question also touches.
     *
     * Read from the live item→skill mapping rather than the answer, because a question's
     * secondary skills are a property of the question and may be edited after it was written.
     */
    const secondaries = await SkillEvidence.find({
      tenantId, sourceType: a.itemSourceType, sourceId: String(a.itemId),
      contribution: 'SECONDARY', active: true,
    }).select('skillKey').lean() as any[];

    for (const sec of secondaries) {
      const key = String(sec.skillKey).toUpperCase();
      if (key === primary || !valid.has(key)) continue;
      ops.push(evidenceOp({
        tenantId, studentId, skillKey: key, assessmentRef,
        itemSourceType: a.itemSourceType, itemSourceId: a.itemId,
        relationship: 'SECONDARY', difficulty, earned, maxPoints, performance,
      }));
    }
  }

  if (ops.length) {
    await StudentSkillEvidence.bulkWrite(ops, { ordered: false });
    await recomputeStudentSkills(tenantId, studentId, [...perSkill.keys()]);
  }

  const skillScores = [...perSkill.entries()]
    .map(([skillKey, v]) => ({
      skillKey, earned: v.earned, max: v.max,
      percentage: v.max > 0 ? Math.round((v.earned / v.max) * 100) : 0,
    }))
    .sort((a, b) => a.skillKey.localeCompare(b.skillKey));

  console.log(`[adaptive] module assessment ${assessmentRef} for ${studentId}: `
    + `${ops.length} observations across ${perSkill.size} skills, `
    + `${skipped} unmapped, ${dropped} invalid, module score ${moduleScore}`);

  return {
    recorded: ops.length,
    skipped: skipped + dropped,
    skillKeys: [...perSkill.keys()],
    skillScores,
    moduleScore,
  };
}

/**
 * One upsert, written so a replay cannot change what a previous run recorded.
 *
 * $setOnInsert throughout: re-projecting the same submission is a no-op rather than a rewrite,
 * which is what makes crash recovery safe. Changing a graded answer therefore requires deleting
 * the evidence first — deliberately, because silently revising history is worse than refusing to.
 */
function evidenceOp(a: {
  tenantId: string; studentId: string; skillKey: string; assessmentRef: string;
  itemSourceType: string; itemSourceId: string;
  relationship: 'PRIMARY' | 'SECONDARY'; difficulty: string;
  earned: number; maxPoints: number; performance: number;
}) {
  const weight = evidenceWeightFor({
    relationship: a.relationship,
    difficulty: a.difficulty,
    sourceType: 'MODULE_ASSESSMENT',
  });

  return {
    updateOne: {
      filter: {
        assessmentId: deterministicId(a.assessmentRef),
        itemSourceType: a.itemSourceType,
        itemSourceId: a.itemSourceId,
        skillKey: a.skillKey,
      },
      update: {
        $setOnInsert: {
          tenantId: a.tenantId,
          studentId: new mongoose.Types.ObjectId(a.studentId),
          skillKey: a.skillKey,
          sourceType: 'MODULE_ASSESSMENT',
          assessmentId: deterministicId(a.assessmentRef),
          attemptNumber: 1,
          itemSourceType: a.itemSourceType,
          itemSourceId: a.itemSourceId,
          relationship: a.relationship,
          difficulty: a.difficulty,
          earnedPoints: a.earned,
          maxPoints: a.maxPoints,
          performance: a.performance,
          evidenceWeight: weight,
          policyVersion: 'SKILL_DNA_V1',
          observedAt: new Date(),
        },
      },
      upsert: true,
    },
  };
}

/**
 * A stable ObjectId for a non-ObjectId reference.
 *
 * assessmentId is typed as an ObjectId on the evidence model. A module assessment may be
 * identified by an enrollment-and-day string, so it is hashed to a fixed id — the same input
 * always producing the same id is what keeps the unique index doing its job.
 */
function deterministicId(ref: string): mongoose.Types.ObjectId {
  if (mongoose.Types.ObjectId.isValid(ref) && String(new mongoose.Types.ObjectId(ref)) === ref) {
    return new mongoose.Types.ObjectId(ref);
  }
  let h1 = 0x811c9dc5, h2 = 0x01000193, h3 = 0x9e3779b9;
  for (let i = 0; i < ref.length; i++) {
    const c = ref.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 16777619) >>> 0;
    h2 = Math.imul(h2 + c, 2654435761) >>> 0;
    h3 = Math.imul(h3 ^ (c + i), 40503) >>> 0;
  }
  const hex = [h1, h2, h3].map(n => n.toString(16).padStart(8, '0')).join('');
  return new mongoose.Types.ObjectId(hex.slice(0, 24));
}
