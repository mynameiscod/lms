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

// Export for use in other API files
export { authenticatedFetch, API_BASE_URL };

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
  getCourses: async (filters?: { isActive?: boolean; isPublished?: boolean }) => {
    const params = new URLSearchParams();
    if (filters?.isActive !== undefined) params.append('isActive', String(filters.isActive));
    if (filters?.isPublished !== undefined) params.append('isPublished', String(filters.isPublished));
    const queryString = params.toString();
    const url = `${API_BASE_URL}/courses${queryString ? `?${queryString}` : ''}`;
    
    const response = await fetch(url, {
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
  },

  updateCourse: async (courseId: string, courseData: any) => {
    const response = await fetch(`${API_BASE_URL}/courses/${courseId}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(courseData)
    });
    if (!response.ok) throw new Error('Failed to update course');
    return response.json();
  },

  deleteCourse: async (courseId: string) => {
    const response = await fetch(`${API_BASE_URL}/courses/${courseId}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    if (!response.ok) throw new Error('Failed to delete course');
    return response.json();
  },

  toggleCourseStatus: async (courseId: string, status: { isActive?: boolean; isPublished?: boolean }) => {
    const response = await fetch(`${API_BASE_URL}/courses/${courseId}/status`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify(status)
    });
    if (!response.ok) throw new Error('Failed to update course status');
    return response.json();
  }
};

// Subject API
export const subjectApi = {
  getSubjects: async (filters?: { courseId?: string; isActive?: boolean }) => {
    const params = new URLSearchParams();
    if (filters?.courseId) params.append('courseId', filters.courseId);
    if (filters?.isActive !== undefined) params.append('isActive', String(filters.isActive));
    const queryString = params.toString();
    const url = `${API_BASE_URL}/subjects${queryString ? `?${queryString}` : ''}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: getAuthHeaders()
    });
    if (!response.ok) throw new Error('Failed to fetch subjects');
    return response.json();
  },

  getSubjectsByCourse: async (courseId: string) => {
    const response = await fetch(`${API_BASE_URL}/subjects/course/${courseId}`, {
      method: 'GET',
      headers: getAuthHeaders()
    });
    if (!response.ok) throw new Error('Failed to fetch subjects');
    return response.json();
  },

  getSubjectById: async (subjectId: string) => {
    const response = await fetch(`${API_BASE_URL}/subjects/${subjectId}`, {
      method: 'GET',
      headers: getAuthHeaders()
    });
    if (!response.ok) throw new Error('Failed to fetch subject');
    return response.json();
  },

  createSubject: async (subjectData: any) => {
    const response = await fetch(`${API_BASE_URL}/subjects`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(subjectData)
    });
    if (!response.ok) throw new Error('Failed to create subject');
    return response.json();
  },

  updateSubject: async (subjectId: string, subjectData: any) => {
    const response = await fetch(`${API_BASE_URL}/subjects/${subjectId}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(subjectData)
    });
    if (!response.ok) throw new Error('Failed to update subject');
    return response.json();
  },

  deleteSubject: async (subjectId: string) => {
    const response = await fetch(`${API_BASE_URL}/subjects/${subjectId}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    if (!response.ok) throw new Error('Failed to delete subject');
    return response.json();
  },

  reorderSubjects: async (courseId: string, orders: Array<{ subjectId: string; order: number }>) => {
    const response = await fetch(`${API_BASE_URL}/subjects/course/${courseId}/reorder`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({ orders })
    });
    if (!response.ok) throw new Error('Failed to reorder subjects');
    return response.json();
  }
};

// Chapter API
export const chapterApi = {
  getChapters: async (filters?: { subjectId?: string; courseId?: string; isActive?: boolean }) => {
    const params = new URLSearchParams();
    if (filters?.subjectId) params.append('subjectId', filters.subjectId);
    if (filters?.courseId) params.append('courseId', filters.courseId);
    if (filters?.isActive !== undefined) params.append('isActive', String(filters.isActive));
    const queryString = params.toString();
    const url = `${API_BASE_URL}/chapters${queryString ? `?${queryString}` : ''}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: getAuthHeaders()
    });
    if (!response.ok) throw new Error('Failed to fetch chapters');
    return response.json();
  },

  getChaptersBySubject: async (subjectId: string) => {
    const response = await fetch(`${API_BASE_URL}/chapters/subject/${subjectId}`, {
      method: 'GET',
      headers: getAuthHeaders()
    });
    if (!response.ok) throw new Error('Failed to fetch chapters');
    return response.json();
  },

  getChaptersByCourse: async (courseId: string) => {
    const response = await fetch(`${API_BASE_URL}/chapters/course/${courseId}`, {
      method: 'GET',
      headers: getAuthHeaders()
    });
    if (!response.ok) throw new Error('Failed to fetch chapters');
    return response.json();
  },

  getChapterById: async (chapterId: string) => {
    const response = await fetch(`${API_BASE_URL}/chapters/${chapterId}`, {
      method: 'GET',
      headers: getAuthHeaders()
    });
    if (!response.ok) throw new Error('Failed to fetch chapter');
    return response.json();
  },

  createChapter: async (chapterData: any) => {
    const response = await fetch(`${API_BASE_URL}/chapters`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(chapterData)
    });
    if (!response.ok) throw new Error('Failed to create chapter');
    return response.json();
  },

  updateChapter: async (chapterId: string, chapterData: any) => {
    const response = await fetch(`${API_BASE_URL}/chapters/${chapterId}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(chapterData)
    });
    if (!response.ok) throw new Error('Failed to update chapter');
    return response.json();
  },

  deleteChapter: async (chapterId: string) => {
    const response = await fetch(`${API_BASE_URL}/chapters/${chapterId}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    if (!response.ok) throw new Error('Failed to delete chapter');
    return response.json();
  },

  reorderChapters: async (subjectId: string, orders: Array<{ chapterId: string; order: number }>) => {
    const response = await fetch(`${API_BASE_URL}/chapters/subject/${subjectId}/reorder`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({ orders })
    });
    if (!response.ok) throw new Error('Failed to reorder chapters');
    return response.json();
  },

  // Content management
  addVideo: async (chapterId: string, videoData: { title: string; url: string; duration?: number; isRequired?: boolean }) => {
    const response = await fetch(`${API_BASE_URL}/chapters/${chapterId}/videos`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(videoData)
    });
    if (!response.ok) throw new Error('Failed to add video');
    return response.json();
  },

  removeVideo: async (chapterId: string, videoIndex: number) => {
    const response = await fetch(`${API_BASE_URL}/chapters/${chapterId}/videos/${videoIndex}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    if (!response.ok) throw new Error('Failed to remove video');
    return response.json();
  },

  addNote: async (chapterId: string, noteData: { title: string; content: string; attachmentUrl?: string }) => {
    const response = await fetch(`${API_BASE_URL}/chapters/${chapterId}/notes`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(noteData)
    });
    if (!response.ok) throw new Error('Failed to add note');
    return response.json();
  },

  removeNote: async (chapterId: string, noteIndex: number) => {
    const response = await fetch(`${API_BASE_URL}/chapters/${chapterId}/notes/${noteIndex}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    if (!response.ok) throw new Error('Failed to remove note');
    return response.json();
  }
};

