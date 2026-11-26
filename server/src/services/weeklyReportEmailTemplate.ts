/**
 * The weekly learning report email (redesigned 2026-11-26), in the CodeBegun look shared with the
 * quiz and assignment emails: navy #051D64, teal #359AAD, the logo on a white band.
 *
 * Order: score → "This week at a glance" (one tick or cross per area) → the areas that had
 * something this week → one line naming the areas that had nothing. Both labs get a full section:
 * the days expected vs done, and what the AI said about the work.
 *
 * Another institute's copy is re-branded by dispatch() → rebrand(), which swaps the logo URL, the
 * word CodeBegun and the contact lines — so those exact strings stay as they are.
 *
 * Email-client safe: tables, inline styles, a solid colour behind every gradient. A small
 * <style> block stacks the two-column cards on phones; clients that drop it keep two columns.
 */
import type { WeeklyReportData, GlanceItem, GlanceState } from './weeklyReportService';
import type { LabDay } from './weeklyReportLabs';
import { CODEBEGUN_LOGO_URL, appBase, escapeHtml } from './assessmentEmailTemplate';

const C = {
  navy: '#051D64', navy2: '#0B2D72', teal: '#359AAD', tealSoft: '#7FD3E0',
  ink: '#102A4F', text: '#33475B', muted: '#64748B', bg: '#F4F8FC', border: '#E2EAF2',
  green: '#047857', greenBg: '#ECFDF5', red: '#B91C1C', redBg: '#FEF2F2',
  amber: '#B86B00', amberBg: '#FFF7E8', grey: '#94A3B8', greyBg: '#F8FAFC',
};

const STATE: Record<GlanceState, { mark: string; fg: string; bg: string; word: string }> = {
  done: { mark: '✓', fg: C.green, bg: C.greenBg, word: 'Done' },
  partial: { mark: '◐', fg: C.amber, bg: C.amberBg, word: 'Partly done' },
  missed: { mark: '✗', fg: C.red, bg: C.redBg, word: 'Missed' },
  pending: { mark: '•', fg: C.navy2, bg: '#EEF4FB', word: 'Not due yet' },
  none: { mark: '–', fg: C.grey, bg: C.greyBg, word: 'Nothing set' },
};

const esc = escapeHtml;
const pad2 = (n: number) => String(n).padStart(2, '0');

// ── pieces ────────────────────────────────────────────────────────────────
const card = (inner: string) => `
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid ${C.border};border-radius:14px;background:#ffffff;">
    <tr><td style="padding:18px 18px 16px;">${inner}</td></tr>
  </table>`;

const heading = (icon: string, title: string, sub?: string) => `
  <div style="font-size:16px;line-height:22px;font-weight:800;color:${C.ink};">${icon} ${title}</div>
  ${sub ? `<div style="font-size:12px;line-height:18px;color:${C.muted};margin-top:2px;">${sub}</div>` : ''}`;

/** A row of number tiles. */
const stats = (items: { value: string; label: string; color?: string }[]) => `
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:12px;"><tr>
    ${items.map((s, i) => `
    <td width="${Math.floor(100 / items.length)}%" valign="top" style="padding:${i === 0 ? '0 4px 0 0' : i === items.length - 1 ? '0 0 0 4px' : '0 4px'};">
      <div style="background:${C.bg};border-radius:10px;padding:10px 4px;text-align:center;">
        <div style="font-size:19px;line-height:24px;font-weight:800;color:${s.color || C.navy};">${s.value}</div>
        <div style="font-size:11px;line-height:15px;color:${C.muted};margin-top:2px;">${s.label}</div>
      </div>
    </td>`).join('')}
  </tr></table>`;

const button = (text: string, href: string) => `
  <table role="presentation" cellpadding="0" cellspacing="0" style="margin-top:14px;"><tr>
    <td bgcolor="${C.navy}" style="border-radius:9px;background:${C.navy};">
      <a href="${href}" style="display:inline-block;padding:10px 16px;font-size:13px;line-height:18px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:9px;">${text} &rarr;</a>
    </td>
  </tr></table>`;

