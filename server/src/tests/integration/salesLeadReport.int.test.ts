/**
 * Sales Teams lead report (2026-11-24): New today / Follow-ups & overdue / All / Probables, each with the
 * count of every stage and sub-stage; who sees which leads; marking a lead probable for a batch.
 */
import mongoose from 'mongoose';
import { startMongo, stopMongo } from './mongoHarness';
import Lead from '../../models/Lead';
import LeadStage from '../../models/LeadStage';
import LeadSubStage from '../../models/LeadSubStage';
import LeadProbable from '../../models/LeadProbable';
import { SalesTeam } from '../../models/SalesTeam';
import * as svc from '../../services/salesTeamService';
import * as report from '../../services/salesLeadReport';
import { istDay, istRange } from '../../utils/istTime';

jest.setTimeout(240_000);
const tid = new mongoose.Types.ObjectId();
const db = () => mongoose.connection.db!;
const ids: Record<string, mongoose.Types.ObjectId> = {};
const V = (key: string, isAdmin = false): svc.Viewer => ({ userId: String(ids[key]), tenantId: String(tid), isAdmin });

describe('Sales lead report', () => {
  const today = istDay();
  const { start } = istRange(today, today);
  const at = (h: number) => new Date(start.getTime() + h * 3600_000);
  let sNew: any, sContact: any, sEnrolled: any, subBusy: any, subNoAns: any, batch1: any, batch2: any;

  beforeAll(async () => {
    await startMongo();
    await LeadProbable.syncIndexes();
    for (const k of ['boss', 'mgr', 'bda1', 'bda2', 'outsider']) {
      ids[k] = new mongoose.Types.ObjectId();
      await db().collection('users').insertOne({ _id: ids[k], tenantId: tid, role: 'STAFF', firstName: k, lastName: 'K', email: `${k}@x.in`, isActive: true });
    }
    await SalesTeam.create({ tenantId: tid, name: 'Team Ravi', managerId: ids.mgr, memberIds: [ids.bda1, ids.bda2] });
    sNew = await LeadStage.create({ tenantId: tid, name: 'New', color: '#00f', order: 1, milestone: 'new' } as any);
    sContact = await LeadStage.create({ tenantId: tid, name: 'Contacting', color: '#f80', order: 2, milestone: 'none' } as any);
    sEnrolled = await LeadStage.create({ tenantId: tid, name: 'Enrolled', color: '#0a0', order: 3, milestone: 'enrolled' } as any);
    subBusy = await LeadSubStage.create({ tenantId: tid, stageId: sContact._id, name: 'Busy', order: 1 });
    subNoAns = await LeadSubStage.create({ tenantId: tid, stageId: sContact._id, name: 'No answer', order: 2 });
    batch1 = (await db().collection('batches').insertOne({ tenantId: tid, name: 'Java Dec', startDate: new Date(start.getTime() + 10 * 86400_000), endDate: new Date(start.getTime() + 100 * 86400_000), isActive: true, timings: [] })).insertedId;
    batch2 = (await db().collection('batches').insertOne({ tenantId: tid, name: 'Python Jan', startDate: new Date(start.getTime() + 40 * 86400_000), endDate: new Date(start.getTime() + 140 * 86400_000), isActive: true, timings: [] })).insertedId;

    const mk = (name: string, owner: string, extra: any = {}) => new Lead({ tenantId: tid, name, phone: `9${Math.floor(Math.random() * 1e9)}`, source: 'walkin', createdBy: ids.mgr, assignedTo: ids[owner], ...extra } as any).save();
    // bda1: two new today (one created earlier and reassigned today), one due today, one overdue, one enrolled with an old follow-up.
    await mk('Asha', 'bda1', { stageId: sNew._id, assignment: { assignedTo: ids.bda1, assignedAt: at(9) } });
    await mk('Bala', 'bda1', { stageId: sContact._id, subStageId: subBusy._id, createdAt: new Date(start.getTime() - 5 * 86400_000), assignment: { assignedTo: ids.bda1, assignedAt: at(10) } });
    await mk('Chitra', 'bda1', { stageId: sContact._id, subStageId: subNoAns._id, assignment: { assignedTo: ids.bda1, assignedAt: new Date(start.getTime() - 3 * 86400_000) }, nextFollowUp: at(15) });
    await mk('Deepa', 'bda1', { stageId: sContact._id, subStageId: subBusy._id, assignment: { assignedTo: ids.bda1, assignedAt: new Date(start.getTime() - 3 * 86400_000) }, nextFollowUp: new Date(start.getTime() - 86400_000) });
    await mk('Esha', 'bda1', { stageId: sEnrolled._id, assignment: { assignedTo: ids.bda1, assignedAt: new Date(start.getTime() - 9 * 86400_000) }, nextFollowUp: new Date(start.getTime() - 2 * 86400_000) });
    // bda2: one new today with no stage, one overdue.
    await db().collection('leads').insertOne({ tenantId: tid, name: 'Farah', phone: '9111', source: 'walkin', assignedTo: ids.bda2, archivedAt: null, createdAt: at(11), updatedAt: at(11) }); // old data: no stage
    await mk('Gita', 'bda2', { stageId: sContact._id, assignment: { assignedTo: ids.bda2, assignedAt: new Date(start.getTime() - 86400_000) }, nextFollowUp: new Date(start.getTime() - 3600_000) });
    // Someone in no team: never in the report.
    await mk('Hari', 'outsider', { stageId: sNew._id, assignment: { assignedTo: ids.outsider, assignedAt: at(9) } });
  });
  afterAll(stopMongo);

  it('New today: assigned today (reassigned flagged), with stage and sub-stage counts', async () => {
    const r: any = await report.leadReport(V('mgr'), { view: 'new' });
    expect(r.as).toBe('manager');
    expect(r.rows.map((x: any) => x.name).sort()).toEqual(['Asha', 'Bala', 'Farah']);
    expect(r.rows.find((x: any) => x.name === 'Bala')).toMatchObject({ reassigned: true, stage: { name: 'Contacting' }, subStage: { name: 'Busy' } });
    expect(r.rows.find((x: any) => x.name === 'Asha').reassigned).toBe(false);
    const count = (n: string) => r.stages.find((s: any) => s.name === n);
    expect(count('New').count).toBe(1);
    expect(count('Contacting')).toMatchObject({ count: 1, subStages: [{ name: 'Busy', count: 1 }, { name: 'No answer', count: 0 }] });
    expect(count('No stage').count).toBe(1);
    expect(r.tabs).toMatchObject({ new: 3, dueToday: 1, overdue: 2, followups: 3, all: 7, probables: 0 });
    expect(r.members.find((m: any) => m.userId === String(ids.bda1))).toMatchObject({ new: 2, dueToday: 1, overdue: 1, all: 5 });
  });

  it('Follow-ups: due today + overdue for open leads only; split and stage filter', async () => {
    const all: any = await report.leadReport(V('mgr'), { view: 'followups' });
    expect(all.rows.map((x: any) => x.name)).toEqual(['Deepa', 'Gita', 'Chitra']); // oldest follow-up first; enrolled Esha left out
    expect(all.rows[0].followUp).toBe('overdue');
    const od: any = await report.leadReport(V('mgr'), { view: 'followups', due: 'overdue' });
    expect(od.rows.map((x: any) => x.name)).toEqual(['Deepa', 'Gita']);
    const busy: any = await report.leadReport(V('mgr'), { view: 'followups', stageId: String(sContact._id), subStageId: String(subBusy._id) });
    expect(busy.rows.map((x: any) => x.name)).toEqual(['Deepa']);
    expect(busy.stages.find((s: any) => s.name === 'Contacting').count).toBe(3); // counts ignore the stage filter
    const noSub: any = await report.leadReport(V('mgr'), { view: 'followups', stageId: String(sContact._id), subStageId: 'none' });
    expect(noSub.rows.map((x: any) => x.name)).toEqual(['Gita']);
  });

  it('who sees what: member only their own, manager the team, admin every team, never people outside teams', async () => {
    const mine: any = await report.leadReport(V('bda2'), { view: 'all' });
    expect(mine.as).toBe('member');
    expect(mine.rows.map((x: any) => x.name).sort()).toEqual(['Farah', 'Gita']);
    expect(mine.members).toBeNull();
    await expect(report.leadReport(V('bda2'), { view: 'all', userId: String(ids.bda1) })).rejects.toThrow(/not in your report/);
    await expect(report.leadReport(V('outsider'), { view: 'all' })).rejects.toThrow(/sales team members/);
    const admin: any = await report.leadReport(V('boss', true), { view: 'all' });
    expect(admin.total).toBe(7);
    const one: any = await report.leadReport(V('mgr'), { view: 'all', userId: String(ids.bda2), q: 'gi' });
    expect(one.rows.map((x: any) => x.name)).toEqual(['Gita']);
  });

  it('probables: mark for a batch, move it, group by batch start, joined from the stage, scope enforced', async () => {
    const [asha, chitra, esha, hari]: any[] = await Promise.all(['Asha', 'Chitra', 'Esha', 'Hari'].map((n) => Lead.findOne({ name: n }).lean()));
    const batches = await report.probableBatches(V('bda1'));
    expect(batches.map((b: any) => b.name)).toEqual(['Java Dec', 'Python Jan']);
    await report.markProbable(V('bda1'), String(asha._id), { batchId: String(batch2), chance: 'high', note: 'weekend' });
    await report.markProbable(V('bda1'), String(asha._id), { batchId: String(batch1), chance: 'high' }); // moved, not duplicated
    await report.markProbable(V('mgr'), String(chitra._id), { batchId: String(batch1) });
    await report.markProbable(V('bda1'), String(esha._id), { batchId: String(batch2), chance: 'low' });
    await expect(report.markProbable(V('bda2'), String(asha._id), { batchId: String(batch1) })).rejects.toThrow(/own team/);
    await expect(report.markProbable(V('mgr'), String(hari._id), { batchId: String(batch1) })).rejects.toThrow(/own team/);
    expect(await LeadProbable.countDocuments({ tenantId: tid })).toBe(3);

    const r: any = await report.leadReport(V('mgr'), { view: 'probables' });
    expect(r.tabs.probables).toBe(3);
    expect(r.batches).toEqual([
      expect.objectContaining({ name: 'Java Dec', count: 2, high: 1, joined: 0 }),
      expect.objectContaining({ name: 'Python Jan', count: 1, joined: 1 }),
    ]);
    expect(r.rows.map((x: any) => x.name)).toEqual(['Asha', 'Chitra', 'Esha']); // soonest batch first
    expect(r.rows[0].probable).toMatchObject({ batchName: 'Java Dec', chance: 'high', markedByName: 'bda1 K' });
    const jan: any = await report.leadReport(V('mgr'), { view: 'probables', batchId: String(batch2) });
    expect(jan.rows.map((x: any) => x.name)).toEqual(['Esha']);
    expect(jan.rows[0].probable.joined).toBe(true);

    await report.unmarkProbable(V('bda1'), String(esha._id));
    expect((await report.leadReport(V('bda1'), { view: 'probables' })).tabs.probables).toBe(2);
  });

  it('Worked today: new leads plus older ones the person worked on, counted for whoever did the work', async () => {
    const act = (type: string, by: string, when: Date, extra: any = {}) => ({ _id: new mongoose.Types.ObjectId(), type, description: extra.description || `${type} entry`, createdBy: ids[by], createdAt: when, ...extra });
    const push = (name: string, ...acts: any[]) => db().collection('leads').updateOne({ tenantId: tid, name }, { $push: { activities: { $each: acts } } } as any);
    // bda1 calls an older lead (connected) and moves it; sends a WhatsApp on bda2's lead.
    await push('Chitra', act('call', 'bda1', at(12), { callOutcome: 'connected' }), act('status_change', 'bda1', at(12.1)));
    await push('Gita', act('whatsapp', 'bda1', at(13)));
    // An automatic entry written as bda1 is not work; a call yesterday is not today.
    await push('Deepa', act('note', 'bda1', at(14), { description: '🤖 Workflow message sent' }));
    await push('Esha', act('call', 'bda1', new Date(start.getTime() - 86400_000)));
    // bda2 marks a follow-up done on an older lead.
    await push('Esha', act('note', 'bda2', at(15), { description: '✅ Follow-up done: call back' }));

    const r: any = await report.leadReport(V('mgr'), { view: 'worked' });
    expect(r.rows.map((x: any) => x.name).sort()).toEqual(['Asha', 'Bala', 'Chitra', 'Esha', 'Farah', 'Gita']);
    expect(r.tabs).toMatchObject({ worked: 6, workedNew: 3 });
    const count = (n: string) => r.stages.find((s: any) => s.name === n);
    expect(count('Contacting')).toMatchObject({ count: 3, subStages: [{ name: 'Busy', count: 1 }, { name: 'No answer', count: 1 }, { name: 'No sub-stage', count: 1 }] });
    expect(count('New').count).toBe(1);
    expect(count('Enrolled').count).toBe(1);
    expect(count('No stage').count).toBe(1);
    expect(r.members.find((m: any) => m.userId === String(ids.bda1))).toMatchObject({ worked: 4, workedNew: 2 });
    expect(r.members.find((m: any) => m.userId === String(ids.bda2))).toMatchObject({ worked: 2, workedNew: 1 });
    const chitra = r.rows.find((x: any) => x.name === 'Chitra');
    expect(chitra.doneToday).toMatchObject({ isNew: false, calls: 1, connected: 1, stageMoves: 1, by: ['bda1 K'] });
    expect(r.rows.find((x: any) => x.name === 'Asha').doneToday.isNew).toBe(true);
    expect(r.rows.find((x: any) => x.name === 'Esha').doneToday).toMatchObject({ followUpsDone: 1, calls: 0 });

    // A member sees the leads they worked on, including a teammate's lead they messaged.
    const mine: any = await report.leadReport(V('bda1'), { view: 'worked' });
    expect(mine.rows.map((x: any) => x.name).sort()).toEqual(['Asha', 'Bala', 'Chitra', 'Gita']);
    expect(mine.rows.find((x: any) => x.name === 'Gita').doneToday).toMatchObject({ whatsapp: 1 });
    // The stage filter narrows the list but not the counts; search works too.
    const busy: any = await report.leadReport(V('mgr'), { view: 'worked', stageId: String(sContact._id), subStageId: String(subBusy._id) });
    expect(busy.rows.map((x: any) => x.name)).toEqual(['Bala']);
    expect(busy.tabs.worked).toBe(6);
    expect((await report.leadReport(V('mgr'), { view: 'worked', q: 'chit' })).rows.map((x: any) => x.name)).toEqual(['Chitra']);
    // Yesterday: bda1's call on Esha, and Gita, assigned to bda2 yesterday.
    const y = istDay(new Date(start.getTime() - 3600_000));
    expect((await report.leadReport(V('mgr'), { view: 'worked', day: y })).tabs.worked).toBe(2);
  });
});
