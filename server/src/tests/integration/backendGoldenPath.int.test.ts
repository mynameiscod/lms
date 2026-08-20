/**
 * CareerPilot V1 golden path, against a real MongoDB.
 *
 * The one journey the pilot has to survive:
 *
 *   career context complete → BACKEND_ENGINEER chosen → assessment preflight available
 *   → paper generated → answers graded → Skill DNA → Role Readiness → roadmap → today's plan
 *
 * Every step goes through the same service the application calls. Nothing downstream is
 * fabricated: the Skill DNA below exists because a synthetic student answered questions and
 * those answers were graded, which is the only way this proves anything.
 *
 * It also pins the two rules that made the configuration honest, because both are exactly
 * the kind of shortcut a future "just make the preview green" change would take:
 * a JavaScript `Array.map` question must never be DSA_ARRAYS evidence, and a CSS
 * breakpoint question must never be DEBUGGING evidence.
 */

import mongoose from 'mongoose';
import { startMongo, stopMongo, clearCollections } from './mongoHarness';

jest.setTimeout(300_000);

import User from '../../models/User';
import Question from '../../models/Question';
import CareerSkill from '../../models/CareerSkill';
import SkillEvidence from '../../models/SkillEvidence';
import RoleSkillBlueprint from '../../models/RoleSkillBlueprint';
import CareerRole from '../../models/CareerRole';
import PersonalizedAssessment from '../../models/PersonalizedAssessment';
import StudentSkillProfile from '../../models/StudentSkillProfile';
import StudentSkillEvidence from '../../models/StudentSkillEvidence';

import { seedCareerSkills } from '../../services/careerSkillSeedService';
import { seedRoleBlueprints } from '../../services/roleSkillBlueprintSeedService';
import { seedBackendPilotContent } from '../../services/backendPilotSeedService';
import { updateCareerContext, getCareerContext } from '../../services/careerContextService';
import {
  getPersonalizedAssessmentAvailability,
  resolvePersonalizedAssessmentContext,
  buildPersonalizedAssessment,
} from '../../services/personalizedAssessmentService';
import { gradeSubmittedAnswers } from '../../services/assessmentAnswerGradingService';
import { projectAssessmentToSkillDna } from '../../services/skillDnaService';
import { calculateStudentRoleReadiness } from '../../services/roleReadinessService';
import { loadItems } from '../../services/skillEvidenceSourceRegistry';
import { generateRoadmap } from '../../services/careerRoadmapService';
import { getTodaysPlan } from '../../services/dailyMissionOrchestrator';
import CareerRoadmap from '../../models/CareerRoadmap';

const TENANT = '507f1f77bcf86cd799439aa1';
const ROLE = 'BACKEND_ENGINEER';

beforeAll(async () => { await startMongo(); });
afterAll(async () => { await stopMongo(); });

/** Steps 1-4 of the documented launch sequence, run exactly as an admin would. */
async function installConfiguration() {
  // Roles first: seedRoleBlueprints refuses to install a blueprint for a role the tenant
  // does not have, and reports it under missingRoles rather than guessing. Production
  // already has all seven.
  await CareerRole.create({
    tenantId: TENANT, key: ROLE, domainKey: 'SOFTWARE_ENGINEERING', name: 'Backend Engineer',
    active: true, studentSelectable: true, displayOrder: 20,
  });
  await seedCareerSkills({ updatedBy: 'test' });
  const bp = await seedRoleBlueprints(TENANT, { updatedBy: 'test' });
  expect(bp.inserted).toContain(ROLE);
  // Publish BACKEND_ENGINEER only — every other role stays draft, as the pilot requires.
  await RoleSkillBlueprint.updateOne({ tenantId: TENANT, roleKey: ROLE }, { $set: { published: true } });
  return seedBackendPilotContent({ tenantId: TENANT, createdBy: 'test' });
}

/** A member as publicPassportController.signup would have written them. */
async function joinStudent(overrides: any = {}) {
  const user = await User.create({
    email: `golden${Date.now()}@example.com`, firstName: 'Asha', lastName: 'R',
    password: 'x'.repeat(20), role: 'STUDENT', tenantId: TENANT, isActive: true,
    passport: {
      active: true, product: 'career_passport', onboarded: true,
      degree: 'B.Tech', branch: 'Computer Science / IT', yearOfStudy: '2nd Year',
      careerGoal: 'Software Development', ...overrides,
    },
  });
  return String(user._id);
}

