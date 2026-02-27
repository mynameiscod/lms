const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api/v1';

const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  const tenantId = localStorage.getItem('tenantId');
  
  return {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` }),
    ...(tenantId && { 'X-Tenant-Id': tenantId })
  };
};

// Auth API
export const authApi = {
  login: async (email: string, password: string) => {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    if (!response.ok) throw new Error('Login failed');
    return response.json();
  },

  register: async (firstName: string, lastName: string, email: string, password: string, tenantId: string) => {
    const response = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ firstName, lastName, email, password, tenantId })
    });
    if (!response.ok) throw new Error('Registration failed');
    return response.json();
  }
};

// Course API
export const courseApi = {
  getCourses: async () => {
    const response = await fetch(`${API_BASE_URL}/courses`, {
      method: 'GET',
      headers: getAuthHeaders()
    });
    if (!response.ok) throw new Error('Failed to fetch courses');
    return response.json();
  },

  getCourseById: async (courseId: string) => {
    const response = await fetch(`${API_BASE_URL}/courses/${courseId}`, {
      method: 'GET',
      headers: getAuthHeaders()
    });
    if (!response.ok) throw new Error('Failed to fetch course');
    return response.json();
  },

  createCourse: async (courseData: any) => {
    const response = await fetch(`${API_BASE_URL}/courses`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(courseData)
    });
    if (!response.ok) throw new Error('Failed to create course');
    return response.json();
  }
};

// Enrollment API
export const enrollmentApi = {
  enrollCourse: async (courseId: string) => {
    const response = await fetch(`${API_BASE_URL}/enrollments/enroll`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ courseId })
    });
    if (!response.ok) throw new Error('Failed to enroll');
    return response.json();
  },

  getMyEnrollments: async () => {
    const response = await fetch(`${API_BASE_URL}/enrollments/my-enrollments`, {
      method: 'GET',
      headers: getAuthHeaders()
    });
    if (!response.ok) throw new Error('Failed to fetch enrollments');
    return response.json();
  },

  getCourseEnrollments: async (courseId: string) => {
    const response = await fetch(`${API_BASE_URL}/enrollments/${courseId}`, {
      method: 'GET',
      headers: getAuthHeaders()
    });
    if (!response.ok) throw new Error('Failed to fetch enrollments');
    return response.json();
  }
};

// User API
export const userApi = {
  createUser: async (email: string, firstName: string, lastName: string, password: string, role: string) => {
    const response = await fetch(`${API_BASE_URL}/users`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ email, firstName, lastName, password, role })
    });
    if (!response.ok) throw new Error('Failed to create user');
    return response.json();
  },

  getUsers: async () => {
    const response = await fetch(`${API_BASE_URL}/users`, {
      method: 'GET',
      headers: getAuthHeaders()
    });
    if (!response.ok) throw new Error('Failed to fetch users');
    return response.json();
  },

  getUserById: async (userId: string) => {
    const response = await fetch(`${API_BASE_URL}/users/${userId}`, {
      method: 'GET',
      headers: getAuthHeaders()
    });
    if (!response.ok) throw new Error('Failed to fetch user');
    return response.json();
  },

  updateUserRole: async (userId: string, role: string) => {
    const response = await fetch(`${API_BASE_URL}/users/${userId}/role`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify({ role })
    });
    if (!response.ok) throw new Error('Failed to update user role');
    return response.json();
  },

  activateUser: async (userId: string) => {
    const response = await fetch(`${API_BASE_URL}/users/${userId}/activate`, {
      method: 'PATCH',
      headers: getAuthHeaders()
    });
    if (!response.ok) throw new Error('Failed to activate user');
    return response.json();
  },

  deactivateUser: async (userId: string) => {
    const response = await fetch(`${API_BASE_URL}/users/${userId}/deactivate`, {
      method: 'PATCH',
      headers: getAuthHeaders()
    });
    if (!response.ok) throw new Error('Failed to deactivate user');
    return response.json();
  },

  deleteUser: async (userId: string) => {
    const response = await fetch(`${API_BASE_URL}/users/${userId}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    if (!response.ok) throw new Error('Failed to delete user');
    return response.json();
  }
};

