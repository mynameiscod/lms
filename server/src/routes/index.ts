import express from 'express';
import authRoutes from './authRoutes';
import tenantRoutes from './tenantRoutes';
import courseRoutes from './courseRoutes';
import subjectRoutes from './subjectRoutes';
import chapterRoutes from './chapterRoutes';
import enrollmentRoutes from './enrollmentRoutes';
import userRoutes from './userRoutes';
import roleRoutes from './roleRoutes';
import batchRoutes from './batchRoutes';
import attendanceRoutes from './attendanceRoutes';
import quizRoutes from './quizRoutes';
import questionRoutes from './questionRoutes';
import contentRoutes from './contentRoutes';
import progressRoutes from './progressRoutes';
import studentProfileRoutes from './studentProfileRoutes';
import oauthRoutes from './oauthRoutes';
import assignmentRoutes from './assignmentRoutes';
import dashboardRoutes from './dashboardRoutes';
import studentReportRoutes from './studentReportRoutes';
import interviewQuestionRoutes from './interviewQuestionRoutes';
import topicRoutes from './topicRoutes';
import subTopicRoutes from './subTopicRoutes';
import leadRoutes from './leadRoutes';
import leadStageRoutes from './leadStageRoutes';
import leadFormConfigRoutes from './leadFormConfigRoutes';
import codeSnippetRoutes from './codeSnippetRoutes';
import shareRoutes from './shareRoutes';
import leadStageHistoryRoutes from './leadStageHistoryRoutes';
import whatsappRoutes from './whatsappRoutes';
import followUpRoutes from './followUpRoutes';
import seatReservationRoutes from './seatReservationRoutes';
import leadPriorityRoutes from './leadPriorityRoutes';
import qualificationRoutes from './qualificationRoutes';
import salesContentRoutes from './salesContentRoutes';
import leadAIRoutes from './leadAIRoutes';
import lostReasonRoutes from './lostReasonRoutes';
import publicLeadRoutes from './publicLeadRoutes';
import metaLeadAdsRoutes from './metaLeadAdsRoutes';
import googleSheetRoutes from './googleSheetRoutes';
import leadScoringRoutes from './leadScoringRoutes';
import leadSourceConfigRoutes from './leadSourceConfigRoutes';
import leadDispositionRoutes from './leadDispositionRoutes';
import interviewTemplateRoutes from './interviewTemplateRoutes';
import departmentRoutes from '../college/departmentRoutes';
import membershipRoutes from '../college/membershipRoutes';
import curriculumRoutes from '../college/curriculumRoutes';
import crtRoutes from '../crt/crtRoutes';
import placementDriveRoutes from '../placement/placementDriveRoutes';
import alumniRoutes from '../alumni/alumniRoutes';
import notificationRoutes from '../notifications/notificationRoutes';
import meetingRoutes from './meetingRoutes';
import leadDistributionRoutes from './leadDistributionRoutes';
import whatsappDripConfigRoutes from './whatsappDripConfigRoutes';
import salesCallRecordingRoutes from './salesCallRecordingRoutes';
import googleAdsRoutes from './googleAdsRoutes';
import aiCallRoutes from './aiCallRoutes';
import adminPublicQuizRoutes from './adminPublicQuizRoutes';
import learningContentLibraryRoutes from './learningContentLibraryRoutes';
import liveSessionRoutes from './liveSessionRoutes';
import learningCurriculumRoutes from './curriculumRoutes';
import enrollmentPlanRoutes from './enrollmentPlanRoutes';
import projectRoutes from './projectRoutes';
import jobApplicationRoutes from './jobApplicationRoutes';
import mentorRoutes from './mentorRoutes';
import batchOfferingRoutes from './batchOfferingRoutes';
import conceptLessonRoutes from './conceptLessonRoutes';
import interactiveLessonRoutes from './interactiveLessonRoutes';
import adminLogsRoute from './adminLogsRoute';
import scheduledInterviewRoutes from './scheduledInterviewRoutes';
import recordingLogRoutes from './recordingLogRoutes';
import leaveRequestRoutes from './leaveRequestRoutes';
import playgroundRoutes from './playgroundRoutes';
import resumeRoutes from './resumeRoutes';
import careerProfileRoutes from './careerProfileRoutes';
import placementPartnerRoutes from './placementPartnerRoutes';
import feeRoutes from './feeRoutes';
import publicAssessmentRoutes from './publicAssessmentRoutes';
import assessmentItemRoutes from './assessmentItemRoutes';
import assessmentCandidatesRoutes from './assessmentCandidatesRoutes';
import systemSettingsRoutes from './systemSettingsRoutes';
import concernRoutes from './concernRoutes';
import paymentRoutes from './paymentRoutes';
import { webhook as paymentWebhook } from '../controllers/paymentController';
import { partnerUnsubscribe } from '../controllers/partnerPublicController';
// Boot notification listeners
import '../notifications/notificationService';

