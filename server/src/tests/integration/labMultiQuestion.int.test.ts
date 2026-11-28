/**
 * Several questions on one day of a lab track (2026-11-28), for both labs, against a real database.
 *
 * A track day held exactly one question. Now a day holds up to five; students get them in order; the
 * day counts (streak, gate, Progress) only when all of them are answered.
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
import CommunicationJob from '../../models/CommunicationJob';
import CommunicationStreak from '../../models/CommunicationStreak';
import ThinkingProblem from '../../models/ThinkingProblem';
import DailyChallenge from '../../models/DailyChallenge';
import { LabTrack, LabTrackItem, LabTrackAssignment, ensureLabTrackItemIndexes } from '../../models/LabTrack';
import { setTrackItems, getTrack, listTracks, labProgress, labStudentProgress } from '../../controllers/labTrackController';
import CommunicationAttempt from '../../models/CommunicationAttempt';
import { getToday as commToday, processRecording } from '../../controllers/communicationController';
import { getToday as thinkToday, nextChallenge } from '../../controllers/thinkingLabController';
import { resolveLabDay, labDayStatus } from '../../services/labTrackService';
import { resolveLabGate } from '../../services/labGateService';

jest.setTimeout(180_000);

const TODAY = new Date(Date.now() + 5.5 * 3600 * 1000).toISOString().slice(0, 10);
let TENANT: string; let BATCH: any; let STUDENT: string;

const fakeRes = () => {
  const r: any = { statusCode: 200, body: null, headersSent: false };
  r.status = (c: number) => { r.statusCode = c; return r; };
  r.json = (b: any) => { r.body = b; r.headersSent = true; return r; };
  return r;
};
const admin = () => ({ user: { tenantId: TENANT, id: String(new mongoose.Types.ObjectId()), role: 'TENANT_ADMIN' } });
const student = (extra: any = {}) => ({ tenantId: TENANT, user: { id: STUDENT, role: 'STUDENT', tenantId: TENANT }, query: { date: TODAY }, params: {}, body: {}, ...extra }) as any;
const call = async (fn: any, req: any) => { const res = fakeRes(); await fn(req, res); return res; };

/** A published track for `lab`, attached to the batch from today, every day a learning day. */
async function trackWith(lab: 'thinking' | 'communication', dayOne: any[], extra: any = {}) {
  const t: any = await LabTrack.create({ tenantId: TENANT, name: `${lab} plan`, lab, totalDays: 3, status: 'draft' } as any);
  const res = await call(setTrackItems, { ...admin(), params: { id: String(t._id) }, body: { days: [{ dayIndex: 1, items: dayOne }] } });
  expect(res.statusCode).toBe(200);
  await LabTrack.updateOne({ _id: t._id }, { $set: { status: 'published' } });
  await LabTrackAssignment.create({
    tenantId: TENANT, batchId: BATCH._id, trackId: t._id, lab, startDate: new Date(),
    workingDays: [0, 1, 2, 3, 4, 5, 6], window: { startTime: '00:00', endTime: '23:59', tz: 'Asia/Kolkata' }, ...extra,
  } as any);
  return t;
}

beforeAll(async () => { await startMongo(); await ensureLabTrackItemIndexes(); });
afterAll(stopMongo);
beforeEach(async () => {
  const t: any = await Tenant.create({ name: 'CodeBegun', slug: 'codebegun', adminId: new mongoose.Types.ObjectId() } as any);
  TENANT = String(t._id);
  BATCH = await Batch.create({ name: 'Batch A', tenantId: TENANT, startDate: new Date(), endDate: new Date(Date.now() + 30 * 864e5), isActive: true } as any);
  STUDENT = String((await User.create({ tenantId: TENANT, firstName: 'Asha', lastName: 'K', email: 'a@x.com', password: 'x', role: 'STUDENT', isActive: true, batchId: BATCH._id } as any))._id);
});
afterEach(async () => { jest.restoreAllMocks(); await clearCollections(); });

const commQuestions = async (n: number) => {
  const out: any[] = [];
  for (let i = 1; i <= n; i++) out.push((await CommunicationChallenge.create({ tenantId: TENANT, title: `Speak ${i}`, description: 'd', challengeType: 'project_explanation', active: true, minSeconds: 20, maxSeconds: 180 } as any)).toObject());
  return out;
};

