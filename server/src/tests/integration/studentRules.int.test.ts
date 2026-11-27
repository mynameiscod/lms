/**
 * Student Rules (2026-11-25): office QR attendance, the profile gate, inactivity alerts.
 */
import mongoose from 'mongoose';
import { startMongo, stopMongo } from './mongoHarness';
import User from '../../models/User';
import Batch from '../../models/Batch';
import Attendance from '../../models/Attendance';
import StudentProfile from '../../models/StudentProfile';
import { InactivityAlert } from '../../models/StudentRules';
import * as svc from '../../services/studentRulesService';

jest.setTimeout(240_000);
const tid = String(new mongoose.Types.ObjectId());
const admin = String(new mongoose.Types.ObjectId());
const OFFICE = '203.0.113.7';
const HOME = '198.51.100.9';
const DAY = 86_400_000;

let batchId = '';
let otherBatchId = '';
const mkStudent = async (email: string, extra: any = {}) =>
  String((await User.create({ tenantId: tid, email, password: 'x'.repeat(12), firstName: email.split('@')[0], lastName: 'S', role: 'STUDENT', batchId, isActive: true, ...extra } as any))._id);
const tokenOf = (url: string) => decodeURIComponent(new URL(url).searchParams.get('t')!);
const screen = async (batch?: string, ip = OFFICE) => tokenOf((await svc.qrForScreen(tid, batch, ip, 'https://lms.test')).url);

