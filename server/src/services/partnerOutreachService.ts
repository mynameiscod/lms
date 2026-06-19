import mongoose from 'mongoose';
import PlacementPartner, { IPlacementPartner } from '../models/PlacementPartner';
import PartnerOutreachMessage, { IPartnerOutreachMessage } from '../models/PartnerOutreachMessage';
import { EmailService } from './emailService';
import * as settings from './settingsService';
import { coldEmail, vouchEmail, toHtml } from './outreachTemplates';

const DEFAULT_DAILY_CAP = 25;
const DEFAULT_MIN_GAP_MIN = 20;

const senderName = (tenantId: string) =>
  settings.getStr('PLACEMENT_SENDER_NAME', '', tenantId) ||
  (settings.getStr('EMAIL_FROM', '', tenantId).match(/^([^<]+)/)?.[1]?.trim()) ||
  'The CodeBegun Placements Team';

export interface StartResult { ok: boolean; held?: boolean; reason?: string; message?: IPartnerOutreachMessage; }

/**
 * Begin a partner's outreach sequence. Per business rules:
 *  - no contact email → cannot start (held).
 *  - missing contact name → drafted as pending_approval (held for review), not auto-sent.
 *  - otherwise → cold email queued for the sender cron (auto-send under cap).
 */
export async function startSequence(partner: IPlacementPartner, userId: string): Promise<StartResult> {
  const tenantId = partner.tenantId.toString();
  if (!partner.contactEmail) return { ok: false, held: true, reason: 'No contact email' };

  // Don't double-start if already in a sequence with an open cold/followup message.
  const open = await PartnerOutreachMessage.findOne({
    tenantId: partner.tenantId, partnerId: partner._id,
    type: { $in: ['cold', 'followup'] }, status: { $in: ['queued', 'pending_approval', 'sending'] },
  });
  if (open) return { ok: false, reason: 'Sequence already in progress' };

  const draft = coldEmail(partner, senderName(tenantId));
  const missingName = !partner.contactName || !partner.contactName.trim();

  const message = await PartnerOutreachMessage.create({
    tenantId: partner.tenantId,
    partnerId: partner._id,
    companyName: partner.companyName,
    type: 'cold',
    status: missingName ? 'pending_approval' : 'queued',
    requiresApproval: missingName,
    toEmail: partner.contactEmail,
    toName: partner.contactName || '',
    subject: draft.subject,
    body: draft.body,
    sequenceStep: 0,
    scheduledFor: missingName ? undefined : new Date(),
    createdBy: new mongoose.Types.ObjectId(userId),
  });

  partner.outreach.status = 'in_sequence';
  await partner.save();

  return { ok: true, held: missingName, reason: missingName ? 'Contact name missing — held for review' : undefined, message };
}

/** Draft the personal vouch email — always held for approval. */
export async function draftVouch(partner: IPlacementPartner, userId: string): Promise<IPartnerOutreachMessage> {
  const draft = vouchEmail(partner, senderName(partner.tenantId.toString()));
  return PartnerOutreachMessage.create({
    tenantId: partner.tenantId,
    partnerId: partner._id,
    companyName: partner.companyName,
    type: 'vouch',
    status: 'pending_approval',
    requiresApproval: true,
    toEmail: partner.contactEmail,
    toName: partner.contactName || '',
    subject: draft.subject,
    body: draft.body,
    sequenceStep: 0,
    createdBy: new mongoose.Types.ObjectId(userId),
  });
}

/** Cancel all open messages for a partner and set outreach state (reply/bounce auto-stop). */
export async function stopSequence(partner: IPlacementPartner, newStatus: 'replied' | 'bounced' | 'stopped', reason?: string) {
  await PartnerOutreachMessage.updateMany(
    { tenantId: partner.tenantId, partnerId: partner._id, status: { $in: ['queued', 'pending_approval', 'sending'] } },
    { $set: { status: 'cancelled', failedReason: reason || `Auto-stopped: ${newStatus}` } }
  );
  partner.outreach.status = newStatus;
  if (newStatus === 'replied') partner.outreach.repliedAt = new Date();
  if (newStatus === 'bounced') partner.outreach.bouncedAt = new Date();
  partner.outreach.stoppedReason = reason;
  await partner.save();
}

