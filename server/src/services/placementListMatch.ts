/**
 * Match an uploaded list of people (CSV / Excel / pasted lines) to this institute's LMS students, for
 * adding them to a placement drive in one go (2026-11-28).
 *
 * HOW A ROW IS MATCHED, strongest first:
 *   email  exact, any case
 *   phone  the last 10 digits, so +91, spaces, dashes and a leading 0 do not matter
 *   name   only when the row has neither email nor phone that matched, and exactly ONE student of the
 *          institute has that name. A name match is never added on its own: the screen shows it
 *          unticked for a person to confirm.
 * When the email points at one student and the phone at another, the row is "several" and a person
 * chooses. Nothing is added here; this only reports.
 */
import XLSX from 'xlsx';
import mongoose from 'mongoose';
import User from '../models/User';
import Batch from '../models/Batch';

export interface ListRow { name?: string; email?: string; phone?: string }
export interface MatchedStudent { _id: string; name: string; email?: string; phone?: string; batchName?: string; active: boolean }
export interface MatchResult {
  row: number;
  input: ListRow;
  status: 'matched' | 'several' | 'not_found' | 'already' | 'repeat';
  via?: 'email' | 'phone' | 'name';
  student?: MatchedStudent;
  options?: MatchedStudent[];
  /** Matched by email or phone, but the list's name shares no word with the student's: likely a wrong number or address in the sheet. */
  nameDiffers?: boolean;
}

export const MAX_LIST_ROWS = 1000;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const phone10 = (v: any) => { const d = String(v ?? '').replace(/\D/g, ''); return d.length >= 10 ? d.slice(-10) : ''; };
/** Two names share at least one word (of 2+ letters): "Ravi" ~ "Ravi Kumar", "K. Ravi" ~ "Ravi K". */
export const namesAgree = (a: string, b: string) => {
  const words = (x: string) => new Set(normName(x).split(' ').filter(w => w.length >= 2));
  const wa = words(a); const wb = words(b);
  if (!wa.size || !wb.size) return true;
  return [...wa].some(w => wb.has(w));
};
export const normName = (v: any) => String(v ?? '').toLowerCase().replace(/[.\-_,]/g, ' ').replace(/\s+/g, ' ').trim();

const HEADERS: Record<keyof ListRow, RegExp> = {
  email: /e-?mail|mail id/i,
  phone: /phone|mobile|contact|whats\s*app|number|cell/i,
  name: /name|student|candidate/i,
};

/** Rows from a file (CSV or Excel) or pasted text. A header row is used when there is one; otherwise each cell is recognised by its look. */
export function parseList(input: { buffer?: Buffer; text?: string }): ListRow[] {
  let grid: any[][] = [];
  if (input.buffer?.length) {
    const wb = XLSX.read(input.buffer, { type: 'buffer', raw: false });
    const ws = wb.Sheets[wb.SheetNames[0]];
    grid = ws ? XLSX.utils.sheet_to_json(ws, { header: 1, blankrows: false, defval: '', raw: false }) as any[][] : [];
  } else if (input.text) {
    grid = input.text.split(/\r?\n/).filter(l => l.trim()).map(l => l.split(/\t|,|;/));
  }
  grid = grid.map(r => (r || []).map(c => String(c ?? '').trim())).filter(r => r.some(Boolean));
  if (!grid.length) return [];

  // A header row: at least one cell names a column we know, and no cell in it is an email address.
  const head = grid[0];
  const cols: Partial<Record<keyof ListRow, number>> = {};
  if (!head.some(c => EMAIL.test(c))) {
    head.forEach((c, i) => {
      for (const k of ['email', 'phone', 'name'] as (keyof ListRow)[]) {
        if (cols[k] === undefined && HEADERS[k].test(c) && !Object.values(cols).includes(i)) { cols[k] = i; break; }
      }
    });
  }
  const hasHeader = Object.keys(cols).length > 0;
  const body = hasHeader ? grid.slice(1) : grid;

  return body.slice(0, MAX_LIST_ROWS).map((r): ListRow => {
    if (hasHeader) {
      return {
        name: cols.name !== undefined ? r[cols.name] : undefined,
        email: cols.email !== undefined ? r[cols.email] : undefined,
        phone: cols.phone !== undefined ? r[cols.phone] : undefined,
      };
    }
    const row: ListRow = {};
    for (const c of r) {
      if (!c) continue;
      if (!row.email && EMAIL.test(c)) row.email = c;
      else if (!row.phone && phone10(c) && /^[+\d\s()-]+$/.test(c)) row.phone = c;
      else if (!row.name && /[a-z]/i.test(c)) row.name = c;
    }
    return row;
  }).map(r => ({
    name: r.name?.slice(0, 120) || undefined,
    email: r.email && EMAIL.test(r.email) ? r.email.toLowerCase().slice(0, 120) : undefined,
    phone: r.phone ? String(r.phone).slice(0, 20) : undefined,
  })).filter(r => r.name || r.email || r.phone);
}

