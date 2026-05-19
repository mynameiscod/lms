import { Request, Response } from 'express';
import ConceptLesson from '../models/ConceptLesson';
import LearningContentLibrary from '../models/LearningContentLibrary';

const tid = (req: Request): string => (req as any).user?.tenantId || '';

export const getByContentId = async (req: Request, res: Response) => {
  try {
    const lesson = await ConceptLesson.findOne({
      contentId: req.params.contentId,
      tenantId:  tid(req),
    }).lean();
    if (!lesson) return res.status(404).json({ message: 'No lesson found' });
    res.json(lesson);
  } catch (err) {
    res.status(500).json({ message: 'Failed to get lesson', error: err });
  }
};

export const upsertByContentId = async (req: Request, res: Response) => {
  try {
    const tId       = tid(req);
    const { contentId } = req.params;
    const { slides, finalTask, isActive } = req.body;

    const lesson = await ConceptLesson.findOneAndUpdate(
      { contentId, tenantId: tId },
      {
        $set: {
          slides:    slides    || [],
          finalTask: finalTask || { type: 'none' },
          isActive:  isActive !== false,
        },
      },
      { new: true, upsert: true }
    );

    // Store back-reference on the content item
    await LearningContentLibrary.updateOne(
      { _id: contentId, tenantId: tId },
      { $set: { conceptLessonId: lesson._id } }
    );

    res.json(lesson);
  } catch (err) {
    res.status(500).json({ message: 'Failed to save lesson', error: err });
  }
};

export const deleteByContentId = async (req: Request, res: Response) => {
  try {
    const tId       = tid(req);
    const { contentId } = req.params;

    await ConceptLesson.deleteOne({ contentId, tenantId: tId });
    await LearningContentLibrary.updateOne(
      { _id: contentId, tenantId: tId },
      { $unset: { conceptLessonId: 1 } }
    );

    res.json({ message: 'Lesson deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to delete lesson', error: err });
  }
};
