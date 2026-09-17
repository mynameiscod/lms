/**
 * Graded practical work becomes APPLIED Skill DNA evidence — only through a trustworthy final grade.
 *
 * Real handlers and services against a real database. The code runner and the event bus are the only
 * substitutes: the runner so a test can say whether the program was really executed and what passed
 * (the grade under test is still computed by submitCoding over every test case), and the bus so the
 * trigger can be counted without composing a journey.
 */

import mongoose from 'mongoose';
import { startMongo, stopMongo, clearCollections, ensureIndexes } from './mongoHarness';

jest.setTimeout(180_000);

let runnerReal = true;
let passing = (_code: string, _i: number) => true;
let unavailableAt = -1;
let caseIndex = 0;
jest.mock('../../services/codeRunnerService', () => ({
  __esModule: true,
  default: {
    executesForReal: () => runnerReal,
    execute: async (input: any) => {
      const i = caseIndex++;
      if (i === unavailableAt) return { passed: false, output: '', error: 'busy', executionTime: 0, memoryUsed: 0, graderUnavailable: true };
      return { passed: passing(input.code, i), output: 'x', executionTime: 1, memoryUsed: 1 };
    },
  },
}));

const published: any[] = [];
jest.mock('../../services/adaptiveCurriculumEvents', () => ({
  __esModule: true,
  publish: async (e: any) => { published.push(e); },
}));
jest.mock('../../services/assignmentService', () => ({ __esModule: true, default: { updateStats: async () => undefined } }));

import User from '../../models/User';
import Assignment from '../../models/Assignment';
import Submission from '../../models/Submission';
import CareerSkill from '../../models/CareerSkill';
import CurriculumLearningUnit from '../../models/CurriculumLearningUnit';
import StudentSkillEvidence from '../../models/StudentSkillEvidence';
import StudentSkillProfile from '../../models/StudentSkillProfile';
import submissionService from '../../services/submissionService';
import submissionController from '../../controllers/submissionController';
import { roleGuard } from '../../middleware/roleGuard';
import { recordAppliedEvaluation, settleAppliedEvidence, appliedAssessmentId } from '../../services/appliedEvidenceService';
import { projectModuleAssessment } from '../../services/moduleAssessmentEvidenceService';
import { explainSkill } from '../../services/skillDnaService';
import { toStudentSubmission } from '../../services/studentAssignmentView';

const TENANT = '507f1f77bcf86cd799439a11';
const OTHER_TENANT = '507f1f77bcf86cd799439b22';
let seq = 0;

const person = (role: string, tenantId = TENANT) => {
  seq += 1;
  return User.create({
    tenantId, firstName: `Ap${seq}`, lastName: 'X', email: `applied${seq}@example.com`,
    phone: `9811${String(seq).padStart(6, '0')}`, password: 'x', role,
  });
};

const unit = (unitCode: string, skillKeys: string[], tenantId = TENANT) => CurriculumLearningUnit.create({
  tenantId, stageKey: 'foundation', moduleCode: 'M_X', topicCode: 'T_X', unitCode, title: unitCode, skillKeys,
  unitType: unitCode.includes('PROJECT') ? 'PROJECT' : 'PRACTICE', status: 'PUBLISHED',
});

const TEST_CASES = [0, 1, 2, 3, 4].map(i => ({ input: `in${i}`, expectedOutput: `SECRET_EXPECTED_${i}`, isHidden: i >= 3, weight: 1 }));

const codingAssignment = (createdBy: any, over: any = {}, tenant = TENANT) => Assignment.create({
  tenant, title: 'Conditions practice', type: 'coding', createdBy, totalPoints: 100, passingPoints: 60,
  unitCode: 'T_CONDITIONS_PRACTICE', testCases: TEST_CASES, allowedLanguages: ['python'],
  rubric: [{ criterion: 'Correct output', maxPoints: 60 }, { criterion: 'Shape', maxPoints: 30 }, { criterion: 'Readable', maxPoints: 10 }],
  ...over,
});

const projectAssignment = (createdBy: any, over: any = {}, tenant = TENANT) => Assignment.create({
  tenant, title: 'Variables mini project', type: 'project', createdBy, totalPoints: 100, passingPoints: 40,
  unitCode: 'T_VARIABLES_MINI_PROJECT',
  rubric: [{ criterion: 'Works', maxPoints: 50 }, { criterion: 'Explained', maxPoints: 50 }],
  ...over,
});

const inProgress = (assignment: any, student: any, over: any = {}) => Submission.create({
  tenant: assignment.tenant, assignment: assignment._id, student: student._id, status: 'in_progress',
  code: 'print("PASS")', language: 'python', startedAt: new Date(), ...over,
});

