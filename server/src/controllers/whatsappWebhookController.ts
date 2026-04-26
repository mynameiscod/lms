import { Request, Response } from 'express';
import Lead from '../models/Lead';
import LeadStage from '../models/LeadStage';
import mongoose from 'mongoose';
import { getDecryptedTokens } from './leadSourceConfigController';
import LeadSourceConfig from '../models/LeadSourceConfig';
import { scoreAndAssignLead } from '../services/leadScoringService';
import WhatsAppConversationState, { ConversationStep } from '../models/WhatsAppConversationState';
import QualificationQuestionConfig, { IQualificationQuestion } from '../models/QualificationQuestionConfig';

// ===================== TYPES =====================

interface WhatsAppMessage {
  from: string; // Phone number
  timestamp: string;
  type: 'text' | 'image' | 'audio' | 'video' | 'document' | 'interactive';
  text?: { body: string };
  interactive?: { button_reply?: { id: string; title: string }; list_reply?: { id: string; title: string } };
}

interface WhatsAppWebhookPayload {
  object: string;
  entry: Array<{
    id: string;
    changes: Array<{
      value: {
        messaging_product: string;
        metadata: { display_phone_number: string; phone_number_id: string };
        contacts?: Array<{ profile: { name: string }; wa_id: string }>;
        messages?: WhatsAppMessage[];
        statuses?: Array<{ id: string; status: string; timestamp: string; recipient_id: string }>;
      };
      field: string;
    }>;
  }>;
}

interface DynConversationState {
  phone: string;
  tenantId: string;
  conversationStep: ConversationStep;
  currentQuestionIndex: number;
  answers: Map<string, string>;
  scoreSoFar: number;
  name?: string;
  lastMessageAt: Date;
}

// ===================== PERSISTENT STATE HELPERS =====================

async function getConversationState(phone: string, tenantId: string): Promise<DynConversationState | null> {
  const doc = await WhatsAppConversationState.findOne({ phone, tenantId }).lean() as any;
  if (!doc) return null;
  return {
    phone: doc.phone,
    tenantId: doc.tenantId,
    conversationStep: doc.conversationStep as ConversationStep,
    currentQuestionIndex: doc.currentQuestionIndex ?? 0,
    answers: new Map(Object.entries(doc.answers ?? {})),
    scoreSoFar: doc.scoreSoFar ?? 0,
    name: doc.name,
    lastMessageAt: doc.lastMessageAt,
  };
}

