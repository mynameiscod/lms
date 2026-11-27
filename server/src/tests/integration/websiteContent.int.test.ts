/**
 * Website content — placements (2026-11-27): staff type the placement numbers, hiring companies and
 * placed students; the public website reads GET /api/v1/public/:tenantSlug/placements. Nothing is
 * calculated, only published items go out, and a student needs consent to be published.
 */
import fs from 'fs';
import os from 'os';
import path from 'path';
import mongoose from 'mongoose';
import sharp from 'sharp';
import { startMongo, stopMongo, clearCollections } from './mongoHarness';
import Tenant from '../../models/Tenant';
import { WebsitePlacement } from '../../models/WebsiteContent';
import { PlacementDeskCandidate, PlacementDeskDrive, PlacementDeskCompany } from '../../models/PlacementDesk';
import { invalidate } from '../../services/websiteBatchService';
import { saveImage, openImage, WebsiteContentError } from '../../services/websiteMediaService';
import * as svc from '../../services/websitePlacementService';
import { getPublicPlacements, getPublicMedia } from '../../controllers/websiteContentController';

jest.setTimeout(120_000);

let TENANT: string;
let OTHER: string;
const ADMIN = { id: String(new mongoose.Types.ObjectId()), name: 'Siva' };
const url = (id: unknown) => (id ? `https://api.test/m/${id}.webp` : null);
const cwd = process.cwd();
let tmp: string;

beforeAll(async () => {
  await startMongo();
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'wc-'));
  process.chdir(tmp);   // local image storage lands in a throwaway folder
});
afterAll(async () => {
  process.chdir(cwd);
  fs.rmSync(tmp, { recursive: true, force: true });
  await stopMongo();
});
beforeEach(async () => {
  const t: any = await Tenant.create({ name: 'CodeBegun', slug: 'codebegun', adminId: new mongoose.Types.ObjectId() } as any);
  const o: any = await Tenant.create({ name: 'Other', slug: 'other', adminId: new mongoose.Types.ObjectId() } as any);
  TENANT = String(t._id); OTHER = String(o._id);
  invalidate(TENANT); invalidate(OTHER);
});
afterEach(clearCollections);

const fakeRes = () => {
  const r: any = { statusCode: 200, headers: {} as Record<string, string>, body: null, ended: false };
  r.status = (c: number) => { r.statusCode = c; return r; };
  r.json = (b: any) => { r.body = b; return r; };
  r.end = () => { r.ended = true; return r; };
  r.setHeader = (k: string, v: string) => { r.headers[k.toLowerCase()] = v; };
  return r;
};
const fakeReq = (params: any, query: any = {}) => ({ params, query, protocol: 'https', get: () => 'lms.test' }) as any;
const png = (w: number, h: number) => sharp({ create: { width: w, height: h, channels: 4, background: { r: 10, g: 60, b: 200, alpha: 1 } } }).png().toBuffer();

describe('placement numbers', () => {
  it('show exactly as typed, in the team order, published only', async () => {
    const a: any = await svc.createStat(TENANT, ADMIN, { value: '92%', label: 'Placement rate', published: true });
    const b: any = await svc.createStat(TENANT, ADMIN, { value: '₹ 11 LPA', label: 'Highest package', published: true });
    await svc.createStat(TENANT, ADMIN, { value: '500+', label: 'Students placed' });   // draft
    await expect(svc.createStat(TENANT, ADMIN, { value: '', label: 'x' })).rejects.toThrow(WebsiteContentError);

    await svc.reorder(TENANT, 'stats', [String(b._id), String(a._id)]);
    const pub = await svc.publicPlacements(TENANT, url);
    expect(pub.stats).toEqual([{ value: '₹ 11 LPA', label: 'Highest package' }, { value: '92%', label: 'Placement rate' }]);

    await svc.updateStat(TENANT, ADMIN, String(a._id), { value: '94%' });
    const admin = await svc.adminPlacements(TENANT, url);
    const row = admin.stats.find((s) => s.id === String(a._id))!;
    expect(row.value).toBe('94%');
    expect(row.history[0]).toMatchObject({ byName: 'Siva', change: 'number 92% → 94%' });
    expect(admin.stats).toHaveLength(3);
  });
});

