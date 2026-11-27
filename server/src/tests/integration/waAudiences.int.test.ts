/**
 * "Send to many" — people from other modules (hackathon teams, tech battles, CareerPilot) as a
 * template broadcast audience, against a real MongoDB.
 */
import mongoose from 'mongoose';
import { startMongo, stopMongo } from './mongoHarness';
import { AUDIENCE_SOURCES, getAudienceSource } from '../../services/whatsAppAudiences';
import { resolveSourceAudience } from '../../services/whatsAppTemplateService';

jest.setTimeout(240_000);

const tid = new mongoose.Types.ObjectId();
const tenantId = String(tid);
const h1 = new mongoose.Types.ObjectId(), h2 = new mongoose.Types.ObjectId(), b1 = new mongoose.Types.ObjectId();
const col = (n: string) => mongoose.connection.db!.collection(n);
const tpl: any = { name: 'battle_update' };

beforeAll(async () => {
  await startMongo();
  await col('hackathons').insertMany([{ _id: h1, tenantId, title: 'Code Sprint' }, { _id: h2, tenantId, title: 'AI Jam' }]);
  await col('hackathonregistrations').insertMany([
    { tenantId, hackathonId: h1, status: 'confirmed', members: [
      { name: 'Ravi Kumar', mobile: '9876500001', isLead: true }, { name: 'Priya', mobile: '9876500002', isLead: false }] },
    { tenantId, hackathonId: h1, status: 'pending_payment', members: [{ name: 'Arun', mobile: '9876500003', isLead: true }] },
    // Same person in another hackathon — one message, not two.
    { tenantId, hackathonId: h2, status: 'confirmed', members: [{ name: 'Ravi Kumar', mobile: '+91 98765 00001', isLead: true }] },
    { tenantId: 'other-tenant', hackathonId: h1, status: 'confirmed', members: [{ name: 'Outsider', mobile: '9000000009', isLead: true }] },
  ]);
  await col('techbattles').insertOne({ _id: b1, tenantId, title: 'Java Battle #3' });
  await col('battleregistrations').insertMany([
    { tenantId, battleId: b1, name: 'Sneha', mobile: '9876511111', whatsapp: '9876522222', status: 'submitted' },
    { tenantId, battleId: b1, name: 'Kiran', mobile: '9876533333', status: 'no_show' },
  ]);
  await col('users').insertMany([
    { tenantId: tid, name: 'Member', phone: '9876544444', passport: { active: true, activatedAt: new Date(), stage: 'build' } },
    // passport.active defaults false on every user — an admin with no membership is never a member.
    { tenantId: tid, name: 'Admin', phone: '9876555555', role: 'TENANT_ADMIN', passport: { active: false } },
  ]);
});
afterAll(stopMongo);

const phones = (r: { phone: string }[]) => r.map((x) => x.phone.replace(/\D/g, '').slice(-10)).sort();

it('lists hackathons and tech battles as recipient lists', () => {
  expect(AUDIENCE_SOURCES.map((s) => s.key)).toEqual(expect.arrayContaining(['hackathons', 'battles']));
});

it('hackathon teams: every member, one message per number, this institute only', async () => {
  const r = await resolveSourceAudience(tenantId, tpl, { source: 'hackathons', pick: {} });
  expect(phones(r.recipients)).toEqual(['9876500001', '9876500002', '9876500003']);
  expect(r.label).toBe('Hackathon teams (all)');
});

it('hackathon teams: narrowed to one event, confirmed, leads only', async () => {
  const r = await resolveSourceAudience(tenantId, tpl, { source: 'hackathons', pick: { hackathonIds: [String(h1)], statuses: ['confirmed'], who: ['lead'] } });
  expect(phones(r.recipients)).toEqual(['9876500001']);
  expect(r.label).toBe('Hackathon teams: Code Sprint · Confirmed · Team leads only');
});

it('hackathon filter counts people, not teams', async () => {
  const f = await getAudienceSource('hackathons')!.filters(tenantId);
  expect(f[0].options.find((o) => o.value === String(h1))!.count).toBe(3);
});

it('tech battle: messages the WhatsApp number when one was given', async () => {
  const r = await resolveSourceAudience(tenantId, tpl, { source: 'battles', pick: {} });
  expect(phones(r.recipients)).toEqual(['9876522222', '9876533333']);
  const only = await resolveSourceAudience(tenantId, tpl, { source: 'battles', pick: { statuses: ['no_show'] } });
  expect(phones(only.recipients)).toEqual(['9876533333']);
});

it('skips numbers this template already reached', async () => {
  await col('whatsappmessagelogs').insertOne({ tenantId: tid, templateName: 'battle_update', to: '919876533333', status: 'delivered' });
  const r = await resolveSourceAudience(tenantId, tpl, { source: 'battles', pick: {}, skipAlreadySent: true });
  expect(phones(r.recipients)).toEqual(['9876522222']);
  expect(r.alreadySent).toBe(1);
});

it('CareerPilot: only real members, never admins', async () => {
  const r = await resolveSourceAudience(tenantId, tpl, { source: 'careerpilot', pick: {} });
  expect(phones(r.recipients)).toEqual(['9876544444']);
});

it('an unknown list is refused', async () => {
  await expect(resolveSourceAudience(tenantId, tpl, { source: 'nope', pick: {} })).rejects.toThrow(/Unknown recipient list/);
});
