import { publishProblems, cleanList } from '../data/thinkingBankPolicy';
import { cleanQuestion, bankQuery } from '../services/thinkingBankService';
import { SUPER_ADMIN_GRANTED } from '../middleware/roleGuard';

const puzzle = {
  type: 'math', difficulty: 'easy', title: 'Three friends and a bill', answerFormat: 'number',
  statement: 'Asha, Ravi and Meena split a restaurant bill of 900 rupees. How much does each pay?',
  answer: '300', keySteps: ['Total is 900', 'Three people share it equally', '900 divided by 3 is 300'],
  explanation: 'Equal shares: 900 / 3 = 300 each.',
};

describe('Thinking Lab bank: publishing', () => {
  it('a complete puzzle can be published', () => {
    expect(publishProblems(puzzle)).toEqual([]);
  });

  it('asks for the answer, at least 3 key steps and the explanation', () => {
    const p = publishProblems({ ...puzzle, answer: '', keySteps: ['only one'], explanation: '' });
    expect(p).toEqual(expect.arrayContaining(['Write the correct answer.', 'List at least 3 key steps of the reasoning.', 'Write the model explanation shown after answering.']));
  });

  it('a number answer must be a number, and a choice answer must be one of the choices', () => {
    expect(publishProblems({ ...puzzle, answer: 'three hundred' })).toContain('A number answer must be a number.');
    expect(publishProblems({ ...puzzle, answer: '1,200' })).not.toContain('A number answer must be a number.');
    const choice = { ...puzzle, answerFormat: 'choice', choices: ['A', 'B', 'C'], answer: 'D' };
    expect(publishProblems(choice)).toContain('The answer must be one of the choices.');
    expect(publishProblems({ ...choice, answer: 'B' })).toEqual([]);
  });

  it('a coding question needs a test case and a language, not key steps', () => {
    const coding = { type: 'coding', difficulty: 'medium', title: 'Sum of a list', statement: 'Read numbers and print their sum, one per line.', language: 'python', testCases: [] as any[] };
    expect(publishProblems(coding)).toEqual(['Add at least one test case with an expected output.']);
    expect(publishProblems({ ...coding, testCases: [{ input: '1 2', expectedOutput: '3' }] })).toEqual([]);
  });

  it('cleans what an admin types', () => {
    expect(cleanList(' a \n\nB\n a \n c ', 10)).toEqual(['a', 'B', 'c']);
    const q = cleanQuestion({ ...puzzle, years: ['build', 'nope'], choices: ['x'], testCases: [{ expectedOutput: '1' }] });
    expect(q.years).toEqual(['build']);
    expect(q.choices).toEqual([]);      // only kept for a choice answer
    expect(q.testCases).toEqual([]);    // only kept for coding
    expect(cleanQuestion({ type: 'coding', answer: '5', keySteps: ['a'] })).toMatchObject({ answer: undefined, keySteps: [], language: 'python' });
  });

  it('a year filter includes questions that suit every year, and TQ numbers are searchable', () => {
    expect(bankQuery({ year: 'build' }).$or).toEqual([{ years: 'build' }, { years: { $size: 0 } }]);
    expect(JSON.stringify(bankQuery({ q: 'TQ-0012' }))).toContain('"number":12');
    expect(bankQuery({ year: 'foundation' }).type).toEqual({ $ne: 'coding' });          // no coding in Year 1
    expect(cleanQuestion({ type: 'coding', years: ['foundation', 'build'] }).years).toEqual(['build']);
  });

  it('only a super admin can give the bank permission to a role', () => {
    expect(SUPER_ADMIN_GRANTED).toContain('manage_thinking_bank');
  });
});
