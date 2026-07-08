import { getOpenAI } from './aiClients';

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
  testCases: {
    input: string;
    expectedOutput: string;
    description: string;
    isHidden: boolean;
    points: number;
  }[];
  topics: string[];
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
      readInput: "const readline = require('readline'); rl.on('line', ...)",
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

  return `You are an expert coding instructor creating a coding assignment for an LMS.

Assignment Title: "${title}"
Programming Concept: "${concept}"
Language: ${language}
Difficulty: ${difficulty}
Number of Test Cases: ${testCaseCount}

CRITICAL RULES FOR CODE EXECUTION:
- The program MUST read input from stdin and print output to stdout.
- For ${language}: use ${langInfo.readInput} to read input, and ${langInfo.printOutput} to print output.
- Test case input is passed via stdin line by line.
- Test case expected output is compared against stdout (trimmed).
- The starter code should have the boilerplate with clear TODO comments.
- The solution code must be a complete, working program that reads stdin and prints to stdout.
- Output must EXACTLY match expected output (no extra spaces, no trailing text).
- Each test case input should be simple values (numbers, strings) on separate lines.

Return ONLY a valid JSON object with this exact structure:
{
  "description": "HTML description of the assignment (2-3 paragraphs, can include <b>, <p>, <ul>, <li> tags)",
  "instructions": "HTML step-by-step instructions (use <ol>, <li>, <p>, <code> tags)",
  "starterCode": "Complete starter code template with TODO comments (the student fills in the logic)",
  "solutionCode": "Complete working solution that reads from stdin and prints to stdout",
  "testCases": [
    {
      "input": "the stdin input (plain text, newline-separated values)",
      "expectedOutput": "the exact expected stdout output (plain text)",
      "description": "what this test case checks",
      "isHidden": false,
      "points": 20
    }
  ],
  "topics": ["topic1", "topic2"]
}

Rules for test cases:
- First ${Math.min(Math.ceil(testCaseCount / 2), testCaseCount)} test cases should be visible (isHidden: false)
- Remaining test cases should be hidden (isHidden: true)
- Include edge cases (empty input, boundary values, large inputs)
- Points should sum to 100 (distribute evenly)
- Input/output must be plain text, no formatting

Return exactly ${testCaseCount} test cases. No markdown, no code blocks, only the JSON object.`;
}

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

  if (!parsed.testCases || !Array.isArray(parsed.testCases) || parsed.testCases.length === 0) {
    throw new Error('AI returned no test cases. Please try again.');
  }

  const totalPoints = 100;
  const perTestPoints = Math.floor(totalPoints / parsed.testCases.length);
  const remainder = totalPoints - (perTestPoints * parsed.testCases.length);

  return {
    description: String(parsed.description || ''),
    instructions: String(parsed.instructions || ''),
    starterCode: String(parsed.starterCode || ''),
    solutionCode: String(parsed.solutionCode || ''),
    testCases: parsed.testCases.slice(0, params.testCaseCount).map((tc: any, i: number) => ({
      input: String(tc.input || ''),
      expectedOutput: String(tc.expectedOutput || ''),
      description: String(tc.description || `Test case ${i + 1}`),
      isHidden: Boolean(tc.isHidden),
      points: i === 0 ? perTestPoints + remainder : perTestPoints
    })),
    topics: Array.isArray(parsed.topics) ? parsed.topics.map(String) : []
  };
}
