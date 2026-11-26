/**
 * "New quiz" and "New assignment" emails, in the CodeBegun look (2026-11-26).
 *
 * Colours are the CodeBegun guide: navy #051D64 (the logo's C) as the main colour, teal #359AAD
 * as the accent, ink #102A4F, muted #64748B, page #F4F8FC, borders #E2EAF2. The logo is the
 * platform logo URL on a white band (it is navy + teal on transparent).
 *
 * Another institute's mail is re-branded later by dispatch() → rebrand(): it swaps this logo URL,
 * the word CodeBegun and the contact lines for the institute's own. So keep those exact strings.
 *
 * Email-client safe: tables, inline styles, a solid bgcolor behind every gradient, no web fonts.
 */

export const CODEBEGUN_LOGO_URL = 'https://platform.codebegun.com/assets/logo.png';

const C = {
  navy: '#051D64', navy2: '#0B2D72', teal: '#359AAD', tealSoft: '#7FD3E0',
  ink: '#102A4F', text: '#33475B', muted: '#64748B', bg: '#F4F8FC', border: '#E2EAF2',
  amber: '#B86B00', amberBg: '#FFF7E8',
};

export const appBase = () =>
  (process.env.FRONTEND_URL || process.env.CLIENT_URL || process.env.PUBLIC_APP_URL || 'https://platform.codebegun.com').replace(/\/+$/, '');

export const escapeHtml = (s: any) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));

const clip = (s: string | undefined, n: number) => {
  const t = String(s || '').replace(/\s+/g, ' ').trim();
  return t.length > n ? `${t.slice(0, n - 1).trimEnd()}…` : t;
};

const IST = 'Asia/Kolkata';
const validDate = (d?: Date | string | null): Date | null => {
  if (!d) return null;
  const x = new Date(d);
  return isNaN(x.getTime()) ? null : x;
};
/** "Fri, 28 Nov 2026" */
export const fmtDay = (d: Date) => {
  // Built from parts: ICU versions disagree on commas ("28 Nov, 2026" vs "28 Nov 2026").
  const p: Record<string, string> = {};
  for (const x of new Intl.DateTimeFormat('en-GB', { timeZone: IST, weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }).formatToParts(d)) p[x.type] = x.value;
  return `${p.weekday}, ${p.day} ${p.month} ${p.year}`;
};
/** "11:59 pm" */
export const fmtTime = (d: Date) => d.toLocaleTimeString('en-IN', { timeZone: IST, hour: 'numeric', minute: '2-digit', hour12: true });
const isMidnightIst = (d: Date) => fmtTime(d).startsWith('12:00') && /am/i.test(fmtTime(d));
/** A start shows just the day when it opens at midnight; a deadline always shows its time. */
const fmtOpens = (d: Date) => (isMidnightIst(d) ? fmtDay(d) : `${fmtDay(d)}, ${fmtTime(d)}`);
const fmtDue = (d: Date) => `${fmtDay(d)}, ${fmtTime(d)}`;

interface Cell { label: string; value: string }

