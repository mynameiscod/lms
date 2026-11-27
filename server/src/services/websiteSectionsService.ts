/**
 * Website content, stages 2–4 (2026-11-27): Tech Battle, Events, Courses, Testimonials, Trainers and
 * Site settings. Same rules as placements (websitePlacementService): typed by staff, nothing
 * calculated, only published items leave the LMS, every change is in the item's history.
 *
 * Tech Battle is the one exception to "typed here": the battle's date and time come from the live
 * battle in Tech Battles (the website already registers into it), so they are entered once.
 */
import mongoose from 'mongoose';
import {
  WebsiteBattleSettings, WebsiteBattleNote, WebsiteEvent, WebsiteTestimonial, WebsiteTrainer, WebsiteSettings,
  WebsiteCompany, EVENT_TYPES, EVENT_MODES,
} from '../models/WebsiteContent';
import { WebsiteCourse } from '../models/WebsiteBatch';
import TechBattle from '../models/TechBattle';
import { WebsiteContentError, ownsImage } from './websiteMediaService';
import { listCourses, publicNextBatch, invalidate, todayIST, saveCourse } from './websiteBatchService';
import { getBattleLeaderboard } from './battleService';
import { Actor, MediaUrl, packageText, statsOf } from './websitePlacementService';

const has = (b: any, k: string) => Object.prototype.hasOwnProperty.call(b ?? {}, k);
const clip = (v: unknown, n: number) => String(v ?? '').trim().slice(0, n);
const oid = (v: unknown) => (v && mongoose.isValidObjectId(String(v)) ? String(v) : '');
const HISTORY_KEEP = 50;
const histEntry = (a: Actor, change: string) => ({ at: new Date(), by: a.id && mongoose.isValidObjectId(a.id) ? a.id : undefined, byName: a.name, change });
const pushHistory = (doc: any, a: Actor, change: string) => {
  doc.history = [histEntry(a, change), ...(doc.history || [])].slice(0, HISTORY_KEEP);
};
const byOrder = (x: any, y: any) => (x.order ?? 0) - (y.order ?? 0) || String(x._id).localeCompare(String(y._id));
async function nextOrder(model: any, tenantId: string) {
  const last: any = await model.findOne({ tenantId }).sort({ order: -1 }).select('order').lean();
  return (last?.order ?? -1) + 1;
}

/** A link the website can open: a full https link, or a path on the website itself ("/workshops/x"). */
function cleanUrl(v: unknown, label: string) {
  const u = clip(v, 500);
  if (!u) return '';
  if (/^https?:\/\/[^\s]+$/i.test(u) || /^\/[^\s]*$/.test(u)) return u;
  throw new WebsiteContentError(`${label} should start with https:// or with / for a page on your website.`);
}
/** A list of short texts: blanks dropped, each clipped, at most `max` items. */
function cleanList(v: unknown, max: number, each: number) {
  const arr = Array.isArray(v) ? v : String(v ?? '').split('\n');
  return arr.map((x) => clip(x, each)).filter(Boolean).slice(0, max);
}
const YMD = /^\d{4}-\d{2}-\d{2}$/;

/* ── Generic list items (events, testimonials, trainers) ─────────────────────────────────────── */

type Spec =
  | { k: string; t: 'str'; max: number; label: string; required?: boolean }
  | { k: string; t: 'list'; max: number; each: number; label: string }
  | { k: string; t: 'bool'; label: string }
  | { k: string; t: 'ymd'; label: string; required?: boolean }
  | { k: string; t: 'url'; label: string }
  | { k: string; t: 'enum'; values: readonly string[]; label: string }
  | { k: string; t: 'media'; media: 'photo' | 'thumb' | 'logo'; label: string }
  | { k: string; t: 'company'; label: string }
  | { k: string; t: 'course'; label: string }
  | { k: string; t: 'lpa'; label: string };