const capture = () => {
  const res: any = { statusCode: 200, body: null };
  res.status = (c: number) => { res.statusCode = c; return res; };
  res.json = (b: any) => { res.body = b; return res; };
  return res;
};
const req = (user: any, headerTenant: string, params: any = {}, body: any = {}) => ({
  user: { id: String(user._id), tenantId: String(user.tenantId), role: user.role }, tenantId: headerTenant, params, body, query: {}, headers: {},
} as any);

const evidenceFor = (submissionId: any) => StudentSkillEvidence.find({ submissionId }).lean();

let grader: any;
let student: any;

beforeAll(async () => {
  await startMongo();
  await ensureIndexes([StudentSkillEvidence, StudentSkillProfile, Submission, CurriculumLearningUnit, CareerSkill] as any);
});
afterAll(stopMongo);

beforeEach(async () => {
  await clearCollections();
  published.length = 0;
  runnerReal = true; passing = () => true; unavailableAt = -1; caseIndex = 0;
  for (const [key, over] of [
    ['CONDITIONALS_BASICS', {}], ['PROGRAMMING_FUNDAMENTALS', {}], ['PYTHON_BASICS', {}],
    ['PYTHON_STRINGS', { active: false }], ['PROGRAMMING_GROUP', { nodeType: 'GROUP' }],
  ] as [string, any][]) {
    await CareerSkill.create({ domainKey: 'programming', key, name: key, assessable: true, active: true, ...over });
  }
  await unit('T_CONDITIONS_PRACTICE', ['CONDITIONALS_BASICS']);
  await unit('T_VARIABLES_MINI_PROJECT', ['PROGRAMMING_FUNDAMENTALS', 'PYTHON_BASICS', 'PYTHON_STRINGS', 'PROGRAMMING_GROUP']);
  grader = await person('INSTRUCTOR');
  student = await person('STUDENT');
});

