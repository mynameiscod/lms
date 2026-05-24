const API_BASE_URL = process.env.REACT_APP_API_URL || '/api/v1';

function authHeaders() {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function apiFetch(url: string, options: RequestInit = {}) {
  const res = await fetch(url, { ...options, headers: { ...authHeaders(), ...(options.headers as any) } });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(err.message || 'Request failed');
  }
  return res.json();
}

// ─── Types ─────────────────────────────────────────────────────────────────────

export type ProgrammingLanguage =
  | 'java' | 'python' | 'javascript' | 'cpp' | 'sql' | 'typescript'
  | 'go' | 'rust' | 'kotlin' | 'swift';

export type SceneType =
  | 'story' | 'code_demo' | 'drag_drop' | 'quiz'
  | 'fill_blank' | 'code_run' | 'summary';

export type Difficulty = 'beginner' | 'intermediate' | 'advanced';

export interface StoryScene {
  avatarEmoji: string;
  avatarName: string;
  text: string;
  codeSnippet?: string;
  codeLanguage?: ProgrammingLanguage;
  animationType?: 'fade' | 'slide' | 'typewriter' | 'bounce';
}

export interface CodeDemoScene {
  language: ProgrammingLanguage;
  code: string;
  lines: Array<{ lineNumber: number; commentary: string }>;
  revealSpeed: 'slow' | 'normal' | 'fast';
  highlightColor?: string;
}

export interface DragDropScene {
  instruction: string;
  buckets: Array<{ id: string; label: string; color?: string }>;
  items: Array<{ id: string; label: string; targetBucket: string; isDecoy?: boolean }>;
  explanation: string;
}

export interface QuizScene {
  question: string;
  options: Array<{ id: string; text: string; isCorrect: boolean }>;
  explanation: string;
  hint?: string;
}

export interface FillBlankScene {
  templateText: string;
  blanks: Array<{ index: number; answer: string; hint?: string }>;
  explanation: string;
  isCode: boolean;
  codeLanguage?: ProgrammingLanguage;
}

export interface CodeRunScene {
  language: ProgrammingLanguage;
  starterCode: string;
  expectedOutput?: string;
  hint?: string;
  instructions: string;
  testCases?: Array<{ input: string; expectedOutput: string }>;
}

export interface SummaryScene {
  title: string;
  points: Array<{ emoji?: string; text: string }>;
  codeRecap?: string;
  codeLanguage?: ProgrammingLanguage;
  conceptMapItems?: Array<{ term: string; definition: string }>;
}

export interface Scene {
  _id?: string;
  type: SceneType;
  title?: string;
  xpReward: number;
  story?: StoryScene;
  codeDemo?: CodeDemoScene;
  dragDrop?: DragDropScene;
  quiz?: QuizScene;
  fillBlank?: FillBlankScene;
  codeRun?: CodeRunScene;
  summary?: SummaryScene;
}

