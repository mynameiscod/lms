/**
 * WhatsApp inbox clarity (2026-11-19): one owner (the lead's counsellor), a status per chat
 * (waiting for us / automation / waiting for lead), the new filters, "mark handled", the side
 * panel, and "a person took over" stopping chatty workflows only. Real MongoDB.
 */
import mongoose from 'mongoose';
import { startMongo, stopMongo } from './mongoHarness';
import { listInbox, markHandled, effectiveOwner, automationPhones } from '../../services/whatsAppChatInbox';
import { threadContext } from '../../services/whatsAppChatContext';
import { stopForTakeover, workflowWelcomesNewLeads, hasLiveRun } from '../../services/workflow/engine';

jest.setTimeout(240_000);

const tid = new mongoose.Types.ObjectId();
const tenantId = String(tid);
const u1 = new mongoose.Types.ObjectId(), u2 = new mongoose.Types.ObjectId();
const stageNew = new mongoose.Types.ObjectId(), stageDemo = new mongoose.Types.ObjectId();
const leadA = new mongoose.Types.ObjectId(), leadF = new mongoose.Types.ObjectId();
const wfWelcome = new mongoose.Types.ObjectId(), wfDemo = new mongoose.Types.ObjectId();
const col = (n: string) => mongoose.connection.db!.collection(n);
const H = 3600_000;
const ago = (h: number) => new Date(Date.now() - h * H);

const A = '919000000001'; // lead with counsellor u1, wrote last → waiting for us
const B = '919000000002'; // no lead, chat owned by u2, we replied last → waiting for lead
const C = '919000000003'; // a workflow is mid-questions → automation
const D = '919000000004'; // old bot mid-questions → automation
const E = '919000000005'; // old bot mid-questions but paused → waiting for us
const F = '919000000006'; // lead without counsellor, nobody owns → unassigned

beforeAll(async () => {
  await startMongo();
  await col('users').insertMany([
    { _id: u1, tenantId: tid, firstName: 'Ravi', lastName: 'K', email: 'ravi@x.test', role: 'STAFF' },
    { _id: u2, tenantId: tid, firstName: 'Meena', lastName: 'S', email: 'meena@x.test', role: 'STAFF' },
  ]);
  await col('leadstages').insertMany([
    { _id: stageNew, tenantId: tid, name: 'New Lead', color: '#3B82F6', order: 0 },
    { _id: stageDemo, tenantId: tid, name: 'Demo Booked', color: '#F59E0B', order: 3 },
  ]);
  await col('leads').insertMany([
    { _id: leadA, tenantId: tid, name: 'Geetha', phone: '9000000001', source: 'facebook', stageId: stageDemo, assignedTo: u1, priority: 'hot', courseInterest: ['Java Full Stack'], customFields: { passout_year: '2027' } },
    { _id: leadF, tenantId: tid, name: 'Farhan', phone: '9000000006', source: 'website', stageId: stageNew, priority: 'warm' },
  ]);
  const linked = new Date();
  await col('whatsappthreads').insertMany([
    { tenantId: tid, phone: A, lastInboundAt: ago(22.5), lastMessageAt: ago(22.5), lastStaffReplyAt: ago(23), unreadCount: 2, botPaused: true, assignedTo: null, links: { leadId: leadA, leadName: 'Geetha' }, linkedAt: linked },
    { tenantId: tid, phone: B, lastInboundAt: ago(5), lastOutboundAt: ago(4), lastMessageAt: ago(4), lastStaffReplyAt: ago(4), unreadCount: 0, assignedTo: u2, links: {}, linkedAt: linked },
    { tenantId: tid, phone: C, lastInboundAt: ago(1), lastMessageAt: ago(1), unreadCount: 1, links: {}, linkedAt: linked },
    { tenantId: tid, phone: D, lastInboundAt: ago(2), lastMessageAt: ago(2), unreadCount: 0, links: {}, linkedAt: linked },
    { tenantId: tid, phone: E, lastInboundAt: ago(3), lastMessageAt: ago(3), unreadCount: 0, botPaused: true, links: {}, linkedAt: linked },
    { tenantId: tid, phone: F, lastInboundAt: ago(30), lastMessageAt: ago(30), unreadCount: 0, links: { leadId: leadF, leadName: 'Farhan' }, linkedAt: linked },
  ]);
  await col('workflows').insertMany([
    { _id: wfWelcome, tenantId: tid, name: 'New lead: welcome + questions', status: 'active', trigger: { type: 'lead_created', config: { sources: [] } }, steps: [] },
    { _id: wfDemo, tenantId: tid, name: 'Demo reminders', status: 'active', trigger: { type: 'demo_booked', config: {} }, steps: [] },
  ]);
  await col('workflowruns').insertMany([
    { tenantId: tid, workflowId: wfWelcome, phone: C, dedupeKey: 'c1', status: 'waiting', waitingFor: 'reply', phase: 'answer', vars: { answers: { passout_year: '2025' } }, log: [], createdAt: ago(1), updatedAt: ago(1) },
    { tenantId: tid, workflowId: wfDemo, phone: C, dedupeKey: 'c2', status: 'waiting', waitingFor: 'time', vars: {}, log: [], createdAt: ago(1), updatedAt: ago(1) },
  ]);
  await col('whatsappconversationstates').insertMany([
    { tenantId, phone: D, conversationStep: 'in_progress', currentQuestionIndex: 1, answers: { q_name: 'Divya' }, lastMessageAt: ago(2) },
    { tenantId, phone: E, conversationStep: 'in_progress', currentQuestionIndex: 1, answers: { q_name: 'Esha' }, lastMessageAt: ago(3) },
    { tenantId, phone: A, conversationStep: 'in_progress', currentQuestionIndex: 1, answers: { q_name: 'Kundrapu Geetha' }, lastMessageAt: ago(23) },
  ]);
});
afterAll(stopMongo);

