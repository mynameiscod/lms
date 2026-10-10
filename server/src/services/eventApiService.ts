import mongoose from 'mongoose';
import crypto from 'crypto';
import EventCollection, { IEventCollection, IEventLibraryField, EVENT_FIELD_TYPES } from '../models/EventCollection';
import EventApi, { IEventApi, IEventApiField } from '../models/EventApi';
import EventSubmission from '../models/EventSubmission';
import Tenant from '../models/Tenant';
import {
  EventApiError, apiNameProblem, cleanLibraryField, contactOf, csvCell, openState, resolveEventFields,
  slugify, validateSubmission, HONEYPOT_KEY, UTM_KEYS, MAX_FIELDS,
} from '../data/eventApiPolicy';

/**
 * Event APIs — an admin names a collection, an event, its API name, its fields and its closing
 * date; the website then reads the fields and posts registrations to one public address.
 *
 * Registrations are stored in `eventsubmissions`, never in users or leads.
 */

export { EventApiError };

const oid = (id: unknown, what = 'Not found') => {
  if (!mongoose.Types.ObjectId.isValid(String(id))) throw new EventApiError(what, 404, 'NOT_FOUND');
  return new mongoose.Types.ObjectId(String(id));
};

/* ── Collections ──────────────────────────────────────────────────────────────────────────── */

async function loadCollection(tenantId: string, id: unknown): Promise<IEventCollection> {
  const c = await EventCollection.findOne({ _id: oid(id, 'Collection not found'), tenantId });
  if (!c) throw new EventApiError('Collection not found', 404, 'NOT_FOUND');
  return c;
}

/** Keys in this collection that cannot change type or be removed: some row already holds data for them. */
async function keysWithData(tenantId: string, collectionId: mongoose.Types.ObjectId, keys: string[]): Promise<Set<string>> {
  const used = new Set<string>();
  for (const k of keys) {
    if (await EventSubmission.exists({ tenantId, collectionId, [`data.${k}`]: { $exists: true } })) used.add(k);
  }
  return used;
}

/**
 * Merge new or edited fields into a collection's library.
 *
 * A field with data keeps its key and type for good; its label, options and help text may still
 * change. Fields are never deleted from a library here — removing one from an event only stops
 * that event asking it.
 */
async function mergeLibrary(tenantId: string, c: IEventCollection, incoming: any[]): Promise<boolean> {
  if (!Array.isArray(incoming) || !incoming.length) return false;
  const cleaned = incoming.map(cleanLibraryField);
  const seen = new Set<string>();
  for (const f of cleaned) {
    if (seen.has(f.key)) throw new EventApiError(`Two fields use the key "${f.key}". Each field needs its own key.`);
    seen.add(f.key);
  }
  const existing = new Map(c.fields.map((f) => [f.key, f]));
  const typeChanges = cleaned.filter((f) => existing.has(f.key) && existing.get(f.key)!.type !== f.type).map((f) => f.key);
  if (typeChanges.length) {
    const locked = await keysWithData(tenantId, c._id as any, typeChanges);
    if (locked.size) throw new EventApiError(`"${[...locked][0]}" already has registrations, so its type cannot change. Add a new field instead.`);
  }
  let changed = false;
  for (const f of cleaned) {
    const prev = existing.get(f.key);
    if (!prev || JSON.stringify(prev) !== JSON.stringify(f)) { existing.set(f.key, f); changed = true; }
  }
  if (existing.size > MAX_FIELDS) throw new EventApiError(`A collection can hold at most ${MAX_FIELDS} fields.`);
  if (changed) c.fields = [...existing.values()] as any;
  return changed;
}

export async function listCollections(tenantId: string) {
  const cols = await EventCollection.find({ tenantId }).sort({ updatedAt: -1 }).lean();
  const ids = cols.map((c) => c._id);
  const [events, subs] = await Promise.all([
    EventApi.aggregate([{ $match: { tenantId, collectionId: { $in: ids } } }, { $group: { _id: '$collectionId', n: { $sum: 1 } } }]),
    EventSubmission.aggregate([{ $match: { tenantId, collectionId: { $in: ids } } }, { $group: { _id: '$collectionId', n: { $sum: 1 } } }]),
  ]);
  const ev = new Map(events.map((e: any) => [String(e._id), e.n]));
  const sb = new Map(subs.map((e: any) => [String(e._id), e.n]));
  return cols.map((c) => ({ ...c, eventCount: ev.get(String(c._id)) || 0, submissionCount: sb.get(String(c._id)) || 0 }));
}

