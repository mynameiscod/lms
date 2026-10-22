import express from 'express';
import { authMiddleware } from '../middleware/auth';
import { tenantMiddleware } from '../middleware/tenantMiddleware';
import { requireSupport } from '../middleware/supportAccess';
import { rateLimit } from '../middleware/rateLimit';
import { supportUpload, ATTACHMENT_LIMITS } from '../services/supportAttachments';
import * as tickets from '../controllers/supportTicketController';

/**
 * Help & Support (CareerPilot), mounted at /api/v1/support.
 *
 * Every route needs a login; requireSupport builds the caller's support identity from it and
 * refuses what their kind may not do. Isolation between colleges is in the queries themselves
 * (ticketScope), so a route that forgot a check still could not read another college's ticket.
 */
const router = express.Router();
router.use(authMiddleware, tenantMiddleware);

/**
 * Multer errors (a file over the size limit, too many files) answered as a plain message,
 * instead of falling through to the generic 500.
 */
const uploads = (req: any, res: any, next: any) =>
  supportUpload.array('files', ATTACHMENT_LIMITS.maxFiles)(req, res, (err: any) => {
    if (!err) return next();
    const msg = err.code === 'LIMIT_FILE_SIZE' ? 'Each file must be 5 MB or smaller.'
      : err.code === 'LIMIT_FILE_COUNT' || err.code === 'LIMIT_UNEXPECTED_FILE' ? `Attach at most ${ATTACHMENT_LIMITS.maxFiles} files.`
      : 'The upload could not be read.';
    res.status(400).json({ success: false, message: msg });
  });

// Members (and anyone signed in)
router.get('/me', requireSupport('raise'), tickets.me);
router.get('/limits', requireSupport('raise'), tickets.limits);
router.post('/tickets', requireSupport('raise'), rateLimit('supportTicketCreate'), tickets.create);
router.get('/tickets/mine', requireSupport('raise'), tickets.mine);

// Staff and coordinators (declared before /tickets/:id so 'queue' is never read as an id)
router.get('/queue', requireSupport('viewCollege'), tickets.queue);
router.get('/agents', requireSupport('work'), tickets.agents);
router.post('/tickets/bulk', requireSupport('work'), tickets.bulk);

// One ticket: the service decides per ticket who may read and write.
router.get('/tickets/:id', requireSupport('raise'), tickets.detail);
router.post('/tickets/:id/messages', requireSupport('raise'), rateLimit('supportTicketMessage'), uploads, tickets.addMessage);
router.post('/tickets/:id/reopen', requireSupport('raise'), rateLimit('supportTicketMessage'), tickets.reopen);
router.get('/tickets/:id/attachments/:attachmentId', requireSupport('raise'), tickets.attachment);
router.patch('/tickets/:id', requireSupport('work'), tickets.update);

export default router;
