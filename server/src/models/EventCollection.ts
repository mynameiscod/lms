import mongoose, { Schema, Document } from 'mongoose';

/**
 * Event APIs — a COLLECTION as the admin sees it: a named home for registrations (for example
 * "Workshops 2026") that one or more events write into.
 *
 * It is a name, not a MongoDB collection. Every registration lives in `eventsubmissions`, tagged
 * with the collection it belongs to, so an admin can never create, clash with or reach a system
 * collection (users, leads) from this screen.
 *
 * `fields` is the collection's FIELD LIBRARY: every field ever added to it. A field is defined
 * once here (key, label, type, options) and each event picks its own subset.
 */

export const EVENT_FIELD_TYPES = ['text', 'textarea', 'email', 'phone', 'number', 'date', 'select', 'multiselect', 'checkbox', 'url'] as const;
export type EventFieldType = typeof EVENT_FIELD_TYPES[number];

export interface IEventLibraryField {
  key: string;
  label: string;
  type: EventFieldType;
  options?: string[];
  placeholder?: string;
  helpText?: string;
}

export interface IEventCollection extends Document {
  tenantId: string;
  name: string;
  /** Lower-cased name, for the per-institute uniqueness check. */
  nameKey: string;
  description?: string;
  fields: IEventLibraryField[];
  createdBy?: string;
  updatedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

const LibraryFieldSchema = new Schema<IEventLibraryField>({
  key: { type: String, required: true },
  label: { type: String, required: true, trim: true, maxlength: 120 },
  type: { type: String, enum: EVENT_FIELD_TYPES, required: true },
  options: [{ type: String, trim: true, maxlength: 120 }],
  placeholder: { type: String, trim: true, maxlength: 160 },
  helpText: { type: String, trim: true, maxlength: 300 },
}, { _id: false });

const EventCollectionSchema = new Schema<IEventCollection>({
  tenantId: { type: String, required: true, index: true },
  name: { type: String, required: true, trim: true, maxlength: 80 },
  nameKey: { type: String, required: true },
  description: { type: String, trim: true, maxlength: 500 },
  fields: { type: [LibraryFieldSchema], default: [] },
  createdBy: String,
  updatedBy: String,
}, { timestamps: true });

EventCollectionSchema.index({ tenantId: 1, nameKey: 1 }, { unique: true });

export default mongoose.model<IEventCollection>('EventCollection', EventCollectionSchema);
