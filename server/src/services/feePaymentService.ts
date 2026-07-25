// ─────────────────────────────────────────────────────────────────────────────
// The single place a fee payment is applied — used by admin manual recording AND
// online (Razorpay) verify + webhook. Idempotent: the same transactionId is never
// credited twice, so verify and webhook firing for one payment is safe.
// All amounts here are in RUPEES (the Fee stores rupees; Razorpay uses paise, so
// callers convert paise → rupees before calling).
// ─────────────────────────────────────────────────────────────────────────────

import mongoose from 'mongoose';
import Fee from '../models/Fee';
import User from '../models/User';

export type FeePaymentMethod = 'cash' | 'card' | 'upi' | 'bank_transfer' | 'razorpay' | 'other';

export interface ApplyFeePaymentInput {
  tenantId: string | mongoose.Types.ObjectId;
  studentId: string | mongoose.Types.ObjectId;
  amount: number;                 // rupees
  paymentMethod: FeePaymentMethod;
  feeId?: string | mongoose.Types.ObjectId;
  installmentId?: string;         // mark this Fee.installments[] entry paid
  transactionId?: string;         // idempotency key for online
  paymentRef?: mongoose.Types.ObjectId; // the Payment row (online)
  receivedBy?: mongoose.Types.ObjectId;
  remarks?: string;
  paymentDate?: Date;
  totalAmount?: number;           // set/override on first record
}

const sum = (arr: any[]) => (arr || []).reduce((s, p) => s + (p.amount || 0), 0);

/** Apply a payment to a student's Fee. Returns { fee, applied }. applied=false when a
 *  payment with the same transactionId was already recorded (idempotent no-op). */
export async function applyFeePayment(input: ApplyFeePaymentInput): Promise<{ fee: any; applied: boolean }> {
  const { tenantId, studentId, amount, paymentMethod } = input;
  if (!amount || amount <= 0) throw new Error('Valid amount is required');

  let fee: any = input.feeId
    ? await Fee.findOne({ _id: input.feeId, tenantId })
    : await Fee.findOne({ studentId, tenantId });

  if (!fee) {
    const student = await User.findOne({ _id: studentId, tenantId }).select('batchId').lean() as any;
    fee = new Fee({ studentId, tenantId, batchId: student?.batchId, totalAmount: Number(input.totalAmount) || amount, paidAmount: 0 });
  } else if (input.totalAmount !== undefined && input.totalAmount !== null) {
    fee.totalAmount = Number(input.totalAmount);
  }

  // Idempotency: never double-credit the same gateway transaction.
  if (input.transactionId && (fee.payments || []).some((p: any) => p.transactionId === input.transactionId)) {
    return { fee, applied: false };
  }

  fee.payments.push({
    amount,
    paymentDate: input.paymentDate || new Date(),
    paymentMethod,
    transactionId: input.transactionId,
    remarks: input.remarks,
    receivedBy: input.receivedBy,
    paymentRef: input.paymentRef,
    refundedAmount: 0,
  });
  fee.paidAmount = sum(fee.payments) - (fee.payments || []).reduce((s: number, p: any) => s + (p.refundedAmount || 0), 0);

  if (input.installmentId) {
    const inst = fee.installments?.id?.(input.installmentId);
    if (inst) { inst.status = 'paid'; inst.paidDate = new Date(); }
  }

  await fee.save(); // pre-save hook recomputes dueAmount + status
  return { fee, applied: true };
}

/** Reverse (refund) part/all of a Razorpay payment entry on the Fee. */
export async function reverseFeePayment(opts: {
  tenantId: string | mongoose.Types.ObjectId;
  feeId: string | mongoose.Types.ObjectId;
  paymentRef: mongoose.Types.ObjectId;
  amount: number;                 // rupees to refund
  installmentId?: string;         // revert this installment to pending
}): Promise<any> {
  const fee: any = await Fee.findOne({ _id: opts.feeId, tenantId: opts.tenantId });
  if (!fee) throw new Error('Fee not found');
  const entry = (fee.payments || []).find((p: any) => String(p.paymentRef) === String(opts.paymentRef));
  if (entry) entry.refundedAmount = (entry.refundedAmount || 0) + opts.amount;
  fee.paidAmount = sum(fee.payments) - (fee.payments || []).reduce((s: number, p: any) => s + (p.refundedAmount || 0), 0);
  if (opts.installmentId) {
    const inst = fee.installments?.id?.(opts.installmentId);
    if (inst) { inst.status = 'pending'; inst.paidDate = undefined; }
  }
  await fee.save();
  return fee;
}
