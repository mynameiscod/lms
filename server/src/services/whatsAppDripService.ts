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
import WhatsAppDripConfig, { DEFAULT_DRIP_SEQUENCES, IDripSequence } from '../models/WhatsAppDripConfig';
import { getDecryptedTokens } from '../controllers/leadSourceConfigController';

// ─── Drip message templates (DB-backed, falls back to defaults) ───────────────

async function getSequencesForTenant(tenantId: string): Promise<IDripSequence[]> {
  try {
    const config = await WhatsAppDripConfig.findOne({
      tenantId: new mongoose.Types.ObjectId(tenantId),
      isActive: true,
    }).lean() as any;
    if (config?.sequences?.length) return config.sequences as IDripSequence[];
  } catch {
    // Fall through to defaults
  }
  return DEFAULT_DRIP_SEQUENCES;
}

function findSequenceForStage(sequences: IDripSequence[], stageName: string): IDripSequence | null {
  const normalized = stageName.toLowerCase().replace(/[\s-]/g, '_');
  return sequences.find((s) => {
    if (!s.enabled) return false;
    const sn = s.stageName.toLowerCase().replace(/[\s-]/g, '_');
    return normalized.includes(sn) || sn.includes(normalized);
  }) ?? null;
}

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
  // Check if this stage has any drip sequences configured
  const sequences = await getSequencesForTenant(tenantId);
  const seq = findSequenceForStage(sequences, stageName);
  if (!seq?.messages?.length) return;

  try {
    const lead = await Lead.findOne({ _id: leadId, tenantId });
    if (!lead) return;

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
    const leads = await Lead.find({ 'activities.description': /^drip_entry:/ })
      .select('_id name phone tenantId activities')
      .lean();

    for (const lead of leads) {
      if (!lead.phone) continue;
      const tenantId = lead.tenantId.toString();
      const sequences = await getSequencesForTenant(tenantId);
      let creds: { phoneNumberId: string; accessToken: string } | null = null;

      for (const activity of lead.activities) {
        const desc: string = (activity as any).description || '';
        if (!desc.startsWith('drip_entry:')) continue;

        const parts = desc.split(':');
        if (parts.length < 3) continue;
        const stageName = parts[1];
        const entryTime = new Date(parts[2]);
        if (isNaN(entryTime.getTime())) continue;

        const seq = findSequenceForStage(sequences, stageName);
        if (!seq) continue;

        for (const msg of seq.messages) {
          if (!msg.enabled) continue;
          const dueAt = new Date(entryTime.getTime() + msg.daysAfter * 24 * 60 * 60 * 1000);
          if (now < dueAt) continue;

          const tag = activityTag(stageName, msg.daysAfter);
          const alreadySent = lead.activities.some((a: any) => (a.description || '').includes(tag));
          if (alreadySent) continue;

          if (!creds) creds = await getWhatsAppCredentials(tenantId);
          if (!creds) break;

          const message = msg.message.replace(/\{\{name\}\}/gi, lead.name || 'there');
          const ok = await sendWhatsApp(lead.phone, message, creds);

          if (ok) {
            await Lead.updateOne(
              { _id: lead._id },
              {
                $push: {
                  activities: {
                    type: 'whatsapp',
                    description: `[AUTO DRIP] ${tag}: ${message.substring(0, 80)}`,
                    createdBy: null,
                    createdAt: new Date(),
                  },
                },
              }
            );
            console.log(`[DRIP] Sent D+${msg.daysAfter} drip to lead ${lead._id} (${lead.name})`);
          }
        }
      }
    }
  } catch (err) {
    console.error('[DRIP] Error processing drip messages:', err);
  }
}
