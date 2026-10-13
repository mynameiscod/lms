/**
 * Live class invites — who a class is for (open, batches, people, pasted emails/mobiles), the
 * personal join link for guests with no account, and the invitations themselves. Real database;
 * email, WhatsApp and 100ms are stubbed so nothing leaves the machine.
 */
const emails: { to: string; subject: string; attachments?: any[] }[] = [];
jest.mock('../../services/emailService', () => ({
  EmailService: jest.fn().mockImplementation(() => ({
    sendGenericEmail: jest.fn(async (to: string, subject: string, _h: string, _t?: string, attachments?: any[]) => { emails.push({ to, subject, attachments }); return true; }),
  })),
}));
const whatsapps: { phone: string; purpose: string; body: string[] }[] = [];
jest.mock('../../services/purposeMessaging', () => ({
  sendByPurpose: jest.fn(async (_t: string, phone: string, purpose: string, body: string[]) => { whatsapps.push({ phone, purpose, body }); return { ok: true }; }),
  purposeTemplate: jest.fn(() => 'live_class_invite'),
}));
jest.mock('../../notifications/notificationService', () => ({ createNotifications: jest.fn(async () => undefined) }));
jest.mock('../../services/hmsService', () => ({
  HMS_ROLES: { broadcaster: 'broadcaster', viewer: 'viewer', stage: 'viewer-on-stage' },
  authToken: jest.fn((room: string, user: string, role: string) => `tok:${room}:${user}:${role}`),
  isHmsConfigured: jest.fn(() => true),
  createRoom: jest.fn(async () => 'room-1'),
  endRoom: jest.fn(async () => undefined),
  changeRole: jest.fn(async () => undefined),
}));

import mongoose from 'mongoose';
import { startMongo, stopMongo, clearCollections } from './mongoHarness';
import LiveClass from '../../models/LiveClass';
import LiveClassInvite from '../../models/LiveClassInvite';
import User from '../../models/User';
import * as svc from '../../services/liveClassInviteService';
import * as ctrl from '../../controllers/liveClassController';
import * as settings from '../../services/settingsService';
import { fireLiveClassReminders } from '../../jobs/liveClassReminderCron';

jest.setTimeout(180_000);

const T = new mongoose.Types.ObjectId();
const BATCH_A = new mongoose.Types.ObjectId();
const BATCH_B = new mongoose.Types.ObjectId();
let host: any; let student: any; let other: any; let outsider: any;

/** Sends run in the background; wait until they have landed (or give up after 10 s). */
const waitFor = async (done: () => boolean) => {
  for (let i = 0; i < 200 && !done(); i++) await new Promise((r) => setTimeout(r, 50));
};
const mkUser = (o: any) => User.create({ tenantId: T, password: 'x', isActive: true, role: 'STUDENT', ...o } as any);
const mkClass = (o: any = {}) => LiveClass.create({
  tenantId: T, title: 'Java Day 12', instructorId: host._id, instructorName: 'Siva', createdBy: host._id,
  scheduledAt: new Date(Date.now() + 10 * 60_000), durationMin: 60, status: 'scheduled', ...o,
});
const res = () => {
  const r: any = { statusCode: 200, body: null };
  r.status = (c: number) => { r.statusCode = c; return r; };
  r.json = (b: any) => { r.body = b; return r; };
  return r;
};

beforeAll(startMongo);
afterAll(stopMongo);
beforeEach(async () => {
  await clearCollections();
  await LiveClassInvite.syncIndexes();
  emails.length = 0; whatsapps.length = 0;
  host = await mkUser({ firstName: 'Siva', lastName: 'G', email: 'host@cb.com', role: 'INSTRUCTOR' });
  student = await mkUser({ firstName: 'Ravi', lastName: 'K', email: 'ravi@cb.com', phone: '9876543210', batchId: BATCH_A });
  other = await mkUser({ firstName: 'Sita', lastName: 'R', email: 'sita@cb.com', batchId: BATCH_B });
  outsider = await mkUser({ firstName: 'No', lastName: 'One', email: 'none@cb.com' });
});

