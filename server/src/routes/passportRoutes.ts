import express from 'express';
import { authMiddleware } from '../middleware/auth';
import { tenantMiddleware } from '../middleware/tenantMiddleware';
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

// Admin config + students
router.get('/config',    ctrl.getConfig);
router.put('/config',    ctrl.updateConfig);
router.get('/students',  ctrl.listStudents);
router.post('/convert',  ctrl.convertStudent);

// Admin content — Pathways + Mission pools (what the Passport admin screens edit)
router.get('/content',            content.getContent);
router.put('/content',            content.saveContent);
router.post('/content/reset',     content.resetContent);
router.post('/content/preview',   content.previewContent);

// Student
router.get('/me',        ctrl.getMyStatus);
router.post('/set-password', ctrl.setPassword);

// Membership activation (₹499, reuses the Razorpay rail)
router.post('/membership/order',  ctrl.createMembershipOrder);
router.post('/membership/verify', ctrl.verifyMembership);

// Gamified member dashboard — one call for the whole home screen
router.get('/dashboard', dashboard.getDashboard);

// Daily missions (gated behind the daily_missions entitlement)
router.get('/missions/today',      missions.getToday);
router.post('/missions/complete',  missions.completeMission);

// Full 90-day roadmap (roadmap_full; free users get the 7-day preview)
router.get('/roadmap', roadmap.getRoadmap);

// Practice Lab — coding / SQL / MCQ (practice entitlement)
router.get('/practice',              practice.list);
router.get('/practice/:id',          practice.get);
router.post('/practice/:id/run',     practice.run);
router.post('/practice/:id/submit',  practice.submit);

// AI Mock Interviews (mock_interview entitlement)
router.get('/interview',              interview.list);
router.post('/interview/start',       interview.start);
router.get('/interview/:id',          interview.get);
router.post('/interview/:id/turn',    interview.turn);
router.post('/interview/:id/finish',  interview.finish);

// Resume Center (resume entitlement)
router.get('/resume',            resume.get);
router.put('/resume',            resume.save);
router.post('/resume/score',     resume.score);
router.post('/resume/improve',   resume.improve);

// Assessment — student
router.get('/assessment',        assess.getAssessment);
router.post('/assessment/submit', assess.submitAssessment);
router.get('/assessment/result', assess.getResult);

// Assessment — admin bank management
router.get('/assessment/admin',  assess.getAssessmentAdmin);
router.put('/assessment/admin',  assess.saveAssessment);
router.post('/assessment/reset', assess.resetAssessment);

export default router;
