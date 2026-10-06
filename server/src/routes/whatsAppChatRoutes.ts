import express, { Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth';
import { tenantMiddleware } from '../middleware/tenantMiddleware';
import { roleGuard } from '../middleware/roleGuard';
import * as svc from '../services/whatsAppChatService';
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
    const status = e instanceof svc.ChatError ? e.status : 500;
    if (status === 500) console.error('[wa-chat]', e);
    res.status(status).json({ success: false, message: e?.message || 'Something went wrong' });
  }
};

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
