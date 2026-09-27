import { cleanRounds } from '../services/interviewHubService';

describe('Interview Hub — cleaning rounds from a candidate or the model', () => {
  it('keeps known round keys and maps anything else to "other"', () => {
    const r = cleanRounds([{ key: 'coding', name: 'OA', questions: ['Reverse a linked list'] }, { key: 'weird', questions: [] }]);
    expect(r[0].key).toBe('coding');
    expect(r[1].key).toBe('other');
    expect(r[1].name).toBe('Other');
  });

  it('accepts questions as strings or objects and drops empty ones', () => {
    const r = cleanRounds([{ key: 'technical', questions: ['What is a HashMap?', { text: 'Explain JOINs', category: 'dbms' }, { text: '  ' }, ''] }]);
    expect(r[0].questions.map((q: any) => q.text)).toEqual(['What is a HashMap?', 'Explain JOINs']);
    expect(r[0].questions[1].category).toBe('dbms');
  });

  it('drops unknown categories and caps lengths', () => {
    const r = cleanRounds([{ key: 'hr', questions: [{ text: 'x'.repeat(5000), category: 'astrology' }] }]);
    expect(r[0].questions[0].category).toBe('');
    expect(r[0].questions[0].text.length).toBe(1500);
  });

  it('keeps cleared only when it is a boolean, and bounds the duration', () => {
    const r = cleanRounds([{ key: 'technical', cleared: 'yes', durationMins: 99999 }, { key: 'hr', cleared: false, durationMins: 30 }]);
    expect(r[0].cleared).toBeUndefined();
    expect(r[0].durationMins).toBeUndefined();
    expect(r[1].cleared).toBe(false);
    expect(r[1].durationMins).toBe(30);
  });

  it('caps a runaway list at 12 rounds', () => {
    expect(cleanRounds(Array.from({ length: 30 }, () => ({ key: 'technical' }))).length).toBe(12);
    expect(cleanRounds(null)).toEqual([]);
  });
});
