/**
 * Practice questions from a spreadsheet: the CSV template an author downloads, fills in Excel or
 * Google Sheets, and imports into a day's practice set (Content Builder → Add practice → Import).
 *
 *   type,question,option_a,option_b,option_c,option_d,option_e,option_f,correct,explanation,difficulty,marks
 *
 *   type         mcq | theory. Left blank: mcq when options are filled in, theory when not.
 *   question     The question, as the learner reads it. Markdown works (`code`, **bold**).
 *   option_a..f  An MCQ's choices — at least two. Empty columns are skipped.
 *   correct      The right letter(s): A, or several as "A|C" (also "A;C", "A C" or "AC").
 *   explanation  MCQ: why the answer is right. Theory: what a good answer covers.
 *   difficulty   easy | medium | hard (default medium).
 *   marks        1–100 (default 1).
 *
 * Excel's CSV (BOM, CRLF, semicolons in some locales) and Google Sheets' both read. Quoted cells may
 * hold commas, quotes ("") and line breaks. Every row is checked; a bad row is reported with its
 * spreadsheet row number and never imported, so one typo cannot leave half a question behind.
 */

export interface PracticeQuestionInput {
  type: 'mcq' | 'theory';
  title: string;
  description: string;
  options?: { text: string; isCorrect: boolean }[];
  explanation?: string;
  difficulty: 'easy' | 'medium' | 'hard';
  marks: number;
  gradingMode: 'auto' | 'self';
}

export interface CsvImportResult {
  questions: PracticeQuestionInput[];
  /** Spreadsheet row (header = row 1) and what is wrong with it. */
  errors: { row: number; message: string }[];
}

export const MAX_ROWS = 300;
const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];
export const TEMPLATE_HEADER = ['type', 'question', 'option_a', 'option_b', 'option_c', 'option_d', 'option_e', 'option_f', 'correct', 'explanation', 'difficulty', 'marks'];

/** RFC 4180 CSV, with the delimiter guessed from the header line (comma, semicolon or tab). */
export function parseCsv(text: string): string[][] {
  const src = text.replace(/^﻿/, '');
  const firstLine = src.split(/\r?\n/, 1)[0] || '';
  const count = (ch: string) => {
    let n = 0, q = false;
    for (const c of firstLine) { if (c === '"') q = !q; else if (!q && c === ch) n++; }
    return n;
  };
  const delim = [',', ';', '\t'].map(d => [d, count(d)] as const).sort((a, b) => b[1] - a[1])[0][0];

  const rows: string[][] = [];
  let row: string[] = [], cell = '', inQ = false;
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (inQ) {
      if (c === '"') {
        if (src[i + 1] === '"') { cell += '"'; i++; } else inQ = false;
      } else cell += c;
    } else if (c === '"') inQ = true;
    else if (c === delim) { row.push(cell); cell = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && src[i + 1] === '\n') i++;
      row.push(cell); rows.push(row); row = []; cell = '';
    } else cell += c;
  }
  if (cell !== '' || row.length) { row.push(cell); rows.push(row); }
  return rows;
}

/** Column names without case, spaces, underscores or hyphens: "Question Text" = question_text. */
const norm = (h: string) => h.trim().toLowerCase().replace(/[\s_\-.]+/g, '');

/**
 * A cell written on one line with typed \n between its lines (common in Excel) gets its line breaks
 * back; a cell that already has real line breaks is left as it is. Code in a question, and a code
 * answer in an option, then reads line by line.
 */
export const textCell = (v: string) => (/\r|\n/.test(v) ? v.replace(/\r\n?/g, '\n') : v.replace(/\\r\\n|\\n/g, '\n').replace(/\\t/g, '\t'));

const NAMES = {
  type: ['type', 'questiontype', 'kind'],
  question: ['question', 'questiontext', 'questions', 'q', 'mcq', 'problem', 'statement', 'title'],
  correct: ['correct', 'correctanswer', 'answer', 'correctoption', 'ans', 'key', 'answerkey', 'rightanswer'],
  explanation: ['explanation', 'answerexplanation', 'solution', 'reason', 'rationale', 'modelanswer'],
  difficulty: ['difficulty', 'level'],
  marks: ['marks', 'mark', 'points', 'score'],
};
const optionNames = (l: string, i: number) => [`option${l}`, l, `option${i + 1}`, `choice${l}`, `choice${i + 1}`, `opt${l}`, `opt${i + 1}`];

