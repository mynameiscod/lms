/**
 * The adaptive plan, from the client's side.
 *
 * Every response carries `why` on each topic — the answer to "why am I learning this?" travels
 * with the thing being explained rather than needing a second call, so no screen can render a
 * plan without being able to justify it.
 */
import axios from 'axios';

const BASE = (process.env.REACT_APP_API_URL || '/api/v1') + '/adaptive';

const auth = () => {
  const token = localStorage.getItem('token');
  const tenantId = localStorage.getItem('tenantId');
  return {
    ...(token && { Authorization: `Bearer ${token}` }),
    ...(tenantId && { 'X-Tenant-Id': tenantId }),
  };
};

/** What a student needs from a topic. Mirrors AssignmentState on the server. */
export type AssignmentState =
  | 'NOT_EXPOSED' | 'FOUNDATION_REQUIRED' | 'GUIDED' | 'STANDARD'
  | 'REVISION' | 'VERIFIED' | 'ENRICHMENT' | 'NOT_RELEVANT' | 'LOCKED';

export interface PlanTopic {
  topicId?: string;
  topicCode?: string;
  title: string;
  skillKeys: string[];
  state: AssignmentState;
  depth: string;
  practiceCount: number;
  contentIds: string[];
  mandatory: boolean;
  locked: boolean;
  lockedBy: string | null;
  /** The sentence shown under "why am I seeing this?". Built server-side, never generated. */
  why: string;
  reason: string;
  score: number | null;
}

export interface PlanModule {
  moduleCode: string;
  moduleName?: string;
  topics: PlanTopic[];
}

export interface AdaptivePlan {
  id: string;
  version: number;
  stage: string;
  academicYear?: string;
  direction: string | null;
  directionStatus: 'SELECTED' | 'EXPLORING' | 'UNDECIDED';
  explorationDirections: string[];
  availability: { hoursPerDay: number; daysPerWeek: number; weeklyPlannableMinutes: number; activeTopicsPerWeek: number };
  estimatedWeeks: number;
  totalAssignedMinutes: number;
  generatedAt: string;
  lastReplannedAt: string | null;
  summary: Record<string, number>;
  modules: PlanModule[];
}

export interface DirectionInfo {
  direction: { key: string; name: string } | null;
  status: 'SELECTED' | 'EXPLORING' | 'UNDECIDED';
  explorationDirections: string[];
  basis: string;
  message: string;
}

export const adaptiveApi = {
  listDirections: async (): Promise<{ key: string; name: string; blurb: string }[]> => {
    const { data } = await axios.get(`${BASE}/directions`, { headers: auth() });
    return data.directions || [];
  },

  getDirection: async (studentId: string): Promise<DirectionInfo> => {
    const { data } = await axios.get(`${BASE}/students/${studentId}/direction`, { headers: auth() });
    return data;
  },

  getPlan: async (studentId: string, curriculumId: string): Promise<AdaptivePlan | null> => {
    const { data } = await axios.get(`${BASE}/students/${studentId}/plan/${curriculumId}`, { headers: auth() });
    return data.hasPlan ? data.plan : null;
  },

  generatePlan: async (studentId: string, curriculumId: string, replan = false) => {
    const { data } = await axios.post(
      `${BASE}/students/${studentId}/plan/${curriculumId}/generate`, { replan }, { headers: auth() });
    return data;
  },

  replan: async (studentId: string, curriculumId: string) => {
    const { data } = await axios.post(
      `${BASE}/students/${studentId}/plan/${curriculumId}/replan`, {}, { headers: auth() });
    return data;
  },

  checkReplan: async (studentId: string, curriculumId: string): Promise<{ needed: boolean; changedSkills: string[] }> => {
    const { data } = await axios.get(
      `${BASE}/students/${studentId}/plan/${curriculumId}/replan-check`, { headers: auth() });
    return data;
  },

  contentGaps: async (curriculumId: string) => {
    const { data } = await axios.get(`${BASE}/curricula/${curriculumId}/content-gaps`, { headers: auth() });
    return data;
  },
};

/* ------------------------------------------------------------------ *
 * Presentation
 * ------------------------------------------------------------------ */

/**
 * How each state is named to a student.
 *
 * NOT_EXPOSED reads "Not started yet" and never anything resembling a failure — nobody has
 * asked them the question. The distinction is preserved all the way to the screen, because
 * losing it at the last step would undo the point of carrying it through the whole system.
 */
export const STATE_LABEL: Record<AssignmentState, string> = {
  NOT_EXPOSED:         'Not started yet',
  FOUNDATION_REQUIRED: 'Building from the start',
  GUIDED:              'Guided practice',
  STANDARD:            'In progress',
  REVISION:            'Quick revision',
  VERIFIED:            'Mastery verified',
  ENRICHMENT:          'Go further',
  NOT_RELEVANT:        'Not in your path',
  LOCKED:              'Unlocks later',
};

/** Tone, not severity. Nothing here is styled as an error. */
export const STATE_TONE: Record<AssignmentState, 'build' | 'active' | 'done' | 'muted' | 'locked'> = {
  NOT_EXPOSED:         'build',
  FOUNDATION_REQUIRED: 'build',
  GUIDED:              'active',
  STANDARD:            'active',
  REVISION:            'active',
  VERIFIED:            'done',
  ENRICHMENT:          'done',
  NOT_RELEVANT:        'muted',
  LOCKED:              'locked',
};
