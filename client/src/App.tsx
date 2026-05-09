import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { TenantProvider } from './contexts/TenantContext';
import { StudentFeaturesProvider, useStudentFeatures, StudentFeatures } from './contexts/StudentFeaturesContext';
import { TenantModulesProvider } from './contexts/TenantModulesContext';
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
import CoursesPage from './pages/Courses';
import MyCoursePage from './pages/MyCourse';
import CourseManagementPage from './pages/CourseManagement';
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
import DeptReportsPage from './pages/DeptReports';
import BulkUploadPage from './pages/BulkUpload';
import InterviewQuestionsPage from './pages/InterviewQuestions';
import InterviewQuestionBankPage from './pages/InterviewQuestionBank';
import MockInterviewHub from './pages/MockInterviewHub';
import TakeInterview from './pages/TakeInterview';
import InterviewResult from './pages/InterviewResult';
import AssignInterviewPage from './pages/AssignInterview';

// Structured Interview Module Pages
import InterviewTemplateList from './pages/InterviewTemplateList';
import InterviewTemplateCreate from './pages/InterviewTemplateCreate';
import InterviewQBManagement from './pages/InterviewQBManagement';
import InterviewAssignment from './pages/InterviewAssignment';
import InterviewAnalytics from './pages/InterviewAnalytics';
import StudentInterviewHub from './pages/StudentInterviewHub';
import TakeStructuredInterview from './pages/TakeStructuredInterview';
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
import LeadsPage from './pages/Leads';
import LeadDetailPage from './pages/LeadDetail';
import LeadStagesPage from './pages/LeadStages';
import LeadFormSettingsPage from './pages/LeadFormSettings';
import LeadManagerBoardPage from './pages/LeadManagerBoard';
import LeadMyPerformancePage from './pages/LeadMyPerformance';
import LeadAuditLogsPage from './pages/LeadAuditLogs';
import TelecallerConsolePage from './pages/TelecallerConsole';
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
import { MarketingDashboard, CompetitorManagement, AdCapture, InsightsFeed, ContentGenerator, MarketingIdeas, CampaignManagement, StageAnalytics } from './pages/Marketing';
import { AdminCodeSnippets, StudentCodeSnippets, GradeSubmissions } from './pages/CodeSnippets';
import CertificatePage from './pages/Certificate/CertificatePage';
import AdminTopicMasteryPage from './pages/AdminTopicMastery';
import TopicHubPage from './pages/TopicHub';
import AdminLearningRequestsPage from './pages/AdminLearningRequests';
import GoogleSheetIntegrationPage from './pages/GoogleSheetIntegration';
import LeadScoringSettingsPage from './pages/LeadScoringSettings';
import LeadSourcesPage from './pages/LeadSources';
import AICallConfigPage from './pages/AICallConfig';

// Class Recording Pages
import StartRecording from './pages/ClassRecording/StartRecording';
import RecordingsList from './pages/ClassRecording/RecordingsList';
import RecordingView from './pages/ClassRecording/RecordingView';
import StudentRecordingsList from './pages/ClassRecording/StudentRecordingsList';

// Public Quiz
import PublicQuizPage from './pages/PublicQuiz';
import PublicQuizListPage from './pages/PublicQuizAdmin';
import PublicQuizEditor from './pages/PublicQuizAdmin/PublicQuizEditor';
import SubmissionsDashboard from './pages/PublicQuizAdmin/SubmissionsDashboard';