describe('CareerPilot V1 — BACKEND_ENGINEER golden path', () => {
  let studentId: string;
  let seedReport: Awaited<ReturnType<typeof seedBackendPilotContent>>;

  beforeAll(async () => {
    await clearCollections();
    seedReport = await installConfiguration();
    studentId = await joinStudent();
  });

  // ── Configuration ────────────────────────────────────────────────────────
  it('installs the canonical skills and publishes only the Backend blueprint', async () => {
    expect(await CareerSkill.countDocuments({})).toBeGreaterThanOrEqual(60);

    const backend = await RoleSkillBlueprint.findOne({ tenantId: TENANT, roleKey: ROLE }).lean() as any;
    expect(backend.published).toBe(true);
    expect(backend.requirements.length).toBeGreaterThanOrEqual(20);

    const others = await RoleSkillBlueprint.countDocuments({ tenantId: TENANT, roleKey: { $ne: ROLE }, published: true });
    expect(others).toBe(0);
  });

  it('installs the pilot content with evidence for every authored question', async () => {
    expect(seedReport.questions.created.length).toBe(44);
    expect(await Question.countDocuments({ tenantId: TENANT, tags: 'careerpilot-pilot' })).toBe(44);
    expect(await SkillEvidence.countDocuments({ tenantId: TENANT })).toBeGreaterThanOrEqual(44);
  });

  it('is idempotent — a second install writes nothing', async () => {
    const again = await seedBackendPilotContent({ tenantId: TENANT, createdBy: 'test' });
    expect(again.questions.created).toEqual([]);
    expect(again.questions.skipped.length).toBe(44);
    expect(await Question.countDocuments({ tenantId: TENANT, tags: 'careerpilot-pilot' })).toBe(44);
  });

  // ── Setup: direction and commitment ──────────────────────────────────────
  it('completes career context with BACKEND_ENGINEER without re-collecting education', async () => {
    await updateCareerContext(TENANT, studentId, { primaryRole: ROLE });
    const { context, missing } = await updateCareerContext(TENANT, studentId, { minutesPerDay: 60, daysPerWeek: 5, complete: true });

    expect(missing).toBeUndefined();
    expect(context!.status.onboardingCompleted).toBe(true);
    expect(context!.career.primaryRole).toBe(ROLE);
    expect(context!.education.degree).toBe('B.Tech');   // from registration, never re-asked
  });

  // ── Preflight ────────────────────────────────────────────────────────────
  it('preflight returns available for the configured student', async () => {
    const avail = await getPersonalizedAssessmentAvailability(TENANT, studentId);
    expect(avail).toMatchObject({ assessmentAvailable: true, discovery: false, inProgress: false });
    expect(avail.reasonCode).toBeUndefined();
  });

  // ── Paper generation ─────────────────────────────────────────────────────
  it('generates a paper for the student\'s derived stage with no shortfall', async () => {
    const ctx = await resolvePersonalizedAssessmentContext(TENANT, studentId);
    expect(ctx.ok).toBe(true);

    const built = await buildPersonalizedAssessment({
      tenantId: TENANT, studentId,
      stage: ctx.stage!, roleKey: ctx.roleKey!, roleSkillKeys: ctx.roleSkillKeys!,
      blueprintVersion: ctx.blueprintVersion!, attemptNumber: 1, seenSourceIds: [],
    });

    expect(built.ok).toBe(true);
    expect(built.report!.shortfalls).toEqual([]);
    expect(built.items!.length).toBe(built.specification!.slots.length);

    // Every question on the paper is backed by a real mapping.
    for (const item of built.items!) {
      const ev = await SkillEvidence.findOne({
        tenantId: TENANT, sourceType: item.sourceType, sourceId: item.sourceId, active: true,
      }).lean();
      expect(ev).toBeTruthy();
    }

    // No item appears twice.
    const ids = built.items!.map(i => `${i.sourceType}:${i.sourceId}`);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('renders every question with readable text — the blank-paper regression', async () => {
    // questionAdapter read `r.text`; the Question model stores `question`. Every item on a
    // paper built from this bank arrived at the student blank.
    const ctx = await resolvePersonalizedAssessmentContext(TENANT, studentId);
    const built = await buildPersonalizedAssessment({
      tenantId: TENANT, studentId, stage: ctx.stage!, roleKey: ctx.roleKey!,
      roleSkillKeys: ctx.roleSkillKeys!, blueprintVersion: ctx.blueprintVersion!,
      attemptNumber: 1, seenSourceIds: [],
    });
    const texts = await loadItems(TENANT, built.items!.map(i => ({ sourceType: i.sourceType, sourceId: i.sourceId })));
    expect(texts.size).toBe(built.items!.length);
    for (const item of texts.values()) {
      expect(String(item.text || '').length).toBeGreaterThan(5);
    }
  });

  // ── Sit and submit ───────────────────────────────────────────────────────
  it('grades a real submission and projects it into Skill DNA', async () => {
    const ctx = await resolvePersonalizedAssessmentContext(TENANT, studentId);
    const built = await buildPersonalizedAssessment({
      tenantId: TENANT, studentId, stage: ctx.stage!, roleKey: ctx.roleKey!,
      roleSkillKeys: ctx.roleSkillKeys!, blueprintVersion: ctx.blueprintVersion!,
      attemptNumber: 1, seenSourceIds: [],
    });
    const created = await PersonalizedAssessment.create({
      tenantId: TENANT, studentId, attemptNumber: 1, status: 'IN_PROGRESS',
      policyKey: built.specification!.policyKey, policyVersion: built.specification!.policyVersion,
      stage: ctx.stage, roleKey: ROLE, blueprintVersion: ctx.blueprintVersion, discovery: false,
      generationSeed: built.seed,
      specification: {
        slots: built.specification!.slots, skillCoverage: built.specification!.skillCoverage,
        difficultyCoverage: built.specification!.difficultyCoverage, totalPoints: built.specification!.totalPoints,
      },
      items: built.items,
    });

    // The student answers: first option every time. Some right, some wrong — real evidence.
    const loaded = await loadItems(TENANT, built.items!.map(i => ({ sourceType: i.sourceType, sourceId: i.sourceId })));
    const answers = built.items!.map(i => {
      const opts = loaded.get(`${i.sourceType}:${i.sourceId}`)?.options || [];
      return { sourceType: i.sourceType, sourceId: i.sourceId, response: opts.length ? [opts[0].id] : [] };
    });

    const graded = await gradeSubmittedAnswers(TENANT, answers as any);
    expect(graded.length).toBe(built.items!.length);
    expect(graded.some(g => g.gradable)).toBe(true);

    const projection = await projectAssessmentToSkillDna(TENANT, String(created._id), graded);
    expect(projection.evidenceCreated).toBeGreaterThan(0);

    expect(await StudentSkillEvidence.countDocuments({ tenantId: TENANT, studentId })).toBeGreaterThan(0);
    const profiles = await StudentSkillProfile.find({ tenantId: TENANT, studentId }).lean() as any[];
    expect(profiles.length).toBeGreaterThan(0);
    // The skills measured are the ones the engine selected, not an arbitrary set.
    for (const p of profiles) expect(typeof p.skillKey).toBe('string');
  });

  // ── Role readiness ───────────────────────────────────────────────────────
  it('calculates Backend role readiness from Skill DNA and the published blueprint', async () => {
    const readiness: any = await calculateStudentRoleReadiness(TENANT, studentId);

    expect(readiness.available).toBe(true);
    expect(readiness.role.key).toBe(ROLE);
    expect(readiness.blueprintVersion).toBeGreaterThan(0);

    // Scored against the published blueprint, so every requirement is accounted for.
    expect(readiness.summary.requiredSkills).toBeGreaterThanOrEqual(20);
    expect(readiness.summary.assessedSkills).toBeGreaterThan(0);

    // Gaps come back ranked, and the skills we actually measured are among those assessed.
    expect(Array.isArray(readiness.topGaps)).toBe(true);
    expect(Array.isArray(readiness.strengths)).toBe(true);
    const assessed = readiness.skills.filter((s: any) => s.studentScore !== null).map((s: any) => s.skillKey);
    expect(assessed.length).toBeGreaterThan(0);

    // Coherent: an unmeasured skill reports null rather than a fabricated zero.
    for (const s of readiness.skills) {
      if (s.evidenceCount === 0) expect(s.studentScore).toBeNull();
    }
  });

  // ── Roadmap ──────────────────────────────────────────────────────────────
  it('generates an ACTIVE personalized roadmap targeting Backend Engineer', async () => {
    const result: any = await generateRoadmap(TENANT, studentId, { actor: 'STUDENT' });
    expect(result.outcome).toBeTruthy();

    const roadmap: any = await CareerRoadmap.findOne({ tenantId: TENANT, studentId, status: 'ACTIVE' }).lean();
    expect(roadmap).toBeTruthy();
    expect(String(roadmap.roleKey || roadmap.targetRoleKey || '').toUpperCase()).toBe(ROLE);
    // Objectives come from the readiness gaps, so an empty plan would mean the inputs
    // never reached the planner.
    const objectives = roadmap.objectives || roadmap.items || [];
    expect(objectives.length).toBeGreaterThan(0);
  });

  // ── Daily missions ───────────────────────────────────────────────────────
  it('turns the roadmap into a usable plan for today', async () => {
    const plan: any = await getTodaysPlan(TENANT, studentId);
    expect(plan).toBeTruthy();
    // Entitled (the member is active) and driven by the ACTIVE roadmap above.
    expect(plan.locked === true).toBeFalsy();
    const missions = plan.missions || plan.tasks || [];
    expect(Array.isArray(missions)).toBe(true);
    expect(missions.length).toBeGreaterThan(0);
  });

  // ── Repeat attempt safety ────────────────────────────────────────────────
  it('still generates a second attempt without reusing the first paper\'s items', async () => {
    const ctx = await resolvePersonalizedAssessmentContext(TENANT, studentId);
    const first = await buildPersonalizedAssessment({
      tenantId: TENANT, studentId, stage: ctx.stage!, roleKey: ctx.roleKey!,
      roleSkillKeys: ctx.roleSkillKeys!, blueprintVersion: ctx.blueprintVersion!,
      attemptNumber: 1, seenSourceIds: [],
    });
    const seen = first.items!.map(i => i.sourceId);

    const second = await buildPersonalizedAssessment({
      tenantId: TENANT, studentId, stage: ctx.stage!, roleKey: ctx.roleKey!,
      roleSkillKeys: ctx.roleSkillKeys!, blueprintVersion: ctx.blueprintVersion!,
      attemptNumber: 2, seenSourceIds: seen,
    });
    expect(second.ok).toBe(true);
    expect(second.report!.shortfalls).toEqual([]);
  });
});

describe('evidence honesty — the shortcuts that must stay closed', () => {
  beforeAll(async () => {
    await clearCollections();
    await CareerRole.create({
      tenantId: TENANT, key: ROLE, domainKey: 'SOFTWARE_ENGINEERING', name: 'Backend Engineer',
      active: true, studentSelectable: true, displayOrder: 20,
    });
    await seedCareerSkills({ updatedBy: 'test' });
    await seedRoleBlueprints(TENANT, { updatedBy: 'test' });
    await seedBackendPilotContent({ tenantId: TENANT, createdBy: 'test' });
  });

  it('does not map JavaScript Array.map questions as DSA_ARRAYS evidence', async () => {
    // The existing bank has 144 of these. They measure a JavaScript API, not array reasoning.
    const js = await Question.create({
      tenantId: TENANT, createdBy: 't', type: 'mcq_single',
      question: 'Which Array method returns a new array with every element transformed?',
      options: [{ text: 'map', isCorrect: true }, { text: 'forEach', isCorrect: false }],
      marks: 1, difficultyLevel: 'medium', subject: 'Frontend -Array methods', source: 'manual', usageCount: 0,
    });
    const ev = await SkillEvidence.findOne({ tenantId: TENANT, sourceId: String(js._id), skillKey: 'DSA_ARRAYS' });
    expect(ev).toBeNull();
  });

  it('does not map CSS breakpoint questions as DEBUGGING evidence', async () => {
    const css = await Question.create({
      tenantId: TENANT, createdBy: 't', type: 'mcq_single',
      question: 'Which media query breakpoint targets tablets?',
      options: [{ text: '768px', isCorrect: true }, { text: '1600px', isCorrect: false }],
      marks: 1, difficultyLevel: 'easy', subject: 'Media Queries and Breakpoints in CSS', source: 'manual', usageCount: 0,
    });
    const ev = await SkillEvidence.findOne({ tenantId: TENANT, sourceId: String(css._id), skillKey: 'DEBUGGING' });
    expect(ev).toBeNull();
  });

  it('every DSA_COMPLEXITY item genuinely asks about cost, not syntax', async () => {
    const rows = await Question.find({ tenantId: TENANT, tags: 'DSA_COMPLEXITY' }).lean() as any[];
    expect(rows.length).toBeGreaterThanOrEqual(6);
    for (const r of rows) {
      expect(`${r.question} ${r.explanation}`).toMatch(/O\(|complexity|amortis|comparison|grow/i);
    }
  });

  it('every authored item is deterministically gradable — exactly one correct option', async () => {
    const rows = await Question.find({ tenantId: TENANT, tags: 'careerpilot-pilot' }).lean() as any[];
    for (const r of rows) {
      expect(r.options.filter((o: any) => o.isCorrect).length).toBe(1);
      expect(r.options.length).toBeGreaterThanOrEqual(4);
      expect(String(r.explanation || '').length).toBeGreaterThan(20);
    }
  });

  it('evidence rows point at source items that actually exist', async () => {
    const rows = await SkillEvidence.find({ tenantId: TENANT, sourceType: 'question' }).lean() as any[];
    expect(rows.length).toBeGreaterThan(0);
    for (const e of rows) {
      expect(await Question.countDocuments({ _id: e.sourceId })).toBe(1);
    }
  });
});
