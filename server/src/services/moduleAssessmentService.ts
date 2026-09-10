/**
 * The paper at the end of a curriculum module.
 *
 * ── IT IS COMPOSED, NOT AUTHORED ──────────────────────────────────────────────────────────
 *
 * Fifteen modules would have meant fifteen hand-written tests, kept in step with a curriculum
 * that moves. There is already a bank of 2,700 questions tagged by skill, difficulty and fact,
 * and a selector that knows how to build a fair paper from it — so a module assessment is that
 * selector, scoped to the skills this module taught. Nothing new is written and nothing drifts.
 *
 * ── FRESHNESS IS THE REASON THIS IS WORTH DOING PROPERLY ──────────────────────────────────
 *
 * The student has already met this bank: at the diagnostic, and possibly at a check-in. Selecting
 * by id alone would let the module paper re-ask a question they have seen, and the Foundation bank
 * carries several questions per fact, so even fresh ids can re-ask the same knowledge. Both the
 * ids and the FACTS they have already been asked are passed in, which is what makes the result a
 * measurement of the module rather than of their memory.
 *
 * ── IT MEASURES, IT DOES NOT GATE ─────────────────────────────────────────────────────────
 *
 * There is no pass mark here and nothing checks one. A student may open the next module whether
 * they scored ninety or nine — what the result changes is their Skill DNA, and through it what the
 * plan teaches next. A gate would be a product decision this module does not get to make, and the
 * absence of one is deliberate rather than unfinished.
 *
 * ── PRACTICE AND MEASUREMENT NEVER SHARE QUESTIONS ────────────────────────────────────────
 *
 * Practice content is authored per topic and lives in the content library. The Golden Bank is
 * sealed for measurement. If a topic's practice were ever drawn from this bank, this paper would
 * be a memory test and every guarantee above would be worth nothing.
 */

import mongoose from 'mongoose';
import CareerSkill from '../models/CareerSkill';
import PersonalizedAssessment from '../models/PersonalizedAssessment';
import StudentCurriculumAssignment from '../models/StudentCurriculumAssignment';
import { buildPersonalizedAssessment, seenFactKeysFor } from './personalizedAssessmentService';
import { gradeSubmittedAnswers } from './assessmentAnswerGradingService';
import { projectModuleAssessment, ProjectModuleResult } from './moduleAssessmentEvidenceService';
import { resolveAssessmentPolicy } from './assessmentPolicyService';
import { loadItems } from './skillEvidenceSourceRegistry';

/** Questions per module paper. Enough to diagnose several skills, short enough to finish. */
const MODULE_PAPER_SLOTS = 12;

export type ModuleAssessmentRefusal =
  | 'NO_PLAN'
  | 'MODULE_NOT_IN_PLAN'
  | 'NOTHING_MEASURABLE'
  | 'NOT_ENOUGH_FRESH_QUESTIONS';

export interface ModuleAssessmentStart {
  ok: boolean;
  refused?: ModuleAssessmentRefusal;
  message?: string;
  assessmentId?: string;
  moduleCode?: string;
  moduleName?: string;
  skillKeys?: string[];
  items?: { sourceType: string; sourceId: string; skillKey: string; difficulty: string }[];
}

/**
 * Which skills a module taught THIS student.
 *
 * Read from their plan rather than from the curriculum, because the two differ: a topic set aside
 * as not relevant to their direction was never taught and must not be examined. Testing somebody
 * on material the plan explicitly withheld is the kind of thing that destroys trust in a score.
 */
async function moduleSkillsFor(tenantId: string, studentId: string, moduleCode: string): Promise<{
  skills: string[]; moduleName: string | null; found: boolean;
}> {
  const assignment = await StudentCurriculumAssignment.findOne({
    tenantId, studentId: new mongoose.Types.ObjectId(studentId), status: 'ACTIVE',
  }).lean() as any;
  if (!assignment) return { skills: [], moduleName: null, found: false };

  const mod = ((assignment.moduleAssignments || []) as any[])
    .find(m => String(m.moduleCode) === moduleCode);
  if (!mod) return { skills: [], moduleName: null, found: false };

  const taught = ((mod.topicAssignments || []) as any[])
    .filter(t => t.state !== 'NOT_RELEVANT');

  const skills = [...new Set(taught.flatMap(t => (t.skillKeys || []).map((k: string) => String(k).toUpperCase())))];
  return { skills, moduleName: mod.moduleName || mod.moduleCode, found: true };
}

