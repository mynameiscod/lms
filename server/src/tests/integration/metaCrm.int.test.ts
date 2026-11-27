/**
 * Meta CRM conversion events (outbox + sender) and ad spend sync. Real database; the
 * settings and Meta's HTTP API are stood in for.
 */
import mongoose from 'mongoose';
import crypto from 'crypto';
import { startMongo, stopMongo, clearCollections } from './mongoHarness';

jest.setTimeout(180_000);

const values: Record<string, string> = {};
jest.mock('../../services/settingsService', () => ({
  getStr: (k: string, fallback = '') => values[k] ?? fallback,
  getNum: (k: string, fallback: number) => (values[k] ? Number(values[k]) : fallback),
  getCredential: (k: string) => values[k] ?? '',
  getPlatformOwnerTenant: () => null,
  isPlatformOwner: () => true,
  loadAll: async () => {},
  setMany: jest.fn(),
}));
jest.mock('../../services/googleSheetSyncService', () => ({ pushLeadStageChange: jest.fn().mockResolvedValue(undefined) }));
jest.mock('../../services/whatsAppDripService', () => ({ scheduleDripOnStageEntry: jest.fn().mockResolvedValue(undefined) }));
const fetchMock = jest.fn();
(global as any).fetch = (...a: any[]) => fetchMock(...a);

import Lead from '../../models/Lead';
import LeadStage from '../../models/LeadStage';
import MetaCrmEvent from '../../models/MetaCrmEvent';
import AdSpendDaily from '../../models/AdSpendDaily';
import { changeStage } from '../../services/leadLifecycleService';
import { processDueMetaEvents, normalisePhone, buildEvent, serialiseBody, sha256 } from '../../services/metaCrmEventService';
import { syncSpendRange, getSpendByCampaign } from '../../services/metaAdSpendService';

const T = new mongoose.Types.ObjectId();
const ADMIN = { id: String(new mongoose.Types.ObjectId()), role: 'TENANT_ADMIN' };
const META_ID = '1234567890123456789'; // 19 digits — beyond JS number precision on purpose
let fresh: any, contacting: any, qualified: any;

beforeAll(async () => { await startMongo(); });
afterAll(async () => { await stopMongo(); });
beforeEach(async () => {
  await clearCollections();
  for (const k of Object.keys(values)) delete values[k];
  fetchMock.mockReset();
  Object.assign(values, { META_CRM_MODE: 'live', META_CRM_DATASET_ID: '999888777', META_CRM_ACCESS_TOKEN: 'EAAtoken', META_CRM_SOURCE_NAME: 'CodeBegun LMS' });
  const mk = (name: string, order: number, extra: any = {}) => LeadStage.create({ tenantId: T, name, order, color: '#000000', isActive: true, ...extra } as any);
  fresh = await mk('New Lead', 0, { milestone: 'new', isDefault: true });
  contacting = await mk('Contacting', 1, { milestone: 'contacting' });
  qualified = await mk('Qualified', 2, { milestone: 'qualified', metaEventName: 'QualifiedLead' });
});

const metaLead = (over: any = {}) => Lead.create({
  tenantId: T, name: 'Ravi', phone: '98765 43210', email: ' Ravi@Example.com ', stageId: fresh._id, createdBy: ADMIN.id,
  courseInterest: [], metaSubmissionIds: [META_ID], ...over,
} as any);
const move = (lead: any, stage: any) => changeStage({ tenantId: String(T), leadId: String(lead._id), stageId: String(stage._id), actor: ADMIN, source: 'bulk' });
/** enqueue is fire-and-forget; wait for it to land. */
const settle = async (n: number) => { for (let i = 0; i < 50; i++) { if (await MetaCrmEvent.countDocuments({ tenantId: T }) >= n) return; await new Promise(r => setTimeout(r, 20)); } };
const answer = (status: number, body: any = { events_received: 1 }) =>
  fetchMock.mockResolvedValue({ ok: status < 300, status, text: async () => JSON.stringify(body), json: async () => body });