const note = (kind: 'red' | 'amber' | 'green' | 'teal', html: string) => {
  const m = { red: [C.red, C.redBg, '#FECACA'], amber: [C.amber, C.amberBg, '#FDE7B8'], green: [C.green, C.greenBg, '#A7F3D0'], teal: [C.ink, '#EEF8FA', '#CBE8EE'] }[kind];
  return `<div style="margin-top:12px;background:${m[1]};border:1px solid ${m[2]};border-radius:10px;padding:10px 12px;font-size:12.5px;line-height:19px;color:${m[0]};">${html}</div>`;
};

/** A labelled 0–100 bar. */
const bar = (label: string, score: number, max = 100, suffix = '') => {
  const pct = Math.max(0, Math.min(100, (score / max) * 100));
  return `
  <tr>
    <td style="font-size:12px;line-height:16px;color:${C.text};padding:4px 8px 4px 0;white-space:nowrap;width:30%;">${esc(label)}</td>
    <td style="padding:4px 0;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#E6EEF7;border-radius:6px;">
        <tr>${pct > 0 ? `<td width="${Math.round(pct)}%" bgcolor="${C.teal}" style="background:${C.teal};height:8px;border-radius:6px;font-size:0;line-height:0;">&nbsp;</td>` : ''}${pct < 100 ? `<td width="${100 - Math.round(pct)}%" style="height:8px;font-size:0;line-height:0;">&nbsp;</td>` : ''}</tr>
      </table>
    </td>
    <td style="font-size:12px;line-height:16px;font-weight:700;color:${C.ink};padding:4px 0 4px 8px;white-space:nowrap;width:52px;text-align:right;">${suffix ? `${score.toFixed(1)}${suffix}` : Math.round(score)}</td>
  </tr>`;
};

/** Mon–Sun: expected & done ✓ green, expected & not done ✗ red, done anyway ✓ teal, otherwise –. */
const dayRow = (days: LabDay[]) => `
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:12px;border-collapse:separate;border-spacing:3px;">
    <tr>${days.map((d) => {
      const [bg, fg, mark] = d.expected
        ? (d.done ? [C.greenBg, C.green, '✓'] : [C.redBg, C.red, '✗'])
        : (d.done ? ['#EEF8FA', C.teal, '✓'] : [C.greyBg, C.grey, '–']);
      return `
      <td align="center" width="14%" style="border-radius:9px;padding:7px 0;background:${bg};color:${fg};">
        <div style="font-size:11px;line-height:14px;font-weight:700;">${d.weekday}</div>
        <div style="font-size:15px;line-height:19px;font-weight:800;">${mark}</div>
      </td>`;
    }).join('')}
    </tr>
  </table>`;

const aiNotes = (rows: [string, string, string][]) => {
  const shown = rows.filter(([, , v]) => v);
  if (!shown.length) return '';
  return `
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:12px;background:${C.bg};border-radius:10px;">
    ${shown.map(([icon, label, v]) => `
    <tr><td style="padding:8px 12px;font-size:12.5px;line-height:19px;color:${C.text};"><b style="color:${C.ink};">${icon} ${label}:</b> ${esc(v)}</td></tr>`).join('')}
  </table>`;
};

const sourceLine = (source: string, what: string) =>
  source === 'scheduled' ? `The days your batch had a ${what} set, and what you did.`
    : source === 'practice' ? `Your daily practice days — one ${what} a day is expected.`
      : `Nothing was set this week, so these are the days you practised on your own.`;

// ── sections ──────────────────────────────────────────────────────────────
function glanceStrip(items: GlanceItem[]) {
  const rows: GlanceItem[][] = [items.slice(0, 3), items.slice(3, 6)];
  return `
  <div style="font-size:13px;line-height:18px;font-weight:800;color:${C.ink};margin-bottom:8px;">This week at a glance</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:separate;border-spacing:0 6px;">
    ${rows.map((r) => `<tr>${r.map((g, i) => {
      const s = STATE[g.state];
      return `
      <td width="33%" valign="top" style="padding:${i === 0 ? '0 4px 0 0' : i === 2 ? '0 0 0 4px' : '0 4px'};">
        <div style="background:${s.bg};border-radius:10px;padding:9px 8px;min-height:52px;">
          <div style="font-size:12px;line-height:16px;font-weight:800;color:${s.fg};"><span style="font-size:14px;">${s.mark}</span> ${esc(g.label)}</div>
          <div style="font-size:11px;line-height:15px;color:${C.text};margin-top:2px;">${esc(g.detail)}</div>
        </div>
      </td>`;
    }).join('')}</tr>`).join('')}
  </table>`;
}

