import { EVENT_FIELD_TYPES, EventFieldType, IEventLibraryField } from '../models/EventCollection';
import { IEventApiField } from '../models/EventApi';

/**
 * Event APIs — the rules, with no database. What a field key, an API name and a registration
 * must look like, and what the website is told when something is wrong.
 */

export const FIELD_KEY = /^[a-z][a-z0-9_]{0,39}$/;
export const API_NAME = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const API_NAME_MIN = 3;
export const API_NAME_MAX = 60;
export const MAX_FIELDS = 60;
export const MAX_OPTIONS = 100;

/** The honeypot the website includes, hidden, in every form. Bots fill it; people do not. */
export const HONEYPOT_KEY = '_hp';
/** Campaign keys the website may send alongside the answers. Stored on the row, never as fields. */
export const UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'] as const;

const RESERVED_KEYS = new Set<string>([HONEYPOT_KEY, ...UTM_KEYS, 'id', '_id', 'tenant', 'tenantid', 'event', 'createdat', 'updatedat']);

const TEXT_MAX: Partial<Record<EventFieldType, number>> = { text: 500, textarea: 5000, email: 200, url: 500 };
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

export class EventApiError extends Error {
  constructor(message: string, public status = 400, public code = 'BAD_REQUEST', public errors?: Record<string, string>) {
    super(message);
  }
}

/** "Java Workshop – Nov 2026" → "java-workshop-nov-2026". */
export const slugify = (s: string): string => String(s || '')
  .toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '')
  .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, API_NAME_MAX).replace(/-+$/g, '');

/** "Full name" → "full_name". */
export const keyFromLabel = (s: string): string => {
  const k = String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 40);
  return /^[a-z]/.test(k) ? k : (k ? `f_${k}`.slice(0, 40) : '');
};

export function apiNameProblem(name: string): string | null {
  if (!name || name.length < API_NAME_MIN) return `API name must be at least ${API_NAME_MIN} characters.`;
  if (name.length > API_NAME_MAX) return `API name must be at most ${API_NAME_MAX} characters.`;
  if (!API_NAME.test(name)) return 'API name may use lowercase letters, numbers and single dashes (for example java-workshop-nov).';
  return null;
}

/** A library field as the admin sent it, checked and tidied. Throws with the field named. */
export function cleanLibraryField(raw: any): IEventLibraryField {
  const label = String(raw?.label ?? '').trim().slice(0, 120);
  const key = String(raw?.key ?? '').trim().toLowerCase() || keyFromLabel(label);
  if (!label) throw new EventApiError('Every field needs a label.');
  if (!FIELD_KEY.test(key)) throw new EventApiError(`"${label}": the field key must start with a letter and use lowercase letters, numbers or _ (for example full_name).`);
  if (RESERVED_KEYS.has(key)) throw new EventApiError(`"${key}" is reserved. Choose another field key.`);
  const type = String(raw?.type ?? 'text') as EventFieldType;
  if (!(EVENT_FIELD_TYPES as readonly string[]).includes(type)) throw new EventApiError(`"${label}": unknown field type "${type}".`);
  const options = Array.isArray(raw?.options)
    ? [...new Set(raw.options.map((o: any) => String(o).trim()).filter(Boolean))].slice(0, MAX_OPTIONS) as string[]
    : [];
  if ((type === 'select' || type === 'multiselect') && !options.length) throw new EventApiError(`"${label}": add at least one option.`);
  const out: IEventLibraryField = { key, label, type };
  if (type === 'select' || type === 'multiselect') out.options = options;
  const placeholder = String(raw?.placeholder ?? '').trim().slice(0, 160);
  const helpText = String(raw?.helpText ?? '').trim().slice(0, 300);
  if (placeholder) out.placeholder = placeholder;
  if (helpText) out.helpText = helpText;
  return out;
}

/** Indian mobile, however it was typed, as +91XXXXXXXXXX. Null when it is not one. */
export function normalizePhone(raw: unknown): string | null {
  let d = String(raw ?? '').replace(/\D/g, '');
  if (d.length === 12 && d.startsWith('91')) d = d.slice(2);
  else if (d.length === 11 && d.startsWith('0')) d = d.slice(1);
  return /^[6-9]\d{9}$/.test(d) ? `+91${d}` : null;
}

export type OpenState = 'open' | 'closed' | 'not_yet_open' | 'paused';

export function openState(ev: { status: string; opensAt?: Date | null; closesAt: Date }, now = new Date()): OpenState {
  if (ev.status === 'paused') return 'paused';
  if (ev.opensAt && now < new Date(ev.opensAt)) return 'not_yet_open';
  if (now >= new Date(ev.closesAt)) return 'closed';
  return 'open';
}

export interface ResolvedField extends IEventLibraryField { required: boolean }

/** The fields this event asks, in order, with the event's own label and required flag. */
export function resolveEventFields(library: IEventLibraryField[], picks: IEventApiField[]): ResolvedField[] {
  const byKey = new Map(library.map((f) => [f.key, f]));
  const out: ResolvedField[] = [];
  for (const p of picks) {
    if (p.hidden) continue;
    const f = byKey.get(p.key);
    if (!f) continue;
    out.push({ ...f, label: p.label?.trim() || f.label, required: !!p.required });
  }
  return out;
}