// Topic API
export const topicApi = {
  getTopics: async (filters?: { chapterId?: string; subjectId?: string; courseId?: string; isActive?: boolean }) => {
    const params = new URLSearchParams();
    if (filters?.chapterId) params.append('chapterId', filters.chapterId);
    if (filters?.subjectId) params.append('subjectId', filters.subjectId);
    if (filters?.courseId) params.append('courseId', filters.courseId);
    if (filters?.isActive !== undefined) params.append('isActive', String(filters.isActive));
    const queryString = params.toString();
    const url = `${API_BASE_URL}/topics${queryString ? `?${queryString}` : ''}`;

    const response = await fetch(url, { method: 'GET', headers: getAuthHeaders() });
    if (!response.ok) throw new Error('Failed to fetch topics');
    return response.json();
  },

  getTopicsByChapter: async (chapterId: string) => {
    const response = await fetch(`${API_BASE_URL}/topics/chapter/${chapterId}`, {
      method: 'GET',
      headers: getAuthHeaders()
    });
    if (!response.ok) throw new Error('Failed to fetch topics');
    return response.json();
  },

  getTopicById: async (topicId: string) => {
    const response = await fetch(`${API_BASE_URL}/topics/${topicId}`, {
      method: 'GET',
      headers: getAuthHeaders()
    });
    if (!response.ok) throw new Error('Failed to fetch topic');
    return response.json();
  },

  createTopic: async (topicData: any) => {
    const response = await fetch(`${API_BASE_URL}/topics`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(topicData)
    });
    if (!response.ok) throw new Error('Failed to create topic');
    return response.json();
  },

  updateTopic: async (topicId: string, topicData: any) => {
    const response = await fetch(`${API_BASE_URL}/topics/${topicId}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(topicData)
    });
    if (!response.ok) throw new Error('Failed to update topic');
    return response.json();
  },

  deleteTopic: async (topicId: string) => {
    const response = await fetch(`${API_BASE_URL}/topics/${topicId}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    if (!response.ok) throw new Error('Failed to delete topic');
    return response.json();
  }
};

