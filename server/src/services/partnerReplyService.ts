import { ImapFlow } from 'imapflow';
import { simpleParser } from 'mailparser';
import mongoose from 'mongoose';
import PlacementPartner from '../models/PlacementPartner';
import PartnerOutreachMessage from '../models/PartnerOutreachMessage';
import PartnerInboundMessage from '../models/PartnerInboundMessage';
import { markPartnerReplied } from './partnerOutreachService';
import { createPartnerTask } from './partnerTaskService';
import * as settings from './settingsService';

/**
 * partnerReplyService — pulls partner replies into the pipeline over IMAP.
 *
 * For each tenant with IMAP enabled and partners that have a contact email, it
 * scans unseen inbox mail (body fetched with PEEK, so the real mailbox stays
 * UNREAD), matches each message to a partner by the sender address OR by the
 * email thread (In-Reply-To / References → one of our sent Message-IDs), and
 * stores it as a PartnerInboundMessage so the admin can read + reply to it.
 * If the partner is still mid-sequence, the sequence is auto-stopped.
 *
 * Idempotent: inbound rows are unique on (tenantId, messageId), so re-scanning
 * the same unread mail never duplicates.
 */

const LOOKBACK_DAYS = 30;

export interface ImapCfg { host: string; port: number; user: string; pass: string }

export function imapConfig(tid: string): ImapCfg | null {
  if (settings.getStr('PARTNER_IMAP_ENABLED', 'false', tid) !== 'true') return null;
  const user = settings.getStr('EMAIL_USER', '', tid);
  const pass = settings.getStr('EMAIL_PASSWORD', '', tid);
  if (!user || !pass) return null;
  const service = settings.getStr('EMAIL_SERVICE', 'gmail', tid);
  let host = settings.getStr('IMAP_HOST', '', tid);
  if (!host && (service === 'gmail' || /@gmail\.com$/i.test(user))) host = 'imap.gmail.com';
  if (!host) return null; // custom mailbox with no IMAP host given → can't poll
  const port = settings.getNum('IMAP_PORT', 993, tid);
  return { host, port, user, pass };
}

function newClient(cfg: ImapCfg): ImapFlow {
  return new ImapFlow({
    host: cfg.host, port: cfg.port, secure: cfg.port === 993,
    auth: { user: cfg.user, pass: cfg.pass }, logger: false,
  });
}

/** Verify the mailbox connects + INBOX opens. Used by the settings "Test IMAP" button. */
export async function testImapConnection(tid: string): Promise<{ ok: boolean; message: string }> {
  const cfg = imapConfig(tid);
  if (!cfg) return { ok: false, message: 'IMAP is not configured. Enable it and set the host/port + mailbox in Email settings.' };
  const client = newClient(cfg);
  try {
    await client.connect();
    const lock = await client.getMailboxLock('INBOX');
    lock.release();
    await client.logout();
    return { ok: true, message: `Connected to ${cfg.host}:${cfg.port} as ${cfg.user} — INBOX reachable.` };
  } catch (e: any) {
    try { await client.logout(); } catch { /* already closed */ }
    return { ok: false, message: `Connection failed: ${e?.message || e}` };
  }
}

async function pollTenant(tid: string): Promise<number> {
  const cfg = imapConfig(tid);
  if (!cfg) return 0;

  // Partners we can attribute a reply to (any status — a reply can arrive after
  // the sequence already ended). Keyed by lowercased contact email.
  const partners = await PlacementPartner.find({ tenantId: tid, contactEmail: { $nin: ['', null] } });
  const byEmail = new Map<string, typeof partners[number]>();
  for (const p of partners) {
    const e = (p.contactEmail || '').toLowerCase().trim();
    if (e && !byEmail.has(e)) byEmail.set(e, p);
  }
  if (!partners.length) return 0;

  const client = newClient(cfg);
  let stored = 0;
  try {
    await client.connect();
    const lock = await client.getMailboxLock('INBOX');
    try {
      const since = new Date(Date.now() - LOOKBACK_DAYS * 24 * 60 * 60 * 1000);
      const uids = await client.search({ seen: false, since }, { uid: true });
      if (uids && uids.length) {
        // `source` uses BODY.PEEK[] → does NOT mark the mail as read.
        for await (const item of client.fetch(uids, { source: true }, { uid: true })) {
          try {
            const done = await handleMessage(tid, item.source as Buffer, byEmail);
            if (done) stored++;
          } catch (e: any) {
            console.error('[PARTNER-REPLY] parse/store failed:', e?.message);
          }
        }
      }
    } finally {
      lock.release();
    }
    await client.logout();
  } catch (e: any) {
    console.error(`[PARTNER-REPLY] IMAP poll failed for tenant ${tid}:`, e?.message);
    try { await client.logout(); } catch { /* already closed */ }
  }
  return stored;
}

