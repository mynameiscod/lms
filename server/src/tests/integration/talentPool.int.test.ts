/**
 * Talent Pool Sharing, through the real login middleware and the real routes.
 *
 * What must never break: a placement office login reaches the Talent Portal and nothing else, and
 * one office can never see or change another office's candidates.
 */
import express from 'express';
import mongoose from 'mongoose';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import * as XLSX from 'xlsx';
import { startMongo, stopMongo } from './mongoHarness';

jest.setTimeout(240_000);
// Sending the invite is not under test: the mail server is "down", so the setup link comes back.
jest.mock('../../services/emailService', () => ({ EmailService: class { async sendGenericEmail() { throw new Error('mail down'); } } }));
process.env.JWT_SECRET = process.env.JWT_SECRET || 'talent-pool-integration-test-secret-0123456789abcdef';

import User from '../../models/User';
import Tenant from '../../models/Tenant';
import StudentProfile from '../../models/StudentProfile';
import { TalentPartner, TalentShare } from '../../models/TalentPool';
import userRoutes from '../../routes/userRoutes';
import placementDeskRoutes from '../../routes/placementDeskRoutes';
import talentPoolRoutes from '../../routes/talentPoolRoutes';
import talentPortalRoutes from '../../routes/talentPortalRoutes';

const app = express();
app.use(express.json());
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/placement-desk', placementDeskRoutes);
app.use('/api/v1/talent-pool', talentPoolRoutes);
app.use('/api/v1/talent-portal', talentPortalRoutes);

let tenantId = '';
const tokens: Record<string, string> = {};
const ids: Record<string, string> = {};
const sign = (u: any) => jwt.sign({ id: String(u._id), email: u.email, role: u.role, tenantId }, process.env.JWT_SECRET as string);
const call = (method: string, path: string, who: string, body: any = {}) =>
  (request(app) as any)[method](`/api/v1${path}`).set('Authorization', `Bearer ${tokens[who]}`).set('X-Tenant-Id', tenantId).send(body);

beforeAll(async () => {
  await startMongo();
  const t = await Tenant.create({ name: 'TP', slug: 'tp', domain: 'tp.test', isActive: true, adminId: new mongoose.Types.ObjectId() } as any);
  tenantId = String(t._id);
  const mk = async (who: string, role: string) => {
    const u: any = await User.create({ tenantId: t._id, firstName: who, lastName: 'T', email: `${who}@tp.test`, password: 'x', role, isActive: true });
    ids[who] = String(u._id); tokens[who] = sign(u);
    return u;
  };
  await mk('admin', 'TENANT_ADMIN');
  await mk('student', 'STUDENT');
  await mk('ravi', 'STUDENT');
  await mk('sita', 'STUDENT');
  await StudentProfile.create({
    userId: ids.ravi, tenantId: t._id,
    personalInfo: { firstName: 'Ravi', surname: 'Kumar', email: 'ravi@tp.test', mobileNumber: '9876543210', country: 'India', state: 'TS', city: 'Hyderabad', gender: 'Male', dateOfBirth: new Date('2002-01-01') },
    professionalProfiles: { resumeUrl: '/uploads/profiles/ravi.pdf', githubUrl: 'https://github.com/ravi' },
    education: { tenthClass: { percentage: 88, yearOfPassing: 2017 }, intermediate: { percentage: 91, yearOfPassing: 2019 }, degree: { name: 'B.Tech', percentage: 72, graduationYear: 2023 } },
    technicalBackground: { programmingLanguages: ['Java'], technologies: ['React'], experienceLevel: 'Beginner', previousCourses: [] },
    courseInterest: { interestedCourse: 'Java Full Stack', preferredLearningMode: 'Online', preferredBatchTime: 'Morning' },
    placementPreferences: { expectedRole: 'Java Developer', preferredLocations: ['Hyderabad'] },
  } as any);

  // Two offices, created and given logins through the admin API.
  for (const name of ['alpha', 'beta']) {
    const p = await call('post', '/talent-pool/partners', 'admin', { name: `Office ${name}`, contactName: `${name} HR`, email: `${name}@office.test` });
    expect(p.status).toBe(200);
    ids[`p_${name}`] = p.body.data._id;
    const l = await call('post', `/talent-pool/partners/${p.body.data._id}/login`, 'admin');
    expect(l.status).toBe(200);
    expect(l.body.data.setupLink).toContain('/setup-password?token=');
    const u: any = await User.findOne({ email: `${name}@office.test` }).lean();
    expect(u.role).toBe('PLACEMENT_PARTNER');
    expect(u.customRoleId || null).toBeNull();
    tokens[name] = sign(u); ids[name] = String(u._id);
  }
  // Ravi → alpha and beta; Sita → beta only.
  expect((await call('post', '/talent-pool/shares', 'admin', { partnerId: ids.p_alpha, students: [ids.ravi] })).body.data).toEqual({ added: 1, alreadyShared: 0 });
  expect((await call('post', '/talent-pool/shares', 'admin', { partnerId: ids.p_beta, students: [ids.ravi, ids.sita] })).body.data).toEqual({ added: 2, alreadyShared: 0 });
});
afterAll(stopMongo);

