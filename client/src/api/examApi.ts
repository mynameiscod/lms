const API_BASE_URL = process.env.REACT_APP_API_URL || '/api/v1';

const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  const tenantId = localStorage.getItem('tenantId');
  return {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
    ...(tenantId && { 'X-Tenant-Id': tenantId }),
  };
};

export interface ExamRecord {
  _id: string;
  studentId: string;
  examName: string;
  examType: 'internal' | 'external' | 'certification' | 'placement';
  date: string;
  maxScore: number;
  scoredMarks: number;
  percentage: number;
  grade?: string;
  result: 'pass' | 'fail' | 'pending';
  remarks?: string;
  conductedBy?: { firstName?: string; lastName?: string } | string;
  createdAt?: string;
}

export interface ExamSummary {
  total: number;
  passed: number;
  failed: number;
  pending: number;
  averagePercentage: number;
}

export interface ExamInput {
  studentId?: string;
  examName: string;
  examType: string;
  date: string;
  maxScore: number;
  scoredMarks: number;
  result?: string;
  grade?: string;
  remarks?: string;
}

/** Surface the server's message rather than a bare status code — these endpoints
 *  return real validation text ("Scored marks cannot exceed max score") that the
 *  person entering marks needs to see. */
async function call(path: string, init: RequestInit) {
  const res = await fetch(`${API_BASE_URL}/exams${path}`, { headers: getAuthHeaders(), ...init });
  let body: any = null;
  try { body = await res.json(); } catch { /* empty body */ }
  if (!res.ok) throw new Error(body?.message || `Request failed (${res.status})`);
  return body;
}

export const listStudentExams = async (
  studentId: string,
): Promise<{ exams: ExamRecord[]; summary: ExamSummary }> => {
  const body = await call(`/student/${studentId}`, { method: 'GET' });
  return body.data;
};

export const createExam = async (input: ExamInput): Promise<ExamRecord> =>
  (await call('', { method: 'POST', body: JSON.stringify(input) })).data;

export const updateExam = async (id: string, input: Partial<ExamInput>): Promise<ExamRecord> =>
  (await call(`/${id}`, { method: 'PUT', body: JSON.stringify(input) })).data;

export const deleteExam = async (id: string): Promise<void> => {
  await call(`/${id}`, { method: 'DELETE' });
};

/** Record one exam for many students at once — how an exam actually happens. */
export const createExamsBulk = async (
  common: Omit<ExamInput, 'studentId' | 'scoredMarks'>,
  results: { studentId: string; scoredMarks: number; result?: string; remarks?: string }[],
): Promise<{ created: number; skipped: { studentId: string; reason: string }[] }> =>
  (await call('/bulk', { method: 'POST', body: JSON.stringify({ ...common, results }) })).data;
