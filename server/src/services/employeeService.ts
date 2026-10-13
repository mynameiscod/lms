import crypto from 'crypto';
import mongoose from 'mongoose';
import Employee from '../models/Employee';
import EmployeeConfig, { DEFAULT_CONFIG } from '../models/EmployeeConfig';
import EmployeeFile from '../models/EmployeeFile';
import User from '../models/User';
import Role from '../models/Role';
import { permissionsOf } from '../middleware/roleGuard';
import { encryptField, decryptField, maskField } from '../utils/fieldCrypto';
import * as bunny from './bunnyStorageService';
import { UserService } from './userService';
import { EmailService } from './emailService';
import { assertSeats, LimitError } from './tenantLimits';

/**
 * Employees: the people who work for the institute. Profile, job, pay history, documents, the
 * institute's own lists (departments, designations, expense categories ...), and the login that
 * lets an employee into the portal. Daily activity and expenses live in their own services.
 */

export class EmployeeError extends Error {
  constructor(message: string, public status = 400) { super(message); }
}

export const oid = (id: any) => new mongoose.Types.ObjectId(String(id));
export const validId = (id: any) => mongoose.isValidObjectId(String(id || ''));
const str = (v: unknown) => (v === undefined || v === null ? undefined : String(v).trim());
const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Today in India as YYYY-MM-DD, whatever timezone the server runs in. */
export const istDate = (d: Date = new Date()) => new Date(d.getTime() + 330 * 60_000).toISOString().slice(0, 10);
export const istMonth = (d: Date = new Date()) => istDate(d).slice(0, 7);
export const validDay = (s: unknown): s is string => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(new Date(s + 'T00:00:00Z').getTime());

// ── Who may do what ──────────────────────────────────────────────────────────

export interface Actor { id: string; role: string; tenantId: string; customRoleId?: string | null }

export async function permsOf(actor: Actor): Promise<Set<string>> {
  return new Set(await permissionsOf(actor as any));
}

/** The employee record belonging to a login, if any. */
export async function employeeOfUser(tenantId: string, userId: string): Promise<any | null> {
  if (!validId(userId)) return null;
  return Employee.findOne({ tenantId: oid(tenantId), userId: oid(userId) }).lean();
}

/** Everyone who reports to this employee, directly or through others (a manager sees their whole team). */
export async function teamIds(tenantId: string, managerEmployeeId: string): Promise<string[]> {
  const seen = new Set<string>();
  let frontier = [String(managerEmployeeId)];
  for (let depth = 0; depth < 5 && frontier.length; depth++) {
    const rows: any[] = await Employee.find({ tenantId: oid(tenantId), reportingManagerId: { $in: frontier.map(oid) } }).select('_id').lean();
    frontier = [];
    for (const r of rows) { const id = String(r._id); if (!seen.has(id)) { seen.add(id); frontier.push(id); } }
  }
  return [...seen];
}

// ── Settings: the institute's own lists and rules ───────────────────────────

export async function getConfig(tenantId: string): Promise<any> {
  const existing = await EmployeeConfig.findOne({ tenantId: oid(tenantId) }).lean();
  if (existing) return { ...DEFAULT_CONFIG, ...existing, expensePolicy: { ...DEFAULT_CONFIG.expensePolicy, ...(existing as any).expensePolicy }, activityPolicy: { ...DEFAULT_CONFIG.activityPolicy, ...(existing as any).activityPolicy } };
  await EmployeeConfig.updateOne({ tenantId: oid(tenantId) }, { $setOnInsert: { tenantId: oid(tenantId) } }, { upsert: true });
  return { ...DEFAULT_CONFIG, tenantId, codePrefix: 'EMP', codeCounter: 0 };
}

const list = (v: unknown, max = 80): string[] | undefined => {
  if (!Array.isArray(v)) return undefined;
  const out: string[] = [];
  for (const x of v) { const s = String(x ?? '').trim().slice(0, 80); if (s && !out.includes(s)) out.push(s); if (out.length >= max) break; }
  return out;
};
const num = (v: unknown, min: number, max: number, fallback: number) => {
  const n = Number(v); return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
};

