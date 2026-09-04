import express from 'express';
import multer, { MulterError } from 'multer';
import fs from 'fs';
import path from 'path';
import * as staging from '../controllers/careerStagingController';
import { authMiddleware } from '../middleware/auth';
import { tenantMiddleware } from '../middleware/tenantMiddleware';
import { roleGuard } from '../middleware/roleGuard';
// Applied only where a retry costs money: AI generation, interviews, payment and
// redemption. Ordinary reads are deliberately unlimited — a dashboard that 429s
// under normal use is a worse outage than the spend it was protecting.
import { rateLimit } from '../middleware/rateLimit';
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
import * as questionDrafts from '../controllers/skillQuestionDraftController';
import * as questionBank from '../controllers/questionBankController';
import * as personalized from '../controllers/personalizedAssessmentController';
import * as skillDna from '../controllers/skillDnaController';
import * as readiness from '../controllers/roleReadinessController';
import * as careerRoadmap from '../controllers/careerRoadmapController';
import * as dailyPlan from '../controllers/careerDailyPlanController';
import * as skillResources from '../controllers/careerSkillResourceController';
import * as gamification from '../controllers/gamificationController';
import * as rewardBudget from '../controllers/rewardBudgetController';
import * as rewards from '../controllers/rewardController';
import * as rewardsAdmin from '../controllers/rewardAdminController';
import * as reassessment from '../controllers/reassessmentController';
import * as placement from '../controllers/placementReadinessController';
import * as news from '../controllers/techNewsController';
import * as cq from '../controllers/companyQuestionController';
import * as mt from '../controllers/mockTestController';
import * as prep from '../controllers/companyPreparationController';
import * as cprofile from '../controllers/companyProfileAdminController';
import * as cphealth from '../controllers/careerPilotHealthController';
import * as cpanalytics from '../controllers/careerPilotAnalyticsController';

const router = express.Router();

/**
 * Session recordings land here only long enough to be streamed to Bunny, then the controller
 * deletes them. Kept off the resume uploader because the limits are nothing alike — a CV is
 * 8 MB of PDF, a few minutes of video is two orders of magnitude bigger.
 */
const INTERVIEW_REC_TMP = 'uploads/careerpilot-interview-tmp';
if (!fs.existsSync(INTERVIEW_REC_TMP)) fs.mkdirSync(INTERVIEW_REC_TMP, { recursive: true });
const recordingUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _f, cb) => cb(null, INTERVIEW_REC_TMP),
    filename: (_req, _f, cb) => cb(null, `iv-${Date.now()}-${Math.round(Math.random() * 1e9)}.webm`),
  }),
  limits: { fileSize: 200 * 1024 * 1024 },
  fileFilter: (_req, f, cb) => cb(null, /^(video|audio)\//.test(f.mimetype || '')),
});

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
/**
 * Streamed attachment reads, registered BEFORE the auth middleware on purpose.
 *
 * A browser streaming a file from an <a href> or an <img src> cannot send an Authorization
 * header, so this route authorises itself from the signed `t` parameter instead: a ticket
 * naming one file, valid for ten minutes, issued only to a signed-in caller by the
 * attachment-token route below.
 *
 * ORDER IS THE WHOLE POINT. Registered after the router.use on the next line, every request
 * would be rejected for the missing header this design exists to avoid — the ticket would
 * never be reached, and large attachments would simply not open.
 */
router.get('/skill-resources/attachment-file/:folder/:name', skillResources.streamAttachment);

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

// ── Role readiness (Module 8). Derived on every request from Skill DNA and the
//    published blueprint — nothing is stored, so a new blueprint or new evidence changes
//    the next answer with nothing to invalidate. The role comes from stored context. ──
router.get('/me/readiness',                     MEMBER, readiness.getMyRoleReadiness);
router.get('/students/:studentId/readiness',    MANAGE, readiness.getStudentRoleReadiness);

