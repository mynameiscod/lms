import fs from 'fs';
import mongoose from 'mongoose';
import SupportChatSession from '../models/SupportChatSession';
import SupportMessage from '../models/SupportMessage';
import SupportTicket from '../models/SupportTicket';
import SupportAuditLog from '../models/SupportAuditLog';
import SupportConfiguration from '../models/SupportConfiguration';
import { mergeSupportConfig } from './supportAccess';
import { attachmentPath } from './supportAttachments';
import { logger } from '../utils/logger';

/**
 * Deletes what SupportConfiguration says to stop keeping:
 *   - assistant conversations idle for longer than retention.chatDays;
 *   - ticket attachments older than retention.attachmentDays (the file, and its entry on the
 *     message; the message text stays, so the conversation still reads).
 *
 * Per institute, with the platform default filling in what an institute did not set. NOTHING is
 * deleted for an institute where neither is set — empty means "keep". Each run is recorded in
 * the support audit trail with counts only.
 */
export async function runSupportRetention(now = new Date()) {
  const result = { chats: 0, attachments: 0, tenants: 0 };
  const base = await SupportConfiguration.findOne({ tenantId: null }).lean();
  const [chatTenants, msgTenants] = await Promise.all([
    SupportChatSession.distinct('tenantId'),
    SupportMessage.distinct('tenantId', { 'attachments.0': { $exists: true } }),
  ]);
  const tenants = [...new Set([...chatTenants, ...msgTenants].map(String))];
  for (const t of tenants) {
    const own = await SupportConfiguration.findOne({ tenantId: new mongoose.Types.ObjectId(t) }).lean();
    const cfg = mergeSupportConfig(own, base).retention;
    if (!cfg.chatDays && !cfg.attachmentDays) continue;
    result.tenants++;

    if (cfg.chatDays) {
      const before = new Date(now.getTime() - cfg.chatDays * 86_400_000);
      const old = await SupportChatSession.find({ tenantId: t, lastActivityAt: { $lt: before } }).select('_id').lean();
      if (old.length) {
        const ids = old.map(o => o._id);
        await SupportTicket.updateMany({ chatSessionId: { $in: ids } }, { $set: { chatSessionId: null } });
        const r = await SupportChatSession.deleteMany({ _id: { $in: ids } });
        result.chats += r.deletedCount || 0;
      }
    }

    if (cfg.attachmentDays) {
      const before = new Date(now.getTime() - cfg.attachmentDays * 86_400_000);
      const msgs = await SupportMessage.find({ tenantId: t, createdAt: { $lt: before }, 'attachments.0': { $exists: true } }).select('ticketId attachments').lean();
      for (const m of msgs as any[]) {
        for (const a of m.attachments) {
          const p = attachmentPath(String(m.ticketId), a.storedName);
          if (p) await fs.promises.unlink(p).catch(() => undefined);
          result.attachments++;
        }
        await SupportMessage.updateOne({ _id: m._id }, { $set: { attachments: [] } });
      }
    }

    await SupportAuditLog.create({
      tenantId: t, entity: 'config', action: 'retention_run', actorKind: 'system', crossTenant: false,
      changes: { chats: { to: result.chats }, attachments: { to: result.attachments } },
    }).catch(() => undefined);
  }
  return result;
}

let timer: NodeJS.Timeout | null = null;
/** Once at start-up (after a minute) and then daily. Single process only, like the other jobs. */
export function startSupportRetentionScheduler() {
  if (timer) return;
  const run = () => runSupportRetention().then(r => { if (r.chats || r.attachments) logger.info('[support] retention', r); }).catch(e => logger.warn('[support] retention failed', { error: e?.message }));
  setTimeout(run, 60_000).unref?.();
  timer = setInterval(run, 24 * 3_600_000);
  timer.unref?.();
}
