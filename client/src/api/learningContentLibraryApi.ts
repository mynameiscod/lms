import axios from 'axios';

const BASE = '/api/v1/learning-library';

export interface ContentLibraryItem {
  _id: string;
  tenantId: string;
  title: string;
  description?: string;
  type: ContentLibraryType;
  topicTags: string[];
  courseTags: string[];
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  estimatedDuration: number;
  // Video
  videoSource?: 'upload' | 'youtube' | 'vimeo' | 'bunny';
  videoUrl?: string;
  bunnyVideoId?: string;
  bunnyLibraryId?: number;
  videoFilePath?: string;
  videoDuration?: number;
  videoThumbnail?: string;
  completionThreshold: number;
  // Notes
  notesSource?: 'upload' | 'richtext';
  notesFilePath?: string;
  notesContent?: string;
  // Interactive activity (self-contained HTML)
  htmlContent?: string;
  activitySteps?: number;
  // Q&A
  qaItems: QAItem[];
  // Practice
  practiceQuestions: PracticeQuestion[];
  isPublished: boolean;
  viewCount: number;
  usageCount: number;
  createdAt: string;
  updatedAt: string;
  // Interactive lesson link
  conceptLessonId?: string;
}

export type ContentLibraryType =
  | 'video'
  | 'notes'
  | 'tech_qa'
  | 'behavioral_qa'
  | 'practice_coding'
  | 'practice_theory'
  | 'aptitude'
  | 'interactive_lesson'
  | 'interactive_activity';

export interface QAItem {
  question: string;
  answer: string;
  tips?: string;
  order: number;
}

export interface TestCase {
  input: string;
  expectedOutput: string;
  isHidden: boolean;
}

export interface PracticeQuestion {
  _id?: string;
  type: 'coding' | 'theory' | 'mcq';
  title: string;
  description: string;
  difficulty: 'easy' | 'medium' | 'hard';
  starterCode?: Record<string, string>;
  allowedLanguages?: string[];
  testCases?: TestCase[];
  options?: Array<{ text: string; isCorrect: boolean }>;
  explanation?: string;
  marks: number;
  gradingMode: 'auto' | 'self';
}

export interface ListFilters {
  type?: ContentLibraryType;
  topic?: string;
  course?: string;
  search?: string;
  published?: 'true' | 'false';
}

const authHeader = () => {
  const token    = localStorage.getItem('token');
  const tenantId = localStorage.getItem('tenantId');
  return {
    ...(token    && { Authorization: `Bearer ${token}` }),
    ...(tenantId && { 'X-Tenant-Id': tenantId }),
  };
};

export const learningContentLibraryApi = {
  list: async (filters: ListFilters = {}): Promise<{ items: ContentLibraryItem[]; total: number }> => {
    const params = new URLSearchParams();
    if (filters.type)      params.set('type',      filters.type);
    if (filters.topic)     params.set('topic',      filters.topic);
    if (filters.course)    params.set('course',     filters.course);
    if (filters.search)    params.set('search',     filters.search);
    if (filters.published) params.set('published',  filters.published);
    const { data } = await axios.get(`${BASE}?${params}`, { headers: authHeader() });
    return data;
  },

  getById: async (id: string): Promise<ContentLibraryItem> => {
    const { data } = await axios.get(`${BASE}/${id}`, { headers: authHeader() });
    return data;
  },

  create: async (formData: FormData, contentType?: string): Promise<ContentLibraryItem> => {
    // contentType in the query so the upload middleware runs for multipart (req.body isn't parsed yet)
    const q = contentType ? `?type=${encodeURIComponent(contentType)}` : '';
    const { data } = await axios.post(`${BASE}${q}`, formData, {
      headers: { ...authHeader(), 'Content-Type': 'multipart/form-data' },
    });
    return data;
  },

  createJson: async (body: Partial<ContentLibraryItem>): Promise<ContentLibraryItem> => {
    const { data } = await axios.post(BASE, body, { headers: authHeader() });
    return data;
  },

  // Bunny Stream: create a video object + get resumable (TUS) upload auth
  createBunnyVideo: async (title: string): Promise<{
    videoId: string;
    libraryId: number;
    cdnHostname: string;
    tus: { endpoint: string; expiration: number; signature: string };
  }> => {
    const { data } = await axios.post(`${BASE}/bunny/videos`, { title }, { headers: authHeader() });
    return data;
  },

  update: async (id: string, formData: FormData, contentType?: string): Promise<ContentLibraryItem> => {
    const q = contentType ? `?type=${encodeURIComponent(contentType)}` : '';
    const { data } = await axios.put(`${BASE}/${id}${q}`, formData, {
      headers: { ...authHeader(), 'Content-Type': 'multipart/form-data' },
    });
    return data;
  },

  updateJson: async (id: string, body: Partial<ContentLibraryItem>): Promise<ContentLibraryItem> => {
    const { data } = await axios.put(`${BASE}/${id}`, body, { headers: authHeader() });
    return data;
  },

  delete: async (id: string): Promise<void> => {
    await axios.delete(`${BASE}/${id}`, { headers: authHeader() });
  },

  togglePublish: async (id: string): Promise<{ isPublished: boolean }> => {
    const { data } = await axios.patch(`${BASE}/${id}/publish`, {}, { headers: authHeader() });
    return data;
  },

  getTopicTags: async (): Promise<string[]> => {
    const { data } = await axios.get(`${BASE}/tags/topics`, { headers: authHeader() });
    return data;
  },

  getCourseTags: async (): Promise<string[]> => {
    const { data } = await axios.get(`${BASE}/tags/courses`, { headers: authHeader() });
    return data;
  },

  getStreamUrl: (id: string): string => {
    const token    = localStorage.getItem('token') || '';
    const tenantId = localStorage.getItem('tenantId') || '';
    return `${BASE}/${id}/stream?token=${encodeURIComponent(token)}&tenantId=${encodeURIComponent(tenantId)}`;
  },
};

export const CONTENT_TYPE_LABELS: Record<ContentLibraryType, string> = {
  video:               'Video',
  notes:               'Notes',
  tech_qa:             'Tech Interview Q&A',
  behavioral_qa:       'Behavioral Q&A',
  practice_coding:     'Practice (Coding)',
  practice_theory:     'Practice (Theory)',
  aptitude:            'Aptitude',
  interactive_lesson:  'Interactive Lesson',
  interactive_activity:'Interactive Activity',
};

export const CONTENT_TYPE_ICONS: Record<ContentLibraryType, string> = {
  video:               '🎬',
  notes:               '📄',
  tech_qa:             '💻',
  behavioral_qa:       '🤝',
  practice_coding:     '⌨️',
  practice_theory:     '📝',
  aptitude:            '🧠',
  interactive_lesson:  '🎮',
  interactive_activity:'🧩',
};

export const CONTENT_TYPE_COLORS: Record<ContentLibraryType, string> = {
  video:               '#3b82f6',
  notes:               '#8b5cf6',
  tech_qa:             '#0ea5e9',
  behavioral_qa:       '#f59e0b',
  practice_coding:     '#10b981',
  practice_theory:     '#6366f1',
  aptitude:            '#f97316',
  interactive_lesson:  '#ec4899',
  interactive_activity:'#14a89c',
};
