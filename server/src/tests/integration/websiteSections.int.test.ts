/**
 * Website content stages 2–4 (2026-11-27): Tech Battle page (date from Tech Battles, partner college,
 * prizes, winners), events, courses, testimonials, trainers and site settings. Against a real database.
 */
import fs from 'fs';
import os from 'os';
import path from 'path';
import mongoose from 'mongoose';
import sharp from 'sharp';
import { startMongo, stopMongo, clearCollections } from './mongoHarness';
import Tenant from '../../models/Tenant';
import TechBattle from '../../models/TechBattle';
import BattleRegistration from '../../models/BattleRegistration';
import { invalidate, todayIST, createBatch } from '../../services/websiteBatchService';
import { saveImage, WebsiteContentError } from '../../services/websiteMediaService';
import { createStat, createCompany } from '../../services/websitePlacementService';
import * as sec from '../../services/websiteSectionsService';
import { getPublicCourse, getPublicSite } from '../../controllers/websiteContentController';

jest.setTimeout(120_000);

let TENANT: string;
let OTHER: string;
const ADMIN = { id: String(new mongoose.Types.ObjectId()), name: 'Siva' };
const url = (id: unknown) => (id ? `https://api.test/m/${id}.webp` : null);
const day = (offset: number) => new Date(Date.parse(`${todayIST()}T00:00:00Z`) + offset * 86_400_000).toISOString().slice(0, 10);
const cwd = process.cwd();
let tmp: string;

