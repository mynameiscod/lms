import React, { useState, useEffect, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useParams, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { loginPathFor } from './utils/loginPath';
import { TenantProvider } from './contexts/TenantContext';
import { StudentFeaturesProvider, useStudentFeatures, StudentFeatures } from './contexts/StudentFeaturesContext';
import { TenantModulesProvider } from './contexts/TenantModulesContext';
import { BatchModulesProvider } from './contexts/BatchModulesContext';
import { SocketProvider, useSocket } from './contexts/SocketContext';
import { Layout } from './components/layout';
import { Spinner } from './components/common';

import AdminLogPanel from './components/AdminLogPanel';

/*
 * ── EVERY PAGE IS ITS OWN CHUNK ─────────────────────────────────────────────────────────
 *
 * There were 209 static page imports here and no code splitting at all, so webpack emitted
 * ONE bundle containing every screen in the product. A candidate sitting an exam downloaded
 * the admin console, the CRM, the content authoring tools and the lead dashboards before
 * their paper could render — 5.7 MB uncompressed, over a venue's shared wifi, at the exact
 * moment the platform was under the most load it ever sees.
 *
 * These sit BELOW every import on purpose: `import/first` is an error, not a warning, and
 * a lazy() const between two imports fails the build outright.
 */
const CareerPilotStaging = lazy(() => import('./pages/Passport/AdminStaging'));
const CareerPilotConcepts = lazy(() => import('./pages/Passport/AdminConcepts'));
const CareerPilotCoverage = lazy(() => import('./pages/Passport/AdminAssessmentCoverage'));
const CareerPilotPaperDesign = lazy(() => import('./pages/Passport/AdminPaperDesign'));
const LabTracks = lazy(() => import('./pages/LabTracks'));
const LoginPage = lazy(() => import('./pages/Login'));
const RegisterPage = lazy(() => import('./pages/Register'));
const CreateOrganizationPage = lazy(() => import('./pages/CreateOrganization'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));
const ResetPassword = lazy(() => import('./pages/ResetPassword'));
const SetupPassword = lazy(() => import('./pages/SetupPassword/SetupPassword').then(m => ({ default: m.SetupPassword })));
const ProfileCompletion = lazy(() => import('./pages/ProfileCompletion/ProfileCompletion').then(m => ({ default: m.ProfileCompletion })));
const DashboardPage = lazy(() => import('./pages/Dashboard'));
const UsersPage = lazy(() => import('./pages/Users'));
const RolesPage = lazy(() => import('./pages/Roles'));
const BatchesPage = lazy(() => import('./pages/Batches'));
const AttendancePage = lazy(() => import('./pages/Attendance'));
const MyAttendancePage = lazy(() => import('./pages/MyAttendance'));
const AttendanceReportsPage = lazy(() => import('./pages/AttendanceReports'));
const QuizReportsPage = lazy(() => import('./pages/QuizReports'));
const QuizManagementPage = lazy(() => import('./pages/QuizManagement'));
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const QuestionManagementPage = lazy(() => import('./pages/QuestionManagement'));
const QuizzesPage = lazy(() => import('./pages/Quizzes'));
const QuizTakingPage = lazy(() => import('./pages/QuizTaking'));
const QuizResultsPage = lazy(() => import('./pages/QuizResults'));
const QuizResultsAdminPage = lazy(() => import('./pages/QuizResultsAdmin'));
const QuestionBuilder = lazy(() => import('./pages/QuestionBuilder'));
const StudentProfilePage = lazy(() => import('./pages/StudentProfile'));
const OAuthCallbackPage = lazy(() => import('./pages/OAuthCallback'));
const AdminContentPage = lazy(() => import('./pages/AdminContent'));
const NotFoundPage = lazy(() => import('./pages/NotFound'));
const WeeklyReportsPage = lazy(() => import('./pages/WeeklyReports'));
const StudentProfileDetail = lazy(() => import('./pages/AdminStudentProfiles/StudentProfileDetail'));
const DepartmentsPage = lazy(() => import('./pages/Departments'));
const CollegeSettingsPage = lazy(() => import('./pages/CollegeSettings'));
const CollegeMembersPage = lazy(() => import('./pages/CollegeMembers'));
const PlacementDrivesPage = lazy(() => import('./pages/PlacementDrives'));
const PlacementAnalyticsPage = lazy(() => import('./pages/PlacementAnalytics'));
const MyApplicationsPage = lazy(() => import('./pages/MyApplications'));
const AlumniManagementPage = lazy(() => import('./pages/AlumniManagement'));
const CollegeCurriculumPage = lazy(() => import('./pages/CollegeCurriculum'));
const CRTManagementPage = lazy(() => import('./pages/CRTManagement'));
const TenantManagementPage = lazy(() => import('./pages/TenantManagement'));
const AlumniDirectoryPage = lazy(() => import('./pages/AlumniDirectory'));
const NotificationCenterPage = lazy(() => import('./pages/NotificationCenter'));
const StudentCollegePortal = lazy(() => import('./pages/StudentCollegePortal'));
const StudentFeeDetailsPage = lazy(() => import('./pages/StudentFeeDetails'));
const DeptReportsPage = lazy(() => import('./pages/DeptReports'));
const BulkUploadPage = lazy(() => import('./pages/BulkUpload'));
const RecordingDiagnostics = lazy(() => import('./pages/RecordingDiagnostics'));
const PlatformSettings = lazy(() => import('./pages/PlatformSettings'));
const MyLeave = lazy(() => import('./pages/MyLeave'));
const LeaveRequests = lazy(() => import('./pages/LeaveRequests'));
const CodePlayground = lazy(() => import('./pages/CodePlayground'));
const PassportAdminConfig = lazy(() => import('./pages/Passport/AdminConfig'));
const PassportAdminStudents = lazy(() => import('./pages/Passport/AdminStudents'));
const PassportAdminStudentRoadmap = lazy(() => import('./pages/Passport/AdminStudentRoadmap'));
const PassportAdminStageSkills = lazy(() => import('./pages/Passport/AdminStageSkills'));
const PassportAdminCoins = lazy(() => import('./pages/Passport/AdminCoins'));
const PassportAdminFunnel = lazy(() => import('./pages/Passport/AdminFunnel'));
const PassportAdminCurriculum = lazy(() => import('./pages/Passport/AdminCurriculum'));
const PassportAdminPathwayRules = lazy(() => import('./pages/Passport/AdminPathwayRules'));
const PassportAdminCareerRoles = lazy(() => import('./pages/Passport/AdminCareerRoles'));
const PassportAdminSkillGraph = lazy(() => import('./pages/Passport/AdminSkillGraph'));
const PassportAdminRoleBlueprint = lazy(() => import('./pages/Passport/AdminRoleBlueprint'));
const PassportAdminSkillEvidence = lazy(() => import('./pages/Passport/AdminSkillEvidence'));
const PassportAdminAssessmentPreview = lazy(() => import('./pages/Passport/AdminAssessmentPreview'));
const PassportAdminAssessmentShape = lazy(() => import('./pages/Passport/AdminAssessmentShape'));
const PassportAdminQuestionDrafts = lazy(() => import('./pages/Passport/AdminQuestionDrafts'));
const PassportAdminQuestionBank = lazy(() => import('./pages/Passport/AdminQuestionBank'));
const PassportAdminPathways = lazy(() => import('./pages/Passport/AdminPathways'));
const PassportAdminMissions = lazy(() => import('./pages/Passport/AdminMissions'));
const PassportHome = lazy(() => import('./pages/Passport/PassportHome'));
const PassportMaterialViewer = lazy(() => import('./pages/Passport/MaterialViewer'));
const PassportMemberLayout = lazy(() => import('./pages/Passport/MemberLayout'));
const PassportCareerSetup = lazy(() => import('./pages/Passport/CareerSetup'));
const PassportAdminActivity = lazy(() => import('./pages/Passport/AdminActivity'));
const PassportLearningStudio = lazy(() => import('./pages/Passport/AdminLearningStudio'));
const PassportLearningUnit = lazy(() => import('./pages/Passport/AdminLearningUnit'));
const PassportRoadmap = lazy(() => import('./pages/Passport/Roadmap'));
const PassportSkillDna = lazy(() => import('./pages/Passport/SkillDna'));
const PassportRoleReadiness = lazy(() => import('./pages/Passport/RoleReadiness'));
const PassportPlacementReadiness = lazy(() => import('./pages/Passport/PlacementReadiness'));
const PassportSkillAssessment = lazy(() => import('./pages/Passport/SkillAssessment'));
const PassportGamification = lazy(() => import('./pages/Passport/Gamification'));
const PassportRewards = lazy(() => import('./pages/Passport/Rewards'));
const PassportPractice = lazy(() => import('./pages/Passport/Practice'));
const PassportPracticeItem = lazy(() => import('./pages/Passport/PracticeItem'));
const PassportInterview = lazy(() => import('./pages/Passport/Interview'));
const PassportResumeCenter = lazy(() => import('./pages/Passport/ResumeCenter'));
const PassportCoins = lazy(() => import('./pages/Passport/Coins'));
const PassportLeaderboard = lazy(() => import('./pages/Passport/Leaderboard'));
const PassportAchievements = lazy(() => import('./pages/Passport/Achievements'));
const PassportNews = lazy(() => import('./pages/Passport/News'));
const PassportCompanies = lazy(() => import('./pages/Passport/Companies'));
const PassportMockTest = lazy(() => import('./pages/Passport/MockTest'));
const PassportAdminNews = lazy(() => import('./pages/Passport/AdminNews'));
const PassportAdminCompanies = lazy(() => import('./pages/Passport/AdminCompanies'));
const PassportAdminAnalytics = lazy(() => import('./pages/Passport/AdminAnalytics'));
const PassportAdminAssessment = lazy(() => import('./pages/Passport/AdminAssessment'));
const PassportCard = lazy(() => import('./pages/Passport/Card'));
const PassportJoin = lazy(() => import('./pages/Passport/Join'));
const PassportLogin = lazy(() => import('./pages/Passport/Login'));
const HackathonExam = lazy(() => import('./pages/HackathonExam'));
const HackathonExamAdmin = lazy(() => import('./pages/HackathonExamAdmin'));
const BattleList = lazy(() => import('./pages/Battles/PublicList'));
const BattleLanding = lazy(() => import('./pages/Battles/Landing'));
const BattleExam = lazy(() => import('./pages/Battles/Exam'));
const BattleLeaderboard = lazy(() => import('./pages/Battles/Leaderboard'));
const BattlesAdmin = lazy(() => import('./pages/BattlesAdmin'));
const BattleDetail = lazy(() => import('./pages/BattlesAdmin/BattleDetail'));
const HackathonsAdmin = lazy(() => import('./pages/HackathonsAdmin'));
const HackathonResume = lazy(() => import('./pages/HackathonResume'));
const HackathonDetail = lazy(() => import('./pages/HackathonsAdmin/HackathonDetail'));
const ProjectBuilder = lazy(() => import('./pages/ProjectBuilder'));
const JobTracker = lazy(() => import('./pages/JobTracker'));
const AIMentor = lazy(() => import('./pages/AIMentor'));
const ResourceLibrary = lazy(() => import('./pages/ResourceLibrary'));
const ResourceAdmin = lazy(() => import('./pages/ResourceAdmin'));
const SpeakingPractice = lazy(() => import('./pages/SpeakingPractice'));
const SpeakingAdmin = lazy(() => import('./pages/SpeakingAdmin'));
const LogicGym = lazy(() => import('./pages/LogicGym'));
const DrillsAdmin = lazy(() => import('./pages/DrillsAdmin'));
const ThinkingLab = lazy(() => import('./pages/ThinkingLab'));
const CodeVisualizer = lazy(() => import('./pages/CodeVisualizer'));
const CodeVisualizerWorkspace = lazy(() => import('./pages/CodeVisualizer/Workspace'));
const CodeVisualizerAdmin = lazy(() => import('./pages/CodeVisualizerAdmin'));
const ThinkingLabAdmin = lazy(() => import('./pages/ThinkingLabAdmin'));
const InterviewQuestionsPage = lazy(() => import('./pages/InterviewQuestions'));
const InterviewQuestionBankPage = lazy(() => import('./pages/InterviewQuestionBank'));
const InterviewTemplateList = lazy(() => import('./pages/InterviewTemplateList'));
const InterviewTemplateCreate = lazy(() => import('./pages/InterviewTemplateCreate'));
const InterviewQBManagement = lazy(() => import('./pages/InterviewQBManagement'));
const InterviewAssignment = lazy(() => import('./pages/InterviewAssignment'));
const InterviewAnalytics = lazy(() => import('./pages/InterviewAnalytics'));
const TakeStructuredInterview = lazy(() => import('./pages/TakeStructuredInterview'));
const LiveInterview = lazy(() => import('./pages/LiveInterview'));
const InterviewFeedbackReport = lazy(() => import('./pages/InterviewFeedbackReport'));
const AdminAssignmentList = lazy(() => import('./pages/assignments').then(m => ({ default: m.AdminAssignmentList })));
const AdminAssignmentForm = lazy(() => import('./pages/assignments').then(m => ({ default: m.AdminAssignmentForm })));
const AdminSubmissions = lazy(() => import('./pages/assignments').then(m => ({ default: m.AdminSubmissions })));
const StudentAssignmentList = lazy(() => import('./pages/assignments').then(m => ({ default: m.StudentAssignmentList })));
const AssignmentWorkspace = lazy(() => import('./pages/assignments').then(m => ({ default: m.AssignmentWorkspace })));
const AssignmentResult = lazy(() => import('./pages/assignments').then(m => ({ default: m.AssignmentResult })));
const AssignmentReports = lazy(() => import('./pages/AssignmentReports'));
const StudentFeaturesPage = lazy(() => import('./pages/StudentFeatures'));
const ResumeBuilderPage = lazy(() => import('./pages/ResumeBuilder'));
const PublicResumeView = lazy(() => import('./pages/ResumeBuilder/PublicResumeView'));
const CareerProfilePage = lazy(() => import('./pages/CareerProfile'));
const CareerProfileAdmin = lazy(() => import('./pages/CareerProfile/Admin'));
const PlacementPartnership = lazy(() => import('./pages/PartnerPipeline'));
const FeesPage = lazy(() => import('./pages/Fees'));
const LeadsPage = lazy(() => import('./pages/Leads'));
const TeamActivity = lazy(() => import('./pages/TeamActivity'));
const LeadDetailPage = lazy(() => import('./pages/LeadDetail'));
const LeadStagesPage = lazy(() => import('./pages/LeadStages'));
const LeadFormSettingsPage = lazy(() => import('./pages/LeadFormSettings'));
const LeadManagerBoardPage = lazy(() => import('./pages/LeadManagerBoard'));
const LeadMyPerformancePage = lazy(() => import('./pages/LeadMyPerformance'));
const LeadAuditLogsPage = lazy(() => import('./pages/LeadAuditLogs'));
const LeadPrioritySettingsPage = lazy(() => import('./pages/LeadPrioritySettings'));
const QualificationSettingsPage = lazy(() => import('./pages/QualificationSettings'));
const SalesContentLibraryPage = lazy(() => import('./pages/SalesContentLibrary'));
const LeadAnalyticsPage = lazy(() => import('./pages/LeadAnalytics'));
const MeetingsPage = lazy(() => import('./pages/Meetings'));
const LeadDistributionSettingsPage = lazy(() => import('./pages/LeadDistributionSettings'));
const FollowUpCalendarPage = lazy(() => import('./pages/FollowUpCalendar'));
const SeatReservationsPage = lazy(() => import('./pages/SeatReservations'));
const LeadAgingPage = lazy(() => import('./pages/LeadAging'));
const LeadDuplicatesPage = lazy(() => import('./pages/LeadDuplicates'));
const LeadApprovalsPage = lazy(() => import('./pages/LeadApprovals'));
const LeadKanbanPage = lazy(() => import('./pages/LeadKanban'));
const AdminCodeSnippets = lazy(() => import('./pages/CodeSnippets').then(m => ({ default: m.AdminCodeSnippets })));
const StudentCodeSnippets = lazy(() => import('./pages/CodeSnippets').then(m => ({ default: m.StudentCodeSnippets })));
const GradeSubmissions = lazy(() => import('./pages/CodeSnippets').then(m => ({ default: m.GradeSubmissions })));
const CertificatePage = lazy(() => import('./pages/Certificate/CertificatePage'));
const CertificateVerify = lazy(() => import('./pages/CertificateVerify'));
const CandidateProfile = lazy(() => import('./pages/CandidateProfile'));
const CertificatesAdmin = lazy(() => import('./pages/CertificatesAdmin'));
const AiSpend = lazy(() => import('./pages/AiSpend'));
const GoogleSheetIntegrationPage = lazy(() => import('./pages/GoogleSheetIntegration'));
const LeadScoringSettingsPage = lazy(() => import('./pages/LeadScoringSettings'));
const LeadSourcesPage = lazy(() => import('./pages/LeadSources'));
const AICallConfigPage = lazy(() => import('./pages/AICallConfig'));
const AllRegistrations = lazy(() => import('./pages/PublicQuizAdmin/AllRegistrations'));
const RegistrationDetail = lazy(() => import('./pages/PublicQuizAdmin/RegistrationDetail'));
const LearningContentLibraryPage = lazy(() => import('./pages/LearningContentLibrary'));
const CreateEditContentPage = lazy(() => import('./pages/LearningContentLibrary/CreateEditContent'));
const RecordClassPage = lazy(() => import('./pages/LearningContentLibrary/RecordClass'));
const LiveClassPage = lazy(() => import('./pages/LiveClass'));
const InteractiveLessonBuilderPage = lazy(() => import('./pages/InteractiveLessonBuilder'));
const InteractiveLessonViewerPage = lazy(() => import('./pages/InteractiveLessonViewer'));
const CurriculumListPage = lazy(() => import('./pages/CurriculumBuilder'));
const CurriculumBuilderPage = lazy(() => import('./pages/CurriculumBuilder/BuilderPage'));
const EnrollmentPlansPage = lazy(() => import('./pages/EnrollmentPlans'));
const BatchOfferingsPage = lazy(() => import('./pages/BatchOfferings'));
const CohortProgressPage = lazy(() => import('./pages/CohortProgress'));
const MyTasksPage = lazy(() => import('./pages/MyTasks'));
const MyLearningPlanPage = lazy(() => import('./pages/MyLearningPlan'));
const DayViewPage = lazy(() => import('./pages/MyLearningPlan/LearningPlanPro'));
const MyJourneyPage = lazy(() => import('./pages/MyLearningPlan/Journey'));
const AdminConcernsPage = lazy(() => import('./pages/AdminConcerns'));
const QuizSession = lazy(() => import('./pages/QuizSession'));
const AssessmentRegister = lazy(() => import('./pages/Assessment/Register'));
const AssessmentLanding = lazy(() => import('./pages/Assessment/Landing'));
const AssessmentExam = lazy(() => import('./pages/Assessment/Exam'));
const AssessmentResult = lazy(() => import('./pages/Assessment/Result'));
const AssessmentAdmin = lazy(() => import('./pages/AssessmentAdmin'));
const AssessmentCandidates = lazy(() => import('./pages/AssessmentCandidates'));
const AdminLogs = lazy(() => import('./pages/AdminLogs'));
const ScheduledInterviewsPage = lazy(() => import('./pages/ScheduledInterviews'));
const InterviewDetailPage = lazy(() => import('./pages/ScheduledInterviews/InterviewDetail'));
const HmsClassesPage = lazy(() => import('./pages/HmsClasses'));
const HmsRoomPage = lazy(() => import('./pages/HmsClasses/Room'));
const CommunicationLab = lazy(() => import('./pages/CommunicationLab'));
const CommunicationLabAdmin = lazy(() => import('./pages/CommunicationLabAdmin'));
const MyInterviewsPage = lazy(() => import('./pages/MyInterviews'));

// Scheduled Interview Module


interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRoles?: string[];
  requiredPermissions?: string[];
}

