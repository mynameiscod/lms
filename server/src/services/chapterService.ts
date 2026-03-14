import Chapter, { IChapter } from '../models/Chapter';
import { SubjectService } from './subjectService';

const subjectService = new SubjectService();

export class ChapterService {
  async createChapter(chapterData: any): Promise<IChapter> {
    // Get the next order number for this subject
    const existingChapters = await Chapter.countDocuments({ subjectId: chapterData.subjectId });
    chapterData.order = existingChapters + 1;
    
    const chapter = new Chapter(chapterData);
    await chapter.save();
    
    // Update subject chapter count
    await subjectService.incrementChapterCount(chapterData.subjectId);
    
    return chapter.populate([
      { path: 'subjectId', select: 'name code' },
      { path: 'courseId', select: 'title code' }
    ]);
  }

  async getChaptersBySubject(subjectId: string, tenantId: string): Promise<IChapter[]> {
    return await Chapter.find({ subjectId, tenantId, isActive: true })
      .populate('subjectId', 'name code')
      .populate('courseId', 'title code')
      .sort({ order: 1 });
  }

  async getChaptersByCourse(courseId: string, tenantId: string): Promise<IChapter[]> {
    return await Chapter.find({ courseId, tenantId, isActive: true })
      .populate('subjectId', 'name code order')
      .sort({ 'subjectId.order': 1, order: 1 });
  }

  async getChaptersByTenant(tenantId: string, filters: any = {}): Promise<IChapter[]> {
    const query: any = { tenantId, ...filters };
    return await Chapter.find(query)
      .populate('subjectId', 'name code')
      .populate('courseId', 'title code')
      .sort({ courseId: 1, subjectId: 1, order: 1 });
  }

  async getChapterById(chapterId: string): Promise<IChapter | null> {
    return await Chapter.findById(chapterId)
      .populate('subjectId', 'name code description')
      .populate('courseId', 'title code description')
      .populate('quizId');
  }

  async updateChapter(chapterId: string, updateData: Partial<IChapter>): Promise<IChapter | null> {
    return await Chapter.findByIdAndUpdate(chapterId, updateData, { new: true })
      .populate('subjectId', 'name code')
      .populate('courseId', 'title code');
  }

  async deleteChapter(chapterId: string): Promise<IChapter | null> {
    const chapter = await Chapter.findByIdAndDelete(chapterId);
    
    if (chapter) {
      // Update subject chapter count
      await subjectService.decrementChapterCount(chapter.subjectId.toString());
      
      // Reorder remaining chapters
      await Chapter.updateMany(
        { subjectId: chapter.subjectId, order: { $gt: chapter.order } },
        { $inc: { order: -1 } }
      );
    }
    
    return chapter;
  }

  async reorderChapters(subjectId: string, chapterOrders: { chapterId: string; order: number }[]): Promise<void> {
    const bulkOps = chapterOrders.map(({ chapterId, order }) => ({
      updateOne: {
        filter: { _id: chapterId, subjectId },
        update: { $set: { order } }
      }
    }));
    
    await Chapter.bulkWrite(bulkOps);
  }

  // Content management within chapter
  async addVideo(chapterId: string, videoData: any): Promise<IChapter | null> {
    const chapter = await Chapter.findById(chapterId);
    if (!chapter) return null;
    
    const order = chapter.videos.length + 1;
    chapter.videos.push({ ...videoData, order });
    
    // Update estimated duration (add video duration to minutes)
    if (chapter.estimatedDuration) {
      chapter.estimatedDuration.minutes = (chapter.estimatedDuration.minutes || 0) + (videoData.duration || 0);
    }
    
    await chapter.save();
    return chapter;
  }

  async removeVideo(chapterId: string, videoIndex: number): Promise<IChapter | null> {
    const chapter = await Chapter.findById(chapterId);
    if (!chapter || videoIndex >= chapter.videos.length) return null;
    
    const removedVideo = chapter.videos[videoIndex];
    chapter.videos.splice(videoIndex, 1);
    
    // Update estimated duration (subtract video duration from minutes)
    if (chapter.estimatedDuration) {
      chapter.estimatedDuration.minutes = Math.max(0, (chapter.estimatedDuration.minutes || 0) - (removedVideo.duration || 0));
    }
    
    // Reorder remaining videos
    chapter.videos.forEach((video, idx) => {
      video.order = idx + 1;
    });
    
    await chapter.save();
    return chapter;
  }

  async addNote(chapterId: string, noteData: any): Promise<IChapter | null> {
    const chapter = await Chapter.findById(chapterId);
    if (!chapter) return null;
    
    const order = chapter.notes.length + 1;
    chapter.notes.push({ ...noteData, order });
    
    await chapter.save();
    return chapter;
  }

  async removeNote(chapterId: string, noteIndex: number): Promise<IChapter | null> {
    const chapter = await Chapter.findById(chapterId);
    if (!chapter || noteIndex >= chapter.notes.length) return null;
    
    chapter.notes.splice(noteIndex, 1);
    
    // Reorder remaining notes
    chapter.notes.forEach((note, idx) => {
      note.order = idx + 1;
    });
    
    await chapter.save();
    return chapter;
  }

  async setQuiz(chapterId: string, quizId: string | null): Promise<IChapter | null> {
    return await Chapter.findByIdAndUpdate(
      chapterId, 
      { quizId }, 
      { new: true }
    );
  }
}
