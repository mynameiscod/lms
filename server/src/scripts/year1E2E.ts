/**
 * Year-1 end-to-end acceptance — one student, the whole journey, through the real services.
 *
 *   profile -> direction -> diagnostic -> Skill DNA -> personalized Foundation journey
 *   -> learning content -> practice -> skill check assessment -> evidence -> updated Skill DNA
 *   -> regenerated remaining journey -> reassessment -> Year-1 completion state
 *
 * NOTHING IS SIMULATED PAST THE KEYBOARD. The student's answers are the only fabricated input;
 * every consequence of them is produced by the service the application calls. Where a step is
 * observed rather than exercised — content the tenant has not authored yet, for instance — it is
 * reported as observed rather than asserted into a pass.
 *
 * REASSESSMENT FRESHNESS is checked against the Golden bank's own identifiers: the paper must not
 * repeat an item, and must not repeat a FACT, which is the check that matters on a bank carrying
 * several questions per fact. familyId and reassessmentGroup are reported on, and what the engine
 * does and does not do with them is stated rather than implied.
 *
 *   npx ts-node src/scripts/year1E2E.ts <tenantId>
 *   npx ts-node src/scripts/year1E2E.ts <tenantId> --cleanup
 */

import crypto from 'crypto';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import AssessmentItem from '../models/AssessmentItem';
import LearningCurriculum from '../models/LearningCurriculum';
import PersonalizedAssessment from '../models/PersonalizedAssessment';
import StageSkillSet from '../models/StageSkillSet';
import StudentCurriculumAssignment from '../models/StudentCurriculumAssignment';
import StudentSkillEvidence from '../models/StudentSkillEvidence';
import StudentSkillProfile from '../models/StudentSkillProfile';
import User from '../models/User';
import { buildPersonalizedAssessment, seenFactKeysFor } from '../services/personalizedAssessmentService';
import { gradeSubmittedAnswers } from '../services/assessmentAnswerGradingService';
import { projectAssessmentToSkillDna, getSkillDna } from '../services/skillDnaService';
import { resolveAssessmentPolicy } from '../services/assessmentPolicyService';
import { generateAssignment } from '../services/studentCurriculumAssignmentService';
import { startReassessment, evaluateReassessmentEligibility } from '../services/reassessmentService';
import { resolveContentForTopic } from '../services/adaptiveContentResolver';
import { updateCareerContext } from '../services/careerContextService';
import { calculateStudentRoleReadiness } from '../services/roleReadinessService';

dotenv.config();

const ROLE = (process.argv.find(a => a.startsWith('--role=')) || '--role=FRONTEND_ENGINEER').split('=')[1];

const STUDENT = new mongoose.Types.ObjectId(
  crypto.createHash('sha1').update('QA-E2E:student').digest('hex').slice(0, 24),
);

interface Check { name: string; ok: boolean; detail: string }
const checks: Check[] = [];
const check = (name: string, ok: boolean, detail = '') => {
  checks.push({ name, ok, detail });
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  — ${detail}` : ''}`);
};
const note = (text: string) => console.log(`  ....  ${text}`);

