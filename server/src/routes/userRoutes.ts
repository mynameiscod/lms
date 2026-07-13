import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
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
  getMyPermissions,
  exportUsers
} from '../controllers/userController';
import { tenantMiddleware } from '../middleware/tenantMiddleware';
import { authMiddleware } from '../middleware/auth';
import { roleGuard } from '../middleware/roleGuard';

const router = Router();

// ── Avatar upload config ────────────────────────────────────────
const avatarStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const dir = path.join(__dirname, '..', '..', 'uploads', 'avatars');
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `avatar-${Date.now()}${ext}`);
  }
});
const avatarUpload = multer({
  storage: avatarStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (_req, file, cb) => {
    if (/^image\/(jpeg|png|gif|webp)$/.test(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Avatar must be JPEG, PNG, GIF or WebP'));
    }
  }
});
// ────────────────────────────────────────────────────────────────

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

// Export users as .xlsx (specific path — must be before /:userId)
router.get('/export', roleGuard(['manage_tenant_users']), exportUsers);

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

// Upload avatar picture
router.post('/:userId/avatar', avatarUpload.single('avatar'), async (req: any, res: any) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }
    const avatarUrl = `/uploads/avatars/${req.file.filename}`;
    const User = require('../models/User').default;
    await User.findByIdAndUpdate(req.params.userId, { avatar: avatarUrl });
    return res.status(200).json({ success: true, data: { avatarUrl } });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

export default router;