describe('a coding assignment, auto-graded on a real runner', () => {
  it('records one APPLIED row per unit skill, with provenance and without any test content, and triggers once', async () => {
    const a = await codingAssignment(grader._id);
    const s = await inProgress(a, student);
    await submissionService.submitCoding(s._id, student._id, a.tenant as any);
    await settleAppliedEvidence();

    const rows = await evidenceFor(s._id);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      tenantId: TENANT, skillKey: 'CONDITIONALS_BASICS', sourceType: 'CODING_ASSIGNMENT', evidenceKind: 'APPLIED',
      performance: 1, evidenceWeight: 1, evaluation: 'AUTO_GRADED', attemptNumber: 1, unitCode: 'T_CONDITIONS_PRACTICE',
      itemSourceType: 'assignment', itemSourceId: String(a._id), relationship: 'PRIMARY',
    });
    expect(String(rows[0].studentId)).toBe(String(student._id));
    expect(String(rows[0].assignmentId)).toBe(String(a._id));
    expect(String(rows[0].assessmentId)).toBe(String(appliedAssessmentId(String(s._id), 1)));
    // Hidden grader tests and solutions never reach Skill DNA.
    expect(JSON.stringify(rows)).not.toMatch(/SECRET_EXPECTED|in3|print\(/);

    expect(published).toHaveLength(1);
    expect(published[0]).toMatchObject({ name: 'PROJECT_EVALUATED', tenantId: TENANT, studentId: String(student._id), skillKeys: ['CONDITIONALS_BASICS'] });
    expect(await StudentSkillProfile.findOne({ tenantId: TENANT, studentId: student._id, skillKey: 'CONDITIONALS_BASICS' }).lean())
      .toMatchObject({ score: 100, confidence: 'LOW', evidenceCount: 1 });
  });

  it('records a failed grade as it is, and it pulls a checkpoint-perfect score down at full weight', async () => {
    await projectModuleAssessment({
      tenantId: TENANT, studentId: String(student._id), assessmentRef: 'checkpoint-attempt-1',
      answers: [1, 2, 3, 4, 5, 6].map(i => ({ itemId: `q${i}`, itemSourceType: 'quiz_question', skillKey: 'CONDITIONALS_BASICS', earnedPoints: 1, maxPoints: 1 })),
    });
    expect(await StudentSkillProfile.findOne({ studentId: student._id, skillKey: 'CONDITIONALS_BASICS' }).lean()).toMatchObject({ score: 100, confidence: 'MEDIUM' });
    const before = await explainSkill(TENANT, String(student._id), 'CONDITIONALS_BASICS');
    expect(before.basis.understandingOnly).toBe(true);

    passing = (_c, i) => i === 0; // 1 of 5 cases → 20
    const a = await codingAssignment(grader._id);
    const s = await inProgress(a, student);
    const graded = await submissionService.submitCoding(s._id, student._id, a.tenant as any);
    await settleAppliedEvidence();

    expect(graded.autoScore).toBe(20);
    expect((await evidenceFor(s._id))[0]).toMatchObject({ performance: 0.2, evaluation: 'AUTO_GRADED' });
    expect(await StudentSkillProfile.findOne({ studentId: student._id, skillKey: 'CONDITIONALS_BASICS' }).lean()).toMatchObject({ score: 80, confidence: 'MEDIUM', evidenceCount: 7 });
    const after = await explainSkill(TENANT, String(student._id), 'CONDITIONALS_BASICS');
    expect(after.basis).toMatchObject({ understandingOnly: false, weights: { DIAGNOSTIC: 0, UNDERSTANDING: 3, APPLIED: 1 } });
  });

  it('writes nothing, and sends no trigger, when the program was only simulated', async () => {
    runnerReal = false;
    const a = await codingAssignment(grader._id);
    const s = await inProgress(a, student);
    const graded = await submissionService.submitCoding(s._id, student._id, a.tenant as any);
    await settleAppliedEvidence();
    expect(graded.autoScore).toBe(100);
    expect(graded.autoGradeTrusted).toBe(false);
    expect(await StudentSkillEvidence.countDocuments()).toBe(0);
    expect(published).toHaveLength(0);
    // The student's view of the submission does not carry grading provenance.
    expect(toStudentSubmission(graded)).not.toHaveProperty('autoGradeTrusted');
  });

  it('writes nothing when the runner could not judge one of the cases', async () => {
    unavailableAt = 2;
    const a = await codingAssignment(grader._id);
    const s = await inProgress(a, student);
    await submissionService.submitCoding(s._id, student._id, a.tenant as any);
    await settleAppliedEvidence();
    expect(await StudentSkillEvidence.countDocuments()).toBe(0);
    expect(published).toHaveLength(0);
  });

  it('saving and running create no evidence', async () => {
    const a = await codingAssignment(grader._id);
    const s = await inProgress(a, student);
    await submissionService.saveCode(s._id, student._id, a.tenant as any, { code: 'print(1)', language: 'python' as any });
    await submissionService.runCode(s._id, student._id, a.tenant as any, 'print(1)', 'python' as any);
    await settleAppliedEvidence();
    expect(await StudentSkillEvidence.countDocuments()).toBe(0);
    expect(published).toHaveLength(0);
  });

  it('a retry creates no duplicate and no second trigger; a regrade replaces; a reattempt is new evidence', async () => {
    const a = await codingAssignment(grader._id);
    const s = await inProgress(a, student);
    await submissionService.submitCoding(s._id, student._id, a.tenant as any);
    await settleAppliedEvidence();

    const retry = await recordAppliedEvaluation({ tenantId: TENANT, submissionId: String(s._id), evaluation: 'AUTO_GRADED' });
    expect(retry).toMatchObject({ outcome: 'UNCHANGED', triggered: false });
    expect(await StudentSkillEvidence.countDocuments()).toBe(1);
    expect(published).toHaveLength(1);

    // The grader reviews the same attempt against the rubric: 45 of 100.
    await submissionService.grade(s._id, a.tenant as any, { gradedBy: grader._id, rubricScores: [
      { criterionIndex: 0, pointsAwarded: 30 }, { criterionIndex: 1, pointsAwarded: 10 }, { criterionIndex: 2, pointsAwarded: 5 },
    ] });
    await settleAppliedEvidence();
    let rows = await evidenceFor(s._id);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ performance: 0.45, evaluation: 'REVIEWED', attemptNumber: 1 });
    expect(String(rows[0].evaluatedBy)).toBe(String(grader._id));
    expect(published).toHaveLength(2);

    // Regraded upward: still one contribution, at the new grade.
    await submissionService.grade(s._id, a.tenant as any, { gradedBy: grader._id, rubricScores: [
      { criterionIndex: 0, pointsAwarded: 60 }, { criterionIndex: 1, pointsAwarded: 25 }, { criterionIndex: 2, pointsAwarded: 5 },
    ] });
    await settleAppliedEvidence();
    rows = await evidenceFor(s._id);
    expect(rows).toHaveLength(1);
    expect(rows[0].performance).toBe(0.9);
    expect(await StudentSkillProfile.findOne({ studentId: student._id, skillKey: 'CONDITIONALS_BASICS' }).lean()).toMatchObject({ score: 90, evidenceCount: 1 });

    // Reattempt: new work, new evidence beside the old.
    await submissionService.allowReattempt(s._id, a.tenant as any, grader._id);
    passing = (_c, i) => i < 4;
    caseIndex = 0;
    await Submission.updateOne({ _id: s._id }, { $set: { code: 'print("again")', language: 'python' } });
    await submissionService.submitCoding(s._id, student._id, a.tenant as any);
    await settleAppliedEvidence();
    rows = await evidenceFor(s._id);
    expect(rows.map(r => [r.attemptNumber, r.performance]).sort()).toEqual([[1, 0.9], [2, 0.8]]);
    expect(await StudentSkillProfile.findOne({ studentId: student._id, skillKey: 'CONDITIONALS_BASICS' }).lean()).toMatchObject({ score: 85, evidenceCount: 2 });
  });

  it('a review whose total includes a simulated run is not evidence unless the rubric carries the whole judgement', async () => {
    runnerReal = false;
    const a = await codingAssignment(grader._id);
    const s = await inProgress(a, student);
    await submissionService.submitCoding(s._id, student._id, a.tenant as any);
    await submissionService.grade(s._id, a.tenant as any, { gradedBy: grader._id, manualScore: 10 });
    await settleAppliedEvidence();
    expect(await recordAppliedEvaluation({ tenantId: TENANT, submissionId: String(s._id), evaluation: 'REVIEWED' }))
      .toMatchObject({ outcome: 'UNTRUSTED_GRADE' });
    expect(await StudentSkillEvidence.countDocuments()).toBe(0);

    await submissionService.grade(s._id, a.tenant as any, { gradedBy: grader._id, rubricScores: [
      { criterionIndex: 0, pointsAwarded: 30 }, { criterionIndex: 1, pointsAwarded: 30 }, { criterionIndex: 2, pointsAwarded: 10 },
    ] });
    await settleAppliedEvidence();
    expect((await evidenceFor(s._id))[0]).toMatchObject({ performance: 0.7, evaluation: 'REVIEWED' });
  });
});