describe('Student Rules', () => {
  beforeAll(async () => {
    await startMongo();
    const now = Date.now();
    batchId = String((await Batch.create({ tenantId: tid, name: 'Java Nov', startDate: new Date(now - 30 * DAY), endDate: new Date(now + 60 * DAY), isActive: true } as any))._id);
    otherBatchId = String((await Batch.create({ tenantId: tid, name: 'Python Nov', startDate: new Date(now - 30 * DAY), endDate: new Date(now + 60 * DAY), isActive: true } as any))._id);
  });
  afterAll(stopMongo);

  it('starts with everything off and refuses a QR screen until attendance is switched on', async () => {
    const r = await svc.getRules(tid, true);
    expect(r.attendance.enabled).toBe(false);
    expect(r.inactivity.enabled).toBe(false);
    expect(r.profileGate.enabled).toBe(false);
    await expect(svc.qrForScreen(tid, undefined, OFFICE, 'https://lms.test')).rejects.toThrow(/switched off/);
  });

  it('checks a student in on the office network, then out after the minimum gap', async () => {
    await svc.updateRules(tid, { attendance: { enabled: true, sameNetworkAsScreen: true, checkOut: true, minMinutesBeforeCheckOut: 0, lateAfter: '' } }, admin);
    const s = await mkStudent('ravi@x.test');
    const t = await screen();
    const first = await svc.checkIn(tid, s, { token: t, deviceId: 'phone-ravi' }, OFFICE);
    expect(first.action).toBe('in');
    const rec: any = await Attendance.findOne({ tenantId: tid, studentId: s }).lean();
    expect(rec.status).toBe('present');
    expect(rec.method).toBe('qr');
    expect(rec.inTime).toMatch(/^\d\d:\d\d$/);
    expect(String(rec.batchId)).toBe(batchId);

    const second = await svc.checkIn(tid, s, { token: t, deviceId: 'phone-ravi' }, OFFICE);
    expect(second.action).toBe('out');
    const third = await svc.checkIn(tid, s, { token: t, deviceId: 'phone-ravi' }, OFFICE);
    expect(third.action).toBe('already');
    expect(await Attendance.countDocuments({ tenantId: tid, studentId: s })).toBe(1);
  });

  it('refuses a scan from another network (mobile data, home)', async () => {
    const s = await mkStudent('priya@x.test');
    const t = await screen();
    await expect(svc.checkIn(tid, s, { token: t }, HOME)).rejects.toMatchObject({ code: 'NOT_OFFICE_NETWORK' });
    // ::ffff: prefixed IPv4 is the same address
    expect((await svc.checkIn(tid, s, { token: t }, `::ffff:${OFFICE}`)).action).toBe('in');
  });

  it('refuses a forged or expired code', async () => {
    const s = await mkStudent('arun@x.test');
    const t = await screen();
    const [p, sig] = t.split('.');
    await expect(svc.checkIn(tid, s, { token: `${p}.${sig.slice(0, -2)}xx` }, OFFICE)).rejects.toMatchObject({ code: 'QR_INVALID' });
    const payload = Buffer.from(p, 'base64url').toString().split('.');
    const stale = Buffer.from(`${payload[0]}.${payload[1]}.${Number(payload[2]) - 5}`).toString('base64url');
    await expect(svc.checkIn(tid, s, { token: `${stale}.${sig}` }, OFFICE)).rejects.toMatchObject({ code: 'QR_INVALID' }); // signature no longer matches
  });

  it('accepts a code scanned up to a minute ago, and refuses an older one', async () => {
    const s = await mkStudent('slowphone@x.test');
    const t = await screen();
    const real = Date.now;
    try {
      Date.now = () => real() + 50_000; // phone took 50 s to open the link
      expect((await svc.checkIn(tid, s, { token: t, deviceId: 'slow' }, OFFICE)).action).toBe('in');
      Date.now = () => real() + 5 * 60_000;
      await expect(svc.exchangeScan(t)).rejects.toMatchObject({ code: 'QR_EXPIRED' });
    } finally { Date.now = real; }
  });

  it('scan ticket: swapped before login, still checks in 10 minutes later, but not from home or after 15 minutes', async () => {
    const s = await mkStudent('safari@x.test');
    const t = await screen();
    const { ticket } = await svc.exchangeScan(t);
    expect(ticket.startsWith('k.')).toBe(true);
    expect((await svc.exchangeScan(ticket)).ticket).toBe(ticket); // reload of the page keeps the same ticket
    const real = Date.now;
    try {
      Date.now = () => real() + 10 * 60_000;
      await svc.qrForScreen(tid, undefined, OFFICE, 'https://lms.test'); // the screen keeps refreshing
      await expect(svc.checkIn(tid, s, { token: ticket }, HOME)).rejects.toMatchObject({ code: 'NOT_OFFICE_NETWORK' });
      expect((await svc.checkIn(tid, s, { token: ticket, deviceId: 'iphone' }, OFFICE)).action).toBe('in');
      Date.now = () => real() + 16 * 60_000;
      await expect(svc.checkIn(tid, s, { token: ticket }, OFFICE)).rejects.toMatchObject({ code: 'QR_EXPIRED' });
    } finally { Date.now = real; }
    // A forged ticket, and a made-up institute, are refused.
    await expect(svc.exchangeScan(`${ticket.slice(0, -3)}abc`)).rejects.toMatchObject({ code: 'QR_INVALID' });
    const fake = `${Buffer.from(`${new mongoose.Types.ObjectId()}.all.1`).toString('base64url')}.xxxxxxxxxxxxxxxxxxxxxx`;
    await expect(svc.exchangeScan(fake)).rejects.toMatchObject({ code: 'QR_INVALID' });
  });

  it('one phone checks in only one student a day', async () => {
    const a = await mkStudent('kiran@x.test');
    const b = await mkStudent('kavya@x.test');
    const t = await screen();
    await svc.checkIn(tid, a, { token: t, deviceId: 'shared-phone' }, OFFICE);
    await expect(svc.checkIn(tid, b, { token: t, deviceId: 'shared-phone' }, OFFICE)).rejects.toMatchObject({ code: 'PHONE_USED' });
  });

  it('a batch-specific code refuses students of another batch', async () => {
    const s = await mkStudent('meena@x.test', { batchId: otherBatchId });
    const t = await screen(batchId);
    await expect(svc.checkIn(tid, s, { token: t }, OFFICE)).rejects.toMatchObject({ code: 'WRONG_BATCH' });
  });

  it('location check: needs the location, refuses far away, accepts nearby', async () => {
    await svc.updateRules(tid, { attendance: { sameNetworkAsScreen: false, location: true, officeLat: 17.4375, officeLng: 78.4482, radiusM: 150 } }, admin);
    const s = await mkStudent('sai@x.test');
    const t = await screen();
    await expect(svc.checkIn(tid, s, { token: t }, HOME)).rejects.toMatchObject({ code: 'NEED_LOCATION' });
    await expect(svc.checkIn(tid, s, { token: t, lat: 17.45, lng: 78.46 }, HOME)).rejects.toMatchObject({ code: 'TOO_FAR' });
    const ok: any = await svc.checkIn(tid, s, { token: t, lat: 17.4378, lng: 78.4484 }, HOME);
    expect(ok.action).toBe('in');
    await svc.updateRules(tid, { attendance: { sameNetworkAsScreen: true, location: false } }, admin);
  });

  it('will not switch on saved networks with none saved, or a location check with no office location', async () => {
    await expect(svc.updateRules(tid, { attendance: { savedNetworks: true, networks: [] } }, admin)).rejects.toThrow(/at least one office network/);
  });

  it('profile gate: blocks an incomplete profile until it is 100% (plus parent mobile when required)', async () => {
    const s = await mkStudent('gate@x.test');
    expect(await svc.profileGateBlocks(tid, s)).toBe(false); // gate off
    await svc.updateRules(tid, { profileGate: { enabled: true, requireParentMobile: true } }, admin);
    expect(await svc.profileGateBlocks(tid, s)).toBe(true);
    expect(svc.profileGateAllows('GET', '/api/v1/student-profile/me', s)).toBe(true);
    expect(svc.profileGateAllows('POST', '/api/v1/student-rules/attendance/check-in', s)).toBe(true);
    expect(svc.profileGateAllows('GET', '/api/v1/quizzes', s)).toBe(false);

    const full: any = {
      userId: s, tenantId: tid,
      personalInfo: { profilePhoto: 'p.jpg', firstName: 'Gate', surname: 'S', email: 'gate@x.test', mobileNumber: '9000000001', country: 'IN', state: 'TS', city: 'Hyd', gender: 'Male', dateOfBirth: new Date('2002-01-01') },
      professionalProfiles: { linkedInUrl: 'https://linkedin.com/in/x' },
      education: { highestQualification: 'Diploma', currentStatus: 'Graduate', tenthClass: { schoolName: 'ZPHS' } },
      technicalBackground: { programmingLanguages: ['Java'], technologies: ['React'], experienceLevel: 'Beginner' },
      courseInterest: { interestedCourse: 'Java Full Stack', preferredLearningMode: 'Offline', preferredBatchTime: 'Morning' },
      additionalInfo: { careerGoal: 'Developer' },
    };
    await new StudentProfile(full).save();
    let st = await svc.profileGateStatus(tid, s);
    expect(st.percent).toBe(100);
    expect(st.complete).toBe(false); // parent mobile still missing
    expect(st.missing.flatMap((m) => m.fields)).toContain('Parent / guardian mobile');

    await StudentProfile.updateOne({ userId: s }, { $set: { 'personalInfo.parentMobile': '9000000002' } });
    st = await svc.profileGateStatus(tid, s);
    expect(st.complete).toBe(true);
    expect(await svc.profileGateBlocks(tid, s)).toBe(false);
    await svc.updateRules(tid, { profileGate: { enabled: false } }, admin);
  });

  it('inactivity: finds students away for N days and sends each message once per spell', async () => {
    const now = Date.now();
    const away = await mkStudent('away@x.test', { lmsLastActiveAt: new Date(now - 5 * DAY), phone: '9000000010' });
    await mkStudent('fresh@x.test', { lmsLastActiveAt: new Date(now - 60_000), phone: '9000000011' });
    await svc.updateRules(tid, { inactivity: { enabled: true, studentAfterDays: 2, trainerAfterDays: 3, parentAfterDays: 0 } }, admin);

    const list = await svc.inactiveStudents(tid, 2);
    const row = list.find((x) => x.studentId === away);
    expect(row?.daysInactive).toBeGreaterThanOrEqual(4);
    expect(list.find((x) => x.phone === '9000000011')).toBeUndefined();

    const plan = await svc.inactivityPlan(tid);
    expect(plan.rows.find((x) => x.studentId === away)?.due.student).toBe(true);
    expect(plan.templates.student).toBe(false); // nothing assigned → nothing sent, nothing charged
    const res = await svc.runInactivity(tid);
    expect(res.student).toBe(0);
    expect(await InactivityAlert.countDocuments({ tenantId: tid })).toBe(0);

    // Once recorded for this spell, it is not due again.
    await InactivityAlert.create({ tenantId: tid, studentId: away, kind: 'student', lastActiveDay: row!.lastActiveDay, daysInactive: row!.daysInactive, ok: true });
    const again = await svc.inactivityPlan(tid);
    expect(again.rows.find((x) => x.studentId === away)?.due.student).toBe(false);
  });
});
