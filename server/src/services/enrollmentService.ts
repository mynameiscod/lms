import Enrollment, { IEnrollment } from '../models/Enrollment';
import Course from '../models/Course';

export class EnrollmentService {
  async enrollStudent(
    userId: string,
    courseId: string,
    tenantId: string
  ): Promise<IEnrollment> {
    // Check if student already has any enrollment (single course policy)
    const existingAnyEnrollment = await Enrollment.findOne({
      userId,
      tenantId
    });

    if (existingAnyEnrollment) {
      throw new Error('Student can only be enrolled in one course at a time');
    }

    const enrollment = new Enrollment({ userId, courseId, tenantId });
    await enrollment.save();

    await Course.findByIdAndUpdate(courseId, { $inc: { enrollmentCount: 1 } });

    return enrollment;
  }

  async getStudentEnrollments(userId: string, tenantId: string): Promise<IEnrollment[]> {
    return await Enrollment.find({ userId, tenantId }).populate('courseId');
  }

  async getCourseEnrollments(courseId: string): Promise<IEnrollment[]> {
    return await Enrollment.find({ courseId }).populate('userId', 'firstName lastName email');
  }

  async updateEnrollmentProgress(
    enrollmentId: string,
    progress: number
  ): Promise<IEnrollment | null> {
    return await Enrollment.findByIdAndUpdate(
      enrollmentId,
      { progress },
      { new: true }
    );
  }

  async completeEnrollment(enrollmentId: string): Promise<IEnrollment | null> {
    return await Enrollment.findByIdAndUpdate(
      enrollmentId,
      { status: 'completed', progress: 100, completedAt: new Date() },
      { new: true }
    );
  }
}