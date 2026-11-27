import mongoose, { Schema, Document } from 'mongoose';

/**
 * The shooting script for a day's video — written in the Content Builder BEFORE the video is shot,
 * and followed on set.
 *
 * ADMIN-ONLY, AND KEPT IN ITS OWN COLLECTION ON PURPOSE. The student day endpoint sends whole
 * LearningContentLibrary rows to the member; a script stored as a field on the video row would leak
 * to every student the moment someone forgot to strip it. Here nothing a student can reach ever reads
 * this collection — only the Content Builder's MANAGE_FOR.cpContent routes do.
 *
 * One script per day (unit): the day's video is shot from it. A scene is the unit of shooting — what
 * the camera / screen shows, and what the presenter says while it does.
 */
export const SCRIPT_STATUSES = ['DRAFT', 'READY', 'SHOT'] as const;
export type ScriptStatus = typeof SCRIPT_STATUSES[number];

export interface IScriptScene {
  heading: string;
  /** What is on screen: the presenter, a slide, the code editor, a diagram. */
  visual: string;
  /** What is said, word for word. */
  narration: string;
  /** Director's notes: tone, a pause, a prop, a retake warning. */
  notes: string;
}

export interface IVideoScript extends Document {
  tenantId: string;
  unitCode: string;
  title: string;
  /** Who the video is for and what they should be able to do after it. */
  objective: string;
  /** Target length in minutes, for pacing. */
  targetMinutes: number;
  presenter: string;
  scenes: IScriptScene[];
  status: ScriptStatus;
  createdBy?: string;
  updatedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

const SceneSchema = new Schema<IScriptScene>({
  heading:   { type: String, default: '', trim: true, maxlength: 200 },
  visual:    { type: String, default: '', maxlength: 4000 },
  narration: { type: String, default: '', maxlength: 12000 },
  notes:     { type: String, default: '', maxlength: 2000 },
}, { _id: false });

const VideoScriptSchema = new Schema<IVideoScript>({
  tenantId:      { type: String, required: true, index: true },
  unitCode:      { type: String, required: true, uppercase: true, trim: true },
  title:         { type: String, default: '', trim: true, maxlength: 200 },
  objective:     { type: String, default: '', maxlength: 1000 },
  targetMinutes: { type: Number, default: 10, min: 0, max: 180 },
  presenter:     { type: String, default: '', trim: true, maxlength: 120 },
  scenes:        { type: [SceneSchema], default: [] },
  status:        { type: String, enum: SCRIPT_STATUSES, default: 'DRAFT' },
  createdBy:     { type: String },
  updatedBy:     { type: String },
}, { timestamps: true });

VideoScriptSchema.index({ tenantId: 1, unitCode: 1 }, { unique: true });

export default mongoose.model<IVideoScript>('VideoScript', VideoScriptSchema);
