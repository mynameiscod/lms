import Course, { ICourse } from '../models/Course';

export class CourseService {
  async createCourse(courseData: any): Promise<ICourse> {
    const course = new Course(courseData);
    await course.save();
    return course.populate('instructor', 'firstName lastName email');
  }

  async getCoursesByTenant(tenantId: string, filters: any = {}): Promise<ICourse[]> {
    const query: any = { tenantId, ...filters };
    return await Course.find(query)
      .populate('instructor', 'firstName lastName email')
      .sort({ createdAt: -1 });
  }

  async getCourseById(courseId: string): Promise<ICourse | null> {
    return await Course.findById(courseId).populate('instructor');
  }

  async updateCourse(courseId: string, updateData: Partial<ICourse>): Promise<ICourse | null> {
    return await Course.findByIdAndUpdate(courseId, updateData, { new: true })
      .populate('instructor', 'firstName lastName email');
  }

  async deleteCourse(courseId: string): Promise<ICourse | null> {
    return await Course.findByIdAndDelete(courseId);
  }

  async publishCourse(courseId: string): Promise<ICourse | null> {
    return await Course.findByIdAndUpdate(courseId, { isPublished: true }, { new: true });
  }

  async incrementSubjectCount(courseId: string): Promise<void> {
    await Course.findByIdAndUpdate(courseId, { $inc: { subjectCount: 1 } });
  }

  async decrementSubjectCount(courseId: string): Promise<void> {
    await Course.findByIdAndUpdate(courseId, { $inc: { subjectCount: -1 } });
  }
}