import mongoose, { Schema, Document } from 'mongoose';

// An admin-assigned "Logic Building" problem for a student. One doc per student.
// The concept/difficulty/language seed a fresh generated problem when the student
// opens it; an optional customPrompt lets the admin dictate the exact problem.
export interface IDrillAssignment extends Document {
  tenantId: string;
  assignedBy: mongoose.Types.ObjectId;
  studentId: mongoose.Types.ObjectId;
  studentName?: string;
  batchId?: mongoose.Types.ObjectId;
  concept: string;
  difficulty: 'easy' | 'medium' | 'hard';
  language: string;
  customPrompt?: string;
  note?: string;
  dueDate?: Date;
  status: 'assigned' | 'in_progress' | 'completed';
  attemptId?: mongoose.Types.ObjectId;
  score?: number;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const DrillAssignmentSchema = new Schema<IDrillAssignment>(
  {
    tenantId:    { type: String, required: true, index: true },
    assignedBy:  { type: Schema.Types.ObjectId, ref: 'User', required: true },
    studentId:   { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    studentName: { type: String },
    batchId:     { type: Schema.Types.ObjectId, ref: 'Batch' },
    concept:     { type: String, required: true },
    difficulty:  { type: String, enum: ['easy', 'medium', 'hard'], default: 'easy' },
    language:    { type: String, default: 'javascript' },
    customPrompt:{ type: String },
    note:        { type: String },
    dueDate:     { type: Date },
    status:      { type: String, enum: ['assigned', 'in_progress', 'completed'], default: 'assigned' },
    attemptId:   { type: Schema.Types.ObjectId, ref: 'DrillAttempt' },
    score:       { type: Number },
    completedAt: { type: Date },
  },
  { timestamps: true }
);
DrillAssignmentSchema.index({ tenantId: 1, studentId: 1, status: 1 });
DrillAssignmentSchema.index({ tenantId: 1, createdAt: -1 });

export default mongoose.model<IDrillAssignment>('DrillAssignment', DrillAssignmentSchema);
