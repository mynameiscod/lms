import OpenAI from 'openai';

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
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is not configured on the server.');
  }

  const openai = new OpenAI({ apiKey });

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

  // Sanitize: ensure required fields and trim results to requested count
  return questions.slice(0, params.count).map((q) => ({
    question: String(q.question || '').trim(),
    type: q.type || params.type,
    difficultyLevel: ['easy', 'medium', 'hard'].includes(q.difficultyLevel)
      ? q.difficultyLevel
      : params.difficulty === 'mixed'
      ? 'medium'
      : (params.difficulty as 'easy' | 'medium' | 'hard'),
    marks: typeof q.marks === 'number' && q.marks > 0 ? q.marks : 1,
    options: Array.isArray(q.options) ? q.options : undefined,
    correctAnswerText: q.correctAnswerText ? String(q.correctAnswerText) : undefined,
    explanation: q.explanation ? String(q.explanation) : undefined,
    tags: Array.isArray(q.tags) ? q.tags.map(String) : []
  }));
}
