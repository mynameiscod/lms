import express from 'express';
import {
  createBatch,
  getBatchesByTenant,
  getBatchById,
  updateBatch,
  deleteBatch,
  deactivateBatch,
  activateBatch,
  addInstructor,
  removeInstructor,
  updateBatchModules,
  getMyBatchModules,
  getPlacement,
  updatePlacement,
  addPlacementMembers,
  removePlacementMembers
} from '../controllers/batchController';
import { authMiddleware } from '../middleware/auth';
import { tenantResolver } from '../middleware/tenantResolver';
import { roleGuard } from '../middleware/roleGuard';
import * as lifecycle from '../services/studentLifecycleService';

const router = express.Router();

/* ── Closing a batch (services/studentLifecycleService.ts) ── */
const MANAGE = ['manage_tenant_courses'];
const uid = (req: any) => String(req.user?.id || req.userId || '');
const lfail = (res: express.Response, e: any) =>
  res.status(e instanceof lifecycle.LifecycleError ? e.status : 500).json({ success: false, message: e?.message || 'Something went wrong' });
// Closed batches with their reports (registered before /:batchId).
router.get('/closed/list', authMiddleware, tenantResolver, roleGuard(MANAGE), async (req: any, res) => {
  try { res.json({ success: true, data: await lifecycle.closedBatches(req.tenantId) }); } catch (e) { lfail(res, e); }
});
router.get('/:batchId/close-preview', authMiddleware, tenantResolver, roleGuard(MANAGE), async (req: any, res) => {
  try { res.json({ success: true, data: await lifecycle.closePreview(req.tenantId, req.params.batchId) }); } catch (e) { lfail(res, e); }
});
router.post('/:batchId/close', authMiddleware, tenantResolver, roleGuard(MANAGE), async (req: any, res) => {
  try { res.json({ success: true, data: await lifecycle.closeBatch(req.tenantId, req.params.batchId, req.body || {}, uid(req)) }); } catch (e) { lfail(res, e); }
});
router.post('/:batchId/reopen', authMiddleware, tenantResolver, roleGuard(MANAGE), async (req: any, res) => {
  try { res.json({ success: true, data: await lifecycle.reopenBatch(req.tenantId, req.params.batchId) }); } catch (e) { lfail(res, e); }
});

// Create batch (requires manage_tenant_courses permission)
router.post('/', authMiddleware, tenantResolver, roleGuard(['manage_tenant_courses']), createBatch);

// Get all batches for tenant
router.get('/', authMiddleware, tenantResolver, getBatchesByTenant);

// Per-batch module control for the requesting student's OWN batch (any authed user).
// Declared before '/:batchId' so the two-segment path matches this handler.
router.get('/my/modules', authMiddleware, tenantResolver, getMyBatchModules);

// Get a specific batch by ID
router.get('/:batchId', authMiddleware, tenantResolver, getBatchById);

// Update which student-features a batch turns off (requires manage_tenant_courses)
router.patch('/:batchId/modules', authMiddleware, tenantResolver, roleGuard(['manage_tenant_courses']), updateBatchModules);

// Placement batch: settings + members drawn from other batches (home batch unchanged)
router.get('/:batchId/placement', authMiddleware, tenantResolver, roleGuard(['manage_tenant_courses']), getPlacement);
router.patch('/:batchId/placement', authMiddleware, tenantResolver, roleGuard(['manage_tenant_courses']), updatePlacement);
router.post('/:batchId/members', authMiddleware, tenantResolver, roleGuard(['manage_tenant_courses']), addPlacementMembers);
router.delete('/:batchId/members', authMiddleware, tenantResolver, roleGuard(['manage_tenant_courses']), removePlacementMembers);

// Update batch (requires manage_tenant_courses permission)
router.put('/:batchId', authMiddleware, tenantResolver, roleGuard(['manage_tenant_courses']), updateBatch);

// Delete batch (requires manage_tenant_courses permission)
router.delete('/:batchId', authMiddleware, tenantResolver, roleGuard(['manage_tenant_courses']), deleteBatch);

// Deactivate batch (requires manage_tenant_courses permission)
router.patch('/:batchId/deactivate', authMiddleware, tenantResolver, roleGuard(['manage_tenant_courses']), deactivateBatch);

// Activate batch (requires manage_tenant_courses permission)
router.patch('/:batchId/activate', authMiddleware, tenantResolver, roleGuard(['manage_tenant_courses']), activateBatch);

// Add instructor to batch (requires manage_tenant_courses permission)
router.post('/:batchId/instructors', authMiddleware, tenantResolver, roleGuard(['manage_tenant_courses']), addInstructor);

// Remove instructor from batch (requires manage_tenant_courses permission)
router.delete('/:batchId/instructors', authMiddleware, tenantResolver, roleGuard(['manage_tenant_courses']), removeInstructor);

export default router;
