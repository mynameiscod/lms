/**
 * Event APIs — an admin defines a collection, an event, its API name, fields and closing date;
 * the website reads the fields and posts registrations. Real database, real public routes.
 */
import express from 'express';
import mongoose from 'mongoose';
import request from 'supertest';
import { startMongo, stopMongo, clearCollections } from './mongoHarness';

jest.setTimeout(180_000);

import Tenant from '../../models/Tenant';
import EventSubmission from '../../models/EventSubmission';
import EventApi from '../../models/EventApi';
import EventCollection from '../../models/EventCollection';
import * as svc from '../../services/eventApiService';
import { publicEventRoutes } from '../../routes/eventApiRoutes';
import { validateSubmission, normalizePhone, csvCell, slugify, openState, contactOf, resolveEventFields } from '../../data/eventApiPolicy';
import { __resetRateLimits } from '../../middleware/rateLimit';

const USER = '507f1f77bcf86cd799439a01';
let T = '';
let OTHER = '';

const app = express();
app.use(express.json());
app.use('/api/v1/public/events', publicEventRoutes);

const days = (n: number) => new Date(Date.now() + n * 86_400_000).toISOString();

const LIBRARY = [
  { label: 'Full name', key: 'name', type: 'text' },
  { label: 'Mobile', key: 'phone', type: 'phone' },
  { label: 'Email', key: 'email', type: 'email' },
  { label: 'College', key: 'college', type: 'text' },
  { label: 'Year', key: 'year', type: 'select', options: ['1st', '2nd', '3rd', '4th'] },
  { label: 'Bring a laptop?', key: 'laptop', type: 'checkbox' },
];

async function workshop(extra: any = {}) {
  return svc.createEvent(T, USER, {
    newCollectionName: 'Workshops 2026', newFields: LIBRARY,
    eventName: 'Java Workshop – Nov 2026', closesAt: days(10),
    fields: [{ key: 'name', required: true }, { key: 'phone', required: true }, { key: 'college' }, { key: 'year', required: true }],
    ...extra,
  });
}

beforeAll(async () => {
  await startMongo();
});
afterAll(stopMongo);
beforeEach(async () => {
  await clearCollections();
  __resetRateLimits();
  await Promise.all([EventApi.syncIndexes(), EventSubmission.syncIndexes(), EventCollection.syncIndexes()]);
  T = String((await Tenant.create({ name: 'CodeBegun', slug: 'codebegun', domain: 'codebegun.com', isActive: true, adminId: new mongoose.Types.ObjectId() } as any))._id);
  OTHER = String((await Tenant.create({ name: 'Other College', slug: 'other', domain: 'other.edu', isActive: true, adminId: new mongoose.Types.ObjectId() } as any))._id);
});

describe('rules', () => {
  it('reads Indian mobiles however they are typed', () => {
    expect(normalizePhone('98765 43210')).toBe('+919876543210');
    expect(normalizePhone('+91-98765-43210')).toBe('+919876543210');
    expect(normalizePhone('09876543210')).toBe('+919876543210');
    expect(normalizePhone('12345')).toBeNull();
    expect(normalizePhone('5876543210')).toBeNull();
  });
  it('makes an API name from the event name', () => {
    expect(slugify('Java Workshop – Nov 2026')).toBe('java-workshop-nov-2026');
  });
  it('defuses spreadsheet formulas in exported text', () => {
    expect(csvCell('=HYPERLINK("x")')).toBe(`"'=HYPERLINK(""x"")"`);
    expect(csvCell(-5)).toBe('"-5"');
    expect(csvCell(['a', 'b'])).toBe('"a; b"');
  });
  it('knows when an event is open', () => {
    const now = new Date('2026-10-10T10:00:00Z');
    expect(openState({ status: 'live', closesAt: new Date('2026-10-11') }, now)).toBe('open');
    expect(openState({ status: 'live', closesAt: new Date('2026-10-09') }, now)).toBe('closed');
    expect(openState({ status: 'live', opensAt: new Date('2026-10-12'), closesAt: new Date('2026-10-20') }, now)).toBe('not_yet_open');
    expect(openState({ status: 'paused', closesAt: new Date('2026-10-20') }, now)).toBe('paused');
  });
  it('returns every problem at once, keyed by field', () => {
    const fields = resolveEventFields(LIBRARY as any, [{ key: 'name', required: true }, { key: 'phone', required: true }, { key: 'email', required: false }, { key: 'year', required: true }] as any);
    const { errors } = validateSubmission(fields, { phone: '123', email: 'nope', year: '9th' });
    expect(Object.keys(errors).sort()).toEqual(['email', 'name', 'phone', 'year']);
    const ok = validateSubmission(fields, { name: ' Ravi ', phone: '9876543210', year: '3rd', extra: 'ignored' });
    expect(ok.errors).toEqual({});
    expect(ok.data).toEqual({ name: 'Ravi', phone: '+919876543210', year: '3rd' });
    expect(contactOf(fields, ok.data)).toEqual({ name: 'Ravi', phone: '+919876543210' });
  });
});

