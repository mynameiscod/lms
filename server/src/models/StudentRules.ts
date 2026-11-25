import mongoose, { Schema } from 'mongoose';

/**
 * Student Rules — one document per institute, three switches the admin controls on /student-rules:
 *
 *  1. Office attendance: students check themselves in (and out) by scanning a QR code that changes
 *     every few seconds on a classroom screen. Proof they are really in the office comes from the
 *     checks the admin turns on — same network as the QR screen (works without a fixed internet
 *     address), a saved list of office networks, and/or the phone's location.
 *  2. Inactivity alerts: a morning WhatsApp to the student, then the trainer, then the parent, as the
 *     number of days without opening the LMS grows.
 *  3. Profile gate: a student in a batch cannot use the LMS until the profile is 100% complete.
 *
 * Everything starts OFF, so deploying this changes nothing until the admin switches a section on.
 */

export interface OfficeNetwork { ip: string; label?: string; addedAt?: Date }

export interface IStudentRules {
  tenantId: mongoose.Types.ObjectId;
  attendance: {
    enabled: boolean;
    /** The phone must be on the same internet connection as the QR screen at the moment of scanning. */
    sameNetworkAsScreen: boolean;
    /** The phone must be on one of the saved office networks. */
    savedNetworks: boolean;
    networks: OfficeNetwork[];
    /** The phone must share its location and be within radiusM of the office. */
    location: boolean;
    officeLat?: number;
    officeLng?: number;
    radiusM: number;
    /** Ask students to scan again when leaving. */
    checkOut: boolean;
    /** A second scan earlier than this many minutes after check-in is refused (stops accidental double scans). */
    minMinutesBeforeCheckOut: number;
    /** "HH:MM" IST; a check-in after this is marked late. Empty = never late. */
    lateAfter: string;
    /** One phone checks in one student per day (stops one student scanning for friends). */
    onePhonePerStudent: boolean;
    /** How often the QR code changes, in seconds. */
    qrSeconds: number;
  };
  inactivity: {
    enabled: boolean;
    /** Days without opening the LMS before each message. 0 = that message is off. */
    studentAfterDays: number;
    trainerAfterDays: number;
    parentAfterDays: number;
    /** Hour of the day (IST) the alerts go out. */
    sendHourIst: number;
    /** Do not send on Sundays. */
    skipSundays: boolean;
  };
  profileGate: {
    enabled: boolean;
    /** Also require the parent's mobile number (needed for parent alerts). */
    requireParentMobile: boolean;
  };
  /** Signs the QR tokens. Generated once per institute. */
  qrSecret: string;
  updatedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const StudentRulesSchema = new Schema<IStudentRules>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, unique: true },
    attendance: {
      enabled: { type: Boolean, default: false },
      sameNetworkAsScreen: { type: Boolean, default: true },
      savedNetworks: { type: Boolean, default: false },
      networks: [{ ip: { type: String, trim: true }, label: { type: String, trim: true }, addedAt: { type: Date, default: Date.now } }],
      location: { type: Boolean, default: false },
      officeLat: { type: Number },
      officeLng: { type: Number },
      radiusM: { type: Number, default: 150 },
      checkOut: { type: Boolean, default: true },
      minMinutesBeforeCheckOut: { type: Number, default: 60 },
      lateAfter: { type: String, default: '' },
      onePhonePerStudent: { type: Boolean, default: true },
      qrSeconds: { type: Number, default: 20 },
    },
    inactivity: {
      enabled: { type: Boolean, default: false },
      studentAfterDays: { type: Number, default: 1 },
      trainerAfterDays: { type: Number, default: 3 },
      parentAfterDays: { type: Number, default: 0 },
      sendHourIst: { type: Number, default: 10 },
      skipSundays: { type: Boolean, default: true },
    },
    profileGate: {
      enabled: { type: Boolean, default: false },
      requireParentMobile: { type: Boolean, default: false },
    },
    qrSecret: { type: String, required: true },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

export const StudentRules = mongoose.model<IStudentRules>('StudentRules', StudentRulesSchema);

/**
 * One inactivity message that went out. The same student is told once per message type per spell of
 * inactivity: `lastActiveDay` names the spell, so opening the LMS again starts a fresh one.
 */
export interface IInactivityAlert {
  tenantId: mongoose.Types.ObjectId;
  studentId: mongoose.Types.ObjectId;
  kind: 'student' | 'trainer' | 'parent';
  lastActiveDay: string;
  daysInactive: number;
  ok: boolean;
  error?: string;
  sentAt: Date;
}

const InactivityAlertSchema = new Schema<IInactivityAlert>({
  tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true },
  studentId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  kind: { type: String, enum: ['student', 'trainer', 'parent'], required: true },
  lastActiveDay: { type: String, required: true },
  daysInactive: { type: Number, default: 0 },
  ok: { type: Boolean, default: false },
  error: { type: String },
  sentAt: { type: Date, default: Date.now },
});
InactivityAlertSchema.index({ tenantId: 1, studentId: 1, kind: 1, lastActiveDay: 1 }, { unique: true });
InactivityAlertSchema.index({ tenantId: 1, sentAt: -1 });

export const InactivityAlert = mongoose.model<IInactivityAlert>('InactivityAlert', InactivityAlertSchema);
