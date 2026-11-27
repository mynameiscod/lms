/**
 * Callyzer → leads. A counsellor's phone call lands on its lead: it completes the "Call started" entry
 * from the Call button (never a second call), later deliveries add the recording to the same entry,
 * calls to numbers that are not leads are never stored, and the person's own outcome beats the guess.
 */
import mongoose from 'mongoose';
import { startMongo, stopMongo, ensureIndexes } from './mongoHarness';
import CallyzerCall from '../../models/CallyzerCall';
import * as settings from '../../services/settingsService';
import { ingest, callsFromWebhook, callMoment, normalise, callForRecordingLink, NormCall } from '../../services/callyzerService';
import { logCallClick, addLeadActivity } from '../../controllers/leadController';

jest.setTimeout(240_000);

const oid = () => new mongoose.Types.ObjectId();
const tenant = oid(); const ana = oid(); const stage = oid();
const T = String(tenant);
const fakeRes = () => { const r: any = {}; r.json = (b: any) => { r.body = b; return r; }; r.status = (c: number) => { r.code = c; return r; }; return r; };
const reqFor = (leadId: any, body: any = {}) => ({ user: { id: String(ana), role: 'TENANT_ADMIN' }, tenantId: T, params: { leadId: String(leadId) }, body } as any);
const leads = () => mongoose.connection.collection('leads');

async function newLead(phone: string) {
  const l: any = { _id: oid(), tenantId: tenant, name: 'Lead ' + phone, phone, stageId: stage, assignedTo: ana, archivedAt: null, createdAt: new Date(Date.now() - 3600_000), activities: [] };
  await leads().insertOne(l);
  return l;
}

/** A call as the phone reports it, `minAgo` minutes ago in Indian time. */
function phoneCall(id: string, client: string, over: Partial<NormCall> = {}): NormCall {
  return { callyzerId: id, empName: 'Ana', empNumber: '9811111111', clientNumber: client, callType: 'Outgoing', durationSec: 70, callAt: new Date(), ...over };
}

beforeAll(async () => {
  await startMongo();
  await ensureIndexes([CallyzerCall]);
  await mongoose.connection.collection('users').insertOne({ _id: ana, tenantId: tenant, firstName: 'Ana', lastName: 'Rao', email: 'ana@x.in', role: 'TENANT_ADMIN', phone: '+91 98111 11111', isActive: true });
  await settings.loadAll();
});
afterAll(stopMongo);

describe('reading Callyzer', () => {
  it('reads call date and time as Indian time', () => {
    expect(callMoment('2026-11-23', '17:49:41')!.toISOString()).toBe('2026-11-23T12:19:41.000Z');
    expect(callMoment('bad', '10:00')).toBeUndefined();
  });

  it('reads the webhook body: employees with their call logs, duration as text', () => {
    const calls = callsFromWebhook([{ emp_name: 'Ana', emp_number: '9811111111', call_logs: [
      { id: 'A1', client_number: '9000000001', duration: '30', call_type: 'Incoming', call_date: '2026-11-23', call_time: '10:00:00', call_recording_url: 'https://media1.callyzer.co/x.mp3' },
    ] }]);
    expect(calls).toHaveLength(1);
    expect(calls[0]).toMatchObject({ callyzerId: 'A1', empNumber: '9811111111', durationSec: 30, callType: 'Incoming', recordingUrl: 'https://media1.callyzer.co/x.mp3' });
    expect(normalise({ id: 'B', duration: 5, call_recording_url: null })!.recordingUrl).toBeUndefined();
  });
});

