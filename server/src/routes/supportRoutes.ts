import express from 'express';
import { authMiddleware } from '../middleware/auth';
import { tenantMiddleware } from '../middleware/tenantMiddleware';
import { requireSupport, requireMonitor } from '../middleware/supportAccess';
import { rateLimit } from '../middleware/rateLimit';
import { supportUpload, ATTACHMENT_LIMITS } from '../services/supportAttachments';
import * as tickets from '../controllers/supportTicketController';
import * as faqs from '../controllers/supportFaqController';
import * as chat from '../controllers/supportAssistantController';
import * as analytics from '../controllers/supportAnalyticsController';
import * as errorsCtl from '../controllers/supportErrorsController';

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

// Help Center articles: members see published ones for their audience only.
router.get('/faqs/suggest', requireSupport('raise'), rateLimit('supportSearch'), faqs.suggest);
router.get('/faqs/search', requireSupport('raise'), rateLimit('supportSearch'), faqs.search);
router.get('/faqs/categories', requireSupport('raise'), faqs.categories);
router.get('/faqs', requireSupport('raise'), faqs.list);
router.get('/faqs/:id', requireSupport('raise'), faqs.get);
router.post('/faqs/:id/vote', requireSupport('raise'), rateLimit('supportTicketMessage'), faqs.vote);

// The assistant: answers only from published articles; never creates a ticket itself.
router.get('/chat/suggestions', requireSupport('raise'), chat.suggestions);
router.post('/chat', requireSupport('raise'), rateLimit('supportChat'), chat.ask);
router.get('/chat/:id', requireSupport('raise'), chat.session);
router.post('/chat/:id/feedback', requireSupport('raise'), rateLimit('supportTicketMessage'), chat.feedback);
router.post('/chat/:id/close', requireSupport('raise'), chat.close);

// Managing articles (support managers)
router.get('/admin/faqs/insights', requireSupport('manage'), faqs.adminInsights);
router.get('/admin/faqs', requireSupport('manage'), faqs.adminList);
router.post('/admin/faqs', requireSupport('manage'), faqs.adminCreate);
router.patch('/admin/faqs/:id', requireSupport('manage'), faqs.adminUpdate);
router.post('/admin/faqs/:id/status', requireSupport('manage'), faqs.adminStatus);

// Dashboard: every number is a query over the caller's reach. Coordinators see their college only.
router.get('/analytics/summary', requireSupport('viewCollege'), analytics.summary);
router.get('/analytics/trends', requireSupport('viewCollege'), analytics.trends);
router.get('/analytics/breakdown', requireSupport('viewCollege'), analytics.breakdown);
router.get('/incidents', requireSupport('viewCollege'), analytics.incidents);
router.post('/incidents', requireSupport('manage'), analytics.confirmIncident);
router.post('/incidents/:id/resolve', requireSupport('manage'), analytics.resolveIncident);

// Settings (targets, reopen policy, incident rules, retention): empty until a manager sets them.
router.get('/admin/config', requireSupport('manage'), analytics.getConfig);
router.put('/admin/config', requireSupport('manage'), analytics.saveConfig);

// Technical monitoring (/admin/errors): super admin and the support HQ's managers only.
router.get('/admin/errors', requireMonitor, errorsCtl.list);
router.get('/admin/errors/counters', requireMonitor, errorsCtl.counters);
router.get('/admin/errors/config', requireMonitor, errorsCtl.getConfig);
router.put('/admin/errors/config', requireMonitor, errorsCtl.saveConfig);
router.get('/admin/errors/:id', requireMonitor, errorsCtl.detail);
router.patch('/admin/errors/:id', requireMonitor, errorsCtl.update);

export default router;