const isBlank = (v: unknown) => v === undefined || v === null || (typeof v === 'string' && !v.trim()) || (Array.isArray(v) && !v.length);

/**
 * Check a registration against the event's fields.
 *
 * Unknown keys are ignored rather than refused, so a website that still sends a field the admin
 * has since removed keeps working. Every problem is returned at once, keyed by field, so the
 * website can show each message under its own input.
 */
export function validateSubmission(fields: ResolvedField[], body: Record<string, any>): { data: Record<string, any>; errors: Record<string, string> } {
  const data: Record<string, any> = {};
  const errors: Record<string, string> = {};
  for (const f of fields) {
    const raw = body?.[f.key];
    if (isBlank(raw) && f.type !== 'checkbox') {
      if (f.required) errors[f.key] = `${f.label} is required.`;
      continue;
    }
    switch (f.type) {
      case 'text': case 'textarea': {
        const s = String(raw).trim();
        if (s.length > (TEXT_MAX[f.type] || 500)) errors[f.key] = `${f.label} is too long (at most ${TEXT_MAX[f.type]} characters).`;
        else data[f.key] = s;
        break;
      }
      case 'email': {
        const s = String(raw).trim().toLowerCase();
        if (!EMAIL.test(s) || s.length > 200) errors[f.key] = `Enter a valid email address for ${f.label}.`;
        else data[f.key] = s;
        break;
      }
      case 'phone': {
        const p = normalizePhone(raw);
        if (!p) errors[f.key] = `Enter a valid 10-digit mobile number for ${f.label}.`;
        else data[f.key] = p;
        break;
      }
      case 'number': {
        const n = typeof raw === 'number' ? raw : Number(String(raw).trim());
        if (!Number.isFinite(n)) errors[f.key] = `${f.label} must be a number.`;
        else data[f.key] = n;
        break;
      }
      case 'date': {
        const s = String(raw).trim().slice(0, 10);
        const d = new Date(`${s}T00:00:00Z`);
        if (!DATE.test(s) || Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== s) errors[f.key] = `${f.label} must be a date like 2026-11-30.`;
        else data[f.key] = s;
        break;
      }
      case 'select': {
        const s = String(raw).trim();
        if (!(f.options || []).includes(s)) errors[f.key] = `Choose one of the listed options for ${f.label}.`;
        else data[f.key] = s;
        break;
      }
      case 'multiselect': {
        const list = (Array.isArray(raw) ? raw : String(raw).split(',')).map((x) => String(x).trim()).filter(Boolean);
        const bad = list.filter((x) => !(f.options || []).includes(x));
        if (bad.length) errors[f.key] = `${f.label}: "${bad[0]}" is not one of the options.`;
        else if (f.required && !list.length) errors[f.key] = `${f.label} is required.`;
        else data[f.key] = [...new Set(list)];
        break;
      }
      case 'checkbox': {
        const v = raw === true || ['true', 'yes', '1', 'on'].includes(String(raw ?? '').trim().toLowerCase());
        if (f.required && !v) errors[f.key] = `${f.label} must be ticked.`;
        else data[f.key] = v;
        break;
      }
      case 'url': {
        const s = String(raw).trim();
        let ok = false;
        try { ok = ['http:', 'https:'].includes(new URL(s).protocol); } catch { ok = false; }
        if (!ok || s.length > 500) errors[f.key] = `Enter a full web address for ${f.label} (starting https://).`;
        else data[f.key] = s;
        break;
      }
      default: break;
    }
  }
  return { data, errors };
}

const NAME_KEYS = ['name', 'full_name', 'fullname', 'student_name', 'your_name', 'candidate_name'];

/** Name, mobile and email lifted out of the answers, so the admin can search and de-duplicate. */
export function contactOf(fields: ResolvedField[], data: Record<string, any>): { name?: string; phone?: string; email?: string } {
  const out: { name?: string; phone?: string; email?: string } = {};
  const phone = fields.find((f) => f.type === 'phone' && data[f.key]);
  const email = fields.find((f) => f.type === 'email' && data[f.key]);
  const name = fields.find((f) => f.type === 'text' && data[f.key] && NAME_KEYS.includes(f.key))
    || fields.find((f) => f.type === 'text' && data[f.key] && /name/i.test(f.label) && !/college|company|school|institute/i.test(f.label));
  if (phone) out.phone = data[phone.key];
  if (email) out.email = data[email.key];
  if (name) out.name = String(data[name.key]).slice(0, 120);
  return out;
}

/** A CSV cell, quoted, and defused so a spreadsheet never runs a registrant's text as a formula. */
export function csvCell(v: unknown): string {
  let s = v === undefined || v === null ? '' : Array.isArray(v) ? v.join('; ') : typeof v === 'boolean' ? (v ? 'Yes' : 'No') : String(v);
  if (typeof v !== 'number' && /^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
}