// ── 90-day roadmap (Module 9). The PLANNING layer: what to achieve over the window, in
//    canonical skills. Distinct from `/roadmap` below, which is the mission journey — that
//    answers "what do I do today" and is untouched by any of this. Unlike readiness, a plan
//    is STORED: it is a commitment over time, and deriving it would silently rewrite
//    yesterday's plan whenever today's evidence changed. Generation is always explicit and
//    takes no parameters — role, gaps and capacity are all resolved server-side. ──
// ── Daily execution (Module 10). The roadmap says what to achieve over 90 days; this says
//    what to do today. Selection is deterministic in (active roadmap, date, prior
//    completions), so nothing is materialised and a refresh returns the same list.
//    Completions go through the SAME completeMissionOnce the legacy missions use, so XP,
//    streak and the once-per-key guarantee are inherited rather than rebuilt. ──
// ── Gamification (Module 11). XP is the ENGAGEMENT score: configurable, ledgered and
//    non-redeemable. Coins remain the reward currency on their own engine, and nothing here
//    converts between them. No student route awards anything — every award happens inside a
//    trusted server flow that already proved the work was done. ──
// ── Rewards and redemption (Module 12). COINS buy things; XP never does. A redemption is
//    a saga across stock, the tenant budget, the member's annual allowance and the coin
//    balance — Mongo here is standalone, so each step is separately atomic and separately
//    reversible rather than wrapped in a transaction. Students send a reward key and an
//    intent token; every price and limit is resolved server-side. ──
router.get('/me/rewards',                 MEMBER, rewards.getRewardCatalogue);
router.post('/me/rewards/:key/redeem',    MEMBER, rateLimit('redemption'), rewards.redeemRewardForMe);
router.get('/me/redemptions',             MEMBER, rewards.getMyRedemptions);

router.get('/rewards/admin',                              MANAGE, rewardsAdmin.listRewardsAdmin);
router.post('/rewards/admin',                             MANAGE, rewardsAdmin.createReward);
router.put('/rewards/admin/:key',                         MANAGE, rewardsAdmin.updateReward);
router.get('/rewards/admin/redemptions',                  MANAGE, rewardsAdmin.listRedemptions);
router.post('/rewards/admin/redemptions/:id/fulfill',     MANAGE, rewardsAdmin.fulfill);
router.post('/rewards/admin/redemptions/:id/cancel',      MANAGE, rewardsAdmin.cancel);
// Recovery for a saga interrupted by a process failure. Re-runs the saga; never hand-edits.
router.get('/rewards/admin/stranded',                     MANAGE, rewardsAdmin.listStranded);
router.post('/rewards/admin/redemptions/:id/recover',     MANAGE, rewardsAdmin.recover);

router.get('/me/gamification',            MEMBER, gamification.getMyGamification);
router.get('/me/gamification/xp-history', MEMBER, gamification.getMyXpHistory);
router.get('/me/leaderboard',             MEMBER, gamification.getMyLeaderboard);

router.get('/gamification/admin',                       MANAGE, gamification.getAdminGamification);
router.put('/gamification/admin/rules/:eventKey',       MANAGE, gamification.updateXpRule);
router.put('/gamification/admin/badges/:key',           MANAGE, gamification.updateBadge);
router.put('/gamification/admin/leaderboard',           MANAGE, gamification.updateLeaderboardSettings);

// Reward budget is a financial control: admin-only, and invisible to members.
router.get('/gamification/admin/reward-budget',          MANAGE, rewardBudget.getRewardBudget);
router.put('/gamification/admin/reward-budget',          MANAGE, rewardBudget.updateRewardBudget);
router.post('/gamification/admin/reward-budget/preview', MANAGE, rewardBudget.previewRewardBudget);

router.get('/me/plan/today',                    MEMBER, dailyPlan.getMyDailyPlan);
router.post('/me/plan/complete',                MEMBER, dailyPlan.completeMyDailyMission);

