/**
 * The custom-range student report as a PDF (pdfkit, like candidateProfilePdf). A4, CodeBegun
 * colours, the institute's own name on the header (getBrand). Tables break across pages and
 * repeat their header row. Helvetica has no ✓/✗ glyphs, so states are words.
 */
import PDFDocument from 'pdfkit';
import { getBrand } from './tenantBrand';
import type { PeriodReport } from './periodReportService';

const NAVY = '#051D64', TEAL = '#359AAD', INK = '#102A4F', TEXT = '#33475B', MUTED = '#64748B', BORDER = '#E2EAF2', BG = '#F4F8FC';
const GREEN = '#047857', RED = '#B91C1C', AMBER = '#B86B00';
const STATE: Record<string, [string, string]> = {
  done: ['Done', GREEN], partial: ['Partly done', AMBER], missed: ['Missed', RED], pending: ['Not due yet', NAVY], none: ['Nothing set', MUTED],
};
/** Helvetica (WinAnsi) can't draw every character an admin may type; keep what it can. */
const safe = (s: unknown) => String(s ?? '').replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/→/g, '->')
  .replace(/[^\x09\x0A\x0D\x20-\x7E -ÿ–—•…€]/g, '');
const day = (ymd: string) => {
  const t = Date.parse(`${ymd}T00:00:00Z`);
  return isNaN(t) ? ymd : new Date(t).toLocaleDateString('en-IN', { timeZone: 'UTC', day: 'numeric', month: 'short', year: 'numeric' });
};

interface Col { label: string; width: number; align?: 'left' | 'right' | 'center' }

