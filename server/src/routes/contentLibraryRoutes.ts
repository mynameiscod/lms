import express from 'express';
import { authMiddleware } from '../middleware/auth';
import { tenantResolver } from '../middleware/tenantResolver';
import { roleGuard } from '../middleware/roleGuard';
import * as ctrl from '../controllers/contentLibraryController';

/** Problem Bundles — one library of every assessable item, plus bundles of them. */
const router = express.Router();
router.use(authMiddleware, tenantResolver, roleGuard(['manage_problem_bank', 'create_courses', 'edit_courses', 'manage_own_courses', 'manage_tenant']));

router.get('/meta', ctrl.meta);
router.get('/items', ctrl.search);
router.post('/items', ctrl.create);
router.post('/items/clone', ctrl.clone);
router.post('/items/import', express.json({ limit: '25mb' }), ctrl.importItems);
router.post('/sync', ctrl.syncFromOldStores);
router.get('/items/:id', ctrl.getOne);
router.put('/items/:id', ctrl.update);
router.delete('/items/:id', ctrl.archive);

router.get('/bundles', ctrl.listBundles);
router.post('/bundles', ctrl.createBundle);
router.get('/bundles/:id', ctrl.getBundle);
router.put('/bundles/:id', ctrl.updateBundle);
router.delete('/bundles/:id', ctrl.deleteBundle);
router.post('/bundles/:id/clone', ctrl.cloneBundle);

export default router;
