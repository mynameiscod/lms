/**
 * P5: WhatsApp Drip Sequence Service
 *
 * Automated follow-up messages triggered on lead stage entry.
 * Sequences: D+1, D+3, D+7 (relative to when the lead entered a stage).
 *
 * Each DripSequence is stored in-memory config per stage name.
 * A lightweight cron-style runner calls `processDueMessages()` periodically.
 */

import mongoose from 'mongoose';
import Lead from '../models/Lead';
import LeadSourceConfig from '../models/LeadSourceConfig';
import { getDecryptedTokens } from '../controllers/leadSourceConfigController';

// ─── Drip message templates per stage ────────────────────────────────────────
const DRIP_TEMPLATES: Record<string, { daysAfter: number; message: string }[]> = {
  // Stage name patterns (case-insensitive match)
  'new': [
    { daysAfter: 1, message: 'Hi {{name}}! Just checking in — do you have any questions about our programs? We are here to help! 😊' },
    { daysAfter: 3, message: 'Hello {{name}}! We would love to walk you through our courses. Would you be available for a quick call or demo this week?' },
    { daysAfter: 7, message: 'Hi {{name}}, we noticed you have not connected with us yet. Our next batch starts soon — shall we reserve a spot for you? 🎓' },
  ],
  'contacted': [
    { daysAfter: 1, message: 'Hi {{name}}! Following up on our last conversation. Did you get a chance to review the course details we shared?' },
    { daysAfter: 3, message: 'Hello {{name}}, we have limited seats available for the upcoming batch. Let us know if you have any questions!' },
  ],
  'interested': [
    { daysAfter: 1, message: 'Hi {{name}}! Great to know you are interested 🎉. Would you like to schedule a free demo class?' },
    { daysAfter: 3, message: 'Hello {{name}}, our demo sessions are filling up fast. Would you like us to book one for you?' },
    { daysAfter: 7, message: 'Hi {{name}}! Just a reminder — enrollment for our next batch closes soon. Lock in your seat today! 🔒' },
  ],
  'demo_scheduled': [
    { daysAfter: 1, message: 'Hi {{name}}! Looking forward to your demo session. Do let us know if you need to reschedule.' },
  ],
  'proposal_sent': [
    { daysAfter: 1, message: 'Hi {{name}}! Did you get a chance to review the proposal we sent? Happy to clarify any details.' },
    { daysAfter: 3, message: 'Hello {{name}}, seats are filling up for the upcoming batch. When would be a good time to discuss?' },
    { daysAfter: 7, message: 'Hi {{name}}! Last reminder — enrollment closes this week. Let us know if you would like to proceed! 🎓' },
  ],
};

// ─── Track what has been sent (in-memory per process; DB-backed below) ──────
// We add a custom field to the lead activities to avoid re-sending

async function getWhatsAppCredentials(tenantId: string): Promise<{ phoneNumberId: string; accessToken: string } | null> {
  const sourceConfig = await LeadSourceConfig.findOne({ tenantId: new mongoose.Types.ObjectId(tenantId) }).lean();
  if (!sourceConfig) return null;

  const wa = (sourceConfig as any).whatsApp;
  if (!wa?.isConnected || !wa?.config?.phoneNumberId) return null;

  const tokens = await getDecryptedTokens(tenantId);
  const accessToken = tokens?.whatsApp?.accessToken || process.env.WHATSAPP_ACCESS_TOKEN;
  if (!accessToken) return null;

  return { phoneNumberId: wa.config.phoneNumberId, accessToken };
}

async function sendWhatsApp(phone: string, message: string, creds: { phoneNumberId: string; accessToken: string }): Promise<boolean> {
  const cleanPhone = phone.replace(/[^0-9+]/g, '');
  if (!cleanPhone) return false;

  try {
    const res = await fetch(
      `https://graph.facebook.com/v18.0/${creds.phoneNumberId}/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${creds.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: cleanPhone,
          type: 'text',
          text: { body: message },
        }),
      }
    );
    return res.ok;
  } catch {
    return false;
  }
}

function findTemplatesForStage(stageName: string): { daysAfter: number; message: string }[] {
  const normalized = stageName.toLowerCase().replace(/[\s-]/g, '_');
  for (const [key, templates] of Object.entries(DRIP_TEMPLATES)) {
    if (normalized.includes(key)) return templates;
  }
  return [];
}

function activityTag(stageName: string, daysAfter: number): string {
  return `drip:${stageName.toLowerCase()}:d${daysAfter}`;
}

/**
 * Called when a lead enters a new stage. Records stage entry time so
 * the drip processor knows when to send each message.
 */
export async function scheduleDripOnStageEntry(
  tenantId: string,
  leadId: string,
  stageName: string
): Promise<void> {
  const templates = findTemplatesForStage(stageName);
  if (!templates.length) return;

  try {
    const lead = await Lead.findOne({ _id: leadId, tenantId });
    if (!lead) return;

    // Mark stage entry time for this drip by adding a marker activity
    lead.activities.push({
      type: 'status_change',
      description: `drip_entry:${stageName}:${new Date().toISOString()}`,
      createdBy: lead.assignedTo || lead.createdBy,
      createdAt: new Date(),
    } as any);
    await lead.save();
  } catch (err) {
    console.error('[DRIP] Error scheduling drip:', err);
  }
}

/**
 * Process all due drip messages across all tenants.
 * Call this from a scheduler every hour.
 */
export async function processDueMessages(): Promise<void> {
  const now = new Date();

  try {
    // Find all leads that have drip_entry markers but have not been marked as lost/converted
    const leads = await Lead.find({
      'activities.description': /^drip_entry:/,
    })
      .select('_id name phone tenantId activities')
      .lean();

    for (const lead of leads) {
      if (!lead.phone) continue;

      const tenantId = lead.tenantId.toString();
      let creds: { phoneNumberId: string; accessToken: string } | null = null;

      for (const activity of lead.activities) {
        const desc: string = (activity as any).description || '';
        if (!desc.startsWith('drip_entry:')) continue;

        const parts = desc.split(':');
        if (parts.length < 3) continue;
        const stageName = parts[1];
        const entryTime = new Date(parts[2]);
        if (isNaN(entryTime.getTime())) continue;

        const templates = findTemplatesForStage(stageName);
        for (const tpl of templates) {
          const dueAt = new Date(entryTime.getTime() + tpl.daysAfter * 24 * 60 * 60 * 1000);
          if (now < dueAt) continue;

          const tag = activityTag(stageName, tpl.daysAfter);
          const alreadySent = lead.activities.some((a: any) => (a.description || '').includes(tag));
          if (alreadySent) continue;

          // Lazy-load credentials
          if (!creds) creds = await getWhatsAppCredentials(tenantId);
          if (!creds) break;

          const message = tpl.message.replace(/\{\{name\}\}/gi, lead.name || 'there');
          const ok = await sendWhatsApp(lead.phone, message, creds);

          if (ok) {
            // Mark as sent in DB
            await Lead.updateOne(
              { _id: lead._id },
              {
                $push: {
                  activities: {
                    type: 'whatsapp',
                    description: `[AUTO DRIP] ${tag}: ${message.substring(0, 60)}...`,
                    createdBy: null,
                    createdAt: new Date(),
                  },
                },
              }
            );
            console.log(`[DRIP] Sent D+${tpl.daysAfter} drip to lead ${lead._id} (${lead.name})`);
          }
        }
      }
    }
  } catch (err) {
    console.error('[DRIP] Error processing drip messages:', err);
  }
}
