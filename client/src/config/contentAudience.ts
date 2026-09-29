// Which student population a quiz / assignment is listed to. Values MUST match the server-side
// CONTENT_AUDIENCES (server/src/services/learnerAudience.ts) — the same vocabulary Question Books use.
// Rows saved before the field existed have none; they have always been LMS, so they read as 'lms'.
export type ContentAudience = 'lms' | 'careerpilot' | 'all';
export interface AudienceDef { value: ContentAudience; label: string; short: string; icon: string; color: string; bg: string; }

export const AUDIENCE_OPTIONS: AudienceDef[] = [
  { value: 'lms',         label: 'LMS students',       short: 'LMS',        icon: '🎓', color: '#1d4ed8', bg: '#eff6ff' },
  { value: 'careerpilot', label: 'CareerPilot members', short: 'CareerPilot', icon: '🧭', color: '#7c3aed', bg: '#f5f3ff' },
  { value: 'all',         label: 'Both',               short: 'Both',       icon: '🌐', color: '#047857', bg: '#ecfdf5' },
];

export const audienceDef = (v?: string): AudienceDef =>
  AUDIENCE_OPTIONS.find(a => a.value === v) || AUDIENCE_OPTIONS[0];
