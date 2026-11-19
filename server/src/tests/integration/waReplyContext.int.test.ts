/**
 * Replies to non-sales WhatsApp (hiring, wishes, updates) must not start the bot or become leads
 * (2026-11-19: a hiring broadcast created 11 leads and 52 bot messages). Real MongoDB.
 */
import mongoose from 'mongoose';
import { startMongo, stopMongo } from './mongoHarness';
import { markRepliesNotLeads, quietReason, replyLeads, setBroadcastPurpose, archiveReplyLeads } from '../../services/whatsAppReplyContext';

jest.setTimeout(240_000);
const tid = new mongoose.Types.ObjectId();
const tenantId = String(tid);
const admin = new mongoose.Types.ObjectId();
const bId = new mongoose.Types.ObjectId();
const col = (n: string) => mongoose.connection.db!.collection(n);
const sentAt = new Date(Date.now() - 20 * 3600_000);

beforeAll(async () => {
  await startMongo();
  await col('users').insertOne({ _id: admin, tenantId: tid, firstName: 'Siva', lastName: 'P', email: 'a@x.test', role: 'TENANT_ADMIN' });
  await col('whatsappbroadcasts').insertOne({ _id: bId, tenantId: tid, templateName: 'bda_hiring', audience: '69 pasted numbers', total: 3, createdAt: sentAt });
  await col('whatsappmessagelogs').insertMany(['919000000011', '919000000012', '919000000013'].map((to) => ({ tenantId: tid, broadcastId: bId, to, templateName: 'bda_hiring', status: 'read', createdAt: sentAt })));
  await col('leads').insertMany([
    // Made by the bot when they replied to the hiring message
    { tenantId: tid, name: 'Hire One', phone: '919000000011', source: 'whatsapp', archivedAt: null, createdAt: new Date(sentAt.getTime() + 3600_000) },
    { tenantId: tid, name: 'Hire Two', phone: '919000000012', source: 'whatsapp', archivedAt: null, createdAt: new Date(sentAt.getTime() + 7200_000) },
    // A real lead from before — never touched
    { tenantId: tid, name: 'Old Lead', phone: '919000000013', source: 'facebook', archivedAt: null, createdAt: new Date(sentAt.getTime() - 86400_000) },
  ]);
});
afterAll(stopMongo);

it('a hiring/wishes broadcast marks every recipient; a sales one marks nobody', async () => {
  expect(await markRepliesNotLeads(tenantId, ['9000000021', '+91 90000 00022', '9000000021'], { kind: 'hiring', templateName: 'bda_hiring' })).toBe(2);
  expect(await markRepliesNotLeads(tenantId, ['9000000023'], { kind: 'sales', templateName: 'offer' })).toBe(0);
  const t: any = await col('whatsappthreads').findOne({ tenantId: tid, phone: '919000000021' });
  expect(t.replyContext).toMatchObject({ kind: 'hiring', templateName: 'bda_hiring' });
  expect(t.replyContext.until.getTime()).toBeGreaterThan(Date.now() + 29 * 86400_000);
});

it('replies from those people stay with a person — unless they are an active lead', async () => {
  expect(await quietReason(tenantId, '919000000021')).toEqual({ kind: 'hiring', label: 'Reply to your hiring / jobs "bda_hiring"' });
  expect(await quietReason(tenantId, '919000000099')).toBeNull(); // a stranger writing in is a normal WhatsApp lead
  await col('leads').insertOne({ tenantId: tid, name: 'Now a lead', phone: '9000000022', source: 'website', archivedAt: null, createdAt: new Date() });
  expect(await quietReason(tenantId, '919000000022')).toBeNull(); // already a lead: the usual sales handling applies
  await col('whatsappthreads').updateOne({ tenantId: tid, phone: '919000000021' }, { $set: { 'replyContext.until': new Date(Date.now() - 1000) } });
  expect(await quietReason(tenantId, '919000000021')).toBeNull(); // the 30 days are over
});

it('students and placement candidates who are not leads are never sent to the bot', async () => {
  await col('whatsappthreads').insertOne({ tenantId: tid, phone: '919000000031', links: { userId: new mongoose.Types.ObjectId(), userName: 'Stu' } });
  expect(await quietReason(tenantId, '919000000031')).toEqual({ kind: 'student', label: 'Existing student' });
});

it('cleanup for an old broadcast: mark it hiring, list and archive only the leads its replies created', async () => {
  const before = await replyLeads(tenantId, String(bId));
  expect(before.map((l) => l.name)).toEqual(['Hire One', 'Hire Two']);
  const r = await setBroadcastPurpose(tenantId, String(bId), 'hiring');
  expect(r).toMatchObject({ purpose: 'hiring', recipients: 3 });
  expect(await quietReason(tenantId, '919000000011')).toBeNull(); // still an active lead until archived
  const a = await archiveReplyLeads(tenantId, String(admin), String(bId));
  expect(a).toMatchObject({ archived: 2 });
  expect((await col('leads').findOne({ name: 'Hire One' }))!.archivedAt).toBeTruthy();
  expect((await col('leads').findOne({ name: 'Old Lead' }))!.archivedAt).toBeNull();
  expect(await col('leadarchiveruns').countDocuments({ tenantId: tid, kind: 'archive', processed: 2 })).toBe(1);
  // Archived and marked hiring: their next reply stays in the inbox, and does not bring the lead back.
  expect(await quietReason(tenantId, '919000000011')).toMatchObject({ kind: 'hiring' });
  expect(await replyLeads(tenantId, String(bId))).toEqual([]);
});

it('changing it back to sales removes the mark', async () => {
  await setBroadcastPurpose(tenantId, String(bId), 'sales');
  expect(await col('whatsappthreads').countDocuments({ tenantId: tid, 'replyContext.broadcastId': bId })).toBe(0);
});