describe('queueing', () => {
  it('queues each milestone once (plus the initial lead stage); reaching it again adds nothing', async () => {
    const lead = await metaLead();
    await move(lead, qualified); // jump: contacting + connected + qualified implied
    await settle(4);
    let events = await MetaCrmEvent.find({ tenantId: T }).lean();
    expect(events.map(e => e.milestone).sort()).toEqual(['connected', 'contacting', 'new', 'qualified']);
    expect(events.find(e => e.milestone === 'qualified')!.eventName).toBe('QualifiedLead');
    expect(events.every(e => e.status === 'pending')).toBe(true);
    expect(events.find(e => e.milestone === 'qualified')!.eventId).toBe(`crm-${lead._id}-qualified`);

    await move(lead, contacting);
    await move(lead, qualified);
    await new Promise(r => setTimeout(r, 100));
    events = await MetaCrmEvent.find({ tenantId: T }).lean();
    expect(events).toHaveLength(4);
  });

  it('a lead that did not come from Meta Lead Ads is recorded as skipped, never sent', async () => {
    const lead = await metaLead({ metaSubmissionIds: [] });
    await move(lead, contacting);
    await settle(1);
    const events = await MetaCrmEvent.find({ tenantId: T }).lean();
    expect(events).toHaveLength(1);
    expect(events[0].status).toBe('skipped');
    await processDueMetaEvents();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('off mode queues nothing at all', async () => {
    values.META_CRM_MODE = 'off';
    const lead = await metaLead();
    await move(lead, qualified);
    await new Promise(r => setTimeout(r, 150));
    expect(await MetaCrmEvent.countDocuments({})).toBe(0);
  });
});

describe('sending', () => {
  it('posts Meta’s CRM payload: system_generated, event_source crm, exact lead_id, hashed phone/email; token in a header', async () => {
    const lead = await metaLead();
    await move(lead, contacting);
    await settle(2);
    answer(200);
    await processDueMetaEvents();
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toMatch(/^https:\/\/graph\.facebook\.com\/v\d+\.0\/999888777\/events$/);
    expect(url).not.toMatch(/token/);
    expect(init.headers.Authorization).toBe('Bearer EAAtoken');
    expect(init.body).toContain(`"lead_id":${META_ID}`); // bare number, every digit kept
    const body = JSON.parse(init.body.replace(`"lead_id":${META_ID}`, `"lead_id":"${META_ID}"`));
    const ev = body.data[0];
    expect(ev).toMatchObject({ action_source: 'system_generated', custom_data: { event_source: 'crm', lead_event_source: 'CodeBegun LMS' } });
    expect(ev.user_data.ph).toEqual([sha256('919876543210')]);
    expect(ev.user_data.em).toEqual([sha256('ravi@example.com')]);
    expect(body.test_event_code).toBeUndefined();
    expect(await MetaCrmEvent.countDocuments({ status: 'sent' })).toBe(2);
  });

  it('test mode attaches the test event code', async () => {
    values.META_CRM_MODE = 'test'; values.META_CRM_TEST_EVENT_CODE = 'TEST123';
    const lead = await metaLead();
    await move(lead, contacting);
    await settle(2);
    answer(200);
    await processDueMetaEvents();
    expect(fetchMock.mock.calls[0][1].body).toContain('"test_event_code":"TEST123"');
  });

  it('retries a 5xx later; fails a 400 for good', async () => {
    const lead = await metaLead();
    await move(lead, contacting);
    await settle(2);
    answer(503, { error: { message: 'down' } });
    await processDueMetaEvents();
    let evs = await MetaCrmEvent.find({ tenantId: T }).lean();
    expect(evs.every(e => e.status === 'pending' && e.attempts === 1 && e.nextAttemptAt! > new Date())).toBe(true);

    await MetaCrmEvent.updateMany({}, { $set: { nextAttemptAt: new Date(0) } });
    answer(400, { error: { message: 'Invalid lead_id' } });
    await processDueMetaEvents();
    evs = await MetaCrmEvent.find({ tenantId: T }).lean();
    expect(evs.every(e => e.status === 'failed' && e.lastError === 'Invalid lead_id')).toBe(true);
  });

  it('a network error is retried', async () => {
    const lead = await metaLead();
    await move(lead, contacting);
    await settle(2);
    fetchMock.mockRejectedValue(new Error('ECONNRESET'));
    await processDueMetaEvents();
    const evs = await MetaCrmEvent.find({ tenantId: T }).lean();
    expect(evs.every(e => e.status === 'pending' && e.lastError === 'ECONNRESET')).toBe(true);
  });

  it('an event older than Meta’s 7-day limit is skipped, not sent', async () => {
    const lead = await metaLead();
    await MetaCrmEvent.create({ tenantId: T, leadId: lead._id, milestone: 'qualified', eventName: 'Q', eventId: 'crm-x-q', eventTime: new Date(Date.now() - 8 * 86_400_000), status: 'pending', nextAttemptAt: new Date(0), mode: 'live' });
    await processDueMetaEvents();
    expect(fetchMock).not.toHaveBeenCalled();
    expect((await MetaCrmEvent.findOne({ eventId: 'crm-x-q' }).lean())!.status).toBe('skipped');
  });
});

describe('hashing helpers', () => {
  it('normalises Indian phones to 91 + 10 digits', () => {
    expect(normalisePhone('+91 98765-43210')).toBe('919876543210');
    expect(normalisePhone('09876543210')).toBe('919876543210');
    expect(normalisePhone('9876543210')).toBe('919876543210');
    expect(normalisePhone('123')).toBeNull();
  });
  it('sha256 matches Node crypto and the body keeps lead_id digits', () => {
    expect(sha256('a')).toBe(crypto.createHash('sha256').update('a').digest('hex'));
    const ev = buildEvent({ eventName: 'X', eventTime: new Date(), eventId: 'e' }, { metaSubmissionIds: [META_ID] }, 'CRM');
    expect(serialiseBody([ev])).toContain(`"lead_id":${META_ID}`);
  });
});

describe('ad spend', () => {
  beforeEach(() => { values.META_AD_ACCOUNT_ID = 'act_111222333'; values.META_ADS_ACCESS_TOKEN = 'EAAads'; });
  const page = (rows: any[], after?: string) => ({ data: rows, ...(after ? { paging: { cursors: { after }, next: 'https://graph.facebook.com/next' } } : {}) });
  const row = (day: string, ad: string, spend: string) => ({ date_start: day, ad_id: ad, ad_name: 'Ad ' + ad, campaign_id: 'c1', campaign_name: 'Camp', adset_id: 's1', adset_name: 'Set', spend, impressions: '100', clicks: '5', account_currency: 'INR' });

  it('follows cursors, upserts per ad per day, and re-running does not duplicate', async () => {
    fetchMock
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => page([row('2026-11-01', 'a1', '100.50')], 'CUR') })
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => page([row('2026-11-01', 'a2', '50')]) });
    const r = await syncSpendRange(String(T), '2026-11-01', '2026-11-01');
    expect(r.rows).toBe(2);
    expect(fetchMock.mock.calls[1][0]).toContain('after=CUR');
    expect(fetchMock.mock.calls[0][0]).not.toContain('EAAads');

    fetchMock.mockReset();
    fetchMock.mockResolvedValueOnce({ ok: true, status: 200, json: async () => page([row('2026-11-01', 'a1', '120'), row('2026-11-01', 'a2', '50')]) });
    await syncSpendRange(String(T), '2026-11-01', '2026-11-01');
    expect(await AdSpendDaily.countDocuments({ tenantId: T })).toBe(2);
    const byCamp = await getSpendByCampaign(String(T), new Date('2026-10-30'), new Date('2026-11-02'));
    expect(byCamp).toEqual([{ campaignId: 'c1', campaignName: 'Camp', spend: 170, impressions: 200, clicks: 10 }]);
  });

  it('refuses without an ad account and token', async () => {
    values.META_AD_ACCOUNT_ID = '';
    await expect(syncSpendRange(String(T), '2026-11-01', '2026-11-01')).rejects.toThrow(/ad account/);
  });
});
