import mongoose, { Schema, Document } from 'mongoose';
import bcryptjs from 'bcryptjs';

export interface IUser extends Document {
  email: string;
  firstName: string;
  lastName: string;
  password: string;
  role: string;
  tenantId: mongoose.Types.ObjectId;
  batchId?: mongoose.Types.ObjectId;
  batchJoinedDate?: Date;
  customRoleId?: mongoose.Types.ObjectId;
  managerId?: mongoose.Types.ObjectId;
  leadDataScope?: 'ALL' | 'TEAM' | 'OWN';
  dashboardWidgets?: string[];
  isActive: boolean;
  profileComplete: boolean;
  phone?: string;
  avatar?: string;
  bio?: string;
  linkedin?: string;
  github?: string;
  // Canonical placement status (the single source of truth for "is this student placed").
  // Set by the placement service when a drive/partner marks the student placed.
  placement?: {
    status: 'not_placed' | 'placed' | 'multiple_offers';
    company?: string;
    role?: string;
    ctc?: number;              // LPA
    source?: 'drive' | 'partner' | 'manual';
    offers?: number;
    placedAt?: Date;
    driveId?: mongoose.Types.ObjectId;
    partnerId?: mongoose.Types.ObjectId;
  };
  resetToken?: string;
  resetTokenExpires?: Date;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(password: string): Promise<boolean>;
}

const UserSchema: Schema = new Schema(
  {
    email: { 
      type: String, 
      required: true, 
      unique: true, 
      lowercase: true,
      trim: true 
    },
    firstName: { 
      type: String, 
      required: true,
      trim: true 
    },
    lastName: { 
      type: String, 
      required: true,
      trim: true 
    },
    password: { 
      type: String, 
      required: true 
    },
    role: { 
      type: String, 
      enum: ['SUPER_ADMIN', 'TENANT_ADMIN', 'INSTRUCTOR', 'STAFF', 'STUDENT', 'GUEST'], 
      default: 'STUDENT' 
    },
    tenantId: { 
      type: mongoose.Types.ObjectId, 
      ref: 'Tenant', 
      required: true 
    },
    batchId: {
      type: mongoose.Types.ObjectId,
      ref: 'Batch',
      default: null
    },
    batchJoinedDate: {
      type: Date,
      default: null
    },
    customRoleId: {
      type: mongoose.Types.ObjectId,
      ref: 'Role',
      default: null
    },
    managerId: {
      type: mongoose.Types.ObjectId,
      ref: 'User',
      default: null
    },
    leadDataScope: {
      type: String,
      enum: ['ALL', 'TEAM', 'OWN'],
      default: undefined
    },
    dashboardWidgets: {
      type: [String],
      default: null
    },
    isActive: { 
      type: Boolean, 
      default: true 
    },
    profileComplete: {
      type: Boolean,
      default: false
    },
    phone: {
      type: String,
      default: null
    },
    avatar: {
      type: String,
      default: null
    },
    bio: {
      type: String,
      default: null
    },
    linkedin: {
      type: String,
      default: null
    },
    github: {
      type: String,
      default: null
    },
    placement: {
      type: {
        status: { type: String, enum: ['not_placed', 'placed', 'multiple_offers'], default: 'not_placed' },
        company: { type: String },
        role: { type: String },
        ctc: { type: Number },
        source: { type: String, enum: ['drive', 'partner', 'manual'] },
        offers: { type: Number, default: 0 },
        placedAt: { type: Date },
        driveId: { type: mongoose.Types.ObjectId, ref: 'PlacementDrive' },
        partnerId: { type: mongoose.Types.ObjectId, ref: 'PlacementPartner' },
        _id: false,
      },
      default: undefined,
    },
    resetToken: {
      type: String,
      default: null
    },
    resetTokenExpires: {
      type: Date,
      default: null
    }
  },
  { timestamps: true }
);

// Hash password before saving
UserSchema.pre<IUser>('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcryptjs.genSalt(10);
    this.password = await bcryptjs.hash(this.password, salt);
    next();
  } catch (error: any) {
    next(error);
  }
});

// Compare password method
UserSchema.methods.comparePassword = async function(password: string): Promise<boolean> {
  return await bcryptjs.compare(password, this.password);
};

export default mongoose.model<IUser>('User', UserSchema);