describe('reading pasted contacts', () => {
  it('understands emails, mobiles, names and mixed lines', () => {
    const { contacts, invalid } = svc.parseContacts([
      'ravi@x.com',
      '98765 43210',
      'Priya Sharma <priya@x.com>',
      'Arjun, arjun@x.com, +91 91234 56789',
      'a@x.com, b@x.com',
      'not a contact',
    ].join('\n'));
    expect(contacts).toEqual([
      { email: 'ravi@x.com' },
      { phone: '+919876543210' },
      { email: 'priya@x.com', name: 'Priya Sharma' },
      { email: 'arjun@x.com', phone: '+919123456789', name: 'Arjun' },
      { email: 'a@x.com' }, { email: 'b@x.com' },
    ]);
    expect(invalid).toEqual(['not a contact']);
  });
});

describe('who may see and join', () => {
  it('keeps the old rules for classes saved before audiences existed', async () => {
    const open = await mkClass();
    const batch = await mkClass({ batchId: BATCH_A });
    expect(await svc.userMayJoin(open, String(outsider._id))).toBe(true);
    expect(await svc.userMayJoin(batch, String(student._id))).toBe(true);
    expect(await svc.userMayJoin(batch, String(other._id))).toBe(false);
  });

  it('a new class is for its batches and its invitees only', async () => {
    const lc = await mkClass({ openToInstitute: false, batchIds: [BATCH_B] });
    await svc.addInvites(lc, { contacts: 'ravi@cb.com' });
    expect(await svc.userMayJoin(lc, String(student._id))).toBe(true);   // invited by email
    expect(await svc.userMayJoin(lc, String(other._id))).toBe(true);     // batch B
    expect(await svc.userMayJoin(lc, String(outsider._id))).toBe(false);

    const seen = await LiveClass.find({ tenantId: T, ...(await svc.visibleClassFilter(String(T), String(outsider._id))) }).lean();
    expect(seen.map((c) => String(c._id))).not.toContain(String(lc._id));
    const mine = await LiveClass.find({ tenantId: T, ...(await svc.visibleClassFilter(String(T), String(student._id))) }).lean();
    expect(mine.map((c) => String(c._id))).toContain(String(lc._id));
  });

  it('refuses a join token to someone not invited, and gives one to someone invited', async () => {
    const lc = await mkClass({ openToInstitute: false, status: 'live', hmsRoomId: 'room-1' });
    await svc.addInvites(lc, { userIds: [String(student._id)] });
    const deny = res();
    await ctrl.getJoinToken({ params: { id: String(lc._id) }, tenantId: String(T), user: { id: String(outsider._id), role: 'STUDENT' } } as any, deny);
    expect(deny.statusCode).toBe(403);
    const ok = res();
    await ctrl.getJoinToken({ params: { id: String(lc._id) }, tenantId: String(T), user: { id: String(student._id), role: 'STUDENT' } } as any, ok);
    expect(ok.statusCode).toBe(200);
    expect(ok.body.data.role).toBe('viewer');
  });
});