describe('calls on leads', () => {
  it('a number that is not a lead is ignored and never stored', async () => {
    const r = await ingest(T, [phoneCall('X1', '9999999999')], 'webhook');
    expect(r).toEqual({ received: 1, matched: 0, ignored: 1 });
    expect(await CallyzerCall.countDocuments({ callyzerId: 'X1' })).toBe(0);
  });

  it('after pressing Call, the phone call completes the same entry; the recording arriving later joins it', async () => {
    const l = await newLead('+91 90000 00002'.replace(/\s/g, ''));
    await logCallClick(reqFor(l._id), fakeRes());

    const r = await ingest(T, [phoneCall('C1', '919000000002', { durationSec: 250 })], 'webhook');
    expect(r.matched).toBe(1);
    let doc: any = await leads().findOne({ _id: l._id });
    expect(doc.activities).toHaveLength(1);
    const a = doc.activities[0];
    expect(a.callOutcome).toBe('connected');
    expect(a.callDuration).toBe(250);
    expect(a.metadata.callyzerId).toBe('C1');
    expect(a.metadata.callyzerAutoOutcome).toBe(true);
    expect(a.description).toContain('4m 10s');
    expect(doc.lastCallOutcome).toBe('connected');
    expect((await CallyzerCall.findOne({ callyzerId: 'C1' }).lean())!.matchedBy).toBe('click');

    // The sync job sees the same call again, now with its recording.
    await ingest(T, [phoneCall('C1', '919000000002', { durationSec: 250, recordingUrl: 'https://media1.callyzer.co/c1.mp3' })], 'api');
    doc = await leads().findOne({ _id: l._id });
    expect(doc.activities).toHaveLength(1);
    expect(doc.activities[0].recordingUrl).toMatch(/^\/api\/v1\/public\/callyzer\/recordings\/[a-f0-9]{24}\/[a-f0-9]{32}$/);
    const [, , , , , , id, sig] = doc.activities[0].recordingUrl.split('/');
    expect(await callForRecordingLink(id, sig)).toBeTruthy();
    expect(await callForRecordingLink(id, '0'.repeat(32))).toBeNull();
    expect(await CallyzerCall.countDocuments({ callyzerId: 'C1' })).toBe(1);
  });

  it('the counsellor\'s own answer to "How did the call go?" replaces the guess, still one call', async () => {
    const l = await newLead('9000000003');
    await logCallClick(reqFor(l._id), fakeRes());
    await ingest(T, [phoneCall('C2', '9000000003', { durationSec: 0 })], 'webhook');
    let doc: any = await leads().findOne({ _id: l._id });
    expect(doc.activities[0].callOutcome).toBe('not_answered');

    const save = fakeRes();
    await addLeadActivity(reqFor(l._id, { type: 'call', description: 'Line was busy', callOutcome: 'busy' }), save);
    expect(save.body.success).toBe(true);
    doc = await leads().findOne({ _id: l._id });
    expect(doc.activities).toHaveLength(1);
    expect(doc.activities[0].callOutcome).toBe('busy');
    expect(doc.activities[0].description).toBe('Line was busy');
    expect(doc.activities[0].metadata.callyzerId).toBe('C2');
    expect(doc.activities[0].metadata.callyzerAutoOutcome).toBe(false);
  });

  it('a call made straight from the phone (no Call press) gets its own entry under the counsellor', async () => {
    const l = await newLead('9000000004');
    await ingest(T, [phoneCall('C3', '9000000004', { durationSec: 0 })], 'api');
    const doc: any = await leads().findOne({ _id: l._id });
    expect(doc.activities).toHaveLength(1);
    expect(doc.activities[0]).toMatchObject({ type: 'call', callOutcome: 'not_answered', callDuration: 0 });
    expect(String(doc.activities[0].createdBy)).toBe(String(ana));
    expect(doc.telecallerMetrics.firstCallAt).toBeTruthy();
    expect((await CallyzerCall.findOne({ callyzerId: 'C3' }).lean())!.matchedBy).toBe('new');
  });

  it('a missed call from a lead is shown but is not counted as the counsellor\'s work', async () => {
    const l = await newLead('9000000005');
    await ingest(T, [phoneCall('C4', '9000000005', { callType: 'Missed', durationSec: 0 })], 'webhook');
    const doc: any = await leads().findOne({ _id: l._id });
    expect(doc.activities).toHaveLength(1);
    expect(doc.activities[0].callOutcome).toBeUndefined();
    expect(doc.activities[0].metadata.automation).toBe('callyzer-missed');
    expect(doc.activities[0].description).toContain('Missed call');
    expect(doc.telecallerMetrics).toBeUndefined();
  });

  it('the webhook and the sync job delivering the same call at once add it once', async () => {
    const l = await newLead('9000000006');
    await Promise.all([
      ingest(T, [phoneCall('C5', '9000000006')], 'webhook'),
      ingest(T, [phoneCall('C5', '9000000006')], 'api'),
    ]);
    const doc: any = await leads().findOne({ _id: l._id });
    expect(doc.activities).toHaveLength(1);
  });
});

describe('sandbox window', () => {
  it('reads the allowed dates from the sandbox error, in Indian time', () => {
    const { allowedWindow } = require('../../services/callyzerService');
    const w = allowedWindow('Data can only be accessed from 2026-11-23 to 2026-12-07. Make sure your dates are within this range.');
    expect(new Date(w.from * 1000).toISOString()).toBe('2026-11-22T18:30:00.000Z');
    expect(new Date((w.to + 1) * 1000).toISOString()).toBe('2026-12-07T18:30:00.000Z');
    expect(allowedWindow('Your subscription has expired.')).toBeNull();
  });
});