// Tenant API
export const tenantApi = {
  getTenant: async (tenantId: string) => {
    const response = await fetch(`${API_BASE_URL}/tenants/${tenantId}`, {
      method: 'GET',
      headers: getAuthHeaders()
    });
    if (!response.ok) throw new Error('Failed to fetch tenant');
    return response.json();
  },

  createTenant: async (name: string, slug: string, adminId: string) => {
    const response = await fetch(`${API_BASE_URL}/tenants`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ name, slug, adminId })
    });
    if (!response.ok) throw new Error('Failed to create tenant');
    return response.json();
  }
};

// Role API
export const roleApi = {
  getRoles: async () => {
    const response = await fetch(`${API_BASE_URL}/roles`, {
      method: 'GET',
      headers: getAuthHeaders()
    });
    if (!response.ok) throw new Error('Failed to fetch roles');
    return response.json();
  },

  getRoleById: async (roleId: string) => {
    const response = await fetch(`${API_BASE_URL}/roles/${roleId}`, {
      method: 'GET',
      headers: getAuthHeaders()
    });
    if (!response.ok) throw new Error('Failed to fetch role');
    return response.json();
  },

  createRole: async (name: string, permissions: string[]) => {
    const response = await fetch(`${API_BASE_URL}/roles`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ name, permissions })
    });
    if (!response.ok) throw new Error('Failed to create role');
    return response.json();
  },

  updateRole: async (roleId: string, data: { name?: string; permissions?: string[] }) => {
    const response = await fetch(`${API_BASE_URL}/roles/${roleId}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data)
    });
    if (!response.ok) throw new Error('Failed to update role');
    return response.json();
  },

  deleteRole: async (roleId: string) => {
    const response = await fetch(`${API_BASE_URL}/roles/${roleId}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    if (!response.ok) throw new Error('Failed to delete role');
    return response.json();
  },

  addPermissions: async (roleId: string, permissions: string[]) => {
    const response = await fetch(`${API_BASE_URL}/roles/${roleId}/permissions`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ permissions })
    });
    if (!response.ok) throw new Error('Failed to add permissions');
    return response.json();
  },

  removePermissions: async (roleId: string, permissions: string[]) => {
    const response = await fetch(`${API_BASE_URL}/roles/${roleId}/permissions`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
      body: JSON.stringify({ permissions })
    });
    if (!response.ok) throw new Error('Failed to remove permissions');
    return response.json();
  }
};

// Batch API
export const batchApi = {
  getBatches: async () => {
    const response = await fetch(`${API_BASE_URL}/batches`, {
      method: 'GET',
      headers: getAuthHeaders()
    });
    if (!response.ok) throw new Error('Failed to fetch batches');
    return response.json();
  },

  getBatchById: async (batchId: string) => {
    const response = await fetch(`${API_BASE_URL}/batches/${batchId}`, {
      method: 'GET',
      headers: getAuthHeaders()
    });
    if (!response.ok) throw new Error('Failed to fetch batch');
    return response.json();
  },

  createBatch: async (data: {
    name: string;
    startDate: string;
    endDate: string;
    timings: Array<{ day: string; startTime: string; endTime: string }>;
    instructors: string[];
    capacity?: number;
  }) => {
    const response = await fetch(`${API_BASE_URL}/batches`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data)
    });
    if (!response.ok) throw new Error('Failed to create batch');
    return response.json();
  },

  updateBatch: async (batchId: string, data: any) => {
    const response = await fetch(`${API_BASE_URL}/batches/${batchId}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data)
    });
    if (!response.ok) throw new Error('Failed to update batch');
    return response.json();
  },

  deleteBatch: async (batchId: string) => {
    const response = await fetch(`${API_BASE_URL}/batches/${batchId}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    if (!response.ok) throw new Error('Failed to delete batch');
    return response.json();
  },

  deactivateBatch: async (batchId: string) => {
    const response = await fetch(`${API_BASE_URL}/batches/${batchId}/deactivate`, {
      method: 'PATCH',
      headers: getAuthHeaders()
    });
    if (!response.ok) throw new Error('Failed to deactivate batch');
    return response.json();
  },

  activateBatch: async (batchId: string) => {
    const response = await fetch(`${API_BASE_URL}/batches/${batchId}/activate`, {
      method: 'PATCH',
      headers: getAuthHeaders()
    });
    if (!response.ok) throw new Error('Failed to activate batch');
    return response.json();
  },

  addInstructor: async (batchId: string, instructorId: string) => {
    const response = await fetch(`${API_BASE_URL}/batches/${batchId}/instructors`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ instructorId })
    });
    if (!response.ok) throw new Error('Failed to add instructor');
    return response.json();
  },

  removeInstructor: async (batchId: string, instructorId: string) => {
    const response = await fetch(`${API_BASE_URL}/batches/${batchId}/instructors`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
      body: JSON.stringify({ instructorId })
    });
    if (!response.ok) throw new Error('Failed to remove instructor');
    return response.json();
  }
};

