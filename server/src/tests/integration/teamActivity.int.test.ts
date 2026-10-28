/**
 * Team Activity: the per-person report is built by aggregations, so it is exercised against a real database.
 * Calls are counted from the button press and completed in place, work time counts one minute once, untouched
 * leads exclude closed stages, and a person with leads but no work still shows up.
 */
import mongoose from 'mongoose';
import { startMongo, stopMongo, clearCollections, ensureIndexes } from './mongoHarness';
import StaffPresence from '../../models/StaffPresence';
import { teamOverview, teamPerson } from '../../services/teamActivityService';
import { staffHeartbeat, logCallClick, logWhatsAppClick, addLeadActivity } from '../../controllers/leadController';
import { logLeadWhatsApp } from '../../services/whatsAppChatInbox';

jest.setTimeout(180_000);

const oid = () => new mongoose.Types.ObjectId();
const tenant = oid(); const ana = oid(); const raj = oid(); const student = oid();
const openStage = oid(); const wonStage = oid();

const now = new Date();
const ago = (min: number) => new Date(now.getTime() - min * 60000);
const act = (type: string, by: mongoose.Types.ObjectId, at: Date, extra: any = {}) => ({ type, description: type, createdBy: by, createdAt: at, ...extra });

const lead = (name: string, over: any = {}) => ({
  _id: oid(), tenantId: tenant, name, phone: '9' + Math.floor(100000000 + Math.random() * 899999999), stageId: openStage,
  archivedAt: null, createdAt: ago(300), activities: [], ...over,
});

const fakeRes = () => { const r: any = {}; r.json = (b: any) => { r.body = b; return r; }; r.status = (c: number) => { r.code = c; return r; }; return r; };

beforeAll(async () => {
  await startMongo();
  await ensureIndexes([StaffPresence as any]);
});
afterAll(stopMongo);
beforeEach(async () => {
  await clearCollections();
  const users = mongoose.connection.collection('users');
  await users.insertMany([
    { _id: ana, tenantId: tenant, firstName: 'Ana', lastName: 'Rao', email: 'ana@x.in', role: 'INSTRUCTOR', isActive: true, leadDataScope: 'ALL' },
    { _id: raj, tenantId: tenant, firstName: 'Raj', lastName: 'K', email: 'raj@x.in', role: 'INSTRUCTOR', isActive: true },
    { _id: student, tenantId: tenant, firstName: 'Stu', lastName: 'D', email: 's@x.in', role: 'STUDENT', isActive: true },
  ]);
  await mongoose.connection.collection('leadstages').insertMany([
    { _id: openStage, tenantId: tenant, name: 'Follow up', category: 'engaging' },
    { _id: wonStage, tenantId: tenant, name: 'Joined', category: 'converted' },
  ]);
});

describe('teamOverview', () => {
  it('counts a started call once, splits outcomes, and counts distinct leads', async () => {
    const l1 = lead('One', { assignedTo: ana, activities: [
      act('call', ana, ago(30), { metadata: { dialed: true } }), // pressed Call, no outcome yet
      act('call', ana, ago(20), { callOutcome: 'connected', metadata: { dialed: false } }), // completed in place
      act('call', ana, ago(10), { callOutcome: 'not_answered' }),
    ] });
    const l2 = lead('Two', { assignedTo: ana, activities: [act('call', ana, ago(5), { callOutcome: 'busy' }), act('whatsapp', ana, ago(4))] });
    await mongoose.connection.collection('leads').insertMany([l1, l2]);

    const r = await teamOverview(String(tenant));
    const a: any = r.rows.find((x) => x.name === 'Ana Rao');
    expect(a.calls).toBe(4);
    expect(a.connected).toBe(1);
    expect(a.notReached).toBe(2);
    expect(a.pendingOutcome).toBe(1);
    expect(a.leadsCalled).toBe(2);
    expect(a.whatsapp).toBe(1);
    expect(r.rows.find((x) => x.userId === String(student))).toBeUndefined();
  });

  it('flags untouched leads, ignores closed stages, and still lists someone who did nothing', async () => {
    await mongoose.connection.collection('leads').insertMany([
      lead('Fresh', { assignedTo: raj }),
      lead('Old work', { assignedTo: raj, activities: [act('note', raj, ago(60 * 30))] }), // worked, but 30 hours ago
      lead('Recent', { assignedTo: raj, activities: [act('note', raj, ago(60))] }),
      lead('Won', { assignedTo: raj, stageId: wonStage }), // closed: not counted
      lead('System only', { assignedTo: raj, activities: [act('created', raj, ago(200))] }), // not real work
    ]);
    const r = await teamOverview(String(tenant));
    const x: any = r.rows.find((u) => u.name === 'Raj K');
    expect(x.assigned).toBe(4);
    expect(x.neverTouched).toBe(2); // Fresh + System only
    expect(x.untouched24h).toBe(3); // + Old work
    expect(x.calls).toBe(0);
  });

  it('measures how fast a new lead gets its first call', async () => {
    await mongoose.connection.collection('leads').insertMany([
      lead('A', { assignedTo: ana, createdAt: ago(100), activities: [act('call', ana, ago(80))] }), // 20 minutes
      lead('B', { assignedTo: ana, createdAt: ago(100), activities: [act('call', ana, ago(40))] }), // 60 minutes
      lead('C', { assignedTo: ana, createdAt: ago(100) }), // not called
    ]);
    const x: any = (await teamOverview(String(tenant))).rows.find((u) => u.name === 'Ana Rao');
    expect(x.newLeads).toBe(3);
    expect(x.newLeadsCalled).toBe(2);
    expect(x.avgFirstCallMin).toBe(40);
  });

  it('counts follow-ups due, done and overdue', async () => {
    await mongoose.connection.collection('followupreminders').insertMany([
      { tenantId: tenant, leadId: oid(), assignedTo: ana, type: 'call', title: 'a', scheduledAt: ago(30), status: 'completed' },
      { tenantId: tenant, leadId: oid(), assignedTo: ana, type: 'call', title: 'b', scheduledAt: ago(20), status: 'scheduled' }, // overdue
      { tenantId: tenant, leadId: oid(), assignedTo: ana, type: 'call', title: 'c', scheduledAt: ago(10), status: 'missed' },
    ]);
    const x: any = (await teamOverview(String(tenant))).rows.find((u) => u.name === 'Ana Rao');
    expect(x.followUpsDue).toBe(3);
    expect(x.followUpsDone).toBe(1);
    expect(x.followUpsMissed).toBe(1);
    expect(x.followUpsOverdue).toBe(1);
  });
});

