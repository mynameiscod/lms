import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || '/api/v1';

const api = axios.create({ baseURL: API_BASE_URL });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  const tenantId = localStorage.getItem('tenantId');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  if (tenantId) config.headers['X-Tenant-Id'] = tenantId;
  return config;
});

export interface ClassRecording {
  _id: string;
  tenantId: string;
  title: string;
  description?: string;
  instructor: { _id: string; firstName: string; lastName: string; email?: string };
  courseId: { _id: string; title: string };
  subjectId?: { _id: string; name: string };
  chapterId?: { _id: string; title: string };
  videoUrl: string;
  duration: number;
  fileSize: number;
  mimeType: string;
  status: 'uploading' | 'uploaded' | 'transcribing' | 'summarizing' | 'generating_quiz' | 'generating_assignment' | 'completed' | 'failed';
  processingProgress: number;
  processingError?: string;
  transcript?: string;
  summary?: { overview: string; keyPoints: string[]; topics: string[] };
  generatedQuiz?: {
    questions: { question: string; options: { text: string; isCorrect: boolean }[]; explanation: string; difficulty: string }[];
    savedQuizId?: string;
  };
  generatedAssignment?: {
    title: string; description: string; instructions: string; type: string; difficulty: string;
    starterCode?: string; solutionCode?: string;
    testCases?: { input: string; expectedOutput: string; description: string; isHidden: boolean; points: number }[];
    savedAssignmentId?: string;
  };
  recordedAt: string;
  isPublished: boolean;
  viewCount: number;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export const classRecordingApi = {
  // Upload recording with video file
  async upload(formData: FormData): Promise<{ success: boolean; data: ClassRecording; message: string }> {
    const res = await api.post('/class-recordings/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 600000 // 10 min timeout for large uploads
    });
    return res.data;
  },

  // List recordings (instructor/admin)
  async list(params?: { courseId?: string; status?: string; page?: number; limit?: number }): Promise<{ success: boolean; data: ClassRecording[]; total: number }> {
    const res = await api.get('/class-recordings', { params });
    return res.data;
  },

  // List published recordings (student)
  async listForStudents(params?: { courseId?: string; page?: number; limit?: number }): Promise<{ success: boolean; data: ClassRecording[]; total: number }> {
    const res = await api.get('/class-recordings/student/list', { params });
    return res.data;
  },

  // Get single recording
  async getById(id: string): Promise<{ success: boolean; data: ClassRecording }> {
    const res = await api.get(`/class-recordings/${id}`);
    return res.data;
  },

  // Poll processing status
  async getStatus(id: string): Promise<{ success: boolean; data: { status: string; processingProgress: number; processingError?: string } }> {
    const res = await api.get(`/class-recordings/${id}/status`);
    return res.data;
  },

  // Update metadata
  async update(id: string, data: Partial<ClassRecording>): Promise<{ success: boolean; data: ClassRecording }> {
    const res = await api.put(`/class-recordings/${id}`, data);
    return res.data;
  },

  // Delete recording
  async delete(id: string): Promise<{ success: boolean; message: string }> {
    const res = await api.delete(`/class-recordings/${id}`);
    return res.data;
  },

  // Publish/unpublish
  async togglePublish(id: string): Promise<{ success: boolean; data: ClassRecording; message: string }> {
    const res = await api.post(`/class-recordings/${id}/publish`);
    return res.data;
  },

  // Reprocess failed recording
  async reprocess(id: string): Promise<{ success: boolean; message: string }> {
    const res = await api.post(`/class-recordings/${id}/reprocess`);
    return res.data;
  },

  // Save generated quiz to LMS
  async saveQuiz(id: string, data?: { questions?: any[]; quizTitle?: string; startDate?: string; endDate?: string }): Promise<{ success: boolean; data: any; message: string }> {
    const res = await api.post(`/class-recordings/${id}/save-quiz`, data);
    return res.data;
  },

  // Save generated assignment to LMS
  async saveAssignment(id: string, data?: { assignment?: any }): Promise<{ success: boolean; data: any; message: string }> {
    const res = await api.post(`/class-recordings/${id}/save-assignment`, data);
    return res.data;
  }
};
