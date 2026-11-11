/**
 * Placement Desk against a real database: the end-of-day numbers, the public summary's privacy,
 * the admin-only student history and eligibility matching.
 */
import mongoose from 'mongoose';
import { startMongo, stopMongo, clearCollections } from './mongoHarness';

jest.setTimeout(180_000);

import User from '../../models/User';
import StudentProfile from '../../models/StudentProfile';
import { PlacementDeskCompany, PlacementDeskDrive, PlacementDeskCandidate, PlacementDeskOfficer } from '../../models/PlacementDesk';
import { buildReport, publicSummary, studentHistory, eligibleStudents, reportWorkbook, istDateOf } from '../../services/placementDeskService';

const TENANT = new mongoose.Types.ObjectId();
const T = String(TENANT);

async function setup() {
  const officer = await PlacementDeskOfficer.create({ tenantId: TENANT, name: 'Ravi' });
  const acme = await PlacementDeskCompany.create({ tenantId: TENANT, name: 'Acme', nameKey: 'acme' });
  const beta = await PlacementDeskCompany.create({ tenantId: TENANT, name: 'Beta', nameKey: 'beta' });
  const drive = (company: any, day: string, extra: any = {}) => PlacementDeskDrive.create({
    tenantId: TENANT, companyId: company._id, companyName: company.name, day, date: istDateOf(day), role: 'Java Developer',
    officerId: officer._id, officerName: 'Ravi', packageMin: 3, packageMax: 6, ...extra,
  } as any);
  const d1 = await drive(acme, '2026-11-10');
  const d2 = await drive(beta, '2026-11-11');
  const d3 = await drive(acme, '2026-11-11', { status: 'cancelled' });
  const stu = await User.create({ tenantId: TENANT, firstName: 'Asha', lastName: 'K', email: 'asha@x.com', password: 'x', role: 'STUDENT', isActive: true } as any);
  const cand = (d: any, name: string, status: string, extra: any = {}) => PlacementDeskCandidate.create({
    tenantId: TENANT, driveId: d._id, companyId: d.companyId, day: d.day, kind: 'external', name, status, ...extra,
  } as any);
  await cand(d1, 'Asha K', 'offered', { kind: 'student', studentId: stu._id, offerCtc: 4.5, companyFeedback: 'Strong Java' });
  await cand(d1, 'Outside One', 'rejected', { companyFeedback: 'Weak SQL' });
  await cand(d1, 'Outside Two', 'no_show');
  await cand(d2, 'Asha K', 'in_process', { kind: 'student', studentId: stu._id });
  await cand(d2, 'Outside Three', 'eligible');
  return { stu, d1, d2, d3 };
}

beforeAll(startMongo);
afterAll(stopMongo);
afterEach(clearCollections);

it('counts companies, attendance, offers and rejections for the range', async () => {
  await setup();
  const r = await buildReport(T, '2026-11-01', '2026-11-30');
  expect(r.totals).toMatchObject({ companies: 2, drives: 2, cancelled: 1, total: 5, attended: 3, noShow: 1, offers: 1, rejected: 1, pending: 1, notMarked: 1, highestOffer: 4.5 });
  expect(r.byOfficer[0]).toMatchObject({ name: 'Ravi', drives: 2, companies: 2, offers: 1 });
  const acme = r.drives.find((d) => d.companyName === 'Acme' && d.status !== 'cancelled')!;
  expect(acme.feedback.map((f: any) => f.companyFeedback).sort()).toEqual(['', 'Strong Java', 'Weak SQL']);

  const oneDay = await buildReport(T, '2026-11-11', '2026-11-11');
  expect(oneDay.totals).toMatchObject({ companies: 1, drives: 1, attended: 1, offers: 0 });
});

it('publishes company-level numbers only — no names or feedback', async () => {
  await setup();
  const p = await publicSummary(T, '2026-11-01', '2026-11-30');
  expect(p.totals).toMatchObject({ companies: 2, attended: 3, offers: 1 });
  expect(p.drives).toHaveLength(2); // cancelled drive left out
  const text = JSON.stringify(p);
  for (const secret of ['Asha', 'Outside', 'Strong Java', 'Weak SQL', 'Ravi']) expect(text).not.toContain(secret);
});

it('keeps an admin-only history per student', async () => {
  const { stu } = await setup();
  const h = await studentHistory(T, String(stu._id));
  expect(h.rows.map((r) => r.companyName)).toEqual(['Beta', 'Acme']);
  expect(h.counts).toMatchObject({ total: 2, attended: 2, offers: 1 });
});

it('matches students to eligibility, treating missing profile data as unknown', async () => {
  const { d2 } = await setup();
  const mk = async (email: string, degree?: any) => {
    const u = await User.create({ tenantId: TENANT, firstName: email, lastName: 'S', email, password: 'x', role: 'STUDENT', isActive: true } as any);
    if (degree) await StudentProfile.create({ tenantId: TENANT, userId: u._id, education: { degree } } as any).catch(() => StudentProfile.collection.insertOne({ tenantId: TENANT, userId: u._id, education: { degree } }));
    return u;
  };
  await mk('fit@x.com', { name: 'B.Tech', branch: 'CSE', college: 'X', graduationYear: 2025, percentage: 72 });
  await mk('old@x.com', { name: 'B.Tech', branch: 'CSE', college: 'X', graduationYear: 2019, percentage: 80 });
  await mk('blank@x.com');
  await PlacementDeskDrive.updateOne({ _id: d2._id }, { $set: { eligibility: { passoutYears: [2024, 2025], degrees: ['b.tech'], minPercent: 60, skills: [], batchIds: [] } } });
  const drive = await PlacementDeskDrive.findById(d2._id).lean();
  const rows = await eligibleStudents(T, drive);
  const by = new Map(rows.map((r) => [r.email, r]));
  expect(by.get('fit@x.com')!.match).toBe('yes');
  expect(by.get('old@x.com')!.match).toBe('no');
  expect(by.get('blank@x.com')!.match).toBe('unknown');
  expect(by.get('asha@x.com')!.added).toBe(true);
  expect(rows[0].match).toBe('yes');
});

it('exports an Excel workbook', async () => {
  await setup();
  const { buffer, filename } = await reportWorkbook(T, '2026-11-01', '2026-11-30');
  expect(filename).toBe('placement-desk-2026-11-01-to-2026-11-30.xlsx');
  expect(buffer.length).toBeGreaterThan(1000);
});
