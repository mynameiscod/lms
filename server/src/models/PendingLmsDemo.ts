import mongoose, { Document, Schema } from 'mongoose';

/**
 * A demo sign-up waiting for its OTP. No account exists until the phone is proved, so a typo or a
 * stranger's number never creates a user or a CRM lead.
 */
export interface IPendingLmsDemo extends Document {
  token: string;
  tenantId: string;
  name: string;
  phone: string;
  email?: string;
  /** "Final-year student", "Working professional"... whatever the student picked. */
  status?: string;
  attribution?: Record<string, string>;
  expiresAt: Date;
  createdAt: Date;
}

const PendingLmsDemoSchema = new Schema<IPendingLmsDemo>(
  {
    token:    { type: String, required: true, unique: true },
    tenantId: { type: String, required: true },
    name:     { type: String, required: true, trim: true, maxlength: 80 },
    phone:    { type: String, required: true, trim: true, maxlength: 20 },
    email:    { type: String, trim: true, lowercase: true, maxlength: 120 },
    status:   { type: String, trim: true, maxlength: 60 },
    attribution: { type: Schema.Types.Mixed },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

// Mongo removes the row once it expires.
PendingLmsDemoSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model<IPendingLmsDemo>('PendingLmsDemo', PendingLmsDemoSchema);