function quizzesCard(d: WeeklyReportData, base: string) {
  const q = d.quizzes;
  return card(`
    ${heading('📝', 'Quizzes')}
    ${stats([
      { value: pad2(q.assigned), label: 'Set' },
      { value: pad2(q.attempted), label: 'Done', color: C.green },
      { value: pad2(q.missed), label: 'Missed', color: q.missed ? C.red : C.grey },
    ])}
    ${q.attempted ? `<div style="font-size:12.5px;line-height:19px;color:${C.text};margin-top:10px;">Average <b>${q.avgScore}%</b> · top <b>${q.topScore}%</b> · time <b>${q.timeLabel}</b></div>` : ''}
    ${q.missedTitles.length ? note('red', `<b>Missed:</b> ${q.missedTitles.map(esc).join(', ')}${q.missed > q.missedTitles.length ? ` and ${q.missed - q.missedTitles.length} more` : ''}`) : ''}
    ${q.pending ? `<div style="font-size:12px;line-height:18px;color:${C.muted};margin-top:8px;">${q.pending} still open — not due yet.</div>` : ''}
    ${button('Open quizzes', `${base}/quizzes`)}`);
}

function assignmentsCard(d: WeeklyReportData, base: string) {
  const a = d.assignments;
  const scoreLine = a.scoredCount
    ? `Average <b>${a.avgScore}%</b>${a.awaitingGrading ? ` · ${a.awaitingGrading} awaiting grading` : ''} · time <b>${a.timeLabel}</b>`
    : a.submitted ? `Submitted work is awaiting grading.` : '';
  return card(`
    ${heading('📋', 'Assignments')}
    ${stats([
      { value: pad2(a.assigned), label: 'Set' },
      { value: pad2(a.submitted), label: 'Submitted', color: C.green },
      { value: pad2(a.missed), label: 'Missed', color: a.missed ? C.red : C.grey },
    ])}
    ${scoreLine ? `<div style="font-size:12.5px;line-height:19px;color:${C.text};margin-top:10px;">${scoreLine}</div>` : ''}
    ${a.missedTitles.length ? note('red', `<b>Missed:</b> ${a.missedTitles.map(esc).join(', ')}${a.missed > a.missedTitles.length ? ` and ${a.missed - a.missedTitles.length} more` : ''}`) : ''}
    ${a.pending ? `<div style="font-size:12px;line-height:18px;color:${C.muted};margin-top:8px;">${a.pending} still open — not due yet.</div>` : ''}
    ${button('Open assignments', `${base}/assignments`)}`);
}

function attendanceCard(d: WeeklyReportData, base: string) {
  const at = d.attendance;
  const ring = at.percentage >= 75 ? C.green : at.percentage >= 50 ? C.amber : C.red;
  return card(`
    ${heading('📅', 'Class attendance')}
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:12px;"><tr>
      <td width="88" valign="middle">
        <div style="width:70px;height:70px;line-height:62px;border-radius:50%;border:4px solid ${ring};text-align:center;font-size:18px;font-weight:800;color:${C.ink};box-sizing:border-box;">${at.percentage}%</div>
      </td>
      <td valign="middle" style="font-size:12.5px;line-height:21px;color:${C.text};">
        Present <b>${at.present}</b> · Absent <b style="color:${at.absent ? C.red : C.text};">${at.absent}</b><br>
        Late <b>${at.late}</b> · Leave <b>${at.leave}</b><br>
        <span style="color:${C.muted};">${at.totalClasses} class${at.totalClasses === 1 ? '' : 'es'} this week</span>
      </td>
    </tr></table>
    ${button('My attendance', `${base}/my-attendance`)}`);
}

