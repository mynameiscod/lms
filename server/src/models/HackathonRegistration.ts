import mongoose, { Document, Schema } from 'mongoose';

/**
 * HackathonRegistration — one team, and the money that confirmed it.
 *
 * PAYMENT LIVES ON THIS ROW, not in the Payment ledger. That ledger requires a studentId
 * because everything in it belongs to an enrolled learner; a hackathon registrant is a
 * member of the public with no account and never will have one. Loosening a required field
 * on the collection that records fee income, to accommodate a funnel that is not fee income,
 * is a bad trade — so the four Razorpay facts live here and the ledger stays as it is.
 *
 * A REGISTRATION IS NOT REAL UNTIL THE MONEY IS. `pending_payment` is the state a team is in
 * between filling the form and Razorpay confirming; only a signature-verified webhook (or a
 * server-side fetch of the payment) moves it to `confirmed`. The browser saying "success" is
 * not evidence — it is a claim from the least trustworthy participant in the transaction.
 */

export type RegistrationStatus =
  | 'pending_payment'
  | 'confirmed'
  /** Abandoned, expired, or withdrawn. Holds no seat and reserves no phone number. */
  | 'cancelled'
  /**
   * Paid, but the team could not be confirmed — someone else's payment landed first with a
   * member in common, or the event filled up. The money is real and OWED BACK, which is why
   * this is its own status rather than a `cancelled` row nobody would ever look at again.
   */
  | 'refund_due';

export interface IHackathonMember {
  name: string;
  mobile: string;
  email: string;
  /** Exactly one per team. The person the confirmation goes to. */
  isLead: boolean;
}

export interface IHackathonPayment {
  provider: 'razorpay';
  orderId: string;
  paymentId?: string;
  signature?: string;
  /** Paise, as Razorpay counts it — never rupees, so nothing has to be rounded on the way in. */
  amountPaise: number;
  status: 'created' | 'paid' | 'failed' | 'refunded';
  paidAt?: Date | null;
}

export interface IHackathonRegistration extends Document {
  tenantId: string;
  hackathonId: mongoose.Types.ObjectId;
  hackathonSlug: string;

  teamName: string;
  /** Lower-cased and space-collapsed, so "Team Alpha" and "team  alpha" cannot both exist. */
  teamNameKey: string;

  college: string;
  /** True when the college was typed rather than picked, so an admin can tidy the list later. */
  collegeIsOther: boolean;

  members: IHackathonMember[];

  /**
   * Every member's mobile and email, flattened.
   *
   * Denormalised ONLY so the database can enforce "one person, one team per hackathon" —
   * a unique multikey index rejects a document sharing any array value with another. Doing
   * it in the handler alone is a read followed by a write, and two teams submitting the
   * same number at the same moment both read "free".
   */
  memberMobiles: string[];
  memberEmails: string[];

  status: RegistrationStatus;
  /** What the team was quoted, in rupees. Frozen here so a later fee change cannot rewrite it. */
  amountInr: number;
  payment?: IHackathonPayment | null;

  /** Short human reference the team can quote. Unique per tenant. */
  registrationCode: string;

  confirmedAt?: Date | null;
  /** Why a `refund_due` row is owed money, in words an admin can act on. */
  cancelReason?: string;

  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * How long an unpaid registration holds its members' numbers.
 *
 * Long enough to finish a UPI payment on a bad connection, short enough that an abandoned
 * attempt does not lock a student out of registering with a different team for the rest of
 * the event.
 */
export const PENDING_TTL_MINUTES = 30;

const MemberSchema = new Schema<IHackathonMember>({
  name:   { type: String, required: true, trim: true },
  mobile: { type: String, required: true, trim: true },
  email:  { type: String, default: '', lowercase: true, trim: true },
  isLead: { type: Boolean, default: false },
}, { _id: false });

const PaymentSchema = new Schema<IHackathonPayment>({
  provider:    { type: String, default: 'razorpay' },
  orderId:     { type: String, required: true },
  paymentId:   { type: String },
  signature:   { type: String },
  amountPaise: { type: Number, required: true },
  status:      { type: String, enum: ['created', 'paid', 'failed', 'refunded'], default: 'created' },
  paidAt:      { type: Date, default: null },
}, { _id: false });

const HackathonRegistrationSchema = new Schema<IHackathonRegistration>({
  tenantId:      { type: String, required: true, index: true },
  hackathonId:   { type: Schema.Types.ObjectId, ref: 'Hackathon', required: true, index: true },
  hackathonSlug: { type: String, default: '' },

  teamName:    { type: String, required: true, trim: true },
  teamNameKey: { type: String, required: true },

  college:        { type: String, default: '' },
  collegeIsOther: { type: Boolean, default: false },

  members:       { type: [MemberSchema], required: true },
  memberMobiles: { type: [String], default: [] },
  memberEmails:  { type: [String], default: [] },

  status:    { type: String, enum: ['pending_payment', 'confirmed', 'cancelled', 'refund_due'], default: 'pending_payment', index: true },
  amountInr: { type: Number, default: 0 },
  payment:   { type: PaymentSchema, default: null },

  registrationCode: { type: String, required: true },

  confirmedAt:  { type: Date, default: null },
  cancelReason: { type: String },

  ipAddress: { type: String },
  userAgent: { type: String },
}, { timestamps: true });

/**
 * The uniqueness rules, enforced by MongoDB rather than by the handler.
 *
 * ALL THREE ARE PARTIAL, ON CONFIRMED ROWS ONLY. A team that opened the form and never paid
 * must not hold a team name or a phone number hostage — and a cancelled or refunded row must
 * release them immediately. Confirmation is what reserves a place, so confirmation is what
 * the index is filtered on.
 *
 * The handler still checks before taking payment, because being told "that number is already
 * registered" while filling the form is a different experience from being charged and then
 * refunded. The index is what makes the check true under a race; the check is what makes it
 * pleasant.
 */
HackathonRegistrationSchema.index(
  { hackathonId: 1, teamNameKey: 1 },
  { unique: true, partialFilterExpression: { status: 'confirmed' }, name: 'hackathon_team_name_unique' },
);
/** Multikey and unique: no two confirmed teams may share ANY mobile number. */
HackathonRegistrationSchema.index(
  { hackathonId: 1, memberMobiles: 1 },
  { unique: true, partialFilterExpression: { status: 'confirmed' }, name: 'hackathon_member_mobile_unique' },
);
HackathonRegistrationSchema.index(
  { hackathonId: 1, memberEmails: 1 },
  { unique: true, partialFilterExpression: { status: 'confirmed' }, name: 'hackathon_member_email_unique' },
);

/** Looked up by the team from a confirmation link, and by the payment return path. */
HackathonRegistrationSchema.index({ tenantId: 1, registrationCode: 1 }, { unique: true });
/** The webhook's only way in: Razorpay knows the order id and nothing else about us. */
HackathonRegistrationSchema.index({ 'payment.orderId': 1 });
/** The admin list. */
HackathonRegistrationSchema.index({ hackathonId: 1, status: 1, createdAt: -1 });

export default mongoose.model<IHackathonRegistration>('HackathonRegistration', HackathonRegistrationSchema);
