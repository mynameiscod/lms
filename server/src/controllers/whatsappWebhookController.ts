import { Request, Response } from 'express';
import Lead from '../models/Lead';
import LeadStage from '../models/LeadStage';
import mongoose from 'mongoose';
import { getDecryptedTokens } from './leadSourceConfigController';
import LeadSourceConfig from '../models/LeadSourceConfig';
import { scoreAndAssignLead } from '../services/leadScoringService';
import WhatsAppConversationState, { ConversationStep } from '../models/WhatsAppConversationState';

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

interface LeadQualificationData {
  name?: string;
  phone: string;
  yearOfGraduation?: string;
  interestedCourse?: string;
  conversationStep: 'initial' | 'asked_name' | 'asked_year' | 'asked_course' | 'qualified';
  lastMessageAt: Date;
}

// ===================== PERSISTENT STATE HELPERS =====================

async function getConversationState(phone: string, tenantId: string): Promise<LeadQualificationData | null> {
  const doc = await WhatsAppConversationState.findOne({ phone, tenantId }).lean();
  if (!doc) return null;
  return {
    phone: doc.phone,
    conversationStep: doc.conversationStep as LeadQualificationData['conversationStep'],
    name: doc.name,
    yearOfGraduation: doc.yearOfGraduation,
    interestedCourse: doc.interestedCourse,
    lastMessageAt: doc.lastMessageAt,
  };
}

