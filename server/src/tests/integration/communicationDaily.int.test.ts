/**
 * LMS Communication Lab daily question (2026-11-27): one take, scoring in the background with a job the page
 * follows, and today's question still shown (as done) after a track/scheduled question is answered.
 * Against a real database; the speech service, AI and storage are stand-ins.
 */
import mongoose from 'mongoose';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { startMongo, stopMongo, clearCollections } from './mongoHarness';
import Tenant from '../../models/Tenant';
import Batch from '../../models/Batch';
import User from '../../models/User';
import CommunicationChallenge from '../../models/CommunicationChallenge';
import CommunicationSchedule from '../../models/CommunicationSchedule';
import CommunicationAttempt from '../../models/CommunicationAttempt';
import CommunicationJob from '../../models/CommunicationJob';
import * as bunny from '../../services/bunnyStorageService';
import { getToday, submit, getJob, processRecording, takesAllowed, expireStaleJobs } from '../../controllers/communicationController';

jest.setTimeout(120_000);

const istToday = () => {
  const ist = new Date(Date.now() + 5.5 * 3600 * 1000);
  return ist.toISOString().slice(0, 10);
};
const TODAY = istToday();

let TENANT: string; let STUDENT: string; let OTHER: string; let CH: any;

const fakeRes = () => {
  const r: any = { statusCode: 200, body: null, headersSent: false };
  r.status = (c: number) => { r.statusCode = c; return r; };
  r.json = (b: any) => { r.body = b; r.headersSent = true; return r; };
  return r;
};
const reqFor = (studentId: string, extra: any = {}) => ({ tenantId: TENANT, user: { id: studentId, role: 'STUDENT' }, query: { date: TODAY }, params: {}, body: {}, ...extra }) as any;

const tmpFile = () => { const p = path.join(os.tmpdir(), `comm-${Date.now()}-${Math.random()}.webm`); fs.writeFileSync(p, Buffer.alloc(50_000, 1)); return p; };
const goodEval = (score: number) => ({
  overallScore: score, confidenceScore: score, clarityScore: score, fluencyScore: score, grammarScore: score,
  strengths: ['Clear opening'], areasToImprove: ['Slow down'], aiProvider: 'anthropic', aiModel: 'test',
}) as any;
const deps = (over: any = {}) => ({
  transcribe: async () => ({ text: 'Good morning, my name is Asha and I explain my project clearly to the panel today.', durationSec: 45 }),
  evaluate: async () => goodEval(72),
  upload: (_k: string, body: any) => new Promise<void>((ok) => { body.on('end', () => ok()).on('error', () => ok()); body.resume(); }),
  ...over,
}) as any;

async function runJob(studentId: string, over: any = {}) {
  const job = await CommunicationJob.create({ tenantId: TENANT, studentId, challengeId: String(CH._id), practiceDate: TODAY });
  const attempt = await processRecording({
    jobId: String(job._id), tenantId: TENANT, studentId, challenge: CH, practiceDate: TODAY,
    filePath: tmpFile(), size: 50_000, attemptNumber: 1,
  }, deps(over));
  return { job: await CommunicationJob.findById(job._id).lean() as any, attempt };
}

beforeAll(startMongo);
afterAll(stopMongo);
beforeEach(async () => {
  const t: any = await Tenant.create({ name: 'CodeBegun', slug: 'codebegun', adminId: new mongoose.Types.ObjectId() } as any);
  TENANT = String(t._id);
  const b: any = await Batch.create({ name: 'Batch A', tenantId: TENANT, startDate: new Date(), endDate: new Date(Date.now() + 30 * 864e5), isActive: true } as any);
  STUDENT = String((await User.create({ tenantId: TENANT, firstName: 'Asha', lastName: 'K', email: 'a@x.com', password: 'x', role: 'STUDENT', isActive: true, batchId: b._id } as any))._id);
  OTHER = String((await User.create({ tenantId: TENANT, firstName: 'Ravi', lastName: 'K', email: 'r@x.com', password: 'x', role: 'STUDENT', isActive: true, batchId: b._id } as any))._id);
  // A question from the lab schedule, NOT tagged to the batch: the case that used to break "today" after answering.
  CH = (await CommunicationChallenge.create({ tenantId: TENANT, title: 'Explain your project', description: 'Two minutes on your main project.', challengeType: 'project_explanation', active: true, maxAttempts: 2, minSeconds: 20, maxSeconds: 180 } as any)).toObject();
  await CommunicationSchedule.create({ tenantId: TENANT, batchId: b._id, date: TODAY, challengeId: CH._id } as any);
});
afterEach(async () => { jest.restoreAllMocks(); await clearCollections(); });

