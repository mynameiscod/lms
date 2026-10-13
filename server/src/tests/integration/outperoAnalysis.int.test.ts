/**
 * Outpero call recordings and what is made of them: the copy that has to be taken before the
 * 24-hour link dies, the transcript and write-up for answered calls, and who may see and play them
 * from a lead. Real database; storage, the speech-to-text call and the AI are stood in for.
 */
import express from 'express';
import mongoose from 'mongoose';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { Readable } from 'stream';
import { startMongo, stopMongo, clearCollections } from './mongoHarness';

jest.setTimeout(180_000);
process.env.JWT_SECRET = process.env.JWT_SECRET || 'outpero-analysis-integration-test-secret-0123456789abcdef';

const values: Record<string, string> = {};
jest.mock('../../services/settingsService', () => ({
  getStr: (k: string, fallback = '') => values[k] ?? fallback,
  getNum: (k: string, fallback: number) => (values[k] ? Number(values[k]) : fallback),
  setMany: jest.fn(), get: (k: string) => values[k], source: () => 'tenant', loadAll: jest.fn(),
}));
const stored = new Map<string, Buffer>();
let storageOn = true;
jest.mock('../../services/bunnyStorageService', () => ({
  isBunnyStorageConfigured: () => storageOn,
  uploadFile: async (key: string, body: Buffer) => { stored.set(key, body); },
  getFileStream: async (key: string) => { const b = stored.get(key); if (!b) throw new Error('missing'); return { stream: Readable.from([b]), size: b.length }; },
  deleteFile: async () => {},
}));
const ai = jest.fn();
jest.mock('../../services/aiGateway', () => ({ aiComplete: (...a: any[]) => ai(...a), recordUsage: jest.fn(async () => {}) }));
const whisper = jest.fn();
jest.mock('axios', () => ({ __esModule: true, default: { post: (...a: any[]) => whisper(...a) } }));
const fetchMock = jest.fn();
(global as any).fetch = (...a: any[]) => fetchMock(...a);

import Lead from '../../models/Lead';
import LeadStage from '../../models/LeadStage';
import User from '../../models/User';
import Role from '../../models/Role';
import Tenant from '../../models/Tenant';
import OutperoCall from '../../models/OutperoCall';
import * as an from '../../services/outperoCallAnalysisService';
import { receiveCall } from '../../services/outperoCallService';
import leadRoutes from '../../routes/leadRoutes';

const app = express();
app.use(express.json());
app.use('/leads', leadRoutes);

const live = () => { const d = new Date(Date.now() - 3600_000).toISOString().replace(/[-:]/g, '').slice(0, 15) + 'Z'; return `https://r2.test/rec/a.mp3?X-Amz-Date=${d}&X-Amz-Expires=86400&X-Amz-Signature=x`; };
const dead = () => { const d = new Date(Date.now() - 30 * 3600_000).toISOString().replace(/[-:]/g, '').slice(0, 15) + 'Z'; return `https://r2.test/rec/b.mp3?X-Amz-Date=${d}&X-Amz-Expires=86400&X-Amz-Signature=x`; };
const audio = (ok = true) => fetchMock.mockImplementation(async () => (ok ? { ok: true, status: 200, headers: { get: () => null }, arrayBuffer: async () => Buffer.from('MP3DATA').buffer.slice(0) } : { ok: false, status: 403, headers: { get: () => null } }));
const ANALYSIS = JSON.stringify({ summary: 'Final-year B.Tech student wants the Java Full Stack course and asked for fees on WhatsApp.', intent: 'high', course: 'Java Full Stack', background: 'B.Tech 2026', timing: 'wants to start next month', budget: 'asked about fees', objections: ['wants EMI'], nextStep: 'Send fee details and book a demo', callbackWhen: 'evening', language: 'Telugu and English' });

let T: any; let stage: any; let admin: any; let tele: any; let other: any; let lead: any;
const tokens: Record<string, string> = {};
const tok = (u: any) => jwt.sign({ id: String(u._id), email: u.email, role: u.role, tenantId: String(T._id) }, process.env.JWT_SECRET as string);

