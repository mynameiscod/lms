import mongoose, { Schema, Document } from 'mongoose';

export interface IRole extends Document {
  name: string;
  description?: string;
  permissions: string[];
  tenantId?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const RoleSchema: Schema = new Schema(
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
    permissions: [{
      type: String
    }],
    tenantId: { 
      type: mongoose.Types.ObjectId, 
      ref: 'Tenant' 
    }
  },
  { timestamps: true }
);

export default mongoose.model<IRole>('Role', RoleSchema);