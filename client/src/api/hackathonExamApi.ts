import { API_BASE_URL, authenticatedFetch } from './index';

/**
 * The hackathon exam.
 *
 * The candidate half is UNAUTHENTICATED — a team was given a code, not an account — so it uses
 * plain fetch. The admin half goes through authenticatedFetch like every other admin screen.
 */

const PUBLIC = `${API_BASE_URL}/public/hackathon-exams`;
const ADMIN = `${API_BASE_URL}/hackathon-exams`;

/** One session id per browser tab, so the single-device lock can tell tabs apart. */
export const sessionId = (): string => {
  const KEY = 'hx-session-id';
  let id = sessionStorage.getItem(KEY);
  if (!id) {
    id = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
    sessionStorage.setItem(KEY, id);
  }
  return id;
};

/**
 * A rough device signature, used only to FLAG a team whose members all sat the paper on one
 * machine. Deliberately crude and never treated as proof — a college lab looks identical.
 */
export const fingerprint = (): string => {
  /* `window.screen`, not the bare global: CRA's lint restricts it because testing-library
     exports a `screen` of its own, and the two read identically at a glance. */
  const s = window.screen;
  const bits = [
    navigator.userAgent, navigator.language, String(s.width), String(s.height),
    String(s.colorDepth), String(new Date().getTimezoneOffset()),
    String((navigator as any).hardwareConcurrency || ''),
  ].join('|');
  let h = 0;
  for (let i = 0; i < bits.length; i++) { h = ((h << 5) - h + bits.charCodeAt(i)) | 0; }
  return Math.abs(h).toString(36);
};

async function call<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { 'Content-Type': 'application/json', 'x-session-id': sessionId(), ...(init?.headers || {}) },
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json?.success === false) {
    const err: any = new Error(json?.message || 'Something went wrong.');
    err.code = json?.code;
    err.status = res.status;
    err.data = json?.data;
    throw err;
  }
  return (json?.data ?? json) as T;
}

/* ── types ─────────────────────────────────────────────────────────────────── */

export interface ExamQuestion {
  itemId: string;
  sectionKey: string;
  order: number;
  type: 'mcq' | 'live_code' | 'sql' | 'predict_output' | 'debug' | 'complete_code';
  marks: number;
  prompt: string;
  codeSnippet?: string;
  options?: { id: string; text: string }[];
  language?: string;
  starterCode?: string;
  functionSignature?: string;
  sampleCases?: { input: string; expectedOutput: string }[];
  answer?: { selectedOptionIds?: string[]; code?: string; text?: string; runsUsed: number };
}

export interface ExamOverview {
  candidate: { name: string; teamName: string; teamCode: string };
  hackathon: { title?: string; bannerUrl?: string; collegeLogoUrl?: string };
  exam: {
    title: string; instructions: string;
    startAt: string; endAt: string; durationMins: number;
    navigation: 'free' | 'sequential';
    sections: { key: string; label: string; count: number }[];
    totalQuestions: number; totalMarks: number;
    runPolicy: { enabled: boolean; maxRunsPerQuestion: number; cooldownSeconds: number; maxSampleCases: number };
    proctoring: any;
  };
  attempt: {
    otpVerified: boolean;
    status: string; startedAt: string | null; submittedAt: string | null;
    endsAt: string | null; violations: number;
  };
  gate: { code: string; message: string } | null;
}

export interface RunResult {
  output: string; error?: string; executionTimeMs: number;
  runsUsed: number; runsLeft: number | null;
  cases?: { input: string; expectedOutput: string; actualOutput: string; passed: boolean }[];
}

export interface ViolationOutcome {
  recorded: boolean; count: number; remaining: number | null;
  autoSubmitted: boolean; message?: string;
}

/* ── candidate ─────────────────────────────────────────────────────────────── */

