import { Response } from 'express';
import { AuthenticatedRequest, ApiResponse } from '../types';
import { TopicService } from '../services/topicService';

const topicService = new TopicService();

export const createTopic = async (
  req: AuthenticatedRequest,
  res: Response<ApiResponse<any>>
) => {
  try {
    const { chapterId, subjectId, courseId, title, description } = req.body;

    if (!chapterId || !subjectId || !courseId || !title) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields',
        error: 'Chapter ID, Subject ID, Course ID, and title are required'
      });
    }

    const topicData = {
      chapterId,
      subjectId,
      courseId,
      title,
      description: description || '',
      tenantId: req.tenantId,
      isPublished: false,
      isActive: true
    };

    const topic = await topicService.createTopic(topicData);

    res.status(201).json({
      success: true,
      message: 'Topic created successfully',
      data: topic
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message,
      error: error.message
    });
  }
};

export const getTopicsByChapter = async (
  req: AuthenticatedRequest,
  res: Response<ApiResponse<any>>
) => {
  try {
    const { chapterId } = req.params;
    const topics = await topicService.getTopicsByChapter(chapterId, req.tenantId!);

    res.status(200).json({
      success: true,
      message: 'Topics fetched successfully',
      data: topics
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message,
      error: error.message
    });
  }
};

export const getTopicsByTenant = async (
  req: AuthenticatedRequest,
  res: Response<ApiResponse<any>>
) => {
  try {
    const { isActive, chapterId, subjectId, courseId } = req.query;
    const filters: any = {};

    if (isActive !== undefined) filters.isActive = isActive === 'true';
    if (chapterId) filters.chapterId = chapterId;
    if (subjectId) filters.subjectId = subjectId;
    if (courseId) filters.courseId = courseId;

    const topics = await topicService.getTopicsByTenant(req.tenantId!, filters);

    res.status(200).json({
      success: true,
      message: 'Topics fetched successfully',
      data: topics
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message,
      error: error.message
    });
  }
};

export const getTopicById = async (
  req: AuthenticatedRequest,
  res: Response<ApiResponse<any>>
) => {
  try {
    const { topicId } = req.params;
    const topic = await topicService.getTopicById(topicId);

    if (!topic) {
      return res.status(404).json({
        success: false,
        message: 'Topic not found',
        error: 'Topic does not exist'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Topic fetched successfully',
      data: topic
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message,
      error: error.message
    });
  }
};

export const updateTopic = async (
  req: AuthenticatedRequest,
  res: Response<ApiResponse<any>>
) => {
  try {
    const { topicId } = req.params;
    const updateData = req.body;

    const topic = await topicService.updateTopic(topicId, updateData);

    if (!topic) {
      return res.status(404).json({
        success: false,
        message: 'Topic not found',
        error: 'Topic does not exist'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Topic updated successfully',
      data: topic
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message,
      error: error.message
    });
  }
};

export const deleteTopic = async (
  req: AuthenticatedRequest,
  res: Response<ApiResponse<any>>
) => {
  try {
    const { topicId } = req.params;
    const topic = await topicService.deleteTopic(topicId);

    if (!topic) {
      return res.status(404).json({
        success: false,
        message: 'Topic not found',
        error: 'Topic does not exist'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Topic deleted successfully',
      data: topic
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message,
      error: error.message
    });
  }
};

export const reorderTopics = async (
  req: AuthenticatedRequest,
  res: Response<ApiResponse<any>>
) => {
  try {
    const { chapterId } = req.params;
    const { orders } = req.body;

    if (!orders || !Array.isArray(orders)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid request',
        error: 'Orders array is required'
      });
    }

    await topicService.reorderTopics(chapterId, orders);

    res.status(200).json({
      success: true,
      message: 'Topics reordered successfully',
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