describe('a project', () => {
  it('submitting it creates nothing; an authorised grade records every assessable unit skill once and triggers', async () => {
    const a = await projectAssignment(grader._id);
    const s = await inProgress(a, student, { code: undefined, language: undefined });
    await submissionService.submitTheory(s._id, student._id, a.tenant as any, 'my project write-up');
    await settleAppliedEvidence();
    expect(await StudentSkillEvidence.countDocuments()).toBe(0);
    expect(published).toHaveLength(0);
    expect(await recordAppliedEvaluation({ tenantId: TENANT, submissionId: String(s._id), evaluation: 'REVIEWED' })).toMatchObject({ outcome: 'NOT_EVALUATED' });

    const res = capture();
    await submissionController.grade(req(grader, TENANT, { submissionId: String(s._id) }, {
      rubricScores: [{ criterion: 'Works', score: 40 }, { criterion: 'Explained', score: 30 }], feedback: 'good',
    }), res);
    await settleAppliedEvidence();
    expect(res.statusCode).toBe(200);

    const rows = await evidenceFor(s._id);
    // Unit skills: PROGRAMMING_FUNDAMENTALS, PYTHON_BASICS (PYTHON_STRINGS retired, PROGRAMMING_GROUP a group).
    expect(rows.map(r => r.skillKey).sort()).toEqual(['PROGRAMMING_FUNDAMENTALS', 'PYTHON_BASICS']);
    expect(rows.every(r => r.sourceType === 'PROJECT_EVALUATION' && r.evidenceKind === 'APPLIED' && r.performance === 0.7 && r.evidenceWeight === 1 && r.evaluation === 'REVIEWED')).toBe(true);
    expect(published).toHaveLength(1);
    expect(published[0]).toMatchObject({ name: 'PROJECT_EVALUATED', skillKeys: ['PROGRAMMING_FUNDAMENTALS', 'PYTHON_BASICS'] });

    // The same grade sent again: nothing new.
    await submissionController.grade(req(grader, TENANT, { submissionId: String(s._id) }, {
      rubricScores: [{ criterion: 'Works', score: 40 }, { criterion: 'Explained', score: 30 }],
    }), capture());
    await settleAppliedEvidence();
    expect(await StudentSkillEvidence.countDocuments()).toBe(2);
    expect(published).toHaveLength(1);
  });

  it('an assignment with no unit, or a unit with no assessable skill, records nothing and says so', async () => {
    const noUnit = await projectAssignment(grader._id, { unitCode: undefined });
    const s1 = await inProgress(noUnit, student, { status: 'graded', gradedBy: grader._id, manualScore: 80 });
    expect(await recordAppliedEvaluation({ tenantId: TENANT, submissionId: String(s1._id), evaluation: 'REVIEWED' })).toMatchObject({ outcome: 'NO_UNIT' });

    await unit('T_UNMAPPED_PROJECT', ['PYTHON_STRINGS']);
    const unmapped = await projectAssignment(grader._id, { unitCode: 'T_UNMAPPED_PROJECT' });
    const s2 = await inProgress(unmapped, student, { status: 'graded', gradedBy: grader._id, manualScore: 80 });
    expect(await recordAppliedEvaluation({ tenantId: TENANT, submissionId: String(s2._id), evaluation: 'REVIEWED' })).toMatchObject({ outcome: 'UNMAPPED' });
    expect(await StudentSkillEvidence.countDocuments()).toBe(0);
    expect(published).toHaveLength(0);
  });
});