// ── Canonical skill → executable resource mapping (Module 10). Deliberately explicit:
//    nothing is inferred from titles, and an unmapped objective is reported as a
//    configuration gap rather than filled with a plausible guess. ──
/**
 * Notes attachments.
 *
 * A generous 25MB cap: a scanned PDF handout or a slide deck routinely exceeds the few
 * megabytes an image needs, and an admin hitting a silent limit mid-upload learns nothing
 * from it. The extension whitelist lives in the controller so the error can name what IS
 * allowed rather than only what was refused.
 */
const CONCEPT_ATTACH_TMP = 'uploads/tmp-concept';
if (!fs.existsSync(CONCEPT_ATTACH_TMP)) fs.mkdirSync(CONCEPT_ATTACH_TMP, { recursive: true });

/**
 * 1GB, matching what the vhost already permits (`client_max_body_size 1200M`).
 *
 * A cap below the proxy's buys nothing except a refusal, and recorded lecture video is
 * routinely this size. The number is only safe because nothing on the upload path holds a
 * whole file in memory: multer spools to disk, and the controller streams from there to its
 * destination. An earlier version read the temp file into a Buffer, which at this size would
 * have taken the process out rather than returned an error.
 *
 * DISK IS THE REAL LIMIT NOW. These land on the shared `uploads_data` volume, so a handful
 * of gigabyte attachments is a full disk and a dead server for every tenant on the box.
 */
const CONCEPT_ATTACH_MAX_MB = 1024;

const conceptAttachUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _f, cb) => cb(null, CONCEPT_ATTACH_TMP),
    filename: (_req, f, cb) =>
      cb(null, `ca-${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(f.originalname || '')}`),
  }),
  limits: { fileSize: CONCEPT_ATTACH_MAX_MB * 1024 * 1024 },
});

/**
 * Turn a multer rejection into JSON.
 *
 * Without this, an oversized file leaves multer throwing into Express's default handler,
 * which answers with an HTML error page. The browser then has no `message` to read and the
 * admin is told only "could not be uploaded" — a refusal that does not say what to change.
 * The same wrapper is used by the battle and lead upload routes.
 */
const conceptAttach = (req: any, res: any, next: any) =>
  conceptAttachUpload.single('file')(req, res, (err: any) => {
    if (err instanceof MulterError) {
      return res.status(413).json({
        message: err.code === 'LIMIT_FILE_SIZE'
          ? `That file is larger than ${Math.round(CONCEPT_ATTACH_MAX_MB / 1024)}GB.`
          : `Upload rejected: ${err.code}.`,
      });
    }
    if (err) return res.status(400).json({ message: err.message || 'Upload failed.' });
    next();
  });

router.post('/skill-resources/attachments', MANAGE, conceptAttach, skillResources.uploadAttachment);
/**
 * Readable by any signed-in member, not just an admin: the same file is what a student
 * opens from their daily plan, and a second route serving identical bytes would be one
 * more thing to keep in step.
 */
router.get('/skill-resources/attachments/:folder/:name', MEMBER, skillResources.downloadAttachment);

/** Issuing a ticket needs a real session; spending it does not. See above router.use. */
router.post('/skill-resources/attachment-token', MEMBER, skillResources.issueAttachmentToken);

router.get('/skill-resources',            MANAGE, skillResources.listSkillResources);
router.get('/skill-resources/concepts',   MANAGE, skillResources.listConcepts);
router.get('/skill-resources/audience-options', MANAGE, skillResources.listAudienceOptions);
router.get('/skill-resources/catalogue',  MANAGE, skillResources.listMappableResources);
router.post('/skill-resources',           MANAGE, skillResources.createSkillResource);
router.put('/skill-resources/:id',        MANAGE, skillResources.updateSkillResource);
router.delete('/skill-resources/:id',     MANAGE, skillResources.deleteSkillResource);

