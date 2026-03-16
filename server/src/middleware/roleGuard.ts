import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types';
import Role from '../models/Role';

// All available permissions grouped by feature module
export const PERMISSION_GROUPS: Record<string, { label: string; permissions: { key: string; label: string }[] }> = {
  users: {
    label: 'Users & Roles',
    permissions: [
      { key: 'manage_tenant_users', label: 'Manage Users (Create, Edit, Delete, Invite)' },
      { key: 'manage_roles', label: 'Manage Roles & Permissions' },
      { key: 'manage_instructors', label: 'Manage Instructors' },
      { key: 'view_enrolled_students', label: 'View Enrolled Students' },
    ]
  },
  courses: {
    label: 'Courses & Content',
    permissions: [
      { key: 'create_courses', label: 'Create Courses / Subjects / Chapters' },
      { key: 'edit_courses', label: 'Edit Courses / Subjects / Chapters' },
      { key: 'delete_courses', label: 'Delete Courses / Subjects / Chapters' },
      { key: 'view_courses', label: 'View Courses' },
      { key: 'manage_own_courses', label: 'Manage Own Courses' },
      { key: 'create_lessons', label: 'Create Lessons' },
      { key: 'manage_enrollments', label: 'Manage Enrollments' },
      { key: 'enroll_courses', label: 'Enroll in Courses' },
      { key: 'view_public_courses', label: 'View Public Courses' },
      { key: 'access_resources', label: 'Access Course Resources' },
    ]
  },
  batches: {
    label: 'Batches',
    permissions: [
      { key: 'manage_tenant_courses', label: 'Manage Batches (Create, Edit, Delete)' },
    ]
  },
  attendance: {
    label: 'Attendance',
    permissions: [
      { key: 'mark_attendance', label: 'Mark Attendance' },
      { key: 'view_attendance', label: 'View Own Attendance' },
    ]
  },
  quizzes: {
    label: 'Quizzes',
    permissions: [
      { key: 'create_quiz', label: 'Create Quizzes' },
      { key: 'edit_quiz', label: 'Edit Quizzes' },
      { key: 'delete_quiz', label: 'Delete Quizzes' },
      { key: 'view_quiz', label: 'View / Take Quizzes' },
    ]
  },
  questions: {
    label: 'Question Bank',
    permissions: [
      { key: 'create_question', label: 'Create Questions' },
      { key: 'edit_question', label: 'Edit Questions' },
      { key: 'delete_question', label: 'Delete Questions' },
    ]
  },
  assignments: {
    label: 'Assignments',
    permissions: [
      { key: 'manage_assignments', label: 'Manage Assignments (Create, Edit, Delete)' },
      { key: 'submit_assignments', label: 'Submit Assignments' },
      { key: 'grade_assignments', label: 'Grade Assignments' },
      { key: 'grade_submissions', label: 'Grade & Review Submissions' },
      { key: 'view_grades', label: 'View Grades' },
    ]
  },
  interviews: {
    label: 'Mock Interviews',
    permissions: [
      { key: 'manage_interviews', label: 'Manage Interview Questions & Bank' },
      { key: 'take_interviews', label: 'Take Mock Interviews' },
    ]
  },
  reports: {
    label: 'Reports & Analytics',
    permissions: [
      { key: 'view_reports', label: 'View Reports (Quiz, Attendance, Student)' },
      { key: 'view_analytics', label: 'View Analytics Dashboard' },
      { key: 'view_tenant_analytics', label: 'View Tenant Analytics' },
    ]
  },
  admin: {
    label: 'Administration',
    permissions: [
      { key: 'manage_tenant', label: 'Manage Tenant Settings' },
      { key: 'manage_tenant_settings', label: 'Manage Organization Settings' },
      { key: 'manage_tenants', label: 'Manage All Tenants (Super Admin)' },
      { key: 'manage_all_users', label: 'Manage All Users (Super Admin)' },
      { key: 'manage_system_settings', label: 'System Settings (Super Admin)' },
      { key: 'manage_billing', label: 'Manage Billing (Super Admin)' },
    ]
  },
  leads: {
    label: 'Lead Management',
    permissions: [
      { key: 'manage_leads', label: 'Manage Leads (Create, Edit, Delete, Stages)' },
      { key: 'view_leads', label: 'View Leads' },
    ]
  },
  marketing: {
    label: 'Marketing Intelligence',
    permissions: [
      { key: 'manage_marketing', label: 'Marketing Intelligence Dashboard' },
    ]
  },
};