export async function saveConfig(tenantId: string, input: any): Promise<any> {
  const cur = await getConfig(tenantId);
  const set: Record<string, unknown> = {};
  for (const k of ['departments', 'designations', 'employmentTypes', 'workLocations', 'documentTypes', 'activityCategories'] as const) {
    const l = list(input?.[k]); if (l) { if (!l.length) throw new EmployeeError(`Keep at least one entry in ${k}.`); set[k] = l; }
  }
  if (Array.isArray(input?.expenseCategories)) {
    const seen = new Set<string>(); const cats: any[] = [];
    for (const c of input.expenseCategories) {
      const name = String(c?.name ?? '').trim().slice(0, 60);
      if (!name || seen.has(name.toLowerCase())) continue;
      seen.add(name.toLowerCase());
      cats.push({ name, dailyLimit: num(c.dailyLimit, 0, 10_000_000, 0), receiptRequiredAbove: num(c.receiptRequiredAbove, 0, 10_000_000, 0), active: c.active !== false });
    }
    if (!cats.length) throw new EmployeeError('Keep at least one expense category.');
    set.expenseCategories = cats;
  }
  if (Array.isArray(input?.customFields)) {
    const seen = new Set<string>(); const fields: any[] = [];
    for (const f of input.customFields) {
      const key = String(f?.key ?? '').trim();
      if (!/^[a-zA-Z][a-zA-Z0-9_]{0,40}$/.test(key) || seen.has(key)) throw new EmployeeError(`"${key}" is not a usable field key. Use letters, numbers and underscores, starting with a letter.`);
      seen.add(key);
      fields.push({ key, label: String(f?.label || key).trim().slice(0, 80), required: !!f?.required });
    }
    set.customFields = fields;
  }
  if (input?.expensePolicy) {
    const p = input.expensePolicy;
    if (p.approvalMode !== undefined && !['reporting_manager', 'approvers', 'manager_then_approver'].includes(p.approvalMode)) throw new EmployeeError('Choose a valid approval mode.');
    set.expensePolicy = {
      ...cur.expensePolicy,
      approvalMode: p.approvalMode ?? cur.expensePolicy.approvalMode,
      receiptRequiredAbove: num(p.receiptRequiredAbove, 0, 10_000_000, cur.expensePolicy.receiptRequiredAbove),
      dailyLimit: num(p.dailyLimit, 0, 10_000_000, cur.expensePolicy.dailyLimit),
      monthlyLimit: num(p.monthlyLimit, 0, 100_000_000, cur.expensePolicy.monthlyLimit),
      autoApproveBelow: num(p.autoApproveBelow, 0, 10_000_000, cur.expensePolicy.autoApproveBelow),
      maxBackdateDays: Math.round(num(p.maxBackdateDays, 0, 365, cur.expensePolicy.maxBackdateDays)),
    };
  }
  if (input?.activityPolicy) {
    const p = input.activityPolicy;
    if (p.reviewMode !== undefined && !['manager', 'reviewers', 'none'].includes(p.reviewMode)) throw new EmployeeError('Choose a valid review mode.');
    if (p.lateCheckInAfter !== undefined && !/^([01]\d|2[0-3]):[0-5]\d$/.test(String(p.lateCheckInAfter))) throw new EmployeeError('Late check-in time must look like 10:30.');
    const days = Array.isArray(p.workingDays) ? [...new Set(p.workingDays.map(Number).filter((d: number) => d >= 0 && d <= 6))] : cur.activityPolicy.workingDays;
    set.activityPolicy = {
      ...cur.activityPolicy,
      expectedHours: num(p.expectedHours, 1, 24, cur.activityPolicy.expectedHours),
      workingDays: days,
      lateCheckInAfter: p.lateCheckInAfter ?? cur.activityPolicy.lateCheckInAfter,
      requireCheckIn: p.requireCheckIn ?? cur.activityPolicy.requireCheckIn,
      requireEodSubmit: p.requireEodSubmit ?? cur.activityPolicy.requireEodSubmit,
      reviewMode: p.reviewMode ?? cur.activityPolicy.reviewMode,
      editableDays: Math.round(num(p.editableDays, 0, 60, cur.activityPolicy.editableDays)),
    };
  }
  if (input?.codePrefix !== undefined) {
    const prefix = String(input.codePrefix).trim().toUpperCase();
    if (!/^[A-Z0-9]{1,8}$/.test(prefix)) throw new EmployeeError('The employee id prefix is 1 to 8 letters or numbers.');
    set.codePrefix = prefix;
  }
  await EmployeeConfig.updateOne({ tenantId: oid(tenantId) }, { $set: set }, { upsert: true });
  return getConfig(tenantId);
}

async function nextCode(tenantId: string): Promise<string> {
  // Skip any code already taken (imported or typed by hand), so a clash can never fail a new employee.
  for (let i = 0; i < 50; i++) {
    const c: any = await EmployeeConfig.findOneAndUpdate({ tenantId: oid(tenantId) }, { $inc: { codeCounter: 1 }, $setOnInsert: { tenantId: oid(tenantId) } }, { upsert: true, new: true }).lean();
    const code = `${c.codePrefix || 'EMP'}-${String(c.codeCounter).padStart(4, '0')}`;
    if (!(await Employee.exists({ tenantId: oid(tenantId), employeeCode: code }))) return code;
  }
  throw new EmployeeError('Could not choose an employee id. Try again.', 500);
}

// ── Reading employees ────────────────────────────────────────────────────────

const fullName = (e: any) => [e.firstName, e.lastName].filter(Boolean).join(' ');

export interface View { sensitive: boolean; self?: boolean; hr?: boolean }

/** An employee as the viewer may see them: pay and identity numbers only for those allowed. */
export function shapeEmployee(e: any, v: View) {
  const out: any = { ...e, name: fullName(e), _id: String(e._id) };
  if (e.customFields && typeof (e.customFields as any).entries === 'function') out.customFields = Object.fromEntries((e.customFields as any).entries());
  const s = e.sensitive || {};
  if (v.sensitive) {
    out.sensitive = {
      pan: decryptField(s.pan), aadhaar: decryptField(s.aadhaar), uan: decryptField(s.uan), pfNumber: decryptField(s.pfNumber), esiNumber: decryptField(s.esiNumber),
      bankAccountHolder: s.bankAccountHolder || '', bankName: s.bankName || '', bankAccountNumber: decryptField(s.bankAccountNumber), bankIfsc: s.bankIfsc || '', bankBranch: s.bankBranch || '',
    };
  } else if (v.self) {
    out.sensitive = { pan: maskField(decryptField(s.pan)), aadhaar: maskField(decryptField(s.aadhaar)), uan: maskField(decryptField(s.uan)), pfNumber: '', esiNumber: '', bankAccountHolder: s.bankAccountHolder || '', bankName: s.bankName || '', bankAccountNumber: maskField(decryptField(s.bankAccountNumber)), bankIfsc: s.bankIfsc || '', bankBranch: s.bankBranch || '' };
    delete out.currentCtc; delete out.compensationHistory; delete out.payFrequency;
  } else {
    delete out.sensitive; delete out.currentCtc; delete out.compensationHistory; delete out.payFrequency;
  }
  if (v.self || !v.hr) delete out.hrNotes;
  out.hasLogin = !!e.userId;
  return out;
}

