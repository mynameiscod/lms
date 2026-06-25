import express from 'express';
import { authMiddleware } from '../middleware/auth';
import { tenantMiddleware } from '../middleware/tenantMiddleware';
import * as ctrl from '../controllers/concernController';

// Student raise-a-concern + mentor inbox.
const router = express.Router();
router.use(authMiddleware, tenantMiddleware);

router.post('/', ctrl.createConcern);        // student: raise
router.get('/my', ctrl.getMyConcerns);       // student: my concerns
router.get('/', ctrl.listConcerns);          // mentor/admin: list
router.patch('/:id', ctrl.respondConcern);   // mentor/admin: respond / resolve

export default router;