// ── Skill check-ins and adaptive replanning (Module 13). A check-in is the SAME Module 6
//    generator aimed at fewer skills; it never writes a score and never replans. New evidence
//    may change Skill DNA and readiness, and the roadmap a student is following moves only
//    when they explicitly ask through the existing replan endpoint below. ──
router.get('/me/reassessment/status',              MEMBER, reassessment.getReassessmentStatus);
router.post('/me/reassessment/start',              MEMBER, rateLimit('aiGenerate'), reassessment.startMyReassessment);
router.get('/me/reassessment/history',             MEMBER, reassessment.getMyReassessmentHistory);
router.get('/me/reassessment/:attemptId/result',   MEMBER, reassessment.getMyReassessmentResult);
router.get('/me/roadmap/replan-status',            MEMBER, reassessment.getReplanStatus);

router.get('/students/:studentId/reassessment',           MANAGE, reassessment.getStudentReassessment);
router.post('/students/:studentId/reassessment/override', MANAGE, reassessment.overrideReassessment);

// ── Placement readiness (Module 14). THREE figures, never blended: can you do the job
//    (Module 8), does your resume show it, and can you show it under interview conditions.
//    All read-only — a resume is a claim and moves no score. Interview performance DOES
//    become evidence, but only through Module 7, and only from a role interview whose areas
//    were drawn from the role blueprint. ──
router.get('/me/placement-readiness',    MEMBER, placement.getMyPlacementReadiness);
router.get('/me/resume-readiness',       MEMBER, placement.getMyResumeReadiness);
router.get('/me/interview/coverage',     MEMBER, placement.getMyInterviewCoverage);
router.get('/students/:studentId/placement-readiness', MANAGE, placement.getStudentPlacementReadiness);

router.get('/me/roadmap',                       MEMBER, careerRoadmap.getMyRoadmap);
router.post('/me/roadmap/generate',             MEMBER, careerRoadmap.generateMyRoadmap);
router.post('/me/roadmap/replan',               MEMBER, careerRoadmap.replanMyRoadmap);
router.get('/students/:studentId/roadmap',      MANAGE, careerRoadmap.getStudentRoadmap);

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
// Preflight for the onboarding CTA — read-only, no generation, so no aiGenerate limit.
router.get('/me/assessment/personalized/availability', MEMBER, personalized.checkPersonalizedAssessmentAvailability);
router.post('/me/assessment/personalized/start', MEMBER, rateLimit('aiGenerate'), personalized.startPersonalizedAssessment);
// Saving is not submitting: status is untouched and nothing is graded. It exists so a
// refresh, a dead battery or a shared machine cannot cost somebody a half-finished paper.
router.put('/me/assessment/personalized/answers', MEMBER, personalized.savePersonalizedAnswers);
router.get('/me/assessment/personalized',        MEMBER, personalized.getMyPersonalizedAssessment);
router.post('/assessment/personalized/preview',  MANAGE, personalized.previewPersonalizedAssessment);
router.get('/assessment/personalized/policies',  MANAGE, personalized.listPolicies);
// Admin-editable paper shape — question count, skill count, difficulty mix, optional timer.
router.get('/assessment/policies/editable',      MANAGE, personalized.getEditablePolicies);
router.put('/assessment/policies/editable',      MANAGE, personalized.saveEditablePolicies);

// ── Assessment skill evidence: which content measures which canonical skill. Additive
//    configuration — the live assessment generator does not read it, so incomplete
//    mapping can never break a working exam. Tenant-scoped, following the content. ──
router.get('/skill-evidence',            MANAGE, skillEvidence.listEvidence);
router.get('/skill-evidence/coverage',   MANAGE, skillEvidence.coverage);
router.get('/skill-evidence/candidates', MANAGE, skillEvidence.candidates);
router.get('/skill-evidence/skills',     MANAGE, skillEvidence.mappableSkills);
/**
 * AI question drafting. Generation spends money and is limited; review never is — an admin
 * halfway through a queue of forty drafts must not be interrupted by a 429.
 */
