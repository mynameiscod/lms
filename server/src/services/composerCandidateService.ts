/**
 * Which Learning Units the composer is allowed to choose from.
 *
 * ── TWO SOURCES, AND ONE OF THEM IS NOT A PRODUCTION PATH ─────────────────────────────────
 *
 * PRODUCTION requires status = PUBLISHED **and** readiness = READY. Publishing is an author
 * saying a unit should be used; readiness is a fact about whether it can teach. Both, always.
 *
 * PROTOTYPE additionally accepts DRAFT units that are READY, so the 31 authored units can
 * exercise the algorithm before anybody publishes anything. That is the whole reason it exists,
 * and it is the reason it is dangerous: it is one boolean away from shipping a plan built from
 * units nobody approved.
 *
 * ── HOW THE TEST PATH IS KEPT OUT OF PRODUCTION ───────────────────────────────────────────
 *
 * Three deliberate obstacles, because a comment is not a control:
 *
 *   1. The parameter is not a boolean. `includeUnpublished: true` reads as a harmless option in
 *      a call site; `source: 'PROTOTYPE_UNPUBLISHED'` does not.
 *   2. Every prototype result carries `isProductionEligible: false`, so anything downstream can
 *      refuse it without knowing how it was built.
 *   3. `assertProductionEligible` throws on a prototype set. P7B's production wrapper calls it,
 *      so the unsafe path cannot reach a student even if somebody passes the wrong source.
 *
 * A test flag that quietly becomes the default is one of the commonest ways a safeguard fails,
 * and this codebase has the scars: the curriculum engine gate exists because two planners once
 * both answered for the same student.
 */

import CurriculumLearningUnit from '../models/CurriculumLearningUnit';
import LearningContentLibrary from '../models/LearningContentLibrary';
import Quiz from '../models/Quiz';
import Assignment from '../models/Assignment';
import mongoose from 'mongoose';
import { evaluateReadiness, UnitReadiness } from '../data/unitReadinessPolicy';
import { ComposableUnit } from './curriculumComposerService';

export type CandidateSource =
  /** PUBLISHED and READY. The only source a student's plan may ever be built from. */
  | 'PRODUCTION'
  /**
   * READY regardless of publication. FOR PROTOTYPING AND TESTS ONLY.
   *
   * Named so it cannot be mistaken for an option at a call site.
   */
  | 'PROTOTYPE_UNPUBLISHED'
  /**
   * EVERY designed unit, ignoring readiness and publication entirely. FOR AUDITING ONLY.
   *
   * It answers a question about the CURRICULUM rather than about a student: could the 310 units
   * as designed support a ninety-day plan, if every one of them were written? Mixing that with
   * planning would mean composing from units that have no content at all, so this source is
   * never production eligible and `assertProductionEligible` refuses it exactly as it refuses
   * the prototype one.
   */
  | 'CURRICULUM_CAPACITY_AUDIT';

export interface CandidateSet {
  source: CandidateSource;
  /** False for anything built from the prototype source. Checked, not trusted. */
  isProductionEligible: boolean;
  units: ComposableUnit[];
  /** Every unit considered and why it did not qualify. */
  rejected: { unitCode: string; status: string; readiness: UnitReadiness }[];
}

/**
 * Load the units the composer may choose from.
 *
 * Reads readiness through the same evaluator the admin screen and the report use, rather than
 * trusting a stored field: readiness is derived from content that changes underneath it, and a
 * cached value would eventually say a unit can teach when its material has been unpublished.
 */
