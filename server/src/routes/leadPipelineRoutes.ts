import express from 'express';
import { authMiddleware } from '../middleware/auth';
import { tenantResolver } from '../middleware/tenantResolver';
import { roleGuard } from '../middleware/roleGuard';
import {
  getPipeline,
  createStage, updateStage, deleteStage, reorderStages, setLandingStage,
  createSubStage, updateSubStage, deleteSubStage, reorderSubStages,
  createReason, updateReason, deleteReason, reorderReasons,
  addStarterPipeline,
  getPicklist, createPicklistItem, updatePicklistItem, deletePicklistItem, reorderPicklist,
} from '../controllers/leadPipelineController';

/** Pipeline settings: stages → sub-stages → reasons. Mounted at /lead-pipeline. */
const router = express.Router();

const read = [authMiddleware, tenantResolver, roleGuard(['manage_leads', 'manage_lead_stages', 'view_leads', 'create_leads', 'edit_leads'])];
const manage = [authMiddleware, tenantResolver, roleGuard(['manage_leads', 'manage_lead_stages'])];

router.get('/', ...read, getPipeline);

// Literal paths before /:id.
router.put('/stages/reorder', ...manage, reorderStages);
router.post('/stages', ...manage, createStage);
router.put('/stages/:id', ...manage, updateStage);
router.put('/stages/:id/landing', ...manage, setLandingStage);
router.put('/stages/:id/sub-stages/reorder', ...manage, reorderSubStages);
router.delete('/stages/:id', ...manage, deleteStage);

router.post('/sub-stages', ...manage, createSubStage);
router.put('/sub-stages/:id', ...manage, updateSubStage);
router.put('/sub-stages/:id/reasons/reorder', ...manage, reorderReasons);
router.delete('/sub-stages/:id', ...manage, deleteSubStage);

router.post('/reasons', ...manage, createReason);
router.put('/reasons/:id', ...manage, updateReason);
router.delete('/reasons/:id', ...manage, deleteReason);

router.post('/starter', ...manage, addStarterPipeline);

// Option lists: call outcomes, follow-up reasons
router.put('/picklists/items/:id', ...manage, updatePicklistItem);
router.delete('/picklists/items/:id', ...manage, deletePicklistItem);
router.get('/picklists/:list', ...read, getPicklist);
router.post('/picklists/:list', ...manage, createPicklistItem);
router.put('/picklists/:list/reorder', ...manage, reorderPicklist);

export default router;
