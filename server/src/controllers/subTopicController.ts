import { Response } from 'express';
import { AuthenticatedRequest, ApiResponse } from '../types';
import { SubTopicService } from '../services/subTopicService';

const subTopicService = new SubTopicService();

export const createSubTopic = async (
  req: AuthenticatedRequest,
  res: Response<ApiResponse<any>>
) => {
  try {
    const {
      topicId, chapterId, subjectId, courseId, title, description,
      scheduledDay, scheduledDate, startTime, endTime, durationMinutes
    } = req.body;

    if (!topicId || !chapterId || !subjectId || !courseId || !title) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields',
        error: 'Topic ID, Chapter ID, Subject ID, Course ID, and title are required'
      });
    }

    const subTopicData = {
      topicId,
      chapterId,
      subjectId,
      courseId,
      title,
      description: description || '',
      scheduledDay: scheduledDay || null,
      scheduledDate: scheduledDate || null,
      startTime: startTime || null,
      endTime: endTime || null,
      durationMinutes: durationMinutes || null,
      tenantId: req.tenantId,
      isPublished: false,
      isActive: true
    };

    const subTopic = await subTopicService.createSubTopic(subTopicData);

    res.status(201).json({
      success: true,
      message: 'Sub-topic created successfully',
      data: subTopic
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message,
      error: error.message
    });
  }
};

export const getSubTopicsByTopic = async (
  req: AuthenticatedRequest,
  res: Response<ApiResponse<any>>
) => {
  try {
    const { topicId } = req.params;
    const subTopics = await subTopicService.getSubTopicsByTopic(topicId, req.tenantId!);

    res.status(200).json({
      success: true,
      message: 'Sub-topics fetched successfully',
      data: subTopics
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message,
      error: error.message
    });
  }
};

export const getSubTopicsByChapter = async (
  req: AuthenticatedRequest,
  res: Response<ApiResponse<any>>
) => {
  try {
    const { chapterId } = req.params;
    const subTopics = await subTopicService.getSubTopicsByChapter(chapterId, req.tenantId!);

    res.status(200).json({
      success: true,
      message: 'Sub-topics fetched successfully',
      data: subTopics
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message,
      error: error.message
    });
  }
};

export const getSubTopicsByTenant = async (
  req: AuthenticatedRequest,
  res: Response<ApiResponse<any>>
) => {
  try {
    const { isActive, topicId, chapterId, subjectId, courseId } = req.query;
    const filters: any = {};

    if (isActive !== undefined) filters.isActive = isActive === 'true';
    if (topicId) filters.topicId = topicId;
    if (chapterId) filters.chapterId = chapterId;
    if (subjectId) filters.subjectId = subjectId;
    if (courseId) filters.courseId = courseId;

    const subTopics = await subTopicService.getSubTopicsByTenant(req.tenantId!, filters);

    res.status(200).json({
      success: true,
      message: 'Sub-topics fetched successfully',
      data: subTopics
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message,
      error: error.message
    });
  }
};

export const getSubTopicById = async (
  req: AuthenticatedRequest,
  res: Response<ApiResponse<any>>
) => {
  try {
    const { subTopicId } = req.params;
    const subTopic = await subTopicService.getSubTopicById(subTopicId);

    if (!subTopic) {
      return res.status(404).json({
        success: false,
        message: 'Sub-topic not found',
        error: 'Sub-topic does not exist'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Sub-topic fetched successfully',
      data: subTopic
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message,
      error: error.message
    });
  }
};

export const updateSubTopic = async (
  req: AuthenticatedRequest,
  res: Response<ApiResponse<any>>
) => {
  try {
    const { subTopicId } = req.params;
    const updateData = req.body;

    const subTopic = await subTopicService.updateSubTopic(subTopicId, updateData);

    if (!subTopic) {
      return res.status(404).json({
        success: false,
        message: 'Sub-topic not found',
        error: 'Sub-topic does not exist'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Sub-topic updated successfully',
      data: subTopic
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message,
      error: error.message
    });
  }
};

export const deleteSubTopic = async (
  req: AuthenticatedRequest,
  res: Response<ApiResponse<any>>
) => {
  try {
    const { subTopicId } = req.params;
    const subTopic = await subTopicService.deleteSubTopic(subTopicId);

    if (!subTopic) {
      return res.status(404).json({
        success: false,
        message: 'Sub-topic not found',
        error: 'Sub-topic does not exist'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Sub-topic deleted successfully',
      data: subTopic
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message,
      error: error.message
    });
  }
};

export const reorderSubTopics = async (
  req: AuthenticatedRequest,
  res: Response<ApiResponse<any>>
) => {
  try {
    const { topicId } = req.params;
    const { orders } = req.body;

    if (!orders || !Array.isArray(orders)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid request',
        error: 'Orders array is required'
      });
    }

    await subTopicService.reorderSubTopics(topicId, orders);

    res.status(200).json({
      success: true,
      message: 'Sub-topics reordered successfully',
      data: null
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message,
      error: error.message
    });
  }
};
