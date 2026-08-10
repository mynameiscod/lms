import { Request, Response } from 'express';
import TechNews from '../models/TechNews';
import User from '../models/User';
import PassportConfig from '../models/PassportConfig';
import { isEntitled } from '../services/passportEntitlementService';
import { draftFromUrl } from '../services/techNewsService';

const tenantOf = (req: Request): string => String((req as any).user?.tenantId || (req as any).tenantId || '');
const userIdOf = (req: Request): string => String((req as any).user?.id || '');

const publicItem = (n: any) => ({
  id: String(n._id),
  title: n.title, summary: n.summary, note: n.note || '',
  url: n.url, source: n.source, imageUrl: n.imageUrl || '',
  tags: n.tags || [], publishedAt: n.publishedAt,
});

// ─── Member ──────────────────────────────────────────────────────────────────

/** GET /passport/news — the published feed, newest first. */
export const feed = async (req: Request, res: Response) => {
  try {
    const tenantId = tenantOf(req);
    const [user, cfg] = await Promise.all([
      User.findById(userIdOf(req)).select('passport').lean() as any,
      PassportConfig.findOne({ tenantId }).lean(),
    ]);
    if (!isEntitled(cfg?.entitlements as any, user?.passport, 'tech_news')) {
      return res.json({ locked: true, priceInr: (cfg as any)?.priceInr ?? 1599 });
    }

    const limit = Math.min(60, Math.max(5, Number(req.query.limit) || 30));
    const items = await TechNews.find({ tenantId, status: 'published' })
      .sort({ publishedAt: -1 }).limit(limit).lean();

    res.json({ locked: false, items: items.map(publicItem) });
  } catch (e: any) {
    console.error('[technews] feed:', e);
    res.status(500).json({ message: e.message || 'Could not load the news' });
  }
};

// ─── Admin ───────────────────────────────────────────────────────────────────

/** GET /passport/news/admin — everything, drafts included. */
export const list = async (req: Request, res: Response) => {
  try {
    const tenantId = tenantOf(req);
    const items = await TechNews.find({ tenantId }).sort({ createdAt: -1 }).limit(200).lean();

    // How long since anything was published. A news module that quietly goes stale is
    // worse than not having one, so the admin screen says so rather than waiting for a
    // member to notice.
    const last = items.find((i: any) => i.status === 'published');
    const hoursSince = last?.publishedAt
      ? Math.round((Date.now() - new Date(last.publishedAt).getTime()) / 3600000)
      : null;

    res.json({
      items: items.map((n: any) => ({ ...publicItem(n), status: n.status, aiGenerated: n.aiGenerated })),
      hoursSincePublish: hoursSince,
    });
  } catch (e: any) {
    res.status(500).json({ message: e.message || 'Could not load the news list' });
  }
};

/**
 * POST /passport/news/admin/draft — paste a link, get a filled-in draft back.
 *
 * Returns the draft WITHOUT saving. The admin edits it and posts it to the create
 * endpoint, so a bad summary is discarded by closing the form rather than needing a
 * delete.
 */
export const draft = async (req: Request, res: Response) => {
  try {
    const url = String(req.body?.url || '').trim();
    if (!url) return res.status(400).json({ message: 'Paste a link first.' });

    const dupe = await TechNews.findOne({ tenantId: tenantOf(req), url }).select('_id title').lean() as any;
    if (dupe) return res.status(409).json({ message: `Already posted: "${dupe.title}"` });

    const d = await draftFromUrl(url, tenantOf(req));
    res.json({ draft: { ...d, url } });
  } catch (e: any) {
    // These messages are written for the admin to act on, so they are passed through.
    res.status(400).json({ message: e?.message || 'Could not read that link.' });
  }
};

const clean = (b: any) => ({
  title: String(b.title || '').trim().slice(0, 200),
  summary: String(b.summary || '').trim().slice(0, 700),
  note: String(b.note || '').trim().slice(0, 2000),
  url: String(b.url || '').trim().slice(0, 600),
  source: String(b.source || '').trim().slice(0, 80),
  imageUrl: String(b.imageUrl || '').trim().slice(0, 600),
  tags: Array.isArray(b.tags) ? b.tags.map((t: any) => String(t).toLowerCase().trim().slice(0, 24)).filter(Boolean).slice(0, 6) : [],
});

/** POST /passport/news/admin — create, as draft or published. */
export const create = async (req: Request, res: Response) => {
  try {
    const tenantId = tenantOf(req);
    const body = clean(req.body || {});
    if (!body.title || !body.url) return res.status(400).json({ message: 'A title and a link are required.' });

    const publish = req.body?.status === 'published';
    const item = await TechNews.create({
      ...body, tenantId,
      status: publish ? 'published' : 'draft',
      publishedAt: publish ? new Date() : null,
      aiGenerated: !!req.body?.aiGenerated,
      createdBy: userIdOf(req),
    });
    res.status(201).json({ item: { ...publicItem(item), status: item.status } });
  } catch (e: any) {
    if (e?.code === 11000) return res.status(409).json({ message: 'That link has already been posted.' });
    console.error('[technews] create:', e);
    res.status(500).json({ message: e.message || 'Could not save' });
  }
};

/** PUT /passport/news/admin/:id — edit, publish or unpublish. */
export const update = async (req: Request, res: Response) => {
  try {
    const tenantId = tenantOf(req);
    const item = await TechNews.findOne({ _id: req.params.id, tenantId });
    if (!item) return res.status(404).json({ message: 'Not found' });

    Object.assign(item, clean({ ...item.toObject(), ...req.body }));
    if (req.body?.status === 'published' || req.body?.status === 'draft') {
      // Stamp publishedAt the FIRST time it goes live; re-publishing an edit must not
      // jump it back to the top of the feed as though it were new.
      if (req.body.status === 'published' && !item.publishedAt) item.publishedAt = new Date();
      item.status = req.body.status;
    }
    await item.save();
    res.json({ item: { ...publicItem(item), status: item.status } });
  } catch (e: any) {
    res.status(500).json({ message: e.message || 'Could not save' });
  }
};

/** DELETE /passport/news/admin/:id */
export const remove = async (req: Request, res: Response) => {
  try {
    await TechNews.deleteOne({ _id: req.params.id, tenantId: tenantOf(req) });
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ message: e.message || 'Could not delete' });
  }
};
