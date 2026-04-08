import mongoose, { Schema, Document } from 'mongoose';

export interface IColumnMapping {
  sheetColumn: string;   // Column header in Google Sheet
  leadField: string;     // Mapped lead field (name, email, phone, courseInterest, source, etc.)
}

export interface ISyncLog {
  syncedAt: Date;
  rowsSynced: number;
  newLeads: number;
  duplicatesSkipped: number;
  errors: number;
  errorDetails?: string[];
}

export interface IGoogleSheetIntegration extends Document {
  tenantId: mongoose.Types.ObjectId;
  name: string;
  sheetId: string;
  sheetName: string;        // Tab/worksheet name (default: Sheet1)
  sheetUrl: string;         // Full Google Sheet URL for display
  columnMapping: IColumnMapping[];
  headerRow: number;        // Row number containing headers (default: 1)
  lastSyncedRow: number;    // Last row that was synced
  syncInterval: number;     // Minutes between syncs (default: 10)
  isActive: boolean;
  defaultSource: string;    // Lead source label (default: 'google_sheet')
  defaultPriority: 'hot' | 'warm' | 'cold';
  defaultStageId?: mongoose.Types.ObjectId;
  assignToUserId?: mongoose.Types.ObjectId;
  createdBy: mongoose.Types.ObjectId;
  syncLogs: ISyncLog[];
  lastSyncAt?: Date;
  lastError?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ColumnMappingSchema = new Schema({
  sheetColumn: { type: String, required: true },
  leadField: { type: String, required: true }
}, { _id: false });

const SyncLogSchema = new Schema({
  syncedAt: { type: Date, default: Date.now },
  rowsSynced: { type: Number, default: 0 },
  newLeads: { type: Number, default: 0 },
  duplicatesSkipped: { type: Number, default: 0 },
  errors: { type: Number, default: 0 },
  errorDetails: [{ type: String }]
}, { _id: false });

const GoogleSheetIntegrationSchema = new Schema<IGoogleSheetIntegration>({
  tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true },
  name: { type: String, required: true, trim: true },
  sheetId: { type: String, required: true, trim: true },
  sheetName: { type: String, default: 'Sheet1', trim: true },
  sheetUrl: { type: String, required: true, trim: true },
  columnMapping: { type: [ColumnMappingSchema], default: [] },
  headerRow: { type: Number, default: 1, min: 1 },
  lastSyncedRow: { type: Number, default: 0 },
  syncInterval: { type: Number, default: 10, min: 1, max: 1440 },
  isActive: { type: Boolean, default: true },
  defaultSource: { type: String, default: 'google_sheet' },
  defaultPriority: { type: String, enum: ['hot', 'warm', 'cold'], default: 'warm' },
  defaultStageId: { type: Schema.Types.ObjectId, ref: 'LeadStage' },
  assignToUserId: { type: Schema.Types.ObjectId, ref: 'User' },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  syncLogs: { type: [SyncLogSchema], default: [] },
  lastSyncAt: { type: Date },
  lastError: { type: String }
}, {
  timestamps: true
});

GoogleSheetIntegrationSchema.index({ tenantId: 1 });
GoogleSheetIntegrationSchema.index({ tenantId: 1, isActive: 1 });

export default mongoose.model<IGoogleSheetIntegration>('GoogleSheetIntegration', GoogleSheetIntegrationSchema);