function detailsGrid(cells: Cell[]): string {
  const rows: string[] = [];
  for (let i = 0; i < cells.length; i += 2) {
    const pair = cells.slice(i, i + 2);
    rows.push(`<tr>${pair.map((c, j) => `
      <td width="50%" valign="top" style="padding:${j === 0 ? '0 6px 12px 0' : '0 0 12px 6px'};">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.bg};border-left:3px solid ${C.teal};border-radius:8px;">
          <tr><td style="padding:12px 14px;">
            <div style="font-size:11px;line-height:16px;letter-spacing:.6px;text-transform:uppercase;color:${C.muted};font-weight:600;">${escapeHtml(c.label)}</div>
            <div style="font-size:15px;line-height:22px;color:${C.ink};font-weight:700;margin-top:2px;">${escapeHtml(c.value)}</div>
          </td></tr>
        </table>
      </td>`).join('')}${pair.length === 1 ? '<td width="50%"></td>' : ''}</tr>`);
  }
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rows.join('')}</table>`;
}

interface LayoutArgs {
  preheader: string;
  eyebrow: string;
  title: string;
  subline?: string;
  greetingName: string;
  intro: string;
  cells: Cell[];
  dueLine?: string;
  description?: string;
  ctaLabel: string;
  ctaUrl: string;
  tips?: string[];
  why: string;
}

function layout(a: LayoutArgs): string {
  const tips = a.tips?.length ? `
          <tr><td style="padding:4px 32px 8px;">
            <div style="font-size:13px;line-height:20px;color:${C.ink};font-weight:700;margin-bottom:6px;">Before you start</div>
            ${a.tips.map(t => `<div style="font-size:13px;line-height:21px;color:${C.text};"><span style="color:${C.teal};font-weight:700;">&#8226;</span>&nbsp; ${escapeHtml(t)}</div>`).join('')}
          </td></tr>` : '';
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="color-scheme" content="light only">
<title>${escapeHtml(a.title)}</title>
</head>
<body style="margin:0;padding:0;background:${C.bg};-webkit-text-size-adjust:100%;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:${C.bg};">${escapeHtml(a.preheader)}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="${C.bg}" style="background:${C.bg};">
    <tr><td align="center" style="padding:28px 12px;">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;background:#ffffff;border:1px solid ${C.border};border-radius:14px;overflow:hidden;font-family:Inter,'Segoe UI',Roboto,Arial,sans-serif;">

        <!-- Logo -->
        <tr><td style="padding:22px 32px 18px;background:#ffffff;">
          <img data-cb-logo="header" src="${CODEBEGUN_LOGO_URL}" alt="CodeBegun" width="150" style="height:auto;width:150px;max-width:150px;display:block;border:0;" />
        </td></tr>

        <!-- Hero -->
        <tr><td bgcolor="${C.navy}" style="background:${C.navy};background-image:linear-gradient(135deg,${C.navy} 0%,${C.navy2} 100%);padding:30px 32px 28px;border-top:4px solid ${C.teal};">
          <div style="font-size:12px;line-height:16px;letter-spacing:1.6px;text-transform:uppercase;color:${C.tealSoft};font-weight:700;">${escapeHtml(a.eyebrow)}</div>
          <div style="font-size:24px;line-height:32px;color:#ffffff;font-weight:800;margin-top:8px;">${escapeHtml(a.title)}</div>
          ${a.subline ? `<div style="font-size:14px;line-height:21px;color:#C9D8E5;margin-top:6px;">${escapeHtml(a.subline)}</div>` : ''}
        </td></tr>

        <!-- Greeting -->
        <tr><td style="padding:26px 32px 6px;">
          <div style="font-size:16px;line-height:24px;color:${C.ink};">Hi <strong>${escapeHtml(a.greetingName || 'there')}</strong>,</div>
          <div style="font-size:15px;line-height:24px;color:${C.text};margin-top:8px;">${escapeHtml(a.intro)}</div>
        </td></tr>

        <!-- Details -->
        <tr><td style="padding:18px 32px 4px;">${detailsGrid(a.cells)}</td></tr>

        ${a.dueLine ? `<tr><td style="padding:0 32px 6px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.amberBg};border-radius:8px;">
            <tr><td style="padding:11px 14px;font-size:14px;line-height:20px;color:${C.amber};font-weight:700;">${escapeHtml(a.dueLine)}</td></tr>
          </table>
        </td></tr>` : ''}

        ${a.description ? `<tr><td style="padding:12px 32px 0;font-size:14px;line-height:22px;color:${C.muted};">${escapeHtml(a.description)}</td></tr>` : ''}

        <!-- Button -->
        <tr><td align="left" style="padding:24px 32px 22px;">
          <table role="presentation" cellpadding="0" cellspacing="0"><tr>
            <td bgcolor="${C.navy}" style="background:${C.navy};border-radius:8px;">
              <a href="${escapeHtml(a.ctaUrl)}" target="_blank" style="display:inline-block;padding:13px 28px;font-size:15px;line-height:20px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:8px;">${escapeHtml(a.ctaLabel)} &rarr;</a>
            </td>
          </tr></table>
          <div style="font-size:12px;line-height:18px;color:${C.muted};margin-top:10px;">Or open <a href="${escapeHtml(a.ctaUrl)}" style="color:${C.navy};">${escapeHtml(a.ctaUrl)}</a></div>
        </td></tr>
        ${tips}

        <!-- Footer -->
        <tr><td bgcolor="${C.bg}" style="background:${C.bg};border-top:1px solid ${C.border};padding:20px 32px 22px;">
          <div style="font-size:13px;line-height:20px;color:${C.ink};font-weight:700;">CodeBegun</div>
          <div style="font-size:12px;line-height:19px;color:${C.muted};margin-top:4px;">contact@codebegun.com<br>+91 63010 99587<br>Madhapur, Hyderabad</div>
          <div style="font-size:11px;line-height:17px;color:${C.muted};margin-top:12px;">${escapeHtml(a.why)} This is an automatic message, so please don't reply to it.</div>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export interface RenderedEmail { subject: string; html: string; text: string }

export interface QuizEmailDetails {
  title: string;
  description?: string;
  /** When the quiz opens for this student (their batch's start), if set. */
  opensAt?: Date | string | null;
  /** Their deadline, if set. */
  dueAt?: Date | string | null;
  totalTime?: number;
  totalMarks?: number;
  batchName?: string;
  reminder?: boolean;
}

export function renderQuizEmail(studentName: string, q: QuizEmailDetails): RenderedEmail {
  const opens = validDate(q.opensAt);
  const due = validDate(q.dueAt);
  const now = Date.now();
  const cells: Cell[] = [
    { label: 'Opens', value: opens && opens.getTime() > now ? fmtOpens(opens) : 'Open now' },
    { label: 'Due', value: due ? fmtDue(due) : 'No deadline' },
  ];
  if (q.totalTime) cells.push({ label: 'Duration', value: `${q.totalTime} minutes` });
  if (q.totalMarks) cells.push({ label: 'Total marks', value: String(q.totalMarks) });
  const url = `${appBase()}/quizzes`;
  const title = clip(q.title, 140);
  const html = layout({
    preheader: due ? `Due ${fmtDue(due)}. ${q.totalTime ? `${q.totalTime} minutes.` : ''}` : 'A new quiz is waiting for you.',
    eyebrow: q.reminder ? 'Quiz reminder' : 'New quiz',
    title,
    subline: q.batchName ? `Assigned to ${q.batchName}` : 'Assigned to you',
    greetingName: studentName,
    intro: q.reminder
      ? "You haven't attempted this quiz yet. Here are the details again so you can finish it in time."
      : 'A new quiz has been assigned to you. The details are below.',
    cells,
    dueLine: due ? `Submit by ${fmtDue(due)}` : undefined,
    description: clip(q.description, 300) || undefined,
    ctaLabel: 'Start the quiz',
    ctaUrl: url,
    tips: ['Use a quiet place and a steady internet connection.', 'The timer starts when you begin and does not pause.', 'Submit before the deadline.'],
    why: q.batchName ? `You are getting this because the quiz was assigned to ${clip(q.batchName, 80)}.` : 'You are getting this because the quiz was assigned to you.',
  });
  const text = [
    `${q.reminder ? 'Quiz reminder' : 'New quiz'}: ${title}`,
    '',
    `Hi ${studentName || 'there'},`,
    '',
    q.reminder ? "You haven't attempted this quiz yet." : 'A new quiz has been assigned to you.',
    '',
    ...cells.map(c => `${c.label}: ${c.value}`),
    ...(q.description ? ['', clip(q.description, 300)] : []),
    '',
    `Start the quiz: ${url}`,
    '',
    '— CodeBegun',
  ].join('\n');
  const subject = `${q.reminder ? 'Reminder: ' : 'New quiz: '}${title}${due ? ` (due ${fmtDay(due)})` : ''}`;
  return { subject, html, text };
}

export interface AssignmentEmailDetails {
  title: string;
  type?: string;
  description?: string;
  difficulty?: string;
  totalPoints?: number;
  opensAt?: Date | string | null;
  dueAt?: Date | string | null;
  batchName?: string;
}

const cap = (s?: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : '');
const TYPE_LABEL: Record<string, string> = { coding: 'Coding', mcq: 'Multiple choice', theory: 'Written', project: 'Project', sql: 'SQL' };

export function renderAssignmentEmail(studentName: string, a: AssignmentEmailDetails): RenderedEmail {
  const opens = validDate(a.opensAt);
  const due = validDate(a.dueAt);
  const cells: Cell[] = [];
  if (a.type) cells.push({ label: 'Type', value: TYPE_LABEL[a.type] || cap(a.type) });
  if (a.difficulty) cells.push({ label: 'Difficulty', value: cap(a.difficulty) });
  if (a.totalPoints) cells.push({ label: 'Points', value: String(a.totalPoints) });
  if (opens && opens.getTime() > Date.now()) cells.push({ label: 'Opens', value: fmtOpens(opens) });
  cells.push({ label: 'Due', value: due ? fmtDue(due) : 'No deadline' });
  const url = `${appBase()}/assignments`;
  const title = clip(a.title, 140);
  const html = layout({
    preheader: due ? `Due ${fmtDue(due)}.` : 'A new assignment is waiting for you.',
    eyebrow: 'New assignment',
    title,
    subline: a.batchName ? `Assigned to ${a.batchName}` : 'Assigned to you',
    greetingName: studentName,
    intro: 'A new assignment has been given to you. The details are below.',
    cells,
    dueLine: due ? `Submit by ${fmtDue(due)} to avoid a late penalty` : undefined,
    description: clip(a.description, 300) || undefined,
    ctaLabel: 'Open the assignment',
    ctaUrl: url,
    why: a.batchName ? `You are getting this because the assignment was given to ${clip(a.batchName, 80)}.` : 'You are getting this because the assignment was given to you.',
  });
  const text = [
    `New assignment: ${title}`,
    '',
    `Hi ${studentName || 'there'},`,
    '',
    'A new assignment has been given to you.',
    '',
    ...cells.map(c => `${c.label}: ${c.value}`),
    ...(a.description ? ['', clip(a.description, 300)] : []),
    '',
    `Open the assignment: ${url}`,
    '',
    '— CodeBegun',
  ].join('\n');
  const subject = `New assignment: ${title}${due ? ` (due ${fmtDay(due)})` : ''}`;
  return { subject, html, text };
}