const router = express.Router();

// PUBLIC ROUTES (no auth required)
router.use('/public/assessment', publicAssessmentRoutes); // specific first
router.get('/public/partner-unsubscribe/:token', partnerUnsubscribe); // one-click opt-out (public, signed token) — before the generic /public mount
router.use('/public', publicLeadRoutes);
router.use('/meta-leads', metaLeadAdsRoutes);
router.post('/payments/webhook', paymentWebhook); // Razorpay webhook (public, signature-verified) — before the authed /payments mount

router.use('/auth', authRoutes);
router.use('/tenants', tenantRoutes);
router.use('/courses', courseRoutes);
router.use('/subjects', subjectRoutes);
router.use('/chapters', chapterRoutes);
router.use('/enrollments', enrollmentRoutes);
router.use('/users', userRoutes);
router.use('/roles', roleRoutes);
router.use('/batches', batchRoutes);
router.use('/attendance', attendanceRoutes);
router.use('/quizzes', quizRoutes);
router.use('/assessment-items', assessmentItemRoutes);
router.use('/assessment-candidates', assessmentCandidatesRoutes);
router.use('/concerns', concernRoutes);
router.use('/questions', questionRoutes);
router.use('/content', contentRoutes);
router.use('/progress', progressRoutes);
router.use('/student-profile', studentProfileRoutes);
router.use('/oauth', oauthRoutes);
router.use('/assignments', assignmentRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/student-reports', studentReportRoutes);
router.use('/interview-questions', interviewQuestionRoutes);
router.use('/topics', topicRoutes);
router.use('/sub-topics', subTopicRoutes);
router.use('/leads', leadRoutes);
router.use('/lead-stages', leadStageRoutes);
router.use('/lead-dispositions', leadDispositionRoutes);
router.use('/lead-form-config', leadFormConfigRoutes);
router.use('/code-snippets', codeSnippetRoutes);
router.use('/share', shareRoutes);
router.use('/stage-history', leadStageHistoryRoutes);
router.use('/whatsapp', whatsappRoutes);
router.use('/follow-ups', followUpRoutes);
router.use('/seat-reservations', seatReservationRoutes);
router.use('/lead-priority', leadPriorityRoutes);
router.use('/qualification', qualificationRoutes);
router.use('/sales-content', salesContentRoutes);
router.use('/lead-ai', leadAIRoutes);
router.use('/lost-reasons', lostReasonRoutes);
router.use('/google-sheet-integrations', googleSheetRoutes);
router.use('/lead-scoring', leadScoringRoutes);
router.use('/lead-source-config', leadSourceConfigRoutes);
router.use('/interview-module', interviewTemplateRoutes);

// ─── College Module ────────────────────────────────────────────────────────────
router.use('/college/departments', departmentRoutes);
router.use('/college/membership', membershipRoutes);
router.use('/college/curriculum', curriculumRoutes);
router.use('/college/crt', crtRoutes);
router.use('/college/placement', placementDriveRoutes);
router.use('/college/alumni', alumniRoutes);
router.use('/notifications', notificationRoutes);
router.use('/meetings', meetingRoutes);
router.use('/lead-distribution-config', leadDistributionRoutes);
router.use('/whatsapp-drip-config', whatsappDripConfigRoutes);
router.use('/sales-call-recordings', salesCallRecordingRoutes);
router.use('/google-leads', googleAdsRoutes);
router.use('/ai-calls', aiCallRoutes);
router.use('/public-quizzes', adminPublicQuizRoutes);

// ─── Learning Plan Module ──────────────────────────────────────────────────────
router.use('/learning-library', learningContentLibraryRoutes);
router.use('/live-classes', liveSessionRoutes);
router.use('/curricula', learningCurriculumRoutes);
router.use('/enrollment-plans', enrollmentPlanRoutes);
router.use('/projects', projectRoutes);
router.use('/job-applications', jobApplicationRoutes);
router.use('/ai-mentor', mentorRoutes);
router.use('/payments', paymentRoutes);
router.use('/batch-offerings', batchOfferingRoutes);
router.use('/concept-lessons', conceptLessonRoutes);
router.use('/interactive-lessons', interactiveLessonRoutes);

// ─── Resume Builder ────────────────────────────────────────────────────────────
router.use('/resume', resumeRoutes);
router.use('/career-profile', careerProfileRoutes);
router.use('/placement-partners', placementPartnerRoutes);
router.use('/fees', feeRoutes);

// ─── Scheduled Interviews ─────────────────────────────────────────────────────
router.use('/scheduled-interviews', scheduledInterviewRoutes);
router.use('/recording-logs', recordingLogRoutes);
router.use('/leave-requests', leaveRequestRoutes);
router.use('/playground', playgroundRoutes);

// ─── Admin Utilities ───────────────────────────────────────────────────────────
router.use('/admin/logs', adminLogsRoute);
router.use('/system-settings', systemSettingsRoutes);

export default router;