/**
 * CRM: Book a demo (2026-11-25) — slots, the public booking, seats, reschedule, cancel, attendance.
 * Real database; email, WhatsApp, notifications and 100ms are stubbed so nothing leaves the machine.
 */
const emails: { to: string; subject: string }[] = [];
jest.mock('../../services/emailService', () => ({
  EmailService: jest.fn().mockImplementation(() => ({
    sendGenericEmail: jest.fn(async (to: string, subject: string) => { emails.push({ to, subject }); return true; }),
  })),
}));
const whatsapps: { phone: string; purpose: string; body: string[] }[] = [];
jest.mock('../../services/purposeMessaging', () => ({
  sendByPurpose: jest.fn(async (_t: string, phone: string, purpose: string, body: string[]) => { whatsapps.push({ phone, purpose, body }); return { ok: true }; }),
  purposeTemplate: jest.fn(() => 'tpl'),
}));
jest.mock('../../notifications/notificationService', () => ({ createNotifications: jest.fn(async () => undefined) }));
jest.mock('../../services/hmsService', () => ({
  HMS_ROLES: { broadcaster: 'broadcaster', viewer: 'viewer', stage: 'viewer-on-stage' },
  isHmsConfigured: jest.fn(() => true),
  authToken: jest.fn(() => 'tok'),
}));
jest.mock('../../services/workflow/engine', () => ({ onDemoBooked: jest.fn(async () => undefined), onDemoChanged: jest.fn(async () => undefined), fire: jest.fn(async () => undefined) }));

import mongoose from 'mongoose';
import { startMongo, stopMongo } from './mongoHarness';
import Tenant from '../../models/Tenant';
import Lead from '../../models/Lead';
import LeadStage from '../../models/LeadStage';
import Meeting from '../../models/Meeting';
import LiveClass from '../../models/LiveClass';
import LiveClassInvite from '../../models/LiveClassInvite';
import DemoSlot from '../../models/DemoSlot';
import DemoBooking from '../../models/DemoBooking';
import * as svc from '../../services/demoBookingService';
import { invalidateModuleCache } from '../../middleware/moduleGate';
import { effectiveModules } from '../../config/tenantModules';

jest.setTimeout(240_000);

const db = () => mongoose.connection.db!;
const proof = () => async () => async () => undefined; // a verified phone
const noProof = () => async () => null;
const SLUG = `acme-${Date.now()}`;
let tenantId: string;
let hostId: string;
let demoStageId: string;

const istDate = (daysAhead: number) => new Date(Date.now() + 330 * 60_000 + daysAhead * 86_400_000).toISOString().slice(0, 10);
const flush = () => new Promise((r) => setTimeout(r, 50));

async function slot(over: any = {}) {
  const [s] = await svc.createSlots(tenantId, { course: 'Java Full Stack', date: istDate(3), time: '19:00', hostId, joinMethod: 'link', meetingLink: 'https://meet.google.com/abc-defg-hij', seats: 5, ...over }, hostId);
  return s;
}