describe('admin: collections and events', () => {
  it('creates a collection with its field library and an event that picks from it', async () => {
    const ev = await workshop();
    expect(ev.apiName).toBe('java-workshop-nov-2026');
    const [col] = await svc.listCollections(T);
    expect(col.name).toBe('Workshops 2026');
    expect(col.fields.map((f: any) => f.key)).toEqual(LIBRARY.map((f) => f.key));
    expect(col.eventCount).toBe(1);
  });

  it('refuses a duplicate API name and a duplicate collection name', async () => {
    await workshop();
    await expect(workshop({ newCollectionName: 'Another' })).rejects.toThrow(/already used/);
    await expect(svc.createCollection(T, USER, { name: 'workshops 2026' })).rejects.toThrow(/already exists/);
  });

  it('lets the same API name exist in another institute', async () => {
    await workshop();
    const T0 = T; T = OTHER;
    await expect(workshop()).resolves.toBeTruthy();
    T = T0;
  });

  it('refuses a closing date before the opening date and fields outside the library', async () => {
    await expect(workshop({ opensAt: days(5), closesAt: days(2) })).rejects.toThrow(/before the closing/);
    await expect(workshop({ apiName: 'x-1', fields: [{ key: 'shoe_size' }] })).rejects.toThrow(/not a field/);
  });

  it('never lets another institute read or edit an event', async () => {
    const ev = await workshop();
    await expect(svc.getEvent(OTHER, String(ev._id))).rejects.toThrow(/not found/);
    await expect(svc.updateEvent(OTHER, USER, String(ev._id), { eventName: 'x' })).rejects.toThrow(/not found/);
    await expect(svc.listSubmissions(OTHER, { eventApiId: String(ev._id) })).rejects.toThrow(/not found/);
  });
});

describe('the website: list, form, register', () => {
  it('lists live events and serves one event\'s own fields, in its order', async () => {
    await workshop({ fields: [{ key: 'phone', required: true, label: 'WhatsApp number' }, { key: 'name', required: true }] });
    const list = await request(app).get('/api/v1/public/events/codebegun');
    expect(list.status).toBe(200);
    expect(list.body.data).toEqual([expect.objectContaining({ apiName: 'java-workshop-nov-2026', status: 'open' })]);

    const form = await request(app).get('/api/v1/public/events/codebegun/java-workshop-nov-2026');
    expect(form.status).toBe(200);
    expect(form.headers['cache-control']).toMatch(/max-age=60/);
    expect(form.body.data.fields).toEqual([
      { key: 'phone', label: 'WhatsApp number', type: 'phone', required: true },
      { key: 'name', label: 'Full name', type: 'text', required: true },
    ]);
  });

  it('stores a valid registration and returns per-field errors for a bad one', async () => {
    const ev = await workshop();
    const url = '/api/v1/public/events/codebegun/java-workshop-nov-2026';

    const bad = await request(app).post(url).send({ name: '', phone: '42', year: '7th' });
    expect(bad.status).toBe(400);
    expect(bad.body).toMatchObject({ success: false, code: 'VALIDATION_FAILED' });
    expect(Object.keys(bad.body.errors).sort()).toEqual(['name', 'phone', 'year']);

    const ok = await request(app).post(url).send({ name: 'Ravi Kumar', phone: '98765 43210', college: 'JNTU', year: '3rd', utm_source: 'instagram', tenantId: OTHER });
    expect(ok.status).toBe(201);
    expect(ok.body.data.id).toBeTruthy();

    const rows = await EventSubmission.find({}).lean() as any[];
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      tenantId: T, apiName: 'java-workshop-nov-2026',
      data: { name: 'Ravi Kumar', phone: '+919876543210', college: 'JNTU', year: '3rd' },
      contact: { name: 'Ravi Kumar', phone: '+919876543210' },
      meta: { utm: { source: 'instagram' } },
    });
    expect(rows[0].data.tenantId).toBeUndefined();
    expect((await EventApi.findById(ev._id).lean() as any).submissionCount).toBe(1);
  });

  it('stores nothing when the hidden honeypot is filled, but answers as if it worked', async () => {
    await workshop();
    const r = await request(app).post('/api/v1/public/events/codebegun/java-workshop-nov-2026')
      .send({ name: 'Bot', phone: '9876543210', year: '1st', _hp: 'http://spam' });
    expect(r.status).toBe(201);
    expect(await EventSubmission.countDocuments()).toBe(0);
  });

  it('allows one registration per mobile when the event asks for it', async () => {
    await workshop({ onePerPhone: true });
    const url = '/api/v1/public/events/codebegun/java-workshop-nov-2026';
    expect((await request(app).post(url).send({ name: 'A', phone: '9876543210', year: '1st' })).status).toBe(201);
    const again = await request(app).post(url).send({ name: 'A again', phone: '+91 98765 43210', year: '2nd' });
    expect(again.status).toBe(409);
    expect(again.body.code).toBe('DUPLICATE');
  });

  it('refuses registrations after the closing date, before opening, and while paused', async () => {
    const ev = await workshop();
    const url = '/api/v1/public/events/codebegun/java-workshop-nov-2026';
    const body = { name: 'A', phone: '9876543210', year: '1st' };

    await EventApi.updateOne({ _id: ev._id }, { closesAt: new Date(Date.now() - 1000) });
    let r = await request(app).post(url).send(body);
    expect([r.status, r.body.code]).toEqual([403, 'EVENT_CLOSED']);
    expect((await request(app).get(url)).body.data.event.status).toBe('closed');
    expect((await request(app).get('/api/v1/public/events/codebegun')).body.data).toEqual([]);

    await EventApi.updateOne({ _id: ev._id }, { closesAt: days(10), opensAt: days(2) });
    r = await request(app).post(url).send(body);
    expect(r.body.code).toBe('EVENT_NOT_OPEN');

    await EventApi.updateOne({ _id: ev._id }, { opensAt: null, status: 'paused' });
    r = await request(app).post(url).send(body);
    expect(r.body.code).toBe('EVENT_PAUSED');
    expect(await EventSubmission.countDocuments()).toBe(0);
  });

  it('answers 404 for an unknown institute or API name', async () => {
    await workshop();
    expect((await request(app).get('/api/v1/public/events/nobody/java-workshop-nov-2026')).status).toBe(404);
    expect((await request(app).get('/api/v1/public/events/codebegun/nope')).status).toBe(404);
    // Another institute's slug never reaches this institute's event.
    expect((await request(app).post('/api/v1/public/events/other/java-workshop-nov-2026').send({})).status).toBe(404);
  });
});

