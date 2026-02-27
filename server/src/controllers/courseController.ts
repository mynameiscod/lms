import { Response } from 'express';
import { AuthenticatedRequest, ApiResponse } from '../types';
import { CourseService } from '../services/courseService';

const courseService = new CourseService();

export const createCourse = async (
  req: AuthenticatedRequest,
  res: Response<ApiResponse<any>>
) => {
  try {
    const { title, description, category, level, instructor } = req.body;

    if (!title || !description || !category || !instructor) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields',
        error: 'Title, description, category, and instructor are required'
      });
    }

    const courseData = {
      title,
      description,
      category,
      level: level || 'beginner',
      instructor,
      tenantId: req.tenantId,
      isPublished: false
    };

    const course = await courseService.createCourse(courseData);

    res.status(201).json({
      success: true,
      message: 'Course created successfully',
      data: course
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message,
      error: error.message
    });
  }
};

export const getCoursesByTenant = async (
  req: AuthenticatedRequest,
  res: Response<ApiResponse<any>>
) => {
  try {
    const courses = await courseService.getCoursesByTenant(req.tenantId!);

    res.status(200).json({
      success: true,
      message: 'Courses fetched successfully',
      data: courses
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message,
      error: error.message
    });
  }
};

export const getCourseById = async (
  req: AuthenticatedRequest,
  res: Response<ApiResponse<any>>
) => {
  try {
    const { courseId } = req.params;

    const course = await courseService.getCourseById(courseId);

    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found',
        error: 'Course does not exist'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Course fetched successfully',
      data: course
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message,
      error: error.message
    });
  }
};