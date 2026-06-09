// Public (no-auth) Skill Assessment API client.
const API_BASE_URL = process.env.REACT_APP_API_URL || '/api/v1';
const BASE = `${API_BASE_URL}/public/assessment`;

async function post(path: string, body: any) {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json?.success === false) {
    throw new Error(json?.message || `Request failed (${res.status})`);
  }
  return json;
}

export interface CandidateRegistration {
  tenantId: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  segment: string;
  year?: string;
  yearsExperience?: number;
  primaryLanguage?: string;
  isMobile?: boolean;
  publicConfigId?: string;
  utmParams?: Record<string, string>;
}

export interface AssessmentItemView {
  itemId: string;
  type: 'mcq' | 'predict_output' | 'debug' | 'complete_code' | 'live_code' | 'sql';
  dimension: string;
  difficulty: number;
  language?: string;
  prompt: string;
  codeSnippet?: string;
  options?: { id: string; text: string }[];
  starterCode?: string;
  functionSignature?: string;
  blanks?: { id: string }[];
  sampleTestCases?: { input: string; expectedOutput: string }[];
  stage: number;
  optional: boolean;
  timeLimitSeconds?: number;
}

export interface ItemResponse {
  itemId: string;
  selectedOptionIds?: string[];
  predictedOutput?: string;
  blankAnswers?: Record<string, string>;
  identifiedLine?: number;
  code?: string;
  timeSpentSeconds?: number;
}

export const assessmentApi = {
  register: (data: CandidateRegistration) =>
    post('/register', data).then((r) => r.data as { token: string; otp: { sent: boolean; channel: string; devCode?: string; throttledSeconds?: number } }),

  uploadResume: async (token: string, file: File) => {
    const fd = new FormData();
    fd.append('token', token);
    fd.append('resume', file);
    const res = await fetch(`${BASE}/resume`, { method: 'POST', body: fd });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || json?.success === false) throw new Error(json?.message || 'Resume upload failed');
    return json.data as { parsedSkills: string[] };
  },

  verifyOtp: (token: string, code: string) => post('/verify-otp', { token, code }),

  resendOtp: (token: string) =>
    post('/resend-otp', { token }).then((r) => r.data as { otp: { sent: boolean; channel: string; devCode?: string } }),

  start: (token: string) =>
    post('/start', { token }).then((r) => r.data as { items: AssessmentItemView[]; title: string; timeLimitMinutes: number; stage: number; totalStages: number; isLast: boolean }),

  // Submit the current stage; returns either the next stage or the final result.
  advance: (token: string, responses: ItemResponse[], antiCheatFlags?: string[]) =>
    post('/advance', { token, responses, antiCheatFlags }).then((r) => r.data as { done: boolean; stage?: number; totalStages?: number; isLast?: boolean; items?: AssessmentItemView[]; result?: any }),

  submit: (token: string, responses: ItemResponse[], antiCheatFlags?: string[]) =>
    post('/submit', { token, responses, antiCheatFlags }).then((r) => r.data),

  getResult: async (token: string) => {
    const res = await fetch(`${BASE}/result/${token}`);
    const json = await res.json().catch(() => ({}));
    if (!res.ok || json?.success === false) throw new Error(json?.message || 'Failed to load result');
    return json.data;
  },
};

export const SEGMENT_OPTIONS = [
  { value: 'first_year', label: '1st Year' },
  { value: 'second_third_year', label: '2nd–3rd Year' },
  { value: 'final_year', label: 'Final Year' },
  { value: 'graduate', label: 'Graduate (Job-seeking)' },
  { value: 'job_switcher', label: 'Working Professional (Switching)' },
];

// Friendly profile picker → maps to the backend segment (+ exact year).
export const PROFILE_OPTIONS: { value: string; label: string; segment: string; year?: string; professional?: boolean }[] = [
  { value: 'btech1', label: 'B.Tech · 1st Year', segment: 'first_year', year: '1st' },
  { value: 'btech2', label: 'B.Tech · 2nd Year', segment: 'second_third_year', year: '2nd' },
  { value: 'btech3', label: 'B.Tech · 3rd Year', segment: 'second_third_year', year: '3rd' },
  { value: 'btech4', label: 'B.Tech · Final Year', segment: 'final_year', year: '4th' },
  { value: 'graduate', label: 'Graduate (Job-seeking)', segment: 'graduate' },
  { value: 'professional', label: 'Working Professional', segment: 'job_switcher', professional: true },
];

export const PRIMARY_LANGUAGES = ['Java', 'Python', 'JavaScript', 'C++', 'C', 'C#', 'Go', 'PHP', 'Other'];

export const DIMENSION_LABELS: Record<string, string> = {
  aptitude: 'Aptitude',
  fundamentals: 'Fundamentals',
  dsa: 'DSA',
  core_stack: 'Core Stack',
  problem_solving: 'Problem Solving',
  system_design: 'System Design',
};
