import axios from 'axios';
import { API_BASE_URL } from './index';

/* CRM: Book a demo (server/src/routes/demoBookingRoutes.ts). Admin = /demo-slots, public = /public/demo. */

const authHeader = () => {
  const token = localStorage.getItem('token');
  const tenantId = localStorage.getItem('tenantId');
  return { ...(token && { Authorization: `Bearer ${token}` }), ...(tenantId && { 'X-Tenant-Id': tenantId }) };
};
const ADMIN = `${API_BASE_URL}/demo-slots`;
const PUB = `${API_BASE_URL}/public/demo`;
const get = async <T,>(url: string, params?: any): Promise<T> => (await axios.get(url, { headers: authHeader(), params })).data.data;
const send = async <T,>(method: 'post' | 'put' | 'delete', url: string, body?: any): Promise<T> =>
  (await axios.request({ method, url, data: body, headers: authHeader() })).data.data;
const pubGet = async <T,>(url: string): Promise<T> => (await axios.get(url)).data.data;
const pubPost = async <T,>(url: string, body?: any): Promise<T> => (await axios.post(url, body || {})).data.data;

export const demoErr = (e: any, fallback = 'Something went wrong. Please try again.'): string =>
  e?.response?.data?.message || e?.message || fallback;
export const demoErrCode = (e: any): string => e?.response?.data?.code || '';
export const demoFieldErrors = (e: any): Record<string, string> => e?.response?.data?.data?.fields || {};

export type JoinMethod = 'room' | 'link';
export interface DemoSlot {
  _id: string; course: string; courseKey: string; title: string; description?: string;
  startsAt: string; endsAt: string; durationMin: number; seats: number; booked: number; cutoffMin: number;
  hostId: string; hostName: string; joinMethod: JoinMethod; meetingLink?: string; liveClassId?: string;
  status: 'open' | 'cancelled' | 'done'; seriesId?: string;
  counts: { booked: number; attended: number; no_show: number; cancelled: number };
}
export interface Attendee {
  _id: string; name: string; phone: string; email: string; status: 'booked' | 'cancelled' | 'attended' | 'no_show'; cancelledBy?: string;
  leadId: string; owner: string; stage: { name: string; color?: string } | null; bookedAt: string;
  joinClickedAt: string | null; joinedRoomAt: string | null; minutesInRoom: number | null; source: string;
}
export interface DemoSettings {
  moveToDemoStage: boolean; defaultSeats: number; defaultCutoffMin: number; defaultDurationMin: number; attendedMinutes: number;
  pageTitle: string; pageSubtitle: string; bookingPage?: string;
}
export interface Host { _id: string; name: string; email: string; role: string }
export interface ReportRow { key: string; bookings: number; cancelled: number; attended: number; noShow: number; enrolled: number }
export interface DemoReport { from: string; to: string; slots: number; total: Omit<ReportRow, 'key'>; byCourse: ReportRow[]; bySource: ReportRow[]; byHour: ReportRow[] }

export const demoAdminApi = {
  slots: (scope: 'upcoming' | 'past' | 'all' = 'upcoming') => get<DemoSlot[]>(ADMIN, { scope }),
  create: (body: any) => send<{ created: number; slots: DemoSlot[] }>('post', ADMIN, body),
  update: (id: string, body: any) => send<DemoSlot>('put', `${ADMIN}/${id}`, body),
  cancel: (id: string, reason: string) => send<DemoSlot>('post', `${ADMIN}/${id}/cancel`, { reason }),
  remove: (id: string) => send<{ deleted: boolean }>('delete', `${ADMIN}/${id}`),
  attendees: (id: string) => get<{ slot: DemoSlot; attendees: Attendee[] }>(`${ADMIN}/${id}/attendees`),
  mark: (bookingId: string, status: 'attended' | 'no_show') => send('post', `${ADMIN}/bookings/${bookingId}/attendance`, { status }),
  hosts: () => get<Host[]>(`${ADMIN}/hosts`),
  settings: () => get<DemoSettings>(`${ADMIN}/settings`),
  saveSettings: (body: Partial<DemoSettings>) => send<DemoSettings>('put', `${ADMIN}/settings`, body),
  report: (from?: string, to?: string) => get<DemoReport>(`${ADMIN}/report`, { from, to }),
};

export interface PublicSlot {
  _id: string; course: string; courseKey: string; title: string; description: string; startsAt: string;
  durationMin: number; seatsLeft: number; seats: number; hostName: string; joinMethod: JoinMethod;
}
export interface Catalog {
  institute: { name: string; slug: string; logo: string };
  page: { title: string; subtitle: string };
  courses: { key: string; name: string }[];
  slots: PublicSlot[];
}
export interface BookingView {
  institute: { name: string; slug: string; logo: string };
  name: string; status: 'booked' | 'cancelled' | 'attended' | 'no_show'; cancelledBy: string | null;
  slot: PublicSlot & { status: string; endsAt: string };
  joinOpensAt: string; canJoin: boolean; ended: boolean; canChange: boolean; canCancel: boolean; rebookUrl: string;
}

export const demoPublicApi = {
  catalog: (slug: string) => pubGet<Catalog>(`${PUB}/${encodeURIComponent(slug)}/slots`),
  sendOtp: async (slug: string, phone: string, requestId?: string) =>
    (await axios.post(`${API_BASE_URL}/public/${encodeURIComponent(slug)}/otp/send`, { phone, requestId, purpose: 'demo' })).data.data as
      { requestId: string; resendAfterSec: number; devCode?: string },
  verifyOtp: async (slug: string, requestId: string, code: string) =>
    (await axios.post(`${API_BASE_URL}/public/${encodeURIComponent(slug)}/otp/verify`, { requestId, code })).data.data as { verificationToken: string },
  book: (slug: string, body: any) => pubPost<{ token: string; already: boolean; rescheduled: boolean }>(`${PUB}/${encodeURIComponent(slug)}/book`, body),
  booking: (token: string) => pubGet<BookingView>(`${PUB}/booking/${encodeURIComponent(token)}`),
  otherSlots: (token: string) => pubGet<{ courseKey: string; slots: PublicSlot[] }>(`${PUB}/booking/${encodeURIComponent(token)}/slots`),
  join: (token: string) => pubPost<{ url: string }>(`${PUB}/booking/${encodeURIComponent(token)}/join`),
  cancel: (token: string) => pubPost<BookingView>(`${PUB}/booking/${encodeURIComponent(token)}/cancel`),
  reschedule: (token: string, slotId: string) => pubPost<BookingView>(`${PUB}/booking/${encodeURIComponent(token)}/reschedule`, { slotId }),
  icsUrl: (token: string) => `${PUB}/booking/${encodeURIComponent(token)}/calendar.ics`,
};

/* IST formatting: the institute's times, whatever the visitor's device is set to. */
const IST = 'Asia/Kolkata';
export const istDayKey = (d: string | Date) => new Date(new Date(d).getTime() + 330 * 60_000).toISOString().slice(0, 10);
export const fmtTime = (d: string | Date) => new Date(d).toLocaleTimeString('en-IN', { timeZone: IST, hour: 'numeric', minute: '2-digit', hour12: true });
export const fmtDayLong = (d: string | Date) => new Date(d).toLocaleDateString('en-IN', { timeZone: IST, weekday: 'long', day: 'numeric', month: 'long' });
export const fmtDayShort = (d: string | Date) => new Date(d).toLocaleDateString('en-IN', { timeZone: IST, weekday: 'short', day: 'numeric', month: 'short' });
export const fmtWhen = (d: string | Date) => `${fmtDayShort(d)}, ${fmtTime(d)}`;