function interviewCard(d: WeeklyReportData, base: string) {
  const iv = d.interview;
  let body: string;
  if (iv.taken > 0) {
    body = `
    ${stats([
      { value: pad2(iv.taken), label: 'Taken' },
      { value: `${iv.avgScore}%`, label: 'Average' },
    ])}
    ${iv.breakdown.length ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:10px;">${iv.breakdown.map((b) => bar(b.label, b.rating, 5, ' / 5')).join('')}</table>` : ''}
    ${iv.remarks ? note('teal', `💬 <b>Mentor feedback:</b> ${esc(iv.remarks)}`) : ''}`;
  } else if (iv.absent > 0) {
    body = note('red', `🚫 <b>Marked absent.</b> You were scheduled for a mock interview but didn't attend. Don't miss the next one.`);
  } else {
    body = note('teal', `🗓️ <b>Mock interview scheduled.</b> Your mentor's feedback will appear here once it is in.`);
  }
  return card(`${heading('🎤', 'Mock interview')}${body}${button('My interviews', `${base}/student/interviews`)}`);
}

/** "Thu, 19 Nov" from 'YYYY-MM-DD'. */
const shortDay = (ymd: string) => {
  const t = Date.parse(`${ymd}T00:00:00Z`);
  if (isNaN(t)) return ymd;
  const x = new Date(t);
  return `${['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][x.getUTCDay()]}, ${x.getUTCDate()} ${['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][x.getUTCMonth()]}`;
};

/** Only when the student went to a drive this week. Just that they went — never the result. */
function drivesCard(d: WeeklyReportData) {
  const n = d.drives.length;
  return card(`
    ${heading('🏢', 'Placement drives', `You attended ${n} company drive${n > 1 ? 's' : ''} this week.`)}
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:12px;">
      ${d.drives.map((x, i) => `
      <tr><td style="padding:${i ? '8px' : '0'} 0 0;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.bg};border-left:3px solid ${C.teal};border-radius:8px;">
          <tr><td style="padding:10px 12px;">
            <div style="font-size:14px;line-height:20px;font-weight:800;color:${C.ink};">${esc(x.company)}</div>
            <div style="font-size:12.5px;line-height:19px;color:${C.text};">${esc(x.role)}</div>
            <div style="font-size:12px;line-height:18px;color:${C.muted};margin-top:2px;">${esc(shortDay(x.day))}${x.mode ? ` · ${esc(x.mode)}` : ''} · <span style="color:${C.green};font-weight:700;">Attended</span></div>
          </td></tr>
        </table>
      </td></tr>`).join('')}
    </table>
    ${note('green', 'Well done for showing up. Your placement team will share how it went.')}`);
}

