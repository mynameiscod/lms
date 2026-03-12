import Batch, { IBatch } from '../models/Batch';
import User from '../models/User';
import Enrollment from '../models/Enrollment';
import Course from '../models/Course';

export class BatchService {
  // Helper method to auto-enroll batch students in a course
  private async autoEnrollBatchStudents(batchId: string, courseId: string, tenantId: string): Promise<void> {
    // Get all students in this batch
    const students = await User.find({ batchId, tenantId, role: 'STUDENT', isActive: true });
    
    for (const student of students) {
      // Check if student is already enrolled in this course
      const existingEnrollment = await Enrollment.findOne({
        userId: student._id,
        courseId,
        tenantId
      });
      
      if (!existingEnrollment) {
        // Create enrollment
        const enrollment = new Enrollment({
          userId: student._id,
          courseId,
          tenantId
        });
        await enrollment.save();
        await Course.findByIdAndUpdate(courseId, { $inc: { enrollmentCount: 1 } });
        console.log(`   ✅ Auto-enrolled student ${student.email} in course`);
      }
    }
  }

  async createBatch(batchData: {
    name: string;
    courseId?: string;
    startDate: Date;
    endDate: Date;
    timings: Array<{ day: string; startTime: string; endTime: string }>;
    instructors: string[];
    tenantId: string;
    capacity?: number;
  }): Promise<IBatch> {
    const batch = new Batch({
      ...batchData,
      isActive: true,
      capacity: batchData.capacity || 30,
      enrolledCount: 0
    });

    await batch.save();
    return batch.populate('instructors', 'firstName lastName email role');
  }

  async getBatchesByTenant(tenantId: string): Promise<IBatch[]> {
    const batches = await Batch.find({ tenantId, isActive: true })
      .populate('instructors', 'firstName lastName email role')
      .populate('courseId', 'title code')
      .sort({ startDate: -1 });
    
    // Calculate enrolledCount dynamically for each batch
    const batchesWithCount = await Promise.all(
      batches.map(async (batch) => {
        const enrolledCount = await User.countDocuments({ batchId: batch._id, tenantId });
        const batchObj = batch.toObject();
        batchObj.enrolledCount = enrolledCount;
        return batchObj as IBatch;
      })
    );
    
    return batchesWithCount;
  }

  async getBatchById(batchId: string): Promise<IBatch | null> {
    const batch = await Batch.findById(batchId)
      .populate('instructors', 'firstName lastName email role')
      .populate('courseId', 'title code');
    
    if (!batch) return null;
    
    // Calculate enrolledCount dynamically
    const enrolledCount = await User.countDocuments({ batchId: batch._id });
    const batchObj = batch.toObject();
    batchObj.enrolledCount = enrolledCount;
    return batchObj as IBatch;
  }

  async updateBatch(
    batchId: string,
    tenantId: string,
    updateData: Partial<IBatch>
  ): Promise<IBatch | null> {
    // Check if courseId is being set/updated
    const courseIdBeingSet = updateData.courseId;
    
    // Get existing batch to check if courseId is new
    const existingBatch = await Batch.findOne({ _id: batchId, tenantId });
    const isNewCourse = courseIdBeingSet && 
      (!existingBatch?.courseId || existingBatch.courseId.toString() !== courseIdBeingSet.toString());
    
    const batch = await Batch.findOneAndUpdate(
      { _id: batchId, tenantId },
      { $set: updateData },
      { new: true }
    ).populate('instructors', 'firstName lastName email role')
      .populate('courseId', 'title code');
    
    // Auto-enroll all batch students if a new course is being assigned
    if (isNewCourse && batch && courseIdBeingSet) {
      console.log(`\n📚 [BATCH UPDATE] Auto-enrolling batch students in new course...`);
      await this.autoEnrollBatchStudents(batchId, courseIdBeingSet.toString(), tenantId);
    }
    
    return batch;
  }

  async deleteBatch(batchId: string, tenantId: string): Promise<IBatch | null> {
    const batch = await Batch.findOne({ _id: batchId, tenantId });
    if (batch) {
      await Batch.deleteOne({ _id: batchId, tenantId });
    }
    return batch;
  }

  async deactivateBatch(batchId: string, tenantId: string): Promise<IBatch | null> {
    return await Batch.findOneAndUpdate(
      { _id: batchId, tenantId },
      { $set: { isActive: false } },
      { new: true }
    ).populate('instructors', 'firstName lastName email role')
      .populate('courseId', 'title code');
  }

  async activateBatch(batchId: string, tenantId: string): Promise<IBatch | null> {
    return await Batch.findOneAndUpdate(
      { _id: batchId, tenantId },
      { $set: { isActive: true } },
      { new: true }
    ).populate('instructors', 'firstName lastName email role')
      .populate('courseId', 'title code');
  }

  async addInstructor(
    batchId: string,
    tenantId: string,
    instructorId: string
  ): Promise<IBatch | null> {
    return await Batch.findOneAndUpdate(
      { _id: batchId, tenantId },
      { $addToSet: { instructors: instructorId } },
      { new: true }
    ).populate('instructors', 'firstName lastName email role')
      .populate('courseId', 'title code');
  }

  async removeInstructor(
    batchId: string,
    tenantId: string,
    instructorId: string
  ): Promise<IBatch | null> {
    return await Batch.findOneAndUpdate(
      { _id: batchId, tenantId },
      { $pull: { instructors: instructorId } },
      { new: true }
    ).populate('instructors', 'firstName lastName email role')
      .populate('courseId', 'title code');
  }
}
