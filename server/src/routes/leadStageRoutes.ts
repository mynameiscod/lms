import express from 'express';
import {
  getLeadStages,
  createLeadStage,
  updateLeadStage,
  deleteLeadStage,
  reorderLeadStages,
  initializeDefaultStages
} from '../controllers/leadStageController';
import { authMiddleware } from '../middleware/auth';
import { tenantResolver } from '../middleware/tenantResolver';
import { roleGuard } from '../middleware/roleGuard';

const router = express.Router();

// Get all stages
router.get('/', authMiddleware, tenantResolver, roleGuard(['manage_leads']), getLeadStages);

// Initialize default stages
router.post('/initialize', authMiddleware, tenantResolver, roleGuard(['manage_leads']), initializeDefaultStages);

// Create stage
router.post('/', authMiddleware, tenantResolver, roleGuard(['manage_leads']), createLeadStage);

// Update stage
router.put('/:stageId', authMiddleware, tenantResolver, roleGuard(['manage_leads']), updateLeadStage);

// Reorder stages
router.put('/reorder/all', authMiddleware, tenantResolver, roleGuard(['manage_leads']), reorderLeadStages);

// Delete stage
router.delete('/:stageId', authMiddleware, tenantResolver, roleGuard(['manage_leads']), deleteLeadStage);

export default router;
