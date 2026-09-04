import mongoose, { Schema, Document } from 'mongoose';

/**
 * A CareerPilot signup that has been typed but NOT yet proved.
 *
 * WHY THIS EXISTS. Signup used to create the real User the moment the form was submitted,
 * before the OTP was sent, let alone entered. So an abandoned or failed signup left a
 * permanent account behind — and because one mobile may own only one account, that number
 * was then claimed forever. Someone whose OTP never arrived came back, typed the same
 * number, and was told it "is already registered": blocked by their own failed attempt,
 * with no way to clear it themselves.
 *
 * It was also a way to burn somebody else's number. Typing a stranger's mobile into the
 * form permanently reserved it against an email they do not control, and they would hit
 * the same wall when they eventually signed up.
 *
 * An account now begins to exist at the moment ownership of the number is proved, which is
 * what verification is for. Until then the answers live here, keyed by the same token the
 * OTP is keyed by, and expire on their own.
 *
 * NOTHING HERE IS AN ACCOUNT. No password, no role, no tenant membership — it cannot log
 * in, cannot be found by a member lookup, and holds no claim on the email or the mobile.
 * Two people may hold a pending signup for the same number at once; whoever proves it
 * first gets it, and the other simply fails verification.
 */
export interface IPendingPassportSignup extends Document {
  /** Random, and the same token the OTP is stored against. Never a user id. */
  token: string;
  tenantId: string;
  email: string;
  mobile: string;
  name: string;
  /** The onboarding answers, kept raw so signup and verify cannot disagree about them. */
  fields: Record<string, any>;
  createdAt: Date;
  expiresAt: Date;
}

const PendingPassportSignupSchema = new Schema<IPendingPassportSignup>(
  {
    token:    { type: String, required: true, unique: true, index: true },
    tenantId: { type: String, required: true, index: true },
    email:    { type: String, required: true, lowercase: true, trim: true },
    mobile:   { type: String, required: true, trim: true },
    name:     { type: String, default: '', trim: true },
    fields:   { type: Schema.Types.Mixed, default: {} },
    /**
     * Comfortably longer than the OTP's own ten minutes, so a code that expires can still
     * be resent against the same pending row rather than sending the member back to a form
     * they have already filled in. Mongo removes the row itself once this passes.
     */
    expiresAt: { type: Date, required: true, index: { expires: 0 } },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

/** Finding the live attempt for a number, to supersede it when the same person retries. */
PendingPassportSignupSchema.index({ tenantId: 1, mobile: 1 });

export default mongoose.model<IPendingPassportSignup>(
  'PendingPassportSignup', PendingPassportSignupSchema,
);
