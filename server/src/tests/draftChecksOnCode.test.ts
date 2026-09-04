/**
 * The quality gate must not reject sound questions about code.
 *
 * The first C batch drafted 15, kept 9 and rejected 3 — and two of the three rejections were
 * wrong. Both failures are specific to code, which is why they surfaced on C and not on the
 * prose-heavy skills the checks were written against:
 *
 *   "two options say the same thing" — the duplicate check normalised options by stripping
 *   every non-alphanumeric character. In C, `char str[] = "Hello"` is an array and
 *   `char *str = "Hello"` is a pointer; both became "char str hello", so a question offering
 *   exactly the distinction it was testing was thrown away for offering it twice.
 *
 *   "the question refers to code that was not provided" — the check only looked in
 *   `codeSnippet`, so a stem that carried its own code inline was rejected as unanswerable
 *   while containing the very code it was accused of omitting.
 *
 * Both were fatal, so the questions were discarded rather than flagged, and the admin paid
 * for them either way. These pin the fixes without loosening what the checks are for.
 */

import { checkDraft } from '../services/skillQuestionDraftService';

const none = new Set<string>();
const opt = (text: string, isCorrect = false) => ({ text, isCorrect });

const draft = (over: any = {}) => ({
  question: 'Which declaration creates a modifiable array of characters in C?',
  options: [
    opt('char str[] = "Hello";', true),
    opt('char *str = "Hello";'),
    opt('const char str[] = "Hello";'),
    opt('int str[] = "Hello";'),
  ],
  explanation: 'An array initialised from a literal is modifiable; a pointer to a literal is not.',
  ...over,
});

describe('C declarations that differ only in punctuation are different answers', () => {
  /** THE REGRESSION. An array and a pointer are not the same option. */
  it('accepts array and pointer declarations as distinct options', () => {
    expect(checkDraft(draft(), none).fatal).toBeFalsy();
  });

  it('keeps telling apart options that differ only by a dereference', () => {
    const d = draft({
      options: [opt('*p = 5;', true), opt('p = 5;'), opt('&p = 5;'), opt('p == 5;')],
    });
    expect(checkDraft(d, none).fatal).toBeFalsy();
  });

  it('still tells apart index from no index', () => {
    const d = draft({
      options: [opt('arr[0]', true), opt('arr'), opt('&arr[0]'), opt('*arr[0]')],
    });
    expect(checkDraft(d, none).fatal).toBeFalsy();
  });

  /**
   * The check has not been switched off — a real duplicate is still a real duplicate, and
   * if it is the correct answer the question marks a student wrong for picking it.
   */
  it('still rejects two options that are genuinely identical', () => {
    const d = draft({
      options: [opt('char str[] = "Hello";', true), opt('char str[] = "Hello";'),
        opt('int x;'), opt('float y;')],
    });
    expect(checkDraft(d, none).fatal).toMatch(/same thing/);
  });

  it('still rejects a duplicate that differs only by case or spacing', () => {
    const d = draft({
      options: [opt('Char  Str[] = "Hello";', true), opt('char str[] = "Hello";'),
        opt('int x;'), opt('float y;')],
    });
    expect(checkDraft(d, none).fatal).toMatch(/same thing/);
  });

  it('still rejects a duplicate that differs only by trailing punctuation', () => {
    const d = draft({
      options: [opt('the array is copied', true), opt('the array is copied.'),
        opt('the pointer is copied'), opt('nothing is copied')],
    });
    expect(checkDraft(d, none).fatal).toMatch(/same thing/);
  });
});

describe('code in the stem is code that was provided', () => {
  /** THE SECOND REGRESSION, verbatim from the batch that was rejected. */
  it('accepts a stem that carries its code inline in backticks', () => {
    const d = draft({
      question: 'What does the following code do? `char str[5] = "Test";`',
      options: [opt('Stores "Test" and a null terminator', true), opt('Stores five characters'),
        opt('Fails to compile'), opt('Stores a pointer')],
    });
    expect(checkDraft(d, none).fatal).toBeFalsy();
  });

  it('accepts a stem carrying a statement without backticks', () => {
    const d = draft({
      question: 'What is the output of this program? int a = 5; printf("%d", a++);',
      options: [opt('5', true), opt('6'), opt('undefined'), opt('a compile error')],
    });
    expect(checkDraft(d, none).fatal).toBeFalsy();
  });

  it('accepts a normal codeSnippet, exactly as before', () => {
    const d = draft({
      question: 'What is the output of the following code?',
      codeSnippet: 'int a[3] = {1,2,3};\nprintf("%d", a[1]);',
      options: [opt('2', true), opt('1'), opt('3'), opt('0')],
    });
    expect(checkDraft(d, none).fatal).toBeFalsy();
  });

  /**
   * WHAT THE CHECK IS ACTUALLY FOR, and it still works: a stem pointing at code that exists
   * nowhere is unanswerable, and a student who guesses is marked wrong for a question that
   * never existed.
   */
  it('still rejects a stem pointing at code that exists nowhere', () => {
    const d = draft({
      question: 'What will be the output of the following code snippet?',
      options: [opt('5', true), opt('6'), opt('0'), opt('an error')],
    });
    expect(checkDraft(d, none).fatal).toMatch(/code that was not provided/);
  });
});

describe('the "unused snippet" warning stays truthful', () => {
  /**
   * Inline stem code now counts as provided, so this warning had to keep asking about the
   * ATTACHED snippet — otherwise it would tell a reviewer "a code snippet is attached"
   * about a question that has none.
   */
  it('does not claim a snippet is attached when the code is in the stem', () => {
    const d = draft({ question: 'Is int x = 5; a valid declaration in C?' });
    const { warnings } = checkDraft(d, none);
    expect(warnings.join(' ')).not.toMatch(/snippet is attached/);
  });

  it('still warns when a real snippet is attached and never referred to', () => {
    const d = draft({
      question: 'Which declaration creates a modifiable array of characters in C?',
      codeSnippet: 'int unrelated = 1;',
    });
    expect(checkDraft(d, none).warnings.join(' ')).toMatch(/snippet is attached/);
  });
});
