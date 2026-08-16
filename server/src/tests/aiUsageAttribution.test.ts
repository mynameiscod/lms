/**
 * Whose spend was it?
 *
 * The usage ledger recorded cost per module per tenant per day, which is enough to see that
 * CareerPilot's AI bill doubled and not enough to say whether a hundred members arrived or
 * one script found the resume endpoint. Those need opposite responses, and the rate limits
 * added alongside this are only actionable if you can tell which member to look at.
 *
 * These tests pin the attribution and the two things that must not follow from it: usage
 * logging still cannot break an AI call, and an unusable id is dropped rather than stored.
 */

const create = jest.fn();

jest.mock('../models/AiUsage', () => ({ __esModule: true, default: { create: (...a: any[]) => create(...a) } }));
jest.mock('../services/aiClients', () => ({ __esModule: true, getOpenAI: () => null, getAnthropic: () => null }));
jest.mock('../services/settingsService', () => ({
  __esModule: true, getNum: (_k: string, d: number) => d, getStr: (_k: string, d: string) => d,
}));

import { recordUsage } from '../services/aiGateway';

const TENANT = '507f1f77bcf86cd799439001';
const STUDENT = '507f1f77bcf86cd799439011';

const row = () => create.mock.calls[0][0];

beforeEach(() => { jest.clearAllMocks(); create.mockResolvedValue({}); });

describe('attributing a call to a member', () => {
  it('records who it was for', async () => {
    await recordUsage({
      tenantId: TENANT, studentId: STUDENT, module: 'mock_test_generate',
      product: 'careerpilot', provider: 'anthropic', model: 'claude-haiku-4-5',
      inputTokens: 1000, outputTokens: 500,
    });

    expect(row().studentId).toBe(STUDENT);
    expect(row().product).toBe('careerpilot');
  });

  it('still records a call that has no member', async () => {
    // Admin drafting and scheduled jobs are not anybody's spend. They must not be dropped
    // for want of a member — the tenant total has to stay correct.
    await recordUsage({
      tenantId: TENANT, module: 'company_profile_draft', product: 'careerpilot',
      provider: 'anthropic', model: 'claude-haiku-4-5', inputTokens: 100, outputTokens: 50,
    });

    expect(create).toHaveBeenCalledTimes(1);
    expect(row().studentId).toBeUndefined();
  });

  it('drops an id that is not an id rather than storing it', async () => {
    // Same treatment as the tenant. A malformed value here would throw inside the model and
    // take an AI call down with it.
    await recordUsage({
      tenantId: TENANT, studentId: 'not-an-object-id', module: 'x',
      provider: 'openai', model: 'gpt-4o-mini',
    });

    expect(row().studentId).toBeUndefined();
    expect(create).toHaveBeenCalledTimes(1);
  });

  it('costs the same whether or not a member is named', async () => {
    await recordUsage({
      tenantId: TENANT, studentId: STUDENT, module: 'x', provider: 'openai',
      model: 'gpt-4o-mini', inputTokens: 1_000_000, outputTokens: 0,
    });
    const withMember = row().costUsd;

    create.mockClear();
    await recordUsage({
      tenantId: TENANT, module: 'x', provider: 'openai',
      model: 'gpt-4o-mini', inputTokens: 1_000_000, outputTokens: 0,
    });

    // Attribution is a label on the row, not an input to the price.
    expect(row().costUsd).toBe(withMember);
  });
});

describe('logging never breaks the call it is logging', () => {
  it('swallows a write failure', async () => {
    create.mockRejectedValue(new Error('mongo is down'));

    // An outage in the spend ledger must not fail a member's interview.
    await expect(recordUsage({
      tenantId: TENANT, studentId: STUDENT, module: 'x', provider: 'openai', model: 'gpt-4o-mini',
    })).resolves.toBeUndefined();
  });
});
