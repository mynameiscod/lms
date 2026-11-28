/**
 * Drive "Upload a list" (2026-11-28): a CSV / Excel / pasted list is matched to LMS students by email,
 * then phone (last 10 digits), then a unique name; nothing is added by the match itself.
 */
import mongoose from 'mongoose';
import XLSX from 'xlsx';
import { startMongo, stopMongo, clearCollections } from './mongoHarness';
import User from '../../models/User';
import Batch from '../../models/Batch';
import { parseList, matchList, phone10 } from '../../services/placementListMatch';

jest.setTimeout(120_000);
const T = new mongoose.Types.ObjectId();
const OTHER = new mongoose.Types.ObjectId();

beforeAll(startMongo);
afterAll(stopMongo);
afterEach(clearCollections);

describe('parseList', () => {
  test('a CSV with a header row, columns in any order', () => {
    const csv = 'Mobile No,Student Name,E-mail\n+91 98765-43210,Asha Rao,ASHA@x.com\n,Ravi K,\n';
    expect(parseList({ buffer: Buffer.from(csv) })).toEqual([
      { name: 'Asha Rao', email: 'asha@x.com', phone: '+91 98765-43210' },
      { name: 'Ravi K', email: undefined, phone: undefined },
    ]);
  });
  test('an Excel file', () => {
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([['Name', 'Phone'], ['Asha Rao', 9876543210]]), 'S');
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    expect(parseList({ buffer: buf })).toEqual([{ name: 'Asha Rao', email: undefined, phone: '9876543210' }]);
  });
  test('pasted lines with no header: each cell recognised by its look', () => {
    expect(parseList({ text: 'Asha Rao, asha@x.com, 09876543210\nravi@x.com\nMeena' })).toEqual([
      { name: 'Asha Rao', email: 'asha@x.com', phone: '09876543210' },
      { name: undefined, email: 'ravi@x.com', phone: undefined },
      { name: 'Meena', email: undefined, phone: undefined },
    ]);
  });
  test('phone10 ignores +91, spaces and a leading 0', () => {
    expect(phone10('+91 98765 43210')).toBe('9876543210');
    expect(phone10('098765-43210')).toBe('9876543210');
    expect(phone10('12345')).toBe('');
  });
});

describe('matchList', () => {
  let asha: any; let ravi: any; let meena1: any;
  beforeEach(async () => {
    const b: any = await Batch.create({ name: 'Alpha-06', tenantId: T, startDate: new Date(), endDate: new Date(Date.now() + 864e5), timings: [{ day: 'Monday', startTime: '10:00', endTime: '11:00' }] } as any);
    const mk = (firstName: string, lastName: string, email: string, phone: string | null, tenantId = T) =>
      User.create({ tenantId, firstName, lastName, email, phone, password: 'x', role: 'STUDENT', isActive: true, batchId: b._id } as any);
    asha = await mk('Asha', 'Rao', 'asha@x.com', '+91 98765 43210');
    ravi = await mk('Ravi', 'Kumar', 'ravi@x.com', '9000000001');
    meena1 = await mk('Meena', 'S', 'meena1@x.com', null);
    await mk('Meena', 'S', 'meena2@x.com', null);
    await mk('Kiran', 'Rao', 'kiran@other.com', '9111111111', OTHER);
    await User.create({ tenantId: T, firstName: 'Staff', lastName: 'One', email: 'staff@x.com', password: 'x', role: 'STAFF', isActive: true } as any);
  });

  test('email, phone and a unique name match; a shared name asks; other institutes and staff are never matched', async () => {
    const r = await matchList(String(T), [
      { email: 'ASHA@x.com' },
      { phone: '09000000001' },
      { name: 'ravi   kumar' },
      { name: 'Meena S' },
      { email: 'kiran@other.com', phone: '9111111111' },
      { email: 'staff@x.com' },
      { name: 'Nobody' },
    ], new Set());
    expect(r.map(x => [x.status, x.via])).toEqual([
      ['matched', 'email'], ['matched', 'phone'], ['repeat', 'name'], ['several', undefined],
      ['not_found', undefined], ['not_found', undefined], ['not_found', undefined],
    ]);
    expect(r[0].student).toMatchObject({ _id: String(asha._id), name: 'Asha Rao', batchName: 'Alpha-06', active: true });
    expect(r[3].options!.map(o => o.email).sort()).toEqual(['meena1@x.com', 'meena2@x.com']);
  });

  test('email and phone pointing at different students ask; already on the drive is reported', async () => {
    const r = await matchList(String(T), [{ email: 'asha@x.com', phone: '9000000001' }, { email: 'meena1@x.com' }], new Set([String(meena1._id)]));
    expect(r[0].status).toBe('several');
    expect(r[0].options!.map(o => o._id).sort()).toEqual([String(asha._id), String(ravi._id)].sort());
    expect(r[1]).toMatchObject({ status: 'already', via: 'email' });
  });

  test('a phone match under a different name is flagged; a partial name is fine', async () => {
    const r = await matchList(String(T), [{ name: 'Rahul Verma', phone: '9000000001' }, { name: 'K. Asha', email: 'asha@x.com' }], new Set());
    expect(r[0]).toMatchObject({ status: 'matched', via: 'phone', nameDiffers: true });
    expect(r[1].nameDiffers).toBeUndefined();
  });
});
