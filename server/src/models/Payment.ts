import mongoose, { Schema, Document } from 'mongoose';

/**
 * A payment transaction — currently the Razorpay self-serve unlock of a
 * candidate's full personalized learning plan. One row per order; the
 * Razorpay order is created up-front (status 'created') and flipped to 'paid'
 * once the checkout signature (or webhook) is verified, which is what unlocks
 * the plan. `orderId` is unique so verify + webhook are idempotent.
 */
export interface IPayment extends Document {
  tenantId: mongoose.Types.ObjectId;
  studentId: mongoose.Types.ObjectId;
  enrollmentId?: mongoose.Types.ObjectId;
  purpose: 'learning_plan_unlock';
  provider: 'razorpay';
  orderId: string;
  paymentId?: string;
  signature?: string;
  amount: number;        // in the smallest currency unit (paise)
  currency: string;
  status: 'created' | 'paid' | 'failed';
  unlockedPlans?: number;
  notes?: Record<string, any>;
  paidAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const PaymentSchema = new Schema<IPayment>(
  {
    tenantId:     { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    studentId:    { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    enrollmentId: { type: Schema.Types.ObjectId, ref: 'CurriculumEnrollment' },
    purpose:      { type: String, enum: ['learning_plan_unlock'], default: 'learning_plan_unlock' },
    provider:     { type: String, enum: ['razorpay'], default: 'razorpay' },
    orderId:      { type: String, required: true, unique: true, index: true },
    paymentId:    { type: String },
    signature:    { type: String },
    amount:       { type: Number, required: true },
    currency:     { type: String, default: 'INR' },
    status:       { type: String, enum: ['created', 'paid', 'failed'], default: 'created', index: true },
    unlockedPlans:{ type: Number },
    notes:        { type: Schema.Types.Mixed },
    paidAt:       { type: Date },
  },
  { timestamps: true }
);

PaymentSchema.index({ tenantId: 1, studentId: 1, status: 1 });

export default mongoose.model<IPayment>('Payment', PaymentSchema);