describe('an office login reaches the Talent Portal only', () => {
  it.each([
    ['get', '/users'],
    ['get', `/users/${'0'.repeat(24)}`],
    ['get', '/placement-desk/drives'],
    ['get', '/talent-pool/partners'],
    ['get', '/talent-pool/candidates'],
    ['post', '/talent-pool/shares'],
  ])('%s %s → 403', async (method, path) => {
    const r = await call(method, path, 'alpha');
    expect(r.status).toBe(403);
    expect(r.body.code).toBe('PARTNER_SCOPE');
  });

  it('may still read its own account and its (empty) permissions', async () => {
    expect((await call('get', `/users/${ids.alpha}`, 'alpha')).status).not.toBe(403);
    const p = await call('get', '/users/me/permissions', 'alpha');
    expect(p.status).toBe(200);
    expect(p.body.data.permissions).toEqual([]);
  });

  it('students and staff cannot open the portal or the admin API', async () => {
    expect((await call('get', '/talent-portal/candidates', 'admin')).status).toBe(403);
    expect((await call('get', '/talent-pool/partners', 'student')).status).toBe(403);
  });
});

describe('offices are isolated from each other', () => {
  it('each office lists only its own candidates', async () => {
    const a = await call('get', '/talent-portal/candidates', 'alpha');
    const b = await call('get', '/talent-portal/candidates', 'beta');
    expect(a.body.data.map((r: any) => r.candidateId)).toEqual([ids.ravi]);
    expect(b.body.data.map((r: any) => r.candidateId).sort()).toEqual([ids.ravi, ids.sita].sort());
    // Full details upfront, no admin-only fields.
    const ravi = a.body.data[0];
    expect(ravi).toMatchObject({ fullName: 'Ravi Kumar', phone: '9876543210', tenthPercent: 88, twelfthPercent: 91, graduationPercent: 72, expectedRole: 'Java Developer' });
    expect(ravi.batchName).toBeUndefined();
    expect(ravi.missing).toBeUndefined();
    expect(ravi.partnerId).toBeUndefined();
  });

  it("an office cannot open or change another office's share", async () => {
    const betaShare: any = await TalentShare.findOne({ partnerId: ids.p_beta, studentId: ids.sita }).lean();
    expect((await call('get', `/talent-portal/candidates/${betaShare._id}`, 'alpha')).status).toBe(404);
    expect((await call('patch', `/talent-portal/candidates/${betaShare._id}/status`, 'alpha', { status: 'rejected' })).status).toBe(404);
    const after: any = await TalentShare.findById(betaShare._id).lean();
    expect(after.status).toBe('shared');
  });

  it("one office's status never moves another's for the same student", async () => {
    const alphaShare: any = await TalentShare.findOne({ partnerId: ids.p_alpha, studentId: ids.ravi }).lean();
    const r = await call('patch', `/talent-portal/candidates/${alphaShare._id}/status`, 'alpha', { status: 'shortlisted', note: 'Good Java' });
    expect(r.status).toBe(200);
    const betaRavi: any = await TalentShare.findOne({ partnerId: ids.p_beta, studentId: ids.ravi }).lean();
    expect(betaRavi.status).toBe('shared');
  });
});

describe('statuses', () => {
  it('opening a new candidate marks it viewed; the office cannot set system statuses', async () => {
    const s: any = await TalentShare.findOne({ partnerId: ids.p_beta, studentId: ids.sita }).lean();
    const open = await call('get', `/talent-portal/candidates/${s._id}`, 'beta');
    expect(open.status).toBe(200);
    expect(open.body.data.status).toBe('viewed');
    expect((await call('patch', `/talent-portal/candidates/${s._id}/status`, 'beta', { status: 'shared' })).status).toBe(400);
  });

  it('the admin can override, and the tracker shows every office per candidate', async () => {
    const s: any = await TalentShare.findOne({ partnerId: ids.p_alpha, studentId: ids.ravi }).lean();
    expect((await call('patch', `/talent-pool/shares/${s._id}/status`, 'admin', { status: 'selected' })).status).toBe(200);
    const t = await call('get', '/talent-pool/tracker?status=selected', 'admin');
    const ravi = t.body.data.find((r: any) => r.candidateId === ids.ravi);
    expect(ravi.shares.map((x: any) => `${x.partnerName}:${x.status}`).sort()).toEqual(['Office alpha:selected', 'Office beta:shared']);
  });

  it('sharing the same student twice does not duplicate', async () => {
    expect((await call('post', '/talent-pool/shares', 'admin', { partnerId: ids.p_alpha, students: [ids.ravi] })).body.data).toEqual({ added: 0, alreadyShared: 1 });
  });
});

