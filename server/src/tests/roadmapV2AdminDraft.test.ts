/**
 * The draft priorities from the admin screen — production's way to get them without a shell.
 * Preview writes nothing; apply writes, and records the FIRST write in the migration ledger so
 * RV2_M001 --rollback can still restore the curricula to how they were before V2.
 */
const mockCompute = jest.fn();
const mockApply = jest.fn();
const mockGetApplied = jest.fn();
const mockRecord = jest.fn();
jest.mock('../services/topicPriorityService', () => ({
  PRIORITY_STAGES: ['foundation', 'build', 'specialize', 'placement'],
  computeDraft: (...a: any[]) => mockCompute(...a),
  applyDraft: (...a: any[]) => mockApply(...a),
  listStagePriorities: jest.fn(), setTopicPriority: jest.fn(), stageBudgets: jest.fn(), loadAllStages: jest.fn(),
}));
jest.mock('../migrations/roadmap-v2/_ledger', () => ({
  getApplied: (...a: any[]) => mockGetApplied(...a),
  recordApplied: (...a: any[]) => mockRecord(...a),
}));
jest.mock('../models/PassportConfig', () => ({ __esModule: true, default: { findOne: jest.fn() } }));

import * as ctrl from '../controllers/roadmapV2AdminController';

const draft = (stage: string, rows: any[]) => ({
  stage, curriculumId: 'c-' + stage, rows, demoted: [], overCap: false,
  budget: { programDays: 90, dailyMinutes: 150, budgetMinutes: 13500, bridgeMinutes: 0, mustCapMinutes: 13500 },
  before: {}, after: { MUST: { topics: 1, minutes: 60 }, SHOULD: { topics: 0, minutes: 0 }, OPTIONAL: { topics: 0, minutes: 0 }, UNSET: { topics: 0, minutes: 0 } },
});
const resOf = () => { const out: any = {}; const res: any = { status: (s: number) => { out.status = s; return res; }, json: (b: any) => { out.body = b; return res; } }; return { res, out }; };
const req: any = { user: { tenantId: 'T1', id: 'admin1' } };

beforeEach(() => {
  [mockCompute, mockApply, mockGetApplied, mockRecord].forEach(m => m.mockReset());
  mockCompute.mockResolvedValue([draft('foundation', [
    { topicCode: 'A', current: undefined, draft: 'MUST' },
    { topicCode: 'B', current: 'OPTIONAL', source: 'ADMIN', draft: 'OPTIONAL' },
  ])]);
});

it('previews without writing anything, and counts admin-set topics as kept', async () => {
  const { res, out } = resOf();
  await ctrl.previewDraft(req, res);
  expect(mockApply).not.toHaveBeenCalled();
  expect(out.body.stages[0]).toMatchObject({ stage: 'foundation', changes: 1, adminSet: 1 });
});

it('records the first application in the migration ledger, so rollback still works', async () => {
  mockApply.mockResolvedValue({ written: 1, prior: [{ curriculumId: 'c-foundation', topicCode: 'A' }] });
  mockGetApplied.mockResolvedValue(null);
  const { res, out } = resOf();
  await ctrl.applyDraftNow(req, res);
  expect(out.body.written).toBe(1);
  expect(mockRecord).toHaveBeenCalledWith(expect.objectContaining({ migration: 'RV2_M001_topicPriorityDraft', tenantId: 'T1', prior: [{ curriculumId: 'c-foundation', topicCode: 'A' }] }));
});

it('does not replace the original ledger entry on a later application', async () => {
  mockApply.mockResolvedValue({ written: 2, prior: [] });
  mockGetApplied.mockResolvedValue({ _id: 'RV2_M001_topicPriorityDraft:T1' });
  const { res } = resOf();
  await ctrl.applyDraftNow(req, res);
  expect(mockRecord).not.toHaveBeenCalled();
});
