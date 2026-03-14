import express from 'express';
import {
  createTopic,
  getTopicsByChapter,
  getTopicsByTenant,
  getTopicById,
  updateTopic,
  deleteTopic,
  reorderTopics
} from '../controllers/topicController';
import { authMiddleware } from '../middleware/auth';
import { tenantResolver } from '../middleware/tenantResolver';
import { roleGuard } from '../middleware/roleGuard';

const router = express.Router();

// Create topic
router.post('/', authMiddleware, tenantResolver, roleGuard(['create_courses']), createTopic);

// Get all topics for tenant (with optional filters)
router.get('/', authMiddleware, tenantResolver, getTopicsByTenant);

// Get topics by chapter
router.get('/chapter/:chapterId', authMiddleware, tenantResolver, getTopicsByChapter);

// Reorder topics within a chapter
router.put('/chapter/:chapterId/reorder', authMiddleware, tenantResolver, roleGuard(['edit_courses']), reorderTopics);

// Get single topic
router.get('/:topicId', authMiddleware, getTopicById);

// Update topic
router.put('/:topicId', authMiddleware, tenantResolver, roleGuard(['edit_courses']), updateTopic);

// Delete topic
router.delete('/:topicId', authMiddleware, tenantResolver, roleGuard(['delete_courses']), deleteTopic);

export default router;
