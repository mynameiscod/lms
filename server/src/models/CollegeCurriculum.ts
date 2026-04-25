import mongoose, { Schema, Document } from 'mongoose';

/**
 * CollegeCurriculum — defines the year-wise, semester-wise subject plan
 * for a department within a tenant (college).
 *
 * DESIGN:
 *  - One document per (tenantId, departmentId, yearOfStudy).
 *  - Each document holds up to 2 semesters for that year.
 *  - Each semester has a list of subjects (with optional course link).
 *  - Never modifies User, Department, or Course models.
 */

export interface ICurriculumSubject {
  name: string;              // "Data Structures & Algorithms"
  code?: string;             // "CS301"
  credits?: number;          // 4
  type: 'theory' | 'lab' | 'elective' | 'project';
  courseId?: mongoose.Types.ObjectId;  // Optional link to a Course
  description?: string;
}

export interface ICurriculumSemester {
  semesterNumber: number;    // 1–8
  subjects: ICurriculumSubject[];
}

export interface ICollegeCurriculum extends Document {
  tenantId: mongoose.Types.ObjectId;
  departmentId: mongoose.Types.ObjectId;
  yearOfStudy: 1 | 2 | 3 | 4;       // 1 = First Year, 2 = Second Year, etc.
  academicYear?: string;             // "2024-25" — optional, for per-batch overrides
  semesters: ICurriculumSemester[];  // max 2 semesters per year
  isActive: boolean;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const CurriculumSubjectSchema = new Schema(
  {
    name:     { type: String, required: true, trim: true },
    code:     { type: String, trim: true },
    credits:  { type: Number, min: 0 },
    type: {
      type: String,
      enum: ['theory', 'lab', 'elective', 'project'],
      default: 'theory'
    },
    courseId:    { type: mongoose.Types.ObjectId, ref: 'Course', default: null },
    description: { type: String, trim: true }
  },
  { _id: true }
);

const CurriculumSemesterSchema = new Schema(
  {
    semesterNumber: { type: Number, required: true, min: 1, max: 8 },
    subjects: [CurriculumSubjectSchema]
  },
  { _id: false }
);

const CollegeCurriculumSchema: Schema = new Schema(
  {
    tenantId: {
      type: mongoose.Types.ObjectId,
      ref: 'Tenant',
      required: true
    },
    departmentId: {
      type: mongoose.Types.ObjectId,
      ref: 'Department',
      required: true
    },
    yearOfStudy: {
      type: Number,
      enum: [1, 2, 3, 4],
      required: true
    },
    academicYear: {
      type: String,
      trim: true,
      default: null
    },
    semesters: [CurriculumSemesterSchema],
    isActive: { type: Boolean, default: true },
    createdBy: {
      type: mongoose.Types.ObjectId,
      ref: 'User',
      required: true
    }
  },
  { timestamps: true }
);

// Unique: one curriculum per (tenant, dept, year). Use academicYear for versioned overrides.
CollegeCurriculumSchema.index(
  { tenantId: 1, departmentId: 1, yearOfStudy: 1 },
  { unique: true }
);
CollegeCurriculumSchema.index({ tenantId: 1, departmentId: 1 });

export default mongoose.model<ICollegeCurriculum>('CollegeCurriculum', CollegeCurriculumSchema);
