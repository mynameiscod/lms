import express from 'express';
import { authMiddleware } from '../middleware/auth';
import { tenantMiddleware } from '../middleware/tenantMiddleware';
import { roleGuard } from '../middleware/roleGuard';
import * as ctrl from '../controllers/whatsAppTemplateController';

/**
 * WhatsApp message templates — author on Meta from the LMS, assign to system uses, send.
 * Tenant settings territory: templates go out under the institute's WhatsApp number.
 */
const router = express.Router();
router.use(authMiddleware, tenantMiddleware, roleGuard(['manage_tenant_settings', 'manage_tenant']));

router.get('/connection', ctrl.getConnection);
router.put('/connection', ctrl.saveConnection);
router.post('/connection/test', ctrl.testConnection);

router.get('/usage', ctrl.usage);
router.get('/usage/compatibility', ctrl.compatibility);
router.put('/usage/:purpose', ctrl.assign);

router.get('/broadcasts', ctrl.broadcasts);
router.get('/messages', ctrl.messages);
router.get('/batches', ctrl.batches);

router.get('/', ctrl.list);
router.post('/', ctrl.create);
router.post('/sync', ctrl.sync);
router.post('/validate', ctrl.validate);
router.put('/:id', ctrl.update);
router.delete('/:id', ctrl.remove);
router.post('/:id/test', ctrl.sendTest);
router.post('/:id/broadcast', ctrl.broadcast);

export default router;