beforeAll(async () => {
  await startMongo();
});
afterAll(async () => { await stopMongo(); });
beforeEach(async () => {
  await clearCollections();
  for (const k of Object.keys(values)) delete values[k];
  stored.clear(); storageOn = true; whisper.mockReset(); ai.mockReset(); fetchMock.mockReset();
  values.OPENAI_API_KEY = 'sk-test';
  T = await Tenant.create({ name: 'Calls', slug: 'calls', domain: 'calls.test', isActive: true, adminId: new mongoose.Types.ObjectId() } as any);
  stage = await LeadStage.create({ tenantId: T._id, name: 'New Lead', order: 1, color: '#000', isActive: true, createdBy: new mongoose.Types.ObjectId() } as any);
  const leadRole = await Role.create({ name: 'Telecaller', permissions: ['view_leads'], tenantId: T._id } as any);
  const mk = (email: string, role: string, extra: any = {}) => User.create({ tenantId: T._id, firstName: email.split('@')[0], lastName: 'T', email, password: 'x', role, isActive: true, ...extra } as any);
  admin = await mk('admin@calls.test', 'TENANT_ADMIN');
  tele = await mk('tele@calls.test', 'STAFF', { customRoleId: leadRole._id });
  other = await mk('other@calls.test', 'STAFF', { customRoleId: leadRole._id });
  const student: any = await mk('student@calls.test', 'STUDENT');
  tokens.admin = tok(admin); tokens.tele = tok(tele); tokens.other = tok(other); tokens.student = tok(student);
  lead = await Lead.create({ tenantId: T._id, name: 'Varsha Mocharla', phone: '9866185686', source: 'meta_form', stageId: stage._id, createdBy: admin._id, assignedTo: tele._id, courseInterest: [],
    aiCallLogs: [{ attemptNumber: 1, callSid: 'c-long', startedAt: new Date(), outcome: 'answered' }] } as any);
});

/** A call that arrived a minute ago: the database stamps new rows with now, so backdate it directly. */
const mkCall = async (o: any = {}) => {
  const c: any = await mkCallRow(o);
  await OutperoCall.collection.updateOne({ _id: c._id }, { $set: { updatedAt: new Date(Date.now() - 60_000) } });
  return c;
};
const mkCallRow = (o: any = {}) => OutperoCall.create({ tenantId: T._id, callId: 'c-long', leadId: lead._id, phone: '+919866185686', status: 'completed', outcome: 'interested', durationSec: 43, summary: 'The caller engaged and wants details.', recordingUrl: live(), deliveries: 2, ...o });
const get = (path: string, who: string) => (request(app) as any).get(path).set('Authorization', `Bearer ${tokens[who]}`).set('X-Tenant-Id', String(T._id));

describe('reading Outpero deliveries', () => {
  it('takes the duration from duration_s and treats the times as UTC', async () => {
    const r = await receiveCall(String(T._id), { event: 'call.ended', call_id: 'real-1', to_number: '+919866185686', status: 'completed', duration_s: '43', started_at: '2026-10-13T13:10:06.425699', ended_at: '2026-10-13T13:10:49.425699', outcome: 'interested', summary: 'x', recording_url: live() });
    expect(r.matched).toBe(true);
    const c: any = await OutperoCall.findOne({ callId: 'real-1' }).lean();
    expect(c.durationSec).toBe(43);
    expect(c.startedAt.toISOString()).toBe('2026-10-13T13:10:06.425Z');
  });
});

