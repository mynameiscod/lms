/**
 * Workflow Builder engine against a real MongoDB. WhatsApp itself is replaced by a recorder that
 * also plays Meta's 24-hour rule (free text only after the person has messaged).
 */
import mongoose from 'mongoose';
import { startMongo, stopMongo } from './mongoHarness';

jest.setTimeout(240_000);

const sent: { kind: string; to: string; body: string }[] = [];
const windowOpenFor = new Set<string>();
const optedOut = new Set<string>();
jest.mock('../../services/workflow/whatsapp', () => {
  const ten = (p: string) => String(p).replace(/\D/g, '').slice(-10);
  const closed = { ok: false, skipped: true, error: 'the 24-hour window is closed' };
  return {
    threadOf: async (_t: string, p: string) => ({ automationOptOutAt: optedOut.has(ten(p)) ? new Date() : null }),
    windowOpen: async (_t: string, p: string) => windowOpenFor.has(ten(p)),
    setOptOut: async (_t: string, p: string, out: boolean) => { if (out) optedOut.add(ten(p)); else optedOut.delete(ten(p)); },
    sendText: async (_t: string, p: string, body: string) => { if (!windowOpenFor.has(ten(p))) return closed; sent.push({ kind: 'text', to: ten(p), body }); return { ok: true }; },
    sendChoices: async (_t: string, p: string, q: string, opts: string[]) => { if (!windowOpenFor.has(ten(p))) return closed; sent.push({ kind: 'choices', to: ten(p), body: `${q} [${opts.join('|')}]` }); return { ok: true }; },
    sendMediaLink: async (_t: string, p: string, _k: string, url: string) => { sent.push({ kind: 'media', to: ten(p), body: url }); return { ok: true }; },
    sendTemplate: async (_t: string, p: string, id: string, values: string[]) => { sent.push({ kind: 'template', to: ten(p), body: `${id}:${values.join(',')}` }); return { ok: true }; },
    templateName: async () => 'tpl',
  };
});

import User from '../../models/User';
import Tenant from '../../models/Tenant';
import Lead from '../../models/Lead';
import LeadStage from '../../models/LeadStage';
import Meeting from '../../models/Meeting';
import FollowUpReminder from '../../models/FollowUpReminder';
import { Workflow, WorkflowRun, WorkflowSettings } from '../../models/Workflow';
import { fire, onInbound, onDemoBooked, onDemoChanged, resumeDue, forgetOfficeHours } from '../../services/workflow/engine';
import { cleanSteps } from '../../services/workflow/shape';

let tenantId = '';
let ownerId: any;
let stageId: any;
const TPL = new mongoose.Types.ObjectId().toString();

async function makeLead(name: string, phone: string) {
  const r = await Lead.collection.insertOne({
    tenantId: new mongoose.Types.ObjectId(tenantId), name, phone, source: 'meta_form', stageId, assignedTo: ownerId,
    createdBy: ownerId, courseInterest: [], activities: [], priority: 'warm', customFields: {}, createdAt: new Date(), updatedAt: new Date(),
  } as any);
  return r.insertedId;
}
async function workflow(over: any) {
  return Workflow.create({
    tenantId, name: over.name || 'wf', status: 'active', trigger: over.trigger, steps: cleanSteps(over.steps),
    settings: { sendWindow: 'any', allowReentry: false, cooldownMinutes: 0, stopOnReply: false, runWhenHumanTakenOver: false, stopStageIds: [], ...(over.settings || {}) },
  });
}
const runOf = (workflowId: any) => WorkflowRun.findOne({ workflowId }).sort({ createdAt: -1 }).lean() as Promise<any>;
const say = (phone: string, text: string) => { windowOpenFor.add(phone.slice(-10)); return onInbound(tenantId, phone, 'Ravi', text); };