export interface ListQuery { search?: string; department?: string; status?: string; designation?: string; managerId?: string; page?: number; limit?: number; onlyIds?: string[] }

export async function listEmployees(tenantId: string, q: ListQuery) {
  const filter: any = { tenantId: oid(tenantId) };
  if (q.onlyIds) filter._id = { $in: q.onlyIds.filter(validId).map(oid) };
  if (q.status === 'current') filter.status = { $ne: 'exited' };
  else if (q.status) filter.status = q.status;
  if (q.department) filter.department = q.department;
  if (q.designation) filter.designation = q.designation;
  if (q.managerId && validId(q.managerId)) filter.reportingManagerId = oid(q.managerId);
  const search = str(q.search);
  if (search) {
    const re = new RegExp(escapeRe(search), 'i');
    filter.$or = [{ firstName: re }, { lastName: re }, { employeeCode: re }, { workEmail: re }, { phone: re }, { designation: re }];
  }
  const limit = Math.min(200, Math.max(1, Number(q.limit) || 50));
  const page = Math.max(1, Number(q.page) || 1);
  const [rows, total] = await Promise.all([
    Employee.find(filter).select('employeeCode firstName lastName workEmail phone department designation employmentType workMode workLocation status joiningDate reportingManagerId userId photoFileId')
      .sort({ firstName: 1 }).skip((page - 1) * limit).limit(limit).lean(),
    Employee.countDocuments(filter),
  ]);
  const mgrIds = [...new Set(rows.map((r: any) => String(r.reportingManagerId || '')).filter(Boolean))];
  const mgrs: any[] = mgrIds.length ? await Employee.find({ _id: { $in: mgrIds.map(oid) } }).select('firstName lastName').lean() : [];
  const mgrName = new Map(mgrs.map((m) => [String(m._id), fullName(m)]));
  return {
    total, page, limit,
    rows: rows.map((r: any) => ({ ...r, _id: String(r._id), name: fullName(r), managerName: mgrName.get(String(r.reportingManagerId || '')) || '', hasLogin: !!r.userId })),
  };
}

/** A short list of people for pickers (reporting manager, filters). */
export async function pickList(tenantId: string) {
  const rows: any[] = await Employee.find({ tenantId: oid(tenantId), status: { $ne: 'exited' } }).select('employeeCode firstName lastName designation').sort({ firstName: 1 }).limit(1000).lean();
  return rows.map((r) => ({ _id: String(r._id), name: fullName(r), code: r.employeeCode, designation: r.designation || '' }));
}

export async function getEmployee(tenantId: string, id: string): Promise<any> {
  if (!validId(id)) throw new EmployeeError('Employee not found', 404);
  const e: any = await Employee.findOne({ _id: oid(id), tenantId: oid(tenantId) }).lean();
  if (!e) throw new EmployeeError('Employee not found', 404);
  return e;
}

// ── Writing employees ────────────────────────────────────────────────────────

const PERSONAL = ['firstName', 'lastName', 'workEmail', 'personalEmail', 'phone', 'altPhone', 'gender', 'maritalStatus', 'bloodGroup', 'nationality'];
const JOB = ['department', 'designation', 'grade', 'employmentType', 'workMode', 'workLocation', 'status', 'exitReason'];
const DATES = ['dob', 'joiningDate', 'probationEndDate', 'confirmationDate', 'exitDate'];
/** What an employee may change about themselves in the portal. */
export const SELF_EDITABLE = ['personalEmail', 'phone', 'altPhone', 'bloodGroup', 'maritalStatus'];

const addr = (a: any) => (a && typeof a === 'object' ? Object.fromEntries(['line1', 'line2', 'city', 'state', 'pincode', 'country'].map((k) => [k, str(a[k]) || ''])) : undefined);
const toDate = (v: unknown) => {
  if (v === '' || v === null) return null;
  if (v === undefined) return undefined;
  const d = new Date(String(v));
  if (Number.isNaN(d.getTime())) throw new EmployeeError(`"${v}" is not a valid date.`);
  return d;
};

/** The fixed choices, matched without regard to capitalisation ("male" and "Male" are the same answer). */
const CHOICES: Record<string, string[]> = {
  gender: ['Male', 'Female', 'Other', 'Undisclosed'],
  maritalStatus: ['Single', 'Married', 'Other'],
  workMode: ['office', 'remote', 'hybrid'],
  status: ['active', 'probation', 'on_notice', 'on_leave', 'exited'],
};
const LABEL: Record<string, string> = { gender: 'gender', maritalStatus: 'marital status', workMode: 'work mode', status: 'status' };

