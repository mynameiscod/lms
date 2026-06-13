import mongoose, { Document, Schema } from 'mongoose';

export interface ILiveSession extends Document {
  tenantId: string;
  title: string;
  room: string;            // unique Jitsi room name
  hostId: string;
  hostName: string;
  status: 'live' | 'ended';
  startedAt: Date;
  endedAt?: Date;
}

const LiveSessionSchema = new Schema<ILiveSession>(
  {
    tenantId:  { type: String, required: true, index: true },
    title:     { type: String, required: true, trim: true },
    room:      { type: String, required: true, unique: true },
    hostId:    { type: String, required: true },
    hostName:  { type: String, default: '' },
    status:    { type: String, enum: ['live', 'ended'], default: 'live', index: true },
    startedAt: { type: Date, default: Date.now },
    endedAt:   { type: Date },
  },
  { timestamps: true },
);

export default mongoose.model<ILiveSession>('LiveSession', LiveSessionSchema);
