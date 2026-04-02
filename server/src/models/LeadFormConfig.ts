import mongoose, { Schema, Document } from 'mongoose';

export type FieldType = 'text' | 'email' | 'tel' | 'number' | 'date' | 'time' | 'datetime' | 
                        'select' | 'multiselect' | 'textarea' | 'checkbox' | 'radio' |
                        'file' | 'url' | 'location' | 'whatsapp';

export type FieldGroup = 'contact' | 'qualification' | 'campaign' | 'custom' | 'internal';

export interface IFieldVisibility {
  form: boolean;        // Show in create/edit form
  detail: boolean;      // Show in lead detail page
  table: boolean;       // Show as table column
  kanban: boolean;      // Show on Kanban card
  telecaller: boolean;  // Show in telecaller console
  export: boolean;      // Include in CSV export
}

export interface IFieldValidation {
  pattern?: string;     // Regex pattern
  minLength?: number;
  maxLength?: number;
  min?: number;         // For numbers
  max?: number;
}

export interface IShowWhen {
  fieldKey: string;
  operator: 'equals' | 'notEquals' | 'contains' | 'notEmpty' | 'isEmpty' | 'in' | 'notIn';
  value?: any;
}

export interface ILeadFormField {
  fieldKey: string;
  label: string;
  type: FieldType;
  required: boolean;
  enabled: boolean;
  isBuiltIn: boolean;
  options?: string[];
  placeholder?: string;
  order: number;
  
  // NEW: Visibility toggles
  visibility?: IFieldVisibility;
  
  // NEW: Field behavior
  editable?: boolean;           // Can be edited after creation
  defaultValue?: any;           // Default when creating lead
  validation?: IFieldValidation;
  
  // NEW: Conditional visibility
  showWhen?: IShowWhen;
  
  // NEW: Field grouping
  group?: FieldGroup;
  
  // NEW: Help text
  helpText?: string;
  
  // NEW: Display format
  displayFormat?: string;       // e.g., 'currency', 'phone', 'date'
}

// Stats card configuration
export interface IStatsCard {
  key: string;           // Unique identifier: 'totalLeads', 'todayFollowUps', 'stage_<stageId>', 'priority_hot', etc.
  type: 'system' | 'stage' | 'priority' | 'source' | 'custom';
  label: string;
  icon?: string;
  color?: string;
  enabled: boolean;
  order: number;
  stageId?: string;      // For stage-based cards
  priority?: string;     // For priority-based cards
  source?: string;       // For source-based cards
}

export interface ILeadFormConfig extends Document {
  tenantId: mongoose.Types.ObjectId;
  fields: ILeadFormField[];
  sources: string[];
  
  // NEW: Field groups configuration
  fieldGroups?: Array<{
    key: FieldGroup;
    label: string;
    order: number;
    collapsed?: boolean;
  }>;
  
  // NEW: Form settings
  settings?: {
    autoAssignEnabled?: boolean;
    autoAssignRoleId?: string;
    duplicateCheckFields?: string[];  // Fields to check for duplicates
    duplicateAction?: 'block' | 'warn' | 'merge';
    requirePhoneVerification?: boolean;
    requireEmailVerification?: boolean;
  };
  
  // Stats cards configuration
  statsCards?: IStatsCard[];
  
  createdAt: Date;
  updatedAt: Date;
}

const FieldVisibilitySchema: Schema = new Schema(
  {
    form: { type: Boolean, default: true },
    detail: { type: Boolean, default: true },
    table: { type: Boolean, default: true },
    kanban: { type: Boolean, default: false },
    telecaller: { type: Boolean, default: true },
    export: { type: Boolean, default: true }
  },
  { _id: false }
);

const FieldValidationSchema: Schema = new Schema(
  {
    pattern: { type: String, trim: true },
    minLength: { type: Number },
    maxLength: { type: Number },
    min: { type: Number },
    max: { type: Number }
  },
  { _id: false }
);

const ShowWhenSchema: Schema = new Schema(
  {
    fieldKey: { type: String, required: true, trim: true },
    operator: {
      type: String,
      enum: ['equals', 'notEquals', 'contains', 'notEmpty', 'isEmpty', 'in', 'notIn'],
      default: 'equals'
    },
    value: { type: Schema.Types.Mixed }
  },
  { _id: false }
);

