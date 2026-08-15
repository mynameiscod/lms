import React, { useState, useEffect } from 'react';
import CareerPilotStaging from './pages/Passport/AdminStaging';
import CareerPilotPaperDesign from './pages/Passport/AdminPaperDesign';
import LabTracks from './pages/LabTracks';
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

// Pages
import LoginPage from './pages/Login';
import RegisterPage from './pages/Register';
import CreateOrganizationPage from './pages/CreateOrganization';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import { SetupPassword } from './pages/SetupPassword/SetupPassword';
import { ProfileCompletion } from './pages/ProfileCompletion/ProfileCompletion';
import DashboardPage from './pages/Dashboard';
import UsersPage from './pages/Users';
import RolesPage from './pages/Roles';
import BatchesPage from './pages/Batches';
import AttendancePage from './pages/Attendance';
import MyAttendancePage from './pages/MyAttendance';
import AttendanceReportsPage from './pages/AttendanceReports';
import QuizReportsPage from './pages/QuizReports';
import QuizManagementPage from './pages/QuizManagement';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import QuestionManagementPage from './pages/QuestionManagement';
import QuizzesPage from './pages/Quizzes';
import QuizTakingPage from './pages/QuizTaking';
import QuizResultsPage from './pages/QuizResults';
import QuizResultsAdminPage from './pages/QuizResultsAdmin';
import QuestionBuilder from './pages/QuestionBuilder';
import StudentProfilePage from './pages/StudentProfile';
import OAuthCallbackPage from './pages/OAuthCallback';
import AdminContentPage from './pages/AdminContent';
import NotFoundPage from './pages/NotFound';
import StudentReportsPage from './pages/StudentReports';
import WeeklyReportsPage from './pages/WeeklyReports';
import AdminStudentProfilesPage from './pages/AdminStudentProfiles';
import StudentProfileDetail from './pages/AdminStudentProfiles/StudentProfileDetail';
import DepartmentsPage from './pages/Departments';
import CollegeSettingsPage from './pages/CollegeSettings';
import CollegeMembersPage from './pages/CollegeMembers';
import PlacementDrivesPage from './pages/PlacementDrives';
import PlacementAnalyticsPage from './pages/PlacementAnalytics';
import MyApplicationsPage from './pages/MyApplications';
import AlumniManagementPage from './pages/AlumniManagement';
import CollegeCurriculumPage from './pages/CollegeCurriculum';
import CRTManagementPage from './pages/CRTManagement';
import TenantManagementPage from './pages/TenantManagement';
import AlumniDirectoryPage from './pages/AlumniDirectory';
import NotificationCenterPage from './pages/NotificationCenter';
import StudentCollegePortal from './pages/StudentCollegePortal';
import StudentFeeDetailsPage from './pages/StudentFeeDetails';
import DeptReportsPage from './pages/DeptReports';
import BulkUploadPage from './pages/BulkUpload';
import RecordingDiagnostics from './pages/RecordingDiagnostics';
import PlatformSettings from './pages/PlatformSettings';
import MyLeave from './pages/MyLeave';
import LeaveRequests from './pages/LeaveRequests';
import CodePlayground from './pages/CodePlayground';
import PassportAdminConfig from './pages/Passport/AdminConfig';
import PassportAdminStudents from './pages/Passport/AdminStudents';
import PassportAdminCoins from './pages/Passport/AdminCoins';
import PassportAdminFunnel from './pages/Passport/AdminFunnel';
import PassportAdminCurriculum from './pages/Passport/AdminCurriculum';
import PassportAdminPathwayRules from './pages/Passport/AdminPathwayRules';
import PassportAdminCareerRoles from './pages/Passport/AdminCareerRoles';
import PassportAdminSkillGraph from './pages/Passport/AdminSkillGraph';
import PassportAdminRoleBlueprint from './pages/Passport/AdminRoleBlueprint';
import PassportAdminSkillEvidence from './pages/Passport/AdminSkillEvidence';
import PassportAdminAssessmentPreview from './pages/Passport/AdminAssessmentPreview';
import PassportAdminPathways from './pages/Passport/AdminPathways';
import PassportAdminMissions from './pages/Passport/AdminMissions';
import PassportHome from './pages/Passport/PassportHome';
import PassportMemberLayout from './pages/Passport/MemberLayout';
import PassportCareerSetup from './pages/Passport/CareerSetup';
import PassportRoadmap from './pages/Passport/Roadmap';
import PassportSkillDna from './pages/Passport/SkillDna';
import PassportRoleReadiness from './pages/Passport/RoleReadiness';
import PassportSkillAssessment from './pages/Passport/SkillAssessment';
import PassportPractice from './pages/Passport/Practice';
import PassportPracticeItem from './pages/Passport/PracticeItem';
import PassportInterview from './pages/Passport/Interview';
import PassportResumeCenter from './pages/Passport/ResumeCenter';
import PassportCoins from './pages/Passport/Coins';
import PassportLeaderboard from './pages/Passport/Leaderboard';
import PassportAchievements from './pages/Passport/Achievements';
import PassportNews from './pages/Passport/News';
import PassportCompanies from './pages/Passport/Companies';
import PassportMockTest from './pages/Passport/MockTest';
import PassportAdminNews from './pages/Passport/AdminNews';
import PassportAdminCompanies from './pages/Passport/AdminCompanies';
import PassportAssessmentPage from './pages/Passport/Assessment';
import PassportAdminAssessment from './pages/Passport/AdminAssessment';
import PassportCard from './pages/Passport/Card';
import PassportJoin from './pages/Passport/Join';
import PassportLogin from './pages/Passport/Login';
import BattleList from './pages/Battles/PublicList';
import BattleLanding from './pages/Battles/Landing';
import BattleExam from './pages/Battles/Exam';
import BattleLeaderboard from './pages/Battles/Leaderboard';
import BattlesAdmin from './pages/BattlesAdmin';
import BattleDetail from './pages/BattlesAdmin/BattleDetail';
import ProjectBuilder from './pages/ProjectBuilder';
import JobTracker from './pages/JobTracker';
import AIMentor from './pages/AIMentor';
import ResourceLibrary from './pages/ResourceLibrary';
import ResourceAdmin from './pages/ResourceAdmin';
import SpeakingPractice from './pages/SpeakingPractice';
import SpeakingAdmin from './pages/SpeakingAdmin';
import LogicGym from './pages/LogicGym';
import DrillsAdmin from './pages/DrillsAdmin';
import ThinkingLab from './pages/ThinkingLab';
import ThinkingLabAdmin from './pages/ThinkingLabAdmin';
import InterviewQuestionsPage from './pages/InterviewQuestions';
import InterviewQuestionBankPage from './pages/InterviewQuestionBank';

