import express from 'express';
import { authMiddleware } from '../middleware/auth';
import { tenantResolver } from '../middleware/tenantResolver';
import {
  getMyProfile,
  updateMyProfile,
  runReview,
  listProfiles,
  getProfileById,
  updatePillar,
  regeneratePillar,
  updateReview,
} from '../controllers/careerProfileController';

const router = express.Router();

router.use(tenantResolver);
router.use(authMiddleware);

// Student
router.get('/my', getMyProfile);
router.put('/my', updateMyProfile);
router.post('/my/review', runReview);

// Admin / trainer
router.get('/', listProfiles);
router.get('/:id', getProfileById);
router.patch('/:id/review', updateReview);
router.patch('/:id/pillar/:pillar', updatePillar);
router.post('/:id/pillar/:pillar/regenerate', regeneratePillar);

export default router;
