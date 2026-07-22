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
  getMyBatchModules
} from '../controllers/batchController';
import { authMiddleware } from '../middleware/auth';
import { tenantResolver } from '../middleware/tenantResolver';
import { roleGuard } from '../middleware/roleGuard';

const router = express.Router();

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
