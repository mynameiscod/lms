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
  /** Bunny encode status, mirrored server-side. 4 = playable, 5/6 = failed. */
  bunnyStatus?: number;
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

  /* ---- adaptive curriculum (ADAPTIVE_CURRICULUM_V1) ----
   * Without skillKeys a row is findable by keyword and by nothing else — the adaptive plan
   * resolves material by canonical skill, so unmapped content is invisible to it. */
  skillKeys?: string[];
  /** Written for one specific curriculum topic; preferred over skill-only matches for it. */
  topicCode?: string;
  learningDepth?: LearningDepth;
  /** Practice difficulty on the 1-4 scale the planner assigns against. */
  difficultyLevel?: 1 | 2 | 3 | 4;
  /** The preferred row when several teach the same skill at the same depth. */
  canonical?: boolean;
  /** Empty means every direction. */
  applicableDirections?: string[];
  /** Which field the worked examples are drawn from. */
  careerContexts?: string[];
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

export type LearningDepth = 'FOUNDATION' | 'GUIDED' | 'STANDARD' | 'REVISION' | 'CHALLENGE';

/** What the adaptive section of the editor offers, straight from the canonical taxonomy. */
export interface SkillOption {
  key: string;
  name: string;
  parentKey: string | null;
  difficulty?: string;
  assessable: boolean;
}
export interface SkillOptions {
  skills: SkillOption[];
  depths: LearningDepth[];
  directions: { key: string; name: string }[];
}

export interface ListFilters {
  type?: ContentLibraryType;
  topic?: string;
  course?: string;
  search?: string;
  published?: 'true' | 'false';
  source?: 'generated' | 'all';   // omit = curriculum/manual content only (default)
  /** Only content teaching this canonical skill. */
  skill?: string;
  /** 'false' is the authoring to-do list: rows the adaptive planner cannot see. */
  mapped?: 'true' | 'false';
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
    if (filters.source)    params.set('source',     filters.source);
    if (filters.skill)     params.set('skill',      filters.skill);
    if (filters.mapped)    params.set('mapped',     filters.mapped);
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

  /** Canonical skills, depths and directions for the adaptive section of the editor. */
  getSkillOptions: async (): Promise<SkillOptions> => {
    const { data } = await axios.get(`${BASE}/skill-options`, { headers: authHeader() });
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
