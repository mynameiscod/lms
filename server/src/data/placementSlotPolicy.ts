/**
 * Placement interview slots and calendar invites — pure, so they are tested without a database.
 *
 * All availability is authored in IST (India has no daylight saving, so the offset is constant).
 * A candidate is shown TIMES, not interviewers: a time is offered while at least one interviewer is
 * free at it, and the booking is assigned to the least-loaded of them.
 */

export const IST_OFFSET_MIN = 330;

export interface SlotInterviewer {
  id: string; name: string; active: boolean; meetingUrl: string;
  weekly: { day: number; start: string; end: string }[];
  daysOff: string[];
}
export interface SlotBooking { interviewerId: string; startsAt: Date; endsAt: Date }
export interface SlotConfig { slotMinutes: number; bufferMinutes: number; bookingWindowDays: number; minNoticeHours: number }
export interface Slot { startsAt: string; endsAt: string; interviewerIds: string[] }

const hm = (s: string): number | null => {
  const m = /^(\d{1,2}):(\d{2})$/.exec(String(s || '').trim());
  if (!m) return null;
  const h = Number(m[1]), mi = Number(m[2]);
  return h < 24 && mi < 60 ? h * 60 + mi : null;
};

/** IST calendar date ("YYYY-MM-DD") of an instant. */
export function istDate(d: Date): string {
  return new Date(d.getTime() + IST_OFFSET_MIN * 60_000).toISOString().slice(0, 10);
}

/** The UTC instant for an IST wall-clock time on an IST date. */
export function istToUtc(date: string, minutesOfDay: number): Date {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d, 0, minutesOfDay) - IST_OFFSET_MIN * 60_000);
}

export function generateSlots(interviewers: SlotInterviewer[], bookings: SlotBooking[], cfg: SlotConfig, now: Date = new Date()): Slot[] {
  const earliest = now.getTime() + cfg.minNoticeHours * 3_600_000;
  const byInterviewer = new Map<string, SlotBooking[]>();
  for (const b of bookings) {
    const list = byInterviewer.get(b.interviewerId) || [];
    list.push(b);
    byInterviewer.set(b.interviewerId, list);
  }
  const step = (cfg.slotMinutes + cfg.bufferMinutes) * 60_000;
  const slots = new Map<number, Slot>();
  const today = istDate(now);

  for (let dayOffset = 0; dayOffset <= cfg.bookingWindowDays; dayOffset++) {
    const date = istDate(new Date(istToUtc(today, 12 * 60).getTime() + dayOffset * 86_400_000));
    const weekday = new Date(`${date}T12:00:00Z`).getUTCDay();
    for (const iv of interviewers) {
      if (!iv.active || !iv.meetingUrl || iv.daysOff.includes(date)) continue;
      for (const w of iv.weekly.filter((x) => x.day === weekday)) {
        const start = hm(w.start), end = hm(w.end);
        if (start === null || end === null || end <= start) continue;
        for (let t = istToUtc(date, start).getTime(); t + cfg.slotMinutes * 60_000 <= istToUtc(date, end).getTime(); t += step) {
          if (t < earliest) continue;
          const sEnd = t + cfg.slotMinutes * 60_000;
          // Busy if it overlaps a booking or that booking's buffer.
          const busy = (byInterviewer.get(iv.id) || []).some((b) =>
            t < b.endsAt.getTime() + cfg.bufferMinutes * 60_000 && sEnd + cfg.bufferMinutes * 60_000 > b.startsAt.getTime());
          if (busy) continue;
          const slot = slots.get(t) || { startsAt: new Date(t).toISOString(), endsAt: new Date(sEnd).toISOString(), interviewerIds: [] };
          slot.interviewerIds.push(iv.id);
          slots.set(t, slot);
        }
      }
    }
  }
  return [...slots.entries()].sort((a, b) => a[0] - b[0]).map(([, s]) => s);
}

/** Of the interviewers free at a time, the one with the fewest upcoming bookings (then by name). */
export function pickInterviewer(freeIds: string[], upcomingCount: Record<string, number>, names: Record<string, string> = {}): string | null {
  if (!freeIds.length) return null;
  return [...freeIds].sort((a, b) => (upcomingCount[a] || 0) - (upcomingCount[b] || 0) || String(names[a] || a).localeCompare(String(names[b] || b)))[0];
}

/** "Mon, 6 Oct, 10:30 am" in IST — how a time is written in messages. */
export function istLabel(d: Date): string {
  return d.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', hour12: true });
}

const icsDate = (d: Date) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
const icsText = (s: string) => String(s || '').replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/([,;])/g, '\\$1');

/** A calendar invite (RFC 5545) that opens in Gmail, Outlook, Hostinger webmail and phone calendars. */
export function buildIcs(e: {
  uid: string; startsAt: Date; endsAt: Date; summary: string; description: string; url?: string;
  organizer?: { name: string; email: string }; attendees?: { name: string; email: string }[]; cancelled?: boolean;
}): string {
  const lines = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//CodeBegun//Placement Program//EN', 'CALSCALE:GREGORIAN',
    `METHOD:${e.cancelled ? 'CANCEL' : 'REQUEST'}`,
    'BEGIN:VEVENT',
    `UID:${e.uid}`,
    `DTSTAMP:${icsDate(new Date())}`,
    `DTSTART:${icsDate(e.startsAt)}`,
    `DTEND:${icsDate(e.endsAt)}`,
    `SUMMARY:${icsText(e.summary)}`,
    `DESCRIPTION:${icsText(e.description)}`,
    ...(e.url ? [`LOCATION:${icsText(e.url)}`, `URL:${e.url}`] : []),
    ...(e.organizer ? [`ORGANIZER;CN=${icsText(e.organizer.name)}:mailto:${e.organizer.email}`] : []),
    ...(e.attendees || []).filter((a) => a.email).map((a) => `ATTENDEE;CN=${icsText(a.name)};RSVP=TRUE:mailto:${a.email}`),
    `STATUS:${e.cancelled ? 'CANCELLED' : 'CONFIRMED'}`,
    ...(e.cancelled ? [] : ['BEGIN:VALARM', 'TRIGGER:-PT30M', 'ACTION:DISPLAY', `DESCRIPTION:${icsText(e.summary)}`, 'END:VALARM']),
    'END:VEVENT', 'END:VCALENDAR',
  ];
  return lines.join('\r\n') + '\r\n';
}
