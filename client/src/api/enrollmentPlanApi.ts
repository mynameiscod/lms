import axios from 'axios';

const BASE = '/api/v1/enrollment-plans';

const authHeader = () => {
  const token    = localStorage.getItem('token');
  const tenantId = localStorage.getItem('tenantId');
  return {
    ...(token    && { Authorization: `Bearer ${token}` }),
    ...(tenantId && { 'X-Tenant-Id': tenantId }),
  };
};

export type EnrollmentStatus = 'active' | 'paused' | 'completed' | 'dropped';

export interface EnrollmentSettings {
  enforceSequential: boolean;
  weekendsActive: boolean;
}

export interface CompletedItem {
  contentId: string;
  dayNumber: number;
  completedAt: string;
}

export interface CurriculumEnrollment {
  _id: string;
  tenantId: string;
  curriculumId: string;
  curriculumTitle: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  batchId?: string;
  batchName?: string;
  startDate: string;
  status: EnrollmentStatus;
  settings: EnrollmentSettings;
  currentDay: number;
  completedDays: number[];
  completedItems: CompletedItem[];
  lastActivityAt?: string;
  completedAt?: string;
  enrolledBy: string;
  // enriched fields
  todayPlanDay?: number | null;
  progressPct?: number;
  totalDays?: number;
  createdAt: string;
  updatedAt: string;
}

export interface EnrollBatchResult {
  enrolled: number;
  skipped: number;
  message: string;
}

export const enrollmentPlanApi = {
  // Admin
  listAll: async (params: {
    status?: EnrollmentStatus;
    curriculumId?: string;
    batchId?: string;
    search?: string;
  } = {}): Promise<{ enrollments: CurriculumEnrollment[]; total: number }> => {
    const qs = new URLSearchParams();
    if (params.status)       qs.set('status',       params.status);
    if (params.curriculumId) qs.set('curriculumId', params.curriculumId);
    if (params.batchId)      qs.set('batchId',      params.batchId);
    if (params.search)       qs.set('search',       params.search);
    const { data } = await axios.get(`${BASE}?${qs}`, { headers: authHeader() });
    return data;
  },

  listByCurriculum: async (curriculumId: string, params: {
    status?: EnrollmentStatus;
    batchId?: string;
    search?: string;
  } = {}): Promise<{ enrollments: CurriculumEnrollment[]; total: number }> => {
    const qs = new URLSearchParams();
    if (params.status)  qs.set('status',  params.status);
    if (params.batchId) qs.set('batchId', params.batchId);
    if (params.search)  qs.set('search',  params.search);
    const { data } = await axios.get(`${BASE}/curriculum/${curriculumId}?${qs}`, { headers: authHeader() });
    return data;
  },

  getStats: async (curriculumId: string): Promise<{ total: number; active: number; paused: number; completed: number; dropped: number }> => {
    const { data } = await axios.get(`${BASE}/curriculum/${curriculumId}/stats`, { headers: authHeader() });
    return data;
  },

  getById: async (id: string): Promise<CurriculumEnrollment> => {
    const { data } = await axios.get(`${BASE}/${id}`, { headers: authHeader() });
    return data;
  },

  enrollStudent: async (body: {
    curriculumId: string;
    studentId: string;
    startDate: string;
    batchId?: string;
    batchName?: string;
    settings?: Partial<EnrollmentSettings>;
  }): Promise<CurriculumEnrollment> => {
    const { data } = await axios.post(`${BASE}/student`, body, { headers: authHeader() });
    return data;
  },

  enrollBatch: async (body: {
    curriculumId: string;
    batchId: string;
    startDate: string;
    offeringId?: string;
    settings?: Partial<EnrollmentSettings>;
  }): Promise<EnrollBatchResult> => {
    const { data } = await axios.post(`${BASE}/batch`, body, { headers: authHeader() });
    return data;
  },

  updateStatus: async (id: string, status: EnrollmentStatus): Promise<CurriculumEnrollment> => {
    const { data } = await axios.patch(`${BASE}/${id}/status`, { status }, { headers: authHeader() });
    return data;
  },

  updateSettings: async (id: string, body: { startDate?: string; settings?: Partial<EnrollmentSettings> }): Promise<CurriculumEnrollment> => {
    const { data } = await axios.put(`${BASE}/${id}/settings`, body, { headers: authHeader() });
    return data;
  },

  // Student
  getDayPlan: async (enrollmentId: string, day: number): Promise<any> => {
    const { data } = await axios.get(`${BASE}/${enrollmentId}/day/${day}`, { headers: authHeader() });
    return data;
  },

  getMyEnrollments: async (): Promise<CurriculumEnrollment[]> => {
    const { data } = await axios.get(`${BASE}/my`, { headers: authHeader() });
    return data;
  },

  markContentComplete: async (enrollmentId: string, contentId: string, dayNumber: number): Promise<{
    completedItems: number;
    completedDays: number[];
    currentDay: number;
  }> => {
    const { data } = await axios.patch(
      `${BASE}/${enrollmentId}/complete-item`,
      { contentId, dayNumber },
      { headers: authHeader() }
    );
    return data;
  },
};

export const STATUS_LABELS: Record<EnrollmentStatus, string> = {
  active:    'Active',
  paused:    'Paused',
  completed: 'Completed',
  dropped:   'Dropped',
};

export const STATUS_COLORS: Record<EnrollmentStatus, { bg: string; color: string }> = {
  active:    { bg: '#dcfce7', color: '#15803d' },
  paused:    { bg: '#fef3c7', color: '#b45309' },
  completed: { bg: '#dbeafe', color: '#1d4ed8' },
  dropped:   { bg: '#fee2e2', color: '#dc2626' },
};
