import mongoose, { Document, Schema } from 'mongoose';

/**
 * One person's seat in one demo slot (CRM: Book a demo).
 *
 * `token` is their personal booking link (/demo-booking/<token>): join, reschedule or cancel without
 * logging in. The demo itself is also a Meeting (type online_demo) on their lead, so the lead page,
 * demo reminders, workflows, no-show follow-ups and the reports see it like any other demo.
 *
 * One active booking per phone per course: booking again moves the existing one.
 */
export type DemoBookingStatus = 'booked' | 'cancelled' | 'attended' | 'no_show';

export interface IDemoBooking extends Document {
  tenantId: mongoose.Types.ObjectId;
  slotId: mongoose.Types.ObjectId;
  courseKey: string;
  leadId: mongoose.Types.ObjectId;
  meetingId?: mongoose.Types.ObjectId;
  /** The guest invite on the slot's live class (room slots only). */
  liveInviteId?: mongoose.Types.ObjectId;
  name: string;
  phone: string;
  email?: string;
  token: string;
  status: DemoBookingStatus;
  cancelledBy?: 'visitor' | 'institute';
  rescheduleCount: number;
  utm?: { source?: string; medium?: string; campaign?: string; content?: string; term?: string };
  pageUrl?: string;
  joinClickedAt?: Date | null;
  minutesInRoom?: number;
  /** Reminders already sent for the current slot ('day', 'hour'); cleared when the booking moves. */
  remindersSent: string[];
  createdAt: Date;
  updatedAt: Date;
}

const DemoBookingSchema = new Schema<IDemoBooking>({
  tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true },
  slotId: { type: Schema.Types.ObjectId, ref: 'DemoSlot', required: true },
  courseKey: { type: String, required: true },
  leadId: { type: Schema.Types.ObjectId, ref: 'Lead', required: true },
  meetingId: { type: Schema.Types.ObjectId, ref: 'Meeting' },
  liveInviteId: { type: Schema.Types.ObjectId, ref: 'LiveClassInvite' },
  name: { type: String, required: true, trim: true, maxlength: 120 },
  phone: { type: String, required: true, trim: true, maxlength: 10 },
  email: { type: String, trim: true, lowercase: true, maxlength: 200 },
  token: { type: String, required: true },
  status: { type: String, enum: ['booked', 'cancelled', 'attended', 'no_show'], default: 'booked' },
  cancelledBy: { type: String, enum: ['visitor', 'institute'] },
  rescheduleCount: { type: Number, default: 0 },
  utm: { source: String, medium: String, campaign: String, content: String, term: String },
  pageUrl: { type: String, maxlength: 500 },
  joinClickedAt: { type: Date, default: null },
  minutesInRoom: { type: Number },
  remindersSent: { type: [String], default: [] },
}, { timestamps: true });

DemoBookingSchema.index({ token: 1 }, { unique: true });
DemoBookingSchema.index({ tenantId: 1, slotId: 1, status: 1 });
// One active booking per phone per course. Booking again moves this one instead.
DemoBookingSchema.index({ tenantId: 1, phone: 1, courseKey: 1 }, { unique: true, partialFilterExpression: { status: 'booked' } });

export default mongoose.model<IDemoBooking>('DemoBooking', DemoBookingSchema);
