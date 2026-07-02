import { ImapFlow } from 'imapflow';
import PlacementPartner from '../models/PlacementPartner';
import { markPartnerReplied } from './partnerOutreachService';
import * as settings from './settingsService';

/**
 * partnerReplyService — closes the outreach loop automatically.
 *
 * When a partner replies to a cold/follow-up email, their sequence must stop so
 * we never keep bumping someone who already answered. Previously an admin had to
 * click "Mark replied"; this polls the outreach mailbox over IMAP and does it the
 * moment a reply lands, reusing markPartnerReplied() (stop sequence → stage
 * "replied" → hot-lead Todoist task).
 *
 * Design notes:
 *  - Per-tenant: uses the same mailbox as Email settings (EMAIL_USER/PASSWORD),
 *    only for tenants that turned PARTNER_IMAP_ENABLED on and still have partners
 *    awaiting a reply.
 *  - Read-only: fetches envelopes only (never message bodies) so the admin's
 *    inbox is NOT marked read — a human still sees and answers the reply.
 *  - Idempotent: matches only partners whose outreach.status is 'in_sequence';
 *    once stopped they no longer match, so re-scanning the same mail is a no-op.
 */

const LOOKBACK_DAYS = 30;

interface ImapCfg { host: string; port: number; user: string; pass: string }

function imapConfig(tid: string): ImapCfg | null {
  if (settings.getStr('PARTNER_IMAP_ENABLED', 'false', tid) !== 'true') return null;
  const user = settings.getStr('EMAIL_USER', '', tid);
  const pass = settings.getStr('EMAIL_PASSWORD', '', tid);
  if (!user || !pass) return null;
  const service = settings.getStr('EMAIL_SERVICE', 'gmail', tid);
  let host = settings.getStr('IMAP_HOST', '', tid);
  if (!host && (service === 'gmail' || /@gmail\.com$/i.test(user))) host = 'imap.gmail.com';
  if (!host) return null; // custom SMTP with no IMAP host given → can't poll
  const port = settings.getNum('IMAP_PORT', 993, tid);
  return { host, port, user, pass };
}

async function pollTenant(tid: string): Promise<number> {
  // Only partners still awaiting a reply are actionable.
  const partners = await PlacementPartner.find({
    tenantId: tid, 'outreach.status': 'in_sequence', contactEmail: { $nin: ['', null] },
  });
  if (!partners.length) return 0;

  const cfg = imapConfig(tid);
  if (!cfg) return 0;

  // Lowercased contact email → partner (first wins if duplicates).
  const byEmail = new Map<string, typeof partners[number]>();
  for (const p of partners) {
    const e = (p.contactEmail || '').toLowerCase().trim();
    if (e && !byEmail.has(e)) byEmail.set(e, p);
  }

  const client = new ImapFlow({
    host: cfg.host, port: cfg.port, secure: cfg.port === 993,
    auth: { user: cfg.user, pass: cfg.pass }, logger: false,
  });

  let matched = 0;
  try {
    await client.connect();
    const lock = await client.getMailboxLock('INBOX');
    try {
      const since = new Date(Date.now() - LOOKBACK_DAYS * 24 * 60 * 60 * 1000);
      const uids = await client.search({ seen: false, since }, { uid: true });
      if (uids && uids.length) {
        // Envelope-only fetch — does NOT set the \Seen flag.
        for await (const msg of client.fetch(uids, { envelope: true }, { uid: true })) {
          const froms = (msg.envelope?.from || []).map((a) => (a.address || '').toLowerCase().trim());
          for (const from of froms) {
            const partner = byEmail.get(from);
            if (partner) {
              byEmail.delete(from); // handle each partner once per run
              try {
                await markPartnerReplied(partner, `Auto-detected reply from ${from}`);
                matched++;
              } catch (e: any) {
                console.error('[PARTNER-REPLY] markReplied failed for', partner.companyName, e?.message);
              }
            }
          }
          if (!byEmail.size) break; // every pending partner resolved
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
  return matched;
}

/** Poll every tenant that currently has partners awaiting a reply. */
export async function pollReplies(): Promise<void> {
  const tenantIds = await PlacementPartner.distinct('tenantId', { 'outreach.status': 'in_sequence' });
  for (const tid of tenantIds) {
    try {
      const n = await pollTenant(String(tid));
      if (n) console.log(`[PARTNER-REPLY] tenant ${tid}: auto-stopped ${n} sequence(s) on reply`);
    } catch (e: any) {
      console.error('[PARTNER-REPLY] tenant poll error:', e?.message);
    }
  }
}
