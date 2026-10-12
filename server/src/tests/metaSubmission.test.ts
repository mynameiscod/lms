const leads: any[] = [];
const updates: any[] = [];
const score = jest.fn(async (..._args: any[]) => {});
const enqueue = jest.fn(async (..._args: any[]) => {});
const revive = jest.fn(async (..._args: any[]) => {});
jest.mock('../models/Lead', () => {
  class FakeLead {
    static exists = async (q: any) => leads.some(l => String(l.tenantId) === String(q.tenantId) && l.metaSubmissionIds?.includes(q.metaSubmissionIds));
    static findOne = async (q: any) => leads.find(l => String(l.tenantId) === String(q.tenantId) && new RegExp(q.phone.$regex).test(l.phone)) || null;
    static updateOne = async (q: any, u: any) => { updates.push(u); const l = leads.find(l => l._id === q._id); if (u.$addToSet) { l.metaSubmissionIds ||= []; if (!l.metaSubmissionIds.includes(u.$addToSet.metaSubmissionIds)) l.metaSubmissionIds.push(u.$addToSet.metaSubmissionIds); } return { modifiedCount: 1 }; };
    _id = '65a0000000000000000000bb';
    constructor(data: any) { Object.assign(this, data); }
    save = async () => { leads.push(this); };
  }
  return { __esModule: true, default: FakeLead };
});
jest.mock('../models/LeadStage', () => ({ __esModule: true, default: { findOne: () => ({ sort: async () => ({ _id: '65a0000000000000000000cc' }) }) } }));
jest.mock('../models/User', () => ({ __esModule: true, default: { findOne: () => ({ select: () => ({ lean: async () => ({ _id: '65a0000000000000000000dd' }) }) }) } }));
jest.mock('../models/AICallConfig', () => ({ __esModule: true, default: { findOne: async () => null } }));
jest.mock('../services/leadScoringService', () => ({ scoreAndAssignLead: (...a: any[]) => score(...a) }));
jest.mock('../services/aiCallQueueService', () => ({ enqueueAICall: (...a: any[]) => enqueue(...a) }));
jest.mock('../services/leadArchiveService', () => ({ reviveIfArchived: (...a: any[]) => revive(...a) }));
jest.mock('../services/metaRecoveryService', () => ({ withMetaImportLock: async (_t: string, fn: any) => fn() }));
jest.mock('../controllers/leadSourceConfigController', () => ({ getDecryptedTokens: async () => null }));
import { createOrUpdateLeadFromData } from '../controllers/metaLeadAdsController';
const tenant = '65a0000000000000000000aa';
const submission = (id: string) => ({ id, created_time: '2026-10-12T09:00:00Z', field_data: [{ name: 'phone_number', values: ['9876543210'] }, { name: 'full_name', values: ['Ravi'] }] });
beforeEach(() => { leads.length = 0; updates.length = 0; score.mockClear(); enqueue.mockClear(); revive.mockClear(); });
describe('Meta webhook and recovery submission deduplication', () => {
  it('creates a lead once and skips a re-delivery of the same submission', async () => {
    expect(await createOrUpdateLeadFromData(submission('m1'), 'form', tenant)).toBe('created');
    expect(await createOrUpdateLeadFromData(submission('m1'), 'form', tenant)).toBe('skipped');
    expect(leads).toHaveLength(1); expect(score).toHaveBeenCalledTimes(1); expect(leads[0].activities[0].metadata.metaSubmissionId).toBe('m1');
  });
  it('records a new submission on the same phone once without creating a new lead or call', async () => {
    await createOrUpdateLeadFromData(submission('m1'), 'form', tenant); leads[0].get = () => '';
    expect(await createOrUpdateLeadFromData(submission('m2'), 'form', tenant)).toBe('updated');
    expect(await createOrUpdateLeadFromData(submission('m2'), 'form', tenant)).toBe('skipped');
    expect(leads).toHaveLength(1); expect(updates.filter(u => u.$push?.activities)).toHaveLength(1); expect(enqueue).not.toHaveBeenCalled();
  });
  it('does not revive an archived lead for a historical submission', async () => {
    await createOrUpdateLeadFromData(submission('m1'), 'form', tenant); leads[0].archivedAt = new Date('2026-10-13T09:00:00Z');
    expect(await createOrUpdateLeadFromData(submission('historical'), 'form', tenant)).toBe('skipped'); expect(revive).not.toHaveBeenCalled();
  });
});
