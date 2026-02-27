export enum UserRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  TENANT_ADMIN = 'TENANT_ADMIN',
  INSTRUCTOR = 'INSTRUCTOR',
  STUDENT = 'STUDENT',
  GUEST = 'GUEST'
}

export const ROLE_PERMISSIONS: Record<UserRole, string[]> = {
  [UserRole.SUPER_ADMIN]: [
    'manage_tenants',
    'manage_all_users',
    'manage_system_settings',
    'view_analytics',
    'manage_billing'
  ],
  [UserRole.TENANT_ADMIN]: [
    'manage_tenant_users',
    'manage_tenant_courses',
    'manage_tenant_settings',
    'view_tenant_analytics',
    'manage_instructors'
  ],
  [UserRole.INSTRUCTOR]: [
    'create_courses',
    'manage_own_courses',
    'view_enrolled_students',
    'grade_assignments',
    'create_lessons'
  ],
  [UserRole.STUDENT]: [
    'enroll_courses',
    'view_courses',
    'submit_assignments',
    'view_grades',
    'access_resources'
  ],
  [UserRole.GUEST]: [
    'view_public_courses'
  ]
};