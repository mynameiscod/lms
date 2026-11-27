/**
 * Talent Pool Sharing — the one place a candidate (LMS student or outside person) is turned into
 * the flat record offices see, the Excel each office downloads, and the outside-candidate import.
 * docs/design/talent-pool-sharing.md
 */
import mongoose from 'mongoose';
import * as XLSX from 'xlsx';
import User from '../models/User';
import StudentProfile from '../models/StudentProfile';
import Batch from '../models/Batch';
import { PlacementDeskCandidate } from '../models/PlacementDesk';
import { TalentCandidate, TalentShare, TalentPartner, IExportColumn } from '../models/TalentPool';
import { normalizePhone } from '../utils/phone';

const oid = (v: any) => new mongoose.Types.ObjectId(String(v));

/* ── The fields an office can see, in their default order ───────────────── */
export interface FieldDef { key: string; label: string; aliases: string[] }
export const FIELDS: FieldDef[] = [
  { key: 'fullName', label: 'Full Name', aliases: ['name', 'candidate name', 'student name', 'full name'] },
  { key: 'email', label: 'Email', aliases: ['email id', 'mail', 'email address', 'e mail'] },
  { key: 'phone', label: 'Contact Number', aliases: ['phone', 'mobile', 'mobile number', 'phone number', 'contact', 'contact no', 'mobile no'] },
  { key: 'gender', label: 'Gender', aliases: ['sex'] },
  { key: 'dateOfBirth', label: 'Date of Birth', aliases: ['dob', 'birth date'] },
  { key: 'address', label: 'Address', aliases: ['full address', 'permanent address'] },
  { key: 'city', label: 'City', aliases: ['current city', 'town'] },
  { key: 'state', label: 'State', aliases: [] },
  { key: 'resumeUrl', label: 'Resume Link', aliases: ['resume', 'cv', 'resume url', 'cv link'] },
  { key: 'linkedInUrl', label: 'LinkedIn', aliases: ['linkedin profile', 'linkedin url', 'linked in'] },
  { key: 'githubUrl', label: 'GitHub', aliases: ['github profile', 'github url', 'git hub'] },
  { key: 'portfolioUrl', label: 'Portfolio', aliases: ['portfolio url', 'website'] },
  { key: 'tenthSchool', label: '10th School', aliases: ['ssc school', 'school name', 'school'] },
  { key: 'tenthYear', label: '10th Passed Out', aliases: ['ssc year', '10th year', 'ssc passed out', '10th year of passing', 'ssc yop'] },
  { key: 'tenthPercent', label: '10th %', aliases: ['ssc', 'ssc %', 'ssc percentage', '10th percentage', '10th', 'tenth', 'ssc cgpa', '10th cgpa'] },
  { key: 'twelfthCollege', label: '12th / Inter College', aliases: ['inter college', 'intermediate college', '12th college', 'puc college'] },
  { key: 'twelfthGroup', label: '12th Group', aliases: ['inter group', 'intermediate group', 'group'] },
  { key: 'twelfthYear', label: '12th Passed Out', aliases: ['inter year', '12th year', 'intermediate year', 'inter passed out', '12th year of passing', 'inter yop'] },
  { key: 'twelfthPercent', label: '12th %', aliases: ['inter', 'inter %', 'inter percentage', 'intermediate %', '12th percentage', '12th', 'twelfth', 'diploma %', 'puc %'] },
  { key: 'degree', label: 'Degree', aliases: ['qualification', 'graduation', 'course', 'highest qualification'] },
  { key: 'branch', label: 'Branch', aliases: ['specialization', 'stream', 'department'] },
  { key: 'college', label: 'College', aliases: ['graduation college', 'college name', 'degree college'] },
  { key: 'university', label: 'University', aliases: [] },
  { key: 'graduationYear', label: 'Graduation Passed Out', aliases: ['passed out', 'passout year', 'year of passing', 'yop', 'passout', 'graduation year', 'batch year'] },
  { key: 'graduationPercent', label: 'Graduation %', aliases: ['graduation percentage', 'degree %', 'btech %', 'b tech %', 'cgpa', 'aggregate', 'aggregate %', 'degree percentage'] },
  { key: 'skills', label: 'Skills', aliases: ['technical skills', 'key skills', 'technologies'] },
  { key: 'expectedRole', label: 'Expected Role', aliases: ['role', 'job role', 'preferred role', 'expected job role', 'interested role'] },
  { key: 'preferredLocation', label: 'Preferred Location', aliases: ['location', 'job location', 'preferred job location', 'preferred locations'] },
  { key: 'status', label: 'Status', aliases: [] },
  { key: 'partnerNote', label: 'Notes', aliases: [] },
];
const FIELD_KEYS = new Set(FIELDS.map((f) => f.key));
/** Share-level fields — not part of an outside candidate's profile, so never imported. */
const SHARE_FIELDS = new Set(['status', 'partnerNote']);

