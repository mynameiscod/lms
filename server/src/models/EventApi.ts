import mongoose, { Schema, Document, Types } from 'mongoose';

/**
 * Event APIs — one EVENT and the public API the website calls for it.
 *
 * `apiName` is the last part of the public address
 * (/api/v1/public/events/<institute>/<apiName>), so it is fixed once the first registration
 * arrives: renaming it would silently break the website form pointing at it.
 *
 * `fields` is this event's own pick from its collection's field library — which fields, in what
 * order, which are required, and an optional label just for this event.
 */

export interface IEventApiField {
  key: string;
  required: boolean;
  /** Overrides the library label for this event only ("Mobile" here, "WhatsApp number" there). */
  label?: string;
  /** Kept on the event but no longer asked. Fields cannot be removed once registrations exist. */
  hidden?: boolean;
}

export type EventApiStatus = 'live' | 'paused';

export interface IEventApi extends Document {
  tenantId: string;
  collectionId: Types.ObjectId;
  eventName: string;
  apiName: string;
  description?: string;
  opensAt?: Date | null;
  closesAt: Date;
  status: EventApiStatus;
  fields: IEventApiField[];
  /** One registration per mobile number for this event. */
  onePerPhone: boolean;
  successMessage?: string;
  submissionCount: number;
  lastSubmissionAt?: Date | null;
  createdBy?: string;
  updatedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

const EventApiFieldSchema = new Schema<IEventApiField>({
  key: { type: String, required: true },
  required: { type: Boolean, default: false },
  label: { type: String, trim: true, maxlength: 120 },
  hidden: { type: Boolean, default: false },
}, { _id: false });

const EventApiSchema = new Schema<IEventApi>({
  tenantId: { type: String, required: true, index: true },
  collectionId: { type: Schema.Types.ObjectId, ref: 'EventCollection', required: true, index: true },
  eventName: { type: String, required: true, trim: true, maxlength: 120 },
  apiName: { type: String, required: true, trim: true, lowercase: true, maxlength: 60 },
  description: { type: String, trim: true, maxlength: 1000 },
  opensAt: { type: Date, default: null },
  closesAt: { type: Date, required: true },
  status: { type: String, enum: ['live', 'paused'], default: 'live' },
  fields: { type: [EventApiFieldSchema], default: [] },
  onePerPhone: { type: Boolean, default: false },
  successMessage: { type: String, trim: true, maxlength: 300 },
  submissionCount: { type: Number, default: 0 },
  lastSubmissionAt: { type: Date, default: null },
  createdBy: String,
  updatedBy: String,
}, { timestamps: true });

EventApiSchema.index({ tenantId: 1, apiName: 1 }, { unique: true });

export default mongoose.model<IEventApi>('EventApi', EventApiSchema);
