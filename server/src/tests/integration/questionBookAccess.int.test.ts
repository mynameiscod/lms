/**
 * Question Books — who gets which book (2026-11-21). Each institute chooses, for every book (its own
 * and CodeBegun's), whether LMS students and/or CareerPilot members get it, and for members which
 * years and tracks. A book nobody chose for keeps its own default.
 */
import mongoose from 'mongoose';
import { startMongo, stopMongo } from './mongoHarness';
import { QuestionBook, QuestionBookAccess } from '../../models/QuestionBook';
import * as svc from '../../services/questionBookService';

jest.setTimeout(240_000);
const T1 = String(new mongoose.Types.ObjectId());
const T2 = String(new mongoose.Types.ObjectId());
const db = () => mongoose.connection.db!;
const ids: Record<string, string> = {};

async function user(key: string, tenantId: string, extra: any = {}) {
  const _id = new mongoose.Types.ObjectId();
  ids[key] = String(_id);
  await db().collection('users').insertOne({ _id, tenantId: new mongoose.Types.ObjectId(tenantId), role: 'STUDENT', firstName: key, email: `${key}@x.in`, ...extra });
}
const cp = (stage: string, track?: string) => ({ passport: { active: true, product: 'career_passport', stage, ...(track ? { careerTrack: { key: track } } : {}) } });
const shelfTitles = async (tenantId: string, key: string) => (await svc.shelf(tenantId, ids[key])).map((b: any) => b.title).sort();
const book = (title: string, extra: any = {}) => QuestionBook.create({ scope: 'global', tenantId: null, title, slug: title.toLowerCase().replace(/\W+/g, '-'), status: 'published', questionCount: 5, ...extra });

describe('Question Books access', () => {
  const admin = { tenantId: T1, userId: String(new mongoose.Types.ObjectId()), role: 'TENANT_ADMIN', name: 'Admin' };

  beforeAll(async () => {
    await startMongo();
    await QuestionBookAccess.syncIndexes();
    await book('Java');                                                   // everyone
    await book('Infosys', { kind: 'company', audience: 'careerpilot' });  // members only
    await book('LMS Basics', { audience: 'lms' });                        // LMS only
    await book('Spring Boot', { audience: 'careerpilot', stages: ['specialize', 'placement'], tracks: ['JAVA_FULLSTACK_AI'] });
    await book('Draft Book', { status: 'draft' });
    await QuestionBook.create({ scope: 'tenant', tenantId: T2, title: 'Other Institute', slug: 'other', status: 'published', questionCount: 3 });
    await user('lms', T1, { batchId: new mongoose.Types.ObjectId() });
    await user('y1', T1, cp('foundation'));
    await user('y3java', T1, cp('specialize', 'JAVA_FULLSTACK_AI'));
    await user('y3data', T1, cp('specialize', 'DATA_ANALYTICS_AI'));
    await user('lmsT2', T2, { batchId: new mongoose.Types.ObjectId() });
  });
  afterAll(stopMongo);

  it('with no choices, every book keeps its own default', async () => {
    expect(await shelfTitles(T1, 'lms')).toEqual(['Java', 'LMS Basics']);
    expect(await shelfTitles(T1, 'y1')).toEqual(['Infosys', 'Java']);
    expect(await shelfTitles(T1, 'y3java')).toEqual(['Infosys', 'Java', 'Spring Boot']);
    expect(await shelfTitles(T1, 'y3data')).toEqual(['Infosys', 'Java']);
    expect(await shelfTitles(T2, 'lmsT2')).toEqual(['Java', 'LMS Basics', 'Other Institute']);
  });

  it('lists every book with its default and the institute\'s choice', async () => {
    const list: any = await svc.accessList(admin);
    const titles = list.books.map((b: any) => b.title);
    expect(titles).toContain('Draft Book');            // drafts too, so access can be set before publishing
    expect(titles).not.toContain('Other Institute');   // never another institute's book
    const infosys = list.books.find((b: any) => b.title === 'Infosys');
    expect(infosys.defaults).toMatchObject({ lms: false, careerpilot: true });
    expect(infosys.changed).toBe(false);
    expect(list.targets.stages).toHaveLength(4);
  });

  it('an institute gives a CodeBegun company book to LMS students too, only for itself', async () => {
    const infosys: any = await QuestionBook.findOne({ title: 'Infosys' }).lean();
    const list: any = await svc.saveAccess(admin, [String(infosys._id)], { lms: true });
    const row = list.books.find((b: any) => b.title === 'Infosys');
    expect(row).toMatchObject({ changed: true, changedBy: 'Admin', access: { lms: true, careerpilot: true } });
    expect(await shelfTitles(T1, 'lms')).toEqual(['Infosys', 'Java', 'LMS Basics']);
    expect(await shelfTitles(T2, 'lmsT2')).not.toContain('Infosys'); // other institutes unchanged
    // Reading and the cheat sheet follow the same rule.
    await expect(svc.readBook(T1, ids.lms, 'infosys')).resolves.toBeTruthy();
    await expect(svc.readBook(T2, ids.lmsT2, 'infosys')).rejects.toThrow(/not found/i);
  });

  it('years and tracks narrow it for CareerPilot members; many books at once', async () => {
    const java: any = await QuestionBook.findOne({ title: 'Java' }).lean();
    const lmsBasics: any = await QuestionBook.findOne({ title: 'LMS Basics' }).lean();
    await svc.saveAccess(admin, [String(java._id)], { stages: ['specialize'], tracks: ['DATA_ANALYTICS_AI'] });
    expect(await shelfTitles(T1, 'y1')).toEqual(['Infosys']);
    expect(await shelfTitles(T1, 'y3data')).toEqual(['Infosys', 'Java']);
    expect(await shelfTitles(T1, 'lms')).toContain('Java'); // LMS untouched by years/tracks
    // Bulk: take both away from LMS students.
    await svc.saveAccess(admin, [String(java._id), String(lmsBasics._id)], { lms: false });
    expect(await shelfTitles(T1, 'lms')).toEqual(['Infosys']);
    await expect(svc.readBook(T1, ids.lms, 'java')).rejects.toThrow(/not found/i);
  });

  it('reset puts a book back to its default', async () => {
    const java: any = await QuestionBook.findOne({ title: 'Java' }).lean();
    const list: any = await svc.resetAccess(admin, [String(java._id)]);
    expect(list.books.find((b: any) => b.title === 'Java').changed).toBe(false);
    expect(await shelfTitles(T1, 'y1')).toEqual(['Infosys', 'Java']);
  });

  it('refuses bad input and other institutes\' books', async () => {
    await expect(svc.saveAccess(admin, [], { lms: true })).rejects.toThrow(/at least one/);
    const other: any = await QuestionBook.findOne({ title: 'Other Institute' }).lean();
    await expect(svc.saveAccess(admin, [String(other._id)], { lms: true })).rejects.toThrow(/not available/);
    const java: any = await QuestionBook.findOne({ title: 'Java' }).lean();
    const list: any = await svc.saveAccess(admin, [String(java._id)], { stages: ['year9', 'build'] });
    expect(list.books.find((b: any) => b.title === 'Java').access.stages).toEqual(['build']);
  });
});
