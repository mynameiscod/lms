/**
 * Website placements (2026-11-27) — see models/WebsiteContent.ts.
 *
 * Three lists the team keeps by hand: placement numbers, hiring companies, placed students. The
 * website reads the published ones from GET /public/:slug/placements. Nothing is calculated: a
 * number shows exactly as typed, and the list order is the order the team set.
 */
import mongoose from 'mongoose';
import {
  WebsiteStat, WebsiteCompany, WebsitePlacement, COMPANY_TYPES, CompanyType, PLACEMENT_TAGS, PlacementTag, PLACEMENT_TAG_LABEL,
} from '../models/WebsiteContent';
import { WebsiteContentError, ownsImage } from './websiteMediaService';
import { listCourses } from './websiteBatchService';
import { PlacementDeskCandidate, PlacementDeskDrive } from '../models/PlacementDesk';

export interface Actor { id?: string; name: string }
type Model = 'stats' | 'companies' | 'students';

const clip = (v: unknown, n: number) => String(v ?? '').trim().slice(0, n);
const has = (b: any, k: string) => Object.prototype.hasOwnProperty.call(b, k);
const oid = (v: unknown) => (v && mongoose.isValidObjectId(String(v)) ? String(v) : '');
const HISTORY_KEEP = 50;
const histEntry = (a: Actor, change: string) => ({ at: new Date(), by: a.id && mongoose.isValidObjectId(a.id) ? a.id : undefined, byName: a.name, change });
const pushHistory = (doc: any, a: Actor, change: string) => {
  doc.history = [histEntry(a, change), ...(doc.history || [])].slice(0, HISTORY_KEEP);
};
async function nextOrder(model: any, tenantId: string) {
  const last: any = await model.findOne({ tenantId }).sort({ order: -1 }).select('order').lean();
  return (last?.order ?? -1) + 1;
}
const yesNo = (v: boolean) => (v ? 'on' : 'off');

/** "₹ 4.2 LPA" — what the website prints. Whole numbers keep no decimals ("₹ 11 LPA"). */
export const packageText = (lpa?: number | null) =>
  lpa === undefined || lpa === null ? '' : `₹ ${Number.isInteger(lpa) ? lpa : lpa.toFixed(1).replace(/\.0$/, '')} LPA`;

/* ── Placement numbers ───────────────────────────────────────────────────────────────────────── */

function statFields(b: any, partial: boolean) {
  const out: any = {};
  if (!partial || has(b, 'value')) {
    out.value = clip(b.value, 20);
    if (!out.value) throw new WebsiteContentError('Type the number, e.g. 92% or 500+.');
  }
  if (!partial || has(b, 'label')) {
    out.label = clip(b.label, 60);
    if (!out.label) throw new WebsiteContentError('Type what the number means, e.g. Placement rate.');
  }
  if (has(b, 'published')) out.published = !!b.published;
  return out;
}

export async function createStat(tenantId: string, a: Actor, b: any) {
  const f = statFields(b, false);
  const doc = new WebsiteStat({ tenantId, ...f, order: await nextOrder(WebsiteStat, tenantId) });
  pushHistory(doc, a, `Added ${f.value} ${f.label}${f.published ? ' (published)' : ''}`);
  return doc.save();
}

export async function updateStat(tenantId: string, a: Actor, id: string, b: any) {
  const doc: any = await WebsiteStat.findOne({ _id: oid(id) || null, tenantId });
  if (!doc) throw new WebsiteContentError('That number no longer exists.', 404);
  const f = statFields(b, true);
  const changes: string[] = [];
  if (f.value !== undefined && f.value !== doc.value) changes.push(`number ${doc.value} → ${f.value}`);
  if (f.label !== undefined && f.label !== doc.label) changes.push(`label "${doc.label}" → "${f.label}"`);
  if (f.published !== undefined && f.published !== doc.published) changes.push(f.published ? 'published' : 'unpublished');
  Object.assign(doc, f);
  if (changes.length) pushHistory(doc, a, changes.join(', '));
  return doc.save();
}

