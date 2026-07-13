import mongoose from 'mongoose';
import PlacementPartner, { IPlacementPartner } from '../models/PlacementPartner';
import PartnerOutreachMessage, { IPartnerOutreachMessage } from '../models/PartnerOutreachMessage';
import PartnerInboundMessage from '../models/PartnerInboundMessage';
import { EmailService } from './emailService';
import * as settings from './settingsService';
import { coldEmail, vouchEmail, followupEmail, toHtml } from './outreachTemplates';
import { generateOnePager } from './candidateProfilePdf';
import { createPartnerTask } from './partnerTaskService';
import PartnerSuppression from '../models/PartnerSuppression';
import { splitAttachments, renderEmail, unsubUrl, AttachmentRef } from './partnerEmailAssets';

const DEFAULT_DAILY_CAP = 25;
const DEFAULT_MIN_GAP_MIN = 20;
const DEFAULT_FOLLOWUP_MAX = 3;
const DEFAULT_FOLLOWUP_GAP_DAYS = 3;

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

  // Respect opt-outs — never start a sequence to a suppressed address.
  if (await PartnerSuppression.exists({ tenantId: partner.tenantId, email: partner.contactEmail.toLowerCase() })) {
    return { ok: false, held: true, reason: 'Contact has unsubscribed — not contacting' };
  }

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