const byPhone = (rows: any[]) => Object.fromEntries(rows.map((r) => [r.phone, r]));
const list = (q: any = {}, user = String(u1)) => listInbox(tenantId, user, q);

it('the chat follows the lead: owner is the lead counsellor even though the chat itself has none', async () => {
  const r = byPhone((await list()).rows);
  expect(r[A].assignedTo).toEqual({ _id: String(u1), name: 'Ravi K' });
  expect(r[A].ownerFrom).toBe('lead');
  expect(r[B].assignedTo?.name).toBe('Meena S');
  expect(r[B].ownerFrom).toBe('chat');
  expect(r[F].assignedTo).toBeNull();
  expect(await effectiveOwner(tenantId, { links: { leadId: leadA } })).toEqual({ id: String(u1), from: 'lead' });
});

it('every row says what is happening: waiting for us, automation, or waiting for the lead', async () => {
  const r = byPhone((await list()).rows);
  expect(r[A].status).toBe('needs_reply'); // bot paused, so the old bot is not "running" for A
  expect(r[B].status).toBe('waiting_lead');
  expect(r[C].status).toBe('automation');
  expect(r[D].status).toBe('automation');
  expect(r[E].status).toBe('needs_reply'); // bot paused mid-questions: a human must answer
  expect(r[A].lead).toEqual({ stage: { name: 'Demo Booked', color: '#F59E0B' }, source: 'facebook', priority: 'hot' });
  expect((await automationPhones(tenantId)).sort()).toEqual([C, D]);
});

it('waiting-for-us conversations come first', async () => {
  const rows = (await list()).rows;
  const firstOther = rows.findIndex((x: any) => x.status !== 'needs_reply');
  expect(rows.slice(firstOther).some((x: any) => x.status === 'needs_reply')).toBe(false);
});

it('counts and tab filters use the one owner', async () => {
  const p = await list();
  expect(p.counts).toMatchObject({ all: 6, automation: 2, mine: 1, unassigned: 4, needs_reply: 3 });
  expect((await list({ filter: 'mine' })).rows.map((x: any) => x.phone)).toEqual([A]);
  expect((await list({ filter: 'unassigned' })).rows.map((x: any) => x.phone).sort()).toEqual([C, D, E, F]);
  expect((await list({ filter: 'automation' })).rows.map((x: any) => x.phone).sort()).toEqual([C, D]);
  expect((await list({ filter: 'needs_reply' })).rows.map((x: any) => x.phone).sort()).toEqual([A, E, F]);
});

