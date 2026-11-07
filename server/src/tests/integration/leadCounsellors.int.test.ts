/**
 * Who can be assigned leads: Super Admin, Tenant ("System") Admin and staff whose custom role
 * name contains "BDM". Everyone else is left out of counsellor lists and refused on assign.
 */
import mongoose from 'mongoose';
import { startMongo, stopMongo, clearCollections } from './mongoHarness';
jest.setTimeout(120_000);

import User from '../../models/User';
import Role from '../../models/Role';
import { listCounsellors, isCounsellor } from '../../services/leadCounsellorService';

const T = new mongoose.Types.ObjectId();
const OTHER = new mongoose.Types.ObjectId();
const mk = (email: string, role: string, extra: any = {}) =>
  User.collection.insertOne({ tenantId: T, email, firstName: email.split('@')[0], lastName: 'x', role, isActive: true, ...extra }).then(r => String(r.insertedId));

beforeAll(async () => { await startMongo(); });
afterAll(async () => { await stopMongo(); });
beforeEach(async () => { await clearCollections(); });

it('lists admins and BDM roles only; isCounsellor agrees', async () => {
  const bdm = await Role.create({ tenantId: T, name: 'BDM', permissions: ['view_leads'] });
  const senior = await Role.create({ tenantId: T, name: 'Senior Bdm', permissions: ['view_leads'] });
  const trainer = await Role.create({ tenantId: T, name: 'Trainer', permissions: ['view_leads'] });
  const sa = await mk('owner@x.in', 'SUPER_ADMIN');
  const ta = await mk('admin@x.in', 'TENANT_ADMIN');
  const b1 = await mk('kavitha@x.in', 'STAFF', { customRoleId: bdm._id });
  const b2 = await mk('ameesha@x.in', 'STAFF', { customRoleId: senior._id });
  const tr = await mk('trainer@x.in', 'STAFF', { customRoleId: trainer._id });
  const plain = await mk('plain@x.in', 'STAFF');
  const gone = await mk('left@x.in', 'STAFF', { customRoleId: bdm._id, isActive: false });
  await User.collection.insertOne({ tenantId: OTHER, email: 'theirs@x.in', role: 'TENANT_ADMIN', isActive: true });

  const list = await listCounsellors(String(T));
  expect(new Set(list.map(u => u._id))).toEqual(new Set([sa, ta, b1, b2]));
  expect(list[0].roleName).toBe('Super Admin');
  expect(list[1].roleName).toBe('System Admin');

  for (const id of [sa, ta, b1, b2]) expect(await isCounsellor(String(T), id)).toBe(true);
  for (const id of [tr, plain, gone]) expect(await isCounsellor(String(T), id)).toBe(false);
  expect(await isCounsellor(String(OTHER), b1)).toBe(false);
});
