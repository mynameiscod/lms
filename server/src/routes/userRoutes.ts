import { Router } from 'express';
import { 
  createUser,
  getUsers, 
  getUserById, 
  updateUserRole,
  deleteUser,
  deactivateUser,
  activateUser
} from '../controllers/userController';
import { tenantMiddleware } from '../middleware/tenantMiddleware';
import { authMiddleware } from '../middleware/auth';
import { roleGuard } from '../middleware/roleGuard';

const router = Router();

// Apply auth and tenant middleware to all routes
router.use(authMiddleware);
router.use(tenantMiddleware);

// Create a new user (requires manage_tenant_users permission)
router.post('/', roleGuard(['manage_tenant_users']), createUser);

// Get all users in tenant
router.get('/', getUsers);

// Get user by ID
router.get('/:userId', getUserById);

// Update user role
router.patch('/:userId/role', roleGuard(['manage_tenant_users']), updateUserRole);

// Deactivate user
router.patch('/:userId/deactivate', roleGuard(['manage_tenant_users']), deactivateUser);

// Activate user
router.patch('/:userId/activate', roleGuard(['manage_tenant_users']), activateUser);

// Delete user
router.delete('/:userId', roleGuard(['manage_tenant_users']), deleteUser);

export default router;