// Attendance API
export const attendanceApi = {
  markAttendance: async (data: {
    studentId: string;
    batchId: string;
    date: string;
    inTime?: string;
    outTime?: string;
    status: 'present' | 'absent' | 'leave';
    remarks?: string;
  }) => {
    const response = await fetch(`${API_BASE_URL}/attendance`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data)
    });
    if (!response.ok) throw new Error('Failed to mark attendance');
    return response.json();
  },

  getStudentAttendance: async (studentId: string, startDate?: string, endDate?: string) => {
    let url = `${API_BASE_URL}/attendance/student/${studentId}`;
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    if (params.toString()) url += `?${params.toString()}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: getAuthHeaders()
    });
    if (!response.ok) throw new Error('Failed to fetch student attendance');
    return response.json();
  },

  getBatchAttendance: async (batchId: string, date?: string) => {
    let url = `${API_BASE_URL}/attendance/batch/${batchId}/date`;
    if (date) url += `?date=${date}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: getAuthHeaders()
    });
    if (!response.ok) throw new Error('Failed to fetch batch attendance');
    return response.json();
  },

  getBatchAttendanceSummary: async (batchId: string) => {
    const response = await fetch(`${API_BASE_URL}/attendance/batch/${batchId}/summary`, {
      method: 'GET',
      headers: getAuthHeaders()
    });
    if (!response.ok) throw new Error('Failed to fetch batch attendance summary');
    return response.json();
  },

  getStudentAttendanceSummary: async (studentId: string, batchId?: string) => {
    let url = `${API_BASE_URL}/attendance/student/${studentId}/summary`;
    if (batchId) url += `?batchId=${batchId}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: getAuthHeaders()
    });
    if (!response.ok) throw new Error('Failed to fetch student attendance summary');
    return response.json();
  },

  getAttendanceByDateRange: async (batchId: string, startDate: string, endDate: string) => {
    const url = `${API_BASE_URL}/attendance/range?batchId=${batchId}&startDate=${startDate}&endDate=${endDate}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: getAuthHeaders()
    });
    if (!response.ok) throw new Error('Failed to fetch attendance records');
    return response.json();
  },

  deleteAttendance: async (attendanceId: string) => {
    const response = await fetch(`${API_BASE_URL}/attendance/${attendanceId}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    if (!response.ok) throw new Error('Failed to delete attendance record');
    return response.json();
  }
};

// Quiz API
export const quizApi = {
  // Quiz CRUD
  createQuiz: async (quizData: any) => {
    const response = await fetch(`${API_BASE_URL}/quizzes`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(quizData)
    });
    if (!response.ok) throw new Error('Failed to create quiz');
    return response.json();
  },

  getQuizzes: async () => {
    const response = await fetch(`${API_BASE_URL}/quizzes/instructor`, {
      method: 'GET',
      headers: getAuthHeaders()
    });
    if (!response.ok) throw new Error('Failed to fetch quizzes');
    return response.json();
  },

  getQuizById: async (quizId: string) => {
    const response = await fetch(`${API_BASE_URL}/quizzes/${quizId}`, {
      method: 'GET',
      headers: getAuthHeaders()
    });
    if (!response.ok) throw new Error('Failed to fetch quiz');
    return response.json();
  },

  updateQuiz: async (quizId: string, updateData: any) => {
    const response = await fetch(`${API_BASE_URL}/quizzes/${quizId}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(updateData)
    });
    if (!response.ok) throw new Error('Failed to update quiz');
    return response.json();
  },

  deleteQuiz: async (quizId: string) => {
    const response = await fetch(`${API_BASE_URL}/quizzes/${quizId}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    if (!response.ok) throw new Error('Failed to delete quiz');
    return response.json();
  },

  getAvailableQuizzes: async () => {
    const response = await fetch(`${API_BASE_URL}/quizzes/student/available`, {
      method: 'GET',
      headers: getAuthHeaders()
    });
    if (!response.ok) throw new Error('Failed to fetch available quizzes');
    return response.json();
  },

  checkQuizAccess: async (quizId: string) => {
    const response = await fetch(`${API_BASE_URL}/quizzes/${quizId}/access`, {
      method: 'GET',
      headers: getAuthHeaders()
    });
    if (!response.ok) throw new Error('Failed to check quiz access');
    return response.json();
  },

  checkQuizAvailability: async (quizId: string) => {
    const response = await fetch(`${API_BASE_URL}/quizzes/${quizId}/availability`, {
      method: 'GET',
      headers: getAuthHeaders()
    });
    if (!response.ok) throw new Error('Failed to check quiz availability');
    return response.json();
  },

  // Quiz Attempt
  startAttempt: async (quizId: string) => {
    const response = await fetch(`${API_BASE_URL}/quizzes/${quizId}/start`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({})
    });
    if (!response.ok) throw new Error('Failed to start quiz attempt');
    return response.json();
  },

  getQuestions: async (quizId: string) => {
    const response = await fetch(`${API_BASE_URL}/quizzes/${quizId}/questions`, {
      method: 'GET',
      headers: getAuthHeaders()
    });
    if (!response.ok) throw new Error('Failed to fetch quiz questions');
    return response.json();
  },

  submitAttempt: async (quizId: string, attemptId: string, answers: any[]) => {
    const response = await fetch(
      `${API_BASE_URL}/quizzes/${quizId}/attempt/${attemptId}/submit`,
      {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ answers })
      }
    );
    if (!response.ok) throw new Error('Failed to submit quiz attempt');
    return response.json();
  },

  getResults: async (attemptId: string) => {
    const response = await fetch(`${API_BASE_URL}/quizzes/attempt/${attemptId}/results`, {
      method: 'GET',
      headers: getAuthHeaders()
    });
    if (!response.ok) throw new Error('Failed to fetch quiz results');
    return response.json();
  },

  // Questions
  createQuestion: async (quizId: string, questionData: any) => {
    const response = await fetch(`${API_BASE_URL}/quizzes/${quizId}/questions`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(questionData)
    });
    if (!response.ok) throw new Error('Failed to create question');
    return response.json();
  },

  getQuestionsWithAnswers: async (quizId: string) => {
    const response = await fetch(
      `${API_BASE_URL}/quizzes/${quizId}/questions/list?includeAnswers=true`,
      {
        method: 'GET',
        headers: getAuthHeaders()
      }
    );
    if (!response.ok) throw new Error('Failed to fetch questions');
    return response.json();
  },

  updateQuestion: async (quizId: string, questionId: string, updateData: any) => {
    const response = await fetch(
      `${API_BASE_URL}/quizzes/${quizId}/questions/${questionId}`,
      {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(updateData)
      }
    );
    if (!response.ok) throw new Error('Failed to update question');
    return response.json();
  },

  deleteQuestion: async (quizId: string, questionId: string) => {
    const response = await fetch(
      `${API_BASE_URL}/quizzes/${quizId}/questions/${questionId}`,
      {
        method: 'DELETE',
        headers: getAuthHeaders()
      }
    );
    if (!response.ok) throw new Error('Failed to delete question');
    return response.json();
  },

  bulkCreateQuestions: async (quizId: string, questions: any[]) => {
    const response = await fetch(`${API_BASE_URL}/quizzes/${quizId}/questions/bulk`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ questions })
    });
    if (!response.ok) throw new Error('Failed to bulk create questions');
    return response.json();
  }
};
