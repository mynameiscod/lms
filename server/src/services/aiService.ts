import { getOpenAI } from './aiClients';
import codeRunner from './codeRunnerService';
import { ProgrammingLanguage } from '../models/Assignment';
import { STACK_FILES, WebFile, WebRequirement, WebStack, evaluateWebChecks, requirementProblem } from './webAssignment/webChecks';
import { normalizeHex } from './webAssignment/markup';

export interface GeneratedQuestion {
  question: string;
  type: 'mcq_single' | 'mcq_multiple' | 'short_answer';
  difficultyLevel: 'easy' | 'medium' | 'hard';
  marks: number;
  options?: { text: string; isCorrect: boolean }[];
  correctAnswerText?: string;
  explanation?: string;
  tags: string[];
}

export interface GenerateQuestionsParams {
  topic: string;
  type: 'mcq_single' | 'mcq_multiple' | 'short_answer';
  difficulty: 'easy' | 'medium' | 'hard' | 'mixed';
  count: number;
  avoid?: string[];   // existing question texts the AI must not repeat/paraphrase
}

// Normalise a question for duplicate comparison.
export const normalizeQuestion = (s: string): string =>
  (s || '').toLowerCase().replace(/[^\w ]+/g, ' ').replace(/\s+/g, ' ').trim();

export interface GenerateCodingAssignmentParams {
  title: string;
  concept: string;
  language: string;
  difficulty: 'beginner' | 'easy' | 'medium' | 'hard' | 'expert';
  testCaseCount: number;
}

export interface GeneratedCodingAssignment {
  description: string;
  instructions: string;
  starterCode: string;
  solutionCode: string;
  /**
   * Every `expectedOutput` here came from RUNNING `solutionCode` against that input — never
   * from the model. See verifyTestCases().
   */
  testCases: {
    input: string;
    expectedOutput: string;
    description: string;
    isHidden: boolean;
    points: number;
  }[];
  topics: string[];
  /** What survived verification, so the admin is told when a draft came back smaller. */
  verification?: {
    requested: number;
    verified: number;
    dropped: string[];
  };
}

function buildPrompt(params: GenerateQuestionsParams): string {
  const { topic, type, difficulty, count } = params;

  const typeDesc =
    type === 'mcq_single'
      ? 'multiple choice with exactly 4 options and exactly 1 correct answer (isCorrect: true)'
      : type === 'mcq_multiple'
      ? 'multiple choice with exactly 4 options and 1 or 2 correct answers (isCorrect: true for each correct one)'
      : 'short answer (no options needed, provide correctAnswerText instead)';

  const difficultyInstruction =
    difficulty === 'mixed'
      ? 'Vary difficulty: distribute easy, medium and hard roughly equally.'
      : `All questions must be ${difficulty} difficulty.`;

  return `You are generating questions for an educational LMS question bank.

Generate exactly ${count} ${typeDesc} questions about the topic: "${topic}".
${difficultyInstruction}
Assign marks: easy=1, medium=2, hard=3.
${params.avoid && params.avoid.length ? `\nIMPORTANT — the question bank ALREADY contains the questions below. Do NOT repeat, rephrase, or paraphrase any of them; generate genuinely new, distinct questions on other aspects of the topic:\n${params.avoid.slice(0, 60).map((q) => `- ${q}`).join('\n')}\n` : ''}

Return ONLY a valid JSON object with a single key "questions" containing an array. Each item must follow this schema exactly:

For MCQ types (mcq_single or mcq_multiple):
{
  "question": "Question text here",
  "type": "${type}",
  "difficultyLevel": "easy|medium|hard",
  "marks": 1|2|3,
  "options": [
    {"text": "Option A text", "isCorrect": false},
    {"text": "Option B text", "isCorrect": true},
    {"text": "Option C text", "isCorrect": false},
    {"text": "Option D text", "isCorrect": false}
  ],
  "explanation": "Why the correct answer is correct",
  "tags": ["${topic.toLowerCase().split(' ')[0]}", "relevant-tag"]
}

For short_answer type:
{
  "question": "Question text here",
  "type": "short_answer",
  "difficultyLevel": "easy|medium|hard",
  "marks": 1|2|3,
  "correctAnswerText": "The correct answer",
  "explanation": "Explanation of the answer",
  "tags": ["${topic.toLowerCase().split(' ')[0]}", "relevant-tag"]
}

Return exactly ${count} questions. No markdown, no code blocks, only the JSON object.`;
}

