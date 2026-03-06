import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { TenantProvider } from './contexts/TenantContext';
import { SocketProvider } from './contexts/SocketContext';
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
import QuestionBuilder from './pages/QuestionBuilder';
import StudentProfilePage from './pages/StudentProfile';
import AdminContentPage from './pages/AdminContent';
import NotFoundPage from './pages/NotFound';  

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRoles?: string[];
}

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
    return <Navigate to="/dashboard" />;
  }

  return <>{children}</>;
};

const AppRoutes: React.FC = () => {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/create-organization" element={<CreateOrganizationPage />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />

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
            <Layout>
              <MyCoursePage />
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
          <ProtectedRoute requiredRoles={['SUPER_ADMIN', 'TENANT_ADMIN', 'ATTENDANCE_ADMIN']}>
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
            <Layout>
              <MyAttendancePage />
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/attendance-reports"
        element={
          <ProtectedRoute requiredRoles={['SUPER_ADMIN', 'TENANT_ADMIN', 'ATTENDANCE_ADMIN']}>
            <Layout>
              <AttendanceReportsPage />
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
            <Layout>
              <QuizzesPage />
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/quiz/:quizId/take"
        element={
          <ProtectedRoute>
            <QuizTakingPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/quiz/:quizId/results/:attemptId"
        element={
          <ProtectedRoute>
            <Layout>
              <QuizResultsPage />
            </Layout>
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

      <Route path="/" element={<Navigate to="/dashboard" />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <TenantProvider>
        <SocketProvider>
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
        </SocketProvider>
      </TenantProvider>
    </AuthProvider>
  );
};

export default App;