describe('the builder', () => {
  it('saves several questions on a day, in order, and counts filled DAYS not questions', async () => {
    const qs = await commQuestions(3);
    const t: any = await LabTrack.create({ tenantId: TENANT, name: 'Plan', lab: 'communication', totalDays: 2 } as any);
    const save = (days: any[]) => call(setTrackItems, { ...admin(), params: { id: String(t._id) }, body: { days } });

    expect((await save([{ dayIndex: 1, items: qs.map(q => ({ contentId: String(q._id) })) }])).body.data).toEqual({ filledDays: 1, totalDays: 2 });
    const got = await call(getTrack, { ...admin(), params: { id: String(t._id) } });
    expect(got.body.data.items.map((i: any) => [i.dayIndex, i.position, i.content.title])).toEqual([[1, 0, 'Speak 1'], [1, 1, 'Speak 2'], [1, 2, 'Speak 3']]);
    expect(got.body.data.filledDays).toBe(1);
    const list = await call(listTracks, { ...admin(), query: {} });
    expect(list.body.data[0]).toMatchObject({ filledDays: 1, questions: 3, isComplete: false });

    // Reorder and drop one: the day is replaced as a whole.
    await save([{ dayIndex: 1, items: [{ contentId: String(qs[2]._id) }, { contentId: String(qs[0]._id) }] }]);
    expect((await LabTrackItem.find({ trackId: t._id }).sort({ position: 1 }).lean()).map((i: any) => String(i.contentId))).toEqual([String(qs[2]._id), String(qs[0]._id)]);

    expect((await save([{ dayIndex: 1, items: [{ contentId: String(qs[0]._id) }, { contentId: String(qs[0]._id) }] }])).statusCode).toBe(400);
    const six = Array.from({ length: 6 }, () => ({ contentId: String(new mongoose.Types.ObjectId()) }));
    expect((await save([{ dayIndex: 2, items: six }])).statusCode).toBe(400);
    // An empty list clears the day.
    await save([{ dayIndex: 1, items: [] }]);
    expect(await LabTrackItem.countDocuments({ trackId: t._id })).toBe(0);
  });

  it('start-up drops the old one-question-per-day index (as production has it)', async () => {
    await LabTrackItem.collection.dropIndexes().catch(() => undefined);
    await LabTrackItem.collection.createIndex({ trackId: 1, dayIndex: 1 }, { unique: true });
    await ensureLabTrackItemIndexes();
    const names = (await LabTrackItem.collection.indexes()).map((i: any) => i.name);
    expect(names).not.toContain('trackId_1_dayIndex_1');
    expect(names).toContain('trackId_1_dayIndex_1_position_1');
    const trackId = new mongoose.Types.ObjectId();
    await LabTrackItem.create([{ tenantId: TENANT, trackId, dayIndex: 1, position: 0, contentId: new mongoose.Types.ObjectId() },
      { tenantId: TENANT, trackId, dayIndex: 1, position: 1, contentId: new mongoose.Types.ObjectId() }] as any);
    expect(await LabTrackItem.countDocuments({ trackId })).toBe(2);
  });

  it('the old one-slot form still works', async () => {
    const [q] = await commQuestions(1);
    const t: any = await LabTrack.create({ tenantId: TENANT, name: 'Plan', lab: 'communication', totalDays: 2 } as any);
    const res = await call(setTrackItems, { ...admin(), params: { id: String(t._id) }, body: { items: [{ dayIndex: 2, contentId: String(q._id) }] } });
    expect(res.body.data.filledDays).toBe(1);
  });
});

