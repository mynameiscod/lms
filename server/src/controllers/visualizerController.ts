import { Request, Response } from 'express';
import mongoose from 'mongoose';
import VisualizerItem, {
  VISUALIZER_ANIMATIONS, VISUALIZER_DIFFICULTIES, VISUALIZER_KINDS,
} from '../models/VisualizerItem';
import VisualizerAccess, { VISUALIZER_TARGETS } from '../models/VisualizerAccess';
import User from '../models/User';
import Batch from '../models/Batch';
import { visualize } from '../services/visualizer/visualizerService';
import { VISUALIZER_SEED } from '../services/visualizer/visualizerSeed';

const tId = (req: Request) => (req as any).tenantId as string;
const uId = (req: Request) => (req as any).user?.id as string;

/** Staff use the visualizer to teach, so they never need a grant. */
const STAFF_ROLES = new Set(['SUPER_ADMIN', 'TENANT_ADMIN', 'INSTRUCTOR', 'STAFF']);

const slugify = (s: string) => String(s || '').toLowerCase().trim()
  .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80);

/* ── Access ──────────────────────────────────────────────────────────────────────────────── */

export interface VisualizerAccessDecision {
  allowed: boolean;
  /** Why, in words an admin can act on when a student says "I can't see it". */
  via: 'staff' | 'user' | 'batch' | 'all_lms' | 'all_careerpilot' | 'none';
}

/**
 * Does this account see the Code Visualizer?
 *
 * No grant means no access — it is assigned like a course. A member can be an LMS student and
 * a CareerPilot member at once, so every grant type is checked rather than deciding which
 * product they "belong" to first.
 */
export async function resolveAccess(tenantId: string, userId: string): Promise<VisualizerAccessDecision> {
  const user: any = await User.findById(userId).select('role batchId passport.active passport.expiresAt passport.product').lean();
  if (!user) return { allowed: false, via: 'none' };
  if (STAFF_ROLES.has(user.role)) return { allowed: true, via: 'staff' };

  const grants = await VisualizerAccess.find({ tenantId }).select('targetType targetId').lean();
  if (!grants.length) return { allowed: false, via: 'none' };

  const now = Date.now();
  const passportActive = !!user.passport?.active
    && (!user.passport?.expiresAt || new Date(user.passport.expiresAt).getTime() > now);
  /* An LMS student is one in a batch, or a student account that never came through CareerPilot. */
  const isLms = user.role === 'STUDENT' && (!!user.batchId || !user.passport?.product);
  const id = String(userId);
  const batch = user.batchId ? String(user.batchId) : '';

  for (const g of grants) {
    if (g.targetType === 'user' && String(g.targetId) === id) return { allowed: true, via: 'user' };
  }
  for (const g of grants) {
    if (g.targetType === 'batch' && batch && String(g.targetId) === batch) return { allowed: true, via: 'batch' };
  }
  if (isLms && grants.some(g => g.targetType === 'all_lms')) return { allowed: true, via: 'all_lms' };
  if (passportActive && grants.some(g => g.targetType === 'all_careerpilot')) return { allowed: true, via: 'all_careerpilot' };
  return { allowed: false, via: 'none' };
}

const requireAccess = async (req: Request, res: Response): Promise<boolean> => {
  const d = await resolveAccess(tId(req), uId(req));
  if (!d.allowed) {
    res.status(403).json({ success: false, message: 'The Code Visualizer has not been assigned to you yet. Ask your mentor to enable it.' });
    return false;
  }
  return true;
};

/* ── Student / everyone with access ──────────────────────────────────────────────────────── */

export async function myAccess(req: Request, res: Response) {
  try {
    const d = await resolveAccess(tId(req), uId(req));
    res.json({ success: true, data: d });
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message });
  }
}

const LIST_FIELDS = 'kind title slug topic difficulty summary order timeComplexity spaceComplexity conceptWidget';