describe('the 24-hour link', () => {
  it('knows when a signed link stops working', () => {
    expect(an.linkIsLive(live())).toBe(true);
    expect(an.linkIsLive(dead())).toBe(false);
    expect(an.linkIsLive('https://example.test/plain.mp3')).toBe(true);
    expect(an.linkIsLive('')).toBe(false);
    expect(an.linkExpiry(live())!.getTime()).toBeGreaterThan(Date.now());
  });

  it('copies recent recordings into our storage, once, and gives up on a dead link', async () => {
    audio(true);
    const good = await mkCall({ callId: 'good' });
    const old = await mkCall({ callId: 'old', recordingUrl: dead() });
    expect(await an.rescueRecordings()).toBe(1);
    expect(stored.size).toBe(1);
    const g: any = await OutperoCall.findById(good._id).lean();
    expect(g.recordingKey).toBeTruthy(); expect(g.actions).toContain('recording_saved');
    const o: any = await OutperoCall.findById(old._id).lean();
    expect(o.recordingKey).toBeFalsy(); expect(o.recordingError).toMatch(/expired/);
    expect(await an.rescueRecordings()).toBe(0);
  });

  it('retries a copy that failed, and says why on the call', async () => {
    audio(false);
    const c = await mkCall({ callId: 'flaky' });
    expect(await an.rescueRecordings()).toBe(0);
    let row: any = await OutperoCall.findById(c._id).lean();
    expect(row.recordingAttempts).toBe(1); expect(row.recordingError).toMatch(/403/);
    audio(true);
    expect(await an.rescueRecordings()).toBe(1);
    row = await OutperoCall.findById(c._id).lean();
    expect(row.recordingKey).toBeTruthy(); expect(row.recordingError).toBeUndefined();
  });

  it('does nothing when file storage is not set up', async () => {
    storageOn = false; audio(true);
    await mkCall();
    expect(await an.rescueRecordings()).toBe(0);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('listening to a call', () => {
  const speak = () => { audio(true); whisper.mockResolvedValue({ data: { text: 'Hello this is Sunitha from CodeBegun. I want the Java Full Stack course, please send fees on WhatsApp.', duration: 43 } }); ai.mockResolvedValue('```json\n' + ANALYSIS + '\n```'); };

  it('writes a transcript and a full summary onto the call and the lead, once', async () => {
    speak();
    const c: any = await mkCall();
    expect(await an.analyseCall(c._id)).toBe('done');
    const call: any = await OutperoCall.findById(c._id).lean();
    expect(call.transcript).toContain('Java Full Stack');
    expect(call.analysis).toMatchObject({ intent: 'high', course: 'Java Full Stack', objections: ['wants EMI'] });
    expect(call.actions).toContain('analysed');
    const l: any = await Lead.findById(lead._id).lean();
    expect(l.aiCallLogs[0].transcript).toContain('Java Full Stack');
    expect(l.aiSummary.summary).toMatch(/Final-year B.Tech/);
    expect(l.aiSummary.keyInsights).toEqual(expect.arrayContaining(['Interest: high', 'Course: Java Full Stack', 'Concern: wants EMI']));
    expect(l.aiSummary.suggestedNextAction).toBe('Send fee details and book a demo');
    expect(l.activities.filter((a: any) => /Call summary \(from the recording\)/.test(a.description))).toHaveLength(1);
    expect(await an.analyseCall(c._id)).toBe('skipped');
    expect(whisper).toHaveBeenCalledTimes(1);
  });

  it('uses the transcript Outpero sends when it sends one, without paying to transcribe again', async () => {
    ai.mockResolvedValue(ANALYSIS);
    const c: any = await mkCall({ transcript: 'Caller: yes I am interested in Java. Please call in the evening about the fees.' });
    expect(await an.analyseCall(c._id)).toBe('done');
    expect(whisper).not.toHaveBeenCalled();
  });

  it('skips misses, voicemails, short calls and calls when analysis is switched off', async () => {
    speak();
    const missed: any = await mkCall({ callId: 'm', outcome: 'missed', durationSec: 30, summary: 'Call connected, but the caller never said anything.' });
    const voicemail: any = await mkCall({ callId: 'v', outcome: 'voicemail', status: 'voicemail', durationSec: 15 });
    const short: any = await mkCall({ callId: 's', durationSec: 7 });
    for (const c of [missed, voicemail, short]) expect(await an.analyseCall(c._id)).toBe('skipped');
    values.OUTPERO_CALL_ANALYSIS = 'false';
    const ok: any = await mkCall({ callId: 'ok' });
    expect(await an.analyseCall(ok._id)).toBe('skipped');
    expect(whisper).not.toHaveBeenCalled();
  });

  it('marks calls with nothing to write up so the job never looks at them again, and works through the rest', async () => {
    speak();
    await mkCall({ callId: 'm1', outcome: 'missed', durationSec: 12 });
    await mkCall({ callId: 'real' });
    expect(await an.processPendingAnalysis()).toBe(1);
    expect((await OutperoCall.findOne({ callId: 'm1' }).lean() as any).analysisSkipped).toBe(true);
    expect((await OutperoCall.findOne({ callId: 'real' }).lean() as any).analysis).toBeTruthy();
    expect(await an.processPendingAnalysis()).toBe(0);
  });

  it('records why it could not, and stops after three tries', async () => {
    audio(true); whisper.mockRejectedValue(new Error('quota exceeded'));
    const c: any = await mkCall();
    for (let i = 0; i < 4; i++) {
      await an.processPendingAnalysis();
      // A failed call is not retried at once; let a minute pass before the next run.
      await OutperoCall.collection.updateOne({ _id: c._id }, { $set: { updatedAt: new Date(Date.now() - 60_000) } });
    }
    const row: any = await OutperoCall.findById(c._id).lean();
    expect(row.analysisAttempts).toBe(3); expect(row.analysisError).toMatch(/quota/);
    expect(whisper).toHaveBeenCalledTimes(3);
  });

  it('copes with a reply that is not JSON', async () => {
    audio(true); whisper.mockResolvedValue({ data: { text: 'A long enough conversation about the Java course and the fees.', duration: 30 } }); ai.mockResolvedValue('Sorry, I cannot do that.');
    const c: any = await mkCall();
    expect(await an.analyseCall(c._id)).toBe('failed');
    expect((await OutperoCall.findById(c._id).lean() as any).analysis).toBeUndefined();
  });

  it('parses the summary leniently', () => {
    expect(an.parseAnalysis('{"summary":"ok","intent":"weird"}')).toMatchObject({ summary: 'ok', intent: 'low', objections: [] });
    expect(an.parseAnalysis('not json')).toBeNull();
    expect(an.parseAnalysis('{"intent":"high"}')).toBeNull();
  });
});

describe('on the lead page', () => {
  it('lists the calls with their write-up, and only for people who may open the lead', async () => {
    await mkCall({ analysis: JSON.parse(ANALYSIS), transcript: 'Caller: hello', variables: { demo_mode: 'online', college: '' } });
    const asTele = await get(`/leads/${lead._id}/ai-calls`, 'tele');
    expect([asTele.status, asTele.body.message]).toEqual([200, undefined]);
    expect(asTele.body.data[0]).toMatchObject({ callId: 'c-long', outcome: 'interested', durationSec: 43, recording: 'link', analysis: { intent: 'high' }, transcript: 'Caller: hello', captured: { demo_mode: 'online' } });
    expect(asTele.body.data[0].captured.college).toBeUndefined();
    expect((await get(`/leads/${lead._id}/ai-calls`, 'admin')).status).toBe(200);
    expect((await get(`/leads/${lead._id}/ai-calls`, 'other')).status).toBe(404);
    expect((await get(`/leads/${lead._id}/ai-calls`, 'student')).status).toBe(403);
  });

  it('plays our own copy, or Outpero while its link works, and says plainly when neither is left', async () => {
    await mkCall({ callId: 'mine', recordingKey: 'outpero-recordings/x/mine' }); stored.set('outpero-recordings/x/mine', Buffer.from('OURS'));
    const mine = await get(`/leads/${lead._id}/ai-calls/mine/recording`, 'tele');
    expect([mine.status, String(mine.headers['content-type'])]).toEqual([200, 'audio/mpeg']);
    expect(Buffer.from(mine.body).toString() || mine.text).toBeTruthy();
    audio(true); await mkCall({ callId: 'link' });
    expect((await get(`/leads/${lead._id}/ai-calls/link/recording`, 'tele')).status).toBe(200);
    await mkCall({ callId: 'gone', recordingUrl: dead() });
    const gone = await get(`/leads/${lead._id}/ai-calls/gone/recording`, 'tele');
    expect(gone.status).toBe(410); expect(gone.body.message).toMatch(/expired/);
    const list = (await get(`/leads/${lead._id}/ai-calls`, 'admin')).body.data;
    expect(list.find((c: any) => c.callId === 'gone').recording).toBe('expired');
    expect(list.find((c: any) => c.callId === 'mine').recording).toBe('stored');
    expect((await get(`/leads/${lead._id}/ai-calls/mine/recording`, 'other')).status).toBe(404);
  });
});
