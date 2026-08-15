import StudentSkillEvidence from '../models/StudentSkillEvidence';
import StudentSkillProfile from '../models/StudentSkillProfile';
import PersonalizedAssessment from '../models/PersonalizedAssessment';
import CareerSkill from '../models/CareerSkill';
import SkillEvidence from '../models/SkillEvidence';
import {
  SKILL_DNA_VERSION, evidenceWeightFor, performanceFor, aggregate, explain,
} from '../data/skillDnaPolicy';
import { GradedAnswer } from './assessmentAnswerGradingService';

/**
 * Turning graded answers into skill evidence, and evidence into Skill DNA.
 *
 * Two jobs, deliberately separable. PROJECTION writes observations; AGGREGATION derives
 * belief from them. Keeping them apart is what makes the profile rebuildable: throw every
 * profile away, re-aggregate, and get the same numbers back.
 *
 * PROVENANCE COMES FROM THE FROZEN PAPER. The skill and difficulty are read from the
 * assessment's own snapshot, never from the live Module 5 mapping. An admin re-mapping a
 * question next month must not retroactively change what a student's answer today is taken
 * to have shown — the assessment recorded what it believed at the time, and that is what
 * the observation means.
 *
 * NOTHING IS INFERRED. No skill-graph propagation, no keyword matching, no AI. Answering a
 * REST question creates REST evidence and nothing else.
 */

export interface ProjectionReport {
  assessmentId: string;
  answersGraded: number;
  evidenceCreated: number;
  duplicatesSkipped: number;
  ungradable: number;
  primary: number;
  secondary: number;
  skillsAffected: string[];
  profilesRecomputed: number;
}

const key = (t: string, id: string) => `${t}:${id}`;

/**
 * Write evidence for one completed assessment, then recompute what it touched.
 *
 * Safe to run repeatedly. Every row has a stable identity, so a retried submission, a
 * re-run worker and a manual rebuild all converge on the same set rather than inflating a
 * student's evidence count — which would quietly raise their confidence for no reason.
 */