// SubTopic API
export const subTopicApi = {
  getSubTopics: async (filters?: { topicId?: string; chapterId?: string; courseId?: string; isActive?: boolean }) => {
    const params = new URLSearchParams();
    if (filters?.topicId) params.append('topicId', filters.topicId);
    if (filters?.chapterId) params.append('chapterId', filters.chapterId);
    if (filters?.courseId) params.append('courseId', filters.courseId);
    if (filters?.isActive !== undefined) params.append('isActive', String(filters.isActive));
    const queryString = params.toString();
    const url = `${API_BASE_URL}/sub-topics${queryString ? `?${queryString}` : ''}`;

    const response = await fetch(url, { method: 'GET', headers: getAuthHeaders() });
    if (!response.ok) throw new Error('Failed to fetch sub-topics');
    return response.json();
  },

  getSubTopicsByTopic: async (topicId: string) => {
    const response = await fetch(`${API_BASE_URL}/sub-topics/topic/${topicId}`, {
      method: 'GET',
      headers: getAuthHeaders()
    });
    if (!response.ok) throw new Error('Failed to fetch sub-topics');
    return response.json();
  },

  getSubTopicsByChapter: async (chapterId: string) => {
    const response = await fetch(`${API_BASE_URL}/sub-topics/chapter/${chapterId}`, {
      method: 'GET',
      headers: getAuthHeaders()
    });
    if (!response.ok) throw new Error('Failed to fetch sub-topics');
    return response.json();
  },

  getSubTopicById: async (subTopicId: string) => {
    const response = await fetch(`${API_BASE_URL}/sub-topics/${subTopicId}`, {
      method: 'GET',
      headers: getAuthHeaders()
    });
    if (!response.ok) throw new Error('Failed to fetch sub-topic');
    return response.json();
  },

  createSubTopic: async (subTopicData: any) => {
    const response = await fetch(`${API_BASE_URL}/sub-topics`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(subTopicData)
    });
    if (!response.ok) throw new Error('Failed to create sub-topic');
    return response.json();
  },

  updateSubTopic: async (subTopicId: string, subTopicData: any) => {
    const response = await fetch(`${API_BASE_URL}/sub-topics/${subTopicId}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(subTopicData)
    });
    if (!response.ok) throw new Error('Failed to update sub-topic');
    return response.json();
  },

  deleteSubTopic: async (subTopicId: string) => {
    const response = await fetch(`${API_BASE_URL}/sub-topics/${subTopicId}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    if (!response.ok) throw new Error('Failed to delete sub-topic');
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
  createUser: async (email: string, firstName: string, lastName: string, password: string, role: string, customRoleId?: string) => {
    const body: any = { email, firstName, lastName, password, role };
    if (customRoleId) body.customRoleId = customRoleId;
    const response = await fetch(`${API_BASE_URL}/users`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(body)
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

  updateUserRole: async (userId: string, role: string, customRoleId?: string | null) => {
    const response = await fetch(`${API_BASE_URL}/users/${userId}/role`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify({ role, customRoleId: customRoleId || null })
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

  inviteStudent: async (email: string, firstName: string, lastName: string, batchId?: string, role?: string, customRoleId?: string, mobileNumber?: string) => {
    const body: any = { email, firstName, lastName };
    if (batchId) body.batchId = batchId;
    if (role) body.role = role;
    if (customRoleId) body.customRoleId = customRoleId;
    if (mobileNumber) body.mobileNumber = mobileNumber;
    const response = await fetch(`${API_BASE_URL}/users/invite/student`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(body)
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || 'Failed to invite student');
    }
    // Return full response including email status
    return data;
  },

  updateProfile: async (userId: string, profileData: any) => {
    const response = await fetch(`${API_BASE_URL}/users/${userId}/profile`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify(profileData)
    });
    if (!response.ok) throw new Error('Failed to update profile');
    return response.json();
  },

  bulkUploadStudents: async (data: { students: Array<{ email: string; firstName: string; lastName: string }>; batchId: string }) => {
    const response = await fetch(`${API_BASE_URL}/users/bulk-upload`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data)
    });
    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.message || 'Failed to upload students');
    }
    return result;
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
  },

  getStudentFeatures: async (tenantId: string) => {
    const response = await fetch(`${API_BASE_URL}/tenants/${tenantId}/student-features`, {
      method: 'GET',
      headers: getAuthHeaders()
    });
    if (!response.ok) throw new Error('Failed to fetch student features');
    return response.json();
  },

  updateStudentFeatures: async (tenantId: string, features: { [key: string]: boolean }) => {
    const response = await fetch(`${API_BASE_URL}/tenants/${tenantId}/student-features`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify(features)
    });
    if (!response.ok) throw new Error('Failed to update student features');
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

  getAvailablePermissions: async () => {
    const response = await fetch(`${API_BASE_URL}/roles/permissions/available`, {
      method: 'GET',
      headers: getAuthHeaders()
    });
    if (!response.ok) throw new Error('Failed to fetch permissions');
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

  getQuizzesByChapter: async (chapterId: string) => {
    return authenticatedFetch(`${API_BASE_URL}/quizzes/chapter/${chapterId}`, {
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
    return authenticatedFetch(`${API_BASE_URL}/quizzes/attempt/${attemptId}/student-results`, {
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

  getQuestionsWithoutAnswers: async (quizId: string) => {
    return authenticatedFetch(
      `${API_BASE_URL}/quizzes/${quizId}/questions/list?includeAnswers=false`,
      {
        method: 'GET'
      }
    );
  },

  uploadRecording: async (quizId: string, attemptId: string, formData: FormData) => {
    const token = localStorage.getItem('token');
    const tenantId = localStorage.getItem('tenantId');
    const res = await fetch(`${API_BASE_URL}/quizzes/${quizId}/attempt/${attemptId}/recording`, {
      method: 'POST',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(tenantId ? { 'X-Tenant-Id': tenantId } : {})
        // Note: do NOT set Content-Type — browser sets multipart boundary automatically
      },
      body: formData
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: 'Upload failed' }));
      throw new Error(err.message || 'Failed to upload recording');
    }
    return res.json();
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

  // Generate questions using AI
  generateAIQuestions: async (params: { topic: string; type: string; difficulty: string; count: number }) => {
    return authenticatedFetch(`${API_BASE_URL}/questions/bank/generate`, {
      method: 'POST',
      body: JSON.stringify(params)
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
  getAvailableQuestions: async (quizId: string, filters?: { difficulty?: string; type?: string; tags?: string[]; source?: string; subject?: string; topic?: string; dateFrom?: string; dateTo?: string }) => {
    const params = new URLSearchParams();
    if (filters?.difficulty) params.append('difficulty', filters.difficulty);
    if (filters?.type) params.append('type', filters.type);
    if (filters?.tags?.length) params.append('tags', filters.tags.join(','));
    if (filters?.source) params.append('source', filters.source);
    if (filters?.subject) params.append('subject', filters.subject);
    if (filters?.topic) params.append('topic', filters.topic);
    if (filters?.dateFrom) params.append('dateFrom', filters.dateFrom);
    if (filters?.dateTo) params.append('dateTo', filters.dateTo);

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

// Progress API
export const progressApi = {
  // Get progress for a course
  getProgress: async (courseId: string) => {
    return authenticatedFetch(`${API_BASE_URL}/progress/course/${courseId}`, {
      method: 'GET'
    });
  },

  // Get completed chapter IDs for a course
  getCompletedChapters: async (courseId: string) => {
    return authenticatedFetch(`${API_BASE_URL}/progress/course/${courseId}/completed-chapters`, {
      method: 'GET'
    });
  },

  // Mark chapter as completed
  markChapterComplete: async (chapterId: string) => {
    return authenticatedFetch(`${API_BASE_URL}/progress/chapter/${chapterId}/complete`, {
      method: 'POST'
    });
  },

  // Check if chapter is completed
  isChapterCompleted: async (chapterId: string) => {
    return authenticatedFetch(`${API_BASE_URL}/progress/chapter/${chapterId}/status`, {
      method: 'GET'
    });
  },
};

// Dashboard API
export const dashboardApi = {
  // Get admin dashboard stats
  getAdminStats: async () => {
    return authenticatedFetch(`${API_BASE_URL}/dashboard/admin-stats`, {
      method: 'GET'
    });
  },

  // Get student dashboard data
  getStudentDashboard: async () => {
    return authenticatedFetch(`${API_BASE_URL}/dashboard/student`, {
      method: 'GET'
    });
  },
};

// Interview Question API
export const interviewQuestionApi = {
  // ==================== ADMIN OPERATIONS ====================
  
  // Create single question
  createQuestion: async (questionData: {
    chapterId: string;
    subjectId: string;
    courseId: string;
    question: string;
    answer: string;
    explanation?: string;
    difficulty?: 'easy' | 'medium' | 'hard';
    category?: string;
    companyTags?: string[];
    tags?: string[];
  }) => {
    return authenticatedFetch(`${API_BASE_URL}/interview-questions`, {
      method: 'POST',
      body: JSON.stringify(questionData)
    });
  },

  // Bulk create questions
  bulkCreateQuestions: async (questions: any[]) => {
    return authenticatedFetch(`${API_BASE_URL}/interview-questions/bulk`, {
      method: 'POST',
      body: JSON.stringify({ questions })
    });
  },

  // Update question
  updateQuestion: async (questionId: string, updateData: any) => {
    return authenticatedFetch(`${API_BASE_URL}/interview-questions/${questionId}`, {
      method: 'PUT',
      body: JSON.stringify(updateData)
    });
  },

  // Delete question
  deleteQuestion: async (questionId: string) => {
    return authenticatedFetch(`${API_BASE_URL}/interview-questions/${questionId}`, {
      method: 'DELETE'
    });
  },

  // Reorder questions
  reorderQuestions: async (chapterId: string, orders: { questionId: string; order: number }[]) => {
    return authenticatedFetch(`${API_BASE_URL}/interview-questions/chapter/${chapterId}/reorder`, {
      method: 'PUT',
      body: JSON.stringify({ orders })
    });
  },

  // ==================== QUERY OPERATIONS ====================

  // Get all questions with filters
  getAllQuestions: async (filters?: {
    difficulty?: string;
    category?: string;
    companyTag?: string;
    search?: string;
  }) => {
    const params = new URLSearchParams();
    if (filters?.difficulty) params.append('difficulty', filters.difficulty);
    if (filters?.category) params.append('category', filters.category);
    if (filters?.companyTag) params.append('companyTag', filters.companyTag);
    if (filters?.search) params.append('search', filters.search);
    
    const queryString = params.toString();
    return authenticatedFetch(
      `${API_BASE_URL}/interview-questions${queryString ? `?${queryString}` : ''}`,
      { method: 'GET' }
    );
  },

  // Get questions by chapter
  getQuestionsByChapter: async (chapterId: string) => {
    return authenticatedFetch(`${API_BASE_URL}/interview-questions/chapter/${chapterId}`, {
      method: 'GET'
    });
  },

  // Get questions by subject
  getQuestionsBySubject: async (subjectId: string) => {
    return authenticatedFetch(`${API_BASE_URL}/interview-questions/subject/${subjectId}`, {
      method: 'GET'
    });
  },

  // Get questions by course
  getQuestionsByCourse: async (courseId: string) => {
    return authenticatedFetch(`${API_BASE_URL}/interview-questions/course/${courseId}`, {
      method: 'GET'
    });
  },

  // Get single question
  getQuestionById: async (questionId: string) => {
    return authenticatedFetch(`${API_BASE_URL}/interview-questions/${questionId}`, {
      method: 'GET'
    });
  },

  // Mark question as helpful
  markHelpful: async (questionId: string) => {
    return authenticatedFetch(`${API_BASE_URL}/interview-questions/${questionId}/helpful`, {
      method: 'POST'
    });
  },

  // Get chapter stats
  getChapterStats: async (chapterId: string) => {
    return authenticatedFetch(`${API_BASE_URL}/interview-questions/chapter/${chapterId}/stats`, {
      method: 'GET'
    });
  },

  // ==================== STUDENT PROGRESS ====================

  // Get student progress for chapter
  getStudentProgress: async (chapterId: string) => {
    return authenticatedFetch(`${API_BASE_URL}/interview-questions/progress/chapter/${chapterId}`, {
      method: 'GET'
    });
  },

  // Get student progress for course
  getStudentCourseProgress: async (courseId: string) => {
    return authenticatedFetch(`${API_BASE_URL}/interview-questions/progress/course/${courseId}`, {
      method: 'GET'
    });
  },

  // Update student progress on a question
  updateStudentProgress: async (questionId: string, data: {
    status: 'not_reviewed' | 'reviewing' | 'understood' | 'confident';
    notes?: string;
    chapterId: string;
  }) => {
    return authenticatedFetch(`${API_BASE_URL}/interview-questions/progress/${questionId}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },
};

// Lead Stage API
export const leadStageApi = {
  getStages: async () => {
    return authenticatedFetch(`${API_BASE_URL}/lead-stages`);
  },
  createStage: async (data: { name: string; color: string }) => {
    return authenticatedFetch(`${API_BASE_URL}/lead-stages`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },
  updateStage: async (stageId: string, data: { name?: string; color?: string }) => {
    return authenticatedFetch(`${API_BASE_URL}/lead-stages/${stageId}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },
  deleteStage: async (stageId: string) => {
    return authenticatedFetch(`${API_BASE_URL}/lead-stages/${stageId}`, {
      method: 'DELETE'
    });
  },
  reorderStages: async (stageIds: string[]) => {
    return authenticatedFetch(`${API_BASE_URL}/lead-stages/reorder/all`, {
      method: 'PUT',
      body: JSON.stringify({ stageIds })
    });
  },
  initializeDefaults: async () => {
    return authenticatedFetch(`${API_BASE_URL}/lead-stages/initialize`, {
      method: 'POST'
    });
  }
};

// Lead API
export const leadApi = {
  getLeads: async (filters?: { stageId?: string; source?: string; assignedTo?: string; search?: string; page?: number; limit?: number; dateFrom?: string; dateTo?: string; priority?: string }) => {
    const params = new URLSearchParams();
    if (filters?.stageId) params.append('stageId', filters.stageId);
    if (filters?.source) params.append('source', filters.source);
    if (filters?.assignedTo) params.append('assignedTo', filters.assignedTo);
    if (filters?.search) params.append('search', filters.search);
    if (filters?.page) params.append('page', String(filters.page));
    if (filters?.limit) params.append('limit', String(filters.limit));
    if (filters?.dateFrom) params.append('dateFrom', filters.dateFrom);
    if (filters?.dateTo) params.append('dateTo', filters.dateTo);
    if (filters?.priority) params.append('priority', filters.priority);
    const q = params.toString();
    return authenticatedFetch(`${API_BASE_URL}/leads${q ? `?${q}` : ''}`);
  },
  getLeadById: async (leadId: string) => {
    return authenticatedFetch(`${API_BASE_URL}/leads/${leadId}`);
  },
  createLead: async (data: any) => {
    return authenticatedFetch(`${API_BASE_URL}/leads`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },
  updateLead: async (leadId: string, data: any) => {
    return authenticatedFetch(`${API_BASE_URL}/leads/${leadId}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },
  deleteLead: async (leadId: string) => {
    return authenticatedFetch(`${API_BASE_URL}/leads/${leadId}`, {
      method: 'DELETE'
    });
  },
  changeStage: async (leadId: string, stageId: string, notInterestedReason?: string) => {
    return authenticatedFetch(`${API_BASE_URL}/leads/${leadId}/stage`, {
      method: 'PATCH',
      body: JSON.stringify({ stageId, notInterestedReason })
    });
  },
  addActivity: async (leadId: string, data: { type: string; description: string; callOutcome?: string }, recordingFile?: File) => {
    if (recordingFile) {
      // Use FormData so the audio file can be sent as multipart
      const formData = new FormData();
      formData.append('type', data.type);
      formData.append('description', data.description);
      if (data.callOutcome) formData.append('callOutcome', data.callOutcome);
      formData.append('recording', recordingFile);

      const token = localStorage.getItem('token');
      const tenantId = localStorage.getItem('tenantId');
      const res = await fetch(`${API_BASE_URL}/leads/${leadId}/activities`, {
        method: 'POST',
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...(tenantId ? { 'X-Tenant-Id': tenantId } : {})
          // Note: do NOT set Content-Type — browser sets it automatically with multipart boundary
        },
        body: formData
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: 'Upload failed' }));
        throw new Error(err.message || 'Failed to add activity');
      }
      return res.json();
    }
    return authenticatedFetch(`${API_BASE_URL}/leads/${leadId}/activities`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },
  convertToStudent: async (leadId: string, password?: string) => {
    return authenticatedFetch(`${API_BASE_URL}/leads/${leadId}/convert`, {
      method: 'POST',
      body: JSON.stringify({ password })
    });
  },
  getAnalytics: async () => {
    return authenticatedFetch(`${API_BASE_URL}/leads/analytics`);
  },
  getManagerBoard: async () => {
    return authenticatedFetch(`${API_BASE_URL}/leads/manager-board`);
  },
  exportLeads: (filters?: { stageId?: string; source?: string; assignedTo?: string; search?: string; dateFrom?: string; dateTo?: string }) => {
    const params = new URLSearchParams();
    if (filters?.stageId) params.append('stageId', filters.stageId);
    if (filters?.source) params.append('source', filters.source);
    if (filters?.assignedTo) params.append('assignedTo', filters.assignedTo);
    if (filters?.search) params.append('search', filters.search);
    if (filters?.dateFrom) params.append('dateFrom', filters.dateFrom);
    if (filters?.dateTo) params.append('dateTo', filters.dateTo);
    const q = params.toString();
    return `${API_BASE_URL}/leads/export${q ? `?${q}` : ''}`;
  },
  importLeads: async (csvData: string) => {
    return authenticatedFetch(`${API_BASE_URL}/leads/import`, {
      method: 'POST',
      body: JSON.stringify({ csvData })
    });
  },
  getAuditLogs: async (filters?: { leadId?: string; page?: number; limit?: number }) => {
    const params = new URLSearchParams();
    if (filters?.leadId) params.append('leadId', filters.leadId);
    if (filters?.page) params.append('page', String(filters.page));
    if (filters?.limit) params.append('limit', String(filters.limit));
    const q = params.toString();
    return authenticatedFetch(`${API_BASE_URL}/leads/audit-logs${q ? `?${q}` : ''}`);
  },
  getMyPerformance: async () => {
    return authenticatedFetch(`${API_BASE_URL}/leads/my-performance`);
  },
  quickUpdate: async (leadId: string, data: { stageId?: string; nextFollowUp?: string; activityType?: string; activityDescription?: string; notes?: string }) => {
    return authenticatedFetch(`${API_BASE_URL}/leads/${leadId}/quick-update`, {
      method: 'PATCH',
      body: JSON.stringify(data)
    });
  }
};

// Lead Form Config API
export const leadFormConfigApi = {
  getConfig: async () => {
    return authenticatedFetch(`${API_BASE_URL}/lead-form-config`);
  },
  updateConfig: async (data: { fields: any[]; sources?: string[] }) => {
    return authenticatedFetch(`${API_BASE_URL}/lead-form-config`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },
  addCustomField: async (data: { label: string; type: string; required?: boolean; options?: string[]; placeholder?: string }) => {
    return authenticatedFetch(`${API_BASE_URL}/lead-form-config/fields`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },
  deleteCustomField: async (fieldKey: string) => {
    return authenticatedFetch(`${API_BASE_URL}/lead-form-config/fields/${fieldKey}`, {
      method: 'DELETE'
    });
  },
  // Stats cards configuration
  getStatsCardsConfig: async () => {
    return authenticatedFetch(`${API_BASE_URL}/lead-form-config/stats-cards`);
  },
  updateStatsCardsConfig: async (statsCards: any[]) => {
    return authenticatedFetch(`${API_BASE_URL}/lead-form-config/stats-cards`, {
      method: 'PUT',
      body: JSON.stringify({ statsCards })
    });
  },
  // Table columns configuration
  getTableColumnsConfig: async () => {
    return authenticatedFetch(`${API_BASE_URL}/lead-form-config/table-columns`);
  },
  updateTableColumnsConfig: async (tableColumns: any[]) => {
    return authenticatedFetch(`${API_BASE_URL}/lead-form-config/table-columns`, {
      method: 'PUT',
      body: JSON.stringify({ tableColumns })
    });
  }
};

// Lead Priority API
export const leadPriorityApi = {
  getConfig: async () => {
    return authenticatedFetch(`${API_BASE_URL}/lead-priority/config`);
  },
  updateConfig: async (data: any) => {
    return authenticatedFetch(`${API_BASE_URL}/lead-priority/config`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },
  addRule: async (data: any) => {
    return authenticatedFetch(`${API_BASE_URL}/lead-priority/rules`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },
  updateRule: async (ruleId: string, data: any) => {
    return authenticatedFetch(`${API_BASE_URL}/lead-priority/rules/${ruleId}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },
  deleteRule: async (ruleId: string) => {
    return authenticatedFetch(`${API_BASE_URL}/lead-priority/rules/${ruleId}`, {
      method: 'DELETE'
    });
  },
  updateThresholds: async (data: { hot: number; warm: number }) => {
    return authenticatedFetch(`${API_BASE_URL}/lead-priority/thresholds`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },
  calculateScore: async (leadId: string) => {
    return authenticatedFetch(`${API_BASE_URL}/lead-priority/leads/${leadId}/score`);
  },
  getScoreBreakdown: async (leadId: string) => {
    return authenticatedFetch(`${API_BASE_URL}/lead-priority/leads/${leadId}/breakdown`);
  },
  bulkRecalculate: async (leadIds?: string[]) => {
    return authenticatedFetch(`${API_BASE_URL}/lead-priority/recalculate`, {
      method: 'POST',
      body: JSON.stringify({ leadIds })
    });
  },
  resetToDefaults: async () => {
    return authenticatedFetch(`${API_BASE_URL}/lead-priority/reset`, {
      method: 'POST'
    });
  }
};

// Qualification API
export const qualificationApi = {
  getConfig: async () => {
    return authenticatedFetch(`${API_BASE_URL}/qualification/config`);
  },
  updateConfig: async (data: any) => {
    return authenticatedFetch(`${API_BASE_URL}/qualification/config`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },
  addQuestion: async (data: any) => {
    return authenticatedFetch(`${API_BASE_URL}/qualification/questions`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },
  updateQuestion: async (questionId: string, data: any) => {
    return authenticatedFetch(`${API_BASE_URL}/qualification/questions/${questionId}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },
  deleteQuestion: async (questionId: string) => {
    return authenticatedFetch(`${API_BASE_URL}/qualification/questions/${questionId}`, {
      method: 'DELETE'
    });
  },
  reorderQuestions: async (questionOrder: Array<{ id: string; order: number }>) => {
    return authenticatedFetch(`${API_BASE_URL}/qualification/questions/reorder`, {
      method: 'PUT',
      body: JSON.stringify({ questionOrder })
    });
  },
  getQuestionsForStage: async (stageId: string) => {
    return authenticatedFetch(`${API_BASE_URL}/qualification/stage/${stageId}`);
  },
  saveLeadAnswers: async (leadId: string, data: { answers: any[]; progress: number }) => {
    return authenticatedFetch(`${API_BASE_URL}/qualification/leads/${leadId}/answers`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },
  getLeadAnswers: async (leadId: string) => {
    return authenticatedFetch(`${API_BASE_URL}/qualification/leads/${leadId}/answers`);
  },
  resetToDefaults: async () => {
    return authenticatedFetch(`${API_BASE_URL}/qualification/reset`, {
      method: 'POST'
    });
  }
};

// Sales Content API
export const salesContentApi = {
  getAll: async (filters?: { category?: string; tag?: string; search?: string; activeOnly?: boolean }) => {
    const params = new URLSearchParams();
    if (filters?.category) params.append('category', filters.category);
    if (filters?.tag) params.append('tag', filters.tag);
    if (filters?.search) params.append('search', filters.search);
    if (filters?.activeOnly) params.append('activeOnly', 'true');
    const q = params.toString();
    return authenticatedFetch(`${API_BASE_URL}/sales-content${q ? `?${q}` : ''}`);
  },
  getById: async (id: string) => {
    return authenticatedFetch(`${API_BASE_URL}/sales-content/${id}`);
  },
  create: async (data: any) => {
    return authenticatedFetch(`${API_BASE_URL}/sales-content`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },
  update: async (id: string, data: any) => {
    return authenticatedFetch(`${API_BASE_URL}/sales-content/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },
  delete: async (id: string) => {
    return authenticatedFetch(`${API_BASE_URL}/sales-content/${id}`, {
      method: 'DELETE'
    });
  },
  shareWithLead: async (id: string, data: { leadId: string; channel: string; message?: string }) => {
    return authenticatedFetch(`${API_BASE_URL}/sales-content/${id}/share`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },
  trackView: async (id: string, shareId?: string) => {
    return authenticatedFetch(`${API_BASE_URL}/sales-content/${id}/view`, {
      method: 'POST',
      body: JSON.stringify({ shareId })
    });
  },
  trackDownload: async (id: string) => {
    return authenticatedFetch(`${API_BASE_URL}/sales-content/${id}/download`, {
      method: 'POST'
    });
  },
  reorder: async (contentOrder: Array<{ id: string; order: number }>) => {
    return authenticatedFetch(`${API_BASE_URL}/sales-content/reorder`, {
      method: 'PUT',
      body: JSON.stringify({ contentOrder })
    });
  },
  getCategories: async () => {
    return authenticatedFetch(`${API_BASE_URL}/sales-content/categories`);
  },
  getByCategory: async () => {
    return authenticatedFetch(`${API_BASE_URL}/sales-content/by-category`);
  },
  getFeatured: async () => {
    return authenticatedFetch(`${API_BASE_URL}/sales-content/featured`);
  },
  getAnalytics: async () => {
    return authenticatedFetch(`${API_BASE_URL}/sales-content/analytics`);
  }
};

// Lead AI API
export const leadAIApi = {
  checkStatus: async () => {
    return authenticatedFetch(`${API_BASE_URL}/lead-ai/status`);
  },
  generateSummary: async (leadId: string, force?: boolean) => {
    return authenticatedFetch(`${API_BASE_URL}/lead-ai/leads/${leadId}/generate${force ? '?force=true' : ''}`, {
      method: 'POST'
    });
  },
  getSummary: async (leadId: string) => {
    return authenticatedFetch(`${API_BASE_URL}/lead-ai/leads/${leadId}/summary`);
  },
  getQuickInsights: async (leadId: string) => {
    return authenticatedFetch(`${API_BASE_URL}/lead-ai/leads/${leadId}/insights`);
  },
  getNextBestAction: async (leadId: string) => {
    return authenticatedFetch(`${API_BASE_URL}/lead-ai/leads/${leadId}/next-action`);
  },
  getLeadsNeedingSummary: async (limit?: number) => {
    return authenticatedFetch(`${API_BASE_URL}/lead-ai/pending${limit ? `?limit=${limit}` : ''}`);
  },
  bulkGenerateSummaries: async (leadIds: string[]) => {
    return authenticatedFetch(`${API_BASE_URL}/lead-ai/bulk-generate`, {
      method: 'POST',
      body: JSON.stringify({ leadIds })
    });
  }
};

// Lost Reason API
export const lostReasonApi = {
  getConfig: async () => {
    return authenticatedFetch(`${API_BASE_URL}/lost-reasons/config`);
  },
  updateConfig: async (data: any) => {
    return authenticatedFetch(`${API_BASE_URL}/lost-reasons/config`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },
  addReason: async (data: any) => {
    return authenticatedFetch(`${API_BASE_URL}/lost-reasons/reasons`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },
  updateReason: async (reasonId: string, data: any) => {
    return authenticatedFetch(`${API_BASE_URL}/lost-reasons/reasons/${reasonId}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },
  deleteReason: async (reasonId: string, hardDelete?: boolean) => {
    return authenticatedFetch(`${API_BASE_URL}/lost-reasons/reasons/${reasonId}${hardDelete ? '?hardDelete=true' : ''}`, {
      method: 'DELETE'
    });
  },
  reorderReasons: async (reasonOrder: Array<{ id: string; order: number }>) => {
    return authenticatedFetch(`${API_BASE_URL}/lost-reasons/reasons/reorder`, {
      method: 'PUT',
      body: JSON.stringify({ reasonOrder })
    });
  },
  getCategories: async () => {
    return authenticatedFetch(`${API_BASE_URL}/lost-reasons/categories`);
  },
  getActiveReasons: async () => {
    return authenticatedFetch(`${API_BASE_URL}/lost-reasons/active`);
  },
  markLeadAsLost: async (leadId: string, data: { reasonId?: string; reason: string; detail?: string; reEngagementDate?: string }) => {
    return authenticatedFetch(`${API_BASE_URL}/lost-reasons/leads/${leadId}/mark-lost`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },
  getAnalytics: async (dateRange?: { startDate?: string; endDate?: string }) => {
    const params = new URLSearchParams();
    if (dateRange?.startDate) params.append('startDate', dateRange.startDate);
    if (dateRange?.endDate) params.append('endDate', dateRange.endDate);
    const q = params.toString();
    return authenticatedFetch(`${API_BASE_URL}/lost-reasons/analytics${q ? `?${q}` : ''}`);
  },
  getReEngagementLeads: async (upcomingDays?: number) => {
    return authenticatedFetch(`${API_BASE_URL}/lost-reasons/reengagement${upcomingDays ? `?upcoming=${upcomingDays}` : ''}`);
  },
  reEngageLead: async (leadId: string, data: { newStage?: string; note?: string }) => {
    return authenticatedFetch(`${API_BASE_URL}/lost-reasons/leads/${leadId}/reengage`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },
  resetToDefaults: async () => {
    return authenticatedFetch(`${API_BASE_URL}/lost-reasons/reset`, {
      method: 'POST'
    });
  }
};

// Google Sheet Integration API
export const googleSheetApi = {
  getIntegrations: async () =>
    authenticatedFetch(`${API_BASE_URL}/google-sheet-integrations`),

  getIntegration: async (id: string) =>
    authenticatedFetch(`${API_BASE_URL}/google-sheet-integrations/${id}`),

  fetchTabs: async (sheetUrl: string) =>
    authenticatedFetch(`${API_BASE_URL}/google-sheet-integrations/fetch-tabs`, {
      method: 'POST',
      body: JSON.stringify({ sheetUrl })
    }),

  fetchHeaders: async (sheetUrl: string, sheetName?: string) =>
    authenticatedFetch(`${API_BASE_URL}/google-sheet-integrations/fetch-headers`, {
      method: 'POST',
      body: JSON.stringify({ sheetUrl, sheetName })
    }),

  createIntegration: async (data: any) =>
    authenticatedFetch(`${API_BASE_URL}/google-sheet-integrations`, {
      method: 'POST',
      body: JSON.stringify(data)
    }),

  updateIntegration: async (id: string, data: any) =>
    authenticatedFetch(`${API_BASE_URL}/google-sheet-integrations/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    }),

  deleteIntegration: async (id: string) =>
    authenticatedFetch(`${API_BASE_URL}/google-sheet-integrations/${id}`, {
      method: 'DELETE'
    }),

  triggerSync: async (id: string) =>
    authenticatedFetch(`${API_BASE_URL}/google-sheet-integrations/${id}/sync`, {
      method: 'POST'
    }),

  resetSync: async (id: string) =>
    authenticatedFetch(`${API_BASE_URL}/google-sheet-integrations/${id}/reset-sync`, {
      method: 'POST'
    })
};