function communicationCard(d: WeeklyReportData, base: string) {
  const w = d.communication;
  const trend = w.avgScore !== null && w.lastWeekAvg !== null
    ? (w.avgScore > w.lastWeekAvg ? ` <span style="color:${C.green};">↑${w.avgScore - w.lastWeekAvg}</span>`
      : w.avgScore < w.lastWeekAvg ? ` <span style="color:${C.red};">↓${w.lastWeekAvg - w.avgScore}</span>` : '')
    : '';
  const skipped = w.expectedDays > 0 && w.doneDays === 0;
  const speaking = [
    w.wordsPerMinute !== null ? `<b>${w.wordsPerMinute}</b> words a minute` : '',
    w.fillersPerRecording !== null ? `<b>${w.fillersPerRecording}</b> filler words per recording` : '',
  ].filter(Boolean).join(' · ');
  return card(`
    ${heading('🎙️', 'AI Communication Lab', sourceLine(w.source, 'speaking challenge'))}
    ${dayRow(w.days)}
    ${stats([
      w.expectedDays ? { value: `${w.doneDays}/${w.expectedDays}`, label: 'Days done', color: w.missedDays ? (w.doneDays ? C.amber : C.red) : C.green }
        : { value: String(w.activeDays), label: 'Days practised', color: C.teal },
      { value: String(w.recordings), label: 'Recordings' },
      { value: w.avgScore !== null ? `${w.avgScore}${trend}` : '—', label: w.lastWeekAvg !== null ? `AI score (last week ${w.lastWeekAvg})` : 'AI score' },
    ])}
    ${w.skills.length ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:12px;">${w.skills.map((s) => bar(s.label, s.score)).join('')}</table>` : ''}
    ${speaking ? `<div style="font-size:12.5px;line-height:19px;color:${C.text};margin-top:8px;">${speaking}</div>` : ''}
    ${aiNotes([['💪', 'Strength', w.strength], ['🎯', 'Work on', w.improve], ['➡️', "Next week's focus", w.focus]])}
    ${skipped ? note('red', `<b>You didn't practise speaking this week.</b> ${w.expectedDays} day${w.expectedDays > 1 ? 's were' : ' was'} set. A short recording every day builds the confidence interviews need.`)
      : w.missedDays ? note('amber', `${w.missedDays} speaking day${w.missedDays > 1 ? 's' : ''} missed this week — aim for every day next week.`) : ''}
    ${button(skipped ? 'Practise speaking now' : 'Open the Communication Lab', `${base}/ai-communication-lab`)}`);
}

function thinkingCard(d: WeeklyReportData, base: string) {
  const w = d.thinking;
  const skipped = w.expectedDays > 0 && w.doneDays === 0;
  const mix = [['Easy', w.difficulty.easy], ['Medium', w.difficulty.medium], ['Hard', w.difficulty.hard]]
    .filter(([, n]) => (n as number) > 0).map(([l, n]) => `${l} <b>${n}</b>`).join(' · ');
  return card(`
    ${heading('🧩', 'Thinking Lab', sourceLine(w.source, 'challenge'))}
    ${dayRow(w.days)}
    ${stats([
      w.expectedDays ? { value: `${w.doneDays}/${w.expectedDays}`, label: 'Days done', color: w.missedDays ? (w.doneDays ? C.amber : C.red) : C.green }
        : { value: String(w.activeDays), label: 'Days practised', color: C.teal },
      { value: `${w.solved}/${w.attempted}`, label: 'Solved' },
      { value: w.avgScore !== null ? String(w.avgScore) : '—', label: 'Average score' },
    ])}
    ${mix || w.hintsUsed ? `<div style="font-size:12.5px;line-height:19px;color:${C.text};margin-top:10px;">${mix ? `Difficulty: ${mix}` : ''}${mix && w.hintsUsed ? ' · ' : ''}${w.hintsUsed ? `hints used <b>${w.hintsUsed}</b>` : ''}</div>` : ''}
    ${aiNotes([['💪', 'Strength', w.strength], ['🎯', 'Work on', w.weakness]])}
    ${skipped ? note('red', `<b>You didn't do the Thinking Lab this week.</b> ${w.expectedDays} day${w.expectedDays > 1 ? 's were' : ' was'} set. One challenge a day keeps problem-solving sharp.`)
      : w.missedDays ? note('amber', `${w.missedDays} Thinking Lab day${w.missedDays > 1 ? 's' : ''} missed this week — aim for every day next week.`) : ''}
    ${button(skipped ? 'Solve today’s challenge' : 'Open the Thinking Lab', `${base}/thinking-lab`)}`);
}

function practiceCard(d: WeeklyReportData) {
  const p = d.practice!;
  return card(`
    ${heading('🔥', 'Daily Practice Pass', `Every working day's tasks — ${p.metDays} of ${p.countedDays} practice days met this week.`)}
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:12px;border-collapse:separate;border-spacing:3px;">
      <tr>${p.days.map((x) => `
        <td align="center" width="14%" style="border-radius:9px;padding:7px 0;background:${x.excused ? C.greyBg : x.met ? C.greenBg : C.redBg};color:${x.excused ? C.grey : x.met ? C.green : C.red};">
          <div style="font-size:11px;line-height:14px;font-weight:700;">${x.weekday}</div>
          <div style="font-size:15px;line-height:19px;font-weight:800;">${x.excused ? '–' : x.met ? '✓' : '✗'}</div>
        </td>`).join('')}
      </tr>
    </table>
    <div style="font-size:12.5px;line-height:19px;color:${C.text};margin-top:10px;">Practice attendance <b>${p.pct}%</b> · placement support needs <b>${p.thresholdPct}%</b> · streak <b>${p.streak}</b></div>
    ${p.onHold
      ? note('red', '⛔ Placement support is on hold. Complete your daily practice every working day to lift it.')
      : p.pct < p.thresholdPct
        ? note('amber', `⚠️ Below ${p.thresholdPct}% — practise every working day to stay eligible for placement support.`)
        : note('green', '✅ Eligible for placement support. Keep the streak going.')}`);
}

/** Two cards side by side; they stack on a phone. */
const pairRow = (a: string, b?: string) => `
  <tr><td style="padding:0 20px 12px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
      <td class="cb-col" width="50%" valign="top" style="padding:0 6px 0 0;">${a}</td>
      <td class="cb-col cb-col-r" width="50%" valign="top" style="padding:0 0 0 6px;">${b || ''}</td>
    </tr></table>
  </td></tr>`;
const fullRow = (a: string) => `<tr><td style="padding:0 20px 12px;">${a}</td></tr>`;

// ── main template ─────────────────────────────────────────────────────────
export function getWeeklyReportEmailHtml(d: WeeklyReportData): string {
  const base = appBase();
  const g = Object.fromEntries(d.glance.map((x) => [x.key, x])) as Record<string, GlanceItem>;
  const has = (k: string) => g[k] && g[k].state !== 'none';
  const labShown = (k: 'communication' | 'thinking') => d[k].expectedDays > 0 || d[k].activeDays > 0;

  const small: string[] = [];
  if (has('quizzes')) small.push(quizzesCard(d, base));
  if (has('assignments')) small.push(assignmentsCard(d, base));
  if (d.attendance.totalClasses > 0) small.push(attendanceCard(d, base));
  if (has('interview')) small.push(interviewCard(d, base));
  const rows: string[] = [];
  for (let i = 0; i < small.length; i += 2) rows.push(pairRow(small[i], small[i + 1]));
  if (d.drives?.length) rows.push(fullRow(drivesCard(d)));
  if (labShown('communication')) rows.push(fullRow(communicationCard(d, base)));
  if (labShown('thinking')) rows.push(fullRow(thinkingCard(d, base)));
  if (d.practice) rows.push(fullRow(practiceCard(d)));

  const quiet = d.glance.filter((x) => x.state === 'none' && !(x.key === 'communication' && labShown('communication')) && !(x.key === 'thinking' && labShown('thinking')) && !(x.key === 'classes' && d.attendance.totalClasses > 0));
  const missedAreas = d.glance.filter((x) => x.state === 'missed').map((x) => x.label);

  const scoreColor = d.overall.score >= 70 ? C.tealSoft : d.overall.score >= 50 ? '#FCD34D' : '#FCA5A5';
  const preheader = d.overall.hasData
    ? `Score ${d.overall.score}/100 for ${d.period.label}${missedAreas.length ? ` · missed: ${missedAreas.join(', ')}` : ''}`
    : `Your week of ${d.period.label}`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="x-apple-disable-message-reformatting">
  <title>Your weekly learning report</title>
  <style>
    @media only screen and (max-width: 600px) {
      .cb-col { display: block !important; width: 100% !important; padding: 0 !important; }
      .cb-col-r { padding-top: 12px !important; }
      .cb-pad { padding-left: 18px !important; padding-right: 18px !important; }
      .cb-hero-score { display: block !important; width: 100% !important; text-align: left !important; padding-top: 14px !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;background:${C.bg};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;color:${C.text};">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${esc(preheader)}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="${C.bg}" style="background:${C.bg};">
    <tr><td align="center" style="padding:24px 12px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:640px;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid ${C.border};">

        <!-- logo band -->
        <tr><td class="cb-pad" style="padding:18px 28px;background:#ffffff;">
          <img data-cb-logo="header" src="${CODEBEGUN_LOGO_URL}" alt="CodeBegun" width="150" style="display:block;width:150px;height:auto;border:0;" />
        </td></tr>

        <!-- hero -->
        <tr><td class="cb-pad" bgcolor="${C.navy}" style="background:${C.navy};background-image:linear-gradient(135deg,${C.navy} 0%,${C.navy2} 100%);border-top:4px solid ${C.teal};padding:24px 28px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
            <td class="cb-col" valign="middle">
              <div style="font-size:11px;line-height:16px;letter-spacing:1.2px;text-transform:uppercase;font-weight:700;color:${C.tealSoft};">Weekly learning report</div>
              <div style="font-size:24px;line-height:30px;font-weight:800;color:#ffffff;margin-top:6px;">Hi ${esc(d.student.firstName || 'there')},</div>
              <div style="font-size:13px;line-height:20px;color:#C9D6EE;margin-top:6px;">${esc(d.period.label)}${d.student.batchName ? ` · ${esc(d.student.batchName)}` : ''}</div>
            </td>
            <td class="cb-col cb-hero-score" valign="middle" align="right" style="white-space:nowrap;">
              ${d.overall.hasData ? `
              <div style="font-size:11px;line-height:16px;color:#C9D6EE;">Weekly score</div>
              <div style="font-size:34px;line-height:40px;font-weight:800;color:${scoreColor};">${d.overall.score}<span style="font-size:15px;color:#C9D6EE;">/100</span></div>
              <div style="font-size:12px;line-height:18px;color:#ffffff;font-weight:700;">${esc(d.overall.label)} · Grade ${esc(d.overall.grade)}</div>`
              : `<div style="font-size:13px;line-height:20px;color:#C9D6EE;">No score this week</div>`}
            </td>
          </tr></table>
        </td></tr>

        <!-- message + glance -->
        <tr><td class="cb-pad" style="padding:20px 28px 8px;">
          ${d.overall.hasData ? `<div style="font-size:14px;line-height:22px;color:${C.text};margin-bottom:16px;">${esc(d.overall.message)}</div>` : ''}
          ${glanceStrip(d.glance)}
        </td></tr>
        <tr><td style="height:8px;font-size:0;line-height:0;">&nbsp;</td></tr>

        ${rows.join('')}

        ${quiet.length ? `
        <tr><td class="cb-pad" style="padding:0 28px 12px;">
          <div style="font-size:12.5px;line-height:19px;color:${C.muted};">Nothing was set this week for: ${quiet.map((x) => esc(x.label)).join(', ')}.</div>
        </td></tr>` : ''}

        <!-- closing line -->
        <tr><td class="cb-pad" style="padding:6px 28px 22px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="${C.navy}" style="background:${C.navy};border-radius:12px;">
            <tr><td style="padding:16px 20px;text-align:center;font-size:14px;line-height:21px;font-weight:700;color:#ffffff;">
              Small progress every day leads to big results. <span style="color:${C.tealSoft};">Keep going!</span>
            </td></tr>
          </table>
        </td></tr>

        <!-- footer -->
        <tr><td class="cb-pad" style="padding:20px 28px 24px;border-top:1px solid ${C.border};background:#FBFCFE;">
          <div style="font-size:13px;line-height:18px;font-weight:800;color:${C.navy};">CodeBegun</div>
          <div style="font-size:12px;line-height:19px;color:${C.muted};margin-top:4px;">contact@codebegun.com<br>+91 63010 99587<br>Madhapur, Hyderabad</div>
          <div style="font-size:12px;line-height:19px;margin-top:10px;">
            <a href="${base}/dashboard" style="color:${C.teal};text-decoration:none;font-weight:700;">Dashboard</a> &nbsp;·&nbsp;
            <a href="${base}/quizzes" style="color:${C.teal};text-decoration:none;font-weight:700;">Quizzes</a> &nbsp;·&nbsp;
            <a href="${base}/assignments" style="color:${C.teal};text-decoration:none;font-weight:700;">Assignments</a>
          </div>
          <div style="font-size:11px;line-height:17px;color:${C.grey};margin-top:12px;">You are getting this because you are a student${d.student.batchName ? ` of ${esc(d.student.batchName)}` : ''}. It covers ${esc(d.period.label)}.</div>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

/** Plain-text version for clients that do not show HTML. */
export function getWeeklyReportEmailText(d: WeeklyReportData): string {
  const lines = [
    `Hi ${d.student.firstName || 'there'},`,
    '',
    `Your weekly learning report for ${d.period.label}${d.student.batchName ? ` (${d.student.batchName})` : ''}.`,
    d.overall.hasData ? `Weekly score: ${d.overall.score}/100 · ${d.overall.label} · Grade ${d.overall.grade}` : 'No score this week.',
    '',
    'This week at a glance:',
    ...d.glance.map((g) => `- ${g.label}: ${STATE[g.state].word} (${g.detail})`),
  ];
  if (d.drives?.length) lines.push('', 'Placement drives attended:', ...d.drives.map((x) => `- ${x.company} — ${x.role} (${shortDay(x.day)})`));
  if (d.communication.focus) lines.push('', `Communication Lab — next week's focus: ${d.communication.focus}`);
  lines.push('', `Open CodeBegun: ${appBase()}/dashboard`);
  return lines.join('\n');
}
