import mongoose, { Schema, Document } from 'mongoose';

// --- Scoring Rule ---
export interface IScoringRule {
  field: string;          // 'name', 'phone', 'custom:graduation_year', etc.
  operator: 'equals' | 'not_equals' | 'contains' | 'not_contains' | 'greater_than' | 'less_than' | 'greater_equal' | 'less_equal' | 'not_empty' | 'is_empty' | 'in';
  value: string;          // Value to compare against (comma-separated for 'in')
  points: number;         // Points to award (can be negative)
  label: string;          // Human-readable label
}

// --- Qualification Rule ---
export interface IQualificationRule {
  field: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'not_contains' | 'greater_than' | 'less_than' | 'greater_equal' | 'less_equal' | 'not_empty' | 'is_empty' | 'in';
  value: string;
  label: string;
  required: boolean;      // If true, failing this = not qualified
}

// --- Assignment Rule (for rule-based mode) ---
export interface IAssignmentRule {
  name: string;           // Rule name e.g. "Hot leads to closers"
  conditions: {
    field: string;        // 'priority', 'custom:current_situation', etc.
    operator: 'equals' | 'not_equals' | 'contains' | 'in' | 'greater_than' | 'less_than';
    value: string;
  }[];
  assignToMembers: mongoose.Types.ObjectId[];
  currentIndex: number;   // Round robin within this rule's pool
}

// --- Main Config ---
export interface ILeadScoringConfig extends Document {
  tenantId: mongoose.Types.ObjectId;
  isActive: boolean;

  // Scoring
  scoringRules: IScoringRule[];
  hotThreshold: number;
  warmThreshold: number;

  // Qualification
  qualificationRules: IQualificationRule[];

  // Assignment
  assignmentMode: 'none' | 'round_robin' | 'rule_based';
  roundRobinMembers: mongoose.Types.ObjectId[];
  roundRobinIndex: number;
  assignmentRules: IAssignmentRule[];
  fallbackMembers: mongoose.Types.ObjectId[];
  fallbackIndex: number;

  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const ScoringRuleSchema = new Schema({
  field: { type: String, required: true },
  operator: { type: String, required: true, enum: ['equals', 'not_equals', 'contains', 'not_contains', 'greater_than', 'less_than', 'greater_equal', 'less_equal', 'not_empty', 'is_empty', 'in'] },
  value: { type: String, default: '' },
  points: { type: Number, required: true },
  label: { type: String, required: true }
}, { _id: false });

const QualificationRuleSchema = new Schema({
  field: { type: String, required: true },
  operator: { type: String, required: true, enum: ['equals', 'not_equals', 'contains', 'not_contains', 'greater_than', 'less_than', 'greater_equal', 'less_equal', 'not_empty', 'is_empty', 'in'] },
  value: { type: String, default: '' },
  label: { type: String, required: true },
  required: { type: Boolean, default: true }
}, { _id: false });

const AssignmentConditionSchema = new Schema({
  field: { type: String, required: true },
  operator: { type: String, required: true, enum: ['equals', 'not_equals', 'contains', 'in', 'greater_than', 'less_than'] },
  value: { type: String, default: '' }
}, { _id: false });

const AssignmentRuleSchema = new Schema({
  name: { type: String, required: true },
  conditions: { type: [AssignmentConditionSchema], default: [] },
  assignToMembers: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  currentIndex: { type: Number, default: 0 }
}, { _id: false });

const LeadScoringConfigSchema = new Schema<ILeadScoringConfig>({
  tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, unique: true },
  isActive: { type: Boolean, default: false },

  // Scoring
  scoringRules: { type: [ScoringRuleSchema], default: [] },
  hotThreshold: { type: Number, default: 12 },
  warmThreshold: { type: Number, default: 8 },

  // Qualification
  qualificationRules: { type: [QualificationRuleSchema], default: [] },

  // Assignment
  assignmentMode: { type: String, enum: ['none', 'round_robin', 'rule_based'], default: 'none' },
  roundRobinMembers: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  roundRobinIndex: { type: Number, default: 0 },
  assignmentRules: { type: [AssignmentRuleSchema], default: [] },
  fallbackMembers: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  fallbackIndex: { type: Number, default: 0 },

  createdBy: { type: Schema.Types.ObjectId, ref: 'User' }
}, {
  timestamps: true
});

LeadScoringConfigSchema.index({ tenantId: 1 }, { unique: true });

export default mongoose.model<ILeadScoringConfig>('LeadScoringConfig', LeadScoringConfigSchema);
