import mongoose, { Document, Schema } from 'mongoose';

/**
 * One demo session people can book from the website (CRM: Book a demo, 2026-11-25).
 *
 * A group demo: one host, many seats. `booked` is the seat counter, taken and given back with
 * single conditional updates so two people can never take the last seat.
 *
 * How people join is set per slot:
 *   - 'room': our own live room. The slot owns a LiveClass; each booking is a guest invite on it, so
 *     the existing /live/<token> page, 100ms guest join, the starts-soon reminder and join tracking
 *     all apply. The host starts it from Live Classes.
 *   - 'link': an outside Google Meet / Zoom link. Visitors are sent to it from their booking page;
 *     attendance is marked by hand.
 */
export type DemoJoinMethod = 'room' | 'link';
export type DemoSlotStatus = 'open' | 'cancelled' | 'done';

export interface IDemoSlot extends Document {
  tenantId: mongoose.Types.ObjectId;
  course: string;
  /** URL-friendly course key, e.g. "java-full-stack" — the website links with ?course=<key>. */
  courseKey: string;
  title: string;
  description?: string;
  startsAt: Date;
  durationMin: number;
  seats: number;
  booked: number;
  /** Booking closes this many minutes before the start. */
  cutoffMin: number;
  hostId: mongoose.Types.ObjectId;
  hostName: string;
  joinMethod: DemoJoinMethod;
  meetingLink?: string;
  liveClassId?: mongoose.Types.ObjectId;
  status: DemoSlotStatus;
  /** Slots made together by "repeat" share this, so they can be listed together. */
  seriesId?: string;
  /** When attendance was settled after the slot ended (room slots, automatically). */
  settledAt?: Date | null;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const DemoSlotSchema = new Schema<IDemoSlot>({
  tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true },
  course: { type: String, required: true, trim: true, maxlength: 120 },
  courseKey: { type: String, required: true, trim: true, lowercase: true, maxlength: 120 },
  title: { type: String, required: true, trim: true, maxlength: 160 },
  description: { type: String, trim: true, maxlength: 1000 },
  startsAt: { type: Date, required: true },
  durationMin: { type: Number, default: 60, min: 10, max: 480 },
  seats: { type: Number, default: 30, min: 1, max: 1000 },
  booked: { type: Number, default: 0, min: 0 },
  cutoffMin: { type: Number, default: 30, min: 0, max: 7 * 24 * 60 },
  hostId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  hostName: { type: String, trim: true, default: '' },
  joinMethod: { type: String, enum: ['room', 'link'], default: 'room' },
  meetingLink: { type: String, trim: true, maxlength: 500 },
  liveClassId: { type: Schema.Types.ObjectId, ref: 'LiveClass' },
  status: { type: String, enum: ['open', 'cancelled', 'done'], default: 'open' },
  seriesId: { type: String },
  settledAt: { type: Date, default: null },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });

DemoSlotSchema.index({ tenantId: 1, status: 1, startsAt: 1 });
DemoSlotSchema.index({ status: 1, settledAt: 1, startsAt: 1 });

export default mongoose.model<IDemoSlot>('DemoSlot', DemoSlotSchema);
