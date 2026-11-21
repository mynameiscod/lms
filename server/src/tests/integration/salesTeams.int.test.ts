/**
 * Sales Teams (2026-11-21): one manager + members, an automatic daily report per member from the CRM,
 * a manager review, the member's end-of-day note, managers seeing their members' leads, and an alert
 * when a lead is assigned.
 */
import mongoose from 'mongoose';
import { startMongo, stopMongo } from './mongoHarness';
import Lead from '../../models/Lead';
import FollowUpReminder from '../../models/FollowUpReminder';
import Notification from '../../models/Notification';
import { SalesTeam, DailyTeamReport, SalesAssignAlert } from '../../models/SalesTeam';
import * as svc from '../../services/salesTeamService';
import { analyseDay } from '../../services/salesDayAnalysis';
import { buildLeadScopeFilter } from '../../middleware/leadScope';
import { istDay, istRange } from '../../utils/istTime';

jest.setTimeout(240_000);
const tid = new mongoose.Types.ObjectId();
const db = () => mongoose.connection.db!;
const ids: Record<string, mongoose.Types.ObjectId> = {};

async function staff(key: string, role = 'STAFF') {
  const _id = new mongoose.Types.ObjectId();
  ids[key] = _id;
  await db().collection('users').insertOne({ _id, tenantId: tid, role, firstName: key, lastName: 'K', email: `${key}@x.in`, isActive: true });
  return String(_id);
}
const analyse = async (userId: string, now: Date) => (await analyseDay(String(tid), [userId], istDay(), { rows: true, now })).get(userId)!;
const V = (key: string, isAdmin = false): svc.Viewer => ({ userId: String(ids[key]), tenantId: String(tid), isAdmin });

