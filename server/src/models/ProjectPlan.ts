import mongoose, { Schema, Document } from 'mongoose';

export interface IProjectTask { title: string; done: boolean }

export interface IProjectPlan extends Document {
  tenantId: string;
  studentId: mongoose.Types.ObjectId;
  targetRole?: string;
  title: string;
  description?: string;
  difficulty?: string;         // Beginner | Intermediate | Advanced
  techStack: string[];
  features: string[];
  dbSchema?: string;           // free text (tables + key columns)
  apiList: string[];           // "METHOD /path — description"
  frontendScreens: string[];
  readme?: string;             // markdown
  deploymentSteps: string[];
  tasks: IProjectTask[];
  status: 'planned' | 'in_progress' | 'completed';
  githubUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ProjectPlanSchema = new Schema<IProjectPlan>(
  {
    tenantId:  { type: String, required: true, index: true },
    studentId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    targetRole: { type: String },
    title:      { type: String, required: true },
    description: { type: String },
    difficulty: { type: String },
    techStack:  { type: [String], default: [] },
    features:   { type: [String], default: [] },
    dbSchema:   { type: String },
    apiList:    { type: [String], default: [] },
    frontendScreens: { type: [String], default: [] },
    readme:     { type: String },
    deploymentSteps: { type: [String], default: [] },
    tasks:      { type: [{ title: String, done: { type: Boolean, default: false }, _id: false }], default: [] },
    status:     { type: String, enum: ['planned', 'in_progress', 'completed'], default: 'planned' },
    githubUrl:  { type: String },
  },
  { timestamps: true }
);
ProjectPlanSchema.index({ tenantId: 1, studentId: 1, createdAt: -1 });

export default mongoose.model<IProjectPlan>('ProjectPlan', ProjectPlanSchema);