export const hackathonExamApi = {
  bySlug: (slug: string) => call<any>(`${PUBLIC}/${encodeURIComponent(slug)}`),

  requestOtp: (slug: string, teamCode: string, mobile: string) =>
    call<{ sent: boolean; channel: string; maskedMobile: string }>(`${PUBLIC}/otp/request`, {
      method: 'POST', body: JSON.stringify({ slug, teamCode, mobile }),
    }),

  verifyOtp: (slug: string, teamCode: string, mobile: string, code: string) =>
    call<{ examToken: string; memberName: string; teamName: string }>(`${PUBLIC}/otp/verify`, {
      method: 'POST', body: JSON.stringify({ slug, teamCode, mobile, code }),
    }),

  /* Verifying from a personal link, where the candidate has never seen a team code. */
  requestOtpByToken: (token: string) =>
    call<{ sent: boolean; channel: string; maskedMobile: string }>(`${PUBLIC}/attempt/${token}/otp/request`, { method: 'POST' }),

  verifyOtpByToken: (token: string, code: string) =>
    call<{ examToken: string; memberName: string; teamName: string }>(`${PUBLIC}/attempt/${token}/otp/verify`, {
      method: 'POST', body: JSON.stringify({ code }),
    }),

  /** Tell the server how the camera went — recorded, refused, or could not. */
  recordingState: (token: string, state: string, note?: string) =>
    call<{ state: string }>(`${PUBLIC}/attempt/${token}/recording/state`, {
      method: 'POST', body: JSON.stringify({ state, note }),
    }),

  overview: (token: string) => call<ExamOverview>(`${PUBLIC}/attempt/${token}`),

  start: (token: string) =>
    call<{ startedAt: string; endsAt: string; resumed: boolean; serverNow: string; questions: ExamQuestion[] }>(
      `${PUBLIC}/attempt/${token}/start`,
      { method: 'POST', body: JSON.stringify({ sessionId: sessionId(), fingerprint: fingerprint() }) },
    ),

  heartbeat: (token: string) =>
    call<{ submitted: boolean; reason?: string; endsAt?: string; serverNow: string }>(
      `${PUBLIC}/attempt/${token}/heartbeat`,
      { method: 'POST', body: JSON.stringify({ sessionId: sessionId() }) },
    ),

  saveAnswer: (token: string, body: { itemId: string; selectedOptionIds?: string[]; code?: string; language?: string; text?: string }) =>
    call<{ saved: boolean; at: string }>(`${PUBLIC}/attempt/${token}/answer`, {
      method: 'POST', body: JSON.stringify(body),
    }),

  reportViolation: (token: string, kind: string, meta?: any) =>
    call<ViolationOutcome>(`${PUBLIC}/attempt/${token}/violation`, {
      method: 'POST', body: JSON.stringify({ kind, meta }),
    }),

  run: (token: string, itemId: string, code: string, language?: string) =>
    call<RunResult>(`${PUBLIC}/attempt/${token}/run`, {
      method: 'POST', body: JSON.stringify({ itemId, code, language }),
    }),

  submit: (token: string) =>
    call<{ submittedAt: string; timeSpentSec: number; answered: number; totalQuestions: number; message: string }>(
      `${PUBLIC}/attempt/${token}/submit`, { method: 'POST', body: '{}' },
    ),

  result: (token: string) => call<any>(`${PUBLIC}/attempt/${token}/result`),
};

/* ── admin ─────────────────────────────────────────────────────────────────── */

export const hackathonExamAdminApi = {
  get: async (hackathonId: string) =>
    (await authenticatedFetch(`${ADMIN}/by-hackathon/${hackathonId}`) as any)?.data ?? null,

  save: async (hackathonId: string, body: any) =>
    (await authenticatedFetch(`${ADMIN}/by-hackathon/${hackathonId}`, {
      method: 'POST', body: JSON.stringify(body),
    }) as any)?.data,

  coverage: async (id: string) => (await authenticatedFetch(`${ADMIN}/${id}/coverage`) as any)?.data,
  readiness: async (id: string) => (await authenticatedFetch(`${ADMIN}/${id}/readiness`) as any)?.data,

  provision: async (id: string) =>
    (await authenticatedFetch(`${ADMIN}/${id}/provision`, { method: 'POST', body: '{}' }) as any)?.data,

  invite: async (id: string) =>
    (await authenticatedFetch(`${ADMIN}/${id}/invite`, { method: 'POST', body: '{}' }) as any)?.data,

  dashboard: async (id: string) => (await authenticatedFetch(`${ADMIN}/${id}/dashboard`) as any)?.data,

  attempts: async (id: string, params: Record<string, string> = {}) => {
    const q = new URLSearchParams(params).toString();
    return (await authenticatedFetch(`${ADMIN}/${id}/attempts${q ? `?${q}` : ''}`) as any)?.data || [];
  },

  /** One candidate's invitation again — the bulk send skips anyone already invited. */
  resendInvite: async (id: string, attemptId: string) =>
    (await authenticatedFetch(`${ADMIN}/${id}/attempts/${attemptId}/resend-invite`, { method: 'POST' }) as any)?.data,

  attempt: async (id: string, attemptId: string) =>
    (await authenticatedFetch(`${ADMIN}/${id}/attempts/${attemptId}`) as any)?.data,

  gradePass: async (id: string) =>
    (await authenticatedFetch(`${ADMIN}/${id}/grade`, { method: 'POST', body: '{}' }) as any)?.data,

  overrideScore: async (id: string, attemptId: string, score: number, note?: string) =>
    (await authenticatedFetch(`${ADMIN}/${id}/attempts/${attemptId}/score`, {
      method: 'POST', body: JSON.stringify({ score, note }),
    }) as any)?.data,

  leaderboard: async (id: string) => (await authenticatedFetch(`${ADMIN}/${id}/leaderboard`) as any)?.data || [],

  close: async (id: string) =>
    (await authenticatedFetch(`${ADMIN}/${id}/close`, { method: 'POST', body: '{}' }) as any)?.data,

  publish: async (id: string, force = false) =>
    (await authenticatedFetch(`${ADMIN}/${id}/publish`, { method: 'POST', body: JSON.stringify({ force }) }) as any)?.data,

  sendResults: async (id: string) =>
    (await authenticatedFetch(`${ADMIN}/${id}/send-results`, { method: 'POST', body: '{}' }) as any)?.data,
};
