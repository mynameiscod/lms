import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import {
  createContent,
  getAllContent,
  getStudentContent,
  getContentById,
  updateContent,
  deleteContent,
  getContentByType,
  getContentByChapter,
} from '../controllers/contentController';
import { authMiddleware } from '../middleware/auth';
import { roleGuard } from '../middleware/roleGuard';
import { tenantResolver } from '../middleware/tenantResolver';

const router = express.Router();

// Ensure uploads/content directory exists
const uploadsDir = 'uploads/content';
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/content');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  },
});

const fileFilter = (req: any, file: any, cb: multer.FileFilterCallback) => {
  // Allow common file types
  const allowedMimes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'image/jpeg',
    'image/png',
    'image/gif',
    'text/plain',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ];

  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`Invalid file type: ${file.mimetype}`));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB max
  },
});

// ====== ADMIN ROUTES ======

// Create content (admin only)
router.post(
  '/admin',
  authMiddleware,
  tenantResolver,
  upload.array('attachments', 5),
  createContent
);

// Get all content (admin only)
router.get(
  '/admin',
  authMiddleware,
  tenantResolver,
  getAllContent
);

// Update content (admin only)
router.put(
  '/admin/:id',
  authMiddleware,
  tenantResolver,
  upload.array('attachments', 5),
  updateContent
);

// Delete content (admin only)
router.delete(
  '/admin/:id',
  authMiddleware,
  tenantResolver,
  deleteContent
);

// ====== STUDENT ROUTES ======

// Get all content for student (published only)
router.get(
  '/student',
  authMiddleware,
  tenantResolver,
  getStudentContent
);

// Get content by type (student)
router.get(
  '/student/type/:type',
  authMiddleware,
  tenantResolver,
  getContentByType
);

// Get content (notes/cheatsheets) by chapter
router.get(
  '/chapter/:chapterId',
  authMiddleware,
  tenantResolver,
  getContentByChapter
);

// Get single content by ID
router.get(
  '/:id',
  authMiddleware,
  getContentById
);

export default router;