export interface InteractiveLesson {
  _id: string;
  tenantId: string;
  contentLibraryId?: string;
  title: string;
  description?: string;
  language: ProgrammingLanguage;
  concept: string;
  difficulty: Difficulty;
  scenes: Scene[];
  totalXp: number;
  passingScore: number;
  isPublished: boolean;
  createdBy: string;
  viewCount: number;
  completionCount: number;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface LessonProgress {
  _id: string;
  lessonId: string;
  studentId: string;
  status: 'not_started' | 'in_progress' | 'completed' | 'passed' | 'failed';
  currentSceneIndex: number;
  sceneResults: Array<{
    sceneId: string;
    sceneType: string;
    completed: boolean;
    passed?: boolean;
    attemptsUsed: number;
    xpEarned: number;
    timeSpentSeconds: number;
    completedAt?: string;
  }>;
  totalXpEarned: number;
  score: number;
  timeSpentSeconds: number;
  startedAt?: string;
  completedAt?: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

export const SCENE_TYPE_LABELS: Record<SceneType, string> = {
  story:      'Story / Narration',
  code_demo:  'Code Demo',
  drag_drop:  'Drag & Drop',
  quiz:       'Quiz (MCQ)',
  fill_blank: 'Fill in the Blank',
  code_run:   'Live Code Runner',
  summary:    'Summary',
};

export const SCENE_TYPE_ICONS: Record<SceneType, string> = {
  story:      '📖',
  code_demo:  '💻',
  drag_drop:  '🧩',
  quiz:       '❓',
  fill_blank: '✏️',
  code_run:   '▶️',
  summary:    '📋',
};

export const LANGUAGE_LABELS: Record<ProgrammingLanguage, string> = {
  java:       'Java',
  python:     'Python',
  javascript: 'JavaScript',
  cpp:        'C++',
  sql:        'SQL',
  typescript: 'TypeScript',
  go:         'Go',
  rust:       'Rust',
  kotlin:     'Kotlin',
  swift:      'Swift',
};

export const DIFFICULTY_COLORS: Record<Difficulty, string> = {
  beginner:     '#10b981',
  intermediate: '#f59e0b',
  advanced:     '#ef4444',
};

// Piston language runtime names
export const PISTON_LANG: Record<string, string> = {
  java:       'java',
  python:     'python',
  javascript: 'javascript',
  cpp:        'c++',
  typescript: 'typescript',
  go:         'go',
  rust:       'rust',
  kotlin:     'kotlin',
  swift:      'swift',
};

// ─── API ───────────────────────────────────────────────────────────────────────

export const interactiveLessonApi = {
  list: (params?: {
    language?: string;
    concept?: string;
    difficulty?: string;
    search?: string;
    published?: boolean;
  }) => {
    const q = new URLSearchParams();
    if (params?.language)   q.set('language', params.language);
    if (params?.concept)    q.set('concept', params.concept);
    if (params?.difficulty) q.set('difficulty', params.difficulty);
    if (params?.search)     q.set('search', params.search);
    if (params?.published !== undefined) q.set('published', String(params.published));
    return apiFetch(`${API_BASE_URL}/interactive-lessons?${q}`);
  },

  getById: (id: string): Promise<InteractiveLesson> =>
    apiFetch(`${API_BASE_URL}/interactive-lessons/${id}`),

  create: (data: Partial<InteractiveLesson> & { createLibraryEntry?: boolean }) =>
    apiFetch(`${API_BASE_URL}/interactive-lessons`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id: string, data: Partial<InteractiveLesson>) =>
    apiFetch(`${API_BASE_URL}/interactive-lessons/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  delete: (id: string) =>
    apiFetch(`${API_BASE_URL}/interactive-lessons/${id}`, { method: 'DELETE' }),

  getTemplates: () =>
    apiFetch(`${API_BASE_URL}/interactive-lessons/templates`),

  // Progress (student)
  getProgress: (lessonId: string): Promise<LessonProgress> =>
    apiFetch(`${API_BASE_URL}/interactive-lessons/${lessonId}/progress`),

  saveSceneProgress: (lessonId: string, data: {
    sceneId: string;
    sceneType: string;
    completed?: boolean;
    passed?: boolean;
    xpEarned?: number;
    timeSpentSeconds?: number;
    currentSceneIndex?: number;
  }) =>
    apiFetch(`${API_BASE_URL}/interactive-lessons/${lessonId}/progress/scene`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  completeLesson: (lessonId: string): Promise<{ progress: LessonProgress; score: number; passed: boolean }> =>
    apiFetch(`${API_BASE_URL}/interactive-lessons/${lessonId}/complete`, { method: 'POST' }),

  // Admin
  getProgressAdmin: (lessonId: string) =>
    apiFetch(`${API_BASE_URL}/interactive-lessons/${lessonId}/progress-admin`),
};

// ─── Code runner ──────────────────────────────────────────────────────────────
export async function runCode(language: string, code: string, stdin = ''): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  return apiFetch(`${API_BASE_URL}/interactive-lessons/execute`, {
    method: 'POST',
    body: JSON.stringify({ language, code, stdin }),
  });
}