describe('Excel', () => {
  it("downloads in the office's own column names and order", async () => {
    await call('patch', `/talent-pool/partners/${ids.p_alpha}`, 'admin', {
      name: 'Office alpha', email: 'alpha@office.test',
      exportColumns: [{ field: 'fullName', label: 'Candidate Name' }, { field: 'tenthPercent', label: 'SSC %' }, { field: 'status', label: 'Stage' }],
    });
    const r = await (request(app) as any).get('/api/v1/talent-portal/export').set('Authorization', `Bearer ${tokens.alpha}`)
      .buffer(true).parse((res: any, cb: any) => { const d: Buffer[] = []; res.on('data', (c: Buffer) => d.push(c)); res.on('end', () => cb(null, Buffer.concat(d))); });
    expect(r.status).toBe(200);
    const wb = XLSX.read(r.body, { type: 'buffer' });
    const rows: any[][] = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1 });
    expect(rows[0]).toEqual(['Candidate Name', 'SSC %', 'Stage']);
    expect(rows[1]).toEqual(['Ravi Kumar', 88, 'Selected']);
  });

  it('imports outside candidates from any header style, without duplicates', async () => {
    const ws = XLSX.utils.aoa_to_sheet([
      ['Candidate Name', 'Mobile No', 'SSC %', 'Inter %', 'CGPA', 'YOP'],
      ['Anil', '+91 93915 90611', '85', '90%', '8', '2025'],
      ['Anil again', '9391590611', '86', '', '', ''],
      ['No contact', '', '70', '', '', ''],
    ]);
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'S');
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    const r = await (request(app) as any).post('/api/v1/talent-pool/external/import').set('Authorization', `Bearer ${tokens.admin}`).set('X-Tenant-Id', tenantId)
      .attach('file', buf, 'c.xlsx');
    expect(r.status).toBe(200);
    expect(r.body.data).toMatchObject({ created: 1, updated: 1, skipped: 1 });
    const list = await call('get', '/talent-pool/candidates?kind=external', 'admin');
    expect(list.body.data).toHaveLength(1);
    expect(list.body.data[0]).toMatchObject({ fullName: 'Anil again', phone: '9391590611', tenthPercent: 86, twelfthPercent: 90, graduationPercent: 76, graduationYear: 2025 });
  });
});

describe('switching an office off', () => {
  it('locks its login out on the next request', async () => {
    expect((await call('patch', `/talent-pool/partners/${ids.p_beta}/active`, 'admin', { active: false })).status).toBe(200);
    expect((await call('get', '/talent-portal/candidates', 'beta')).status).toBe(401);
    const p: any = await TalentPartner.findById(ids.p_beta).lean();
    expect(p.active).toBe(false);
  });
});

