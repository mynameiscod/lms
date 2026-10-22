import { Response, NextFunction } from 'express';
import { SupportRequest } from '../middleware/supportAccess';
import * as svc from '../services/supportTicketService';
import { can } from '../data/supportPolicy';
import { keepUploads, discardUploads, removeKept, attachmentPath, ATTACHMENT_LIMITS } from '../services/supportAttachments';

/**
 * Help & Support tickets — thin HTTP wrappers over services/supportTicketService. Identity comes
 * from req.supportActor (set by requireSupport from the login); the body only ever supplies
 * the allow-listed fields each service function picks.
 */
const ctxOf = (req: SupportRequest): svc.RequestCtx => ({ requestId: req.requestId, userAgent: String(req.headers['user-agent'] || '') || undefined });

/** Known failures carry their own message; anything else goes to the central error handler. */
const handle = (fn: (req: SupportRequest, res: Response) => Promise<unknown>) =>
  async (req: SupportRequest, res: Response, next: NextFunction) => {
    try { await fn(req, res); } catch (e: any) {
      if (e instanceof svc.SupportError) return res.status(e.status).json({ success: false, message: e.message, code: e.code, requestId: req.requestId });
      next(e);
    }
  };

export const create = handle(async (req, res) => {
  const r = await svc.createTicket(req.supportActor!, req.body, ctxOf(req));
  res.status(r.duplicate ? 200 : 201).json({ success: true, message: r.duplicate ? 'This ticket was already raised.' : 'Ticket raised.', data: r.ticket, duplicate: r.duplicate });
});

export const mine = handle(async (req, res) => {
  res.json({ success: true, message: 'OK', data: await svc.myTickets(req.supportActor!, req.query) });
});

export const detail = handle(async (req, res) => {
  res.json({ success: true, message: 'OK', data: await svc.ticketDetail(req.supportActor!, req.params.id, ctxOf(req)) });
});

export const addMessage = async (req: SupportRequest, res: Response, next: NextFunction) => {
  const files = (req.files as Express.Multer.File[] | undefined) || [];
  try {
    if ((req as any).supportRejectedType) {
      await discardUploads(files);
      return res.status(400).json({ success: false, message: 'Only JPG, PNG, WEBP images and PDF files can be attached.' });
    }
    // Check the caller may write here BEFORE keeping any file, so nothing is stored for a refused request.
    if (files.length) await svc.assertCanWrite(req.supportActor!, req.params.id);
    const kept = files.length ? await keepUploads(String(req.params.id), files) : [];
    if (!Array.isArray(kept)) return res.status(400).json({ success: false, message: kept.error });
    try {
      const r = await svc.addMessage(req.supportActor!, req.params.id, req.body, kept, ctxOf(req));
      return res.status(201).json({ success: true, message: 'Message sent.', data: r });
    } catch (e) {
      // The message was refused after the files were kept (an empty body, a resolved ticket): drop them.
      await removeKept(String(req.params.id), kept);
      throw e;
    }
  } catch (e: any) {
    await discardUploads(files);
    if (e instanceof svc.SupportError) return res.status(e.status).json({ success: false, message: e.message, code: e.code, requestId: req.requestId });
    next(e);
  }
};

export const reopen = handle(async (req, res) => {
  res.json({ success: true, message: 'Ticket reopened.', data: await svc.reopenTicket(req.supportActor!, req.params.id, req.body, ctxOf(req)) });
});

export const update = handle(async (req, res) => {
  res.json({ success: true, message: 'Saved.', data: await svc.updateTicket(req.supportActor!, req.params.id, req.body, ctxOf(req)) });
});

export const bulk = handle(async (req, res) => {
  res.json({ success: true, message: 'Done.', data: await svc.bulkUpdate(req.supportActor!, req.body, ctxOf(req)) });
});

export const queue = handle(async (req, res) => {
  res.json({ success: true, message: 'OK', data: await svc.queue(req.supportActor!, req.query) });
});

export const agents = handle(async (req, res) => {
  res.json({ success: true, message: 'OK', data: await svc.assignableAgents(req.supportActor!) });
});

export const attachment = handle(async (req, res) => {
  const a = await svc.attachmentFor(req.supportActor!, req.params.id, req.params.attachmentId);
  const file = attachmentPath(a.ticketId, a.storedName);
  if (!file) return res.status(404).json({ success: false, message: 'File not found.' });
  res.setHeader('Content-Type', a.mime);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Cache-Control', 'private, no-store');
  // Images may show inline; a PDF downloads, so it never runs in our origin's viewer.
  res.setHeader('Content-Disposition', `${a.mime === 'application/pdf' ? 'attachment' : 'inline'}; filename="${encodeURIComponent(a.name)}"`);
  res.sendFile(file);
});

/** What the signed-in person may do in Help & Support, so the UI can show the right controls. The server still decides. */
export const me = (req: SupportRequest, res: Response) => {
  const a = req.supportActor!;
  res.json({ success: true, message: 'OK', data: {
    userId: a.userId, kind: a.kind, allTenants: a.allTenants, faculty: a.faculty,
    can: { viewCollege: can(a, 'viewCollege'), readInternal: can(a, 'readInternal'), work: can(a, 'work'), manage: can(a, 'manage') },
  } });
};

export const limits = (_req: SupportRequest, res: Response) => res.json({ success: true, message: 'OK', data: { attachments: ATTACHMENT_LIMITS } });
