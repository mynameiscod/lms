/**
 * Per-institute option lists (call outcomes, follow-up reasons). Seeds the defaults the first
 * time an institute reads a list, so every institute always has a working list.
 */
import mongoose from 'mongoose';
import LeadPicklist, { DEFAULT_PICKLISTS, PicklistName, PICKLISTS } from '../models/LeadPicklist';
import { CALL_OUTCOMES } from '../models/Lead';

const tid = (t: string) => new mongoose.Types.ObjectId(String(t));

export async function ensureDefaults(tenantId: string, list: PicklistName): Promise<void> {
  const existing = await LeadPicklist.find({ tenantId: tid(tenantId), list }).select('code').lean();
  const have = new Set(existing.map((e: any) => e.code));
  const missing = DEFAULT_PICKLISTS[list].filter(d => !have.has(d.code));
  // Only seed an empty list wholesale; for a list the institute already edited, only add
  // missing SYSTEM codes (never re-add something they deleted on purpose).
  const toAdd = existing.length === 0 ? missing : missing.filter(d => d.isSystem);
  if (!toAdd.length) return;
  const base = existing.length;
  await LeadPicklist.insertMany(
    toAdd.map((d, i) => ({ tenantId: tid(tenantId), list, order: base + i, ...d })),
    { ordered: false },
  ).catch((err: any) => { if (err?.code !== 11000 && !err?.writeErrors) throw err; });
}

export async function getList(tenantId: string, list: PicklistName, activeOnly = false) {
  await ensureDefaults(tenantId, list);
  return LeadPicklist.find({ tenantId: tid(tenantId), list, ...(activeOnly ? { isActive: true } : {}) }).sort({ order: 1 }).lean();
}

/** Every call outcome code valid for this institute: built-ins plus its own active ones. */
export async function validCallOutcomeCodes(tenantId: string): Promise<Set<string>> {
  const own = await LeadPicklist.find({ tenantId: tid(tenantId), list: 'call_outcome', isActive: true }).select('code').lean();
  return new Set<string>([...CALL_OUTCOMES, ...own.map((o: any) => o.code)]);
}

export const isPicklist = (v: unknown): v is PicklistName => typeof v === 'string' && (PICKLISTS as readonly string[]).includes(v);

/** "Fee discussion pending" → "fee_discussion_pending" */
export const codeFromLabel = (label: string) =>
  label.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 60) || 'option';
