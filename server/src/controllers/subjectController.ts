import { Response } from 'express';
import { AuthenticatedRequest, ApiResponse } from '../types';
import { SubjectService } from '../services/subjectService';

const subjectService = new SubjectService();

export const createSubject = async (
  req: AuthenticatedRequest,
  res: Response<ApiResponse<any>>
) => {
  try {
    const { 
      courseId,
      name, 
      code,
      description,
      thumbnail,
      duration
    } = req.body;

    if (!courseId || !name || !code) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields',
        error: 'Course ID, name, and code are required'
      });
    }

    const subjectData = {
      courseId,
      name,
      code,
      description: description || '',
      thumbnail,
      duration: duration || { value: 2, unit: 'weeks' },
      tenantId: req.tenantId,
      isPublished: false,
      isActive: true
    };

    const subject = await subjectService.createSubject(subjectData);

    res.status(201).json({
      success: true,
      message: 'Subject created successfully',
      data: subject
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message,
      error: error.message
    });
  }
};

export const getSubjectsByCourse = async (
  req: AuthenticatedRequest,
  res: Response<ApiResponse<any>>
) => {
  try {
    const { courseId } = req.params;
    
    const subjects = await subjectService.getSubjectsByCourse(courseId, req.tenantId!);

    res.status(200).json({
      success: true,
      message: 'Subjects fetched successfully',
      data: subjects
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message,
      error: error.message
    });
  }
};

export const getSubjectsByTenant = async (
  req: AuthenticatedRequest,
  res: Response<ApiResponse<any>>
) => {
  try {
    const { isActive, isPublished, courseId } = req.query;
    const filters: any = {};
    
    if (isActive !== undefined) filters.isActive = isActive === 'true';
    if (isPublished !== undefined) filters.isPublished = isPublished === 'true';
    if (courseId) filters.courseId = courseId;
    
    const subjects = await subjectService.getSubjectsByTenant(req.tenantId!, filters);

    res.status(200).json({
      success: true,
      message: 'Subjects fetched successfully',
      data: subjects
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message,
      error: error.message
    });
  }
};

export const getSubjectById = async (
  req: AuthenticatedRequest,
  res: Response<ApiResponse<any>>
) => {
  try {
    const { subjectId } = req.params;

    const subject = await subjectService.getSubjectById(subjectId);

    if (!subject) {
      return res.status(404).json({
        success: false,
        message: 'Subject not found',
        error: 'Subject does not exist'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Subject fetched successfully',
      data: subject
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message,
      error: error.message
    });
  }
};

export const updateSubject = async (
  req: AuthenticatedRequest,
  res: Response<ApiResponse<any>>
) => {
  try {
    const { subjectId } = req.params;
    const updateData = req.body;

    const subject = await subjectService.updateSubject(subjectId, updateData);

    if (!subject) {
      return res.status(404).json({
        success: false,
        message: 'Subject not found',
        error: 'Subject does not exist'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Subject updated successfully',
      data: subject
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message,
      error: error.message
    });
  }
};

export const deleteSubject = async (
  req: AuthenticatedRequest,
  res: Response<ApiResponse<any>>
) => {
  try {
    const { subjectId } = req.params;

    const subject = await subjectService.deleteSubject(subjectId);

    if (!subject) {
      return res.status(404).json({
        success: false,
        message: 'Subject not found',
        error: 'Subject does not exist'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Subject deleted successfully',
      data: subject
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message,
      error: error.message
    });
  }
};

export const reorderSubjects = async (
  req: AuthenticatedRequest,
  res: Response<ApiResponse<any>>
) => {
  try {
    const { courseId } = req.params;
    const { orders } = req.body; // Array of { subjectId, order }

    if (!orders || !Array.isArray(orders)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid request',
        error: 'Orders array is required'
      });
    }

    await subjectService.reorderSubjects(courseId, orders);

    res.status(200).json({
      success: true,
      message: 'Subjects reordered successfully',
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