function applyPatch(target: any, body: any, keys: string[]) {
  for (const k of keys) {
    if (body[k] === undefined) continue;
    const v = typeof body[k] === 'string' ? body[k].trim() : body[k];
    const choices = CHOICES[k];
    if (choices) {
      if (v === '' || v === null) { if (k === 'gender' || k === 'maritalStatus') target[k] = ''; continue; }
      const match = choices.find((c) => c.toLowerCase() === String(v).toLowerCase().replace(/[ -]+/g, '_'));
      if (!match) throw new EmployeeError(`"${v}" is not a valid ${LABEL[k]}. Choose one of: ${choices.join(', ')}.`);
      target[k] = match;
    } else target[k] = v;
  }
}

function applyLists(target: any, body: any) {
  if (body.currentAddress) target.currentAddress = addr(body.currentAddress);
  if (body.permanentAddress) target.permanentAddress = addr(body.permanentAddress);
  if (Array.isArray(body.emergencyContacts)) target.emergencyContacts = body.emergencyContacts.slice(0, 5).map((c: any) => ({ name: str(c?.name) || '', relation: str(c?.relation) || '', phone: str(c?.phone) || '' })).filter((c: any) => c.name || c.phone);
  if (Array.isArray(body.education)) target.education = body.education.slice(0, 15).map((x: any) => ({ degree: str(x?.degree) || '', institution: str(x?.institution) || '', year: str(x?.year) || '', grade: str(x?.grade) || '' })).filter((x: any) => x.degree || x.institution);
  if (Array.isArray(body.experience)) target.experience = body.experience.slice(0, 15).map((x: any) => ({ company: str(x?.company) || '', role: str(x?.role) || '', from: toDate(x?.from) || undefined, to: toDate(x?.to) || undefined, note: str(x?.note) || '' })).filter((x: any) => x.company || x.role);
  if (Array.isArray(body.skills)) target.skills = list(body.skills, 60) || [];
  if (Array.isArray(body.assets)) target.assets = body.assets.slice(0, 30).map((x: any) => ({ name: str(x?.name) || '', tag: str(x?.tag) || '', issuedOn: toDate(x?.issuedOn) || undefined, returnedOn: toDate(x?.returnedOn) || undefined, note: str(x?.note) || '' })).filter((x: any) => x.name);
}

const SENSITIVE_TEXT = ['bankAccountHolder', 'bankName', 'bankIfsc', 'bankBranch'];
const SENSITIVE_ENC = ['pan', 'aadhaar', 'uan', 'pfNumber', 'esiNumber', 'bankAccountNumber'];

/** Writes identity and bank fields. A value that arrives masked (all asterisks) is the old value coming back: left alone. */
function applySensitive(target: any, input: any, allowed: string[]) {
  if (!input || typeof input !== 'object') return;
  target.sensitive = target.sensitive || {};
  for (const k of SENSITIVE_TEXT) if (allowed.includes(k) && input[k] !== undefined) target.sensitive[k] = String(input[k]).trim();
  for (const k of SENSITIVE_ENC) {
    if (!allowed.includes(k) || input[k] === undefined) continue;
    const v = String(input[k]).trim();
    if (v && /^\*+/.test(v)) continue;
    target.sensitive[k] = encryptField(v);
  }
  if (target.markModified) target.markModified('sensitive');
}

async function assertManagerOk(tenantId: string, selfId: string | null, managerId: any) {
  if (!managerId) return;
  if (!validId(managerId)) throw new EmployeeError('Choose a valid reporting manager.');
  if (selfId && String(managerId) === String(selfId)) throw new EmployeeError('An employee cannot report to themselves.');
  const mgr: any = await Employee.findOne({ _id: oid(managerId), tenantId: oid(tenantId) }).select('reportingManagerId').lean();
  if (!mgr) throw new EmployeeError('That reporting manager was not found.');
  // Walk up the manager's chain: if it reaches this employee the reporting line would loop.
  let cur = mgr.reportingManagerId ? String(mgr.reportingManagerId) : null;
  for (let i = 0; cur && i < 12; i++) {
    if (selfId && cur === String(selfId)) throw new EmployeeError('That would make a reporting loop.');
    const up: any = await Employee.findOne({ _id: oid(cur), tenantId: oid(tenantId) }).select('reportingManagerId').lean();
    cur = up?.reportingManagerId ? String(up.reportingManagerId) : null;
  }
}

async function validateCustom(tenantId: string, custom: any): Promise<Record<string, string> | undefined> {
  if (!custom || typeof custom !== 'object') return undefined;
  const cfg = await getConfig(tenantId);
  const out: Record<string, string> = {};
  for (const f of cfg.customFields || []) if (custom[f.key] !== undefined) out[f.key] = String(custom[f.key]).trim().slice(0, 500);
  return out;
}

