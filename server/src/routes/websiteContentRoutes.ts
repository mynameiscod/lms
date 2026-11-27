import express from 'express';
import multer from 'multer';
import { authMiddleware } from '../middleware/auth';
import { tenantResolver } from '../middleware/tenantResolver';
import { roleGuard } from '../middleware/roleGuard';
import { MAX_IMAGE_BYTES } from '../services/websiteMediaService';
import * as ctrl from '../controllers/websiteContentController';

/** Website Content screen: placements, Tech Battle, events, courses, testimonials, trainers and site settings for the public website. */
const router = express.Router();
router.use(authMiddleware);
router.use(tenantResolver);

const canManage = roleGuard(['manage_website_content', 'manage_tenant']);
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: MAX_IMAGE_BYTES, files: 1 } });
const oneImage: express.RequestHandler = (req, res, next) => upload.single('file')(req, res, (err: any) => {
  if (!err) return next();
  const message = err?.code === 'LIMIT_FILE_SIZE' ? 'The image is larger than 8 MB.' : 'Could not read the upload.';
  res.status(400).json({ success: false, message });
});

router.get('/placements', canManage, ctrl.getPlacements);
router.get('/sections', canManage, ctrl.getSections);
router.put('/tech-battle/settings', canManage, ctrl.putBattleSettings);
router.get('/tech-battle/battles/:battleId/leaderboard', canManage, ctrl.getBattleTop);
router.put('/tech-battle/battles/:battleId', canManage, ctrl.putBattleNote);
router.post('/courses', canManage, ctrl.postCourse);
router.put('/courses/:key', canManage, ctrl.putCourse);
router.put('/settings', canManage, ctrl.putSettings);
router.post('/x/:list/reorder', canManage, ctrl.reorderSection);
router.post('/x/:list', canManage, ctrl.createSection);
router.put('/x/:list/:id', canManage, ctrl.updateSection);
router.delete('/x/:list/:id', canManage, ctrl.removeSection);
router.get('/lms-offers', canManage, ctrl.getLmsOffers);
router.post('/media', canManage, oneImage, ctrl.uploadMedia);
router.post('/companies/by-name', canManage, ctrl.companyByName);
router.post('/:list/reorder', canManage, ctrl.reorderList);
router.post('/:list', canManage, ctrl.createItem);
router.put('/:list/:id', canManage, ctrl.updateItem);
router.delete('/:list/:id', canManage, ctrl.removeItem);

export default router;