/* ── Companies ──────────────────────────────────────────────────────────────────────────────── */

const DOMAIN = /^[a-z0-9-]+(\.[a-z0-9-]+)+$/;
function cleanDomain(v: unknown) {
  let d = clip(v, 200).toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').split(/[/?#]/)[0];
  if (d && !DOMAIN.test(d)) throw new WebsiteContentError('The website should look like epam.com.');
  return d.slice(0, 100);
}

async function companyFields(tenantId: string, b: any, partial: boolean) {
  const out: any = {};
  if (!partial || has(b, 'name')) {
    out.name = clip(b.name, 80);
    if (!out.name) throw new WebsiteContentError('Type the company name.');
    out.nameKey = out.name.toLowerCase().replace(/\s+/g, ' ');
  }
  if (has(b, 'type')) {
    if (!(COMPANY_TYPES as readonly string[]).includes(b.type)) throw new WebsiteContentError('Pick product, service, startup or other.');
    out.type = b.type as CompanyType;
  }
  if (has(b, 'domain')) out.domain = cleanDomain(b.domain);
  if (has(b, 'logoId')) {
    if (!b.logoId) out.logoId = null;
    else if (await ownsImage(tenantId, b.logoId, 'logo')) out.logoId = String(b.logoId);
    else throw new WebsiteContentError('Upload the logo again.');
  }
  if (has(b, 'showInStrip')) out.showInStrip = !!b.showInStrip;
  if (has(b, 'published')) out.published = !!b.published;
  return out;
}

async function refuseDuplicateCompany(tenantId: string, nameKey: string, exceptId?: string) {
  const clash: any = await WebsiteCompany.findOne({ tenantId, nameKey, ...(exceptId ? { _id: { $ne: exceptId } } : {}) }).select('name').lean();
  if (clash) throw new WebsiteContentError(`${clash.name} is already in your companies.`, 409);
}

export async function createCompany(tenantId: string, a: Actor, b: any) {
  const f = await companyFields(tenantId, b, false);
  await refuseDuplicateCompany(tenantId, f.nameKey);
  const doc = new WebsiteCompany({ tenantId, published: true, ...f, order: await nextOrder(WebsiteCompany, tenantId) });
  pushHistory(doc, a, `Added ${f.name}`);
  return doc.save();
}

export async function updateCompany(tenantId: string, a: Actor, id: string, b: any) {
  const doc: any = await WebsiteCompany.findOne({ _id: oid(id) || null, tenantId });
  if (!doc) throw new WebsiteContentError('That company no longer exists.', 404);
  const f = await companyFields(tenantId, b, true);
  if (f.nameKey && f.nameKey !== doc.nameKey) await refuseDuplicateCompany(tenantId, f.nameKey, String(doc._id));
  const changes: string[] = [];
  if (f.name !== undefined && f.name !== doc.name) changes.push(`name ${doc.name} → ${f.name}`);
  if (f.type !== undefined && f.type !== doc.type) changes.push(`type ${doc.type} → ${f.type}`);
  if (f.domain !== undefined && f.domain !== doc.domain) changes.push(`website ${doc.domain || '—'} → ${f.domain || '—'}`);
  if (f.logoId !== undefined && String(f.logoId || '') !== String(doc.logoId || '')) changes.push(f.logoId ? 'new logo' : 'logo removed');
  if (f.showInStrip !== undefined && f.showInStrip !== doc.showInStrip) changes.push(`logo strip ${yesNo(f.showInStrip)}`);
  if (f.published !== undefined && f.published !== doc.published) changes.push(f.published ? 'published' : 'unpublished');
  Object.assign(doc, f);
  if (changes.length) pushHistory(doc, a, changes.join(', '));
  return doc.save();
}

/* ── Placed students ────────────────────────────────────────────────────────────────────────── */

const YM = /^\d{4}-(0[1-9]|1[0-2])$/;