export async function createEmployee(tenantId: string, actorId: string, body: any, canSensitive: boolean) {
  const firstName = str(body?.firstName);
  if (!firstName) throw new EmployeeError('First name is required.');
  const workEmail = str(body?.workEmail)?.toLowerCase();
  if (workEmail) {
    if (!/^\S+@\S+\.\S+$/.test(workEmail)) throw new EmployeeError('That work email does not look right.');
    if (await Employee.exists({ tenantId: oid(tenantId), workEmail })) throw new EmployeeError('Another employee already has that work email.', 409);
  }
  await assertManagerOk(tenantId, null, body.reportingManagerId);
  const doc: any = { tenantId: oid(tenantId), employeeCode: await nextCode(tenantId), createdBy: oid(actorId), firstName, lastName: str(body.lastName) || '' };
  applyPatch(doc, body, PERSONAL.filter((k) => k !== 'firstName' && k !== 'lastName'));
  applyPatch(doc, body, JOB.filter((k) => k !== 'exitReason'));
  for (const k of DATES) { const d = toDate(body[k]); if (d !== undefined) doc[k] = d; }
  applyLists(doc, body);
  if (body.reportingManagerId) doc.reportingManagerId = oid(body.reportingManagerId);
  if (body.noticePeriodDays !== undefined) doc.noticePeriodDays = num(body.noticePeriodDays, 0, 365, 30);
  const custom = await validateCustom(tenantId, body.customFields); if (custom) doc.customFields = custom;
  if (canSensitive) {
    applySensitive(doc, body.sensitive, [...SENSITIVE_TEXT, ...SENSITIVE_ENC]);
    const ctc = Number(body.currentCtc);
    if (Number.isFinite(ctc) && ctc > 0) {
      doc.currentCtc = ctc;
      if (body.payFrequency === 'monthly' || body.payFrequency === 'annual') doc.payFrequency = body.payFrequency;
      doc.compensationHistory = [{ effectiveFrom: doc.joiningDate || new Date(), type: 'joining', ctc, previousCtc: 0, hikePercent: 0, note: 'Starting pay', createdBy: oid(actorId) }];
    }
  }
  doc.roleHistory = [{ effectiveFrom: doc.joiningDate || new Date(), type: 'joining', designation: doc.designation, department: doc.department, grade: doc.grade, reportingManagerId: doc.reportingManagerId, note: 'Joined', createdBy: oid(actorId) }];
  const created: any = await Employee.create(doc);
  return created.toObject();
}

export async function updateEmployee(tenantId: string, actorId: string, id: string, body: any, perms: { sensitive: boolean }, deactivateLoginOnExit = false) {
  const e: any = await Employee.findOne({ _id: oid(id), tenantId: oid(tenantId) });
  if (!e) throw new EmployeeError('Employee not found', 404);
  const patch: any = {};
  if (body.firstName !== undefined && !str(body.firstName)) throw new EmployeeError('First name is required.');
  applyPatch(patch, body, [...PERSONAL, ...JOB]);
  if (patch.workEmail) {
    patch.workEmail = String(patch.workEmail).toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(patch.workEmail)) throw new EmployeeError('That work email does not look right.');
    if (patch.workEmail !== e.workEmail && await Employee.exists({ tenantId: oid(tenantId), workEmail: patch.workEmail, _id: { $ne: e._id } })) throw new EmployeeError('Another employee already has that work email.', 409);
  }
  for (const k of DATES) { const d = toDate(body[k]); if (d !== undefined) patch[k] = d; }
  if (body.noticePeriodDays !== undefined) patch.noticePeriodDays = num(body.noticePeriodDays, 0, 365, 30);
  if (body.reportingManagerId !== undefined) {
    await assertManagerOk(tenantId, String(e._id), body.reportingManagerId || null);
    patch.reportingManagerId = body.reportingManagerId ? oid(body.reportingManagerId) : null;
  }
  applyLists(patch, body);
  const custom = await validateCustom(tenantId, body.customFields);
  if (custom) patch.customFields = { ...(e.customFields ? Object.fromEntries((e.customFields as any).entries()) : {}), ...custom };
  if (patch.status === 'exited' && !patch.exitDate && !e.exitDate) patch.exitDate = new Date();
  if (patch.status && patch.status !== 'exited' && e.status === 'exited') { patch.exitDate = null; patch.exitReason = ''; }
  e.set(patch);
  if (perms.sensitive) applySensitive(e, body.sensitive, [...SENSITIVE_TEXT, ...SENSITIVE_ENC]);
  await e.save();
  if (e.userId) {
    if (patch.status === 'exited' && deactivateLoginOnExit) await User.updateOne({ _id: e.userId, tenantId: oid(tenantId) }, { $set: { isActive: false } });
    if (patch.status && patch.status !== 'exited' && e.portalOnly) await User.updateOne({ _id: e.userId, tenantId: oid(tenantId) }, { $set: { isActive: true } });
  }
  return e.toObject();
}

/** What the employee changes about themselves in the portal. Bank and identity numbers may be given too (for reimbursements). */
export async function updateSelf(tenantId: string, employeeId: string, body: any) {
  const e: any = await Employee.findOne({ _id: oid(employeeId), tenantId: oid(tenantId) });
  if (!e) throw new EmployeeError('Employee not found', 404);
  const patch: any = {};
  applyPatch(patch, body, SELF_EDITABLE);
  applyLists(patch, { currentAddress: body.currentAddress, permanentAddress: body.permanentAddress, emergencyContacts: body.emergencyContacts, education: body.education, experience: body.experience, skills: body.skills });
  e.set(patch);
  applySensitive(e, body.sensitive, ['bankAccountHolder', 'bankName', 'bankIfsc', 'bankBranch', 'bankAccountNumber', 'pan', 'aadhaar', 'uan']);
  await e.save();
  return e.toObject();
}

export interface HikeInput { type?: string; effectiveFrom?: string; newCtc?: number; designation?: string; department?: string; grade?: string; reportingManagerId?: string | null; note?: string }