describe('admin: the data', () => {
  it('shows one event\'s own columns, or every used field across the collection', async () => {
    const java = await workshop();
    const ai = await svc.createEvent(T, USER, {
      collectionId: String(java.collectionId), eventName: 'AI Bootcamp', closesAt: days(10),
      newFields: [{ label: 'Branch', type: 'text' }],
      fields: [{ key: 'name', required: true }, { key: 'email', required: true }, { key: 'branch' }],
    });
    await svc.publicSubmit(T, 'java-workshop-nov-2026', { name: 'Ravi', phone: '9876543210', year: '3rd' }, {});
    await svc.publicSubmit(T, 'ai-bootcamp', { name: 'Sita', email: 'sita@example.com', branch: 'CSE' }, {});

    const one = await svc.listSubmissions(T, { eventApiId: String(ai._id) });
    expect(one.columns.map((c) => c.key)).toEqual(['name', 'email', 'branch']);
    expect(one.total).toBe(1);

    const all = await svc.listSubmissions(T, { collectionId: String(java.collectionId) });
    expect(all.total).toBe(2);
    expect(all.columns.map((c) => c.key)).toEqual(['name', 'phone', 'email', 'college', 'year', 'branch']);

    const found = await svc.listSubmissions(T, { collectionId: String(java.collectionId), q: '98765' });
    expect(found.rows.map((r: any) => r.contact.name)).toEqual(['Ravi']);

    let csv = '';
    for await (const line of svc.exportSubmissions(T, { eventApiId: String(java._id) })) csv += line;
    expect(csv.startsWith('﻿"Submitted (IST)","Event","Full name","Mobile","College","Year"')).toBe(true);
    expect(csv).toContain(`"'+919876543210"`);
  });

  it('locks the API name and keeps removed fields once registrations exist', async () => {
    const ev = await workshop();
    await svc.publicSubmit(T, 'java-workshop-nov-2026', { name: 'Ravi', phone: '9876543210', year: '3rd' }, {});

    await expect(svc.updateEvent(T, USER, String(ev._id), { apiName: 'renamed' })).rejects.toThrow(/cannot change/);

    const updated = await svc.updateEvent(T, USER, String(ev._id), { fields: [{ key: 'name', required: true }, { key: 'phone', required: true }] });
    expect(updated.fields.find((f: any) => f.key === 'year')).toMatchObject({ hidden: true });
    const form = await svc.publicForm(T, 'java-workshop-nov-2026');
    expect(form.fields.map((f) => f.key)).toEqual(['name', 'phone']);

    await expect(svc.updateCollection(T, USER, String(ev.collectionId), { fields: [{ key: 'year', label: 'Year', type: 'text' }] }))
      .rejects.toThrow(/type cannot change/);
  });

  it('lets an admin delete a test registration', async () => {
    const ev = await workshop();
    const { id } = await svc.publicSubmit(T, 'java-workshop-nov-2026', { name: 'Test', phone: '9876543210', year: '1st' }, {});
    await expect(svc.deleteSubmission(OTHER, String(id))).rejects.toThrow(/not found/);
    await svc.deleteSubmission(T, String(id));
    expect(await EventSubmission.countDocuments()).toBe(0);
    expect((await EventApi.findById(ev._id).lean() as any).submissionCount).toBe(0);
  });
});