/**
 * The assessment question bank — the approved questions, browsable and editable.
 *
 * Distinct from /question-drafts, which only ever shows what is still pending review. Once
 * a draft was approved there was no route that could reach it again, so targeting could not
 * be changed and a typo could not be fixed.
 */
router.get('/question-bank',                MANAGE, questionBank.list);
router.post('/question-bank/targeting',     MANAGE, questionBank.bulkTargeting);
router.post('/question-bank/active',        MANAGE, questionBank.setActive);
router.post('/question-bank/:sourceId/copy', MANAGE, questionBank.copy);
// Registered after the fixed paths above so 'targeting' and 'active' are never read as ids.
router.put('/question-bank/:sourceType/:sourceId',    MANAGE, questionBank.update);
router.delete('/question-bank/:sourceType/:sourceId', MANAGE, questionBank.remove);

router.get('/question-drafts',              MANAGE, questionDrafts.list);
router.get('/question-drafts/coverage',     MANAGE, questionDrafts.coverage);
router.get('/question-drafts/role-coverage', MANAGE, questionDrafts.roleCoverage);
router.post('/question-drafts/generate',    MANAGE, rateLimit('adminAi'), questionDrafts.generate);
// Bulk approve and manual authoring sit BEFORE the '/:id/...' routes so 'approve-bulk'
// and 'manual' are never captured as an id.
router.get('/question-drafts/audiences',      MANAGE, questionDrafts.audiences);
router.post('/question-drafts/approve-bulk', MANAGE, questionDrafts.approveBulk);
router.post('/question-drafts/manual',       MANAGE, questionDrafts.createManual);
router.post('/question-drafts/:id/approve', MANAGE, questionDrafts.approve);
router.post('/question-drafts/:id/reject',  MANAGE, questionDrafts.reject);

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
/**
 * Complimentary membership. Separate from `/active` above, which controls LOGIN — these
 * are different facts and staff need both: a member can be deactivated while their
 * membership runs, or hold a grant while their login is disabled.
 */
router.post('/members/:userId/grant',    MANAGE, ctrl.grantMembership);
router.delete('/members/:userId/grant',  MANAGE, ctrl.revokeMembership);
router.delete('/members/:userId',      MANAGE, ctrl.deleteMember);

// Coins — the member's balance, and the admin's dials. Earning rules are data, so
// switching an event on or changing what it pays needs no deploy.
router.get('/leaderboard',          MEMBER, dashboard.getLeaderboard);

// Daily tech news. The member sees only what an admin has published; the AI writes
// drafts and never publishes on its own.
// Company Questions. Rounds and categories are DATA, so an admin adds "System Design"
// without a deploy. AI-predicted rows stay flagged from generation to render.
// Company preparation (Module 15). Company readiness and eligibility are DERIVED on read
// from Skill DNA and the published company profile — nothing here writes a score, a roadmap
// or a plan, and no AI call sits on any of these paths.
// Under their own prefix rather than as `/companies/overview`, because `/companies/:slug`
// already owns that shape: a company slugged "overview" or "targets" — and slugs are derived
// from names an admin types — would silently shadow one of these.
router.get('/company-prep/overview',         MEMBER, prep.companyOverview);
router.put('/company-prep/targets',          MEMBER, prep.setTargets);

router.get('/companies',                     MEMBER, cq.listCompanies);
router.get('/companies/:slug',               MEMBER, cq.companyDetail);
router.get('/companies/:slug/readiness',     MEMBER, prep.companyReadiness);
router.get('/companies/:slug/preparation',   MEMBER, prep.companyPreparation);
router.post('/companies/:slug/contribute',   MEMBER, cq.contribute);
router.post('/companies/:slug/experience',   MEMBER, cq.submitExperience);