beforeAll(async () => {
  await startMongo();
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ws-'));
  process.chdir(tmp);
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
  const r: any = { statusCode: 200, headers: {} as Record<string, string>, body: null };
  r.status = (c: number) => { r.statusCode = c; return r; };
  r.json = (b: any) => { r.body = b; return r; };
  r.setHeader = (k: string, v: string) => { r.headers[k.toLowerCase()] = v; };
  return r;
};
const fakeReq = (params: any, query: any = {}) => ({ params, query, protocol: 'https', get: () => 'lms.test' }) as any;
const png = (w: number, h: number) => sharp({ create: { width: w, height: h, channels: 3, background: { r: 30, g: 90, b: 160 } } }).png().toBuffer();
const battle = (title: string, startHrs: number, extra: any = {}) => TechBattle.create({
  tenantId: TENANT, title, slug: title.toLowerCase().replace(/\s+/g, '-'), quizId: 'q1', status: 'live', visibility: 'public',
  startAt: new Date(Date.now() + startHrs * 3600_000), endAt: new Date(Date.now() + (startHrs + 1) * 3600_000), ...extra,
} as any);

describe('Tech Battle page', () => {
  it('takes the date from the live battle, adds the partner college, prizes and numbers', async () => {
    expect((await sec.publicBattle(TENANT, url)).next).toBeNull();   // nothing live yet

    const b: any = await battle('Week 48 Battle', 48);
    await sec.saveBattleSettings(TENANT, ADMIN, {
      eligibility: 'B.Tech Students', alsoOpenTo: 'Recent Passed Outs', topics: ['Java', '', 'SQL'],
      prizes: [{ place: '1st Prize', amount: '₹1000', items: ['Myntra Gift Voucher', 'Surprise Gift Hamper'] }, { place: '', amount: '', items: [] }],
      everyone: ['Participation certificate'],
    });
    await sec.saveBattleNote(TENANT, ADMIN, String(b._id), { partnerCollege: "St. Ann's College, Chirala" });
    await createStat(TENANT, ADMIN, { section: 'tech_battle', value: '1000+', label: 'Active participants', published: true });
    await createStat(TENANT, ADMIN, { value: '92%', label: 'Placement rate', published: true });   // placements, not here

    const pub: any = await sec.publicBattle(TENANT, url);
    expect(pub.next).toMatchObject({ title: 'Week 48 Battle', partnerCollege: "St. Ann's College, Chirala", registerOpen: true });
    expect(pub.next.time).toMatch(/(AM|PM) IST$/);
    expect(pub.next.date).toMatch(/\d{4}$/);
    expect(pub.topics).toEqual(['Java', 'SQL']);
    expect(pub.prizes).toEqual([{ place: '1st Prize', amount: '₹1000', items: ['Myntra Gift Voucher', 'Surprise Gift Hamper'] }]);
    expect(pub.stats).toEqual([{ value: '1000+', label: 'Active participants' }]);
    expect(pub.past).toEqual([]);

    // A draft or private battle never shows; another institute's battle cannot be noted.
    await expect(sec.saveBattleNote(OTHER, ADMIN, String(b._id), { partnerCollege: 'x' })).rejects.toThrow(/not in Tech Battles/);
  });

  it('winners: filled from the leaderboard, published per battle, shown under past battles', async () => {
    const done: any = await battle('Week 47 Battle', -48);
    for (const [name, score] of [['Asha', 40], ['Bala', 55], ['Chitra', 47], ['Dev', 10]] as const) {
      await BattleRegistration.create({
        tenantId: TENANT, battleId: done._id, name, mobile: `9${String(score).padStart(9, '0')}`, email: `${name}@x.com`, college: 'ABC',
        examToken: `${name}-tok`, status: 'submitted', score, timeSpentSec: 100,
      } as any);
    }
    const top = await sec.leaderboardTop(TENANT, String(done._id), 3);
    expect(top.map((w) => [w.place, w.name, w.score])).toEqual([[1, 'Bala', '55'], [2, 'Chitra', '47'], [3, 'Asha', '40']]);

    await expect(sec.saveBattleNote(TENANT, ADMIN, String(done._id), { winnersPublished: true })).rejects.toThrow(/at least one winner/);
    const photo: any = await saveImage(TENANT, 'photo', await png(300, 300));
    await sec.saveBattleNote(TENANT, ADMIN, String(done._id), { winners: [...top, { place: 4, name: '' }], partnerCollege: 'XYZ College' });
    await sec.saveBattleNote(TENANT, ADMIN, String(done._id), { winners: top.map((w, i) => (i === 0 ? { ...w, photoId: String(photo._id) } : w)) });
    expect((await sec.publicBattle(TENANT, url)).past).toEqual([]);   // not published yet

    await sec.saveBattleNote(TENANT, ADMIN, String(done._id), { winnersPublished: true });
    const pub: any = await sec.publicBattle(TENANT, url);
    expect(pub.past).toHaveLength(1);
    expect(pub.past[0]).toMatchObject({ title: 'Week 47 Battle', partnerCollege: 'XYZ College' });
    expect(pub.past[0].winners[0]).toEqual({ place: 1, name: 'Bala', college: 'ABC', score: '55', photoUrl: `https://api.test/m/${photo._id}.webp` });
    expect(pub.past[0].winners[0]).not.toHaveProperty('mobile');

    const admin = await sec.adminBattle(TENANT, url);
    expect(admin.battles[0].history[0].change).toBe('Changed winners published');
  });
});

describe('events', () => {
  it('status comes from the dates, published only, upcoming first', async () => {
    await sec.createSectionItem(TENANT, ADMIN, 'events', { type: 'hackathon', title: 'Old Hack', startDate: day(-60), endDate: day(-59), mode: 'offline', published: true });
    await sec.createSectionItem(TENANT, ADMIN, 'events', { type: 'workshop', title: 'Soon Workshop', startDate: day(10), mode: 'online', registerUrl: '/workshops/ai-agent', published: true });
    await sec.createSectionItem(TENANT, ADMIN, 'events', { type: 'workshop', title: 'Today', startDate: day(-1), endDate: day(1), mode: 'online', published: true });
    await sec.createSectionItem(TENANT, ADMIN, 'events', { type: 'workshop', title: 'Draft', startDate: day(5), mode: 'online' });
    await expect(sec.createSectionItem(TENANT, ADMIN, 'events', { type: 'workshop', title: 'Bad', startDate: day(5), endDate: day(2), mode: 'online' })).rejects.toThrow(/before the start/);
    await expect(sec.createSectionItem(TENANT, ADMIN, 'events', { type: 'workshop', title: 'Bad link', startDate: day(5), mode: 'online', registerUrl: 'javascript:alert(1)' })).rejects.toThrow(/https/);

    const list = await sec.publicEvents(TENANT, url);
    expect(list.map((e: any) => [e.title, e.status])).toEqual([['Today', 'ongoing'], ['Soon Workshop', 'upcoming'], ['Old Hack', 'past']]);
    expect((await sec.publicEvents(TENANT, url, { status: 'past' })).map((e: any) => e.title)).toEqual(['Old Hack']);
    expect((await sec.publicEvents(TENANT, url, { type: 'hackathon' })).map((e: any) => e.title)).toEqual(['Old Hack']);
    expect(list[0]).not.toHaveProperty('history');
  });
});

describe('courses', () => {
  it('card and course page come from what was typed, with the next batch from Website Batches', async () => {
    const before = await sec.adminCourses(TENANT);
    expect(before.map((c) => c.key)).toContain('java_full_stack');
    await createBatch(TENANT, ADMIN, { courseKey: 'java_full_stack', startDate: day(9), seatsLeft: 12 });

    await sec.saveCourseSite(TENANT, ADMIN, 'java_full_stack', {
      title: 'Java Full Stack with AI', tags: ['Java', 'Spring Boot', ''], duration: '145 Days', fee: '₹35,000', badge: 'Most Popular',
      pageUrl: '/courses/java-full-stack', modules: [{ title: 'Core Java', days: '1–25', topics: ['OOP', 'Collections'] }, { title: '' }],
      faqs: [{ q: 'Is it online?', a: 'Online and offline.' }, { q: 'No answer', a: '' }],
    });
    expect(await sec.publicCourses(TENANT)).toEqual([]);   // not published yet
    await sec.saveCourseSite(TENANT, ADMIN, 'java_full_stack', { published: true });

    const cards = await sec.publicCourses(TENANT);
    expect(cards).toHaveLength(1);
    expect(cards[0]).toMatchObject({ key: 'java_full_stack', title: 'Java Full Stack with AI', tags: ['Java', 'Spring Boot'], fee: '₹35,000', badge: 'Most Popular' });
    expect(cards[0].nextBatch).toMatchObject({ startDate: day(9), seatsLeft: 12 });

    const res = fakeRes();
    await getPublicCourse(fakeReq({ tenantSlug: 'codebegun', key: 'java_full_stack' }), res);
    expect(res.statusCode).toBe(200);
    expect(res.body.data.modules).toEqual([{ title: 'Core Java', days: '1–25', topics: ['OOP', 'Collections'] }]);
    expect(res.body.data.faqs).toEqual([{ q: 'Is it online?', a: 'Online and offline.' }]);
    const missing = fakeRes();
    await getPublicCourse(fakeReq({ tenantSlug: 'codebegun', key: 'data_science' }), missing);
    expect(missing.statusCode).toBe(404);

    const admin = (await sec.adminCourses(TENANT)).find((c) => c.key === 'java_full_stack')!;
    expect(admin.history[0].change).toBe('Changed published');
    await expect(sec.saveCourseSite(TENANT, ADMIN, 'nope', { title: 'x' })).rejects.toThrow(WebsiteContentError);

    // Order follows the team's order.
    await sec.saveCourseSite(TENANT, ADMIN, 'data_science', { title: 'Data Science with AI', published: true });
    const ids = (await sec.adminCourses(TENANT)).map((c) => c.id);
    const ds = (await sec.adminCourses(TENANT)).find((c) => c.key === 'data_science')!.id;
    await sec.reorderCourses(TENANT, [ds, ...ids.filter((x) => x !== ds)]);
    expect((await sec.publicCourses(TENANT)).map((c) => c.key)).toEqual(['data_science', 'java_full_stack']);
  });
});

describe('testimonials and trainers', () => {
  it('a video needs consent and a link to publish; trainers go out published only', async () => {
    const co: any = await createCompany(TENANT, ADMIN, { name: 'EPAM Systems', type: 'service' });
    const thumb: any = await saveImage(TENANT, 'thumb', await png(1280, 900));
    expect([thumb.width, thumb.height]).toEqual([960, 540]);
    await expect(sec.createSectionItem(TENANT, ADMIN, 'testimonials', { name: 'Arvind', published: true, videoUrl: 'https://v.test/1' })).rejects.toThrow(/agreed to be shown/);
    await expect(sec.createSectionItem(TENANT, ADMIN, 'testimonials', { name: 'Arvind', published: true, consent: true })).rejects.toThrow(/video link/);
    const t: any = await sec.createSectionItem(TENANT, ADMIN, 'testimonials', {
      name: 'Arvind', thumbId: String(thumb._id), videoUrl: 'https://iframe.mediadelivery.net/embed/1/2', companyId: String(co._id), packageLpa: 8, consent: true, published: true,
    });
    await sec.createSectionItem(TENANT, ADMIN, 'testimonials', { name: 'Raju', label: 'Student Review', videoUrl: 'https://v.test/2', consent: true });   // draft

    let pub = await sec.testimonials(TENANT, url, false);
    expect(pub).toHaveLength(1);
    expect(pub[0]).toMatchObject({ name: 'Arvind', company: { name: 'EPAM Systems' }, package: { text: '₹ 8 LPA' }, thumbUrl: `https://api.test/m/${thumb._id}.webp` });
    expect(pub[0]).not.toHaveProperty('consent');

    await sec.updateSectionItem(TENANT, ADMIN, 'testimonials', String(t._id), { consent: false });
    pub = await sec.testimonials(TENANT, url, false);
    expect(pub).toHaveLength(0);
    const admin = await sec.testimonials(TENANT, url, true);
    expect(admin.find((x: any) => x.name === 'Arvind').history[0].change).toMatch(/consent removed, unpublished \(no consent\)/);

    await sec.createSectionItem(TENANT, ADMIN, 'trainers', { name: 'Naresh', title: 'Tech Lead', company: 'Ex-Flipkart', experience: '12 yrs', skills: 'Java\nSpring', published: true });
    await sec.createSectionItem(TENANT, ADMIN, 'trainers', { name: 'Hidden' });
    await expect(sec.createSectionItem(TENANT, ADMIN, 'trainers', { name: 'X', linkedin: 'linkedin.com/in/x' })).rejects.toThrow(/https/);
    const tr = await sec.trainers(TENANT, url, false);
    expect(tr).toEqual([{ id: expect.any(String), name: 'Naresh', photoUrl: null, title: 'Tech Lead', company: 'Ex-Flipkart', experience: '12 yrs', skills: ['Java', 'Spring'], linkedin: '', bio: '' }]);
  });
});

describe('site settings', () => {
  it('top bar shows only when switched on; home counters are their own numbers', async () => {
    await expect(sec.saveSettings(TENANT, ADMIN, { topBar: { enabled: true } })).rejects.toThrow(/top bar text/);
    await sec.saveSettings(TENANT, ADMIN, { topBar: { text: '2026 B.Tech Graduate? If you are looking for placement', linkText: 'Click here →', url: '/placements-2026' } });
    expect((await sec.publicSite(TENANT)).topBar).toBeNull();
    await sec.saveSettings(TENANT, ADMIN, { topBar: { enabled: true } });
    await createStat(TENANT, ADMIN, { section: 'home', value: '4 hrs', label: 'Daily training', published: true });

    const res = fakeRes();
    await getPublicSite(fakeReq({ tenantSlug: 'codebegun' }), res);
    expect(res.body.data).toEqual({
      topBar: { text: '2026 B.Tech Graduate? If you are looking for placement', linkText: 'Click here →', url: '/placements-2026' },
      stats: [{ value: '4 hrs', label: 'Daily training' }],
    });
    expect(res.headers['cache-control']).toBe('public, max-age=60');
    const s = await sec.adminSettings(TENANT);
    expect(s.history.map((h: any) => h.change)).toEqual(['Top bar switched on', 'Changed the top bar']);
  });
});