export const DEFAULT_COLUMNS: IExportColumn[] = FIELDS.filter((f) => f.key !== 'portfolioUrl').map((f) => ({ field: f.key, label: f.label }));

export function cleanColumns(cols: any): IExportColumn[] {
  if (!Array.isArray(cols)) return [];
  const seen = new Set<string>();
  const out: IExportColumn[] = [];
  for (const c of cols) {
    const field = String(c?.field || '').trim();
    if (!FIELD_KEYS.has(field) || seen.has(field)) continue;
    seen.add(field);
    const def = FIELDS.find((f) => f.key === field)!;
    out.push({ field, label: String(c?.label || '').trim().slice(0, 80) || def.label });
  }
  return out;
}

export const STATUS_LABELS: Record<string, string> = {
  shared: 'New', viewed: 'Viewed', shortlisted: 'Shortlisted', interview: 'Interview',
  selected: 'Selected', rejected: 'Rejected', on_hold: 'On hold',
};

/* ── The flat candidate record ──────────────────────────────────────────── */
export interface CandidateView {
  kind: 'student' | 'external';
  candidateId: string;
  fullName: string;
  email?: string; phone?: string; gender?: string; dateOfBirth?: string;
  address?: string; city?: string; state?: string;
  resumeUrl?: string; linkedInUrl?: string; githubUrl?: string; portfolioUrl?: string;
  tenthSchool?: string; tenthYear?: number; tenthPercent?: number;
  twelfthCollege?: string; twelfthGroup?: string; twelfthYear?: number; twelfthPercent?: number;
  degree?: string; branch?: string; college?: string; university?: string; graduationYear?: number; graduationPercent?: number;
  skills?: string; expectedRole?: string; preferredLocation?: string;
  batchName?: string;       // admin only — stripped before an office sees it
  missing: string[];        // what keeps the profile from being "ready"
}

