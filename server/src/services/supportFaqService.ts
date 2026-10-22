import mongoose from 'mongoose';
import SupportFaq from '../models/SupportFaq';
import SupportFaqVote from '../models/SupportFaqVote';
import SupportSearchLog from '../models/SupportSearchLog';
import { SupportActor, can, pickAllowed, FAQ_STATUSES, FAQ_AUDIENCES, SUPPORT_MODULES, LIMITS, FaqAudience } from '../data/supportPolicy';
import { audit } from './supportAccess';
import { SupportError, RequestCtx, pageOf } from './supportTicketService';
import { redactText } from '../utils/redact';

/**
 * Help Center articles.
 *
 * Members only ever receive PUBLISHED articles written for someone like them: their own
 * institute's or the platform-wide ones (tenantId null), with an audience that is empty or
 * includes theirs. That filter is built here, once, and every member-facing read and the
 * assistant's retrieval (Phase 5) go through it.
 */
const isId = (v: unknown): v is string => typeof v === 'string' && /^[a-f0-9]{24}$/i.test(v);
const oneOf = <T extends string>(list: readonly T[], v: unknown): T | undefined => (list as readonly string[]).includes(String(v)) ? v as T : undefined;
const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export function audienceOf(actor: SupportActor): FaqAudience {
  if (actor.kind === 'coordinator') return 'coordinator';
  if (actor.kind !== 'requester') return 'staff';
  return actor.faculty ? 'faculty' : 'student';
}

/** The filter for articles this person may read. */
export function visibleFaqFilter(actor: SupportActor): Record<string, unknown> {
  return {
    status: 'published',
    tenantId: { $in: [null, new mongoose.Types.ObjectId(actor.tenantId)] },
    $or: [{ audiences: { $size: 0 } }, { audiences: audienceOf(actor) }],
  };
}

export const normalizeQuery = (q: string) => q.toLowerCase().replace(/[^\p{L}\p{N}\s]+/gu, ' ').replace(/\s+/g, ' ').trim().slice(0, 200);

const card = (f: any) => ({ id: String(f._id), question: f.question, category: f.category, module: f.module, snippet: String(f.answer).slice(0, 180) });

export interface FaqHit { id: string; question: string; category: string; module: string; snippet: string; score: number }

/**
 * Ranked search over visible articles: the weighted text index first (question 10, keywords 6,
 * answer 1); when that finds nothing — the text index matches whole words only — a prefix match
 * on the question, so "pass" still finds "password".
 */
