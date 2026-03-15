import express from 'express';
import {
  getLeads,
  getLeadById,
  createLead,
  updateLead,
  changeLeadStage,
  addLeadActivity,
  deleteLead,
  getLeadAnalytics,
  convertToStudent,
  exportLeads,
  importLeads,
  getManagerBoard
} from '../controllers/leadController';
import { authMiddleware } from '../middleware/auth';
import { tenantResolver } from '../middleware/tenantResolver';
import { roleGuard } from '../middleware/roleGuard';

const router = express.Router();

// Analytics
router.get('/analytics', authMiddleware, tenantResolver, roleGuard(['manage_leads']), getLeadAnalytics);
router.get('/manager-board', authMiddleware, tenantResolver, roleGuard(['manage_leads']), getManagerBoard);

// Export / Import
router.get('/export', authMiddleware, tenantResolver, roleGuard(['manage_leads']), exportLeads);
router.post('/import', authMiddleware, tenantResolver, roleGuard(['manage_leads']), importLeads);

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

// Convert to student
router.post('/:leadId/convert', authMiddleware, tenantResolver, roleGuard(['manage_leads']), convertToStudent);

export default router;
