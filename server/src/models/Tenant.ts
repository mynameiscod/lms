import mongoose, { Schema, Document } from 'mongoose';

export interface ITenant extends Document {
  name: string;
  description?: string;
  slug: string;
  logo?: string;
  website?: string;
  adminId: mongoose.Types.ObjectId;
  isActive: boolean;
  subscriptionPlan: 'free' | 'pro' | 'enterprise';
  createdAt: Date;
  updatedAt: Date;
}

const TenantSchema: Schema = new Schema(
  {
    name: { 
      type: String, 
      required: true,
      trim: true 
    },
    description: { 
      type: String,
      trim: true 
    },
    slug: { 
      type: String, 
      required: true, 
      unique: true,
      lowercase: true,
      trim: true 
    },
    logo: { 
      type: String 
    },
    website: { 
      type: String 
    },
    adminId: { 
      type: mongoose.Types.ObjectId, 
      ref: 'User', 
      required: true 
    },
    isActive: { 
      type: Boolean, 
      default: true 
    },
    subscriptionPlan: { 
      type: String, 
      enum: ['free', 'pro', 'enterprise'], 
      default: 'free' 
    }
  },
  { timestamps: true }
);

export default mongoose.model<ITenant>('Tenant', TenantSchema);