// Structured Interview Module Pages
import InterviewTemplateList from './pages/InterviewTemplateList';
import InterviewTemplateCreate from './pages/InterviewTemplateCreate';
import InterviewQBManagement from './pages/InterviewQBManagement';
import InterviewAssignment from './pages/InterviewAssignment';
import InterviewAnalytics from './pages/InterviewAnalytics';
import TakeStructuredInterview from './pages/TakeStructuredInterview';
import LiveInterview from './pages/LiveInterview';
import InterviewFeedbackReport from './pages/InterviewFeedbackReport';

// Assignment Pages
import {
  AdminAssignmentList,
  AdminAssignmentForm,
  AdminSubmissions,
  StudentAssignmentList,
  AssignmentWorkspace,
  AssignmentResult
} from './pages/assignments';
import AssignmentReports from './pages/AssignmentReports';
import StudentFeaturesPage from './pages/StudentFeatures';
import ResumeBuilderPage from './pages/ResumeBuilder';
import PublicResumeView from './pages/ResumeBuilder/PublicResumeView';
import CareerProfilePage from './pages/CareerProfile';
import CareerProfileAdmin from './pages/CareerProfile/Admin';
import PlacementPartnership from './pages/PartnerPipeline';
import FeesPage from './pages/Fees';
import LeadsPage from './pages/Leads';
import TeamActivity from './pages/TeamActivity';
import LeadDetailPage from './pages/LeadDetail';
import LeadStagesPage from './pages/LeadStages';
import LeadFormSettingsPage from './pages/LeadFormSettings';
import LeadManagerBoardPage from './pages/LeadManagerBoard';
import LeadMyPerformancePage from './pages/LeadMyPerformance';
import LeadAuditLogsPage from './pages/LeadAuditLogs';
import LeadPrioritySettingsPage from './pages/LeadPrioritySettings';
import QualificationSettingsPage from './pages/QualificationSettings';
import SalesContentLibraryPage from './pages/SalesContentLibrary';
import LeadAnalyticsPage from './pages/LeadAnalytics';
import MeetingsPage from './pages/Meetings';
import LeadDistributionSettingsPage from './pages/LeadDistributionSettings';
import FollowUpCalendarPage from './pages/FollowUpCalendar';
import SeatReservationsPage from './pages/SeatReservations';
import LeadAgingPage from './pages/LeadAging';
import LeadDuplicatesPage from './pages/LeadDuplicates';
import LeadApprovalsPage from './pages/LeadApprovals';
import LeadKanbanPage from './pages/LeadKanban';
import { AdminCodeSnippets, StudentCodeSnippets, GradeSubmissions } from './pages/CodeSnippets';
import CertificatePage from './pages/Certificate/CertificatePage';
import CertificateVerify from './pages/CertificateVerify';
import CandidateProfile from './pages/CandidateProfile';
import CertificatesAdmin from './pages/CertificatesAdmin';
import AiSpend from './pages/AiSpend';
import GoogleSheetIntegrationPage from './pages/GoogleSheetIntegration';
import LeadScoringSettingsPage from './pages/LeadScoringSettings';
import LeadSourcesPage from './pages/LeadSources';
import AICallConfigPage from './pages/AICallConfig';

// Class Recording Pages

