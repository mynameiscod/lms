export interface User {
  _id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  tenantId: string;
  isActive: boolean;
}

export interface Tenant {
  _id: string;
  name: string;
  slug: string;
  logo?: string;
  subscriptionPlan: string;
  isActive: boolean;
}

export interface Course {
  _id: string;
  title: string;
  description: string;
  instructor: string | { firstName: string; lastName: string };
  tenantId: string;
  category: string;
  level: 'beginner' | 'intermediate' | 'advanced';
  isPublished: boolean;
  enrollmentCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface Lesson {
  _id: string;
  courseId: string;
  title: string;
  description: string;
  content: string;
  videoUrl?: string;
  order: number;
  createdAt: string;
}

export interface Enrollment {
  _id: string;
  userId: string;
  courseId: string;
  tenantId: string;
  status: 'enrolled' | 'completed' | 'dropped';
  progress: number;
  enrolledAt: string;
  completedAt?: string;
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
}

export interface Role {
  _id: string;
  name: string;
  permissions: string[];
  tenantId: string;
  createdAt: string;
  updatedAt: string;
}

export interface Batch {
  _id: string;
  name: string;
  startDate: string;
  endDate: string;
  timings: Array<{
    day: string;
    startTime: string;
    endTime: string;
  }>;
  instructors: Array<{
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
    role: string;
  }>;
  tenantId: string;
  isActive: boolean;
  capacity: number;
  enrolledCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface Attendance {
  _id: string;
  studentId: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  batchId: {
    _id: string;
    name: string;
  };
  date: string;
  inTime?: string;
  outTime?: string;
  status: 'present' | 'absent' | 'leave';
  markedBy: {
    _id: string;
    firstName: string;
    lastName: string;
  };
  remarks?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AttendanceSummary {
  total: number;
  present: number;
  absent: number;
  leave: number;
  percentage: number;
}

export interface StudentAttendanceSummary extends AttendanceSummary {
  studentId: string;
  studentName: string;
  studentEmail: string;
}