describe('Communication Lab', () => {
  const deps = { transcribe: async () => ({ text: 'Good morning, my name is Asha and I explain my project clearly to the panel today.', durationSec: 45 }),
    evaluate: async () => ({ overallScore: 70, aiProvider: 'anthropic', strengths: [], areasToImprove: [] }),
    upload: (_k: string, body: any) => new Promise<void>((ok) => { body.on('end', () => ok()).on('error', () => ok()); body.resume(); }) } as any;
  const answer = async (q: any) => {
    const p = path.join(os.tmpdir(), `lm-${Date.now()}-${Math.random()}.webm`); fs.writeFileSync(p, Buffer.alloc(50_000, 1));
    const job = await CommunicationJob.create({ tenantId: TENANT, studentId: STUDENT, challengeId: String(q._id), practiceDate: TODAY });
    return processRecording({ jobId: String(job._id), tenantId: TENANT, studentId: STUDENT, challenge: q, practiceDate: TODAY, filePath: p, size: 50_000, attemptNumber: 1, labBatchId: BATCH._id } as any, deps);
  };

  it('gives the day’s questions in order, one take each, and counts the day only when all are answered', async () => {
    const qs = await commQuestions(3);
    await trackWith('communication', qs.map(q => ({ contentId: String(q._id) })), { gate: { mode: 'banner' } });

    let res = await call(commToday, student());
    expect(String(res.body.challenge._id)).toBe(String(qs[0]._id));
    expect(res.body.day).toMatchObject({ position: 1, total: 3, done: 0 });
    expect(res.body.day.questions.map((q: any) => q.status)).toEqual(['current', 'next', 'next']);
    expect(res.body).toMatchObject({ status: 'not_started', maxTakes: 1, takesUsed: 0 });

    await answer(qs[0]);
    expect(await CommunicationStreak.countDocuments({ studentId: STUDENT })).toBe(0);   // 1 of 3: not a day yet
    res = await call(commToday, student());
    expect(String(res.body.challenge._id)).toBe(String(qs[1]._id));
    expect(res.body.day).toMatchObject({ position: 2, total: 3, done: 1 });
    expect(res.body.status).toBe('not_started');
    expect((await resolveLabGate(STUDENT, TENANT)).pending.map(p => p.lab)).toEqual(['communication']);

    await answer(qs[1]);
    await answer(qs[2]);
    const st: any = await CommunicationStreak.findOne({ studentId: STUDENT }).lean();
    expect(st.currentStreak).toBe(1);
    res = await call(commToday, student());
    expect(String(res.body.challenge._id)).toBe(String(qs[2]._id));
    expect(res.body).toMatchObject({ status: 'completed', day: { position: 3, total: 3, done: 3 } });
    expect((await resolveLabGate(STUDENT, TENANT)).pending).toEqual([]);
  });

  it('a one-question day works as before (no "day" block, streak on the answer)', async () => {
    const [q] = await commQuestions(1);
    await trackWith('communication', [{ contentId: String(q._id) }]);
    const res = await call(commToday, student());
    expect(String(res.body.challenge._id)).toBe(String(q._id));
    expect(res.body.day).toBeUndefined();
    await answer(q);
    expect(await CommunicationStreak.countDocuments({ studentId: STUDENT })).toBe(1);
  });
});

describe('Thinking Lab', () => {
  it('serves the next unfinished question of the day, then says the day is done', async () => {
    const ps: any[] = [];
    for (let i = 1; i <= 2; i++) ps.push(await ThinkingProblem.create({ tenantId: TENANT, title: `Puzzle ${i}`, category: 'logic', statement: 's', difficulty: 'easy', active: true } as any));
    await trackWith('thinking', ps.map(p => ({ contentId: String(p._id), contentKind: 'problem' })));

    let res = await call(thinkToday, student());
    expect(res.body.challenge.problem.title).toBe('Puzzle 1');
    expect(res.body.day).toEqual({ position: 1, total: 2, done: 0 });

    await DailyChallenge.updateOne({ studentId: STUDENT, problemId: ps[0]._id }, { $set: { status: 'solved' } });
    const r: any = await resolveLabDay(TENANT, String(BATCH._id), 'thinking');
    expect(await labDayStatus('thinking', STUDENT, r, TODAY)).toEqual({ total: 2, done: 1, complete: false });

    res = await call(nextChallenge, student());
    expect(res.body.challenge.problem.title).toBe('Puzzle 2');
    expect(res.body.day).toEqual({ position: 2, total: 2, done: 1 });
    expect(await DailyChallenge.countDocuments({ studentId: STUDENT, date: TODAY })).toBe(2);

    await DailyChallenge.updateOne({ studentId: STUDENT, problemId: ps[1]._id }, { $set: { status: 'submitted' } });
    expect((await labDayStatus('thinking', STUDENT, r, TODAY)).complete).toBe(true);
    res = await call(nextChallenge, student());
    expect(res.body).toMatchObject({ challenge: null, dayComplete: true });
    expect(res.body.message).toMatch(/all 2 of today/);
    // Opening the lab again shows the last one, done.
    res = await call(thinkToday, student());
    expect(res.body.challenge.problem.title).toBe('Puzzle 2');
    expect(res.body.day).toEqual({ position: 2, total: 2, done: 2 });
  });
});

