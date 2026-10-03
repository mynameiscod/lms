import mongoose, { Schema, Document } from 'mongoose';

/**
 * A staff member who takes Placement Program interviews, with their own weekly hours and one
 * permanent meeting link (a Google Meet room from their own Gmail, or a Zoom personal room).
 *
 * No calendar integration by design (2026-10-03): the team is on Hostinger mail, and a Google
 * Calendar connection for personal Gmail needs weeks of Google review. Availability lives here, so
 * bookings can never double up, and invites go out as .ics files that open in any calendar.
 */
export interface IWeeklyWindow { day: number; start: string; end: string } // day 0=Sun … 6=Sat, "HH:MM" IST

export interface IPlacementInterviewer extends Document {
  tenantId: mongoose.Types.ObjectId;
  userId?: mongoose.Types.ObjectId;
  name: string;
  email?: string;
  meetingUrl: string;
  active: boolean;
  weekly: IWeeklyWindow[];
  /** "YYYY-MM-DD" (IST) days this person is not available. */
  daysOff: string[];
  createdAt: Date;
  updatedAt: Date;
}

const PlacementInterviewerSchema = new Schema<IPlacementInterviewer>({
  tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
  userId: { type: Schema.Types.ObjectId, ref: 'User' },
  name: { type: String, required: true, trim: true },
  email: { type: String, lowercase: true, trim: true, default: '' },
  meetingUrl: { type: String, trim: true, default: '' },
  active: { type: Boolean, default: true },
  weekly: { type: [{ day: Number, start: String, end: String, _id: false }], default: [] },
  daysOff: { type: [String], default: [] },
}, { timestamps: true });

export default mongoose.model<IPlacementInterviewer>('PlacementInterviewer', PlacementInterviewerSchema);