/** Uploaded files are stored as /uploads/...; an Excel cell needs the full address to be clickable. */
export function absoluteUrl(u?: string): string | undefined {
  if (!u) return undefined;
  if (/^https?:\/\//i.test(u)) return u;
  const base = (process.env.FRONTEND_URL || '').replace(/\/+$/, '');
  return u.startsWith('/') && base ? `${base}${u}` : u;
}
const dateStr = (d: any) => (d ? new Date(d).toISOString().slice(0, 10) : undefined);
const numOrU = (n: any) => (n == null || n === '' || Number.isNaN(Number(n)) ? undefined : Number(n));

function missingOf(v: Partial<CandidateView>): string[] {
  const m: string[] = [];
  if (!v.phone) m.push('phone');
  if (!v.email) m.push('email');
  if (!v.resumeUrl) m.push('resume');
  if (v.tenthPercent == null) m.push('10th %');
  if (v.twelfthPercent == null) m.push('12th %');
  if (v.graduationPercent == null) m.push('graduation %');
  if (!v.graduationYear) m.push('passed out year');
  return m;
}

export async function studentViews(tenantId: string, userIds: string[]): Promise<Map<string, CandidateView>> {
  const ids = [...new Set(userIds.map(String))].filter((x) => mongoose.isValidObjectId(x)).map(oid);
  const out = new Map<string, CandidateView>();
  if (!ids.length) return out;
  const users: any[] = await User.find({ _id: { $in: ids }, tenantId: oid(tenantId), role: 'STUDENT' })
    .select('firstName lastName email phone batchId').lean();
  const profiles: any[] = await StudentProfile.find({ tenantId: oid(tenantId), userId: { $in: users.map((u) => u._id) } })
    .select('userId personalInfo professionalProfiles education technicalBackground placementPreferences').lean();
  const pmap = new Map(profiles.map((p) => [String(p.userId), p]));
  const batchIds = [...new Set(users.map((u) => String(u.batchId || '')).filter(Boolean))].map(oid);
  const batches: any[] = batchIds.length ? await Batch.find({ _id: { $in: batchIds } }).select('name').lean() : [];
  const bmap = new Map(batches.map((b) => [String(b._id), b.name]));
  for (const u of users) {
    const p: any = pmap.get(String(u._id)) || {};
    const pi = p.personalInfo || {}; const pp = p.professionalProfiles || {}; const ed = p.education || {};
    const dg = ed.degree || {}; const it = ed.intermediate || {}; const tn = ed.tenthClass || {};
    const tb = p.technicalBackground || {}; const pref = p.placementPreferences || {};
    const name = [pi.firstName, pi.middleName, pi.surname].filter(Boolean).join(' ').trim()
      || [u.firstName, u.lastName].filter(Boolean).join(' ').trim() || u.email;
    const skills = [...(tb.programmingLanguages || []), ...(tb.technologies || [])].filter((x: string) => x && !['None', 'Other'].includes(x));
    const v: CandidateView = {
      kind: 'student', candidateId: String(u._id), fullName: name,
      email: pi.email || u.email, phone: pi.mobileNumber || u.phone, gender: pi.gender, dateOfBirth: dateStr(pi.dateOfBirth),
      address: pi.address, city: pi.city, state: pi.state,
      resumeUrl: absoluteUrl(pp.resumeUrl), linkedInUrl: pp.linkedInUrl, githubUrl: pp.githubUrl, portfolioUrl: pp.portfolioUrl,
      tenthSchool: tn.schoolName, tenthYear: numOrU(tn.yearOfPassing), tenthPercent: numOrU(tn.percentage),
      twelfthCollege: it.college, twelfthGroup: it.group, twelfthYear: numOrU(it.yearOfPassing), twelfthPercent: numOrU(it.percentage),
      degree: dg.name || ed.highestQualification, branch: dg.branch, college: dg.college, university: dg.university,
      graduationYear: numOrU(dg.graduationYear), graduationPercent: numOrU(dg.percentage),
      skills: skills.join(', ') || undefined, expectedRole: pref.expectedRole,
      preferredLocation: (pref.preferredLocations || []).join(', ') || undefined,
      batchName: bmap.get(String(u.batchId)) || '', missing: [],
    };
    v.missing = missingOf(v);
    out.set(v.candidateId, v);
  }
  return out;
}

export function externalView(c: any): CandidateView {
  const t = c.tenth || {}; const w = c.twelfth || {}; const g = c.graduation || {};
  const v: CandidateView = {
    kind: 'external', candidateId: String(c._id), fullName: c.fullName,
    email: c.email, phone: c.phone, gender: c.gender, dateOfBirth: dateStr(c.dateOfBirth),
    address: c.address, city: c.city, state: c.state,
    resumeUrl: absoluteUrl(c.resumeUrl), linkedInUrl: c.linkedInUrl, githubUrl: c.githubUrl, portfolioUrl: c.portfolioUrl,
    tenthSchool: t.school, tenthYear: numOrU(t.year), tenthPercent: numOrU(t.percent),
    twelfthCollege: w.college, twelfthGroup: w.group, twelfthYear: numOrU(w.year), twelfthPercent: numOrU(w.percent),
    degree: g.degree, branch: g.branch, college: g.college, university: g.university,
    graduationYear: numOrU(g.year), graduationPercent: numOrU(g.percent),
    skills: (c.skills || []).join(', ') || undefined, expectedRole: c.expectedRole, preferredLocation: c.preferredLocation,
    missing: [],
  };
  v.missing = missingOf(v);
  return v;
}

export async function externalViews(tenantId: string, ids: string[]): Promise<Map<string, CandidateView>> {
  const valid = [...new Set(ids.map(String))].filter((x) => mongoose.isValidObjectId(x)).map(oid);
  if (!valid.length) return new Map();
  const docs: any[] = await TalentCandidate.find({ _id: { $in: valid }, tenantId: oid(tenantId) }).lean();
  return new Map(docs.map((d) => [String(d._id), externalView(d)]));
}

/** Shares joined to their candidate's live profile. A share whose candidate is gone is skipped. */
export async function shareRows(tenantId: string, shares: any[]) {
  const sv = await studentViews(tenantId, shares.filter((s) => s.kind === 'student').map((s) => String(s.studentId)));
  const ev = await externalViews(tenantId, shares.filter((s) => s.kind === 'external').map((s) => String(s.talentCandidateId)));
  const rows: any[] = [];
  for (const s of shares) {
    const v = s.kind === 'student' ? sv.get(String(s.studentId)) : ev.get(String(s.talentCandidateId));
    if (!v) continue;
    rows.push({
      ...v, shareId: String(s._id), partnerId: String(s.partnerId), status: s.status, partnerNote: s.partnerNote || '',
      sharedAt: s.sharedAt, firstViewedAt: s.firstViewedAt, lastViewedAt: s.lastViewedAt,
      statusHistory: s.statusHistory || [],
    });
  }
  return rows;
}

/** What an office is sent: the candidate without the admin-only bits. */
export function forPartner(row: any) {
  const { batchName, missing, partnerId, ...rest } = row;
  return rest;
}

/* ── Excel in the office's own format ───────────────────────────────────── */
export function workbookFor(rows: any[], columns: IExportColumn[]): Buffer {
  const cols = columns.length ? columns : DEFAULT_COLUMNS;
  const cell = (r: any, f: string) => {
    const v = r[f];
    if (f === 'status') return STATUS_LABELS[v] || v || '';
    return v == null ? '' : v;
  };
  const aoa = [cols.map((c) => c.label), ...rows.map((r) => cols.map((c) => cell(r, c.field)))];
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  ws['!cols'] = cols.map((c) => ({ wch: Math.min(45, Math.max(12, c.label.length + 2)) }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Talent Pool');
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
}

/* ── Outside candidates: create / update / import ───────────────────────── */
const norm = (s: string) => String(s || '').toLowerCase().replace(/[^a-z0-9%]+/g, ' ').trim();
const HEADER_MAP = new Map<string, string>();
for (const f of FIELDS) {
  if (SHARE_FIELDS.has(f.key)) continue;
  for (const a of [f.key, f.label, ...f.aliases]) if (!HEADER_MAP.has(norm(a))) HEADER_MAP.set(norm(a), f.key);
}
export const headerToField = (h: string) => HEADER_MAP.get(norm(h));

const txt = (v: any, max = 300) => { const s = String(v ?? '').trim(); return s ? s.slice(0, max) : undefined; };
const year = (v: any) => { const n = parseInt(String(v ?? '').trim(), 10); return n >= 1950 && n <= 2050 ? n : undefined; };
/** "78", "78.5%", or a CGPA "8.2" (×9.5, the common conversion) → a percentage. */
const percent = (v: any) => {
  const s = String(v ?? '').replace('%', '').trim();
  if (!s) return undefined;
  const n = Number(s);
  if (Number.isNaN(n) || n < 0) return undefined;
  if (n <= 10) return Math.round(n * 9.5 * 10) / 10;
  return n <= 100 ? n : undefined;
};
const url = (v: any) => { const s = txt(v, 500); return s && !/^https?:\/\//i.test(s) && /\./.test(s) ? `https://${s}` : s; };

/** Where each profile field lives on a TalentCandidate. */
export const FIELD_PATH: Record<string, string> = {
  fullName: 'fullName', email: 'email', phone: 'phone', gender: 'gender', dateOfBirth: 'dateOfBirth',
  address: 'address', city: 'city', state: 'state',
  resumeUrl: 'resumeUrl', linkedInUrl: 'linkedInUrl', githubUrl: 'githubUrl', portfolioUrl: 'portfolioUrl',
  tenthSchool: 'tenth.school', tenthYear: 'tenth.year', tenthPercent: 'tenth.percent',
  twelfthCollege: 'twelfth.college', twelfthGroup: 'twelfth.group', twelfthYear: 'twelfth.year', twelfthPercent: 'twelfth.percent',
  degree: 'graduation.degree', branch: 'graduation.branch', college: 'graduation.college', university: 'graduation.university',
  graduationYear: 'graduation.year', graduationPercent: 'graduation.percent',
  skills: 'skills', expectedRole: 'expectedRole', preferredLocation: 'preferredLocation',
};

/** A flat field map (keys from FIELDS) → TalentCandidate fields. Only supplied values are set. */
export function candidateFields(f: Record<string, any>): Record<string, any> {
  const out: Record<string, any> = {};
  const set = (k: string, v: any) => { if (v !== undefined) out[k] = v; };
  set('fullName', txt(f.fullName, 120));
  set('email', txt(f.email, 120)?.toLowerCase());
  const ph = f.phone != null && String(f.phone).trim() ? normalizePhone(f.phone) : undefined;
  set('phone', ph || undefined);
  set('gender', txt(f.gender, 30));
  if (f.dateOfBirth) { const d = new Date(f.dateOfBirth); if (!Number.isNaN(d.getTime())) out.dateOfBirth = d; }
  set('address', txt(f.address, 500)); set('city', txt(f.city, 60)); set('state', txt(f.state, 60));
  set('resumeUrl', url(f.resumeUrl)); set('linkedInUrl', url(f.linkedInUrl)); set('githubUrl', url(f.githubUrl)); set('portfolioUrl', url(f.portfolioUrl));
  set('tenth.school', txt(f.tenthSchool, 160)); set('tenth.year', year(f.tenthYear)); set('tenth.percent', percent(f.tenthPercent));
  set('twelfth.college', txt(f.twelfthCollege, 160)); set('twelfth.group', txt(f.twelfthGroup, 60));
  set('twelfth.year', year(f.twelfthYear)); set('twelfth.percent', percent(f.twelfthPercent));
  set('graduation.degree', txt(f.degree, 80)); set('graduation.branch', txt(f.branch, 80));
  set('graduation.college', txt(f.college, 160)); set('graduation.university', txt(f.university, 160));
  set('graduation.year', year(f.graduationYear)); set('graduation.percent', percent(f.graduationPercent));
  if (f.skills != null) {
    const list = (Array.isArray(f.skills) ? f.skills : String(f.skills).split(/[,;|\n]/)).map((x: any) => String(x).trim()).filter(Boolean).slice(0, 40);
    if (list.length) out.skills = list;
  }
  set('expectedRole', txt(f.expectedRole, 120)); set('preferredLocation', txt(f.preferredLocation, 120));
  return out;
}

/** Same person already in the list? Matched on the normalised phone, else the email. */
async function findExisting(tenantId: string, phone?: string, email?: string) {
  if (phone) { const d = await TalentCandidate.findOne({ tenantId: oid(tenantId), phone }); if (d) return d; }
  if (email) { const d = await TalentCandidate.findOne({ tenantId: oid(tenantId), email }); if (d) return d; }
  return null;
}

export async function importRows(tenantId: string, userId: string, rows: Record<string, any>[]) {
  const result = { created: 0, updated: 0, skipped: 0, errors: [] as string[] };
  for (let i = 0; i < rows.length && i < 5000; i++) {
    const mapped: Record<string, any> = {};
    for (const [h, v] of Object.entries(rows[i] || {})) { const k = headerToField(h); if (k && mapped[k] == null) mapped[k] = v; }
    const fields = candidateFields(mapped);
    if (!fields.fullName) { result.skipped++; if (result.errors.length < 20) result.errors.push(`Row ${i + 2}: no name`); continue; }
    if (!fields.phone && !fields.email) { result.skipped++; if (result.errors.length < 20) result.errors.push(`Row ${i + 2}: ${fields.fullName} has no phone or email`); continue; }
    try {
      const existing = await findExisting(tenantId, fields.phone, fields.email);
      if (existing) { existing.set(fields); await existing.save(); result.updated++; }
      else { await TalentCandidate.create({ ...expand(fields), tenantId: oid(tenantId), source: 'excel', createdBy: oid(userId) }); result.created++; }
    } catch (e: any) { result.skipped++; if (result.errors.length < 20) result.errors.push(`Row ${i + 2}: ${e?.message || 'could not save'}`); }
  }
  return result;
}

/** 'tenth.year' style keys → nested objects, for create(). */
export function expand(flat: Record<string, any>) {
  const out: any = {};
  for (const [k, v] of Object.entries(flat)) {
    const [a, b] = k.split('.');
    if (b) { out[a] = out[a] || {}; out[a][b] = v; } else out[a] = v;
  }
  return out;
}

export function importTemplate(): Buffer {
  const cols = FIELDS.filter((f) => !SHARE_FIELDS.has(f.key));
  const ws = XLSX.utils.aoa_to_sheet([cols.map((c) => c.label), ['Ravi Kumar', 'ravi@example.com', '9876543210', 'Male', '2002-05-14', 'H.No 1-2, Ameerpet', 'Hyderabad', 'Telangana', 'https://drive.google.com/...', 'https://linkedin.com/in/ravi', 'https://github.com/ravi', '', 'ZPHS School', 2017, 88, 'Sri Chaitanya', 'MPC', 2019, 91, 'B.Tech', 'CSE', 'JNTU College', 'JNTUH', 2023, 72, 'Java, Spring Boot, React', 'Java Developer', 'Hyderabad']]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Candidates');
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
}

/** Placement Desk outside candidates → Talent Pool outside candidates. Never duplicates. */
export async function importFromPlacementDesk(tenantId: string, userId: string) {
  const rows: any[] = await PlacementDeskCandidate.find({ tenantId: oid(tenantId), kind: 'external' })
    .select('name phone email college degree passoutYear').sort({ createdAt: -1 }).lean();
  const result = { created: 0, skipped: 0 };
  const seen = new Set<string>();
  for (const r of rows) {
    const phone = r.phone ? normalizePhone(r.phone) : undefined;
    const email = r.email ? String(r.email).toLowerCase().trim() : undefined;
    const key = phone || email || '';
    if (!r.name || !key || seen.has(key)) { result.skipped++; continue; }
    seen.add(key);
    if (await TalentCandidate.exists({ tenantId: oid(tenantId), placementDeskCandidateId: r._id }) || await findExisting(tenantId, phone, email)) { result.skipped++; continue; }
    await TalentCandidate.create({
      tenantId: oid(tenantId), fullName: r.name, phone, email, source: 'placement_desk', placementDeskCandidateId: r._id, createdBy: oid(userId),
      graduation: { college: r.college, degree: r.degree, year: year(r.passoutYear) },
    });
    result.created++;
  }
  return result;
}

/** The partner record of the signed-in office, or null. Every portal handler starts here. */
export async function partnerOf(userId: string) {
  return TalentPartner.findOne({ userId: oid(userId), active: true }).lean();
}

export { TalentShare };