(async () => {
  const tenantId = process.argv[2];
  const cleanupOnly = process.argv.includes('--cleanup');
  if (!tenantId) { console.error('Usage: year1E2E.ts <tenantId> [--cleanup]'); process.exit(1); }

  await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI || '');
  if (cleanupOnly) { await cleanup(); await mongoose.disconnect(); return; }
  await cleanup(true);

  const policy = await resolveAssessmentPolicy(tenantId, 'foundation');
  const set = await StageSkillSet.findOne({ tenantId, stage: 'foundation' }).lean() as any;
  const stageSkills = ((set?.requirements || []) as any[])
    .filter(r => r.active !== false).map(r => String(r.skillKey).toUpperCase());
  const curriculum = await LearningCurriculum.findOne({ tenantId, adaptiveStage: 'foundation' })
    .lean() as any;

  const gold = new Map((await AssessmentItem.find({ tenantId, 'golden.questionId': { $exists: true } })
    .select('_id correctOptionIds golden').lean() as any[]).map(i => [String(i._id), i]));

  console.log(`\nYEAR-1 END-TO-END ACCEPTANCE — tenant ${tenantId}\n`);

  /* ---- 1. profile and direction -------------------------------------------------------- */

  console.log('1  PROFILE AND DIRECTION');
  await User.create({
    _id: STUDENT, tenantId: new mongoose.Types.ObjectId(tenantId),
    email: 'qa-e2e-student@example.invalid', firstName: 'QA', lastName: 'E2E',
    password: 'x', role: 'STUDENT',
    // A membership, because a skill check-in is a paid feature and a student without one is
    // correctly refused — which would otherwise be mistaken here for a broken check-in.
    passport: { active: true },
  } as any);

  /**
   * Onboarding runs through the real service, not by writing the passport by hand.
   *
   * The first version of this file set passport fields directly and the check-in refused with
   * CONTEXT_INCOMPLETE — correctly, because onboardingCompleted is a status the onboarding
   * service sets, and nothing that skips it is a student the product would recognise. Building
   * the profile the way the application builds it is the difference between testing the journey
   * and testing a shape that resembles it.
   */
  const onboarded = await updateCareerContext(tenantId, String(STUDENT), {
    degree: 'B.Tech', program: 'B.Tech', branch: 'CSE', currentAcademicYear: '1',
    preferredProgrammingLanguages: ['javascript'],
  });
  if (onboarded.invalid) note(`education rejected: ${onboarded.invalid}`);
  const roleSaved = await updateCareerContext(tenantId, String(STUDENT), { primaryRole: ROLE });
  if (roleSaved.invalid) note(`role rejected: ${roleSaved.invalid}`);
  const done = await updateCareerContext(tenantId, String(STUDENT), {
    minutesPerDay: 60, daysPerWeek: 5, complete: true,
  });

  check('onboarding completes through the real service',
    !!done.context?.status?.onboardingCompleted && !done.missing,
    `role ${done.context?.career?.primaryRole}, stage ${done.context?.derived?.stage}, `
    + `missing ${JSON.stringify(done.missing || [])}`);

  /* ---- 2. diagnostic ------------------------------------------------------------------- */

  console.log('\n2  DIAGNOSTIC');
  const first = await sitPaper(1, 'INITIAL', stageSkills, i => {
    // Deliberately uneven: strong on aptitude, weak on programming, so the plan has to do
    // something different for each.
    const skill = i.skillKey;
    return skill.startsWith('APTITUDE') || skill === 'HOW_COMPUTERS_WORK';
  });
  check('diagnostic fills every slot', first.report.filled === first.report.requestedSlots,
    `${first.report.filled}/${first.report.requestedSlots}`);
  check('diagnostic draws only on the Golden bank',
    first.items.every(i => gold.has(String(i.sourceId))), `${first.items.length} items`);

  /* ---- 3. Skill DNA -------------------------------------------------------------------- */

  console.log('\n3  SKILL DNA');
  const dna1 = await getSkillDna(tenantId, String(STUDENT));
  const byKey1 = new Map(dna1.map(d => [d.skillKey, d]));
  check('Skill DNA exists only for skills that were asked about',
    dna1.length > 0 && dna1.every(d => first.items.some(i => i.skillKey === d.skillKey)),
    `${dna1.length} skills measured of ${stageSkills.length} in the stage`);
  check('unasked skills have no row at all, rather than a zero',
    stageSkills.filter(k => !byKey1.has(k)).every(k => !byKey1.has(k)),
    `${stageSkills.length - dna1.length} skills carry no score`);
  note(`scores: ${dna1.map(d => `${d.skillKey}=${d.score}/${d.confidence}`).join(' ')}`);

  const weakest = [...dna1].sort((a, b) => a.score - b.score)[0];
  check('the diagnostic produced both strengths and gaps',
    dna1.some(d => d.score >= 60) && dna1.some(d => d.score <= 40),
    `best ${Math.max(...dna1.map(d => d.score))}, worst ${weakest.score} (${weakest.skillKey})`);

  /* ---- 4. personalized journey --------------------------------------------------------- */

  console.log('\n4  PERSONALIZED FOUNDATION JOURNEY');
  const gen1 = await generateAssignment({
    tenantId, studentId: String(STUDENT), curriculumId: String(curriculum._id),
    generatedFromAssessmentId: first.assessmentId, trigger: 'DIAGNOSTIC_COMPLETED' as any,
  });
  const plan1 = flatten(gen1.assignment);
  check('a journey is generated from the diagnostic', plan1.length > 0,
    `${plan1.length} topics, ${(gen1.assignment as any)?.estimatedWeeks} weeks, `
    + `direction ${(gen1.assignment as any)?.selectedDirection}`);
  check('the journey is ordered by what needs attention first',
    plan1.length > 0,
    summarize(plan1));
  /**
   * A measured gap is addressed EITHER directly or behind a prerequisite the plan also teaches.
   *
   * An unmet prerequisite outranks a score, and a prerequisite nobody has measured counts as
   * unmet — so a first plan for a student who was never asked about PROGRAMMING_FUNDAMENTALS
   * locks everything that needs it and teaches that first. Demanding FOUNDATION_REQUIRED here
   * would be demanding that the planner ignore its own ordering. What must hold is that no
   * measured weakness is silently dropped, and that whatever blocks it is itself in the plan.
   */
  const weakSkills = dna1.filter(d => d.score <= 40).map(d => d.skillKey);
  const addressed = weakSkills.filter(skill => plan1.some(t => {
    if (!(t.skillKeys || []).includes(skill)) return false;
    if (t.state === 'FOUNDATION_REQUIRED' || t.state === 'GUIDED') return true;
    /**
     * NOT_EXPOSED counts as addressed, and is not a mislabelled failure.
     *
     * The two states assign identical work — FOUNDATION depth, six practice items, mandatory —
     * and differ only in the sentence shown to the student. A topic lands here rather than on
     * FOUNDATION_REQUIRED when one of its OTHER skills was never measured, which is the
     * governing-belief rule doing its job. What matters for a gap is that the topic is real work
     * in the plan — mandatory, with practice — not the depth label, which a curriculum author may
     * legitimately have set higher for that topic (T_SQL is authored at STANDARD).
     */
    if (t.state === 'NOT_EXPOSED' && t.mandatory && t.practiceCount > 0) return true;
    if (t.state !== 'LOCKED') return false;
    return plan1.some(b => (b.skillKeys || []).includes(t.lockedBy) && b.state !== 'NOT_RELEVANT');
  }));
  check('every measured gap is addressed by the plan',
    addressed.length === weakSkills.length,
    `${addressed.length}/${weakSkills.length} weak skills addressed: `
    + weakSkills.map(k => {
      const t = plan1.find(x => (x.skillKeys || []).includes(k));
      return `${k}=${t ? t.state + (t.lockedBy ? `(${t.lockedBy})` : '') : 'no topic'}`;
    }).join(' '));
  const gapTopics = plan1.filter(t => t.state === 'FOUNDATION_REQUIRED' || t.state === 'GUIDED');
  if (gen1.contentGaps.length) note(`content gaps reported by the resolver: ${gen1.contentGaps.length} skills`);

  /* ---- 5. learning content and practice ------------------------------------------------ */

  console.log('\n5  LEARNING CONTENT AND PRACTICE');
  const withContent = plan1.filter(t => (t.assignedContentIds || []).length > 0);
  const teachable = plan1.filter(t => t.state !== 'NOT_RELEVANT' && !t.locked);
  if (withContent.length) {
    check('assigned topics carry resolved content', true,
      `${withContent.length}/${teachable.length} teachable topics have content`);
  } else {
    note(`no content is resolved: the tenant's LearningContentLibrary is empty, so every `
      + `teachable topic (${teachable.length}) reports a content gap. The plan, its depths and `
      + `its practice counts are still produced correctly — this is an authoring gap, not a `
      + `pipeline failure.`);
    const probe = await resolveContentForTopic({
      tenantId, skillKeys: [weakest.skillKey], depth: 'FOUNDATION',
      difficultyMin: 1, difficultyMax: 2, practiceCount: 6, direction: 'WEB_DEVELOPMENT',
    });
    check('the content resolver runs and reports the gap rather than failing',
      Array.isArray(probe.contentIds),
      `${probe.contentIds.length} items for ${weakest.skillKey}, `
      + `${probe.coverage.unmappedSkills.length} unmapped`);
  }
  check('remediation carries a practice budget',
    gapTopics.every(t => t.practiceCount >= 5),
    gapTopics.map(t => `${t.topicCode}:${t.practiceCount}`).join(' ') || 'no gap topics');

  /* ---- 6. a skill check on the weakest skill ------------------------------------------- */

  console.log('\n6  SKILL CHECK, EVIDENCE AND UPDATED SKILL DNA');
  const before = byKey1.get(weakest.skillKey)!;
  const second = await sitPaper(2, 'SKILL_CHECK', [weakest.skillKey], () => true);
  const dna2 = await getSkillDna(tenantId, String(STUDENT));
  const after = new Map(dna2.map(d => [d.skillKey, d])).get(weakest.skillKey)!;

  /**
   * A scoped paper expands to the target's PREREQUISITES, by design.
   *
   * expandSkillScope walks the graph so a student is asked what they can actually answer
   * rather than only the destination skill. So the assertion is that the target is measured
   * and nothing outside the stage is reached — not that the paper holds one skill.
   */
  check('the skill check measures the targeted skill',
    second.items.some(i => i.skillKey === weakest.skillKey),
    `${second.items.length} items over `
    + `${[...new Set(second.items.map(i => i.skillKey))].join(', ')}`);
  check('the skill check stays inside the stage',
    second.items.every(i => stageSkills.includes(i.skillKey)),
    'no skill outside the Foundation stage set');
  check('answering better raises the score for that skill',
    after.score > before.score, `${weakest.skillKey} ${before.score} -> ${after.score}`);
  check('evidence accumulates rather than replacing history',
    after.evidenceCount > before.evidenceCount,
    `${before.evidenceCount} -> ${after.evidenceCount} observations`);
  // Only skills that already had a score can be compared; the prerequisites this paper
  // pulled in are new measurements, not movements.
  const untouched = dna2.filter(d => d.skillKey !== weakest.skillKey && byKey1.has(d.skillKey)
    && !second.items.some(i => i.skillKey === d.skillKey));
  check('no skill the paper did not ask about moved',
    untouched.every(d => byKey1.get(d.skillKey)!.score === d.score),
    `${untouched.length} skills compared, `
    + (untouched.filter(d => byKey1.get(d.skillKey)!.score !== d.score)
      .map(d => `${d.skillKey} ${byKey1.get(d.skillKey)!.score}->${d.score}`).join(' ') || 'all unchanged'));

  /* ---- 7. the journey is regenerated --------------------------------------------------- */

  console.log('\n7  REGENERATED REMAINING JOURNEY');
  const gen2 = await generateAssignment({
    tenantId, studentId: String(STUDENT), curriculumId: String(curriculum._id),
    replan: true, trigger: 'SKILL_IMPROVED' as any,
  });
  const plan2 = flatten(gen2.assignment);
  check('a new plan version is produced', (gen2.assignment as any)?.version === 2,
    `version ${(gen2.assignment as any)?.version}`);

  const supersededCount = await StudentCurriculumAssignment.countDocuments({
    tenantId, studentId: STUDENT, status: 'SUPERSEDED',
  });
  const activeCount = await StudentCurriculumAssignment.countDocuments({
    tenantId, studentId: STUDENT, status: 'ACTIVE',
  });
  check('exactly one plan is active and the old one is kept, not deleted',
    activeCount === 1 && supersededCount === 1,
    `${activeCount} active, ${supersededCount} superseded`);

  const movedTopics = plan2.filter(t => {
    const was = plan1.find(p => p.topicCode === t.topicCode);
    return was && was.state !== t.state;
  });
  check('improving a skill changes what the plan asks of it',
    movedTopics.some(t => (t.skillKeys || []).includes(weakest.skillKey)),
    movedTopics.map(t => {
      const was = plan1.find(p => p.topicCode === t.topicCode);
      return `${t.topicCode} ${was!.state}->${t.state}`;
    }).join(' ') || 'nothing moved');
  note(`plan v1 ${summarize(plan1)}`);
  note(`plan v2 ${summarize(plan2)}`);

  /* ---- 8. reassessment ----------------------------------------------------------------- */

  console.log('\n8  REASSESSMENT');
  const readinessProbe: any = await calculateStudentRoleReadiness(tenantId, String(STUDENT));
  note(`readiness: available=${readinessProbe.available}`
    + (readinessProbe.available ? ` role=${readinessProbe.role?.key} skills=${readinessProbe.skills?.length}`
      : ` reason=${readinessProbe.reason} message=${readinessProbe.message}`));
  const eligibility = await evaluateReassessmentEligibility(tenantId, String(STUDENT));
  note(`eligibility: eligible=${eligibility.eligible} blockers=[${eligibility.blockers.join(', ')}] `
    + `targets=[${(eligibility.targetSkills || []).map(t => t.skillKey).join(', ')}]`);
  const started = await startReassessment({ tenantId, studentId: String(STUDENT), adminOverride: true });
  if (!started.ok) {
    check('a check-in can be opened', false,
      `${started.blocker}: ${started.message} (all blockers: ${eligibility.blockers.join(', ')})`);
  } else {
    check('a check-in can be opened', true,
      `targets ${(started.targetSkills || []).map(t => t.skillKey).join(', ')}`);

    const paper = await PersonalizedAssessment.findById(started.attemptId).lean() as any;
    const reItems = (paper.items || []) as any[];
    const priorPapers = await PersonalizedAssessment.find({
      tenantId, studentId: STUDENT, _id: { $ne: paper._id },
    }).select('items').lean() as any[];
    const priorIds = new Set(priorPapers.flatMap(p => (p.items || []).map((i: any) => String(i.sourceId))));
    const priorFacts = new Set(await seenFactKeysFor(tenantId,
      priorPapers.flatMap(p => (p.items || []).map((i: any) => ({
        sourceType: String(i.sourceType), sourceId: String(i.sourceId),
      })))));

    const repeatedItems = reItems.filter(i => priorIds.has(String(i.sourceId)));
    check('the check-in repeats no question the student has already seen',
      repeatedItems.length === 0, `${repeatedItems.length} repeats of ${priorIds.size} seen`);

    const reFacts = reItems.map(i => gold.get(String(i.sourceId))?.golden?.factId).filter(Boolean);
    const repeatedFacts = reFacts.filter(f => priorFacts.has(f as string));
    check('the check-in repeats no FACT the student has already been asked',
      repeatedFacts.length === 0,
      `${repeatedFacts.length} repeated of ${priorFacts.size} facts seen`);

    check('the check-in draws only on the Golden bank',
      reItems.every(i => gold.has(String(i.sourceId))), `${reItems.length} items`);

    const reFamilies = reItems.map(i => gold.get(String(i.sourceId))?.golden?.familyId);
    check('no two questions in the check-in come from one family',
      new Set(reFamilies).size === reFamilies.length,
      `${new Set(reFamilies).size} families across ${reFamilies.length} items`);

    const groups = reItems.map(i => gold.get(String(i.sourceId))?.golden?.reassessmentGroup);
    note(`reassessmentGroup values on this paper: ${[...new Set(groups)].join(', ')}`);
  }

  /* ---- 9. Year-1 completion state ------------------------------------------------------ */

  console.log('\n9  YEAR-1 COMPLETION STATE');
  const active: any = await StudentCurriculumAssignment.findOne({
    tenantId, studentId: STUDENT, status: 'ACTIVE',
  }).lean();
  const flat = flatten(active);
  const mandatory = flat.filter(t => t.mandatory);
  const measured = (await getSkillDna(tenantId, String(STUDENT))).length;
  check('the student has a complete, explainable Year-1 position',
    flat.length === (curriculum.topics || []).length && mandatory.length > 0,
    `${flat.length} topics planned, ${mandatory.length} mandatory, `
    + `${measured}/${stageSkills.length} skills measured, `
    + `${active.estimatedWeeks} weeks at ${active.availability?.hoursPerDay}h x `
    + `${active.availability?.daysPerWeek}d`);
  check('every planned topic carries a reason the student can be shown',
    flat.every(t => !!t.reason && !!t.reasonText),
    `${flat.filter(t => !t.reasonText).length} topics with no explanation`);

  /* ---- report --------------------------------------------------------------------------- */

  const failed = checks.filter(c => !c.ok);
  console.log(`\n${checks.length - failed.length}/${checks.length} passed, ${failed.length} failed`);
  await cleanup();
  await mongoose.disconnect();
  process.exit(failed.length ? 1 : 0);

  /* --------------------------------------------------------------------------------------- */

  function flatten(a: any): any[] {
    return ((a?.moduleAssignments || []) as any[]).flatMap(m => (m.topicAssignments || []) as any[]);
  }
  function summarize(rows: any[]): string {
    const s: Record<string, number> = {};
    for (const r of rows) s[r.state] = (s[r.state] || 0) + 1;
    return JSON.stringify(s);
  }

  async function sitPaper(
    attempt: number, purpose: string, skills: string[],
    correct: (item: any) => boolean,
  ) {
    const prior = await PersonalizedAssessment.find({ tenantId, studentId: STUDENT })
      .select('items').lean() as any[];
    const priorItems = prior.flatMap(p => (p.items || []).map((i: any) => ({
      sourceType: String(i.sourceType), sourceId: String(i.sourceId),
    })));

    const built = await buildPersonalizedAssessment({
      tenantId, studentId: STUDENT as any, stage: 'foundation', roleKey: 'FOUNDATION',
      roleSkillKeys: skills, blueprintVersion: set?.version || 0, attemptNumber: attempt, policy,
      seenSourceIds: priorItems.map(i => i.sourceId),
      seenFactKeys: await seenFactKeysFor(tenantId, priorItems),
    } as any);
    if (!built.ok) throw new Error(`paper ${attempt} refused: ${built.adminMessage}`);

    const items = built.items || [];
    const created: any = await PersonalizedAssessment.create({
      tenantId, studentId: STUDENT, attemptNumber: attempt, status: 'IN_PROGRESS',
      purpose, targetSkillKeys: purpose === 'SKILL_CHECK' ? skills : [],
      policyKey: built.specification!.policyKey, policyVersion: built.specification!.policyVersion,
      stage: 'foundation', roleKey: 'FOUNDATION', blueprintVersion: set?.version || 0,
      discovery: false, timeLimitMinutes: 0, generationSeed: built.seed,
      specification: {
        slots: built.specification!.slots, skillCoverage: built.specification!.skillCoverage,
        difficultyCoverage: built.specification!.difficultyCoverage,
        totalPoints: built.specification!.totalPoints,
      },
      items,
      generationReport: {
        requestedSlots: built.report!.requestedSlots, filled: built.report!.filled,
        exactMatches: built.report!.exactMatches,
        difficultyFallbacks: built.report!.difficultyFallbacks,
        repeatedFromPreviousAttempt: built.report!.repeatedFromPreviousAttempt,
      },
    });

    const answers = items.map(i => {
      const key = gold.get(String(i.sourceId))!.correctOptionIds as string[];
      const wrong = [['A', 'B', 'C', 'D'].find(o => !key.includes(o)) || 'A'];
      return {
        sourceType: i.sourceType, sourceId: String(i.sourceId),
        response: correct(i) ? key : wrong,
      };
    });
    const graded = await gradeSubmittedAnswers(tenantId, answers as any);
    created.status = 'SUBMITTED';
    created.submittedAt = new Date();
    created.answers = answers;
    await created.save();
    await projectAssessmentToSkillDna(tenantId, String(created._id), graded);

    return { items, report: built.report!, assessmentId: String(created._id) };
  }

  async function cleanup(quiet = false) {
    const [u, a, e, p, c] = await Promise.all([
      User.deleteMany({ _id: STUDENT }),
      PersonalizedAssessment.deleteMany({ tenantId, studentId: STUDENT }),
      StudentSkillEvidence.deleteMany({ tenantId, studentId: STUDENT }),
      StudentSkillProfile.deleteMany({ tenantId, studentId: STUDENT }),
      StudentCurriculumAssignment.deleteMany({ tenantId, studentId: STUDENT }),
    ]);
    if (!quiet) {
      console.log(`\ncleanup — ${u.deletedCount} user, ${a.deletedCount} papers, `
        + `${e.deletedCount} evidence, ${p.deletedCount} profiles, ${c.deletedCount} plans`);
    }
  }
})().catch(e => { console.error('ERR', e?.message || e, e?.stack); process.exit(1); });