export async function listItems(req: Request, res: Response) {
  try {
    if (!(await requireAccess(req, res))) return;
    const q: any = { tenantId: tId(req), published: true };
    const { kind, topic, difficulty, search } = req.query as Record<string, string>;
    if (kind && (VISUALIZER_KINDS as readonly string[]).includes(kind)) q.kind = kind;
    if (topic) q.topic = topic;
    if (difficulty && (VISUALIZER_DIFFICULTIES as readonly string[]).includes(difficulty)) q.difficulty = difficulty;
    if (search) q.title = { $regex: String(search).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' };

    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(200, Math.max(1, Number(req.query.limit) || 60));
    const [items, total, topics] = await Promise.all([
      VisualizerItem.find(q).select(LIST_FIELDS).sort({ kind: -1, order: 1, title: 1 })
        .skip((page - 1) * limit).limit(limit).lean(),
      VisualizerItem.countDocuments(q),
      VisualizerItem.aggregate([
        { $match: { tenantId: tId(req), published: true } },
        { $group: { _id: '$topic', count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]),
    ]);
    res.json({
      success: true,
      data: { items, total, page, limit, topics: topics.map((t: any) => ({ topic: t._id, count: t.count })) },
    });
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message });
  }
}

export async function getItem(req: Request, res: Response) {
  try {
    if (!(await requireAccess(req, res))) return;
    const item = await VisualizerItem.findOne({ tenantId: tId(req), slug: String(req.params.slug).toLowerCase(), published: true }).lean();
    if (!item) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, data: item });
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message });
  }
}

export async function run(req: Request, res: Response) {
  try {
    if (!(await requireAccess(req, res))) return;
    const { code, language, stdin } = req.body || {};
    if (!code || !String(code).trim()) {
      return res.status(400).json({ success: false, message: 'Write some code first.' });
    }
    const result = await visualize({ code, language, stdin });
    res.json({ success: true, data: result });
  } catch (e: any) {
    console.error('[VISUALIZER] run failed:', e);
    res.status(500).json({ success: false, message: 'The visualizer could not run this program. Please try again.' });
  }
}

/* ── Admin: content ──────────────────────────────────────────────────────────────────────── */

const pickItem = (b: any) => {
  const out: any = {};
  const str = ['title', 'topic', 'summary', 'language', 'statement', 'constraints', 'starterCode',
    'solutionCode', 'stdin', 'timeComplexity', 'spaceComplexity', 'complexityNote', 'conceptWidget', 'body'];
  for (const k of str) if (b[k] !== undefined) out[k] = String(b[k] ?? '');
  if (b.kind && (VISUALIZER_KINDS as readonly string[]).includes(b.kind)) out.kind = b.kind;
  if (b.difficulty && (VISUALIZER_DIFFICULTIES as readonly string[]).includes(b.difficulty)) out.difficulty = b.difficulty;
  if (b.animation && (VISUALIZER_ANIMATIONS as readonly string[]).includes(b.animation)) out.animation = b.animation;
  if (b.order !== undefined) out.order = Number(b.order) || 0;
  if (b.published !== undefined) out.published = !!b.published;
  if (Array.isArray(b.examples)) {
    out.examples = b.examples.slice(0, 20).map((e: any) => ({
      input: String(e?.input ?? ''), output: String(e?.output ?? ''), explanation: String(e?.explanation ?? ''),
    }));
  }
  if (b.breakdown && typeof b.breakdown === 'object') {
    const list = (v: any) => (Array.isArray(v) ? v.map((x: any) => String(x)).filter((x: string) => x.trim()).slice(0, 30) : []);
    out.breakdown = {
      plainEnglish: String(b.breakdown.plainEnglish ?? ''),
      input: String(b.breakdown.input ?? ''),
      output: String(b.breakdown.output ?? ''),
      walkthrough: list(b.breakdown.walkthrough),
      steps: list(b.breakdown.steps),
      edgeCases: list(b.breakdown.edgeCases),
    };
  }
  return out;
};

export async function adminListItems(req: Request, res: Response) {
  try {
    const items = await VisualizerItem.find({ tenantId: tId(req) })
      .select(LIST_FIELDS + ' published updatedAt').sort({ kind: -1, order: 1, title: 1 }).lean();
    res.json({ success: true, data: items });
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message });
  }
}

export async function adminGetItem(req: Request, res: Response) {
  try {
    const item = await VisualizerItem.findOne({ _id: req.params.id, tenantId: tId(req) }).lean();
    if (!item) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, data: item });
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message });
  }
}

export async function adminCreateItem(req: Request, res: Response) {
  try {
    const data = pickItem(req.body || {});
    if (!data.title?.trim()) return res.status(400).json({ success: false, message: 'Title is required.' });
    const slug = slugify(req.body?.slug || data.title);
    if (!slug) return res.status(400).json({ success: false, message: 'Title must contain letters or numbers.' });
    if (await VisualizerItem.exists({ tenantId: tId(req), slug })) {
      return res.status(409).json({ success: false, message: `An item with the link "${slug}" already exists. Change the title.` });
    }
    const item = await VisualizerItem.create({ ...data, slug, tenantId: tId(req), createdBy: uId(req) });
    res.status(201).json({ success: true, data: item });
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message });
  }
}

