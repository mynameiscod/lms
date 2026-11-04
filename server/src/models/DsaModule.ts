import mongoose, { Schema, Document } from 'mongoose';

/**
 * One module of the Java-first DSA curriculum shown inside the Code Visualizer (Learn tab).
 *
 * A module is an organising layer over content that already exists elsewhere, plus its own lesson:
 *   - lesson text, Java examples, complexity, mistakes, interview Q&A — stored here;
 *   - step-by-step tracing — VisualizerItem documents, linked by slug (`visualizerSlugs`);
 *   - animated diagrams for structures the tracer cannot follow (objects) — client widgets by key;
 *   - practice — Problem Bank problems, linked by topic key (`problemTopics`), never copied;
 *   - assigned practice — ordinary ProblemSets created from the module (`practiceSets`).
 *
 * Tenant-scoped like VisualizerItem and seeded the same way (POST /dsa/admin/seed). A module is
 * "full" when its lesson is written; an "outline" module still links its problems and visualizers.
 */

export const DSA_MODULE_STAGES = ['foundations', 'linear', 'techniques', 'nonlinear', 'algorithms', 'interview'] as const;
export type DsaModuleStage = typeof DSA_MODULE_STAGES[number];

export interface DsaTextBlock { title: string; body: string }
export interface DsaJavaExample { title: string; explanation: string; code: string; input?: string; output?: string }
export interface DsaComplexityRow { operation: string; time: string; space: string; note?: string }
export interface DsaQA { question: string; answer: string }
export interface DsaAssignment { title: string; brief: string }
export interface DsaPracticeSet { difficulty: 'easy' | 'medium' | 'hard'; setId: string; createdAt: Date }

export interface IDsaModule extends Document {
  tenantId: string;
  slug: string;
  order: number;
  title: string;
  summary: string;
  stage: DsaModuleStage;
  overview: string;
  objectives: string[];
  prerequisites: string[];
  concepts: DsaTextBlock[];
  internals: DsaTextBlock[];
  javaExamples: DsaJavaExample[];
  complexity: DsaComplexityRow[];
  mistakes: string[];
  edgeCases: string[];
  assignments: DsaAssignment[];
  interviewQuestions: DsaQA[];
  visualizerSlugs: string[];
  widgets: string[];
  problemTopics: string[];
  practiceSets: DsaPracticeSet[];
  published: boolean;
  /** The seed revision this content came from; a newer seed refreshes modules nobody has edited. */
  seedVersion: number;
  editedBy?: string;
  createdBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

const Block = new Schema({ title: { type: String, default: '' }, body: { type: String, default: '' } }, { _id: false });

const DsaModuleSchema = new Schema<IDsaModule>({
  tenantId: { type: String, required: true, index: true },
  slug: { type: String, required: true, lowercase: true, trim: true },
  order: { type: Number, default: 0 },
  title: { type: String, required: true, trim: true, maxlength: 160 },
  summary: { type: String, default: '' },
  stage: { type: String, enum: DSA_MODULE_STAGES, default: 'foundations' },
  overview: { type: String, default: '' },
  objectives: { type: [String], default: [] },
  prerequisites: { type: [String], default: [] },
  concepts: { type: [Block], default: [] },
  internals: { type: [Block], default: [] },
  javaExamples: {
    type: [{ title: String, explanation: String, code: String, input: String, output: String, _id: false }],
    default: [],
  },
  complexity: { type: [{ operation: String, time: String, space: String, note: String, _id: false }], default: [] },
  mistakes: { type: [String], default: [] },
  edgeCases: { type: [String], default: [] },
  assignments: { type: [{ title: String, brief: String, _id: false }], default: [] },
  interviewQuestions: { type: [{ question: String, answer: String, _id: false }], default: [] },
  visualizerSlugs: { type: [String], default: [] },
  widgets: { type: [String], default: [] },
  problemTopics: { type: [String], default: [] },
  practiceSets: {
    type: [{ difficulty: { type: String, enum: ['easy', 'medium', 'hard'] }, setId: String, createdAt: Date, _id: false }],
    default: [],
  },
  published: { type: Boolean, default: true },
  seedVersion: { type: Number, default: 0 },
  editedBy: String,
  createdBy: String,
}, { timestamps: true });

DsaModuleSchema.index({ tenantId: 1, slug: 1 }, { unique: true });
DsaModuleSchema.index({ tenantId: 1, published: 1, order: 1 });

export default mongoose.models.DsaModule as mongoose.Model<IDsaModule>
  || mongoose.model<IDsaModule>('DsaModule', DsaModuleSchema);
