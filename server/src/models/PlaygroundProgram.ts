import mongoose, { Schema, Document } from 'mongoose';

export interface IPlaygroundProgram extends Document {
  tenantId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  title: string;
  language: string;
  code: string;
  stdin?: string;
  kind: 'single' | 'web' | 'sql' | 'framework';
  framework?: string;
  githubRepo?: string;
  githubUrl?: string;
  isPublic: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const PlaygroundProgramSchema = new Schema<IPlaygroundProgram>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    userId:   { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title:    { type: String, required: true, trim: true, default: 'Untitled' },
    language: { type: String, required: true },
    code:     { type: String, default: '' },
    stdin:    { type: String, default: '' },
    kind:     { type: String, enum: ['single', 'web', 'sql', 'framework'], default: 'single' },
    framework:{ type: String },
    githubRepo: { type: String },
    githubUrl:  { type: String },
    isPublic: { type: Boolean, default: false },
  },
  { timestamps: true }
);

PlaygroundProgramSchema.index({ tenantId: 1, userId: 1, updatedAt: -1 });

export default mongoose.model<IPlaygroundProgram>('PlaygroundProgram', PlaygroundProgramSchema);