export async function projectAssessmentToSkillDna(
  tenantId: string,
  assessmentId: string,
  graded: GradedAnswer[],
): Promise<ProjectionReport> {
  const assessment: any = await PersonalizedAssessment.findOne({ _id: assessmentId, tenantId }).lean();
  if (!assessment) throw new Error('That assessment does not exist.');

  const report: ProjectionReport = {
    assessmentId: String(assessmentId),
    answersGraded: graded.length,
    evidenceCreated: 0, duplicatesSkipped: 0, ungradable: 0,
    primary: 0, secondary: 0, skillsAffected: [], profilesRecomputed: 0,
  };

  // The paper as it was generated. Its items carry the skill and difficulty each slot was
  // filled for — the provenance this whole module depends on.
  const frozen = new Map<string, any>((assessment.items || []).map((i: any) => [key(i.sourceType, i.sourceId), i]));

  /**
   * Secondary mappings are read from Module 5, because a paper only records the PRIMARY
   * skill each slot was filled for. This is the one place live mapping is consulted, and
   * only to find additional skills an item also exercises — never to override the frozen
   * primary. A secondary added after the paper was sat simply was not observed, and is
   * excluded by the item list rather than by a timestamp.
   */
  const itemRefs = graded.filter(g => g.gradable).map(g => ({ sourceType: g.sourceType, sourceId: g.sourceId }));
  const secondaryRows = itemRefs.length
    ? await SkillEvidence.find({
        tenantId, active: true, contribution: 'SECONDARY',
        $or: itemRefs.map(r => ({ sourceType: r.sourceType, sourceId: r.sourceId })),
      }).lean() as any[]
    : [];

  const secondaryByItem = new Map<string, string[]>();
  for (const r of secondaryRows) {
    const k = key(r.sourceType, r.sourceId);
    secondaryByItem.set(k, [...(secondaryByItem.get(k) || []), r.skillKey]);
  }

  // Only assessable skills receive evidence. A grouping node cannot be measured, and
  // Module 3 marks exactly those as not assessable.
  const mentioned = [...new Set([
    ...(assessment.items || []).map((i: any) => i.skillKey),
    ...secondaryRows.map(r => r.skillKey),
  ])];
  const skillDocs = mentioned.length
    ? await CareerSkill.find({ key: { $in: mentioned } }).select('key assessable nodeType').lean() as any[]
    : [];
  const assessable = new Set(skillDocs.filter(s => s.assessable && s.nodeType !== 'GROUP').map(s => s.key));

  const rows: any[] = [];
  const affected = new Set<string>();

  for (const g of graded) {
    if (!g.gradable) { report.ungradable++; continue; }

    const item = frozen.get(key(g.sourceType, g.sourceId));
    // An answer to something that was not on this paper is not evidence about it.
    if (!item) { report.ungradable++; continue; }

    const performance = performanceFor(g.earnedPoints, g.maxPoints);
    const observedAt = assessment.submittedAt || new Date();

    const contributions: { skillKey: string; relationship: 'PRIMARY' | 'SECONDARY' }[] = [
      { skillKey: item.skillKey, relationship: 'PRIMARY' },
      ...(secondaryByItem.get(key(g.sourceType, g.sourceId)) || [])
        .filter(sk => sk !== item.skillKey)
        .map(sk => ({ skillKey: sk, relationship: 'SECONDARY' as const })),
    ];

    for (const c of contributions) {
      if (!assessable.has(c.skillKey)) continue;

      const weight = evidenceWeightFor({
        relationship: c.relationship,
        // The difficulty the SLOT was filled at, as recorded — not what the question says
        // today, and not the band actually served if a fallback was used.
        difficulty: item.difficulty,
        sourceType: 'PERSONALIZED_ASSESSMENT',
      });

      rows.push({
        updateOne: {
          filter: {
            assessmentId: assessment._id,
            itemSourceType: g.sourceType,
            itemSourceId: g.sourceId,
            skillKey: c.skillKey,
          },
          update: {
            $setOnInsert: {
              tenantId, studentId: assessment.studentId, skillKey: c.skillKey,
              sourceType: 'PERSONALIZED_ASSESSMENT',
              assessmentId: assessment._id, attemptNumber: assessment.attemptNumber,
              itemSourceType: g.sourceType, itemSourceId: g.sourceId,
              relationship: c.relationship, difficulty: item.difficulty,
              earnedPoints: g.earnedPoints, maxPoints: g.maxPoints, performance,
              evidenceWeight: weight, policyVersion: SKILL_DNA_VERSION,
              observedAt,
            },
          },
          upsert: true,
        },
      });

      affected.add(c.skillKey);
      if (c.relationship === 'PRIMARY') report.primary++; else report.secondary++;
    }
  }

  if (rows.length) {
    // One write for the whole paper, and $setOnInsert so a re-run leaves existing rows
    // untouched rather than restating them.
    const res: any = await StudentSkillEvidence.bulkWrite(rows, { ordered: false });
    report.evidenceCreated = res?.upsertedCount ?? 0;
    report.duplicatesSkipped = rows.length - report.evidenceCreated;
  }

  report.skillsAffected = [...affected];
  report.profilesRecomputed = await recomputeStudentSkills(
    tenantId, String(assessment.studentId), report.skillsAffected,
  );

  return report;
}

/**
 * Recompute belief for specific skills.
 *
 * Only what an assessment touched. Rebuilding every skill in the database after one paper
 * would be work proportional to the taxonomy rather than to what changed.
 */
export async function recomputeStudentSkills(
  tenantId: string,
  studentId: string,
  skillKeys: string[],
): Promise<number> {
  const keys = [...new Set(skillKeys.map(k => String(k).toUpperCase()))].filter(Boolean);
  if (!keys.length) return 0;

  // One query for every skill's evidence, then grouped in memory — not a query per skill.
  const evidence = await StudentSkillEvidence.find({
    tenantId, studentId, skillKey: { $in: keys },
  }).lean() as any[];

  const bySkill = new Map<string, any[]>();
  for (const e of evidence) {
    bySkill.set(e.skillKey, [...(bySkill.get(e.skillKey) || []), e]);
  }

  const ops: any[] = [];
  for (const skillKey of keys) {
    const rows = bySkill.get(skillKey) || [];

    // No evidence means NOT ASSESSED, which is not a score of zero. A stale profile is
    // removed rather than left asserting something nothing supports.
    if (!rows.length) {
      ops.push({ deleteOne: { filter: { tenantId, studentId, skillKey } } });
      continue;
    }

    const result = aggregate(rows.map(r => ({
      performance: r.performance,
      evidenceWeight: r.evidenceWeight,
      itemKey: key(r.itemSourceType, r.itemSourceId),
    })));

    const lastEvidenceAt = rows.reduce(
      (latest: Date, r: any) => (r.observedAt > latest ? r.observedAt : latest),
      rows[0].observedAt,
    );

    ops.push({
      updateOne: {
        filter: { tenantId, studentId, skillKey },
        update: {
          $set: {
            score: result.score, confidence: result.confidence,
            evidenceCount: result.evidenceCount,
            effectiveEvidenceWeight: result.effectiveEvidenceWeight,
            distinctItems: result.distinctItems,
            lastEvidenceAt, aggregationVersion: SKILL_DNA_VERSION,
          },
        },
        upsert: true,
      },
    });
  }

  if (ops.length) await StudentSkillProfile.bulkWrite(ops, { ordered: false });
  return ops.length;
}