async function cleanFields(tenantId: string, specs: Spec[], b: any, partial: boolean) {
  const out: any = {};
  for (const f of specs) {
    if (partial && !has(b, f.k)) continue;
    const v = b?.[f.k];
    switch (f.t) {
      case 'str': {
        out[f.k] = clip(v, f.max);
        if (f.required && !out[f.k]) throw new WebsiteContentError(`Type the ${f.label}.`);
        break;
      }
      case 'list': out[f.k] = cleanList(v, f.max, f.each); break;
      case 'bool': out[f.k] = !!v; break;
      case 'ymd': {
        const d = clip(v, 10);
        if (d && !YMD.test(d)) throw new WebsiteContentError(`${f.label} should be a date.`);
        if (f.required && !d) throw new WebsiteContentError(`Pick the ${f.label}.`);
        out[f.k] = d;
        break;
      }
      case 'url': out[f.k] = cleanUrl(v, f.label); break;
      case 'enum': {
        if (!f.values.includes(v)) throw new WebsiteContentError(`Pick a ${f.label}.`);
        out[f.k] = v;
        break;
      }
      case 'media': {
        if (!v) out[f.k] = null;
        else if (await ownsImage(tenantId, v, f.media)) out[f.k] = String(v);
        else throw new WebsiteContentError(`Upload the ${f.label} again.`);
        break;
      }
      case 'company': {
        const id = oid(v);
        if (v && !id) throw new WebsiteContentError('Pick the company again.');
        if (id && !(await WebsiteCompany.exists({ _id: id, tenantId }))) throw new WebsiteContentError('That company is not in your list.');
        out[f.k] = id || null;
        break;
      }
      case 'course': {
        const key = clip(v, 40).toLowerCase();
        if (key && !(await listCourses(tenantId)).some((c) => c.key === key)) throw new WebsiteContentError('Pick a course from the list.');
        out[f.k] = key;
        break;
      }
      case 'lpa': {
        if (v === '' || v === null || v === undefined) { out[f.k] = null; break; }
        const n = Number(v);
        if (!Number.isFinite(n) || n < 0 || n > 500) throw new WebsiteContentError('Package must be in lakhs per year, e.g. 4.2.');
        out[f.k] = Math.round(n * 100) / 100;
        break;
      }
      default: break;
    }
  }
  return out;
}

function changedLabels(specs: Spec[], doc: any, f: any) {
  const out: string[] = [];
  for (const s of specs) {
    if (!has(f, s.k)) continue;
    const before = doc[s.k];
    const after = f[s.k];
    const same = Array.isArray(after) ? JSON.stringify(after) === JSON.stringify(before || []) : String(after ?? '') === String(before ?? '');
    if (same) continue;
    if (s.k === 'published') out.push(after ? 'published' : 'unpublished');
    else if (s.k === 'consent') out.push(after ? 'consent ticked' : 'consent removed');
    else out.push(s.label);
  }
  return out;
}

const EVENT_SPEC: Spec[] = [
  { k: 'type', t: 'enum', values: EVENT_TYPES, label: 'type' },
  { k: 'title', t: 'str', max: 100, label: 'title', required: true },
  { k: 'summary', t: 'str', max: 300, label: 'summary' },
  { k: 'startDate', t: 'ymd', label: 'start date', required: true },
  { k: 'endDate', t: 'ymd', label: 'end date' },
  { k: 'timeText', t: 'str', max: 60, label: 'time' },
  { k: 'venue', t: 'str', max: 120, label: 'venue' },
  { k: 'mode', t: 'enum', values: EVENT_MODES, label: 'mode' },
  { k: 'teamSize', t: 'str', max: 40, label: 'team size' },
  { k: 'feeText', t: 'str', max: 40, label: 'fee' },
  { k: 'prizes', t: 'list', max: 10, each: 120, label: 'prizes' },
  { k: 'registerUrl', t: 'url', label: 'Registration link' },
  { k: 'pageUrl', t: 'url', label: 'Event page link' },
  { k: 'imageId', t: 'media', media: 'thumb', label: 'image' },
  { k: 'published', t: 'bool', label: 'published' },
];
const TESTIMONIAL_SPEC: Spec[] = [
  { k: 'name', t: 'str', max: 60, label: 'name', required: true },
  { k: 'thumbId', t: 'media', media: 'thumb', label: 'video picture' },
  { k: 'videoUrl', t: 'url', label: 'Video link' },
  { k: 'companyId', t: 'company', label: 'company' },
  { k: 'packageLpa', t: 'lpa', label: 'package' },
  { k: 'label', t: 'str', max: 40, label: 'label' },
  { k: 'courseKey', t: 'course', label: 'course' },
  { k: 'quote', t: 'str', max: 200, label: 'quote' },
  { k: 'consent', t: 'bool', label: 'consent' },
  { k: 'published', t: 'bool', label: 'published' },
];
const TRAINER_SPEC: Spec[] = [
  { k: 'name', t: 'str', max: 60, label: 'name', required: true },
  { k: 'photoId', t: 'media', media: 'photo', label: 'photo' },
  { k: 'title', t: 'str', max: 60, label: 'title' },
  { k: 'company', t: 'str', max: 60, label: 'company' },
  { k: 'experience', t: 'str', max: 20, label: 'experience' },
  { k: 'skills', t: 'list', max: 12, each: 40, label: 'skills' },
  { k: 'linkedin', t: 'url', label: 'LinkedIn link' },
  { k: 'bio', t: 'str', max: 400, label: 'bio' },
  { k: 'published', t: 'bool', label: 'published' },
];

