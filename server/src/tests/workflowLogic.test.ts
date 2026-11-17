/**
 * Workflow Builder — the pure parts: office hours, the step tree, conditions, placeholders,
 * keyword and option matching.
 */
import { isOpen, nextOpening, describeOpening, DEFAULT_OFFICE_HOURS, OfficeHours, zonedTimeToUtc } from '../services/workflow/officeHours';
import { cleanSteps, indexSteps, workflowProblems } from '../services/workflow/shape';
import { testCondition, choosePath, render, matchKeyword, matchOption } from '../services/workflow/logic';

const IST = (y: number, m: number, d: number, hh: number, mm = 0) => zonedTimeToUtc(y, m, d, hh, mm, 'Asia/Kolkata');

describe('office hours (Asia/Kolkata, Mon–Sat 09:30–18:30)', () => {
  const oh: OfficeHours = { ...DEFAULT_OFFICE_HOURS, holidays: [{ date: '2026-11-19', name: 'Holiday' }] };

  it('converts IST wall-clock to UTC', () => {
    expect(IST(2026, 11, 17, 9, 30).toISOString()).toBe('2026-11-17T04:00:00.000Z');
  });

  it('is open on a weekday inside hours and closed outside', () => {
    expect(isOpen(IST(2026, 11, 17, 10), oh)).toBe(true); // Tue 10:00
    expect(isOpen(IST(2026, 11, 17, 9, 29), oh)).toBe(false);
    expect(isOpen(IST(2026, 11, 17, 18, 30), oh)).toBe(false); // closing minute is closed
    expect(isOpen(IST(2026, 11, 22, 11), oh)).toBe(false); // Sunday
  });

  it('finds the next opening across the night, a holiday and Sunday', () => {
    const tueNight = IST(2026, 11, 17, 21);
    expect(nextOpening(tueNight, oh)!.toISOString()).toBe(IST(2026, 11, 18, 9, 30).toISOString());
    const wedNight = IST(2026, 11, 18, 22); // Thu 19th is a holiday → Fri
    expect(nextOpening(wedNight, oh)!.toISOString()).toBe(IST(2026, 11, 20, 9, 30).toISOString());
    const satNight = IST(2026, 11, 21, 20); // Sunday closed → Monday
    expect(nextOpening(satNight, oh)!.toISOString()).toBe(IST(2026, 11, 23, 9, 30).toISOString());
    const open = IST(2026, 11, 17, 11);
    expect(nextOpening(open, oh)!.getTime()).toBe(open.getTime());
  });

  it('describes the opening in words', () => {
    const now = IST(2026, 11, 17, 21);
    expect(describeOpening(nextOpening(now, oh), now, 'Asia/Kolkata')).toBe('tomorrow at 9:30 AM');
    const early = IST(2026, 11, 17, 7);
    expect(describeOpening(nextOpening(early, oh), early, 'Asia/Kolkata')).toBe('today at 9:30 AM');
  });

  it('never opens when every day is closed', () => {
    const closed: OfficeHours = { ...oh, days: Object.fromEntries(Object.entries(oh.days).map(([k, v]) => [k, { ...v, open: false }])) };
    expect(nextOpening(IST(2026, 11, 17, 10), closed)).toBeNull();
  });
});

