/**
 * Project Studio, Phase 1 — real routes, real database.
 * Covers: release to batches, pick once (no switching), repo + proof checks, mentor review,
 * completion %, answers hidden until submitted, admin reset, and the Practice Pass count.
 */
import express from 'express';
import mongoose from 'mongoose';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { startMongo, stopMongo } from './mongoHarness';

jest.setTimeout(180_000);
process.env.JWT_SECRET = process.env.JWT_SECRET || 'project-studio-integration-test-secret-0123456789abcdef';

import User from '../../models/User';
import Tenant from '../../models/Tenant';
import Batch from '../../models/Batch';
import { PracticePolicy, PracticeDay } from '../../models/PracticePass';
import { ProjectEnrollment } from '../../models/ProjectStudio';
import projectStudioRoutes from '../../routes/projectStudioRoutes';
import { recomputeStudent } from '../../services/practicePassService';

const app = express();
app.use(express.json());
app.use('/ps', projectStudioRoutes);

let tenantId = '';
let batchA = ''; let batchB = '';
const ids: Record<string, string> = {};
const tokens: Record<string, string> = {};
const call = (who: string, method: 'get' | 'post' | 'put' | 'delete', p: string, body?: any) =>
  (request(app) as any)[method](`/ps${p}`).set('Authorization', `Bearer ${tokens[who]}`).set('X-Tenant-Id', tenantId).send(body);

beforeAll(async () => {
  await startMongo();
  const t: any = await Tenant.create({ name: 'PS', slug: 'ps', domain: 'ps.test', isActive: true, adminId: new mongoose.Types.ObjectId() } as any);
  tenantId = String(t._id);
  const mkBatch = async (name: string) => String((await Batch.create({ tenantId: t._id, name, startDate: new Date(Date.now() - 30 * 86_400_000), endDate: new Date(Date.now() + 90 * 86_400_000), isActive: true } as any))._id);
  batchA = await mkBatch('Java A'); batchB = await mkBatch('Python B');
  const mk = async (who: string, role: string, batchId?: string) => {
    const u: any = await User.create({ tenantId: t._id, firstName: who, lastName: 'T', email: `${who}@ps.test`, password: 'x', role, isActive: true, ...(batchId ? { batchId, batchJoinedDate: new Date(Date.now() - 20 * 86_400_000) } : {}) });
    ids[who] = String(u._id);
    tokens[who] = jwt.sign({ id: ids[who], email: u.email, role, tenantId }, process.env.JWT_SECRET as string);
  };
  await mk('admin', 'TENANT_ADMIN'); await mk('asha', 'STUDENT', batchA); await mk('ravi', 'STUDENT', batchA); await mk('bala', 'STUDENT', batchB);
});
afterAll(stopMongo);

let templateId = '';
let taskCommit = ''; let taskText = '';

describe('admin builds and releases a project', () => {
  it('students cannot reach admin routes', async () => {
    expect((await call('asha', 'get', '/admin/templates')).status).toBe(403);
  });

  it('creates, refuses to publish an empty project, then publishes with tasks', async () => {
    const c = await call('admin', 'post', '/admin/templates', { title: 'Hostel Booking (test)', domain: 'Healthcare', techStack: ['Spring Boot', 'React'] });
    expect(c.status).toBe(200);
    templateId = c.body.data._id;
    expect((await call('admin', 'put', `/admin/templates/${templateId}`, { title: 'Hostel Booking (test)', status: 'published', sprints: [] })).status).toBe(400);

    const r = await call('admin', 'put', `/admin/templates/${templateId}`, {
      title: 'Hostel Booking (test)', techStack: ['Spring Boot', 'React'], status: 'published', releasedBatchIds: [batchA],
      sprints: [{ title: 'Sprint 1', goal: 'Auth', days: [{ title: 'Day 1', tasks: [
        { title: 'Login API', proofType: 'commit', weight: 3, acceptance: ['POST /auth/login returns a token'], questions: [{ q: 'JWT vs session?', a: 'Stateless token vs server state' }] },
        { title: 'Explain roles', proofType: 'text', weight: 1 },
      ] }] }],
    });
    expect(r.status).toBe(200);
    const tasks = r.body.data.template.sprints[0].days[0].tasks;
    taskCommit = tasks[0]._id; taskText = tasks[1]._id;
  });
});

