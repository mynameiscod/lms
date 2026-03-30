import mongoose, { Schema, Document } from 'mongoose';

export type ContentCategory = 'curriculum' | 'fee' | 'placement' | 'campus' | 
                              'testimonial' | 'brochure' | 'video' | 'demo' | 
                              'faq' | 'offer' | 'other';

export type ContentType = 'pdf' | 'image' | 'video' | 'link' | 'document';

export interface IContentShare {
  leadId: mongoose.Types.ObjectId;
  sharedBy: mongoose.Types.ObjectId;
  sharedAt: Date;
  channel: 'whatsapp' | 'email' | 'sms' | 'manual';
  status: 'sent' | 'delivered' | 'viewed' | 'failed';
  viewedAt?: Date;
  messageId?: string;
}

export interface ISalesContent extends Document {
  tenantId: mongoose.Types.ObjectId;
  
  title: string;
  description?: string;
  category: ContentCategory;
  
  contentType: ContentType;
  fileUrl?: string;
  externalUrl?: string;
  thumbnailUrl?: string;
  
  // File metadata
  fileName?: string;
  fileSize?: number;  // in bytes
  mimeType?: string;
  duration?: number;  // for videos, in seconds
  
  // Access control
  visibleToRoles: string[];
  allowSharing: boolean;
  allowDownload: boolean;
  
  // Usage tracking
  shareCount: number;
  viewCount: number;
  downloadCount: number;
  lastSharedAt?: Date;
  
  // Sharing history
  shares: IContentShare[];
  
  // Metadata
  tags: string[];
  order: number;
  isActive: boolean;
  isFeatured: boolean;
  
  // Course/Program linking
  linkedCourses?: string[];
  
  // Validity
  validFrom?: Date;
  validUntil?: Date;
  
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const ContentShareSchema: Schema = new Schema(
  {
    leadId: { type: mongoose.Types.ObjectId, ref: 'Lead', required: true },
    sharedBy: { type: mongoose.Types.ObjectId, ref: 'User', required: true },
    sharedAt: { type: Date, default: Date.now },
    channel: {
      type: String,
      enum: ['whatsapp', 'email', 'sms', 'manual'],
      required: true
    },
    status: {
      type: String,
      enum: ['sent', 'delivered', 'viewed', 'failed'],
      default: 'sent'
    },
    viewedAt: { type: Date },
    messageId: { type: String, trim: true }
  },
  { _id: true }
);

const SalesContentSchema: Schema = new Schema(
  {
    tenantId: {
      type: mongoose.Types.ObjectId,
      ref: 'Tenant',
      required: true
    },
    
    title: {
      type: String,
      required: true,
      trim: true
    },
    description: {
      type: String,
      trim: true
    },
    category: {
      type: String,
      enum: ['curriculum', 'fee', 'placement', 'campus', 'testimonial', 
             'brochure', 'video', 'demo', 'faq', 'offer', 'other'],
      required: true
    },
    
    contentType: {
      type: String,
      enum: ['pdf', 'image', 'video', 'link', 'document'],
      required: true
    },
    fileUrl: {
      type: String,
      trim: true
    },
    externalUrl: {
      type: String,
      trim: true
    },
    thumbnailUrl: {
      type: String,
      trim: true
    },
    
    // File metadata
    fileName: { type: String, trim: true },
    fileSize: { type: Number },
    mimeType: { type: String, trim: true },
    duration: { type: Number },
    
    // Access control
    visibleToRoles: [{
      type: String,
      trim: true
    }],
    allowSharing: {
      type: Boolean,
      default: true
    },
    allowDownload: {
      type: Boolean,
      default: true
    },
    
    // Usage tracking
    shareCount: { type: Number, default: 0 },
    viewCount: { type: Number, default: 0 },
    downloadCount: { type: Number, default: 0 },
    lastSharedAt: { type: Date },
    
    // Sharing history
    shares: [ContentShareSchema],
    
    // Metadata
    tags: [{
      type: String,
      trim: true
    }],
    order: {
      type: Number,
      default: 0
    },
    isActive: {
      type: Boolean,
      default: true
    },
    isFeatured: {
      type: Boolean,
      default: false
    },
    
    // Course/Program linking
    linkedCourses: [{
      type: String,
      trim: true
    }],
    
    // Validity
    validFrom: { type: Date },
    validUntil: { type: Date },
    
    createdBy: {
      type: mongoose.Types.ObjectId,
      ref: 'User',
      required: true
    }
  },
  { timestamps: true }
);

// Indexes
SalesContentSchema.index({ tenantId: 1, category: 1 });
SalesContentSchema.index({ tenantId: 1, isActive: 1 });
SalesContentSchema.index({ tenantId: 1, tags: 1 });
SalesContentSchema.index({ tenantId: 1, linkedCourses: 1 });
SalesContentSchema.index({ tenantId: 1, shareCount: -1 });

// Default content categories with icons
export const CONTENT_CATEGORIES = [
  { key: 'curriculum', label: 'Curriculum', icon: '📚', description: 'Course syllabus and curriculum PDFs' },
  { key: 'fee', label: 'Fee Structure', icon: '💰', description: 'Fee information and EMI options' },
  { key: 'placement', label: 'Placements', icon: '🎯', description: 'Placement records and statistics' },
  { key: 'campus', label: 'Campus', icon: '🏢', description: 'Campus photos and facilities' },
  { key: 'testimonial', label: 'Testimonials', icon: '⭐', description: 'Student testimonials and reviews' },
  { key: 'brochure', label: 'Brochures', icon: '📄', description: 'Marketing brochures and flyers' },
  { key: 'video', label: 'Videos', icon: '🎬', description: 'Course intro and demo videos' },
  { key: 'demo', label: 'Demo Classes', icon: '💻', description: 'Demo class recordings' },
  { key: 'faq', label: 'FAQ', icon: '❓', description: 'Frequently asked questions' },
  { key: 'offer', label: 'Offers', icon: '🔥', description: 'Current offers and discounts' },
  { key: 'other', label: 'Other', icon: '📎', description: 'Other resources' }
];

export default mongoose.model<ISalesContent>('SalesContent', SalesContentSchema);
