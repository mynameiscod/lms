import { Response } from 'express';
import { AuthenticatedRequest, ApiResponse } from '../types';
import { EnrollmentService } from '../services/enrollmentService';

const enrollmentService = new EnrollmentService();

export const enrollStudent = async (
  req: AuthenticatedRequest,
  res: Response<ApiResponse<any>>
) => {
  try {
    const { courseId } = req.body;
    const userId = req.user?.id;

    if (!courseId || !userId) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields',
        error: 'Course ID is required'
      });
    }

    const enrollment = await enrollmentService.enrollStudent(userId, courseId, req.tenantId!);

    res.status(201).json({
      success: true,
      message: 'Student enrolled successfully',
      data: enrollment
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message,
      error: error.message
    });
  }
};

export const getStudentEnrollments = async (
  req: AuthenticatedRequest,
  res: Response<ApiResponse<any>>
) => {
  try {
    const userId = req.user?.id;

    const enrollments = await enrollmentService.getStudentEnrollments(userId!, req.tenantId!);

    res.status(200).json({
      success: true,
      message: 'Enrollments fetched successfully',
      data: enrollments
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message,
      error: error.message
    });
  }
};

export const getCourseEnrollments = async (
  req: AuthenticatedRequest,
  res: Response<ApiResponse<any>>
) => {
  try {
    const { courseId } = req.params;

    const enrollments = await enrollmentService.getCourseEnrollments(courseId);

    res.status(200).json({
      success: true,
      message: 'Course enrollments fetched successfully',
      data: enrollments
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message,
      error: error.message
    });
  }
};