describe('companies and placed students', () => {
  it('a student goes out only when published, with consent and a company; private fields never go out', async () => {
    const epam: any = await svc.createCompany(TENANT, ADMIN, { name: 'EPAM Systems', type: 'service', domain: 'https://www.epam.com/careers' });
    expect(epam.domain).toBe('epam.com');
    await expect(svc.createCompany(TENANT, ADMIN, { name: 'epam  systems' })).rejects.toThrow(/already in your companies/);

    // Publishing without consent is refused.
    await expect(svc.createStudent(TENANT, ADMIN, { name: 'Arvind', companyId: String(epam._id), published: true }))
      .rejects.toThrow(/agreed to be shown/);
    await expect(svc.createStudent(TENANT, ADMIN, { name: 'Arvind', consent: true, published: true }))
      .rejects.toThrow(/company/);

    const arvind: any = await svc.createStudent(TENANT, ADMIN, {
      name: 'Arvind', companyId: String(epam._id), role: 'Software Engineer', packageLpa: '8', courseKey: 'java_full_stack',
      year: 2025, batch: 'Batch 09', quote: 'Real projects made all the difference.', tags: ['non_cs', 'bogus'],
      placedOn: '2025-08', consent: true, published: true, featured: true, userId: String(new mongoose.Types.ObjectId()),
    });
    await svc.createStudent(TENANT, ADMIN, { name: 'Draft Person', companyId: String(epam._id), consent: true });
    await expect(svc.createStudent(TENANT, ADMIN, { name: 'X', courseKey: 'no_such_course' })).rejects.toThrow(/course/);
    // Another institute's company cannot be used.
    const foreign: any = await svc.createCompany(OTHER, ADMIN, { name: 'Foreign Co' });
    await expect(svc.createStudent(TENANT, ADMIN, { name: 'Y', companyId: String(foreign._id) })).rejects.toThrow(/not in your list/);

    const pub = await svc.publicPlacements(TENANT, url);
    expect(pub.students).toHaveLength(1);
    const s: any = pub.students[0];
    expect(s).toMatchObject({
      name: 'Arvind', role: 'Software Engineer', package: { lpa: 8, text: '₹ 8 LPA' },
      course: { key: 'java_full_stack', name: 'Java Full Stack with AI' }, company: { name: 'EPAM Systems', type: 'service', domain: 'epam.com', logoUrl: null },
      tags: [{ key: 'non_cs', label: 'Non-CS background' }], featured: true, year: 2025, placedOn: '2025-08',
    });
    for (const k of ['consent', 'published', 'history', 'userId', 'tenantId', 'order']) expect(s).not.toHaveProperty(k);
    expect(pub.filters).toEqual({ courses: [{ key: 'java_full_stack', name: 'Java Full Stack with AI' }], years: [2025], companyTypes: ['service'] });

    // Taking consent away takes the card off the website at once.
    await svc.updateStudent(TENANT, ADMIN, String(arvind._id), { consent: false });
    expect((await svc.publicPlacements(TENANT, url)).students).toHaveLength(0);
    const again: any = await WebsitePlacement.findById(arvind._id).lean();
    expect(again.published).toBe(false);
    expect(again.history[0].change).toMatch(/consent removed.*unpublished \(no consent\)/);

    // A company in use cannot be deleted.
    await expect(svc.removeItem(TENANT, 'companies', String(epam._id))).rejects.toThrow(/Change their company first/);
  });

  it('filters and sorts for the success-stories page', async () => {
    const prod: any = await svc.createCompany(TENANT, ADMIN, { name: 'Razorpay', type: 'product' });
    const serv: any = await svc.createCompany(TENANT, ADMIN, { name: 'Capgemini', type: 'service' });
    const mk = (name: string, c: any, lpa: number, year: number, placedOn: string, featured = false) =>
      svc.createStudent(TENANT, ADMIN, { name, companyId: String(c._id), packageLpa: lpa, year, placedOn, featured, consent: true, published: true });
    await mk('A', serv, 4, 2024, '2024-05');
    await mk('B', prod, 11, 2025, '2025-01', true);
    await mk('C', serv, 6.5, 2025, '2025-09');

    const names = async (q: any) => (await svc.publicPlacements(TENANT, url, q)).students.map((s) => s.name);
    expect(await names({})).toEqual(['A', 'B', 'C']);                     // team order
    expect(await names({ sort: 'package' })).toEqual(['B', 'C', 'A']);
    expect(await names({ sort: 'recent' })).toEqual(['C', 'B', 'A']);
    expect(await names({ year: '2025' })).toEqual(['B', 'C']);
    expect(await names({ companyType: 'product' })).toEqual(['B']);
    expect(await names({ featured: '1' })).toEqual(['B']);
    expect(await names({ limit: '2' })).toEqual(['A', 'B']);
    expect((await svc.publicPlacements(TENANT, url, { year: '2024' })).filters.years).toEqual([2025, 2024]);

    // An unpublished company hides its students and itself.
    await svc.updateCompany(TENANT, ADMIN, String(serv._id), { published: false });
    const pub = await svc.publicPlacements(TENANT, url);
    expect(pub.students.map((s) => s.name)).toEqual(['B']);
    expect(pub.companies.map((c) => c.name)).toEqual(['Razorpay']);
    // Out of the logo strip, but still on its students' cards.
    await svc.updateCompany(TENANT, ADMIN, String(prod._id), { showInStrip: false });
    const pub2 = await svc.publicPlacements(TENANT, url);
    expect(pub2.companies).toEqual([]);
    expect(pub2.students[0].company.name).toBe('Razorpay');
  });
});

