/**
 * Help & Support hardening: notifications that fail never fail a ticket; e-mail goes out only
 * when switched on and never quotes the ticket; members see unread replies; retention deletes
 * only what the organisation asked; and operator-shaped input is treated as text.
 */
import fs from 'fs';
import os from 'os';
import path from 'path';
import express from 'express';
import mongoose from 'mongoose';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { startMongo, stopMongo } from './mongoHarness';

jest.setTimeout(180_000);
process.env.JWT_SECRET = process.env.JWT_SECRET || 'support-hardening-integration-test-secret-0123456789abcdef';

import User from '../../models/User';
import Role from '../../models/Role';
import Tenant from '../../models/Tenant';
import SupportTicket from '../../models/SupportTicket';
import SupportMessage from '../../models/SupportMessage';
import SupportChatSession from '../../models/SupportChatSession';
import SupportConfiguration from '../../models/SupportConfiguration';
import supportRoutes from '../../routes/supportRoutes';
import * as notificationService from '../../notifications/notificationService';
import { EmailService } from '../../services/emailService';
import { registerSupportChannel, __clearSupportChannels } from '../../services/supportNotify';
import { registerSupportEmail } from '../../services/supportEmailChannel';
import { runSupportRetention } from '../../services/supportRetention';
import { __resetRateLimits } from '../../middleware/rateLimit';

const workDir = fs.mkdtempSync(path.join(os.tmpdir(), 'support-hard-'));
const realCwd = process.cwd();
const app = express();
app.use(express.json());
app.use('/support', supportRoutes);

const tokens: Record<string, string> = {};
const ids: Record<string, string> = {};
let T = '';
const as = (who: string) => ({ Authorization: `Bearer ${tokens[who]}` });
const PNG = Buffer.from('89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000d4944415478da63f8ffff3f0005fe02fea7d6a5e00000000049454e44ae426082', 'hex');
const raise = (who: string, over: Record<string, unknown> = {}) => request(app).post('/support/tickets').set(as(who)).send({ subject: `Problem ${Math.random()}`, description: 'Secret detail: my roll number is 42', ...over });
const settle = () => new Promise(r => setTimeout(r, 250));

beforeAll(async () => {
  process.chdir(workDir);
  await startMongo();
  T = String((await Tenant.create({ name: 'T', slug: 't', domain: 't.test', isActive: true, adminId: new mongoose.Types.ObjectId() } as any))._id);
  const agent: any = await Role.create({ name: 'agent', permissions: ['support_agent'] } as any);
  for (const [k, role, cr] of [['member', 'STUDENT', null], ['agent', 'STAFF', agent._id]] as const) {
    const u: any = await User.create({ tenantId: T, firstName: k, lastName: 'T', email: `${k}@x.test`, password: 'x', role, isActive: true, customRoleId: cr } as any);
    ids[k] = String(u._id);
    tokens[k] = jwt.sign({ id: ids[k], email: u.email, role, tenantId: T, customRoleId: cr ? String(cr) : undefined }, process.env.JWT_SECRET as string);
  }
});
afterAll(async () => { __clearSupportChannels(); await stopMongo(); process.chdir(realCwd); fs.rmSync(workDir, { recursive: true, force: true }); });
beforeEach(() => { __resetRateLimits(); jest.restoreAllMocks(); __clearSupportChannels(); delete process.env.SUPPORT_EMAIL_NOTIFICATIONS; });

describe('notifications never break ticket operations', () => {
  it('a ticket is raised and replied to even when in-app notices and an extra channel throw', async () => {
    jest.spyOn(notificationService, 'createNotifications').mockRejectedValue(new Error('notifications down'));
    registerSupportChannel(async () => { throw new Error('channel down'); });
    const r = await raise('member');
    expect(r.status).toBe(201);
    const reply = await request(app).post(`/support/tickets/${r.body.data.id}/messages`).set(as('agent')).send({ body: 'On it.' });
    expect(reply.status).toBe(201);
    await settle();
  });
});

describe('e-mail', () => {
  it('is off by default', async () => {
    expect(registerSupportEmail()).toBe(false);
    const send = jest.spyOn(EmailService.prototype, 'sendGenericEmail').mockResolvedValue(true);
    const r = await raise('member');
    await request(app).post(`/support/tickets/${r.body.data.id}/messages`).set(as('agent')).send({ body: 'Reply' });
    await settle();
    expect(send).not.toHaveBeenCalled();
  });

  it('when switched on, tells the member what happened without quoting the ticket', async () => {
    process.env.SUPPORT_EMAIL_NOTIFICATIONS = 'true';
    process.env.FRONTEND_URL = 'https://app.example.com';
    const send = jest.spyOn(EmailService.prototype, 'sendGenericEmail').mockResolvedValue(true);
    expect(registerSupportEmail()).toBe(true);
    const r = await raise('member');
    await request(app).post(`/support/tickets/${r.body.data.id}/messages`).set(as('agent')).send({ body: 'Your roll number 42 is wrong', requestInfo: true });
    await settle();
    const toMember = send.mock.calls.filter(c => c[0] === 'member@x.test');
    expect(toMember.length).toBeGreaterThanOrEqual(2); // received + needs your reply
    const info = toMember.find(c => /needs your reply/.test(String(c[1])))!;
    expect(String(info[2])).toContain(`https://app.example.com/careerpilot/support/tickets/${r.body.data.id}`);
    expect(String(info[2]) + String(info[3])).not.toMatch(/roll number|Secret detail/);
    delete process.env.FRONTEND_URL;
  });
});

