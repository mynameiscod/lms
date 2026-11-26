import mongoose, { Schema, Document } from 'mongoose';

/**
 * One "Excel for everyone" export of the custom-range report (2026-11-26). Built in the background
 * (a few seconds per student), then downloaded once ready. The file is kept on the row and the
 * row removes itself after a day.
 */
export interface IReportExport extends Document {
  tenantId: string;
  createdBy?: mongoose.Types.ObjectId;
  scope: string;              // 'all' or a batch id
  scopeName: string;
  from: string;
  to: string;
  status: 'running' | 'done' | 'failed';
  done: number;
  total: number;
  fileName?: string;
  file?: Buffer;
  error?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ReportExportSchema = new Schema<IReportExport>(
  {
    tenantId: { type: String, required: true, index: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    scope: { type: String, required: true },
    scopeName: { type: String, default: '' },
    from: { type: String, required: true },
    to: { type: String, required: true },
    status: { type: String, enum: ['running', 'done', 'failed'], default: 'running' },
    done: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
    fileName: { type: String },
    file: { type: Buffer, select: false },
    error: { type: String },
  },
  { timestamps: true },
);

ReportExportSchema.index({ createdAt: 1 }, { expireAfterSeconds: 24 * 3600 });

export default mongoose.model<IReportExport>('ReportExport', ReportExportSchema);
