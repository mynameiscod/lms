import { Request, Response } from 'express';
import mongoose from 'mongoose';
import CodingProblem from '../models/CodingProblem';
import Tenant from '../models/Tenant';
import { getGrant, globalPracticeClause, saveGrant, clearGrant, validateGrant } from '../services/contentGrantService';

/**
 * Tenant Management → Content access. The SUPER ADMIN decides which of CodeBegun's shared content
 * each institute may use. Today: the shared practice library (Problem Bank, scope 'global').
 *
 * Super admin only — by role, not by a permission a tenant admin could be given.
 */

export const superAdminOnly = (req: any, res: Response, next: any) =>
  req.user?.role === 'SUPER_ADMIN' ? next() : res.status(403).json({ success: false, message: 'Only the platform super admin manages shared content.' });

const sharedPublished = { scope: 'global', status: 'published' };

async function describe(tenantId: string) {
  const [grant, totals, topics, tags, clause] = await Promise.all([
    getGrant(tenantId, 'practice_problems'),
    CodingProblem.aggregate([{ $match: sharedPublished }, { $group: { _id: '$difficulty', n: { $sum: 1 } } }]),
    CodingProblem.aggregate([{ $match: sharedPublished }, { $unwind: '$topics' }, { $group: { _id: '$topics', n: { $sum: 1 } } }, { $sort: { n: -1, _id: 1 } }, { $limit: 300 }]),
    // Tags are free text, so "DSA" and "dsa" are one tag here.
    CodingProblem.aggregate([{ $match: sharedPublished }, { $unwind: '$tags' }, { $group: { _id: { $toLower: '$tags' }, name: { $first: '$tags' }, n: { $sum: 1 } } }, { $sort: { n: -1, _id: 1 } }, { $limit: 200 }]),
    globalPracticeClause(tenantId),
  ]);
  const byDifficulty: Record<string, number> = { easy: 0, medium: 0, hard: 0 };
  for (const r of totals as any[]) byDifficulty[r._id] = r.n;
  const total = (totals as any[]).reduce((s, r) => s + r.n, 0);
  const granted = clause ? await CodingProblem.countDocuments({ ...clause, status: 'published' }) : 0;
  const g: any = grant;
  return {
    practice: {
      mode: g?.mode || 'all',
      isDefault: !g,
      difficulties: g?.difficulties || [],
      topics: g?.topics || [],
      tags: g?.tags || [],
      problemIds: (g?.problemIds || []).map(String),
      updatedAt: g?.updatedAt || null,
      updatedByName: g?.updatedByName || null,
      grantedCount: granted,
    },
    sharedLibrary: {
      total,
      byDifficulty,
      topics: (topics as any[]).filter((t) => t._id).map((t) => ({ name: String(t._id), count: t.n })),
      tags: (tags as any[]).filter((t) => t._id).map((t) => ({ name: String(t.name), count: t.n })),
    },
  };
}

/** GET /tenants/:tenantId/content-access */
export async function getContentAccess(req: Request, res: Response) {
  try {
    const { tenantId } = req.params;
    const tenant = mongoose.isValidObjectId(tenantId) ? await Tenant.findById(tenantId).select('name').lean() as any : null;
    if (!tenant) return res.status(404).json({ success: false, message: 'Institute not found' });
    res.json({ success: true, data: { tenant: { id: tenantId, name: tenant.name }, ...(await describe(tenantId)) } });
  } catch (e: any) {
    res.status(500).json({ success: false, message: e?.message || 'Could not read content access' });
  }
}

/** PUT /tenants/:tenantId/content-access/practice  { mode, difficulties?, topics?, tags?, problemIds? } */
export async function savePracticeAccess(req: any, res: Response) {
  try {
    const { tenantId } = req.params;
    if (!mongoose.isValidObjectId(tenantId) || !(await Tenant.exists({ _id: tenantId }))) {
      return res.status(404).json({ success: false, message: 'Institute not found' });
    }
    const checked = validateGrant(req.body);
    if (!checked.ok) return res.status(400).json({ success: false, message: (checked as any).error });
    const value = (checked as any).value;
    const by = { id: String(req.user?.id || ''), name: [req.user?.firstName, req.user?.lastName].filter(Boolean).join(' ') || req.user?.email || 'super admin' };
    // "All" is the default: store nothing, so the institute follows the shared library as it grows.
    if (value.mode === 'all') await clearGrant(tenantId, 'practice_problems');
    else await saveGrant(tenantId, 'practice_problems', value, by);
    res.json({ success: true, data: await describe(tenantId), message: 'Saved. The institute sees this from its next page load.' });
  } catch (e: any) {
    res.status(500).json({ success: false, message: e?.message || 'Could not save content access' });
  }
}

/** GET /tenants/content-access/problems?q=&difficulty=&topic=&ids=&page= — the shared library, for picking. */
export async function listSharedProblems(req: Request, res: Response) {
  try {
    const q = String(req.query.q || '').trim();
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = 50;
    const and: any[] = [sharedPublished];
    if (q) {
      const re = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      and.push({ $or: [{ title: re }, { slug: re }, { topics: re }, ...(/^\d+$/.test(q) ? [{ number: Number(q) }] : [])] });
    }
    if (req.query.difficulty) and.push({ difficulty: { $in: String(req.query.difficulty).split(',') } });
    if (req.query.topic) and.push({ topics: { $in: String(req.query.topic).split(',') } });
    if (req.query.ids) {
      const ids = String(req.query.ids).split(',').filter((id) => mongoose.isValidObjectId(id));
      and.push({ _id: { $in: ids } });
    }
    const filter = { $and: and };
    const [rows, total] = await Promise.all([
      CodingProblem.find(filter).sort({ number: 1, _id: 1 }).skip((page - 1) * limit).limit(limit)
        .select('number title difficulty topics').lean(),
      CodingProblem.countDocuments(filter),
    ]);
    res.json({ success: true, data: { rows: (rows as any[]).map((r) => ({ id: String(r._id), number: r.number, title: r.title, difficulty: r.difficulty, topics: r.topics || [] })), total, page, pages: Math.max(1, Math.ceil(total / limit)) } });
  } catch (e: any) {
    res.status(500).json({ success: false, message: e?.message || 'Could not list shared problems' });
  }
}