describe('inviting', () => {
  it('adds users, pasted contacts and batches, linking a pasted email to its LMS account', async () => {
    const lc = await mkClass({ openToInstitute: false });
    const r = await svc.addInvites(lc, {
      userIds: [String(other._id)],
      contacts: 'ravi@cb.com\nGuest Person, guest@gmail.com, 9123456789\n98000 11111',
      batchIds: [String(BATCH_A)],
    }, String(host._id));
    expect(r).toMatchObject({ added: 4, already: 0, invalid: [], batchesAdded: 1 });
    const again = await svc.addInvites(lc, { contacts: 'RAVI@cb.com' });
    expect(again).toMatchObject({ added: 0, already: 1 });

    const ravi = await LiveClassInvite.findOne({ email: 'ravi@cb.com' }).lean() as any;
    expect(String(ravi.userId)).toBe(String(student._id));
    const guest = await LiveClassInvite.findOne({ email: 'guest@gmail.com' }).lean() as any;
    expect(guest).toMatchObject({ kind: 'contact', name: 'Guest Person', phone: '+919123456789' });
    expect(guest.userId).toBeUndefined();
    expect(guest.token).toMatch(/^[A-Za-z0-9_-]{30,}$/);
    expect((await LiveClass.findById(lc._id).lean() as any).batchIds.map(String)).toEqual([String(BATCH_A)]);
  });

  it('sends each person one email with a calendar invite and one WhatsApp, and not twice', async () => {
    const lc = await mkClass({ openToInstitute: false, batchIds: [BATCH_A] });
    await svc.addInvites(lc, { contacts: 'Guest, guest@gmail.com, 9123456789' });
    const r = await svc.sendInvites((await LiveClass.findById(lc._id))!, { channels: { email: true, whatsapp: true }, onlyUnsent: true });
    expect(r).toMatchObject({ recipients: 2, email: 2, whatsapp: 2 });
    await waitFor(() => emails.length >= 2 && whatsapps.length >= 2);
    // …and until each send is recorded on its row, which is what stops a second send.
    for (let i = 0; i < 200; i++) {
      if (await LiveClassInvite.countDocuments({ liveClassId: lc._id, emailSentAt: { $ne: null }, whatsappSentAt: { $ne: null } }) === 2) break;
      await new Promise((r2) => setTimeout(r2, 50));
    }
    expect(emails.map((e) => e.to).sort()).toEqual(['guest@gmail.com', 'ravi@cb.com']);
    expect(emails[0].subject).toMatch(/^Invitation: Java Day 12/);
    expect(emails[0].attachments?.[0].filename).toBe('live-class.ics');
    expect(String(emails[0].attachments?.[0].content)).toContain('BEGIN:VCALENDAR');
    expect(whatsapps.map((w) => w.purpose)).toEqual(['LIVE_CLASS_INVITE', 'LIVE_CLASS_INVITE']);
    expect(whatsapps[0].body[3]).toMatch(/\/live\/[A-Za-z0-9_-]+$/);

    const second = await svc.sendInvites(lc, { channels: { email: true, whatsapp: true }, onlyUnsent: true });
    expect(second).toMatchObject({ email: 0, whatsapp: 0 });
  });

  it('removing a batch removes the rows it added but keeps people picked by hand', async () => {
    const lc = await mkClass({ openToInstitute: false, batchIds: [BATCH_A] });
    await svc.expandBatches(lc);
    await svc.addInvites(lc, { contacts: 'guest@gmail.com' });
    await svc.removeBatch(lc, String(BATCH_A));
    expect((await LiveClassInvite.find({ liveClassId: lc._id }).lean()).map((r: any) => r.email)).toEqual(['guest@gmail.com']);
    expect(await svc.userMayJoin((await LiveClass.findById(lc._id))!, String(student._id))).toBe(false);
  });

  it('reminds everyone once, shortly before the class', async () => {
    const lc = await mkClass({ openToInstitute: false, batchIds: [BATCH_A] });
    await svc.addInvites(lc, { contacts: 'guest@gmail.com' });
    expect(await fireLiveClassReminders()).toBe(1);
    await waitFor(() => emails.filter((e) => e.subject.startsWith('Starting soon')).length >= 2);
    expect(emails.filter((e) => e.subject.startsWith('Starting soon')).map((e) => e.to).sort()).toEqual(['guest@gmail.com', 'ravi@cb.com']);
    expect(await fireLiveClassReminders()).toBe(0);
  });
});

