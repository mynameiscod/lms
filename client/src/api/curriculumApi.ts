import axios from 'axios';

const BASE = '/api/v1/curricula';

const authHeader = () => {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

// ─── Types ───────────────────────────────────────────────────────────────────

export interface CurriculumTopic {
  _id?: string;
  title: string;
  description?: string;
  order: number;
  startDay: number;
  endDay: number;
  color: string;
}

export interface Curriculum {
  _id: string;
  tenantId: string;
  title: string;
  description?: string;
  targetCourse?: string;
  totalDays: number;
  topics: CurriculumTopic[];
  isPublished: boolean;
  clonedFrom?: string;
  createdBy: string;
  enrollmentCount: number;
  plannedDays?: number; // populated in list
  createdAt: string;
  updatedAt: string;
}

export type ContentSlot = 'morning' | 'afternoon' | 'evening' | 'anytime';

export interface DayContentItem {
  _id?: string;
  contentId: string;
  contentTitle: string;
  contentType: string;
  slot: ContentSlot;
  isGating: boolean;
  order: number;
  estimatedDuration: number;
}

export interface DayPlan {
  _id: string;
  curriculumId: string;
  topicId: string;
  dayNumber: number;
  title?: string;
  notes?: string;
  items: DayContentItem[];
}

export type WeekendDayType = 'rest' | 'revision' | 'project' | 'mock_interview' | 'custom';

export interface WeekendPlan {
  _id: string;
  curriculumId: string;
  weekNumber: number;
  dayOfWeek: 'saturday' | 'sunday';
  type: WeekendDayType;
  title?: string;
  description?: string;
  items: DayContentItem[];
}

// ─── API ─────────────────────────────────────────────────────────────────────

export const curriculumApi = {
  list: async (params: { search?: string; published?: 'true' | 'false' } = {}): Promise<{ curricula: Curriculum[]; total: number }> => {
    const qs = new URLSearchParams();
    if (params.search)    qs.set('search',    params.search);
    if (params.published) qs.set('published', params.published);
    const { data } = await axios.get(`${BASE}?${qs}`, { headers: authHeader() });
    return data;
  },

  getById: async (id: string): Promise<Curriculum> => {
    const { data } = await axios.get(`${BASE}/${id}`, { headers: authHeader() });
    return data;
  },

  create: async (body: Partial<Curriculum>): Promise<Curriculum> => {
    const { data } = await axios.post(BASE, body, { headers: authHeader() });
    return data;
  },

  update: async (id: string, body: Partial<Curriculum>): Promise<Curriculum> => {
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

  clone: async (id: string, title?: string): Promise<Curriculum> => {
    const { data } = await axios.post(`${BASE}/${id}/clone`, { title }, { headers: authHeader() });
    return data;
  },

  // ── Day Plans ──────────────────────────────────────────────────────────────

  getDayPlans: async (curriculumId: string): Promise<DayPlan[]> => {
    const { data } = await axios.get(`${BASE}/${curriculumId}/days`, { headers: authHeader() });
    return data;
  },

  upsertDayPlan: async (curriculumId: string, day: number, body: Partial<DayPlan>): Promise<DayPlan> => {
    const { data } = await axios.put(`${BASE}/${curriculumId}/days/${day}`, body, { headers: authHeader() });
    return data;
  },

  clearDayPlan: async (curriculumId: string, day: number): Promise<void> => {
    await axios.delete(`${BASE}/${curriculumId}/days/${day}`, { headers: authHeader() });
  },

  // ── Weekend Plans ──────────────────────────────────────────────────────────

  getWeekendPlans: async (curriculumId: string): Promise<WeekendPlan[]> => {
    const { data } = await axios.get(`${BASE}/${curriculumId}/weekends`, { headers: authHeader() });
    return data;
  },

  upsertWeekendPlan: async (
    curriculumId: string,
    week: number,
    dayOfWeek: 'saturday' | 'sunday',
    body: Partial<WeekendPlan>
  ): Promise<WeekendPlan> => {
    const { data } = await axios.put(
      `${BASE}/${curriculumId}/weekends/${week}/${dayOfWeek}`,
      body,
      { headers: authHeader() }
    );
    return data;
  },
};

export const WEEKEND_TYPE_LABELS: Record<WeekendDayType, string> = {
  rest:           'Rest Day',
  revision:       'Revision',
  project:        'Project Work',
  mock_interview: 'Mock Interview',
  custom:         'Custom',
};

export const SLOT_LABELS: Record<ContentSlot, string> = {
  morning:   'Morning',
  afternoon: 'Afternoon',
  evening:   'Evening',
  anytime:   'Anytime',
};
