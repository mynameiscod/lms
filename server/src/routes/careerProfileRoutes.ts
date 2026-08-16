import express from 'express';
import { authMiddleware } from '../middleware/auth';
import { tenantResolver } from '../middleware/tenantResolver';
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
router.get('/', listProfiles);
router.get('/:id', getProfileById);
router.patch('/:id/review', updateReview);
router.patch('/:id/pillar/:pillar', updatePillar);
router.post('/:id/pillar/:pillar/regenerate', regeneratePillar);
router.post('/:id/pillar/:pillar/section/:section/regenerate', regenerateSectionAdmin);

export default router;
