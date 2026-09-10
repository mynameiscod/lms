/**
 * Adaptive plan routes.
 *
 * AUTHENTICATED THROUGHOUT. There is no public path here: every response describes a named
 * student's measured weaknesses, and none of it is anonymous data.
 *
 * OWNERSHIP IS CHECKED IN THE CONTROLLER, not by a role guard, because the rule is per-record
 * rather than per-role: a student passes for their own id and fails for anyone else's, and no
 * role list can express that. The one genuinely staff-only route carries its permission check
 * inside the handler for the same reason — it is about the curriculum, not the student.
 */
import express from 'express';
import { authMiddleware } from '../middleware/auth';
import { tenantMiddleware } from '../middleware/tenantMiddleware';
import * as ctrl from '../controllers/adaptiveCurriculumController';

const router = express.Router();

router.use(authMiddleware, tenantMiddleware);

// The direction picker's options.
router.get('/directions', ctrl.listDirections);

// One student's plan. Static segments precede parameterised ones so 'curricula' below can
// never be captured as a studentId.
router.get('/students/:studentId/direction', ctrl.getDirection);
router.get('/students/:studentId/plan/:curriculumId', ctrl.getPlan);
router.get('/students/:studentId/plan/:curriculumId/replan-check', ctrl.checkReplan);
router.get('/students/:studentId/plan/:curriculumId/history', ctrl.getHistory);
router.post('/students/:studentId/plan/:curriculumId/generate', express.json(), ctrl.generatePlan);
router.post('/students/:studentId/plan/:curriculumId/replan', express.json(), ctrl.replanPlan);

// Opening assigned material. Any signed-in member may read published content; the plan is
// what decided they should see it, and the row itself carries nothing student-specific.
// One topic, with the three items chosen for this student. The destination of a mission.
router.get('/students/:studentId/topic/:topicCode', ctrl.getTopic);
router.get('/content/:contentId', ctrl.getAssignedContent);

// Authoring coverage — staff only, enforced in the handler.
router.get('/curricula/:curriculumId/content-gaps', ctrl.getContentGaps);

export default router;
