/**
 * conceptLearningUnitService — authoring, validating and publishing learning journeys.
 *
 * Split from the resolver on purpose. This module is the ADMIN half: it owns what a unit is
 * allowed to look like and when it may go live. The resolver is the STUDENT half and only
 * reads published rows. Keeping them apart is what stops the daily mission engine growing a
 * publish workflow inside it.
 */
import mongoose from 'mongoose';
import ConceptLearningUnit, { IConceptLearningUnit, IConceptLearningStep } from '../models/ConceptLearningUnit';
import CareerSkill from '../models/CareerSkill';
import CareerSkillResource from '../models/CareerSkillResource';
import {
  PUBLISH_REQUIREMENTS, PUBLISH_ADVISORIES, readinessPercent, workTypeForPhase,
  LearningUnitStatus, ConceptReadinessStatus,
} from '../data/conceptLearningPolicy';

export interface ReadinessCheck {
  key: string;
  label: string;
  passed: boolean;
  required: boolean;
  detail: string;
}

export interface UnitReadiness {
  publishable: boolean;
  percent: number;
  checks: ReadinessCheck[];
  blocking: string[];
}

/** Stable ids that survive reordering, so progress never has to be rewritten. */
export const newStepId = (): string => `s_${new mongoose.Types.ObjectId().toString()}`;

/**
 * Renumber to 1..n in the order given.
 *
 * Sequence is presentation, stepId is identity. An admin dragging step 5 to position 2 must
 * not disturb what any student has already completed, so this rewrites positions only.
 */
export function normaliseSequence(steps: IConceptLearningStep[]): IConceptLearningStep[] {
  return steps
    .slice()
    .sort((a, b) => (a.sequence ?? 0) - (b.sequence ?? 0))
    .map((s, i) => ({ ...s, sequence: i + 1, stepId: s.stepId || newStepId() }));
}

export const unitEstimatedMinutes = (steps: IConceptLearningStep[]): number =>
  steps.reduce((n, s) => n + (Number(s.estimatedMinutes) || 0), 0);

/**
 * Whether a unit is fit to be published, and how complete it is.
 *
 * Computed rather than stored, the same way company readiness is: a stored verdict drifts from
 * the data the moment somebody retires a resource the unit points at, and the first anyone
 * would know is a student meeting a step that opens nothing.
 */
export async function evaluateReadiness(unit: IConceptLearningUnit): Promise<UnitReadiness> {
  const steps = unit.steps || [];
  const phases = steps.map(s => String(s.phase));
  const workTypes = phases.map(workTypeForPhase);

  const skill: any = await CareerSkill.findOne({ key: unit.skillKey }).lean();

  // Every resource the unit points at, in one query rather than one per step.
  const referencedIds = steps.map(s => String(s.resourceId || '')).filter(Boolean);
  const validIds = referencedIds.filter(id => mongoose.isValidObjectId(id));
  const found = validIds.length
    ? await CareerSkillResource.find({ tenantId: unit.tenantId, _id: { $in: validIds } })
        .select('_id active title').lean() as any[]
    : [];
  const byId = new Map(found.map(r => [String(r._id), r]));

  const brokenRefs = referencedIds.filter(id => !byId.has(id));
  const inactiveRefs = referencedIds.filter(id => byId.get(id) && byId.get(id)!.active === false);

  const seqs = steps.map(s => s.sequence);
  const sequenceValid = steps.length > 0
    && new Set(seqs).size === seqs.length
    && seqs.every((n, i) => n === i + 1);
  const stepIds = steps.map(s => s.stepId);
  const idsUnique = new Set(stepIds).size === stepIds.length && stepIds.every(Boolean);

  const requiredMissingDuration = steps.filter(s => s.required && !(Number(s.estimatedMinutes) > 0));

  const results: Record<string, { passed: boolean; detail: string }> = {
    title:          { passed: !!String(unit.title || '').trim(), detail: unit.title ? 'Set' : 'Not set' },
    outcomes:       { passed: (unit.learningOutcomes || []).filter(Boolean).length > 0,
                      detail: `${(unit.learningOutcomes || []).filter(Boolean).length} written` },
    skill:          { passed: !!skill && skill.active !== false,
                      detail: !skill ? `${unit.skillKey} is not in the skill graph` : skill.active === false ? 'Skill is retired' : skill.name || unit.skillKey },
    steps:          { passed: steps.length > 0, detail: `${steps.length} step${steps.length === 1 ? '' : 's'}` },
    learn_step:     { passed: workTypes.includes('LEARN'), detail: workTypes.includes('LEARN') ? 'Present' : 'Nothing explains the concept' },
    practice_step:  { passed: workTypes.includes('PRACTICE'), detail: workTypes.includes('PRACTICE') ? 'Present' : 'Nothing for the student to do' },
    sequence:       { passed: sequenceValid && idsUnique,
                      detail: !idsUnique ? 'Duplicate or missing step ids' : sequenceValid ? 'Contiguous from 1' : 'Positions are not contiguous' },
    resources:      { passed: brokenRefs.length === 0 && inactiveRefs.length === 0,
                      detail: brokenRefs.length ? `${brokenRefs.length} step(s) point at a resource that no longer exists`
                            : inactiveRefs.length ? `${inactiveRefs.length} step(s) point at a retired resource` : 'All present and active' },
    durations:      { passed: requiredMissingDuration.length === 0,
                      detail: requiredMissingDuration.length ? `${requiredMissingDuration.length} required step(s) have no minutes` : 'Set' },
    // Advisories
    check_step:     { passed: workTypes.includes('ASSESS'), detail: workTypes.includes('ASSESS') ? 'Present' : 'Nothing here becomes evidence' },
    review_step:    { passed: workTypes.includes('REVIEW'), detail: workTypes.includes('REVIEW') ? 'Present' : 'None' },
    apply_step:     { passed: phases.includes('APPLY'), detail: phases.includes('APPLY') ? 'Present' : 'None' },
  };

  const videos = validIds.length
    ? await CareerSkillResource.countDocuments({ tenantId: unit.tenantId, _id: { $in: validIds }, resourceType: 'video' })
    : 0;
  results.video = {
    passed: videos > 0,
    detail: videos ? `${videos} video step(s)` : 'None — fine for a concept better taught in writing',
  };

  const checks: ReadinessCheck[] = [
    ...PUBLISH_REQUIREMENTS.map(r => ({
      key: r.key, label: r.label, required: true,
      passed: results[r.key]?.passed ?? false,
      detail: results[r.key]?.detail || r.hint,
    })),
    ...PUBLISH_ADVISORIES.map(a => ({
      key: a.key, label: a.label, required: false,
      passed: results[a.key]?.passed ?? false,
      detail: results[a.key]?.detail || a.hint,
    })),
  ];

  const passedRequired = checks.filter(c => c.required && c.passed).length;
  const passedAdvisory = checks.filter(c => !c.required && c.passed).length;
  const blocking = checks.filter(c => c.required && !c.passed).map(c => c.label);

  return {
    publishable: blocking.length === 0,
    percent: readinessPercent(passedRequired, passedAdvisory),
    checks,
    blocking,
  };
}

