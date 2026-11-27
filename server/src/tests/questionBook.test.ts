import { parseBulk, isId } from '../services/questionBookService';
import { ALL_BOOKS } from '../seeds/questionBooks/allBooks';

describe('Question Books — pasting many questions', () => {
  it('reads Q:/A: blocks with multi-line answers', () => {
    const r = parseBulk('Q: What is a HashMap?\nA: A key-value store.\nIt is not thread-safe.\n\nQ: What is JVM?\nA: Java Virtual Machine');
    expect(r).toHaveLength(2);
    expect(r[0].answer).toBe('A key-value store.\nIt is not thread-safe.');
    expect(r[1].question).toBe('What is JVM?');
  });

  it('accepts numbered questions and "Answer:" labels', () => {
    const r = parseBulk('1. Explain OOPs\nAnswer: Four pillars\n2) What is polymorphism?\nAns: Many forms');
    expect(r.map((x) => x.question)).toEqual(['Explain OOPs', 'What is polymorphism?']);
    expect(r[1].answer).toBe('Many forms');
  });

  it('keeps code blocks inside answers', () => {
    const r = parseBulk('Q: Reverse a string in Java\nA: Use StringBuilder:\n```java\nnew StringBuilder(s).reverse()\n```');
    expect(r[0].answer).toContain('```java');
    expect(r[0].answer).toContain('reverse()');
  });

  it('allows a question without an answer and ignores empty input', () => {
    expect(parseBulk('Q: Tell me about yourself')).toEqual([{ question: 'Tell me about yourself', answer: '' }]);
    expect(parseBulk('   \n\n')).toEqual([]);
  });
});

describe('Question Books — opening a book by slug or id', () => {
  it('treats only a 24-hex string as an id', () => {
    expect(isId('6aa9390649fae12e6a01264e')).toBe(true);
    // 12 characters: mongoose.isValidObjectId() says true, which made /question-books/hr-interview a 404.
    expect(isId('hr-interview')).toBe(false);
    expect(isId('aptitude')).toBe(false);
    expect(isId(undefined)).toBe(false);
  });

  it('never mistakes a shipped book slug for an id', () => {
    for (const b of ALL_BOOKS) expect(isId(b.slug)).toBe(false);
  });
});