export async function createCollection(tenantId: string, userId: string, body: any) {
  const name = String(body?.name ?? '').trim().slice(0, 80);
  if (!name) throw new EventApiError('Give the collection a name.');
  if (await EventCollection.exists({ tenantId, nameKey: name.toLowerCase() })) {
    throw new EventApiError(`A collection called "${name}" already exists. Choose it from the list instead.`, 409, 'DUPLICATE');
  }
  const c = new EventCollection({ tenantId, name, nameKey: name.toLowerCase(), description: String(body?.description ?? '').trim().slice(0, 500), fields: [], createdBy: userId, updatedBy: userId });
  await mergeLibrary(tenantId, c, body?.fields || []);
  await c.save();
  return c.toObject();
}

export async function updateCollection(tenantId: string, userId: string, id: string, body: any) {
  const c = await loadCollection(tenantId, id);
  if (body?.name !== undefined) {
    const name = String(body.name).trim().slice(0, 80);
    if (!name) throw new EventApiError('Give the collection a name.');
    if (name.toLowerCase() !== c.nameKey && await EventCollection.exists({ tenantId, nameKey: name.toLowerCase() })) {
      throw new EventApiError(`A collection called "${name}" already exists.`, 409, 'DUPLICATE');
    }
    c.name = name; c.nameKey = name.toLowerCase();
  }
  if (body?.description !== undefined) c.description = String(body.description).trim().slice(0, 500);
  await mergeLibrary(tenantId, c, body?.fields || []);
  c.updatedBy = userId;
  await c.save();
  return c.toObject();
}

/* ── Events ───────────────────────────────────────────────────────────────────────────────── */

const toDate = (v: unknown, what: string, required: boolean): Date | null => {
  if (v === undefined || v === null || v === '') {
    if (required) throw new EventApiError(`Set the ${what}.`);
    return null;
  }
  const d = new Date(String(v));
  if (Number.isNaN(d.getTime())) throw new EventApiError(`The ${what} is not a valid date.`);
  return d;
};

/** The event's field picks, checked against its collection's library. */
function cleanPicks(library: IEventLibraryField[], raw: any, previous?: IEventApiField[], locked = false): IEventApiField[] {
  const known = new Set(library.map((f) => f.key));
  const picks: IEventApiField[] = [];
  const seen = new Set<string>();
  for (const p of Array.isArray(raw) ? raw : []) {
    const key = String(p?.key ?? '').trim();
    if (!known.has(key)) throw new EventApiError(`"${key}" is not a field in this collection.`);
    if (seen.has(key)) continue;
    seen.add(key);
    const label = String(p?.label ?? '').trim().slice(0, 120);
    picks.push({ key, required: !!p?.required, hidden: !!p?.hidden, ...(label ? { label } : {}) });
  }
  if (!picks.filter((p) => !p.hidden).length) throw new EventApiError('Pick at least one field for this event.');
  if (locked && previous) {
    // Once registrations exist a field stays on the event; it may be hidden, never dropped.
    for (const old of previous) {
      if (!seen.has(old.key)) picks.push({ ...old, hidden: true });
    }
  }
  return picks;
}

async function resolveCollectionFor(tenantId: string, userId: string, body: any): Promise<IEventCollection> {
  if (body?.collectionId) return loadCollection(tenantId, body.collectionId);
  if (body?.newCollectionName) {
    const created = await createCollection(tenantId, userId, { name: body.newCollectionName });
    return loadCollection(tenantId, created._id);
  }
  throw new EventApiError('Choose a collection, or create a new one.');
}

export async function createEvent(tenantId: string, userId: string, body: any) {
  const eventName = String(body?.eventName ?? '').trim().slice(0, 120);
  if (!eventName) throw new EventApiError('Give the event a name.');
  const apiName = String(body?.apiName ?? '').trim().toLowerCase() || slugify(eventName);
  const bad = apiNameProblem(apiName);
  if (bad) throw new EventApiError(bad);
  if (await EventApi.exists({ tenantId, apiName })) throw new EventApiError(`The API name "${apiName}" is already used. Choose another.`, 409, 'DUPLICATE');
  const closesAt = toDate(body?.closesAt, 'closing date', true)!;
  const opensAt = toDate(body?.opensAt, 'opening date', false);
  if (opensAt && opensAt >= closesAt) throw new EventApiError('The opening date must be before the closing date.');

  const c = await resolveCollectionFor(tenantId, userId, body);
  if (await mergeLibrary(tenantId, c, body?.newFields || [])) { c.updatedBy = userId; await c.save(); }
  const fields = cleanPicks(c.fields, body?.fields);

  const ev = await EventApi.create({
    tenantId, collectionId: c._id, eventName, apiName,
    description: String(body?.description ?? '').trim().slice(0, 1000),
    opensAt, closesAt, status: body?.status === 'paused' ? 'paused' : 'live',
    fields, onePerPhone: !!body?.onePerPhone,
    successMessage: String(body?.successMessage ?? '').trim().slice(0, 300),
    createdBy: userId, updatedBy: userId,
  });
  return ev.toObject();
}

