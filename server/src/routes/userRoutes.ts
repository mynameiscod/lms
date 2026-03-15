import { Router } from 'express';
import { 
  createUser,
  getUsers, 
  getUserById, 
  updateUserRole,
  deleteUser,
  deactivateUser,
  activateUser,
  inviteStudent,
  setupPassword,
  updateProfile,
  bulkUploadStudents,
  downloadBulkTemplate,
  getMyPermissions
} from '../controllers/userController';
import { tenantMiddleware } from '../middleware/tenantMiddleware';
import { authMiddleware } from '../middleware/auth';
import { roleGuard } from '../middleware/roleGuard';

const router = Router();

// PUBLIC ROUTES (no auth required)
// Setup password from email link (public route - no auth required for new students)
router.post('/setup-password', setupPassword);

// Apply auth and tenant middleware to all other routes
router.use(authMiddleware);
router.use(tenantMiddleware);

// Get current user's effective permissions
router.get('/me/permissions', getMyPermissions);

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

// Onboarding Routes
// Invite a student (requires manage_tenant_users permission)
router.post('/invite/student', roleGuard(['manage_tenant_users']), inviteStudent);

// Bulk upload students (requires manage_tenant_users permission)
router.post('/bulk-upload', roleGuard(['manage_tenant_users']), bulkUploadStudents);

// Download CSV template for bulk upload
router.get('/bulk-upload/template', roleGuard(['manage_tenant_users']), downloadBulkTemplate);

// Update user profile
router.patch('/:userId/profile', updateProfile);

export default router;