// Company mock test. The paper is assembled per attempt from the bank plus AI top-up,
// so there is no stored paper to leak or to share between students.
router.post('/companies/:slug/mock-test/start',   MEMBER, rateLimit('aiGenerate'), mt.startMockTest);
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
router.post('/company-admin/:slug/predict',        MANAGE, rateLimit('adminAi'), cq.predict);
router.post('/company-admin/bulk',                 MANAGE, cq.bulkCreate);
router.get('/company-admin/readiness',             MANAGE, cq.readinessBoard);
router.post('/company-admin/:slug/draft-profile',  MANAGE, rateLimit('adminAi'), cq.draftProfile);
router.put('/company-admin/:slug/verify',          MANAGE, cq.verifyFields);
router.put('/company-admin/:slug/pattern',         MANAGE, cq.savePattern);

// What a company expects, in canonical skills. Draft → publish, because a half-finished set
// of weights must not move every student's company readiness the moment it is typed.
// Configuration health and launch readiness. Admin-only, tenant taken from the token, and
// read-only — neither endpoint repairs anything, and the security findings report whether a
// secret is configured, never what it is.
// CareerPilot analytics. Admin-only, tenant from the token, grouped by the question an
// admin is asking rather than by collection. Every response carries its range, generation
// time and coverage — including which figures are unavailable and why.
router.get('/admin/analytics/overview',       MANAGE, cpanalytics.overview);
router.get('/admin/analytics/skills',         MANAGE, cpanalytics.skills);
router.get('/admin/analytics/progress',       MANAGE, cpanalytics.progress);
router.get('/admin/analytics/engagement',     MANAGE, cpanalytics.engagement);
router.get('/admin/analytics/economy',        MANAGE, cpanalytics.economy);
router.get('/admin/analytics/placement',      MANAGE, cpanalytics.placement);

router.get('/admin/health/configuration',     MANAGE, cphealth.configuration);
router.get('/admin/health/launch-readiness',  MANAGE, cphealth.launchReadiness);
router.get('/admin/health/data-integrity',    MANAGE, cphealth.dataIntegrity);

router.get('/company-admin/:slug/profiles',                 MANAGE, cprofile.listProfiles);
router.put('/company-admin/:slug/profiles/:roleKey',        MANAGE, cprofile.saveDraft);
router.post('/company-admin/:slug/profiles/:roleKey/publish', MANAGE, cprofile.publish);
router.delete('/company-admin/:slug/profiles/:id',          MANAGE, cprofile.discardDraft);
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
router.post('/membership/order',  MEMBER, rateLimit('payment'), ctrl.createMembershipOrder);
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
// Rate-limited with the other AI spend: a hint button is one click and costs a call.
router.post('/practice/:id/ai-hint', MEMBER, rateLimit('aiGenerate'), practice.aiHint);

// AI Mock Interviews (mock_interview entitlement)
router.get('/interview',              MEMBER, interview.list);
router.post('/interview/start',       MEMBER, rateLimit('aiInterview'), interview.start);
router.get('/interview/:id',          MEMBER, interview.get);
router.post('/interview/:id/turn',    MEMBER, rateLimit('aiInterview'), interview.turn);
router.post('/interview/speak',       MEMBER, interview.speak);
router.post('/interview/:id/finish',  MEMBER, interview.finish);
// The recording is an extra on top of an already-graded session, so it is its own call:
// a failed upload must never cost the member the interview they just sat.
router.post('/interview/:id/recording', MEMBER, recordingUpload.single('recording'), interview.uploadRecording);
router.get('/interview/:id/recording',  MEMBER, interview.playRecording);

// Resume Center (resume entitlement)
router.get('/resume',            MEMBER, resume.get);
router.put('/resume',            MEMBER, resume.save);
// Import an existing CV. Stored briefly, parsed, then deleted by the controller — the
// text is the point, the file is not.
router.post('/resume/import',    MEMBER, rateLimit('aiGenerate'), resumeUpload.single('file'), resume.importResume);
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
