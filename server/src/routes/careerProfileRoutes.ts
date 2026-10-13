import express from 'express';
import { authMiddleware } from '../middleware/auth';
import { tenantResolver } from '../middleware/tenantResolver';
import { roleGuard } from '../middleware/roleGuard';
import {
  getMyProfile,
  updateMyProfile,
  runReview,
  regenerateMySection,
  listProfiles,
  getProfileById,
  updatePillar,
  regeneratePillar,
  regenerateSectionAdmin,
  updateReview,
} from '../controllers/careerProfileController';

const router = express.Router();

// Auth first: tenantResolver takes the tenant from the verified token, so running it
// before authMiddleware would leave it with nothing but the client's own header.
router.use(authMiddleware);
router.use(tenantResolver);

// Student
router.get('/my', getMyProfile);
router.put('/my', updateMyProfile);
router.post('/my/review', runReview);
router.post('/my/pillar/:pillar/section/:section/regenerate', regenerateMySection);

// Admin / trainer
// Everyone's profiles — the same keys as the Career Profiles menu item.
const manage = roleGuard(['manage_career_pilot', 'manage_tenant_users', 'manage_tenant', 'create_courses', 'edit_courses', 'manage_own_courses']);
router.get('/', manage, listProfiles);
router.get('/:id', manage, getProfileById);
router.patch('/:id/review', manage, updateReview);
router.patch('/:id/pillar/:pillar', manage, updatePillar);
router.post('/:id/pillar/:pillar/regenerate', manage, regeneratePillar);
router.post('/:id/pillar/:pillar/section/:section/regenerate', manage, regenerateSectionAdmin);

export default router;
