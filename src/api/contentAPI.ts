import axios from 'axios';

const API_BASE_URL = 'http://localhost:5000/api/v1/content';

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
  tags?: string[];
  isPublished: boolean;
  visibility: 'public' | 'private' | 'restricted';
  dueDate?: string; // For assignments
  code?: string; // For snippets
  language?: string; // For snippets
  attachments?: ContentAttachment[];
  expiresAt?: string;
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
    
    // Add JSON data as a field
    formData.append('data', JSON.stringify(data));
    
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
    formData.append('data', JSON.stringify(data));

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
