/**
 * The Student Features switches: LMS students and CareerPilot students. Real database and the
 * real routes. Also guards against the server's list of keys and the admin page's list drifting
 * apart, which is how menu items ended up with no switch at all.
 */
import fs from 'fs';
import path from 'path';
import express from 'express';
import mongoose from 'mongoose';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { startMongo, stopMongo } from './mongoHarness';

jest.setTimeout(180_000);
process.env.JWT_SECRET = process.env.JWT_SECRET || 'student-features-integration-test-secret-0123456789abcdef';

import User from '../../models/User';
import Tenant from '../../models/Tenant';
import tenantRoutes from '../../routes/tenantRoutes';
import { STUDENT_FEATURE_KEYS, CAREERPILOT_FEATURE_KEYS } from '../../data/studentFeatureKeys';
import { STUDENT_FEATURE_KEYS as BATCH_KEYS } from '../../controllers/batchController';
import { hiddenCareerPilotFeatures } from '../../services/careerPilotFeatureService';

const app = express();
app.use(express.json());
app.use('/tenants', tenantRoutes);

let tenantId = ''; let otherTenantId = '';
const tokens: Record<string, string> = {};

beforeAll(async () => {
  await startMongo();
  const t: any = await Tenant.create({ name: 'Feat', slug: 'feat', domain: 'feat.test', isActive: true, adminId: new mongoose.Types.ObjectId() } as any);
  const o: any = await Tenant.create({ name: 'Other', slug: 'other', domain: 'other.test', isActive: true, adminId: new mongoose.Types.ObjectId() } as any);
  tenantId = String(t._id); otherTenantId = String(o._id);
  const mk = async (who: string, role: string) => {
    const u: any = await User.create({ tenantId: t._id, firstName: who, lastName: 'T', email: `${who}@feat.test`, password: 'x', role, isActive: true });
    tokens[who] = jwt.sign({ id: String(u._id), email: u.email, role, tenantId }, process.env.JWT_SECRET as string);
  };
  await mk('admin', 'TENANT_ADMIN'); await mk('student', 'STUDENT'); await mk('instructor', 'INSTRUCTOR');
});
afterAll(stopMongo);

const call = (method: string, p: string, who: string, body: any = {}) =>
  (request(app) as any)[method](p).set('Authorization', `Bearer ${tokens[who]}`).set('X-Tenant-Id', tenantId).send(body);