async function setConversationState(phone: string, tenantId: string, state: LeadQualificationData): Promise<void> {
  await WhatsAppConversationState.findOneAndUpdate(
    { phone, tenantId },
    {
      $set: {
        conversationStep: state.conversationStep as ConversationStep,
        name: state.name,
        yearOfGraduation: state.yearOfGraduation,
        interestedCourse: state.interestedCourse,
        lastMessageAt: state.lastMessageAt,
        // Reset TTL on every message
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    },
    { upsert: true, new: true }
  );
}

async function deleteConversationState(phone: string, tenantId: string): Promise<void> {
  await WhatsAppConversationState.deleteOne({ phone, tenantId });
}

// ===================== QUALIFICATION QUESTIONS =====================

const QUALIFICATION_FLOW = {
  initial: {
    message: `👋 Hi! Welcome to CodeBegun!\n\nWe're excited you're interested in learning with us. Let me help you get started.\n\n📝 What's your full name?`,
    nextStep: 'asked_name'
  },
  asked_name: {
    message: `Great! 🎓 What's your year of graduation (or expected graduation year)?`,
    nextStep: 'asked_year'
  },
  asked_year: {
    message: `Perfect! 📚 Which course are you interested in?\n\n1️⃣ Full Stack Development\n2️⃣ Data Science\n3️⃣ Cloud & DevOps\n4️⃣ Mobile App Development\n5️⃣ Other\n\nJust reply with the number or course name.`,
    nextStep: 'asked_course'
  },
  asked_course: {
    message: `🎉 Awesome! Thank you for your interest!\n\nOne of our counselors will call you shortly to discuss the best learning path for you.\n\nIn the meantime, feel free to ask any questions!`,
    nextStep: 'qualified'
  }
};

const COURSE_MAPPING: Record<string, string> = {
  '1': 'Full Stack Development',
  '2': 'Data Science',
  '3': 'Cloud & DevOps',
  '4': 'Mobile App Development',
  '5': 'Other',
  'full stack': 'Full Stack Development',
  'fullstack': 'Full Stack Development',
  'data science': 'Data Science',
  'data': 'Data Science',
  'cloud': 'Cloud & DevOps',
  'devops': 'Cloud & DevOps',
  'mobile': 'Mobile App Development',
  'app': 'Mobile App Development'
};

// ===================== TENANT RESOLVER (by WhatsApp phoneNumberId) =====================

async function resolveTenantByPhoneNumberId(phoneNumberId: string): Promise<{ tenantId: string; accessToken: string } | null> {
  // Search DB for matching WhatsApp config
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
  // .env fallback
  const envTenantId = process.env.DEFAULT_TENANT_ID;
  const envToken = process.env.WHATSAPP_ACCESS_TOKEN;
  if (envTenantId && envToken) {
    return { tenantId: envTenantId, accessToken: envToken };
  }
  return null;
}

// ===================== WEBHOOK VERIFICATION (GET) =====================

export const verifyWebhook = async (req: Request, res: Response) => {
  try {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    // Your verify token (should be in env)
    const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN || 'codebegun_whatsapp_verify';

    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      console.log('WhatsApp webhook verified');
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

    console.log('📱 WhatsApp webhook received:', JSON.stringify(payload, null, 2));

    // Always respond 200 quickly to WhatsApp
    res.status(200).send('EVENT_RECEIVED');

    // Process asynchronously
    processWhatsAppMessage(payload).catch(err => {
      console.error('❌ WhatsApp message processing error:', err);
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

      if (!value.messages || value.messages.length === 0) {
        console.log('⚠️ No messages in this change');
        continue;
      }

      const message = value.messages[0];
      const contact = value.contacts?.[0];
      const phoneNumber = message.from;
      const senderName = contact?.profile?.name || 'Unknown';

      // Get message text
      let messageText = '';
      if (message.type === 'text' && message.text) {
        messageText = message.text.body;
      } else if (message.type === 'interactive') {
        messageText = message.interactive?.button_reply?.title || 
                      message.interactive?.list_reply?.title || '';
      }

      console.log(`💬 Message from ${phoneNumber} (${senderName}): "${messageText}" [type: ${message.type}]`);

      if (!messageText) {
        console.log('⚠️ Empty message text, skipping');
        continue;
      }

      // Resolve tenant from DB by phoneNumberId
      const tenantInfo = await resolveTenantByPhoneNumberId(value.metadata.phone_number_id);
      if (!tenantInfo) {
        console.error(`❌ Could not resolve tenant for phoneNumberId: ${value.metadata.phone_number_id}`);
        continue;
      }

      // Process the conversation
      await handleConversation(phoneNumber, senderName, messageText, value.metadata.phone_number_id, tenantInfo);
    }
  }
}

// ===================== CONVERSATION HANDLER =====================

async function handleConversation(
  phoneNumber: string, 
  senderName: string, 
  messageText: string,
  phoneNumberId: string,
  tenantInfo: { tenantId: string; accessToken: string }
) {
  console.log(`🔄 handleConversation: phone=${phoneNumber}, name=${senderName}, phoneNumberId=${phoneNumberId}, tenant=${tenantInfo.tenantId}`);
  
  // Get or create conversation state from MongoDB
  let state = await getConversationState(phoneNumber, tenantInfo.tenantId);
  
  if (!state) {
    console.log(`🆕 New conversation from ${phoneNumber}`);
    state = {
      phone: phoneNumber,
      conversationStep: 'initial',
      lastMessageAt: new Date()
    };

    // Send initial question
    await sendWhatsAppMessage(phoneNumberId, phoneNumber, QUALIFICATION_FLOW.initial.message, tenantInfo.accessToken);
    state.conversationStep = 'asked_name';
    await setConversationState(phoneNumber, tenantInfo.tenantId, state);

    // Create a lead immediately (don't wait for full qualification)
    await createOrUpdateLeadFromWhatsApp(phoneNumber, senderName, messageText, tenantInfo.tenantId);
    return;
  }

  // Update last message time
  state.lastMessageAt = new Date();

  // Process based on current step
  switch (state.conversationStep) {
    case 'asked_name':
      state.name = messageText.trim();
      await sendWhatsAppMessage(phoneNumberId, phoneNumber, QUALIFICATION_FLOW.asked_name.message, tenantInfo.accessToken);
      state.conversationStep = 'asked_year';
      await setConversationState(phoneNumber, tenantInfo.tenantId, state);
      break;

    case 'asked_year':
      state.yearOfGraduation = messageText.trim();
      await sendWhatsAppMessage(phoneNumberId, phoneNumber, QUALIFICATION_FLOW.asked_year.message, tenantInfo.accessToken);
      state.conversationStep = 'asked_course';
      await setConversationState(phoneNumber, tenantInfo.tenantId, state);
      break;

    case 'asked_course': {
      const courseLower = messageText.toLowerCase().trim();
      state.interestedCourse = COURSE_MAPPING[courseLower] || messageText.trim();
      await sendWhatsAppMessage(phoneNumberId, phoneNumber, QUALIFICATION_FLOW.asked_course.message, tenantInfo.accessToken);
      state.conversationStep = 'qualified';
      await setConversationState(phoneNumber, tenantInfo.tenantId, state);
      // Create HOT lead - user responded to all questions
      await createLeadFromWhatsApp(state, 'hot', senderName, tenantInfo.tenantId);
      break;
    }

    case 'qualified':
      // Already qualified, just log the message as activity
      await addLeadActivity(phoneNumber, messageText, tenantInfo.tenantId);
      await sendWhatsAppMessage(
        phoneNumberId, 
        phoneNumber, 
        `Thanks for your message! Our team will get back to you soon. 🙂`,
        tenantInfo.accessToken
      );
      await setConversationState(phoneNumber, tenantInfo.tenantId, state);
      break;

    default:
      // Restart conversation
      state.conversationStep = 'initial';
      await sendWhatsAppMessage(phoneNumberId, phoneNumber, QUALIFICATION_FLOW.initial.message, tenantInfo.accessToken);
      state.conversationStep = 'asked_name';
      await setConversationState(phoneNumber, tenantInfo.tenantId, state);
  }
}

// ===================== CREATE LEAD FROM WHATSAPP =====================

async function createLeadFromWhatsApp(
  data: LeadQualificationData, 
  temperature: 'hot' | 'cold',
  whatsappName: string,
  resolvedTenantId?: string
) {
  try {
    const tenantId = resolvedTenantId || process.env.DEFAULT_TENANT_ID;
    if (!tenantId) {
      console.error('DEFAULT_TENANT_ID not set');
      return;
    }

    // Check if lead already exists
    let lead = await Lead.findOne({ 
      tenantId, 
      phone: { $regex: data.phone.slice(-10), $options: 'i' } 
    });

    if (lead) {
      // Add activity to existing lead
      lead.activities.push({
        type: 'whatsapp',
        description: `WhatsApp qualification completed. Course interest: ${data.interestedCourse}`,
        createdAt: new Date(),
        createdBy: new mongoose.Types.ObjectId(tenantId) // System
      });
      
      // Add note about temperature
      lead.activities.push({
        type: 'status_change',
        description: `Lead marked as ${temperature.toUpperCase()} - responded to WhatsApp qualification`,
        createdAt: new Date(),
        createdBy: new mongoose.Types.ObjectId(tenantId)
      });
      
      await lead.save();
      console.log(`Updated existing lead ${lead._id} from WhatsApp`);
      return;
    }

    // Get initial stage
    const initialStage = await LeadStage.findOne({ 
      tenantId, 
      $or: [{ name: 'New' }, { name: 'Hot Lead' }, { order: 0 }] 
    }).sort({ order: 1 });

    // Create new lead
    const leadName = data.name || whatsappName || 'WhatsApp User';

    lead = new Lead({
      tenantId: new mongoose.Types.ObjectId(tenantId),
      name: leadName,
      email: '', // Will be collected later
      phone: data.phone,
      source: 'whatsapp',
      stageId: initialStage?._id,
      courseInterest: data.interestedCourse ? [data.interestedCourse] : [],
      customFields: new Map([
        ['yearOfGraduation', data.yearOfGraduation],
        ['interestedCourse', data.interestedCourse],
        ['leadTemperature', temperature]
      ]),
      utmParams: {
        source: 'whatsapp',
        medium: 'chat',
        campaign: 'auto_qualification'
      },
      activities: [{
        type: 'whatsapp',
        description: `Lead created from WhatsApp. Qualification: Name: ${data.name}, Year: ${data.yearOfGraduation}, Course: ${data.interestedCourse}. Temperature: ${temperature}`,
        createdAt: new Date(),
        createdBy: new mongoose.Types.ObjectId(tenantId)
      }],
      notes: `WhatsApp Lead - Interested in: ${data.interestedCourse}, Graduation: ${data.yearOfGraduation}`,
      createdBy: new mongoose.Types.ObjectId(tenantId)
    });

    await lead.save();
    console.log(`Created new ${temperature} lead ${lead._id} from WhatsApp: ${data.phone}`);

    // Auto-score and assign
    scoreAndAssignLead(lead, new mongoose.Types.ObjectId(tenantId)).catch(err =>
      console.error('[WHATSAPP-LEAD] Auto-score failed:', err)
    );

    // Clear conversation state from MongoDB after lead created
    if (resolvedTenantId) {
      await deleteConversationState(data.phone, resolvedTenantId);
    }

  } catch (error) {
    console.error('Error creating lead from WhatsApp:', error);
  }
}

// ===================== CREATE OR UPDATE LEAD IMMEDIATELY =====================

async function createOrUpdateLeadFromWhatsApp(phoneNumber: string, senderName: string, messageText: string, resolvedTenantId?: string) {
  try {
    const tenantId = resolvedTenantId || process.env.DEFAULT_TENANT_ID;
    if (!tenantId) {
      console.error('❌ DEFAULT_TENANT_ID not set, cannot create lead');
      return;
    }

    // Check if lead already exists by phone
    const phoneRegex = phoneNumber.slice(-10);
    let lead = await Lead.findOne({
      tenantId: new mongoose.Types.ObjectId(tenantId),
      phone: { $regex: phoneRegex, $options: 'i' }
    });

    if (lead) {
      // Add activity to existing lead
      console.log(`📝 Lead already exists (${lead._id}), adding WhatsApp activity`);
      lead.activities.push({
        type: 'whatsapp',
        description: `WhatsApp message: ${messageText.substring(0, 500)}`,
        createdAt: new Date(),
        createdBy: new mongoose.Types.ObjectId(tenantId)
      });
      lead.whatsappStatus = 'replied';
      await lead.save();
      return;
    }

    // Get initial stage
    const initialStage = await LeadStage.findOne({
      tenantId: new mongoose.Types.ObjectId(tenantId)
    }).sort({ order: 1 });

    // Create new lead immediately
    lead = new Lead({
      tenantId: new mongoose.Types.ObjectId(tenantId),
      name: senderName || 'WhatsApp User',
      email: '',
      phone: phoneNumber,
      source: 'whatsapp',
      priority: 'warm',
      stageId: initialStage?._id,
      whatsappStatus: 'replied',
      activities: [{
        type: 'whatsapp',
        description: `Lead created from WhatsApp. First message: "${messageText.substring(0, 200)}"`,
        createdAt: new Date(),
        createdBy: new mongoose.Types.ObjectId(tenantId)
      }],
      notes: `WhatsApp lead - First message: ${messageText}`,
      createdBy: new mongoose.Types.ObjectId(tenantId)
    });

    await lead.save();
    console.log(`✅ Created new lead ${lead._id} from WhatsApp: ${phoneNumber} (${senderName})`);

    // Auto-score and assign
    scoreAndAssignLead(lead, new mongoose.Types.ObjectId(tenantId)).catch(err =>
      console.error('[WHATSAPP-LEAD] Auto-score (initial) failed:', err)
    );
  } catch (error) {
    console.error('❌ Error creating/updating lead from WhatsApp:', error);
  }
}

// ===================== ADD ACTIVITY TO EXISTING LEAD =====================

async function addLeadActivity(phoneNumber: string, message: string, resolvedTenantId?: string) {
  try {
    const tenantId = resolvedTenantId || process.env.DEFAULT_TENANT_ID;
    if (!tenantId) return;

    await Lead.findOneAndUpdate(
      { tenantId, phone: { $regex: phoneNumber.slice(-10), $options: 'i' } },
      {
        $push: {
          activities: {
            type: 'whatsapp',
            description: `WhatsApp message: ${message.substring(0, 500)}`,
            createdAt: new Date(),
            performedBy: new mongoose.Types.ObjectId(tenantId)
          }
        }
      }
    );
  } catch (error) {
    console.error('Error adding lead activity:', error);
  }
}

// ===================== SEND WHATSAPP MESSAGE =====================

async function sendWhatsAppMessage(phoneNumberId: string, to: string, message: string, accessToken?: string) {
  try {
    const token = accessToken || process.env.WHATSAPP_ACCESS_TOKEN;
    if (!token) {
      console.log('WHATSAPP_ACCESS_TOKEN not set. Message would be:', message);
      return;
    }

    const response = await fetch(
      `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to,
          type: 'text',
          text: { body: message }
        })
      }
    );

    if (!response.ok) {
      console.error('WhatsApp API error:', await response.text());
    }
  } catch (error) {
    console.error('Error sending WhatsApp message:', error);
  }
}

// ===================== MARK COLD LEADS (CRON JOB) =====================
// Run this periodically to mark non-responsive leads as cold

export const markColdLeads = async (req: Request, res: Response) => {
  try {
    const COLD_THRESHOLD_HOURS = 24; // Mark as cold if no response in 24 hours
    const cutoffTime = new Date(Date.now() - COLD_THRESHOLD_HOURS * 60 * 60 * 1000);

    // Find conversations that haven't completed qualification
    // Find stale states from MongoDB
    const staleStates = await WhatsAppConversationState.find({
      lastMessageAt: { $lt: cutoffTime },
      conversationStep: { $ne: 'qualified' },
    }).lean();

    const coldPhones: string[] = [];
    for (const doc of staleStates) {
      coldPhones.push(doc.phone);
      createLeadFromWhatsApp(
        { phone: doc.phone, conversationStep: doc.conversationStep as any, name: doc.name, yearOfGraduation: doc.yearOfGraduation, interestedCourse: doc.interestedCourse, lastMessageAt: doc.lastMessageAt },
        'cold',
        'WhatsApp User',
        doc.tenantId
      ).catch(console.error);
      await deleteConversationState(doc.phone, doc.tenantId);
    }

    res.json({
      success: true,
      message: `Marked ${coldPhones.length} leads as cold`,
      data: coldPhones
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ===================== MANUAL SEND MESSAGE =====================
// For staff to send WhatsApp messages

export const sendManualMessage = async (req: Request, res: Response) => {
  try {
    const { phoneNumber, message } = req.body;
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;

    if (!phoneNumberId) {
      return res.status(400).json({ success: false, message: 'WhatsApp not configured' });
    }

    await sendWhatsAppMessage(phoneNumberId, phoneNumber, message);

    res.json({ success: true, message: 'Message sent' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ===================== SEND BULK MESSAGES TO COLD LEADS =====================

export const sendBulkColdLeadMessages = async (req: Request, res: Response) => {
  try {
    const { tenantId } = req as any;
    const { message, leadIds } = req.body;

    if (!message) {
      return res.status(400).json({ success: false, message: 'Message is required' });
    }

    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    if (!phoneNumberId) {
      return res.status(400).json({ success: false, message: 'WhatsApp not configured' });
    }

    // Get cold leads (leads with no recent activity as cold)
    const query: any = { tenantId };
    if (leadIds && leadIds.length > 0) {
      query._id = { $in: leadIds.map((id: string) => new mongoose.Types.ObjectId(id)) };
    }

    const leads = await Lead.find(query).select('phone name');
    let sent = 0;

    for (const lead of leads) {
      if (lead.phone) {
        const leadName = lead.name?.split(' ')[0] || 'there';
        const personalizedMessage = message.replace('{name}', leadName);
        await sendWhatsAppMessage(phoneNumberId, lead.phone, personalizedMessage);
        sent++;
        
        // Add rate limiting delay
        await new Promise(resolve => setTimeout(resolve, 100));
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
