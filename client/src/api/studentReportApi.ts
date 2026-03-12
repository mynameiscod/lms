const API_BASE_URL = process.env.REACT_APP_API_URL || '/api/v1';

const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  const tenantId = localStorage.getItem('tenantId');
  
  return {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` }),
    ...(tenantId && { 'X-Tenant-Id': tenantId })
  };
};

export interface StudentReportData {
  student: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
    batch?: { _id: string; name: string };
    joinedDate?: string;
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

export interface StudentSummary {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  batch?: { _id: string; name: string };
  attendancePercentage: number;
  quizzesCompleted: number;
  assignmentsGraded: number;
}

export const searchStudents = async (query: string): Promise<StudentSummary[]> => {
  const response = await fetch(`${API_BASE_URL}/student-reports/search?q=${encodeURIComponent(query)}`, {
    method: 'GET',
    headers: getAuthHeaders()
  });
  if (!response.ok) throw new Error('Failed to search students');
  const data = await response.json();
  return data.data;
};

export const getStudentReport = async (studentId: string): Promise<StudentReportData> => {
  const response = await fetch(`${API_BASE_URL}/student-reports/${studentId}`, {
    method: 'GET',
    headers: getAuthHeaders()
  });
  if (!response.ok) throw new Error('Failed to fetch student report');
  const data = await response.json();
  return data.data;
};

export const getAllStudentsSummary = async (batchId?: string): Promise<StudentSummary[]> => {
  const url = batchId 
    ? `${API_BASE_URL}/student-reports/summary?batchId=${batchId}`
    : `${API_BASE_URL}/student-reports/summary`;
  const response = await fetch(url, {
    method: 'GET',
    headers: getAuthHeaders()
  });
  if (!response.ok) throw new Error('Failed to fetch student summary');
  const data = await response.json();
  return data.data;
};