describe('unread replies for members', () => {
  it('a public staff reply or status change is unread until the member opens the ticket; internal notes are not', async () => {
    const r = await raise('member');
    const unread = async () => (await request(app).get('/support/tickets/unread').set(as('member'))).body.data.unread;
    const base = await unread();
    await request(app).post(`/support/tickets/${r.body.data.id}/messages`).set(as('agent')).send({ body: 'note', internal: true });
    expect(await unread()).toBe(base);
    await request(app).post(`/support/tickets/${r.body.data.id}/messages`).set(as('agent')).send({ body: 'public reply' });
    expect(await unread()).toBe(base + 1);
    const list = await request(app).get('/support/tickets/mine').set(as('member'));
    expect(list.body.data.tickets.find((t: any) => t.id === r.body.data.id).unread).toBe(true);
    await request(app).get(`/support/tickets/${r.body.data.id}`).set(as('member'));
    expect(await unread()).toBe(base);
  });
});

describe('retention', () => {
  it('deletes nothing until the organisation sets it', async () => {
    await SupportChatSession.create({ tenantId: T, userId: ids.member, lastActivityAt: new Date(Date.now() - 400 * 86_400_000) });
    const r = await runSupportRetention();
    expect(r).toMatchObject({ chats: 0, attachments: 0 });
    expect(await SupportChatSession.countDocuments({})).toBeGreaterThan(0);
  });

  it('deletes old chats and old attachment files, keeps recent ones and the message text', async () => {
    await SupportChatSession.deleteMany({});
    const old = await SupportChatSession.create({ tenantId: T, userId: ids.member, lastActivityAt: new Date(Date.now() - 40 * 86_400_000) });
    await SupportChatSession.create({ tenantId: T, userId: ids.member, lastActivityAt: new Date() });
    const t = await raise('member');
    await SupportTicket.updateOne({ _id: t.body.data.id }, { $set: { chatSessionId: old._id } });
    await request(app).post(`/support/tickets/${t.body.data.id}/messages`).set(as('member')).field('body', 'screenshot').attach('files', PNG, { filename: 's.png', contentType: 'image/png' });
    const msg: any = await SupportMessage.findOne({ ticketId: t.body.data.id, 'attachments.0': { $exists: true } }).lean();
    const file = path.join(workDir, 'uploads', '.private', 'support', t.body.data.id, msg.attachments[0].storedName);
    expect(fs.existsSync(file)).toBe(true);
    // createdAt is immutable through Mongoose, so back-date it on the collection itself.
    await SupportMessage.collection.updateOne({ _id: msg._id }, { $set: { createdAt: new Date(Date.now() - 100 * 86_400_000) } });

    await SupportConfiguration.create({ tenantId: T, retention: { chatDays: 30, attachmentDays: 90 } });
    const r = await runSupportRetention();
    expect(r).toMatchObject({ chats: 1, attachments: 1 });
    expect(await SupportChatSession.countDocuments({})).toBe(1);
    expect((await SupportTicket.findById(t.body.data.id).lean() as any).chatSessionId).toBeNull();
    expect(fs.existsSync(file)).toBe(false);
    const after: any = await SupportMessage.findById(msg._id).lean();
    expect(after.attachments).toEqual([]);
    expect(after.body).toBe('screenshot');
  });
});

describe('input that looks like a query', () => {
  it('is stored or ignored as text, never run', async () => {
    const r = await request(app).post('/support/tickets').set(as('member')).send({ subject: { $gt: '' }, description: { $ne: null } });
    expect([201, 400]).toContain(r.status);
    if (r.status === 201) expect(typeof (await SupportTicket.findById(r.body.data.id).lean() as any).subject).toBe('string');
    const q = await request(app).get('/support/queue?status[$ne]=open&tenantId[$ne]=x&q[$regex]=.*').set(as('agent'));
    expect(q.status).toBe(200);
    const mine = await request(app).get('/support/tickets/mine?status[$ne]=x').set(as('member'));
    expect(mine.status).toBe(200);
    expect(mine.body.data.tickets.every((t: any) => t.status)).toBe(true);
  });

  it('stores markup as text, untouched', async () => {
    const r = await raise('member', { subject: '<img src=x onerror=alert(1)>' });
    expect((await SupportTicket.findById(r.body.data.id).lean() as any).subject).toBe('<img src=x onerror=alert(1)>');
  });
});