/** What the admin concept list shows per skill. */
export const statusFor = (unit: IConceptLearningUnit | null, ready: UnitReadiness | null): ConceptReadinessStatus => {
  if (!unit) return 'NOT_CONFIGURED';
  if (unit.status === 'PUBLISHED') return 'PUBLISHED';
  if (unit.status === 'ARCHIVED') return 'ARCHIVED';
  return ready?.publishable ? 'READY' : 'INCOMPLETE';
};

/**
 * The unit a student should be served for a skill.
 *
 * PUBLISHED only, highest version. A draft is an admin's work in progress and reaching a
 * student with one is the failure the lifecycle exists to prevent.
 */
export const publishedUnitForSkill = (tenantId: string, skillKey: string) =>
  ConceptLearningUnit.findOne({ tenantId, skillKey: String(skillKey).toUpperCase(), status: 'PUBLISHED' })
    .sort({ version: -1 })
    .lean() as any as Promise<IConceptLearningUnit | null>;

/** The exact version a student is mid-way through, whatever has been published since. */
export const unitVersion = (tenantId: string, unitId: any, version: number) =>
  ConceptLearningUnit.findOne({ tenantId, _id: unitId, version }).lean() as any as Promise<IConceptLearningUnit | null>;

export interface PublishResult {
  published: boolean;
  version?: number;
  readiness: UnitReadiness;
  message?: string;
}

/**
 * Publish, refusing when the unit is not fit to teach.
 *
 * The previously published version is ARCHIVED rather than deleted, and only after the new
 * one is written — a student mid-journey reads their pinned version by id, so it has to
 * survive. Publishing raises `version`, which is what makes those two rows distinguishable.
 */
export async function publishUnit(tenantId: string, unitId: string, actor?: string): Promise<PublishResult> {
  const doc = await ConceptLearningUnit.findOne({ tenantId, _id: unitId });
  if (!doc) return { published: false, readiness: { publishable: false, percent: 0, checks: [], blocking: ['Unit not found'] }, message: 'Unit not found' };

  const readiness = await evaluateReadiness(doc);
  if (!readiness.publishable) {
    return { published: false, readiness, message: `Cannot publish: ${readiness.blocking.join(', ')}` };
  }

  const live = await ConceptLearningUnit.findOne({ tenantId, skillKey: doc.skillKey, status: 'PUBLISHED' });
  // Same row being republished after an edit — raise the version so pinned progress can tell
  // the two apart, rather than mutating what students are already reading.
  const nextVersion = Math.max(doc.version || 1, (live?.version || 0) + 1);

  if (live && String(live._id) !== String(doc._id)) {
    live.status = 'ARCHIVED';
    await live.save();
  }

  doc.steps = normaliseSequence(doc.steps || []) as any;
  doc.estimatedMinutes = unitEstimatedMinutes(doc.steps);
  doc.version = nextVersion;
  doc.status = 'PUBLISHED';
  doc.publishedAt = new Date();
  if (actor) doc.updatedBy = actor;
  await doc.save();

  return { published: true, version: nextVersion, readiness };
}

export async function setStatus(tenantId: string, unitId: string, status: LearningUnitStatus, actor?: string) {
  const doc = await ConceptLearningUnit.findOne({ tenantId, _id: unitId });
  if (!doc) return null;
  doc.status = status;
  if (actor) doc.updatedBy = actor;
  await doc.save();
  return doc;
}