/** Parse one raw message, match it to a partner, and store it (idempotent). */
async function handleMessage(
  tid: string,
  raw: Buffer,
  byEmail: Map<string, any>
): Promise<boolean> {
  const parsed = await simpleParser(raw);
  const messageId = (parsed.messageId || '').trim();
  if (!messageId) return false;

  const fromAddr = (parsed.from?.value?.[0]?.address || '').toLowerCase().trim();
  const fromName = parsed.from?.value?.[0]?.name || '';
  const references = ([] as string[]).concat(
    Array.isArray(parsed.references) ? parsed.references : parsed.references ? [parsed.references] : []
  );
  const inReplyTo = (parsed.inReplyTo || '').trim();

  // Match: (1) by sender address, else (2) by thread — In-Reply-To/References
  // pointing at a Message-ID we sent.
  let partner = fromAddr ? byEmail.get(fromAddr) : undefined;
  let matchedBy: 'address' | 'thread' = 'address';
  if (!partner) {
    const threadIds = [inReplyTo, ...references].filter(Boolean);
    if (threadIds.length) {
      const sent = await PartnerOutreachMessage.findOne({
        tenantId: tid, messageId: { $in: threadIds },
      }).select('partnerId').lean();
      if (sent) {
        partner = await PlacementPartner.findOne({ _id: sent.partnerId, tenantId: tid });
        matchedBy = 'thread';
      }
    }
  }
  if (!partner) return false; // not a partner reply — ignore

  // Store (deduped on tenantId+messageId). Duplicate key = already processed.
  try {
    await PartnerInboundMessage.create({
      tenantId: new mongoose.Types.ObjectId(tid),
      partnerId: partner._id,
      companyName: partner.companyName,
      fromEmail: fromAddr,
      fromName,
      subject: parsed.subject || '(no subject)',
      text: (parsed.text || '').trim(),
      html: typeof parsed.html === 'string' ? parsed.html : '',
      messageId,
      inReplyTo: inReplyTo || undefined,
      references,
      matchedBy,
      read: false,
      receivedAt: parsed.date || new Date(),
    });
  } catch (e: any) {
    if (e?.code === 11000) return false; // already captured
    throw e;
  }

  // Stop the sequence if it's still running (reuses the manual-reply path).
  if (partner.outreach?.status === 'in_sequence') {
    await markPartnerReplied(partner, `Auto-detected reply from ${fromAddr}`);
  } else {
    // Already past the sequence — still nudge the admin to respond.
    await createPartnerTask(partner, 'reply',
      `💬 ${partner.companyName} sent a new message — respond`,
      { description: `From: ${fromName} <${fromAddr}>` });
  }
  return true;
}

/** Poll every tenant that has partners with a contact email. */
export async function pollReplies(): Promise<void> {
  const tenantIds = await PlacementPartner.distinct('tenantId', { contactEmail: { $nin: ['', null] } });
  for (const tid of tenantIds) {
    try {
      const n = await pollTenant(String(tid));
      if (n) console.log(`[PARTNER-REPLY] tenant ${tid}: captured ${n} new partner repl(y/ies)`);
    } catch (e: any) {
      console.error('[PARTNER-REPLY] tenant poll error:', e?.message);
    }
  }
}