// Map each route-level role to the key permissions that define it
// Used to grant custom role users access to routes they have permissions for
const ROLE_TO_PERMISSIONS: Record<string, string[]> = {
  'SUPER_ADMIN': ['manage_tenants', 'manage_all_users', 'manage_system_settings'],
  'TENANT_ADMIN': ['manage_tenant_users', 'manage_roles', 'manage_tenant', 'manage_tenant_settings', 'manage_leads', 'manage_marketing', 'view_leads', 'create_leads', 'edit_leads', 'delete_leads', 'assign_leads', 'export_leads', 'view_lead_analytics', 'manage_lead_stages', 'convert_leads', 'manage_interview_templates', 'assign_interviews', 'evaluate_interviews'],
  'INSTRUCTOR': ['create_courses', 'edit_courses', 'manage_own_courses', 'create_quiz', 'create_question', 'manage_assignments', 'grade_assignments', 'manage_snippets', 'grade_snippets', 'manage_interview_templates', 'assign_interviews', 'evaluate_interviews'],
  'ATTENDANCE_ADMIN': ['mark_attendance'],
  'STAFF': ['mark_attendance', 'view_attendance', 'view_reports', 'manage_tenant_users', 'create_courses', 'view_leads', 'create_leads', 'edit_leads', 'assign_leads', 'view_lead_analytics', 'export_leads', 'convert_leads'],
  'STUDENT': ['enroll_courses', 'submit_assignments', 'view_quiz', 'take_interviews', 'view_snippets', 'attempt_interviews'],
};

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requiredRoles
}) => {
  const { isAuthenticated, loading, user } = useAuth();
  const { pathname } = useLocation();

  if (loading) return <Spinner fullScreen />;

  if (!isAuthenticated) {
    // Send CareerPilot members to the CareerPilot login, not the LMS one. This covers
    // logging out (logout() only clears state — the redirect happens here when the guard
    // re-runs) and a session expiring mid-visit. `replace` so the back button does not
    // return to a page they are no longer allowed to see.
    return <Navigate to={loginPathFor(pathname)} replace />;
  }

  if (requiredRoles && user && !requiredRoles.includes(user.role)) {
    // If user has permissions (custom role), check if they have any permission
    // that would be associated with the required roles
    if (user.permissions && user.permissions.length > 0) {
      const impliedPermissions = requiredRoles.flatMap(r => ROLE_TO_PERMISSIONS[r] || []);
      const hasAccess = impliedPermissions.some(p => user.permissions!.includes(p));
      if (hasAccess) {
        return <>{children}</>;
      }
    }
    return <Navigate to="/dashboard" />;
  }

  return <>{children}</>;
};

