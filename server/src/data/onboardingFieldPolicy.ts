import { IOnboardingField, ONBOARDING_FIELD_TYPES, OnboardingFieldType } from '../models/PassportConfig';

/**
 * The rules for CareerPilot's sign-up form, kept pure so they can be tested without a database.
 *
 * Three jobs:
 *   normaliseOnboardingFields — what an admin may save (the config screen's PUT)
 *   registrationWindowState   — whether new sign-ups are open right now
 *   validateSignupAnswers     — what a member may submit (the public sign-up)
 */

/** Name, mobile and email: the account itself. Always present, always required, never editable. */
export const LOCKED_FIELD_KEYS = ['name', 'mobile', 'email'] as const;

const MAX_LABEL = 80;
const MAX_PLACEHOLDER = 120;
const MAX_OPTIONS = 200;
const MAX_OPTION = 120;
const MAX_ANSWER_TEXT = 200;
const MAX_ANSWER_TEXTAREA = 1000;

/** "Why do you want to join?" → "why_do_you_want_to_join". Stable, URL- and Mongo-safe. */
export function slugKey(label: string): string {
  return String(label || '').toLowerCase().trim()
    .replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 40) || 'field';
}

/**
 * Clean an admin's field list before it is stored, or explain why it cannot be.
 *
 * The screen replaces the whole array on save, so this is the only place that can stop a bad
 * list: before it existed, a PUT without the locked fields deleted them, duplicate keys were
 * accepted, and a type outside the enum was written straight past Mongoose.
 *
 * `previous` is what is stored now. Locked fields are restored from it (or from the shipped
 * defaults) whatever the request says, because the account cannot be created without them.
 */
export function normaliseOnboardingFields(
  incoming: any[],
  previous: IOnboardingField[],
): { fields?: IOnboardingField[]; errors: string[] } {
  const errors: string[] = [];
  if (!Array.isArray(incoming)) return { errors: ['onboardingFields must be a list.'] };

  const prevByKey = new Map(previous.map(f => [f.key, f]));
  const seen = new Set<string>();
  const out: IOnboardingField[] = [];

  incoming.forEach((raw, i) => {
    const label = String(raw?.label ?? '').trim().slice(0, MAX_LABEL);
    if (!label) { errors.push(`Field ${i + 1} needs a name.`); return; }

    const prev = raw?.key ? prevByKey.get(String(raw.key)) : undefined;
    // A shipped field keeps its key forever — members' answers are stored under it. A new custom
    // field gets one from its label, made unique if two labels slug the same way.
    let key = prev ? prev.key : slugKey(raw?.key || label);
    if (!prev) {
      // Never take a key that belongs to a stored field or to another row in this request.
      const taken = new Set<string>([...prevByKey.keys(), ...incoming.filter((_, j) => j !== i).map(r => String(r?.key || ''))]);
      let n = 2; const base = key;
      while (seen.has(key) || taken.has(key)) key = `${base}_${n++}`;
    }
    if (seen.has(key)) { errors.push(`"${label}" appears twice.`); return; }
    seen.add(key);

    const locked = (LOCKED_FIELD_KEYS as readonly string[]).includes(key);
    const type = String(raw?.type || 'text') as OnboardingFieldType;
    if (!ONBOARDING_FIELD_TYPES.includes(type)) { errors.push(`"${label}" has an unknown type "${type}".`); return; }

    const options = type === 'select'
      ? [...new Set((Array.isArray(raw?.options) ? raw.options : [])
          .map((o: any) => String(o).trim().slice(0, MAX_OPTION)).filter(Boolean))].slice(0, MAX_OPTIONS) as string[]
      : [];
    if (type === 'select' && !options.length && raw?.enabled !== false) {
      errors.push(`"${label}" is a dropdown with no choices. Add at least one, or switch it off.`);
      return;
    }

    out.push({
      key,
      label: locked && prev ? prev.label : label,
      type: locked && prev ? prev.type : type,
      required: locked ? true : !!raw?.required,
      locked,
      options,
      order: out.length + 1,
      placeholder: String(raw?.placeholder ?? '').trim().slice(0, MAX_PLACEHOLDER),
      enabled: locked ? true : raw?.enabled !== false,
      custom: prev ? !!prev.custom : !locked,
    });
  });

  // Put back any locked field the request left out, at the top.
  for (const k of [...LOCKED_FIELD_KEYS].reverse()) {
    if (seen.has(k)) continue;
    const prev = prevByKey.get(k);
    if (prev) out.unshift({ ...prev, required: true, locked: true, enabled: true });
  }
  out.forEach((f, i) => { f.order = i + 1; });

  return errors.length ? { errors } : { fields: out, errors };
}

/** Where "now" sits against the registration window. Dates are compared by whole days, inclusive. */
export function registrationWindowState(
  opensAt: Date | string | null | undefined,
  closesAt: Date | string | null | undefined,
  now: Date = new Date(),
): { open: boolean; reason: 'NOT_YET_OPEN' | 'CLOSED' | null; opensAt: Date | null; closesAt: Date | null } {
  const o = opensAt ? new Date(opensAt) : null;
  const c = closesAt ? new Date(closesAt) : null;
  const opens = o && !isNaN(o.getTime()) ? o : null;
  // "Closes 30/09" means sign-ups work all of the 30th, so the cut-off is the end of that day.
  const closesEnd = c && !isNaN(c.getTime()) ? new Date(c.getTime() + 24 * 3600 * 1000 - 1) : null;
  if (opens && now < opens) return { open: false, reason: 'NOT_YET_OPEN', opensAt: opens, closesAt: closesEnd };
  if (closesEnd && now > closesEnd) return { open: false, reason: 'CLOSED', opensAt: opens, closesAt: closesEnd };
  return { open: true, reason: null, opensAt: opens, closesAt: closesEnd };
}

/**
 * Check a member's answers against the form and return the clean values, keyed by field.
 *
 * Only fields that are switched on are read; anything else in the submission is ignored rather
 * than stored. Locked fields (name/mobile/email) are validated by the sign-up itself.
 */
export function validateSignupAnswers(
  fields: IOnboardingField[],
  answers: Record<string, any>,
): { values: Record<string, string>; errors: string[] } {
  const values: Record<string, string> = {};
  const errors: string[] = [];

  for (const f of fields) {
    if (f.locked || f.enabled === false) continue;
    const raw = answers?.[f.key];
    const v = raw === undefined || raw === null ? '' : String(raw).trim();
    if (!v) {
      if (f.required) errors.push(`${f.label} is required.`);
      continue;
    }
    switch (f.type) {
      case 'select':
        if ((f.options || []).length && !(f.options || []).includes(v)) { errors.push(`Choose ${f.label} from the list.`); continue; }
        break;
      case 'number':
        if (!Number.isFinite(Number(v))) { errors.push(`${f.label} must be a number.`); continue; }
        break;
      case 'date':
        if (!/^\d{4}-\d{2}-\d{2}$/.test(v) || isNaN(new Date(v).getTime())) { errors.push(`${f.label} must be a date.`); continue; }
        break;
    }
    values[f.key] = v.slice(0, f.type === 'textarea' ? MAX_ANSWER_TEXTAREA : MAX_ANSWER_TEXT);
  }
  return { values, errors };
}
