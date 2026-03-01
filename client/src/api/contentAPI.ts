import axios from 'axios';

const API_BASE_URL = (typeof window !== 'undefined' 
  ? window.location.origin 
  : 'http://localhost:5000') + '/api/v1/content';

export interface ContentAttachment {
  name: string;
  url: string;
  size: number;
  type: string;
  uploadedAt: string;
}

export interface ContentData {
  _id?: string;
  type: 'announcement' | 'note' | 'assignment' | 'cheatsheet' | 'snippet';
  title: string;
  description: string;
  content: string;
  courseId?: string;
  courseName?: string;
  tags?: string[];
  isPublished: boolean;
  visibility: 'all_students' | 'specific_batch' | 'enrolled_only';
  dueDate?: string; // For assignments
  code?: string; // For snippets
  language?: string; // For snippets
  attachments?: ContentAttachment[];
  expiresAt?: string;
  priority?: string;
}

export interface ContentResponse extends ContentData {
  _id: string;
  author: {
    userId: string;
    name: string;
    role: string;
  };
  viewCount: number;
  createdAt: string;
  updatedAt: string;
}

// Admin endpoints
export const contentAPI = {
  // Create new content with file uploads
  createContent: async (data: ContentData, files?: File[]) => {
    const formData = new FormData();
    
    // Add individual fields directly (not nested in 'data')
    formData.append('type', data.type);
    formData.append('title', data.title);
    formData.append('description', data.description || '');
    formData.append('content', data.content);
    formData.append('courseId', data.courseId || '');
    formData.append('courseName', data.courseName || '');
    formData.append('isPublished', String(data.isPublished));
    formData.append('visibility', data.visibility);
    
    // Optional fields
    if (data.dueDate) formData.append('dueDate', data.dueDate);
    if (data.code) formData.append('code', data.code);
    if (data.language) formData.append('language', data.language);
    if (data.expiresAt) formData.append('expiresAt', data.expiresAt);
    if (data.tags && data.tags.length > 0) {
      formData.append('tags', JSON.stringify(data.tags));
    }
    if (data.priority) formData.append('priority', data.priority);
    
    // Add files if provided
    if (files && files.length > 0) {
      files.forEach((file) => {
        formData.append('attachments', file);
      });
    }

    const token = localStorage.getItem('token');
    const response = await axios.post(`${API_BASE_URL}/admin`, formData, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  // Get all content (admin view)
  getAllContent: async (page = 1, limit = 10, filters?: any) => {
    const token = localStorage.getItem('token');
    const params = new URLSearchParams({
      page: String(page),
      limit: String(limit),
      ...filters,
    });

    const response = await axios.get(`${API_BASE_URL}/admin?${params}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data;
  },

  // Update content
  updateContent: async (id: string, data: ContentData, files?: File[]) => {
    const formData = new FormData();
    
    // Add individual fields directly (not nested in 'data')
    formData.append('type', data.type);
    formData.append('title', data.title);
    formData.append('description', data.description || '');
    formData.append('content', data.content);
    formData.append('courseId', data.courseId || '');
    formData.append('courseName', data.courseName || '');
    formData.append('isPublished', String(data.isPublished));
    formData.append('visibility', data.visibility);
    
    // Optional fields
    if (data.dueDate) formData.append('dueDate', data.dueDate);
    if (data.code) formData.append('code', data.code);
    if (data.language) formData.append('language', data.language);
    if (data.expiresAt) formData.append('expiresAt', data.expiresAt);
    if (data.tags && data.tags.length > 0) {
      formData.append('tags', JSON.stringify(data.tags));
    }
    if (data.priority) formData.append('priority', data.priority);

    if (files && files.length > 0) {
      files.forEach((file) => {
        formData.append('attachments', file);
      });
    }

    const token = localStorage.getItem('token');
    const response = await axios.put(`${API_BASE_URL}/admin/${id}`, formData, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  // Delete content
  deleteContent: async (id: string) => {
    const token = localStorage.getItem('token');
    const response = await axios.delete(`${API_BASE_URL}/admin/${id}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data;
  },

  // Student endpoints - get published content
  getStudentContent: async (page = 1, limit = 10, filters?: any) => {
    const token = localStorage.getItem('token');
    const params = new URLSearchParams({
      page: String(page),
      limit: String(limit),
      ...filters,
    });

    const response = await axios.get(`${API_BASE_URL}/student?${params}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data;
  },

  // Get content by type
  getContentByType: async (type: string, page = 1, limit = 10) => {
    const token = localStorage.getItem('token');
    const params = new URLSearchParams({
      page: String(page),
      limit: String(limit),
    });

    const response = await axios.get(
      `${API_BASE_URL}/student/type/${type}?${params}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    return response.data;
  },

  // Get single content by ID
  getContentById: async (id: string) => {
    const token = localStorage.getItem('token');
    const response = await axios.get(`${API_BASE_URL}/${id}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data;
  },
};

export default contentAPI;
