import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export interface GenerateLessonInput {
  concept: string;
  language: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  additionalNotes?: string;
}

export interface GeneratedLesson {
  title: string;
  description: string;
  tags: string[];
  scenes: any[];
}

const SYSTEM_PROMPT = `You are an expert programming educator and interactive lesson designer.
Generate a complete interactive programming lesson as a JSON object.

The lesson MUST contain exactly these 7 scenes in order:
1. story — narrator introduction with avatar
2. code_demo — animated code reveal with line commentary
3. drag_drop — drag items to correct buckets
4. quiz — multiple choice question
5. fill_blank — fill in the blank in code
6. code_run — live coding exercise
7. summary — key takeaways

Return ONLY a raw JSON object (no markdown, no code fences, no explanation).
The JSON must match this exact schema:

{
  "title": "string",
  "description": "string",
  "tags": ["string"],
  "scenes": [
    {
      "type": "story",
      "title": "string",
      "xpReward": 10,
      "story": {
        "avatarEmoji": "emoji",
        "avatarName": "string",
        "text": "string (2-3 sentences explaining the concept clearly)",
        "codeSnippet": "string (optional short example)",
        "codeLanguage": "string",
        "animationType": "typewriter"
      }
    },
    {
      "type": "code_demo",
      "title": "string",
      "xpReward": 15,
      "codeDemo": {
        "language": "string",
        "code": "string (5-10 lines showing the concept)",
        "lines": [
          { "lineNumber": 1, "commentary": "string explaining this line" }
        ],
        "revealSpeed": "normal",
        "highlightColor": "#fef08a"
      }
    },
    {
      "type": "drag_drop",
      "title": "string",
      "xpReward": 20,
      "dragDrop": {
        "instruction": "string",
        "buckets": [
          { "id": "b1", "label": "string", "color": "#3b82f6" },
          { "id": "b2", "label": "string", "color": "#10b981" }
        ],
        "items": [
          { "id": "i1", "label": "string", "targetBucket": "b1", "isDecoy": false },
          { "id": "i2", "label": "string", "targetBucket": "b2", "isDecoy": false },
          { "id": "i3", "label": "string", "targetBucket": "b1", "isDecoy": false },
          { "id": "i4", "label": "string", "targetBucket": "b2", "isDecoy": false },
          { "id": "i5", "label": "string", "targetBucket": "b1", "isDecoy": true }
        ],
        "explanation": "string"
      }
    },
    {
      "type": "quiz",
      "title": "string",
      "xpReward": 20,
      "quiz": {
        "question": "string",
        "options": [
          { "id": "o1", "text": "string", "isCorrect": true },
          { "id": "o2", "text": "string", "isCorrect": false },
          { "id": "o3", "text": "string", "isCorrect": false },
          { "id": "o4", "text": "string", "isCorrect": false }
        ],
        "explanation": "string",
        "hint": "string"
      }
    },
    {
      "type": "fill_blank",
      "title": "string",
      "xpReward": 20,
      "fillBlank": {
        "templateText": "string with ___ for blanks",
        "blanks": [
          { "index": 0, "answer": "string", "hint": "string" }
        ],
        "explanation": "string",
        "isCode": true,
        "codeLanguage": "string"
      }
    },
    {
      "type": "code_run",
      "title": "string",
      "xpReward": 25,
      "codeRun": {
        "language": "string",
        "starterCode": "string (complete runnable starter with comments guiding student)",
        "expectedOutput": "string",
        "hint": "string",
        "instructions": "string (clear task for student to complete)"
      }
    },
    {
      "type": "summary",
      "title": "string",
      "xpReward": 10,
      "summary": {
        "title": "What you learned",
        "points": [
          { "emoji": "✅", "text": "string" },
          { "emoji": "💡", "text": "string" },
          { "emoji": "🚀", "text": "string" }
        ],
        "codeRecap": "string (the final clean example showing the concept)",
        "codeLanguage": "string",
        "conceptMapItems": [
          { "term": "string", "definition": "string" }
        ]
      }
    }
  ]
}`;

export async function generateLesson(input: GenerateLessonInput): Promise<GeneratedLesson> {
  const userPrompt = `Generate a complete interactive lesson for:
- Concept: ${input.concept}
- Programming Language: ${input.language}
- Difficulty: ${input.difficulty}
${input.additionalNotes ? `- Additional notes: ${input.additionalNotes}` : ''}

Make all examples realistic, correct, and pedagogically sound.
Use proper ${input.language} syntax throughout.
The drag_drop should categorize things related to ${input.concept}.
The fill_blank should use actual ${input.language} code with ___  for missing tokens.
The code_run starter should have comments guiding the student on what to write.`;

  const message = await client.messages.create({
    model: 'claude-opus-4-7',
    max_tokens: 4096,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userPrompt }],
  });

  const text = (message.content[0] as any).text as string;

  // Strip any accidental markdown fences if present
  const cleaned = text.replace(/^```(?:json)?\n?/m, '').replace(/\n?```$/m, '').trim();

  let parsed: GeneratedLesson;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    // Try to extract JSON from response
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('AI returned invalid JSON — please try again');
    parsed = JSON.parse(match[0]);
  }

  // Validate required fields
  if (!parsed.scenes || !Array.isArray(parsed.scenes) || parsed.scenes.length === 0) {
    throw new Error('AI did not return valid scenes — please try again');
  }

  return parsed;
}