export async function loadCandidates(
  tenantId: string,
  source: CandidateSource,
  stageKey = 'foundation',
): Promise<CandidateSet> {
  const tenantOid = mongoose.Types.ObjectId.isValid(tenantId)
    ? new mongoose.Types.ObjectId(tenantId) : null;

  const [units, published, quizzes, assignments] = await Promise.all([
    CurriculumLearningUnit.find({ tenantId, stageKey }).lean() as any,
    LearningContentLibrary.find({ tenantId, isPublished: true })
      .select('type topicCode skillKeys unitCode').lean() as any,
    Quiz.find({ tenantId, unitCode: { $exists: true, $ne: '' } }).select('unitCode').lean() as any,
    // Assignment scopes by `tenant` (ObjectId), not `tenantId`. See the model.
    tenantOid
      ? Assignment.find({ tenant: tenantOid, unitCode: { $exists: true, $ne: '' } })
        .select('unitCode').lean() as any
      : Promise.resolve([] as any),
  ]);

  const byUnitCode = new Map<string, any[]>();
  const byTopicCode = new Map<string, any[]>();
  const bySkillKey = new Map<string, any[]>();
  for (const r of published as any[]) {
    if (r.unitCode) byUnitCode.set(String(r.unitCode), [...(byUnitCode.get(String(r.unitCode)) || []), r]);
    if (r.topicCode) byTopicCode.set(String(r.topicCode), [...(byTopicCode.get(String(r.topicCode)) || []), r]);
    for (const k of r.skillKeys || []) bySkillKey.set(String(k), [...(bySkillKey.get(String(k)) || []), r]);
  }

  const assessments = new Map<string, number>();
  const assignmentCounts = new Map<string, number>();
  for (const row of [...(quizzes as any[]), ...(assignments as any[])]) {
    const k = String(row.unitCode);
    assessments.set(k, (assessments.get(k) || 0) + 1);
  }
  for (const row of assignments as any[]) {
    const k = String(row.unitCode);
    assignmentCounts.set(k, (assignmentCounts.get(k) || 0) + 1);
  }

  const out: ComposableUnit[] = [];
  const rejected: CandidateSet['rejected'] = [];

  for (const unit of units as any[]) {
    const own = byUnitCode.get(String(unit.unitCode)) || [];
    let inherited = own.length ? [] : (byTopicCode.get(String(unit.topicCode)) || []);
    if (!own.length && !inherited.length) {
      const seen = new Set<string>();
      inherited = (unit.skillKeys || []).flatMap((k: string) => bySkillKey.get(String(k)) || [])
        .filter((r: any) => { const id = String(r._id); if (seen.has(id)) return false; seen.add(id); return true; });
    }

    const { readiness } = evaluateReadiness({
      unitType: unit.unitType,
      ownContent: own,
      inheritedContent: inherited,
      boundAssessments: assessments.get(String(unit.unitCode)) || 0,
      boundAssignments: assignmentCounts.get(String(unit.unitCode)) || 0,
    });

    const publishedEnough = source === 'PRODUCTION'
      ? unit.status === 'PUBLISHED'
      : unit.status !== 'ARCHIVED';   // prototype and audit: anything not retired

    /**
     * The audit source ignores readiness on purpose.
     *
     * Its question is whether the curriculum's DESIGN can carry ninety days, which is answered
     * by the units that exist rather than by the ones somebody has finished writing. Applying
     * the readiness filter here would conflate a design deficit with an authoring backlog, and
     * those need different decisions from different people.
     */
    const readyEnough = source === 'CURRICULUM_CAPACITY_AUDIT' || readiness === 'READY';

    if (!readyEnough || !publishedEnough) {
      rejected.push({ unitCode: String(unit.unitCode), status: String(unit.status), readiness });
      continue;
    }

    out.push({
      unitCode: String(unit.unitCode),
      title: String(unit.title),
      moduleCode: String(unit.moduleCode || ''),
      topicCode: String(unit.topicCode || ''),
      displayOrder: Number(unit.displayOrder) || 0,
      skillKeys: (unit.skillKeys || []).map((k: string) => String(k)),
      prerequisiteSkillKeys: (unit.prerequisiteSkillKeys || []).map((k: string) => String(k)),
      prerequisiteUnitCodes: (unit.prerequisiteUnitCodes || []).map((k: string) => String(k)),
      category: unit.category,
      applicableDirections: unit.applicableDirections || [],
      unitType: unit.unitType,
      defaultDepth: String(unit.defaultDepth || 'STANDARD'),
      mandatory: unit.mandatory !== false,
      estimatedMinutes: Number(unit.estimatedMinutes) || 0,
      // Absent on every unit today; derived from unitType when missing.
      ...(unit.suitableStates?.length ? { suitableStates: unit.suitableStates } : {}),
    });
  }

  return {
    source,
    isProductionEligible: source === 'PRODUCTION',
    units: out,
    rejected,
  };
}

/**
 * Refuse anything built from the prototype source.
 *
 * P7B's production wrapper calls this before it does anything a student can see. It exists so
 * the unsafe path cannot reach a plan by accident — a wrong argument at one call site fails
 * loudly here instead of quietly shipping units nobody published.
 */
export function assertProductionEligible(set: CandidateSet): void {
  if (!set.isProductionEligible) {
    throw new Error(
      `Refusing to build a student plan from candidate source ${set.source}. `
      + 'Production requires PUBLISHED and READY; PROTOTYPE_UNPUBLISHED is for tests only.',
    );
  }
}
