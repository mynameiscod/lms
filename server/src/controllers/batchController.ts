import { Response } from 'express';
import { AuthenticatedRequest, ApiResponse } from '../types';
import { BatchService } from '../services/batchService';

const batchService = new BatchService();

export const createBatch = async (
  req: AuthenticatedRequest,
  res: Response<ApiResponse<any>>
) => {
  try {
    const { name, courseId, startDate, endDate, timings, instructors, capacity } = req.body;

    if (!name || !startDate || !endDate || !timings || !Array.isArray(timings) || timings.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields',
        error: 'name, startDate, endDate, and at least one timing entry are required'
      });
    }

    // Validate date range
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (start >= end) {
      return res.status(400).json({
        success: false,
        message: 'Invalid date range',
        error: 'End date must be after start date'
      });
    }

    const batchData = {
      name,
      courseId: courseId || undefined,
      startDate: start,
      endDate: end,
      timings,
      instructors: instructors || [],
      tenantId: req.tenantId!,
      capacity: capacity || 30
    };

    const batch = await batchService.createBatch(batchData);

    res.status(201).json({
      success: true,
      message: 'Batch created successfully',
      data: batch
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message,
      error: error.message
    });
  }
};

export const getBatchesByTenant = async (
  req: AuthenticatedRequest,
  res: Response<ApiResponse<any>>
) => {
  try {
    const batches = await batchService.getBatchesByTenant(req.tenantId!);

    res.status(200).json({
      success: true,
      message: 'Batches fetched successfully',
      data: batches
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message,
      error: error.message
    });
  }
};

export const getBatchById = async (
  req: AuthenticatedRequest,
  res: Response<ApiResponse<any>>
) => {
  try {
    const { batchId } = req.params;

    const batch = await batchService.getBatchById(batchId);

    if (!batch) {
      return res.status(404).json({
        success: false,
        message: 'Batch not found',
        error: 'Batch does not exist'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Batch fetched successfully',
      data: batch
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message,
      error: error.message
    });
  }
};

export const updateBatch = async (
  req: AuthenticatedRequest,
  res: Response<ApiResponse<any>>
) => {
  try {
    const { batchId } = req.params;
    const { name, courseId, startDate, endDate, timings, instructors, capacity } = req.body;

    const updateData: any = {};
    if (name) updateData.name = name;
    if (courseId !== undefined) updateData.courseId = courseId || null;
    if (startDate) updateData.startDate = new Date(startDate);
    if (endDate) updateData.endDate = new Date(endDate);
    if (timings) updateData.timings = timings;
    if (instructors) updateData.instructors = instructors;
    if (capacity) updateData.capacity = capacity;

    // Validate date range if both dates are provided
    if (updateData.startDate && updateData.endDate) {
      if (updateData.startDate >= updateData.endDate) {
        return res.status(400).json({
          success: false,
          message: 'Invalid date range',
          error: 'End date must be after start date'
        });
      }
    }

    const batch = await batchService.updateBatch(batchId, req.tenantId!, updateData);

    if (!batch) {
      return res.status(404).json({
        success: false,
        message: 'Batch not found',
        error: 'Batch does not exist'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Batch updated successfully',
      data: batch
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message,
      error: error.message
    });
  }
};

export const deleteBatch = async (
  req: AuthenticatedRequest,
  res: Response<ApiResponse<any>>
) => {
  try {
    const { batchId } = req.params;

    const batch = await batchService.deleteBatch(batchId, req.tenantId!);

    if (!batch) {
      return res.status(404).json({
        success: false,
        message: 'Batch not found',
        error: 'Batch does not exist'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Batch deleted successfully',
      data: batch
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message,
      error: error.message
    });
  }
};

export const deactivateBatch = async (
  req: AuthenticatedRequest,
  res: Response<ApiResponse<any>>
) => {
  try {
    const { batchId } = req.params;

    const batch = await batchService.deactivateBatch(batchId, req.tenantId!);

    if (!batch) {
      return res.status(404).json({
        success: false,
        message: 'Batch not found',
        error: 'Batch does not exist'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Batch deactivated successfully',
      data: batch
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message,
      error: error.message
    });
  }
};

export const activateBatch = async (
  req: AuthenticatedRequest,
  res: Response<ApiResponse<any>>
) => {
  try {
    const { batchId } = req.params;

    const batch = await batchService.activateBatch(batchId, req.tenantId!);

    if (!batch) {
      return res.status(404).json({
        success: false,
        message: 'Batch not found',
        error: 'Batch does not exist'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Batch activated successfully',
      data: batch
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message,
      error: error.message
    });
  }
};

export const addInstructor = async (
  req: AuthenticatedRequest,
  res: Response<ApiResponse<any>>
) => {
  try {
    const { batchId } = req.params;
    const { instructorId } = req.body;

    if (!instructorId) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields',
        error: 'instructorId is required'
      });
    }

    const batch = await batchService.addInstructor(batchId, req.tenantId!, instructorId);

    if (!batch) {
      return res.status(404).json({
        success: false,
        message: 'Batch not found',
        error: 'Batch does not exist'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Instructor added successfully',
      data: batch
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message,
      error: error.message
    });
  }
};

export const removeInstructor = async (
  req: AuthenticatedRequest,
  res: Response<ApiResponse<any>>
) => {
  try {
    const { batchId } = req.params;
    const { instructorId } = req.body;

    if (!instructorId) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields',
        error: 'instructorId is required'
      });
    }

    const batch = await batchService.removeInstructor(batchId, req.tenantId!, instructorId);

    if (!batch) {
      return res.status(404).json({
        success: false,
        message: 'Batch not found',
        error: 'Batch does not exist'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Instructor removed successfully',
      data: batch
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message,
      error: error.message
    });
  }
};
