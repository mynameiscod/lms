const settingsValues: Record<string, string> = {};
jest.mock('../services/settingsService', () => ({
  getStr: (k: string, fallback = '') => settingsValues[k] ?? fallback,
  getNum: (k: string, fallback: number) => (settingsValues[k] ? Number(settingsValues[k]) : fallback),
  setMany: jest.fn(async (entries: { key: string; value: string }[]) => { for (const e of entries) if (e.value !== '__UNCHANGED__') settingsValues[e.key] = e.value; }),
}));

const leads = new Map<string, any>();
const updates: any[] = [];
jest.mock('../models/Lead', () => ({
  __esModule: true,
  default: {
    findById: jest.fn((id: string) => ({ select: () => ({ lean: async () => leads.get(String(id)) }) })),
    updateOne: jest.fn(async (filter: any, u: any) => {
      updates.push({ filter, u });
      const l = leads.get(String(filter._id));
      if (l && u.$set?.outpero) l.outpero = { ...u.$set.outpero };
      if (l && u.$set) for (const [k, v] of Object.entries(u.$set)) if (k.startsWith('outpero.')) { l.outpero = l.outpero || {}; l.outpero[k.slice(8)] = v; }
      return { modifiedCount: 1 };
    }),
    find: jest.fn(() => ({ select: () => ({ sort: () => ({ limit: () => ({ lean: async () => [{ _id: 'a' }, { _id: 'b' }, { _id: 'c' }] }) }) }) })),
    bulkWrite: jest.fn(async (ops: any[]) => { updates.push({ bulk: ops }); return {}; }),
  },
}));

const fetchMock = jest.fn();
(global as any).fetch = (...a: any[]) => fetchMock(...a);

import * as svc from '../services/outperoForwardService';

const T = '69c7723868202a8e4616ef3d';
const lead = (over: any = {}) => ({ _id: 'L1', tenantId: T, name: 'Ravi', phone: '9876543210', source: 'meta_form', courseInterest: ['Java Full Stack'], createdBy: 'u1', ...over });
const connect = (mode = 'auto') => Object.assign(settingsValues, { OUTPERO_MODE: mode, OUTPERO_ENDPOINT_URL: 'https://api.outpero.com/lead-intake/x', OUTPERO_LEAD_SECRET: 's'.repeat(24) });
const answer = (status: number) => fetchMock.mockResolvedValue({ ok: status < 300, status, text: async () => '' });

beforeEach(() => {
  for (const k of Object.keys(settingsValues)) delete settingsValues[k];
  leads.clear(); updates.length = 0; fetchMock.mockReset();
});

describe('toE164', () => {
  it('normalises Indian numbers in every shape the sources send', () => {
    expect(svc.toE164('9876543210')).toBe('+919876543210');
    expect(svc.toE164('919876543210')).toBe('+919876543210');
    expect(svc.toE164('+91 98765 43210')).toBe('+919876543210');
    expect(svc.toE164('09876543210')).toBe('+919876543210');
    expect(svc.toE164('12345')).toBeNull();
  });
});

describe('matchesFilters', () => {
  it('lets everyone through with no filters and narrows by source and course', () => {
    expect(svc.matchesFilters(lead(), { sources: [], courses: [] })).toBe(true);
    expect(svc.matchesFilters(lead(), { sources: ['website'], courses: [] })).toBe(false);
    expect(svc.matchesFilters(lead(), { sources: [], courses: ['java'] })).toBe(true);
    expect(svc.matchesFilters(lead(), { sources: [], courses: ['python'] })).toBe(false);
  });
});

