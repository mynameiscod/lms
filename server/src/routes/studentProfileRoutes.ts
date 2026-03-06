import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import {
  getMyProfile,
  saveProfile,
  getProfileByUserId,
  getAllProfiles,
  deleteProfile,
  getProfileStats,
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
    fileSize: 10 * 1024 * 1024, // 10MB max
  },
});

// ====== STUDENT ROUTES ======

// Get my profile
router.get(
  '/me',
  authMiddleware,
  tenantResolver,
  getMyProfile
);

// Save/Update my profile
router.post(
  '/me',
  authMiddleware,
  tenantResolver,
  upload.fields([
    { name: 'profilePhoto', maxCount: 1 },
    { name: 'resume', maxCount: 1 },
  ]),
  saveProfile
);

router.put(
  '/me',
  authMiddleware,
  tenantResolver,
  upload.fields([
    { name: 'profilePhoto', maxCount: 1 },
    { name: 'resume', maxCount: 1 },
  ]),
  saveProfile
);

// ====== ADMIN ROUTES ======

// Get all profiles (admin)
router.get(
  '/admin/all',
  authMiddleware,
  tenantResolver,
  roleGuard(['admin', 'instructor']),
  getAllProfiles
);

// Get profile statistics (admin)
router.get(
  '/admin/stats',
  authMiddleware,
  tenantResolver,
  roleGuard(['admin']),
  getProfileStats
);

// Get profile by user ID (admin)
router.get(
  '/admin/:userId',
  authMiddleware,
  tenantResolver,
  roleGuard(['admin', 'instructor']),
  getProfileByUserId
);

// Delete profile (admin)
router.delete(
  '/admin/:profileId',
  authMiddleware,
  tenantResolver,
  roleGuard(['admin']),
  deleteProfile
);

export default router;