describe("the office's own workspace (companies, openings, submissions)", () => {
  let companyId = ''; let openingId = ''; let subId = '';
  beforeAll(async () => {
    expect((await call('patch', `/talent-pool/partners/${ids.p_beta}/active`, 'admin', { active: true })).status).toBe(200);
  });
  it('an office adds a company, a follow-up and an opening', async () => {
    const c = await call('post', '/talent-portal/companies', 'beta', { name: 'Acme Tech', contactName: 'Priya', contactEmail: 'PRIYA@acme.test', website: 'acme.test' });
    expect(c.status).toBe(200);
    expect(c.body.data).toMatchObject({ contactEmail: 'priya@acme.test', website: 'https://acme.test', stage: 'prospect' });
    companyId = c.body.data._id;
    const f = await call('post', `/talent-portal/companies/${companyId}/followups`, 'beta', { dueAt: '2020-01-01', note: 'Call Priya' });
    expect(f.body.data.nextFollowUpAt).toBeTruthy();
    expect((await call('post', '/talent-portal/openings', 'beta', { companyId, title: 'Java Dev', expMin: 3, expMax: 1 })).status).toBe(400);
    const o = await call('post', '/talent-portal/openings', 'beta', { companyId, title: 'Java Dev', positions: 5, salaryMin: 3.5, salaryMax: 6, bond: '1 year', interviewProcess: 'Test, Tech, HR' });
    expect(o.status).toBe(200);
    openingId = o.body.data._id;
    const list = await call('get', '/talent-portal/companies', 'beta');
    expect(list.body.data[0]).toMatchObject({ name: 'Acme Tech', stage: 'active', stats: { openings: 1, positions: 5 } });
    const due = await call('get', '/talent-portal/dashboard', 'beta');
    expect(due.body.data.followUpsDueCount).toBe(1);
    expect(due.body.data.followUpsDue[0].overdue).toBe(true);
  });

  it('sends shared candidates to the opening once, and their status moves forward', async () => {
    const sita: any = await TalentShare.findOne({ partnerId: ids.p_beta, studentId: ids.sita }).lean();
    const alphaRavi: any = await TalentShare.findOne({ partnerId: ids.p_alpha, studentId: ids.ravi }).lean();
    const r = await call('post', '/talent-portal/submissions', 'beta', { companyId, openingId, shareIds: [String(sita._id), String(alphaRavi._id)] });
    expect(r.body.data).toEqual({ added: 1, alreadySent: 0, skipped: 1 }); // another office's share is skipped
    expect((await call('post', '/talent-portal/submissions', 'beta', { companyId, openingId, shareIds: [String(sita._id)] })).body.data.added).toBe(0);
    const subs = await call('get', `/talent-portal/submissions?companyId=${companyId}`, 'beta');
    expect(subs.body.data).toHaveLength(1);
    subId = subs.body.data[0]._id;
    expect(subs.body.data[0]).toMatchObject({ fullName: expect.any(String), openingTitle: 'Java Dev', status: 'sent' });
    const up = await call('patch', `/talent-portal/submissions/${subId}/status`, 'beta', { status: 'interview', interviewAt: '2030-01-02T10:00:00Z', note: 'Round 1' });
    expect(up.status).toBe(200);
    const after: any = await TalentShare.findById(sita._id).lean();
    expect(after.status).toBe('interview');
    const open = await call('get', `/talent-portal/candidates/${sita._id}`, 'beta');
    expect(open.body.data.submissions[0]).toMatchObject({ companyName: 'Acme Tech', status: 'interview' });
  });

  it("another office cannot see or touch this office's companies", async () => {
    expect((await call('get', '/talent-portal/companies', 'alpha')).body.data).toEqual([]);
    expect((await call('get', `/talent-portal/companies/${companyId}`, 'alpha')).status).toBe(404);
    expect((await call('patch', `/talent-portal/companies/${companyId}`, 'alpha', { name: 'Hacked' })).status).toBe(404);
    expect((await call('patch', `/talent-portal/submissions/${subId}/status`, 'alpha', { status: 'rejected' })).status).toBe(404);
    expect((await call('post', '/talent-portal/openings', 'alpha', { companyId, title: 'x' })).status).toBe(400);
    expect((await call('get', '/talent-portal/submissions', 'alpha')).body.data).toEqual([]);
  });

  it('the company Excel lists the candidates sent with their company status', async () => {
    const r = await (request(app) as any).get(`/api/v1/talent-portal/companies/${companyId}/export`).set('Authorization', `Bearer ${tokens.beta}`).buffer(true).parse((res: any, cb: any) => { const b: any[] = []; res.on('data', (x: any) => b.push(x)); res.on('end', () => cb(null, Buffer.concat(b))); });
    expect(r.status).toBe(200);
    const rows: any[] = XLSX.utils.sheet_to_json(XLSX.read(r.body).Sheets[XLSX.read(r.body).SheetNames[0]]);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ Position: 'Java Dev', Status: 'Interview', Remarks: 'Round 1' });
  });

  it('the admin can watch the workspace but has no way to edit it', async () => {
    const w = await call('get', `/talent-pool/partners/${ids.p_beta}/workspace`, 'admin');
    expect(w.status).toBe(200);
    expect(w.body.data.companies.map((c: any) => c.name)).toEqual(['Acme Tech']);
    expect(w.body.data.submissions[0]).toMatchObject({ companyName: 'Acme Tech', status: 'interview' });
    expect((await call('get', '/talent-portal/companies', 'admin')).status).toBe(403);
    const list = await call('get', '/talent-pool/partners', 'admin');
    expect(list.body.data.find((p: any) => p._id === ids.p_beta).desk).toEqual({ companies: 1, openOpenings: 1, submissions: 1, placed: 0 });
    expect((await call('get', `/talent-pool/partners/${ids.p_beta}/workspace`, 'beta')).status).toBe(403);
  });

  it('deleting a company removes its openings and submissions', async () => {
    expect((await call('delete', `/talent-portal/companies/${companyId}`, 'beta')).status).toBe(200);
    expect((await call('get', '/talent-portal/openings', 'beta')).body.data).toEqual([]);
    expect((await call('get', '/talent-portal/submissions', 'beta')).body.data).toEqual([]);
  });
});
