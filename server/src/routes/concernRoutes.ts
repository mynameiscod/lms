import express from 'express';
import { authMiddleware } from '../middleware/auth';
import { tenantMiddleware } from '../middleware/tenantMiddleware';
import * as ctrl from '../controllers/concernController';
import { roleGuard } from '../middleware/roleGuard';

// Student raise-a-concern + mentor inbox.
const router = express.Router();
router.use(authMiddleware, tenantMiddleware);

router.post('/', ctrl.createConcern);        // student: raise
router.get('/my', ctrl.getMyConcerns);       // student: my concerns
const respond = roleGuard(['manage_concerns', 'view_reports', 'manage_leads']);
router.get('/', respond, ctrl.listConcerns);          // mentor/admin: list
router.patch('/:id', respond, ctrl.respondConcern);   // mentor/admin: respond / resolve

export default router;