describe('Book a demo', () => {
  beforeAll(async () => {
    await startMongo();
    await DemoBooking.syncIndexes();
    const t: any = await Tenant.collection.insertOne({ name: 'Acme', slug: SLUG, isActive: true, modules: { leads: true, crmDemoBooking: true, liveClasses: true } } as any);
    tenantId = String(t.insertedId);
    const h = new mongoose.Types.ObjectId();
    await db().collection('users').insertOne({ _id: h, tenantId: t.insertedId, role: 'STAFF', firstName: 'Ravi', lastName: 'T', email: 'ravi@acme.in', isActive: true });
    hostId = String(h);
    await Tenant.collection.updateOne({ _id: t.insertedId }, { $set: { adminId: h } });
    await LeadStage.collection.insertMany([
      { tenantId: t.insertedId, name: 'New', order: 1, isDefault: true, milestone: 'new', isActive: true },
      { tenantId: t.insertedId, name: 'Demo booked', order: 4, milestone: 'demo', isActive: true },
      { tenantId: t.insertedId, name: 'Enrolled', order: 9, milestone: 'enrolled', isActive: true },
    ] as any);
    demoStageId = String((await LeadStage.findOne({ tenantId: t.insertedId, milestone: 'demo' }).lean() as any)._id);
    invalidateModuleCache();
  });
  afterAll(stopMongo);

  it('is off until the platform administrator switches it on, even with CRM on', async () => {
    expect(effectiveModules({ leads: true } as any).crmDemoBooking).toBe(false);
    expect(effectiveModules({ leads: true, crmDemoBooking: true } as any).crmDemoBooking).toBe(true);
    expect(effectiveModules({ leads: false, crmDemoBooking: true } as any).crmDemoBooking).toBe(false);
    const off: any = await Tenant.collection.insertOne({ name: 'Off', slug: `off-${Date.now()}`, isActive: true, modules: { leads: true } } as any);
    invalidateModuleCache();
    const offSlug = (await Tenant.findById(off.insertedId).lean() as any).slug;
    await expect(svc.publicCatalog(offSlug)).rejects.toThrow(/not open/);
  });

  it('repeats a slot on the chosen weekdays (IST), in the future only', () => {
    const times = svc.startTimes({ date: '2030-01-06', time: '19:00', repeat: { weekdays: [1, 3, 5], until: '2030-01-19' } });
    // Mon 7, Wed 9, Fri 11, Mon 14, Wed 16, Fri 18 Jan 2030, 7 pm IST = 13:30 UTC
    expect(times.map((t) => t.toISOString())).toEqual(['07', '09', '11', '14', '16', '18'].map((d) => `2030-01-${d}T13:30:00.000Z`));
    expect(() => svc.startTimes({ date: '2020-01-01', time: '10:00' })).toThrow(/already passed/);
  });

  it('a booking takes a seat, creates the lead, books a demo meeting, moves the stage and confirms', async () => {
    const s = await slot();
    const cat = await svc.publicCatalog(SLUG);
    expect(cat.courses).toEqual([{ key: 'java-full-stack', name: 'Java Full Stack' }]);
    expect(cat.slots.find((x: any) => String(x._id) === String(s._id))?.seatsLeft).toBe(5);

    await expect(svc.book(SLUG, { slotId: String(s._id), name: 'Asha K', phone: '9876500001', verificationToken: 'x' }, noProof())).rejects.toThrow(/verify/);

    const r = await svc.book(SLUG, { slotId: String(s._id), name: 'Asha K', phone: '9876500001', email: 'asha@x.in', verificationToken: 'x', utm: { source: 'instagram' } }, proof());
    expect((await DemoSlot.findById(s._id).lean() as any).booked).toBe(1);
    const lead: any = await Lead.findOne({ phone: '9876500001' }).lean();
    expect(lead.source).toBe('website');
    expect(String(lead.stageId)).toBe(demoStageId);
    const m: any = await Meeting.findById(r.booking.meetingId).lean();
    expect(m.type).toBe('online_demo');
    expect(m.meetingLink).toContain(`/demo-booking/${r.booking.token}`);
    expect(new Date(lead.demoBookedAt).getTime()).toBe(new Date(s.startsAt).getTime());
    await flush();
    expect(whatsapps.some((w) => w.purpose === 'DEMO_BOOKED' && w.phone === '9876500001')).toBe(true);
    expect(emails.some((e) => e.to === 'asha@x.in' && /Booked/.test(e.subject))).toBe(true);
  });

  it('never gives the last seat twice', async () => {
    const s = await slot({ seats: 1, course: 'Python' });
    const results = await Promise.allSettled([
      svc.book(SLUG, { slotId: String(s._id), name: 'One', phone: '9876500011', verificationToken: 'x' }, proof()),
      svc.book(SLUG, { slotId: String(s._id), name: 'Two', phone: '9876500012', verificationToken: 'x' }, proof()),
    ]);
    expect(results.filter((x) => x.status === 'fulfilled')).toHaveLength(1);
    expect(String((results.find((x) => x.status === 'rejected') as any).reason.message)).toMatch(/filled up/);
    expect((await DemoSlot.findById(s._id).lean() as any).booked).toBe(1);
    expect((await svc.publicCatalog(SLUG)).slots.find((x: any) => String(x._id) === String(s._id))).toBeUndefined();
  });

  it('booking the same course again moves the booking; the visitor can reschedule and cancel', async () => {
    const a = await slot({ course: 'Data Science' });
    const b = await slot({ course: 'Data Science', date: istDate(4) });
    const first = await svc.book(SLUG, { slotId: String(a._id), name: 'Kiran', phone: '9876500021', verificationToken: 'x' }, proof());
    const again = await svc.book(SLUG, { slotId: String(b._id), name: 'Kiran', phone: '9876500021', verificationToken: 'x' }, proof());
    expect((again as any).rescheduled).toBe(true);
    expect(String(again.booking._id)).toBe(String(first.booking._id));
    expect(await DemoBooking.countDocuments({ phone: '9876500021', status: 'booked' })).toBe(1);
    expect((await DemoSlot.findById(a._id).lean() as any).booked).toBe(0);
    expect((await DemoSlot.findById(b._id).lean() as any).booked).toBe(1);
    const m: any = await Meeting.findById(first.booking.meetingId).lean();
    expect(m.status).toBe('rescheduled');
    expect(new Date(m.scheduledAt).getTime()).toBe(new Date(b.startsAt).getTime());

    const view = await svc.publicBookingView(first.booking.token);
    expect(view.canCancel).toBe(true);
    expect(view.canJoin).toBe(false);
    await expect(svc.joinUrl(first.booking.token)).rejects.toThrow(/opens 10 minutes/);

    await svc.cancelByVisitor(first.booking.token);
    expect((await DemoSlot.findById(b._id).lean() as any).booked).toBe(0);
    expect((await Meeting.findById(first.booking.meetingId).lean() as any).status).toBe('cancelled');
  });

  it('cancelling a slot cancels every booking and tells each visitor', async () => {
    const s = await slot({ course: 'Testing' });
    const r = await svc.book(SLUG, { slotId: String(s._id), name: 'Meena', phone: '9876500031', verificationToken: 'x' }, proof());
    whatsapps.length = 0;
    await svc.cancelSlot(tenantId, String(s._id), '', hostId);
    expect((await DemoBooking.findById(r.booking._id).lean() as any).status).toBe('cancelled');
    expect((await Meeting.findById(r.booking.meetingId).lean() as any).status).toBe('cancelled');
    await flush();
    expect(whatsapps.some((w) => w.purpose === 'DEMO_UPDATE' && w.phone === '9876500031')).toBe(true);
  });

  it('a room slot settles attendance from the live room: attended and no-show', async () => {
    const s = await slot({ course: 'Cloud', joinMethod: 'room', meetingLink: undefined });
    expect(s.liveClassId).toBeTruthy();
    const yes = await svc.book(SLUG, { slotId: String(s._id), name: 'Present', phone: '9876500041', verificationToken: 'x' }, proof());
    const no = await svc.book(SLUG, { slotId: String(s._id), name: 'Absent', phone: '9876500042', verificationToken: 'x' }, proof());
    expect(yes.booking.liveInviteId).toBeTruthy();
    // The demo happened: the host opened the room and one visitor stayed 25 minutes.
    const start = new Date(Date.now() - 2 * 3600_000);
    await DemoSlot.updateOne({ _id: s._id }, { $set: { startsAt: start } });
    await LiveClass.updateOne({ _id: s.liveClassId }, { $set: { startedAt: start, status: 'ended' } });
    await LiveClassInvite.updateOne({ _id: yes.booking.liveInviteId }, { $set: { firstJoinedAt: start, totalSeconds: 25 * 60 } });
    whatsapps.length = 0;

    expect(await svc.settleEndedSlots()).toBeGreaterThanOrEqual(1);
    expect((await DemoBooking.findById(yes.booking._id).lean() as any).status).toBe('attended');
    expect((await DemoBooking.findById(no.booking._id).lean() as any).status).toBe('no_show');
    expect((await Meeting.findById(yes.booking.meetingId).lean() as any).status).toBe('completed');
    expect((await Meeting.findById(no.booking.meetingId).lean() as any).status).toBe('no_show');
    expect((await DemoSlot.findById(s._id).lean() as any).status).toBe('done');
    await flush();
    expect(whatsapps.filter((w) => w.purpose === 'DEMO_UPDATE').map((w) => w.phone)).toEqual(['9876500042']);
    // Settling twice changes nothing.
    expect(await svc.settleEndedSlots()).toBe(0);
  });

  it('nobody is marked no-show when the host never opened the room', async () => {
    const s = await slot({ course: 'DevOps', joinMethod: 'room', meetingLink: undefined });
    const r = await svc.book(SLUG, { slotId: String(s._id), name: 'Waiting', phone: '9876500051', verificationToken: 'x' }, proof());
    await DemoSlot.updateOne({ _id: s._id }, { $set: { startsAt: new Date(Date.now() - 3 * 3600_000) } });
    await svc.settleEndedSlots();
    expect((await DemoBooking.findById(r.booking._id).lean() as any).status).toBe('booked');
    // Marked by hand instead.
    await svc.markAttendance(tenantId, String(r.booking._id), 'attended', hostId);
    expect((await Meeting.findById(r.booking.meetingId).lean() as any).status).toBe('completed');
  });

  it('seats cannot drop below the bookings, and a booked slot cannot be deleted', async () => {
    const s = await slot({ course: 'AI', seats: 3 });
    await svc.book(SLUG, { slotId: String(s._id), name: 'A', phone: '9876500061', verificationToken: 'x' }, proof());
    await svc.book(SLUG, { slotId: String(s._id), name: 'B', phone: '9876500062', verificationToken: 'x' }, proof());
    await expect(svc.updateSlot(tenantId, String(s._id), { seats: 1 }, hostId)).rejects.toThrow(/cannot be fewer/);
    await expect(svc.deleteSlot(tenantId, String(s._id))).rejects.toThrow(/Cancel it instead/);
  });
});
