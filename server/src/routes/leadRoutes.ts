import express from 'express';
import {
  getLeads,
  getLeadById,
  createLead,
  updateLead,
  changeLeadStage,
  addLeadActivity,
  deleteLead,
  getLeadAnalytics
} from '../controllers/leadController';
import { authMiddleware } from '../middleware/auth';
import { tenantResolver } from '../middleware/tenantResolver';
import { roleGuard } from '../middleware/roleGuard';

const router = express.Router();

// Analytics
router.get('/analytics', authMiddleware, tenantResolver, roleGuard(['manage_leads']), getLeadAnalytics);

// CRUD
router.get('/', authMiddleware, tenantResolver, roleGuard(['manage_leads']), getLeads);
router.get('/:leadId', authMiddleware, tenantResolver, roleGuard(['manage_leads']), getLeadById);
router.post('/', authMiddleware, tenantResolver, roleGuard(['manage_leads']), createLead);
router.put('/:leadId', authMiddleware, tenantResolver, roleGuard(['manage_leads']), updateLead);
router.delete('/:leadId', authMiddleware, tenantResolver, roleGuard(['manage_leads']), deleteLead);

// Stage change
router.patch('/:leadId/stage', authMiddleware, tenantResolver, roleGuard(['manage_leads']), changeLeadStage);

// Activities
router.post('/:leadId/activities', authMiddleware, tenantResolver, roleGuard(['manage_leads']), addLeadActivity);

export default router;