beforeAll(async () => {
  await startMongo();
  await WorkflowRun.init();
  const t = await Tenant.create({ name: 'Test Institute', slug: 'wf', domain: 'wf.test', isActive: true, adminId: new mongoose.Types.ObjectId() } as any);
  tenantId = String(t._id);
  const u = await User.create({ tenantId, email: 'owner@example.com', password: 'Passw0rd!xyz', firstName: 'Asha', lastName: 'K', role: 'TENANT_ADMIN' } as any);
  ownerId = u._id;
  const st = await LeadStage.create({ tenantId, name: 'New', order: 1 } as any);
  stageId = st._id;
});
afterAll(async () => { await stopMongo(); });
beforeEach(() => { sent.length = 0; });

describe('new lead: welcome template → question → paths', () => {
  it('waits for the first reply, re-asks on a wrong answer, branches on the answer', async () => {
    const leadId = await makeLead('Ravi Kumar', '919000000001');
    const wf = await workflow({
      name: 'Welcome',
      trigger: { type: 'lead_created', config: { sources: ['meta_form'] } },
      steps: [
        { id: 'w1', type: 'send_template', config: { templateId: TPL, values: ['{{first_name}}'] } },
        { id: 'q1', type: 'ask_question', config: { question: 'Your passout year?', key: 'year', answerType: 'buttons', options: ['2024', '2025', '2026'], saveTo: 'passout_year', timeoutHours: 24 } },
        { id: 'p', type: 'paths', paths: [
          { id: 'fresh', name: 'Freshers', conditions: [{ field: 'answer.year', op: 'gte', value: '2025' }], steps: [
            { id: 'u1', type: 'update_lead', config: { priority: 'hot', note: 'Fresher {{answer.year}}' } },
            { id: 'f1', type: 'follow_up', config: { title: 'Call {{first_name}}', inHours: 2 } },
          ] },
          { id: 'else', name: 'Others', conditions: [], steps: [{ id: 'n1', type: 'update_lead', config: { priority: 'cold' } }] },
        ] },
      ],
    });

    // A website lead does not match this workflow's sources.
    expect(await fire({ tenantId, type: 'lead_created', leadId, data: { source: 'website' } })).toBe(0);
    expect(await fire({ tenantId, type: 'lead_created', leadId, data: { source: 'meta_form' } })).toBe(1);
    expect(sent).toEqual([{ kind: 'template', to: '9000000001', body: `${TPL}:Ravi` }]);
    let run = await runOf(wf._id);
    expect(run).toMatchObject({ status: 'waiting', waitingFor: 'reply', phase: 'window', stepId: 'q1' });

    // The same lead never starts it twice.
    expect(await fire({ tenantId, type: 'lead_created', leadId, data: { source: 'meta_form' } })).toBe(0);

    // First message opens the window → the question goes out (the "Hi" is not taken as the answer).
    let r = await say('919000000001', 'Hi');
    expect(r).toMatchObject({ handled: true, answered: 1 });
    expect(sent.at(-1)).toMatchObject({ kind: 'choices', body: 'Your passout year? [2024|2025|2026]' });
    expect((await runOf(wf._id)).phase).toBe('answer');

    // Not an option → asked again once.
    await say('919000000001', 'banana');
    expect(sent.slice(-2).map((s) => s.kind)).toEqual(['text', 'choices']);
    expect((await runOf(wf._id)).phase).toBe('answer_retry');

    // "2" = the second button.
    r = await say('919000000001', '2');
    expect(r.answered).toBe(1);
    run = await runOf(wf._id);
    expect(run.status).toBe('completed');
    expect(run.vars.answers.year).toBe('2025');
    expect(run.log.map((l: any) => l.note).join(' | ')).toMatch(/Took "Freshers"/);

    const lead: any = await Lead.findById(leadId).lean();
    expect(lead.priority).toBe('hot');
    expect(lead.customFields.passoutYear).toBe('2025');
    expect(lead.activities.some((a: any) => /Fresher 2025/.test(a.description))).toBe(true);
    const task: any = await FollowUpReminder.findOne({ leadId }).lean();
    expect(task?.title).toBe('Call Ravi');
    expect((await Workflow.findById(wf._id).lean() as any).stats).toMatchObject({ started: 1, completed: 1 });
  });

  it('a question that is never answered times out and moves on', async () => {
    const leadId = await makeLead('Sita', '919000000002');
    const wf = await workflow({ name: 'Timeout', trigger: { type: 'manual', config: {} }, steps: [
      { id: 'q', type: 'ask_question', config: { question: 'Email?', key: 'email', answerType: 'text', timeoutHours: 1 } },
      { id: 'n', type: 'update_lead', config: { note: 'after question' } },
    ] });
    windowOpenFor.add('9000000002');
    await fire({ tenantId, type: 'manual', workflowId: String(wf._id), test: true, leadId });
    await WorkflowRun.updateOne({ workflowId: wf._id }, { $set: { resumeAt: new Date(Date.now() - 1000) } });
    expect(await resumeDue()).toBe(1);
    const run = await runOf(wf._id);
    expect(run.status).toBe('completed');
    expect(run.log.map((l: any) => l.note).join(' | ')).toMatch(/No answer in time/);
  });
});

