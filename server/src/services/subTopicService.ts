import SubTopic, { ISubTopic } from '../models/SubTopic';
import { TopicService } from './topicService';

const topicService = new TopicService();

export class SubTopicService {
  async createSubTopic(data: any): Promise<ISubTopic> {
    const existingCount = await SubTopic.countDocuments({ topicId: data.topicId });
    data.order = existingCount + 1;

    const subTopic = new SubTopic(data);
    await subTopic.save();

    await topicService.incrementSubTopicCount(data.topicId);

    return subTopic.populate([
      { path: 'topicId', select: 'title order' },
      { path: 'chapterId', select: 'title order' },
      { path: 'subjectId', select: 'name code' },
      { path: 'courseId', select: 'title code' }
    ]);
  }

  async getSubTopicsByTopic(topicId: string, tenantId: string): Promise<ISubTopic[]> {
    return SubTopic.find({ topicId, tenantId, isActive: true })
      .populate('topicId', 'title order')
      .populate('chapterId', 'title order')
      .populate('subjectId', 'name code')
      .populate('courseId', 'title code')
      .sort({ order: 1 });
  }

  async getSubTopicsByChapter(chapterId: string, tenantId: string): Promise<ISubTopic[]> {
    return SubTopic.find({ chapterId, tenantId, isActive: true })
      .populate('topicId', 'title order')
      .populate('chapterId', 'title order')
      .sort({ order: 1 });
  }

  async getSubTopicsByTenant(tenantId: string, filters: any = {}): Promise<ISubTopic[]> {
    const query: any = { tenantId, ...filters };
    return SubTopic.find(query)
      .populate('topicId', 'title order')
      .populate('chapterId', 'title order')
      .populate('subjectId', 'name code')
      .populate('courseId', 'title code')
      .sort({ courseId: 1, subjectId: 1, chapterId: 1, topicId: 1, order: 1 });
  }

  async getSubTopicById(subTopicId: string): Promise<ISubTopic | null> {
    return SubTopic.findById(subTopicId)
      .populate('topicId', 'title order')
      .populate('chapterId', 'title order description')
      .populate('subjectId', 'name code')
      .populate('courseId', 'title code');
  }

  async updateSubTopic(subTopicId: string, data: Partial<ISubTopic>): Promise<ISubTopic | null> {
    return SubTopic.findByIdAndUpdate(subTopicId, data, { new: true })
      .populate('topicId', 'title order')
      .populate('chapterId', 'title order')
      .populate('subjectId', 'name code')
      .populate('courseId', 'title code');
  }

  async deleteSubTopic(subTopicId: string): Promise<ISubTopic | null> {
    const subTopic = await SubTopic.findByIdAndDelete(subTopicId);
    if (subTopic) {
      await topicService.decrementSubTopicCount(subTopic.topicId.toString());
      await SubTopic.updateMany(
        { topicId: subTopic.topicId, order: { $gt: subTopic.order } },
        { $inc: { order: -1 } }
      );
    }
    return subTopic;
  }

  async reorderSubTopics(topicId: string, orders: { subTopicId: string; order: number }[]): Promise<void> {
    const bulkOps = orders.map(({ subTopicId, order }) => ({
      updateOne: {
        filter: { _id: subTopicId, topicId },
        update: { $set: { order } }
      }
    }));
    await SubTopic.bulkWrite(bulkOps);
  }
}