async function studentFields(tenantId: string, b: any, partial: boolean) {
  const out: any = {};
  if (!partial || has(b, 'name')) {
    out.name = clip(b.name, 60);
    if (!out.name) throw new WebsiteContentError("Type the student's name.");
  }
  for (const [k, n] of [['role', 60], ['batch', 40], ['college', 100], ['degree', 40], ['quote', 140]] as const) {
    if (has(b, k)) out[k] = clip(b[k], n);
  }
  if (has(b, 'courseKey')) {
    const key = clip(b.courseKey, 40).toLowerCase();
    if (key) {
      const courses = await listCourses(tenantId);
      if (!courses.some((c) => c.key === key)) throw new WebsiteContentError('Pick a course from the list.');
    }
    out.courseKey = key;
  }
  if (has(b, 'companyId')) {
    const id = oid(b.companyId);
    if (b.companyId && !id) throw new WebsiteContentError('Pick the company again.');
    if (id && !(await WebsiteCompany.exists({ _id: id, tenantId }))) throw new WebsiteContentError('That company is not in your list.');
    out.companyId = id || null;
  }
  if (has(b, 'packageLpa')) {
    if (b.packageLpa === '' || b.packageLpa === null || b.packageLpa === undefined) out.packageLpa = null;
    else {
      const n = Number(b.packageLpa);
      if (!Number.isFinite(n) || n < 0 || n > 500) throw new WebsiteContentError('Package must be in lakhs per year, e.g. 4.2.');
      out.packageLpa = Math.round(n * 100) / 100;
    }
  }
  if (has(b, 'year')) {
    if (b.year === '' || b.year === null || b.year === undefined) out.year = null;
    else {
      const y = Number(b.year);
      if (!Number.isInteger(y) || y < 2000 || y > 2100) throw new WebsiteContentError('Year should look like 2025.');
      out.year = y;
    }
  }
  if (has(b, 'placedOn')) {
    const v = clip(b.placedOn, 7);
    if (v && !YM.test(v)) throw new WebsiteContentError('Placed month should look like 2025-08.');
    out.placedOn = v;
  }
  if (has(b, 'tags')) {
    const tags = Array.isArray(b.tags) ? b.tags.map(String) : [];
    out.tags = [...new Set<string>(tags)].filter((t) => (PLACEMENT_TAGS as readonly string[]).includes(t)) as PlacementTag[];
  }
  if (has(b, 'photoId')) {
    if (!b.photoId) out.photoId = null;
    else if (await ownsImage(tenantId, b.photoId, 'photo')) out.photoId = String(b.photoId);
    else throw new WebsiteContentError('Upload the photo again.');
  }
  if (has(b, 'userId')) out.userId = oid(b.userId) || null;
  for (const k of ['featured', 'consent', 'published'] as const) if (has(b, k)) out[k] = !!b[k];
  return out;
}

/** A published card must be one the website can show and the student agreed to. */
function checkPublishable(doc: any) {
  if (!doc.published) return;
  if (!doc.consent) throw new WebsiteContentError("Tick “Student agreed to be shown” before publishing.");
  if (!doc.companyId) throw new WebsiteContentError('Pick the company before publishing.');
}

const STUDENT_LABEL: Record<string, string> = {
  name: 'name', role: 'role', batch: 'batch', college: 'college', degree: 'degree', quote: 'quote', courseKey: 'course',
  companyId: 'company', packageLpa: 'package', year: 'year', placedOn: 'placed month', tags: 'tags', photoId: 'photo',
};

export async function createStudent(tenantId: string, a: Actor, b: any) {
  const f = await studentFields(tenantId, b, false);
  const doc: any = new WebsitePlacement({ tenantId, ...f, order: await nextOrder(WebsitePlacement, tenantId) });
  checkPublishable(doc);
  pushHistory(doc, a, `Added${doc.published ? ' and published' : ''}`);
  return doc.save();
}

