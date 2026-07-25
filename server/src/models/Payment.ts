import mongoose, { Schema, Document } from 'mongoose';

/**
 * A payment transaction — currently the Razorpay self-serve unlock of a
 * candidate's full personalized learning plan. One row per order; the
 * Razorpay order is created up-front (status 'created') and flipped to 'paid'
 * once the checkout signature (or webhook) is verified, which is what unlocks
 * the plan. `orderId` is unique so verify + webhook are idempotent.
 */
// Purpose-agnostic payment rail. 'learning_plan_unlock' is the original use; 'fee' /
// 'fee_installment' are P1. certificate | item | subscription are reserved for later phases.
export type PaymentPurpose =
  | 'learning_plan_unlock' | 'fee' | 'fee_installment'
  | 'certificate' | 'item' | 'subscription';

export interface IPayment extends Document {
  tenantId: mongoose.Types.ObjectId;
  studentId: mongoose.Types.ObjectId;
  enrollmentId?: mongoose.Types.ObjectId;
  purpose: PaymentPurpose;
  // Generic link to what this pays for (e.g. Fee / CurriculumEnrollment / Certificate).
  target?: { refModel: string; refId: mongoose.Types.ObjectId };
  feeId?: mongoose.Types.ObjectId;           // convenience for fee reconcile
  installmentId?: string;                     // which Fee.installments[] entry (if any)
  gstInvoiceId?: mongoose.Types.ObjectId;     // P3
  provider: 'razorpay';
  orderId: string;
  paymentId?: string;
  signature?: string;
  amount: number;        // in the smallest currency unit (paise)
  currency: string;
  status: 'created' | 'paid' | 'failed' | 'refunded';
  unlockedPlans?: number;
  // Admin-initiated refund (P1).
  refund?: { refundId?: string; amount: number; at: Date; by?: mongoose.Types.ObjectId; reason?: string };
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
    purpose:      { type: String, enum: ['learning_plan_unlock', 'fee', 'fee_installment', 'certificate', 'item', 'subscription'], default: 'learning_plan_unlock' },
    target:       { refModel: { type: String }, refId: { type: Schema.Types.ObjectId } },
    feeId:        { type: Schema.Types.ObjectId, ref: 'Fee', index: true },
    installmentId:{ type: String },
    gstInvoiceId: { type: Schema.Types.ObjectId },
    provider:     { type: String, enum: ['razorpay'], default: 'razorpay' },
    orderId:      { type: String, required: true, unique: true, index: true },
    paymentId:    { type: String },
    signature:    { type: String },
    amount:       { type: Number, required: true },
    currency:     { type: String, default: 'INR' },
    status:       { type: String, enum: ['created', 'paid', 'failed', 'refunded'], default: 'created', index: true },
    unlockedPlans:{ type: Number },
    refund:       { refundId: { type: String }, amount: { type: Number }, at: { type: Date }, by: { type: Schema.Types.ObjectId, ref: 'User' }, reason: { type: String } },
    notes:        { type: Schema.Types.Mixed },
    paidAt:       { type: Date },
  },
  { timestamps: true }
);

PaymentSchema.index({ tenantId: 1, studentId: 1, status: 1 });
PaymentSchema.index({ tenantId: 1, purpose: 1, createdAt: -1 });

export default mongoose.model<IPayment>('Payment', PaymentSchema);