/** Draft the candidate-profile email (PDFs attached at send) — always held for approval. */
export async function draftCandidateProfiles(partner: IPlacementPartner, userId: string): Promise<IPartnerOutreachMessage> {
  if (!partner.candidates?.length) throw new Error('No candidates selected for this partner');
  if (!partner.contactEmail) throw new Error('No contact email to send to');
  const fn = (partner.contactName || '').trim().split(/\s+/)[0] || 'there';
  const names = partner.candidates.map(c => c.studentName).filter(Boolean);
  const sender = senderName(partner.tenantId.toString());
  const body =
`Hi ${fn},

As discussed, please find attached the profiles of ${names.length === 1 ? 'a candidate' : `${names.length} candidates`} I'd recommend for ${partner.companyName}:

${names.map(n => `• ${n}`).join('\n')}

Each has been trained and screened by us on Java, Spring Boot, React and SQL, with real project work. Happy to set up interviews at your convenience.

Warm regards,
${sender}
CodeBegun — Java Full Stack Training & Placements, Hyderabad`;

  return PartnerOutreachMessage.create({
    tenantId: partner.tenantId, partnerId: partner._id, companyName: partner.companyName,
    type: 'candidate_profile', status: 'pending_approval', requiresApproval: true,
    toEmail: partner.contactEmail, toName: partner.contactName || '',
    subject: `Candidate profiles for ${partner.companyName} — CodeBegun`,
    body, candidateIds: partner.candidates.map(c => c.studentId),
    createdBy: new mongoose.Types.ObjectId(userId),
  });
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

const mailDomain = (tenantId: string) =>
  (settings.getStr('EMAIL_USER', '', tenantId).split('@')[1] || 'codebegun.com').trim();

/**
 * Send a 1:1 human reply to a partner from inside the pipeline. Threads to the
 * message being replied to (In-Reply-To / References) so it lands in the same
 * conversation in their inbox. Sent directly (no approval) and recorded in the
 * thread; the inbound message it answers is marked read.
 */
export async function sendPartnerReply(
  partner: IPlacementPartner,
  opts: { subject: string; body: string; inboundId?: string; attachments?: AttachmentRef[] },
  userId: string
): Promise<IPartnerOutreachMessage> {
  const tenantId = partner.tenantId.toString();
  if (!partner.contactEmail) throw new Error('This partner has no contact email');
  if (!opts.subject?.trim() || !opts.body?.trim()) throw new Error('Subject and message are required');

  let inReplyTo: string | undefined;
  let references: string[] = [];
  if (opts.inboundId) {
    const inb = await PartnerInboundMessage.findOne({ _id: opts.inboundId, tenantId: partner.tenantId, partnerId: partner._id }).lean();
    if (inb?.messageId) {
      inReplyTo = inb.messageId;
      references = [...(inb.references || []), inb.messageId].filter(Boolean);
    }
  }

  const { attach, links } = splitAttachments(opts.attachments);
  const messageId = `<po-reply-${(partner._id as any).toString()}-${Date.now().toString(36)}@${mailDomain(tenantId)}>`;
  const html = renderEmail(opts.body, tenantId, { mode: 'full', links });
  const ok = await new EmailService(tenantId).sendGenericEmail(
    partner.contactEmail, opts.subject, html, opts.body, attach.length ? attach : undefined,
    { messageId, inReplyTo, references, replyTo: settings.getStr('EMAIL_USER', '', tenantId) || undefined },
  );
  if (!ok) throw new Error('Email transport returned false');

  const msg = await PartnerOutreachMessage.create({
    tenantId: partner.tenantId, partnerId: partner._id, companyName: partner.companyName,
    type: 'reply', status: 'sent', requiresApproval: false,
    toEmail: partner.contactEmail, toName: partner.contactName || '',
    subject: opts.subject, body: opts.body, messageId, sentAt: new Date(),
    attachments: (opts.attachments || []) as any,
    createdBy: new mongoose.Types.ObjectId(userId),
  });

  if (opts.inboundId) await PartnerInboundMessage.updateOne({ _id: opts.inboundId }, { $set: { read: true } });
  partner.outreach.emailsSent = (partner.outreach.emailsSent || 0) + 1;
  partner.outreach.lastEmailAt = new Date();
  await partner.save();
  return msg;
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

/**
 * Record that a partner replied: stop the sequence, advance the pipeline stage to
 * "replied", and raise the hot-lead reminder (mirrored to Todoist). Shared by the
 * manual "Mark replied" endpoint and the IMAP auto-reply poller so both behave
 * identically. Idempotent-friendly: callers should only invoke it for a partner
 * still in an active sequence.
 */
export async function markPartnerReplied(partner: IPlacementPartner, note?: string, userId?: string): Promise<void> {
  await stopSequence(partner, 'replied', note);
  if (partner.stage === 'target' || partner.stage === 'contacted') {
    partner.stageHistory.push({
      from: partner.stage, to: 'replied', at: new Date(),
      by: userId ? new mongoose.Types.ObjectId(userId) : undefined,
    });
    partner.stage = 'replied';
    await partner.save();
  }
  await createPartnerTask(partner, 'reply',
    `🔥 ${partner.companyName} replied to outreach — respond today`,
    { description: `Contact: ${partner.contactName || ''} <${partner.contactEmail || ''}>`, userId });
}

/**
 * After a cold/follow-up send, schedule the next polite follow-up (spaced a few
 * days out) up to a max. When exhausted, the sequence quietly ends. Reply/bounce
 * cancels any queued follow-up before it sends.
 */
async function scheduleNextFollowup(partner: IPlacementPartner, currentStep: number, userId?: mongoose.Types.ObjectId) {
  const tid = partner.tenantId.toString();
  const max = settings.getNum('PARTNER_FOLLOWUP_MAX', DEFAULT_FOLLOWUP_MAX, tid);
  const gapDays = settings.getNum('PARTNER_FOLLOWUP_GAP_DAYS', DEFAULT_FOLLOWUP_GAP_DAYS, tid);
  const nextStep = currentStep + 1;

  if (nextStep > max) {
    if (partner.outreach.status === 'in_sequence') {
      partner.outreach.status = 'stopped';
      partner.outreach.stoppedReason = 'Sequence completed — no reply';
      await partner.save();
    }
    return;
  }
  if (!partner.contactEmail) return;
  // Guard against duplicates if somehow called twice.
  const dup = await PartnerOutreachMessage.findOne({
    tenantId: partner.tenantId, partnerId: partner._id, type: 'followup',
    sequenceStep: nextStep, status: { $in: ['queued', 'pending_approval', 'sending'] },
  });
  if (dup) return;

  const when = new Date(Date.now() + gapDays * 24 * 60 * 60 * 1000);
  const draft = followupEmail(partner, nextStep, senderName(tid));
  await PartnerOutreachMessage.create({
    tenantId: partner.tenantId, partnerId: partner._id, companyName: partner.companyName,
    type: 'followup', status: 'queued', requiresApproval: false,
    toEmail: partner.contactEmail, toName: partner.contactName || '',
    subject: draft.subject, body: draft.body, sequenceStep: nextStep, scheduledFor: when, createdBy: userId,
  });
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

  // Never email someone who unsubscribed / bounced.
  if (await PartnerSuppression.exists({ tenantId: msg.tenantId, email: (msg.toEmail || '').toLowerCase() })) {
    msg.status = 'cancelled';
    msg.failedReason = 'Recipient is on the suppression list (unsubscribed/bounced)';
    await msg.save();
    return false;
  }

  try {
    // Attachments = uploaded files on the message (split: attach ≤10MB / link larger)
    // + freshly-generated one-pager PDFs for candidate-profile emails.
    const { attach, links } = splitAttachments(msg.attachments as any);
    const attachments: { filename: string; content: Buffer }[] = [...attach];
    if (msg.type === 'candidate_profile' && msg.candidateIds?.length) {
      for (const sid of msg.candidateIds) {
        try {
          const pdf = await generateOnePager(sid.toString(), tenantId);
          attachments.push({ filename: pdf.fileName, content: pdf.buffer });
        } catch (e: any) {
          console.error('[OUTREACH] one-pager failed for', sid.toString(), e?.message);
        }
      }
    }

    // Set a Message-ID we control so we can thread the partner's reply back to
    // this exact email (matches inbound In-Reply-To / References).
    const domain = (settings.getStr('EMAIL_USER', '', tenantId).split('@')[1] || 'codebegun.com').trim();
    const messageId = `<po-${msg._id}-${Date.now().toString(36)}@${domain}>`;

    // Cold/follow-up carry a one-click unsubscribe (deliverability + compliance);
    // all outreach uses the branded template so it looks professional in the inbox.
    const isColdSequence = msg.type === 'cold' || msg.type === 'followup';
    const unsubscribeUrl = isColdSequence ? unsubUrl(tenantId, msg.partnerId.toString()) : undefined;
    const html = renderEmail(msg.body, tenantId, { mode: 'full', links, unsubscribeUrl });
    const headers = unsubscribeUrl
      ? {
          'List-Unsubscribe': `<${unsubscribeUrl}>, <mailto:${settings.getStr('EMAIL_USER', '', tenantId)}?subject=unsubscribe>`,
          'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
        }
      : undefined;

    const ok = await new EmailService(tenantId).sendGenericEmail(
      msg.toEmail, msg.subject, html, msg.body, attachments.length ? attachments : undefined,
      { messageId, replyTo: settings.getStr('EMAIL_USER', '', tenantId) || undefined, headers },
    );
    if (!ok) throw new Error('Email transport returned false');

    msg.status = 'sent';
    msg.sentAt = new Date();
    msg.messageId = messageId;
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

      // Chain the next follow-up (only for auto sequence emails, and only while still unanswered).
      if ((msg.type === 'cold' || msg.type === 'followup') && partner.outreach.status === 'in_sequence') {
        await scheduleNextFollowup(partner, msg.sequenceStep, msg.createdBy as mongoose.Types.ObjectId | undefined);
      }
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
