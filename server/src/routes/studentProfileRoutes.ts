import express, { Request, Response, NextFunction } from 'express';
import multer, { MulterError } from 'multer';
import path from 'path';
import fs from 'fs';
import {
  getMyProfile,
  saveProfile,
  getProfileByUserId,
  getAllProfiles,
  deleteProfile,
  getProfileStats,
  getStudentActivity,
  addStudentNote,
  deleteStudentNote,
  sendProfileReminderEmail,
  sendBulkProfileReminders,
} from '../controllers/studentProfileController';
import { authMiddleware } from '../middleware/auth';
import { roleGuard } from '../middleware/roleGuard';
import { tenantResolver } from '../middleware/tenantResolver';

const router = express.Router();

// Ensure uploads/profiles directory exists
const uploadsDir = 'uploads/profiles';
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/profiles');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
  },
});

const fileFilter = (req: any, file: any, cb: multer.FileFilterCallback) => {
  if (file.fieldname === 'profilePhoto') {
    // Allow only images for profile photo
    const allowedMimes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Profile photo must be an image (JPEG, PNG, GIF, or WebP)'));
    }
  } else if (file.fieldname === 'resume') {
    // Allow only PDF for resume
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Resume must be a PDF file'));
    }
  } else {
    cb(null, true);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 20 * 1024 * 1024, // 20MB max
  },
});

const profileUpload = (req: Request, res: Response, next: NextFunction) => {
  upload.fields([
    { name: 'profilePhoto', maxCount: 1 },
    { name: 'resume', maxCount: 1 },
  ])(req, res, (err: any) => {
    if (err instanceof MulterError && err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({
        success: false,
        message: 'File too large. Profile photo must be under 20 MB.',
      });
    }
    if (err) return next(err);
    next();
  });
};

// ====== STUDENT ROUTES ======

// Get my profile
router.get(
  '/me',
  authMiddleware,
  tenantResolver,
  getMyProfile
);

// Save/Update my profile
router.post('/me', authMiddleware, tenantResolver, profileUpload, saveProfile);
router.put('/me', authMiddleware, tenantResolver, profileUpload, saveProfile);

// ====== ADMIN ROUTES ======

// Get all profiles (admin)
router.get(
  '/admin/all',
  authMiddleware,
  tenantResolver,
  roleGuard(['view_reports', 'view_enrolled_students', 'manage_tenant']),
  getAllProfiles
);

// Get profile statistics (admin)
router.get(
  '/admin/stats',
  authMiddleware,
  tenantResolver,
  roleGuard(['view_reports', 'view_analytics', 'manage_tenant']),
  getProfileStats
);

// Get student activity overview for a user (admin)
router.get(
  '/admin/:userId/activity',
  authMiddleware,
  tenantResolver,
  roleGuard(['view_reports', 'view_enrolled_students', 'manage_tenant']),
  getStudentActivity
);

// Get profile by user ID (admin)
router.get(
  '/admin/:userId',
  authMiddleware,
  tenantResolver,
  roleGuard(['view_reports', 'view_enrolled_students', 'manage_tenant']),
  getProfileByUserId
);

// Email the student their missing profile items (admin)
router.post(
  '/admin/:userId/send-reminder',
  authMiddleware,
  tenantResolver,
  roleGuard(['view_reports', 'view_enrolled_students', 'manage_tenant']),
  sendProfileReminderEmail
);

// Bulk: email every student with an incomplete profile (admin)
router.post(
  '/admin/send-bulk-reminders',
  authMiddleware,
  tenantResolver,
  roleGuard(['view_reports', 'view_enrolled_students', 'manage_tenant']),
  sendBulkProfileReminders
);

// Add / delete admin notes on a student (admin)
router.post(
  '/admin/:userId/notes',
  authMiddleware,
  tenantResolver,
  roleGuard(['view_reports', 'view_enrolled_students', 'manage_tenant']),
  addStudentNote
);
router.delete(
  '/admin/:userId/notes/:noteId',
  authMiddleware,
  tenantResolver,
  roleGuard(['view_reports', 'view_enrolled_students', 'manage_tenant']),
  deleteStudentNote
);

// Delete profile (admin)
router.delete(
  '/admin/:profileId',
  authMiddleware,
  tenantResolver,
  roleGuard(['manage_tenant', 'manage_tenant_users']),
  deleteProfile
);

export default router;