describe('today’s question', () => {
  it('is offered with one take, and after answering still shows the same question as done', async () => {
    let res = fakeRes();
    await getToday(reqFor(STUDENT), res);
    expect(res.statusCode).toBe(200);
    expect(String(res.body.challenge._id)).toBe(String(CH._id));
    expect(res.body).toMatchObject({ status: 'not_started', maxTakes: 1, takesUsed: 0, pendingJob: null });

    const { job, attempt } = await runJob(STUDENT);
    expect(job).toMatchObject({ status: 'done', stage: 'saving' });
    expect(String(job.attemptId)).toBe(String((attempt as any)._id));

    res = fakeRes();
    await getToday(reqFor(STUDENT), res);
    expect(res.statusCode).toBe(200);
    expect(String(res.body.challenge._id)).toBe(String(CH._id));
    expect(res.body).toMatchObject({ status: 'completed', takesUsed: 1, todaysAttemptId: String((attempt as any)._id) });
  });

  it('shows "being scored" while a job runs, so a reload brings the progress bar back', async () => {
    const job = await CommunicationJob.create({ tenantId: TENANT, studentId: STUDENT, challengeId: String(CH._id), practiceDate: TODAY, stage: 'analysing' });
    const res = fakeRes();
    await getToday(reqFor(STUDENT), res);
    expect(res.body.status).toBe('evaluating');
    expect(res.body.pendingJob).toMatchObject({ _id: String(job._id), stage: 'analysing', status: 'running' });
  });
});

describe('scoring in the background', () => {
  it('a silent recording fails the job, creates no answer and does not use the take', async () => {
    const { job, attempt } = await runJob(STUDENT, { transcribe: async () => ({ text: 'you you', durationSec: 30 }) });
    expect(attempt).toBeNull();
    expect(job.status).toBe('failed');
    expect(job.message).toMatch(/could not hear your voice/);
    expect(await CommunicationAttempt.countDocuments({})).toBe(0);
    const res = fakeRes();
    await getToday(reqFor(STUDENT), res);
    expect(res.body).toMatchObject({ status: 'not_started', takesUsed: 0 });
    expect(res.body.lastFailure).toMatch(/could not hear your voice/);
  });

  it('when the AI cannot score, the student never gets a report of zeros', async () => {
    const { job, attempt } = await runJob(STUDENT, { evaluate: async () => ({ ...goodEval(0), aiProvider: '' }) });
    expect(attempt).toBeNull();
    expect(job.status).toBe('failed');
    expect(job.message).toMatch(/AI could not score/);
  });

  it('a storage failure fails the job cleanly', async () => {
    const { job } = await runJob(STUDENT, { upload: async () => { throw new Error('bunny down'); } });
    expect(job.status).toBe('failed');
    expect(await CommunicationAttempt.countDocuments({})).toBe(0);
  });

  it('a job left running by a server restart is failed after 10 minutes', async () => {
    const job = await CommunicationJob.create({ tenantId: TENANT, studentId: STUDENT, challengeId: String(CH._id), practiceDate: TODAY });
    await CommunicationJob.collection.updateOne({ _id: job._id }, { $set: { updatedAt: new Date(Date.now() - 11 * 60 * 1000) } });
    await expireStaleJobs(TENANT, STUDENT);
    expect((await CommunicationJob.findById(job._id).lean() as any).status).toBe('failed');
  });

  it('the page reads the job, and the finished report, only for its own student', async () => {
    const { job } = await runJob(STUDENT);
    let res = fakeRes();
    await getJob(reqFor(STUDENT, { params: { id: String(job._id) } }), res);
    expect(res.body.job).toMatchObject({ status: 'done', message: null });
    expect(res.body.attempt.evaluation.overallScore).toBe(72);
    expect(res.body.attempt.recordingKey).toBeUndefined();

    res = fakeRes();
    await getJob(reqFor(OTHER, { params: { id: String(job._id) } }), res);
    expect(res.statusCode).toBe(404);
  });
});

describe('sending', () => {
  const send = async (studentId: string) => {
    const res = fakeRes();
    await submit(reqFor(studentId, { file: { path: tmpFile(), size: 50_000, mimetype: 'video/webm', originalname: 'a.webm' }, body: { challengeId: String(CH._id), recordingType: 'video', practiceDate: TODAY } }), res);
    return res;
  };

  it('returns at once with a job; a second send after answering is refused (one take)', async () => {
    jest.spyOn(bunny, 'isBunnyStorageConfigured').mockReturnValue(true);
    const first = await send(STUDENT);
    expect(first.statusCode).toBe(202);
    expect(first.body.job).toMatchObject({ status: 'running', stage: 'transcribing' });

    // While it is still being scored, another send is refused too.
    const during = await send(STUDENT);
    expect([409, 202]).toContain(during.statusCode);

    // Let the background run finish (the real speech service is absent here, so it fails as silence).
    for (let i = 0; i < 50 && (await CommunicationJob.countDocuments({ status: 'running' })); i++) await new Promise(r => setTimeout(r, 100));

    await runJob(STUDENT); // now a scored answer exists
    const again = await send(STUDENT);
    expect(again.statusCode).toBe(429);
    expect(again.body.message).toMatch(/already answered today/);
  });

  it('LMS students get one take; a CareerPilot member keeps the question’s own limit', () => {
    expect(takesAllowed({ batchId: 'b' }, { maxAttempts: 2 })).toBe(1);
    expect(takesAllowed({}, { maxAttempts: 3 })).toBe(3);
    expect(takesAllowed({}, {})).toBe(2);
  });
});
