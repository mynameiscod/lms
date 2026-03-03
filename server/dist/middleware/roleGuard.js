"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.roleGuard = void 0;
const ROLE_PERMISSIONS = {
    SUPER_ADMIN: [
        'manage_tenants', 'manage_all_users', 'manage_system_settings',
        'view_analytics', 'manage_billing', 'create_courses', 'manage_own_courses',
        'view_enrolled_students', 'grade_assignments', 'create_lessons',
        'enroll_courses', 'view_courses', 'submit_assignments', 'view_grades',
        'access_resources', 'manage_tenant_users', 'manage_tenant_courses',
        'manage_tenant_settings', 'view_tenant_analytics', 'manage_instructors',
        'view_public_courses', 'manage_roles', 'mark_attendance', 'view_attendance'
    ],
    TENANT_ADMIN: [
        'manage_roles', 'manage_tenant_users', 'manage_tenant_courses', 'manage_tenant_settings',
        'view_tenant_analytics', 'manage_instructors', 'create_courses',
        'manage_own_courses', 'view_enrolled_students', 'grade_assignments',
        'create_lessons', 'enroll_courses', 'view_courses', 'view_grades', 'mark_attendance',
        'create_quiz', 'edit_quiz', 'delete_quiz', 'create_question', 'edit_question', 'delete_question'
    ],
    INSTRUCTOR: [
        'create_courses', 'manage_own_courses', 'view_enrolled_students',
        'grade_assignments', 'create_lessons', 'enroll_courses', 'view_courses',
        'view_grades', 'access_resources', 'mark_attendance', 'view_attendance'
    ],
    STUDENT: [
        'enroll_courses', 'view_courses', 'submit_assignments', 'view_grades',
        'access_resources', 'view_public_courses', 'view_attendance'
    ],
    GUEST: ['view_public_courses']
};
const roleGuard = (requiredPermissions) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'User not authenticated'
            });
        }
        const userRole = req.user.role;
        const userPermissions = ROLE_PERMISSIONS[userRole] || [];
        const hasPermission = requiredPermissions.some(perm => userPermissions.includes(perm));
        if (!hasPermission) {
            return res.status(403).json({
                success: false,
                message: 'Access denied - insufficient permissions'
            });
        }
        next();
    };
};
exports.roleGuard = roleGuard;
//# sourceMappingURL=roleGuard.js.map