describe('the key lists', () => {
  const catalogue = fs.readFileSync(path.join(__dirname, '../../../../client/src/config/studentFeatureCatalog.ts'), 'utf-8');
  const section = (from: string, to?: string) => { const a = catalogue.indexOf(from); const b = to ? catalogue.indexOf(to, a) : catalogue.length; return catalogue.slice(a, b); };
  const keysIn = (text: string) => [...text.matchAll(/\{ key: '(\w+)'/g)].map((m) => m[1]);

  it('are the same on the server and on the admin page, for LMS students', () => {
    const page = keysIn(section('export const FEATURE_META', 'export const STUDENT_FEATURE_KEYS'));
    expect([...page].sort()).toEqual([...STUDENT_FEATURE_KEYS].sort());
    expect([...BATCH_KEYS].sort()).toEqual([...STUDENT_FEATURE_KEYS].sort());
  });

  it('are the same on the server and on the admin page, for CareerPilot students', () => {
    const page = keysIn(section('export const CAREERPILOT_FEATURE_META'));
    expect([...page].sort()).toEqual([...CAREERPILOT_FEATURE_KEYS].sort());
  });

  it('give every student menu item a switch (the ones that used to have none are covered)', () => {
    for (const k of ['myTasks', 'applyLeave', 'interviewExperiences', 'questionBooks', 'drives', 'myPractice', 'codingPractice', 'codeVisualizer']) expect(STUDENT_FEATURE_KEYS).toContain(k);
    const sidebar = fs.readFileSync(path.join(__dirname, '../../../../client/src/components/layout/Sidebar.tsx'), 'utf-8');
    // Every student-only menu item names its switch.
    const missing = sidebar.split('\n').filter((l) => /roles: \['STUDENT'\]/.test(l) && /label: '/.test(l) && !/featureKey:/.test(l)).map((l) => (l.match(/label: '([^']+)'/) || [])[1]);
    expect(missing).toEqual(['Notifications'].filter((n) => missing.includes(n)));
  });
});

describe('LMS students', () => {
  it('read every switch, on by default', async () => {
    const r = await call('get', `/tenants/${tenantId}/student-features`, 'student');
    expect(r.status).toBe(200);
    for (const k of STUDENT_FEATURE_KEYS) expect([k, r.body.data[k]]).toEqual([k, true]);
  });

  it('can be switched off by an admin, including the menu items that had no switch', async () => {
    const r = await call('patch', `/tenants/${tenantId}/student-features`, 'admin', { myTasks: false, drives: false, interviewExperiences: false, quizzes: false, notAKey: false });
    expect(r.status).toBe(200);
    expect(r.body.data).toMatchObject({ myTasks: false, drives: false, interviewExperiences: false, quizzes: false, assignments: true });
    expect(r.body.data.notAKey).toBeUndefined();
    const again = await call('get', `/tenants/${tenantId}/student-features`, 'student');
    expect(again.body.data.myTasks).toBe(false);
  });

  it('cannot be changed by a student or an instructor, or in another institute', async () => {
    expect((await call('patch', `/tenants/${tenantId}/student-features`, 'student', { drives: true })).status).toBe(403);
    expect((await call('patch', `/tenants/${tenantId}/student-features`, 'instructor', { drives: true })).status).toBe(403);
    expect((await call('patch', `/tenants/${otherTenantId}/student-features`, 'admin', { drives: true })).status).toBeGreaterThanOrEqual(403);
  });
});

describe('CareerPilot students', () => {
  it('start with every menu item on', async () => {
    const r = await call('get', `/tenants/${tenantId}/career-pilot-features`, 'student');
    expect(r.status).toBe(200);
    for (const k of CAREERPILOT_FEATURE_KEYS) expect([k, r.body.data[k]]).toEqual([k, true]);
    expect(await hiddenCareerPilotFeatures(tenantId)).toEqual([]);
  });

  it('can have items hidden by an admin, and the dashboard list follows', async () => {
    const r = await call('patch', `/tenants/${tenantId}/career-pilot-features`, 'admin', { coding: false, news: false, practice: true, bogus: false });
    expect(r.status).toBe(200);
    expect(r.body.data).toMatchObject({ coding: false, news: false, practice: true, roadmap: true });
    expect(r.body.data.bogus).toBeUndefined();
    expect(await hiddenCareerPilotFeatures(tenantId)).toEqual(['coding', 'news']);
    // Switching one back on shows it again.
    await call('patch', `/tenants/${tenantId}/career-pilot-features`, 'admin', { news: true });
    expect(await hiddenCareerPilotFeatures(tenantId)).toEqual(['coding']);
  });

  it('can switch the coming-soon Aptitude and Reasoning items off and on', async () => {
    const r = await call('patch', `/tenants/${tenantId}/career-pilot-features`, 'admin', { aptitude: false, reasoning: false });
    expect(r.status).toBe(200);
    expect(r.body.data).toMatchObject({ aptitude: false, reasoning: false, thinkingLab: true });
    expect(await hiddenCareerPilotFeatures(tenantId)).toEqual(expect.arrayContaining(['aptitude', 'reasoning']));
    await call('patch', `/tenants/${tenantId}/career-pilot-features`, 'admin', { aptitude: true, reasoning: true });
    const back = await call('get', `/tenants/${tenantId}/career-pilot-features`, 'student');
    expect(back.body.data).toMatchObject({ aptitude: true, reasoning: true });
  });

  it('cannot be changed by a student, and one institute never sees the other’s switches', async () => {
    expect((await call('patch', `/tenants/${tenantId}/career-pilot-features`, 'student', { coding: true })).status).toBe(403);
    expect(await hiddenCareerPilotFeatures(otherTenantId)).toEqual([]);
    expect((await call('get', `/tenants/${otherTenantId}/career-pilot-features`, 'admin')).status).toBeGreaterThanOrEqual(403);
  });

  it('ignores values that are not true or false', async () => {
    const r = await call('patch', `/tenants/${tenantId}/career-pilot-features`, 'admin', { coding: 'no', mentor: 0 });
    expect(r.status).toBe(200);
    expect(r.body.data.coding).toBe(false); // unchanged from before
    expect(r.body.data.mentor).toBe(true);
  });
});
