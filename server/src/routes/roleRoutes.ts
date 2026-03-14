import express from 'express';
import {
  createRole,
  getRolesByTenant,
  getRoleById,
  updateRole,
  deleteRole,
  addPermissions,
  removePermissions,
  getAvailablePermissions
} from '../controllers/roleController';
import { authMiddleware } from '../middleware/auth';
import { tenantResolver } from '../middleware/tenantResolver';
import { roleGuard } from '../middleware/roleGuard';

const router = express.Router();

// Get available permissions list (must be before /:roleId)
router.get('/permissions/available', authMiddleware, tenantResolver, getAvailablePermissions);

// Create a new role (requires manage_roles permission)
router.post('/', authMiddleware, tenantResolver, roleGuard(['manage_roles']), createRole);

// Get all roles for the tenant
router.get('/', authMiddleware, tenantResolver, getRolesByTenant);

// Get a specific role by ID
router.get('/:roleId', authMiddleware, tenantResolver, getRoleById);

// Update a role (requires manage_roles permission)
router.put('/:roleId', authMiddleware, tenantResolver, roleGuard(['manage_roles']), updateRole);

// Delete a role (requires manage_roles permission)
router.delete('/:roleId', authMiddleware, tenantResolver, roleGuard(['manage_roles']), deleteRole);

// Add permissions to a role (requires manage_roles permission)
router.post('/:roleId/permissions', authMiddleware, tenantResolver, roleGuard(['manage_roles']), addPermissions);

// Remove permissions from a role (requires manage_roles permission)
router.delete('/:roleId/permissions', authMiddleware, tenantResolver, roleGuard(['manage_roles']), removePermissions);

export default router;
