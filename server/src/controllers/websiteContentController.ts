import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../types';
import Tenant from '../models/Tenant';
import User from '../models/User';
import { WebsiteContentError, saveImage, openImage } from '../services/websiteMediaService';
import * as svc from '../services/websitePlacementService';
import * as sec from '../services/websiteSectionsService';

/**
 * Website Content screen (2026-11-27). Admin routes live under /website-content (permission
 * manage_website_content); the website reads /public/:tenantSlug/placements and the images from
 * /public/:tenantSlug/media/:id.webp.
 */

const fail = (res: Response, err: any, fallback: string) => {
  if (err instanceof WebsiteContentError) return res.status(err.status).json({ success: false, message: err.message });
  if (err?.code === 11000) return res.status(409).json({ success: false, message: 'That already exists.' });
  if (err?.name === 'ValidationError') return res.status(400).json({ success: false, message: Object.values(err.errors || {}).map((e: any) => e.message)[0] || fallback });
  console.error('[website-content]', err);
  return res.status(500).json({ success: false, message: fallback });
};

async function who(req: AuthenticatedRequest): Promise<svc.Actor> {
  const id = req.user?.id;
  if (!id) return { id: undefined, name: '' };
  const u: any = await User.findById(id).select('firstName lastName').lean().catch(() => null);
  return { id, name: u ? `${u.firstName || ''} ${u.lastName || ''}`.trim() : '' };
}

/** Absolute image urls: the website is on another domain, so a relative path would not load. */
function mediaUrlFor(req: Request, slug: string): svc.MediaUrl {
  const base = `${req.protocol}://${req.get('host')}/api/v1/public/${encodeURIComponent(slug)}/media`;
  return (id) => (id ? `${base}/${String(id)}.webp` : null);
}

async function slugOf(tenantId: string) {
  const t: any = await Tenant.findById(tenantId).select('slug').lean();
  return t?.slug || '';
}

// GET /website-content/placements
export const getPlacements = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const slug = await slugOf(req.tenantId!);
    const data = await svc.adminPlacements(req.tenantId!, mediaUrlFor(req, slug));
    const apiUrl = `${req.protocol}://${req.get('host')}/api/v1/public/${encodeURIComponent(slug)}/placements`;
    res.json({ success: true, data: { ...data, apiUrl } });
  } catch (err) { fail(res, err, 'Could not load placements'); }
};

// POST /website-content/media  (multipart: file, kind=photo|logo)
export const uploadMedia = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const file = (req as any).file;
    if (!file) throw new WebsiteContentError('Choose an image to upload.');
    const m = await saveImage(req.tenantId!, String(req.body?.kind || '') as any, file.buffer, req.user?.id) as any;
    const slug = await slugOf(req.tenantId!);
    res.status(201).json({ success: true, data: { id: String(m._id), url: mediaUrlFor(req, slug)(m._id), width: m.width, height: m.height } });
  } catch (err) { fail(res, err, 'Could not upload the image'); }
};

const SAVE: Record<string, { create: Function; update: Function }> = {
  stats: { create: svc.createStat, update: svc.updateStat },
  companies: { create: svc.createCompany, update: svc.updateCompany },
  students: { create: svc.createStudent, update: svc.updateStudent },
};
const listOf = (req: Request) => {
  const l = String(req.params.list);
  if (!SAVE[l]) throw new WebsiteContentError('Unknown list.', 404);
  return l as 'stats' | 'companies' | 'students';
};

// POST /website-content/:list
export const createItem = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const l = listOf(req);
    const doc: any = await SAVE[l].create(req.tenantId!, await who(req), req.body || {});
    res.status(201).json({ success: true, message: 'Saved', data: { id: String(doc._id) } });
  } catch (err) { fail(res, err, 'Could not save'); }
};

// PUT /website-content/:list/:id
export const updateItem = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const l = listOf(req);
    await SAVE[l].update(req.tenantId!, await who(req), req.params.id, req.body || {});
    res.json({ success: true, message: 'Saved' });
  } catch (err) { fail(res, err, 'Could not save'); }
};

// DELETE /website-content/:list/:id
export const removeItem = async (req: AuthenticatedRequest, res: Response) => {
  try {
    await svc.removeItem(req.tenantId!, listOf(req), req.params.id);
    res.json({ success: true, message: 'Removed' });
  } catch (err) { fail(res, err, 'Could not remove'); }
};

// POST /website-content/:list/reorder  { ids: [] }
export const reorderList = async (req: AuthenticatedRequest, res: Response) => {
  try {
    await svc.reorder(req.tenantId!, listOf(req), req.body?.ids);
    res.json({ success: true, message: 'Order saved' });
  } catch (err) { fail(res, err, 'Could not save the order'); }
};

