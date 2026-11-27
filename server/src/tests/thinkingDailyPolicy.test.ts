import {
  dayTypes, labDailySettings, codingAccess, topicsCovered, servingOrder, answerMatches, puzzleShare, codingShare,
  stepScore, stepsByWords, explanationLongEnough,
} from '../data/thinkingDailyPolicy';

describe('Thinking Lab day', () => {
  it('rotates math → logical → critical, carrying on from the last day', () => {
    const one = { perDay: 1, codingPerDay: 0 };
    expect([0, 1, 2, 3].map((d) => dayTypes(d, one, false)[0])).toEqual(['math', 'logical', 'critical', 'math']);
    expect(dayTypes(1, { perDay: 2, codingPerDay: 0 }, false)).toEqual(['critical', 'math']);
  });

  it('once coding is open it takes its turn, or a fixed number a day when the admin sets one', () => {
    expect([0, 1, 2, 3].map((d) => dayTypes(d, { perDay: 1, codingPerDay: 0 }, true)[0])).toEqual(['math', 'logical', 'critical', 'coding']);
    expect(dayTypes(0, { perDay: 2, codingPerDay: 1 }, true)).toEqual(['coding', 'math']);
    expect(dayTypes(0, { perDay: 2, codingPerDay: 1 }, false)).toEqual(['math', 'logical']);   // not open yet
  });

  it('settings: 1 a day by default, never coding in Year 1, coding never more than the day', () => {
    const s = labDailySettings(undefined);
    expect(s.thinking.build).toEqual({ perDay: 1, codingPerDay: 0, practicePerDay: 10 });
    expect(s.communication.placement).toEqual({ perDay: 1 });
    const t = labDailySettings({ thinking: { foundation: { perDay: 3, codingPerDay: 2 }, build: { perDay: 2, codingPerDay: 4 } } });
    expect(t.thinking.foundation).toEqual({ perDay: 3, codingPerDay: 0, practicePerDay: 10 });
    expect(t.thinking.build).toEqual({ perDay: 2, codingPerDay: 2, practicePerDay: 10 });
  });

  it('practice per day: 10 by default, 0 turns it off, never above the maximum', () => {
    const t = labDailySettings({ thinking: { foundation: { perDay: 1, practicePerDay: 0 }, build: { perDay: 1, practicePerDay: 99 }, placement: { perDay: 1, practicePerDay: 4 } } });
    expect(t.thinking.foundation.practicePerDay).toBe(0);
    expect(t.thinking.build.practicePerDay).toBe(10);
    expect(t.thinking.placement.practicePerDay).toBe(4);
  });

  it('coding opens from Year 2 once every basics unit in the roadmap is done', () => {
    expect(codingAccess('foundation', []).open).toBe(false);
    const units = [
      { code: 'JT_PY_START_SETUP', done: true }, { code: 'JT_PY_BASICS_LOOPS', done: false }, { code: 'JT_DJANGO_MODELS', done: false },
    ];
    expect(codingAccess('build', units)).toMatchObject({ open: false, reason: 'basics', basicsDone: 1, basicsTotal: 2 });
    const done = units.map((u) => ({ ...u, done: u.code.includes('PY') }));
    const a = codingAccess('build', done);
    expect(a.open).toBe(true);
    expect(a.covered).toEqual(expect.arrayContaining(['loops', 'conditions', 'functions']));
    expect(a.covered).not.toContain('dictionaries');
    expect(codingAccess('specialize', [{ code: 'JT_DJANGO_MODELS', done: false }]).open).toBe(true);  // past the basics
  });

  it('a coding question is given only on covered topics, easiest first', () => {
    expect(topicsCovered(['loops'], ['loops', 'lists'])).toBe(true);
    expect(topicsCovered(['dictionaries'], ['loops'])).toBe(false);
    expect(topicsCovered([], [])).toBe(true);
    const order = servingOrder([{ difficulty: 'hard', number: 1 }, { difficulty: 'easy', order: 2, number: 9 }, { difficulty: 'easy', order: 1, number: 10 }]);
    expect(order.map((o) => o.number)).toEqual([10, 9, 1]);
  });
});

describe('Thinking Lab scoring', () => {
  it('checks answers as precisely as the stored answer, with accepted forms', () => {
    expect(answerMatches('number', '150', '150')).toBe(true);
    expect(answerMatches('number', '150 rupees', '150')).toBe(true);
    expect(answerMatches('number', '1,500', '1500')).toBe(true);
    expect(answerMatches('number', '183.333', '183.33')).toBe(true);
    expect(answerMatches('number', '183.4', '183.33')).toBe(false);
    expect(answerMatches('number', '1/2', '0.5')).toBe(true);
    expect(answerMatches('text', ' north-east ', 'North-East', ['NE'])).toBe(true);
    expect(answerMatches('text', 'ne', 'North-East', ['NE'])).toBe(true);
    expect(answerMatches('choice', 'B option', 'B option')).toBe(true);
    expect(answerMatches('choice', 'b option', 'B option')).toBe(false);
    expect(answerMatches('text', '', 'x')).toBe(false);
  });

  it('half for the answer, half for the reasoning', () => {
    expect(puzzleShare(true, ['covered', 'covered', 'covered'])).toBe(1);
    expect(puzzleShare(true, ['missing', 'missing', 'missing'])).toBe(0.5);
    expect(puzzleShare(false, ['covered', 'partial', 'missing'])).toBe(0.25);
    expect(stepScore(['covered', 'partial'])).toBe(0.75);
    expect(codingShare(5, 5)).toBe(1);
    expect(codingShare(2, 4)).toBe(0.25);
  });

  it('the word check stands in for the AI, and asks for a real explanation', () => {
    const steps = ['The bill is 450 rupees', 'It is split equally among 3 people', '450 divided by 3 is 150'];
    expect(stepsByWords(steps, 'Total bill 450 rupees, split equally between three people, so 450/3 = 150 each.')).toEqual(['covered', 'covered', 'covered']);
    expect(stepsByWords(steps, 'I guessed.')).toEqual(['missing', 'missing', 'missing']);
    expect(explanationLongEnough('I just know')).toBe(false);
    expect(explanationLongEnough('I added the three shares and divided the total by three people')).toBe(true);
  });
});
