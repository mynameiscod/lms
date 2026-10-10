import { roleGuard } from '../middleware/roleGuard';
import express from 'express';
import { authMiddleware } from '../middleware/auth';
import { tenantMiddleware } from '../middleware/tenantMiddleware';
import * as ctrl from '../controllers/enrollmentPlanController';
import * as exp from '../controllers/learningExperienceController';


const router = express.Router();

router.use(authMiddleware, tenantMiddleware);

// Student routes
router.get('/my',                                   ctrl.getMyEnrollments);
router.get('/my-tasks',                             ctrl.getMyTasks);
router.get('/:id/journey',                          ctrl.getJourney);
router.get('/:id/day/:day',                         ctrl.getStudentDayPlan);
router.patch('/:id/complete-item',                  ctrl.markContentComplete);

// Learning-experience: gamification, goals, notes, bookmarks, discussion, AI, search
router.get('/:id/summary',                          exp.getSummary);
router.post('/:id/heartbeat',                       exp.heartbeat);
router.put('/:id/goals',                            exp.updateGoals);
router.get('/:id/notes',                            exp.listNotes);
router.post('/:id/notes',                           exp.createNote);
router.delete('/:id/notes/:noteId',                 exp.deleteNote);
router.get('/:id/bookmarks',                        exp.listBookmarks);
router.post('/:id/bookmarks',                       exp.toggleBookmark);
router.get('/:id/discussion',                       exp.listDiscussion);
router.post('/:id/discussion',                      exp.postDiscussion);
router.post('/:id/assistant',                       exp.studyAssistant);
router.get('/:id/search',                           exp.searchPlan);

// Admin routes
/** Management only — students reach their own data through the /my routes. Same keys as the menu item. */
const manage = roleGuard(['manage_learning_plans', 'create_courses', 'edit_courses', 'manage_own_courses', 'manage_tenant']);
router.get('/',                                     manage, ctrl.listAllEnrollments);
router.post('/student',                             manage, ctrl.enrollStudent);
router.post('/batch',                               manage, ctrl.enrollBatch);
router.get('/curriculum/:curriculumId',             manage, ctrl.listEnrollmentsByCurriculum);
router.get('/curriculum/:curriculumId/stats',       manage, ctrl.getCurriculumEnrollmentStats);
router.get('/:id',                                  manage, ctrl.getEnrollment);
router.patch('/:id/status',                         manage, ctrl.updateStatus);
router.put('/:id/settings',                         manage, ctrl.updateSettings);

export default router;
