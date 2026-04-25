import mongoose, { Schema, Document } from 'mongoose';

/**
 * Department model — scoped to a tenant (college).
 * Completely independent — never modifies User, Batch, or Course models.
 * Other models reference Department via departmentId (optional foreign key).
 */
export interface IDepartment extends Document {
  name: string;                              // "Computer Science & Engineering"
  code: string;                              // "CSE"
  tenantId: mongoose.Types.ObjectId;         // Which college this belongs to
  headUserId?: mongoose.Types.ObjectId;      // User with DEPT_HEAD college role
  description?: string;
  totalStudents: number;                     // Computed / manually set
  activeBatches: number;                     // Computed / manually set
  courseIds: mongoose.Types.ObjectId[];      // Courses offered by this dept
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const DepartmentSchema: Schema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    code: {
      type: String,
      required: true,
      trim: true,
      uppercase: true    // CSE, ECE, IT, MECH, MBA...
    },
    tenantId: {
      type: mongoose.Types.ObjectId,
      ref: 'Tenant',
      required: true
    },
    headUserId: {
      type: mongoose.Types.ObjectId,
      ref: 'User',
      default: null
    },
    description: {
      type: String,
      trim: true
    },
    totalStudents: {
      type: Number,
      default: 0
    },
    activeBatches: {
      type: Number,
      default: 0
    },
    courseIds: [
      {
        type: mongoose.Types.ObjectId,
        ref: 'Course'
      }
    ],
    isActive: {
      type: Boolean,
      default: true
    }
  },
  { timestamps: true }
);

// Compound unique: same dept code cannot exist twice in same college
DepartmentSchema.index({ tenantId: 1, code: 1 }, { unique: true });
DepartmentSchema.index({ tenantId: 1, isActive: 1 });

export default mongoose.model<IDepartment>('Department', DepartmentSchema);