export async function updateStudent(tenantId: string, a: Actor, id: string, b: any) {
  const doc: any = await WebsitePlacement.findOne({ _id: oid(id) || null, tenantId });
  if (!doc) throw new WebsiteContentError('That student card no longer exists.', 404);
  const f = await studentFields(tenantId, b, true);
  const changed: string[] = [];
  for (const [k, v] of Object.entries(f)) {
    const before = doc[k];
    const same = Array.isArray(v) ? JSON.stringify(v) === JSON.stringify(before || []) : String(v ?? '') === String(before ?? '');
    if (same) continue;
    if (k === 'published') changed.push(v ? 'published' : 'unpublished');
    else if (k === 'featured') changed.push(`featured ${yesNo(!!v)}`);
    else if (k === 'consent') changed.push(v ? 'consent ticked' : 'consent removed');
    else if (k === 'packageLpa') changed.push(`package ${packageText(before) || '—'} → ${packageText(v as number) || '—'}`);
    else if (STUDENT_LABEL[k]) changed.push(STUDENT_LABEL[k]);
  }
  Object.assign(doc, f);
  // Taking consent away takes the card off the website at once.
  if (f.consent === false && doc.published) { doc.published = false; changed.push('unpublished (no consent)'); }
  checkPublishable(doc);
  if (changed.length) pushHistory(doc, a, `Changed ${changed.join(', ')}`);
  return doc.save();
}

/* ── Shared: remove, reorder ────────────────────────────────────────────────────────────────── */

const MODELS: Record<Model, any> = { stats: WebsiteStat, companies: WebsiteCompany, students: WebsitePlacement };

export async function removeItem(tenantId: string, model: Model, id: string) {
  const M = MODELS[model];
  if (!M) throw new WebsiteContentError('Unknown list.', 404);
  const doc: any = await M.findOne({ _id: oid(id) || null, tenantId });
  if (!doc) throw new WebsiteContentError('Already removed.', 404);
  if (model === 'companies') {
    const used = await WebsitePlacement.countDocuments({ tenantId, companyId: doc._id });
    if (used) throw new WebsiteContentError(`${used} placed student${used === 1 ? ' is' : 's are'} at ${doc.name}. Change their company first.`, 409);
  }
  await doc.deleteOne();
}

/** Save the order the team dragged the list into. Ids not of this institute are ignored. */
export async function reorder(tenantId: string, model: Model, ids: unknown) {
  const M = MODELS[model];
  if (!M) throw new WebsiteContentError('Unknown list.', 404);
  const list = (Array.isArray(ids) ? ids : []).map(oid).filter(Boolean);
  if (!list.length) throw new WebsiteContentError('Nothing to reorder.');
  await M.bulkWrite(list.map((id, i) => ({ updateOne: { filter: { _id: id, tenantId }, update: { $set: { order: i } } } })));
}

/* ── Views ──────────────────────────────────────────────────────────────────────────────────── */

/** How the image urls are built; the controller knows the host. */
export type MediaUrl = (id: unknown) => string | null;

const byOrder = (x: any, y: any) => (x.order ?? 0) - (y.order ?? 0) || String(x._id).localeCompare(String(y._id));