async function loadEvent(tenantId: string, id: unknown): Promise<IEventApi> {
  const ev = await EventApi.findOne({ _id: oid(id, 'Event not found'), tenantId });
  if (!ev) throw new EventApiError('Event not found', 404, 'NOT_FOUND');
  return ev;
}

export async function updateEvent(tenantId: string, userId: string, id: string, body: any) {
  const ev = await loadEvent(tenantId, id);
  const hasData = ev.submissionCount > 0 || !!(await EventSubmission.exists({ tenantId, eventApiId: ev._id }));

  if (body?.eventName !== undefined) {
    const n = String(body.eventName).trim().slice(0, 120);
    if (!n) throw new EventApiError('Give the event a name.');
    ev.eventName = n;
  }
  if (body?.apiName !== undefined && String(body.apiName).trim().toLowerCase() !== ev.apiName) {
    if (hasData) throw new EventApiError('This event already has registrations, so its API name cannot change — the website would stop working.', 409, 'LOCKED');
    const apiName = String(body.apiName).trim().toLowerCase();
    const bad = apiNameProblem(apiName);
    if (bad) throw new EventApiError(bad);
    if (await EventApi.exists({ tenantId, apiName, _id: { $ne: ev._id } })) throw new EventApiError(`The API name "${apiName}" is already used.`, 409, 'DUPLICATE');
    ev.apiName = apiName;
  }
  if (body?.collectionId !== undefined && String(body.collectionId) !== String(ev.collectionId)) {
    throw new EventApiError('An event cannot move to another collection. Create a new event instead.', 409, 'LOCKED');
  }
  if (body?.closesAt !== undefined) ev.closesAt = toDate(body.closesAt, 'closing date', true)!;
  if (body?.opensAt !== undefined) ev.opensAt = toDate(body.opensAt, 'opening date', false);
  if (ev.opensAt && ev.opensAt >= ev.closesAt) throw new EventApiError('The opening date must be before the closing date.');
  if (body?.description !== undefined) ev.description = String(body.description).trim().slice(0, 1000);
  if (body?.successMessage !== undefined) ev.successMessage = String(body.successMessage).trim().slice(0, 300);
  if (body?.onePerPhone !== undefined) ev.onePerPhone = !!body.onePerPhone;
  if (body?.status === 'live' || body?.status === 'paused') ev.status = body.status;

  const c = await loadCollection(tenantId, ev.collectionId);
  if (await mergeLibrary(tenantId, c, body?.newFields || [])) { c.updatedBy = userId; await c.save(); }
  if (body?.fields !== undefined) ev.fields = cleanPicks(c.fields, body.fields, ev.fields, hasData) as any;

  ev.updatedBy = userId;
  await ev.save();
  return ev.toObject();
}

export async function setEventStatus(tenantId: string, userId: string, id: string, status: unknown) {
  if (status !== 'live' && status !== 'paused') throw new EventApiError('Status must be live or paused.');
  const ev = await loadEvent(tenantId, id);
  ev.status = status; ev.updatedBy = userId;
  await ev.save();
  return ev.toObject();
}

export async function listEvents(tenantId: string, q: { collectionId?: string } = {}) {
  const filter: any = { tenantId };
  if (q.collectionId) filter.collectionId = oid(q.collectionId, 'Collection not found');
  const events = await EventApi.find(filter).sort({ createdAt: -1 }).lean();
  const cols = await EventCollection.find({ tenantId, _id: { $in: [...new Set(events.map((e) => String(e.collectionId)))] } }).select('name').lean();
  const name = new Map(cols.map((c) => [String(c._id), c.name]));
  const now = new Date();
  return events.map((e) => ({ ...e, collectionName: name.get(String(e.collectionId)) || '', state: openState(e, now) }));
}

export async function getEvent(tenantId: string, id: string) {
  const ev = await loadEvent(tenantId, id);
  const c = await loadCollection(tenantId, ev.collectionId);
  return { event: { ...ev.toObject(), state: openState(ev) }, collection: c.toObject() };
}

/* ── Public: what the website calls ───────────────────────────────────────────────────────── */