// GET /website-content/lms-offers?q=
export const getLmsOffers = async (req: AuthenticatedRequest, res: Response) => {
  try { res.json({ success: true, data: await svc.lmsOffers(req.tenantId!, String(req.query.q || '')) }); }
  catch (err) { fail(res, err, 'Could not load Placement Desk offers'); }
};

// POST /website-content/companies/by-name  { name } → the company, added when new
export const companyByName = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const c: any = await svc.companyByName(req.tenantId!, await who(req), String(req.body?.name || ''));
    res.json({ success: true, data: { id: String(c._id), name: c.name } });
  } catch (err) { fail(res, err, 'Could not add the company'); }
};

/* ── Public (the website) ─────────────────────────────────────────────────────────────────────── */

async function publicTenant(req: Request) {
  const slug = String(req.params.tenantSlug || '').toLowerCase();
  const t: any = await Tenant.findOne({ slug, isActive: true }).select('_id slug').lean();
  return t ? { id: String(t._id), slug: t.slug as string } : null;
}

/**
 * GET /api/v1/public/:tenantSlug/placements[?course=&year=&companyType=&featured=1&sort=package|recent&limit=]
 * Read-only, published items only, no personal data; browsers and CDNs may keep it for 60 seconds.
 */
export const getPublicPlacements = async (req: Request, res: Response) => {
  try {
    const t = await publicTenant(req);
    if (!t) return res.status(404).json({ success: false, message: 'Not found', data: null });
    const data = await svc.publicPlacements(t.id, mediaUrlFor(req, t.slug), req.query as any);
    res.setHeader('Cache-Control', 'public, max-age=60');
    res.json({ success: true, message: 'OK', data });
  } catch (err) {
    console.error('[public-placements]', err);
    res.status(500).json({ success: false, message: 'Something went wrong', data: null });
  }
};

// GET /api/v1/public/:tenantSlug/media/:file  (":id.webp") — an image never changes, so it is cached for a year.
export const getPublicMedia = async (req: Request, res: Response) => {
  try {
    const t = await publicTenant(req);
    const id = String(req.params.file || '').replace(/\.webp$/i, '');
    const img = t ? await openImage(t.id, id) : null;
    if (!img) return res.status(404).end();
    res.setHeader('Content-Type', img.contentType);
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    img.stream.on('error', () => { if (!res.headersSent) res.status(404); res.end(); });
    img.stream.pipe(res);
  } catch {
    if (!res.headersSent) res.status(404).end();
  }
};

/* ── Stages 2–4: Tech Battle, Events, Courses, Testimonials, Trainers, Site settings ────────────── */

const base = (req: Request, slug: string) => `${req.protocol}://${req.get('host')}/api/v1/public/${encodeURIComponent(slug)}`;

// GET /website-content/sections — everything for the other tabs in one go
export const getSections = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const slug = await slugOf(tenantId);
    const m = mediaUrlFor(req, slug);
    const [battle, events, courses, testimonials, trainers, settings, companies] = await Promise.all([
      sec.adminBattle(tenantId, m), sec.adminEvents(tenantId, m), sec.adminCourses(tenantId),
      sec.testimonials(tenantId, m, true), sec.trainers(tenantId, m, true), sec.adminSettings(tenantId),
      svc.adminPlacements(tenantId, m).then((p) => p.companies.map((c) => ({ id: c.id, name: c.name }))),
    ]);
    const b = base(req, slug);
    res.json({
      success: true,
      data: {
        battle, events, courses, testimonials, trainers, settings, companies,
        apiUrls: {
          placements: `${b}/placements`, techBattle: `${b}/tech-battle`, events: `${b}/events`, courses: `${b}/courses`,
          testimonials: `${b}/testimonials`, trainers: `${b}/trainers`, site: `${b}/site`, nextBatch: `${b}/next-batch`,
        },
      },
    });
  } catch (err) { fail(res, err, 'Could not load website content'); }
};

