import express from 'express';
import { authMiddleware } from '../middleware/auth';
import { tenantResolver } from '../middleware/tenantResolver';
import { roleGuard } from '../middleware/roleGuard';
import { getOverview, addBatch, editBatch, removeBatch, getCourses, putCourse } from '../controllers/websiteBatchController';

/** Website Batches screen: the next batch date and seats the public website shows. */
const router = express.Router();
router.use(authMiddleware);
router.use(tenantResolver);

const canManage = roleGuard(['manage_website_batches', 'manage_tenant']);

router.get('/', canManage, getOverview);
router.post('/', canManage, addBatch);
router.get('/courses', canManage, getCourses);
router.post('/courses', canManage, putCourse);
router.put('/:id', canManage, editBatch);
router.delete('/:id', canManage, removeBatch);

export default router;
