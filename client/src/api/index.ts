// Use relative URL (no hardcoded domain) - works with any deployment
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

// Wrapper for authenticated API calls with proper error handling
const authenticatedFetch = async (url: string, options: RequestInit = {}) => {
  const token = localStorage.getItem('token');
  const tenantId = localStorage.getItem('tenantId');
  
  console.log('[API] authenticatedFetch called:', {
    url,
    method: options.method || 'GET',
    hasToken: !!token,
    hasTenantId: !!tenantId,
    tokenPreview: token ? `${token.substring(0, 20)}...` : null
  });
  
  if (!token && !url.includes('/auth/')) {
    const errorMsg = 'Authentication required. Please log in first.';
    console.error('[API]', errorMsg);
    throw new Error(errorMsg);
  }

  const headers = {
    ...getAuthHeaders(),
    ...options.headers
  };

  console.log('[API] Request headers:', {
    'Content-Type': headers['Content-Type'],
    'Authorization': headers['Authorization'] ? `${headers['Authorization'].substring(0, 20)}...` : 'Missing',
    'X-Tenant-Id': headers['X-Tenant-Id']
  });

  const response = await fetch(url, {
    ...options,
    headers
  });

  console.log('[API] Response:', { url, status: response.status });

  // Handle 401 Unauthorized - user session expired or account deactivated
  if (response.status === 401) {
    const errorData = await response.json().catch(() => ({ message: 'Session expired' }));
    console.log('[API] 401 Unauthorized - clearing session and redirecting to login');
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('tenantId');
    
    // Redirect to login with appropriate message
    const message = errorData.code === 'ACCOUNT_DEACTIVATED' 
      ? 'Your account has been deactivated. Please contact your administrator.'
      : 'Your session has expired. Please log in again.';
    
    // Store message to show on login page
    localStorage.setItem('loginMessage', message);
    
    // Redirect to login - use replace to ensure navigation happens immediately
    window.location.replace('/login');
    
    // Return a never-resolving promise to prevent further code execution
    return new Promise(() => {});
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: response.statusText }));
    console.error('[API] Request failed:', { status: response.status, error });
    throw new Error(error.message || `API Error: ${response.status}`);
  }

  return response.json();
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
  },

  inviteStudent: async (email: string, firstName: string, lastName: string, batchId?: string) => {
    const response = await fetch(`${API_BASE_URL}/users/invite/student`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ email, firstName, lastName, batchId })
    });
    if (!response.ok) throw new Error('Failed to invite student');
    return response.json();
  },

  updateProfile: async (userId: string, profileData: any) => {
    const response = await fetch(`${API_BASE_URL}/users/${userId}/profile`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify(profileData)
    });
    if (!response.ok) throw new Error('Failed to update profile');
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
  },

  generateInviteLink: async (tenantId: string) => {
    const response = await fetch(`${API_BASE_URL}/tenants/${tenantId}/invite-link`, {
      method: 'GET',
      headers: getAuthHeaders()
    });
    if (!response.ok) throw new Error('Failed to generate invite link');
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
    try {
      const response = await fetch(`${API_BASE_URL}/attendance`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(data)
      });
      
      const responseData = await response.json().catch(() => ({}));
      
      if (!response.ok) {
        const errorMsg = responseData?.message || responseData?.error || 'Failed to mark attendance';
        throw new Error(errorMsg);
      }
      
      return responseData;
    } catch (error: any) {
      console.error('[API] markAttendance error:', error);
      throw error;
    }
  },

  getStudentAttendance: async (studentId: string, startDate?: string, endDate?: string) => {
    try {
      let url = `${API_BASE_URL}/attendance/student/${studentId}`;
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      if (params.toString()) url += `?${params.toString()}`;

      const response = await fetch(url, {
        method: 'GET',
        headers: getAuthHeaders()
      });
      
      const responseData = await response.json().catch(() => ({}));
      
      if (!response.ok) {
        const errorMsg = responseData?.message || responseData?.error || 'Failed to fetch student attendance';
        throw new Error(errorMsg);
      }
      
      return responseData;
    } catch (error: any) {
      console.error('[API] getStudentAttendance error:', error);
      throw error;
    }
  },

  getBatchAttendance: async (batchId: string, date?: string) => {
    try {
      let url = `${API_BASE_URL}/attendance/batch/${batchId}/date`;
      if (date) url += `?date=${date}`;

      const response = await fetch(url, {
        method: 'GET',
        headers: getAuthHeaders()
      });
      
      const responseData = await response.json().catch(() => ({}));
      
      if (!response.ok) {
        const errorMsg = responseData?.message || responseData?.error || 'Failed to fetch batch attendance';
        throw new Error(errorMsg);
      }
      
      return responseData;
    } catch (error: any) {
      console.error('[API] getBatchAttendance error:', error);
      throw error;
    }
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
    return authenticatedFetch(`${API_BASE_URL}/quizzes`, {
      method: 'POST',
      body: JSON.stringify(quizData)
    });
  },

  getQuizzes: async () => {
    return authenticatedFetch(`${API_BASE_URL}/quizzes/instructor`, {
      method: 'GET'
    });
  },

  getQuizById: async (quizId: string) => {
    return authenticatedFetch(`${API_BASE_URL}/quizzes/${quizId}`, {
      method: 'GET'
    });
  },

  updateQuiz: async (quizId: string, updateData: any) => {
    return authenticatedFetch(`${API_BASE_URL}/quizzes/${quizId}`, {
      method: 'PUT',
      body: JSON.stringify(updateData)
    });
  },

  deleteQuiz: async (quizId: string) => {
    return authenticatedFetch(`${API_BASE_URL}/quizzes/${quizId}`, {
      method: 'DELETE'
    });
  },

  getAvailableQuizzes: async () => {
    return authenticatedFetch(`${API_BASE_URL}/quizzes/student/available`, {
      method: 'GET'
    });
  },

  checkQuizAccess: async (quizId: string) => {
    return authenticatedFetch(`${API_BASE_URL}/quizzes/${quizId}/access`, {
      method: 'GET'
    });
  },

  checkQuizAvailability: async (quizId: string) => {
    return authenticatedFetch(`${API_BASE_URL}/quizzes/${quizId}/availability`, {
      method: 'GET'
    });
  },

  // Quiz Attempt
  startAttempt: async (quizId: string) => {
    return authenticatedFetch(`${API_BASE_URL}/quizzes/${quizId}/start`, {
      method: 'POST',
      body: JSON.stringify({})
    });
  },

  getQuestions: async (quizId: string) => {
    return authenticatedFetch(`${API_BASE_URL}/quizzes/${quizId}/questions`, {
      method: 'GET'
    });
  },

  submitAttempt: async (quizId: string, attemptId: string, answers: any[]) => {
    return authenticatedFetch(
      `${API_BASE_URL}/quizzes/${quizId}/attempt/${attemptId}/submit`,
      {
        method: 'POST',
        body: JSON.stringify({ answers })
      }
    );
  },

  getResults: async (attemptId: string) => {
    return authenticatedFetch(`${API_BASE_URL}/quizzes/attempt/${attemptId}/results`, {
      method: 'GET'
    });
  },

  getLatestAttempt: async (quizId: string) => {
    return authenticatedFetch(`${API_BASE_URL}/quizzes/${quizId}/attempts/latest`, {
      method: 'GET'
    });
  },

  getStudentAttemptResults: async (attemptId: string) => {
    return authenticatedFetch(`${API_BASE_URL}/quiz-attempts/${attemptId}/results`, {
      method: 'GET'
    });
  },

  // Questions
  createQuestion: async (quizId: string, questionData: any) => {
    // Map frontend field names to backend field names
    const mappedData = {
      ...questionData,
      question: questionData.questionText,
      difficultyLevel: questionData.difficulty
    };
    delete mappedData.questionText;
    delete mappedData.difficulty;
    
    return authenticatedFetch(`${API_BASE_URL}/quizzes/${quizId}/questions`, {
      method: 'POST',
      body: JSON.stringify(mappedData)
    });
  },

  getQuestionsWithAnswers: async (quizId: string) => {
    return authenticatedFetch(
      `${API_BASE_URL}/quizzes/${quizId}/questions/list?includeAnswers=true`,
      {
        method: 'GET'
      }
    );
  },

  updateQuestion: async (quizId: string, questionId: string, updateData: any) => {
    // Map frontend field names to backend field names
    const mappedData = {
      ...updateData,
      question: updateData.questionText,
      difficultyLevel: updateData.difficulty
    };
    delete mappedData.questionText;
    delete mappedData.difficulty;
    
    return authenticatedFetch(
      `${API_BASE_URL}/quizzes/${quizId}/questions/${questionId}`,
      {
        method: 'PUT',
        body: JSON.stringify(mappedData)
      }
    );
  },

  deleteQuestion: async (quizId: string, questionId: string) => {
    return authenticatedFetch(
      `${API_BASE_URL}/quizzes/${quizId}/questions/${questionId}`,
      {
        method: 'DELETE'
      }
    );
  },

  bulkCreateQuestions: async (quizId: string, questions: any[]) => {
    // Map frontend field names to backend field names for each question
    const mappedQuestions = questions.map(q => ({
      ...q,
      question: q.questionText,
      difficultyLevel: q.difficulty
    })).map(q => {
      delete q.questionText;
      delete q.difficulty;
      return q;
    });
    
    return authenticatedFetch(`${API_BASE_URL}/quizzes/${quizId}/questions/bulk`, {
      method: 'POST',
      body: JSON.stringify({ questions: mappedQuestions })
    });
  },

  // ========== QUESTION BANK METHODS ==========

  // Create a question in the Question Bank
  createQuestionBankQuestion: async (questionData: any) => {
    return authenticatedFetch(`${API_BASE_URL}/questions/bank/create`, {
      method: 'POST',
      body: JSON.stringify(questionData)
    });
  },

  // Get all questions in the Question Bank
  getQuestionBank: async (filters?: { tags?: string[]; difficulty?: string; type?: string; source?: string; search?: string }) => {
    const params = new URLSearchParams();
    if (filters?.tags?.length) params.append('tags', filters.tags.join(','));
    if (filters?.difficulty) params.append('difficulty', filters.difficulty);
    if (filters?.type) params.append('type', filters.type);
    if (filters?.source) params.append('source', filters.source);
    if (filters?.search) params.append('search', filters.search);

    const queryString = params.toString();
    const url = `${API_BASE_URL}/questions/bank/list${queryString ? `?${queryString}` : ''}`;

    return authenticatedFetch(url, { method: 'GET' });
  },

  // Search questions in the Question Bank
  searchQuestions: async (searchTerm: string) => {
    return authenticatedFetch(`${API_BASE_URL}/questions/bank/search?q=${encodeURIComponent(searchTerm)}`, {
      method: 'GET'
    });
  },

  // Get questions by specific tags
  getQuestionsByTags: async (tags: string[]) => {
    return authenticatedFetch(
      `${API_BASE_URL}/questions/bank/tags?tags=${tags.join(',')}`,
      { method: 'GET' }
    );
  },

  // Get all available tags
  getAllTags: async () => {
    return authenticatedFetch(`${API_BASE_URL}/questions/bank/all-tags`, {
      method: 'GET'
    });
  },

  // Check for duplicate questions
  checkDuplicate: async (questionText: string) => {
    return authenticatedFetch(`${API_BASE_URL}/questions/bank/check-duplicate`, {
      method: 'POST',
      body: JSON.stringify({ questionText })
    });
  },

  // Get Question Bank statistics
  getQuestionBankStats: async () => {
    return authenticatedFetch(`${API_BASE_URL}/questions/bank/stats`, {
      method: 'GET'
    });
  },

  // Update a question in the Question Bank
  updateQuestionBankQuestion: async (questionId: string, updateData: any) => {
    return authenticatedFetch(`${API_BASE_URL}/questions/bank/${questionId}`, {
      method: 'PUT',
      body: JSON.stringify(updateData)
    });
  },

  // Delete a question from the Question Bank
  deleteQuestionBankQuestion: async (questionId: string) => {
    return authenticatedFetch(`${API_BASE_URL}/questions/bank/${questionId}`, {
      method: 'DELETE'
    });
  },

  // Mark a question as duplicate
  markAsDuplicate: async (questionId: string, duplicateOfId: string) => {
    return authenticatedFetch(`${API_BASE_URL}/questions/bank/${questionId}/mark-duplicate`, {
      method: 'POST',
      body: JSON.stringify({ duplicateOfId })
    });
  },

  // ========== QUESTION LINKING TO QUIZ ==========

  // Link multiple questions from Question Bank to a quiz
  linkQuestionsToQuiz: async (quizId: string, questionIds: string[]) => {
    return authenticatedFetch(`${API_BASE_URL}/quizzes/${quizId}/link-questions`, {
      method: 'POST',
      body: JSON.stringify({ questionIds })
    });
  },

  // Add a single question to a quiz
  addQuestionToQuiz: async (quizId: string, questionId: string) => {
    return authenticatedFetch(`${API_BASE_URL}/quizzes/${quizId}/add-question/${questionId}`, {
      method: 'POST',
      body: JSON.stringify({})
    });
  },

  // Remove a single question from a quiz
  removeQuestionFromQuiz: async (quizId: string, questionId: string) => {
    return authenticatedFetch(`${API_BASE_URL}/quizzes/${quizId}/remove-question/${questionId}`, {
      method: 'DELETE'
    });
  },

  // Remove all questions from a quiz
  removeAllQuestionsFromQuiz: async (quizId: string) => {
    return authenticatedFetch(`${API_BASE_URL}/quizzes/${quizId}/remove-all-questions`, {
      method: 'DELETE'
    });
  },

  // Get available questions from Question Bank for linking to a quiz
  getAvailableQuestions: async (quizId: string, filters?: { difficulty?: string; type?: string; tags?: string[] }) => {
    const params = new URLSearchParams();
    if (filters?.difficulty) params.append('difficulty', filters.difficulty);
    if (filters?.type) params.append('type', filters.type);
    if (filters?.tags?.length) params.append('tags', filters.tags.join(','));

    const queryString = params.toString();
    const url = `${API_BASE_URL}/quizzes/${quizId}/available-questions${queryString ? `?${queryString}` : ''}`;

    return authenticatedFetch(url, { method: 'GET' });
  },

  // ========== QUIZ REPORTS ==========

  // Get quiz report summary
  getQuizReportSummary: async (quizId: string) => {
    return authenticatedFetch(`${API_BASE_URL}/quizzes/${quizId}/report/summary`, {
      method: 'GET'
    });
  },

  // Get all quiz attempts
  getQuizAttempts: async (quizId: string, page?: number, limit?: number) => {
    const params = new URLSearchParams();
    if (page) params.append('page', page.toString());
    if (limit) params.append('limit', limit.toString());

    const queryString = params.toString();
    return authenticatedFetch(
      `${API_BASE_URL}/quizzes/${quizId}/report/attempts${queryString ? `?${queryString}` : ''}`,
      { method: 'GET' }
    );
  },

  // Get student performance report
  getStudentPerformanceReport: async (quizId: string) => {
    return authenticatedFetch(`${API_BASE_URL}/quizzes/${quizId}/report/student-performance`, {
      method: 'GET'
    });
  },

  // Get question analytics
  getQuestionAnalytics: async (quizId: string) => {
    return authenticatedFetch(`${API_BASE_URL}/quizzes/${quizId}/report/question-analytics`, {
      method: 'GET'
    });
  },

  // Get complete quiz report
  getCompleteQuizReport: async (quizId: string) => {
    return authenticatedFetch(`${API_BASE_URL}/quizzes/${quizId}/report/complete`, {
      method: 'GET'
    });
  },

  // Export quiz report as CSV
  exportQuizReportCSV: async (quizId: string) => {
    const token = localStorage.getItem('token');
    const tenantId = localStorage.getItem('tenantId');
    
    const headers: any = {
      ...(token && { 'Authorization': `Bearer ${token}` }),
      ...(tenantId && { 'X-Tenant-Id': tenantId })
    };

    const response = await fetch(`${API_BASE_URL}/quizzes/${quizId}/report/export-csv`, {
      method: 'GET',
      headers
    });

    if (!response.ok) {
      throw new Error('Failed to export CSV');
    }

    return response.text();
  },

  // Get top performers for a quiz
  getTopPerformers: async (quizId: string, limit?: number) => {
    const params = new URLSearchParams();
    if (limit) params.append('limit', limit.toString());

    const queryString = params.toString();
    return authenticatedFetch(
      `${API_BASE_URL}/quizzes/${quizId}/report/top-performers${queryString ? `?${queryString}` : ''}`,
      { method: 'GET' }
    );
  },

  // Get quiz distribution stats (sent to, pending, completed, in-progress)
  getQuizDistributionStats: async (quizId: string) => {
    return authenticatedFetch(
      `${API_BASE_URL}/quizzes/${quizId}/report/distribution`,
      { method: 'GET' }
    );
  },

  // Get all quizzes for reporting (with stats)
  getQuizzesForReporting: async () => {
    return authenticatedFetch(`${API_BASE_URL}/quizzes/report/list`, {
      method: 'GET'
    });
  },
};