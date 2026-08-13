import express from 'express';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
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
import * as coins from '../controllers/passportCoinController';
import * as news from '../controllers/techNewsController';
import * as cq from '../controllers/companyQuestionController';
import * as mt from '../controllers/mockTestController';

const router = express.Router();

const RESUME_TMP = 'uploads/resumes';
if (!fs.existsSync(RESUME_TMP)) fs.mkdirSync(RESUME_TMP, { recursive: true });
const resumeUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _f, cb) => cb(null, RESUME_TMP),
    filename: (_req, f, cb) => cb(null, `cp-${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(f.originalname)}`),
  }),
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (_req, f, cb) => {
    const ok = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword',
    ];
    cb(null, ok.includes(f.mimetype));
  },
});
router.use(authMiddleware, tenantMiddleware);

/**
 * Permission map (see roleGuard.ts → PERMISSION_GROUPS.careerPassport):
 *   manage_passport            config, pathways, missions, assessment bank
 *   manage_passport_categories scoring categories (weights change every score)
 *   view_passport_members    the members list
 *   convert_passport_member  granting a membership without payment
 *   use_passport             the member-facing surfaces
 *
 * These used to be hardcoded `['SUPER_ADMIN','TENANT_ADMIN','STAFF'].includes(role)`
 * checks inside the controllers, which bypassed custom roles entirely and were
 * invisible to the Roles & Permissions screen.
 */
const MANAGE = roleGuard(['manage_passport']);
const MEMBER = roleGuard(['use_passport']);
// Category edits change how every member's score is computed, so they carry their own
// permission rather than riding on manage_passport.
const MANAGE_CATEGORIES = roleGuard(['manage_passport_categories']);

// Admin config + members
router.get('/config',    MANAGE, ctrl.getConfig);
router.put('/config',    MANAGE, ctrl.updateConfig);
router.get('/students',  roleGuard(['view_passport_members', 'manage_passport']), ctrl.listStudents);
router.get('/students/:studentId/answers', roleGuard(['view_passport_members', 'manage_passport']), ctrl.listStudentAnswers);
router.get('/students/:studentId/interviews', roleGuard(['view_passport_members', 'manage_passport']), ctrl.listStudentInterviews);
router.post('/convert',  roleGuard(['convert_passport_member']), ctrl.convertStudent);

// Member management. Create/edit/deactivate sit with manage_passport; hard delete is
// refused server-side for anyone who has paid or been assessed.
router.post('/members',                MANAGE, ctrl.createMember);
router.put('/members/:userId',         MANAGE, ctrl.updateMember);
router.post('/members/:userId/active', MANAGE, ctrl.setMemberActive);
router.delete('/members/:userId',      MANAGE, ctrl.deleteMember);

// Coins — the member's balance, and the admin's dials. Earning rules are data, so
// switching an event on or changing what it pays needs no deploy.
router.get('/leaderboard',          MEMBER, dashboard.getLeaderboard);

// Daily tech news. The member sees only what an admin has published; the AI writes
// drafts and never publishes on its own.
// Company Questions. Rounds and categories are DATA, so an admin adds "System Design"
// without a deploy. AI-predicted rows stay flagged from generation to render.
router.get('/companies',                     MEMBER, cq.listCompanies);
router.get('/companies/:slug',               MEMBER, cq.companyDetail);
router.post('/companies/:slug/contribute',   MEMBER, cq.contribute);
router.post('/companies/:slug/experience',   MEMBER, cq.submitExperience);

// Company mock test. The paper is assembled per attempt from the bank plus AI top-up,
// so there is no stored paper to leak or to share between students.
router.post('/companies/:slug/mock-test/start',   MEMBER, mt.startMockTest);
router.get('/companies/:slug/mock-test/history',  MEMBER, mt.mockTestHistory);
router.get('/mock-test/:id',                      MEMBER, mt.getMockTest);
router.put('/mock-test/:id/answer',               MEMBER, mt.saveAnswer);
router.post('/mock-test/:id/submit',              MEMBER, mt.submitMockTest);

router.get('/company-admin',                       MANAGE, cq.getAdmin);
router.put('/company-admin/taxonomy',              MANAGE, cq.saveTaxonomy);
router.post('/company-admin/companies',            MANAGE, cq.saveCompany);
router.put('/company-admin/companies/:id',         MANAGE, cq.saveCompany);
router.delete('/company-admin/companies/:id',      MANAGE, cq.deleteCompany);
router.get('/company-admin/:slug/questions',       MANAGE, cq.adminQuestions);
router.post('/company-admin/:slug/questions',      MANAGE, cq.saveQuestions);
router.post('/company-admin/:slug/import',         MANAGE, cq.importQuestions);
router.post('/company-admin/:slug/predict',        MANAGE, cq.predict);
router.post('/company-admin/bulk',                 MANAGE, cq.bulkCreate);
router.get('/company-admin/readiness',             MANAGE, cq.readinessBoard);
router.post('/company-admin/:slug/draft-profile',  MANAGE, cq.draftProfile);
router.put('/company-admin/:slug/verify',          MANAGE, cq.verifyFields);
router.put('/company-admin/:slug/pattern',         MANAGE, cq.savePattern);
router.get('/company-admin/experiences',           MANAGE, cq.listExperiences);
router.put('/company-admin/experiences/:id',       MANAGE, cq.moderateExperience);
router.put('/company-admin/questions/:id',         MANAGE, cq.updateQuestion);
router.delete('/company-admin/questions/:id',      MANAGE, cq.deleteQuestion);

router.get('/news',                  MEMBER, news.feed);
router.get('/news/admin',            MANAGE, news.list);
router.post('/news/admin/draft',     MANAGE, news.draft);
router.post('/news/admin',           MANAGE, news.create);
router.put('/news/admin/:id',        MANAGE, news.update);
router.delete('/news/admin/:id',     MANAGE, news.remove);
router.get('/coins',                MEMBER, coins.myCoins);
router.get('/coins/admin',          MANAGE, coins.getAdmin);
router.put('/coins/admin/config',   MANAGE, coins.saveConfig);
router.put('/coins/admin/rules',    MANAGE, coins.saveRules);
router.get('/coins/admin/ledger',   MANAGE, coins.adminLedger);

// Admin content — Pathways + Mission pools (what the Passport admin screens edit)
router.get('/content',            MANAGE, content.getContent);
router.put('/content',            MANAGE, content.saveContent);
router.post('/content/reset',     MANAGE, content.resetContent);
router.post('/content/preview',   MANAGE, content.previewContent);

// Student
router.get('/me',        MEMBER, ctrl.getMyStatus);
router.get('/me/profile', MEMBER, ctrl.getMyProfile);
router.put('/me/profile', MEMBER, ctrl.updateMyProfile);
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
router.post('/interview/speak',       MEMBER, interview.speak);
router.post('/interview/:id/finish',  MEMBER, interview.finish);

// Resume Center (resume entitlement)
router.get('/resume',            MEMBER, resume.get);
router.put('/resume',            MEMBER, resume.save);
// Import an existing CV. Stored briefly, parsed, then deleted by the controller — the
// text is the point, the file is not.
router.post('/resume/import',    MEMBER, resumeUpload.single('file'), resume.importResume);
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
router.put('/assessment/categories',   MANAGE_CATEGORIES, assess.saveCategories);
router.get('/assessment/admin',  MANAGE, assess.getAssessmentAdmin);
router.put('/assessment/admin',  MANAGE, assess.saveAssessment);
router.post('/assessment/reset', MANAGE, assess.resetAssessment);

export default router;
