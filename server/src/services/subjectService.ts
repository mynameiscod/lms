import Subject, { ISubject } from '../models/Subject';
import { CourseService } from './courseService';

const courseService = new CourseService();

export class SubjectService {
  async createSubject(subjectData: any): Promise<ISubject> {
    // Get the next order number for this course
    const existingSubjects = await Subject.countDocuments({ courseId: subjectData.courseId });
    subjectData.order = existingSubjects + 1;
    
    const subject = new Subject(subjectData);
    await subject.save();
    
    // Update course subject count
    await courseService.incrementSubjectCount(subjectData.courseId);
    
    return subject.populate('courseId', 'title code');
  }

  async getSubjectsByCourse(courseId: string, tenantId: string): Promise<ISubject[]> {
    return await Subject.find({ courseId, tenantId, isActive: true })
      .populate('courseId', 'title code')
      .sort({ order: 1 });
  }

  async getSubjectsByTenant(tenantId: string, filters: any = {}): Promise<ISubject[]> {
    const query: any = { tenantId, ...filters };
    return await Subject.find(query)
      .populate('courseId', 'title code')
      .sort({ courseId: 1, order: 1 });
  }

  async getSubjectById(subjectId: string): Promise<ISubject | null> {
    return await Subject.findById(subjectId)
      .populate('courseId', 'title code description');
  }

  async updateSubject(subjectId: string, updateData: Partial<ISubject>): Promise<ISubject | null> {
    return await Subject.findByIdAndUpdate(subjectId, updateData, { new: true })
      .populate('courseId', 'title code');
  }

  async deleteSubject(subjectId: string): Promise<ISubject | null> {
    const subject = await Subject.findByIdAndDelete(subjectId);
    
    if (subject) {
      // Update course subject count
      await courseService.decrementSubjectCount(subject.courseId.toString());
      
      // Reorder remaining subjects
      await Subject.updateMany(
        { courseId: subject.courseId, order: { $gt: subject.order } },
        { $inc: { order: -1 } }
      );
    }
    
    return subject;
  }

  async reorderSubjects(courseId: string, subjectOrders: { subjectId: string; order: number }[]): Promise<void> {
    const bulkOps = subjectOrders.map(({ subjectId, order }) => ({
      updateOne: {
        filter: { _id: subjectId, courseId },
        update: { $set: { order } }
      }
    }));
    
    await Subject.bulkWrite(bulkOps);
  }

  async incrementChapterCount(subjectId: string): Promise<void> {
    await Subject.findByIdAndUpdate(subjectId, { $inc: { chapterCount: 1 } });
  }

  async decrementChapterCount(subjectId: string): Promise<void> {
    await Subject.findByIdAndUpdate(subjectId, { $inc: { chapterCount: -1 } });
  }
}
