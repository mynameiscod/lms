let state: any;
let config: any;
const graph = jest.fn();
const ingest = jest.fn();
const matches = (q: any) => (!q.leaseToken || q.leaseToken === state.leaseToken) && (!q.importToken || q.importToken === state.importToken);
jest.mock('../models/MetaSyncState', () => ({ __esModule: true, default: {
  updateOne: jest.fn(async (q: any, u: any) => { if (!matches(q)) return { matchedCount: 0 }; Object.assign(state, u.$set || {}); for (const key of Object.keys(u.$unset || {})) delete state[key]; return { matchedCount: 1 }; }),
  findOneAndUpdate: jest.fn(async (_q: any, u: any) => {
    const field = u.$set.leaseToken ? 'leaseUntil' : 'importUntil';
    if (state[field] && state[field] > new Date()) return null;
    Object.assign(state, u.$set); return { ...state };
  }),
  findOne: jest.fn(() => ({ lean: async () => ({ ...state }) })),
} }));
jest.mock('../models/LeadSourceConfig', () => ({ __esModule: true, default: { find: () => ({ select: () => ({ lean: async () => [] }) }) } }));
jest.mock('../controllers/leadSourceConfigController', () => ({ getDecryptedTokens: async () => ({ metaAds: config }) }));
jest.mock('../controllers/metaLeadAdsController', () => ({ graphGet: (...args: any[]) => graph(...args), createOrUpdateLeadFromData: (...args: any[]) => ingest(...args) }));
import { graphPages, recoverMetaLeads, MetaSyncBusy, withMetaImportLock } from '../services/metaRecoveryService';
beforeEach(() => { state = {}; config = { pageId: 'page', pageAccessToken: 'token', formIds: [] }; graph.mockReset(); ingest.mockReset().mockResolvedValue('created'); });
async function collect(iterator: AsyncGenerator<any>) { const rows = []; for await (const page of iterator) rows.push(...page); return rows; }
describe('Meta recovery pagination and checkpoints', () => {
  it('fetches subsequent pages through cursors on the same Graph path', async () => {
    graph.mockResolvedValueOnce({ data: [1], paging: { next: 'https://ignored.test', cursors: { after: 'cursor' } } }).mockResolvedValueOnce({ data: [2] });
    expect(await collect(graphPages(graph, 'page/forms', 'token', { limit: '100' }))).toEqual([1, 2]);
    expect(graph.mock.calls[1]).toEqual(['page/forms', 'token', { limit: '100', after: 'cursor' }]);
  });
  it('fails rather than looping or accepting incomplete pagination', async () => {
    graph.mockResolvedValue({ data: [], paging: { next: 'more', cursors: { after: 'same' } } });
    await expect(collect(graphPages(graph, 'page/forms', 'token', {}))).rejects.toThrow('did not advance');
  });
  it('fetches all form and lead pages, then persists a checkpoint and clears the lease', async () => {
    graph.mockResolvedValueOnce({ data: [{ id: 'f1' }], paging: { next: 'more', cursors: { after: 'forms2' } } })
      .mockResolvedValueOnce({ data: [{ id: 'l1' }], paging: { next: 'more', cursors: { after: 'leads2' } } })
      .mockResolvedValueOnce({ data: [{ id: 'l2' }] }).mockResolvedValueOnce({ data: [{ id: 'f2' }] })
      .mockResolvedValueOnce({ data: [{ id: 'l3' }] });
    const result = await recoverMetaLeads('tenant');
    expect(result.created).toBe(3); expect(ingest).toHaveBeenCalledTimes(3);
    expect(state.checkpoint).toBeInstanceOf(Date); expect(state.status).toBe('healthy'); expect(state.leaseUntil).toBeUndefined();
  });
  it('preserves the previous checkpoint if a lead page fails', async () => {
    const previous = new Date('2026-10-10T00:00:00Z'); state = { checkpoint: previous, connectionKey: JSON.stringify(['page', []]) };
    graph.mockResolvedValueOnce({ data: [{ id: 'f1' }] }).mockRejectedValueOnce(new Error('Token expired'));
    await expect(recoverMetaLeads('tenant')).rejects.toThrow('Token expired');
    expect(state.checkpoint).toBe(previous); expect(state.status).toBe('needs_attention'); expect(state.lastError).toBe('Token expired'); expect(state.leaseUntil).toBeUndefined();
  });
  it('uses an overlapping saved checkpoint and honors configured forms', async () => {
    state = { checkpoint: new Date('2026-10-10T10:00:00Z'), connectionKey: JSON.stringify(['page', ['f2']]) }; config.formIds = ['f2'];
    graph.mockResolvedValueOnce({ data: [{ id: 'f1' }, { id: 'f2' }] }).mockResolvedValueOnce({ data: [] });
    await recoverMetaLeads('tenant');
    expect(graph.mock.calls[1][0]).toBe('f2/leads'); expect(graph.mock.calls[1][2].since).toBe(String(Date.parse('2026-10-10T09:50:00Z') / 1000));
  });
  it('rejects simultaneous manual and scheduled syncs without releasing the other lease', async () => {
    state = { leaseUntil: new Date(Date.now() + 60000), leaseToken: 'other' };
    await expect(recoverMetaLeads('tenant')).rejects.toBeInstanceOf(MetaSyncBusy); expect(state.leaseToken).toBe('other'); expect(graph).not.toHaveBeenCalled();
  });
  it('releases an import lock after a failed write so recovery can retry', async () => {
    await expect(withMetaImportLock('tenant', async () => { throw new Error('write failed'); })).rejects.toThrow('write failed');
    expect(state.importUntil).toBeUndefined(); expect(state.importToken).toBeUndefined();
  });
  it('shows missing form configuration as a failure and retains the checkpoint', async () => {
    config.formIds = ['missing']; graph.mockResolvedValue({ data: [{ id: 'other' }] });
    await expect(recoverMetaLeads('tenant')).rejects.toThrow('form was not found'); expect(state.checkpoint).toBeUndefined();
  });
});

describe('Meta subscription health', () => {
  it('verifies both the app callback and Page leadgen subscription and records expiry', async () => {
    config.appId = 'app'; config.appSecret = 'secret';
    graph.mockImplementation(async (path: string) => {
      if (path === 'oauth/access_token') return { access_token: 'app-token' };
      if (path === 'app/subscriptions') return { data: [{ object: 'page', callback_url: 'https://platform.codebegun.com/api/v1/meta-leads/webhook', fields: [{ name: 'leadgen' }] }] };
      if (path === 'page/subscribed_apps') return { data: [{ id: 'app', subscribed_fields: ['leadgen'] }] };
      if (path === 'debug_token') return { data: { is_valid: true, expires_at: 1800000000 } };
      return { data: [] };
    });
    await recoverMetaLeads('tenant'); expect(state.webhookStatus).toBe('verified'); expect(state.tokenExpiresAt).toEqual(new Date(1800000000000));
  });
  it('reports missing Page subscription while continuing recovery import', async () => {
    config.appId = 'app'; config.appSecret = 'secret';
    graph.mockImplementation(async (path: string) => path === 'oauth/access_token' ? { access_token: 'app-token' } : path === 'debug_token' ? { data: { is_valid: true, expires_at: 0 } } : { data: [] });
    await recoverMetaLeads('tenant'); expect(state.webhookStatus).toBe('needs_setup'); expect(state.status).toBe('healthy');
  });
});
