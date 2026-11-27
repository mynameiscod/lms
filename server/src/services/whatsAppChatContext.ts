import { quietReason } from './whatsAppReplyContext';
import mongoose from 'mongoose';
import WhatsAppThread from '../models/WhatsAppThread';
import WhatsAppConversationState from '../models/WhatsAppConversationState';
import Lead from '../models/Lead';
import LeadStage from '../models/LeadStage';
import LeadSubStage from '../models/LeadSubStage';
import User from '../models/User';
import { Workflow, WorkflowRun } from '../models/Workflow';
import { normalizeTo } from './assessmentOtpService';
import { effectiveOwner } from './whatsAppChatInbox';

/**
 * The side panel next to a conversation: who this person is in the CRM, every answer an
 * automation collected from them (workflow questions and the old bot), and which automation —
 * if any — is talking to them right now. Read-only.
 */

const oid = (id: string) => new mongoose.Types.ObjectId(id);
const fullName = (u: any) => [u?.firstName, u?.lastName].filter(Boolean).join(' ').trim() || u?.email || '';
const humanKey = (k: string) => k.replace(/[_\-.]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
const BOT_LIVE_MS = 48 * 60 * 60 * 1000;

export interface ContextAnswer { question: string; answer: string; from: string; at?: Date }

export async function threadContext(tenantId: string, rawPhone: string) {
  const phone = normalizeTo(String(rawPhone || ''));
  const tid = oid(tenantId);
  const t: any = await WhatsAppThread.findOne({ tenantId: tid, phone }).select('assignedTo links botPaused handledAt lastInboundAt lastStaffReplyAt').lean();

  const [lead, runs, bot]: any[] = await Promise.all([
    t?.links?.leadId
      ? Lead.findOne({ _id: t.links.leadId, tenantId: tid })
        .select('name email phone source stageId subStageId priority score courseInterest nextFollowUp lastContactedAt lastCallOutcome createdAt customFields whatsappEngagement')
        .lean()
      : null,
    WorkflowRun.find({ tenantId: tid, phone }).sort({ createdAt: -1 }).limit(8).select('workflowId status waitingFor phase vars.answers endReason createdAt updatedAt log').lean(),
    WhatsAppConversationState.findOne({ tenantId: String(tenantId), phone }).lean(),
  ]);

  const [stage, sub, wfs, owner]: any[] = await Promise.all([
    lead?.stageId ? LeadStage.findById(lead.stageId).select('name color').lean() : null,
    lead?.subStageId ? LeadSubStage.findById(lead.subStageId).select('name').lean() : null,
    Workflow.find({ _id: { $in: (runs as any[]).map((r) => r.workflowId) } }).select('name').lean(),
    effectiveOwner(tenantId, t),
  ]);
  const wfName = new Map((wfs as any[]).map((w) => [String(w._id), w.name]));
  const ownerUser: any = owner.id ? await User.findById(owner.id).select('firstName lastName email').lean() : null;

  // Answers: workflow questions first (newest run first), then the old bot's.
  const answers: ContextAnswer[] = [];
  for (const r of runs as any[]) {
    for (const [k, v] of Object.entries(r.vars?.answers || {})) {
      if (v === undefined || v === null || v === '') continue;
      answers.push({ question: humanKey(k), answer: String(v), from: `Workflow · ${wfName.get(String(r.workflowId)) || 'deleted'}`, at: r.updatedAt });
    }
  }
  let botInfo: { step: string; asked: number; total: number; paused: boolean; live: boolean } | null = null;
  if (bot) {
    const { loadBotQuestions } = await import('../controllers/whatsappWebhookController');
    const questions: any[] = await loadBotQuestions(tenantId).catch(() => []);
    const map: Record<string, string> = bot.answers instanceof Map ? Object.fromEntries(bot.answers) : (bot.answers || {});
    for (const q of questions) {
      const a = map[q.id];
      if (a) answers.push({ question: String(q.question || q.id).split('\n')[0].replace(/^[^\p{L}\p{N}]+/u, '').slice(0, 120), answer: String(a), from: 'Old bot', at: bot.lastMessageAt });
    }
    const live = bot.conversationStep === 'in_progress' && Date.now() - new Date(bot.lastMessageAt).getTime() < BOT_LIVE_MS;
    botInfo = {
      step: bot.conversationStep,
      asked: bot.conversationStep === 'qualified' ? questions.length : Math.min((bot.currentQuestionIndex || 0) + (bot.conversationStep === 'in_progress' ? 1 : 0), questions.length),
      total: questions.length,
      paused: !!t?.botPaused,
      live: live && !t?.botPaused,
    };
  }

  const custom: Record<string, any> = lead?.customFields instanceof Map ? Object.fromEntries(lead.customFields) : (lead?.customFields || {});
  const savedOnLead = Object.entries(custom)
    .filter(([, v]) => v !== null && v !== undefined && v !== '' && typeof v !== 'object')
    .slice(0, 12)
    .map(([k, v]) => ({ label: humanKey(k), value: String(v) }));

  const quiet = await quietReason(tenantId, phone).catch(() => null);
  return {
    /** Why nothing automatic answers this person (reply to a hiring/wishes message, student…). */
    quiet,
    owner: ownerUser ? { _id: String(ownerUser._id), name: fullName(ownerUser), from: owner.from } : null,
    lead: lead ? {
      _id: String(lead._id),
      name: lead.name,
      email: lead.email || '',
      source: lead.source || '',
      stage: stage ? { name: stage.name, color: stage.color } : null,
      subStage: sub?.name || '',
      priority: lead.priority || '',
      score: lead.score ?? null,
      courses: lead.courseInterest || [],
      nextFollowUp: lead.nextFollowUp || null,
      lastContactedAt: lead.lastContactedAt || null,
      lastCallOutcome: lead.lastCallOutcome || '',
      createdAt: lead.createdAt,
      savedOnLead,
    } : null,
    placement: t?.links?.placementId ? { _id: String(t.links.placementId), name: t.links.placementName || '' } : null,
    student: t?.links?.userId ? { _id: String(t.links.userId), name: t.links.userName || '' } : null,
    automation: {
      workflows: (runs as any[]).map((r) => {
        const last = (r.log || []).slice(-1)[0];
        return {
          name: wfName.get(String(r.workflowId)) || 'Deleted workflow',
          workflowId: String(r.workflowId),
          status: r.status as string,
          waitingFor: r.waitingFor || null,
          note: r.status === 'waiting' && r.waitingFor === 'reply' ? (r.phase === 'window' ? 'Waiting for them to message first' : 'Waiting for their answer') : (r.endReason || last?.note || ''),
          at: r.updatedAt,
        };
      }),
      bot: botInfo,
    },
    answers,
  };
}