describe('student picks and works', () => {
  it('only students in a released batch see it', async () => {
    expect((await call('asha', 'get', '/me')).body.data.catalog).toHaveLength(1);
    expect((await call('bala', 'get', '/me')).body.data.catalog).toHaveLength(0);
    expect((await call('bala', 'post', '/me/pick', { templateId })).status).toBe(404);
  });

  it('picks once and cannot switch', async () => {
    expect((await call('asha', 'post', '/me/pick', { templateId })).status).toBe(200);
    expect((await call('asha', 'post', '/me/pick', { templateId })).status).toBe(409);
  });

  it('hides interview answers until the task is submitted', async () => {
    const me = (await call('asha', 'get', '/me')).body.data;
    const task = me.template.sprints[0].days[0].tasks[0];
    expect(task.questions).toHaveLength(0);
    expect(task.questionCount).toBe(1);
  });

  it('needs the repo first, and a commit from that repo', async () => {
    expect((await call('asha', 'post', `/me/tasks/${taskCommit}/submit`, { proofUrl: 'https://github.com/asha/clinic/commit/abc1234' })).status).toBe(400);
    expect((await call('asha', 'put', '/me/repo', { repoUrl: 'not a url' })).status).toBe(400);
    expect((await call('asha', 'put', '/me/repo', { repoUrl: 'https://github.com/asha/clinic.git' })).body.data.repoUrl).toBe('https://github.com/asha/clinic');
    expect((await call('asha', 'post', `/me/tasks/${taskCommit}/submit`, { proofUrl: 'https://github.com/someone/else/commit/abc1234' })).status).toBe(400);
    const ok = await call('asha', 'post', `/me/tasks/${taskCommit}/submit`, { proofUrl: 'https://github.com/asha/clinic/commit/abc1234' });
    expect(ok.status).toBe(200);
    expect(ok.body.data).toEqual({ status: 'submitted', completionPct: 0 });
    const task = (await call('asha', 'get', '/me')).body.data.template.sprints[0].days[0].tasks[0];
    expect(task.questions[0].a).toMatch(/Stateless/);
  });

  it('another student cannot use the same repository', async () => {
    await call('ravi', 'post', '/me/pick', { templateId });
    expect((await call('ravi', 'put', '/me/repo', { repoUrl: 'https://github.com/ASHA/clinic' })).status).toBe(400);
  });

  it('text proof needs a real explanation', async () => {
    expect((await call('asha', 'post', `/me/tasks/${taskText}/submit`, { note: 'short' })).status).toBe(400);
    expect((await call('asha', 'post', `/me/tasks/${taskText}/submit`, { note: 'Admin, doctor and patient roles guard each endpoint.' })).status).toBe(200);
  });
});