const LeadFormFieldSchema: Schema = new Schema(
  {
    fieldKey: { type: String, required: true, trim: true },
    label: { type: String, required: true, trim: true },
    type: {
      type: String,
      enum: ['text', 'email', 'tel', 'number', 'date', 'datetime', 
             'select', 'multiselect', 'textarea', 'checkbox', 'radio',
             'file', 'url', 'location', 'whatsapp'],
      default: 'text'
    },
    required: { type: Boolean, default: false },
    enabled: { type: Boolean, default: true },
    isBuiltIn: { type: Boolean, default: false },
    options: [{ type: String, trim: true }],
    placeholder: { type: String, trim: true },
    order: { type: Number, default: 0 },
    
    // NEW fields
    visibility: FieldVisibilitySchema,
    editable: { type: Boolean, default: true },
    defaultValue: { type: Schema.Types.Mixed },
    validation: FieldValidationSchema,
    showWhen: ShowWhenSchema,
    group: {
      type: String,
      enum: ['contact', 'qualification', 'campaign', 'custom', 'internal'],
      default: 'custom'
    },
    helpText: { type: String, trim: true },
    displayFormat: { type: String, trim: true }
  },
  { _id: true }
);

const FieldGroupSchema: Schema = new Schema(
  {
    key: {
      type: String,
      enum: ['contact', 'qualification', 'campaign', 'custom', 'internal'],
      required: true
    },
    label: { type: String, required: true, trim: true },
    order: { type: Number, default: 0 },
    collapsed: { type: Boolean, default: false }
  },
  { _id: false }
);

const StatsCardSchema: Schema = new Schema(
  {
    key: { type: String, required: true, trim: true },
    type: {
      type: String,
      enum: ['system', 'stage', 'priority', 'source', 'custom'],
      default: 'system'
    },
    label: { type: String, required: true, trim: true },
    icon: { type: String, trim: true },
    color: { type: String, trim: true },
    enabled: { type: Boolean, default: true },
    order: { type: Number, default: 0 },
    stageId: { type: String, trim: true },
    priority: { type: String, trim: true },
    source: { type: String, trim: true }
  },
  { _id: false }
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
    }],
    
    // NEW fields
    fieldGroups: [FieldGroupSchema],
    settings: {
      autoAssignEnabled: { type: Boolean, default: false },
      autoAssignRoleId: { type: String, trim: true },
      duplicateCheckFields: [{ type: String, trim: true }],
      duplicateAction: {
        type: String,
        enum: ['block', 'warn', 'merge'],
        default: 'warn'
      },
      requirePhoneVerification: { type: Boolean, default: false },
      requireEmailVerification: { type: Boolean, default: false }
    },
    statsCards: [StatsCardSchema]
  },
  { timestamps: true }
);

// Default visibility for built-in fields
const DEFAULT_VISIBILITY: IFieldVisibility = {
  form: true,
  detail: true,
  table: true,
  kanban: false,
  telecaller: true,
  export: true
};

