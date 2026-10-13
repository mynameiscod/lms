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

// Outpero only calls between 9 AM and 8 PM India time; these tests are about sending, so pin the clock to midday there.
const NOON_IST = Date.UTC(2026, 9, 14, 12, 0) - 330 * 60_000;
beforeEach(() => {
  jest.spyOn(Date, 'now').mockReturnValue(NOON_IST);
  for (const k of Object.keys(settingsValues)) delete settingsValues[k];
  leads.clear(); updates.length = 0; fetchMock.mockReset();
});

afterEach(() => { jest.restoreAllMocks(); });

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

describe('the name Outpero says aloud', () => {
  it('writes ALL CAPS and lower case as a normal name', () => {
    expect(svc.cleanName('RAVI KUMAR')).toBe('Ravi Kumar');
    expect(svc.cleanName('muni mohan sammana')).toBe('Muni Mohan Sammana');
    expect(svc.cleanName("o'neil")).toBe("O'Neil");
    expect(svc.cleanName('MARY-ANN')).toBe('Mary-Ann');
    expect(svc.cleanName('DR. PRIYA')).toBe('Dr. Priya');
    expect(svc.cleanName('JOSÉ')).toBe('José');
    expect(svc.cleanName('  Ravi    Kumar  ')).toBe('Ravi Kumar');
  });

  it('takes emojis, digits and symbols out of a name that has real letters', () => {
    expect(svc.cleanName('❤️SHAD SIDDIQUI')).toBe('Shad Siddiqui');
    expect(svc.cleanName('Raju123')).toBe('Raju');
    expect(svc.cleanName('~~ Anil _ Reddy ~~')).toBe('Anil Reddy');
  });

  it('gives nothing back when no readable name is left', () => {
    for (const bad of ['', '   ', '..', '@@@', '😊', '1234567890', 'A', '-', null, undefined]) expect(svc.cleanName(bad as any)).toBe('');
  });

  it('refuses a name in another script, even with English letters beside it', () => {
    expect(svc.cleanName('అజయ్')).toBe('');
    expect(svc.cleanName('राहुल शर्मा')).toBe('');
    expect(svc.cleanName('Ravi అజయ్')).toBe('');
  });

  it('keeps a very long name to a sensible length', () => {
    const n = svc.cleanName('Averyveryverylong '.repeat(10));
    expect(n.length).toBeLessThanOrEqual(40);
    expect(n.endsWith(' ')).toBe(false);
  });

  it('sends the readable name, or the stand-in, and never touches the lead’s own name', async () => {
    connect('auto'); answer(200);
    const cases: [string, string][] = [['GOHAR KHAN', 'Gohar Khan'], ['❤️SHAD SIDDIQUI', 'Shad Siddiqui'], ['..', 'Shiva'], ['', 'Shiva'], ['రమేష్', 'Shiva'], ['1234', 'Shiva']];
    for (const [i, [raw, expected]] of cases.entries()) {
      const id = `N${i}`;
      leads.set(id, { ...lead({ _id: id, name: raw }), outpero: { status: 'pending', attempts: 0 } });
      await svc.sendLead(id);
      expect([raw, JSON.parse(fetchMock.mock.calls[i][1].body).lead_name]).toEqual([raw, expected]);
      expect(leads.get(id).name).toBe(raw);
      expect(leads.get(id).outpero.sentName).toBe(expected);
    }
    // No write ever sets the lead's name.
    expect(updates.some((u) => u.u?.$set && 'name' in u.u.$set)).toBe(false);
    // The timeline says when a stand-in was used.
    const standIn = updates.find((u) => /cannot be read aloud/.test(JSON.stringify(u.u?.$push || '')));
    expect(standIn).toBeTruthy();
  });

  it('uses the institute’s own stand-in name when one is set, and Shiva when that is unusable', async () => {
    connect('auto'); answer(200);
    settingsValues.OUTPERO_FALLBACK_NAME = 'siva';
    expect(svc.speakableName('..', T)).toEqual({ name: 'Siva', standIn: true });
    expect(svc.speakableName('Ravi', T)).toEqual({ name: 'Ravi', standIn: false });
    settingsValues.OUTPERO_FALLBACK_NAME = '😊';
    expect(svc.speakableName('..', T).name).toBe('Shiva');
    delete settingsValues.OUTPERO_FALLBACK_NAME;
    expect(svc.getConfig(T).fallbackName).toBe('Shiva');
  });

  it('checks the stand-in name when it is saved, and the test call also gets a readable name', async () => {
    connect('auto'); answer(200);
    await expect(svc.saveConfig(T, 'u1', { mode: 'auto', endpointUrl: 'https://api.outpero.com/x', fallbackName: 'రమేష్' })).rejects.toThrow('simple first name');
    await svc.saveConfig(T, 'u1', { mode: 'auto', endpointUrl: 'https://api.outpero.com/x', fallbackName: 'SIVA' });
    expect(settingsValues.OUTPERO_FALLBACK_NAME).toBe('Siva');
    await svc.testSend(T, { name: 'TEST PERSON', phone: '9876543210' });
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).lead_name).toBe('Test Person');
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

describe('contact suppression', () => {
  it('never sends an opted-out lead', async () => {
    connect(); leads.set('L1', lead({ outpero: { status: 'pending' }, aiFeedback: { doNotContact: true } }));
    await svc.sendLead('L1'); expect(fetchMock).not.toHaveBeenCalled();
  });
  it('never sends an archived lead', async () => {
    connect(); leads.set('L1', lead({ outpero: { status: 'pending' }, archivedAt: new Date() }));
    await svc.sendLead('L1'); expect(fetchMock).not.toHaveBeenCalled();
  });
});
