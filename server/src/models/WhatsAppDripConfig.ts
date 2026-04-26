import mongoose, { Schema, Document } from 'mongoose';

export interface IDripMessage {
  daysAfter: number;
  message: string;     // Supports {{name}} placeholder
  enabled: boolean;
}

export interface IDripSequence {
  stageName: string;   // Match by stage name (case-insensitive)
  stageId?: mongoose.Types.ObjectId;
  messages: IDripMessage[];
  enabled: boolean;
}

export interface IWhatsAppDripConfig extends Document {
  tenantId: mongoose.Types.ObjectId;
  sequences: IDripSequence[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const DripMessageSchema = new Schema(
  {
    daysAfter: { type: Number, required: true, min: 0, max: 90 },
    message:   { type: String, required: true, trim: true, maxlength: 4096 },
    enabled:   { type: Boolean, default: true },
  },
  { _id: false }
);

const DripSequenceSchema = new Schema(
  {
    stageName: { type: String, required: true, trim: true },
    stageId:   { type: mongoose.Types.ObjectId, ref: 'LeadStage' },
    messages:  { type: [DripMessageSchema], default: [] },
    enabled:   { type: Boolean, default: true },
  },
  { _id: false }
);

const WhatsAppDripConfigSchema = new Schema(
  {
    tenantId:  { type: mongoose.Types.ObjectId, ref: 'Tenant', required: true, unique: true },
    sequences: { type: [DripSequenceSchema], default: [] },
    isActive:  { type: Boolean, default: true },
  },
  { timestamps: true }
);

// Default sequences returned when no tenant config exists
export const DEFAULT_DRIP_SEQUENCES: IDripSequence[] = [
  {
    stageName: 'new',
    messages: [
      { daysAfter: 1, message: 'Hi {{name}}! Just checking in — do you have any questions about our programs? We are here to help! 😊', enabled: true },
      { daysAfter: 3, message: 'Hello {{name}}! We would love to walk you through our courses. Would you be available for a quick call or demo this week?', enabled: true },
      { daysAfter: 7, message: 'Hi {{name}}, we noticed you have not connected with us yet. Our next batch starts soon — shall we reserve a spot for you? 🎓', enabled: true },
    ],
    enabled: true,
  },
  {
    stageName: 'contacted',
    messages: [
      { daysAfter: 1, message: 'Hi {{name}}! Following up on our last conversation. Did you get a chance to review the course details we shared?', enabled: true },
      { daysAfter: 3, message: 'Hello {{name}}, we have limited seats available for the upcoming batch. Let us know if you have any questions!', enabled: true },
    ],
    enabled: true,
  },
  {
    stageName: 'interested',
    messages: [
      { daysAfter: 1, message: 'Hi {{name}}! Great to know you are interested 🎉. Would you like to schedule a free demo class?', enabled: true },
      { daysAfter: 3, message: 'Hello {{name}}, our demo sessions are filling up fast. Would you like us to book one for you?', enabled: true },
      { daysAfter: 7, message: 'Hi {{name}}! Just a reminder — enrollment for our next batch closes soon. Lock in your seat today! 🔒', enabled: true },
    ],
    enabled: true,
  },
  {
    stageName: 'demo_scheduled',
    messages: [
      { daysAfter: 1, message: 'Hi {{name}}! Looking forward to your demo session. Do let us know if you need to reschedule.', enabled: true },
    ],
    enabled: true,
  },
  {
    stageName: 'proposal_sent',
    messages: [
      { daysAfter: 1, message: 'Hi {{name}}! Did you get a chance to review the proposal we sent? Happy to clarify any details.', enabled: true },
      { daysAfter: 3, message: 'Hello {{name}}, seats are filling up for the upcoming batch. When would be a good time to discuss?', enabled: true },
      { daysAfter: 7, message: 'Hi {{name}}! Last reminder — enrollment closes this week. Let us know if you would like to proceed! 🎓', enabled: true },
    ],
    enabled: true,
  },
];

export default mongoose.model<IWhatsAppDripConfig>('WhatsAppDripConfig', WhatsAppDripConfigSchema);
