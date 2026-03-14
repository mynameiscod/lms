import { Response } from 'express';
import { AuthenticatedRequest, ApiResponse } from '../types';
import { ChapterService } from '../services/chapterService';

const chapterService = new ChapterService();

export const createChapter = async (
  req: AuthenticatedRequest,
  res: Response<ApiResponse<any>>
) => {
  try {
    const { 
      subjectId,
      courseId,
      title, 
      description,
      videos,
      notes,
      unlockSettings,
      completionCriteria,
      estimatedDuration
    } = req.body;

    if (!subjectId || !courseId || !title) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields',
        error: 'Subject ID, Course ID, and title are required'
      });
    }

    const chapterData = {
      subjectId,
      courseId,
      title,
      description: description || '',
      videos: videos || [],
      notes: notes || [],
      unlockSettings: unlockSettings || { type: 'sequential', requiredCompletionPercentage: 80 },
      completionCriteria: completionCriteria || {
        watchAllVideos: true,
        readAllNotes: false,
        passQuiz: true,
        minimumQuizScore: 60,
        submitAssignments: false
      },
      estimatedDuration: estimatedDuration || { months: 0, weeks: 0, days: 0, hours: 1, minutes: 0 },
      tenantId: req.tenantId,
      isPublished: false,
      isActive: true
    };

    const chapter = await chapterService.createChapter(chapterData);

    res.status(201).json({
      success: true,
      message: 'Chapter created successfully',
      data: chapter
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message,
      error: error.message
    });
  }
};

export const getChaptersBySubject = async (
  req: AuthenticatedRequest,
  res: Response<ApiResponse<any>>
) => {
  try {
    const { subjectId } = req.params;
    
    const chapters = await chapterService.getChaptersBySubject(subjectId, req.tenantId!);

    res.status(200).json({
      success: true,
      message: 'Chapters fetched successfully',
      data: chapters
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message,
      error: error.message
    });
  }
};

export const getChaptersByCourse = async (
  req: AuthenticatedRequest,
  res: Response<ApiResponse<any>>
) => {
  try {
    const { courseId } = req.params;
    
    const chapters = await chapterService.getChaptersByCourse(courseId, req.tenantId!);

    res.status(200).json({
      success: true,
      message: 'Chapters fetched successfully',
      data: chapters
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message,
      error: error.message
    });
  }
};

export const getChaptersByTenant = async (
  req: AuthenticatedRequest,
  res: Response<ApiResponse<any>>
) => {
  try {
    const { isActive, isPublished, subjectId, courseId } = req.query;
    const filters: any = {};
    
    if (isActive !== undefined) filters.isActive = isActive === 'true';
    if (isPublished !== undefined) filters.isPublished = isPublished === 'true';
    if (subjectId) filters.subjectId = subjectId;
    if (courseId) filters.courseId = courseId;
    
    const chapters = await chapterService.getChaptersByTenant(req.tenantId!, filters);

    res.status(200).json({
      success: true,
      message: 'Chapters fetched successfully',
      data: chapters
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message,
      error: error.message
    });
  }
};

export const getChapterById = async (
  req: AuthenticatedRequest,
  res: Response<ApiResponse<any>>
) => {
  try {
    const { chapterId } = req.params;

    const chapter = await chapterService.getChapterById(chapterId);

    if (!chapter) {
      return res.status(404).json({
        success: false,
        message: 'Chapter not found',
        error: 'Chapter does not exist'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Chapter fetched successfully',
      data: chapter
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message,
      error: error.message
    });
  }
};

export const updateChapter = async (
  req: AuthenticatedRequest,
  res: Response<ApiResponse<any>>
) => {
  try {
    const { chapterId } = req.params;
    const updateData = req.body;

    const chapter = await chapterService.updateChapter(chapterId, updateData);

    if (!chapter) {
      return res.status(404).json({
        success: false,
        message: 'Chapter not found',
        error: 'Chapter does not exist'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Chapter updated successfully',
      data: chapter
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message,
      error: error.message
    });
  }
};

export const deleteChapter = async (
  req: AuthenticatedRequest,
  res: Response<ApiResponse<any>>
) => {
  try {
    const { chapterId } = req.params;

    const chapter = await chapterService.deleteChapter(chapterId);

    if (!chapter) {
      return res.status(404).json({
        success: false,
        message: 'Chapter not found',
        error: 'Chapter does not exist'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Chapter deleted successfully',
      data: chapter
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message,
      error: error.message
    });
  }
};

export const reorderChapters = async (
  req: AuthenticatedRequest,
  res: Response<ApiResponse<any>>
) => {
  try {
    const { subjectId } = req.params;
    const { orders } = req.body;

    if (!orders || !Array.isArray(orders)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid request',
        error: 'Orders array is required'
      });
    }

    await chapterService.reorderChapters(subjectId, orders);

    res.status(200).json({
      success: true,
      message: 'Chapters reordered successfully',
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

// Content management endpoints
export const addVideoToChapter = async (
  req: AuthenticatedRequest,
  res: Response<ApiResponse<any>>
) => {
  try {
    const { chapterId } = req.params;
    const { title, url, duration, isRequired } = req.body;

    if (!title || !url) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields',
        error: 'Title and URL are required'
      });
    }

    const chapter = await chapterService.addVideo(chapterId, { 
      title, 
      url, 
      duration: duration || 0,
      isRequired: isRequired !== false 
    });

    if (!chapter) {
      return res.status(404).json({
        success: false,
        message: 'Chapter not found',
        error: 'Chapter does not exist'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Video added successfully',
      data: chapter
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message,
      error: error.message
    });
  }
};

export const removeVideoFromChapter = async (
  req: AuthenticatedRequest,
  res: Response<ApiResponse<any>>
) => {
  try {
    const { chapterId, videoIndex } = req.params;

    const chapter = await chapterService.removeVideo(chapterId, parseInt(videoIndex));

    if (!chapter) {
      return res.status(404).json({
        success: false,
        message: 'Chapter or video not found',
        error: 'Chapter or video index does not exist'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Video removed successfully',
      data: chapter
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message,
      error: error.message
    });
  }
};

export const addNoteToChapter = async (
  req: AuthenticatedRequest,
  res: Response<ApiResponse<any>>
) => {
  try {
    const { chapterId } = req.params;
    const { title, content, attachmentUrl } = req.body;

    if (!title || !content) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields',
        error: 'Title and content are required'
      });
    }

    const chapter = await chapterService.addNote(chapterId, { 
      title, 
      content,
      attachmentUrl 
    });

    if (!chapter) {
      return res.status(404).json({
        success: false,
        message: 'Chapter not found',
        error: 'Chapter does not exist'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Note added successfully',
      data: chapter
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message,
      error: error.message
    });
  }
};

export const removeNoteFromChapter = async (
  req: AuthenticatedRequest,
  res: Response<ApiResponse<any>>
) => {
  try {
    const { chapterId, noteIndex } = req.params;

    const chapter = await chapterService.removeNote(chapterId, parseInt(noteIndex));

    if (!chapter) {
      return res.status(404).json({
        success: false,
        message: 'Chapter or note not found',
        error: 'Chapter or note index does not exist'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Note removed successfully',
      data: chapter
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message,
      error: error.message
    });
  }
};
