import mongoose, { Schema, Document } from 'mongoose';

/**
 * CollegeMembership — links a User to a college-level role within a tenant.
 *
 * DESIGN RULES:
 *  - Never modifies User.ts or its role enum.
 *  - User.role stays as-is (STUDENT, INSTRUCTOR, etc.) for app-level access.
 *  - CollegeMembership.collegeRole adds fine-grained college hierarchy on top.
 *  - One user can hold different roles in different tenants (future multi-college).
 */
export type CollegeRole =
  | 'COLLEGE_ADMIN'        // Manages college settings, branding, departments
  | 'DEPT_HEAD'            // Manages department, sees all dept students/batches
  | 'PLACEMENT_OFFICER'    // Access to placement module, manages drives
  | 'CRT_TRAINER'          // Corporate Readiness Training instructor
  | 'STUDENT';             // Student with year/roll/dept metadata

export interface ICollegeMembership extends Document {
  userId: mongoose.Types.ObjectId;
  tenantId: mongoose.Types.ObjectId;
  collegeRole: CollegeRole;
  departmentId?: mongoose.Types.ObjectId;    // Required for STUDENT, DEPT_HEAD
  yearOfStudy?: 1 | 2 | 3 | 4;             // For STUDENT
  rollNumber?: string;                       // For STUDENT
  academicYear?: string;                     // e.g. "2024-25"
  division?: string;                         // e.g. "A", "B"
  admissionType?: 'regular' | 'lateral';    // For STUDENT
  // Academic record
  cgpa?: number;                             // 0.0 – 10.0
  backlogs?: number;                         // Active backlog count
  semesterGrades?: { semester: number; sgpa: number }[];
  isActive: boolean;
  joinedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const CollegeMembershipSchema: Schema = new Schema(
  {
    userId: {
      type: mongoose.Types.ObjectId,
      ref: 'User',
      required: true
    },
    tenantId: {
      type: mongoose.Types.ObjectId,
      ref: 'Tenant',
      required: true
    },
    collegeRole: {
      type: String,
      enum: ['COLLEGE_ADMIN', 'DEPT_HEAD', 'PLACEMENT_OFFICER', 'CRT_TRAINER', 'STUDENT'],
      required: true
    },
    departmentId: {
      type: mongoose.Types.ObjectId,
      ref: 'Department',
      default: null
    },
    yearOfStudy: {
      type: Number,
      enum: [1, 2, 3, 4],
      default: null
    },
    rollNumber: {
      type: String,
      trim: true,
      default: null
    },
    academicYear: {
      type: String,               // "2024-25"
      default: null
    },
    division: {
      type: String,
      trim: true,
      default: null
    },
    admissionType: {
      type: String,
      enum: ['regular', 'lateral'],
      default: 'regular'
    },
    // Academic record
    cgpa: { type: Number, min: 0, max: 10, default: null },
    backlogs: { type: Number, min: 0, default: 0 },
    semesterGrades: [
      {
        semester: { type: Number, required: true },
        sgpa:     { type: Number, required: true, min: 0, max: 10 }
      }
    ],
    isActive: {
      type: Boolean,
      default: true
    },
    joinedAt: {
      type: Date,
      default: Date.now
    }
  },
  { timestamps: true }
);

// One user ↔ one college membership per tenant (can be updated, not duplicated)
CollegeMembershipSchema.index({ userId: 1, tenantId: 1 }, { unique: true });
CollegeMembershipSchema.index({ tenantId: 1, collegeRole: 1, isActive: 1 });
CollegeMembershipSchema.index({ tenantId: 1, departmentId: 1, yearOfStudy: 1 });

export default mongoose.model<ICollegeMembership>('CollegeMembership', CollegeMembershipSchema);
