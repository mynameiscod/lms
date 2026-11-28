/**
 * Web (frontend) assignments end to end, against a real database (2026-11-28).
 *
 * The brief is cleaned on save and a check that cannot run is refused there; a student's files are
 * saved and handed in together; the checklist gives its share of the points and the trainer's rubric
 * the rest; the student is sent the checklist lines but not the selectors behind them.
 */
import mongoose from 'mongoose';
import { startMongo, stopMongo, clearCollections } from './mongoHarness';

jest.setTimeout(180_000);
jest.mock('../../services/aiService', () => ({
  ...jest.requireActual('../../services/aiService'),
  reviewWebSubmissionWithAI: jest.fn(async () => '- Good structure'),
}));

import Assignment, { AssignmentType } from '../../models/Assignment';
import Submission, { SubmissionStatus } from '../../models/Submission';
import assignmentService from '../../services/assignmentService';
import submissionService from '../../services/submissionService';
import { toStudentAssignment } from '../../services/studentAssignmentView';

const TENANT = new mongoose.Types.ObjectId();
const ADMIN = new mongoose.Types.ObjectId();
const STUDENT = new mongoose.Types.ObjectId();

const WEB = {
  stack: 'html_css',
  files: [{ name: 'index.html', code: '<!-- start -->' }, { name: 'style.css', code: '' }, { name: 'hack.php', code: 'x' }],
  brief: 'A login card centred on the page.',
  colors: [{ name: 'Primary', hex: '#1E40AF' }],
  fonts: [{ family: 'Poppins', weights: '400, 600' }],
  assets: [{ url: 'http://x/api/v1/public/assignment-assets/t/0123456789abcdef01234567.webp', name: 'logo.png' }],
  requirements: [
    { id: 'r1', text: 'A form with an email field', kind: 'element', selector: 'form input[type=email]', points: 2 },
    { id: 'r2', text: 'Uses the primary colour', kind: 'color', value: '#1e40af', points: 1 },
    { id: 'r3', text: 'Uses the logo', kind: 'image', value: 'http://x/api/v1/public/assignment-assets/t/0123456789abcdef01234567.webp', points: 1 },
  ],
  autoWeight: 40,
  aiFeedback: true,
};

const create = (web: any = WEB) => assignmentService.create({
  tenant: TENANT as any, createdBy: ADMIN as any, title: 'Login page', type: AssignmentType.WEB, totalPoints: 100, passingPoints: 40,
  rubric: [{ criterion: 'Layout', description: '', maxPoints: 30, order: 0 }, { criterion: 'Code quality', description: '', maxPoints: 30, order: 1 }],
  web,
} as any);

beforeAll(startMongo);
afterAll(stopMongo);
afterEach(clearCollections);

it('cleans the brief on save and refuses a check that cannot run', async () => {
  const a = await create();
  const row: any = await Assignment.findById(a._id).lean();
  expect(row.web.files.map((f: any) => f.name)).toEqual(['index.html', 'style.css']);
  expect(row.web.colors).toEqual([{ name: 'Primary', hex: '#1e40af' }]);
  expect(row.web.fonts[0].weights).toBe('400;600');
  expect(row.web.autoWeight).toBe(40);

  await expect(create({ ...WEB, requirements: [{ id: 'x', text: 'Hover', kind: 'element', selector: 'a:hover', points: 1 }] }))
    .rejects.toMatchObject({ status: 400 });
  await expect(create({ ...WEB, colors: [{ name: 'Sky', hex: 'blue' }] })).rejects.toThrow(/colour code/);
});

it('sends the student the checklist lines, not the selectors', async () => {
  const a = await create();
  const view: any = toStudentAssignment(await Assignment.findById(a._id).lean());
  expect(view.web.requirements[0]).toEqual({ id: 'r1', text: 'A form with an email field', kind: 'element', points: 2 });
  expect(view.web.requirements[0].selector).toBeUndefined();
  expect(view.web.assets).toHaveLength(1);
});

it('saves all files, marks the checklist share, and the rubric adds the rest', async () => {
  const a = await create();
  const sub = await Submission.create({ tenant: TENANT, assignment: a._id, student: STUDENT, attemptNumber: 1, status: SubmissionStatus.IN_PROGRESS, startedAt: new Date() } as any);
  const files = [
    { name: 'index.html', code: '<form><input type="email"><img src="https://lms.example.com/api/v1/public/assignment-assets/t/0123456789abcdef01234567.webp"></form>' },
    { name: 'style.css', code: 'button{background:#1E40AF}' },
  ];
  await submissionService.saveCode(sub._id, STUDENT as any, TENANT as any, { code: '', language: 'html' as any, files });
  let row: any = await Submission.findById(sub._id).lean();
  expect(row.webFiles.map((f: any) => f.name)).toEqual(['index.html', 'style.css']);
  expect(row.code).toContain('===== style.css =====');

  // Submitted with no files in the request: the saved ones are marked.
  const done: any = await submissionService.submitWeb(sub._id, STUDENT as any, TENANT as any, {});
  expect(done.webChecks.map((c: any) => c.passed)).toEqual([true, true, true]);
  expect(done.autoScore).toBe(40); // every check passed, 40% of 100
  expect(done.status).toBe(SubmissionStatus.SUBMITTED);
  expect(done.autoGradeTrusted).toBe(false);

  await new Promise(r => setTimeout(r, 50));
  row = await Submission.findById(sub._id).lean();
  expect(row.aiReview).toBe('- Good structure');

  const graded: any = await submissionService.grade(sub._id, TENANT as any, {
    gradedBy: ADMIN as any,
    rubricScores: [{ criterionIndex: 0, pointsAwarded: 25 }, { criterionIndex: 1, pointsAwarded: 20 }],
  });
  expect(graded.finalScore).toBe(85);
  expect(graded.percentage).toBe(85);
  expect(graded.status).toBe(SubmissionStatus.GRADED);
});

it('an empty page cannot be handed in, and with no checklist the rubric carries the whole mark', async () => {
  const a = await create({ ...WEB, requirements: [] });
  const sub = await Submission.create({ tenant: TENANT, assignment: a._id, student: STUDENT, attemptNumber: 1, status: SubmissionStatus.IN_PROGRESS, startedAt: new Date() } as any);
  await expect(submissionService.submitWeb(sub._id, STUDENT as any, TENANT as any, { files: [{ name: 'index.html', code: '   ' }] }))
    .rejects.toThrow(/Write your page/);
  const done: any = await submissionService.submitWeb(sub._id, STUDENT as any, TENANT as any, { files: [{ name: 'index.html', code: '<h1>Hi</h1>' }] });
  expect(done.autoScore).toBe(0);
  expect(done.webChecks).toEqual([]);
});
