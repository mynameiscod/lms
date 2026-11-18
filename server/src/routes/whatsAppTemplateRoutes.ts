import express from 'express';
import { authMiddleware } from '../middleware/auth';
import { tenantMiddleware } from '../middleware/tenantMiddleware';
import { roleGuard } from '../middleware/roleGuard';
import multer from 'multer';
import * as ctrl from '../controllers/whatsAppTemplateController';
import { storePdf, WaFileError, WA_FILE_MAX_BYTES } from '../services/whatsAppFileService';

/**
 * WhatsApp message templates — author on Meta from the LMS, assign to system uses, send.
 * Tenant settings territory: templates go out under the institute's WhatsApp number.
 */
const router = express.Router();
router.use(authMiddleware, tenantMiddleware, roleGuard(['manage_whatsapp_templates', 'manage_tenant_settings', 'manage_tenant']));

router.get('/connection', ctrl.getConnection);
router.put('/connection', ctrl.saveConnection);
router.post('/connection/test', ctrl.testConnection);

router.get('/usage', ctrl.usage);
router.get('/usage/compatibility', ctrl.compatibility);
router.put('/usage/:purpose', ctrl.assign);

router.get('/broadcasts', ctrl.broadcasts);
router.get('/messages', ctrl.messages);
router.get('/messages/summary', ctrl.messagesSummary);
router.get('/batches', ctrl.batches);
router.get('/lead-filters', ctrl.leadFilters);
router.get('/audiences', ctrl.audienceSources);
router.get('/audiences/:key/filters', ctrl.audienceFilters);

// A PDF for a Document header (brochure): stored by us, served at a public link Meta can fetch.
const pdfUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: WA_FILE_MAX_BYTES, files: 1 } });
router.post('/files', (req, res, next) => pdfUpload.single('file')(req, res, (err: any) => {
  if (err) return res.status(400).json({ success: false, message: err.code === 'LIMIT_FILE_SIZE' ? 'The PDF must be under 30 MB.' : err.message });
  next();
}), async (req: any, res) => {
  try {
    res.json({ success: true, data: await storePdf(String(req.tenantId), req.file) });
  } catch (e: any) {
    res.status(e instanceof WaFileError ? e.status : 500).json({ success: false, message: e.message || 'Upload failed' });
  }
});

router.get('/', ctrl.list);
router.post('/', ctrl.create);
router.post('/sync', ctrl.sync);
router.post('/validate', ctrl.validate);
router.put('/:id', ctrl.update);
router.delete('/:id', ctrl.remove);
router.post('/:id/test', ctrl.sendTest);
router.post('/:id/broadcast', ctrl.broadcast);
router.post('/:id/lead-audience', ctrl.leadAudience);
router.post('/:id/audience-preview', ctrl.sourceAudiencePreview);

export default router;
