import mongoose from 'mongoose';
import Lead from '../../models/Lead';
import LeadStage from '../../models/LeadStage';
import User from '../../models/User';
import Tenant from '../../models/Tenant';
import Meeting from '../../models/Meeting';
import FollowUpReminder from '../../models/FollowUpReminder';
import WhatsAppThread from '../../models/WhatsAppThread';
import { Workflow, WorkflowRun, WorkflowSettings, IWorkflow, IWorkflowRun, WfStep, TriggerType } from '../../models/Workflow';
import { indexSteps } from './shape';
import { choosePath, render, matchKeyword, matchOption, OPT_IN_WORDS, OPT_OUT_WORDS, Resolve } from './logic';
import { DEFAULT_OFFICE_HOURS, OfficeHours, isOpen, nextOpening, describeOpening } from './officeHours';
import * as wa from './whatsapp';
import { normalizeTo } from '../assessmentOtpService';
import { passoutYearOf } from '../whatsAppTemplateService';
import { createNotifications } from '../../notifications/notificationService';

/**
 * The workflow engine.
 *
 *   fire(event)          a trigger happened → start a run for every active workflow it matches
 *   onInbound(...)       a WhatsApp message arrived → answers a waiting question, stops runs that
 *                        stop on reply, honours STOP/START, starts "message received" workflows
 *   resumeDue()          the minute job: runs whose wait is over (or whose question timed out)
 *
 * A run executes steps until it has to wait (a timer, a reply) or ends. Each run is claimed with an
 * atomic status change, so two servers never run the same person twice.
 */

const oid = (id: any) => new mongoose.Types.ObjectId(String(id));
const MAX_STEPS_PER_PASS = 60;
const MIN = 60_000, HOUR = 60 * MIN;
const MESSAGING: string[] = ['send_message', 'send_template', 'send_media', 'ask_question', 'ai_reply'];
const UNIT: Record<string, number> = { minutes: MIN, hours: HOUR, days: 24 * HOUR };
const last10 = (p: string) => String(p || '').replace(/\D/g, '').slice(-10);

export interface TriggerEvent {
  tenantId: string;
  type: TriggerType;
  leadId?: any;
  phone?: string;
  meetingId?: any;
  /** What happened: source, stageId, text, keyword, outcome, callId, scheduledAt… */
  data?: Record<string, any>;
  /** Test run from the builder: runs a draft/paused workflow, once, on this lead. */
  workflowId?: string;
  test?: boolean;
  /** WhatsApp only: a person on our side has taken this chat over. */
  botPaused?: boolean;
}

/* ── Office hours (cached briefly per institute) ─────────────────────────── */
const ohCache = new Map<string, { at: number; v: OfficeHours }>();
export async function officeHoursFor(tenantId: string): Promise<OfficeHours> {
  const c = ohCache.get(tenantId);
  if (c && Date.now() - c.at < 60_000) return c.v;
  const s: any = await WorkflowSettings.findOne({ tenantId: oid(tenantId) }).lean();
  const v: OfficeHours = s ? { timezone: s.timezone || 'Asia/Kolkata', days: s.days || DEFAULT_OFFICE_HOURS.days, holidays: s.holidays || [], enabled: s.enabled !== false } : DEFAULT_OFFICE_HOURS;
  ohCache.set(tenantId, { at: Date.now(), v });
  return v;
}
export const forgetOfficeHours = (tenantId: string) => ohCache.delete(tenantId);

/* ── Who the run is about ─────────────────────────────────────────────────── */
async function findLeadByPhone(tenantId: string, phone: string) {
  const ten = last10(phone);
  if (ten.length < 10) return null;
  return Lead.findOne({ tenantId: oid(tenantId), phone: new RegExp(`${ten}$`), archivedAt: null }).sort({ createdAt: -1 }).select('_id phone').lean() as Promise<any>;
}

interface Ctx {
  run: IWorkflowRun;
  wf: IWorkflow;
  tenantId: string;
  lead: any | null;
  phone: string;
  oh: OfficeHours;
  now: Date;
  resolve: Resolve;
  /** Why this pass started: a reply (with its text) or a timer. */
  resumed?: { reason: 'reply' | 'time'; text?: string };
}

