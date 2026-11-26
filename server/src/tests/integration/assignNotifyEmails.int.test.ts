/**
 * Who is emailed about a quiz or an assignment (2026-11-26), against a real database.
 *
 * Creating a quiz emailed every student in the institute when its hidden audience was "everyone",
 * and Assign to Batches emailed nobody. Now: creating emails nobody; assigning emails only the
 * students the assignment reaches, once; and the email is in the CodeBegun look.
 */
import mongoose from 'mongoose';
import { startMongo, stopMongo, clearCollections } from './mongoHarness';

jest.setTimeout(180_000);

const sent: { kind: 'quiz' | 'assignment'; to: string; details: any }[] = [];
jest.mock('../../services/emailService', () => ({
  EmailService: class {
    async sendQuizNotificationEmail(to: string, _n: string, details: any) { sent.push({ kind: 'quiz', to, details }); return true; }
    async sendAssignmentNotificationEmail(to: string, _n: string, details: any) { sent.push({ kind: 'assignment', to, details }); return true; }
  },
}));

// The controller fires the emails after responding; keep the promise so the test can wait for it.
let pending: Promise<any>[] = [];
jest.mock('../../services/assessmentAssignNotify', () => {
  const real = jest.requireActual('../../services/assessmentAssignNotify');
  return {
    ...real,
    notifyAssignedInBackground: (...args: any[]) => { pending.push((real.notifyAssigned as any)(...args)); },
  };
});

import User from '../../models/User';
import Quiz from '../../models/Quiz';
import { AssignmentType } from '../../models/Assignment';
import assignmentService from '../../services/assignmentService';
import { assignToBatches } from '../../controllers/assessmentScheduleController';
import { createQuiz } from '../../controllers/quizController';
import { renderQuizEmail, renderAssignmentEmail, CODEBEGUN_LOGO_URL } from '../../services/assessmentEmailTemplate';
import { rebrand } from '../../services/tenantBrand';

const TENANT = new mongoose.Types.ObjectId();
const ADMIN = new mongoose.Types.ObjectId();
const BATCH_A = new mongoose.Types.ObjectId();
const BATCH_B = new mongoose.Types.ObjectId();

const student = (email: string, extra: any = {}) => User.create({
  tenantId: TENANT, firstName: 'S', lastName: email, email, password: 'x', role: 'STUDENT', isActive: true, ...extra,
} as any);

const fakeRes = () => {
  const r: any = { statusCode: 200, body: null };
  r.status = (c: number) => { r.statusCode = c; return r; };
  r.json = (b: any) => { r.body = b; return r; };
  return r;
};
const assign = async (body: any) => {
  const res = fakeRes();
  await assignToBatches({ body, user: { tenantId: String(TENANT), id: String(ADMIN), role: 'TENANT_ADMIN' } } as any, res);
  expect(res.statusCode).toBe(200);
  await Promise.all(pending); pending = [];
};
const mails = () => sent.map(s => s.to).sort();

const makeQuiz = (over: any = {}) => Quiz.create({
  title: 'Arrays check', tenantId: String(TENANT), createdBy: String(ADMIN),
  startDate: new Date(), endDate: new Date(Date.now() + 3650 * 86_400_000), startTime: '00:00', endTime: '23:59',
  totalMarks: 20, totalTime: 30, access: 'public', accessibleTo: 'batch_wise', selectedBatches: [], isActive: true, ...over,
} as any);

let a1: any, a2: any, placed: any;
beforeAll(startMongo);
afterAll(stopMongo);
beforeEach(async () => {
  sent.length = 0; pending = [];
  a1 = await student('a1@x.com', { batchId: BATCH_A });
  a2 = await student('a2@x.com', { batchId: BATCH_A });
  placed = await student('placed@x.com', { batchId: BATCH_B, placementBatchIds: [BATCH_A] });
  await student('b1@x.com', { batchId: BATCH_B });
  await student('gone@x.com', { batchId: BATCH_A, isActive: false });
});
afterEach(clearCollections);

describe('creating a quiz', () => {
  it('emails nobody and stores no audience, even when "everyone" leaks in from the wizard', async () => {
    const res = fakeRes();
    await createQuiz({
      body: { title: 'Leaky', totalMarks: 10, totalTime: 10, startDate: '2026-11-26', endDate: '2036-11-26', startTime: '00:00', endTime: '23:59', accessibleTo: 'everyone', isExternalQuiz: false },
      tenantId: String(TENANT), userId: String(ADMIN),
    } as any, res);
    expect(res.statusCode).toBe(201);
    const q: any = await Quiz.findById(res.body._id).lean();
    expect(q.accessibleTo).toBe('batch_wise');
    expect(q.selectedBatches).toEqual([]);
    expect(sent).toHaveLength(0);
  });
});

