import express from 'express';
import multer from 'multer';
import { authMiddleware } from '../middleware/auth';
import { tenantMiddleware } from '../middleware/tenantMiddleware';
import { roleGuard } from '../middleware/roleGuard';
import * as ctrl from '../controllers/hackathonController';

// Admin hackathon management.
const router = express.Router();
router.use(authMiddleware, tenantMiddleware);
router.use(express.json());

/**
 * Permission map (roleGuard.ts → PERMISSION_GROUPS.hackathons):
 *   manage_hackathons       create / edit / close / delete — and set the fee
 *   view_hackathons         list, detail, registrations
 *   export_hackathon_data   export registrant PII
 *
 * EXPORT IS ITS OWN PERMISSION. The CSV carries the name, mobile and email of every member
 * of every team — people who are not students here and never agreed to anything beyond
 * entering a competition. Whoever may run the event is not automatically whoever may take
 * that list off the platform.
 */
const MANAGE = roleGuard(['manage_hackathons']);
const VIEW   = roleGuard(['view_hackathons', 'manage_hackathons']);
const EXPORT = roleGuard(['export_hackathon_data']);

/*
 * The team sheet is held in MEMORY, never written to disk. It is a list of names, mobiles and
 * emails belonging to people who are not users here; the import reads it once and keeps only
 * what becomes a registration. A temp file would outlive that for no benefit.
 *
 * 5 MB is far above any real team sheet and well below anything that would trouble the process.
 */
const sheetUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
});

router.get('/', VIEW, ctrl.list);
router.post('/', MANAGE, ctrl.create);
// Declared before `/:id` so `registrations.csv` is never read as an id.
// Declared before `/:id` so the template filename is never read as an id.
router.get('/teams-template.xlsx', VIEW, ctrl.teamsImportTemplate);
router.get('/:id/registrations.csv', EXPORT, ctrl.exportRegistrations);
/* MANAGE, not EXPORT: this creates registrations rather than taking data off the platform. */
router.post('/:id/import-teams', MANAGE, sheetUpload.single('file'), ctrl.importTeams);
router.get('/:id/registrations', VIEW, ctrl.listRegistrations);
router.post('/:id/registrations/:regId/refunded', MANAGE, ctrl.markRefunded);
router.post('/:id/registrations/:regId/payment-reminder', MANAGE, ctrl.sendPaymentReminder);
router.get('/:id', VIEW, ctrl.getOne);
router.put('/:id', MANAGE, ctrl.update);
router.delete('/:id', MANAGE, ctrl.remove);

export default router;