export async function tenantBySlug(slug: string): Promise<string | null> {
  const s = String(slug || '').trim().toLowerCase();
  if (!/^[a-z0-9-]{1,80}$/.test(s)) return null;
  const t: any = await Tenant.findOne({ slug: s, isActive: true }).select('_id').lean();
  return t ? String(t._id) : null;
}

async function publicEvent(tenantId: string, apiName: string) {
  const ev = await EventApi.findOne({ tenantId, apiName: String(apiName || '').trim().toLowerCase() }).lean();
  if (!ev) throw new EventApiError('No event with this API name.', 404, 'NOT_FOUND');
  const c = await EventCollection.findOne({ _id: ev.collectionId, tenantId }).select('fields').lean();
  return { ev, fields: resolveEventFields((c?.fields || []) as any, ev.fields as any) };
}

const publicShape = (ev: any) => ({
  name: ev.eventName,
  apiName: ev.apiName,
  description: ev.description || '',
  opensAt: ev.opensAt || null,
  closesAt: ev.closesAt,
  status: openState(ev),
});

export async function publicList(tenantId: string) {
  const now = new Date();
  const events = await EventApi.find({ tenantId, status: 'live', closesAt: { $gt: now } }).sort({ closesAt: 1 }).limit(100).lean();
  return events.map(publicShape);
}

export async function publicForm(tenantId: string, apiName: string) {
  const { ev, fields } = await publicEvent(tenantId, apiName);
  return {
    event: { ...publicShape(ev), successMessage: ev.successMessage || 'Thank you — your registration has been received.' },
    fields: fields.map((f) => ({
      key: f.key, label: f.label, type: f.type, required: f.required,
      ...(f.options?.length ? { options: f.options } : {}),
      ...(f.placeholder ? { placeholder: f.placeholder } : {}),
      ...(f.helpText ? { helpText: f.helpText } : {}),
    })),
  };
}

const STATE_REFUSAL: Record<string, [number, string, string]> = {
  closed: [403, 'EVENT_CLOSED', 'Registrations for this event are closed.'],
  not_yet_open: [403, 'EVENT_NOT_OPEN', 'Registrations for this event have not opened yet.'],
  paused: [403, 'EVENT_PAUSED', 'Registrations for this event are paused for now.'],
};

const hashIp = (ip: string) => (ip ? crypto.createHash('sha256').update(`event-api:${ip}`).digest('hex').slice(0, 32) : undefined);

export async function publicSubmit(tenantId: string, apiName: string, body: any, meta: { ip?: string; userAgent?: string; referrer?: string }) {
  const { ev, fields } = await publicEvent(tenantId, apiName);
  const state = openState(ev);
  if (state !== 'open') {
    const [status, code, message] = STATE_REFUSAL[state];
    throw new EventApiError(message, status, code);
  }
  const src = body && typeof body === 'object' && !Array.isArray(body) ? body : {};

  // A bot filled the hidden field: answer as if it worked, store nothing.
  if (String(src[HONEYPOT_KEY] ?? '').trim()) {
    return { id: null, message: ev.successMessage || 'Thank you — your registration has been received.' };
  }

  const { data, errors } = validateSubmission(fields, src);
  if (Object.keys(errors).length) throw new EventApiError('Please correct the highlighted fields.', 400, 'VALIDATION_FAILED', errors);

  const contact = contactOf(fields, data);
  if (ev.onePerPhone && !contact.phone) {
    throw new EventApiError('A mobile number is needed to register for this event.', 400, 'VALIDATION_FAILED');
  }
  const utm: Record<string, string> = {};
  for (const k of UTM_KEYS) {
    const v = String(src[k] ?? '').trim().slice(0, 200);
    if (v) utm[k.replace('utm_', '')] = v;
  }

  try {
    const row = await EventSubmission.create({
      tenantId, collectionId: ev.collectionId, eventApiId: ev._id, apiName: ev.apiName, eventName: ev.eventName,
      data, fieldKeys: fields.map((f) => f.key), contact,
      ...(ev.onePerPhone && contact.phone ? { dedupeKey: contact.phone } : {}),
      meta: {
        ip: hashIp(meta.ip || ''),
        userAgent: String(meta.userAgent || '').slice(0, 300),
        referrer: String(meta.referrer || '').slice(0, 500),
        ...(Object.keys(utm).length ? { utm } : {}),
      },
    });
    await EventApi.updateOne({ _id: ev._id }, { $inc: { submissionCount: 1 }, $set: { lastSubmissionAt: new Date() } });
    return { id: String(row._id), message: ev.successMessage || 'Thank you — your registration has been received.' };
  } catch (e: any) {
    if (e?.code === 11000) throw new EventApiError('This mobile number is already registered for this event.', 409, 'DUPLICATE');
    throw e;
  }
}