export const DEFAULT_FIELDS: Omit<ILeadFormField, '_id'>[] = [
  { 
    fieldKey: 'name', label: 'Name', type: 'text', required: true, enabled: true, 
    isBuiltIn: true, placeholder: 'Full name', order: 0, group: 'contact',
    visibility: { ...DEFAULT_VISIBILITY, kanban: true },
    editable: true
  },
  { 
    fieldKey: 'phone', label: 'Phone', type: 'tel', required: true, enabled: true, 
    isBuiltIn: true, placeholder: 'Phone number', order: 1, group: 'contact',
    visibility: { ...DEFAULT_VISIBILITY, kanban: true },
    editable: true,
    validation: { pattern: '^[0-9]{10,15}$' }
  },
  { 
    fieldKey: 'email', label: 'Email', type: 'email', required: false, enabled: true, 
    isBuiltIn: true, placeholder: 'Email address', order: 2, group: 'contact',
    visibility: DEFAULT_VISIBILITY,
    editable: true
  },
  { 
    fieldKey: 'source', label: 'Source', type: 'select', required: true, enabled: true, 
    isBuiltIn: true, order: 3, group: 'campaign',
    visibility: { ...DEFAULT_VISIBILITY, table: true },
    editable: true
  },
  { 
    fieldKey: 'courseInterest', label: 'Course Interest', type: 'multiselect', 
    required: false, enabled: true, isBuiltIn: true, 
    placeholder: 'Select courses', order: 4, group: 'qualification',
    visibility: { ...DEFAULT_VISIBILITY, kanban: true },
    editable: true,
    options: ['Java Full Stack', 'Python Full Stack', 'React', 'Data Science', 'DevOps', 'Cloud', 'Other']
  },
  { 
    fieldKey: 'stageId', label: 'Stage', type: 'select', required: false, enabled: true, 
    isBuiltIn: true, order: 5, group: 'internal',
    visibility: { form: false, detail: true, table: true, kanban: false, telecaller: true, export: true },
    editable: true
  },
  { 
    fieldKey: 'assignedTo', label: 'Assigned To', type: 'select', required: false, enabled: true, 
    isBuiltIn: true, order: 6, group: 'internal',
    visibility: { form: true, detail: true, table: true, kanban: false, telecaller: false, export: true },
    editable: true
  },
  { 
    fieldKey: 'nextFollowUp', label: 'Next Follow-up', type: 'datetime', required: false, enabled: true, 
    isBuiltIn: true, order: 7, group: 'internal',
    visibility: { form: true, detail: true, table: true, kanban: true, telecaller: true, export: true },
    editable: true
  },
  { 
    fieldKey: 'notes', label: 'Notes', type: 'textarea', required: false, enabled: true, 
    isBuiltIn: true, placeholder: 'Additional notes...', order: 8, group: 'internal',
    visibility: { form: true, detail: true, table: false, kanban: false, telecaller: true, export: true },
    editable: true
  },
  // NEW built-in fields for enhanced CRM
  { 
    fieldKey: 'city', label: 'City', type: 'text', required: false, enabled: true, 
    isBuiltIn: true, placeholder: 'City', order: 9, group: 'contact',
    visibility: { form: true, detail: true, table: false, kanban: false, telecaller: true, export: true },
    editable: true
  },
  { 
    fieldKey: 'graduationYear', label: 'Graduation Year', type: 'number', required: false, enabled: true, 
    isBuiltIn: true, placeholder: 'e.g., 2023', order: 10, group: 'qualification',
    visibility: { form: true, detail: true, table: false, kanban: false, telecaller: true, export: true },
    editable: true,
    validation: { min: 1990, max: 2035 }
  },
  { 
    fieldKey: 'budget', label: 'Budget Range', type: 'select', required: false, enabled: true, 
    isBuiltIn: true, order: 11, group: 'qualification',
    options: ['Below 25k', '25k-50k', '50k-75k', '75k+', 'Need EMI', 'Not discussed'],
    visibility: { form: true, detail: true, table: false, kanban: false, telecaller: true, export: true },
    editable: true
  },
  { 
    fieldKey: 'timeline', label: 'Joining Timeline', type: 'select', required: false, enabled: true, 
    isBuiltIn: true, order: 12, group: 'qualification',
    options: ['Immediately', 'Within 1 month', '1-3 months', '3-6 months', 'Just exploring'],
    visibility: { form: true, detail: true, table: false, kanban: false, telecaller: true, export: true },
    editable: true
  },
  { 
    fieldKey: 'preferenceMode', label: 'Training Mode', type: 'select', required: false, enabled: true, 
    isBuiltIn: true, order: 13, group: 'qualification',
    options: ['Classroom Only', 'Online Only', 'Both OK'],
    visibility: { form: true, detail: true, table: false, kanban: false, telecaller: true, export: true },
    editable: true
  },
  { 
    fieldKey: 'employmentStatus', label: 'Employment Status', type: 'select', required: false, enabled: true, 
    isBuiltIn: true, order: 14, group: 'qualification',
    options: ['Employed', 'Fresher', 'Freelancer', 'Student', 'Unemployed'],
    visibility: { form: true, detail: true, table: false, kanban: false, telecaller: true, export: true },
    editable: true
  }
];

export const DEFAULT_SOURCES = ['website', 'walkin', 'referral', 'social_media', 'google_ads', 'meta', 'linkedin', 'whatsapp', 'phone', 'other'];

export const DEFAULT_FIELD_GROUPS = [
  { key: 'contact' as FieldGroup, label: 'Contact Information', order: 0 },
  { key: 'qualification' as FieldGroup, label: 'Qualification', order: 1 },
  { key: 'campaign' as FieldGroup, label: 'Campaign & Source', order: 2 },
  { key: 'internal' as FieldGroup, label: 'Internal Fields', order: 3 },
  { key: 'custom' as FieldGroup, label: 'Custom Fields', order: 4 }
];

export default mongoose.model<ILeadFormConfig>('LeadFormConfig', LeadFormConfigSchema);