async function setConversationState(state: DynConversationState): Promise<void> {
  await WhatsAppConversationState.findOneAndUpdate(
    { phone: state.phone, tenantId: state.tenantId },
    {
      $set: {
        conversationStep: state.conversationStep,
        currentQuestionIndex: state.currentQuestionIndex,
        answers: Object.fromEntries(state.answers),
        scoreSoFar: state.scoreSoFar,
        name: state.name,
        lastMessageAt: new Date(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    },
    { upsert: true, new: true }
  );
}

async function deleteConversationState(phone: string, tenantId: string): Promise<void> {
  await WhatsAppConversationState.deleteOne({ phone, tenantId });
}

// ===================== LOAD CONFIGURED QUESTIONS FROM DB =====================

const DEFAULT_QUESTIONS: IQualificationQuestion[] = [
  { id: 'q_name', question: "📝 What's your full name?", category: 'personal', answerType: 'text', order: 1, required: true, enabled: true, fieldToUpdate: 'name', scoreImpact: [], skipKeywords: [] },
  { id: 'q_graduation', question: "🎓 What's your year of graduation (or expected year)?", category: 'education', answerType: 'text', order: 2, required: false, enabled: true, fieldToUpdate: 'customFields.yearOfGraduation', scoreImpact: [], skipKeywords: [] },
  { id: 'q_course', question: "📚 Which course are you interested in?\n\n1️⃣ Full Stack Development\n2️⃣ Data Science\n3️⃣ Cloud & DevOps\n4️⃣ Mobile App Development\n5️⃣ Other\n\nReply with a number or course name.", category: 'career', answerType: 'select', options: ['Full Stack Development', 'Data Science', 'Cloud & DevOps', 'Mobile App Development', 'Other'], order: 3, required: false, enabled: true, fieldToUpdate: 'courseInterest', scoreImpact: [{ answerValue: 'Full Stack Development', impact: 5 }, { answerValue: 'Data Science', impact: 5 }], skipKeywords: [] },
  { id: 'q_mode', question: "💻 Would you prefer Online or Offline training?", category: 'technical', answerType: 'select', options: ['Online', 'Offline', 'Either is fine'], order: 4, required: false, enabled: true, fieldToUpdate: 'interests.mode', scoreImpact: [], skipKeywords: [] },
  { id: 'q_timeline', question: "📅 When are you planning to start? (immediately / next month / just exploring)", category: 'timeline', answerType: 'text', order: 5, required: false, enabled: true, fieldToUpdate: 'interests.urgency', scoreImpact: [{ answerValue: 'immediately', impact: 15 }, { answerValue: 'next month', impact: 8 }], skipKeywords: ['exploring'] },
];

async function loadQuestions(tenantId: string): Promise<IQualificationQuestion[]> {
  const config = await QualificationQuestionConfig.findOne({
    tenantId: new mongoose.Types.ObjectId(tenantId),
    isActive: true,
  }).lean() as any;
  if (!config?.questions?.length) return DEFAULT_QUESTIONS;
  return (config.questions as IQualificationQuestion[])
    .filter((q) => q.enabled)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    .slice(0, config.whatsappSettings?.maxQuestions ?? 5);
}

async function loadQualificationSettings(tenantId: string) {
  const config = await QualificationQuestionConfig.findOne({
    tenantId: new mongoose.Types.ObjectId(tenantId),
    isActive: true,
  }).lean() as any;
  return {
    welcomeMessage: config?.whatsappSettings?.welcomeMessage
      ?? '👋 Hi {{name}}! Thanks for your interest 😊. I have a few quick questions to understand your needs better.',
    completionMessage: config?.whatsappSettings?.completionMessage
      ?? '🎉 Thank you {{name}}! Our counselor will reach you very soon with course details.',
    enabled: config?.whatsappSettings?.enabled !== false,
  };
}

function resolveAnswer(raw: string, q: IQualificationQuestion): string {
  if (!q.options?.length) return raw.trim();
  const lower = raw.toLowerCase().trim();
  const idx = parseInt(lower, 10);
  if (!isNaN(idx) && idx >= 1 && idx <= q.options.length) return q.options[idx - 1];
  const match = q.options.find((o) => o.toLowerCase().includes(lower) || lower.includes(o.toLowerCase().split(' ')[0]));
  return match ?? raw.trim();
}

function calcScore(answer: string, q: IQualificationQuestion): number {
  if (!q.scoreImpact?.length) return 0;
  const ansLower = answer.toLowerCase();
  let best = 0;
  for (const rule of q.scoreImpact) {
    const ruleLower = String(rule.answerValue).toLowerCase();
    if (ruleLower === ansLower || ansLower.includes(ruleLower)) best = Math.max(best, rule.impact);
  }
  return best;
}

async function updateLeadField(phone: string, tenantId: string, fieldPath: string, value: string) {
  try {
    const updateObj: any = {};
    if (fieldPath === 'courseInterest') {
      updateObj['$push'] = { courseInterest: value };
    } else if (fieldPath.startsWith('customFields.')) {
      updateObj['$set'] = { [`customFields.${fieldPath.replace('customFields.', '')}`]: value };
    } else if (fieldPath === 'name') {
      updateObj['$set'] = { name: value };
    } else if (fieldPath === 'interests.mode') {
      const m: Record<string, string> = { online: 'online', offline: 'offline', 'either is fine': 'hybrid', hybrid: 'hybrid' };
      updateObj['$set'] = { 'interests.mode': m[value.toLowerCase()] ?? 'undecided' };
    } else if (fieldPath === 'interests.urgency') {
      const u: Record<string, string> = { immediately: 'immediate', immediate: 'immediate', 'next month': 'soon', soon: 'soon', exploring: 'exploring', 'just exploring': 'exploring' };
      updateObj['$set'] = { 'interests.urgency': u[value.toLowerCase()] ?? 'exploring' };
    } else {
      updateObj['$set'] = { [fieldPath]: value };
    }
    await Lead.findOneAndUpdate(
      { tenantId: new mongoose.Types.ObjectId(tenantId), phone: { $regex: phone.slice(-10), $options: 'i' } },
      updateObj
    );
  } catch (err) {
    console.error('[WA] updateLeadField error:', fieldPath, err);
  }
}

// ===================== TENANT RESOLVER =====================

async function resolveTenantByPhoneNumberId(phoneNumberId: string): Promise<{ tenantId: string; accessToken: string } | null> {
  const tenantConfig = await LeadSourceConfig.findOne({
    'whatsApp.config.phoneNumberId': phoneNumberId,
    'whatsApp.isConnected': true,
  });
  if (tenantConfig) {
    const tokens = await getDecryptedTokens(tenantConfig.tenantId.toString());
    if (tokens?.whatsApp.accessToken) {
      return { tenantId: tenantConfig.tenantId.toString(), accessToken: tokens.whatsApp.accessToken };
    }
  }
  const envTenantId = process.env.DEFAULT_TENANT_ID;
  const envToken = process.env.WHATSAPP_ACCESS_TOKEN;
  if (envTenantId && envToken) return { tenantId: envTenantId, accessToken: envToken };
  return null;
}

// ===================== WEBHOOK VERIFICATION (GET) =====================

export const verifyWebhook = async (req: Request, res: Response) => {
  try {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];
    const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN || 'codebegun_whatsapp_verify';
    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      res.status(200).send(challenge);
    } else {
      res.status(403).json({ error: 'Verification failed' });
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

// ===================== WEBHOOK HANDLER (POST) =====================

export const handleWebhook = async (req: Request, res: Response) => {
  try {
    const payload: WhatsAppWebhookPayload = req.body;
    // Always 200 quickly to avoid WA retries
    res.status(200).send('EVENT_RECEIVED');
    processWhatsAppMessage(payload).catch(err => {
      console.error('[WA] processWhatsAppMessage error:', err);
    });
  } catch (error: any) {
    console.error('❌ WhatsApp webhook error:', error);
    res.status(200).send('EVENT_RECEIVED'); // Always 200 to prevent retries
  }
};

// ===================== MESSAGE PROCESSOR =====================

async function processWhatsAppMessage(payload: WhatsAppWebhookPayload) {
  console.log('🔄 Processing WhatsApp payload, object:', payload.object);
  if (payload.object !== 'whatsapp_business_account') {
    console.log('⚠️ Ignoring non-WhatsApp payload:', payload.object);
    return;
  }

  for (const entry of payload.entry) {
    for (const change of entry.changes) {
      const value = change.value;
      
      console.log('📨 Change field:', change.field, 'Messages:', value.messages?.length || 0, 'Statuses:', value.statuses?.length || 0);

      // Handle status updates (delivered, read, etc.)
      if (value.statuses && value.statuses.length > 0) {
        console.log('📊 Status update:', value.statuses[0].status, 'for', value.statuses[0].recipient_id);
        continue;
      }

      if (!value.messages?.length) {
        continue;
      }

      const message = value.messages[0];
      const contact = value.contacts?.[0];
      const phoneNumber = message.from;
      const senderName = contact?.profile?.name || 'Unknown';

      let messageText = '';
      if (message.type === 'text' && message.text) {
        messageText = message.text.body;
      } else if (message.type === 'interactive') {
        messageText = message.interactive?.button_reply?.title ||
                      message.interactive?.list_reply?.title || '';
      }

      if (!messageText) continue;

      const tenantInfo = await resolveTenantByPhoneNumberId(value.metadata.phone_number_id);
      if (!tenantInfo) {
        console.error(`[WA] Cannot resolve tenant for phoneNumberId: ${value.metadata.phone_number_id}`);
        continue;
      }

      await handleConversation(phoneNumber, senderName, messageText, value.metadata.phone_number_id, tenantInfo);
    }
  }
}

// ===================== DYNAMIC CONVERSATION HANDLER =====================

async function handleConversation(
  phoneNumber: string,
  senderName: string,
  messageText: string,
  phoneNumberId: string,
  tenantInfo: { tenantId: string; accessToken: string }
) {
  const { tenantId, accessToken } = tenantInfo;
  const questions = await loadQuestions(tenantId);
  const settings = await loadQualificationSettings(tenantId);

  if (!settings.enabled) {
    await appendMessageToLead(phoneNumber, messageText, tenantId);
    return;
  }

  let state = await getConversationState(phoneNumber, tenantId);

  // Already qualified — just log
  if (state?.conversationStep === 'qualified') {
    await appendMessageToLead(phoneNumber, messageText, tenantId);
    await sendWhatsAppMessage(phoneNumberId, phoneNumber, `Thanks for your message! Our team will get back to you soon. 🙂`, accessToken);
    return;
  }

  // New conversation
  if (!state || state.conversationStep === 'initial') {
    const firstName = senderName.split(' ')[0];
    const welcome = settings.welcomeMessage.replace('{{name}}', firstName);
    await sendWhatsAppMessage(phoneNumberId, phoneNumber, welcome, accessToken);

    // Ensure lead record exists immediately
    await ensureLeadExists(phoneNumber, senderName, tenantId, 'warm');

    if (!questions.length) {
      await sendWhatsAppMessage(phoneNumberId, phoneNumber, settings.completionMessage.replace('{{name}}', firstName), accessToken);
      return;
    }

    await sendWhatsAppMessage(phoneNumberId, phoneNumber, questions[0].question, accessToken);
    state = { phone: phoneNumber, tenantId, conversationStep: 'in_progress', currentQuestionIndex: 0, answers: new Map(), scoreSoFar: 0, name: senderName, lastMessageAt: new Date() };
    await setConversationState(state);
    return;
  }

  // In-progress — process answer
  if (state.conversationStep === 'in_progress') {
    const qIdx = state.currentQuestionIndex;
    if (qIdx >= questions.length) {
      await finalizeQualification(phoneNumber, phoneNumberId, state, tenantId, accessToken, settings, questions);
      return;
    }

    const currentQ = questions[qIdx];
    const answer = resolveAnswer(messageText, currentQ);
    state.answers.set(currentQ.id, answer);
    state.scoreSoFar += calcScore(answer, currentQ);

    if (currentQ.fieldToUpdate) {
      await updateLeadField(phoneNumber, tenantId, currentQ.fieldToUpdate, answer);
    }

    state.currentQuestionIndex = qIdx + 1;
    await setConversationState(state);

    if (state.currentQuestionIndex >= questions.length) {
      await finalizeQualification(phoneNumber, phoneNumberId, state, tenantId, accessToken, settings, questions);
    } else {
      await sendWhatsAppMessage(phoneNumberId, phoneNumber, questions[state.currentQuestionIndex].question, accessToken);
    }
  }
}

// ===================== ENSURE LEAD EXISTS =====================

async function ensureLeadExists(phone: string, name: string, tenantId: string, priority: 'hot' | 'warm' | 'cold') {
  try {
    const existing = await Lead.findOne({
      tenantId: new mongoose.Types.ObjectId(tenantId),
      phone: { $regex: phone.slice(-10), $options: 'i' },
    });
    if (existing) { existing.whatsappStatus = 'replied'; await existing.save(); return existing; }

    const initialStage = await LeadStage.findOne({ tenantId: new mongoose.Types.ObjectId(tenantId) }).sort({ order: 1 });
    const lead = await Lead.create({
      tenantId: new mongoose.Types.ObjectId(tenantId),
      name: name || 'WhatsApp User',
      phone,
      source: 'whatsapp',
      priority,
      stageId: initialStage?._id,
      whatsappStatus: 'replied',
      createdBy: new mongoose.Types.ObjectId(tenantId),
      activities: [{ type: 'whatsapp', description: 'Lead created from WhatsApp conversation.', createdAt: new Date(), createdBy: new mongoose.Types.ObjectId(tenantId) }],
    });
    scoreAndAssignLead(lead, new mongoose.Types.ObjectId(tenantId)).catch(console.error);
    return lead;
  } catch (err) {
    console.error('[WA] ensureLeadExists error:', err);
    return null;
  }
}

async function appendMessageToLead(phone: string, message: string, tenantId: string) {
  await Lead.findOneAndUpdate(
    { tenantId: new mongoose.Types.ObjectId(tenantId), phone: { $regex: phone.slice(-10), $options: 'i' } },
    { $push: { activities: { type: 'whatsapp', description: `WhatsApp: ${message.substring(0, 500)}`, createdAt: new Date(), createdBy: new mongoose.Types.ObjectId(tenantId) } }, $set: { whatsappStatus: 'replied' } }
  );
}

async function finalizeQualification(
  phone: string, phoneNumberId: string, state: DynConversationState,
  tenantId: string, accessToken: string,
  settings: { completionMessage: string }, questions: IQualificationQuestion[]
) {
  const firstName = (state.name ?? 'there').split(' ')[0];
  await sendWhatsAppMessage(phoneNumberId, phone, settings.completionMessage.replace('{{name}}', firstName), accessToken);

  const answerLines: string[] = [];
  questions.forEach((q) => { const a = state.answers.get(q.id); if (a) answerLines.push(`${q.question.split('\n')[0]}: ${a}`); });

  const lead = await Lead.findOne({ tenantId: new mongoose.Types.ObjectId(tenantId), phone: { $regex: phone.slice(-10), $options: 'i' } });
  if (lead) {
    lead.score = (lead.score ?? 0) + state.scoreSoFar;
    lead.whatsappEngagement = { status: 'completed', questionsAsked: questions.length, questionsAnswered: state.answers.size, conversationSummary: answerLines.join(' | '), lastMessageSentAt: new Date() };
    lead.activities.push({ type: 'whatsapp', description: `WhatsApp qualification completed. ${answerLines.join('; ')}`, createdAt: new Date(), createdBy: new mongoose.Types.ObjectId(tenantId) });
    await lead.save();
    scoreAndAssignLead(lead, new mongoose.Types.ObjectId(tenantId)).catch(console.error);
  }

  state.conversationStep = 'qualified';
  await setConversationState(state);
}

// ===================== SEND WHATSAPP MESSAGE =====================

async function sendWhatsAppMessage(phoneNumberId: string, to: string, message: string, accessToken?: string) {
  try {
    const token = accessToken || process.env.WHATSAPP_ACCESS_TOKEN;
    if (!token) {
      console.log('[WA] No access token configured. Message would be:', message);
      return;
    }
    const response = await fetch(
      `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`,
      {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ messaging_product: 'whatsapp', to, type: 'text', text: { body: message } }),
      }
    );
    if (!response.ok) console.error('[WA] API error:', await response.text());
  } catch (error) {
    console.error('[WA] sendWhatsAppMessage error:', error);
  }
}

// ===================== MARK COLD LEADS (CRON HOOK) =====================

export const markColdLeads = async (req: Request, res: Response) => {
  try {
    const COLD_THRESHOLD_HOURS = 24;
    const cutoffTime = new Date(Date.now() - COLD_THRESHOLD_HOURS * 60 * 60 * 1000);
    const staleStates = await WhatsAppConversationState.find({
      lastMessageAt: { $lt: cutoffTime },
      conversationStep: { $nin: ['qualified'] },
    }).lean() as any[];

    for (const doc of staleStates) {
      await Lead.findOneAndUpdate(
        { tenantId: doc.tenantId, phone: { $regex: doc.phone.slice(-10), $options: 'i' } },
        {
          $push: { activities: { type: 'whatsapp', description: `WhatsApp qualification abandoned — no response after ${COLD_THRESHOLD_HOURS}h. Marked cold.`, createdAt: new Date(), createdBy: new mongoose.Types.ObjectId(doc.tenantId) } },
          $set: { priority: 'cold', 'whatsappEngagement.status': 'no_response' },
        }
      );
      await deleteConversationState(doc.phone, doc.tenantId);
    }

    res.json({ success: true, message: `Processed ${staleStates.length} stale conversations`, data: { processed: staleStates.length } });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ===================== MANUAL SEND MESSAGE =====================

export const sendManualMessage = async (req: Request, res: Response) => {
  try {
    const { phoneNumber, message } = req.body;
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    if (!phoneNumberId) return res.status(400).json({ success: false, message: 'WhatsApp not configured' });
    await sendWhatsAppMessage(phoneNumberId, phoneNumber, message);
    res.json({ success: true, message: 'Message sent' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ===================== SEND BULK MESSAGES =====================

export const sendBulkColdLeadMessages = async (req: Request, res: Response) => {
  try {
    const { tenantId } = req as any;
    const { message, leadIds } = req.body;
    if (!message) return res.status(400).json({ success: false, message: 'Message is required' });
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    if (!phoneNumberId) return res.status(400).json({ success: false, message: 'WhatsApp not configured' });
    const query: any = { tenantId };
    if (leadIds?.length) query._id = { $in: leadIds.map((id: string) => new mongoose.Types.ObjectId(id)) };
    const leads = await Lead.find(query).select('phone name');
    let sent = 0;
    for (const lead of leads) {
      if (lead.phone) {
        const firstName = lead.name?.split(' ')[0] || 'there';
        await sendWhatsAppMessage(phoneNumberId, lead.phone, message.replace('{{name}}', firstName).replace('{name}', firstName));
        sent++;
        await new Promise((r) => setTimeout(r, 100));
      }
    }

    res.json({ 
      success: true, 
      message: `Sent messages to ${sent} leads`,
      data: { sent, total: leads.length }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