export async function generateQuestionsWithAI(
  params: GenerateQuestionsParams
): Promise<GeneratedQuestion[]> {
  const openai = getOpenAI();
  if (!openai) {
    throw new Error('OPENAI_API_KEY is not configured on the server.');
  }

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content:
          'You are an expert educator. Always respond with valid JSON only — no markdown, no code fences, just the raw JSON object.'
      },
      {
        role: 'user',
        content: buildPrompt(params)
      }
    ],
    temperature: 0.7,
    response_format: { type: 'json_object' }
  });

  const raw = response.choices[0]?.message?.content || '{}';

  let parsed: any;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error('AI service returned malformed JSON. Please try again.');
  }

  const questions: GeneratedQuestion[] = Array.isArray(parsed)
    ? parsed
    : Array.isArray(parsed.questions)
    ? parsed.questions
    : [];

  if (questions.length === 0) {
    throw new Error('AI returned no questions. Please try a different topic or try again.');
  }

  // Safety net: drop anything that duplicates the avoid-list or repeats within this batch.
  const seen = new Set((params.avoid || []).map(normalizeQuestion));
  const deduped = questions.filter((q) => {
    const key = normalizeQuestion((q as any).question || '');
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  const finalQuestions = deduped.length ? deduped : questions;

  // Sanitize: ensure required fields and trim results to requested count
  return finalQuestions.slice(0, params.count).map((q) => {
    const qType: 'mcq_single' | 'mcq_multiple' | 'short_answer' = q.type || params.type;

    // Sanitize options and guarantee correct isCorrect placement
    let sanitizedOptions: { text: string; isCorrect: boolean }[] | undefined;
    if (Array.isArray(q.options) && q.options.length > 0) {
      sanitizedOptions = q.options.map((o: any) => ({
        text: String(o.text || o || '').trim(),
        isCorrect: o.isCorrect === true,
      }));

      if (qType === 'mcq_single') {
        // Ensure exactly one correct answer
        const firstCorrectIdx = sanitizedOptions.findIndex((o) => o.isCorrect);
        if (firstCorrectIdx < 0) {
          // GPT failed to mark any option — fallback: mark first option correct
          sanitizedOptions[0] = { ...sanitizedOptions[0], isCorrect: true };
        } else {
          // Clear all other correct flags so only one remains
          sanitizedOptions = sanitizedOptions.map((o, i) => ({
            ...o,
            isCorrect: i === firstCorrectIdx,
          }));
        }
      } else if (qType === 'mcq_multiple') {
        // Ensure at least one correct answer
        const hasCorrect = sanitizedOptions.some((o) => o.isCorrect);
        if (!hasCorrect && sanitizedOptions.length > 0) {
          sanitizedOptions[0] = { ...sanitizedOptions[0], isCorrect: true };
        }
      }
    }

    return {
      question: String(q.question || '').trim(),
      type: qType,
      difficultyLevel: ['easy', 'medium', 'hard'].includes(q.difficultyLevel)
        ? q.difficultyLevel
        : params.difficulty === 'mixed'
        ? 'medium'
        : (params.difficulty as 'easy' | 'medium' | 'hard'),
      marks: typeof q.marks === 'number' && q.marks > 0 ? q.marks : 1,
      options: sanitizedOptions,
      correctAnswerText: q.correctAnswerText ? String(q.correctAnswerText) : undefined,
      explanation: q.explanation ? String(q.explanation) : undefined,
      tags: Array.isArray(q.tags) ? q.tags.map(String) : [],
    };
  });
}

function buildCodingAssignmentPrompt(params: GenerateCodingAssignmentParams): string {
  const { title, concept, language, difficulty, testCaseCount } = params;

  /**
   * How each language reads one input value.
   *
   * JAVASCRIPT USES prompt(). Node has no prompt(), so the execution service injects one
   * that serves the test case's input lines in order (see JS_PROMPT_PRELUDE in
   * codeRunnerService). That is deliberate: prompt() is what students are taught, and it is
   * synchronous — the previous hint here was an incomplete `readline` snippet whose async
   * ordering made the model's own solutions unreliable.
   *
   * Every other language is untouched and reads stdin exactly as it always has.
   */
  const langMap: Record<string, { readInput: string; printOutput: string }> = {
    java: {
      readInput: 'Scanner sc = new Scanner(System.in); int n = sc.nextInt();',
      printOutput: 'System.out.println(...)'
    },
    python: {
      readInput: 'n = int(input())',
      printOutput: 'print(...)'
    },
    javascript: {
      readInput: 'let n = Number(prompt());   // browser-style prompt(), one call per input line',
      printOutput: 'console.log(...)'
    },
    c: {
      readInput: 'scanf("%d", &n);',
      printOutput: 'printf(...)'
    },
    'c++': {
      readInput: 'cin >> n;',
      printOutput: 'cout << ... << endl;'
    }
  };

  const langInfo = langMap[language.toLowerCase()] || langMap['java'];
  const isJs = language.toLowerCase() === 'javascript';

  const jsRules = isJs ? `
JAVASCRIPT INPUT RULES (important):
- Read EVERY input value with prompt(). One prompt() call returns one line of the test input.
- prompt() always returns a STRING. Convert it yourself: Number(prompt()), parseInt(prompt(), 10).
- Call prompt() exactly as many times as the test input has lines — no more, no less.
- Do NOT use readline, process.stdin, fs.readFileSync or any Node stdin API.
- Print results with console.log() only. The prompt() message is never printed, so do not
  rely on it appearing in the output.
Example of a correct solution:
  let a = Number(prompt());
  let b = Number(prompt());
  console.log(a + b);
` : '';

  return `You are an expert coding instructor creating a coding assignment for an LMS.

Assignment Title: "${title}"
Programming Concept: "${concept}"
Language: ${language}
Difficulty: ${difficulty}
Number of Test Cases: ${testCaseCount}

CRITICAL RULES FOR CODE EXECUTION:
- For ${language}: use ${langInfo.readInput} to read input, and ${langInfo.printOutput} to print output.
- Test case input is one value per line, in the order the program reads them.
- The starter code should have the boilerplate with clear TODO comments.
- The solution code must be a complete, working program that solves the problem correctly.
- The starter code and the solution MUST read input the same way as each other.
- Each test case input should be simple values (numbers, strings) on separate lines.
${jsRules}
DO NOT PRODUCE EXPECTED OUTPUT.
The backend runs your reference solution against every test input and records what it
actually prints. That real output becomes the expected output. Any expected output you
write would be ignored, so do not include the field at all — spend the effort on making
the solution correct instead.

THE REFERENCE SOLUTION MUST BE DETERMINISTIC.
Given the same input it must print the same output every time. No random values, no
current date or time, no network access, no filesystem access, no reliance on locale or
environment. A solution that is not deterministic produces an expected output that can
never be reproduced, and the whole test case is discarded.

Return ONLY a valid JSON object with this exact structure:
{
  "description": "HTML description of the assignment (2-3 paragraphs, can include <b>, <p>, <ul>, <li> tags)",
  "instructions": "HTML step-by-step instructions covering the input format and the output format (use <ol>, <li>, <p>, <code> tags)",
  "starterCode": "Complete starter code template with TODO comments (the student fills in the logic)",
  "solutionCode": "Complete, correct, deterministic reference solution",
  "testCases": [
    {
      "input": "the input (plain text, one value per line)",
      "description": "what this test case checks",
      "isHidden": false
    }
  ],
  "topics": ["topic1", "topic2"]
}

Rules for test cases:
- First ${Math.min(Math.ceil(testCaseCount / 2), testCaseCount)} test cases should be visible (isHidden: false)
- Remaining test cases should be hidden (isHidden: true)
- Include edge cases (boundary values, larger inputs)
- Every test case must provide every value the solution reads, and nothing more
- Input must be plain text, no formatting

Return exactly ${testCaseCount} test cases. No markdown, no code blocks, only the JSON object.`;
}

/**
 * The language the reference solution will actually be run as.
 *
 * Falls back to JavaScript only when the caller asked for something this executor has no
 * runtime for — verification is worthless if it runs the wrong language, so an unknown
 * value is better rejected by the runner than silently graded.
 */
function toExecutableLanguage(language: string): ProgrammingLanguage | null {
  const key = String(language || '').trim().toLowerCase();
  const aliases: Record<string, ProgrammingLanguage> = {
    javascript: ProgrammingLanguage.JAVASCRIPT, js: ProgrammingLanguage.JAVASCRIPT,
    node: ProgrammingLanguage.JAVASCRIPT, nodejs: ProgrammingLanguage.JAVASCRIPT,
    typescript: ProgrammingLanguage.TYPESCRIPT, ts: ProgrammingLanguage.TYPESCRIPT,
    python: ProgrammingLanguage.PYTHON, python3: ProgrammingLanguage.PYTHON, py: ProgrammingLanguage.PYTHON,
    java: ProgrammingLanguage.JAVA,
    'c++': ProgrammingLanguage.CPP, cpp: ProgrammingLanguage.CPP,
    c: ProgrammingLanguage.C, csharp: ProgrammingLanguage.CSHARP, 'c#': ProgrammingLanguage.CSHARP,
    go: ProgrammingLanguage.GO, golang: ProgrammingLanguage.GO, rust: ProgrammingLanguage.RUST,
  };
  return aliases[key] || null;
}

/** Nondeterminism the reference solution must not contain. */
const NONDETERMINISM = [
  { re: /\bMath\s*\.\s*random\b/, what: 'Math.random()' },
  { re: /\bnew\s+Date\b|\bDate\s*\.\s*now\b/, what: 'the current date/time' },
  { re: /\brandom\s*\.\s*(random|randint|choice|shuffle)\b/, what: 'the random module' },
  { re: /\bnew\s+Random\b|\bThreadLocalRandom\b/, what: 'java.util.Random' },
  { re: /\brand\s*\(|\bsrand\s*\(/, what: 'rand()' },
  { re: /\bSystem\s*\.\s*currentTimeMillis\b|\bLocalDate(Time)?\s*\.\s*now\b/, what: 'the system clock' },
  { re: /\bfetch\s*\(|\brequire\s*\(\s*['"](https?|net|child_process)['"]/, what: 'network or process access' },
];

/**
 * Reject a reference solution that cannot produce a stable answer.
 *
 * Caught BEFORE execution, because nondeterminism does not fail — it succeeds, once, and
 * writes an expected output that no later run can reproduce. Every student then fails a
 * correct program and nothing in the logs says why.
 */
function findNondeterminism(code: string): string | null {
  for (const n of NONDETERMINISM) if (n.re.test(code)) return n.what;
  return null;
}

export interface VerifiedTestCase {
  input: string;
  expectedOutput: string;
  description: string;
  isHidden: boolean;
  points: number;
}

/**
 * Run the reference solution against every generated input and keep what it actually printed.
 *
 * THIS IS THE FIX. The model used to be asked for the expected output and we stored its
 * guess; a guess is wrong often enough that students failed correct programs and had no way
 * to tell whose fault it was. Now the expected output is a MEASUREMENT — taken from the same
 * execution service, with the same prompt() shim and the same normalisation the student's
 * submission will later be judged by, so the two cannot disagree about anything except the
 * answer itself.
 *
 * The pattern is already proven in assessmentQuestionGeneratorService.runForOutput(); this
 * is that idea applied to assignments, which never had it.
 *
 * A test case the reference cannot run is DROPPED rather than guessed at. If too few survive,
 * the caller refuses to return a draft at all — a broken assignment that reaches a student is
 * far more expensive than a generation that failed honestly.
 */
async function verifyTestCases(
  rawCases: any[],
  solutionCode: string,
  language: ProgrammingLanguage,
): Promise<{ verified: VerifiedTestCase[]; failures: string[] }> {
  const verified: VerifiedTestCase[] = [];
  const failures: string[] = [];

  for (let i = 0; i < rawCases.length; i++) {
    const tc = rawCases[i] || {};
    const input = String(tc.input ?? '');
    const label = `Test case ${i + 1}`;

    const run = await codeRunner.execute({
      code: solutionCode,
      language,
      input,
      // Nothing to compare against — we are here to find out what the answer IS.
      expectedOutput: '',
      timeLimit: 15000,
      memoryLimit: 256,
      // The reference runs exactly as the student will, or the outputs are not comparable.
      enablePromptInput: true,
    });

    if (run.compilationError) { failures.push(`${label}: reference solution failed to compile — ${firstLine(run.compilationError)}`); continue; }
    if (run.error)            { failures.push(`${label}: reference solution errored — ${firstLine(run.error)}`); continue; }

    const expectedOutput = String(run.output ?? '').replace(/\r\n?/g, '\n').replace(/\n+$/, '');
    // A silent program is not a passing test — it is a test with no answer in it, and it
    // would mark any student who printed the right thing as wrong.
    if (!expectedOutput.trim()) { failures.push(`${label}: reference solution produced no output`); continue; }

    verified.push({
      input,
      expectedOutput,
      description: String(tc.description || `Test case ${i + 1}`),
      isHidden: Boolean(tc.isHidden),
      points: 0, // assigned once we know how many survived
    });
  }

  return { verified, failures };
}

const firstLine = (s: string): string => String(s || '').split('\n')[0].slice(0, 200);

export async function generateCodingAssignmentWithAI(
  params: GenerateCodingAssignmentParams
): Promise<GeneratedCodingAssignment> {
  const openai = getOpenAI();
  if (!openai) {
    throw new Error('OPENAI_API_KEY is not configured on the server.');
  }

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: 'You are an expert coding instructor. Always respond with valid JSON only — no markdown, no code fences, just the raw JSON object.'
      },
      {
        role: 'user',
        content: buildCodingAssignmentPrompt(params)
      }
    ],
    // Lowered from 0.7 because the valuable output here is a CORRECT program, not a varied
    // one. Secondary, though: correctness comes from executing the solution below, and this
    // only reduces how often that execution has to throw a draft away.
    temperature: 0.2,
    response_format: { type: 'json_object' }
  });

  const raw = response.choices[0]?.message?.content || '{}';

  let parsed: any;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error('AI service returned malformed JSON. Please try again.');
  }

  if (!parsed.testCases || !Array.isArray(parsed.testCases) || parsed.testCases.length === 0) {
    throw new Error('AI returned no test cases. Please try again.');
  }

  const starterCode = String(parsed.starterCode || '').trim();
  const solutionCode = String(parsed.solutionCode || '').trim();
  if (!starterCode)  throw new Error('AI returned no starter code. Please try again.');
  if (!solutionCode) throw new Error('AI returned no reference solution, so its test cases cannot be verified. Please try again.');

  const execLanguage = toExecutableLanguage(params.language);
  if (!execLanguage) {
    throw new Error(`Cannot verify test cases for "${params.language}" — it has no runtime in the code executor.`);
  }

  const unstable = findNondeterminism(solutionCode);
  if (unstable) {
    throw new Error(
      `The generated reference solution uses ${unstable}, so its output cannot be reproduced and its test cases would fail at random. Please generate again.`,
    );
  }

  /**
   * EXECUTE, THEN SAVE — never the other way round.
   *
   * Everything above this line is the model's opinion. Everything below is measured.
   */
  const wanted = parsed.testCases.slice(0, params.testCaseCount);
  const { verified, failures } = await verifyTestCases(wanted, solutionCode, execLanguage);

  if (!verified.length) {
    throw new Error(
      `The generated solution did not run against any of its test inputs, so no test case could be verified. ${failures[0] || ''} Please generate again.`.trim(),
    );
  }
  /**
   * One usable test case is not an assignment.
   *
   * Returning a draft with a single case looks like success and grades almost nothing, so
   * it is the failure most likely to reach a student unnoticed. Two is the floor.
   */
  if (verified.length < Math.min(2, wanted.length)) {
    throw new Error(
      `Only ${verified.length} of ${wanted.length} test cases could be verified by running the solution. ${failures[0] || ''} Please generate again.`.trim(),
    );
  }

  // Points are distributed across what SURVIVED, so a dropped test case does not leave the
  // assignment marked out of less than 100.
  const totalPoints = 100;
  const perTestPoints = Math.floor(totalPoints / verified.length);
  const remainder = totalPoints - (perTestPoints * verified.length);

  return {
    description: String(parsed.description || ''),
    instructions: String(parsed.instructions || ''),
    starterCode,
    solutionCode,
    testCases: verified.map((tc, i) => ({
      ...tc,
      points: i === 0 ? perTestPoints + remainder : perTestPoints,
    })),
    topics: Array.isArray(parsed.topics) ? parsed.topics.map(String) : [],
    // Surfaced so the admin knows the draft is smaller than they asked for, and why.
    verification: {
      requested: wanted.length,
      verified: verified.length,
      dropped: failures,
    },
  };
}

/* ══════════════════════════ Web (frontend) assignments ══════════════════════════ */

export interface GenerateWebAssignmentParams {
  title: string;
  concept: string;
  stack: WebStack;
  difficulty: 'beginner' | 'easy' | 'medium' | 'hard' | 'expert';
}

export interface GeneratedWebAssignment {
  description: string;
  instructions: string;
  brief: string;
  colors: { name: string; hex: string }[];
  fonts: { family: string; weights: string }[];
  requirements: WebRequirement[];
  files: WebFile[];
  topics: string[];
  /** Checks the model wrote that were malformed or that its own reference page failed, so they were dropped. */
  verification: { requested: number; kept: number; dropped: string[] };
}

const STACK_TEXT: Record<WebStack, string> = {
  html_css: 'plain HTML and CSS only (no JavaScript). Files: index.html, style.css. index.html links style.css.',
  html_css_js: 'HTML, CSS and vanilla JavaScript (no libraries). Files: index.html, style.css, script.js. index.html links style.css and loads script.js at the end of body.',
  bootstrap: 'HTML with Bootstrap 5.3 from the jsDelivr CDN, plus a small style.css and optional script.js. Files: index.html, style.css, script.js. index.html includes the Bootstrap CSS and bundle JS CDN links.',
  react: 'React 18 written in a single App.jsx (function components and hooks, no imports, no build step: React and ReactDOM are globals). App.jsx ends with ReactDOM.createRoot(document.getElementById("root")).render(<App />);. Files: index.html (has <div id="root"></div>), App.jsx, style.css.',
};

function buildWebAssignmentPrompt(p: GenerateWebAssignmentParams): string {
  const files = STACK_FILES[p.stack];
  return `Create a frontend (web page) assignment for students.

Title: ${p.title}
What to build: ${p.concept}
Difficulty: ${p.difficulty}
Stack: ${STACK_TEXT[p.stack]}

Return a JSON object with exactly these keys:
- "description": 2-4 sentences of HTML (<p>, <strong>) saying what the student builds and why.
- "instructions": HTML steps (<ol><li>) for building it, in order. Mention the colours and fonts by name.
- "brief": a plain-text design brief a designer would hand a developer: layout from top to bottom, each section's content, spacing and behaviour on mobile. 8-20 lines.
- "colors": 3-6 objects {"name": "Primary", "hex": "#1e40af"} forming a coherent palette.
- "fonts": 1-2 Google Fonts objects {"family": "Poppins", "weights": "400;600;700"}.
- "requirements": 6-12 checks of what the finished page must have. Each is an object:
  {"text": "plain sentence the student reads", "kind": one of "element" | "text" | "color" | "font" | "responsive" | "source", "selector": CSS selector (for element, optional for text), "value": the text / hex / font family / code snippet, "min": number (optional, element only), "points": 1-3}
  Selectors may only use tag, #id, .class, [attr], [attr=value], descendant and > combinators. No pseudo-classes.
  Use "element" for structure (e.g. "form input[type=email]"), "text" for visible words, "color" for each main palette colour, "font" for the main font, one "responsive" check, and "source" only for JavaScript/React behaviour (e.g. "addEventListener", "useState").
- "starterFiles": an object with keys ${files.map(f => `"${f}"`).join(', ')}: the starting point the student gets. The boilerplate and file links in place, the Google Fonts <link> for the chosen fonts in index.html, empty sections marked with comments. Not the solution.
- "solutionFiles": an object with the same keys: a complete reference page that meets EVERY requirement. It is used only to verify the checks and is never shown to students.
- "topics": 2-5 short topic tags.

Respond with the JSON object only.`;
}

export async function generateWebAssignmentWithAI(p: GenerateWebAssignmentParams): Promise<GeneratedWebAssignment> {
  const openai = getOpenAI();
  if (!openai) throw new Error('OPENAI_API_KEY is not configured on the server.');
  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: 'You are an expert frontend instructor and UI designer. Always respond with valid JSON only.' },
      { role: 'user', content: buildWebAssignmentPrompt(p) },
    ],
    temperature: 0.4,
    response_format: { type: 'json_object' },
  });
  let parsed: any;
  try { parsed = JSON.parse(response.choices[0]?.message?.content || '{}'); } catch {
    throw new Error('AI service returned malformed JSON. Please try again.');
  }
  return shapeGeneratedWeb(parsed, p.stack);
}