describe('messages: keyword replies, out-of-office, STOP', () => {
  it('keywords win over a catch-all; out-of-office still answers, once per cooldown', async () => {
    await WorkflowSettings.create({ tenantId, timezone: 'Asia/Kolkata', days: Object.fromEntries(['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'].map((d) => [d, { open: false, start: '09:30', end: '18:30' }])) });
    forgetOfficeHours(tenantId);
    const fees = await workflow({ name: 'Fees', trigger: { type: 'message_received', config: { match: 'keywords', keywords: ['fee', 'fees'] } }, settings: { allowReentry: true },
      steps: [{ id: 's', type: 'send_message', config: { text: 'Our fee is ₹40,000, {{first_name}}.' } }] });
    const ooo = await workflow({ name: 'OOO', trigger: { type: 'message_received', config: { match: 'any', officeHours: 'outside' } }, settings: { allowReentry: true, cooldownMinutes: 720, runWhenHumanTakenOver: true },
      steps: [{ id: 's', type: 'send_message', config: { text: 'We are closed, back {{next_opening}}.' } }] });
    const any = await workflow({ name: 'Catch-all', trigger: { type: 'message_received', config: { match: 'any' } }, settings: { allowReentry: true },
      steps: [{ id: 's', type: 'send_message', config: { text: 'catch-all' } }] });
    await makeLead('Kiran Rao', '919000000003');

    const r = await say('919000000003', 'what are the fees?');
    expect(r).toMatchObject({ handled: true, started: 2 });
    const bodies = sent.map((s) => s.body);
    expect(bodies).toContain('Our fee is ₹40,000, Kiran.');
    expect(bodies.some((b) => /^We are closed, back .+\.$/.test(b))).toBe(true);
    expect(bodies).not.toContain('catch-all');

    // Another message: catch-all answers, the out-of-office reply is in its 12-hour cooldown.
    sent.length = 0;
    await say('919000000003', 'hello');
    expect(sent.map((s) => s.body)).toEqual(['catch-all']);
    expect(await WorkflowRun.countDocuments({ workflowId: ooo._id })).toBe(1);
    expect(await WorkflowRun.countDocuments({ workflowId: fees._id })).toBe(1);
    await Workflow.updateMany({ _id: { $in: [fees._id, ooo._id, any._id] } }, { $set: { status: 'paused' } });
  });

  it('STOP opts out: later workflow messages are not sent; START opts back in', async () => {
    const r = await say('919000000004', 'STOP');
    expect(r).toMatchObject({ handled: true, optOut: true });
    const leadId = await makeLead('Mohan', '919000000004');
    const wf = await workflow({ name: 'Nudge', trigger: { type: 'manual', config: {} }, steps: [{ id: 's', type: 'send_message', config: { text: 'nudge' } }] });
    sent.length = 0;
    await fire({ tenantId, type: 'manual', workflowId: String(wf._id), test: true, leadId });
    expect(sent).toEqual([]);
    expect((await runOf(wf._id)).log.map((l: any) => l.note).join(' ')).toMatch(/sent STOP/);
    await say('919000000004', 'START');
    expect(optedOut.has('9000000004')).toBe(false);
  });
});

