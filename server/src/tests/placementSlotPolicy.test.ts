import { generateSlots, pickInterviewer, istToUtc, istDate, buildIcs } from '../data/placementSlotPolicy';

const cfg = { slotMinutes: 30, bufferMinutes: 10, bookingWindowDays: 7, minNoticeHours: 0 };
// Monday 5 Oct 2026, 08:00 IST
const now = istToUtc('2026-10-05', 8 * 60);
const iv = (id: string, weekly: any[], extra: any = {}) => ({ id, name: id, active: true, meetingUrl: 'https://meet.google.com/x', weekly, daysOff: [], ...extra });

describe('generateSlots', () => {
  it('cuts a 10:00–11:30 IST window into 30-minute slots with 10-minute gaps (no slot runs past the window)', () => {
    const slots = generateSlots([iv('a', [{ day: 1, start: '10:00', end: '11:30' }])], [], cfg, now);
    const mon = slots.filter((s) => istDate(new Date(s.startsAt)) === '2026-10-05');
    expect(mon.map((s) => new Date(s.startsAt).toISOString())).toEqual([
      // 10:00 and 10:40 fit; 11:20 would end at 11:50, past the window.
      istToUtc('2026-10-05', 600).toISOString(), istToUtc('2026-10-05', 640).toISOString(),
    ]);
  });

  it('removes a booked slot (and its buffer) for that interviewer only', () => {
    const b = { interviewerId: 'a', startsAt: istToUtc('2026-10-05', 640), endsAt: istToUtc('2026-10-05', 670) };
    const slots = generateSlots([iv('a', [{ day: 1, start: '10:00', end: '11:30' }]), iv('b', [{ day: 1, start: '10:00', end: '11:30' }])], [b], cfg, now)
      .filter((s) => istDate(new Date(s.startsAt)) === '2026-10-05');
    const at1040 = slots.find((s) => s.startsAt === istToUtc('2026-10-05', 640).toISOString())!;
    expect(at1040.interviewerIds).toEqual(['b']);
  });

  it('skips days off, inactive interviewers, those without a meeting link, and slots inside the notice period', () => {
    const list = [
      iv('off', [{ day: 1, start: '10:00', end: '11:00' }], { daysOff: ['2026-10-05'] }),
      iv('inactive', [{ day: 1, start: '10:00', end: '11:00' }], { active: false }),
      iv('nolink', [{ day: 1, start: '10:00', end: '11:00' }], { meetingUrl: '' }),
    ];
    expect(generateSlots(list, [], cfg, now).filter((s) => istDate(new Date(s.startsAt)) === '2026-10-05')).toEqual([]);
    const tooSoon = generateSlots([iv('a', [{ day: 1, start: '09:00', end: '10:00' }])], [], { ...cfg, minNoticeHours: 2 }, now);
    expect(tooSoon.some((s) => istDate(new Date(s.startsAt)) === '2026-10-05')).toBe(false);
  });
});

describe('pickInterviewer', () => {
  it('chooses the least loaded, then alphabetically', () => {
    expect(pickInterviewer(['a', 'b'], { a: 3, b: 1 })).toBe('b');
    expect(pickInterviewer(['b', 'a'], {}, { a: 'Anil', b: 'Bala' })).toBe('a');
    expect(pickInterviewer([], {})).toBeNull();
  });
});

describe('buildIcs', () => {
  it('produces a REQUEST invite with UTC times, the meeting link and a reminder', () => {
    const ics = buildIcs({ uid: 'u1', startsAt: istToUtc('2026-10-05', 600), endsAt: istToUtc('2026-10-05', 630), summary: 'Interview', description: 'Line 1\nLine 2', url: 'https://meet.google.com/x' });
    expect(ics).toContain('METHOD:REQUEST');
    expect(ics).toContain('DTSTART:20261005T043000Z'); // 10:00 IST
    expect(ics).toContain('URL:https://meet.google.com/x');
    expect(ics).toContain('DESCRIPTION:Line 1\\nLine 2');
    expect(ics).toContain('BEGIN:VALARM');
  });
});
