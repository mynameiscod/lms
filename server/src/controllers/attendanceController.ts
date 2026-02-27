import { Response } from 'express';
import attendanceService from '../services/attendanceService';
import { AuthenticatedRequest } from '../types';

export const markAttendance = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { studentId, batchId, date, inTime, outTime, status, remarks } = req.body;
    const tenantId = req.tenantId!;
    const markedBy = req.user?.id || req.userId!;

    if (!studentId || !batchId || !date || !status) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: studentId, batchId, date, status'
      });
    }

    if (!['present', 'absent', 'leave'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Must be one of: present, absent, leave'
      });
    }

    const attendance = await attendanceService.markAttendance(
      studentId,
      batchId,
      new Date(date),
      inTime,
      outTime,
      status,
      markedBy,
      tenantId,
      remarks
    );

    res.status(200).json({
      success: true,
      data: attendance,
      message: 'Attendance marked successfully'
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to mark attendance'
    });
  }
};

export const getStudentAttendance = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { studentId } = req.params;
    const { startDate, endDate } = req.query;
    const tenantId = req.tenantId!;

    const attendance = await attendanceService.getStudentAttendance(
      studentId,
      tenantId,
      startDate ? new Date(startDate as string) : undefined,
      endDate ? new Date(endDate as string) : undefined
    );

    res.status(200).json({
      success: true,
      data: attendance
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to fetch attendance'
    });
  }
};

export const getBatchAttendance = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { batchId } = req.params;
    const { date } = req.query;
    const tenantId = req.tenantId!;

    const attendance = await attendanceService.getBatchAttendance(
      batchId,
      tenantId,
      date ? new Date(date as string) : undefined
    );

    res.status(200).json({
      success: true,
      data: attendance
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to fetch batch attendance'
    });
  }
};

export const getBatchAttendanceSummary = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { batchId } = req.params;
    const tenantId = req.tenantId!;

    const summary = await attendanceService.getBatchAttendanceSummary(
      batchId,
      tenantId
    );

    res.status(200).json({
      success: true,
      data: summary
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to fetch batch attendance summary'
    });
  }
};

export const getStudentAttendanceSummary = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { studentId } = req.params;
    const { batchId } = req.query;
    const tenantId = req.tenantId!;

    const summary = await attendanceService.getStudentAttendanceSummary(
      studentId,
      tenantId,
      batchId as string | undefined
    );

    res.status(200).json({
      success: true,
      data: summary
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to fetch student attendance summary'
    });
  }
};

export const getAttendanceByDateRange = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { batchId, startDate, endDate } = req.query;
    const tenantId = req.tenantId!;

    if (!batchId || !startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'Missing required parameters: batchId, startDate, endDate'
      });
    }

    const attendance = await attendanceService.getAttendanceByDateRange(
      tenantId,
      batchId as string,
      new Date(startDate as string),
      new Date(endDate as string)
    );

    res.status(200).json({
      success: true,
      data: attendance
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to fetch attendance records'
    });
  }
};

export const deleteAttendance = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { attendanceId } = req.params;
    const tenantId = req.tenantId!;

    await attendanceService.deleteAttendance(attendanceId, tenantId);

    res.status(200).json({
      success: true,
      message: 'Attendance record deleted successfully'
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to delete attendance record'
    });
  }
};
