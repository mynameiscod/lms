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
      { key: 'manage_interview_templates', label: 'Create & Manage Interview Templates' },
      { key: 'assign_interviews', label: 'Assign Interviews to Students' },
      { key: 'evaluate_interviews', label: 'Evaluate & Review Interview Attempts' },
      { key: 'attempt_interviews', label: 'Attempt Assigned Interviews' },
    ]
  },
  exams: {
    label: 'Exams (Offline / External Marks)',
    permissions: [
      { key: 'manage_exams', label: 'Record, Edit & Delete Exam Marks' },
      { key: 'view_exams', label: 'View Exam Records' },
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
    ]
  },
  fees: {
    label: 'Fee Management',
    permissions: [
      { key: 'view_fees', label: 'View Fees, Dues & Receipts' },
      { key: 'manage_billing', label: 'Record Payments, Set Fees & Send Reminders' },
    ]
  },
  leads: {
    label: 'Lead Management',
    permissions: [
      { key: 'manage_leads', label: 'Full Lead Management (Admin)' },
      { key: 'view_leads', label: 'View Leads' },
      { key: 'create_leads', label: 'Create Leads' },
      { key: 'edit_leads', label: 'Edit Leads' },
      { key: 'delete_leads', label: 'Delete Leads' },
      { key: 'assign_leads', label: 'Assign Leads to Users' },
      { key: 'export_leads', label: 'Export / Import Leads' },
      { key: 'view_lead_analytics', label: 'View Lead Analytics & Reports' },
      { key: 'manage_lead_stages', label: 'Manage Lead Stages & Form Config' },
      { key: 'convert_leads', label: 'Convert Leads to Students' },
    ]
  },
  marketing: {
    label: 'Marketing Intelligence',
    permissions: [
      { key: 'manage_marketing', label: 'Marketing Intelligence Dashboard' },
    ]
  },
  codingSnippets: {
    label: 'Coding Snippet Assessments',
    permissions: [
      { key: 'manage_snippets', label: 'Create & Manage Snippet Assessments' },
      { key: 'grade_snippets', label: 'Grade Snippet Submissions' },
      { key: 'view_snippets', label: 'View & Submit Snippet Assessments' },
    ]
  },
  thinkingLab: {
    label: 'Logical Thinking Lab',
    permissions: [
      { key: 'manage_thinking_lab', label: 'Manage Thinking Lab Question Bank' },
      { key: 'use_thinking_lab', label: 'Attempt Thinking Lab Drills' },
    ]
  },
  speakingPractice: {
    label: 'Speaking Practice',
    permissions: [
      { key: 'manage_speaking', label: 'Manage Speaking Practice Prompts' },
      { key: 'use_speaking', label: 'Attempt Speaking Practice' },
    ]
  },
  communicationLab: {
    label: 'AI Communication Lab',
    permissions: [
      { key: 'manage_communication_lab', label: 'Manage Communication Challenges & Monitor Students' },
      { key: 'use_communication_lab', label: 'Practise Communication Challenges' },
    ]
  },
  resourceLibrary: {
    label: 'Resource Library',
    permissions: [
      { key: 'manage_resources', label: 'Manage Resource / Project Library' },
      { key: 'view_resources', label: 'View & Download Resources' },
    ]
  },
  careerPilot: {
    label: 'CareerPilot (AI Career Suite)',
    permissions: [
      { key: 'manage_career_pilot', label: 'Manage CareerPilot & Review Profiles' },
      { key: 'use_ai_mentor', label: 'Use AI Mentor' },
      { key: 'use_job_tracker', label: 'Use Job Tracker' },
      { key: 'use_project_builder', label: 'Use Project Builder' },
      { key: 'use_career_profile', label: 'Use Career Profile Builder' },
    ]
  },
  certificates: {
    label: 'Certificates',
    permissions: [
      { key: 'manage_certificates', label: 'Issue & Manage Certificates' },
      { key: 'view_certificates', label: 'View Own Certificates' },
    ]
  },
  placement: {
    label: 'Placement & Alumni',
    permissions: [
      { key: 'manage_placement', label: 'Manage Placement Drives & Partners' },
      { key: 'manage_placement_status', label: 'Update Student Placement Status' },
      { key: 'view_placement', label: 'View Placement Drives & Apply' },
    ]
  },
  aiSpend: {
    label: 'AI Spend',
    permissions: [
      { key: 'view_ai_spend', label: 'View AI Spend Dashboard' },
    ]
  },
  techBattles: {
    label: 'Tech Battles (Public Competitions)',
    permissions: [
      { key: 'manage_battles', label: 'Create, Edit, Delete & Broadcast Battles' },
      { key: 'view_battles', label: 'View Battles, Registrations & Leaderboards' },
      { key: 'review_battle_registrations', label: 'Approve / Reject Registrations' },
      { key: 'export_battle_data', label: 'Export Registration Data (contains public PII)' },
    ]
  },
  /**
   * Separate from techBattles because they are different products with different risk.
   * A battle is an online exam; a hackathon takes MONEY from the public and holds the
   * phone number and email of every member of every team. Exporting that is its own
   * permission for the same reason it is on battles.
   */
  hackathons: {
    label: 'Hackathons (Public Registrations)',
    permissions: [
      { key: 'manage_hackathons', label: 'Create, Edit & Close Hackathons (sets the fee)' },
      { key: 'view_hackathons', label: 'View Hackathons & Registrations' },
      { key: 'export_hackathon_data', label: 'Export Registration Data (contains public PII)' },
    ]
  },
  careerPassport: {
    label: 'CareerPilot',
    permissions: [
      { key: 'manage_passport', label: 'Manage CareerPilot (Config, Pathways, Missions, Assessment Bank)' },
      // Separate from manage_passport on purpose: changing a category's weight rewrites how
      // EVERY member's career score is computed, and deleting one can strand content. That
      // is a different level of trust from writing a question, so it can be withheld from
      // someone who is otherwise allowed to edit the bank.
      { key: 'manage_passport_categories', label: 'Edit CareerPilot Scoring Categories (changes how every score is computed)' },
      { key: 'view_passport_members', label: 'View CareerPilot Members' },
      // Its own permission because it hands out member phone numbers and emails in BULK
      // for outreach — a different risk from looking one person up on a support call.
      // A marketing or telecalling person needs this and nothing else.
      { key: 'view_passport_funnel', label: 'View CareerPilot Drop-off Funnel (bulk member contacts)' },
      { key: 'convert_passport_member', label: 'Grant Membership Without Payment' },
      // Writing a routing rule only affects who joins next; APPLYING it moves members who
      // are already part-way through a plan onto a different one, rewriting work they can
      // see. Same reasoning as scoring categories above — editing content and rewriting
      // what existing members are doing are different levels of trust.
      { key: 'reroute_passport_members', label: 'Re-route Existing CareerPilot Members Between Pathways' },
      { key: 'use_passport', label: 'Use CareerPilot (Member Surfaces)' },
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
    'manage_interview_templates', 'assign_interviews', 'evaluate_interviews', 'attempt_interviews',
    // Reports
    'view_reports', 'view_analytics', 'view_tenant_analytics',
    // Admin
    'manage_tenant', 'manage_tenant_settings',
    // Fees / billing
    'manage_billing',
    // Leads (full access)
    'manage_leads', 'view_leads', 'create_leads', 'edit_leads', 'delete_leads',
    'assign_leads', 'export_leads', 'view_lead_analytics', 'manage_lead_stages', 'convert_leads',
    // Marketing
    'manage_marketing',
    // Coding Snippets
    'manage_snippets', 'grade_snippets', 'view_snippets',
    // Thinking Lab
    'manage_thinking_lab', 'use_thinking_lab',
    // Speaking Practice
    'manage_speaking', 'use_speaking',
    // AI Communication Lab
    'manage_communication_lab', 'use_communication_lab',
    // Resource Library
    'manage_resources', 'view_resources',
    // CareerPilot
    'manage_career_pilot', 'use_ai_mentor', 'use_job_tracker', 'use_project_builder', 'use_career_profile',
    // Certificates
    'manage_certificates', 'view_certificates',
    // Placement & Alumni
    'manage_placement', 'manage_placement_status', 'view_placement',
    // AI Spend
    'view_ai_spend',
    // CareerPilot — full control, including granting membership without payment
    'manage_passport', 'manage_passport_categories', 'view_passport_members', 'view_passport_funnel', 'convert_passport_member', 'reroute_passport_members', 'use_passport',
    // Tech Battles — full control, including exporting public registrant PII
    'manage_battles', 'view_battles', 'review_battle_registrations',
    // Hackathons — run the event, but exporting registrant PII stays with admins
    'manage_hackathons', 'view_hackathons', 'export_battle_data',
    // Hackathons — full control, including setting the fee and exporting registrant PII
    'manage_hackathons', 'view_hackathons', 'export_hackathon_data',
    // Exams — record and correct offline/external marks
    'manage_exams', 'view_exams',
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
    'manage_interview_templates', 'assign_interviews', 'evaluate_interviews',
    // Reports
    'view_reports',
    // Coding Snippets
    'manage_snippets', 'grade_snippets', 'view_snippets',
    // Thinking Lab
    'manage_thinking_lab', 'use_thinking_lab',
    // Speaking Practice
    'manage_speaking', 'use_speaking',
    // AI Communication Lab
    'manage_communication_lab', 'use_communication_lab',
    // Resource Library
    'manage_resources', 'view_resources',
    // Certificates
    'view_certificates',
    // Placement & Alumni
    'view_placement',
    // Tech Battles — run competitions, but exporting registrant PII stays with admins
    'manage_battles', 'view_battles', 'review_battle_registrations',
    // Exams — instructors conduct them, so they enter and correct the marks
    'manage_exams', 'view_exams',
  ],
  ATTENDANCE_ADMIN: [
    'mark_attendance', 'view_attendance', 'view_reports',
  ],
  STAFF: [
    // Attendance
    'mark_attendance', 'view_attendance', 'view_reports',
    // Users (limited)
    'manage_tenant_users', 'view_enrolled_students',
    // Courses (limited)
    'create_courses', 'view_courses',
    // Leads — Manager level: view all team leads, assign, analytics
    'view_leads', 'create_leads', 'edit_leads', 'assign_leads',
    'view_lead_analytics', 'export_leads', 'convert_leads',
    // CareerPilot — read-only. Config, pathways, missions, the assessment bank
    // and free membership grants stay with TENANT_ADMIN.
    'view_passport_members',
    // Tech Battles — process registrations only. Creating, deleting, broadcasting to
    // the public and exporting PII all stay above STAFF.
    'view_battles', 'review_battle_registrations',
    // Exams — read-only. A mark decides whether a student passed, so entering and
    // correcting one stays with instructors and admins.
    'view_exams',
  ],
  STUDENT: [
    'enroll_courses', 'view_courses', 'view_public_courses', 'access_resources',
    'submit_assignments', 'view_grades', 'view_attendance', 'view_quiz',
    'take_interviews', 'attempt_interviews',
    // Coding Snippets
    'view_snippets',
    // Thinking Lab
    'use_thinking_lab',
    // Speaking Practice
    'use_speaking',
    // AI Communication Lab
    'use_communication_lab',
    // Resource Library
    'view_resources',
    // CareerPilot
    'use_ai_mentor', 'use_job_tracker', 'use_project_builder', 'use_career_profile',
    // Certificates
    'view_certificates',
    // Placement & Alumni
    'view_placement',
    // CareerPilot — member surfaces (entitlements still gate paid features)
    'use_passport',
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

    // A custom role REPLACES the base role's permissions — it is the authoritative
    // list for that user. This used to merge base + custom, which meant a custom role
    // could only ever ADD access: ticking "1 / 4" in Roles & Permissions still left
    // the user with everything their base role had. It also disagreed with
    // getMyPermissions(), which already replaced — so the UI showed one set of
    // permissions while the API enforced a larger one.
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