describe('images', () => {
  it('a photo becomes a 480×480 WebP, a logo fits 400×160, and only that institute serves them', async () => {
    const photo: any = await saveImage(TENANT, 'photo', await png(1200, 800));
    expect([photo.width, photo.height, photo.contentType, photo.storage]).toEqual([480, 480, 'image/webp', 'local']);
    const logo: any = await saveImage(TENANT, 'logo', await png(1000, 200));
    expect([logo.width, logo.height]).toEqual([400, 80]);
    const small: any = await saveImage(TENANT, 'logo', await png(100, 40));
    expect([small.width, small.height]).toEqual([100, 40]);   // never enlarged
    await expect(saveImage(TENANT, 'photo', Buffer.from('not an image'))).rejects.toThrow(/not an image/);

    expect(await openImage(TENANT, String(photo._id))).not.toBeNull();
    expect(await openImage(OTHER, String(photo._id))).toBeNull();

    // A student card can only use this institute's photo.
    const co: any = await svc.createCompany(TENANT, ADMIN, { name: 'Acme', logoId: String(logo._id) });
    await expect(svc.createStudent(OTHER, ADMIN, { name: 'Z', photoId: String(photo._id) })).rejects.toThrow(/Upload the photo again/);
    await expect(svc.createCompany(TENANT, ADMIN, { name: 'Bad', logoId: String(photo._id) })).rejects.toThrow(/Upload the logo again/);
    await svc.createStudent(TENANT, ADMIN, { name: 'P', photoId: String(photo._id), companyId: String(co._id), consent: true, published: true });

    // Through the public controller: absolute urls on the API host, cached briefly.
    const res = fakeRes();
    await getPublicPlacements(fakeReq({ tenantSlug: 'codebegun' }), res);
    expect(res.statusCode).toBe(200);
    expect(res.headers['cache-control']).toBe('public, max-age=60');
    const st = res.body.data.students[0];
    expect(st.photoUrl).toBe(`https://lms.test/api/v1/public/codebegun/media/${photo._id}.webp`);
    expect(st.company.logoUrl).toBe(`https://lms.test/api/v1/public/codebegun/media/${logo._id}.webp`);

    const missing = fakeRes();
    await getPublicPlacements(fakeReq({ tenantSlug: 'nope' }), missing);
    expect(missing.statusCode).toBe(404);

    // The image itself: another institute's slug gets nothing.
    const wrong = fakeRes();
    await getPublicMedia(fakeReq({ tenantSlug: 'other', file: `${photo._id}.webp` }), wrong);
    expect(wrong.statusCode).toBe(404);
  });
});

describe('add from LMS', () => {
  it('lists Placement Desk offers with only the card fields, and marks students who already have a card', async () => {
    const tid = new mongoose.Types.ObjectId(TENANT);
    const pc: any = await PlacementDeskCompany.create({ tenantId: tid, name: 'Mphasis', nameKey: 'mphasis' } as any);
    const drive: any = await PlacementDeskDrive.create({
      tenantId: tid, companyId: pc._id, companyName: 'Mphasis', date: new Date('2025-07-10'), day: '2025-07-10', role: 'Associate Engineer',
    } as any);
    const stu = new mongoose.Types.ObjectId();
    await PlacementDeskCandidate.create({
      tenantId: tid, driveId: drive._id, companyId: pc._id, day: '2025-07-10', kind: 'student', studentId: stu, name: 'Praneeth',
      phone: '9999999999', email: 'p@x.com', college: 'ABC College', degree: 'B.Tech', passoutYear: 2024, status: 'offer_accepted',
      offerCtc: 7.5, statusAt: new Date('2025-07-20'),
    } as any);
    await PlacementDeskCandidate.create({
      tenantId: tid, driveId: drive._id, companyId: pc._id, day: '2025-07-10', kind: 'external', name: 'Rejected One', status: 'rejected',
    } as any);

    let offers = await svc.lmsOffers(TENANT);
    expect(offers).toHaveLength(1);
    expect(offers[0]).toMatchObject({ name: 'Praneeth', companyName: 'Mphasis', role: 'Associate Engineer', packageLpa: 7.5, college: 'ABC College', year: 2024, placedOn: '2025-07', hasCard: false });
    expect(offers[0]).not.toHaveProperty('phone');
    expect(offers[0]).not.toHaveProperty('email');
    expect(await svc.lmsOffers(TENANT, 'pran')).toHaveLength(1);
    expect(await svc.lmsOffers(TENANT, 'zzz')).toHaveLength(0);
    expect(await svc.lmsOffers(OTHER)).toHaveLength(0);

    const co: any = await svc.companyByName(TENANT, ADMIN, 'Mphasis');
    expect(String((await svc.companyByName(TENANT, ADMIN, 'mphasis'))._id)).toBe(String(co._id));   // found, not added twice
    await svc.createStudent(TENANT, ADMIN, { name: 'Praneeth', companyId: String(co._id), userId: String(stu) });
    offers = await svc.lmsOffers(TENANT);
    expect(offers[0].hasCard).toBe(true);
  });
});