/** Match each row to a student of the institute. `onDrive` = student ids already on the drive. */
export async function matchList(tenantId: string, rows: ListRow[], onDrive: Set<string>): Promise<MatchResult[]> {
  const students: any[] = await User.find({ tenantId: new mongoose.Types.ObjectId(tenantId), role: 'STUDENT' })
    .select('firstName lastName email phone batchId isActive').lean();
  const batchNames = new Map((await Batch.find({ _id: { $in: [...new Set(students.map(s => String(s.batchId || '')).filter(mongoose.isValidObjectId))] } })
    .select('name').lean()).map((b: any) => [String(b._id), b.name]));
  const view = (s: any): MatchedStudent => ({
    _id: String(s._id), name: [s.firstName, s.lastName].filter(Boolean).join(' ') || s.email || 'Student',
    email: s.email || undefined, phone: s.phone || undefined,
    batchName: s.batchId ? batchNames.get(String(s.batchId)) : undefined, active: s.isActive !== false,
  });
  const byEmail = new Map<string, any>(); const byPhone = new Map<string, any[]>(); const byName = new Map<string, any[]>();
  for (const s of students) {
    if (s.email) byEmail.set(String(s.email).toLowerCase(), s);
    const p = phone10(s.phone); if (p) byPhone.set(p, [...(byPhone.get(p) || []), s]);
    const n = normName([s.firstName, s.lastName].filter(Boolean).join(' ')); if (n) byName.set(n, [...(byName.get(n) || []), s]);
  }

  const seen = new Set<string>();
  return rows.map((input, i): MatchResult => {
    const base = { row: i + 1, input };
    const e = input.email ? byEmail.get(input.email.toLowerCase()) : undefined;
    const ps = input.phone ? (byPhone.get(phone10(input.phone)) || []) : [];
    let hit: any; let via: MatchResult['via'];
    const strong = [...new Map([...(e ? [e] : []), ...ps].map(s => [String(s._id), s])).values()];
    if (strong.length > 1) return { ...base, status: 'several', options: strong.map(view) };
    if (strong.length === 1) { hit = strong[0]; via = e ? 'email' : 'phone'; }
    else if (input.name) {
      const ns = byName.get(normName(input.name)) || [];
      if (ns.length > 1) return { ...base, status: 'several', options: ns.map(view) };
      if (ns.length === 1) { hit = ns[0]; via = 'name'; }
    }
    if (!hit) return { ...base, status: 'not_found' };
    const id = String(hit._id);
    if (onDrive.has(id)) return { ...base, status: 'already', via, student: view(hit) };
    if (seen.has(id)) return { ...base, status: 'repeat', via, student: view(hit) };
    seen.add(id);
    const student = view(hit);
    const nameDiffers = via !== 'name' && !!input.name && !namesAgree(input.name, student.name);
    return { ...base, status: 'matched', via, student, ...(nameDiffers ? { nameDiffers } : {}) };
  });
}
