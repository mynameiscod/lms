import { Response } from 'express';
import * as attendanceController from '../controllers/attendanceController';
import attendanceService from '../services/attendanceService';
import { AuthenticatedRequest } from '../types';

// Mock the attendance service
jest.mock('../services/attendanceService');

describe('Attendance Controller', () => {
  let mockRequest: Partial<AuthenticatedRequest>;
  let mockResponse: Partial<Response>;
  let jsonMock: jest.Mock;
  let statusMock: jest.Mock;

  beforeEach(() => {
    jsonMock = jest.fn().mockReturnValue(undefined);
    statusMock = jest.fn().mockReturnValue({ json: jsonMock });

    mockRequest = {
      body: {},
      params: {},
      query: {},
      user: { id: 'admin123', email: 'admin@test.com', role: 'ADMIN', tenantId: 'tenant123' },
      userId: 'admin123',
      tenantId: 'tenant123'
    };

    mockResponse = {
      status: statusMock,
      json: jsonMock
    };

    jest.clearAllMocks();
  });

  describe('markAttendance', () => {
    it('should mark attendance successfully with valid data', async () => {
      const attendanceData = {
        _id: 'attendance123',
        studentId: 'student123',
        batchId: 'batch123',
        date: new Date('2026-03-01'),
        status: 'present',
        inTime: '09:00',
        outTime: '17:00',
        markedBy: 'admin123',
        tenantId: 'tenant123'
      };

      mockRequest.body = {
        studentId: 'student123',
        batchId: 'batch123',
        date: '2026-03-01',
        status: 'present',
        inTime: '09:00',
        outTime: '17:00'
      };

      (attendanceService.markAttendance as jest.Mock).mockResolvedValue(attendanceData);

      await attendanceController.markAttendance(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        data: attendanceData,
        message: 'Attendance marked successfully'
      });
    });

    it('should mark attendance as absent', async () => {
      const attendanceData = {
        _id: 'attendance124',
        studentId: 'student124',
        batchId: 'batch123',
        date: new Date('2026-03-01'),
        status: 'absent',
        markedBy: 'admin123',
        tenantId: 'tenant123'
      };

      mockRequest.body = {
        studentId: 'student124',
        batchId: 'batch123',
        date: '2026-03-01',
        status: 'absent'
      };

      (attendanceService.markAttendance as jest.Mock).mockResolvedValue(attendanceData);

      await attendanceController.markAttendance(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        data: attendanceData,
        message: 'Attendance marked successfully'
      });
    });

    it('should mark attendance as leave', async () => {
      const attendanceData = {
        _id: 'attendance125',
        studentId: 'student125',
        batchId: 'batch123',
        date: new Date('2026-03-01'),
        status: 'leave',
        markedBy: 'admin123',
        tenantId: 'tenant123'
      };

      mockRequest.body = {
        studentId: 'student125',
        batchId: 'batch123',
        date: '2026-03-01',
        status: 'leave',
        remarks: 'Medical leave'
      };

      (attendanceService.markAttendance as jest.Mock).mockResolvedValue(attendanceData);

      await attendanceController.markAttendance(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(200);
    });

    it('should return 400 for missing required fields', async () => {
      mockRequest.body = {
        studentId: 'student123',
        batchId: 'batch123'
        // Missing date and status
      };

      await attendanceController.markAttendance(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        message: 'Missing required fields: studentId, batchId, date, status'
      });
    });

    it('should return 400 for invalid status', async () => {
      mockRequest.body = {
        studentId: 'student123',
        batchId: 'batch123',
        date: '2026-03-01',
        status: 'invalid_status'
      };

      await attendanceController.markAttendance(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        message: 'Invalid status. Must be one of: present, absent, leave'
      });
    });

    it('should handle service errors', async () => {
      const error = new Error('Database error');
      mockRequest.body = {
        studentId: 'student123',
        batchId: 'batch123',
        date: '2026-03-01',
        status: 'present'
      };

      (attendanceService.markAttendance as jest.Mock).mockRejectedValue(error);

      await attendanceController.markAttendance(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        message: 'Database error'
      });
    });
  });

  describe('getStudentAttendance', () => {
    it('should fetch student attendance successfully', async () => {
      const attendanceRecords = [
        {
          _id: 'att1',
          studentId: 'student123',
          status: 'present',
          date: new Date('2026-03-01')
        },
        {
          _id: 'att2',
          studentId: 'student123',
          status: 'absent',
          date: new Date('2026-03-02')
        }
      ];

      mockRequest.params = { studentId: 'student123' };
      mockRequest.query = {};

      (attendanceService.getStudentAttendance as jest.Mock).mockResolvedValue(attendanceRecords);

      await attendanceController.getStudentAttendance(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        data: attendanceRecords
      });
    });

    it('should fetch student attendance with date range', async () => {
      const attendanceRecords = [
        {
          _id: 'att1',
          studentId: 'student123',
          status: 'present',
          date: new Date('2026-03-01')
        }
      ];

      mockRequest.params = { studentId: 'student123' };
      mockRequest.query = {
        startDate: '2026-03-01',
        endDate: '2026-03-10'
      };

      (attendanceService.getStudentAttendance as jest.Mock).mockResolvedValue(attendanceRecords);

      await attendanceController.getStudentAttendance(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(attendanceService.getStudentAttendance).toHaveBeenCalledWith(
        'student123',
        'tenant123',
        new Date('2026-03-01'),
        new Date('2026-03-10')
      );
    });

    it('should return empty array when no attendance records found', async () => {
      mockRequest.params = { studentId: 'student999' };
      mockRequest.query = {};

      (attendanceService.getStudentAttendance as jest.Mock).mockResolvedValue([]);

      await attendanceController.getStudentAttendance(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        data: []
      });
    });
  });

  describe('getBatchAttendance', () => {
    it('should fetch batch attendance for specific date', async () => {
      const batchAttendance = [
        { studentId: 'student1', status: 'present' },
        { studentId: 'student2', status: 'absent' },
        { studentId: 'student3', status: 'leave' }
      ];

      mockRequest.params = { batchId: 'batch123' };
      mockRequest.query = { date: '2026-03-01' };

      (attendanceService.getBatchAttendance as jest.Mock).mockResolvedValue(batchAttendance);

      await attendanceController.getBatchAttendance(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        data: batchAttendance
      });
    });

    it('should handle missing date parameter', async () => {
      const batchAttendance = [
        { studentId: 'student1', status: 'present' }
      ];

      mockRequest.params = { batchId: 'batch123' };
      mockRequest.query = {};

      (attendanceService.getBatchAttendance as jest.Mock).mockResolvedValue(batchAttendance);

      await attendanceController.getBatchAttendance(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(200);
    });
  });

  describe('getBatchAttendanceSummary', () => {
    it('should fetch batch attendance summary with statistics', async () => {
      const summary = {
        batchId: 'batch123',
        totalStudents: 30,
        presentCount: 25,
        absentCount: 3,
        leaveCount: 2,
        attendancePercentage: 83.33,
        studentBreakdown: [
          {
            studentId: 'student1',
            name: 'John Doe',
            totalDays: 30,
            presentDays: 28,
            absentDays: 1,
            leaveDays: 1,
            attendancePercentage: 93.33
          }
        ]
      };

      mockRequest.params = { batchId: 'batch123' };

      (attendanceService.getBatchAttendanceSummary as jest.Mock).mockResolvedValue(summary);

      await attendanceController.getBatchAttendanceSummary(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        data: summary
      });
    });
  });

  describe('getStudentAttendanceSummary', () => {
    it('should fetch student attendance summary', async () => {
      const summary = {
        studentId: 'student123',
        totalDays: 30,
        presentDays: 25,
        absentDays: 3,
        leaveDays: 2,
        attendancePercentage: 83.33
      };

      mockRequest.params = { studentId: 'student123' };

      (attendanceService.getStudentAttendanceSummary as jest.Mock).mockResolvedValue(summary);

      await attendanceController.getStudentAttendanceSummary(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        data: summary
      });
    });
  });

  describe('deleteAttendance', () => {
    it('should delete attendance record successfully', async () => {
      mockRequest.params = { attendanceId: 'attendance123' };

      (attendanceService.deleteAttendance as jest.Mock).mockResolvedValue({ deletedCount: 1 });

      await attendanceController.deleteAttendance(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        message: 'Attendance record deleted successfully'
      });
    });

    it('should handle deletion errors', async () => {
      mockRequest.params = { attendanceId: 'invalid123' };

      (attendanceService.deleteAttendance as jest.Mock).mockRejectedValue(
        new Error('Attendance not found')
      );

      await attendanceController.deleteAttendance(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        message: 'Attendance not found'
      });
    });
  });
});
