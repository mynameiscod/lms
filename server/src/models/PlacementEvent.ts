import mongoose, { Schema, Document } from 'mongoose';

/**
 * PlacementEvent — the timeline of one Placement Program candidate: every submission, message,
 * stage change and note, in order. It is what the candidate page shows and what settles a dispute
 * ("we never got a reminder", "I paid on the 3rd").
 *
 * Separate from the candidate so the record stays small however long the history grows. `actorId`
 * is empty for the candidate's own actions and for the system.
 */
export interface IPlacementEvent extends Document {
  tenantId: mongoose.Types.ObjectId;
  candidateId: mongoose.Types.ObjectId;
  kind: 'submitted' | 'resubmitted' | 'whatsapp' | 'stage' | 'note' | 'assigned';
  message: string;
  data?: Record<string, any>;
  actorId?: mongoose.Types.ObjectId;
  createdAt: Date;
}

const PlacementEventSchema = new Schema<IPlacementEvent>({
  tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
  candidateId: { type: Schema.Types.ObjectId, ref: 'PlacementCandidate', required: true },
  kind: { type: String, enum: ['submitted', 'resubmitted', 'whatsapp', 'stage', 'note', 'assigned'], required: true },
  message: { type: String, required: true },
  data: { type: Schema.Types.Mixed },
  actorId: { type: Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: { createdAt: true, updatedAt: false } });

PlacementEventSchema.index({ candidateId: 1, createdAt: -1 });

export default mongoose.model<IPlacementEvent>('PlacementEvent', PlacementEventSchema);