// Wraps student routes to check if a feature is enabled by admin
const FeatureRoute: React.FC<{ feature: keyof StudentFeatures; children: React.ReactNode }> = ({ feature, children }) => {
  const { isFeatureEnabled } = useStudentFeatures();
  const { user } = useAuth();
  
  if (user?.role === 'STUDENT' && !isFeatureEnabled(feature)) {
    return <Navigate to="/dashboard" />;
  }
  return <>{children}</>;
};

// Hot lead real-time notification toast — staff/admin only, never shown to students
const HotLeadToast: React.FC = () => {
  const { onHotLeadCreated, offHotLeadCreated } = useSocket();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [toasts, setToasts] = useState<Array<{ id: number; leadId: string; leadName: string; source: string }>>([]);

  const isStaff = user && user.role !== 'STUDENT';

  useEffect(() => {
    if (!isStaff) return;
    onHotLeadCreated((data: any) => {
      const id = Date.now();
      setToasts(prev => [...prev, { id, leadId: data.leadId, leadName: data.leadName, source: data.source }]);
      setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 8000);
    });
    return () => offHotLeadCreated();
  }, [onHotLeadCreated, offHotLeadCreated, isStaff]);

  if (toasts.length === 0) return null;

  return (
    <div style={{ position: 'fixed', top: 16, right: 16, zIndex: 99999, display: 'flex', flexDirection: 'column', gap: 8 }}>
      {toasts.map(t => (
        <div
          key={t.id}
          onClick={() => navigate(`/leads/${t.leadId}`)}
          style={{
            background: '#7f1d1d',
            color: '#fff',
            padding: '12px 18px',
            borderRadius: 8,
            boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
            cursor: 'pointer',
            maxWidth: 320,
            fontSize: '0.9rem',
            lineHeight: 1.4,
            borderLeft: '4px solid #ef4444',
          }}
        >
          <div style={{ fontWeight: 700, marginBottom: 2 }}>🔥 New Hot Lead!</div>
          <div>{t.leadName}</div>
          {t.source && <div style={{ opacity: 0.7, fontSize: '0.8rem' }}>Source: {t.source}</div>}
        </div>
      ))}
    </div>
  );
};

/**
 * Redirect that keeps :params, ?query and #hash.
 *
 * Three things get dropped by a naive redirect, and each one lands the member somewhere
 * that looks fine and isn't:
 *
 *  - **:params.** `<LegacyRedirect to="/careerpilot/practice/:id" />` used the pattern
 *    LITERALLY as the destination, so /passport/practice/abc123 navigated to the string
 *    "/careerpilot/practice/:id" — the address bar really did read `:id`, and the page
 *    then looked up a problem by that name and found nothing.
 *  - **?query.** /passport/practice?kind=coding landed on the practice list unfiltered:
 *    right page, wrong content.
 *  - **#hash.** Deep links to a section lost their anchor.
 *
 * Mission links stored in the database, saved bookmarks, and anything already sent by
 * email all arrive through here, so this has to keep working indefinitely.
 */
const LegacyRedirect: React.FC<{ to: string }> = ({ to }) => {
  const { search, hash } = useLocation();
  const params = useParams();
  const target = to.replace(/:([A-Za-z0-9_]+)/g, (whole, name: string) => {
    const value = params[name];
    // Leave an unmatched token alone rather than substituting "undefined" — a visibly
    // wrong URL is easier to diagnose than one that looks plausible and 404s.
    return value === undefined ? whole : encodeURIComponent(value);
  });
  return <Navigate to={`${target}${search}${hash}`} replace />;
};

/**
 * What a route shows while its chunk is arriving.
 *
 * Every page is now its own chunk (see the lazy() imports above), so navigating to a route
 * the browser has not visited fetches a small file first. On a fast connection that is
 * imperceptible; on a phone in an exam hall it is a beat, and a beat with a spinner in it
 * reads as loading rather than as nothing happening.
 *
 * Deliberately full-height and centred: a fallback that collapses to nothing makes the page
 * jump when the chunk lands.
 */
const RouteFallback: React.FC = () => (
  <div style={{
    minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
  }}>
    <Spinner />
  </div>
);

