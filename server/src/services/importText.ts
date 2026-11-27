/**
 * Reading spreadsheet cells the way authors actually write them.
 *
 * LINE BREAKS. A cell can hold real line breaks (Alt+Enter in Excel, or a quoted CSV cell over
 * several lines) — or, very often, the whole thing typed on one line with "\n" between the lines.
 * Both must come out as lines: a star pattern's expected output, a multi-line statement, a program.
 * A cell that already has real line breaks is left alone apart from Windows line endings.
 *
 * CODE. In code a "\n" inside quotes is part of the program (`print("a\nb")`), so for code cells the
 * typed escapes are turned into line breaks only outside string quotes.
 *
 * COLUMN NAMES. "Question Text", "question_text", "QuestionText" and "question-text" are one column:
 * names are compared without case, spaces, underscores or hyphens.
 */

export const looseKey = (s: string) => String(s ?? '').toLowerCase().replace(/[\s_\-.]+/g, '');

/** A row keyed by loose column name, plus the names as the author wrote them (for "not used" reports). */
export function looseRow(raw: Record<string, any>) {
  const row: Record<string, string> = {};
  const original: Record<string, string> = {};
  for (const [k, v] of Object.entries(raw)) {
    const key = looseKey(k);
    if (!key) continue;
    row[key] = v === undefined || v === null ? '' : String(v);
    original[key] = String(k).trim();
  }
  return { row, original };
}

/** The first of these columns that has a value. */
export const pick = (row: Record<string, string>, ...names: string[]) => {
  for (const n of names) { const v = row[looseKey(n)]; if (v !== undefined && String(v).trim() !== '') return String(v); }
  return '';
};

const hasRealBreak = (s: string) => /\r|\n/.test(s);

/** Text: typed \n, \r\n and \t become real line breaks and tabs when the cell has no real ones. */
export function textCell(v: unknown): string {
  const s = String(v ?? '');
  if (hasRealBreak(s)) return s.replace(/\r\n?/g, '\n');
  return s.replace(/\\r\\n|\\n/g, '\n').replace(/\\t/g, '\t');
}

/** Code: like textCell, but a "\n" inside '…', "…" or `…` stays as typed (it belongs to the program). */
export function codeCell(v: unknown): string {
  const s = String(v ?? '');
  if (hasRealBreak(s)) return s.replace(/\r\n?/g, '\n');
  let out = '';
  let quote: string | null = null;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (quote) {
      out += c;
      if (c === '\\' && i + 1 < s.length) { out += s[++i]; continue; }
      if (c === quote) quote = null;
      continue;
    }
    if (c === '"' || c === "'" || c === '`') { quote = c; out += c; continue; }
    if (c === '\\' && s[i + 1] === 'n') { out += '\n'; i++; continue; }
    if (c === '\\' && s[i + 1] === 'r' && s[i + 2] === '\\' && s[i + 3] === 'n') { out += '\n'; i += 3; continue; }
    if (c === '\\' && s[i + 1] === 't') { out += '\t'; i++; continue; }
    out += c;
  }
  return out;
}

/** yes / true / 1 / y / hidden → true; no / false / 0 / n / open / visible / sample → false; blank → undefined. */
export function flagCell(v: unknown): boolean | undefined {
  const t = String(v ?? '').trim().toLowerCase();
  if (!t) return undefined;
  if (['yes', 'y', 'true', '1', 'hidden', 'private'].includes(t)) return true;
  if (['no', 'n', 'false', '0', 'open', 'visible', 'sample', 'public', 'example'].includes(t)) return false;
  return undefined;
}

/** Columns the importer read nothing from, as the author named them. */
export function unusedColumns(original: Record<string, string>, used: Set<string>): string[] {
  return Object.keys(original).filter((k) => !used.has(k)).map((k) => original[k]);
}