describe('mentor review and completion %', () => {
  let enrollmentId = '';
  it('queues submissions and approves them', async () => {
    const q = (await call('admin', 'get', '/admin/review')).body.data;
    expect(q).toHaveLength(2);
    enrollmentId = q[0].enrollmentId;
    expect((await call('admin', 'post', `/admin/enrollments/${enrollmentId}/tasks/${taskCommit}/review`, { action: 'changes' })).status).toBe(400);
    const a = await call('admin', 'post', `/admin/enrollments/${enrollmentId}/tasks/${taskCommit}/review`, { action: 'approve' });
    expect(a.body.data).toEqual({ status: 'done', completionPct: 75 }); // weight 3 of 4
    const b = await call('admin', 'post', `/admin/enrollments/${enrollmentId}/tasks/${taskText}/review`, { action: 'approve' });
    expect(b.body.data.completionPct).toBe(100);
  });

  it('progress lists the batch, including who has not picked', async () => {
    const rows = (await call('admin', 'get', `/admin/progress?batchId=${batchA}`)).body.data;
    expect(rows.find((r: any) => r.studentId === ids.asha).completionPct).toBe(100);
    expect(rows.find((r: any) => r.studentId === ids.ravi).notStarted).toBeUndefined();
  });

  it('a template edit re-scores students against the new weights', async () => {
    const t = (await call('admin', 'get', `/admin/templates/${templateId}`)).body.data;
    t.sprints[0].days[0].tasks.push({ title: 'Deploy', proofType: 'url', weight: 4, acceptance: [], questions: [] });
    const r = await call('admin', 'put', `/admin/templates/${templateId}`, t);
    expect(r.body.data.rescored).toBe(2);
    const e: any = await ProjectEnrollment.findById(enrollmentId).lean();
    expect(e.completionPct).toBe(50); // 4 of 8
  });

  it('reset frees the student to pick again, keeping the old record', async () => {
    expect((await call('admin', 'post', `/admin/enrollments/${enrollmentId}/reset`, { reason: 'wrong project' })).status).toBe(200);
    expect((await call('asha', 'get', '/me')).body.data.enrollment).toBeNull();
    expect(await ProjectEnrollment.countDocuments({ studentId: ids.asha })).toBe(1);
    expect((await call('asha', 'post', '/me/pick', { templateId })).status).toBe(200);
  });

  it('a used project is archived, not deleted', async () => {
    expect((await call('admin', 'delete', `/admin/templates/${templateId}`)).body.data.archived).toBe(true);
  });
});

describe('Practice Pass counts project submissions', () => {
  it('a task submitted today meets a project_task requirement', async () => {
    const today = new Date(Date.now() + 5.5 * 3600_000).toISOString().slice(0, 10);
    await PracticePolicy.create({ tenantId, scope: 'tenant', targetId: '', startDate: '2026-01-01', enforceFrom: '2026-01-01',
      requirements: { communication: 0, coding_problem: 0, assignment: 0, thinking_lab: 0, project_task: 1 } } as any);
    // ravi submits a text task today (his enrollment is still active)
    expect((await call('ravi', 'post', `/me/tasks/${taskText}/submit`, { note: 'Roles are checked by a filter on every request.' })).status).toBe(200);
    await recomputeStudent(tenantId, ids.ravi);
    const day: any = await PracticeDay.findOne({ studentId: ids.ravi, date: today }).lean();
    expect(day?.done?.project_task).toBe(1);
    expect(day?.met).toBe(true);
  });
});

describe('starter projects', () => {
  it('adds the Clinic starter as a draft for no batch, once', async () => {
    const list = (await call('admin', 'get', '/admin/starters')).body.data;
    const clinic = list.find((s: any) => s.key === 'clinic-appointment-system');
    expect(clinic).toMatchObject({ added: false, taskCount: 27, sprintCount: 4, dayCount: 20 });
    const r = await call('admin', 'post', '/admin/starters/clinic-appointment-system/install');
    expect(r.status).toBe(200);
    expect(r.body.data).toMatchObject({ status: 'draft', releasedBatchIds: [] });
    expect(r.body.data.sprints[1].days[0].tasks[0].questions.length).toBeGreaterThan(0);
    expect((await call('admin', 'post', '/admin/starters/clinic-appointment-system/install')).status).toBe(409);
    expect((await call('admin', 'get', '/admin/starters')).body.data[0].added).toBe(true);
    // A draft is invisible to students.
    expect((await call('bala', 'get', '/me')).body.data.catalog).toHaveLength(0);
  });

  it('students cannot add starters', async () => {
    expect((await call('asha', 'post', '/admin/starters/clinic-appointment-system/install')).status).toBe(403);
  });
});