describe('Sales Teams', () => {
  let teamId: string;
  const today = istDay();
  const { start } = istRange(today, today);
  const at = (h: number) => new Date(start.getTime() + h * 3600_000); // hours after IST midnight

  beforeAll(async () => {
    await startMongo();
    await SalesTeam.syncIndexes();
    await DailyTeamReport.syncIndexes();
    await SalesAssignAlert.syncIndexes();
    for (const k of ['boss', 'mgr', 'mgr2', 'bda1', 'bda2', 'bda3']) await staff(k);
    await db().collection('users').updateOne({ _id: ids.boss }, { $set: { role: 'SUPER_ADMIN' } });
  });
  afterAll(stopMongo);

  it('team rules: one level, one team per member, staff only', async () => {
    await expect(svc.saveTeam(String(tid), { name: 'Alpha', managerId: ids.mgr, memberIds: [ids.mgr] }, '')).rejects.toThrow(/cannot also be a member/);
    await expect(svc.saveTeam(String(tid), { name: 'Alpha', managerId: ids.mgr, memberIds: [] }, '')).rejects.toThrow(/at least one member/);
    const t: any = await svc.saveTeam(String(tid), { name: 'Team Ravi', managerId: ids.mgr, memberIds: [ids.bda1, ids.bda2] }, '');
    teamId = String(t._id);
    await expect(svc.saveTeam(String(tid), { name: 'Beta', managerId: ids.mgr2, memberIds: [ids.bda1] }, '')).rejects.toThrow(/already in Team Ravi/);
    await expect(svc.saveTeam(String(tid), { name: 'Beta', managerId: ids.bda2, memberIds: [ids.bda3] }, '')).rejects.toThrow(/one level/);
    await expect(svc.saveTeam(String(tid), { name: 'Beta', managerId: ids.mgr2, memberIds: [ids.mgr] }, '')).rejects.toThrow(/one level/);
    const stranger = new mongoose.Types.ObjectId();
    await expect(svc.saveTeam(String(tid), { name: 'Beta', managerId: ids.mgr2, memberIds: [stranger] }, '')).rejects.toThrow(/active staff/);
    const list = await svc.listTeams(String(tid));
    expect(list).toHaveLength(1);
    expect(list[0].members.map((m: any) => m.name)).toEqual(['bda1 K', 'bda2 K']);
  });

  it('counts a member\'s day around leads: grouped calls, outcomes, speed per lead, no system entries', async () => {
    const stage = new mongoose.Types.ObjectId();
    const mk = (name: string, phone: string, extra: any = {}) => new Lead({ tenantId: tid, name, phone, source: 'walkin', stageId: stage, createdBy: ids.mgr, ...extra } as any).save();
    const dial = (h: number) => ({ type: 'call', description: 'Call started (dialler opened). Outcome not recorded yet.', createdBy: ids.bda1, createdAt: at(h), metadata: { dialed: true } });
    // Asha: assigned 9:00. Call pressed at 9:03 and again at 9:05, outcome recorded 9:06 -> ONE connected call,
    // first call 3 minutes after assignment. A second call at 11:00, not answered.
    await mk('Asha', '9000000001', {
      assignedTo: ids.bda1, assignment: { assignedTo: ids.bda1, assignedAt: at(9) },
      milestones: { demoAt: at(15) },
      activities: [
        dial(9.05), dial(9.0833),
        { type: 'call', description: 'Talked, wants weekend batch', createdBy: ids.bda1, createdAt: at(9.1), callOutcome: 'connected', callDuration: 120 },
        { type: 'call', description: 'No answer', createdBy: ids.bda1, createdAt: at(11), callOutcome: 'not_answered' },
        { type: 'whatsapp', description: 'WhatsApp opened. No message sent yet.', createdBy: ids.bda1, createdAt: at(9.2), metadata: { opened: true } },
        { type: 'whatsapp', description: 'WhatsApp opened. No message sent yet.', createdBy: ids.bda1, createdAt: at(9.25), metadata: { opened: true } },
        { type: 'note', description: 'Wants weekend batch', createdBy: ids.bda1, createdAt: at(9.6) },
        // Written by the system under her name: never counted.
        { type: 'note', description: '✅ Follow-up done: Follow up with Asha.', createdBy: ids.bda1, createdAt: at(9.7) },
        { type: 'note', description: '⚠️ No call or note by the assigned owner 60 minutes after this lead was assigned.', createdBy: ids.bda1, createdAt: at(10) },
        { type: 'whatsapp', description: '[AUTO DRIP] New Lead: Hello', createdBy: ids.bda1, createdAt: at(10.5) },
        { type: 'note', description: '🤖 Workflow note', createdBy: ids.bda1, createdAt: at(10.6), metadata: { workflowId: 'w1' } },
      ],
    });
    // Bala: assigned 10:00, never called.
    await mk('Bala', '9000000002', { assignedTo: ids.bda1, assignment: { assignedTo: ids.bda1, assignedAt: at(10) } });
    // Chitra: an older lead. Call pressed at 12:00, no outcome recorded; stage moved.
    await mk('Chitra', '9000000003', {
      assignedTo: ids.bda1, assignment: { assignedTo: ids.bda1, assignedAt: new Date(start.getTime() - 86400_000) },
      activities: [
        dial(12),
        { type: 'status_change', description: 'Moved to Contacting', createdBy: ids.bda1, createdAt: at(12.1) },
        { type: 'call', description: 'Yesterday', createdBy: ids.bda1, createdAt: new Date(start.getTime() - 3600_000), callOutcome: 'connected' }, // not today
      ],
    });
    // Deepa: assigned 13:00, first call 13:40 (late), no outcome.
    await mk('Deepa', '9000000004', { assignedTo: ids.bda1, assignment: { assignedTo: ids.bda1, assignedAt: at(13) }, activities: [dial(13 + 40 / 60)] });
    await FollowUpReminder.create([
      { tenantId: tid, leadId: new mongoose.Types.ObjectId(), assignedTo: ids.bda1, createdBy: ids.mgr, type: 'call', title: 'F1', scheduledAt: at(8), status: 'completed', completedAt: at(9) },
      { tenantId: tid, leadId: new mongoose.Types.ObjectId(), assignedTo: ids.bda1, createdBy: ids.mgr, type: 'call', title: 'F2', scheduledAt: at(1), status: 'scheduled' },
      { tenantId: tid, leadId: new mongoose.Types.ObjectId(), assignedTo: ids.bda1, createdBy: ids.mgr, type: 'call', title: 'F3', scheduledAt: new Date(start.getTime() - 86400_000), status: 'scheduled' },
      // The automatic "call this new lead" task is left out: speed to call already measures it.
      { tenantId: tid, leadId: new mongoose.Types.ObjectId(), assignedTo: ids.bda1, createdBy: ids.mgr, type: 'call', title: 'Call Bala', scheduledAt: at(10.5), status: 'scheduled', automationKey: 'first-contact:x' },
    ] as any);

    const m = (await svc.computeMetrics(String(tid), [String(ids.bda1)], today, at(23))).get(String(ids.bda1))!;
    expect(m).toMatchObject({
      v: 2,
      calls: 4, leadsCalled: 3, connected: 1, notConnected: 1, outcomeMissing: 2, talkSeconds: 120,
      outcomes: { connected: 1, not_answered: 1 },
      whatsapp: 1, leadsMessaged: 1, notes: 1,
      newAssigned: 3, calledWithin5: 1, calledWithin30: 0, calledLate: 1, notCalled: 1, avgFirstCallMin: 22,
      leadsWorked: 3, stageMoves: 1, leadsMovedForward: 1, demos: 1,
      followUpsDue: 2, followUpsDone: 1, followUpsMissed: 1, carriedOver: 1,
    });

    // One row per lead: the not-called new lead first, then new leads in the order they came, then the rest.
    const day = await analyse(String(ids.bda1), at(23));
    expect(day.rows.map((r: any) => r.name)).toEqual(['Bala', 'Asha', 'Deepa', 'Chitra']);
    const asha = day.rows.find((r: any) => r.name === 'Asha');
    expect(asha).toMatchObject({ isNew: true, minutesToCall: 3, calls: 2, connectedCalls: 1, lastOutcome: 'not_answered', whatsapp: 1, notes: 1 });
    expect(asha.entries.filter((e: any) => e.system)).toHaveLength(4);
    expect(day.rows.find((r: any) => r.name === 'Deepa')).toMatchObject({ minutesToCall: 40, lastOutcome: 'missing' });
    expect(day.rows.find((r: any) => r.name === 'Bala')).toMatchObject({ firstCallAt: null, calls: 0, waitingMin: 13 * 60 });
    expect(day.rows.find((r: any) => r.name === 'Chitra')).toMatchObject({ isNew: false, minutesToCall: null, calls: 1, lastOutcome: 'missing' });
  });

  it('a manager sees their members\' leads; a member sees only their own', async () => {
    const asUser = (key: string) => ({ user: { id: String(ids[key]), role: 'STAFF', tenantId: String(tid) }, tenantId: String(tid) } as any);
    const mgrScope: any = await buildLeadScopeFilter(asUser('mgr'));
    expect(mgrScope.assignedTo.$in.map(String).sort()).toEqual([ids.mgr, ids.bda1, ids.bda2].map(String).sort());
    const bdaScope: any = await buildLeadScopeFilter(asUser('bda1'));
    const bdaIds = bdaScope.assignedTo?.$in ? bdaScope.assignedTo.$in.map(String) : [String(bdaScope.assignedTo)];
    expect(bdaIds).toEqual([String(ids.bda1)]);
    expect(await Lead.countDocuments({ tenantId: tid, ...mgrScope })).toBe(4);
  });

  it('access: the manager and the member, not another manager', async () => {
    await expect(svc.teamDay(V('mgr2'), teamId)).rejects.toThrow(/manager/);
    await expect(svc.memberDay(V('bda2'), String(ids.bda1))).rejects.toThrow(/own team/);
    const view: any = await svc.teamDay(V('mgr'), teamId);
    expect(view.live).toBe(true);
    expect(view.members).toHaveLength(2);
    expect(view.totals.calls).toBe(4);
    expect(view.totals.notCalled).toBe(1);
    expect((await svc.teamDay(V('boss', true), teamId)).members).toHaveLength(2);
    const mine: any = await svc.memberDay(V('bda1'), String(ids.bda1));
    expect(mine.isSelf).toBe(true);
    expect(mine.canReview).toBe(false);
    expect(mine.leads).toHaveLength(4);
    expect(mine.trend).toHaveLength(7);
  });

  it('targets: team default, a member\'s own replaces it', async () => {
    await svc.saveTargets(V('mgr'), teamId, { defaultTargets: { calls: 60, demos: 2 }, memberTargets: [{ userId: ids.bda2, targets: { calls: 40 } }] });
    const view: any = await svc.teamDay(V('mgr'), teamId);
    const t = Object.fromEntries(view.members.map((m: any) => [m.user.name, m.targets]));
    expect(t['bda1 K']).toEqual({ calls: 60, demos: 2 });
    expect(t['bda2 K']).toEqual({ calls: 40 });
    await expect(svc.saveTargets(V('mgr'), teamId, { defaultTargets: { calls: -1 } })).rejects.toThrow(/0 to 1000/);
  });

  it('end-of-day note, the 9 PM save, review, and the note locks', async () => {
    await expect(svc.saveNote(V('mgr'), { done: 'x' })).rejects.toThrow(/not in a sales team/);
    await svc.saveNote(V('bda1'), { done: '22 calls, 1 demo booked', blockers: 'Leads not picking up after 6 PM' });
    expect(await svc.snapshotDay(today, { announce: true })).toBe(2);
    const saved: any = await DailyTeamReport.findOne({ userId: ids.bda1, day: today }).lean();
    expect(saved.metrics.calls).toBe(4);
    expect(saved.metrics.v).toBe(2);
    expect(saved.note.done).toContain('22 calls');
    expect(saved.targets.calls).toBe(60);
    expect(await Notification.countDocuments({ userId: ids.mgr, title: /reports are ready/ })).toBe(1);

    // Yesterday's report (past days always open for review).
    const yesterday = istDay(new Date(Date.now() - 86400_000));
    await expect(svc.reviewMember(V('bda2'), String(ids.bda1), { day: yesterday, rating: 'good' })).rejects.toThrow();
    await expect(svc.reviewMember(V('mgr'), String(ids.bda1), { day: yesterday })).rejects.toThrow(/rating/);
    await svc.reviewMember(V('mgr'), String(ids.bda1), { day: yesterday, rating: 'needs_work', comment: 'Call the untouched leads first' });
    const r: any = await DailyTeamReport.findOne({ userId: ids.bda1, day: yesterday }).lean();
    expect(r.review).toMatchObject({ status: 'reviewed', rating: 'needs_work', byName: 'mgr K' });
    expect(r.generatedAt).toBeTruthy(); // saved on review, so the review sits on real numbers
    expect(await Notification.countDocuments({ userId: ids.bda1, title: /reviewed: Needs work/ })).toBe(1);
    await expect(svc.saveNote(V('bda1'), { day: yesterday, done: 'late edit' })).rejects.toThrow(/locked/);
    const hist = await svc.myHistory(V('bda1'));
    expect(hist.find((h: any) => h.day === yesterday)!.review.status).toBe('reviewed');
  });

  it('admin overview lists every team with totals and a review grid', async () => {
    await expect(svc.overview(String(tid))).resolves.toBeTruthy();
    const o: any = await svc.overview(String(tid));
    expect(o.teams).toHaveLength(1);
    expect(o.teams[0].totals.calls).toBe(4);
    expect(o.teams[0].reviewGrid).toHaveLength(7);
  });

  it('alerts each new assignment once, not self-assignments', async () => {
    const stage = new mongoose.Types.ObjectId();
    const now = new Date();
    await new Lead({ tenantId: tid, name: 'Deepa', phone: '9000000010', source: 'walkin', stageId: stage, createdBy: ids.mgr, assignedTo: ids.bda2, assignment: { assignedTo: ids.bda2, assignedBy: ids.mgr, assignedAt: now } } as any).save();
    await new Lead({ tenantId: tid, name: 'Self', phone: '9000000011', source: 'walkin', stageId: stage, createdBy: ids.bda3, assignedTo: ids.bda3, assignment: { assignedTo: ids.bda3, assignedBy: ids.bda3, assignedAt: now } } as any).save();
    expect(await svc.alertNewAssignments(now)).toBe(1);
    expect(await svc.alertNewAssignments(now)).toBe(0); // once only
    const n: any = await Notification.findOne({ userId: ids.bda2, title: /New lead assigned: Deepa/ }).lean();
    expect(n.link).toMatch(/^\/leads\//);
    expect(await Notification.countDocuments({ userId: ids.bda3 })).toBe(0);
  });

  it('removing a team keeps its reports and frees the members', async () => {
    await svc.removeTeam(String(tid), teamId);
    expect(await svc.listTeams(String(tid))).toHaveLength(0);
    expect(await DailyTeamReport.countDocuments({ teamId })).toBeGreaterThan(0);
    await expect(svc.saveTeam(String(tid), { name: 'New', managerId: ids.mgr2, memberIds: [ids.bda1] }, '')).resolves.toBeTruthy();
  });
});