describe('Progress tab', () => {
  const ago = (n: number) => new Date(Date.parse(`${TODAY}T00:00:00Z`) - n * 864e5).toISOString().slice(0, 10);
  const answered = (studentId: string, q: any, date: string) => CommunicationAttempt.create({
    tenantId: TENANT, studentId, challengeId: q._id, challengeTitle: q.title, challengeType: q.challengeType, practiceDate: date,
    status: 'completed', recordingType: 'video', evaluation: { overallScore: 64 },
  } as any);

  it('counts a day done only with all its questions; lists every batch; follows the date range; one student day by day', async () => {
    const qs = await commQuestions(2);
    const t: any = await LabTrack.create({ tenantId: TENANT, name: 'Speak plan', lab: 'communication', totalDays: 10, status: 'published' } as any);
    const days = Array.from({ length: 10 }, (_, i) => ({ dayIndex: i + 1, items: qs.map(q => ({ contentId: String(q._id) })) }));
    await call(setTrackItems, { ...admin(), params: { id: String(t._id) }, body: { days } });
    // Started 4 days ago, every day a learning day → days 1..5, today is day 5.
    const start = new Date(Date.now() - 4 * 864e5);
    await LabTrackAssignment.create({ tenantId: TENANT, batchId: BATCH._id, trackId: t._id, lab: 'communication', startDate: start, workingDays: [0, 1, 2, 3, 4, 5, 6] } as any);
    const B2: any = await Batch.create({ name: 'Batch B', tenantId: TENANT, startDate: new Date(), endDate: new Date(Date.now() + 30 * 864e5), isActive: true } as any);
    const ravi = String((await User.create({ tenantId: TENANT, firstName: 'Ravi', lastName: 'B', email: 'r@x.com', password: 'x', role: 'STUDENT', isActive: true, batchId: B2._id } as any))._id);
    await LabTrackAssignment.create({ tenantId: TENANT, batchId: B2._id, trackId: t._id, lab: 'communication', startDate: start, workingDays: [0, 1, 2, 3, 4, 5, 6] } as any);

    // Asha: 4 days ago both (done), 3 days ago one (partly), today both (done). Ravi: nothing.
    await answered(STUDENT, qs[0], ago(4)); await answered(STUDENT, qs[1], ago(4));
    await answered(STUDENT, qs[0], ago(3));
    await answered(STUDENT, qs[0], TODAY); await answered(STUDENT, qs[1], TODAY);

    const prog = (q: any) => call(labProgress, { ...admin(), query: { lab: 'communication', ...q } });
    let res = await prog({ batchId: String(BATCH._id) });
    const asha = res.body.data.students[0];
    expect(asha).toMatchObject({ completed: 2, partial: 1, expected: 5, missed: 3, rate: 40, doneToday: true, today: { done: 2, total: 2 }, status: 'done_today' });
    expect(res.body.data).toMatchObject({ expected: 5, summary: { students: 1, doneToday: 1 } });

    res = await prog({ batchId: 'all' });
    expect(res.body.data.students.map((r: any) => [r.name, r.batchName, r.status])).toEqual([['Ravi B', 'Batch B', 'never'], ['Asha K', 'Batch A', 'done_today']]);
    expect(res.body.data.batches.map((b: any) => [b.batchName, b.students, b.questionsToday])).toEqual([['Batch A', 1, 2], ['Batch B', 1, 2]]);
    expect(res.body.data.summary).toMatchObject({ students: 2, never: 1 });

    // Only the two oldest days.
    res = await prog({ batchId: String(BATCH._id), from: ago(4), to: ago(3) });
    expect(res.body.data.students[0]).toMatchObject({ completed: 1, partial: 1, expected: 2, doneToday: false, today: null });

    const one = await call(labStudentProgress, { ...admin(), query: { lab: 'communication', studentId: STUDENT } });
    expect(one.body.data.summary).toEqual({ expected: 5, done: 2, partial: 1, missed: 2 });
    expect(one.body.data.days.map((d: any) => [d.date, d.status, d.done, d.total])).toEqual([
      [TODAY, 'done', 2, 2], [ago(1), 'missed', 0, 2], [ago(2), 'missed', 0, 2], [ago(3), 'partial', 1, 2], [ago(4), 'done', 2, 2],
    ]);
    expect(one.body.data.days[3].questions).toEqual([
      { title: 'Speak 1', done: true, score: 64, solved: undefined }, { title: 'Speak 2', done: false, score: null, solved: undefined },
    ]);

    // Excel download.
    const x: any = fakeRes(); x.setHeader = jest.fn(); x.send = jest.fn((b: any) => { x.body = b; return x; });
    await labProgress({ ...admin(), query: { lab: 'communication', batchId: 'all', format: 'xlsx' } } as any, x);
    expect(x.setHeader).toHaveBeenCalledWith('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    expect(Buffer.isBuffer(x.body) && x.body.length > 100).toBe(true);

    // Another institute's student is not shown.
    const other = await call(labStudentProgress, { user: { tenantId: String(new mongoose.Types.ObjectId()) }, query: { lab: 'communication', studentId: STUDENT } });
    expect(other.statusCode).toBe(404);
  });
});