/** Actually deliver one message (used by cron and by approve-now). Idempotent via status guard. */
export async function deliverMessage(messageId: mongoose.Types.ObjectId | string): Promise<boolean> {
  // Claim the message so concurrent ticks can't double-send.
  const msg = await PartnerOutreachMessage.findOneAndUpdate(
    { _id: messageId, status: { $in: ['queued', 'pending_approval'] } },
    { $set: { status: 'sending' } },
    { new: true }
  );
  if (!msg) return false;

  const tenantId = msg.tenantId.toString();
  try {
    const ok = await new EmailService(tenantId).sendGenericEmail(msg.toEmail, msg.subject, toHtml(msg.body), msg.body);
    if (!ok) throw new Error('Email transport returned false');

    msg.status = 'sent';
    msg.sentAt = new Date();
    await msg.save();

    // Update partner counters + advance stage on first cold touch.
    const partner = await PlacementPartner.findOne({ _id: msg.partnerId, tenantId: msg.tenantId });
    if (partner) {
      partner.outreach.emailsSent = (partner.outreach.emailsSent || 0) + 1;
      partner.outreach.lastEmailAt = new Date();
      if (partner.outreach.status === 'not_started' || partner.outreach.status === 'in_sequence') {
        partner.outreach.status = 'in_sequence';
      }
      if (msg.type === 'cold' && partner.stage === 'target') {
        partner.stageHistory.push({ from: 'target', to: 'contacted', at: new Date() });
        partner.stage = 'contacted';
      }
      await partner.save();
    }
    return true;
  } catch (err: any) {
    msg.status = 'failed';
    msg.failedReason = err?.message || 'send failed';
    await msg.save();
    return false;
  }
}

/**
 * Sender cron worker. For each tenant with due cold/followup messages, respect a
 * daily cap and a minimum gap between sends; deliver at most one per tick so sends
 * stay spaced out. Idempotent — re-running never double-sends (status guard).
 */
export async function processDueQueue(): Promise<void> {
  const now = new Date();
  const startOfDay = new Date(now); startOfDay.setHours(0, 0, 0, 0);

  // Tenants that have something due right now.
  const tenantIds: mongoose.Types.ObjectId[] = await PartnerOutreachMessage.distinct('tenantId', {
    status: 'queued', type: { $in: ['cold', 'followup'] }, scheduledFor: { $lte: now },
  });

  for (const tenantId of tenantIds) {
    const tid = tenantId.toString();
    const cap = settings.getNum('PARTNER_OUTREACH_DAILY_CAP', DEFAULT_DAILY_CAP, tid);
    const gapMs = settings.getNum('PARTNER_OUTREACH_MIN_GAP_MINUTES', DEFAULT_MIN_GAP_MIN, tid) * 60 * 1000;

    const sentToday = await PartnerOutreachMessage.countDocuments({ tenantId, status: 'sent', sentAt: { $gte: startOfDay } });
    if (sentToday >= cap) continue;

    // Enforce the gap between sends.
    const last = await PartnerOutreachMessage.findOne({ tenantId, status: 'sent' }).sort({ sentAt: -1 }).select('sentAt').lean();
    if (last?.sentAt && now.getTime() - new Date(last.sentAt).getTime() < gapMs) continue;

    // Oldest due message first.
    const next = await PartnerOutreachMessage.findOne({
      tenantId, status: 'queued', type: { $in: ['cold', 'followup'] }, scheduledFor: { $lte: now },
    }).sort({ scheduledFor: 1 }).select('_id').lean();
    if (!next) continue;

    await deliverMessage(next._id as mongoose.Types.ObjectId);
  }
}
