import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useStudentFeatures, StudentFeatures } from '../../contexts/StudentFeaturesContext';
import { useTenantModules, TenantModules } from '../../contexts/TenantModulesContext';
import { APP_VERSION, BUILD_DATE } from '../../version';
import './Sidebar.css';

interface MenuItem {
  label: string;
  path?: string;
  roles: string[];
  icon?: string;
  submenu?: MenuItem[];
  featureKey?: keyof StudentFeatures;
  moduleKey?: keyof TenantModules;
  permissions?: string[]; // If set, user needs at least one of these permissions
}

const Sidebar: React.FC<{ mobileOpen?: boolean; onMobileClose?: () => void }> = ({ mobileOpen, onMobileClose }) => {
  const [isOpen, setIsOpen] = useState(true);
  const [currentTime, setCurrentTime] = useState('');
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    attendance: false,
    quizzes: false,
    assignments: false,
    'code snippets': false,
    leads: false,
    marketing: false,
    'learning hub': false,
    'mock interviews': false,
    'fee management': false,
    'learning plans': false
  });
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isFeatureEnabled } = useStudentFeatures();
  const { isModuleEnabled } = useTenantModules();

  useEffect(() => {
    const tick = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }));
    };
    tick();
    const timer = setInterval(tick, 60000);
    return () => clearInterval(timer);
  }, []);

  const isActive = (path?: string) => path ? location.pathname === path : false;

  const toggleGroup = (group: string) => {
    setExpandedGroups(prev => ({
      ...prev,
      [group]: !prev[group]
    }));
  };

  const menuItems: MenuItem[] = [
    { label: 'Dashboard', path: '/dashboard', roles: ['SUPER_ADMIN', 'TENANT_ADMIN', 'INSTRUCTOR', 'STUDENT', 'ATTENDANCE_ADMIN'], icon: 'fa-solid fa-gauge-high', featureKey: 'dashboard', permissions: ['view_analytics', 'view_reports', 'view_courses', 'view_attendance'] },
    { label: 'Fee Details', path: '/student/fee-details', roles: ['STUDENT'], icon: 'fa-solid fa-wallet', featureKey: 'feeDetails' as keyof StudentFeatures, permissions: ['enroll_courses', 'view_courses'] },
    { label: 'Users', path: '/users', roles: ['SUPER_ADMIN', 'TENANT_ADMIN'], icon: 'fa-solid fa-users', permissions: ['manage_tenant_users'] },
    { label: 'Fees', path: '/fees', roles: ['SUPER_ADMIN', 'TENANT_ADMIN', 'STAFF', 'INSTRUCTOR'], icon: 'fa-solid fa-money-bill-wave', permissions: ['view_fees', 'manage_billing'] },
    { label: 'Roles', path: '/roles', roles: ['SUPER_ADMIN', 'TENANT_ADMIN'], icon: 'fa-solid fa-user-shield', permissions: ['manage_roles'] },
    { label: 'Batches', path: '/batches', roles: ['SUPER_ADMIN', 'TENANT_ADMIN'], icon: 'fa-solid fa-layer-group', permissions: ['manage_tenant_courses'] },
    { label: 'Skill Assessment', path: '/assessment-admin', roles: ['SUPER_ADMIN', 'TENANT_ADMIN', 'INSTRUCTOR'], icon: 'fa-solid fa-clipboard-question', permissions: ['create_quiz', 'edit_quiz'] },
    { label: 'Assessment Candidates', path: '/assessment-candidates', roles: ['SUPER_ADMIN', 'TENANT_ADMIN', 'INSTRUCTOR'], icon: 'fa-solid fa-user-group', permissions: ['create_quiz', 'edit_quiz', 'manage_leads'] },
    { label: 'Concerns', path: '/admin/concerns', roles: ['SUPER_ADMIN', 'TENANT_ADMIN', 'INSTRUCTOR', 'STAFF'], icon: 'fa-solid fa-circle-question', permissions: ['view_reports', 'manage_leads', 'view_courses'] },
    {
      label: 'Attendance',
      roles: ['SUPER_ADMIN', 'TENANT_ADMIN', 'INSTRUCTOR', 'STUDENT', 'ATTENDANCE_ADMIN'],
      icon: 'fa-solid fa-clipboard-check',
      featureKey: 'attendance',
      moduleKey: 'attendance',
      permissions: ['mark_attendance', 'view_attendance'],
      submenu: [
        { label: 'Mark Attendance', path: '/attendance', roles: ['SUPER_ADMIN', 'TENANT_ADMIN', 'ATTENDANCE_ADMIN', 'INSTRUCTOR'], icon: 'fa-solid fa-check-double', permissions: ['mark_attendance'] },
        { label: 'My Attendance', path: '/my-attendance', roles: ['INSTRUCTOR', 'STUDENT', 'ATTENDANCE_ADMIN'], icon: 'fa-solid fa-calendar-check', permissions: ['view_attendance'] },
        { label: 'Reports', path: '/attendance-reports', roles: ['SUPER_ADMIN', 'TENANT_ADMIN', 'ATTENDANCE_ADMIN', 'INSTRUCTOR'], icon: 'fa-solid fa-chart-pie', permissions: ['view_reports'] },
      ]
    },
    {
      label: 'Quizzes',
      roles: ['SUPER_ADMIN', 'TENANT_ADMIN', 'INSTRUCTOR'],
      icon: 'fa-solid fa-clipboard-question',
      featureKey: 'quizzes',
      moduleKey: 'quizzes',
      permissions: ['create_quiz', 'edit_quiz', 'view_quiz'],
      submenu: [
        { label: 'My Quizzes', path: '/quizzes', roles: ['INSTRUCTOR', 'STUDENT'], icon: 'fa-solid fa-list-check', permissions: ['view_quiz'] },
        { label: 'Manage Quizzes', path: '/quiz-management', roles: ['SUPER_ADMIN', 'TENANT_ADMIN', 'INSTRUCTOR'], icon: 'fa-solid fa-sliders', permissions: ['create_quiz', 'edit_quiz'] },
        { label: 'All Registrations', path: '/registrations', roles: ['SUPER_ADMIN', 'TENANT_ADMIN', 'INSTRUCTOR'], icon: 'fa-solid fa-users', permissions: ['create_quiz', 'edit_quiz'] },
        { label: 'Question Bank', path: '/question-bank', roles: ['SUPER_ADMIN', 'TENANT_ADMIN', 'INSTRUCTOR'], icon: 'fa-solid fa-database', permissions: ['create_question', 'edit_question'] },
        { label: 'Quiz Reports', path: '/quiz-reports', roles: ['SUPER_ADMIN', 'TENANT_ADMIN', 'INSTRUCTOR'], icon: 'fa-solid fa-chart-line', permissions: ['view_reports'] },
      ]
    },
    {
      label: 'Assignments',
      roles: ['SUPER_ADMIN', 'TENANT_ADMIN', 'INSTRUCTOR'],
      icon: 'fa-solid fa-file-pen',
      featureKey: 'assignments',
      moduleKey: 'assignments',
      permissions: ['manage_assignments', 'submit_assignments', 'view_grades'],
      submenu: [
        { label: 'My Assignments', path: '/assignments', roles: ['STUDENT'], icon: 'fa-solid fa-file-lines', permissions: ['submit_assignments', 'view_grades'] },
        { label: 'Manage Assignments', path: '/admin/assignments', roles: ['SUPER_ADMIN', 'TENANT_ADMIN', 'INSTRUCTOR'], icon: 'fa-solid fa-folder-open', permissions: ['manage_assignments'] },
        { label: 'Assignment Reports', path: '/admin/assignments/reports', roles: ['SUPER_ADMIN', 'TENANT_ADMIN', 'INSTRUCTOR'], icon: 'fa-solid fa-chart-column', permissions: ['view_reports', 'grade_assignments'] },
      ]
    },
    {
      label: 'Code Snippets',
      roles: ['SUPER_ADMIN', 'TENANT_ADMIN', 'INSTRUCTOR'],
      icon: 'fa-solid fa-code',
      featureKey: 'codingSnippets',
      moduleKey: 'codeAssessments',
      permissions: ['manage_snippets', 'grade_snippets', 'view_snippets'],
      submenu: [
        { label: 'My Assessments', path: '/coding-snippets', roles: ['STUDENT'], icon: 'fa-solid fa-terminal', permissions: ['view_snippets'] },
        { label: 'Manage Assessments', path: '/admin/coding-snippets', roles: ['SUPER_ADMIN', 'TENANT_ADMIN', 'INSTRUCTOR'], icon: 'fa-solid fa-gears', permissions: ['manage_snippets'] },
        { label: 'Grade Submissions', path: '/admin/coding-snippets/grade', roles: ['SUPER_ADMIN', 'TENANT_ADMIN', 'INSTRUCTOR'], icon: 'fa-solid fa-star-half-stroke', permissions: ['manage_snippets', 'grade_snippets'] },
      ]
    },
    // ── Student learning section: journey → do → review ──────────────────────
    { label: 'My Learning Plan', path: '/my-learning', roles: ['STUDENT'], icon: 'fa-solid fa-graduation-cap', featureKey: 'learningPlan' as keyof StudentFeatures, permissions: ['enroll_courses', 'view_courses'] },
    { label: 'My Tasks',         path: '/my-tasks',     roles: ['STUDENT'], icon: 'fa-solid fa-list-check',     permissions: ['enroll_courses', 'view_courses'] },
    // "My Work" = review past quizzes/assignments/code + grades (the gradebook).
    {
      label: 'My Work',
      roles: ['STUDENT'],
      icon: 'fa-solid fa-folder-open',
      permissions: ['view_quiz', 'view_grades', 'view_snippets'],
      submenu: [
        { label: 'My Quizzes',     path: '/quizzes',         roles: ['STUDENT'], icon: 'fa-solid fa-list-check',  permissions: ['view_quiz'] },
        { label: 'My Assignments', path: '/assignments',     roles: ['STUDENT'], icon: 'fa-solid fa-file-lines',  permissions: ['submit_assignments', 'view_grades'] },
        { label: 'My Code Practice', path: '/coding-snippets', roles: ['STUDENT'], icon: 'fa-solid fa-terminal',  permissions: ['view_snippets'] },
      ],
    },
    // Student Reports & Student Profiles merged into the unified Student Detail page — click a student in Users.
    { label: 'My College Portal',  path: '/student/college',           roles: ['STUDENT'], icon: 'fa-solid fa-university',  moduleKey: 'placement', permissions: ['enroll_courses', 'view_courses'] },
    { label: 'My Applications',    path: '/student/my-applications',   roles: ['STUDENT'], icon: 'fa-solid fa-file-lines',  moduleKey: 'placement', permissions: ['enroll_courses', 'view_courses'] },
    { label: 'Alumni Directory',   path: '/student/alumni-directory',  roles: ['STUDENT'], icon: 'fa-solid fa-graduation-cap', moduleKey: 'placement', permissions: ['enroll_courses', 'view_courses'] },
    { label: 'Notifications',      path: '/notifications',             roles: ['STUDENT', 'TENANT_ADMIN', 'SUPER_ADMIN', 'INSTRUCTOR', 'STAFF'], icon: 'fa-solid fa-bell', permissions: [] },
    {
      label: 'College',
      roles: ['SUPER_ADMIN', 'TENANT_ADMIN'],
      icon: 'fa-solid fa-university',
      moduleKey: 'placement',
      permissions: ['manage_tenant_settings', 'manage_tenant'],
      submenu: [
        { label: 'Departments',     path: '/admin/college/departments',           roles: ['SUPER_ADMIN', 'TENANT_ADMIN'], icon: 'fa-solid fa-building-columns', permissions: ['manage_tenant_settings', 'manage_tenant'] },
        { label: 'Members',         path: '/admin/college/members',               roles: ['SUPER_ADMIN', 'TENANT_ADMIN'], icon: 'fa-solid fa-users',            permissions: ['manage_tenant_settings', 'manage_tenant'] },
        { label: 'Curriculum',      path: '/admin/college/curriculum',            roles: ['SUPER_ADMIN', 'TENANT_ADMIN'], icon: 'fa-solid fa-book-open',        permissions: ['manage_tenant_settings', 'manage_tenant'] },
        { label: 'CRT Sessions',    path: '/admin/college/crt',                   roles: ['SUPER_ADMIN', 'TENANT_ADMIN'], icon: 'fa-solid fa-person-chalkboard',permissions: ['manage_tenant_settings', 'manage_tenant'] },
        { label: 'Placement Drives',path: '/admin/college/placement',             roles: ['SUPER_ADMIN', 'TENANT_ADMIN'], icon: 'fa-solid fa-briefcase',        permissions: ['manage_tenant_settings', 'manage_tenant'] },
        { label: 'Placement Analytics', path: '/admin/college/placement-analytics', roles: ['SUPER_ADMIN', 'TENANT_ADMIN'], icon: 'fa-solid fa-chart-pie',     permissions: ['manage_tenant_settings', 'manage_tenant'] },
        { label: 'Alumni',          path: '/admin/college/alumni',                roles: ['SUPER_ADMIN', 'TENANT_ADMIN'], icon: 'fa-solid fa-graduation-cap',  permissions: ['manage_tenant_settings', 'manage_tenant'] },
        { label: 'Reports',         path: '/admin/college/reports',               roles: ['SUPER_ADMIN', 'TENANT_ADMIN'], icon: 'fa-solid fa-chart-column',    permissions: ['manage_tenant_settings', 'manage_tenant'] },
        { label: 'Settings',        path: '/admin/college/settings',              roles: ['SUPER_ADMIN', 'TENANT_ADMIN'], icon: 'fa-solid fa-sliders',         permissions: ['manage_tenant_settings', 'manage_tenant'] },
      ]
    },
    {
      label: 'Learning Plans',
      roles: ['SUPER_ADMIN', 'TENANT_ADMIN', 'INSTRUCTOR'],
      icon: 'fa-solid fa-calendar-days',
      permissions: ['create_courses', 'edit_courses', 'manage_own_courses'],
      submenu: [
        { label: 'Content Library',    path: '/learning-library',    roles: ['SUPER_ADMIN', 'TENANT_ADMIN', 'INSTRUCTOR'], icon: 'fa-solid fa-book',          permissions: ['create_courses', 'edit_courses', 'manage_own_courses'] },
        { label: 'Curriculum Builder', path: '/curriculum-builder',  roles: ['SUPER_ADMIN', 'TENANT_ADMIN', 'INSTRUCTOR'], icon: 'fa-solid fa-sitemap',       permissions: ['create_courses', 'edit_courses', 'manage_own_courses'] },
        { label: 'Enrollments',        path: '/enrollment-plans',    roles: ['SUPER_ADMIN', 'TENANT_ADMIN', 'INSTRUCTOR'], icon: 'fa-solid fa-user-graduate',  permissions: ['create_courses', 'edit_courses', 'manage_own_courses'] },
        { label: 'Batch Offerings',    path: '/batch-offerings',     roles: ['SUPER_ADMIN', 'TENANT_ADMIN', 'INSTRUCTOR'], icon: 'fa-solid fa-calendar-days',  permissions: ['create_courses', 'edit_courses', 'manage_own_courses'] },
      ]
    },
    { label: 'Student Features', path: '/student-features', roles: ['SUPER_ADMIN', 'TENANT_ADMIN'], icon: 'fa-solid fa-toggle-on', permissions: ['manage_tenant_settings', 'manage_tenant'] },
    { label: 'API Logs', path: '/admin/logs', roles: ['SUPER_ADMIN', 'TENANT_ADMIN', 'STAFF'], icon: 'fa-solid fa-bug', permissions: ['manage_tenant_settings', 'manage_tenant', 'view_reports'] },
    { label: 'Recording Diagnostics', path: '/admin/recording-diagnostics', roles: ['SUPER_ADMIN', 'TENANT_ADMIN', 'INSTRUCTOR'], icon: 'fa-solid fa-clapperboard', permissions: ['manage_tenant_users', 'manage_tenant', 'create_courses', 'edit_courses', 'manage_own_courses'] },
    { label: 'Tenant Management', path: '/super-admin/tenants', roles: ['SUPER_ADMIN'], icon: 'fa-solid fa-building', permissions: ['manage_tenants'] },
    { label: 'Platform Settings', path: '/admin/platform-settings', roles: ['SUPER_ADMIN'], icon: 'fa-solid fa-key', permissions: ['manage_tenants'] },
    { label: 'Interview Q&A Bank', path: '/interview-question-bank', roles: ['SUPER_ADMIN', 'TENANT_ADMIN', 'INSTRUCTOR'], icon: 'fa-solid fa-briefcase', moduleKey: 'mockInterviews', permissions: ['manage_interviews'] },
    { label: 'Scheduled Interviews', path: '/scheduled-interviews', roles: ['SUPER_ADMIN', 'TENANT_ADMIN', 'INSTRUCTOR'], icon: 'fa-solid fa-calendar-check', permissions: ['manage_tenant_users', 'create_courses', 'edit_courses', 'manage_own_courses', 'manage_tenant'] },
    { label: 'My Interviews', path: '/my-interviews', roles: ['STUDENT'], icon: 'fa-solid fa-microphone-lines', permissions: ['enroll_courses', 'view_courses'] },
    { label: 'Apply Leave', path: '/my-leave', roles: ['STUDENT'], icon: 'fa-solid fa-calendar-xmark', moduleKey: 'attendance', permissions: ['enroll_courses', 'view_courses'] },
    { label: 'Code Playground', path: '/playground', roles: ['STUDENT', 'SUPER_ADMIN', 'TENANT_ADMIN', 'INSTRUCTOR'], icon: 'fa-solid fa-code', moduleKey: 'codeAssessments', permissions: ['enroll_courses', 'view_courses', 'create_courses', 'edit_courses', 'manage_own_courses', 'manage_tenant'] },
    { label: 'Project Builder', path: '/project-builder', roles: ['STUDENT', 'SUPER_ADMIN', 'TENANT_ADMIN', 'INSTRUCTOR'], icon: 'fa-solid fa-rocket', permissions: ['enroll_courses', 'view_courses', 'submit_assignments', 'create_courses', 'edit_courses', 'manage_own_courses', 'manage_tenant'] },
    { label: 'Job Tracker', path: '/job-tracker', roles: ['STUDENT', 'SUPER_ADMIN', 'TENANT_ADMIN', 'INSTRUCTOR'], icon: 'fa-solid fa-briefcase', permissions: ['enroll_courses', 'view_courses', 'submit_assignments', 'create_courses', 'edit_courses', 'manage_own_courses', 'manage_tenant'] },
    { label: 'AI Mentor', path: '/ai-mentor', roles: ['STUDENT', 'SUPER_ADMIN', 'TENANT_ADMIN', 'INSTRUCTOR'], icon: 'fa-solid fa-compass', permissions: ['enroll_courses', 'view_courses', 'submit_assignments', 'create_courses', 'edit_courses', 'manage_own_courses', 'manage_tenant'] },
    { label: 'Project Library', path: '/resource-library', roles: ['STUDENT', 'SUPER_ADMIN', 'TENANT_ADMIN', 'INSTRUCTOR'], icon: 'fa-solid fa-folder-open', permissions: ['enroll_courses', 'view_courses', 'submit_assignments', 'create_courses', 'edit_courses', 'manage_own_courses', 'manage_tenant'] },
    { label: 'Speaking Practice', path: '/speaking-practice', roles: ['STUDENT', 'SUPER_ADMIN', 'TENANT_ADMIN', 'INSTRUCTOR'], icon: 'fa-solid fa-microphone', permissions: ['enroll_courses', 'view_courses', 'submit_assignments', 'create_courses', 'edit_courses', 'manage_own_courses', 'manage_tenant'] },
    { label: 'Logical Thinking Lab', path: '/thinking-lab', roles: ['STUDENT'], icon: 'fa-solid fa-brain', permissions: ['enroll_courses', 'view_courses', 'submit_assignments'] },
    { label: 'Thinking Lab — Bank', path: '/admin/thinking-lab', roles: ['SUPER_ADMIN', 'TENANT_ADMIN', 'INSTRUCTOR'], icon: 'fa-solid fa-lightbulb', permissions: ['create_courses', 'edit_courses', 'manage_own_courses', 'manage_tenant'] },
    { label: 'Resource Library', path: '/admin/resources', roles: ['SUPER_ADMIN', 'TENANT_ADMIN', 'INSTRUCTOR'], icon: 'fa-solid fa-box-archive', permissions: ['create_courses', 'edit_courses', 'manage_own_courses', 'manage_tenant'] },
    { label: 'Speaking Tasks', path: '/admin/speaking-tasks', roles: ['SUPER_ADMIN', 'TENANT_ADMIN', 'INSTRUCTOR'], icon: 'fa-solid fa-comment-dots', permissions: ['create_courses', 'edit_courses', 'manage_own_courses', 'manage_tenant'] },
    { label: 'Leave Requests', path: '/admin/leave-requests', roles: ['SUPER_ADMIN', 'TENANT_ADMIN', 'INSTRUCTOR'], icon: 'fa-solid fa-calendar-xmark', moduleKey: 'attendance', permissions: ['manage_tenant_users', 'manage_tenant', 'create_courses', 'edit_courses', 'manage_own_courses'] },
    { label: 'Resume Builder', path: '/resume-builder', roles: ['STUDENT', 'SUPER_ADMIN', 'TENANT_ADMIN', 'INSTRUCTOR'], icon: 'fa-solid fa-file-lines', featureKey: 'resumeBuilder' as keyof StudentFeatures, permissions: ['enroll_courses', 'submit_assignments', 'manage_tenant_users', 'manage_tenant', 'create_courses', 'edit_courses', 'manage_own_courses'] },
    { label: 'Career Profile', path: '/career-profile', roles: ['STUDENT'], icon: 'fa-solid fa-id-badge', permissions: ['enroll_courses', 'view_courses'] },
    { label: 'Career Profiles', path: '/admin/career-profiles', roles: ['SUPER_ADMIN', 'TENANT_ADMIN', 'INSTRUCTOR'], icon: 'fa-solid fa-id-badge', permissions: ['manage_tenant_users', 'manage_tenant', 'create_courses', 'edit_courses', 'manage_own_courses'] },
    { label: 'Partner Pipeline', path: '/admin/partners', roles: ['SUPER_ADMIN', 'TENANT_ADMIN', 'STAFF'], icon: 'fa-solid fa-handshake', permissions: ['manage_leads', 'manage_tenant'] },
    {
      label: 'AI Interviews',
      roles: ['SUPER_ADMIN', 'TENANT_ADMIN', 'INSTRUCTOR'],
      icon: 'fa-solid fa-robot',
      featureKey: 'mockInterviews',
      moduleKey: 'mockInterviews',
      permissions: ['manage_interview_templates', 'assign_interviews', 'evaluate_interviews', 'manage_interviews'],
      submenu: [
        { label: 'Templates', path: '/admin/interviews/templates', roles: ['SUPER_ADMIN', 'TENANT_ADMIN', 'INSTRUCTOR'], icon: 'fa-solid fa-layer-group', permissions: ['manage_interview_templates'] },
        { label: 'Question Bank', path: '/admin/interviews/question-bank', roles: ['SUPER_ADMIN', 'TENANT_ADMIN', 'INSTRUCTOR'], icon: 'fa-solid fa-database', permissions: ['manage_interview_templates'] },
        { label: 'Assignments', path: '/admin/interviews/assignments', roles: ['SUPER_ADMIN', 'TENANT_ADMIN', 'INSTRUCTOR'], icon: 'fa-solid fa-user-plus', permissions: ['assign_interviews'] },
        { label: 'Analytics', path: '/admin/interviews/analytics', roles: ['SUPER_ADMIN', 'TENANT_ADMIN', 'INSTRUCTOR'], icon: 'fa-solid fa-chart-line', permissions: ['manage_interview_templates'] },
      ]
    },
    {
      label: 'Leads',
      roles: ['SUPER_ADMIN', 'TENANT_ADMIN', 'STAFF'],
      icon: 'fa-solid fa-user-tag',
      moduleKey: 'leads',
      permissions: ['manage_leads', 'view_leads', 'create_leads', 'edit_leads'],
      submenu: [
        { label: 'All Leads', path: '/leads', roles: ['SUPER_ADMIN', 'TENANT_ADMIN', 'STAFF'], icon: 'fa-solid fa-users-viewfinder', permissions: ['manage_leads', 'view_leads'] },
        { label: 'Follow-up Calendar', path: '/follow-ups', roles: ['SUPER_ADMIN', 'TENANT_ADMIN', 'STAFF'], icon: 'fa-solid fa-calendar-days', permissions: ['view_leads', 'edit_leads'] },
        { label: 'Seat Reservations', path: '/seat-reservations', roles: ['SUPER_ADMIN', 'TENANT_ADMIN', 'STAFF'], icon: 'fa-solid fa-ticket', permissions: ['manage_leads', 'view_leads', 'convert_leads'] },
        { label: 'Analytics', path: '/leads/analytics', roles: ['SUPER_ADMIN', 'TENANT_ADMIN'], icon: 'fa-solid fa-chart-simple', permissions: ['manage_leads', 'view_lead_analytics'] },
        { label: 'My Performance', path: '/lead-my-performance', roles: ['STAFF'], icon: 'fa-solid fa-trophy', permissions: ['view_leads', 'edit_leads', 'create_leads'] },
        { label: 'Manager Board', path: '/lead-manager-board', roles: ['SUPER_ADMIN', 'TENANT_ADMIN', 'STAFF'], icon: 'fa-solid fa-clipboard-user', permissions: ['manage_leads', 'view_lead_analytics'] },
        { label: 'Team Activity', path: '/team-activity', roles: ['SUPER_ADMIN', 'TENANT_ADMIN'], icon: 'fa-solid fa-chart-column', permissions: ['view_lead_analytics'] },
        { label: 'Sales Content', path: '/sales-content', roles: ['SUPER_ADMIN', 'TENANT_ADMIN', 'STAFF'], icon: 'fa-solid fa-file-invoice', permissions: ['view_leads', 'create_leads'] },
        { label: 'Lead Sources', path: '/lead-sources', roles: ['SUPER_ADMIN', 'TENANT_ADMIN'], icon: 'fa-solid fa-plug-circle-bolt', permissions: ['manage_leads'] },
        { label: 'Lead Stages', path: '/lead-stages', roles: ['SUPER_ADMIN', 'TENANT_ADMIN'], icon: 'fa-solid fa-stairs', permissions: ['manage_leads', 'manage_lead_stages'] },
        { label: 'Priority Settings', path: '/lead-priority-settings', roles: ['SUPER_ADMIN', 'TENANT_ADMIN'], icon: 'fa-solid fa-ranking-star', permissions: ['manage_leads'] },
        { label: 'Qualification Questions', path: '/qualification-settings', roles: ['SUPER_ADMIN', 'TENANT_ADMIN'], icon: 'fa-solid fa-circle-question', permissions: ['manage_leads'] },
        { label: 'Form Settings', path: '/lead-form-settings', roles: ['SUPER_ADMIN', 'TENANT_ADMIN'], icon: 'fa-solid fa-pen-to-square', permissions: ['manage_leads'] },
        { label: 'Google Sheets', path: '/google-sheet-integration', roles: ['SUPER_ADMIN', 'TENANT_ADMIN'], icon: 'fa-solid fa-table', permissions: ['manage_leads'] },
        { label: 'Lead Scoring', path: '/lead-scoring-settings', roles: ['SUPER_ADMIN', 'TENANT_ADMIN'], icon: 'fa-solid fa-sliders', permissions: ['manage_leads'] },
        { label: 'Audit Logs', path: '/lead-audit-logs', roles: ['SUPER_ADMIN', 'TENANT_ADMIN'], icon: 'fa-solid fa-clock-rotate-left', permissions: ['manage_leads'] },
        { label: 'AI Call Config', path: '/ai-call-config', roles: ['SUPER_ADMIN', 'TENANT_ADMIN'], icon: 'fa-solid fa-phone-volume', permissions: ['manage_leads'] },
      ]
    },
  ];

  const hasAccessToMenu = (item: MenuItem): boolean => {
    if (!user) return false;

    const roleAllowed = !!(user.role && item.roles.includes(user.role));

    // STAFF users with custom permissions can access menu items based on permissions alone,
    // regardless of whether their role is listed in the item's roles array.
    if (!roleAllowed && user.role === 'STAFF' && user.permissions && user.permissions.length > 0 && item.permissions) {
      return item.permissions.some(p => user.permissions!.includes(p));
    }

    // For all other roles: role is always a hard gate
    if (!roleAllowed) return false;

    // If user has a permissions array (custom role), also verify at least one permission matches
    // SUPER_ADMIN bypasses permission checks — role alone is the gate
    if (user.role !== 'SUPER_ADMIN' && user.permissions && user.permissions.length > 0 && item.permissions) {
      const hasPermission = item.permissions.some(p => user.permissions!.includes(p));
      if (!hasPermission) return false;
    }

    // Platform-level module gate (applies to ALL roles — set by SUPER_ADMIN per tenant)
    if (item.moduleKey && !isModuleEnabled(item.moduleKey)) {
      return false;
    }

    // For students, check if the feature is enabled by admin
    if (user.role === 'STUDENT' && item.featureKey && !isFeatureEnabled(item.featureKey)) {
      return false;
    }
    return true;
  };

  const roleFilteredItems = menuItems.filter(hasAccessToMenu);

  // CareerPilot participants get a focused career-only nav — no batch LMS clutter
  // (Attendance, Apply Leave, Assignments, Quizzes, My Tasks/My Work, Fees, etc.).
  const isCareerPilot = !!(user as any)?.isCareerPilot && user?.role === 'STUDENT';
  const CAREERPILOT_NAV = ['dashboard', 'learning plan', 'interview', 'playground', 'project builder', 'job tracker', 'ai mentor', 'resume', 'career profile'];
  const inCareerPilotNav = (label: string) => {
    const l = label.toLowerCase();
    return CAREERPILOT_NAV.some(k => l.includes(k));
  };
  const filteredItems = isCareerPilot
    ? roleFilteredItems.filter(i => inCareerPilotNav(i.label))
    : roleFilteredItems;

  const renderMenuItem = (item: MenuItem, isSubmenu = false) => {
    if (!hasAccessToMenu(item)) return null;

    if (item.submenu) {
      const visibleSubitems = item.submenu.filter(subitem => hasAccessToMenu(subitem));
      if (visibleSubitems.length === 0) return null;

      // Flatten: if only one subitem is visible (e.g. students see a single child),
      // render it as a direct menu link instead of an expandable group.
      if (visibleSubitems.length === 1) {
        const only = visibleSubitems[0];
        return (
          <li key={only.path} className={isSubmenu ? 'submenu-item' : ''}>
            <Link
              to={only.path!}
              className={`sidebar-link ${isActive(only.path) ? 'active' : ''}`}
              onClick={onMobileClose}
            >
              <span className="menu-icon"><i className={item.icon || only.icon}></i></span>
              <span className="sidebar-label">{item.label}</span>
            </Link>
          </li>
        );
      }

      const isExpanded = expandedGroups[item.label.toLowerCase()];
      return (
        <div key={item.label} className="menu-group">
          <button
            className={`sidebar-group-button ${isExpanded ? 'expanded' : ''}`}
            onClick={() => toggleGroup(item.label.toLowerCase())}
          >
            <span className="group-icon"><i className={item.icon}></i></span>
            <span className="group-label">{item.label}</span>
            <span className="group-chevron"><i className="fa-solid fa-chevron-right"></i></span>
          </button>
          {isExpanded && (
            <ul className="submenu">
              {visibleSubitems.map((subitem) => (
                <li key={subitem.path}>
                  <Link
                    to={subitem.path!}
                    className={`sidebar-link submenu-link ${isActive(subitem.path) ? 'active' : ''}`}                    onClick={onMobileClose}                  >
                    {subitem.icon && <span className="submenu-icon"><i className={subitem.icon}></i></span>}
                    <span className="sidebar-label">{subitem.label}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      );
    }

    return (
      <li key={item.path} className={isSubmenu ? 'submenu-item' : ''}>
        <Link
          to={item.path!}
          className={`sidebar-link ${isActive(item.path) ? 'active' : ''}`}
          onClick={onMobileClose}
        >
          <span className="menu-icon"><i className={item.icon}></i></span>
          <span className="sidebar-label">{item.label}</span>
        </Link>
      </li>
    );
  };

  // Group menu items by section for students
  const isStudent = user?.role === 'STUDENT';
  
  const mainItems = filteredItems.filter(i => ['Dashboard', 'My Course', 'My courses'].includes(i.label));
  const academicItems = filteredItems.filter(i => ['My Learning Plan', 'My Tasks', 'Assignments', 'Quizzes', 'Attendance', 'Code Snippets', 'AI Interviews', 'Learning Plans', 'My Work', 'Resume Builder', 'Career Profile', 'Career Profiles', 'My Interviews', 'Apply Leave', 'Code Playground', 'Project Builder', 'Job Tracker', 'AI Mentor', 'Project Library', 'Resource Library', 'Speaking Practice', 'Speaking Tasks', 'Logical Thinking Lab', 'Thinking Lab — Bank'].includes(i.label));
  const supportItems = filteredItems.filter(i => ['Help & support'].includes(i.label));
  const otherItems = filteredItems.filter(i => !mainItems.includes(i) && !academicItems.includes(i) && !supportItems.includes(i));

  return (
    <aside className={`sidebar ${isOpen ? 'open' : 'closed'} ${mobileOpen ? 'mobile-open' : ''}`}>
      {/* Sidebar Header - Logo */}
      <div className="sidebar-brand">
        <div className="brand-icon" onClick={() => { if (mobileOpen) { onMobileClose?.(); } else { setIsOpen(!isOpen); } }} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { if (mobileOpen) onMobileClose?.(); else setIsOpen(!isOpen); } }}>
          <i className="fa-solid fa-bars"></i>
        </div>
        {!isStudent && <span className="brand-menu-label">Menu</span>}
      </div>

      {/* Search */}
      {isOpen && (
        <div className="sidebar-search">
          <i className="fa-solid fa-magnifying-glass"></i>
          <input type="text" placeholder="Search courses, topics..." />
        </div>
      )}

      {/* Navigation - grouped for students */}
      <nav className="sidebar-nav">
        {isStudent ? (
          <>
            {mainItems.length > 0 && (
              <div className="nav-section">
                <span className="nav-section-label">MAIN</span>
                <ul>{mainItems.map(item => renderMenuItem(item))}</ul>
              </div>
            )}
            {academicItems.length > 0 && (
              <div className="nav-section">
                <span className="nav-section-label">ACADEMICS</span>
                <ul>{academicItems.map(item => renderMenuItem(item))}</ul>
              </div>
            )}
            {supportItems.length > 0 && (
              <div className="nav-section">
                <span className="nav-section-label">SUPPORT</span>
                <ul>{supportItems.map(item => renderMenuItem(item))}</ul>
              </div>
            )}
          </>
        ) : (
          <>
            {otherItems.length > 0 && (
              <ul>{[...mainItems, ...otherItems, ...academicItems].map(item => renderMenuItem(item))}</ul>
            )}
            {otherItems.length === 0 && (
              <ul>{filteredItems.map(item => renderMenuItem(item))}</ul>
            )}
          </>
        )}
      </nav>

      {/* User card at bottom — hidden for students (shown top-right navbar already) */}
      {isOpen && user && !isStudent && (
        <div className="sidebar-user" onClick={() => navigate('/profile')}>
          <div className="sidebar-user-avatar">
            {user.firstName?.[0]?.toUpperCase()}{user.lastName?.[0]?.toUpperCase()}
          </div>
          <div className="sidebar-user-info">
            <span className="sidebar-user-name">{user.firstName} {user.lastName}</span>
            <span className="sidebar-user-role">{user.batchName || user.role}</span>
          </div>
          <i className="fa-solid fa-chevron-right sidebar-user-arrow"></i>
        </div>
      )}
      {/* Time + version footer — staff only (students don't need it) */}
      {isOpen && !isStudent && (
        <div style={{ padding: '8px 16px 12px', textAlign: 'center', borderTop: '1px solid #e8ecf3', marginTop: 4 }}>
          <div style={{ fontSize: 13, color: '#475569', fontWeight: 600, letterSpacing: '0.5px', marginBottom: 4 }}>
            {currentTime}
          </div>
          <div style={{ fontSize: 12, color: '#1e3a8a', fontWeight: 700, letterSpacing: '0.3px' }}>
            Version {APP_VERSION}{BUILD_DATE ? ` · ${BUILD_DATE}` : ''}
          </div>
        </div>
      )}
    </aside>
  );
};

export default Sidebar;