export async function searchFaqs(actor: SupportActor, raw: string, opts: { category?: string; module?: string; limit?: number } = {}): Promise<FaqHit[]> {
  const q = String(raw || '').trim().slice(0, 200);
  if (q.length < 2) return [];
  const limit = Math.min(20, Math.max(1, opts.limit || 8));
  const base: any = { ...visibleFaqFilter(actor) };
  if (opts.category) base.category = String(opts.category).slice(0, 60);
  const mod = oneOf(SUPPORT_MODULES, opts.module); if (mod) base.module = mod;

  // $text reads "quoted words" as a required phrase and -word as an exclusion; a member's
  // punctuation must never change what the search means, so both are neutralised.
  const terms = q.replace(/["“”]/g, ' ').replace(/(^|\s)-+/g, '$1').trim();
  const text = !terms ? [] : await SupportFaq.find({ ...base, $text: { $search: terms } }, { score: { $meta: 'textScore' } })
    .sort({ score: { $meta: 'textScore' } }).limit(limit).lean();
  if (text.length) return text.map((f: any) => ({ ...card(f), score: Number(f.score) || 0 }));

  const words = normalizeQuery(q).split(' ').filter(w => w.length >= 3).slice(0, 5);
  if (!words.length) return [];
  const prefix = await SupportFaq.find({ ...base, $and: words.map(w => ({ $or: [{ question: { $regex: `\\b${escapeRegex(w)}`, $options: 'i' } }, { keywords: { $regex: `^${escapeRegex(w)}`, $options: 'i' } }] })) })
    .sort({ helpfulYes: -1 }).limit(limit).lean();
  return prefix.map((f: any) => ({ ...card(f), score: 0.5 }));
}

/** Search and record it (including when nothing was found). Recording never fails the search. */
export async function searchAndLog(actor: SupportActor, raw: string, opts: { category?: string; module?: string; source?: 'help_center' | 'ai_chat' } = {}) {
  const hits = await searchFaqs(actor, raw, opts);
  const query = redactText(String(raw || '').trim()).slice(0, 200);
  if (query.length >= 2) {
    SupportSearchLog.create({
      tenantId: actor.tenantId, userId: actor.userId, query, normalized: normalizeQuery(query) || query.toLowerCase(),
      resultCount: hits.length, topFaqId: hits[0]?.id || null, source: opts.source || 'help_center',
    }).catch(() => undefined);
  }
  return hits;
}

export async function categories(actor: SupportActor) {
  const rows = await SupportFaq.aggregate([
    { $match: visibleFaqFilter(actor) },
    { $group: { _id: '$category', count: { $sum: 1 } } },
    { $sort: { _id: 1 } },
  ]);
  return rows.map(r => ({ category: r._id, count: r.count }));
}

export async function listByCategory(actor: SupportActor, q: any) {
  const { page, limit } = pageOf(q, 50);
  const f: any = { ...visibleFaqFilter(actor) };
  if (q?.category) f.category = String(q.category).slice(0, 60);
  const mod = oneOf(SUPPORT_MODULES, q?.module); if (mod) f.module = mod;
  const [rows, total] = await Promise.all([
    SupportFaq.find(f).sort({ helpfulYes: -1, question: 1 }).skip((page - 1) * limit).limit(limit).lean(),
    SupportFaq.countDocuments(f),
  ]);
  return { articles: rows.map(card), total, page, limit };
}

export async function getFaq(actor: SupportActor, id: unknown) {
  if (!isId(id)) throw new SupportError(404, 'Article not found.');
  const f: any = await SupportFaq.findOneAndUpdate({ _id: id, ...visibleFaqFilter(actor) }, { $inc: { views: 1 } }, { new: true }).lean();
  if (!f) throw new SupportError(404, 'Article not found.');
  const [related, vote] = await Promise.all([
    SupportFaq.find({ ...visibleFaqFilter(actor), _id: { $ne: f._id }, $or: [{ category: f.category }, { module: f.module }] } as any)
      .sort({ helpfulYes: -1 }).limit(5).lean(),
    SupportFaqVote.findOne({ faqId: f._id, userId: actor.userId }).select('helpful').lean(),
  ]);
  return {
    id: String(f._id), question: f.question, answer: f.answer, category: f.category, module: f.module,
    updatedAt: f.updatedAt, myVote: vote ? (vote as any).helpful : null,
    related: related.map(card),
  };
}

/** One vote per person; changing it moves the count rather than adding to it. */
export async function voteFaq(actor: SupportActor, id: unknown, body: unknown) {
  if (!isId(id)) throw new SupportError(404, 'Article not found.');
  const helpful = pickAllowed(body, ['helpful'] as const).helpful;
  if (typeof helpful !== 'boolean') throw new SupportError(400, 'Say whether it helped.');
  const exists = await SupportFaq.exists({ _id: id, ...visibleFaqFilter(actor) });
  if (!exists) throw new SupportError(404, 'Article not found.');
  const prev: any = await SupportFaqVote.findOneAndUpdate(
    { faqId: id, userId: actor.userId }, { $set: { helpful } }, { upsert: true, new: false },
  ).lean();
  const inc: Record<string, number> = {};
  if (!prev) inc[helpful ? 'helpfulYes' : 'helpfulNo'] = 1;
  else if (prev.helpful !== helpful) { inc[helpful ? 'helpfulYes' : 'helpfulNo'] = 1; inc[helpful ? 'helpfulNo' : 'helpfulYes'] = -1; }
  if (Object.keys(inc).length) await SupportFaq.updateOne({ _id: id }, { $inc: inc });
  return { helpful };
}

// ── Managing articles ────────────────────────────────────────────────────────

/**
 * Which articles a manager may edit: the support HQ edits the platform-wide ones and any
 * institute's; an institute's own manager edits only that institute's.
 */
export function manageScope(actor: SupportActor): Record<string, unknown> {
  if (!can(actor, 'manage')) throw new SupportError(403, 'You do not have access to this.');
  return actor.allTenants ? {} : { tenantId: new mongoose.Types.ObjectId(actor.tenantId) };
}

const FAQ_FIELDS = ['question', 'answer', 'category', 'module', 'audiences', 'keywords', 'needsOwnerReview', 'platformWide'] as const;

function cleanFaqInput(body: unknown, partial: boolean) {
  const b = pickAllowed(body, FAQ_FIELDS);
  const out: Record<string, unknown> = {};
  const text = (v: unknown, max: number) => String(v ?? '').replace(/\u0000/g, '').trim().slice(0, max + 1);
  if (b.question !== undefined || !partial) {
    const q = text(b.question, LIMITS.faqQuestion);
    if (q.length < 5 || q.length > LIMITS.faqQuestion) throw new SupportError(400, `The question needs 5 to ${LIMITS.faqQuestion} characters.`);
    out.question = q;
  }
  if (b.answer !== undefined || !partial) {
    const a = text(b.answer, LIMITS.faqAnswer);
    if (!a || a.length > LIMITS.faqAnswer) throw new SupportError(400, 'The answer is empty or too long.');
    out.answer = a;
  }
  if (b.category !== undefined || !partial) {
    const c = text(b.category, 60);
    if (!c || c.length > 60) throw new SupportError(400, 'Choose a category.');
    out.category = c;
  }
  if (b.module !== undefined) out.module = oneOf(SUPPORT_MODULES, b.module) || 'other';
  if (b.audiences !== undefined) {
    if (!Array.isArray(b.audiences)) throw new SupportError(400, 'Audiences must be a list.');
    out.audiences = [...new Set(b.audiences.map(String))].filter(a => (FAQ_AUDIENCES as readonly string[]).includes(a));
  }
  if (b.keywords !== undefined) {
    const list = Array.isArray(b.keywords) ? b.keywords : String(b.keywords).split(',');
    out.keywords = [...new Set(list.map(k => String(k).trim().toLowerCase().slice(0, 40)).filter(Boolean))].slice(0, 30);
  }
  if (b.needsOwnerReview !== undefined) out.needsOwnerReview = b.needsOwnerReview === true;
  return { fields: out, platformWide: b.platformWide === true };
}

const adminView = (f: any) => ({
  id: String(f._id), question: f.question, answer: f.answer, category: f.category, module: f.module,
  audiences: f.audiences, keywords: f.keywords, status: f.status, needsOwnerReview: f.needsOwnerReview,
  platformWide: f.tenantId == null, tenantId: f.tenantId ? String(f.tenantId) : null,
  views: f.views, helpfulYes: f.helpfulYes, helpfulNo: f.helpfulNo, publishedAt: f.publishedAt, updatedAt: f.updatedAt,
});

export async function adminList(actor: SupportActor, q: any) {
  const { page, limit } = pageOf(q, 100);
  const f: any = { ...manageScope(actor) };
  const st = oneOf(FAQ_STATUSES, q?.status); if (st) f.status = st;
  if (q?.category) f.category = String(q.category).slice(0, 60);
  if (q?.review === 'true') f.needsOwnerReview = true;
  const search = String(q?.q ?? '').trim().slice(0, 100);
  if (search) f.question = { $regex: escapeRegex(search), $options: 'i' };
  const [rows, total] = await Promise.all([
    SupportFaq.find(f).sort({ updatedAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    SupportFaq.countDocuments(f),
  ]);
  return { articles: rows.map(adminView), total, page, limit };
}

export async function adminCreate(actor: SupportActor, body: unknown, ctx: RequestCtx) {
  manageScope(actor);
  const { fields, platformWide } = cleanFaqInput(body, false);
  if (platformWide && !actor.allTenants) throw new SupportError(403, 'Only the support HQ can write articles for every institute.');
  const f = await SupportFaq.create({
    ...fields, tenantId: platformWide ? null : actor.tenantId, status: 'draft',
    needsOwnerReview: fields.needsOwnerReview ?? true, createdBy: actor.userId, updatedBy: actor.userId,
  });
  await audit({ actor, entity: 'faq', entityId: f._id, tenantId: f.tenantId, action: 'created', requestId: ctx.requestId });
  return adminView(f.toObject());
}

async function loadManaged(actor: SupportActor, id: unknown) {
  if (!isId(id)) throw new SupportError(404, 'Article not found.');
  const f = await SupportFaq.findOne({ _id: id, ...manageScope(actor) });
  if (!f) throw new SupportError(404, 'Article not found.');
  return f;
}

export async function adminUpdate(actor: SupportActor, id: unknown, body: unknown, ctx: RequestCtx) {
  const f = await loadManaged(actor, id);
  const { fields } = cleanFaqInput(body, true);
  Object.assign(f, fields, { updatedBy: actor.userId });
  // Editing a published article's answer sends it back for review only if the editor says so.
  try { await f.save(); } catch (e: any) { throw new SupportError(400, e?.errors?.status?.message || 'The article could not be saved.'); }
  await audit({ actor, entity: 'faq', entityId: f._id, tenantId: f.tenantId, action: 'edited', requestId: ctx.requestId, changes: Object.fromEntries(Object.keys(fields).map(k => [k, {}])) });
  return adminView(f.toObject());
}

/**
 * Draft → published → archived, and back. Publishing needs the review box cleared: placeholder
 * articles start "needs owner review" and cannot reach a member until someone has checked them.
 */
export async function adminSetStatus(actor: SupportActor, id: unknown, body: unknown, ctx: RequestCtx) {
  const f = await loadManaged(actor, id);
  const b = pickAllowed(body, ['status', 'reviewed'] as const);
  const to = oneOf(FAQ_STATUSES, b.status);
  if (!to) throw new SupportError(400, 'Unknown status.');
  if (b.reviewed === true) f.needsOwnerReview = false;
  if (to === 'published' && f.needsOwnerReview) throw new SupportError(409, 'Mark the article as reviewed before publishing it.', 'NEEDS_REVIEW');
  const from = f.status;
  f.status = to;
  if (to === 'published' && from !== 'published') f.publishedAt = new Date();
  f.updatedBy = actor.userId as any;
  await f.save();
  await audit({ actor, entity: 'faq', entityId: f._id, tenantId: f.tenantId, action: 'status', requestId: ctx.requestId, changes: { status: { from, to } } });
  return adminView(f.toObject());
}

/** What the FAQ list is missing and which articles are not helping. */
export async function adminInsights(actor: SupportActor, q: any) {
  const scope = manageScope(actor);
  const days = Math.min(365, Math.max(1, Number.parseInt(String(q?.days ?? '30'), 10) || 30));
  const since = new Date(Date.now() - days * 86_400_000);
  const logScope: any = scope.tenantId ? { tenantId: scope.tenantId } : {};
  const [unanswered, lowRated] = await Promise.all([
    SupportSearchLog.aggregate([
      { $match: { ...logScope, resultCount: 0, createdAt: { $gte: since } } },
      { $group: { _id: '$normalized', example: { $last: '$query' }, count: { $sum: 1 }, people: { $addToSet: '$userId' }, last: { $max: '$createdAt' } } },
      { $project: { _id: 0, query: '$example', count: 1, people: { $size: '$people' }, last: 1 } },
      { $sort: { count: -1, last: -1 } },
      { $limit: 25 },
    ]),
    SupportFaq.find({ ...scope, status: 'published', $expr: { $and: [{ $gte: [{ $add: ['$helpfulYes', '$helpfulNo'] }, 3] }, { $gt: ['$helpfulNo', '$helpfulYes'] }] } })
      .sort({ helpfulNo: -1 }).limit(25).lean(),
  ]);
  return { days, unanswered, lowRated: lowRated.map(adminView) };
}
