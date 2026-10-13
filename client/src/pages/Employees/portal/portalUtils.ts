import { DayMode } from '../../../api/employeesApi';

/** Today's date in India, as YYYY-MM-DD. */
export const todayIST = (): string => new Date(Date.now() + 330 * 60000).toISOString().slice(0, 10);
export const monthIST = (): string => todayIST().slice(0, 7);

/** Add (or subtract) days to a YYYY-MM-DD date. */
export const addDays = (date: string, n: number): string => {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};
export const daysBetween = (from: string, to: string): number =>
  Math.round((new Date(`${to}T00:00:00Z`).getTime() - new Date(`${from}T00:00:00Z`).getTime()) / 86400000);

/** "Mon, 12 Oct" from a YYYY-MM-DD or ISO date. */
export const fmtDay = (date: string): string =>
  new Date(`${date.slice(0, 10)}T00:00:00Z`).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' });
export const fmtLongDay = (date: string): string =>
  new Date(`${date.slice(0, 10)}T00:00:00Z`).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
export const fmtDate = (date?: string): string =>
  date ? new Date(date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' }) : '—';
export const fmtTime = (iso?: string): string =>
  iso ? new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' }) : '—';
export const fmtDateTime = (iso?: string): string => (iso ? `${fmtDate(iso)}, ${fmtTime(iso)}` : '—');

export const inr = (n: number): string => `₹${(n || 0).toLocaleString('en-IN')}`;
export const hoursText = (h: number): string => `${Math.round((h || 0) * 100) / 100}h`;

export const DAY_MODES: { k: DayMode; label: string }[] = [
  { k: 'office', label: 'Office' },
  { k: 'remote', label: 'Remote' },
  { k: 'field', label: 'Field' },
  { k: 'leave', label: 'Leave' },
  { k: 'holiday', label: 'Holiday' },
];
export const modeLabel = (m?: string): string => DAY_MODES.find((x) => x.k === m)?.label || (m ? m[0].toUpperCase() + m.slice(1) : '—');
export const isOffDay = (m?: string): boolean => m === 'leave' || m === 'holiday';

export const initials = (name: string): string =>
  name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0].toUpperCase()).join('') || '?';
