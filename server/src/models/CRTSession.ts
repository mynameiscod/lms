import mongoose, { Schema, Document } from 'mongoose';

/**
 * CRTSession — a Corporate Readiness Training session delivered by a CRT_TRAINER.
 *
 * DESIGN:
 *  - Scoped to a tenant.
 *  - Linked to one or more departments and specific year groups.
 *  - Trainer is a User with CollegeMembership.collegeRole = 'CRT_TRAINER'.
 *  - Attendance tracked as an array of { userId, status }.
 *  - Never modifies User, Course, or Department models.
 */

export type CRTSessionStatus = 'scheduled' | 'ongoing' | 'completed' | 'cancelled';
export type CRTTopic =
  | 'aptitude'
  | 'verbal'
  | 'technical'
  | 'soft_skills'
  | 'resume'
  | 'gd'           // Group Discussion
  | 'mock_interview'
  | 'domain'
  | 'other';

export interface ICRTAttendance {
  userId: mongoose.Types.ObjectId;
  status: 'present' | 'absent' | 'late';
}

export interface ICRTSession extends Document {
  tenantId:      mongoose.Types.ObjectId;
  trainerId:     mongoose.Types.ObjectId;       // User with CRT_TRAINER role
  title:         string;
  description?:  string;
  topic:         CRTTopic;
  departmentIds: mongoose.Types.ObjectId[];      // Which depts this session covers
  targetYears:   (1 | 2 | 3 | 4)[];            // Which year groups
  scheduledAt:   Date;
  durationMins:  number;                         // e.g. 90
  venue?:        string;                         // "Seminar Hall A" or "Online - Meet"
  meetLink?:     string;
  materialUrl?:  string;                         // Slide / PDF link
  status:        CRTSessionStatus;
  attendance:    ICRTAttendance[];
  feedback?:     string;                         // Trainer notes post-session
  isActive:      boolean;
  createdBy:     mongoose.Types.ObjectId;
  createdAt:     Date;
  updatedAt:     Date;
}

const CRTAttendanceSchema = new Schema(
  {
    userId: { type: mongoose.Types.ObjectId, ref: 'User', required: true },
    status: { type: String, enum: ['present', 'absent', 'late'], default: 'present' }
  },
  { _id: false }
);

const CRTSessionSchema: Schema = new Schema(
  {
    tenantId: {
      type: mongoose.Types.ObjectId,
      ref: 'Tenant',
      required: true
    },
    trainerId: {
      type: mongoose.Types.ObjectId,
      ref: 'User',
      required: true
    },
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    topic: {
      type: String,
      enum: ['aptitude', 'verbal', 'technical', 'soft_skills', 'resume', 'gd', 'mock_interview', 'domain', 'other'],
      default: 'other'
    },
    departmentIds: [{ type: mongoose.Types.ObjectId, ref: 'Department' }],
    targetYears: [{ type: Number, enum: [1, 2, 3, 4] }],
    scheduledAt:  { type: Date, required: true },
    durationMins: { type: Number, default: 60 },
    venue:        { type: String, trim: true },
    meetLink:     { type: String, trim: true },
    materialUrl:  { type: String, trim: true },
    status: {
      type: String,
      enum: ['scheduled', 'ongoing', 'completed', 'cancelled'],
      default: 'scheduled'
    },
    attendance: [CRTAttendanceSchema],
    feedback:   { type: String, trim: true },
    isActive:   { type: Boolean, default: true },
    createdBy:  { type: mongoose.Types.ObjectId, ref: 'User', required: true }
  },
  { timestamps: true }
);

CRTSessionSchema.index({ tenantId: 1, scheduledAt: -1 });
CRTSessionSchema.index({ tenantId: 1, trainerId: 1 });
CRTSessionSchema.index({ tenantId: 1, status: 1 });

export default mongoose.model<ICRTSession>('CRTSession', CRTSessionSchema);
