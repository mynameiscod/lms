import express from 'express';
import { authMiddleware } from '../middleware/auth';
import { tenantResolver } from '../middleware/tenantResolver';
import { roleGuard } from '../middleware/roleGuard';
import {
  getDispositions,
  getAllDispositions,
  createDisposition,
  updateDisposition,
  deleteDisposition
} from '../controllers/leadDispositionController';

const router = express.Router();

router.use(authMiddleware, tenantResolver);

// All staff can read active dispositions
router.get('/', roleGuard(['view_leads', 'manage_leads', 'edit_leads', 'create_leads']), getDispositions);
// Admin sees all (including inactive)
router.get('/all', roleGuard(['manage_leads']), getAllDispositions);
router.post('/', roleGuard(['manage_leads']), createDisposition);
router.put('/:id', roleGuard(['manage_leads']), updateDisposition);
router.delete('/:id', roleGuard(['manage_leads']), deleteDisposition);

export default router;
