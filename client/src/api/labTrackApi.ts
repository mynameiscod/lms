const API = (process.env.REACT_APP_API_URL || '/api/v1') + '/lab-tracks';

const headers = () => {
  const token = localStorage.getItem('token');
  const tenantId = localStorage.getItem('tenantId');
  return {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
    ...(tenantId && { 'X-Tenant-Id': tenantId }),
  } as Record<string, string>;
};

/** Surfaces the server's message — these endpoints return real refusals
 *  ("Cannot publish: 40 of 145 days filled") that the admin needs to read. */
async function call(path: string, init: RequestInit = {}) {
  const res = await fetch(`${API}${path}`, { headers: headers(), ...init });
  let body: any = null;
  try { body = await res.json(); } catch { /* empty */ }
  if (!res.ok || body?.success === false) throw new Error(body?.message || `Request failed (${res.status})`);
  return body?.data;
}

export type Lab = 'thinking' | 'communication';

export interface Track {
  _id: string; name: string; lab: Lab; description?: string;
  totalDays: number; daysPerWeek: number; status: 'draft' | 'published';
  filledDays?: number; isComplete?: boolean;
}

export interface TrackItem {
  _id?: string; dayIndex: number; week?: number;
  contentId: string; concept?: string; optional?: boolean;
  content?: { _id: string; title: string; category?: string; difficulty?: string; challengeType?: string } | null;
  missing?: boolean;
}

export const listTracks = (lab?: Lab): Promise<Track[]> =>
  call(`${lab ? `?lab=${lab}` : ''}`);

export const createTrack = (b: Partial<Track>): Promise<Track> =>
  call('', { method: 'POST', body: JSON.stringify(b) });

export const updateTrack = (id: string, b: Partial<Track>): Promise<Track> =>
  call(`/${id}`, { method: 'PUT', body: JSON.stringify(b) });

export const deleteTrack = (id: string): Promise<void> =>
  call(`/${id}`, { method: 'DELETE' });

export const getTrack = (id: string): Promise<{ track: Track; items: TrackItem[]; filledDays: number }> =>
  call(`/${id}`);

export const library = (lab: Lab, q = ''): Promise<any[]> =>
  call(`/library?lab=${lab}${q ? `&q=${encodeURIComponent(q)}` : ''}`);

export const setItems = (id: string, items: { dayIndex: number; contentId: string | null }[]) =>
  call(`/${id}/items`, { method: 'PUT', body: JSON.stringify({ items }) });

export const listAssignments = (batchId?: string): Promise<any[]> =>
  call(`/assignments/list${batchId ? `?batchId=${batchId}` : ''}`);

export const upsertAssignment = (b: any) =>
  call('/assignments', { method: 'POST', body: JSON.stringify(b) });

export const deleteAssignment = (id: string) =>
  call(`/assignments/${id}`, { method: 'DELETE' });

export const previewToday = (batchId: string, lab: Lab) =>
  call(`/assignments/preview?batchId=${batchId}&lab=${lab}`);
