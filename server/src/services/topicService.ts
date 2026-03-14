import Topic, { ITopic } from '../models/Topic';

export class TopicService {
  async createTopic(data: any): Promise<ITopic> {
    const existingCount = await Topic.countDocuments({ chapterId: data.chapterId });
    data.order = existingCount + 1;

    const topic = new Topic(data);
    await topic.save();

    return topic.populate([
      { path: 'chapterId', select: 'title order' },
      { path: 'subjectId', select: 'name code' },
      { path: 'courseId', select: 'title code' }
    ]);
  }

  async getTopicsByChapter(chapterId: string, tenantId: string): Promise<ITopic[]> {
    return Topic.find({ chapterId, tenantId, isActive: true })
      .populate('chapterId', 'title order')
      .populate('subjectId', 'name code')
      .populate('courseId', 'title code')
      .sort({ order: 1 });
  }

  async getTopicsByTenant(tenantId: string, filters: any = {}): Promise<ITopic[]> {
    const query: any = { tenantId, ...filters };
    return Topic.find(query)
      .populate('chapterId', 'title order')
      .populate('subjectId', 'name code')
      .populate('courseId', 'title code')
      .sort({ courseId: 1, subjectId: 1, chapterId: 1, order: 1 });
  }

  async getTopicById(topicId: string): Promise<ITopic | null> {
    return Topic.findById(topicId)
      .populate('chapterId', 'title order description')
      .populate('subjectId', 'name code')
      .populate('courseId', 'title code');
  }

  async updateTopic(topicId: string, data: Partial<ITopic>): Promise<ITopic | null> {
    return Topic.findByIdAndUpdate(topicId, data, { new: true })
      .populate('chapterId', 'title order')
      .populate('subjectId', 'name code')
      .populate('courseId', 'title code');
  }

  async deleteTopic(topicId: string): Promise<ITopic | null> {
    const topic = await Topic.findByIdAndDelete(topicId);
    if (topic) {
      await Topic.updateMany(
        { chapterId: topic.chapterId, order: { $gt: topic.order } },
        { $inc: { order: -1 } }
      );
    }
    return topic;
  }

  async reorderTopics(chapterId: string, orders: { topicId: string; order: number }[]): Promise<void> {
    const bulkOps = orders.map(({ topicId, order }) => ({
      updateOne: {
        filter: { _id: topicId, chapterId },
        update: { $set: { order } }
      }
    }));
    await Topic.bulkWrite(bulkOps);
  }

  async incrementSubTopicCount(topicId: string): Promise<void> {
    await Topic.findByIdAndUpdate(topicId, { $inc: { subTopicCount: 1 } });
  }

  async decrementSubTopicCount(topicId: string): Promise<void> {
    await Topic.findByIdAndUpdate(topicId, { $inc: { subTopicCount: -1 } });
  }
}