describe('who can produce applied evidence', () => {
  it('a grader signed into one tenant cannot grade another tenant\'s submission by sending its tenant header', async () => {
    const foreignStudent = await person('STUDENT', OTHER_TENANT);
    const foreignAuthor = await person('INSTRUCTOR', OTHER_TENANT);
    await unit('T_VARIABLES_MINI_PROJECT', ['PROGRAMMING_FUNDAMENTALS'], OTHER_TENANT);
    const a = await projectAssignment(foreignAuthor._id, {}, OTHER_TENANT);
    const s = await inProgress(a, foreignStudent, { status: 'submitted' });

    const res = capture();
    await submissionController.grade(req(grader, OTHER_TENANT, { submissionId: String(s._id) }, { manualScore: 100 }), res);
    await settleAppliedEvidence();
    expect(res.statusCode).toBe(400);
    expect((await Submission.findById(s._id).lean() as any).status).toBe('submitted');
    expect(await StudentSkillEvidence.countDocuments()).toBe(0);
    // Nor can the evidence be recorded under the wrong tenant directly.
    expect(await recordAppliedEvaluation({ tenantId: TENANT, submissionId: String(s._id), evaluation: 'REVIEWED' })).toMatchObject({ outcome: 'REFUSED', reason: 'NO_SUCH_SUBMISSION' });
  });

  it('a student cannot reach the grading endpoint', async () => {
    const next = jest.fn();
    const res = capture();
    await roleGuard(['grade_submissions'])(req(student, TENANT) as any, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(403);
  });

  it('a student cannot submit someone else\'s work, and nothing in a submit request can claim a grade', async () => {
    runnerReal = false;
    const a = await codingAssignment(grader._id);
    const s = await inProgress(a, student);
    const intruder = await person('STUDENT');

    const stolen = capture();
    await submissionController.submitCoding(req(intruder, TENANT, { submissionId: String(s._id) }), stolen);
    expect(stolen.statusCode).toBe(400);

    const own = capture();
    await submissionController.submitCoding(req(student, TENANT, { submissionId: String(s._id) }, {
      autoScore: 100, autoGradeTrusted: true, performance: 1, evidenceKind: 'APPLIED',
    }), own);
    await settleAppliedEvidence();
    expect(own.statusCode).toBe(200);
    expect(own.body.data.autoGradeTrusted).toBe(false);
    expect(await StudentSkillEvidence.countDocuments()).toBe(0);
  });

  it('a grade the student gave their own work is not a review', async () => {
    const a = await projectAssignment(grader._id);
    const s = await inProgress(a, student, { status: 'graded', gradedBy: student._id, manualScore: 100 });
    expect(await recordAppliedEvaluation({ tenantId: TENANT, submissionId: String(s._id), evaluation: 'REVIEWED' })).toMatchObject({ outcome: 'REFUSED', reason: 'SELF_GRADED' });
    expect(await StudentSkillEvidence.countDocuments()).toBe(0);
  });

  it('an ungraded submission is never evaluated by claiming it is', async () => {
    const a = await codingAssignment(grader._id);
    const s = await inProgress(a, student, { autoScore: 100, autoGradeTrusted: true });
    expect(await recordAppliedEvaluation({ tenantId: TENANT, submissionId: String(s._id), evaluation: 'AUTO_GRADED' })).toMatchObject({ outcome: 'NOT_EVALUATED' });
    expect(await StudentSkillEvidence.countDocuments()).toBe(0);
    expect(mongoose.Types.ObjectId.isValid(String(s._id))).toBe(true);
  });
});
