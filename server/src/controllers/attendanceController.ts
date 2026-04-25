import { Response } from 'express';
import attendanceService from '../services/attendanceService';
import Attendance from '../models/Attendance';
import User from '../models/User';
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

export const bulkMarkAttendance = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { batchId, date, records } = req.body;
    const tenantId = req.tenantId!;
    const markedBy = req.user?.id || req.userId!;

    if (!batchId || !date || !Array.isArray(records) || records.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: batchId, date, records[]'
      });
    }

    const results = await Promise.allSettled(
      records.map((r: { studentId: string; status: 'present' | 'absent' | 'leave'; inTime?: string; outTime?: string; remarks?: string }) =>
        attendanceService.markAttendance(
          r.studentId, batchId, new Date(date),
          r.inTime, r.outTime, r.status, markedBy, tenantId, r.remarks
        )
      )
    );

    const saved = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;

    res.status(200).json({
      success: true,
      data: { saved, failed, total: records.length },
      message: `Bulk attendance: ${saved} saved, ${failed} failed`
    });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message || 'Bulk mark failed' });
  }
};

export const exportAttendanceCSV = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { batchId, startDate, endDate } = req.query;
    const tenantId = req.tenantId!;

    if (!batchId || !startDate || !endDate) {
      return res.status(400).json({ success: false, message: 'batchId, startDate, endDate required' });
    }

    const records = await Attendance.find({
      batchId,
      tenantId,
      date: {
        $gte: new Date(startDate as string),
        $lte: new Date(new Date(endDate as string).setHours(23, 59, 59, 999))
      }
    })
      .populate('studentId', 'firstName lastName email rollNumber')
      .populate('batchId', 'name')
      .sort({ date: 1, 'studentId.firstName': 1 });

    const lines: string[] = ['Date,Student Name,Roll Number,Email,Status,In Time,Out Time,Remarks'];
    for (const r of records as any[]) {
      const dateStr = new Date(r.date).toISOString().split('T')[0];
      const name = r.studentId ? `${r.studentId.firstName} ${r.studentId.lastName || ''}`.trim() : '';
      const roll = r.studentId?.rollNumber || '';
      const email = r.studentId?.email || '';
      const inT = r.inTime || '';
      const outT = r.outTime || '';
      const remarks = (r.remarks || '').replace(/,/g, ';');
      lines.push(`${dateStr},"${name}","${roll}","${email}",${r.status},${inT},${outT},"${remarks}"`);
    }

    const csv = lines.join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="attendance_${batchId}_${startDate}_${endDate}.csv"`);
    res.status(200).send(csv);
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message || 'CSV export failed' });
  }
};