// Class Flow (new unified flow)
import ClassFlowPage from './pages/ClassFlow/ClassFlowPage';
import StudentMyClasses from './pages/StudentClassHub/StudentMyClasses';
import StudentClassHub from './pages/StudentClassHub/StudentClassHub';
// Live classroom join page (for participants via invite link)
import LiveJoinPage from './pages/LiveJoin/LiveJoinPage';

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

  if (loading) return <Spinner fullScreen />;

  if (!isAuthenticated) {
    return <Navigate to="/login" />;
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

// Hot lead real-time notification toast
const HotLeadToast: React.FC = () => {
  const { onHotLeadCreated, offHotLeadCreated } = useSocket();
  const navigate = useNavigate();
  const [toasts, setToasts] = useState<Array<{ id: number; leadId: string; leadName: string; source: string }>>([]);

  useEffect(() => {
    onHotLeadCreated((data: any) => {
      const id = Date.now();
      setToasts(prev => [...prev, { id, leadId: data.leadId, leadName: data.leadName, source: data.source }]);
      setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 8000);
    });
    return () => offHotLeadCreated();
  }, [onHotLeadCreated, offHotLeadCreated]);

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

const AppRoutes: React.FC = () => {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/create-organization" element={<CreateOrganizationPage />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/certificate/:type/:token" element={<CertificatePage />} />

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
        path="/courses"
        element={
          <ProtectedRoute>
            <Layout>
              <CoursesPage />
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/my-course"
        element={
          <ProtectedRoute requiredRoles={['STUDENT']}>
            <FeatureRoute feature="myCourse">
              <Layout>
                <MyCoursePage />
              </Layout>
            </FeatureRoute>
          </ProtectedRoute>
        }
      />

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

      {/* Mock Interview Routes */}
      <Route
        path="/mock-interviews"
        element={
          <ProtectedRoute>
            <FeatureRoute feature="mockInterviews">
              <Layout>
                <MockInterviewHub />
              </Layout>
            </FeatureRoute>
          </ProtectedRoute>
        }
      />

      <Route
        path="/mock-interviews/history"
        element={
          <ProtectedRoute>
            <FeatureRoute feature="mockInterviews">
              <Layout>
                <MockInterviewHub />
              </Layout>
            </FeatureRoute>
          </ProtectedRoute>
        }
      />

      <Route
        path="/mock-interviews/:interviewId/take"
        element={
          <ProtectedRoute>
            <FeatureRoute feature="mockInterviews">
              <Layout>
                <TakeInterview />
              </Layout>
            </FeatureRoute>
          </ProtectedRoute>
        }
      />

      <Route
        path="/mock-interviews/:interviewId/result"
        element={
          <ProtectedRoute>
            <FeatureRoute feature="mockInterviews">
              <Layout>
                <InterviewResult />
              </Layout>
            </FeatureRoute>
          </ProtectedRoute>
        }
      />

      {/* Admin: Assign Interviews */}
      <Route
        path="/mock-interviews/assign"
        element={
          <ProtectedRoute requiredRoles={['SUPER_ADMIN', 'TENANT_ADMIN', 'INSTRUCTOR']}>
            <Layout>
              <AssignInterviewPage />
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/course-management"
        element={
          <ProtectedRoute requiredRoles={['SUPER_ADMIN', 'TENANT_ADMIN', 'INSTRUCTOR']}>
            <Layout>
              <CourseManagementPage />
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

      <Route
        path="/student-reports"
        element={
          <ProtectedRoute requiredRoles={['SUPER_ADMIN', 'TENANT_ADMIN', 'INSTRUCTOR']}>
            <Layout>
              <StudentReportsPage />
            </Layout>
          </ProtectedRoute>
        }
      />

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

      <Route
        path="/admin/student-profiles"
        element={
          <ProtectedRoute requiredRoles={['SUPER_ADMIN', 'TENANT_ADMIN', 'INSTRUCTOR', 'STAFF']}>
            <Layout>
              <AdminStudentProfilesPage />
            </Layout>
          </ProtectedRoute>
        }
      />

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
      <Route
        path="/student/interviews"
        element={
          <ProtectedRoute>
            <Layout>
              <StudentInterviewHub />
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
        path="/telecaller-console"
        element={
          <ProtectedRoute requiredRoles={['SUPER_ADMIN', 'TENANT_ADMIN', 'STAFF']}>
            <Layout>
              <TelecallerConsolePage />
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

      {/* Marketing Intelligence */}
      <Route
        path="/marketing"
        element={
          <ProtectedRoute requiredRoles={['SUPER_ADMIN', 'TENANT_ADMIN']}>
            <Layout>
              <MarketingDashboard />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/marketing/competitors"
        element={
          <ProtectedRoute requiredRoles={['SUPER_ADMIN', 'TENANT_ADMIN']}>
            <Layout>
              <CompetitorManagement />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/marketing/ads"
        element={
          <ProtectedRoute requiredRoles={['SUPER_ADMIN', 'TENANT_ADMIN']}>
            <Layout>
              <AdCapture />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/marketing/insights"
        element={
          <ProtectedRoute requiredRoles={['SUPER_ADMIN', 'TENANT_ADMIN']}>
            <Layout>
              <InsightsFeed />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/marketing/generate/:insightId"
        element={
          <ProtectedRoute requiredRoles={['SUPER_ADMIN', 'TENANT_ADMIN']}>
            <Layout>
              <ContentGenerator />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/marketing/ideas"
        element={
          <ProtectedRoute requiredRoles={['SUPER_ADMIN', 'TENANT_ADMIN']}>
            <Layout>
              <MarketingIdeas />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/marketing/campaigns"
        element={
          <ProtectedRoute requiredRoles={['SUPER_ADMIN', 'TENANT_ADMIN']}>
            <Layout>
              <CampaignManagement />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/lead-stage-analytics"
        element={
          <ProtectedRoute requiredRoles={['SUPER_ADMIN', 'TENANT_ADMIN', 'STAFF']}>
            <Layout>
              <StageAnalytics />
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

      {/* Class Recordings */}
      <Route
        path="/admin/class-recordings"
        element={
          <ProtectedRoute requiredRoles={['SUPER_ADMIN', 'TENANT_ADMIN', 'INSTRUCTOR']}>
            <Layout>
              <RecordingsList />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/class-recordings/start"
        element={
          <ProtectedRoute requiredRoles={['SUPER_ADMIN', 'TENANT_ADMIN', 'INSTRUCTOR']}>
            <Layout>
              <StartRecording />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/class-recordings/:id"
        element={
          <ProtectedRoute requiredRoles={['SUPER_ADMIN', 'TENANT_ADMIN', 'INSTRUCTOR']}>
            <Layout>
              <RecordingView />
            </Layout>
          </ProtectedRoute>
        }
      />

      {/* Class Flow — new unified teacher wizard */}
      <Route
        path="/admin/class-flow"
        element={
          <ProtectedRoute requiredRoles={['SUPER_ADMIN', 'TENANT_ADMIN', 'INSTRUCTOR']}>
            <ClassFlowPage />
          </ProtectedRoute>
        }
      />

      {/* Live classroom join — participants access via invite link */}
      <Route
        path="/live/:sessionId"
        element={
          <ProtectedRoute>
            <LiveJoinPage />
          </ProtectedRoute>
        }
      />

      {/* Student Class Hub — new unified student pages */}
      <Route
        path="/class-hub"
        element={
          <ProtectedRoute requiredRoles={['STUDENT']}>
            <FeatureRoute feature="classHub">
              <StudentMyClasses />
            </FeatureRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/class-hub/:id"
        element={
          <ProtectedRoute requiredRoles={['STUDENT', 'SUPER_ADMIN', 'TENANT_ADMIN', 'INSTRUCTOR']}>
            <FeatureRoute feature="classHub">
              <StudentClassHub />
            </FeatureRoute>
          </ProtectedRoute>
        }
      />

      <Route
        path="/class-recordings"
        element={
          <ProtectedRoute requiredRoles={['STUDENT']}>
            <Layout>
              <StudentRecordingsList />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/class-recordings/:id"
        element={
          <ProtectedRoute requiredRoles={['STUDENT', 'SUPER_ADMIN', 'TENANT_ADMIN', 'INSTRUCTOR']}>
            <Layout>
              <RecordingView />
            </Layout>
          </ProtectedRoute>
        }
      />

      {/* Topic Mastery & Learning Hub */}
      <Route
        path="/admin/topic-mastery"
        element={
          <ProtectedRoute requiredRoles={['SUPER_ADMIN', 'TENANT_ADMIN', 'INSTRUCTOR', 'STAFF']}>
            <Layout>
              <AdminTopicMasteryPage />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/topic-hub"
        element={
          <ProtectedRoute requiredRoles={['STUDENT']}>
            <FeatureRoute feature="myCourse">
              <Layout>
                <TopicHubPage />
              </Layout>
            </FeatureRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/learning-requests"
        element={
          <ProtectedRoute requiredRoles={['SUPER_ADMIN', 'TENANT_ADMIN', 'INSTRUCTOR', 'STAFF']}>
            <Layout>
              <AdminLearningRequestsPage />
            </Layout>
          </ProtectedRoute>
        }
      />

      {/* Public Quiz — no auth required */}
      <Route path="/public-quiz/:slug" element={<PublicQuizPage />} />

      {/* Public Quiz Admin */}
      <Route
        path="/public-quiz-admin"
        element={
          <ProtectedRoute requiredRoles={['SUPER_ADMIN', 'TENANT_ADMIN', 'INSTRUCTOR']}>
            <Layout><PublicQuizListPage /></Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/public-quiz-admin/new"
        element={
          <ProtectedRoute requiredRoles={['SUPER_ADMIN', 'TENANT_ADMIN', 'INSTRUCTOR']}>
            <Layout><PublicQuizEditor /></Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/public-quiz-admin/:id/edit"
        element={
          <ProtectedRoute requiredRoles={['SUPER_ADMIN', 'TENANT_ADMIN', 'INSTRUCTOR']}>
            <Layout><PublicQuizEditor /></Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/public-quiz-admin/:id/submissions"
        element={
          <ProtectedRoute requiredRoles={['SUPER_ADMIN', 'TENANT_ADMIN', 'INSTRUCTOR']}>
            <Layout><SubmissionsDashboard /></Layout>
          </ProtectedRoute>
        }
      />
    </Routes>
  );
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <TenantProvider>
        <StudentFeaturesProvider>
          <TenantModulesProvider>
            <SocketProvider>
              <BrowserRouter>
                <HotLeadToast />
                <AppRoutes />
              </BrowserRouter>
            </SocketProvider>
          </TenantModulesProvider>
        </StudentFeaturesProvider>
      </TenantProvider>
    </AuthProvider>
  );
};

export default App;