/**
 * Year-1 Skill DNA and personalization QA — seven synthetic students, end to end.
 *
 * THE FLOW UNDER TEST IS THE PERSISTED ONE, through the services the application calls:
 *
 *   buildPersonalizedAssessment -> PersonalizedAssessment -> gradeSubmittedAnswers
 *   -> projectAssessmentToSkillDna -> StudentSkillEvidence -> StudentSkillProfile
 *   -> generateAssignment -> StudentCurriculumAssignment (the personalized journey)
 *
 * EVIDENCE IS SHAPED BY SCOPED PAPERS, not by hoping a 32-slot diagnostic happens to cover the
 * skill a persona is meant to be strong at. A scoped paper is the same generator on the same
 * pool with one skill in scope — the real SKILL_CHECK path — so a persona's profile is built by
 * answering questions rather than by writing rows into the profile collection. Writing the
 * profile directly would prove nothing about the pipeline that produces it.
 *
 * WHAT IT PROVES, in the words of the acceptance brief:
 *
 *   not assessed != weak          a skill nobody asked about is NOT_EXPOSED with no profile row,
 *                                 never FOUNDATION_REQUIRED and never a score of 0
 *   not exposed != zero mastery   the plan teaches it from the beginning without claiming failure
 *   strong reduces remediation    a demonstrated skill drops to optional work
 *   weak produces remediation     a failed skill becomes mandatory foundation work
 *   direction personalizes        off-direction topics become NOT_RELEVANT, not deleted
 *   direction never bypasses      a locked prerequisite stays locked for the chosen direction too
 *
 * Everything it writes belongs to synthetic users created here and removed at the end.
 *
 *   npx ts-node src/scripts/year1PersonalizationQa.ts <tenantId>
 *   npx ts-node src/scripts/year1PersonalizationQa.ts <tenantId> --cleanup
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
import { buildPersonalizedAssessment } from '../services/personalizedAssessmentService';
import { gradeSubmittedAnswers } from '../services/assessmentAnswerGradingService';
import { projectAssessmentToSkillDna, getSkillDna } from '../services/skillDnaService';
import { resolveAssessmentPolicy } from '../services/assessmentPolicyService';
import { generateAssignment } from '../services/studentCurriculumAssignmentService';

dotenv.config();

const idFor = (name: string) => new mongoose.Types.ObjectId(
  crypto.createHash('sha1').update(`QA-PERS:${name}`).digest('hex').slice(0, 24),
);

/** Skills every persona is measured on, so each profile is controlled rather than incidental. */
const FOCUS = [
  'PROGRAMMING_FUNDAMENTALS', 'LOOPS_BASICS', 'HTML', 'CSS',
  'PATTERN_RECOGNITION', 'APTITUDE_DATA_INTERPRETATION',
];

interface Persona {
  name: string;
  label: string;
  primaryRole: string;
  /** Fraction of items answered correctly, per focus skill. Absent = not measured at all. */
  performance: Record<string, number>;
}

const PERSONAS: Persona[] = [
  {
    name: 'beginner', label: 'beginner — everything wrong', primaryRole: 'NOT_SURE',
    performance: { PROGRAMMING_FUNDAMENTALS: 0, LOOPS_BASICS: 0, HTML: 0 },
  },
  {
    name: 'strong', label: 'strong programmer', primaryRole: 'SOFTWARE_ENGINEER',
    performance: { PROGRAMMING_FUNDAMENTALS: 1, LOOPS_BASICS: 1 },
  },
  {
    name: 'mixed', label: 'mixed profile', primaryRole: 'SOFTWARE_ENGINEER',
    performance: { PROGRAMMING_FUNDAMENTALS: 1, LOOPS_BASICS: 0, HTML: 0.5 },
  },
  {
    name: 'web', label: 'web direction, weak programming', primaryRole: 'FRONTEND_ENGINEER',
    performance: { PROGRAMMING_FUNDAMENTALS: 0, HTML: 1 },
  },
  {
    name: 'aiml', label: 'AI/ML direction, strong programming', primaryRole: 'ML_ENGINEER',
    performance: { PROGRAMMING_FUNDAMENTALS: 1, PATTERN_RECOGNITION: 1 },
  },
  {
    name: 'backend', label: 'software-development direction', primaryRole: 'BACKEND_ENGINEER',
    performance: { PROGRAMMING_FUNDAMENTALS: 0.75, LOOPS_BASICS: 0.5 },
  },
  {
    name: 'undecided', label: 'undecided', primaryRole: 'NOT_SURE',
    performance: { PROGRAMMING_FUNDAMENTALS: 0.5 },
  },
];