/** Each route fetches only what it needs, behind this one Suspense boundary. */
const AppRoutes: React.FC = () => {
  return (
    <Suspense fallback={<RouteFallback />}>
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/careerpilot/join" element={<PassportJoin />} />
      <Route path="/passport/join" element={<LegacyRedirect to="/careerpilot/join" />} />
      <Route path="/careerpilot/login" element={<PassportLogin />} />
      <Route path="/passport/login" element={<LegacyRedirect to="/careerpilot/login" />} />
      <Route path="/careerpilot/card/:slug" element={<PassportCard />} />
      {/* Card links live in recruiters' inboxes; this redirect can never be removed. */}
      <Route path="/passport/card/:slug" element={<LegacyRedirect to="/careerpilot/card/:slug" />} />
      {/* ── Hackathon exam (no auth — a team was given a code, not an account) ── */}
      <Route path="/hackathon-exam/:token" element={<HackathonExam />} />
      <Route path="/hackathon-exam/enter/:slug" element={<HackathonExam />} />
      <Route path="/hackathon-exam" element={<HackathonExam />} />

      {/* ── Public Tech Battles (no auth) ── */}
      <Route path="/battles" element={<BattleList />} />
      <Route path="/battles/exam/:token" element={<BattleExam />} />
      <Route path="/battles/:slug/leaderboard" element={<BattleLeaderboard />} />
      <Route path="/battles/:slug" element={<BattleLanding />} />
      <Route path="/create-organization" element={<CreateOrganizationPage />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/certificate/:type/:token" element={<CertificatePage />} />
      <Route path="/verify/:code" element={<CertificateVerify />} />
      <Route path="/candidate/:token" element={<CandidateProfile />} />
      <Route path="/resume/view/:token" element={<PublicResumeView />} />
      <Route path="/quiz/:token" element={<QuizSession />} />
      <Route path="/assessment/:tenantId" element={<AssessmentLanding />} />
      <Route path="/assessment/:tenantId/register" element={<AssessmentRegister />} />
      <Route path="/assessment/exam/:token" element={<AssessmentExam />} />
      <Route path="/assessment/result/:token" element={<AssessmentResult />} />

      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Layout>
              <DashboardPage />
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/assessment-admin"
        element={
          <ProtectedRoute requiredRoles={['TENANT_ADMIN', 'SUPER_ADMIN', 'INSTRUCTOR', 'MANAGER']}>
            <Layout>
              <AssessmentAdmin />
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/assessment-candidates"
        element={
          <ProtectedRoute requiredRoles={['TENANT_ADMIN', 'SUPER_ADMIN', 'INSTRUCTOR', 'MANAGER']}>
            <Layout>
              <AssessmentCandidates />
            </Layout>
          </ProtectedRoute>
        }
      />

      {/* ── Hackathon exam (admin) ── */}
      <Route path="/hackathons/:hackathonId/exam" element={
        <ProtectedRoute requiredRoles={['TENANT_ADMIN', 'SUPER_ADMIN', 'INSTRUCTOR', 'STAFF']}><Layout><HackathonExamAdmin /></Layout></ProtectedRoute>
      } />

      {/* ── Tech Battles (admin) ── */}
      <Route path="/admin/battles" element={
        <ProtectedRoute requiredRoles={['TENANT_ADMIN', 'SUPER_ADMIN', 'INSTRUCTOR', 'STAFF']}><Layout><BattlesAdmin /></Layout></ProtectedRoute>
      } />
      <Route path="/admin/battles/:id" element={
        <ProtectedRoute requiredRoles={['TENANT_ADMIN', 'SUPER_ADMIN', 'INSTRUCTOR', 'STAFF']}><Layout><BattleDetail /></Layout></ProtectedRoute>
      } />

      {/* Public: the link in the hackathon email and WhatsApp. No auth — the registration
          code is the credential, and the page shows only the team's own details. */}
      <Route path="/hackathons/resume/:code" element={<HackathonResume />} />

      {/* ── Hackathons (public registrations, admin side) ── */}
      <Route path="/admin/hackathons" element={
        <ProtectedRoute requiredRoles={['TENANT_ADMIN', 'SUPER_ADMIN', 'INSTRUCTOR', 'STAFF']}><Layout><HackathonsAdmin /></Layout></ProtectedRoute>
      } />
      <Route path="/admin/hackathons/:id" element={
        <ProtectedRoute requiredRoles={['TENANT_ADMIN', 'SUPER_ADMIN', 'INSTRUCTOR', 'STAFF']}><Layout><HackathonDetail /></Layout></ProtectedRoute>
      } />

      {/* ── CareerPilot (separate product) ── */}
      <Route path="/admin/passport/assessment-coverage" element={
        <ProtectedRoute requiredRoles={['TENANT_ADMIN', 'SUPER_ADMIN']}><Layout><CareerPilotCoverage /></Layout></ProtectedRoute>
      } />
      <Route path="/admin/passport/concepts" element={
        <ProtectedRoute requiredRoles={['TENANT_ADMIN', 'SUPER_ADMIN']}><Layout><CareerPilotConcepts /></Layout></ProtectedRoute>
      } />
      <Route path="/admin/passport/config" element={
        <ProtectedRoute requiredRoles={['TENANT_ADMIN', 'SUPER_ADMIN']}><Layout><PassportAdminConfig /></Layout></ProtectedRoute>
      } />
      <Route path="/admin/careerpilot/staging" element={
        <ProtectedRoute requiredRoles={['TENANT_ADMIN', 'SUPER_ADMIN']}><Layout><CareerPilotStaging /></Layout></ProtectedRoute>
      } />
      <Route path="/admin/careerpilot/paper-design" element={
        <ProtectedRoute requiredRoles={['TENANT_ADMIN', 'SUPER_ADMIN']}><Layout><CareerPilotPaperDesign /></Layout></ProtectedRoute>
      } />
      <Route path="/admin/passport/students" element={
        <ProtectedRoute requiredRoles={['TENANT_ADMIN', 'SUPER_ADMIN', 'STAFF']}><Layout><PassportAdminStudents /></Layout></ProtectedRoute>
      } />
      {/* Why THIS member got THESE missions. The endpoint existed with no screen calling
          it, so the only way to answer that question was a database query. */}
      <Route path="/admin/passport/students/:studentId/roadmap" element={
        <ProtectedRoute requiredRoles={['TENANT_ADMIN', 'SUPER_ADMIN', 'STAFF']}><Layout><PassportAdminStudentRoadmap /></Layout></ProtectedRoute>
      } />
      <Route path="/admin/passport/analytics" element={
        <ProtectedRoute requiredRoles={['TENANT_ADMIN', 'SUPER_ADMIN']}><Layout><PassportAdminAnalytics /></Layout></ProtectedRoute>
      } />
      <Route path="/admin/passport/companies" element={
        <ProtectedRoute requiredRoles={['TENANT_ADMIN', 'SUPER_ADMIN']}><Layout><PassportAdminCompanies /></Layout></ProtectedRoute>
      } />
      <Route path="/admin/passport/news" element={
        <ProtectedRoute requiredRoles={['TENANT_ADMIN', 'SUPER_ADMIN']}><Layout><PassportAdminNews /></Layout></ProtectedRoute>
      } />
      <Route path="/admin/passport/coins" element={
        <ProtectedRoute requiredRoles={['TENANT_ADMIN', 'SUPER_ADMIN']}><Layout><PassportAdminCoins /></Layout></ProtectedRoute>
      } />
      <Route path="/admin/passport/funnel" element={
        <ProtectedRoute requiredRoles={['TENANT_ADMIN', 'SUPER_ADMIN']}><Layout><PassportAdminFunnel /></Layout></ProtectedRoute>
      } />
      <Route path="/admin/passport/curriculum" element={
        <ProtectedRoute requiredRoles={['TENANT_ADMIN', 'SUPER_ADMIN']}><Layout><PassportAdminCurriculum /></Layout></ProtectedRoute>
      } />
      <Route path="/admin/passport/pathways" element={
        <ProtectedRoute requiredRoles={['TENANT_ADMIN', 'SUPER_ADMIN']}><Layout><PassportAdminPathways /></Layout></ProtectedRoute>
      } />
      <Route path="/admin/passport/pathway-rules" element={
        <ProtectedRoute requiredRoles={['TENANT_ADMIN', 'SUPER_ADMIN']}><Layout><PassportAdminPathwayRules /></Layout></ProtectedRoute>
      } />
      <Route path="/admin/passport/career-roles" element={
        <ProtectedRoute requiredRoles={['TENANT_ADMIN', 'SUPER_ADMIN']}><Layout><PassportAdminCareerRoles /></Layout></ProtectedRoute>
      } />
      <Route path="/admin/passport/skills" element={
        <ProtectedRoute requiredRoles={['TENANT_ADMIN', 'SUPER_ADMIN']}><Layout><PassportAdminSkillGraph /></Layout></ProtectedRoute>
      } />
      {/* What a student with NO chosen role is measured against. The role blueprint
          answered that for everyone else; a first-year who says "not sure" had no list. */}
      {/* The ordered journey for a concept: what a student meets first, and what follows.
          Sits beside Concept Bank rather than replacing it — the bank owns the material,
          this owns the sequence. */}
      <Route path="/admin/passport/learning-studio" element={
        <ProtectedRoute requiredRoles={['TENANT_ADMIN', 'SUPER_ADMIN']}><Layout><PassportLearningStudio /></Layout></ProtectedRoute>
      } />
      <Route path="/admin/passport/learning-studio/:skillKey" element={
        <ProtectedRoute requiredRoles={['TENANT_ADMIN', 'SUPER_ADMIN']}><Layout><PassportLearningUnit /></Layout></ProtectedRoute>
      } />
      {/* What people actually did, in order, including the visits that never became an
          account. Separate from /admin/logs, which answers "what went wrong for this
          student" and needs a student to answer it at all. */}
      <Route path="/admin/passport/activity" element={
        <ProtectedRoute requiredRoles={['TENANT_ADMIN', 'SUPER_ADMIN']}><Layout><PassportAdminActivity /></Layout></ProtectedRoute>
      } />
      <Route path="/admin/passport/stage-skills" element={
        <ProtectedRoute requiredRoles={['TENANT_ADMIN', 'SUPER_ADMIN']}><Layout><PassportAdminStageSkills /></Layout></ProtectedRoute>
      } />
      <Route path="/admin/passport/role-blueprints" element={
        <ProtectedRoute requiredRoles={['TENANT_ADMIN', 'SUPER_ADMIN']}><Layout><PassportAdminRoleBlueprint /></Layout></ProtectedRoute>
      } />
      <Route path="/admin/passport/skill-evidence" element={
        <ProtectedRoute requiredRoles={['TENANT_ADMIN', 'SUPER_ADMIN']}><Layout><PassportAdminSkillEvidence /></Layout></ProtectedRoute>
      } />
      {/* AI drafts questions; a person approves them. Nothing reaches a student unreviewed. */}
      <Route path="/admin/passport/question-drafts" element={
        <ProtectedRoute requiredRoles={['TENANT_ADMIN', 'SUPER_ADMIN']}><Layout><PassportAdminQuestionDrafts /></Layout></ProtectedRoute>
      } />
      {/* The approved bank. Drafting shows only what is still pending, so before this there
          was no screen that could reach a question once it had been approved. */}
      <Route path="/admin/passport/question-bank" element={
        <ProtectedRoute requiredRoles={['TENANT_ADMIN', 'SUPER_ADMIN']}><Layout><PassportAdminQuestionBank /></Layout></ProtectedRoute>
      } />
      <Route path="/admin/passport/assessment-preview" element={
        <ProtectedRoute requiredRoles={['TENANT_ADMIN', 'SUPER_ADMIN']}><Layout><PassportAdminAssessmentPreview /></Layout></ProtectedRoute>
      } />
      {/* Paper shape per stage — question count, skills covered, difficulty mix, timer. */}
      <Route path="/admin/passport/assessment-shape" element={
        <ProtectedRoute requiredRoles={['TENANT_ADMIN', 'SUPER_ADMIN']}><Layout><PassportAdminAssessmentShape /></Layout></ProtectedRoute>
      } />
      <Route path="/admin/passport/assessment" element={
        <ProtectedRoute requiredRoles={['TENANT_ADMIN', 'SUPER_ADMIN']}><Layout><PassportAdminAssessment /></Layout></ProtectedRoute>
      } />
      <Route path="/admin/passport/missions" element={
        <ProtectedRoute requiredRoles={['TENANT_ADMIN', 'SUPER_ADMIN']}><Layout><PassportAdminMissions /></Layout></ProtectedRoute>
      } />
      {/* Student Passport surfaces — deliberately NOT the LMS Layout (separate product) */}
      {/* Layout route: MemberShell mounts ONCE here and only <Outlet/> swaps, so the
          sidebar no longer remounts (and re-fetches) on every nav click. */}
      <Route element={<ProtectedRoute><PassportMemberLayout /></ProtectedRoute>}>
        <Route path="/careerpilot" element={<PassportHome />} />
        <Route path="/passport" element={<LegacyRedirect to="/careerpilot" />} />
        {/* CareerPilot onboarding — inside the member shell, so the rail and chrome
            stay put rather than the member dropping into a separate application. */}
        <Route path="/careerpilot/setup" element={<PassportCareerSetup />} />
        {/* The legacy Career Readiness questionnaire is retired: its submit endpoint is
            gone, so the paper could be opened and never handed in. Members go to the
            skill assessment, which is the instrument everything downstream reads. */}
        <Route path="/careerpilot/assessment" element={<Navigate to="/careerpilot/skill-assessment" replace />} />
        <Route path="/passport/assessment" element={<LegacyRedirect to="/careerpilot/assessment" />} />
        <Route path="/careerpilot/roadmap" element={<PassportRoadmap />} />
        <Route path="/careerpilot/skills" element={<PassportSkillDna />} />
        <Route path="/careerpilot/readiness" element={<PassportRoleReadiness />} />
        {/* Resume readiness and interview readiness, beside the skill figure and never
            blended with it (Module 14). */}
        <Route path="/careerpilot/placement" element={<PassportPlacementReadiness />} />
        {/* The personalised skill assessment (Modules 6-7). Distinct from
            /careerpilot/assessment, which is the free career-readiness questionnaire. */}
        <Route path="/careerpilot/skill-assessment" element={<PassportSkillAssessment />} />
        {/* Progress, badges and leaderboards. Engagement only — never a capability signal. */}
        {/*
          AI Mentor, mounted INSIDE the member shell rather than linked out to /ai-mentor.
          
          The page itself is the same component either way - it depends on nothing but its own
          api module. What differs is the chrome: /ai-mentor wraps it in the main LMS Layout, so
          a CareerPilot member who opened it from the rail would land in a different application
          with a different sidebar and no way back to CareerPilot. Mounting it here keeps the
          rail, the streak and the level on screen, which is what makes it feel like part of
          CareerPilot instead of a link out of it.
          
          /ai-mentor stays exactly as it was, for everybody who reaches it from the LMS sidebar.
        */}
        <Route path="/careerpilot/mentor" element={<AIMentor />} />
        {/* Code Playground, mounted in the shell for the same reason as the mentor above:
            /playground wraps it in the LMS Layout, which would drop a CareerPilot member into a
            different application. The component is unchanged; only the chrome differs. */}
        <Route path="/careerpilot/playground" element={<CodePlayground />} />
        <Route path="/careerpilot/visualizer" element={<CodeVisualizer />} />
        <Route path="/careerpilot/visualizer/:slug" element={<CodeVisualizerWorkspace />} />
        <Route path="/careerpilot/progress" element={<PassportGamification />} />
        {/* Coins buy rewards; XP never does. */}
        <Route path="/careerpilot/rewards" element={<PassportRewards />} />
        <Route path="/passport/roadmap" element={<LegacyRedirect to="/careerpilot/roadmap" />} />
        {/*
          Built-ins ONLY. Left on the default 'all', this listed the admin-authored bank as
          well, so every Thinking Lab problem appeared on both screens — the same problem
          under two names, which is worse than having no second screen at all.
        */}
        <Route path="/careerpilot/practice" element={<PassportPractice source="builtin" />} />
        <Route path="/passport/practice" element={<LegacyRedirect to="/careerpilot/practice" />} />
        <Route path="/careerpilot/practice/:id" element={<PassportPracticeItem />} />
        {/* A material an admin wrote. Materials without an external URL were dropped by the
            mission engine, so a full lesson could be authored with nowhere to open it. */}
        <Route path="/careerpilot/material/:id" element={<PassportMaterialViewer />} />
        {/*
          Thinking Lab reuses the Practice screen against the admin-authored bank. A problem
          opened from either list lands on the same /careerpilot/practice/:id, because the id
          already carries its source — the bank rows are prefixed `db:`.
        */}
        {/*
          Communication Lab, inside the member layout so it gets the rail.
          Registered outside this block first, it rendered as a bare page with no navigation
          — PassportShell is only a metabar passthrough; the rail comes from the layout route
          above, and a member route that skips it strands the member with no way back.
        */}
        <Route path="/careerpilot/communication" element={<CommunicationLab />} />
        <Route path="/careerpilot/thinking-lab" element={
          <PassportPractice
            source="bank"
            heading="Thinking Lab"
            blurb="Problems set by your mentors, with difficulty, XP and how many people have solved each one. Your code compiles and runs here."
          />
        } />
        <Route path="/passport/practice/:id" element={<LegacyRedirect to="/careerpilot/practice/:id" />} />
        <Route path="/careerpilot/interview" element={<PassportInterview />} />
        <Route path="/passport/interview" element={<LegacyRedirect to="/careerpilot/interview" />} />
        <Route path="/careerpilot/coins" element={<PassportCoins />} />
        {/* The SAME profile wizard the LMS uses, inside the CareerPilot member
            layout instead of the LMS one. One form, one studentprofiles record,
            one completion score — a second form would disagree about what a
            complete profile is. */}
        <Route path="/careerpilot/profile" element={<StudentProfilePage />} />
        <Route path="/careerpilot/leaderboard" element={<PassportLeaderboard />} />
        <Route path="/careerpilot/achievements" element={<PassportAchievements />} />
        <Route path="/careerpilot/news" element={<PassportNews />} />
        <Route path="/careerpilot/companies" element={<PassportCompanies />} />
        <Route path="/careerpilot/companies/:slug" element={<PassportCompanies />} />
        <Route path="/careerpilot/mock-test/:id" element={<PassportMockTest />} />
        <Route path="/passport/coins" element={<LegacyRedirect to="/careerpilot/coins" />} />
        <Route path="/careerpilot/resume" element={<PassportResumeCenter />} />
        <Route path="/passport/resume" element={<LegacyRedirect to="/careerpilot/resume" />} />
      </Route>

      <Route
        path="/interview-questions/:chapterId"
        element={
          <ProtectedRoute requiredRoles={['STUDENT']}>
            <FeatureRoute feature="myCourse">
              <Layout>
                <InterviewQuestionsPage />
              </Layout>
            </FeatureRoute>
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/recording-diagnostics"
        element={
          <ProtectedRoute requiredRoles={['SUPER_ADMIN', 'TENANT_ADMIN', 'INSTRUCTOR']}>
            <Layout>
              <RecordingDiagnostics />
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/platform-settings"
        element={
          <ProtectedRoute requiredRoles={['SUPER_ADMIN']}>
            <Layout>
              <PlatformSettings />
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/my-leave"
        element={
          <ProtectedRoute requiredRoles={['STUDENT']}>
            <Layout>
              <MyLeave />
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/playground"
        element={
          <ProtectedRoute requiredRoles={['STUDENT', 'SUPER_ADMIN', 'TENANT_ADMIN', 'INSTRUCTOR']}>
            <Layout>
              <CodePlayground />
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/project-builder"
        element={
          <ProtectedRoute requiredRoles={['STUDENT', 'SUPER_ADMIN', 'TENANT_ADMIN', 'INSTRUCTOR']}>
            <Layout>
              <ProjectBuilder />
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/job-tracker"
        element={
          <ProtectedRoute requiredRoles={['STUDENT', 'SUPER_ADMIN', 'TENANT_ADMIN', 'INSTRUCTOR']}>
            <Layout>
              <JobTracker />
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/ai-mentor"
        element={
          <ProtectedRoute requiredRoles={['STUDENT', 'SUPER_ADMIN', 'TENANT_ADMIN', 'INSTRUCTOR']}>
            <Layout>
              <AIMentor />
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/resource-library"
        element={
          <ProtectedRoute requiredRoles={['STUDENT', 'SUPER_ADMIN', 'TENANT_ADMIN', 'INSTRUCTOR']}>
            <Layout>
              <ResourceLibrary />
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/resources"
        element={
          <ProtectedRoute requiredRoles={['SUPER_ADMIN', 'TENANT_ADMIN', 'INSTRUCTOR']}>
            <Layout>
              <ResourceAdmin />
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/speaking-practice"
        element={
          <ProtectedRoute requiredRoles={['STUDENT', 'SUPER_ADMIN', 'TENANT_ADMIN', 'INSTRUCTOR']}>
            <Layout>
              <SpeakingPractice />
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/speaking-tasks"
        element={
          <ProtectedRoute requiredRoles={['SUPER_ADMIN', 'TENANT_ADMIN', 'INSTRUCTOR']}>
            <Layout>
              <SpeakingAdmin />
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/logic-gym"
        element={
          <ProtectedRoute requiredRoles={['STUDENT', 'SUPER_ADMIN', 'TENANT_ADMIN', 'INSTRUCTOR']}>
            <Layout>
              <LogicGym />
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/problem-solving"
        element={
          <ProtectedRoute requiredRoles={['SUPER_ADMIN', 'TENANT_ADMIN', 'INSTRUCTOR']}>
            <Layout>
              <DrillsAdmin />
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/thinking-lab"
        element={
          <ProtectedRoute requiredRoles={['STUDENT', 'SUPER_ADMIN', 'TENANT_ADMIN', 'INSTRUCTOR']}>
            <Layout>
              <ThinkingLab />
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/hms-classes"
        element={
          <ProtectedRoute requiredRoles={['STUDENT', 'SUPER_ADMIN', 'TENANT_ADMIN', 'INSTRUCTOR']}>
            <Layout>
              <HmsClassesPage />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/ai-communication-lab"
        element={
          <ProtectedRoute requiredRoles={['STUDENT', 'SUPER_ADMIN', 'TENANT_ADMIN', 'INSTRUCTOR']}>
            <Layout>
              <CommunicationLab />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/communication-lab"
        element={
          <ProtectedRoute requiredRoles={['SUPER_ADMIN', 'TENANT_ADMIN', 'INSTRUCTOR']}>
            <Layout>
              <CommunicationLabAdmin />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/hms-classes/:id/room"
        element={
          <ProtectedRoute requiredRoles={['STUDENT', 'SUPER_ADMIN', 'TENANT_ADMIN', 'INSTRUCTOR']}>
            <HmsRoomPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/visualizer"
        element={
          <ProtectedRoute requiredRoles={['STUDENT', 'SUPER_ADMIN', 'TENANT_ADMIN', 'INSTRUCTOR', 'STAFF']}>
            <Layout>
              <CodeVisualizer />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/visualizer/:slug"
        element={
          <ProtectedRoute requiredRoles={['STUDENT', 'SUPER_ADMIN', 'TENANT_ADMIN', 'INSTRUCTOR', 'STAFF']}>
            <Layout>
              <CodeVisualizerWorkspace />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/visualizer"
        element={
          <ProtectedRoute requiredRoles={['SUPER_ADMIN', 'TENANT_ADMIN', 'INSTRUCTOR']}>
            <Layout>
              <CodeVisualizerAdmin />
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/thinking-lab"
        element={
          <ProtectedRoute requiredRoles={['SUPER_ADMIN', 'TENANT_ADMIN', 'INSTRUCTOR']}>
            <Layout>
              <ThinkingLabAdmin />
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/certificates"
        element={
          <ProtectedRoute requiredRoles={['SUPER_ADMIN', 'TENANT_ADMIN', 'INSTRUCTOR']}>
            <Layout>
              <CertificatesAdmin />
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/ai-spend"
        element={
          <ProtectedRoute requiredRoles={['SUPER_ADMIN', 'TENANT_ADMIN']}>
            <Layout>
              <AiSpend />
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/leave-requests"
        element={
          <ProtectedRoute requiredRoles={['SUPER_ADMIN', 'TENANT_ADMIN', 'INSTRUCTOR']}>
            <Layout>
              <LeaveRequests />
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/users"
        element={
          <ProtectedRoute requiredRoles={['SUPER_ADMIN', 'TENANT_ADMIN']}>
            <Layout>
              <UsersPage />
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/fees"
        element={
          <ProtectedRoute requiredRoles={['SUPER_ADMIN', 'TENANT_ADMIN', 'STAFF']} requiredPermissions={['manage_billing']}>
            <Layout>
              <FeesPage />
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/bulk-upload"
        element={
          <ProtectedRoute requiredRoles={['SUPER_ADMIN', 'TENANT_ADMIN']}>
            <Layout>
              <BulkUploadPage />
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/roles"
        element={
          <ProtectedRoute>
            <Layout>
              <RolesPage />
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/batches"
        element={
          <ProtectedRoute requiredRoles={['SUPER_ADMIN', 'TENANT_ADMIN']}>
            <Layout>
              <BatchesPage />
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/attendance"
        element={
          <ProtectedRoute requiredRoles={['SUPER_ADMIN', 'TENANT_ADMIN', 'ATTENDANCE_ADMIN', 'INSTRUCTOR', 'STAFF']}>
            <Layout>
              <AttendancePage />
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/my-attendance"
        element={
          <ProtectedRoute>
            <FeatureRoute feature="attendance">
              <Layout>
                <MyAttendancePage />
              </Layout>
            </FeatureRoute>
          </ProtectedRoute>
        }
      />

      <Route
        path="/attendance-reports"
        element={
          <ProtectedRoute requiredRoles={['SUPER_ADMIN', 'TENANT_ADMIN', 'ATTENDANCE_ADMIN', 'INSTRUCTOR', 'STAFF']}>
            <Layout>
              <AttendanceReportsPage />
            </Layout>
          </ProtectedRoute>
        }
      />

      {/* Student Reports merged into the unified Student Detail page (reached from Users) */}
      <Route path="/student-reports" element={<Navigate to="/users" replace />} />

      <Route
        path="/admin/college/departments"
        element={
          <ProtectedRoute requiredRoles={['SUPER_ADMIN', 'TENANT_ADMIN']}>
            <Layout>
              <DepartmentsPage />
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/college/settings"
        element={
          <ProtectedRoute requiredRoles={['SUPER_ADMIN', 'TENANT_ADMIN']}>
            <Layout>
              <CollegeSettingsPage />
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/college/members"
        element={
          <ProtectedRoute requiredRoles={['SUPER_ADMIN', 'TENANT_ADMIN']}>
            <Layout>
              <CollegeMembersPage />
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/college/placement"
        element={
          <ProtectedRoute requiredRoles={['SUPER_ADMIN', 'TENANT_ADMIN', 'PLACEMENT_OFFICER']}>
            <Layout>
              <PlacementDrivesPage />
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/college/placement-analytics"
        element={
          <ProtectedRoute requiredRoles={['SUPER_ADMIN', 'TENANT_ADMIN', 'PLACEMENT_OFFICER']}>
            <Layout>
              <PlacementAnalyticsPage />
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/college/alumni"
        element={
          <ProtectedRoute requiredRoles={['SUPER_ADMIN', 'TENANT_ADMIN']}>
            <Layout>
              <AlumniManagementPage />
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/college/curriculum"
        element={
          <ProtectedRoute requiredRoles={['SUPER_ADMIN', 'TENANT_ADMIN']}>
            <Layout>
              <CollegeCurriculumPage />
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/college/crt"
        element={
          <ProtectedRoute requiredRoles={['SUPER_ADMIN', 'TENANT_ADMIN', 'CRT_TRAINER']}>
            <Layout>
              <CRTManagementPage />
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/super-admin/tenants"
        element={
          <ProtectedRoute requiredRoles={['SUPER_ADMIN']}>
            <Layout>
              <TenantManagementPage />
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/student/college"
        element={
          <ProtectedRoute>
            <Layout>
              <StudentCollegePortal />
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/student/fee-details"
        element={
          <ProtectedRoute>
            <FeatureRoute feature="feeDetails">
              <Layout>
                <StudentFeeDetailsPage />
              </Layout>
            </FeatureRoute>
          </ProtectedRoute>
        }
      />

      <Route
        path="/student/my-applications"
        element={
          <ProtectedRoute>
            <Layout>
              <MyApplicationsPage />
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/student/alumni-directory"
        element={
          <ProtectedRoute>
            <Layout>
              <AlumniDirectoryPage />
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/notifications"
        element={
          <ProtectedRoute>
            <Layout>
              <NotificationCenterPage />
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/college/reports"
        element={
          <ProtectedRoute requiredRoles={['SUPER_ADMIN', 'TENANT_ADMIN']}>
            <Layout>
              <DeptReportsPage />
            </Layout>
          </ProtectedRoute>
        }
      />

      {/* Student Profiles list merged into Users; keep the list route as a redirect */}
      <Route path="/admin/student-profiles" element={<Navigate to="/users" replace />} />

      {/* Unified Student Detail (reached by clicking a student in Users) */}
      <Route
        path="/lab-tracks"
        element={<ProtectedRoute><Layout><LabTracks /></Layout></ProtectedRoute>}
      />
      <Route
        path="/users/:userId"
        element={
          <ProtectedRoute requiredRoles={['SUPER_ADMIN', 'TENANT_ADMIN', 'INSTRUCTOR', 'STAFF']}>
            <Layout>
              <StudentProfileDetail />
            </Layout>
          </ProtectedRoute>
        }
      />

      {/* Back-compat: old detail URL still works */}
      <Route
        path="/admin/student-profiles/:userId"
        element={
          <ProtectedRoute requiredRoles={['SUPER_ADMIN', 'TENANT_ADMIN', 'INSTRUCTOR', 'STAFF']}>
            <Layout>
              <StudentProfileDetail />
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/quiz-management"
        element={
          <ProtectedRoute requiredRoles={['SUPER_ADMIN', 'TENANT_ADMIN', 'INSTRUCTOR']}>
            <Layout>
              <QuizManagementPage />
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/quiz-results"
        element={
          <ProtectedRoute requiredRoles={['SUPER_ADMIN', 'TENANT_ADMIN', 'INSTRUCTOR']}>
            <Layout>
              <QuizResultsAdminPage />
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/interview-question-bank"
        element={
          <ProtectedRoute requiredRoles={['SUPER_ADMIN', 'TENANT_ADMIN', 'INSTRUCTOR']}>
            <Layout>
              <InterviewQuestionBankPage />
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/question-bank"
        element={
          <ProtectedRoute requiredRoles={['SUPER_ADMIN', 'TENANT_ADMIN', 'INSTRUCTOR']}>
            <Layout>
              <QuestionManagementPage />
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/quiz/:quizId/questions"
        element={
          <ProtectedRoute requiredRoles={['SUPER_ADMIN', 'TENANT_ADMIN', 'INSTRUCTOR']}>
            <Layout>
              <QuestionBuilder />
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/quizzes"
        element={
          <ProtectedRoute>
            <FeatureRoute feature="quizzes">
              <Layout>
                <QuizzesPage />
              </Layout>
            </FeatureRoute>
          </ProtectedRoute>
        }
      />

      <Route
        path="/quiz/:quizId/take"
        element={
          <ProtectedRoute>
            <FeatureRoute feature="quizzes">
              <QuizTakingPage />
            </FeatureRoute>
          </ProtectedRoute>
        }
      />

      <Route
        path="/quiz/:quizId/results/:attemptId"
        element={
          <ProtectedRoute>
            <FeatureRoute feature="quizzes">
              <Layout>
                <QuizResultsPage />
              </Layout>
            </FeatureRoute>
          </ProtectedRoute>
        }
      />

      <Route
        path="/quiz-reports"
        element={
          <ProtectedRoute requiredRoles={['SUPER_ADMIN', 'TENANT_ADMIN', 'INSTRUCTOR']}>
            <Layout>
              <QuizReportsPage />
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/weekly-reports"
        element={
          <ProtectedRoute requiredRoles={['SUPER_ADMIN', 'TENANT_ADMIN', 'INSTRUCTOR']}>
            <Layout>
              <WeeklyReportsPage />
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <Layout>
              <StudentProfilePage />
            </Layout>
          </ProtectedRoute>
        }
      />

      {/* OAuth Callback - handles redirects from GitHub/LinkedIn */}
      <Route path="/profile/oauth-callback" element={<OAuthCallbackPage />} />

      <Route
        path="/admin/content"
        element={
          <ProtectedRoute requiredRoles={['SUPER_ADMIN', 'TENANT_ADMIN']}>
            <Layout>
              <AdminContentPage />
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/student-features"
        element={
          <ProtectedRoute requiredRoles={['SUPER_ADMIN', 'TENANT_ADMIN']}>
            <Layout>
              <StudentFeaturesPage />
            </Layout>
          </ProtectedRoute>
        }
      />

      {/* Onboarding Routes */}
      <Route path="/setup-password" element={<SetupPassword />} />
      
      <Route
        path="/complete-profile"
        element={
          <ProtectedRoute>
            <ProfileCompletion />
          </ProtectedRoute>
        }
      />

      {/* Assignment Routes - Admin */}
      <Route
        path="/admin/assignments"
        element={
          <ProtectedRoute requiredRoles={['SUPER_ADMIN', 'TENANT_ADMIN', 'INSTRUCTOR']}>
            <Layout>
              <AdminAssignmentList />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/assignments/create"
        element={
          <ProtectedRoute requiredRoles={['SUPER_ADMIN', 'TENANT_ADMIN', 'INSTRUCTOR']}>
            <Layout>
              <AdminAssignmentForm />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/assignments/:id/edit"
        element={
          <ProtectedRoute requiredRoles={['SUPER_ADMIN', 'TENANT_ADMIN', 'INSTRUCTOR']}>
            <Layout>
              <AdminAssignmentForm />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/assignments/:assignmentId/submissions"
        element={
          <ProtectedRoute requiredRoles={['SUPER_ADMIN', 'TENANT_ADMIN', 'INSTRUCTOR']}>
            <Layout>
              <AdminSubmissions />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/assignments/reports"
        element={
          <ProtectedRoute requiredRoles={['SUPER_ADMIN', 'TENANT_ADMIN', 'INSTRUCTOR']}>
            <Layout>
              <AssignmentReports />
            </Layout>
          </ProtectedRoute>
        }
      />

      {/* Assignment Routes - Student */}
      <Route
        path="/assignments"
        element={
          <ProtectedRoute>
            <FeatureRoute feature="assignments">
              <Layout>
                <StudentAssignmentList />
              </Layout>
            </FeatureRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/assignments/:assignmentId/workspace"
        element={
          <ProtectedRoute>
            <FeatureRoute feature="assignments">
              <AssignmentWorkspace />
            </FeatureRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/assignments/:assignmentId/result"
        element={
          <ProtectedRoute>
            <FeatureRoute feature="assignments">
              <Layout>
                <AssignmentResult />
              </Layout>
            </FeatureRoute>
          </ProtectedRoute>
        }
      />

      <Route path="/" element={<Navigate to="/dashboard" />} />

      {/* ── Resume Builder (Student) ─── */}
      <Route
        path="/resume-builder"
        element={
          <ProtectedRoute>
            <Layout>
              <ResumeBuilderPage />
            </Layout>
          </ProtectedRoute>
        }
      />

      {/* ── Career Profile Builder ─── */}
      <Route
        path="/career-profile"
        element={
          <ProtectedRoute>
            <Layout>
              <CareerProfilePage />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/career-profiles"
        element={
          <ProtectedRoute requiredRoles={['SUPER_ADMIN', 'TENANT_ADMIN', 'INSTRUCTOR']}>
            <Layout>
              <CareerProfileAdmin />
            </Layout>
          </ProtectedRoute>
        }
      />

      {/* ── Placement Partnership (Admin) ─── */}
      <Route
        path="/admin/placement-partnership"
        element={
          <ProtectedRoute requiredRoles={['SUPER_ADMIN', 'TENANT_ADMIN', 'STAFF']}>
            <Layout>
              <PlacementPartnership />
            </Layout>
          </ProtectedRoute>
        }
      />

      {/* ── Structured Interview Module (Admin/Instructor) ─── */}
      <Route
        path="/admin/interviews/templates"
        element={
          <ProtectedRoute requiredRoles={['SUPER_ADMIN', 'TENANT_ADMIN', 'INSTRUCTOR']}>
            <Layout>
              <InterviewTemplateList />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/interviews/templates/create"
        element={
          <ProtectedRoute requiredRoles={['SUPER_ADMIN', 'TENANT_ADMIN', 'INSTRUCTOR']}>
            <Layout>
              <InterviewTemplateCreate />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/interviews/templates/:templateId/edit"
        element={
          <ProtectedRoute requiredRoles={['SUPER_ADMIN', 'TENANT_ADMIN', 'INSTRUCTOR']}>
            <Layout>
              <InterviewTemplateCreate />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/interviews/question-bank"
        element={
          <ProtectedRoute requiredRoles={['SUPER_ADMIN', 'TENANT_ADMIN', 'INSTRUCTOR']}>
            <Layout>
              <InterviewQBManagement />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/interviews/assignments"
        element={
          <ProtectedRoute requiredRoles={['SUPER_ADMIN', 'TENANT_ADMIN', 'INSTRUCTOR']}>
            <Layout>
              <InterviewAssignment />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/interviews/analytics"
        element={
          <ProtectedRoute requiredRoles={['SUPER_ADMIN', 'TENANT_ADMIN', 'INSTRUCTOR']}>
            <Layout>
              <InterviewAnalytics />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/interviews/report/:attemptId"
        element={
          <ProtectedRoute requiredRoles={['SUPER_ADMIN', 'TENANT_ADMIN', 'INSTRUCTOR']}>
            <Layout>
              <InterviewFeedbackReport />
            </Layout>
          </ProtectedRoute>
        }
      />

      {/* ── Structured Interview Module (Student) ──────────── */}
      {/* Unified hub: AI virtual + mock interviews now both live in MyInterviews. */}
      <Route
        path="/student/interviews"
        element={
          <ProtectedRoute>
            <Layout>
              <MyInterviewsPage />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/student/interviews/take/:templateId"
        element={
          <ProtectedRoute>
            <Layout>
              <TakeStructuredInterview />
            </Layout>
          </ProtectedRoute>
        }
      />
      {/* Live conversational AI interview — full-screen, no sidebar */}
      <Route
        path="/student/interviews/live/:templateId"
        element={
          <ProtectedRoute>
            <LiveInterview />
          </ProtectedRoute>
        }
      />
      <Route
        path="/student/interviews/report/:attemptId"
        element={
          <ProtectedRoute>
            <Layout>
              <InterviewFeedbackReport />
            </Layout>
          </ProtectedRoute>
        }
      />

      {/* ── Scheduled Interviews (Admin/Instructor) ── */}
      <Route
        path="/scheduled-interviews"
        element={
          <ProtectedRoute requiredRoles={['SUPER_ADMIN', 'TENANT_ADMIN', 'INSTRUCTOR']}>
            <Layout>
              <ScheduledInterviewsPage />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/scheduled-interviews/:id"
        element={
          <ProtectedRoute requiredRoles={['SUPER_ADMIN', 'TENANT_ADMIN', 'INSTRUCTOR']}>
            <Layout>
              <InterviewDetailPage />
            </Layout>
          </ProtectedRoute>
        }
      />

      {/* ── My Interviews (Student) ── */}
      <Route
        path="/my-interviews"
        element={
          <ProtectedRoute>
            <FeatureRoute feature="scheduledInterviews">
              <Layout>
                <MyInterviewsPage />
              </Layout>
            </FeatureRoute>
          </ProtectedRoute>
        }
      />

      <Route path="*" element={<NotFoundPage />} />

      {/* Lead Management */}
      <Route
        path="/leads"
        element={
          <ProtectedRoute requiredRoles={['SUPER_ADMIN', 'TENANT_ADMIN', 'STAFF']}>
            <Layout>
              <LeadsPage />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/team-activity"
        element={
          <ProtectedRoute requiredRoles={['SUPER_ADMIN', 'TENANT_ADMIN']} requiredPermissions={['manage_leads', 'view_lead_analytics']}>
            <Layout>
              <TeamActivity />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/leads/:leadId"
        element={
          <ProtectedRoute requiredRoles={['SUPER_ADMIN', 'TENANT_ADMIN', 'STAFF']}>
            <Layout>
              <LeadDetailPage />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/lead-stages"
        element={
          <ProtectedRoute requiredRoles={['SUPER_ADMIN', 'TENANT_ADMIN']}>
            <Layout>
              <LeadStagesPage />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/lead-form-settings"
        element={
          <ProtectedRoute requiredRoles={['SUPER_ADMIN', 'TENANT_ADMIN']}>
            <Layout>
              <LeadFormSettingsPage />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/lead-manager-board"
        element={
          <ProtectedRoute requiredRoles={['SUPER_ADMIN', 'TENANT_ADMIN', 'STAFF']}>
            <Layout>
              <LeadManagerBoardPage />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/lead-my-performance"
        element={
          <ProtectedRoute requiredRoles={['SUPER_ADMIN', 'TENANT_ADMIN', 'STAFF']}>
            <Layout>
              <LeadMyPerformancePage />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/lead-audit-logs"
        element={
          <ProtectedRoute requiredRoles={['SUPER_ADMIN', 'TENANT_ADMIN']}>
            <Layout>
              <LeadAuditLogsPage />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/lead-priority-settings"
        element={
          <ProtectedRoute requiredRoles={['SUPER_ADMIN', 'TENANT_ADMIN']}>
            <Layout>
              <LeadPrioritySettingsPage />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/google-sheet-integration"
        element={
          <ProtectedRoute requiredRoles={['SUPER_ADMIN', 'TENANT_ADMIN']}>
            <Layout>
              <GoogleSheetIntegrationPage />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/lead-sources"
        element={
          <ProtectedRoute requiredRoles={['SUPER_ADMIN', 'TENANT_ADMIN']}>
            <Layout>
              <LeadSourcesPage />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/lead-scoring-settings"
        element={
          <ProtectedRoute requiredRoles={['SUPER_ADMIN', 'TENANT_ADMIN']}>
            <Layout>
              <LeadScoringSettingsPage />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/lead-distribution-settings"
        element={
          <ProtectedRoute requiredRoles={['SUPER_ADMIN', 'TENANT_ADMIN']}>
            <Layout>
              <LeadDistributionSettingsPage />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/ai-call-config"
        element={
          <ProtectedRoute requiredRoles={['SUPER_ADMIN', 'TENANT_ADMIN']}>
            <Layout>
              <AICallConfigPage />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/qualification-settings"
        element={
          <ProtectedRoute requiredRoles={['SUPER_ADMIN', 'TENANT_ADMIN']}>
            <Layout>
              <QualificationSettingsPage />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/sales-content"
        element={
          <ProtectedRoute requiredRoles={['SUPER_ADMIN', 'TENANT_ADMIN']}>
            <Layout>
              <SalesContentLibraryPage />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/leads/analytics"
        element={
          <ProtectedRoute requiredRoles={['SUPER_ADMIN', 'TENANT_ADMIN']}>
            <Layout>
              <LeadAnalyticsPage />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/meetings"
        element={
          <ProtectedRoute requiredRoles={['SUPER_ADMIN', 'TENANT_ADMIN', 'STAFF']}>
            <Layout>
              <MeetingsPage />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/follow-ups"
        element={
          <ProtectedRoute requiredRoles={['SUPER_ADMIN', 'TENANT_ADMIN', 'STAFF']}>
            <Layout>
              <FollowUpCalendarPage />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/seat-reservations"
        element={
          <ProtectedRoute requiredRoles={['SUPER_ADMIN', 'TENANT_ADMIN', 'STAFF']}>
            <Layout>
              <SeatReservationsPage />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/lead-aging"
        element={
          <ProtectedRoute requiredRoles={['SUPER_ADMIN', 'TENANT_ADMIN', 'STAFF']}>
            <Layout>
              <LeadAgingPage />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/lead-duplicates"
        element={
          <ProtectedRoute requiredRoles={['SUPER_ADMIN', 'TENANT_ADMIN']}>
            <Layout>
              <LeadDuplicatesPage />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/lead-approvals"
        element={
          <ProtectedRoute requiredRoles={['SUPER_ADMIN', 'TENANT_ADMIN']}>
            <Layout>
              <LeadApprovalsPage />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/lead-kanban"
        element={
          <ProtectedRoute requiredRoles={['SUPER_ADMIN', 'TENANT_ADMIN', 'STAFF']}>
            <Layout>
              <LeadKanbanPage />
            </Layout>
          </ProtectedRoute>
        }
      />


      {/* Code Snippet Assessment Routes */}
      <Route
        path="/admin/coding-snippets"
        element={
          <ProtectedRoute requiredRoles={['SUPER_ADMIN', 'TENANT_ADMIN', 'INSTRUCTOR']}>
            <Layout>
              <AdminCodeSnippets />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/coding-snippets/:id/submissions"
        element={
          <ProtectedRoute requiredRoles={['SUPER_ADMIN', 'TENANT_ADMIN', 'INSTRUCTOR']}>
            <Layout>
              <GradeSubmissions />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/coding-snippets/grade"
        element={
          <ProtectedRoute requiredRoles={['SUPER_ADMIN', 'TENANT_ADMIN', 'INSTRUCTOR']}>
            <Layout>
              <GradeSubmissions />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/coding-snippets"
        element={
          <ProtectedRoute requiredRoles={['STUDENT']}>
            <FeatureRoute feature="codingSnippets">
              <Layout>
                <StudentCodeSnippets />
              </Layout>
            </FeatureRoute>
          </ProtectedRoute>
        }
      />



      {/* Website Registrations */}
      <Route
        path="/registrations"
        element={
          <ProtectedRoute requiredRoles={['SUPER_ADMIN', 'TENANT_ADMIN', 'INSTRUCTOR']}>
            <Layout><AllRegistrations /></Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/registrations/:subId"
        element={
          <ProtectedRoute requiredRoles={['SUPER_ADMIN', 'TENANT_ADMIN', 'INSTRUCTOR']}>
            <Layout><RegistrationDetail /></Layout>
          </ProtectedRoute>
        }
      />

      {/* ── Learning Content Library ── */}
      <Route
        path="/learning-library"
        element={
          <ProtectedRoute requiredRoles={['SUPER_ADMIN', 'TENANT_ADMIN', 'INSTRUCTOR']}>
            <Layout><LearningContentLibraryPage /></Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/learning-library/create"
        element={
          <ProtectedRoute requiredRoles={['SUPER_ADMIN', 'TENANT_ADMIN', 'INSTRUCTOR']}>
            <Layout><CreateEditContentPage /></Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/learning-library/record"
        element={
          <ProtectedRoute requiredRoles={['SUPER_ADMIN', 'TENANT_ADMIN', 'INSTRUCTOR']}>
            <Layout><RecordClassPage /></Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/live-class"
        element={
          <ProtectedRoute requiredRoles={['SUPER_ADMIN', 'TENANT_ADMIN', 'INSTRUCTOR', 'STUDENT']}>
            <Layout><LiveClassPage /></Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/learning-library/edit/:id"
        element={
          <ProtectedRoute requiredRoles={['SUPER_ADMIN', 'TENANT_ADMIN', 'INSTRUCTOR']}>
            <Layout><CreateEditContentPage /></Layout>
          </ProtectedRoute>
        }
      />

      {/* ── Interactive Lesson Builder (Admin) ── */}
      <Route
        path="/interactive-lessons/new"
        element={
          <ProtectedRoute requiredRoles={['SUPER_ADMIN', 'TENANT_ADMIN', 'INSTRUCTOR']}>
            <Layout><InteractiveLessonBuilderPage /></Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/interactive-lessons/edit/:id"
        element={
          <ProtectedRoute requiredRoles={['SUPER_ADMIN', 'TENANT_ADMIN', 'INSTRUCTOR']}>
            <Layout><InteractiveLessonBuilderPage /></Layout>
          </ProtectedRoute>
        }
      />

      {/* ── Interactive Lesson Viewer (Student) ── */}
      <Route
        path="/interactive-lesson/play/:id"
        element={
          <ProtectedRoute>
            <InteractiveLessonViewerPage />
          </ProtectedRoute>
        }
      />

      {/* ── Curriculum Builder ── */}
      <Route
        path="/curriculum-builder"
        element={
          <ProtectedRoute requiredRoles={['SUPER_ADMIN', 'TENANT_ADMIN', 'INSTRUCTOR']}>
            <Layout><CurriculumListPage /></Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/curriculum-builder/create"
        element={
          <ProtectedRoute requiredRoles={['SUPER_ADMIN', 'TENANT_ADMIN', 'INSTRUCTOR']}>
            <Layout><CurriculumBuilderPage /></Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/curriculum-builder/:id"
        element={
          <ProtectedRoute requiredRoles={['SUPER_ADMIN', 'TENANT_ADMIN', 'INSTRUCTOR']}>
            <Layout><CurriculumBuilderPage /></Layout>
          </ProtectedRoute>
        }
      />

      {/* ── Enrollment Plans (admin) ── */}
      <Route
        path="/enrollment-plans"
        element={
          <ProtectedRoute requiredRoles={['SUPER_ADMIN', 'TENANT_ADMIN', 'INSTRUCTOR']}>
            <Layout><EnrollmentPlansPage /></Layout>
          </ProtectedRoute>
        }
      />

      {/* ── Batch Offerings (admin) ── */}
      <Route
        path="/batch-offerings"
        element={
          <ProtectedRoute requiredRoles={['SUPER_ADMIN', 'TENANT_ADMIN', 'INSTRUCTOR']}>
            <Layout><BatchOfferingsPage /></Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/batch-offerings/:id/progress"
        element={
          <ProtectedRoute requiredRoles={['SUPER_ADMIN', 'TENANT_ADMIN', 'INSTRUCTOR']}>
            <Layout><CohortProgressPage /></Layout>
          </ProtectedRoute>
        }
      />

      {/* ── My Tasks (student unified feed) ── */}
      <Route
        path="/my-tasks"
        element={
          <ProtectedRoute requiredRoles={['STUDENT']}>
            <Layout><MyTasksPage /></Layout>
          </ProtectedRoute>
        }
      />

      {/* ── My Learning Plan (student) ── */}
      <Route
        path="/my-learning"
        element={
          <ProtectedRoute>
            <Layout><MyLearningPlanPage /></Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/my-learning/:enrollmentId/journey"
        element={
          <ProtectedRoute>
            <Layout><MyJourneyPage /></Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/concerns"
        element={
          <ProtectedRoute>
            <Layout><AdminConcernsPage /></Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/my-learning/:enrollmentId/day/:day"
        element={
          <ProtectedRoute>
            <Layout><DayViewPage /></Layout>
          </ProtectedRoute>
        }
      />

      {/* ── Admin Logs ── */}
      <Route
        path="/admin/logs"
        element={
          <ProtectedRoute requiredRoles={['SUPER_ADMIN', 'TENANT_ADMIN', 'STAFF']}>
            <Layout><AdminLogs /></Layout>
          </ProtectedRoute>
        }
      />
    </Routes>
    </Suspense>
  );
};

// Show the log panel only for admin / staff users
const ADMIN_ROLES = ['SUPER_ADMIN', 'TENANT_ADMIN', 'STAFF', 'INSTRUCTOR'];
const AdminLogGate: React.FC = () => {
  const { user, isAuthenticated } = useAuth();
  if (!isAuthenticated || !user || !ADMIN_ROLES.includes(user.role)) return null;
  return <AdminLogPanel />;
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <TenantProvider>
        <StudentFeaturesProvider>
          <TenantModulesProvider>
            <BatchModulesProvider>
            <SocketProvider>
              <BrowserRouter>
                <HotLeadToast />
                <AppRoutes />
                <AdminLogGate />
              </BrowserRouter>
            </SocketProvider>
            </BatchModulesProvider>
          </TenantModulesProvider>
        </StudentFeaturesProvider>
      </TenantProvider>
    </AuthProvider>
  );
};

export default App;