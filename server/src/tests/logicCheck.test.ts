jest.mock('../services/aiGateway', () => ({ aiComplete: jest.fn() }));
import { aiComplete } from '../services/aiGateway';
import { judgeLogic, logicByWords } from '../services/logicCheckService';

const PROBLEM = 'The college canteen gives a 10% discount on any bill of Rs 500 or more. The discount is rounded down. Bills below Rs 500 get no discount. Input: one integer bill. Output: the amount to pay.';
const base = { tenantId: 't', studentId: 's', product: 'careerpilot' as const, statement: PROBLEM, reference: 'bill = int(input())\nprint(bill - bill // 10 if bill >= 500 else bill)' };

describe('logic check before the code editor opens', () => {
  afterEach(() => (aiComplete as jest.Mock).mockReset());

  it('opens the editor for a good or a partly right plan, keeps it locked for an off-topic one', async () => {
    for (const [verdict, ok] of [['good', true], ['partial', true], ['off', false]] as const) {
      (aiComplete as jest.Mock).mockResolvedValueOnce(JSON.stringify({ verdict, feedback: 'x' }));
      const r = await judgeLogic({ ...base, logic: 'some plan' });
      expect([r.verdict, r.ok, r.source]).toEqual([verdict, ok, 'ai']);
    }
  });

  it('falls back to the word check when the AI is down, generous to a real plan', async () => {
    (aiComplete as jest.Mock).mockRejectedValue(new Error('down'));
    const good = await judgeLogic({ ...base, logic: 'Read the bill. If the bill is 500 or more, take the discount as bill divided by 10 rounded down and subtract it, else keep the bill. Print the amount.' });
    expect(good).toMatchObject({ ok: true, verdict: 'partial', source: 'words' });
    const filler = await judgeLogic({ ...base, logic: 'I will try my best to solve this question very carefully and think a lot about it before I start writing my code today.' });
    expect(filler).toMatchObject({ ok: false, verdict: 'off', source: 'words' });
  });

  it('does not call the AI once a student has used up their AI checks', async () => {
    const r = await judgeLogic({ ...base, aiAllowed: false, logic: 'Read the bill, check if it is at least 500, subtract the discount and print the amount to pay.' });
    expect(aiComplete).not.toHaveBeenCalled();
    expect(r.source).toBe('words');
  });

  it('word check needs the problem\'s own terms and an action', () => {
    expect(logicByWords('loop over the numbers and print them', PROBLEM).ok).toBe(false);
    expect(logicByWords('read the bill, compare with 500, apply the discount, print the amount', PROBLEM).ok).toBe(true);
  });
});

describe('pasting the question back', () => {
  it('is rejected before any AI call', async () => {
    (aiComplete as jest.Mock).mockReset();
    const r = await judgeLogic({ ...base, logic: PROBLEM });
    expect(r).toMatchObject({ ok: false, verdict: 'off' });
    expect(aiComplete).not.toHaveBeenCalled();
  });
  it('a real plan that uses a few of the question\'s words is not a copy', async () => {
    const { copiedFromQuestion } = await import('../services/logicCheckService');
    expect(copiedFromQuestion('Read the bill. If it is Rs 500 or more take ten percent off rounded down, otherwise keep it, and print the amount to pay.', PROBLEM)).toBe(false);
  });
});