describe('the personal join link (no login)', () => {
  it('shows the class, waits until it is live, then joins under the invite', async () => {
    const lc = await mkClass({ openToInstitute: false });
    await svc.addInvites(lc, { contacts: 'guest@gmail.com' });
    const inv = await LiveClassInvite.findOne({ email: 'guest@gmail.com' }).lean() as any;

    const info = res();
    await ctrl.publicInviteInfo({ params: { token: inv.token } } as any, info);
    expect(info.body.data).toMatchObject({ title: 'Java Day 12', status: 'scheduled' });
    expect(JSON.stringify(info.body)).not.toContain('guest@gmail.com');

    const early = res();
    await ctrl.publicJoin({ params: { token: inv.token }, body: { name: 'Guest Person' } } as any, early);
    expect(early.statusCode).toBe(409);

    await LiveClass.updateOne({ _id: lc._id }, { status: 'live', hmsRoomId: 'room-1' });
    const join = res();
    await ctrl.publicJoin({ params: { token: inv.token }, body: { name: 'Guest Person' } } as any, join);
    expect(join.statusCode).toBe(200);
    expect(join.body.data).toMatchObject({ role: 'viewer', name: 'Guest Person', token: `tok:room-1:invite_${inv._id}:viewer` });
  });

  it('refuses a made-up or removed link', async () => {
    const lc = await mkClass();
    await svc.addInvites(lc, { contacts: 'guest@gmail.com' });
    const inv = await LiveClassInvite.findOne({}).lean() as any;
    await svc.removeInvite(lc, String(inv._id));
    for (const token of [inv.token, 'x'.repeat(32), 'short']) {
      const r = res();
      await ctrl.publicInviteInfo({ params: { token } } as any, r);
      expect(r.statusCode).toBe(404);
    }
  });

  it('records a guest\'s attendance from the 100ms webhook', async () => {
    const lc = await mkClass({ hmsRoomId: 'room-1', status: 'live' });
    await svc.addInvites(lc, { contacts: 'guest@gmail.com' });
    const inv = await LiveClassInvite.findOne({}).lean() as any;
    await ctrl.hmsWebhook({ body: { type: 'peer.join.success', data: { room_id: 'room-1', user_id: `invite_${inv._id}` } }, headers: {} } as any, res());
    await ctrl.hmsWebhook({ body: { type: 'peer.leave.success', data: { room_id: 'room-1', user_id: `invite_${inv._id}`, duration: 1800 } }, headers: {} } as any, res());
    const after = await LiveClassInvite.findById(inv._id).lean() as any;
    expect(after.firstJoinedAt).toBeTruthy();
    expect(after.totalSeconds).toBe(1800);
  });

  it('accepts a webhook without the secret until enforcing is switched on, then refuses it', async () => {
    const values: Record<string, string> = { HMS_WEBHOOK_SECRET: 's3cret-value' };
    const spy = jest.spyOn(settings, 'getStr').mockImplementation((k: string, f = '') => values[k] ?? f);
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);

    const logged = res();
    await ctrl.hmsWebhook({ body: { type: 'noop', data: {} }, headers: {} } as any, logged);
    expect(logged.statusCode).toBe(200);
    expect(warn).toHaveBeenCalled();

    values.HMS_WEBHOOK_ENFORCE = 'true';
    const no = res();
    await ctrl.hmsWebhook({ body: { type: 'peer.join.success', data: {} }, headers: { 'x-other': 'wrong' } } as any, no);
    expect(no.statusCode).toBe(401);
    // Whatever header name was typed in the 100ms dashboard.
    for (const headers of [{ 'x-webhook-secret': 's3cret-value' }, { 'x-100ms-secret': 's3cret-value' }, { authorization: 'Bearer s3cret-value' }]) {
      const yes = res();
      await ctrl.hmsWebhook({ body: { type: 'noop', data: {} }, headers } as any, yes);
      expect(yes.statusCode).toBe(200);
    }
    spy.mockRestore(); warn.mockRestore();
  });
});
