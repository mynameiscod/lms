import mongoose, { Schema, Document } from 'mongoose';
import { DemoYearConfig } from '../data/demoPolicy';

/**
 * A demo plan (Super Admin → CareerPilot → Demo plans): for each of the four years, what a demo
 * account shows. Global — not tied to an institute — because only a super admin makes plans and
 * gives demo access, and the same plan is used for colleges in every institute.
 *
 * Demo accounts LINK to their plan (data/demoPolicy.ts), so an edit here reaches them at once.
 */
export interface IDemoPlan extends Document {
  name: string;
  description: string;
  /** The year a demo opens on when access is given. */
  startYear: string;
  years: Record<string, DemoYearConfig>;
  active: boolean;
  updatedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

const YearSchema = new Schema<DemoYearConfig>({
  enabled: { type: Boolean, default: false },
  track: { type: String, default: '' },
  landingDay: { type: Number, default: 1, min: 1 },
  practiceIds: [{ type: String }],
  thinkingIds: [{ type: String }],
  interviewTypes: [{ type: String }],
  bookIds: [{ type: String }],
}, { _id: false });

const DemoPlanSchema = new Schema<IDemoPlan>(
  {
    name: { type: String, required: true, trim: true, maxlength: 60 },
    description: { type: String, default: '', trim: true, maxlength: 300 },
    startYear: { type: String, default: 'foundation' },
    years: {
      foundation: { type: YearSchema, default: () => ({}) },
      build: { type: YearSchema, default: () => ({}) },
      specialize: { type: YearSchema, default: () => ({}) },
      placement: { type: YearSchema, default: () => ({}) },
    },
    active: { type: Boolean, default: true },
    updatedBy: { type: String },
  },
  { timestamps: true },
);

export default mongoose.model<IDemoPlan>('DemoPlan', DemoPlanSchema);
