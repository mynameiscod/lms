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
import * as funnel from '../controllers/passportFunnelController';
import * as curriculum from '../controllers/pathwayCurriculumController';
import * as pathwayRules from '../controllers/pathwayRulesController';
import * as careerContext from '../controllers/careerContextController';
import * as careerRoles from '../controllers/careerRoleController';
import * as careerSkills from '../controllers/careerSkillController';
import * as roleBlueprints from '../controllers/roleSkillBlueprintController';
import * as skillEvidence from '../controllers/skillEvidenceController';
import * as personalized from '../controllers/personalizedAssessmentController';
import * as skillDna from '../controllers/skillDnaController';
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
 *   view_passport_funnel     the drop-off funnel + bulk contact export
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
const FUNNEL = roleGuard(['view_passport_funnel']);
const REROUTE = roleGuard(['reroute_passport_members']);

/**
 * Writes to a GLOBAL, cross-tenant resource.
 *
 * The skill catalogue is deliberately not tenant-scoped, so one admin's edit is every
 * tenant's edit. A permission alone would not express that: manage_passport is held by
 * tenant admins whose authority stops at their own tenant. Same rule the platform already
 * applies to system settings.
 */
const SUPER_ADMIN = (req: any, res: any, next: any) => {
  if (req.user?.role !== 'SUPER_ADMIN') {
    return res.status(403).json({ message: 'The skill graph is shared across every tenant — super admin access is required to change it.' });
  }
  next();
};

// ── Drop-off funnel — who stopped where, and who to contact about it ──


// Admin config + members
router.get('/config',    MANAGE, ctrl.getConfig);
router.put('/config',    MANAGE, ctrl.updateConfig);
// ── Day-by-day curriculum per pathway. Authored days override the generator. ──
router.get('/curriculum',                     MANAGE, curriculum.listPathwayCurricula);
router.get('/curriculum/:pathwayKey',         MANAGE, curriculum.getPathwayCurriculum);
router.put('/curriculum/:pathwayKey',         MANAGE, curriculum.savePathwayCurriculum);
router.post('/curriculum/:pathwayKey/move',   MANAGE, curriculum.movePathwayDay);
router.post('/curriculum/:pathwayKey/copy',   MANAGE, curriculum.copyPathwayCurriculum);
router.post('/curriculum/:pathwayKey/draft',  MANAGE, curriculum.draftPathwayCurriculum);

// ── Who each pathway serves. Rules save through the content endpoint; these support
//    writing them: the vocabulary, a dry-run against real members, and re-routing. ──
// ── Career roles. Ordinary CareerPilot configuration, so MANAGE rather than a new
//    permission: unlike category weights or a member re-route, changing a role rewrites
//    nothing that already exists — it only changes what future students are offered. ──
// ── Canonical skill graph. The catalogue is GLOBAL — one shared taxonomy, so that
//    JAVA_OOP means the same thing in every tenant. Reading it is ordinary CareerPilot
//    admin work; WRITING it changes what every tenant sees, which is a platform-wide
//    act and follows the same SUPER_ADMIN rule as system settings. ──
router.get('/skills',             MANAGE,        careerSkills.listSkills);
router.get('/skills/:key/usage',  MANAGE,        careerSkills.skillUsage);
router.post('/skills',            SUPER_ADMIN,   careerSkills.createSkill);
router.put('/skills/:id',         SUPER_ADMIN,   careerSkills.updateSkill);
router.delete('/skills/:id',      SUPER_ADMIN,   careerSkills.deleteSkill);
router.post('/skills/seed',       SUPER_ADMIN,   careerSkills.seedSkills);

// ── Student skill evidence and Skill DNA (Module 7). Submitting grades the paper and
//    projects it into canonical skill evidence; the projection is derived state and never
//    costs a student their submission if it fails. Rebuild/reproject are admin recovery. ──
router.post('/me/assessment/personalized/submit', MEMBER, skillDna.submitPersonalizedAssessment);
router.get('/me/skills',                          MEMBER, skillDna.getMySkillDna);
router.get('/students/:studentId/skills',                    MANAGE, skillDna.getStudentSkillDna);
router.get('/students/:studentId/skills/:skillKey',          MANAGE, skillDna.explainStudentSkill);
router.post('/students/:studentId/skills/rebuild',           MANAGE, skillDna.rebuildStudentSkillDna);
router.post('/assessments/:assessmentId/reproject',          MANAGE, skillDna.reprojectAssessment);