/**
 * The model's draft, checked. A requirement is kept only if it is well formed AND the model's own
 * reference page passes it: a check the reference fails would fail every correct student too. On the
 * JavaScript and React stacks the page is built at run time, so element and text checks cannot be
 * run against the reference here; those are kept when well formed. Exported for tests.
 */
export function shapeGeneratedWeb(parsed: any, stack: WebStack): GeneratedWebAssignment {
  const fileList = (o: any): WebFile[] => STACK_FILES[stack].map(name => ({ name, code: String(o?.[name] ?? '') }));
  const files = fileList(parsed?.starterFiles);
  if (!files.some(f => f.code.trim())) throw new Error('AI returned no starter files. Please try again.');
  const solution = fileList(parsed?.solutionFiles);

  const raw: any[] = Array.isArray(parsed?.requirements) ? parsed.requirements : [];
  const dropped: string[] = [];
  const shaped: WebRequirement[] = [];
  raw.slice(0, 15).forEach((r, i) => {
    const req: WebRequirement = {
      id: `r${i + 1}`,
      text: String(r?.text || '').trim().slice(0, 300),
      kind: r?.kind,
      selector: r?.selector ? String(r.selector).trim() : undefined,
      value: r?.value !== undefined && r?.value !== null ? String(r.value).trim() : undefined,
      min: r?.min ? Math.max(1, Math.floor(Number(r.min) || 1)) : undefined,
      points: Math.max(1, Math.min(3, Math.round(Number(r?.points) || 1))),
    };
    const problem = requirementProblem([req]);
    if (problem) { dropped.push(`${req.text || `Check ${i + 1}`}: ${problem.replace(/^Requirement 1:?\s*/, '')}`); return; }
    shaped.push(req);
  });

  let kept = shaped;
  if (solution.some(f => f.code.trim())) {
    const results = evaluateWebChecks({ stack, files: solution, requirements: shaped });
    const runtimeBuilt = stack !== 'html_css';
    kept = shaped.filter((r, i) => {
      if (results[i].passed) return true;
      if (runtimeBuilt && (r.kind === 'element' || r.kind === 'text')) return true;
      dropped.push(`${r.text}: the reference page did not pass it (${results[i].detail})`);
      return false;
    });
  }
  kept = kept.map((r, i) => ({ ...r, id: `r${i + 1}` }));

  const colors = (Array.isArray(parsed?.colors) ? parsed.colors : [])
    .map((c: any) => ({ name: String(c?.name || '').slice(0, 60), hex: normalizeHex(String(c?.hex || '')) || '' }))
    .filter((c: any) => c.hex).slice(0, 8);
  const fonts = (Array.isArray(parsed?.fonts) ? parsed.fonts : [])
    .map((f: any) => ({ family: String(f?.family || '').trim().slice(0, 80), weights: String(f?.weights || '400;700').replace(/[^0-9;]/g, '') || '400;700' }))
    .filter((f: any) => f.family).slice(0, 3);

  return {
    description: String(parsed?.description || ''),
    instructions: String(parsed?.instructions || ''),
    brief: String(parsed?.brief || ''),
    colors,
    fonts,
    requirements: kept,
    files,
    topics: Array.isArray(parsed?.topics) ? parsed.topics.map(String).slice(0, 6) : [],
    verification: { requested: raw.length, kept: kept.length, dropped },
  };
}

