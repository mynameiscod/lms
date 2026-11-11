/**
 * Placement Desk over HTTP: the daily flow an admin runs, who may call what, and the public link.
 */
import express from 'express';
import mongoose from 'mongoose';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { startMongo, stopMongo, clearCollections } from './mongoHarness';

jest.setTimeout(180_000);
process.env.JWT_SECRET = process.env.JWT_SECRET || 'placement-desk-integration-test-secret-0123456789abcdef';

import User from '../../models/User';
import placementDeskRoutes from '../../routes/placementDeskRoutes';

const TENANT = new mongoose.Types.ObjectId();
const app = express();
app.use(express.json());
app.use('/api/v1/placement-desk', placementDeskRoutes);

const tokenFor = (u: any) => jwt.sign({ id: String(u._id), email: u.email, role: u.role, tenantId: String(TENANT) }, process.env.JWT_SECRET as string);
const as = (u: any) => {
  const t = tokenFor(u);
  const wrap = (r: request.Test) => r.set('Authorization', `Bearer ${t}`).set('X-Tenant-Id', String(TENANT));
  return {
    get: (p: string) => wrap(request(app).get(`/api/v1/placement-desk${p}`)),
    post: (p: string, b: any) => wrap(request(app).post(`/api/v1/placement-desk${p}`).send(b)),
    patch: (p: string, b: any) => wrap(request(app).patch(`/api/v1/placement-desk${p}`).send(b)),
  };
};

beforeAll(startMongo);
afterAll(stopMongo);
afterEach(clearCollections);

it('runs the daily flow and publishes a summary with no names or feedback', async () => {
  const admin = await User.create({ tenantId: TENANT, firstName: 'A', lastName: 'D', email: 'admin@x.com', password: 'x', role: 'TENANT_ADMIN', isActive: true } as any);
  const stu = await User.create({ tenantId: TENANT, firstName: 'Asha', lastName: 'K', email: 'asha@x.com', password: 'x', role: 'STUDENT', isActive: true } as any);
  const A = as(admin);

  const officer = (await A.post('/officers', { name: 'Ravi' })).body.data;
  const company = (await A.post('/companies', { name: 'Acme Tech', website: 'acme.com', address: 'Hyderabad', contacts: [{ name: 'HR Priya', phone: '999' }] })).body.data;
  expect((await A.post('/companies', { name: 'ACME tech' })).status).toBe(400); // duplicate name

  const today = new Date(Date.now() + 330 * 60_000).toISOString().slice(0, 10);
  const bad = await A.post('/drives', { companyId: company._id, day: today, role: 'Dev', packageMin: 8, packageMax: 4 });
  expect(bad.status).toBe(400);
  const drive = (await A.post('/drives', {
    companyId: company._id, day: today, role: 'Java Developer', packageMin: 3.5, packageMax: 6,
    bond: { required: true, months: 18, amount: 50000 }, conditions: 'Relocate to Pune', officerId: officer._id,
    eligibility: { passoutYears: '2024, 2025', degrees: 'B.Tech' }, companyContact: { name: 'HR Priya' },
  })).body.data;
  expect(drive).toMatchObject({ companyName: 'Acme Tech', officerName: 'Ravi', bond: { required: true, months: 18 } });
  expect(drive.eligibility.passoutYears).toEqual([2024, 2025]);

  const added = await A.post(`/drives/${drive._id}/candidates`, { studentIds: [String(stu._id)], externals: [{ name: 'Outside Ravi', phone: '888' }, { name: 'Outside Ravi again', phone: '888' }] });
  expect(added.body.data).toHaveLength(2); // same phone added once
  const again = await A.post(`/drives/${drive._id}/candidates`, { studentIds: [String(stu._id)] });
  expect(again.body.message).toMatch(/0 added/);

  const [mine, outside] = [added.body.data.find((c: any) => c.kind === 'student'), added.body.data.find((c: any) => c.kind === 'external')];
  await A.patch(`/candidates/${mine._id}`, { status: 'offered', offerCtc: 5, companyFeedback: 'Strong Java basics' });
  await A.patch(`/candidates/${outside._id}`, { status: 'rejected', companyFeedback: 'Weak SQL' });

  const rep = (await A.get(`/report?from=${today}&to=${today}`)).body.data;
  expect(rep.totals).toMatchObject({ companies: 1, attended: 2, offers: 1, rejected: 1 });

  const hist = (await A.get(`/students/${stu._id}/history`)).body.data;
  expect(hist.rows[0]).toMatchObject({ companyName: 'Acme Tech', status: 'offered', companyFeedback: 'Strong Java basics' });

  const xlsx = await A.get(`/report/export?from=${today}&to=${today}`);
  expect(xlsx.status).toBe(200);
  expect(xlsx.headers['content-type']).toMatch(/spreadsheetml/);

  // Public link: off until switched on, then counts only.
  const s = (await A.get('/settings')).body.data;
  expect((await request(app).get(`/api/v1/placement-desk/public/${s.publicToken}`)).status).toBe(404);
  await A.patch('/settings', { publicEnabled: true, publicTitle: 'Our placements' });
  const pub = await request(app).get(`/api/v1/placement-desk/public/${s.publicToken}?from=${today}&to=${today}`);
  expect(pub.status).toBe(200);
  expect(pub.body.data).toMatchObject({ title: 'Our placements', totals: { companies: 1, offers: 1 } });
  for (const secret of ['Asha', 'Outside', 'Strong Java', 'Weak SQL', 'Ravi', 'Priya', '999']) expect(JSON.stringify(pub.body)).not.toContain(secret);
});

it('keeps students out of every Placement Desk route', async () => {
  const stu = await User.create({ tenantId: TENANT, firstName: 'S', lastName: 'T', email: 's@x.com', password: 'x', role: 'STUDENT', isActive: true } as any);
  const S = as(stu);
  for (const p of ['/drives', '/companies', '/officers', '/report', `/students/${stu._id}/history`, '/settings']) {
    expect((await S.get(p)).status).toBe(403);
  }
  expect((await S.post('/officers', { name: 'x' })).status).toBe(403);
});
