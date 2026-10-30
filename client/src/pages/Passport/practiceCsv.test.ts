import { importPracticeCsv, parseCsv, templateCsv } from './practiceCsv';

describe('practice question CSV', () => {
  it('reads its own template: three MCQs (one with code over several lines) and a theory question', () => {
    const r = importPracticeCsv(templateCsv());
    expect(r.errors).toEqual([]);
    expect(r.questions.map(q => q.type)).toEqual(['mcq', 'mcq', 'mcq', 'theory']);
    expect(r.questions[2].description).toBe('What does this print?\nfor i in range(3):\n    print(i, end=" ")');
    expect(r.questions[0].options!.filter(o => o.isCorrect).map(o => o.text)).toEqual(['pwd']);
    expect(r.questions[1].options!.filter(o => o.isCorrect).map(o => o.text)).toEqual(['/home/priya/notes', '/etc/hosts']);
    expect(r.questions[0].gradingMode).toBe('auto');
    expect(r.questions[3]).toMatchObject({ gradingMode: 'self', marks: 2, difficulty: 'medium' });
    expect(r.questions[3].options).toBeUndefined();
  });

  it('handles quoted commas, doubled quotes, line breaks, CRLF and a BOM', () => {
    const csv = '﻿type,question,option_a,option_b,correct\r\nmcq,"Pick one, carefully","Say ""hi""","Line one\nline two",a\r\n';
    expect(parseCsv(csv)[1]).toEqual(['mcq', 'Pick one, carefully', 'Say "hi"', 'Line one\nline two', 'a']);
    const r = importPracticeCsv(csv);
    expect(r.errors).toEqual([]);
    expect(r.questions[0].options).toEqual([{ text: 'Say "hi"', isCorrect: true }, { text: 'Line one\nline two', isCorrect: false }]);
  });

  it('reads semicolon CSV (Excel in some locales) and guesses the type when blank', () => {
    const r = importPracticeCsv('question;option_a;option_b;correct\nWhich is larger?;2;3;B\nWhy?;;;\n');
    expect(r.errors).toEqual([]);
    expect(r.questions.map(q => q.type)).toEqual(['mcq', 'theory']);
  });

  it('reports bad rows by spreadsheet row number and imports only the good ones', () => {
    const csv = [
      'type,question,option_a,option_b,option_c,correct,difficulty,marks',
      'mcq,Good one,x,y,,A,easy,1',
      'mcq,No answer,x,y,,,easy,1',
      'mcq,Wrong letter,x,y,,C,easy,1',
      'mcq,One option,x,,,A,easy,1',
      'quiz,Bad type,x,y,,A,easy,1',
      'theory,,,,,,,',
      'theory,Hard marks,,,,,extreme,0',
      '',
    ].join('\n');
    const r = importPracticeCsv(csv);
    expect(r.questions.map(q => q.title)).toEqual(['Good one']);
    expect(r.errors.map(e => e.row)).toEqual([3, 4, 5, 6, 7, 8]);
    expect(r.errors[1].message).toMatch(/names C but that option is empty/);
    expect(r.errors[5].message).toMatch(/difficulty "extreme"/);
    expect(r.errors[5].message).toMatch(/marks "0"/);
  });

  it('refuses a file without a question column', () => {
    expect(importPracticeCsv('a,b\n1,2\n').errors[0].message).toMatch(/No "question" column/);
  });

  it('reads other common column names, and an answer given as a number or as the option text', () => {
    const csv = 'Question Text,Option 1,Option 2,Option 3,Correct Answer,Explanation\n'
      + '"Which prints the folder you are in?",ls,pwd,cd,pwd,"pwd = print working directory"\n'
      + '"Pick the even number",3,4,5,2,\n';
    const r = importPracticeCsv(csv);
    expect(r.errors).toEqual([]);
    expect(r.questions[0].options!.filter(o => o.isCorrect).map(o => o.text)).toEqual(['pwd']);
    expect(r.questions[0].explanation).toBe('pwd = print working directory');
    expect(r.questions[1].options!.filter(o => o.isCorrect).map(o => o.text)).toEqual(['4']);
  });

  it('turns a typed backslash-n into a line break when a cell was written on one line', () => {
    const BS = String.fromCharCode(92);
    const csv = `question,option_a,option_b,correct\n"What prints?${BS}nfor i in range(2):${BS}n    print(i)","0 1","0${BS}n1",B\n`;
    const r = importPracticeCsv(csv);
    expect(r.errors).toEqual([]);
    expect(r.questions[0].description).toBe('What prints?\nfor i in range(2):\n    print(i)');
    expect(r.questions[0].options![1]).toEqual({ text: '0\n1', isCorrect: true });
  });
});