// ── Personalised assessment generation (Module 6). A SEPARATE flow: the existing
//    assessment endpoints are untouched, so incomplete evidence mapping cannot break a
//    working exam. Role, stage and questions are all resolved server-side. ──
router.post('/me/assessment/personalized/start', MEMBER, personalized.startPersonalizedAssessment);
router.get('/me/assessment/personalized',        MEMBER, personalized.getMyPersonalizedAssessment);
router.post('/assessment/personalized/preview',  MANAGE, personalized.previewPersonalizedAssessment);
router.get('/assessment/personalized/policies',  MANAGE, personalized.listPolicies);

// ── Assessment skill evidence: which content measures which canonical skill. Additive
//    configuration — the live assessment generator does not read it, so incomplete
//    mapping can never break a working exam. Tenant-scoped, following the content. ──
router.get('/skill-evidence',            MANAGE, skillEvidence.listEvidence);
router.get('/skill-evidence/coverage',   MANAGE, skillEvidence.coverage);
router.get('/skill-evidence/candidates', MANAGE, skillEvidence.candidates);
router.get('/skill-evidence/skills',     MANAGE, skillEvidence.mappableSkills);
router.get('/skill-evidence/:sourceType/:sourceId', MANAGE, skillEvidence.getItemEvidence);
router.put('/skill-evidence/:sourceType/:sourceId', MANAGE, skillEvidence.saveItemEvidence);

// ── Role skill blueprints: what each role expects. Tenant's own configuration, so
//    MANAGE rather than the SUPER_ADMIN the shared skill catalogue requires — referencing
//    a skill here grants nothing over the skill itself. ──
router.get('/role-blueprints',                   MANAGE, roleBlueprints.listBlueprints);
router.get('/role-blueprints/:roleKey',          MANAGE, roleBlueprints.getBlueprint);
router.put('/role-blueprints/:roleKey',          MANAGE, roleBlueprints.saveBlueprint);
router.post('/role-blueprints/:roleKey/publish', MANAGE, roleBlueprints.setPublished);
router.post('/role-blueprints/seed',             MANAGE, roleBlueprints.seedBlueprints);

router.get('/career-roles',            MANAGE, careerRoles.listRoles);
router.get('/career-roles/:key/usage', MANAGE, careerRoles.roleUsage);
router.post('/career-roles',           MANAGE, careerRoles.createRole);
router.put('/career-roles/:id',        MANAGE, careerRoles.updateRole);
router.delete('/career-roles/:id',     MANAGE, careerRoles.deleteRole);

router.get('/pathway-rules/vocabulary',  MANAGE, pathwayRules.getRuleVocabulary);
router.post('/pathway-rules/preview',    MANAGE, pathwayRules.previewPathwayRules);
// Two routes rather than one flag: seeing who WOULD move is a MANAGE act, actually
// moving them is a different level of trust, and separate guards say so without
// re-implementing permission resolution inside a controller.
router.post('/pathway-rules/reevaluate',       MANAGE,  pathwayRules.reevaluatePathways);
router.post('/pathway-rules/reevaluate/apply', REROUTE, pathwayRules.applyReevaluation);
router.post('/pathway-rules/draft',      MANAGE, pathwayRules.draftPathwayRules);

router.get('/funnel',                  FUNNEL, funnel.getFunnel);
router.get('/funnel/:stage',           FUNNEL, funnel.getStageMembers);
router.get('/funnel/:stage/export',    FUNNEL, funnel.exportStage);

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
// Career context — who this student is academically and career-wise, normalized. Both
// act on the caller only; the student id comes from the token, never from the request.
router.get('/me/context', MEMBER, careerContext.getMyCareerContext);
router.put('/me/context', MEMBER, careerContext.updateMyCareerContext);
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
