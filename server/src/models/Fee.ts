import mongoose, { Schema, Document } from 'mongoose';

export interface IFee extends Document {
  studentId: mongoose.Types.ObjectId;
  tenantId: mongoose.Types.ObjectId;
  batchId?: mongoose.Types.ObjectId;
  totalAmount: number;
  paidAmount: number;
  dueAmount: number;
  dueDate?: Date;
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

// Calculate due amount before saving
FeeSchema.pre('save', function(next) {
  this.dueAmount = this.totalAmount - this.paidAmount;
  if (this.dueAmount <= 0) {
    this.status = 'paid';
  } else if (this.paidAmount > 0) {
    this.status = 'partial';
  } else if (this.dueDate && new Date() > this.dueDate) {
    this.status = 'overdue';
  }
  next();
});

export default mongoose.model<IFee>('Fee', FeeSchema);
