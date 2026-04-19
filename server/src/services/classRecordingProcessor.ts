import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';
import ClassRecording from '../models/ClassRecording';

/**
 * Background processor for class recordings.
 * Pipeline: transcribe → summarize → generate quiz → generate assignment
 */

async function updateStatus(recordingId: string, status: string, progress: number, extra: Record<string, any> = {}) {
  await ClassRecording.findByIdAndUpdate(recordingId, { status, processingProgress: progress, ...extra });
}

/**
 * Transcribe audio/video using OpenAI Whisper API.
 * Whisper supports mp4, webm, mp3, wav, etc. up to 25MB.
 * For larger files we chunk by splitting (simplified: send first 25MB).
 */
async function transcribeVideo(filePath: string): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY not configured');

  const openai = new OpenAI({ apiKey });
  const stats = fs.statSync(filePath);
  const MAX_SIZE = 24 * 1024 * 1024; // 24MB to stay under 25MB limit

  if (stats.size <= MAX_SIZE) {
    const response = await openai.audio.transcriptions.create({
      file: fs.createReadStream(filePath),
      model: 'whisper-1',
      language: 'en',
      response_format: 'text'
    });
    return response as unknown as string;
  }

  // For large files, we need to chunk. Read first chunk.
  // In production, use ffmpeg to split audio. For now, truncate.
  console.log(`[ClassRecording] File ${stats.size} bytes exceeds Whisper limit, sending first ${MAX_SIZE} bytes`);
  const tempPath = filePath + '.chunk.webm';
  const buffer = Buffer.alloc(MAX_SIZE);
  const fd = fs.openSync(filePath, 'r');
  fs.readSync(fd, buffer, 0, MAX_SIZE, 0);
  fs.closeSync(fd);
  fs.writeFileSync(tempPath, buffer);

  try {
    const response = await openai.audio.transcriptions.create({
      file: fs.createReadStream(tempPath),
      model: 'whisper-1',
      language: 'en',
      response_format: 'text'
    });
    return response as unknown as string;
  } finally {
    fs.unlinkSync(tempPath);
  }
}

/**
 * Generate a class summary from transcript using GPT.
 */
async function generateSummary(transcript: string): Promise<{ overview: string; keyPoints: string[]; topics: string[] }> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY not configured');

  const openai = new OpenAI({ apiKey });

  // Truncate transcript if too long (keep ~12k tokens worth)
  const maxChars = 48000;
  const truncated = transcript.length > maxChars ? transcript.substring(0, maxChars) + '\n[...transcript truncated...]' : transcript;

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: 'You are an expert educator. Summarize class recordings. Always respond with valid JSON only.'
      },
      {
        role: 'user',
        content: `Analyze this class recording transcript and generate a structured summary.

Transcript:
"""
${truncated}
"""

Return a JSON object with:
{
  "overview": "A 2-3 paragraph summary of what was covered in class",
  "keyPoints": ["Key point 1", "Key point 2", ...],  // 5-10 key takeaways
  "topics": ["Topic 1", "Topic 2", ...]  // Main topics/concepts covered
}

Return ONLY valid JSON, no markdown.`
      }
    ],
    temperature: 0.5,
    response_format: { type: 'json_object' }
  });

  const raw = response.choices[0]?.message?.content || '{}';
  const parsed = JSON.parse(raw);

  return {
    overview: String(parsed.overview || 'Summary not available'),
    keyPoints: Array.isArray(parsed.keyPoints) ? parsed.keyPoints.map(String) : [],
    topics: Array.isArray(parsed.topics) ? parsed.topics.map(String) : []
  };
}

/**
 * Generate MCQ quiz questions from transcript.
 */
async function generateQuizFromTranscript(transcript: string, title: string): Promise<any[]> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY not configured');

  const openai = new OpenAI({ apiKey });
  const maxChars = 48000;
  const truncated = transcript.length > maxChars ? transcript.substring(0, maxChars) : transcript;

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: 'You are an expert educator creating quiz questions from class content. Always respond with valid JSON only.'
      },
      {
        role: 'user',
        content: `Based on this class recording transcript, generate 8 multiple-choice quiz questions (MCQ).

Class: "${title}"

Transcript:
"""
${truncated}
"""

Return a JSON object:
{
  "questions": [
    {
      "question": "Question text",
      "options": [
        {"text": "Option A", "isCorrect": false},
        {"text": "Option B", "isCorrect": true},
        {"text": "Option C", "isCorrect": false},
        {"text": "Option D", "isCorrect": false}
      ],
      "explanation": "Why the correct answer is right",
      "difficulty": "easy|medium|hard"
    }
  ]
}

Rules:
- Generate exactly 8 questions
- Each question has exactly 4 options with exactly 1 correct
- Mix difficulties: 3 easy, 3 medium, 2 hard
- Questions should test understanding of concepts taught in class
- Return ONLY valid JSON`
      }
    ],
    temperature: 0.7,
    response_format: { type: 'json_object' }
  });

  const raw = response.choices[0]?.message?.content || '{}';
  const parsed = JSON.parse(raw);
  const questions = Array.isArray(parsed.questions) ? parsed.questions : [];

  return questions.map((q: any) => ({
    question: String(q.question || ''),
    options: Array.isArray(q.options)
      ? q.options.map((o: any) => ({ text: String(o.text || ''), isCorrect: Boolean(o.isCorrect) }))
      : [],
    explanation: String(q.explanation || ''),
    difficulty: ['easy', 'medium', 'hard'].includes(q.difficulty) ? q.difficulty : 'medium'
  }));
}

