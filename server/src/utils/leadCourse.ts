/**
 * Course interest hiding in form answers. Meta / Google Sheet / website forms store the course as a
 * raw custom field (`which_course_are_you_interested_in_?` = `java_full_stack_with_ai`), so the
 * Leads screen showed nothing for those leads (found 2026-11-19: 276 such leads). This reads it out
 * and makes it readable, so it can fill `courseInterest`.
 */

/** A custom-field key that holds the course they want (not "why do you want…"). */
export const isCourseKey = (k: string) => /cours|program(me)?_?interest|interested_in/i.test(k) && !/why|reason|fee|duration|mode|time|placement/i.test(k);

const UPPER = new Set(['ai', 'it', 'ui', 'ux', 'qa', 'sql', 'aws', 'dsa', 'ml', 'mern', 'mean', 'devops', 'sap', 'bi', 'api', 'net']);
const LOWER = new Set(['with', 'and', 'of', 'in', 'for', 'the', 'to', 'or']);

/** `java_full_stack_with_ai` → `Java Full Stack with AI`. Already-readable text is kept as typed. */
export function prettyCourse(raw: string): string {
  const s = String(raw || '').trim();
  if (!s) return '';
  const looksRaw = /_/.test(s) || s === s.toLowerCase();
  if (!looksRaw) return s.replace(/\s+/g, ' ').slice(0, 80);
  return s.replace(/[_]+/g, ' ').replace(/\s+/g, ' ').trim().split(' ').map((w, i) => {
    const l = w.toLowerCase();
    if (UPPER.has(l)) return l === 'devops' ? 'DevOps' : l === 'net' ? '.NET' : l.toUpperCase();
    if (i > 0 && LOWER.has(l)) return l;
    return l.charAt(0).toUpperCase() + l.slice(1);
  }).join(' ').slice(0, 80);
}

/** Course names found in a lead's custom fields (Map or plain object), readable and de-duplicated. */
export function coursesFromCustomFields(cf: any): string[] {
  if (!cf) return [];
  const entries: [string, any][] = cf instanceof Map ? Array.from(cf.entries()) : Object.entries(cf);
  const out: string[] = [];
  for (const [k, v] of entries) {
    if (!isCourseKey(k) || typeof v !== 'string' || !v.trim()) continue;
    for (const part of v.split(/[,;|]/)) {
      const c = prettyCourse(part);
      if (c && !/^(other|others|none|na|n\/a|not sure)$/i.test(c) && !out.some((x) => x.toLowerCase() === c.toLowerCase())) out.push(c);
    }
  }
  return out.slice(0, 5);
}

/**
 * Fill `courseInterest` from form answers on leads that have none. Safe to run again: it only
 * touches leads whose course list is empty. Returns how many leads were filled.
 */
export async function backfillCourseInterest(limit = 20000): Promise<number> {
  const Lead = (await import('../models/Lead')).default;
  const cursor = Lead.find({ 'courseInterest.0': { $exists: false }, customFields: { $exists: true } })
    .select('_id customFields').lean().limit(limit).cursor();
  let filled = 0;
  for await (const l of cursor as any) {
    const courses = coursesFromCustomFields(l.customFields);
    if (!courses.length) continue;
    const r = await Lead.updateOne({ _id: l._id, 'courseInterest.0': { $exists: false } }, { $set: { courseInterest: courses } });
    filled += r.modifiedCount;
  }
  return filled;
}