describe('working time', () => {
  it('counts a minute once however many notes arrive, and time per lead', async () => {
    const leadId = String(oid());
    for (let i = 0; i < 3; i++) {
      const res = fakeRes();
      await staffHeartbeat({ user: { id: String(ana), role: 'INSTRUCTOR' }, tenantId: String(tenant), body: { leadId } } as any, res);
      expect(res.body.success).toBe(true);
    }
    const doc: any = await StaffPresence.findOne({ userId: ana }).lean();
    expect(doc.activeSeconds).toBe(60);
    expect(doc.slots).toHaveLength(1);
    expect(doc.leadSeconds[leadId]).toBe(60);

    const r = await teamOverview(String(tenant));
    const a: any = r.rows.find((u) => u.name === 'Ana Rao');
    expect(a.activeSeconds).toBe(60);
    expect(a.firstSeenAt).toBeTruthy();

    const p = await teamPerson(String(tenant), String(ana));
    expect(p.presence.slots).toHaveLength(1);
    expect(p.presence.activeSeconds).toBe(60);
  });

  it('ignores students', async () => {
    const res = fakeRes();
    await staffHeartbeat({ user: { id: String(student), role: 'STUDENT' }, tenantId: String(tenant), body: {} } as any, res);
    expect(await StaffPresence.countDocuments({})).toBe(0);
  });
});

describe('button presses count once', () => {
  const reqFor = (leadId: any, body: any = {}) => ({ user: { id: String(ana), role: 'INSTRUCTOR' }, tenantId: String(tenant), params: { leadId: String(leadId) }, body } as any);

  it('a Call press counts as one call, a double press is ignored, and saving the outcome completes the same entry', async () => {
    const l: any = lead('Dial', { assignedTo: ana });
    await mongoose.connection.collection('leads').insertOne(l);

    const r1 = fakeRes(); await logCallClick(reqFor(l._id), r1);
    const r2 = fakeRes(); await logCallClick(reqFor(l._id), r2);
    expect(r1.body.data.logged).toBe(true);
    expect(r2.body.data.logged).toBe(false);
    let doc: any = await mongoose.connection.collection('leads').findOne({ _id: l._id });
    expect(doc.activities).toHaveLength(1);
    expect(doc.telecallerMetrics.firstCallAt).toBeTruthy();
    expect((await teamOverview(String(tenant))).rows.find((u) => u.name === 'Ana Rao')!.calls).toBe(1);

    const save = fakeRes();
    await addLeadActivity(reqFor(l._id, { type: 'call', description: 'Spoke about the Java batch', callOutcome: 'connected' }), save);
    expect(save.body.success).toBe(true);
    doc = await mongoose.connection.collection('leads').findOne({ _id: l._id });
    expect(doc.activities).toHaveLength(1); // completed in place, not a second call
    expect(doc.activities[0].callOutcome).toBe('connected');
    expect(doc.activities[0].description).toBe('Spoke about the Java batch');
    const row: any = (await teamOverview(String(tenant))).rows.find((u) => u.name === 'Ana Rao');
    expect(row.calls).toBe(1);
    expect(row.connected).toBe(1);
    expect(row.pendingOutcome).toBe(0);
  });

  it('a call saved without pressing Call first is still one call', async () => {
    const l: any = lead('Manual', { assignedTo: ana });
    await mongoose.connection.collection('leads').insertOne(l);
    await addLeadActivity(reqFor(l._id, { type: 'call', description: 'Called from my own phone', callOutcome: 'not_answered' }), fakeRes());
    const doc: any = await mongoose.connection.collection('leads').findOne({ _id: l._id });
    expect(doc.activities).toHaveLength(1);
  });

  it('a WhatsApp press counts once and the first message sent from the chat completes it', async () => {
    const l: any = lead('Chat', { assignedTo: ana, phone: '9876543210' });
    await mongoose.connection.collection('leads').insertOne(l);
    await logWhatsAppClick(reqFor(l._id), fakeRes());
    await logLeadWhatsApp(String(tenant), String(ana), '919876543210', 'WhatsApp message sent: hello');
    let doc: any = await mongoose.connection.collection('leads').findOne({ _id: l._id });
    expect(doc.activities).toHaveLength(1);
    expect(doc.activities[0].description).toContain('hello');
    await logLeadWhatsApp(String(tenant), String(ana), '919876543210', 'WhatsApp message sent: second');
    doc = await mongoose.connection.collection('leads').findOne({ _id: l._id });
    expect(doc.activities).toHaveLength(2); // a second message is a second action
  });
});
