import mongoose, { Schema } from 'mongoose';

// Personal notes a student writes while learning (per topic/day).
const StudentNoteSchema = new Schema(
  {
    tenantId:     { type: String, required: true, index: true },
    studentId:    { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    enrollmentId: { type: Schema.Types.ObjectId, ref: 'CurriculumEnrollment', required: true, index: true },
    dayNumber:    { type: Number },
    contentId:    { type: String },   // library content id the note is attached to (optional)
    contentTitle: { type: String },
    text:         { type: String, required: true },
  },
  { timestamps: true }
);
StudentNoteSchema.index({ enrollmentId: 1, studentId: 1, createdAt: -1 });

// A bookmarked topic.
const StudentBookmarkSchema = new Schema(
  {
    tenantId:     { type: String, required: true, index: true },
    studentId:    { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    enrollmentId: { type: Schema.Types.ObjectId, ref: 'CurriculumEnrollment', required: true, index: true },
    dayNumber:    { type: Number },
    contentId:    { type: String, required: true },
    title:        { type: String },
  },
  { timestamps: true }
);
StudentBookmarkSchema.index({ enrollmentId: 1, studentId: 1, contentId: 1 }, { unique: true });

// Per-topic discussion comment (flat thread).
const TopicDiscussionSchema = new Schema(
  {
    tenantId:     { type: String, required: true, index: true },
    curriculumId: { type: Schema.Types.ObjectId, ref: 'LearningCurriculum', index: true },
    dayNumber:    { type: Number },
    contentId:    { type: String, required: true, index: true },
    authorId:     { type: Schema.Types.ObjectId, ref: 'User', required: true },
    authorName:   { type: String },
    authorRole:   { type: String },   // 'STUDENT' | staff role — for a small badge
    text:         { type: String, required: true },
  },
  { timestamps: true }
);
TopicDiscussionSchema.index({ contentId: 1, createdAt: 1 });

export const StudentNote = mongoose.model('StudentNote', StudentNoteSchema);
export const StudentBookmark = mongoose.model('StudentBookmark', StudentBookmarkSchema);
export const TopicDiscussion = mongoose.model('TopicDiscussion', TopicDiscussionSchema);
