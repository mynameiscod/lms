const OWNER = '69c7723868202a8e4616ef3d';
const COLLEGE = '6ac8c2f377f023a80d249660';

let tenantLimits: any = { maxStudents: 2, maxStaff: null, aiBudgetInrMonthly: 100 };
let students = 2;
let spend = 0;
jest.mock('../models/Tenant', () => ({ __esModule: true, default: { findById: () => ({ select: () => ({ lean: async () => ({ limits: tenantLimits }) }) }) } }));
jest.mock('../models/User', () => ({ __esModule: true, default: { countDocuments: jest.fn(async () => students) } }));
jest.mock('../models/AiUsage', () => ({ __esModule: true, default: { aggregate: jest.fn(async () => [{ inr: spend }]) } }));
jest.mock('../services/settingsService', () => ({
  isPlatformOwner: (t: string) => t === OWNER,
  get: (k: string) => (k === 'ANTHROPIC_API_KEY' ? 'sk-test' : undefined),
  getStr: (_k: string, f = '') => f,
  getNum: (_k: string, f: number) => f,
}));

const recordUsage = jest.fn(async () => {});
jest.mock('../services/aiGateway', () => ({ recordUsage: (...a: any[]) => (recordUsage as any)(...a) }));
const create = jest.fn(async () => ({ content: [{ type: 'text', text: 'hi' }], usage: { input_tokens: 10, output_tokens: 5 } }));
jest.mock('@anthropic-ai/sdk', () => ({ __esModule: true, default: jest.fn().mockImplementation(() => ({ messages: { create } })) }));

import { assertSeats, assertAiBudget, invalidateLimits, LimitError } from '../services/tenantLimits';
import { getAnthropic } from '../services/aiClients';
import { runWithTenant } from '../services/requestContext';

beforeEach(() => { invalidateLimits(); create.mockClear(); recordUsage.mockClear(); });

describe('seats', () => {
  it('refuses a student beyond the plan, and a bulk upload that would overflow it', async () => {
    students = 2;
    await expect(assertSeats(COLLEGE, 'STUDENT')).rejects.toBeInstanceOf(LimitError);
    students = 0;
    await expect(assertSeats(COLLEGE, 'STUDENT', 3)).rejects.toThrow(/allows 2 students/);
    await expect(assertSeats(COLLEGE, 'STUDENT', 2)).resolves.toBeUndefined();
  });

  it('leaves unlimited roles and the platform owner alone', async () => {
    students = 99;
    await expect(assertSeats(COLLEGE, 'INSTRUCTOR')).resolves.toBeUndefined();
    await expect(assertSeats(OWNER, 'STUDENT', 500)).resolves.toBeUndefined();
  });
});

describe('AI budget', () => {
  it('allows AI until the month\'s budget is used, then refuses', async () => {
    spend = 40;
    await expect(assertAiBudget(COLLEGE)).resolves.toBeUndefined();
    invalidateLimits();
    spend = 100;
    await expect(assertAiBudget(COLLEGE)).rejects.toThrow(/AI budget/);
  });

  it('never limits the platform owner or system work with no institute', async () => {
    spend = 10_000;
    await expect(assertAiBudget(OWNER)).resolves.toBeUndefined();
    await expect(assertAiBudget(undefined)).resolves.toBeUndefined();
  });

  it('every direct Claude call is checked first and recorded against the institute after', async () => {
    spend = 0;
    await runWithTenant(COLLEGE, () => getAnthropic()!.messages.create({ model: 'claude-haiku-4-5', max_tokens: 10, messages: [] } as any));
    expect(create).toHaveBeenCalledTimes(1);
    expect(recordUsage).toHaveBeenCalledWith(expect.objectContaining({ tenantId: COLLEGE, provider: 'anthropic', inputTokens: 10, outputTokens: 5 }));
  });

  it('a call over budget never reaches the provider', async () => {
    spend = 500;
    await expect(runWithTenant(COLLEGE, () => getAnthropic()!.messages.create({ model: 'x', max_tokens: 1, messages: [] } as any))).rejects.toBeInstanceOf(LimitError);
    expect(create).not.toHaveBeenCalled();
  });
});
