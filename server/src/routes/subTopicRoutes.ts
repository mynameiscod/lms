import express from 'express';
import {
  createSubTopic,
  getSubTopicsByTopic,
  getSubTopicsByChapter,
  getSubTopicsByTenant,
  getSubTopicById,
  updateSubTopic,
  deleteSubTopic,
  reorderSubTopics
} from '../controllers/subTopicController';
import { authMiddleware } from '../middleware/auth';
import { tenantResolver } from '../middleware/tenantResolver';
import { roleGuard } from '../middleware/roleGuard';

const router = express.Router();

// Create sub-topic
router.post('/', authMiddleware, tenantResolver, roleGuard(['create_courses']), createSubTopic);

// Get all sub-topics for tenant (with optional filters)
router.get('/', authMiddleware, tenantResolver, getSubTopicsByTenant);

// Get sub-topics by topic
router.get('/topic/:topicId', authMiddleware, tenantResolver, getSubTopicsByTopic);

// Get sub-topics by chapter
router.get('/chapter/:chapterId', authMiddleware, tenantResolver, getSubTopicsByChapter);

// Reorder sub-topics within a topic
router.put('/topic/:topicId/reorder', authMiddleware, tenantResolver, roleGuard(['edit_courses']), reorderSubTopics);

// Get single sub-topic
router.get('/:subTopicId', authMiddleware, getSubTopicById);

// Update sub-topic
router.put('/:subTopicId', authMiddleware, tenantResolver, roleGuard(['edit_courses']), updateSubTopic);

// Delete sub-topic
router.delete('/:subTopicId', authMiddleware, tenantResolver, roleGuard(['delete_courses']), deleteSubTopic);

export default router;