// Flatten all permission keys
export const ALL_PERMISSIONS = Object.values(PERMISSION_GROUPS)
  .flatMap(group => group.permissions.map(p => p.key));

export const ROLE_PERMISSIONS: Record<string, string[]> = {
  SUPER_ADMIN: ALL_PERMISSIONS, // Super admin gets everything
  TENANT_ADMIN: [
    // Users & Roles
    'manage_tenant_users', 'manage_roles', 'manage_instructors', 'view_enrolled_students',
    // Courses & Content
    'create_courses', 'edit_courses', 'delete_courses', 'view_courses',
    'manage_own_courses', 'create_lessons', 'manage_enrollments', 'enroll_courses',
    'view_public_courses', 'access_resources',
    // Batches
    'manage_tenant_courses',
    // Attendance
    'mark_attendance', 'view_attendance',
    // Quizzes
    'create_quiz', 'edit_quiz', 'delete_quiz', 'view_quiz',
    // Questions
    'create_question', 'edit_question', 'delete_question',
    // Assignments
    'manage_assignments', 'grade_assignments', 'grade_submissions', 'view_grades',
    // Interviews
    'manage_interviews', 'take_interviews',
    // Reports
    'view_reports', 'view_analytics', 'view_tenant_analytics',
    // Admin
    'manage_tenant', 'manage_tenant_settings',
    // Leads
    'manage_leads', 'view_leads',
    // Marketing
    'manage_marketing',
  ],
  INSTRUCTOR: [
    // Courses
    'create_courses', 'edit_courses', 'manage_own_courses', 'view_courses',
    'create_lessons', 'manage_enrollments', 'enroll_courses',
    'view_enrolled_students', 'access_resources',
    // Attendance
    'mark_attendance', 'view_attendance',
    // Quizzes
    'create_quiz', 'edit_quiz', 'delete_quiz', 'view_quiz',
    // Questions
    'create_question', 'edit_question', 'delete_question',
    // Assignments
    'manage_assignments', 'grade_assignments', 'grade_submissions', 'view_grades',
    // Interviews
    'manage_interviews', 'take_interviews',
    // Reports
    'view_reports',
  ],
  ATTENDANCE_ADMIN: [
    'mark_attendance', 'view_attendance', 'view_reports',
  ],
  STUDENT: [
    'enroll_courses', 'view_courses', 'view_public_courses', 'access_resources',
    'submit_assignments', 'view_grades', 'view_attendance', 'view_quiz',
    'take_interviews',
  ],
  GUEST: ['view_public_courses'],
};

export const roleGuard = (requiredPermissions: string[]) => {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ 
        success: false, 
        message: 'User not authenticated' 
      });
    }

    const userRole = req.user.role;
    let userPermissions: string[];

    // If user has a custom role assigned, use that role's permissions
    if (req.user.customRoleId) {
      try {
        const customRole = await Role.findById(req.user.customRoleId);
        userPermissions = customRole ? customRole.permissions : (ROLE_PERMISSIONS[userRole] || []);
      } catch {
        userPermissions = ROLE_PERMISSIONS[userRole] || [];
      }
    } else {
      userPermissions = ROLE_PERMISSIONS[userRole] || [];
    }

    const hasPermission = requiredPermissions.some(perm => 
      userPermissions.includes(perm)
    );

    if (!hasPermission) {
      return res.status(403).json({ 
        success: false, 
        message: 'Access denied - insufficient permissions' 
      });
    }

    next();
  };
};