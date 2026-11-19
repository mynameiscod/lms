/**
 * Delivery log numbers (2026-11-19): totals by outcome over a period, the change against the
 * period before, failure reasons with advice, invalid numbers, and the message filters.
 */
import mongoose from 'mongoose';
import { startMongo, stopMongo } from './mongoHarness';
import { deliverySummary, listMessages } from '../../services/whatsAppDeliveryService';

jest.setTimeout(240_000);
const tid = new mongoose.Types.ObjectId();
const H = 3600_000;
const at = (h: number) => new Date(Date.now() - h * H);
const row = (o: any) => ({ tenantId: tid, templateName: 'cb_batch_update_announcement', source: 'broadcast', status: 'read', to: '919876500001', createdAt: at(1), updatedAt: at(1), ...o });

beforeAll(async () => {
  await startMongo();
  await mongoose.connection.db!.collection('whatsappmessagelogs').insertMany([
    row({ status: 'read' }), row({ status: 'read', to: '919876500002' }), row({ status: 'delivered', to: '919876500003' }),
    row({ status: 'accepted', to: '919876500004', source: 'system', templateName: 'cb_otp' }),
    row({ status: 'failed', errorCode: 131049, to: '919876500005' }), row({ status: 'failed', errorCode: 131049, to: '919876500006' }),
    row({ status: 'failed', errorCode: 131026, to: '91987650007' }), // 11 digits — a typo
    row({ status: 'read', createdAt: at(30) }), // yesterday: outside a 1-day window, inside 7
    row({ status: 'read', createdAt: at(40) }), // previous period for 1 day
    row({ tenantId: new mongoose.Types.ObjectId(), status: 'failed', errorCode: 131049 }), // another institute
  ]);
});
afterAll(stopMongo);

it('counts every outcome for the period and compares with the period before', async () => {
  const s = await deliverySummary(String(tid), 1);
  expect(s).toMatchObject({ days: 1, total: 7, delivered: 3, read: 2, failed: 3, pending: 1, prevTotal: 2, badNumbers: 1 });
  expect(s.reasons[0]).toMatchObject({ code: 131049, count: 2, templates: ['cb_batch_update_announcement'] });
  expect(s.reasons[0].advice).toMatch(/UTILITY/);
  expect(s.reasons.find((r) => r.code === 131026)!.advice).toMatch(/10 digits/);
  expect((await deliverySummary(String(tid), 7)).total).toBe(9);
});

it('filters the log by outcome, source, period and text', async () => {
  const ids = async (q: any) => (await listMessages(String(tid) as any, { limit: 100, ...q })).length;
  expect(await ids({ status: 'delivered', days: 1 })).toBe(3);
  expect(await ids({ status: 'pending' })).toBe(1);
  expect(await ids({ source: 'system' })).toBe(1);
  expect(await ids({ q: 'otp' })).toBe(1);
  expect(await ids({ q: '500005' })).toBe(1);
  expect(await ids({ days: 1 })).toBe(7);
});