// POST /website-content/x/:list  and  PUT /website-content/x/:list/:id   (events, testimonials, trainers)
const sectionList = (req: Request) => {
  const l = String(req.params.list);
  if (!sec.isSectionList(l)) throw new WebsiteContentError('Unknown list.', 404);
  return l;
};
export const createSection = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const doc: any = await sec.createSectionItem(req.tenantId!, await who(req), sectionList(req), req.body || {});
    res.status(201).json({ success: true, message: 'Saved', data: { id: String(doc._id) } });
  } catch (err) { fail(res, err, 'Could not save'); }
};
export const updateSection = async (req: AuthenticatedRequest, res: Response) => {
  try { await sec.updateSectionItem(req.tenantId!, await who(req), sectionList(req), req.params.id, req.body || {}); res.json({ success: true, message: 'Saved' }); }
  catch (err) { fail(res, err, 'Could not save'); }
};
export const removeSection = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const M = sec.sectionModel(sectionList(req));
    const r = await M.deleteOne({ _id: req.params.id, tenantId: req.tenantId! });
    if (!r.deletedCount) throw new WebsiteContentError('Already removed.', 404);
    res.json({ success: true, message: 'Removed' });
  } catch (err) { fail(res, err, 'Could not remove'); }
};
export const reorderSection = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const l = String(req.params.list);
    if (l === 'courses') await sec.reorderCourses(req.tenantId!, req.body?.ids);
    else {
      const M = sec.sectionModel(sectionList(req));
      const ids = (Array.isArray(req.body?.ids) ? req.body.ids : []).filter((x: any) => /^[a-f0-9]{24}$/i.test(String(x)));
      if (!ids.length) throw new WebsiteContentError('Nothing to reorder.');
      await M.bulkWrite(ids.map((id: string, i: number) => ({ updateOne: { filter: { _id: id, tenantId: req.tenantId! }, update: { $set: { order: i } } } })));
    }
    res.json({ success: true, message: 'Order saved' });
  } catch (err) { fail(res, err, 'Could not save the order'); }
};

// PUT /website-content/tech-battle/settings
export const putBattleSettings = async (req: AuthenticatedRequest, res: Response) => {
  try { await sec.saveBattleSettings(req.tenantId!, await who(req), req.body || {}); res.json({ success: true, message: 'Saved' }); }
  catch (err) { fail(res, err, 'Could not save'); }
};
// PUT /website-content/tech-battle/battles/:battleId
export const putBattleNote = async (req: AuthenticatedRequest, res: Response) => {
  try { await sec.saveBattleNote(req.tenantId!, await who(req), req.params.battleId, req.body || {}); res.json({ success: true, message: 'Saved' }); }
  catch (err) { fail(res, err, 'Could not save'); }
};
// GET /website-content/tech-battle/battles/:battleId/leaderboard?n=3
export const getBattleTop = async (req: AuthenticatedRequest, res: Response) => {
  try { res.json({ success: true, data: await sec.leaderboardTop(req.tenantId!, req.params.battleId, Number(req.query.n) || 3) }); }
  catch (err) { fail(res, err, 'Could not read the leaderboard'); }
};
// POST /website-content/courses  { key, name }
export const postCourse = async (req: AuthenticatedRequest, res: Response) => {
  try { await sec.addCourse(req.tenantId!, req.body || {}); res.status(201).json({ success: true, message: 'Course added' }); }
  catch (err) { fail(res, err, 'Could not add the course'); }
};
// PUT /website-content/courses/:key
export const putCourse = async (req: AuthenticatedRequest, res: Response) => {
  try { await sec.saveCourseSite(req.tenantId!, await who(req), req.params.key, req.body || {}); res.json({ success: true, message: 'Saved' }); }
  catch (err) { fail(res, err, 'Could not save the course'); }
};
// PUT /website-content/settings
export const putSettings = async (req: AuthenticatedRequest, res: Response) => {
  try { await sec.saveSettings(req.tenantId!, await who(req), req.body || {}); res.json({ success: true, message: 'Saved' }); }
  catch (err) { fail(res, err, 'Could not save'); }
};

/** One read-only, published-only, 60-second-cached public handler per section. */
const publicJson = (load: (tenantId: string, m: svc.MediaUrl, req: Request) => Promise<any>, notFoundWhenNull = false) =>
  async (req: Request, res: Response) => {
    try {
      const t = await publicTenant(req);
      if (!t) return res.status(404).json({ success: false, message: 'Not found', data: null });
      const data = await load(t.id, mediaUrlFor(req, t.slug), req);
      if (data === null && notFoundWhenNull) return res.status(404).json({ success: false, message: 'Not found', data: null });
      res.setHeader('Cache-Control', 'public, max-age=60');
      res.json({ success: true, message: 'OK', data });
    } catch (err) {
      console.error('[public-website]', err);
      res.status(500).json({ success: false, message: 'Something went wrong', data: null });
    }
  };

export const getPublicTechBattle = publicJson((id, m) => sec.publicBattle(id, m));
export const getPublicEvents = publicJson((id, m, req) => sec.publicEvents(id, m, req.query as any));
export const getPublicCourses = publicJson((id) => sec.publicCourses(id));
export const getPublicCourse = publicJson((id, _m, req) => sec.publicCourse(id, String(req.params.key || '')), true);
export const getPublicTestimonials = publicJson((id, m) => sec.testimonials(id, m, false));
export const getPublicTrainers = publicJson((id, m) => sec.trainers(id, m, false));
export const getPublicSite = publicJson((id) => sec.publicSite(id));
