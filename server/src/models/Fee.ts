import mongoose, { Schema, Document } from 'mongoose';

export interface IFee extends Document {
  studentId: mongoose.Types.ObjectId;
  tenantId: mongoose.Types.ObjectId;
  batchId?: mongoose.Types.ObjectId;
  totalAmount: number;
  registrationFee: number;
  studyMaterials: number;
  otherCharges: number;
  discount: number;
  discountReason?: string;
  receiptNumber?: string;
  paidAmount: number;
  dueAmount: number;
  dueDate?: Date;
  followupDate?: Date;
  installments: Array<{
    label?: string;
    amount: number;
    dueDate?: Date;
    status: 'pending' | 'paid';
    paidDate?: Date;
  }>;
  payments: Array<{
    amount: number;
    paymentDate: Date;
    paymentMethod: 'cash' | 'card' | 'upi' | 'bank_transfer' | 'other';
    transactionId?: string;
    remarks?: string;
    receivedBy: mongoose.Types.ObjectId;
  }>;
  status: 'pending' | 'partial' | 'paid' | 'overdue';
  createdAt: Date;
  updatedAt: Date;
}

const FeeSchema = new Schema<IFee>(
  {
    studentId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    tenantId: {
      type: Schema.Types.ObjectId,
      ref: 'Tenant',
      required: true
    },
    batchId: {
      type: Schema.Types.ObjectId,
      ref: 'Batch'
    },
    totalAmount: {
      type: Number,
      required: true,
      default: 0
    },
    registrationFee: {
      type: Number,
      default: 0
    },
    studyMaterials: {
      type: Number,
      default: 0
    },
    otherCharges: {
      type: Number,
      default: 0
    },
    discount: {
      type: Number,
      default: 0
    },
    discountReason: {
      type: String
    },
    receiptNumber: {
      type: String
    },
    paidAmount: {
      type: Number,
      default: 0
    },
    dueAmount: {
      type: Number,
      default: 0
    },
    dueDate: {
      type: Date
    },
    followupDate: {
      type: Date
    },
    installments: [{
      label: String,
      amount: { type: Number, required: true },
      dueDate: { type: Date },
      status: { type: String, enum: ['pending', 'paid'], default: 'pending' },
      paidDate: { type: Date }
    }],
    payments: [{
      amount: { type: Number, required: true },
      paymentDate: { type: Date, default: Date.now },
      paymentMethod: { 
        type: String, 
        enum: ['cash', 'card', 'upi', 'bank_transfer', 'other'],
        default: 'cash'
      },
      transactionId: String,
      remarks: String,
      receivedBy: { type: Schema.Types.ObjectId, ref: 'User' }
    }],
    status: {
      type: String,
      enum: ['pending', 'partial', 'paid', 'overdue'],
      default: 'pending'
    }
  },
  { timestamps: true }
);

// Calculate due amount before saving (net of discount)
FeeSchema.pre('save', function(next) {
  const net = Math.max(0, (this.totalAmount || 0) - (this.discount || 0));
  this.dueAmount = net - (this.paidAmount || 0);
  if (net > 0 && this.dueAmount <= 0) {
    this.status = 'paid';
  } else if ((this.paidAmount || 0) > 0) {
    this.status = 'partial';
  } else if (this.dueDate && new Date() > this.dueDate) {
    this.status = 'overdue';
  } else {
    this.status = 'pending';
  }
  next();
});

export default mongoose.model<IFee>('Fee', FeeSchema);