/**
 * Generate a coding assignment from transcript.
 */
async function generateAssignmentFromTranscript(transcript: string, title: string): Promise<any> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY not configured');

  const openai = new OpenAI({ apiKey });
  const maxChars = 48000;
  const truncated = transcript.length > maxChars ? transcript.substring(0, maxChars) : transcript;

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: 'You are an expert coding instructor creating assignments from class content. Always respond with valid JSON only.'
      },
      {
        role: 'user',
        content: `Based on this class recording transcript, generate a coding assignment that reinforces the concepts taught.

Class: "${title}"

Transcript:
"""
${truncated}
"""

Return a JSON object:
{
  "title": "Assignment title",
  "description": "HTML description (2-3 paragraphs with <p>, <b>, <ul> tags)",
  "instructions": "HTML step-by-step instructions (use <ol>, <li>, <code> tags)",
  "type": "coding",
  "difficulty": "beginner|easy|medium|hard|expert",
  "starterCode": "Java starter code with TODO comments (reads from stdin, prints to stdout)",
  "solutionCode": "Complete working Java solution",
  "testCases": [
    {
      "input": "stdin input",
      "expectedOutput": "expected stdout",
      "description": "what this test checks",
      "isHidden": false,
      "points": 20
    }
  ]
}

Rules:
- Generate 5 test cases (3 visible, 2 hidden)
- Points should sum to 100
- Code should use Java and read from stdin / print to stdout
- Assignment should directly relate to concepts from the class
- Return ONLY valid JSON`
      }
    ],
    temperature: 0.7,
    response_format: { type: 'json_object' }
  });

  const raw = response.choices[0]?.message?.content || '{}';
  const parsed = JSON.parse(raw);

  return {
    title: String(parsed.title || `${title} - Practice Assignment`),
    description: String(parsed.description || ''),
    instructions: String(parsed.instructions || ''),
    type: String(parsed.type || 'coding'),
    difficulty: String(parsed.difficulty || 'medium'),
    starterCode: String(parsed.starterCode || ''),
    solutionCode: String(parsed.solutionCode || ''),
    testCases: Array.isArray(parsed.testCases)
      ? parsed.testCases.map((tc: any, i: number) => ({
          input: String(tc.input || ''),
          expectedOutput: String(tc.expectedOutput || ''),
          description: String(tc.description || `Test case ${i + 1}`),
          isHidden: Boolean(tc.isHidden),
          points: typeof tc.points === 'number' ? tc.points : 20
        }))
      : []
  };
}

/**
 * Main processing pipeline. Runs asynchronously after video upload.
 */
export async function processClassRecording(recordingId: string): Promise<void> {
  console.log(`[ClassRecording] Starting processing for recording ${recordingId}`);

  try {
    const recording = await ClassRecording.findById(recordingId);
    if (!recording) throw new Error('Recording not found');

    const videoPath = path.resolve(recording.videoUrl);
    if (!fs.existsSync(videoPath)) throw new Error(`Video file not found: ${videoPath}`);

    // Step 1: Transcribe (0-40%)
    await updateStatus(recordingId, 'transcribing', 10);
    console.log(`[ClassRecording] Transcribing...`);
    const transcript = await transcribeVideo(videoPath);
    await updateStatus(recordingId, 'transcribing', 40, { transcript });
    console.log(`[ClassRecording] Transcript complete: ${transcript.length} chars`);

    // Step 2: Summarize (40-60%)
    await updateStatus(recordingId, 'summarizing', 45);
    console.log(`[ClassRecording] Generating summary...`);
    const summary = await generateSummary(transcript);
    await updateStatus(recordingId, 'summarizing', 60, { summary });
    console.log(`[ClassRecording] Summary complete`);

    // Step 3: Generate Quiz (60-80%)
    await updateStatus(recordingId, 'generating_quiz', 65);
    console.log(`[ClassRecording] Generating quiz...`);
    const quizQuestions = await generateQuizFromTranscript(transcript, recording.title);
    await updateStatus(recordingId, 'generating_quiz', 80, {
      generatedQuiz: { questions: quizQuestions }
    });
    console.log(`[ClassRecording] Quiz complete: ${quizQuestions.length} questions`);

    // Step 4: Generate Assignment (80-100%)
    await updateStatus(recordingId, 'generating_assignment', 85);
    console.log(`[ClassRecording] Generating assignment...`);
    const assignment = await generateAssignmentFromTranscript(transcript, recording.title);
    await updateStatus(recordingId, 'generating_assignment', 95, {
      generatedAssignment: assignment
    });
    console.log(`[ClassRecording] Assignment complete`);

    // Done
    await updateStatus(recordingId, 'completed', 100);
    console.log(`[ClassRecording] Processing complete for ${recordingId}`);

  } catch (error) {
    console.error(`[ClassRecording] Processing failed for ${recordingId}:`, error);
    await ClassRecording.findByIdAndUpdate(recordingId, {
      status: 'failed',
      processingError: error instanceof Error ? error.message : 'Processing failed'
    });
  }
}
