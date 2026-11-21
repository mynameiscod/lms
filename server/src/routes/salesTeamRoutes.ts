import express from 'express';
import { authMiddleware } from '../middleware/auth';
import { tenantResolver } from '../middleware/tenantResolver';
import * as ctrl from '../controllers/salesTeamController';

/**
 * /sales-teams — Sales Teams add-on for Leads.
 * Access is decided in the service: admin (super admin or manage_sales_teams), the team's manager,
 * or the member themselves. No route here changes how leads are assigned.
 */
const router = express.Router();
router.use(authMiddleware, tenantResolver);

router.get('/me', ctrl.me);

// Super admin (or a role given manage_sales_teams)
router.get('/admin/teams', ctrl.adminTeams);
router.get('/admin/staff', ctrl.adminStaff);
router.post('/admin/teams', ctrl.adminCreate);
router.put('/admin/teams/:id', ctrl.adminUpdate);
router.delete('/admin/teams/:id', ctrl.adminRemove);
router.get('/admin/overview', ctrl.adminOverview);

// A team's manager (or an admin)
router.get('/teams/:id/day', ctrl.teamDay);
router.put('/teams/:id/targets', ctrl.saveTargets);
router.get('/members/:userId/day', ctrl.memberDay);
router.post('/members/:userId/review', ctrl.review);

// The member
router.get('/my/day', ctrl.myDay);
router.put('/my/note', ctrl.myNote);
router.get('/my/history', ctrl.myHistory);

export default router;