export type SectionList = 'events' | 'testimonials' | 'trainers';
const LISTS: Record<SectionList, { model: any; spec: Spec[]; noun: string; check?: (doc: any, changed: string[]) => void }> = {
  events: {
    model: WebsiteEvent, spec: EVENT_SPEC, noun: 'event',
    check: (doc) => {
      if (doc.endDate && doc.endDate < doc.startDate) throw new WebsiteContentError('The end date is before the start date.');
    },
  },
  testimonials: {
    model: WebsiteTestimonial, spec: TESTIMONIAL_SPEC, noun: 'testimonial',
    check: (doc, changed) => {
      // Taking consent away takes the video off the website at once.
      if (!doc.consent && doc.published && changed.includes('consent removed')) { doc.published = false; changed.push('unpublished (no consent)'); }
      if (doc.published && !doc.consent) throw new WebsiteContentError('Tick “Student agreed to be shown” before publishing.');
      if (doc.published && !doc.videoUrl) throw new WebsiteContentError('Add the video link before publishing.');
    },
  },
  trainers: { model: WebsiteTrainer, spec: TRAINER_SPEC, noun: 'trainer' },
};
export const isSectionList = (l: string): l is SectionList => Object.prototype.hasOwnProperty.call(LISTS, l);
export const sectionModel = (l: SectionList) => LISTS[l].model;

export async function createSectionItem(tenantId: string, a: Actor, list: SectionList, b: any) {
  const L = LISTS[list];
  const f = await cleanFields(tenantId, L.spec, b, false);
  const doc: any = new L.model({ tenantId, ...f, order: await nextOrder(L.model, tenantId) });
  L.check?.(doc, []);
  pushHistory(doc, a, `Added${doc.published ? ' and published' : ''}`);
  return doc.save();
}

export async function updateSectionItem(tenantId: string, a: Actor, list: SectionList, id: string, b: any) {
  const L = LISTS[list];
  const doc: any = await L.model.findOne({ _id: oid(id) || null, tenantId });
  if (!doc) throw new WebsiteContentError(`That ${L.noun} no longer exists.`, 404);
  const f = await cleanFields(tenantId, L.spec, b, true);
  const changed = changedLabels(L.spec, doc, f);
  Object.assign(doc, f);
  L.check?.(doc, changed);
  if (changed.length) pushHistory(doc, a, `Changed ${changed.join(', ')}`);
  return doc.save();
}

/* ── Events ─────────────────────────────────────────────────────────────────────────────────── */

/** Upcoming / Ongoing / Past from the dates, in India time — never stale. */
export function eventStatus(e: { startDate: string; endDate?: string }, today = todayIST()) {
  const end = e.endDate || e.startDate;
  if (today < e.startDate) return 'upcoming';
  if (today > end) return 'past';
  return 'ongoing';
}

function eventView(e: any, mediaUrl: MediaUrl, admin: boolean) {
  const v: any = {
    id: String(e._id), type: e.type, title: e.title, summary: e.summary || '', startDate: e.startDate, endDate: e.endDate || '',
    timeText: e.timeText || '', venue: e.venue || '', mode: e.mode, teamSize: e.teamSize || '', feeText: e.feeText || '',
    prizes: e.prizes || [], registerUrl: e.registerUrl || '', pageUrl: e.pageUrl || '', imageUrl: mediaUrl(e.imageId),
    status: eventStatus(e),
  };
  if (admin) Object.assign(v, { imageId: e.imageId ? String(e.imageId) : null, published: !!e.published, history: e.history || [], updatedAt: e.updatedAt });
  return v;
}

export async function adminEvents(tenantId: string, mediaUrl: MediaUrl) {
  const rows: any[] = await WebsiteEvent.find({ tenantId }).lean();
  return rows.sort(byOrder).map((e) => eventView(e, mediaUrl, true));
}

