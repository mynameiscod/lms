/**
 * Admin endpoints are for the people who manage the feature — not for every logged-in user.
 *
 * Each of these used to check only that somebody was logged in, so a student or a CareerPilot
 * member of the institute could change hackathon scores, enrol themselves in any course, edit
 * curricula or read other students' career profiles. The real login and permission middleware
 * run here against a real database; only the handlers behind a passed guard are stubbed, because
 * what is under test is who reaches them.
 */
import express from 'express';
import mongoose from 'mongoose';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { startMongo, stopMongo, clearCollections } from './mongoHarness';

jest.setTimeout(240_000);
process.env.JWT_SECRET = process.env.JWT_SECRET || 'admin-route-guards-integration-test-secret-0123456789abcdef';

import User from '../../models/User';
import Role from '../../models/Role';
import Tenant from '../../models/Tenant';

/** Every guarded router, mounted the way routes/index.ts mounts it. Handlers answer 299 once reached. */
const REACHED = 299;
const stubControllers = (path: string) => {
  const real = jest.requireActual(path);
  const stub: any = { __esModule: true };
  for (const k of Object.keys(real)) stub[k] = typeof real[k] === 'function' ? (_req: any, res: any) => res.status(REACHED).json({ reached: true }) : real[k];
  if (real.default && typeof real.default === 'object') {
    stub.default = Object.fromEntries(Object.keys(real.default).map((k) => [k, (_req: any, res: any) => res.status(REACHED).json({ reached: true })]));
  }
  return stub;
};
jest.mock('../../controllers/publicQuizController', () => stubControllers('../../controllers/publicQuizController'));
jest.mock('../../controllers/aiCallConfigController', () => stubControllers('../../controllers/aiCallConfigController'));
jest.mock('../../controllers/assessmentCandidatesController', () => stubControllers('../../controllers/assessmentCandidatesController'));
jest.mock('../../controllers/assessmentItemController', () => stubControllers('../../controllers/assessmentItemController'));
jest.mock('../../controllers/assessmentScheduleController', () => stubControllers('../../controllers/assessmentScheduleController'));
jest.mock('../../controllers/batchOfferingController', () => stubControllers('../../controllers/batchOfferingController'));
jest.mock('../../controllers/curriculumController', () => stubControllers('../../controllers/curriculumController'));
jest.mock('../../controllers/conceptLessonController', () => stubControllers('../../controllers/conceptLessonController'));
jest.mock('../../controllers/interactiveLessonController', () => stubControllers('../../controllers/interactiveLessonController'));
jest.mock('../../controllers/enrollmentPlanController', () => stubControllers('../../controllers/enrollmentPlanController'));
jest.mock('../../controllers/learningExperienceController', () => stubControllers('../../controllers/learningExperienceController'));
jest.mock('../../controllers/careerProfileController', () => stubControllers('../../controllers/careerProfileController'));
jest.mock('../../controllers/concernController', () => stubControllers('../../controllers/concernController'));
jest.mock('../../controllers/whatsAppDripConfigController', () => stubControllers('../../controllers/whatsAppDripConfigController'));
jest.mock('../../controllers/salesCallRecordingController', () => stubControllers('../../controllers/salesCallRecordingController'));
jest.mock('../../controllers/hackathonExamAdminController', () => stubControllers('../../controllers/hackathonExamAdminController'));
jest.mock('../../controllers/dashboardController', () => stubControllers('../../controllers/dashboardController'));

import adminPublicQuizRoutes from '../../routes/adminPublicQuizRoutes';
import aiCallRoutes from '../../routes/aiCallRoutes';
import assessmentCandidatesRoutes from '../../routes/assessmentCandidatesRoutes';
import assessmentItemRoutes from '../../routes/assessmentItemRoutes';
import assessmentScheduleRoutes from '../../routes/assessmentScheduleRoutes';
import batchOfferingRoutes from '../../routes/batchOfferingRoutes';
import curriculumRoutes from '../../routes/curriculumRoutes';
import conceptLessonRoutes from '../../routes/conceptLessonRoutes';
import interactiveLessonRoutes from '../../routes/interactiveLessonRoutes';
import enrollmentPlanRoutes from '../../routes/enrollmentPlanRoutes';
import careerProfileRoutes from '../../routes/careerProfileRoutes';
import concernRoutes from '../../routes/concernRoutes';
import whatsappDripConfigRoutes from '../../routes/whatsappDripConfigRoutes';
import salesCallRecordingRoutes from '../../routes/salesCallRecordingRoutes';
import hackathonExamRoutes from '../../routes/hackathonExamRoutes';
import dashboardRoutes from '../../routes/dashboardRoutes';

const app = express();
app.use(express.json());
app.use('/public-quizzes', adminPublicQuizRoutes);
app.use('/ai-calls', aiCallRoutes);
app.use('/assessment-candidates', assessmentCandidatesRoutes);
app.use('/assessment-items', assessmentItemRoutes);
app.use('/assessment-schedules', assessmentScheduleRoutes);
app.use('/batch-offerings', batchOfferingRoutes);
app.use('/curricula', curriculumRoutes);
app.use('/concept-lessons', conceptLessonRoutes);
app.use('/interactive-lessons', interactiveLessonRoutes);
app.use('/enrollment-plans', enrollmentPlanRoutes);
app.use('/career-profile', careerProfileRoutes);
app.use('/concerns', concernRoutes);
app.use('/whatsapp-drip-config', whatsappDripConfigRoutes);
app.use('/sales-call-recordings', salesCallRecordingRoutes);
app.use('/hackathon-exams', hackathonExamRoutes);
app.use('/dashboard', dashboardRoutes);