/** Comments on a handed-in web page against its brief. Feedback only: it never changes the mark. */
export async function reviewWebSubmissionWithAI(input: {
  assignment: any;
  files: WebFile[];
  checks: { text: string; passed: boolean }[];
}): Promise<string | null> {
  const openai = getOpenAI();
  if (!openai) return null;
  const a = input.assignment;
  const code = input.files.map(f => `--- ${f.name} ---\n${f.code.slice(0, 12000)}`).join('\n\n');
  const checklist = input.checks.map(c => `${c.passed ? '[x]' : '[ ]'} ${c.text}`).join('\n');
  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: "You are a friendly senior frontend developer reviewing a student's web page. Be specific and encouraging. Plain text, no markdown headings." },
      {
        role: 'user', content: `Assignment: ${a.title}
Design brief:
${String(a.web?.brief || '').slice(0, 3000)}
Colours: ${(a.web?.colors || []).map((c: any) => `${c.name} ${c.hex}`).join(', ') || 'none given'}
Fonts: ${(a.web?.fonts || []).map((f: any) => f.family).join(', ') || 'none given'}
Checklist results:
${checklist || '(no checklist)'}

The student's files:
${code}

Write 4-8 short bullet points ("- ") covering: what is done well, what is missing from the brief, HTML structure and accessibility (labels, alt text, headings), CSS (layout, responsiveness, use of the palette), and one concrete next step. Do not give a score.`,
      },
    ],
    temperature: 0.3,
    max_tokens: 600,
  });
  const text = String(response.choices[0]?.message?.content || '').trim();
  return text ? text.slice(0, 4000) : null;
}