/** Published events: upcoming and ongoing first (soonest first), then past (latest first). */
export async function publicEvents(tenantId: string, mediaUrl: MediaUrl, q: Record<string, unknown> = {}) {
  const rows: any[] = await WebsiteEvent.find({ tenantId, published: true }).lean();
  let list = rows.map((e) => eventView(e, mediaUrl, false));
  const rank = (s: string) => (s === 'ongoing' ? 0 : s === 'upcoming' ? 1 : 2);
  list.sort((x, y) => rank(x.status) - rank(y.status)
    || (x.status === 'past' ? y.startDate.localeCompare(x.startDate) : x.startDate.localeCompare(y.startDate)));
  const status = clip(q.status, 20);
  const type = clip(q.type, 20);
  if (status) list = list.filter((e) => e.status === status);
  if (type) list = list.filter((e) => e.type === type);
  const limit = Math.min(Math.max(Number(q.limit) || 0, 0), 200);
  if (limit) list = list.slice(0, limit);
  return list.map(({ id, ...e }) => ({ id, ...e }));
}

/* ── Testimonials and trainers ──────────────────────────────────────────────────────────────── */

async function companiesById(tenantId: string) {
  const rows: any[] = await WebsiteCompany.find({ tenantId }).lean();
  return new Map(rows.map((c) => [String(c._id), c]));
}

function testimonialView(t: any, cos: Map<string, any>, courseName: Map<string, string>, mediaUrl: MediaUrl, admin: boolean) {
  const c = t.companyId ? cos.get(String(t.companyId)) : null;
  const v: any = {
    id: String(t._id), name: t.name, thumbUrl: mediaUrl(t.thumbId), videoUrl: t.videoUrl || '',
    company: c && (admin || c.published !== false) ? { name: c.name, logoUrl: mediaUrl(c.logoId) } : null,
    package: t.packageLpa === undefined || t.packageLpa === null ? null : { lpa: t.packageLpa, text: packageText(t.packageLpa) },
    label: t.label || '', course: t.courseKey ? { key: t.courseKey, name: courseName.get(t.courseKey) || '' } : null, quote: t.quote || '',
  };
  if (admin) Object.assign(v, {
    thumbId: t.thumbId ? String(t.thumbId) : null, companyId: t.companyId ? String(t.companyId) : null, packageLpa: t.packageLpa ?? null,
    courseKey: t.courseKey || '', consent: !!t.consent, published: !!t.published, history: t.history || [], updatedAt: t.updatedAt,
  });
  return v;
}

export async function testimonials(tenantId: string, mediaUrl: MediaUrl, admin: boolean) {
  const [rows, cos, courses] = await Promise.all([
    WebsiteTestimonial.find(admin ? { tenantId } : { tenantId, published: true, consent: true }).lean(),
    companiesById(tenantId),
    listCourses(tenantId),
  ]);
  const courseName = new Map(courses.map((c) => [c.key, c.name]));
  return (rows as any[]).sort(byOrder).map((t) => testimonialView(t, cos, courseName, mediaUrl, admin));
}

export async function trainers(tenantId: string, mediaUrl: MediaUrl, admin: boolean) {
  const rows: any[] = await WebsiteTrainer.find(admin ? { tenantId } : { tenantId, published: true }).lean();
  return rows.sort(byOrder).map((t) => {
    const v: any = {
      id: String(t._id), name: t.name, photoUrl: mediaUrl(t.photoId), title: t.title || '', company: t.company || '',
      experience: t.experience || '', skills: t.skills || [], linkedin: t.linkedin || '', bio: t.bio || '',
    };
    if (admin) Object.assign(v, { photoId: t.photoId ? String(t.photoId) : null, published: !!t.published, history: t.history || [], updatedAt: t.updatedAt });
    return v;
  });
}

/* ── Tech Battle ────────────────────────────────────────────────────────────────────────────── */

