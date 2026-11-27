jest.mock('../services/aiGateway', () => ({ aiComplete: jest.fn() }));
jest.mock('../services/thinkingLabService', () => ({ generateThinkingProblem: jest.fn() }));
jest.mock('../models/ThinkingQuestion', () => {
  const rows: any[] = [];
  return {
    __esModule: true,
    rows,
    default: {
      findOne: () => ({ sort: () => ({ select: () => ({ lean: async () => (rows.length ? { number: rows[rows.length - 1].number } : null) }) }) }),
      create: jest.fn(async (d: any) => { rows.push(d); return d; }),
    },
  };
});

import { aiComplete } from '../services/aiGateway';
import { generateDrafts } from '../services/thinkingBankService';
const store: any[] = (jest.requireMock('../models/ThinkingQuestion') as any).rows;

describe('AI drafts for the Thinking Lab bank', () => {
  beforeEach(() => { store.length = 0; (aiComplete as jest.Mock).mockReset(); });

  it('saves each usable question as a numbered DRAFT, cleaned, for the requested type and year', async () => {
    (aiComplete as jest.Mock).mockResolvedValue('```json\n' + JSON.stringify({ questions: [
      { title: 'Seats at a round table', statement: 'Six friends sit at a round table. Who sits opposite Ravi?', answerFormat: 'text', answer: 'Meena', keySteps: ['Place Asha first', 'Use clue 2', 'Use clue 3', 'Read off the opposite seat'], explanation: 'Placing the clues in order leaves Meena opposite Ravi.', hints: ['Start with Asha'], estimatedMinutes: 6 },
      { title: '', statement: 'No title, so not usable.' },
    ] }) + '\n```');
    const out = await generateDrafts({ tenantId: 't', userId: 'u', type: 'logical', difficulty: 'easy', year: 'foundation', count: 2, subCategory: 'Seating arrangement' });
    expect(out.created).toHaveLength(1);
    expect(out.failed).toBe(1);
    expect(store[0]).toMatchObject({ status: 'DRAFT', source: 'ai', type: 'logical', subCategory: 'Seating arrangement', difficulty: 'easy', years: ['foundation'], number: 1, answer: 'Meena' });
    expect(store[0].keySteps).toHaveLength(4);
  });

  it('asks for no more than the batch limit, and says plainly when the AI is unavailable', async () => {
    (aiComplete as jest.Mock).mockResolvedValue(JSON.stringify({ questions: [] }));
    await generateDrafts({ tenantId: 't', userId: 'u', type: 'math', difficulty: 'hard', count: 50 });
    expect((aiComplete as jest.Mock).mock.calls[0][0].user).toMatch(/^Write 10 question/);
    (aiComplete as jest.Mock).mockRejectedValue(new Error('No AI provider is configured'));
    await expect(generateDrafts({ tenantId: 't', userId: 'u', type: 'math', difficulty: 'easy', count: 1 })).rejects.toThrow(/could not write questions/);
  });
});
