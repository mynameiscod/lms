import mongoose, { Schema, Document } from 'mongoose';

/**
 * One interview booking. The partial unique index makes a double booking impossible: two requests
 * racing for the same interviewer and start time cannot both be "booked" — the database refuses the
 * second, whatever the application thought it had checked.
 */
export interface IPlacementBooking extends Document {
  tenantId: mongoose.Types.ObjectId;
  candidateId: mongoose.Types.ObjectId;
  interviewerId: mongoose.Types.ObjectId;
  startsAt: Date;
  endsAt: Date;
  meetingUrl: string;
  status: 'booked' | 'cancelled' | 'attended' | 'no_show';
  /** Which reminders went out, so a scheduler tick can never send one twice. */
  reminded: { h24?: Date; h1?: Date };
  cancelledReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

const PlacementBookingSchema = new Schema<IPlacementBooking>({
  tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
  candidateId: { type: Schema.Types.ObjectId, ref: 'PlacementCandidate', required: true, index: true },
  interviewerId: { type: Schema.Types.ObjectId, ref: 'PlacementInterviewer', required: true },
  startsAt: { type: Date, required: true },
  endsAt: { type: Date, required: true },
  meetingUrl: { type: String, default: '' },
  status: { type: String, enum: ['booked', 'cancelled', 'attended', 'no_show'], default: 'booked' },
  reminded: { type: new Schema({ h24: Date, h1: Date }, { _id: false }), default: {} },
  cancelledReason: String,
}, { timestamps: true });

PlacementBookingSchema.index({ interviewerId: 1, startsAt: 1 }, { unique: true, partialFilterExpression: { status: 'booked' } });
PlacementBookingSchema.index({ status: 1, startsAt: 1 });

export default mongoose.model<IPlacementBooking>('PlacementBooking', PlacementBookingSchema);