describe('step tree', () => {
  const raw = [
    { id: 'a', type: 'send_message', config: { text: 'Hi' } },
    { id: 'b', type: 'paths', config: {}, paths: [
      { id: 'p1', name: 'Freshers', conditions: [{ field: 'answer.year', op: 'gte', value: '2025' }], steps: [{ id: 'c', type: 'wait', config: { amount: 1, unit: 'hours' } }, { id: 'd', type: 'notify', config: { message: 'x' } }] },
      { id: 'p2', name: 'Everyone else', conditions: [], steps: [] },
    ] },
    { id: 'e', type: 'stop', config: {} },
    { id: 'f', type: 'send_message', config: { text: 'never runs' } },
  ];

  it('cleans: drops unknown types, steps after a stop, $-keys; keeps ids', () => {
    const s = cleanSteps([...raw, { type: 'rm_rf', config: {} }].map((x: any) => (x.id === 'a' ? { ...x, config: { ...x.config, $where: 'bad' } } : x)));
    expect(s.map((x) => x.id)).toEqual(['a', 'b', 'e']);
    expect(s[0].config).toEqual({ text: 'Hi' });
    expect(s[1].paths!.map((p) => p.id)).toEqual(['p1', 'p2']);
  });

  it('gives duplicate or missing ids fresh ones', () => {
    const s = cleanSteps([{ id: 'x', type: 'stop' }, { type: 'wait', config: {} }].reverse());
    expect(new Set(s.map((x) => x.id)).size).toBe(s.length);
  });

  it('knows the next step, climbing out of a branch', () => {
    const idx = indexSteps(cleanSteps(raw));
    expect(idx.get('a')!.next).toBe('b');
    expect(idx.get('c')!.next).toBe('d');
    expect(idx.get('d')!.next).toBe('e'); // end of the branch → after the paths step
    expect(idx.get('e')!.next).toBeNull();
    expect(idx.get('d')!.number).toBe('2A.2');
  });

  it('lists what must be fixed before switching on', () => {
    const p = workflowProblems({ trigger: { type: 'lead_created', config: {} }, steps: cleanSteps([
      { id: 'q', type: 'ask_question', config: { question: 'Course?', key: 'Course Name', answerType: 'buttons', options: ['Java Full Stack Developer', 'Python', 'Testing', 'Data'] } },
      { id: 't', type: 'send_template', config: {} },
      { id: 'w', type: 'wait_until', config: { offsetMinutes: -60 } },
    ]) });
    const text = p.map((x) => x.message).join(' | ');
    expect(text).toMatch(/short name/);
    expect(text).toMatch(/1 to 3 options/);
    expect(text).toMatch(/at most 20 characters/);
    expect(text).toMatch(/approved template/);
    expect(text).toMatch(/only works when the trigger is "Demo booked"/);
    expect(workflowProblems({ trigger: { type: 'message_received', config: { match: 'keywords', keywords: [] } }, steps: [] }).length).toBe(2);
  });
});

describe('conditions and placeholders', () => {
  const data: Record<string, any> = { 'answer.year': '2025', course: ['Java Full Stack', 'Python'], source: 'meta_form', email: '', 'office.open': 'no' };
  const resolve = (f: string) => data[f.replace(/^lead\./, '')];

  it('compares text, lists and numbers', () => {
    expect(testCondition({ field: 'answer.year', op: 'gte', value: '2024' }, resolve)).toBe(true);
    expect(testCondition({ field: 'answer.year', op: 'lt', value: '2024' }, resolve)).toBe(false);
    expect(testCondition({ field: 'lead.course', op: 'contains', value: 'java' }, resolve)).toBe(true);
    expect(testCondition({ field: 'source', op: 'is', value: ['meta_form', 'website'] }, resolve)).toBe(true);
    expect(testCondition({ field: 'source', op: 'is_not', value: 'meta_form' }, resolve)).toBe(false);
    expect(testCondition({ field: 'email', op: 'empty' }, resolve)).toBe(true);
    expect(testCondition({ field: 'office.open', op: 'is', value: 'no' }, resolve)).toBe(true);
    expect(testCondition({ field: 'answer.year', op: 'gt', value: 'abc' }, resolve)).toBe(false);
  });

  it('takes the first matching path; an empty path catches everyone else', () => {
    const paths: any = [
      { id: '1', name: 'Old', match: 'all', conditions: [{ field: 'answer.year', op: 'lt', value: '2020' }], steps: [] },
      { id: '2', name: 'Java', match: 'any', conditions: [{ field: 'course', op: 'contains', value: 'java' }, { field: 'source', op: 'is', value: 'x' }], steps: [] },
      { id: '3', name: 'Else', match: 'all', conditions: [], steps: [] },
    ];
    expect(choosePath(paths, resolve)!.name).toBe('Java');
    expect(choosePath([paths[0]], resolve)).toBeNull();
  });

  it('fills placeholders, unknown ones become empty', () => {
    expect(render('Hi {{ first_name }}, {{course}}! {{nope}}', (k) => ({ first_name: 'Ravi', course: ['Java', 'Python'] } as any)[k])).toBe('Hi Ravi, Java, Python! ');
  });

  it('matches keywords as whole words', () => {
    expect(matchKeyword('What are the FEES?', ['fee', 'fees'])).toBe('fees');
    expect(matchKeyword('coffee please', ['fee'])).toBeNull();
    expect(matchKeyword('course duration', ['duration', 'how long'])).toBe('duration');
    expect(matchKeyword('hi', ['hi'], 'exact')).toBe('hi');
    expect(matchKeyword('hi there', ['hi'], 'exact')).toBeNull();
    expect(matchKeyword('ఫీజు ఎంత', ['ఫీజు'])).toBe('ఫీజు');
  });

  it('understands which option was picked', () => {
    const opts = ['Java Full Stack', 'Python', 'Testing'];
    expect(matchOption('python', opts)).toBe('Python');
    expect(matchOption('2', opts)).toBe('Python');
    expect(matchOption('java', opts)).toBe('Java Full Stack');
    expect(matchOption('dotnet', opts)).toBeNull();
  });
});