/** A hike, promotion or transfer: recorded in the history and applied as the current values. */
export async function recordChange(tenantId: string, actorId: string, id: string, input: HikeInput, canSensitive: boolean) {
  const e: any = await Employee.findOne({ _id: oid(id), tenantId: oid(tenantId) });
  if (!e) throw new EmployeeError('Employee not found', 404);
  const when = toDate(input.effectiveFrom) || new Date();
  const wantsPay = input.newCtc !== undefined && input.newCtc !== null && String(input.newCtc) !== '';
  if (wantsPay && !canSensitive) throw new EmployeeError('You are not allowed to change pay.', 403);
  const changesRole = !!(input.designation || input.department || input.grade || input.reportingManagerId !== undefined);
  if (!wantsPay && !changesRole) throw new EmployeeError('Enter a new pay or a role change.');
  const note = str(input.note) || '';
  if (wantsPay) {
    const ctc = Number(input.newCtc);
    if (!Number.isFinite(ctc) || ctc < 0) throw new EmployeeError('Enter a valid pay amount.');
    const prev = Number(e.currentCtc) || 0;
    const type = ['hike', 'promotion', 'revision', 'correction'].includes(String(input.type)) ? String(input.type) : 'hike';
    e.compensationHistory.push({ effectiveFrom: when, type, ctc, previousCtc: prev, hikePercent: prev > 0 ? Math.round(((ctc - prev) / prev) * 10000) / 100 : 0, note, createdBy: oid(actorId) });
    e.currentCtc = ctc;
  }
  if (changesRole) {
    if (input.reportingManagerId !== undefined) await assertManagerOk(tenantId, String(e._id), input.reportingManagerId || null);
    const type = ['promotion', 'transfer', 'role_change', 'correction'].includes(String(input.type)) ? String(input.type) : (input.designation ? 'promotion' : 'role_change');
    e.roleHistory.push({ effectiveFrom: when, type, designation: str(input.designation) || e.designation, department: str(input.department) || e.department, grade: str(input.grade) || e.grade, reportingManagerId: input.reportingManagerId === undefined ? e.reportingManagerId : (input.reportingManagerId ? oid(input.reportingManagerId) : null), note, createdBy: oid(actorId) });
    if (input.designation) e.designation = str(input.designation);
    if (input.department) e.department = str(input.department);
    if (input.grade) e.grade = str(input.grade);
    if (input.reportingManagerId !== undefined) e.reportingManagerId = input.reportingManagerId ? oid(input.reportingManagerId) : null;
  }
  await e.save();
  return e.toObject();
}

export async function addNote(tenantId: string, actor: { id: string; name: string }, id: string, text: string) {
  const t = str(text);
  if (!t) throw new EmployeeError('Write the note first.');
  const r = await Employee.updateOne({ _id: oid(id), tenantId: oid(tenantId) }, { $push: { hrNotes: { text: t.slice(0, 2000), by: oid(actor.id), byName: actor.name, at: new Date() } } });
  if (!r.matchedCount) throw new EmployeeError('Employee not found', 404);
}

export async function deleteEmployee(tenantId: string, id: string) {
  const e: any = await Employee.findOne({ _id: oid(id), tenantId: oid(tenantId) }).select('userId portalOnly').lean();
  if (!e) throw new EmployeeError('Employee not found', 404);
  const EmployeeDailyLog = (await import('../models/EmployeeDailyLog')).default;
  const EmployeeExpense = (await import('../models/EmployeeExpense')).default;
  const [logs, expenses] = await Promise.all([EmployeeDailyLog.exists({ employeeId: e._id }), EmployeeExpense.exists({ employeeId: e._id })]);
  if (logs || expenses) throw new EmployeeError('This employee has activity or expense records. Mark them as exited instead of deleting.', 409);
  await Employee.deleteOne({ _id: e._id });
  await Employee.updateMany({ tenantId: oid(tenantId), reportingManagerId: e._id }, { $set: { reportingManagerId: null } });
  await EmployeeFile.deleteMany({ employeeId: e._id });
  if (e.userId && e.portalOnly) await User.updateOne({ _id: e.userId, tenantId: oid(tenantId) }, { $set: { isActive: false } });
}

// ── Logins ───────────────────────────────────────────────────────────────────

const userService = new UserService();
const emailService = new EmailService();

/** The role that lets an employee into the portal and nothing else. Created the first time it is needed. */
async function portalRole(tenantId: string): Promise<string> {
  const existing: any = await Role.findOne({ tenantId: oid(tenantId), name: 'Employee (portal only)' }).lean();
  if (existing) return String(existing._id);
  const created: any = await Role.create({ name: 'Employee (portal only)', description: 'Own profile, daily activity and expenses. No other access.', permissions: ['use_employee_portal'], tenantId: oid(tenantId) });
  return String(created._id);
}

