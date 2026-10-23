/**
 * Help & Support labels and small helpers, with no network code, so components and their tests
 * can use them without loading the API client. Re-exported by api/supportApi.
 */
export type TicketStatus = 'open' | 'in_progress' | 'waiting_on_user' | 'resolved' | 'closed';
export type TicketPriority = 'low' | 'medium' | 'high' | 'critical';

export const STATUS_LABEL: Record<TicketStatus, string> = {
  open: 'Open', in_progress: 'In progress', waiting_on_user: 'Waiting on you', resolved: 'Resolved', closed: 'Closed',
};
/** Staff read "waiting on user"; the member reads "waiting on you". */
export const STAFF_STATUS_LABEL: Record<TicketStatus, string> = { ...STATUS_LABEL, waiting_on_user: 'Waiting on member' };
export const PRIORITY_LABEL: Record<TicketPriority, string> = { low: 'Low', medium: 'Medium', high: 'High', critical: 'Critical' };

export const MODULES: { key: string; label: string }[] = [
  { key: 'account', label: 'Account & login' }, { key: 'payment', label: 'Payment & membership' },
  { key: 'assessment', label: 'Assessment' }, { key: 'plan', label: 'My plan (days)' }, { key: 'roadmap', label: 'Roadmap' },
  { key: 'practice', label: 'Practice' }, { key: 'coding', label: 'Coding sets' }, { key: 'playground', label: 'Playground' },
  { key: 'thinking_lab', label: 'Thinking Lab' }, { key: 'communication', label: 'Communication Lab' },
  { key: 'interview', label: 'Mock interview' }, { key: 'mentor', label: 'AI Mentor' }, { key: 'opportunities', label: 'Opportunities' },
  { key: 'news', label: 'Tech News' }, { key: 'resume', label: 'Resume' }, { key: 'progress', label: 'My progress' },
  { key: 'career_tracks', label: 'Career tracks' }, { key: 'other', label: 'Something else' },
];
export const CATEGORIES: { key: string; label: string }[] = [
  { key: 'technical', label: 'Something is not working' }, { key: 'content', label: 'A lesson or question is wrong' },
  { key: 'account', label: 'My account' }, { key: 'payment', label: 'Payment' }, { key: 'assessment', label: 'Scores and results' },
  { key: 'feedback', label: 'Suggestion' }, { key: 'other', label: 'Other' },
];
export const moduleLabel = (k?: string) => MODULES.find(m => m.key === k)?.label || 'Other';
export const categoryLabel = (k?: string) => CATEGORIES.find(c => c.key === k)?.label || 'Other';

/** The server's own message for a failed call, or a plain fallback. Never a stack or a raw error. */
export const errorText = (e: any, fallback = 'Something went wrong. Please try again.') => {
  const m = e?.response?.data?.message;
  const ref = e?.response?.data?.requestId;
  return (typeof m === 'string' && m && m !== 'Internal server error' ? m : fallback) + (ref && e?.response?.status >= 500 ? ` (reference ${ref})` : '');
};

