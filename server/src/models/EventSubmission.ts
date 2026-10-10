import mongoose, { Schema, Document, Types } from 'mongoose';

/**
 * Event APIs — one registration sent by the website.
 *
 * Deliberately NOT a user and NOT a lead: most registrants never log in to the LMS or
 * CareerPilot, and one person may register for five events. The answers sit in `data`, checked
 * against the event's fields at the time; `fieldKeys` records which fields the event asked, so
 * an event edited later never changes how an old row reads.
 */

export interface IEventSubmission extends Document {
  tenantId: string;
  collectionId: Types.ObjectId;
  eventApiId: Types.ObjectId;
  apiName: string;
  eventName: string;
  data: Record<string, any>;
  fieldKeys: string[];
  contact: { name?: string; phone?: string; email?: string };
  /** Set only when the event allows one registration per mobile; unique per event. */
  dedupeKey?: string;
  meta: {
    ip?: string;
    userAgent?: string;
    referrer?: string;
    utm?: { source?: string; medium?: string; campaign?: string; term?: string; content?: string };
  };
  createdAt: Date;
  updatedAt: Date;
}

const EventSubmissionSchema = new Schema<IEventSubmission>({
  tenantId: { type: String, required: true },
  collectionId: { type: Schema.Types.ObjectId, ref: 'EventCollection', required: true },
  eventApiId: { type: Schema.Types.ObjectId, ref: 'EventApi', required: true },
  apiName: { type: String, required: true },
  eventName: { type: String, required: true },
  data: { type: Schema.Types.Mixed, default: {} },
  fieldKeys: [String],
  contact: {
    name: String,
    phone: String,
    email: String,
  },
  dedupeKey: { type: String },
  meta: {
    ip: String,
    userAgent: String,
    referrer: String,
    utm: { source: String, medium: String, campaign: String, term: String, content: String },
  },
}, { timestamps: true, minimize: false });

EventSubmissionSchema.index({ tenantId: 1, collectionId: 1, createdAt: -1 });
EventSubmissionSchema.index({ tenantId: 1, eventApiId: 1, createdAt: -1 });
EventSubmissionSchema.index({ tenantId: 1, 'contact.phone': 1 });
EventSubmissionSchema.index(
  { eventApiId: 1, dedupeKey: 1 },
  { unique: true, partialFilterExpression: { dedupeKey: { $type: 'string' } } },
);

export default mongoose.model<IEventSubmission>('EventSubmission', EventSubmissionSchema);