describe('modes', () => {
  it('Off and Manual never send a new lead on their own', async () => {
    for (const mode of ['off', 'manual']) {
      connect(mode);
      leads.set('L1', lead());
      await svc.onLeadCreated(lead());
      expect(fetchMock).not.toHaveBeenCalled();
    }
  });

  it('Automatic sends a matching new lead with the fields Outpero expects', async () => {
    connect('auto');
    answer(200);
    leads.set('L1', { ...lead(), outpero: { status: 'pending', attempts: 0 } });
    await svc.onLeadCreated(lead());
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.outpero.com/lead-intake/x');
    expect(init.headers['X-Outpero-Lead-Secret']).toBe('s'.repeat(24));
    expect(JSON.parse(init.body)).toEqual({ lead_name: 'Ravi', phone: '+919876543210', course: 'Java Full Stack', lms_lead_id: 'L1', source: 'meta_form' });
    expect(leads.get('L1').outpero.status).toBe('sent');
  });

  it('Automatic skips leads outside the filters', async () => {
    connect('auto');
    settingsValues.OUTPERO_SOURCES = 'website';
    await svc.onLeadCreated(lead());
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('delivery outcomes', () => {
  beforeEach(() => connect('auto'));

  it('retries a network failure or 5xx later', async () => {
    fetchMock.mockRejectedValue(new Error('ECONNRESET'));
    leads.set('L1', { ...lead(), outpero: { status: 'pending', attempts: 0 } });
    await svc.sendLead('L1');
    expect(leads.get('L1').outpero.status).toBe('pending');
    expect(leads.get('L1').outpero.nextAttemptAt.getTime()).toBeGreaterThan(Date.now());
  });

  it('does not retry a wrong secret (401) and says why on the timeline', async () => {
    answer(401);
    leads.set('L1', { ...lead(), outpero: { status: 'pending', attempts: 0 } });
    await svc.sendLead('L1');
    expect(leads.get('L1').outpero.status).toBe('failed');
    const pushed = updates.find((u) => u.u?.$push)?.u.$push.activities.description;
    expect(pushed).toMatch(/401/);
  });

  it('fails a lead with no usable phone without calling Outpero', async () => {
    leads.set('L1', { ...lead({ phone: '123' }), outpero: { status: 'pending', attempts: 0 } });
    await svc.sendLead('L1');
    expect(fetchMock).not.toHaveBeenCalled();
    expect(leads.get('L1').outpero.status).toBe('failed');
  });

  it('leaves a queued lead waiting if sending was switched Off meanwhile', async () => {
    settingsValues.OUTPERO_MODE = 'off';
    leads.set('L1', { ...lead(), outpero: { status: 'pending', attempts: 0 } });
    await svc.sendLead('L1');
    expect(fetchMock).not.toHaveBeenCalled();
    expect(leads.get('L1').outpero.status).toBe('pending');
  });
});

describe('bulk send', () => {
  it('is refused while Off', async () => {
    connect('off');
    await expect(svc.startBulk(T, {})).rejects.toThrow(/Off/);
  });

  it('spaces the queue at the configured leads-per-minute', async () => {
    connect('manual');
    settingsValues.OUTPERO_PER_MINUTE = '2';
    const r = await svc.startBulk(T, {});
    expect(r).toEqual({ queued: 3, etaMinutes: 2 });
    const ops = updates.find((u) => u.bulk).bulk;
    const times = ops.map((o: any) => o.updateOne.update.$set.outpero.nextAttemptAt.getTime());
    expect(times[1] - times[0]).toBe(30_000);
  });
});

describe('saving the configuration', () => {
  it('will not turn sending on without an endpoint and secret, and only accepts https', async () => {
    await expect(svc.saveConfig(T, 'u1', { mode: 'auto' })).rejects.toThrow(/endpoint/);
    await expect(svc.saveConfig(T, 'u1', { mode: 'manual', endpointUrl: 'http://x', secret: 's'.repeat(20) })).rejects.toThrow(/https/);
    await expect(svc.saveConfig(T, 'u1', { mode: 'auto', endpointUrl: 'https://api.outpero.com/lead-intake/x', secret: 's'.repeat(20) })).resolves.toMatchObject({ mode: 'auto', secretSet: true });
  });
});