export async function periodReportPdf(tenantId: string, r: PeriodReport): Promise<Buffer> {
  const brand = await getBrand(tenantId);
  const doc = new PDFDocument({ size: 'A4', margin: 40, bufferPages: true, info: { Title: `${r.student.name} — progress report`, Author: brand.name } });
  const chunks: Buffer[] = [];
  doc.on('data', (c: Buffer) => chunks.push(c));
  const done = new Promise<Buffer>((resolve) => doc.on('end', () => resolve(Buffer.concat(chunks))));

  const L = 40, W = doc.page.width - 80, BOTTOM = doc.page.height - 50;
  const ensure = (h: number) => { if (doc.y + h > BOTTOM) { doc.addPage(); doc.y = 40; } };

  // ── header ──
  doc.rect(0, 0, doc.page.width, 118).fill(NAVY);
  doc.rect(0, 118, doc.page.width, 4).fill(TEAL);
  doc.fillColor('#7FD3E0').font('Helvetica-Bold').fontSize(9).text('STUDENT PROGRESS REPORT', L, 30, { characterSpacing: 1.2 });
  doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(22).text(safe(r.student.name), L, 46, { width: W - 150 });
  // One line each, cut with "…" so a long batch name or email can never run into the next line.
  const oneLine = { width: W - 150, height: 13, ellipsis: true, lineBreak: false } as any;
  doc.fillColor('#C9D6EE').font('Helvetica').fontSize(10)
    .text(safe([r.period.label, r.student.batchName].filter(Boolean).join('   |   ')), L, 76, oneLine);
  doc.fillColor('#C9D6EE').fontSize(8.5)
    .text(safe([r.student.email, r.copy === 'staff' ? 'Staff copy — includes drive results' : 'Student copy'].filter(Boolean).join('   ·   ')), L, 94, oneLine);
  doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(13).text(safe(brand.name), L + W - 150, 32, { width: 150, align: 'right' });
  if (r.overall.hasData) {
    doc.fillColor('#7FD3E0').font('Helvetica-Bold').fontSize(30).text(`${r.overall.score}`, L + W - 150, 54, { width: 112, align: 'right' });
    doc.fillColor('#C9D6EE').font('Helvetica').fontSize(11).text('/100', L + W - 36, 70, { width: 36 });
    doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(9.5).text(`Grade ${r.overall.grade}`, L + W - 150, 92, { width: 150, align: 'right' });
  } else {
    doc.fillColor('#C9D6EE').font('Helvetica').fontSize(10).text('No score for this period', L + W - 150, 64, { width: 150, align: 'right' });
  }
  doc.y = 140;

  const heading = (t: string, sub?: string) => {
    ensure(48);
    doc.moveDown(0.6);
    doc.fillColor(INK).font('Helvetica-Bold').fontSize(13).text(safe(t), L, doc.y);
    const y = doc.y + 2;
    doc.moveTo(L, y).lineTo(L + W, y).strokeColor(TEAL).lineWidth(1.2).stroke();
    doc.y = y + 6;
    if (sub) doc.fillColor(MUTED).font('Helvetica').fontSize(9).text(safe(sub), L, doc.y, { width: W });
    doc.moveDown(0.3);
  };
  const para = (t: string, color = TEXT, size = 9.5) => { ensure(16); doc.fillColor(color).font('Helvetica').fontSize(size).text(safe(t), L, doc.y, { width: W }); doc.moveDown(0.25); };
  const kv = (pairs: [string, string][]) => {
    ensure(40);
    const w = W / pairs.length, y = doc.y;
    pairs.forEach(([k, v], i) => {
      doc.roundedRect(L + i * w + (i ? 3 : 0), y, w - (i ? 3 : 0) - (i < pairs.length - 1 ? 3 : 0), 36, 6).fill(BG);
      doc.fillColor(NAVY).font('Helvetica-Bold').fontSize(13).text(safe(v), L + i * w, y + 6, { width: w, align: 'center' });
      doc.fillColor(MUTED).font('Helvetica').fontSize(8).text(safe(k), L + i * w, y + 23, { width: w, align: 'center' });
    });
    doc.y = y + 44;
  };
  const table = (cols: Col[], rows: { cells: string[]; colors?: (string | undefined)[] }[], empty = 'Nothing in this period.') => {
    if (!rows.length) { para(empty, MUTED, 9); return; }
    const total = cols.reduce((s, c) => s + c.width, 0);
    const ws = cols.map((c) => (c.width / total) * W);
    const head = () => {
      ensure(22);
      const y = doc.y;
      doc.rect(L, y, W, 18).fill(BG);
      let x = L;
      cols.forEach((c, i) => { doc.fillColor(MUTED).font('Helvetica-Bold').fontSize(8).text(c.label.toUpperCase(), x + 5, y + 5, { width: ws[i] - 10, align: c.align || 'left' }); x += ws[i]; });
      doc.y = y + 18;
    };
    head();
    for (const row of rows) {
      doc.font('Helvetica').fontSize(8.8);
      const h = Math.max(...row.cells.map((t, i) => doc.heightOfString(safe(t) || ' ', { width: ws[i] - 10 }))) + 8;
      if (doc.y + h > BOTTOM) { doc.addPage(); doc.y = 40; head(); }
      const y = doc.y;
      let x = L;
      row.cells.forEach((t, i) => {
        doc.fillColor(row.colors?.[i] || TEXT).font(row.colors?.[i] ? 'Helvetica-Bold' : 'Helvetica').fontSize(8.8)
          .text(safe(t), x + 5, y + 4, { width: ws[i] - 10, align: cols[i].align || 'left' });
        x += ws[i];
      });
      doc.moveTo(L, y + h).lineTo(L + W, y + h).strokeColor(BORDER).lineWidth(0.6).stroke();
      doc.y = y + h;
    }
    doc.moveDown(0.3);
  };
  const statusCell = (s: string): [string, string] => (s === 'done' ? ['Done', GREEN] : s === 'missed' ? ['Missed', RED] : ['Open', NAVY]);

  // ── summary ──
  heading('Summary', r.overall.hasData ? safe(r.overall.message) : 'Nothing was scored in this period.');
  table([{ label: 'Area', width: 3 }, { label: 'Status', width: 2 }, { label: 'Detail', width: 4 }], [
    ...r.glance.map((g) => ({ cells: [g.label, STATE[g.state][0], g.detail], colors: [undefined, STATE[g.state][1]] })),
    { cells: ['Placement drives', r.drives.length ? 'Attended' : 'None', r.drives.length ? `${r.drives.length} drive${r.drives.length > 1 ? 's' : ''} attended` : 'No drives in this period'], colors: [undefined, r.drives.length ? GREEN : MUTED] },
  ]);

  // ── week by week ──
  heading('Week by week', 'Each Monday–Sunday week of the period. Done/set; a lab shows days done out of days expected.');
  const frac = (a: number, b: number) => (b ? `${a}/${b}` : '–');
  table([
    { label: 'Week', width: 2.4 }, { label: 'Score', width: 1, align: 'right' }, { label: 'Classes', width: 1.3, align: 'center' },
    { label: 'Quizzes', width: 1.3, align: 'center' }, { label: 'Assign.', width: 1.3, align: 'center' }, { label: 'Interv.', width: 1.2, align: 'center' },
    { label: 'Speaking', width: 1.4, align: 'center' }, { label: 'Thinking', width: 1.4, align: 'center' }, { label: 'Drives', width: 1, align: 'center' },
  ], r.weeks.map((w) => ({
    cells: [
      w.label, w.hasData ? String(w.score) : '–', frac(w.classes.present, w.classes.total), frac(w.quizzes.done, w.quizzes.set),
      frac(w.assignments.done, w.assignments.set), w.interviews.taken || w.interviews.absent ? `${w.interviews.taken}${w.interviews.absent ? ` (${w.interviews.absent} abs.)` : ''}` : '–',
      w.communication.expected ? frac(w.communication.done, w.communication.expected) : w.communication.active ? `${w.communication.active}d` : '–',
      w.thinking.expected ? frac(w.thinking.done, w.thinking.expected) : w.thinking.active ? `${w.thinking.active}d` : '–',
      w.drives ? String(w.drives) : '–',
    ],
    colors: [undefined, w.hasData ? (w.score >= 70 ? GREEN : w.score >= 50 ? AMBER : RED) : undefined],
  })));

  // ── quizzes ──
  const q = r.quizzes;
  heading('Quizzes', q.assigned ? `${q.attempted} of ${q.assigned} done · ${q.missed} missed${q.attempted ? ` · average ${q.avgScore}% · top ${q.topScore}%` : ''}` : undefined);
  table([{ label: 'Quiz', width: 5 }, { label: 'Day', width: 2 }, { label: 'Status', width: 1.4 }, { label: 'Score', width: 1, align: 'right' }],
    q.items.map((i) => { const [t, c] = statusCell(i.status); return { cells: [i.title, day(i.date), t, i.score !== null ? `${i.score}%` : '–'], colors: [undefined, undefined, c] }; }),
    'No quizzes in this period.');

  // ── assignments ──
  const a = r.assignments;
  heading('Assignments', a.assigned ? `${a.submitted} of ${a.assigned} submitted · ${a.missed} missed${a.scoredCount ? ` · average ${a.avgScore}%` : ''}` : undefined);
  table([{ label: 'Assignment', width: 5 }, { label: 'Day', width: 2 }, { label: 'Status', width: 1.4 }, { label: 'Score', width: 1, align: 'right' }],
    a.items.map((i) => { const [t, c] = statusCell(i.status); return { cells: [i.title, day(i.date), t, i.score !== null ? `${i.score}%` : '–'], colors: [undefined, undefined, c] }; }),
    'No assignments in this period.');

  // ── attendance ──
  const at = r.attendance;
  heading('Class attendance');
  if (at.totalClasses) kv([['Attendance', `${at.percentage}%`], ['Present', String(at.present)], ['Absent', String(at.absent)], ['Late', String(at.late)], ['Leave', String(at.leave)], ['Classes', String(at.totalClasses)]]);
  else para('No classes were marked in this period.', MUTED, 9);

  // ── interviews ──
  const iv = r.interview;
  heading('Mock interviews', iv.taken || iv.absent ? `${iv.taken} taken${iv.taken ? ` · average ${iv.avgScore}%` : ''}${iv.absent ? ` · ${iv.absent} absent` : ''}` : undefined);
  table([{ label: 'Day', width: 1.6 }, { label: 'Interview', width: 2.6 }, { label: 'Score', width: 1, align: 'right' }, { label: 'Mentor remarks', width: 4.4 }],
    iv.items.map((x) => ({ cells: [day(x.date), x.title, x.absent ? 'Absent' : x.score !== null ? `${x.score}%` : '–', x.remarks || ''], colors: [undefined, undefined, x.absent ? RED : undefined] })),
    'No mock interviews in this period.');

  // ── labs ──
  const labHead = (w: PeriodReport['communication'] | PeriodReport['thinking'], what: string) =>
    w.expectedDays ? `${w.doneDays} of ${w.expectedDays} expected days done (${w.missedDays} missed). ${w.source === 'scheduled' ? `Expected = days your batch had a ${what} set.` : 'Expected = Daily Practice Pass working days.'}`
      : w.activeDays ? `Nothing was set in this period; practised on ${w.activeDays} day${w.activeDays > 1 ? 's' : ''}.` : 'Nothing was set and nothing was done in this period.';
  const c = r.communication;
  heading('AI Communication Lab', labHead(c, 'speaking challenge'));
  if (c.recordings || c.expectedDays) {
    kv([['Days done', c.expectedDays ? `${c.doneDays}/${c.expectedDays}` : String(c.activeDays)], ['Recordings', String(c.recordings)], ['Average AI score', c.avgScore !== null ? String(c.avgScore) : '–'], ['Words / minute', c.wordsPerMinute !== null ? String(c.wordsPerMinute) : '–']]);
    if (c.skillsChange.length) {
      table([{ label: 'Skill', width: 3 }, { label: 'Start of period', width: 2, align: 'right' }, { label: 'End of period', width: 2, align: 'right' }, { label: 'Change', width: 2, align: 'right' }],
        c.skillsChange.map((s) => ({ cells: [s.label, String(s.from), String(s.to), `${s.to - s.from >= 0 ? '+' : ''}${s.to - s.from}`], colors: [undefined, undefined, undefined, s.to > s.from ? GREEN : s.to < s.from ? RED : undefined] })));
    }
    if (c.strength) para(`Strength: ${c.strength}`);
    if (c.improve) para(`Work on: ${c.improve}`);
    if (c.focus) para(`Latest focus: ${c.focus}`);
  }
  const t = r.thinking;
  heading('Thinking Lab', labHead(t, 'challenge'));
  if (t.attempted || t.expectedDays) {
    kv([['Days done', t.expectedDays ? `${t.doneDays}/${t.expectedDays}` : String(t.activeDays)], ['Solved', `${t.solved}/${t.attempted}`], ['Average score', t.avgScore !== null ? String(t.avgScore) : '–'], ['Hints used', String(t.hintsUsed)]]);
    para(`Difficulty: easy ${t.difficulty.easy} · medium ${t.difficulty.medium} · hard ${t.difficulty.hard}`);
    if (t.strength) para(`Strength: ${t.strength}`);
    if (t.weakness) para(`Work on: ${t.weakness}`);
  }

  // ── drives ──
  heading('Placement drives', r.copy === 'staff' ? 'Every drive the student was put forward for in this period.' : 'Drives attended in this period.');
  if (r.copy === 'staff') {
    table([{ label: 'Day', width: 1.6 }, { label: 'Company', width: 2.2 }, { label: 'Role', width: 2.2 }, { label: 'Result', width: 1.6 }, { label: 'Offer', width: 0.9, align: 'right' }, { label: 'Company feedback', width: 3 }],
      r.driveLog.map((d) => ({
        cells: [day(d.day), d.company, d.role, `${d.status || ''}${d.roundReached ? ` (${d.roundReached})` : ''}`, d.offerCtc ? `${d.offerCtc} LPA` : '–', d.companyFeedback || ''],
        colors: [undefined, undefined, undefined, /Offer|Joined/.test(d.status || '') ? GREEN : /Not selected|Did not/.test(d.status || '') ? RED : undefined],
      })), 'No drives in this period.');
  } else {
    table([{ label: 'Day', width: 1.6 }, { label: 'Company', width: 3 }, { label: 'Role', width: 3 }, { label: 'Held', width: 1.6 }],
      r.driveLog.map((d) => ({ cells: [day(d.day), d.company, d.role, d.mode] })), 'No drives attended in this period.');
  }

  // ── practice pass ──
  if (r.practice) {
    heading('Daily Practice Pass', 'Current standing.');
    kv([['Days met in period', `${r.practice.metDays}/${r.practice.countedDays}`], ['Practice attendance', `${r.practice.pct}%`], ['Needed', `${r.practice.thresholdPct}%`], ['Streak', String(r.practice.streak)]]);
    if (r.practice.onHold) para('Placement support is on hold.', RED);
  }

  // ── footer on every page ──
  const gen = new Date(r.period.generatedAtISO).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' });
  const range = doc.bufferedPageRange();
  for (let i = range.start; i < range.start + range.count; i++) {
    doc.switchToPage(i);
    doc.page.margins.bottom = 0; // the footer sits below the text area; don't let it start a new page
    doc.fillColor(MUTED).font('Helvetica').fontSize(7.5)
      .text(safe(`${brand.name} · ${r.student.name} · ${r.period.label} · generated ${gen}`), L, doc.page.height - 32, { width: W - 60, lineBreak: false });
    doc.text(`Page ${i - range.start + 1} of ${range.count}`, L + W - 60, doc.page.height - 32, { width: 60, align: 'right', lineBreak: false });
  }
  doc.end();
  return done;
}