describe('demos: reminders follow the demo time; no-show starts its own workflow', () => {
  it('restarts reminders when the demo moves and fires the no-show workflow', async () => {
    const leadId = await makeLead('Deepa', '919000000005');
    const remind = await workflow({ name: 'Reminders', trigger: { type: 'demo_booked', config: {} }, steps: [
      { id: 'r1', type: 'wait_until', config: { offsetMinutes: -60 } },
      { id: 'r2', type: 'send_template', config: { templateId: TPL, values: ['{{demo_time}}', '{{demo_link}}'] } },
    ] });
    const noShow = await workflow({ name: 'No-show', trigger: { type: 'demo_outcome', config: { outcomes: ['no_show'] } }, steps: [
      { id: 'n', type: 'follow_up', config: { title: 'Rebook {{first_name}}', inHours: 1 } },
    ] });
    const m = await Meeting.create({ tenantId, leadId, type: 'online_demo', title: 'Demo', scheduledAt: new Date(Date.now() + 3 * 3600_000), meetingLink: 'https://meet.example/abc', createdBy: String(ownerId) } as any);
    await onDemoBooked(tenantId, m.toObject());
    const first = await runOf(remind._id);
    expect(first).toMatchObject({ status: 'waiting', stepId: 'r1' });
    expect(Math.abs(new Date(first.resumeAt).getTime() - (m.scheduledAt.getTime() - 3600_000))).toBeLessThan(2000);

    // Moved by a day → the old reminders stop, new ones wait for the new time.
    const before = m.toObject();
    m.scheduledAt = new Date(m.scheduledAt.getTime() + 24 * 3600_000);
    await m.save();
    await onDemoChanged(tenantId, m.toObject(), before);
    const runs: any[] = await WorkflowRun.find({ workflowId: remind._id }).sort({ createdAt: 1 }).lean();
    expect(runs.map((x) => x.status)).toEqual(['stopped', 'waiting']);

    // Reminder time comes → the template goes out with the demo link.
    await WorkflowRun.updateOne({ _id: runs[1]._id }, { $set: { resumeAt: new Date(Date.now() - 1000) } });
    await resumeDue();
    expect(sent.at(-1)!.body).toMatch(/https:\/\/meet\.example\/abc$/);
    expect((await WorkflowRun.findById(runs[1]._id).lean() as any).status).toBe('completed');

    // No-show.
    const b2 = m.toObject();
    m.status = 'no_show' as any;
    await m.save();
    await onDemoChanged(tenantId, m.toObject(), b2);
    expect((await runOf(noShow._id)).status).toBe('completed');
    expect(await FollowUpReminder.exists({ leadId, title: 'Rebook Deepa' })).toBeTruthy();
  });
});

describe('editing a live workflow', () => {
  it('a run waiting on a deleted step stops and says why', async () => {
    const leadId = await makeLead('Arun', '919000000006');
    const wf = await workflow({ name: 'Edit me', trigger: { type: 'manual', config: {} }, steps: [
      { id: 'w', type: 'wait', config: { amount: 2, unit: 'days' } },
      { id: 'n', type: 'update_lead', config: { note: 'x' } },
    ] });
    await fire({ tenantId, type: 'manual', workflowId: String(wf._id), test: true, leadId });
    await Workflow.updateOne({ _id: wf._id }, { $set: { steps: cleanSteps([{ id: 'n', type: 'update_lead', config: { note: 'x' } }]) } });
    await WorkflowRun.updateOne({ workflowId: wf._id }, { $set: { resumeAt: new Date(Date.now() - 1000) } });
    await resumeDue();
    const run = await runOf(wf._id);
    expect(run.status).toBe('stopped');
    expect(run.endReason).toMatch(/removed/);
  });
});