interface Check { name: string; ok: boolean; detail: string }
const checks: Check[] = [];
const check = (name: string, ok: boolean, detail = '') => { checks.push({ name, ok, detail }); };

(async () => {
  const tenantId = process.argv[2];
  const cleanupOnly = process.argv.includes('--cleanup');
  if (!tenantId) { console.error('Usage: year1PersonalizationQa.ts <tenantId> [--cleanup]'); process.exit(1); }

  await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI || '');
  if (cleanupOnly) { await cleanup(); await mongoose.disconnect(); return; }
  await cleanup(true);

  const policy = await resolveAssessmentPolicy(tenantId, 'foundation');
  const set = await StageSkillSet.findOne({ tenantId, stage: 'foundation' }).lean() as any;
  const stageSkills = ((set?.requirements || []) as any[])
    .filter(r => r.active !== false).map(r => String(r.skillKey).toUpperCase());

  const curriculum = await LearningCurriculum.findOne({ tenantId, adaptiveStage: 'foundation' })
    .lean() as any;
  if (!curriculum) { console.error('No foundation curriculum in this tenant.'); process.exit(1); }

  const curriculumMandatory = new Map<string, boolean>(
    ((curriculum.topics || []) as any[]).map(t => [t.topicCode, t.mandatory !== false]));
  const curriculumDirections = new Map<string, string[]>(
    ((curriculum.topics || []) as any[]).map(t => [t.topicCode, t.applicableDirections || []]));

  const items = await AssessmentItem.find({ tenantId, 'golden.questionId': { $exists: true } })
    .select('_id correctOptionIds golden').lean() as any[];
  const gold = new Map(items.map(i => [String(i._id), i]));

  console.log(`\nYEAR-1 PERSONALIZATION QA — tenant ${tenantId}`);
  console.log(`curriculum "${curriculum.title}" — ${(curriculum.topics || []).length} topics\n`);

  for (const p of PERSONAS) {
    const studentId = idFor(p.name);
    await User.create({
      _id: studentId, tenantId: new mongoose.Types.ObjectId(tenantId),
      email: `qa-pers-${p.name}@example.invalid`, firstName: 'QA', lastName: p.name,
      password: 'x', role: 'STUDENT',
      passport: { primaryRole: p.primaryRole, hoursPerDay: 1, daysPerWeek: 5 },
    } as any);

    // One scoped paper per focus skill the persona has a performance for. Skills absent from
    // `performance` are deliberately never asked about — that is the "not assessed" case.
    for (const [skillKey, fraction] of Object.entries(p.performance)) {
      await sitScopedPaper(studentId, skillKey, fraction);
    }

    const dna = await getSkillDna(tenantId, String(studentId));
    const byKey = new Map(dna.map(d => [d.skillKey, d]));

    const gen = await generateAssignment({
      tenantId, studentId: String(studentId), curriculumId: String(curriculum._id),
    });
    const assignment: any = gen.assignment;

    if (!assignment) {
      check(`${p.label}: plan generated`, false, gen.refused || 'no assignment');
      continue;
    }
    /**
     * Topic decisions are persisted INSIDE their module, not as a flat list.
     *
     * Reading a non-existent `topicAssignments` off the assignment gave an empty array, and every
     * per-topic assertion then reported "topic missing" against a plan that was in fact complete.
     * An empty list must never be the thing an assertion silently agrees with, so the flattened
     * count is checked before anything is concluded from it.
     */
    const decisions = ((assignment.moduleAssignments || []) as any[])
      .flatMap(m => (m.topicAssignments || []) as any[]);

    check(`${p.label}: plan generated`, decisions.length > 0,
      `${decisions.length} topics across ${(assignment.moduleAssignments || []).length} modules, `
      + `direction ${assignment.selectedDirection || '(none)'} / ${assignment.directionStatus}`);
    const byTopic = new Map(decisions.map(d => [d.topicCode, d]));
    const stateOfSkill = (skill: string) => decisions
      .filter(d => (d.skillKeys || []).includes(skill))
      .map(d => d.state);

    /* ---- not assessed is not weak, and not zero -------------------------------------- */

    const unmeasured = FOCUS.filter(k => !(k in p.performance));
    for (const skill of unmeasured) {
      const profiled = byKey.has(skill);
      check(`${p.label}: ${skill} unmeasured has no Skill DNA row`, !profiled,
        profiled ? `score ${byKey.get(skill)!.score}` : 'absent, as it should be');

      const states = stateOfSkill(skill);
      const wrong = states.filter(s => s === 'FOUNDATION_REQUIRED');
      check(`${p.label}: ${skill} unmeasured is never FOUNDATION_REQUIRED`,
        wrong.length === 0, states.join(',') || 'no topic teaches it');
    }

    /* ---- strong reduces remediation, weak produces it -------------------------------- */

    /**
     * The engine's contract, asserted over EVERY topic rather than over one hand-picked skill.
     *
     * Three rules of the personalizer decide a topic, and all three were mistaken for defects on
     * the first run of this file, so each is stated here as the thing being tested:
     *
     *   - a topic is governed by the skill we know LEAST about, so one unmeasured skill in a
     *     multi-skill topic makes the whole topic NOT_EXPOSED however well the other scored;
     *   - an unmet prerequisite outranks any score, so a topic can be LOCKED regardless;
     *   - a topic the curriculum marks optional stays optional at every state.
     *
     * `governing` reproduces the first rule because it IS the contract under test.
     */
    const governing = (skillKeys: string[]): { score: number; confidence: string } | null => {
      if (!skillKeys.length) return null;
      if (skillKeys.some(k => !byKey.has(k))) return null;
      const rows = skillKeys.map(k => byKey.get(k)!);
      return rows.reduce((worst, r) => (r.score < worst.score ? r : worst), rows[0]) as any;
    };

    for (const d of decisions) {
      const g = governing(d.skillKeys || []);
      const open = d.state !== 'LOCKED' && d.state !== 'NOT_RELEVANT';

      if (g && open && g.score >= 85) {
        check(`${p.label}: mastered topic ${d.topicCode} drops to light work`,
          ['VERIFIED', 'REVISION'].includes(d.state) && d.practiceCount <= 2,
          `${d.state} practice=${d.practiceCount} score=${g.score}`);
        if (d.state === 'VERIFIED') {
          check(`${p.label}: VERIFIED ${d.topicCode} is never mandatory`,
            d.mandatory === false && d.practiceCount === 0,
            `mandatory=${d.mandatory} practice=${d.practiceCount}`);
        }
      }
      if (g && open && g.score <= 39) {
        check(`${p.label}: failed topic ${d.topicCode} gets foundation remediation`,
          d.state === 'FOUNDATION_REQUIRED' && d.practiceCount >= 5
          && d.contentDepth === 'FOUNDATION',
          `${d.state} depth=${d.contentDepth} practice=${d.practiceCount} score=${g.score}`);
      }
      if (d.state === 'NOT_EXPOSED') {
        check(`${p.label}: NOT_EXPOSED ${d.topicCode} really has something unmeasured`,
          (d.skillKeys || []).some((k: string) => !byKey.has(k)),
          (d.skillKeys || []).map((k: string) => `${k}=${byKey.get(k)?.score ?? 'none'}`).join(' '));
        check(`${p.label}: NOT_EXPOSED ${d.topicCode} is taught, not marked failed`,
          d.reason === 'NOT_YET_EXPOSED' && d.scoreAtAssignment === null,
          `reason=${d.reason} score=${d.scoreAtAssignment}`);
      }
      if (d.state === 'LOCKED') {
        const blocker = d.lockedBy;
        const row = blocker ? byKey.get(blocker) : undefined;
        check(`${p.label}: LOCKED ${d.topicCode} names a prerequisite that is genuinely unmet`,
          !!blocker && (!row || row.score < 60),
          `lockedBy=${blocker || '(none)'} ${row ? 'score ' + row.score : 'never measured'}`);
      }
      if (d.mandatory === true) {
        check(`${p.label}: ${d.topicCode} is only mandatory if the curriculum says so`,
          curriculumMandatory.get(d.topicCode) !== false,
          `curriculum mandatory=${curriculumMandatory.get(d.topicCode)}`);
      }
    }

    for (const [skill, fraction] of Object.entries(p.performance)) {
      const row = byKey.get(skill);
      check(`${p.label}: ${skill} has a Skill DNA row`, !!row,
        row ? `score ${row.score} confidence ${row.confidence}` : 'missing');
      if (!row) continue;
      const expected = Math.round(fraction * 100);
      check(`${p.label}: ${skill} score reflects the answers given`,
        Math.abs(row.score - expected) <= 13,
        `score ${row.score}, answered ${expected}% correctly`);
    }

    /* ---- direction ------------------------------------------------------------------- */

    /**
     * Only T_STATS is AI/ML-only. T_ML_INTRO no longer is, and that is the curriculum's doing.
     *
     * The Year-1 audit made T_GENAI mandatory for every student, and GENERATIVE_AI_LLM lists
     * AI_ML_CONCEPTS as a skill-graph prerequisite — which only T_ML_INTRO teaches. So the plan
     * depends on it whatever direction the student is heading in, and expandRelevance pulls it
     * back for the same reason it pulls T_HTML back. Listing it as direction-only failed against
     * a correct engine, and demanding it be set aside would ask for a plan that gates a mandatory
     * topic behind something it refuses to teach.
     */
    const AIML_ONLY = ['T_STATS'];
    const WEB_ONLY = ['T_CSS'];   // T_HTML is pulled back in by anything needing BROWSER_FUNDAMENTALS

    if (p.name === 'web') {
      const off = AIML_ONLY.map(t => byTopic.get(t)).filter(Boolean);
      check(`${p.label}: AI/ML topics are set aside, not deleted`,
        off.length === AIML_ONLY.length && off.every((d: any) => d.state === 'NOT_RELEVANT'),
        off.map((d: any) => `${d.topicCode}=${d.state}`).join(' '));
      check(`${p.label}: set-aside topics keep a reason the student can read`,
        off.every((d: any) => d.reason === 'OUTSIDE_DIRECTION' && !!d.reasonText),
        off.map((d: any) => d.reason).join(' '));
      const onDir = ['T_HTML', 'T_CSS'].map(t => byTopic.get(t)).filter(Boolean);
      check(`${p.label}: web topics stay in the plan`,
        onDir.every((d: any) => d.state !== 'NOT_RELEVANT'),
        onDir.map((d: any) => `${d.topicCode}=${d.state}`).join(' '));

      const jsDom = byTopic.get('T_JS_DOM');
      check(`${p.label}: direction does not bypass a failed prerequisite`,
        !!jsDom && jsDom.state === 'LOCKED' && jsDom.lockedBy === 'PROGRAMMING_FUNDAMENTALS',
        jsDom ? `T_JS_DOM=${jsDom.state} lockedBy=${jsDom.lockedBy || '-'}` : 'topic missing');
    }
    if (p.name === 'aiml') {
      const off = WEB_ONLY.map(t => byTopic.get(t)).filter(Boolean);
      check(`${p.label}: web-only topics are set aside`,
        off.every((d: any) => d.state === 'NOT_RELEVANT'),
        off.map((d: any) => `${d.topicCode}=${d.state}`).join(' '));
      /**
       * T_HTML is deliberately NOT expected to be set aside.
       *
       * BROWSER_FUNDAMENTALS lists HTML as a prerequisite and T_HTTP applies to every direction,
       * so this plan depends on HTML whatever the student is heading toward. expandRelevance pulls
       * a prerequisite provider back in for exactly that reason, and asserting the opposite would
       * be asking for a plan that locks a topic behind something it refuses to teach.
       */
      const html = byTopic.get('T_HTML');
      check(`${p.label}: a topic the plan depends on is kept, whatever the direction`,
        !!html && html.state !== 'NOT_RELEVANT', html ? `T_HTML=${html.state}` : 'missing');
      const onDir = AIML_ONLY.map(t => byTopic.get(t)).filter(Boolean);
      check(`${p.label}: AI/ML topics are in the plan`,
        onDir.every((d: any) => d.state !== 'NOT_RELEVANT'),
        onDir.map((d: any) => `${d.topicCode}=${d.state}`).join(' '));
      const mlIntro = byTopic.get('T_ML_INTRO');
      check(`${p.label}: on-direction topic with a met prerequisite is not locked`,
        !!mlIntro && mlIntro.state !== 'LOCKED' && mlIntro.state !== 'NOT_RELEVANT',
        mlIntro ? `T_ML_INTRO=${mlIntro.state}` : 'topic missing');
    }
    if (p.name === 'undecided') {
      /**
       * Exploration covers the first four directions, not all seven, so a Cloud or Security topic
       * is legitimately outside it. What must hold is that nothing INSIDE the exploration set is
       * taken away, and that anything set aside is genuinely outside it.
       */
      const explore = ((assignment.explorationDirections || []) as string[])
        .map(d => String(d).toUpperCase());
      const setAside = decisions.filter(d => d.state === 'NOT_RELEVANT');
      const dirsOf = (code: string) =>
        ((curriculumDirections.get(code) || []) as string[]).map(x => String(x).toUpperCase());
      check(`${p.label}: nothing inside the exploration set is taken away`,
        setAside.every(d => dirsOf(d.topicCode).length > 0
          && !dirsOf(d.topicCode).some(x => explore.includes(x))),
        `exploring ${explore.join('/') || 'nothing'}; set aside `
        + (setAside.map(d => `${d.topicCode}[${dirsOf(d.topicCode).join(',')}]`).join(' ') || 'none'));
      check(`${p.label}: an undecided student still gets a full plan`,
        decisions.length - setAside.length >= 20,
        `${decisions.length - setAside.length}/${decisions.length} topics kept`);
    }

    /* ---- states are only ever the vocabulary ----------------------------------------- */

    const known = ['NOT_EXPOSED', 'FOUNDATION_REQUIRED', 'GUIDED', 'STANDARD', 'REVISION',
      'VERIFIED', 'ENRICHMENT', 'NOT_RELEVANT', 'LOCKED'];
    const strange = decisions.filter(d => !known.includes(d.state));
    check(`${p.label}: every topic state is a known state`, strange.length === 0,
      strange.map(d => d.state).join(','));

    const summary = decisions.reduce((m: Record<string, number>, d) => {
      m[d.state] = (m[d.state] || 0) + 1; return m;
    }, {});
    console.log(`  ${p.label.padEnd(38)} ${JSON.stringify(summary)}`);
  }

  /* ---- report ------------------------------------------------------------------------ */

  const failed = checks.filter(c => !c.ok);
  console.log(`\nCHECKS`);
  for (const c of checks) {
    console.log(`  ${c.ok ? 'PASS' : 'FAIL'}  ${c.name}${c.detail ? `  — ${c.detail}` : ''}`);
  }
  console.log(`\n${checks.length - failed.length}/${checks.length} passed, ${failed.length} failed`);

  await cleanup();
  await mongoose.disconnect();
  process.exit(failed.length ? 1 : 0);

  /* ------------------------------------------------------------------------------------ */

  async function sitScopedPaper(studentId: mongoose.Types.ObjectId, skillKey: string, fraction: number) {
    const built = await buildPersonalizedAssessment({
      tenantId, studentId: studentId as any, stage: 'foundation', roleKey: 'FOUNDATION',
      roleSkillKeys: [skillKey], blueprintVersion: set?.version || 0,
      attemptNumber: 1, policy,
    } as any);
    if (!built.ok) { check(`scoped paper for ${skillKey}`, false, built.adminMessage || 'refused'); return; }

    const paperItems = built.items || [];
    const created: any = await PersonalizedAssessment.create({
      tenantId, studentId, attemptNumber: 1, status: 'IN_PROGRESS',
      purpose: 'SKILL_CHECK', targetSkillKeys: [skillKey],
      policyKey: built.specification!.policyKey, policyVersion: built.specification!.policyVersion,
      stage: 'foundation', roleKey: 'FOUNDATION', blueprintVersion: set?.version || 0,
      discovery: false, timeLimitMinutes: 0, generationSeed: built.seed,
      specification: {
        slots: built.specification!.slots, skillCoverage: built.specification!.skillCoverage,
        difficultyCoverage: built.specification!.difficultyCoverage,
        totalPoints: built.specification!.totalPoints,
      },
      items: paperItems,
      generationReport: {
        requestedSlots: built.report!.requestedSlots, filled: built.report!.filled,
        exactMatches: built.report!.exactMatches,
        difficultyFallbacks: built.report!.difficultyFallbacks,
        repeatedFromPreviousAttempt: built.report!.repeatedFromPreviousAttempt,
      },
    });

    const rightUpTo = Math.round(fraction * paperItems.length);
    const answers = paperItems.map((i, idx) => {
      const key = gold.get(String(i.sourceId))!.correctOptionIds as string[];
      const wrong = [['A', 'B', 'C', 'D'].find(o => !key.includes(o)) || 'A'];
      return {
        sourceType: i.sourceType, sourceId: String(i.sourceId),
        response: idx < rightUpTo ? key : wrong,
      };
    });

    const graded = await gradeSubmittedAnswers(tenantId, answers as any);
    created.status = 'SUBMITTED';
    created.submittedAt = new Date();
    created.answers = answers;
    await created.save();
    await projectAssessmentToSkillDna(tenantId, String(created._id), graded);
  }

  async function cleanup(quiet = false) {
    const ids = PERSONAS.map(p => idFor(p.name));
    const [u, a, e, pr, ca] = await Promise.all([
      User.deleteMany({ _id: { $in: ids } }),
      PersonalizedAssessment.deleteMany({ tenantId, studentId: { $in: ids } }),
      StudentSkillEvidence.deleteMany({ tenantId, studentId: { $in: ids } }),
      StudentSkillProfile.deleteMany({ tenantId, studentId: { $in: ids } }),
      StudentCurriculumAssignment.deleteMany({ tenantId, studentId: { $in: ids } }),
    ]);
    if (!quiet) {
      console.log(`\ncleanup — ${u.deletedCount} users, ${a.deletedCount} papers, `
        + `${e.deletedCount} evidence, ${pr.deletedCount} profiles, ${ca.deletedCount} plans`);
    }
  }
})().catch(e => { console.error('ERR', e?.message || e, e?.stack); process.exit(1); });
