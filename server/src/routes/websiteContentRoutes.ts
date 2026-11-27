import express from 'express';
import multer from 'multer';
import { authMiddleware } from '../middleware/auth';
import { tenantResolver } from '../middleware/tenantResolver';
import { roleGuard } from '../middleware/roleGuard';
import { MAX_IMAGE_BYTES } from '../services/websiteMediaService';
import * as ctrl from '../controllers/websiteContentController';

/** Website Content screen: placement numbers, companies and placed students shown on the public website. */
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
router.get('/lms-offers', canManage, ctrl.getLmsOffers);
router.post('/media', canManage, oneImage, ctrl.uploadMedia);
router.post('/companies/by-name', canManage, ctrl.companyByName);
router.post('/:list/reorder', canManage, ctrl.reorderList);
router.post('/:list', canManage, ctrl.createItem);
router.put('/:list/:id', canManage, ctrl.updateItem);
router.delete('/:list/:id', canManage, ctrl.removeItem);

export default router;
