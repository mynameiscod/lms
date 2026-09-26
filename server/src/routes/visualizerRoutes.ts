import express from 'express';
import { authMiddleware } from '../middleware/auth';
import { tenantMiddleware } from '../middleware/tenantMiddleware';
import { roleGuard } from '../middleware/roleGuard';
import * as ctrl from '../controllers/visualizerController';

/**
 * Code Visualizer. Student routes check the per-user grant inside the controller (staff pass
 * automatically); admin routes are declared before any `:param` route so they never shadow.
 */
const router = express.Router();
router.use(authMiddleware, tenantMiddleware);

const adminGuard = roleGuard(['create_courses', 'edit_courses', 'manage_own_courses', 'manage_tenant']);

// Admin — content
router.get('/admin/items', adminGuard, ctrl.adminListItems);
router.post('/admin/items', adminGuard, ctrl.adminCreateItem);
router.post('/admin/seed', adminGuard, ctrl.adminSeed);
router.get('/admin/items/:id', adminGuard, ctrl.adminGetItem);
router.put('/admin/items/:id', adminGuard, ctrl.adminUpdateItem);
router.delete('/admin/items/:id', adminGuard, ctrl.adminDeleteItem);

// Admin — who can use it
router.get('/admin/access', adminGuard, ctrl.adminListAccess);
router.post('/admin/access', adminGuard, ctrl.adminGrantAccess);
router.delete('/admin/access/:id', adminGuard, ctrl.adminRevokeAccess);
router.get('/admin/users', adminGuard, ctrl.adminSearchUsers);

// Everyone with access
router.get('/access', ctrl.myAccess);
router.get('/items', ctrl.listItems);
router.post('/run', ctrl.run);
router.get('/items/:slug', ctrl.getItem);

export default router;