describe('Assign to Batches', () => {
  it('emails only the assigned batch (home and placement members, active only), once', async () => {
    const q = await makeQuiz();
    const dueAt = new Date(Date.now() + 3 * 86_400_000).toISOString();
    await assign({ contentType: 'quiz', contentId: String(q._id), batches: [{ batchId: String(BATCH_A), batchName: 'Batch A', dueAt }] });
    expect(mails()).toEqual(['a1@x.com', 'a2@x.com', 'placed@x.com']);
    expect(sent.every(s => s.kind === 'quiz' && s.details.batchName === 'Batch A' && s.details.dueAt === dueAt)).toBe(true);

    // Saving Batch A again with new dates tells nobody; adding Batch B tells only Batch B.
    sent.length = 0;
    await assign({ contentType: 'quiz', contentId: String(q._id), batches: [
      { batchId: String(BATCH_A), dueAt: new Date(Date.now() + 5 * 86_400_000).toISOString() },
      { batchId: String(BATCH_B), batchName: 'Batch B' },
    ] });
    // Only the NEW batch is told. placed@ is a Batch B home student, so Batch B's assignment
    // reaches them too (with Batch B's dates, which now apply to them).
    expect(mails()).toEqual(['b1@x.com', 'placed@x.com']);
  });

  it('emails specific students, and only the newly added one on a later save', async () => {
    const q = await makeQuiz();
    await assign({ contentType: 'quiz', contentId: String(q._id), students: [String(a1._id)] });
    expect(mails()).toEqual(['a1@x.com']);
    sent.length = 0;
    await assign({ contentType: 'quiz', contentId: String(q._id), students: [String(a1._id), String(a2._id)] });
    expect(mails()).toEqual(['a2@x.com']);
  });

  it('emails nobody for an external or inactive quiz', async () => {
    const ext = await makeQuiz({ isExternalQuiz: true, accessibleTo: 'everyone' });
    const off = await makeQuiz({ isActive: false });
    await assign({ contentType: 'quiz', contentId: String(ext._id), batches: [{ batchId: String(BATCH_A) }] });
    await assign({ contentType: 'quiz', contentId: String(off._id), batches: [{ batchId: String(BATCH_A) }] });
    expect(sent).toHaveLength(0);
  });

  it('an assignment: a draft tells nobody; publishing tells its batches once, with their dates', async () => {
    const a = await assignmentService.create({
      tenant: TENANT as any, createdBy: ADMIN as any, title: 'Linked lists', type: AssignmentType.THEORY,
      accessibleTo: 'batch_wise', selectedBatches: [String(BATCH_B)],
    } as any);
    const dueAt = new Date(Date.now() + 4 * 86_400_000).toISOString();
    await assign({ contentType: 'assignment', contentId: String(a._id), batches: [{ batchId: String(BATCH_A), batchName: 'Batch A', dueAt }] });
    expect(sent).toHaveLength(0);

    await assignmentService.publish(a._id, TENANT as any, ADMIN as any);
    for (let i = 0; i < 50 && sent.length < 4; i++) await new Promise(r => setTimeout(r, 50));
    // Batch B from the form (b1, placed) + Batch A from the schedule (a1, a2) — placed@ once.
    expect(mails()).toEqual(['a1@x.com', 'a2@x.com', 'b1@x.com', 'placed@x.com']);
    const viaSchedule = sent.find(s => s.to === 'a1@x.com')!;
    expect(viaSchedule.kind).toBe('assignment');
    expect(viaSchedule.details.batchName).toBe('Batch A');
    expect(new Date(viaSchedule.details.dueAt).toISOString()).toBe(dueAt);

    // Assigning a published assignment to a new student emails just them.
    sent.length = 0;
    const late = await student('late@x.com', { batchId: new mongoose.Types.ObjectId() });
    await assign({ contentType: 'assignment', contentId: String(a._id), students: [String(late._id)] });
    expect(mails()).toEqual(['late@x.com']);
  });
});

describe('the email itself', () => {
  it('uses the CodeBegun logo and navy, escapes what an admin typed, and shows the batch deadline', () => {
    const due = new Date('2026-11-28T18:29:00.000Z'); // 11:59 pm IST
    const q = renderQuizEmail('Asha', { title: 'Loops <script>', description: 'Read & answer', dueAt: due, totalTime: 30, totalMarks: 20, batchName: 'Java Nov' });
    expect(q.html).toContain(CODEBEGUN_LOGO_URL);
    expect(q.html).toContain('#051D64');
    expect(q.html).toContain('#359AAD');
    expect(q.html).not.toMatch(/#005897|#f97316|#764ba2/i);
    expect(q.html).toContain('Loops &lt;script&gt;');
    expect(q.html).not.toContain('<script>');
    expect(q.html).toContain('Assigned to Java Nov');
    expect(q.html).toMatch(/Submit by Sat, 28 Nov 2026, 11:59 pm/i);
    expect(q.subject).toBe('New quiz: Loops <script> (due Sat, 28 Nov 2026)');
    expect(q.text).toContain('Due: Sat, 28 Nov 2026, 11:59 pm');

    // Another institute: its name replaces CodeBegun; with no logo, its name fills the header band.
    const other = rebrand(q.html, { isPlatformOwner: false, name: 'Sunrise Academy', logoUrl: '', supportEmail: 'help@sunrise.in', supportPhone: '', address: '', website: '', primaryColor: '' });
    expect(other).not.toContain(CODEBEGUN_LOGO_URL);
    expect(other).not.toMatch(/CodeBegun|codebegun\.com<|63010/);
    expect(other).toMatch(/color:#051D64;">Sunrise Academy<\/div>/);
    const withLogo = rebrand(q.html, { isPlatformOwner: false, name: 'Sunrise', logoUrl: 'https://cdn.x/s.png', supportEmail: '', supportPhone: '', address: '', website: '', primaryColor: '' });
    expect(withLogo).toContain('src="https://cdn.x/s.png"');

    const a = renderAssignmentEmail('Asha', { title: 'Linked lists', type: 'coding', difficulty: 'medium', totalPoints: 50 });
    expect(a.html).toContain(CODEBEGUN_LOGO_URL);
    expect(a.html).toContain('No deadline');
    expect(a.html).toContain('Coding');
  });
});
