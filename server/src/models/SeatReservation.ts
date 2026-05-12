import mongoose, { Schema, Document } from 'mongoose';

// ===================== SEAT RESERVATION MODEL =====================
// Tracks seat reservations, payments, and conversion to student

export type ReservationStatus = 
  | 'pending'      // Seat reserved, awaiting payment
  | 'partial_paid' // Partial payment received
  | 'paid'         // Full payment received
  | 'confirmed'    // Payment confirmed, ready for enrollment
  | 'enrolled'     // Student enrolled in course
  | 'cancelled'    // Reservation cancelled
  | 'expired';     // Reservation expired

export type PaymentMethod = 
  | 'cash' 
  | 'upi' 
  | 'bank_transfer' 
  | 'card' 
  | 'razorpay'
  | 'phonepe'
  | 'paytm'
  | 'other';

export interface IPayment {
  amount: number;
  method: PaymentMethod;
  transactionId?: string;
  paidAt: Date;
  receiptNumber?: string;
  receiptUrl?: string;
  notes?: string;
  proofUrl?: string;
  installmentLabel?: string;
  createdBy: mongoose.Types.ObjectId;
}

export interface IRefund {
  amount: number;
  reason?: string;
  refundedAt: Date;
  createdBy: mongoose.Types.ObjectId;
}

export type DemoStatus = 'none' | 'active' | 'satisfied' | 'refunded';
export type InstallmentStatus = 'pending' | 'paid' | 'overdue';

export interface IInstallment {
  label: string;
  amount: number;
  dueDate?: Date;
  status: InstallmentStatus;
  paidAt?: Date;
  paymentId?: mongoose.Types.ObjectId;
}

export interface ISeatReservation extends Document {
  tenantId: mongoose.Types.ObjectId;
  leadId?: mongoose.Types.ObjectId;

  // Direct student contact (used in standalone reservations without a lead)
  studentName?: string;
  studentEmail?: string;
  studentPhone?: string;
  
  // Course info
  courseId?: mongoose.Types.ObjectId;
  batchId?: mongoose.Types.ObjectId;
  courseName: string;
  batchName?: string;
  
  // Pricing
  originalPrice: number;
  discountAmount: number;
  discountReason?: string;
  finalPrice: number;
  paidAmount: number;
  balanceAmount: number;
  
  // Payments
  payments: IPayment[];
  refunds: IRefund[];
  
  // Status
  status: ReservationStatus;
  reservedAt: Date;
  expiresAt?: Date;
  
  // Seat details
  seatNumber?: string;
  
  // Enrollment
  enrolledAt?: Date;
  studentId?: mongoose.Types.ObjectId;
  
  // Communication
  receiptSent: boolean;
  receiptSentAt?: Date;
  welcomeEmailSent: boolean;
  welcomeEmailSentAt?: Date;
  
  // Demo period
  demoEnabled: boolean;
  demoPeriodDays: number;
  demoStartDate?: Date;
  demoEndDate?: Date;
  demoStatus: DemoStatus;

  // Installment plan
  installmentPlan: IInstallment[];

