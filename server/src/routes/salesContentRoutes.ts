import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import {
  getAllContent,
  getContentById,
  createContent,
  updateContent,
  deleteContent,
  shareWithLead,
  trackView,
  trackDownload,
  reorderContent,
  getCategories,
  getContentByCategory,
  getFeaturedContent,
  getContentAnalytics
} from '../controllers/salesContentController';
import { authMiddleware } from '../middleware/auth';
import { tenantResolver } from '../middleware/tenantResolver';
import { roleGuard } from '../middleware/roleGuard';

// Ensure sales content directory exists
const salesContentDir = 'uploads/sales-content';
if (!fs.existsSync(salesContentDir)) {
  fs.mkdirSync(salesContentDir, { recursive: true });
}

// Multer config for file uploads
const contentStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, salesContentDir),
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname);
    cb(null, `content-${unique}${ext}`);
  }
});

const uploadContent = multer({
  storage: contentStorage,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100 MB max
  fileFilter: (_req, file, cb) => {
    // Allow common file types
    const allowedMimes = [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'video/mp4',
      'video/webm',
      'audio/mpeg',
      'audio/wav',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];
    
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type'));
    }
  }
});

const router = express.Router();

// Get content categories (available to all authenticated users)
router.get(
  '/categories',
  authMiddleware,
  tenantResolver,
  getCategories
);

// Get featured content
router.get(
  '/featured',
  authMiddleware,
  tenantResolver,
  roleGuard(['view_leads', 'manage_leads']),
  getFeaturedContent
);

// Get content by category with counts
router.get(
  '/by-category',
  authMiddleware,
  tenantResolver,
  roleGuard(['view_leads', 'manage_leads']),
  getContentByCategory
);

// Get content analytics (admin only)
router.get(
  '/analytics',
  authMiddleware,
  tenantResolver,
  roleGuard(['manage_leads']),
  getContentAnalytics
);

// Get all content
router.get(
  '/',
  authMiddleware,
  tenantResolver,
  roleGuard(['view_leads', 'manage_leads']),
  getAllContent
);

// Get specific content
router.get(
  '/:id',
  authMiddleware,
  tenantResolver,
  roleGuard(['view_leads', 'manage_leads']),
  getContentById
);

// Create content (admin only)
router.post(
  '/',
  authMiddleware,
  tenantResolver,
  roleGuard(['manage_leads']),
  uploadContent.single('file'),
  createContent
);

// Update content (admin only)
router.put(
  '/:id',
  authMiddleware,
  tenantResolver,
  roleGuard(['manage_leads']),
  updateContent
);

// Delete content (admin only)
router.delete(
  '/:id',
  authMiddleware,
  tenantResolver,
  roleGuard(['manage_leads']),
  deleteContent
);

// Share content with a lead (telecallers can share)
router.post(
  '/:id/share',
  authMiddleware,
  tenantResolver,
  roleGuard(['edit_leads', 'manage_leads', 'create_leads']),
  shareWithLead
);

// Track content view
router.post(
  '/:id/view',
  authMiddleware,
  tenantResolver,
  trackView
);

// Track content download
router.post(
  '/:id/download',
  authMiddleware,
  tenantResolver,
  trackDownload
);

// Reorder content (admin only)
router.put(
  '/reorder',
  authMiddleware,
  tenantResolver,
  roleGuard(['manage_leads']),
  reorderContent
);

export default router;