const IST_DATE: Intl.DateTimeFormatOptions = { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' };
const IST_TIME: Intl.DateTimeFormatOptions = { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' };
const istDate = (d: Date) => new Date(d).toLocaleDateString('en-IN', IST_DATE);
const istTime = (d: Date) => `${new Date(d).toLocaleTimeString('en-IN', IST_TIME).replace(/\s?(am|pm)$/i, (m) => ` ${m.trim().toUpperCase()}`)} IST`;

/** The battle the website's page shows now — the same rule Tech Battles uses for ".../battles/current". */
async function currentBattle(tenantId: string) {
  const now = new Date();
  const battles: any[] = await TechBattle.find({ tenantId, status: 'live', visibility: 'public', endAt: { $gt: now } }).sort({ startAt: 1 }).lean();
  const open = battles.filter((b) => (!b.registerOpensAt || now >= new Date(b.registerOpensAt)) && (!b.registerClosesAt || now <= new Date(b.registerClosesAt)));
  return open[0] || battles[0] || null;
}

function settingsView(s: any) {
  return {
    scheduleText: s?.scheduleText || '', eligibility: s?.eligibility || '', alsoOpenTo: s?.alsoOpenTo || '',
    durationText: s?.durationText || '', modeText: s?.modeText || '', topics: s?.topics || [],
    prizes: (s?.prizes || []).map((p: any) => ({ place: p.place || '', amount: p.amount || '', items: p.items || [] })),
    everyone: s?.everyone || [],
  };
}

export async function adminBattle(tenantId: string, mediaUrl: MediaUrl) {
  const [settings, stats, battles, current] = await Promise.all([
    WebsiteBattleSettings.findOne({ tenantId }).lean(),
    statsOf(tenantId, 'tech_battle', false),
    TechBattle.find({ tenantId }).sort({ startAt: -1 }).limit(30).select('title slug status visibility startAt endAt').lean(),
    currentBattle(tenantId),
  ]);
  const notes: any[] = await WebsiteBattleNote.find({ tenantId, battleId: { $in: (battles as any[]).map((b) => b._id) } }).lean();
  const noteBy = new Map(notes.map((n) => [String(n.battleId), n]));
  const now = Date.now();
  return {
    settings: { ...settingsView(settings), history: (settings as any)?.history || [] },
    stats,
    currentId: current ? String(current._id) : null,
    battles: (battles as any[]).map((b) => {
      const n = noteBy.get(String(b._id));
      return {
        id: String(b._id), title: b.title, slug: b.slug, status: b.status, visibility: b.visibility,
        startAt: b.startAt, endAt: b.endAt, date: istDate(b.startAt), time: istTime(b.startAt), ended: new Date(b.endAt).getTime() < now,
        partnerCollege: n?.partnerCollege || '', partnerImageId: n?.partnerImageId ? String(n.partnerImageId) : null, partnerImageUrl: mediaUrl(n?.partnerImageId),
        winners: (n?.winners || []).map((w: any) => ({ place: w.place, name: w.name, college: w.college || '', score: w.score || '', photoId: w.photoId ? String(w.photoId) : null, photoUrl: mediaUrl(w.photoId) })),
        winnersPublished: !!n?.winnersPublished, history: n?.history || [],
      };
    }),
  };
}

export async function saveBattleSettings(tenantId: string, a: Actor, b: any) {
  const doc: any = await WebsiteBattleSettings.findOne({ tenantId }) || new WebsiteBattleSettings({ tenantId });
  const before = JSON.stringify(settingsView(doc));
  for (const [k, n] of [['scheduleText', 80], ['eligibility', 80], ['alsoOpenTo', 80], ['durationText', 40], ['modeText', 40]] as const) {
    if (has(b, k)) doc[k] = clip(b[k], n);
  }
  if (has(b, 'topics')) doc.topics = cleanList(b.topics, 20, 60);
  if (has(b, 'everyone')) doc.everyone = cleanList(b.everyone, 6, 100);
  if (has(b, 'prizes')) {
    const list = Array.isArray(b.prizes) ? b.prizes : [];
    doc.prizes = list.slice(0, 10).map((p: any) => ({ place: clip(p?.place, 30), amount: clip(p?.amount, 30), items: cleanList(p?.items, 8, 80) }))
      .filter((p: any) => p.place || p.amount || p.items.length);
  }
  if (JSON.stringify(settingsView(doc)) !== before) pushHistory(doc, a, 'Changed the Tech Battle page');
  await doc.save();
  return doc;
}

async function battleOf(tenantId: string, battleId: string) {
  const b: any = oid(battleId) ? await TechBattle.findOne({ _id: battleId, tenantId }).select('_id title').lean() : null;
  if (!b) throw new WebsiteContentError('That battle is not in Tech Battles.', 404);
  return b;
}

export async function saveBattleNote(tenantId: string, a: Actor, battleId: string, b: any) {
  const battle = await battleOf(tenantId, battleId);
  const doc: any = await WebsiteBattleNote.findOne({ tenantId, battleId: battle._id }) || new WebsiteBattleNote({ tenantId, battleId: battle._id });
  const changed: string[] = [];
  if (has(b, 'partnerCollege')) {
    const v = clip(b.partnerCollege, 120);
    if (v !== (doc.partnerCollege || '')) changed.push('partner college');
    doc.partnerCollege = v;
  }
  if (has(b, 'partnerImageId')) {
    if (!b.partnerImageId) doc.partnerImageId = undefined;
    else if (await ownsImage(tenantId, b.partnerImageId, 'thumb')) doc.partnerImageId = String(b.partnerImageId);
    else throw new WebsiteContentError('Upload the college picture again.');
    changed.push('college picture');
  }
  if (has(b, 'winners')) {
    const list = Array.isArray(b.winners) ? b.winners.slice(0, 10) : [];
    const winners: any[] = [];
    for (const w of list) {
      const name = clip(w?.name, 60);
      if (!name) continue;
      const place = Number(w?.place);
      if (!Number.isInteger(place) || place < 1 || place > 10) throw new WebsiteContentError('Each winner needs a place from 1 to 10.');
      let photoId: string | undefined;
      if (w?.photoId) {
        if (!(await ownsImage(tenantId, w.photoId, 'photo'))) throw new WebsiteContentError(`Upload ${name}'s photo again.`);
        photoId = String(w.photoId);
      }
      winners.push({ place, name, college: clip(w?.college, 120), score: clip(w?.score, 20), photoId });
    }
    winners.sort((x, y) => x.place - y.place);
    if (JSON.stringify(winners.map((w) => [w.place, w.name, w.college, w.score, w.photoId || ''])) !== JSON.stringify((doc.winners || []).map((w: any) => [w.place, w.name, w.college, w.score, w.photoId ? String(w.photoId) : '']))) changed.push('winners');
    doc.winners = winners;
  }
  if (has(b, 'winnersPublished')) {
    const v = !!b.winnersPublished;
    if (v && !(doc.winners || []).length) throw new WebsiteContentError('Add at least one winner before publishing the winners.');
    if (v !== !!doc.winnersPublished) changed.push(v ? 'winners published' : 'winners unpublished');
    doc.winnersPublished = v;
  }
  if (!(doc.winners || []).length && doc.winnersPublished) doc.winnersPublished = false;
  if (changed.length) pushHistory(doc, a, `Changed ${changed.join(', ')}`);
  await doc.save();
  return doc;
}

/** The top of the battle's leaderboard, to fill the winners in (the team can still change them). */
export async function leaderboardTop(tenantId: string, battleId: string, n = 3) {
  const battle = await battleOf(tenantId, battleId);
  const rows: any[] = await getBattleLeaderboard(String(battle._id), { limit: Math.min(Math.max(n, 1), 10) });
  return rows.map((r, i) => ({ place: i + 1, name: r.name || '', college: r.college || '', score: r.score === undefined || r.score === null ? '' : String(r.score) }));
}

export async function publicBattle(tenantId: string, mediaUrl: MediaUrl) {
  const [settings, stats, current] = await Promise.all([
    WebsiteBattleSettings.findOne({ tenantId }).lean(),
    statsOf(tenantId, 'tech_battle', true),
    currentBattle(tenantId),
  ]);
  const notes: any[] = await WebsiteBattleNote.find({ tenantId, $or: [{ winnersPublished: true }, ...(current ? [{ battleId: current._id }] : [])] }).lean();
  const noteBy = new Map(notes.map((n) => [String(n.battleId), n]));
  let next: any = null;
  if (current) {
    const n = noteBy.get(String(current._id));
    const now = new Date();
    next = {
      title: current.title, slug: current.slug, startAt: current.startAt, endAt: current.endAt,
      date: istDate(current.startAt), time: istTime(current.startAt),
      registerOpen: (!current.registerOpensAt || now >= new Date(current.registerOpensAt)) && (!current.registerClosesAt || now <= new Date(current.registerClosesAt)),
      partnerCollege: n?.partnerCollege || '', partnerImageUrl: mediaUrl(n?.partnerImageId),
    };
  }
  const pastIds = notes.filter((n) => n.winnersPublished && (n.winners || []).length).map((n) => n.battleId);
  const pastBattles: any[] = pastIds.length
    ? await TechBattle.find({ _id: { $in: pastIds }, tenantId, endAt: { $lt: new Date() } }).sort({ startAt: -1 }).limit(20).select('title startAt').lean()
    : [];
  return {
    next,
    ...settingsView(settings),
    stats,
    past: pastBattles.map((b) => {
      const n = noteBy.get(String(b._id));
      return {
        title: b.title, date: istDate(b.startAt), partnerCollege: n?.partnerCollege || '',
        winners: (n?.winners || []).map((w: any) => ({ place: w.place, name: w.name, college: w.college || '', score: w.score || '', photoUrl: mediaUrl(w.photoId) })),
      };
    }),
  };
}

/* ── Courses ────────────────────────────────────────────────────────────────────────────────── */

const emptySite = () => ({
  published: false, title: '', tagline: '', tags: [] as string[], duration: '', mode: '', seatsText: '', fee: '', oldFee: '', badge: '',
  pageUrl: '', brochureUrl: '', tools: [] as string[], modules: [] as any[], projects: [] as any[], timeline: [] as any[], faqs: [] as any[],
});
function siteOf(c: any) {
  const s = c.site || {};
  const e = emptySite();
  return {
    ...e, ...Object.fromEntries(Object.keys(e).map((k) => [k, s[k] ?? (e as any)[k]])),
    modules: (s.modules || []).map((m: any) => ({ title: m.title || '', days: m.days || '', topics: m.topics || [] })),
    projects: (s.projects || []).map((p: any) => ({ title: p.title || '', description: p.description || '', tags: p.tags || [] })),
    timeline: (s.timeline || []).map((t: any) => ({ day: t.day || '', title: t.title || '', points: t.points || [] })),
    faqs: (s.faqs || []).map((f: any) => ({ q: f.q || '', a: f.a || '' })),
  };
}

async function nextBatchOf(tenantId: string, key: string) {
  const nb: any = await publicNextBatch(tenantId, key).catch(() => null);
  return nb ? { startDate: nb.startDate, displayDate: nb.displayDate, daysLeft: nb.daysLeft, seatsLeft: nb.seatsLeft, mode: nb.mode || '' } : null;
}

export async function adminCourses(tenantId: string) {
  await listCourses(tenantId);   // loads the default course list the first time
  const rows: any[] = await WebsiteCourse.find({ tenantId }).sort({ order: 1, name: 1 }).lean();
  return Promise.all(rows.map(async (c) => ({
    id: String(c._id), key: c.key, name: c.name, active: c.active !== false, ...siteOf(c),
    nextBatch: await nextBatchOf(tenantId, c.key), history: c.site?.history || [],
  })));
}

export async function addCourse(tenantId: string, b: any) {
  try { await saveCourse(tenantId, { key: clip(b?.key, 40), name: clip(b?.name, 120) }); }
  catch (e: any) { throw new WebsiteContentError(e?.message || 'Could not add the course.'); }
}

const pairList = <T,>(v: unknown, max: number, map: (x: any) => T, keep: (x: T) => boolean) =>
  (Array.isArray(v) ? v : []).slice(0, max).map(map).filter(keep);

export async function saveCourseSite(tenantId: string, a: Actor, key: string, b: any) {
  const doc: any = await WebsiteCourse.findOne({ tenantId, key: clip(key, 40).toLowerCase() });
  if (!doc) throw new WebsiteContentError('That course is not in your list.', 404);
  const site: any = siteOf(doc.toObject());
  const before = JSON.stringify(site);
  const changed: string[] = [];
  const str: [string, number, string][] = [['title', 120, 'title'], ['tagline', 240, 'tagline'], ['duration', 40, 'duration'], ['mode', 60, 'mode'],
    ['seatsText', 40, 'seats'], ['fee', 40, 'fee'], ['oldFee', 40, 'old fee'], ['badge', 30, 'badge']];
  for (const [k, n, label] of str) if (has(b, k)) { const v = clip(b[k], n); if (v !== site[k]) changed.push(label); site[k] = v; }
  for (const [k, label] of [['pageUrl', 'Course page link'], ['brochureUrl', 'Brochure link']] as const) {
    if (has(b, k)) { const v = cleanUrl(b[k], label); if (v !== site[k]) changed.push(label.toLowerCase()); site[k] = v; }
  }
  if (has(b, 'tags')) { const v = cleanList(b.tags, 8, 30); if (JSON.stringify(v) !== JSON.stringify(site.tags)) changed.push('tags'); site.tags = v; }
  if (has(b, 'tools')) { const v = cleanList(b.tools, 40, 40); if (JSON.stringify(v) !== JSON.stringify(site.tools)) changed.push('tools'); site.tools = v; }
  if (has(b, 'modules')) {
    site.modules = pairList(b.modules, 30, (m) => ({ title: clip(m?.title, 100), days: clip(m?.days, 30), topics: cleanList(m?.topics, 30, 120) }), (m) => !!m.title);
    changed.push('curriculum');
  }
  if (has(b, 'projects')) {
    site.projects = pairList(b.projects, 20, (p) => ({ title: clip(p?.title, 80), description: clip(p?.description, 400), tags: cleanList(p?.tags, 8, 30) }), (p) => !!p.title);
    changed.push('projects');
  }
  if (has(b, 'timeline')) {
    site.timeline = pairList(b.timeline, 12, (t) => ({ day: clip(t?.day, 20), title: clip(t?.title, 80), points: cleanList(t?.points, 6, 160) }), (t) => !!t.title);
    changed.push('placement timeline');
  }
  if (has(b, 'faqs')) {
    site.faqs = pairList(b.faqs, 30, (f) => ({ q: clip(f?.q, 200), a: clip(f?.a, 1500) }), (f) => !!(f.q && f.a));
    changed.push('FAQs');
  }
  if (has(b, 'published')) {
    const v = !!b.published;
    if (v && !(site.title || doc.name)) throw new WebsiteContentError('Type the course title before publishing.');
    if (v !== site.published) changed.push(v ? 'published' : 'unpublished');
    site.published = v;
  }
  if (JSON.stringify(site) !== before) {
    const history = [histEntry(a, `Changed ${[...new Set(changed)].join(', ') || 'details'}`), ...(doc.site?.history || [])].slice(0, HISTORY_KEEP);
    doc.site = { ...site, history };
    await doc.save();
    invalidate(tenantId);
  }
  return doc;
}

/** Courses in the team's order. Ids not of this institute are ignored. */
export async function reorderCourses(tenantId: string, ids: unknown) {
  const list = (Array.isArray(ids) ? ids : []).map(oid).filter(Boolean);
  if (!list.length) throw new WebsiteContentError('Nothing to reorder.');
  await WebsiteCourse.bulkWrite(list.map((id, i) => ({ updateOne: { filter: { _id: id, tenantId }, update: { $set: { order: i } } } })));
  invalidate(tenantId);
}

function courseCard(c: any, site: any, nextBatch: any) {
  return {
    key: c.key, title: site.title || c.name, tagline: site.tagline, tags: site.tags, duration: site.duration, mode: site.mode,
    seatsText: site.seatsText, fee: site.fee, oldFee: site.oldFee, badge: site.badge, pageUrl: site.pageUrl, brochureUrl: site.brochureUrl, nextBatch,
  };
}

export async function publicCourses(tenantId: string) {
  const rows: any[] = await WebsiteCourse.find({ tenantId, active: { $ne: false }, 'site.published': true }).sort({ order: 1, name: 1 }).lean();
  return Promise.all(rows.map(async (c) => courseCard(c, siteOf(c), await nextBatchOf(tenantId, c.key))));
}

export async function publicCourse(tenantId: string, key: string) {
  const c: any = await WebsiteCourse.findOne({ tenantId, key: clip(key, 40).toLowerCase(), active: { $ne: false }, 'site.published': true }).lean();
  if (!c) return null;
  const site = siteOf(c);
  return { ...courseCard(c, site, await nextBatchOf(tenantId, c.key)), tools: site.tools, modules: site.modules, projects: site.projects, timeline: site.timeline, faqs: site.faqs };
}

/* ── Site settings ──────────────────────────────────────────────────────────────────────────── */

export async function adminSettings(tenantId: string) {
  const s: any = await WebsiteSettings.findOne({ tenantId }).lean();
  return {
    topBar: { enabled: !!s?.topBar?.enabled, text: s?.topBar?.text || '', linkText: s?.topBar?.linkText || '', url: s?.topBar?.url || '' },
    history: s?.history || [],
    stats: await statsOf(tenantId, 'home', false),
  };
}

export async function saveSettings(tenantId: string, a: Actor, b: any) {
  const doc: any = await WebsiteSettings.findOne({ tenantId }) || new WebsiteSettings({ tenantId });
  const t = b?.topBar || {};
  const next = {
    enabled: has(t, 'enabled') ? !!t.enabled : !!doc.topBar?.enabled,
    text: has(t, 'text') ? clip(t.text, 140) : doc.topBar?.text || '',
    linkText: has(t, 'linkText') ? clip(t.linkText, 40) : doc.topBar?.linkText || '',
    url: has(t, 'url') ? cleanUrl(t.url, 'Top bar link') : doc.topBar?.url || '',
  };
  if (next.enabled && !next.text) throw new WebsiteContentError('Type the top bar text before switching it on.');
  const prev = { enabled: !!doc.topBar?.enabled, text: doc.topBar?.text || '', linkText: doc.topBar?.linkText || '', url: doc.topBar?.url || '' };
  if (JSON.stringify(prev) !== JSON.stringify(next)) {
    pushHistory(doc, a, prev.enabled !== next.enabled ? `Top bar ${next.enabled ? 'switched on' : 'switched off'}` : 'Changed the top bar');
    doc.topBar = next;
    await doc.save();
  }
  return doc;
}

export async function publicSite(tenantId: string) {
  const s: any = await WebsiteSettings.findOne({ tenantId }).lean();
  return {
    topBar: s?.topBar?.enabled && s.topBar.text ? { text: s.topBar.text, linkText: s.topBar.linkText || '', url: s.topBar.url || '' } : null,
    stats: await statsOf(tenantId, 'home', true),
  };
}