// Registrations
import AllRegistrations from './pages/PublicQuizAdmin/AllRegistrations';
import RegistrationDetail from './pages/PublicQuizAdmin/RegistrationDetail';

// Learning Content Library
import LearningContentLibraryPage from './pages/LearningContentLibrary';
import CreateEditContentPage from './pages/LearningContentLibrary/CreateEditContent';
import RecordClassPage from './pages/LearningContentLibrary/RecordClass';
import LiveClassPage from './pages/LiveClass';

// Interactive Lesson System
import InteractiveLessonBuilderPage from './pages/InteractiveLessonBuilder';
import InteractiveLessonViewerPage from './pages/InteractiveLessonViewer';

// Curriculum Builder
import CurriculumListPage from './pages/CurriculumBuilder';
import CurriculumBuilderPage from './pages/CurriculumBuilder/BuilderPage';

// Enrollment Plans
import EnrollmentPlansPage from './pages/EnrollmentPlans';
import BatchOfferingsPage from './pages/BatchOfferings';
import CohortProgressPage from './pages/CohortProgress';
import MyTasksPage from './pages/MyTasks';

// My Learning Plan (student)
import MyLearningPlanPage from './pages/MyLearningPlan';
import DayViewPage from './pages/MyLearningPlan/LearningPlanPro';
import MyJourneyPage from './pages/MyLearningPlan/Journey';
import AdminConcernsPage from './pages/AdminConcerns';

// Public quiz session (no auth required — token-based)
import QuizSession from './pages/QuizSession';

// Public skill assessment funnel (no auth — Meta-ad → exam → roadmap)
import AssessmentRegister from './pages/Assessment/Register';
import AssessmentLanding from './pages/Assessment/Landing';
import AssessmentExam from './pages/Assessment/Exam';
import AssessmentResult from './pages/Assessment/Result';
import AssessmentAdmin from './pages/AssessmentAdmin';
import AssessmentCandidates from './pages/AssessmentCandidates';

import AdminLogPanel from './components/AdminLogPanel';
import AdminLogs from './pages/AdminLogs';

// Scheduled Interview Module
import ScheduledInterviewsPage from './pages/ScheduledInterviews';
import InterviewDetailPage from './pages/ScheduledInterviews/InterviewDetail';
import HmsClassesPage from './pages/HmsClasses';
import HmsRoomPage from './pages/HmsClasses/Room';
import CommunicationLab from './pages/CommunicationLab';
import CommunicationLabAdmin from './pages/CommunicationLabAdmin';
import MyInterviewsPage from './pages/MyInterviews';


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

const AppRoutes: React.FC = () => {
  return (
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

      {/* ── Tech Battles (admin) ── */}
      <Route path="/admin/battles" element={
        <ProtectedRoute requiredRoles={['TENANT_ADMIN', 'SUPER_ADMIN', 'INSTRUCTOR', 'STAFF']}><Layout><BattlesAdmin /></Layout></ProtectedRoute>
      } />
      <Route path="/admin/battles/:id" element={
        <ProtectedRoute requiredRoles={['TENANT_ADMIN', 'SUPER_ADMIN', 'INSTRUCTOR', 'STAFF']}><Layout><BattleDetail /></Layout></ProtectedRoute>
      } />

      {/* ── CareerPilot (separate product) ── */}
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
      <Route path="/admin/passport/role-blueprints" element={
        <ProtectedRoute requiredRoles={['TENANT_ADMIN', 'SUPER_ADMIN']}><Layout><PassportAdminRoleBlueprint /></Layout></ProtectedRoute>
      } />
      <Route path="/admin/passport/skill-evidence" element={
        <ProtectedRoute requiredRoles={['TENANT_ADMIN', 'SUPER_ADMIN']}><Layout><PassportAdminSkillEvidence /></Layout></ProtectedRoute>
      } />
      <Route path="/admin/passport/assessment-preview" element={
        <ProtectedRoute requiredRoles={['TENANT_ADMIN', 'SUPER_ADMIN']}><Layout><PassportAdminAssessmentPreview /></Layout></ProtectedRoute>
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
        <Route path="/careerpilot/assessment" element={<PassportAssessmentPage />} />
        <Route path="/passport/assessment" element={<LegacyRedirect to="/careerpilot/assessment" />} />
        <Route path="/careerpilot/roadmap" element={<PassportRoadmap />} />
        <Route path="/careerpilot/skills" element={<PassportSkillDna />} />
        <Route path="/careerpilot/readiness" element={<PassportRoleReadiness />} />
        {/* The personalised skill assessment (Modules 6-7). Distinct from
            /careerpilot/assessment, which is the free career-readiness questionnaire. */}
        <Route path="/careerpilot/skill-assessment" element={<PassportSkillAssessment />} />
        <Route path="/passport/roadmap" element={<LegacyRedirect to="/careerpilot/roadmap" />} />
        <Route path="/careerpilot/practice" element={<PassportPractice />} />
        <Route path="/passport/practice" element={<LegacyRedirect to="/careerpilot/practice" />} />
        <Route path="/careerpilot/practice/:id" element={<PassportPracticeItem />} />
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