import express from 'express';
import * as staging from '../controllers/careerStagingController';
import { authMiddleware } from '../middleware/auth';
import { tenantMiddleware } from '../middleware/tenantMiddleware';
import { roleGuard } from '../middleware/roleGuard';
import * as ctrl from '../controllers/passportController';
import * as assess from '../controllers/passportAssessmentController';
import * as missions from '../controllers/passportMissionController';
import * as roadmap from '../controllers/passportRoadmapController';
import * as practice from '../controllers/passportPracticeController';
import * as interview from '../controllers/passportInterviewController';
import * as resume from '../controllers/passportResumeController';
import * as content from '../controllers/passportContentController';
import * as dashboard from '../controllers/passportDashboardController';

const router = express.Router();
router.use(authMiddleware, tenantMiddleware);

/**
 * Permission map (see roleGuard.ts → PERMISSION_GROUPS.careerPassport):
 *   manage_passport          config, pathways, missions, assessment bank
 *   view_passport_members    the members list
 *   convert_passport_member  granting a ₹499 membership without payment
 *   use_passport             the member-facing surfaces
 *
 * These used to be hardcoded `['SUPER_ADMIN','TENANT_ADMIN','STAFF'].includes(role)`
 * checks inside the controllers, which bypassed custom roles entirely and were
 * invisible to the Roles & Permissions screen.
 */
const MANAGE = roleGuard(['manage_passport']);
const MEMBER = roleGuard(['use_passport']);

// Admin config + members
router.get('/config',    MANAGE, ctrl.getConfig);
router.put('/config',    MANAGE, ctrl.updateConfig);
router.get('/students',  roleGuard(['view_passport_members', 'manage_passport']), ctrl.listStudents);
router.post('/convert',  roleGuard(['convert_passport_member']), ctrl.convertStudent);

// Member management. Create/edit/deactivate sit with manage_passport; hard delete is
// refused server-side for anyone who has paid or been assessed.
router.post('/members',                MANAGE, ctrl.createMember);
router.put('/members/:userId',         MANAGE, ctrl.updateMember);
router.post('/members/:userId/active', MANAGE, ctrl.setMemberActive);
router.delete('/members/:userId',      MANAGE, ctrl.deleteMember);

// Admin content — Pathways + Mission pools (what the Passport admin screens edit)
router.get('/content',            MANAGE, content.getContent);
router.put('/content',            MANAGE, content.saveContent);
router.post('/content/reset',     MANAGE, content.resetContent);
router.post('/content/preview',   MANAGE, content.previewContent);

// Student
router.get('/me',        MEMBER, ctrl.getMyStatus);
router.post('/set-password', MEMBER, ctrl.setPassword);

// Membership activation (₹499, reuses the Razorpay rail)
router.post('/membership/order',  MEMBER, ctrl.createMembershipOrder);
router.post('/membership/verify', MEMBER, ctrl.verifyMembership);

// Gamified member dashboard — one call for the whole home screen
// Backfill for members who joined before staging existed.
router.get('/career-profile', MEMBER, ctrl.getCareerProfileStatus);
router.post('/career-profile', MEMBER, ctrl.setCareerProfile);

router.get('/dashboard', MEMBER, dashboard.getDashboard);

// Daily missions (gated behind the daily_missions entitlement)
router.get('/missions/today',      MEMBER, missions.getToday);
router.post('/missions/complete',  MEMBER, missions.completeMission);

// Full 90-day roadmap (roadmap_full; free users get the 7-day preview)
router.get('/roadmap', MEMBER, roadmap.getRoadmap);

// Practice Lab — coding / SQL / MCQ (practice entitlement)
router.get('/practice',              MEMBER, practice.list);
router.get('/practice/:id',          MEMBER, practice.get);
router.post('/practice/:id/run',     MEMBER, practice.run);
router.post('/practice/:id/submit',  MEMBER, practice.submit);

// AI Mock Interviews (mock_interview entitlement)
router.get('/interview',              MEMBER, interview.list);
router.post('/interview/start',       MEMBER, interview.start);
router.get('/interview/:id',          MEMBER, interview.get);
router.post('/interview/:id/turn',    MEMBER, interview.turn);
router.post('/interview/:id/finish',  MEMBER, interview.finish);

// Resume Center (resume entitlement)
router.get('/resume',            MEMBER, resume.get);
router.put('/resume',            MEMBER, resume.save);
router.post('/resume/score',     MEMBER, resume.score);
router.post('/resume/improve',   MEMBER, resume.improve);

// Assessment — student
router.get('/assessment',        MEMBER, assess.getAssessment);
router.post('/assessment/submit', MEMBER, assess.submitAssessment);
router.get('/assessment/result', MEMBER, assess.getResult);

// Assessment — admin bank management
// Career-stage tagging. Admin-only: it decides which students see which content.
router.get('/staging', MANAGE, staging.getStaging);
router.put('/staging', MANAGE, staging.setStaging);

router.get('/assessment/paper-design', MANAGE, assess.getPaperDesign);
router.get('/assessment/admin',  MANAGE, assess.getAssessmentAdmin);
router.put('/assessment/admin',  MANAGE, assess.saveAssessment);
router.post('/assessment/reset', MANAGE, assess.resetAssessment);

export default router;