const ID = '507f1f77bcf86cd799439011';
type Who = 'student' | 'instructor' | 'admin' | 'staff' | 'custom';
const tokens: Record<Who, string> = {} as any;
let tenantId = '';

/** [method, path, who must be let in]. Everyone NOT listed must get 403 — students above all. */
const CASES: [string, string, Who[]][] = [
  ['get', '/public-quizzes/all-registrations', ['instructor', 'admin']],
  ['post', '/public-quizzes/send-quiz-links', ['instructor', 'admin']],
  ['put', '/ai-calls/config', ['admin']],
  ['post', `/ai-calls/trigger/${ID}`, ['admin']],
  ['get', '/assessment-candidates', ['instructor', 'admin']],
  ['post', '/assessment-items/generate', ['instructor', 'admin']],
  ['delete', `/assessment-items/${ID}`, ['instructor', 'admin']],
  ['get', '/assessment-schedules', ['instructor', 'admin']],
  ['post', '/batch-offerings', ['instructor', 'admin', 'staff', 'custom']],
  ['put', `/curricula/${ID}`, ['instructor', 'admin', 'staff', 'custom']],
  ['post', `/curricula/${ID}/share`, ['instructor', 'admin', 'staff', 'custom']],
  ['put', `/concept-lessons/by-content/${ID}`, ['instructor', 'admin', 'staff', 'custom']],
  ['post', '/interactive-lessons/generate-ai', ['instructor', 'admin', 'staff', 'custom']],
  ['get', `/interactive-lessons/${ID}/progress-admin`, ['instructor', 'admin', 'staff', 'custom']],
  ['post', '/enrollment-plans/student', ['instructor', 'admin', 'staff', 'custom']],
  ['get', '/enrollment-plans', ['instructor', 'admin', 'staff', 'custom']],
  ['patch', `/enrollment-plans/${ID}/status`, ['instructor', 'admin', 'staff', 'custom']],
  ['get', '/career-profile', ['instructor', 'admin', 'staff']],
  ['patch', `/career-profile/${ID}/review`, ['instructor', 'admin', 'staff']],
  ['get', '/concerns', ['instructor', 'admin', 'staff']],
  ['put', '/whatsapp-drip-config', ['admin']],
  ['delete', `/sales-call-recordings/${ID}`, ['admin', 'staff']],
  ['post', `/hackathon-exams/${ID}/attempts/${ID}/score`, ['admin']],
  ['get', `/hackathon-exams/${ID}/attempts/${ID}/recording/1`, ['admin']],
  ['get', '/dashboard/admin-overview', ['admin']],
];

/** What a student keeps: their own things. */
const STUDENT_OWN: [string, string][] = [
  ['get', '/enrollment-plans/my'],
  ['get', `/enrollment-plans/${ID}/day/1`],
  ['get', '/career-profile/my'],
  ['post', '/concerns'],
  ['get', '/concerns/my'],
  ['get', `/concept-lessons/by-content/${ID}`],
  ['get', `/interactive-lessons/${ID}`],
];

beforeAll(async () => {
  await startMongo();
  await clearCollections();
  const t = await Tenant.create({ name: 'Guards', slug: 'guards', domain: 'guards.test', isActive: true, adminId: new mongoose.Types.ObjectId() } as any);
  tenantId = String(t._id);
  // A custom role ticked for learning plans only — the "Institute Admin" case.
  const custom = await Role.create({ name: 'Institute Admin', permissions: ['manage_learning_plans', 'manage_live_classes'], tenantId: t._id } as any);
  const mk = async (who: Who, role: string, extra: any = {}) => {
    const u = await User.create({ tenantId: t._id, firstName: who, lastName: 'T', email: `${who}@guards.test`, password: 'x', role, isActive: true, ...extra } as any);
    tokens[who] = jwt.sign({ id: String(u._id), email: u.email, role, tenantId }, process.env.JWT_SECRET as string);
  };
  await mk('student', 'STUDENT');
  await mk('instructor', 'INSTRUCTOR');
  await mk('admin', 'TENANT_ADMIN');
  await mk('staff', 'STAFF');
  await mk('custom', 'STAFF', { customRoleId: custom._id });
});
afterAll(stopMongo);

const call = (method: string, path: string, who: Who) =>
  (request(app) as any)[method](path).set('Authorization', `Bearer ${tokens[who]}`).set('X-Tenant-Id', tenantId).send({});

describe('admin endpoints refuse anyone without the permission', () => {
  it.each(CASES)('%s %s', async (method, path, allowed) => {
    for (const who of ['student', 'instructor', 'admin', 'staff', 'custom'] as Who[]) {
      const r = await call(method, path, who);
      const want = allowed.includes(who) ? REACHED : 403;
      if (r.status !== want) throw new Error(`${who}: expected ${want}, got ${r.status} ${JSON.stringify(r.body).slice(0, 120)}`);
    }
  });
});

describe('students keep their own things', () => {
  it.each(STUDENT_OWN)('%s %s', async (method, path) => {
    const r = await call(method, path, 'student');
    expect(r.status).toBe(REACHED);
  });
});
