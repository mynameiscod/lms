import User from '../models/User';
import Attendance from '../models/Attendance';
import QuizAttempt from '../models/QuizAttempt';
import Submission, { SubmissionStatus } from '../models/Submission';
import Fee from '../models/Fee';
import Interview from '../models/Interview';
import Exam from '../models/Exam';
import Batch from '../models/Batch';
import { resolveAssignedQuizzes, tallyStatuses } from './studentWorkService';

export interface StudentReportData {
  student: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
    batch?: { _id: string; name: string };
    joinedDate?: Date;
  };
  attendance: {
    total: number;
    present: number;
    absent: number;
    leave: number;
    lateArrivals: number;
    percentage: number;
    recentRecords: any[];
  };
  quizzes: {
    total: number;
    completed: number;
    passed: number;
    failed: number;
    averageScore: number;
    recentAttempts: any[];
  };
  assignments: {
    total: number;
    submitted: number;
    graded: number;
    pending: number;
    late: number;
    averageScore: number;
    recentSubmissions: any[];
  };
  fees: {
    totalAmount: number;
    paidAmount: number;
    dueAmount: number;
    status: string;
    payments: any[];
  };
  interviews: {
    total: number;
    mock: number;
    real: number;
    attended: number;
    passed: number;
    averageScore: number;
    communicationAvg: number;
    technicalAvg: number;
    recentInterviews: any[];
  };
  exams: {
    total: number;
    passed: number;
    failed: number;
    averagePercentage: number;
    recentExams: any[];
  };
}

export class StudentReportService {
  async getStudentReport(studentId: string, tenantId: string): Promise<StudentReportData | null> {
    // Get student info
    const student = await User.findOne({ _id: studentId, tenantId, role: 'STUDENT' })
      .populate('batchId', 'name')
      .select('firstName lastName email batchId batchJoinedDate');

    if (!student) return null;

    // Get attendance data
    const attendanceData = await this.getAttendanceData(studentId, tenantId);

    // Get quiz data — needs the batch to resolve what was actually assigned.
    const batchIdStr = student.batchId ? String((student.batchId as any)._id || student.batchId) : null;
    const quizData = await this.getQuizData(studentId, tenantId, batchIdStr);

    // Get assignment data
    const assignmentData = await this.getAssignmentData(studentId, tenantId);

    // Get fee data
    const feeData = await this.getFeeData(studentId, tenantId);

    // Get interview data
    const interviewData = await this.getInterviewData(studentId, tenantId);

    // Get exam data
    const examData = await this.getExamData(studentId, tenantId);

    return {
      student: {
        _id: student._id.toString(),
        firstName: student.firstName,
        lastName: student.lastName,
        email: student.email,
        batch: student.batchId ? { 
          _id: (student.batchId as any)._id?.toString() || '', 
          name: (student.batchId as any).name || '' 
        } : undefined,
        joinedDate: student.batchJoinedDate
      },
      attendance: attendanceData,
      quizzes: quizData,
      assignments: assignmentData,
      fees: feeData,
      interviews: interviewData,
      exams: examData
    };
  }

  private async getAttendanceData(studentId: string, tenantId: string) {
    const records = await Attendance.find({ studentId, tenantId })
      .sort({ date: -1 })
      .limit(30);

    const total = records.length;
    const present = records.filter(r => r.status === 'present').length;
    const absent = records.filter(r => r.status === 'absent').length;
    const leave = records.filter(r => r.status === 'leave').length;
    
    // Count late arrivals (in after 9:30 AM)
    const lateArrivals = records.filter(r => {
      if (r.status === 'present' && r.inTime) {
        const [hours, minutes] = r.inTime.split(':').map(Number);
        return hours > 9 || (hours === 9 && minutes > 30);
      }
      return false;
    }).length;

    return {
      total,
      present,
      absent,
      leave,
      lateArrivals,
      percentage: total > 0 ? Math.round((present / total) * 100) : 0,
      recentRecords: records.slice(0, 10)
    };
  }