/** Everything for the Website Content screen, drafts included. */
export async function adminPlacements(tenantId: string, mediaUrl: MediaUrl) {
  const [stats, companies, students, courses] = await Promise.all([
    WebsiteStat.find({ tenantId }).lean(),
    WebsiteCompany.find({ tenantId }).lean(),
    WebsitePlacement.find({ tenantId }).lean(),
    listCourses(tenantId),
  ]);
  const used = new Map<string, number>();
  for (const s of students as any[]) if (s.companyId) used.set(String(s.companyId), (used.get(String(s.companyId)) || 0) + 1);
  const companyById = new Map((companies as any[]).map((c) => [String(c._id), c]));
  const courseName = new Map(courses.map((c) => [c.key, c.name]));
  return {
    courses: courses.map((c) => ({ key: c.key, name: c.name, active: c.active })),
    tags: PLACEMENT_TAGS.map((t) => ({ key: t, label: PLACEMENT_TAG_LABEL[t] })),
    companyTypes: COMPANY_TYPES,
    stats: (stats as any[]).sort(byOrder).map((s) => ({
      id: String(s._id), value: s.value, label: s.label, published: !!s.published, history: s.history || [], updatedAt: s.updatedAt,
    })),
    companies: (companies as any[]).sort(byOrder).map((c) => ({
      id: String(c._id), name: c.name, type: c.type, domain: c.domain || '', logoId: c.logoId ? String(c.logoId) : null,
      logoUrl: mediaUrl(c.logoId), showInStrip: c.showInStrip !== false, published: c.published !== false,
      students: used.get(String(c._id)) || 0, history: c.history || [], updatedAt: c.updatedAt,
    })),
    students: (students as any[]).sort(byOrder).map((s) => {
      const c: any = s.companyId ? companyById.get(String(s.companyId)) : null;
      return {
        id: String(s._id), name: s.name, photoId: s.photoId ? String(s.photoId) : null, photoUrl: mediaUrl(s.photoId),
        courseKey: s.courseKey || '', courseName: courseName.get(s.courseKey) || '', role: s.role || '',
        companyId: s.companyId ? String(s.companyId) : null, companyName: c?.name || '', companyLogoUrl: c ? mediaUrl(c.logoId) : null,
        packageLpa: s.packageLpa ?? null, packageText: packageText(s.packageLpa), batch: s.batch || '', year: s.year ?? null,
        college: s.college || '', degree: s.degree || '', quote: s.quote || '', tags: s.tags || [], placedOn: s.placedOn || '',
        featured: !!s.featured, consent: !!s.consent, published: !!s.published, userId: s.userId ? String(s.userId) : null,
        history: s.history || [], updatedAt: s.updatedAt,
      };
    }),
  };
}

/**
 * What the website reads: published items only, in the team's order, no personal or internal fields.
 * Optional filters for the success-stories page: course, year, companyType, featured, sort, limit.
 */
export async function publicPlacements(tenantId: string, mediaUrl: MediaUrl, q: Record<string, unknown> = {}) {
  const [stats, companies, students, courses] = await Promise.all([
    WebsiteStat.find({ tenantId, published: true }).lean(),
    WebsiteCompany.find({ tenantId, published: true }).lean(),
    WebsitePlacement.find({ tenantId, published: true, consent: true }).lean(),
    listCourses(tenantId),
  ]);
  const courseName = new Map(courses.map((c) => [c.key, c.name]));
  const companyView = (c: any) => ({
    id: String(c._id), name: c.name, type: c.type, domain: c.domain || '', logoUrl: mediaUrl(c.logoId),
  });
  const companyById = new Map((companies as any[]).map((c) => [String(c._id), c]));

  let list = (students as any[]).filter((s) => s.companyId && companyById.has(String(s.companyId))).sort(byOrder);
  const allCards = list;
  const course = clip(q.course, 40).toLowerCase();
  const year = Number(q.year);
  const ctype = clip(q.companyType, 20);
  if (course) list = list.filter((s) => s.courseKey === course);
  if (Number.isInteger(year) && year > 0) list = list.filter((s) => s.year === year);
  if (ctype) list = list.filter((s) => companyById.get(String(s.companyId))?.type === ctype);
  if (q.featured === '1' || q.featured === 'true') list = list.filter((s) => s.featured);
  if (q.sort === 'package') list = [...list].sort((x, y) => (y.packageLpa ?? -1) - (x.packageLpa ?? -1));
  else if (q.sort === 'recent') list = [...list].sort((x, y) => String(y.placedOn || '').localeCompare(String(x.placedOn || '')));
  const limit = Math.min(Math.max(Number(q.limit) || 0, 0), 500);
  if (limit) list = list.slice(0, limit);

  const uniq = <T,>(xs: T[]) => [...new Set(xs)];
  return {
    stats: (stats as any[]).sort(byOrder).map((s) => ({ value: s.value, label: s.label })),
    companies: (companies as any[]).filter((c) => c.showInStrip !== false).sort(byOrder).map(companyView),
    students: list.map((s) => ({
      id: String(s._id),
      name: s.name,
      photoUrl: mediaUrl(s.photoId),
      course: s.courseKey ? { key: s.courseKey, name: courseName.get(s.courseKey) || '' } : null,
      role: s.role || '',
      company: companyView(companyById.get(String(s.companyId))),
      package: s.packageLpa === undefined || s.packageLpa === null ? null : { lpa: s.packageLpa, text: packageText(s.packageLpa) },
      batch: s.batch || '',
      year: s.year ?? null,
      college: s.college || '',
      degree: s.degree || '',
      quote: s.quote || '',
      tags: (s.tags || []).map((t: PlacementTag) => ({ key: t, label: PLACEMENT_TAG_LABEL[t] })),
      placedOn: s.placedOn || '',
      featured: !!s.featured,
    })),
    // What the success-stories filters can offer, from all published cards (not just this page).
    filters: {
      courses: uniq(allCards.map((s) => s.courseKey).filter(Boolean)).map((k) => ({ key: k, name: courseName.get(k) || k })),
      years: uniq(allCards.map((s) => s.year).filter(Boolean) as number[]).sort((x, y) => y - x),
      companyTypes: uniq(allCards.map((s) => companyById.get(String(s.companyId))?.type).filter(Boolean)),
    },
  };
}

