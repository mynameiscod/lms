import mongoose, { Schema, Document } from 'mongoose';

export interface ILeadFormField {
  fieldKey: string;        // Unique key: built-in keys like 'name', 'email' or custom like 'custom_city'
  label: string;
  type: 'text' | 'email' | 'tel' | 'number' | 'date' | 'select' | 'textarea' | 'checkbox';
  required: boolean;
  enabled: boolean;        // Whether field shows on the form
  isBuiltIn: boolean;      // true for default fields (name, phone, etc), false for custom
  options?: string[];      // For select type fields
  placeholder?: string;
  order: number;
}

export interface ILeadFormConfig extends Document {
  tenantId: mongoose.Types.ObjectId;
  fields: ILeadFormField[];
  sources: string[];       // Customizable source options
  createdAt: Date;
  updatedAt: Date;
}

const LeadFormFieldSchema: Schema = new Schema(
  {
    fieldKey: { type: String, required: true, trim: true },
    label: { type: String, required: true, trim: true },
    type: {
      type: String,
      enum: ['text', 'email', 'tel', 'number', 'date', 'select', 'textarea', 'checkbox'],
      default: 'text'
    },
    required: { type: Boolean, default: false },
    enabled: { type: Boolean, default: true },
    isBuiltIn: { type: Boolean, default: false },
    options: [{ type: String, trim: true }],
    placeholder: { type: String, trim: true },
    order: { type: Number, default: 0 }
  },
  { _id: true }
);

const LeadFormConfigSchema: Schema = new Schema(
  {
    tenantId: {
      type: mongoose.Types.ObjectId,
      ref: 'Tenant',
      required: true,
      unique: true
    },
    fields: [LeadFormFieldSchema],
    sources: [{
      type: String,
      trim: true
    }]
  },
  { timestamps: true }
);

export const DEFAULT_FIELDS: Omit<ILeadFormField, '_id'>[] = [
  { fieldKey: 'name', label: 'Name', type: 'text', required: true, enabled: true, isBuiltIn: true, placeholder: 'Full name', order: 0 },
  { fieldKey: 'phone', label: 'Phone', type: 'tel', required: true, enabled: true, isBuiltIn: true, placeholder: 'Phone number', order: 1 },
  { fieldKey: 'email', label: 'Email', type: 'email', required: false, enabled: true, isBuiltIn: true, placeholder: 'Email address', order: 2 },
  { fieldKey: 'source', label: 'Source', type: 'select', required: true, enabled: true, isBuiltIn: true, order: 3 },
  { fieldKey: 'courseInterest', label: 'Course Interest', type: 'text', required: false, enabled: true, isBuiltIn: true, placeholder: 'e.g., Java Full Stack, Python (comma separated)', order: 4 },
  { fieldKey: 'stageId', label: 'Stage', type: 'select', required: false, enabled: true, isBuiltIn: true, order: 5 },
  { fieldKey: 'assignedTo', label: 'Assigned To', type: 'select', required: false, enabled: true, isBuiltIn: true, order: 6 },
  { fieldKey: 'nextFollowUp', label: 'Next Follow-up', type: 'date', required: false, enabled: true, isBuiltIn: true, order: 7 },
  { fieldKey: 'notes', label: 'Notes', type: 'textarea', required: false, enabled: true, isBuiltIn: true, placeholder: 'Additional notes...', order: 8 },
];

export const DEFAULT_SOURCES = ['website', 'walkin', 'referral', 'social_media', 'google_ads', 'whatsapp', 'phone', 'other'];

export default mongoose.model<ILeadFormConfig>('LeadFormConfig', LeadFormConfigSchema);
