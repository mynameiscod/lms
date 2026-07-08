import mongoose, { Schema, Document } from 'mongoose';

export type ResourceType = 'project' | 'document' | 'template' | 'dataset';
export type ResourceVisibility = 'public' | 'portal' | 'approval';
export type ResourceStatus = 'draft' | 'published' | 'archived';

export interface IResourceFile {
  fileId: string;         // uuid-ish, used in the Bunny storage key
  fileName: string;
  storageKey: string;     // path within the Bunny storage zone
  sizeBytes: number;
  mimeType: string;
  version: number;
  uploadedBy: mongoose.Types.ObjectId;
  uploadedAt: Date;
}

export interface IResource extends Document {
  tenantId: string;
  title: string;
  description?: string;
  resourceType: ResourceType;
  tags: string[];
  techStack: string[];
  difficulty?: 'easy' | 'medium' | 'hard';
  targetRole?: string;
  files: IResourceFile[];
  visibility: ResourceVisibility;
  batchIds: mongoose.Types.ObjectId[];   // empty = all batches; else only these batches' students
  status: ResourceStatus;
  downloadCount: number;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const FileSchema = new Schema<IResourceFile>({
  fileId:     { type: String, required: true },
  fileName:   { type: String, required: true },
  storageKey: { type: String, required: true },
  sizeBytes:  { type: Number, default: 0 },
  mimeType:   { type: String, default: 'application/octet-stream' },
  version:    { type: Number, default: 1 },
  uploadedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  uploadedAt: { type: Date, default: Date.now },
}, { _id: false });

const ResourceSchema = new Schema<IResource>(
  {
    tenantId:     { type: String, required: true, index: true },
    title:        { type: String, required: true, trim: true },
    description:  { type: String },
    resourceType: { type: String, enum: ['project', 'document', 'template', 'dataset'], default: 'project' },
    tags:         { type: [String], default: [] },
    techStack:    { type: [String], default: [] },
    difficulty:   { type: String, enum: ['easy', 'medium', 'hard'] },
    targetRole:   { type: String },
    files:        { type: [FileSchema], default: [] },
    visibility:   { type: String, enum: ['public', 'portal', 'approval'], default: 'portal', index: true },
    batchIds:     { type: [{ type: Schema.Types.ObjectId, ref: 'Batch' }], default: [] },
    status:       { type: String, enum: ['draft', 'published', 'archived'], default: 'draft', index: true },
    downloadCount: { type: Number, default: 0 },
    createdBy:    { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);
ResourceSchema.index({ tenantId: 1, status: 1, visibility: 1, createdAt: -1 });

export default mongoose.model<IResource>('Resource', ResourceSchema);