export async function adminUpdateItem(req: Request, res: Response) {
  try {
    const data = pickItem(req.body || {});
    const item = await VisualizerItem.findOneAndUpdate({ _id: req.params.id, tenantId: tId(req) }, { $set: data }, { new: true });
    if (!item) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, data: item });
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message });
  }
}

export async function adminDeleteItem(req: Request, res: Response) {
  try {
    const r = await VisualizerItem.deleteOne({ _id: req.params.id, tenantId: tId(req) });
    if (!r.deletedCount) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message });
  }
}

/**
 * Install the starter library. Idempotent: an item whose slug already exists is left alone,
 * so re-running it never overwrites an admin's edits.
 */
export async function adminSeed(req: Request, res: Response) {
  try {
    let created = 0;
    for (const s of VISUALIZER_SEED) {
      const r = await VisualizerItem.updateOne(
        { tenantId: tId(req), slug: s.slug },
        { $setOnInsert: { ...s, tenantId: tId(req), language: 'java', published: true, createdBy: uId(req) } },
        { upsert: true },
      );
      if (r.upsertedCount) created++;
    }
    res.json({ success: true, data: { created, total: VISUALIZER_SEED.length } });
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message });
  }
}

/* ── Admin: access ───────────────────────────────────────────────────────────────────────── */

export async function adminListAccess(req: Request, res: Response) {
  try {
    const grants = await VisualizerAccess.find({ tenantId: tId(req) }).sort({ createdAt: -1 }).lean();
    res.json({ success: true, data: grants });
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message });
  }
}

/** POST { targetType, targetIds?: string[] } — one row per target; duplicates are skipped. */
export async function adminGrantAccess(req: Request, res: Response) {
  try {
    const { targetType, targetIds } = req.body || {};
    if (!(VISUALIZER_TARGETS as readonly string[]).includes(targetType)) {
      return res.status(400).json({ success: false, message: 'Unknown target type.' });
    }
    const rows: any[] = [];
    if (targetType === 'all_lms' || targetType === 'all_careerpilot') {
      rows.push({ targetName: targetType === 'all_lms' ? 'All LMS students' : 'All CareerPilot members' });
    } else {
      const ids = (Array.isArray(targetIds) ? targetIds : []).filter((x: any) => mongoose.isValidObjectId(x));
      if (!ids.length) return res.status(400).json({ success: false, message: 'Select at least one.' });
      if (targetType === 'batch') {
        const batches: any[] = await Batch.find({ _id: { $in: ids }, tenantId: tId(req) }).select('name').lean();
        for (const b of batches) rows.push({ targetId: b._id, targetName: b.name || 'Batch' });
      } else {
        const users: any[] = await User.find({ _id: { $in: ids }, tenantId: tId(req) }).select('firstName lastName email').lean();
        for (const u of users) {
          rows.push({ targetId: u._id, targetName: [u.firstName, u.lastName].filter(Boolean).join(' ') || u.email });
        }
      }
      if (!rows.length) return res.status(400).json({ success: false, message: 'None of the selected targets were found.' });
    }

    let created = 0;
    for (const r of rows) {
      const key = { tenantId: tId(req), targetType, targetId: r.targetId ?? null };
      const u = await VisualizerAccess.updateOne(key,
        { $setOnInsert: { ...key, targetName: r.targetName, assignedBy: uId(req) } }, { upsert: true });
      if (u.upsertedCount) created++;
    }
    res.json({ success: true, data: { created, requested: rows.length } });
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message });
  }
}

export async function adminRevokeAccess(req: Request, res: Response) {
  try {
    const r = await VisualizerAccess.deleteOne({ _id: req.params.id, tenantId: tId(req) });
    if (!r.deletedCount) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message });
  }
}

/** Search people to grant to — LMS students and CareerPilot members alike. */
export async function adminSearchUsers(req: Request, res: Response) {
  try {
    const q = String(req.query.q || '').trim();
    if (q.length < 2) return res.json({ success: true, data: [] });
    const rx = { $regex: q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' };
    const users = await User.find({
      tenantId: tId(req), role: 'STUDENT',
      $or: [{ firstName: rx }, { lastName: rx }, { email: rx }],
    }).select('firstName lastName email batchId passport.active').limit(20).lean();
    res.json({
      success: true,
      data: users.map((u: any) => ({
        id: u._id, name: [u.firstName, u.lastName].filter(Boolean).join(' '), email: u.email,
        careerPilot: !!u.passport?.active, lms: !!u.batchId,
      })),
    });
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message });
  }
}
