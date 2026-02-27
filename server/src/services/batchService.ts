import Batch, { IBatch } from '../models/Batch';

export class BatchService {
  async createBatch(batchData: {
    name: string;
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
    return await Batch.find({ tenantId, isActive: true })
      .populate('instructors', 'firstName lastName email role')
      .sort({ startDate: -1 });
  }

  async getBatchById(batchId: string): Promise<IBatch | null> {
    return await Batch.findById(batchId)
      .populate('instructors', 'firstName lastName email role');
  }

  async updateBatch(
    batchId: string,
    tenantId: string,
    updateData: Partial<IBatch>
  ): Promise<IBatch | null> {
    return await Batch.findOneAndUpdate(
      { _id: batchId, tenantId },
      { $set: updateData },
      { new: true }
    ).populate('instructors', 'firstName lastName email role');
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
    ).populate('instructors', 'firstName lastName email role');
  }

  async activateBatch(batchId: string, tenantId: string): Promise<IBatch | null> {
    return await Batch.findOneAndUpdate(
      { _id: batchId, tenantId },
      { $set: { isActive: true } },
      { new: true }
    ).populate('instructors', 'firstName lastName email role');
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
    ).populate('instructors', 'firstName lastName email role');
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
    ).populate('instructors', 'firstName lastName email role');
  }
}