export async function startModuleAssessment(input: {
  tenantId: string; studentId: string; moduleCode: string;
}): Promise<ModuleAssessmentStart> {
  const { tenantId, studentId, moduleCode } = input;

  const { skills, moduleName, found } = await moduleSkillsFor(tenantId, studentId, moduleCode);
  if (!found) {
    return {
      ok: false,
      refused: skills.length ? 'MODULE_NOT_IN_PLAN' : 'NO_PLAN',
      message: 'That module is not part of your current plan.',
    };
  }

  /**
   * Only skills a paper can actually ask about.
   *
   * SELF_LEARNING is taught in Year 1 and is not answerable by a question — the taxonomy says so.
   * Handing it to the selector would produce a shortfall on a skill nobody could ever author for.
   */
  const assessable = await CareerSkill.find({
    key: { $in: skills }, assessable: { $ne: false }, active: { $ne: false },
  }).select('key').lean() as any[];
  const scope = assessable.map(s => String(s.key).toUpperCase());

  if (!scope.length) {
    return {
      ok: false, refused: 'NOTHING_MEASURABLE',
      message: 'Nothing in this module can be measured by a paper.',
    };
  }

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
    // The half that matters on a bank with several questions per fact.
    seenFactKeys: await seenFactKeysFor(tenantId, priorItems),
    policy: { ...policy, skillSlots: MODULE_PAPER_SLOTS, maxSkills: Math.min(scope.length, MODULE_PAPER_SLOTS) } as any,
  } as any);

  if (!built.ok) {
    return {
      ok: false, refused: 'NOT_ENOUGH_FRESH_QUESTIONS',
      message: built.message
        || 'There are not enough unseen questions left to build this module paper yet.',
    };
  }

  const created: any = await PersonalizedAssessment.create({
    tenantId, studentId, attemptNumber, status: 'IN_PROGRESS',
    purpose: 'MODULE_ASSESSMENT',
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
  });

  return {
    ok: true,
    assessmentId: String(created._id),
    moduleCode,
    moduleName: moduleName || moduleCode,
    skillKeys: scope,
    items: (built.items || []).map(i => ({
      sourceType: i.sourceType, sourceId: String(i.sourceId),
      skillKey: i.skillKey, difficulty: i.difficulty,
    })),
  };
}

export interface ModuleAssessmentResult {
  ok: boolean;
  message?: string;
  moduleScore?: number;
  skillScores?: ProjectModuleResult['skillScores'];
  recorded?: number;
  /** Always false. Stated in the response so no caller has to infer it. */
  gatesNextModule?: boolean;
}

export async function submitModuleAssessment(input: {
  tenantId: string; studentId: string; assessmentId: string;
  answers: { sourceType: string; sourceId: string; response: any }[];
}): Promise<ModuleAssessmentResult> {
  const { tenantId, studentId, assessmentId } = input;

  const paper: any = await PersonalizedAssessment.findOne({
    _id: assessmentId, tenantId, studentId, purpose: 'MODULE_ASSESSMENT',
  });
  if (!paper) return { ok: false, message: 'That module paper does not exist.' };
  if (paper.status === 'SUBMITTED') return { ok: false, message: 'That paper has already been submitted.' };

  /**
   * Graded against the FROZEN paper, so a client cannot introduce questions it prefers, and
   * every item is graded whether or not it was answered — a skipped question is an observation.
   */
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

  /**
   * The skill each item measured comes from the FROZEN paper, not from a fresh lookup.
   *
   * The paper recorded which skill every slot was filled for when it was built. Re-deriving it now
   * would let an admin's mapping change between sitting and grading, and the student's evidence
   * would be attributed to a skill the question was never asked for.
   */
  const bySource = new Map<string, any>((paper.items || []).map((i: any) => [`${i.sourceType}:${i.sourceId}`, i]));
  const loaded = await loadItems(tenantId, all.map((a: any) => ({ sourceType: a.sourceType, sourceId: a.sourceId })));

  const answers = graded.filter(g => g.gradable).map(g => {
    const frozen = bySource.get(`${g.sourceType}:${g.sourceId}`);
    const item = loaded.get(`${g.sourceType}:${g.sourceId}`);
    return {
      itemId: String(g.sourceId),
      itemSourceType: String(g.sourceType),
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
  });

  return {
    ok: true,
    moduleScore: result.moduleScore,
    skillScores: result.skillScores,
    recorded: result.recorded,
    // Measurement only. Nothing downstream reads this as permission to open anything.
    gatesNextModule: false,
  };
}
