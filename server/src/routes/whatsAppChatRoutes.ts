import express, { Request, Response } from 'express';
import multer from 'multer';
import { authMiddleware } from '../middleware/auth';
import { tenantMiddleware } from '../middleware/tenantMiddleware';
import { roleGuard, permissionsOf } from '../middleware/roleGuard';
import * as svc from '../services/whatsAppChatService';
import * as inbox from '../services/whatsAppChatInbox';
import * as bunny from '../services/bunnyStorageService';

/**
 * WhatsApp conversations, read and answered from a candidate's or lead's page.
 *
 * Two gates, both required: the chat permission itself, AND access to the records a chat is
 * opened from (placement program or leads) — so being allowed to chat does not by itself reveal
 * conversations from a module the user cannot open.
 */
const router = express.Router();
router.use(
  authMiddleware, tenantMiddleware,
  roleGuard(['chat_whatsapp']),
  roleGuard(['manage_placement_program', 'manage_placement', 'manage_tenant', 'manage_leads', 'view_leads']),
);

const tId = (req: Request) => (req as any).tenantId as string;
const uId = (req: Request) => (req as any).user?.id as string;
const wrap = (fn: (req: Request, res: Response) => Promise<any>) => async (req: Request, res: Response) => {
  try { await fn(req, res); } catch (e: any) {
    const status = e instanceof svc.ChatError || e instanceof inbox.InboxError ? e.status : 500;
    if (status === 500) console.error('[wa-chat]', e);
    res.status(status).json({ success: false, message: e?.message || 'Something went wrong' });
  }
};

/** Institute admins (or whoever manages WhatsApp templates) can reassign chats and edit quick replies. */
const isChatAdmin = async (req: Request) => {
  const user = (req as any).user;
  if (user?.role === 'SUPER_ADMIN') return true;
  const p = await permissionsOf(user);
  return ['manage_whatsapp_templates', 'manage_tenant', 'manage_tenant_settings'].some((k) => p.includes(k));
};
const chatAdmin = (req: Request, res: Response, next: express.NextFunction) => {
  isChatAdmin(req).then((ok) => (ok ? next() : res.status(403).json({ success: false, message: 'Only an admin can change quick replies.' }))).catch(next);
};

// Memory storage: the file goes straight on to Meta (and our storage) — never to local disk.
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: svc.MEDIA_UPLOAD_LIMIT_BYTES, files: 1 } });

// ── Shared inbox ─────────────────────────────────────────────────────────────

router.get('/inbox', wrap(async (req, res) => {
  const { filter, q, page } = req.query as any;
  const user = (req as any).user;
  const p = user?.role === 'SUPER_ADMIN' ? null : await permissionsOf(user);
  const has = (keys: string[]) => !p || keys.some((k) => p.includes(k));
  // Placement-only chats need placement access; lead-only chats need leads access.
  const access = {
    placement: has(['manage_placement_program', 'manage_placement', 'manage_tenant']),
    leads: has(['manage_leads', 'view_leads', 'manage_tenant']),
  };
  res.json({ success: true, data: await inbox.listInbox(tId(req), uId(req), { filter, q, page: Number(page) || 1, access }) });
}));

router.get('/staff', wrap(async (req, res) => {
  res.json({ success: true, data: { staff: await inbox.chatStaff(tId(req)), canReassign: await isChatAdmin(req), me: uId(req) } });
}));

router.put('/threads/:phone/assign', wrap(async (req, res) => {
  const to = req.body?.userId ? String(req.body.userId) : null;
  const phone = String(req.params.phone).replace(/\D/g, '');
  const full = phone.length === 10 ? `91${phone}` : phone;
  res.json({ success: true, data: await inbox.assignThread(tId(req), { id: uId(req), isAdmin: await isChatAdmin(req) }, full, to) });
}));

// ── Quick replies ────────────────────────────────────────────────────────────

router.get('/quick-replies', wrap(async (req, res) => {
  res.json({ success: true, data: { replies: await inbox.listQuickReplies(tId(req)), canEdit: await isChatAdmin(req) } });
}));
router.post('/quick-replies', chatAdmin, wrap(async (req, res) => {
  res.status(201).json({ success: true, data: await inbox.saveQuickReply(tId(req), uId(req), null, req.body || {}) });
}));
router.put('/quick-replies/:id', chatAdmin, wrap(async (req, res) => {
  res.json({ success: true, data: await inbox.saveQuickReply(tId(req), uId(req), req.params.id, req.body || {}) });
}));
router.delete('/quick-replies/:id', chatAdmin, wrap(async (req, res) => {
  await inbox.deleteQuickReply(tId(req), req.params.id);
  res.json({ success: true });
}));

// ── Files ────────────────────────────────────────────────────────────────────

router.post('/threads/:phone/media', (req, res, next) => upload.single('file')(req, res, (err: any) => {
  if (err) return res.status(err.code === 'LIMIT_FILE_SIZE' ? 413 : 400).json({ success: false, message: err.code === 'LIMIT_FILE_SIZE' ? 'That file is larger than 25 MB.' : err.message });
  next();
}), wrap(async (req, res) => {
  const file = (req as any).file;
  if (!file) throw new svc.ChatError('Choose a file to send');
  await svc.sendMedia(tId(req), uId(req), req.params.phone, file, req.body?.caption);
  res.status(201).json({ success: true });
}));

router.get('/templates', wrap(async (req, res) => {
  res.json({ success: true, data: await svc.approvedTemplates(tId(req)) });
}));

router.get('/unread', wrap(async (req, res) => {
  const mobiles = String(req.query.phones || '').split(',').map((s) => s.trim()).filter(Boolean);
  res.json({ success: true, data: await svc.unreadFor(tId(req), mobiles) });
}));

router.get('/media/:messageId', wrap(async (req, res) => {
  const media = await svc.mediaOf(tId(req), req.params.messageId);
  const { stream, size } = await bunny.getFileStream(media.storedKey);
  res.setHeader('Content-Type', media.mime || 'application/octet-stream');
  if (size) res.setHeader('Content-Length', String(size));
  res.setHeader('Content-Disposition', `inline; filename="${(media.fileName || 'whatsapp-file').replace(/"/g, '')}"`);
  res.setHeader('Cache-Control', 'private, max-age=3600');
  stream.pipe(res);
}));

router.get('/threads/:phone', wrap(async (req, res) => {
  const { before, limit } = req.query as any;
  res.json({ success: true, data: await svc.getThread(tId(req), req.params.phone, { before, limit: Number(limit) || undefined }) });
}));

router.post('/threads/:phone/messages', wrap(async (req, res) => {
  const { text, templateId, values, buttonParam } = req.body || {};
  if (templateId) {
    await svc.sendTemplate(tId(req), uId(req), req.params.phone, String(templateId), Array.isArray(values) ? values.map(String) : [], buttonParam ? String(buttonParam) : undefined);
  } else {
    await svc.sendText(tId(req), uId(req), req.params.phone, String(text || ''));
  }
  res.status(201).json({ success: true });
}));

router.post('/threads/:phone/read', wrap(async (req, res) => {
  await svc.markRead(tId(req), req.params.phone);
  res.json({ success: true });
}));

router.put('/threads/:phone/bot', wrap(async (req, res) => {
  res.json({ success: true, data: await svc.setBotPaused(tId(req), req.params.phone, !!req.body?.paused) });
}));

export default router;
