import Attendance from '../models/Attendance';
import Batch from '../models/Batch';
import User from '../models/User';
import { EmailService } from './emailService';

class AttendanceService {
  async markAttendance(
    studentId: string,
    batchId: string,
    date: Date,
    inTime: string | undefined,
    outTime: string | undefined,
    status: 'present' | 'absent' | 'leave',
    markedBy: string,
    tenantId: string,
    remarks?: string
  ) {
    // Check if batch exists and belongs to tenant
    const batch = await Batch.findOne({ _id: batchId, tenantId });
    if (!batch) {
      throw new Error('Batch not found');
    }

    // Get student details for email
    const student = await User.findOne({ _id: studentId, tenantId });
    if (!student) {
      throw new Error('Student not found');
    }

    // Check if attendance record already exists for this date
    const existingAttendance = await Attendance.findOne({
      studentId,
      batchId,
      date: {
        $gte: new Date(date.setHours(0, 0, 0, 0)),
        $lt: new Date(date.setHours(23, 59, 59, 999))
      },
      tenantId
    });

    let attendance;
    if (existingAttendance) {
      // Update existing record
      existingAttendance.inTime = inTime;
      existingAttendance.outTime = outTime;
      existingAttendance.status = status;
      existingAttendance.remarks = remarks;
      existingAttendance.markedBy = markedBy as any;
      attendance = await existingAttendance.save();
    } else {
      // Create new attendance record
      attendance = new Attendance({
        studentId,
        batchId,
        date: new Date(date.setHours(0, 0, 0, 0)),
        inTime,
        outTime,
        status,
        markedBy,
        tenantId,
        remarks
      });
      attendance = await attendance.save();
    }

    // Send email notification for absent or leave status
    if ((status === 'absent' || status === 'leave') && student.email) {
      const emailService = new EmailService();
      const studentName = `${student.firstName} ${student.lastName || ''}`.trim();
      
      try {
        await emailService.sendAttendanceNotificationEmail(
          student.email,
          studentName,
          status,
          new Date(date.setHours(0, 0, 0, 0)),
          batch.name,
          remarks
        );
      } catch (err) {
        console.error('Failed to send attendance notification email, but attendance record was saved:', err);
        // Don't throw - attendance should be saved even if email fails
      }
    }

    return attendance;
  }

  async getStudentAttendance(
    studentId: string,
    tenantId: string,
    startDate?: Date,
    endDate?: Date
  ) {
    const query: any = { studentId, tenantId };

    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = startDate;
      if (endDate) query.date.$lte = endDate;
    }

    return await Attendance.find(query)
      .populate('studentId', 'firstName lastName email')
      .populate('batchId', 'name')
      .populate('markedBy', 'firstName lastName')
      .sort({ date: -1 });
  }

  async getBatchAttendance(
    batchId: string,
    tenantId: string,
    date?: Date
  ) {
    const query: any = { batchId, tenantId };

    if (date) {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      query.date = {
        $gte: startOfDay,
        $lte: endOfDay
      };
    }

    return await Attendance.find(query)
      .populate('studentId', 'firstName lastName email')
      .populate('batchId', 'name')
      .populate('markedBy', 'firstName lastName')
      .sort({ date: -1 });
  }

  async getBatchAttendanceSummary(
    batchId: string,
    tenantId: string
  ) {
    // Get all students in this batch from enrollments
    const batch = await Batch.findOne({ _id: batchId, tenantId }).populate('instructors');
    if (!batch) {
      throw new Error('Batch not found');
    }

    // Get all attendance records for this batch
    const attendanceRecords = await Attendance.find({ batchId, tenantId })
      .populate('studentId', 'firstName lastName email');

    // Group by student and calculate stats
    const studentStats: any = {};

    attendanceRecords.forEach((record: any) => {
      const studentId = record.studentId._id.toString();
      if (!studentStats[studentId]) {
        studentStats[studentId] = {
          studentId: record.studentId._id,
          studentName: `${record.studentId.firstName} ${record.studentId.lastName}`,
          studentEmail: record.studentId.email,
          total: 0,
          present: 0,
          absent: 0,
          leave: 0,
          percentage: 0
        };
      }

      studentStats[studentId].total++;
      if (record.status === 'present') studentStats[studentId].present++;
      else if (record.status === 'absent') studentStats[studentId].absent++;
      else if (record.status === 'leave') studentStats[studentId].leave++;

      studentStats[studentId].percentage = Math.round(
        (studentStats[studentId].present / studentStats[studentId].total) * 100
      );
    });

    return Object.values(studentStats);
  }

  async getStudentAttendanceSummary(
    studentId: string,
    tenantId: string,
    batchId?: string
  ) {
    const query: any = { studentId, tenantId };
    if (batchId) query.batchId = batchId;

    const attendanceRecords = await Attendance.find(query);

    const summary = {
      total: attendanceRecords.length,
      present: 0,
      absent: 0,
      leave: 0,
      percentage: 0
    };

    attendanceRecords.forEach((record) => {
      if (record.status === 'present') summary.present++;
      else if (record.status === 'absent') summary.absent++;
      else if (record.status === 'leave') summary.leave++;
    });

    if (summary.total > 0) {
      summary.percentage = Math.round((summary.present / summary.total) * 100);
    }

    return summary;
  }

  async getAttendanceByDateRange(
    tenantId: string,
    batchId: string,
    startDate: Date,
    endDate: Date
  ) {
    const startOfDay = new Date(startDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(endDate);
    endOfDay.setHours(23, 59, 59, 999);

    return await Attendance.find({
      tenantId,
      batchId,
      date: {
        $gte: startOfDay,
        $lte: endOfDay
      }
    })
      .populate('studentId', 'firstName lastName email')
      .populate('batchId', 'name')
      .populate('markedBy', 'firstName lastName')
      .sort({ date: -1, 'studentId.firstName': 1 });
  }

  async deleteAttendance(attendanceId: string, tenantId: string) {
    const attendance = await Attendance.findOneAndDelete({
      _id: attendanceId,
      tenantId
    });

    if (!attendance) {
      throw new Error('Attendance record not found');
    }

    return attendance;
  }
}

export default new AttendanceService();