  // Notes
  notes?: string;

  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const PaymentSchema: Schema = new Schema(
  {
    amount: {
      type: Number,
      required: true,
      min: 0
    },
    method: {
      type: String,
      enum: ['cash', 'upi', 'bank_transfer', 'card', 'razorpay', 'phonepe', 'paytm', 'other'],
      required: true
    },
    transactionId: {
      type: String,
      trim: true
    },
    paidAt: {
      type: Date,
      default: Date.now
    },
    receiptNumber: {
      type: String,
      trim: true
    },
    receiptUrl: {
      type: String,
      trim: true
    },
    notes: {
      type: String,
      trim: true
    },
    proofUrl: {
      type: String,
      trim: true
    },
    installmentLabel: {
      type: String,
      trim: true
    },
    createdBy: {
      type: mongoose.Types.ObjectId,
      ref: 'User',
      required: true
    }
  },
  { _id: true }
);

const SeatReservationSchema: Schema = new Schema(
  {
    tenantId: {
      type: mongoose.Types.ObjectId,
      ref: 'Tenant',
      required: true
    },
    leadId: {
      type: mongoose.Types.ObjectId,
      ref: 'Lead'
    },
    // Direct student contact fields (standalone reservations)
    studentName: { type: String, trim: true },
    studentEmail: { type: String, trim: true, lowercase: true },
    studentPhone: { type: String, trim: true },
    courseId: {
      type: mongoose.Types.ObjectId,
      ref: 'Course'
    },
    batchId: {
      type: mongoose.Types.ObjectId,
      ref: 'Batch'
    },
    courseName: {
      type: String,
      required: true,
      trim: true
    },
    batchName: {
      type: String,
      trim: true
    },
    originalPrice: {
      type: Number,
      required: true,
      min: 0
    },
    discountAmount: {
      type: Number,
      default: 0,
      min: 0
    },
    discountReason: {
      type: String,
      trim: true
    },
    finalPrice: {
      type: Number,
      required: true,
      min: 0
    },
    paidAmount: {
      type: Number,
      default: 0,
      min: 0
    },
    balanceAmount: {
      type: Number,
      default: 0,
      min: 0
    },
    payments: [PaymentSchema],
    refunds: [
      {
        amount: { type: Number, required: true, min: 0 },
        reason: { type: String, trim: true },
        refundedAt: { type: Date, default: Date.now },
        createdBy: { type: mongoose.Types.ObjectId, ref: 'User', required: true }
      }
    ],
    status: {
      type: String,
      enum: ['pending', 'partial_paid', 'paid', 'confirmed', 'enrolled', 'cancelled', 'expired'],
      default: 'pending'
    },
    reservedAt: {
      type: Date,
      default: Date.now
    },
    expiresAt: {
      type: Date
    },
    seatNumber: {
      type: String,
      trim: true
    },
    enrolledAt: {
      type: Date
    },
    studentId: {
      type: mongoose.Types.ObjectId,
      ref: 'User'
    },
    receiptSent: {
      type: Boolean,
      default: false
    },
    receiptSentAt: {
      type: Date
    },
    welcomeEmailSent: {
      type: Boolean,
      default: false
    },
    welcomeEmailSentAt: {
      type: Date
    },
    // Demo period
    demoEnabled: { type: Boolean, default: false },
    demoPeriodDays: { type: Number, default: 3, min: 1 },
    demoStartDate: { type: Date },
    demoEndDate: { type: Date },
    demoStatus: {
      type: String,
      enum: ['none', 'active', 'satisfied', 'refunded'],
      default: 'none'
    },

    // Installment plan
    installmentPlan: [
      {
        label: { type: String, required: true, trim: true },
        amount: { type: Number, required: true, min: 0 },
        dueDate: { type: Date },
        status: {
          type: String,
          enum: ['pending', 'paid', 'overdue'],
          default: 'pending'
        },
        paidAt: { type: Date },
        paymentId: { type: mongoose.Types.ObjectId }
      }
    ],

    notes: {
      type: String,
      trim: true
    },
    createdBy: {
      type: mongoose.Types.ObjectId,
      ref: 'User',
      required: true
    }
  },
  { timestamps: true }
);

// Pre-save hook to calculate amounts
SeatReservationSchema.pre('save', function(next) {
  this.finalPrice = this.originalPrice - this.discountAmount;
  const totalPayments = this.payments.reduce((sum: number, p: any) => sum + p.amount, 0);
  const totalRefunds = (this.refunds || []).reduce((sum: number, r: any) => sum + r.amount, 0);
  const netPaid = Math.max(0, totalPayments - totalRefunds);

  this.paidAmount = netPaid;
  this.balanceAmount = Math.max(0, this.finalPrice - netPaid);

  // Update status based on net payment and enrollment state
  if (this.status !== 'cancelled' && this.status !== 'enrolled') {
    if (netPaid === 0) {
      this.status = 'pending';
    } else if (netPaid < this.finalPrice) {
      this.status = 'partial_paid';
    } else if (netPaid >= this.finalPrice) {
      this.status = 'paid';
    }
  }

  next();
});

// Indexes
SeatReservationSchema.index({ tenantId: 1, leadId: 1 });
SeatReservationSchema.index({ tenantId: 1, status: 1 });
SeatReservationSchema.index({ tenantId: 1, courseId: 1 });
SeatReservationSchema.index({ tenantId: 1, batchId: 1 });
SeatReservationSchema.index({ tenantId: 1, reservedAt: -1 });

export default mongoose.model<ISeatReservation>('SeatReservation', SeatReservationSchema);
