import express from 'express';
import { authMiddleware } from '../middleware/auth';
import * as c from '../controllers/talentPortalController';

/**
 * Talent Portal — /api/v1/talent-portal. Placement office logins only (role PLACEMENT_PARTNER).
 * No tenant header is trusted here: the office's institute comes from its own partner record.
 */
const router = express.Router();
router.use(authMiddleware, c.loadPartner);

router.get('/me', c.me);
router.get('/candidates', c.listCandidates);
router.get('/candidates/:shareId', c.getCandidate);
router.patch('/candidates/:shareId/status', c.setStatus);
router.get('/export', c.exportXlsx);

export default router;