export async function createLogin(tenantId: string, id: string, input: { email?: string } = {}) {
  const e: any = await Employee.findOne({ _id: oid(id), tenantId: oid(tenantId) });
  if (!e) throw new EmployeeError('Employee not found', 404);
  if (e.userId) throw new EmployeeError('This employee already has a login.', 409);
  const email = (str(input.email) || e.workEmail || '').toLowerCase();
  if (!email || !/^\S+@\S+\.\S+$/.test(email)) throw new EmployeeError('Add a work email for this employee first. It becomes their login.');
  try { await assertSeats(tenantId, 'STAFF'); } catch (err: any) { if (err instanceof LimitError) throw new EmployeeError(err.message, 403); throw err; }
  const roleId = await portalRole(tenantId);
  const user: any = await userService.createUser(email, e.firstName, e.lastName || '-', crypto.randomBytes(18).toString('base64url'), 'STAFF', tenantId, undefined, roleId);
  const token = crypto.randomBytes(32).toString('hex');
  await userService.setResetToken(String(user._id), token, new Date(Date.now() + 7 * 24 * 60 * 60 * 1000));
  const setupLink = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/setup-password?token=${token}&email=${encodeURIComponent(email)}`;
  let emailSent = false; let emailError: string | undefined;
  try { await emailService.sendWelcomeEmail(email, e.firstName, setupLink); emailSent = true; } catch (err: any) { emailError = err?.message || 'The email could not be sent'; }
  e.userId = user._id; e.portalOnly = true; if (!e.workEmail) e.workEmail = email;
  await e.save();
  return { emailSent, emailError, setupLink: emailSent ? undefined : setupLink };
}

/** Link an existing login (a counsellor, an instructor ...) to this employee: one person, one login. */
export async function linkUser(tenantId: string, id: string, userId: string) {
  const e: any = await Employee.findOne({ _id: oid(id), tenantId: oid(tenantId) });
  if (!e) throw new EmployeeError('Employee not found', 404);
  if (e.userId) throw new EmployeeError('This employee already has a login.', 409);
  if (!validId(userId)) throw new EmployeeError('Choose a user.');
  const u: any = await User.findOne({ _id: oid(userId), tenantId: oid(tenantId) }).select('role email firstName lastName').lean();
  if (!u) throw new EmployeeError('That user was not found.', 404);
  if (['STUDENT', 'GUEST'].includes(u.role)) throw new EmployeeError('Students cannot be employees. Choose a staff, instructor or admin login.');
  if (await Employee.exists({ tenantId: oid(tenantId), userId: u._id })) throw new EmployeeError('That login already belongs to another employee.', 409);
  e.userId = u._id; e.portalOnly = false;
  if (!e.workEmail) e.workEmail = String(u.email).toLowerCase();
  await e.save();
}

export async function unlinkLogin(tenantId: string, id: string, deactivate: boolean) {
  const e: any = await Employee.findOne({ _id: oid(id), tenantId: oid(tenantId) });
  if (!e || !e.userId) throw new EmployeeError('This employee has no login.', 404);
  if (deactivate && e.portalOnly) await User.updateOne({ _id: e.userId, tenantId: oid(tenantId) }, { $set: { isActive: false } });
  e.userId = null; e.portalOnly = false;
  await e.save();
}

/** Staff logins that are not yet attached to an employee, for the "link existing login" picker. */
export async function unlinkedUsers(tenantId: string, search?: string) {
  const taken: any[] = await Employee.find({ tenantId: oid(tenantId), userId: { $ne: null } }).select('userId').lean();
  const filter: any = { tenantId: oid(tenantId), role: { $in: ['TENANT_ADMIN', 'INSTRUCTOR', 'STAFF', 'SUPER_ADMIN'] }, _id: { $nin: taken.map((t) => t.userId) }, isActive: true };
  const s = str(search);
  if (s) { const re = new RegExp(escapeRe(s), 'i'); filter.$or = [{ email: re }, { firstName: re }, { lastName: re }]; }
  const rows: any[] = await User.find(filter).select('firstName lastName email role').sort({ firstName: 1 }).limit(50).lean();
  return rows.map((u) => ({ _id: String(u._id), name: [u.firstName, u.lastName].filter(Boolean).join(' '), email: u.email, role: u.role }));
}

// ── Overview ─────────────────────────────────────────────────────────────────

export async function summary(tenantId: string) {
  const tid = oid(tenantId);
  const now = new Date();
  const soon = new Date(now.getTime() + 30 * 86_400_000);
  const ago30 = new Date(now.getTime() - 30 * 86_400_000);
  const [byStatus, byDept, byType, joiners, probation, exits, people] = await Promise.all([
    Employee.aggregate([{ $match: { tenantId: tid } }, { $group: { _id: '$status', n: { $sum: 1 } } }]),
    Employee.aggregate([{ $match: { tenantId: tid, status: { $ne: 'exited' } } }, { $group: { _id: { $ifNull: ['$department', 'Unassigned'] }, n: { $sum: 1 } } }, { $sort: { n: -1 } }]),
    Employee.aggregate([{ $match: { tenantId: tid, status: { $ne: 'exited' } } }, { $group: { _id: { $ifNull: ['$employmentType', 'Unspecified'] }, n: { $sum: 1 } } }]),
    Employee.find({ tenantId: tid, joiningDate: { $gte: ago30 } }).select('firstName lastName designation joiningDate').sort({ joiningDate: -1 }).limit(10).lean(),
    Employee.find({ tenantId: tid, status: { $ne: 'exited' }, probationEndDate: { $gte: now, $lte: soon } }).select('firstName lastName designation probationEndDate').sort({ probationEndDate: 1 }).limit(10).lean(),
    Employee.find({ tenantId: tid, status: 'exited', exitDate: { $gte: new Date(now.getTime() - 90 * 86_400_000) } }).select('firstName lastName exitDate exitReason').sort({ exitDate: -1 }).limit(10).lean(),
    Employee.find({ tenantId: tid, status: { $ne: 'exited' } }).select('firstName lastName dob joiningDate').lean(),
  ]);
  const monthDay = (d: Date) => ({ m: d.getUTCMonth(), day: d.getUTCDate() });
  const upcoming = (field: 'dob' | 'joiningDate') => {
    const out: { _id: string; name: string; date: string; inDays: number; years?: number }[] = [];
    for (const p of people as any[]) {
      if (!p[field]) continue;
      const { m, day } = monthDay(new Date(p[field]));
      let next = new Date(Date.UTC(now.getUTCFullYear(), m, day));
      if (next.getTime() < Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())) next = new Date(Date.UTC(now.getUTCFullYear() + 1, m, day));
      const inDays = Math.round((next.getTime() - Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())) / 86_400_000);
      if (inDays <= 14) out.push({ _id: String(p._id), name: fullName(p), date: next.toISOString().slice(0, 10), inDays, years: field === 'joiningDate' ? next.getUTCFullYear() - new Date(p[field]).getUTCFullYear() : undefined });
    }
    return out.sort((a, b) => a.inDays - b.inDays).slice(0, 10);
  };
  const rowName = (r: any) => ({ ...r, _id: String(r._id), name: fullName(r) });
  return {
    byStatus: Object.fromEntries(byStatus.map((x: any) => [x._id, x.n])),
    byDepartment: byDept.map((x: any) => ({ name: x._id, count: x.n })),
    byType: byType.map((x: any) => ({ name: x._id, count: x.n })),
    headcount: (byStatus as any[]).filter((x) => x._id !== 'exited').reduce((s, x) => s + x.n, 0),
    newJoiners: (joiners as any[]).map(rowName),
    probationEnding: (probation as any[]).map(rowName),
    recentExits: (exits as any[]).map(rowName),
    birthdays: upcoming('dob'),
    anniversaries: upcoming('joiningDate').filter((a) => (a.years || 0) > 0),
  };
}

// ── Files ────────────────────────────────────────────────────────────────────

export const MAX_FILE_BYTES = 5 * 1024 * 1024;
const FILE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf'];

export async function saveFile(tenantId: string, employeeId: string, uploaderId: string, kind: 'receipt' | 'document' | 'photo', file: { originalname: string; mimetype: string; buffer: Buffer; size: number }) {
  if (!file?.buffer?.length) throw new EmployeeError('Choose a file to upload.');
  if (file.size > MAX_FILE_BYTES) throw new EmployeeError('That file is larger than 5 MB.');
  if (!FILE_TYPES.includes(file.mimetype)) throw new EmployeeError('Upload a photo (JPG, PNG, WebP) or a PDF.');
  if (kind === 'photo' && !file.mimetype.startsWith('image/')) throw new EmployeeError('A profile photo must be an image.');
  const _id = new mongoose.Types.ObjectId();
  const doc: any = { _id, tenantId: oid(tenantId), employeeId: oid(employeeId), kind, name: String(file.originalname || 'file').slice(0, 150), mime: file.mimetype, size: file.size, uploadedBy: oid(uploaderId) };
  if (bunny.isBunnyStorageConfigured()) {
    doc.storage = 'bunny'; doc.key = `employees/${tenantId}/${employeeId}/${String(_id)}`;
    await bunny.uploadFile(doc.key, file.buffer, file.mimetype);
  } else {
    doc.storage = 'db'; doc.data = file.buffer;
  }
  await EmployeeFile.create(doc);
  return { fileId: String(_id), name: doc.name, mime: doc.mime, size: doc.size };
}

export async function fileMeta(tenantId: string, fileId: string): Promise<any> {
  if (!validId(fileId)) throw new EmployeeError('File not found', 404);
  const f: any = await EmployeeFile.findOne({ _id: oid(fileId), tenantId: oid(tenantId) }).select('-data').lean();
  if (!f) throw new EmployeeError('File not found', 404);
  return f;
}

/** The bytes of a stored file, from wherever it lives. */
export async function fileBytes(f: any): Promise<Buffer> {
  if (f.storage === 'bunny') {
    const { stream } = await bunny.getFileStream(f.key);
    const chunks: Buffer[] = [];
    for await (const c of stream) chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c));
    return Buffer.concat(chunks);
  }
  const full: any = await EmployeeFile.findById(f._id).select('+data').lean();
  const d = full?.data;
  if (!d) throw new EmployeeError('File not found', 404);
  return Buffer.isBuffer(d) ? d : Buffer.from((d as any).buffer || d);
}

export async function attachDocument(tenantId: string, employeeId: string, actorId: string, fileId: string, kind: string) {
  const f = await fileMeta(tenantId, fileId);
  if (String(f.employeeId) !== String(employeeId)) throw new EmployeeError('That file belongs to someone else.', 403);
  await Employee.updateOne({ _id: oid(employeeId), tenantId: oid(tenantId) }, { $push: { documents: { fileId: f._id, name: f.name, kind: str(kind) || 'Other', uploadedAt: new Date(), uploadedBy: oid(actorId) } } });
}

export async function removeDocument(tenantId: string, employeeId: string, fileId: string) {
  await Employee.updateOne({ _id: oid(employeeId), tenantId: oid(tenantId) }, { $pull: { documents: { fileId: oid(fileId) } } });
  const f: any = await EmployeeFile.findOne({ _id: oid(fileId), tenantId: oid(tenantId), employeeId: oid(employeeId), kind: 'document' }).lean();
  if (f) {
    if (f.storage === 'bunny') await bunny.deleteFile(f.key);
    await EmployeeFile.deleteOne({ _id: f._id });
  }
}

export async function setPhoto(tenantId: string, employeeId: string, fileId: string) {
  const f = await fileMeta(tenantId, fileId);
  if (String(f.employeeId) !== String(employeeId) || f.kind !== 'photo') throw new EmployeeError('That is not a photo of this employee.', 403);
  await Employee.updateOne({ _id: oid(employeeId), tenantId: oid(tenantId) }, { $set: { photoFileId: f._id } });
}