/**
 * Rebuild every profile for one student from their evidence.
 *
 * The recovery path when projection failed after a paper was graded: nothing about the
 * student's answers is lost, so their Skill DNA can be reconstructed without asking them
 * to sit anything again. Also the proof that profiles are genuinely derived — running this
 * on a healthy student changes nothing.
 */
export async function rebuildSkillDnaForStudent(tenantId: string, studentId: string): Promise<{
  skills: number; profilesWritten: number;
}> {
  const keys = await StudentSkillEvidence.distinct('skillKey', { tenantId, studentId });
  const written = await recomputeStudentSkills(tenantId, studentId, keys as string[]);
  return { skills: keys.length, profilesWritten: written };
}

export interface SkillDnaRow {
  skillKey: string;
  skillName: string;
  score: number;
  confidence: string;
  evidenceCount: number;
  distinctItems: number;
  lastEvidenceAt: Date | null;
  /** False once Module 3 retires the skill. History is never deleted for it. */
  skillActive: boolean;
}

/** One student's Skill DNA, with skill names joined in. Two queries, never one per skill. */
export async function getSkillDna(tenantId: string, studentId: string): Promise<SkillDnaRow[]> {
  const profiles = await StudentSkillProfile.find({ tenantId, studentId })
    .sort({ score: -1 }).lean() as any[];
  if (!profiles.length) return [];

  const skills = await CareerSkill.find({ key: { $in: profiles.map(p => p.skillKey) } })
    .select('key name active').lean() as any[];
  const byKey = new Map(skills.map(s => [s.key, s]));

  return profiles.map(p => {
    const s = byKey.get(p.skillKey);
    return {
      skillKey: p.skillKey,
      skillName: s?.name || p.skillKey.replace(/_/g, ' '),
      score: p.score,
      confidence: p.confidence,
      evidenceCount: p.evidenceCount,
      distinctItems: p.distinctItems,
      lastEvidenceAt: p.lastEvidenceAt || null,
      skillActive: s ? s.active !== false : false,
    };
  });
}

/**
 * The observations behind one score, and the arithmetic applied to them.
 *
 * A student who disputes a result deserves better than "the system calculated it", and an
 * admin needs to see the same rows the formula saw.
 */
export async function explainSkill(tenantId: string, studentId: string, skillKey: string): Promise<{
  skillKey: string;
  profile: any | null;
  evidence: any[];
  workings: string[];
}> {
  const sk = String(skillKey).toUpperCase();
  const [profile, evidence] = await Promise.all([
    StudentSkillProfile.findOne({ tenantId, studentId, skillKey: sk }).lean() as any,
    StudentSkillEvidence.find({ tenantId, studentId, skillKey: sk }).sort({ observedAt: 1 }).lean() as any,
  ]);

  const { lines } = explain((evidence || []).map((e: any) => ({
    performance: e.performance,
    evidenceWeight: e.evidenceWeight,
    itemKey: key(e.itemSourceType, e.itemSourceId),
    difficulty: e.difficulty,
    relationship: e.relationship,
  })));

  return {
    skillKey: sk,
    profile: profile || null,
    evidence: (evidence || []).map((e: any) => ({
      itemSourceType: e.itemSourceType, itemSourceId: e.itemSourceId,
      relationship: e.relationship, difficulty: e.difficulty,
      earnedPoints: e.earnedPoints, maxPoints: e.maxPoints,
      performance: e.performance, evidenceWeight: e.evidenceWeight,
      attemptNumber: e.attemptNumber, observedAt: e.observedAt,
    })),
    workings: lines,
  };
}