async function buildCtx(run: IWorkflowRun, wf: IWorkflow, resumed?: Ctx['resumed']): Promise<Ctx> {
  const tenantId = String(run.tenantId);
  const lead: any = run.leadId ? await Lead.findOne({ _id: run.leadId, tenantId: run.tenantId }).lean() : null;
  const phone = normalizeTo(run.phone || lead?.phone || '');
  const oh = await officeHoursFor(tenantId);
  const now = new Date();
  const lazy: Record<string, any> = {};
  const once = async <T>(k: string, f: () => Promise<T>): Promise<T> => (k in lazy ? lazy[k] : (lazy[k] = await f()));
  const ownerId = lead?.assignedTo || lead?.assignment?.assignedTo;
  const [owner, tenant, stage, meeting] = await Promise.all([
    ownerId ? once('owner', () => User.findById(ownerId).select('firstName lastName phone').lean()) : null,
    once('tenant', () => Tenant.findById(tenantId).select('name').lean()),
    lead?.stageId ? once('stage', () => LeadStage.findById(lead.stageId).select('name').lean()) : null,
    run.meetingId ? once('meeting', () => Meeting.findById(run.meetingId).lean())
      : lead ? once('meeting', () => Meeting.findOne({ leadId: lead._id, tenantId, status: { $in: ['scheduled', 'rescheduled'] }, scheduledAt: { $gte: new Date(now.getTime() - 2 * HOUR) } }).sort({ scheduledAt: 1 }).lean()) : null,
  ]) as any[];
  const vars = run.vars || {};
  const custom = (k: string) => {
    const cf = lead?.customFields;
    if (!cf) return '';
    return cf instanceof Map ? cf.get(k) : cf[k];
  };
  const tz = oh.timezone;
  const demoAt = meeting?.scheduledAt ? new Date(meeting.scheduledAt) : null;
  const resolve: Resolve = (raw) => {
    const f = String(raw || '').replace(/^lead\./, '');
    if (f.startsWith('answer.')) return vars.answers?.[f.slice(7)] ?? '';
    if (f.startsWith('custom.')) return custom(f.slice(7)) ?? '';
    if (f.startsWith('trigger.')) return vars.trigger?.[f.slice(8)] ?? '';
    switch (f) {
      case 'name': return lead?.name || vars.trigger?.name || '';
      case 'first_name': return String(lead?.name || vars.trigger?.name || '').trim().split(/\s+/)[0] || 'there';
      case 'phone': return phone;
      case 'email': return lead?.email || '';
      case 'course': return lead?.courseInterest || [];
      case 'source': return lead?.source || '';
      case 'stage': return lead?.stageId ? [String(lead.stageId), stage?.name || ''] : [];
      case 'stage_name': return stage?.name || '';
      case 'priority': return lead?.priority || '';
      case 'owner': return ownerId ? String(ownerId) : '';
      case 'passout_year': return lead ? passoutYearOf(lead.customFields) : '';
      case 'language': return lead?.language || '';
      case 'counsellor': return owner ? [owner.firstName, owner.lastName].filter(Boolean).join(' ') : 'our team';
      case 'counsellor_phone': return owner?.phone || '';
      case 'institute': return tenant?.name || '';
      case 'message': case 'message.text': return vars.message || '';
      case 'office.open': case 'office_open': return isOpen(now, oh) ? 'yes' : 'no';
      case 'next_opening': return describeOpening(nextOpening(now, oh), now, tz);
      case 'call.outcome': return vars.trigger?.outcome || lead?.aiFeedback?.outcome || '';
      case 'demo.status': return meeting?.status || vars.trigger?.outcome || '';
      case 'demo.type': return meeting?.type || '';
      case 'demo_time': return demoAt ? demoAt.toLocaleString('en-IN', { timeZone: tz, weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', hour12: true }) : '';
      case 'demo_date': return demoAt ? demoAt.toLocaleDateString('en-IN', { timeZone: tz, weekday: 'long', day: 'numeric', month: 'long' }) : '';
      case 'demo_clock': return demoAt ? demoAt.toLocaleTimeString('en-IN', { timeZone: tz, hour: 'numeric', minute: '2-digit', hour12: true }) : '';
      case 'demo_link': return meeting?.meetingLink || meeting?.location || '';
      default: return vars[f] ?? '';
    }
  };
  return { run, wf, tenantId, lead, phone, oh, now, resolve, resumed };
}

/* ── Step results ─────────────────────────────────────────────────────────── */
type StepResult =
  | { kind: 'next'; note?: string; ok?: boolean }
  | { kind: 'goto'; stepId: string | null; note?: string }
  | { kind: 'wait'; until: Date | null; waitingFor: 'time' | 'reply'; phase: string; note?: string }
  | { kind: 'stop'; note: string }
  | { kind: 'fail'; note: string };

const next = (note?: string, ok = true): StepResult => ({ kind: 'next', note, ok });

async function systemActor(ctx: Ctx): Promise<{ id: string; role: string }> {
  const id = ctx.lead?.assignedTo || ctx.lead?.createdBy || ctx.wf.updatedBy || ctx.wf.createdBy;
  return { id: String(id), role: 'TENANT_ADMIN' };
}

async function canMessage(ctx: Ctx): Promise<string | null> {
  if (!ctx.phone || ctx.phone.length < 10) return 'no phone number';
  const t = await wa.threadOf(ctx.tenantId, ctx.phone);
  if (t?.automationOptOutAt) return 'they sent STOP — no automatic messages';
  if (ctx.lead?.aiFeedback?.doNotContact) return 'the lead is marked do-not-contact';
  return null;
}

async function staffToNotify(ctx: Ctx, to: string, userIds?: string[]): Promise<string[]> {
  const owner = ctx.lead?.assignedTo || ctx.lead?.assignment?.assignedTo;
  if (to === 'users' && userIds?.length) return userIds.filter((u) => mongoose.isValidObjectId(u));
  if (to === 'owner' && owner) return [String(owner)];
  const admins = await User.find({ tenantId: ctx.run.tenantId, role: { $in: ['TENANT_ADMIN', 'SUPER_ADMIN'] }, isActive: { $ne: false } }).select('_id').limit(20).lean();
  return admins.map((a: any) => String(a._id));
}

async function runStep(ctx: Ctx, step: WfStep, nextId: string | null): Promise<StepResult> {
  const c = step.config || {};
  const phase = ctx.run.phase || '';
  const r = (t: string) => render(t, ctx.resolve);

  // Hold automated sends until the office opens (a person's own reply moments ago is answered anyway).
  if (MESSAGING.includes(step.type) && ctx.wf.settings?.sendWindow === 'office_hours' && !ctx.resumed?.text && !phase.startsWith('answer') && phase !== 'window' && !isOpen(ctx.now, ctx.oh)) {
    const at = nextOpening(ctx.now, ctx.oh);
    if (at && phase !== `hold:${step.id}`) return { kind: 'wait', until: at, waitingFor: 'time', phase: `hold:${step.id}`, note: `Office closed — waiting until ${describeOpening(at, ctx.now, ctx.oh.timezone)}` };
  }

  switch (step.type) {
    case 'send_message': {
      const why = await canMessage(ctx);
      if (why) return next(`Not sent: ${why}`, false);
      const text = r(c.text || '');
      let s = await wa.sendText(ctx.tenantId, ctx.phone, text);
      if (s.skipped && c.fallbackTemplateId) {
        s = await wa.sendTemplate(ctx.tenantId, ctx.phone, c.fallbackTemplateId, (c.fallbackValues || []).map((v: string) => r(v)));
        return next(s.ok ? 'Window closed — sent the fallback template' : `Fallback template failed: ${s.error}`, s.ok);
      }
      return next(s.ok ? `Sent: "${text.slice(0, 80)}${text.length > 80 ? '…' : ''}"` : `Not sent: ${s.error}`, s.ok);
    }
    case 'send_template': {
      const why = await canMessage(ctx);
      if (why) return next(`Not sent: ${why}`, false);
      const s = await wa.sendTemplate(ctx.tenantId, ctx.phone, c.templateId, (c.values || []).map((v: string) => r(v)), c.buttonParam ? r(c.buttonParam) : undefined,
        c.documentUrl ? { documentUrl: String(c.documentUrl), fileName: c.fileName ? r(String(c.fileName)) : undefined } : undefined);
      const name = await wa.templateName(ctx.tenantId, c.templateId);
      return next(s.ok ? `Sent template "${name}"` : `Template "${name}" not sent: ${s.error}`, s.ok);
    }
    case 'send_media': {
      const why = await canMessage(ctx);
      if (why) return next(`Not sent: ${why}`, false);
      const s = await wa.sendMediaLink(ctx.tenantId, ctx.phone, c.kind === 'image' ? 'image' : 'document', String(c.url || ''), c.caption ? r(c.caption) : undefined, c.fileName);
      return next(s.ok ? `Sent ${c.kind === 'image' ? 'image' : 'file'}` : `File not sent: ${s.error}`, s.ok);
    }
    case 'ask_question': {
      const options: string[] = (c.options || []).map((o: any) => String(o || '').trim()).filter(Boolean);
      const type = c.answerType === 'buttons' || c.answerType === 'list' ? c.answerType : 'text';
      const timeoutAt = new Date(ctx.now.getTime() + Math.max(1, Number(c.timeoutHours) || 24) * HOUR);
      const ask = async () => (type === 'text' ? wa.sendText(ctx.tenantId, ctx.phone, r(c.question)) : wa.sendChoices(ctx.tenantId, ctx.phone, r(c.question), options, type, c.listButton));
      const save = async (answer: string) => {
        await WorkflowRun.updateOne({ _id: ctx.run._id }, { $set: { [`vars.answers.${c.key}`]: answer } });
        ctx.run.vars = { ...(ctx.run.vars || {}), answers: { ...(ctx.run.vars?.answers || {}), [c.key]: answer } };
        if (answer && c.saveTo && ctx.lead) await saveToLead(ctx, c.saveTo, answer);
      };

      // First time here.
      if (!phase || phase.startsWith('hold:')) {
        const why = await canMessage(ctx);
        if (why) return next(`Question skipped: ${why}`, false);
        if (!(await wa.windowOpen(ctx.tenantId, ctx.phone))) {
          return { kind: 'wait', until: timeoutAt, waitingFor: 'reply', phase: 'window', note: 'Waiting for them to message first (WhatsApp only allows questions after they reply)' };
        }
        const s = await ask();
        if (!s.ok) return next(`Question not sent: ${s.error}`, false);
        return { kind: 'wait', until: timeoutAt, waitingFor: 'reply', phase: 'answer', note: `Asked: "${r(c.question).slice(0, 80)}"` };
      }
      // Timed out.
      if (ctx.resumed?.reason !== 'reply') {
        await save('');
        if (c.onTimeout === 'stop') return { kind: 'stop', note: 'No answer in time — stopped' };
        return next('No answer in time — moved on', false);
      }
      // They messaged.
      if (phase === 'window') {
        const s = await ask();
        if (!s.ok) return next(`Question not sent: ${s.error}`, false);
        return { kind: 'wait', until: timeoutAt, waitingFor: 'reply', phase: 'answer', note: `They replied — asked: "${r(c.question).slice(0, 80)}"` };
      }
      const text = String(ctx.resumed.text || '').trim();
      if (type !== 'text') {
        const picked = matchOption(text, options);
        if (!picked) {
          if (phase === 'answer') {
            await wa.sendText(ctx.tenantId, ctx.phone, c.invalidMessage ? r(c.invalidMessage) : 'Please choose one of the options below 👇');
            await ask();
            return { kind: 'wait', until: timeoutAt, waitingFor: 'reply', phase: 'answer_retry', note: `"${text.slice(0, 40)}" is not an option — asked again` };
          }
          if (c.acceptOther === false) { await save(''); return next(`"${text.slice(0, 40)}" is not an option — moved on`, false); }
          await save(text);
          return next(`Answer (not an option): "${text.slice(0, 60)}"`);
        }
        await save(picked);
        return next(`Answer: "${picked}"`);
      }
      await save(text.slice(0, 1000));
      return next(`Answer: "${text.slice(0, 60)}"`);
    }
    case 'ai_reply': {
      const why = await canMessage(ctx);
      if (why) return next(`Not answered: ${why}`, false);
      const question = String(ctx.run.vars?.message || '').trim();
      if (!question) return next('No message to answer');
      const { aiComplete } = await import('../aiGateway');
      const institute = String(ctx.resolve('institute') || 'our institute');
      const system = [
        `You answer WhatsApp messages for ${institute}, an institute that trains students for jobs.`,
        'Answer ONLY from the KNOWLEDGE below. Be warm, short (under 80 words) and reply in the language the person wrote in.',
        'If the knowledge does not contain the answer, or they ask to talk to a person, ask for a call, want to negotiate fees, or complain, reply with exactly: HANDOFF',
        'Never invent fees, dates, discounts, placements or guarantees.',
        c.instructions ? `Extra instructions: ${String(c.instructions).slice(0, 1000)}` : '',
        `KNOWLEDGE:\n"""\n${String(c.knowledge || '').slice(0, 12000)}\n"""`,
      ].filter(Boolean).join('\n');
      let answer = '';
      try {
        answer = (await aiComplete({ tenantId: ctx.tenantId, module: 'workflow_ai_reply', system, user: `Their message: """${question.slice(0, 1500)}"""\nName: ${ctx.resolve('first_name')}`, maxTokens: 300 })).trim();
      } catch (e: any) { answer = 'HANDOFF'; }
      if (!answer || /^handoff\b/i.test(answer)) {
        if (c.handoffMessage) await wa.sendText(ctx.tenantId, ctx.phone, r(c.handoffMessage));
        const ids = await staffToNotify(ctx, 'owner');
        await createNotifications(ctx.tenantId, ids, 'general', `🙋 ${ctx.resolve('name') || ctx.phone} needs a person`, `AI could not answer: "${question.slice(0, 120)}"`, `/whatsapp-inbox?phone=${ctx.phone}`).catch(() => undefined);
        if (c.pauseBot !== false) await WhatsAppThread.updateOne({ tenantId: ctx.run.tenantId, phone: ctx.phone }, { $set: { botPaused: true } }, { upsert: true });
        return next('AI could not answer — handed to a person');
      }
      const s = await wa.sendText(ctx.tenantId, ctx.phone, answer);
      return next(s.ok ? `AI replied: "${answer.slice(0, 80)}${answer.length > 80 ? '…' : ''}"` : `AI reply not sent: ${s.error}`, s.ok);
    }
    case 'wait': {
      if (phase === `wait:${step.id}`) return next('Wait over');
      const ms = Math.max(1, Number(c.amount) || 1) * (UNIT[c.unit] || HOUR);
      let until = new Date(ctx.now.getTime() + ms);
      if (c.officeHoursOnly) until = nextOpening(until, ctx.oh) || until;
      return { kind: 'wait', until, waitingFor: 'time', phase: `wait:${step.id}`, note: `Waiting ${c.amount} ${c.unit || 'hours'}` };
    }
    case 'wait_until': {
      if (phase === `until:${step.id}`) return next('Time reached');
      const demoAt = await demoTime(ctx);
      if (!demoAt) return next('No upcoming demo for this lead — skipped', false);
      const at = new Date(demoAt.getTime() + (Number(c.offsetMinutes) || 0) * MIN);
      if (at.getTime() <= ctx.now.getTime() + 30_000) return next('That time has already passed — skipped');
      return { kind: 'wait', until: at, waitingFor: 'time', phase: `until:${step.id}`, note: `Waiting until ${at.toLocaleString('en-IN', { timeZone: ctx.oh.timezone, day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}` };
    }
    case 'paths': {
      const p = choosePath(step.paths || [], ctx.resolve);
      if (!p) return { kind: 'goto', stepId: nextId, note: 'No path matched — continued' };
      return { kind: 'goto', stepId: p.steps?.[0]?.id || nextId, note: `Took "${p.name}"` };
    }
    case 'update_lead': {
      if (!ctx.lead) return next('No lead to update', false);
      const notes: string[] = [];
      if (c.stageId && String(c.stageId) !== String(ctx.lead.stageId)) {
        try {
          const { changeStage } = await import('../leadLifecycleService');
          const res = await changeStage({ tenantId: ctx.tenantId, leadId: String(ctx.lead._id), stageId: String(c.stageId), actor: await systemActor(ctx), source: 'automation', note: `Workflow: ${ctx.wf.name}` });
          notes.push(res.status === 'moved' ? `stage → ${res.toStageName}` : `stage change ${res.status}`);
        } catch (e: any) { notes.push(`stage not changed: ${e?.message}`); }
      }
      const set: Record<string, any> = {};
      if (c.priority) { set.priority = c.priority; notes.push(`priority → ${c.priority}`); }
      if (c.field && c.value != null && String(c.value).trim()) {
        const v = r(String(c.value));
        await saveToLead(ctx, c.field, v);
        notes.push(`${c.field} → ${v.slice(0, 40)}`);
      }
      const push: any = c.note && String(c.note).trim()
        ? { activities: { type: 'note', description: `🤖 ${r(c.note).slice(0, 1000)}`, createdBy: (await systemActor(ctx)).id, createdAt: new Date(), metadata: { workflowId: String(ctx.wf._id) } } }
        : null;
      if (push) notes.push('note added');
      if (Object.keys(set).length || push) await Lead.updateOne({ _id: ctx.lead._id, tenantId: ctx.run.tenantId }, { ...(Object.keys(set).length ? { $set: set } : {}), ...(push ? { $push: push } : {}) });
      return next(notes.length ? `Lead updated: ${notes.join(', ')}` : 'Nothing to change');
    }
    case 'assign': {
      if (!ctx.lead) return next('No lead to assign', false);
      if (c.mode === 'user' && mongoose.isValidObjectId(c.userId)) {
        if (String(ctx.lead.assignedTo || '') === String(c.userId)) return next('Already with that person');
        if (ctx.lead.assignedTo && c.onlyIfUnassigned !== false) return next('Already assigned — left as is');
        const u: any = await User.findOne({ _id: c.userId, tenantId: ctx.run.tenantId }).select('firstName lastName').lean();
        if (!u) return next('That person no longer exists', false);
        await Lead.updateOne({ _id: ctx.lead._id }, { $set: { assignedTo: oid(c.userId), 'assignment.assignedTo': oid(c.userId), 'assignment.assignedAt': new Date() } });
        return next(`Assigned to ${[u.firstName, u.lastName].filter(Boolean).join(' ')}`);
      }
      const { assignLead } = await import('../leadAssignmentService');
      const who = await assignLead(ctx.tenantId, String(ctx.lead._id), { afterCall: true });
      return next(who ? 'Assigned by the Lead Assignment setting' : 'Not assigned (Lead Assignment is manual or has nobody)', !!who);
    }
    case 'follow_up': {
      if (!ctx.lead) return next('No lead for the follow-up', false);
      const owner = (c.userId && mongoose.isValidObjectId(c.userId)) ? c.userId : (ctx.lead.assignedTo || ctx.lead.assignment?.assignedTo);
      if (!owner) return next('Lead has no owner — follow-up not created', false);
      const at = new Date(ctx.now.getTime() + Math.max(0, Number(c.inHours) || 0) * HOUR);
      await FollowUpReminder.updateOne(
        { tenantId: ctx.run.tenantId, automationKey: `wf:${ctx.run._id}:${step.id}` },
        { $setOnInsert: { tenantId: ctx.run.tenantId, leadId: ctx.lead._id, assignedTo: oid(owner), createdBy: oid(owner), automationKey: `wf:${ctx.run._id}:${step.id}`,
          type: c.type || 'call', title: r(c.title || 'Follow up').slice(0, 200), description: c.description ? r(c.description).slice(0, 1000) : `From workflow "${ctx.wf.name}"`,
          scheduledAt: at, priority: c.priority || 'medium', status: 'scheduled' } },
        { upsert: true },
      );
      await Lead.updateOne({ _id: ctx.lead._id, $or: [{ nextFollowUp: null }, { nextFollowUp: { $gt: at } }] }, { $set: { nextFollowUp: at } });
      return next(`Follow-up "${r(c.title || 'Follow up').slice(0, 60)}" created`);
    }
    case 'notify': {
      const ids = await staffToNotify(ctx, c.to || 'owner', c.userIds);
      if (!ids.length) return next('Nobody to notify', false);
      const link = ctx.lead ? `/leads/${ctx.lead._id}` : ctx.phone ? `/whatsapp-inbox?phone=${ctx.phone}` : undefined;
      await createNotifications(ctx.tenantId, ids, 'general', `🤖 ${ctx.wf.name}`, r(c.message).slice(0, 500), link);
      return next(`Notified ${ids.length} ${ids.length === 1 ? 'person' : 'people'}`);
    }
    case 'handoff': {
      if (c.message && !(await canMessage(ctx))) await wa.sendText(ctx.tenantId, ctx.phone, r(c.message));
      if (ctx.phone) await WhatsAppThread.updateOne({ tenantId: ctx.run.tenantId, phone: ctx.phone }, { $set: { botPaused: true } }, { upsert: true });
      const ids = await staffToNotify(ctx, c.to || 'owner', c.userIds);
      await createNotifications(ctx.tenantId, ids, 'general', `🙋 ${ctx.resolve('name') || ctx.phone} — over to you`, c.note ? r(c.note) : `Workflow "${ctx.wf.name}" handed this chat to a person.`, ctx.phone ? `/whatsapp-inbox?phone=${ctx.phone}` : undefined).catch(() => undefined);
      return { kind: 'stop', note: 'Handed to a person (bot paused for this chat)' };
    }
    case 'webhook': {
      const url = String(c.url || '');
      if (!/^https:\/\//i.test(url)) return next('Webhook needs an https link', false);
      const payload = {
        event: ctx.wf.trigger.type, workflow: { id: String(ctx.wf._id), name: ctx.wf.name },
        lead: ctx.lead ? { id: String(ctx.lead._id), name: ctx.lead.name, phone: ctx.lead.phone, email: ctx.lead.email, source: ctx.lead.source, course: ctx.lead.courseInterest, stage: ctx.resolve('stage_name') } : null,
        phone: ctx.phone, answers: ctx.run.vars?.answers || {}, trigger: ctx.run.vars?.trigger || {},
      };
      try {
        const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', 'User-Agent': 'LMS-Workflows/1.0' }, body: JSON.stringify(payload), signal: AbortSignal.timeout(8000) });
        return next(`Webhook answered ${res.status}`, res.ok);
      } catch (e: any) { return next(`Webhook failed: ${e?.message}`, false); }
    }
    case 'stop': return { kind: 'stop', note: 'Stop step' };
    default: return next(`Unknown step "${step.type}" skipped`, false);
  }
}

async function demoTime(ctx: Ctx): Promise<Date | null> {
  const m: any = ctx.run.meetingId
    ? await Meeting.findById(ctx.run.meetingId).select('scheduledAt status').lean()
    : ctx.lead ? await Meeting.findOne({ leadId: ctx.lead._id, tenantId: ctx.tenantId, status: { $in: ['scheduled', 'rescheduled'] }, scheduledAt: { $gte: ctx.now } }).sort({ scheduledAt: 1 }).select('scheduledAt status').lean() : null;
  if (!m || !['scheduled', 'rescheduled'].includes(m.status)) return null;
  return new Date(m.scheduledAt);
}

/** Write an answer onto the lead: email, name, course, or a custom field ("custom.city"). */
async function saveToLead(ctx: Ctx, target: string, value: string) {
  if (!ctx.lead) return;
  const q = { _id: ctx.lead._id, tenantId: ctx.run.tenantId };
  const v = String(value).slice(0, 500);
  if (target === 'email') { if (/^\S+@\S+\.\S+$/.test(v)) await Lead.updateOne(q, { $set: { email: v.toLowerCase() } }); return; }
  if (target === 'name') { await Lead.updateOne(q, { $set: { name: v } }); return; }
  if (target === 'course') { await Lead.updateOne(q, { $addToSet: { courseInterest: v } }); return; }
  if (target === 'passout_year') { await Lead.updateOne(q, { $set: { 'customFields.passoutYear': v } }); return; }
  if (target.startsWith('custom.')) {
    const key = target.slice(7).replace(/[^a-zA-Z0-9_]/g, '');
    if (key) await Lead.updateOne(q, { $set: { [`customFields.${key}`]: v } });
  }
}

/* ── Running ──────────────────────────────────────────────────────────────── */
async function logTo(runId: any, e: { stepId?: string; type?: string; ok: boolean; note: string }) {
  await WorkflowRun.updateOne({ _id: runId }, { $push: { log: { $each: [{ ...e, at: new Date(), note: e.note.slice(0, 1000) }], $slice: -150 } } });
}

async function finish(run: IWorkflowRun, status: 'completed' | 'stopped' | 'failed', reason: string) {
  await WorkflowRun.updateOne({ _id: run._id }, { $set: { status, endedAt: new Date(), endReason: reason.slice(0, 300), waitingFor: null, resumeAt: null, lockedAt: null, phase: null } });
  await Workflow.updateOne({ _id: run.workflowId }, { $inc: { [`stats.${status}`]: 1 } });
}

/** Run steps from where the (already claimed) run is until it waits or ends. */
export async function execute(runId: any, resumed?: Ctx['resumed']): Promise<void> {
  let run = await WorkflowRun.findById(runId);
  if (!run || run.status !== 'running') return;
  const wf: any = await Workflow.findById(run.workflowId).lean();
  if (!wf) return finish(run, 'stopped', 'The workflow was deleted');
  if (wf.status === 'paused' && !run.vars?.test) {
    await WorkflowRun.updateOne({ _id: run._id }, { $set: { status: 'waiting', waitingFor: run.waitingFor || 'time', resumeAt: new Date(Date.now() + 15 * MIN), lockedAt: null } });
    return;
  }
  if (wf.status === 'draft' && !run.vars?.test) return finish(run, 'stopped', 'The workflow was switched off');

  const index = indexSteps(wf.steps || []);
  let stepId: string | null = run.stepId || wf.steps?.[0]?.id || null;
  let pass = resumed;
  try {
    for (let i = 0; i < MAX_STEPS_PER_PASS; i++) {
      if (!stepId) return finish(run, 'completed', 'All steps done');
      const entry = index.get(stepId);
      if (!entry) return finish(run, 'stopped', 'The step it was waiting on was removed from the workflow');
      const ctx = await buildCtx(run, wf, pass);
      if (ctx.lead && (wf.settings?.stopStageIds || []).includes(String(ctx.lead.stageId))) {
        await logTo(run._id, { ok: true, note: `Lead is in "${ctx.resolve('stage_name')}" — stopped` });
        return finish(run, 'stopped', `Lead reached "${ctx.resolve('stage_name')}"`);
      }
      const res = await runStep(ctx, entry.step, entry.next);
      const type = entry.step.type;
      if (res.kind === 'wait') {
        if (res.note) await logTo(run._id, { stepId, type, ok: true, note: res.note });
        await WorkflowRun.updateOne({ _id: run._id }, { $set: { status: 'waiting', stepId, waitingFor: res.waitingFor, phase: res.phase, resumeAt: res.until, lockedAt: null } });
        return;
      }
      if (res.kind === 'stop') { await logTo(run._id, { stepId, type, ok: true, note: res.note }); return finish(run, 'stopped', res.note); }
      if (res.kind === 'fail') { await logTo(run._id, { stepId, type, ok: false, note: res.note }); return finish(run, 'failed', res.note); }
      if (res.note) await logTo(run._id, { stepId, type, ok: res.kind === 'next' ? res.ok !== false : true, note: res.note });
      stepId = res.kind === 'goto' ? res.stepId : entry.next;
      pass = undefined;
      await WorkflowRun.updateOne({ _id: run._id }, { $set: { stepId, phase: null, waitingFor: null, resumeAt: null } });
      const fresh = await WorkflowRun.findById(run._id);
      if (!fresh || fresh.status !== 'running') return; // stopped by someone meanwhile
      run = fresh;
    }
    // A loop that never waits is a mistake in the workflow — park it instead of spinning.
    await logTo(run._id, { ok: false, note: `Ran ${MAX_STEPS_PER_PASS} steps without waiting — paused for a minute` });
    await WorkflowRun.updateOne({ _id: run._id }, { $set: { status: 'waiting', stepId, waitingFor: 'time', resumeAt: new Date(Date.now() + MIN), lockedAt: null } });
  } catch (e: any) {
    console.error('[workflow] run failed', String(run._id), e?.message);
    await logTo(run._id, { stepId: stepId || undefined, ok: false, note: `Error: ${e?.message || e}` });
    await finish(run, 'failed', e?.message || 'error');
  }
}

/** Claim a waiting run (atomic) and continue it. */
async function claimAndRun(runId: any, resumed: Ctx['resumed']): Promise<boolean> {
  const claimed = await WorkflowRun.findOneAndUpdate({ _id: runId, status: 'waiting' }, { $set: { status: 'running', lockedAt: new Date() } }, { new: true });
  if (!claimed) return false;
  if (resumed?.text != null) await WorkflowRun.updateOne({ _id: runId }, { $set: { 'vars.message': resumed.text.slice(0, 2000) } });
  await execute(runId, resumed);
  return true;
}

/* ── Starting runs ────────────────────────────────────────────────────────── */
function triggerMatches(wf: any, ev: TriggerEvent, oh: OfficeHours): { ok: boolean; keyword?: string } {
  const c = wf.trigger?.config || {};
  const d = ev.data || {};
  const list = (v: any) => (Array.isArray(v) ? v.map(String).filter(Boolean) : []);
  switch (ev.type) {
    case 'lead_created': { const s = list(c.sources); return { ok: !s.length || s.includes(String(d.source || '')) }; }
    case 'stage_changed': return { ok: list(c.stageIds).includes(String(d.stageId || '')) };
    case 'demo_booked': { const t = list(c.meetingTypes); return { ok: !t.length || t.includes(String(d.meetingType || '')) }; }
    case 'demo_outcome': { const o = list(c.outcomes); return { ok: !o.length || o.includes(String(d.outcome || '')) }; }
    case 'call_result': { const o = list(c.outcomes); return { ok: !o.length || o.includes(String(d.outcome || '')) }; }
    case 'message_received': {
      if (ev.botPaused && !wf.settings?.runWhenHumanTakenOver) return { ok: false };
      const open = isOpen(new Date(), oh);
      if (c.officeHours === 'outside' && open) return { ok: false };
      if (c.officeHours === 'inside' && !open) return { ok: false };
      if (c.match === 'keywords') {
        const k = matchKeyword(String(d.text || ''), list(c.keywords), c.matchMode === 'exact' ? 'exact' : 'contains');
        return { ok: !!k, keyword: k || undefined };
      }
      return { ok: true };
    }
    case 'manual': return { ok: true };
    default: return { ok: false };
  }
}

/** Start one run. Returns the run id, or null when this person may not start it again. */
async function startRun(wf: any, ev: TriggerEvent, extra: Record<string, any> = {}): Promise<string | null> {
  const tenantId = String(wf.tenantId);
  let leadId = ev.leadId ? String(ev.leadId) : '';
  let phone = ev.phone ? normalizeTo(ev.phone) : '';
  if (leadId && !phone) {
    const l: any = await Lead.findById(leadId).select('phone').lean();
    phone = l?.phone ? normalizeTo(l.phone) : '';
  }
  if (!leadId && phone) {
    const l = await findLeadByPhone(tenantId, phone);
    if (l) leadId = String(l._id);
  }
  const person = leadId || phone;
  if (!person) return null;
  const s = wf.settings || {};
  const now = Date.now();
  let dedupeKey: string;
  if (ev.test) dedupeKey = `test:${person}:${now}`;
  else if (ev.type === 'demo_booked') dedupeKey = `demo:${ev.meetingId}:${new Date(ev.data?.scheduledAt || 0).getTime()}`;
  else if (ev.type === 'demo_outcome') dedupeKey = `demo:${ev.meetingId}:${ev.data?.outcome}`;
  else if (!s.allowReentry) dedupeKey = `p:${person}`;
  else {
    if (s.cooldownMinutes > 0) {
      const recent = await WorkflowRun.exists({ workflowId: wf._id, $or: [{ leadId: leadId || undefined }, { phone }].filter((x: any) => Object.values(x)[0]), createdAt: { $gt: new Date(now - s.cooldownMinutes * MIN) } });
      if (recent) return null;
    }
    // Never two live runs of the same workflow for one person.
    const live = await WorkflowRun.exists({ workflowId: wf._id, status: { $in: ['running', 'waiting'] }, ...(leadId ? { leadId: oid(leadId) } : { phone }) });
    if (live) return null;
    dedupeKey = `p:${person}:${now}`;
  }
  // The unique index is the real guard (two servers at once); this check also covers a database
  // whose index is still being built.
  if (await WorkflowRun.exists({ workflowId: wf._id, dedupeKey })) return null;
  try {
    const run = await WorkflowRun.create({
      tenantId: wf.tenantId, workflowId: wf._id, leadId: leadId ? oid(leadId) : null, phone, meetingId: ev.meetingId ? oid(ev.meetingId) : null,
      dedupeKey, status: 'running', lockedAt: new Date(),
      vars: { trigger: { type: ev.type, ...(ev.data || {}), ...extra }, answers: {}, message: ev.data?.text || '', ...(ev.test ? { test: true } : {}) },
      log: [{ at: new Date(), ok: true, note: ev.test ? 'Test run started from the builder' : `Started: ${describeTrigger(ev, extra)}` }],
    });
    await Workflow.updateOne({ _id: wf._id }, { $inc: { 'stats.started': 1 }, $set: { 'stats.lastRunAt': new Date() } });
    return String(run._id);
  } catch (e: any) {
    if (e?.code === 11000) return null; // already ran for this person / this demo time
    throw e;
  }
}

function describeTrigger(ev: TriggerEvent, extra: Record<string, any>): string {
  const d = ev.data || {};
  switch (ev.type) {
    case 'lead_created': return `new lead${d.source ? ` from ${d.source}` : ''}`;
    case 'stage_changed': return `moved to ${d.stageName || 'a stage'}`;
    case 'message_received': return extra.keyword ? `message matched "${extra.keyword}"` : `WhatsApp message "${String(d.text || '').slice(0, 40)}"`;
    case 'demo_booked': return 'demo booked';
    case 'demo_outcome': return `demo ${d.outcome === 'completed' ? 'attended' : String(d.outcome || '').replace('_', '-')}`;
    case 'call_result': return `AI call result: ${d.outcome}`;
    default: return ev.type;
  }
}

/**
 * A trigger happened: start (and run) every matching active workflow. Returns how many started.
 * Never throws — a broken workflow must not break saving a lead or receiving a message.
 */
export async function fire(ev: TriggerEvent): Promise<number> {
  try {
    if (!ev.tenantId || !mongoose.isValidObjectId(ev.tenantId)) return 0;
    const q: any = ev.workflowId ? { _id: ev.workflowId, tenantId: oid(ev.tenantId) } : { tenantId: oid(ev.tenantId), status: 'active', 'trigger.type': ev.type };
    const wfs: any[] = await Workflow.find(q).lean();
    if (!wfs.length) return 0;
    const oh = await officeHoursFor(ev.tenantId);
    let candidates = wfs.map((wf) => ({ wf, m: ev.test ? { ok: true } : triggerMatches(wf, ev, oh) })).filter((x) => x.m.ok);
    // Keyword replies win over catch-all replies (an out-of-office reply still goes out).
    if (ev.type === 'message_received' && candidates.some((x) => x.wf.trigger?.config?.match === 'keywords')) {
      candidates = candidates.filter((x) => x.wf.trigger?.config?.match === 'keywords' || x.wf.trigger?.config?.officeHours === 'outside');
    }
    const ids: string[] = [];
    for (const { wf, m } of candidates) {
      const id = await startRun(wf, ev, m.keyword ? { keyword: m.keyword } : {});
      if (id) ids.push(id);
    }
    for (const id of ids) await execute(id);
    return ids.length;
  } catch (e: any) {
    console.error('[workflow] fire failed', ev.type, e?.message);
    return 0;
  }
}

/** Stop live runs (e.g. a demo was cancelled). */
export async function stopRuns(filter: Record<string, any>, reason: string): Promise<number> {
  const runs = await WorkflowRun.find({ ...filter, status: { $in: ['running', 'waiting'] } }).select('_id workflowId').lean();
  for (const r of runs as any[]) {
    const res = await WorkflowRun.updateOne({ _id: r._id, status: { $in: ['running', 'waiting'] } }, { $set: { status: 'stopped', endedAt: new Date(), endReason: reason, waitingFor: null, resumeAt: null, lockedAt: null }, $push: { log: { at: new Date(), ok: true, note: reason } } });
    if (res.modifiedCount) await Workflow.updateOne({ _id: r.workflowId }, { $inc: { 'stats.stopped': 1 } });
  }
  return runs.length;
}

/**
 * A person on the team replied in the chat: conversational runs for this number stop (questions,
 * welcome flows, auto-replies), so the lead never gets the bot and a human at the same time.
 * Reminder-type runs (demos, stage sequences) keep going. Returns the stopped workflows' names.
 */
export async function stopForTakeover(tenantId: string, rawPhone: string, who: string): Promise<string[]> {
  const phone = normalizeTo(rawPhone);
  const live = await WorkflowRun.find({ tenantId: oid(tenantId), phone, status: { $in: ['running', 'waiting'] } }).select('_id workflowId waitingFor').lean();
  if (!live.length) return [];
  const wfs = await Workflow.find({ _id: { $in: live.map((r: any) => r.workflowId) } }).select('name trigger.type').lean();
  const byId = new Map(wfs.map((w: any) => [String(w._id), w]));
  const chatty = live.filter((r: any) => r.waitingFor === 'reply' || ['lead_created', 'message_received'].includes((byId.get(String(r.workflowId)) as any)?.trigger?.type));
  if (!chatty.length) return [];
  await stopRuns({ _id: { $in: chatty.map((r: any) => r._id) } }, `${who} took over the chat`);
  return Array.from(new Set(chatty.map((r: any) => (byId.get(String(r.workflowId)) as any)?.name || 'Workflow')));
}

/** Is a workflow talking to this number right now? (The old bot stays quiet if so.) */
export async function hasLiveRun(tenantId: string, rawPhone: string): Promise<boolean> {
  return !!(await WorkflowRun.exists({ tenantId: oid(tenantId), phone: normalizeTo(rawPhone), status: { $in: ['running', 'waiting'] } }));
}

/** An active "New lead arrives" workflow that covers WhatsApp leads replaces the old bot's welcome. */
export async function workflowWelcomesNewLeads(tenantId: string): Promise<boolean> {
  return !!(await Workflow.exists({
    tenantId: oid(tenantId), status: 'active', 'trigger.type': 'lead_created',
    $or: [{ 'trigger.config.sources': { $exists: false } }, { 'trigger.config.sources': { $size: 0 } }, { 'trigger.config.sources': 'whatsapp' }],
  }));
}

/* ── WhatsApp messages coming in ─────────────────────────────────────────── */
export interface InboundResult { handled: boolean; answered: number; started: number; optOut?: boolean }

/**
 * Called by the WhatsApp webhook for every text/button message, before the old qualification bot.
 * `handled` = a workflow took care of it, so the old bot must stay quiet.
 */
export async function onInbound(tenantId: string, rawPhone: string, name: string, text: string, opts: { botPaused?: boolean } = {}): Promise<InboundResult> {
  const out: InboundResult = { handled: false, answered: 0, started: 0 };
  try {
    const phone = normalizeTo(rawPhone);
    const t = String(text || '').trim();
    if (!phone || !t) return out;
    const word = t.toLowerCase().replace(/[.!]+$/, '');
    const usesWorkflows = await Workflow.exists({ tenantId: oid(tenantId), status: 'active' });

    if (usesWorkflows && OPT_OUT_WORDS.includes(word)) {
      await wa.setOptOut(tenantId, phone, true);
      await stopRuns({ tenantId: oid(tenantId), phone }, 'They sent STOP');
      await wa.sendText(tenantId, phone, "You won't get automatic messages from us any more. Reply START to turn them back on.");
      return { ...out, handled: true, optOut: true };
    }
    if (usesWorkflows && OPT_IN_WORDS.includes(word)) {
      const th = await wa.threadOf(tenantId, phone);
      if (th?.automationOptOutAt) {
        await wa.setOptOut(tenantId, phone, false);
        await wa.sendText(tenantId, phone, 'Welcome back! You will get our updates again. 🙂');
        return { ...out, handled: true };
      }
    }

    // 1. Answers to a question a workflow asked (or the first message a question was waiting for).
    const waiting = await WorkflowRun.find({ tenantId: oid(tenantId), phone, status: 'waiting', waitingFor: 'reply' }).select('_id').lean();
    for (const r of waiting as any[]) if (await claimAndRun(r._id, { reason: 'reply', text: t })) out.answered++;

    // 2. Follow-up sequences that stop when the person replies.
    const timed = await WorkflowRun.find({ tenantId: oid(tenantId), phone, status: 'waiting', waitingFor: 'time' }).select('_id workflowId').lean();
    if (timed.length) {
      const stopIds = new Set((await Workflow.find({ _id: { $in: timed.map((r: any) => r.workflowId) }, 'settings.stopOnReply': true }).select('_id').lean()).map((w: any) => String(w._id)));
      const ids = timed.filter((r: any) => stopIds.has(String(r.workflowId))).map((r: any) => r._id);
      if (ids.length) await stopRuns({ _id: { $in: ids } }, 'They replied — sequence stopped');
    }

    // 3. "Message received" workflows (keywords, out-of-office, AI assistant…), unless a question just took the message.
    if (!out.answered && usesWorkflows) {
      out.started = await fire({ tenantId, type: 'message_received', phone, botPaused: !!opts.botPaused, data: { text: t.slice(0, 2000), name } });
    }
    out.handled = out.answered > 0 || out.started > 0;
    return out;
  } catch (e: any) {
    console.error('[workflow] inbound failed', e?.message);
    return out;
  }
}

/** A lead was just created for a WhatsApp number: link the runs that started with only the number. */
export async function attachLeadToRuns(tenantId: string, rawPhone: string, leadId: any): Promise<void> {
  await WorkflowRun.updateMany({ tenantId: oid(tenantId), phone: normalizeTo(rawPhone), leadId: null, status: { $in: ['running', 'waiting'] } }, { $set: { leadId: oid(leadId) } })
    .catch((e) => console.warn('[workflow] could not link lead to runs', e?.message));
}

/* ── Demos ───────────────────────────────────────────────────────────────── */
const DEMO_TYPES = ['online_demo', 'campus_visit'];
const LIVE_DEMO = ['scheduled', 'rescheduled'];

/** A demo was booked or moved: restart its reminder runs for the new time. */
export async function onDemoBooked(tenantId: string, meeting: any): Promise<void> {
  if (!DEMO_TYPES.includes(meeting?.type) || !LIVE_DEMO.includes(meeting?.status)) return;
  await stopRuns({ tenantId: oid(tenantId), meetingId: meeting._id, dedupeKey: { $regex: /^demo:.*:\d+$/ } }, 'The demo was moved — reminders restarted for the new time');
  await fire({ tenantId, type: 'demo_booked', leadId: meeting.leadId, meetingId: meeting._id, data: { meetingType: meeting.type, scheduledAt: meeting.scheduledAt } });
}

/** A demo changed (time or status). */
export async function onDemoChanged(tenantId: string, meeting: any, before: any): Promise<void> {
  if (!DEMO_TYPES.includes(meeting?.type)) return;
  const moved = before && String(new Date(before.scheduledAt)) !== String(new Date(meeting.scheduledAt));
  if (LIVE_DEMO.includes(meeting.status) && (moved || !LIVE_DEMO.includes(before?.status))) { await onDemoBooked(tenantId, meeting); return; }
  if (meeting.status !== before?.status && ['completed', 'no_show', 'cancelled', 'declined'].includes(meeting.status)) {
    await stopRuns({ tenantId: oid(tenantId), meetingId: meeting._id, dedupeKey: { $regex: /^demo:.*:\d+$/ } }, `Demo ${meeting.status === 'completed' ? 'attended' : meeting.status.replace('_', '-')} — reminders stopped`);
    await fire({ tenantId, type: 'demo_outcome', leadId: meeting.leadId, meetingId: meeting._id, data: { outcome: meeting.status === 'declined' ? 'cancelled' : meeting.status, meetingType: meeting.type } });
  }
}

/* ── The minute job ──────────────────────────────────────────────────────── */
export async function resumeDue(limit = 200): Promise<number> {
  const now = new Date();
  // A server that died mid-run: put the run back in the queue.
  await WorkflowRun.updateMany({ status: 'running', lockedAt: { $lt: new Date(now.getTime() - 10 * MIN) } }, { $set: { status: 'waiting', resumeAt: now, lockedAt: null } });
  const due = await WorkflowRun.find({ status: 'waiting', resumeAt: { $ne: null, $lte: now } }).sort({ resumeAt: 1 }).limit(limit).select('_id').lean();
  let n = 0;
  for (const r of due as any[]) {
    try { if (await claimAndRun(r._id, { reason: 'time' })) n++; } catch (e: any) { console.error('[workflow] resume failed', e?.message); }
  }
  return n;
}