/* ── Add from LMS ───────────────────────────────────────────────────────────────────────────── */

/**
 * Offers recorded on the Placement Desk, newest first, for "Add from LMS". Only fields the card
 * uses are returned (no phone or email). Each says whether a card already exists for that student.
 */
export async function lmsOffers(tenantId: string, search = '') {
  if (!mongoose.isValidObjectId(tenantId)) return [];
  const q: any = { tenantId: new mongoose.Types.ObjectId(tenantId), status: { $in: ['offer_accepted', 'joined', 'offered'] } };
  const s = clip(search, 60);
  if (s) q.name = { $regex: s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' };
  const rows: any[] = await PlacementDeskCandidate.find(q).sort({ statusAt: -1, updatedAt: -1 }).limit(50)
    .select('name college degree passoutYear offerCtc status statusAt studentId driveId companyId').lean();
  const drives: any[] = await PlacementDeskDrive.find({ _id: { $in: rows.map((r) => r.driveId) } }).select('companyName role').lean();
  const driveById = new Map(drives.map((d) => [String(d._id), d]));
  const carded = new Set((await WebsitePlacement.find({ tenantId, userId: { $in: rows.map((r) => r.studentId).filter(Boolean) } }).select('userId').lean())
    .map((p: any) => String(p.userId)));
  const ym = (d?: Date) => (d ? new Date(new Date(d).getTime() + 5.5 * 3600_000).toISOString().slice(0, 7) : '');
  return rows.map((r) => {
    const d = driveById.get(String(r.driveId));
    return {
      candidateId: String(r._id), userId: r.studentId ? String(r.studentId) : null, name: r.name,
      companyName: d?.companyName || '', role: d?.role || '', packageLpa: r.offerCtc ?? null,
      college: r.college || '', degree: r.degree || '', year: r.passoutYear ?? null, placedOn: ym(r.statusAt),
      status: r.status, hasCard: r.studentId ? carded.has(String(r.studentId)) : false,
    };
  });
}

/** Find a company by name or add it (used by "Add from LMS" when the company is new to the website list). */
export async function companyByName(tenantId: string, a: Actor, name: string) {
  const n = clip(name, 80);
  if (!n) throw new WebsiteContentError('Type the company name.');
  const nameKey = n.toLowerCase().replace(/\s+/g, ' ');
  const found = await WebsiteCompany.findOne({ tenantId, nameKey });
  return found || createCompany(tenantId, a, { name: n });
}