  /**
   * `total` is the number of quizzes ASSIGNED to this student right now — not the
   * number of attempt rows on file. Those are different questions, and reporting the
   * second while the Quizzes tab lists the first is what made the profile contradict
   * itself: one student here showed "Total Quizzes 43" beside a tab listing 1, because
   * 34 of his 40 attempted quizzes were old content he can no longer see.
   */
  private async getQuizData(studentId: string, tenantId: string, batchId: string | null = null) {
    const assigned = await resolveAssignedQuizzes(tenantId, studentId, batchId);
    const tally = tallyStatuses(assigned.map(a => a.status));

    const attemptedRows = assigned
      .map(a => ({ a, at: a.latestAttempt }))
      .filter(x => !!x.at);

    const passed = attemptedRows.filter(({ a, at }) =>
      (at.obtainedMarks || 0) >= (a.quiz?.passingMarks || 0)).length;
    const failed = attemptedRows.length - passed;

    const totalScore = attemptedRows.reduce((s, { at }) => s + (at.obtainedMarks || 0), 0);
    const averageScore = attemptedRows.length > 0 ? Math.round(totalScore / attemptedRows.length) : 0;

    return {
      total: tally.total,               // assigned
      completed: tally.completed,       // actually submitted/graded
      pending: tally.pending,
      missed: tally.missed,
      passed,
      failed,
      averageScore,
      recentAttempts: attemptedRows.slice(0, 10).map(({ a, at }) => ({
        ...(typeof at.toObject === 'function' ? at.toObject() : at),
        quizId: { _id: a.quiz._id, title: a.quiz.title, totalMarks: a.quiz.totalMarks, passingMarks: a.quiz.passingMarks },
      })),
    };
  }

  private async getAssignmentData(studentId: string, tenantId: string) {
    const submissions = await Submission.find({ student: studentId, tenantId })
      .populate('assignment', 'title totalPoints passingPoints dueDate')
      .sort({ updatedAt: -1 });

    const submitted = submissions.filter(s => s.status !== SubmissionStatus.NOT_STARTED).length;
    const graded = submissions.filter(s => s.status === SubmissionStatus.GRADED).length;
    const pending = submissions.filter(s => s.status === SubmissionStatus.IN_PROGRESS || s.status === SubmissionStatus.SUBMITTED).length;
    
    // Count late submissions
    const late = submissions.filter(s => {
      const assignment = s.assignment as any;
      if (assignment?.dueDate && s.submittedAt) {
        return new Date(s.submittedAt) > new Date(assignment.dueDate);
      }
      return false;
    }).length;

    const gradedSubmissions = submissions.filter(s => s.status === SubmissionStatus.GRADED);
    const totalScore = gradedSubmissions.reduce((sum, s) => sum + (s.totalScore || 0), 0);
    const averageScore = gradedSubmissions.length > 0 ? Math.round(totalScore / gradedSubmissions.length) : 0;

    return {
      total: submissions.length,
      submitted,
      graded,
      pending,
      late,
      averageScore,
      recentSubmissions: submissions.slice(0, 10)
    };
  }

  private async getFeeData(studentId: string, tenantId: string) {
    const fee = await Fee.findOne({ studentId, tenantId })
      .populate('payments.receivedBy', 'firstName lastName');

    if (!fee) {
      return {
        totalAmount: 0,
        paidAmount: 0,
        dueAmount: 0,
        status: 'N/A',
        payments: []
      };
    }

    return {
      totalAmount: fee.totalAmount,
      paidAmount: fee.paidAmount,
      dueAmount: fee.dueAmount,
      status: fee.status,
      payments: fee.payments || []
    };
  }