it('dropdown filters: counsellor, stage, source, type, reply window', async () => {
  const phones = async (q: any) => (await list(q)).rows.map((x: any) => x.phone).sort();
  expect(await phones({ owner: String(u2) })).toEqual([B]);
  expect(await phones({ owner: 'none' })).toEqual([C, D, E, F]);
  expect(await phones({ stageId: String(stageDemo) })).toEqual([A]);
  expect(await phones({ source: 'website' })).toEqual([F]);
  expect(await phones({ type: 'lead' })).toEqual([A, F]);
  expect(await phones({ window: 'closing' })).toEqual([A]); // 22.5h ago → 1.5h left
  expect(await phones({ window: 'closed' })).toEqual([F]);
  expect(await phones({ window: 'open' })).toEqual([A, B, C, D, E]);
});

it('"Mark handled" takes a conversation off the waiting-for-us list until they write again', async () => {
  await markHandled(tenantId, F, String(u1));
  const r = byPhone((await list()).rows);
  expect(r[F].status).toBe('idle');
  await col('whatsappthreads').updateOne({ tenantId: tid, phone: F }, { $set: { lastInboundAt: new Date() } });
  expect(byPhone((await list()).rows)[F].status).toBe('needs_reply');
});

it('a call logged on the lead after they wrote counts as handled', async () => {
  await col('leads').updateOne({ _id: leadA }, { $set: { lastContactedAt: new Date() } });
  expect(byPhone((await list()).rows)[A].status).toBe('waiting_lead');
  await col('leads').updateOne({ _id: leadA }, { $unset: { lastContactedAt: '' } });
  expect(byPhone((await list()).rows)[A].status).toBe('needs_reply');
});

it('side panel: CRM details, every collected answer, and what automation is doing', async () => {
  const a = await threadContext(tenantId, A);
  expect(a.owner).toMatchObject({ name: 'Ravi K', from: 'lead' });
  expect(a.lead).toMatchObject({ name: 'Geetha', source: 'facebook', stage: { name: 'Demo Booked' }, courses: ['Java Full Stack'] });
  expect(a.lead!.savedOnLead).toEqual([{ label: 'Passout Year', value: '2027' }]);
  expect(a.answers).toEqual(expect.arrayContaining([expect.objectContaining({ question: "What's your full name?", answer: 'Kundrapu Geetha', from: 'Old bot' })]));
  expect(a.automation.bot).toMatchObject({ paused: true, live: false, asked: 2 });

  const c = await threadContext(tenantId, C);
  expect(c.lead).toBeNull();
  expect(c.answers).toEqual([expect.objectContaining({ question: 'Passout Year', answer: '2025', from: 'Workflow · New lead: welcome + questions' })]);
  expect(c.automation.workflows.find((w: any) => w.name === 'New lead: welcome + questions')).toMatchObject({ status: 'waiting', note: 'Waiting for their answer' });
});

it('a person taking over stops the welcome/questions workflow but keeps demo reminders', async () => {
  expect(await hasLiveRun(tenantId, C)).toBe(true);
  expect(await stopForTakeover(tenantId, C, 'Ravi K')).toEqual(['New lead: welcome + questions']);
  const runs = await col('workflowruns').find({ phone: C }).toArray();
  expect(runs.find((r) => String(r.workflowId) === String(wfWelcome))).toMatchObject({ status: 'stopped', endReason: 'Ravi K took over the chat' });
  expect(runs.find((r) => String(r.workflowId) === String(wfDemo))?.status).toBe('waiting');
  expect(byPhone((await list()).rows)[C].status).toBe('automation'); // demo reminders still running
});

it('an active "New lead arrives" workflow for WhatsApp leads replaces the old bot welcome', async () => {
  expect(await workflowWelcomesNewLeads(tenantId)).toBe(true);
  await col('workflows').updateOne({ _id: wfWelcome }, { $set: { 'trigger.config.sources': ['facebook'] } });
  expect(await workflowWelcomesNewLeads(tenantId)).toBe(false);
  await col('workflows').updateOne({ _id: wfWelcome }, { $set: { 'trigger.config.sources': ['facebook', 'whatsapp'] } });
  expect(await workflowWelcomesNewLeads(tenantId)).toBe(true);
});
