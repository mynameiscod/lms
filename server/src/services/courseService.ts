import Course, { ICourse } from '../models/Course';

export class CourseService {
  async createCourse(courseData: any): Promise<ICourse> {
    const course = new Course(courseData);
    await course.save();
    return course.populate('instructor', 'firstName lastName email');
  }

  async getCoursesByTenant(tenantId: string): Promise<ICourse[]> {
    return await Course.find({ tenantId }).populate('instructor', 'firstName lastName email');
  }

  async getCourseById(courseId: string): Promise<ICourse | null> {
    return await Course.findById(courseId).populate('instructor');
  }

  async updateCourse(courseId: string, updateData: Partial<ICourse>): Promise<ICourse | null> {
    return await Course.findByIdAndUpdate(courseId, updateData, { new: true });
  }

  async deleteCourse(courseId: string): Promise<ICourse | null> {
    return await Course.findByIdAndDelete(courseId);
  }

  async publishCourse(courseId: string): Promise<ICourse | null> {
    return await Course.findByIdAndUpdate(courseId, { isPublished: true }, { new: true });
  }
}