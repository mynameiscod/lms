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
  isActive: boolean;
  profileComplete: boolean;
  phone?: string;
  avatar?: string;
  bio?: string;
  linkedin?: string;
  github?: string;
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
      enum: ['SUPER_ADMIN', 'TENANT_ADMIN', 'INSTRUCTOR', 'STUDENT', 'GUEST'], 
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