export function importPracticeCsv(text: string): CsvImportResult {
  const rows = parseCsv(text);
  const errors: CsvImportResult['errors'] = [];
  const questions: PracticeQuestionInput[] = [];
  if (!rows.length) return { questions, errors: [{ row: 1, message: 'The file is empty.' }] };

  const header = rows[0].map(norm);
  const colOf = (names: string[]) => { for (const n of names) { const k = header.indexOf(n); if (k >= 0) return k; } return -1; };
  const col = (name: keyof typeof NAMES) => colOf(NAMES[name]);
  if (col('question') < 0) {
    return { questions, errors: [{ row: 1, message: 'No "question" column. Start from the template - its first row names the columns.' }] };
  }
  const optionCols = LETTERS.map((l, i) => colOf(optionNames(l.toLowerCase(), i)));

  const body = rows.slice(1);
  let seen = 0;
  body.forEach((r, i) => {
    const rowNo = i + 2;
    const get = (name: keyof typeof NAMES) => { const k = col(name); return k >= 0 ? textCell(String(r[k] ?? '')).trim() : ''; };
    if (r.every(c => !String(c).trim())) return;                 // blank line
    seen++;
    if (seen > MAX_ROWS) { if (seen === MAX_ROWS + 1) errors.push({ row: rowNo, message: `Only ${MAX_ROWS} questions can be imported at once; the rest were skipped.` }); return; }

    const question = get('question');
    const options = optionCols.map((k, j) => ({ letter: LETTERS[j], text: k >= 0 ? textCell(String(r[k] ?? '')).trim() : '' })).filter(o => o.text);
    const typeRaw = get('type').toLowerCase();
    const type: 'mcq' | 'theory' | '' = typeRaw === '' ? (options.length ? 'mcq' : 'theory')
      : ['mcq', 'multiple choice', 'multiple_choice', 'choice'].includes(typeRaw) ? 'mcq'
      : ['theory', 'written', 'open', 'short answer', 'short_answer'].includes(typeRaw) ? 'theory' : '';
    const diffRaw = get('difficulty').toLowerCase() || 'medium';
    const marksRaw = get('marks');
    const marks = marksRaw === '' ? 1 : Number(marksRaw);
    const explanation = get('explanation');

    const problems: string[] = [];
    if (!question) problems.push('the question is empty');
    if (!type) problems.push(`type "${get('type')}" is not mcq or theory`);
    if (!['easy', 'medium', 'hard'].includes(diffRaw)) problems.push(`difficulty "${get('difficulty')}" is not easy, medium or hard`);
    if (!Number.isFinite(marks) || marks < 1 || marks > 100 || Math.round(marks) !== marks) problems.push(`marks "${marksRaw}" is not a whole number from 1 to 100`);

    let correct: string[] = [];
    if (type === 'mcq') {
      if (options.length < 2) problems.push('an MCQ needs at least two options');
      /*
       * The answer as a letter (B, "A|C"), a number (2, "1|3") or the option's own text. Only a
       * value made of letters A–F and separators is read as letters, so a text answer like "pwd"
       * is not mistaken for option D.
       */
      const raw = get('correct').replace(/^(option|choice)\s*/i, '');
      const parts = raw.split(/\s*[|;,]\s*|\s+/).filter(Boolean);
      if (/^[A-Fa-f](\s*[|;, ]\s*[A-Fa-f])*$/.test(raw) || /^[A-Fa-f]{2,6}$/.test(raw)) {
        correct = Array.from(new Set(raw.toUpperCase().replace(/[^A-F]/g, '').split('')));
      } else if (parts.length && parts.every(p => /^[1-6]$/.test(p))) {
        correct = Array.from(new Set(parts.map(p => LETTERS[Number(p) - 1])));
      } else if (raw) {
        const byText = options.find(o => o.text.trim().toLowerCase() === raw.trim().toLowerCase());
        correct = byText ? [byText.letter] : [];
        if (!byText) problems.push(`"correct" is "${raw}", which is not a letter, a number or one of the options`);
      }
      if (!correct.length && !get('correct')) problems.push('"correct" is empty - give the right letter, e.g. B');
      const missing = correct.filter(l => !options.some(o => o.letter === l));
      if (missing.length) problems.push(`"correct" names ${missing.join(', ')} but that option is empty`);
    }
    if (problems.length) { errors.push({ row: rowNo, message: problems.join('; ') }); return; }

    questions.push({
      type: type as 'mcq' | 'theory',
      title: question.length > 120 ? `${question.slice(0, 117)}…` : question,
      description: question,
      ...(type === 'mcq' ? { options: options.map(o => ({ text: o.text, isCorrect: correct.includes(o.letter) })) } : {}),
      ...(explanation ? { explanation } : {}),
      difficulty: diffRaw as 'easy' | 'medium' | 'hard',
      marks,
      gradingMode: type === 'mcq' ? 'auto' : 'self',
    });
  });
  if (!questions.length && !errors.length) errors.push({ row: 2, message: 'No questions found under the header row.' });
  return { questions, errors };
}

const csvCell = (v: string) => (/[",\r\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);

/** The template: the header and three worked rows (one MCQ, one MCQ with two answers, one theory). */
export function templateCsv(): string {
  const rows = [
    TEMPLATE_HEADER,
    ['mcq', 'Which command prints the directory you are in?', 'ls', 'pwd', 'cd', 'echo $HOME', '', '', 'B', '`pwd` prints the working directory; `ls` lists what is in it.', 'easy', '1'],
    ['mcq', 'Which of these are absolute paths? (choose all that apply)', '/home/priya/notes', 'notes/day1.md', '/etc/hosts', '../reports', '', '', 'A|C', 'An absolute path starts at the root, /.', 'medium', '2'],
    ['mcq', 'What does this print?\nfor i in range(3):\n    print(i, end=" ")', '0 1 2', '1 2 3', '0\n1\n2', '0 1 2 3', '', '', 'A', '`end=" "` keeps the numbers on one line; range(3) is 0, 1, 2.', 'easy', '1'],
    ['theory', 'Explain, in your own words, the difference between an absolute and a relative path.', '', '', '', '', '', '', '', 'Absolute starts at the root and means the same everywhere; relative starts from the current directory, so its meaning changes with where you are.', 'medium', '2'],
  ];
  // The BOM lets Excel open the file as UTF-8 (names, ₹, quotes) instead of guessing.
  return '﻿' + rows.map(r => r.map(csvCell).join(',')).join('\r\n') + '\r\n';
}

export function downloadTemplate() {
  const blob = new Blob([templateCsv()], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'practice-questions-template.csv';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}