/* ── Admin: the registrations ─────────────────────────────────────────────────────────────── */

export interface SubmissionQuery {
  collectionId?: string;
  eventApiId?: string;
  q?: string;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
}

async function submissionFilter(tenantId: string, q: SubmissionQuery) {
  if (!q.collectionId && !q.eventApiId) throw new EventApiError('Choose a collection.');
  const filter: any = { tenantId };
  if (q.collectionId) filter.collectionId = oid(q.collectionId, 'Collection not found');
  if (q.eventApiId) filter.eventApiId = oid(q.eventApiId, 'Event not found');
  if (q.from || q.to) {
    filter.createdAt = {};
    if (q.from && !Number.isNaN(new Date(q.from).getTime())) filter.createdAt.$gte = new Date(q.from);
    if (q.to && !Number.isNaN(new Date(q.to).getTime())) filter.createdAt.$lte = new Date(q.to);
  }
  const term = String(q.q || '').trim().slice(0, 80);
  if (term) {
    const rx = new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    const digits = term.replace(/\D/g, '');
    filter.$or = [{ 'contact.name': rx }, { 'contact.email': rx }, ...(digits.length >= 4 ? [{ 'contact.phone': new RegExp(digits) }] : [])];
  }
  return filter;
}

/**
 * The columns for what is being looked at: one event's own fields in its order, or — across a
 * whole collection — every field any of its events asks, in library order.
 */
async function columnsFor(tenantId: string, q: SubmissionQuery) {
  if (q.eventApiId) {
    const ev = await loadEvent(tenantId, q.eventApiId);
    const c = await loadCollection(tenantId, ev.collectionId);
    const byKey = new Map(c.fields.map((f) => [f.key, f]));
    return ev.fields.filter((p) => byKey.has(p.key)).map((p) => ({ key: p.key, label: p.label || byKey.get(p.key)!.label, type: byKey.get(p.key)!.type }));
  }
  const c = await loadCollection(tenantId, q.collectionId);
  const events = await EventApi.find({ tenantId, collectionId: c._id }).select('fields').lean();
  const used = new Set(events.flatMap((e) => (e.fields || []).map((f: any) => f.key)));
  return c.fields.filter((f) => used.has(f.key)).map((f) => ({ key: f.key, label: f.label, type: f.type }));
}

export async function listSubmissions(tenantId: string, q: SubmissionQuery) {
  const filter = await submissionFilter(tenantId, q);
  const limit = Math.min(100, Math.max(1, Number(q.limit) || 25));
  const page = Math.max(1, Number(q.page) || 1);
  const [rows, total, columns] = await Promise.all([
    EventSubmission.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit)
      .select('eventApiId eventName apiName data contact meta.utm createdAt').lean(),
    EventSubmission.countDocuments(filter),
    columnsFor(tenantId, q),
  ]);
  return { columns, rows, total, page, pages: Math.max(1, Math.ceil(total / limit)), limit };
}

const IST = new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true });

/** The same rows as a CSV file, streamed a batch at a time so a large event does not load into memory at once. */
export async function* exportSubmissions(tenantId: string, q: SubmissionQuery): AsyncGenerator<string> {
  const filter = await submissionFilter(tenantId, q);
  const columns = await columnsFor(tenantId, q);
  yield '﻿' + ['Submitted (IST)', 'Event', ...columns.map((c) => c.label), 'UTM source', 'UTM campaign'].map(csvCell).join(',') + '\r\n';
  const cursor = EventSubmission.find(filter).sort({ createdAt: -1 }).select('eventName data meta.utm createdAt').lean().cursor({ batchSize: 500 });
  for await (const r of cursor as any) {
    yield [IST.format(new Date(r.createdAt)), r.eventName, ...columns.map((c) => r.data?.[c.key]), r.meta?.utm?.source, r.meta?.utm?.campaign]
      .map(csvCell).join(',') + '\r\n';
  }
}

export async function deleteSubmission(tenantId: string, id: string) {
  const row = await EventSubmission.findOneAndDelete({ _id: oid(id, 'Registration not found'), tenantId }).lean();
  if (!row) throw new EventApiError('Registration not found', 404, 'NOT_FOUND');
  await EventApi.updateOne({ _id: row.eventApiId, submissionCount: { $gt: 0 } }, { $inc: { submissionCount: -1 } });
  return { deleted: true };
}

export async function meta(tenantId: string) {
  const t: any = await Tenant.findById(tenantId).select('slug name').lean();
  return { fieldTypes: EVENT_FIELD_TYPES, tenantSlug: t?.slug || '', tenantName: t?.name || '' };
}