  private async getInterviewData(studentId: string, tenantId: string) {
    const interviews = await Interview.find({ studentId, tenantId })
      .populate('interviewer', 'firstName lastName')
      .sort({ date: -1 });

    const mock = interviews.filter(i => i.type === 'mock').length;
    const real = interviews.filter(i => i.type === 'real').length;
    const attended = interviews.filter(i => i.status === 'completed').length;
    const passed = interviews.filter(i => i.result === 'pass').length;

    const completedInterviews = interviews.filter(i => i.status === 'completed');
    const totalScore = completedInterviews.reduce((sum, i) => sum + (i.scores?.overall || 0), 0);
    const averageScore = completedInterviews.length > 0 ? Math.round(totalScore / completedInterviews.length) : 0;

    const communicationScores = completedInterviews.filter(i => i.scores?.communication);
    const communicationAvg = communicationScores.length > 0 
      ? Math.round(communicationScores.reduce((sum, i) => sum + (i.scores?.communication || 0), 0) / communicationScores.length)
      : 0;

    const technicalScores = completedInterviews.filter(i => i.scores?.technical);
    const technicalAvg = technicalScores.length > 0
      ? Math.round(technicalScores.reduce((sum, i) => sum + (i.scores?.technical || 0), 0) / technicalScores.length)
      : 0;

    return {
      total: interviews.length,
      mock,
      real,
      attended,
      passed,
      averageScore,
      communicationAvg,
      technicalAvg,
      recentInterviews: interviews.slice(0, 10)
    };
  }

  private async getExamData(studentId: string, tenantId: string) {
    const exams = await Exam.find({ studentId, tenantId })
      .populate('conductedBy', 'firstName lastName')
      .sort({ date: -1 });

    const passed = exams.filter(e => e.result === 'pass').length;
    const failed = exams.filter(e => e.result === 'fail').length;

    const completedExams = exams.filter(e => e.result !== 'pending');
    const totalPercentage = completedExams.reduce((sum, e) => sum + (e.percentage || 0), 0);
    const averagePercentage = completedExams.length > 0 ? Math.round(totalPercentage / completedExams.length) : 0;

    return {
      total: exams.length,
      passed,
      failed,
      averagePercentage,
      recentExams: exams.slice(0, 10)
    };
  }

  async searchStudents(tenantId: string, query: string): Promise<any[]> {
    const searchRegex = new RegExp(query, 'i');
    
    const students = await User.find({
      tenantId,
      role: 'STUDENT',
      isActive: true,
      $or: [
        { firstName: searchRegex },
        { lastName: searchRegex },
        { email: searchRegex }
      ]
    })
    .populate('batchId', 'name')
    .select('firstName lastName email batchId')
    .limit(20);

    return students;
  }

  async getAllStudentsSummary(tenantId: string, batchId?: string): Promise<any[]> {
    const query: any = { tenantId, role: 'STUDENT', isActive: true };
    if (batchId) query.batchId = batchId;

    const students = await User.find(query)
      .populate('batchId', 'name')
      .select('firstName lastName email batchId')
      .sort({ firstName: 1 });

    // Get summary data for each student
    const summaries = await Promise.all(
      students.map(async (student) => {
        const attendance = await Attendance.countDocuments({ studentId: student._id, tenantId, status: 'present' });
        const totalAttendance = await Attendance.countDocuments({ studentId: student._id, tenantId });
        // QuizAttempt has no 'completed' status — the enum is
        // in_progress | submitted | abandoned | grading — so this counted zero for
        // every student on the list, including the 98 here who really had submitted.
        const quizzes = await QuizAttempt.countDocuments({
          studentId: student._id, tenantId, status: { $in: ['submitted', 'grading'] },
        });
        // Submission's fields are `student` and `tenant`, not studentId/tenantId, so
        // this silently matched nothing too.
        const assignments = await Submission.countDocuments({
          student: student._id, tenant: tenantId, status: 'GRADED',
        });

        return {
          _id: student._id,
          firstName: student.firstName,
          lastName: student.lastName,
          email: student.email,
          batch: student.batchId,
          attendancePercentage: totalAttendance > 0 ? Math.round((attendance / totalAttendance) * 100) : 0,
          quizzesCompleted: quizzes,
          assignmentsGraded: assignments
        };
      })
    );

    return summaries;
  }
}

export const studentReportService = new StudentReportService();
