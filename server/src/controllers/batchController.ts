import { Response } from 'express';
import { AuthenticatedRequest, ApiResponse } from '../types';
import { BatchService } from '../services/batchService';

const batchService = new BatchService();

// Weekly off-days: JS getDay() numbers (0=Sun … 6=Sat). Falls back to Sat+Sun off.
const sanitizeOffDays = (v: any): number[] => {
  if (!Array.isArray(v)) return [0, 6];
  const nums = [...new Set(v.map((n: any) => Number(n)).filter((n: number) => Number.isInteger(n) && n >= 0 && n <= 6))];
  return nums.length ? nums : [0, 6]; // never allow "all days are class days" via empty=all; empty means default
};

// Special (non-content) dates that skip a curriculum Day: holidays, mock interviews, events.
const sanitizeSpecialDays = (v: any): any[] => {
  if (!Array.isArray(v)) return [];
  const types = ['holiday', 'mock_interview', 'event', 'off'];
  return v
    .filter((s: any) => s && /^\d{4}-\d{2}-\d{2}$/.test(String(s.date)))
    .map((s: any) => ({ date: String(s.date), type: types.includes(s.type) ? s.type : 'off', label: s.label ? String(s.label).slice(0, 120) : undefined }));
};

export const createBatch = async (
  req: AuthenticatedRequest,
  res: Response<ApiResponse<any>>
) => {
  try {
    const { name, courseId, startDate, endDate, timings, instructors, capacity, departmentId, holidays, weeklyOffDays, specialDays } = req.body;

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
      capacity: capacity || 30,
      departmentId: departmentId || null,
      holidays: Array.isArray(holidays) ? holidays.filter((d: any) => /^\d{4}-\d{2}-\d{2}$/.test(String(d))) : [],
      weeklyOffDays: sanitizeOffDays(weeklyOffDays),
      specialDays: sanitizeSpecialDays(specialDays),
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
    const { name, courseId, startDate, endDate, timings, instructors, capacity, departmentId, holidays, weeklyOffDays, specialDays } = req.body;

    const updateData: any = {};
    if (name) updateData.name = name;
    if (courseId !== undefined) updateData.courseId = courseId || null;
    if (startDate) updateData.startDate = new Date(startDate);
    if (endDate) updateData.endDate = new Date(endDate);
    if (timings) updateData.timings = timings;
    if (instructors) updateData.instructors = instructors;
    if (capacity) updateData.capacity = capacity;
    if (departmentId !== undefined) updateData.departmentId = departmentId || null;
    if (Array.isArray(holidays)) updateData.holidays = holidays.filter((d: any) => /^\d{4}-\d{2}-\d{2}$/.test(String(d)));
    if (weeklyOffDays !== undefined) updateData.weeklyOffDays = sanitizeOffDays(weeklyOffDays);
    if (specialDays !== undefined) updateData.specialDays = sanitizeSpecialDays(specialDays);

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
