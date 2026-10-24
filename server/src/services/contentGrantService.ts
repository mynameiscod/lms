import mongoose from 'mongoose';
import TenantContentGrant, { ContentGrantMode, ContentGrantType } from '../models/TenantContentGrant';

/**
 * Reading and writing the super admin's content grants (see models/TenantContentGrant).
 *
 * `globalPracticeClause(tenantId)` is what every reader of shared practice problems adds: the
 * condition a GLOBAL problem must meet to be visible in that tenant, or null for "none". A grant
 * is read on every library request, so it is cached briefly and dropped the moment it changes.
 */

export interface ContentGrantInput {
  mode: ContentGrantMode;
  difficulties?: string[];
  topics?: string[];
  problemIds?: string[];
}

const TTL_MS = 60_000;
const cache = new Map<string, { at: number; grant: any | null }>();
const key = (tenantId: string, type: ContentGrantType) => `${type}:${tenantId}`;
const invalidators: (() => void)[] = [];

/** Something cached per tenant that depends on grants (library totals, facets) registers here. */
export function onGrantChange(fn: () => void) { invalidators.push(fn); }

export async function getGrant(tenantId: string, type: ContentGrantType = 'practice_problems') {
  const k = key(tenantId, type);
  const hit = cache.get(k);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.grant;
  const grant = tenantId ? await TenantContentGrant.findOne({ tenantId, contentType: type }).lean() : null;
  cache.set(k, { at: Date.now(), grant });
  return grant;
}

/**
 * The condition a GLOBAL problem must meet to be visible in this tenant, or null when the tenant
 * is granted none. No grant at all means the whole shared library (the behaviour before grants).
 */
export async function globalPracticeClause(tenantId: string): Promise<Record<string, any> | null> {
  const g: any = await getGrant(tenantId, 'practice_problems');
  if (!g || g.mode === 'all') return { scope: 'global' };
  if (g.mode === 'none') return null;
  if (g.mode === 'pick') return { scope: 'global', _id: { $in: (g.problemIds || []) } };
  // filter
  const clause: Record<string, any> = { scope: 'global' };
  if (g.difficulties?.length) clause.difficulty = { $in: g.difficulties };
  if (g.topics?.length) clause.topics = { $in: g.topics };
  return clause;
}

export function validateGrant(input: any): { ok: true; value: ContentGrantInput } | { ok: false; error: string } {
  const mode = String(input?.mode || '');
  if (!['all', 'none', 'filter', 'pick'].includes(mode)) return { ok: false, error: 'Choose All, None, a filter, or specific problems.' };
  const list = (v: any) => (Array.isArray(v) ? v.map((x) => String(x).trim()).filter(Boolean) : []);
  const difficulties = list(input.difficulties).filter((d) => ['easy', 'medium', 'hard'].includes(d));
  const topics = list(input.topics).slice(0, 300);
  const problemIds = list(input.problemIds).filter((id) => mongoose.isValidObjectId(id)).slice(0, 5000);
  if (mode === 'filter' && !difficulties.length && !topics.length) return { ok: false, error: 'Pick at least one difficulty or topic for the filter.' };
  if (mode === 'pick' && !problemIds.length) return { ok: false, error: 'Pick at least one problem, or choose None.' };
  return { ok: true, value: { mode: mode as ContentGrantMode, difficulties, topics, problemIds } };
}

export async function saveGrant(
  tenantId: string, type: ContentGrantType, value: ContentGrantInput, by: { id?: string; name?: string },
) {
  const doc = await TenantContentGrant.findOneAndUpdate(
    { tenantId, contentType: type },
    { $set: {
      mode: value.mode,
      difficulties: value.mode === 'filter' ? value.difficulties || [] : [],
      topics: value.mode === 'filter' ? value.topics || [] : [],
      problemIds: value.mode === 'pick' ? (value.problemIds || []).map((id) => new mongoose.Types.ObjectId(id)) : [],
      updatedBy: by.id, updatedByName: by.name,
    } },
    { upsert: true, new: true },
  ).lean();
  cache.delete(key(tenantId, type));
  invalidators.forEach((fn) => { try { fn(); } catch { /* a cache that cannot clear will expire on its own */ } });
  return doc;
}

/** Back to "everything" (the default): the grant record is removed. */
export async function clearGrant(tenantId: string, type: ContentGrantType) {
  await TenantContentGrant.deleteOne({ tenantId, contentType: type });
  cache.delete(key(tenantId, type));
  invalidators.forEach((fn) => { try { fn(); } catch { /* expires on its own */ } });
}

export const __clearGrantCache = () => cache.clear();
