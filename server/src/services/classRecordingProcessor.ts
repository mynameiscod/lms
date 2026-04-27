import OpenAI from 'openai';
import axios from 'axios';
import FormData from 'form-data';
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
 * Transcribe audio/video using OpenAI Whisper API via axios (works on any Node version).
 * Whisper supports mp4, webm, mp3, wav, etc. up to 25MB.
 * For larger files we chunk by splitting (simplified: send first 24MB).
 */
async function transcribeVideo(filePath: string): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY not configured');

  const WHISPER_URL = 'https://api.openai.com/v1/audio/transcriptions';
  const MAX_SIZE = 24 * 1024 * 1024; // 24MB to stay under 25MB limit
  const stats = fs.statSync(filePath);

  const sendToWhisper = async (audioPath: string): Promise<string> => {
    const form = new FormData();
    form.append('file', fs.createReadStream(audioPath), path.basename(audioPath));
    form.append('model', 'whisper-1');
    form.append('language', 'en');
    form.append('response_format', 'text');
    const response = await axios.post(WHISPER_URL, form, {
      headers: { ...form.getHeaders(), Authorization: `Bearer ${apiKey}` },
      maxBodyLength: Infinity,
      maxContentLength: Infinity,
      timeout: 120000, // 2 min timeout
    });
    return response.data as string;
  };

  // Retry with exponential backoff for transient network failures
  const sendToWhisperWithRetry = async (audioPath: string, maxRetries = 3): Promise<string> => {
    let lastError: any;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await sendToWhisper(audioPath);
      } catch (err: any) {
        lastError = err;
        const isRetryable = err.code === 'ETIMEDOUT' || err.code === 'ECONNRESET' || err.code === 'ECONNREFUSED' || (err.response?.status >= 500);
        if (!isRetryable || attempt === maxRetries) throw err;
        const delay = Math.min(1000 * 2 ** (attempt - 1), 30000); // 1s, 2s, 4s ... max 30s
        console.log(`[ClassRecording] Whisper attempt ${attempt} failed (${err.code}), retrying in ${delay}ms...`);
        await new Promise(r => setTimeout(r, delay));
      }
    }
    throw lastError;
  };

  if (stats.size <= MAX_SIZE) {
    return sendToWhisperWithRetry(filePath);
  }

  // For large files: truncate to first 24MB and send as a chunk.
  // In production, prefer ffmpeg to split at a proper audio boundary.
  console.log(`[ClassRecording] File ${stats.size} bytes exceeds Whisper limit, sending first ${MAX_SIZE} bytes`);
  const tempPath = filePath + '.chunk.webm';
  const buffer = Buffer.alloc(MAX_SIZE);
  const fd = fs.openSync(filePath, 'r');
  fs.readSync(fd, buffer, 0, MAX_SIZE, 0);
  fs.closeSync(fd);
  fs.writeFileSync(tempPath, buffer);

  try {
    return await sendToWhisperWithRetry(tempPath);
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
 * Generate structured notes from transcript.
 */
async function generateNotesFromTranscript(transcript: string, title: string): Promise<{ sections: { heading: string; content: string }[] }> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY not configured');
  const openai = new OpenAI({ apiKey });
  const maxChars = 48000;
  const truncated = transcript.length > maxChars ? transcript.substring(0, maxChars) : transcript;

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: 'You are an expert educator creating structured class notes. Always respond with valid JSON only.' },
      {
        role: 'user',
        content: `Create structured notes for students based on this class transcript.
Class: "${title}"
Transcript: """${truncated}"""
Return JSON:
{
  "sections": [
    { "heading": "1. Section Title", "content": "Explanation text (2-4 sentences, clear and concise)" }
  ]
}
Generate 4-6 sections covering the main concepts. Return ONLY valid JSON.`
      }
    ],
    temperature: 0.4,
    response_format: { type: 'json_object' }
  });
  const raw = response.choices[0]?.message?.content || '{}';
  const parsed = JSON.parse(raw);
  return {
    sections: Array.isArray(parsed.sections)
      ? parsed.sections.map((s: any) => ({ heading: String(s.heading || ''), content: String(s.content || '') }))
      : []
  };
}

/**
 * Generate practice problems from transcript.
 */
async function generatePracticeFromTranscript(transcript: string, title: string): Promise<{ problems: { title: string; starterCode: string; hint: string }[] }> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY not configured');
  const openai = new OpenAI({ apiKey });
  const maxChars = 40000;
  const truncated = transcript.length > maxChars ? transcript.substring(0, maxChars) : transcript;

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: 'You are an expert coding instructor creating practice problems. Always respond with valid JSON only.' },
      {
        role: 'user',
        content: `Create 2-3 short practice coding problems based on this class.
Class: "${title}"
Transcript: """${truncated}"""
Return JSON:
{
  "problems": [
    {
      "title": "Problem Name",
      "starterCode": "// Java starter code with // TODO: comment",
      "hint": "💡 A short hint for the student"
    }
  ]
}
Return ONLY valid JSON.`
      }
    ],
    temperature: 0.6,
    response_format: { type: 'json_object' }
  });
  const raw = response.choices[0]?.message?.content || '{}';
  const parsed = JSON.parse(raw);
  return {
    problems: Array.isArray(parsed.problems)
      ? parsed.problems.map((p: any) => ({
          title: String(p.title || ''),
          starterCode: String(p.starterCode || ''),
          hint: String(p.hint || '')
        }))
      : []
  };
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

    // Step 2: Summarize (40-55%)
    await updateStatus(recordingId, 'summarizing', 45);
    console.log(`[ClassRecording] Generating summary...`);
    const summary = await generateSummary(transcript);
    await updateStatus(recordingId, 'summarizing', 55, { summary });
    console.log(`[ClassRecording] Summary complete`);

    // Step 3: Generate Notes (55-65%)
    await updateStatus(recordingId, 'generating_notes', 57);
    console.log(`[ClassRecording] Generating notes...`);
    const generatedNotes = await generateNotesFromTranscript(transcript, recording.title);
    await updateStatus(recordingId, 'generating_notes', 65, { generatedNotes });
    console.log(`[ClassRecording] Notes complete`);

    // Step 4: Generate Quiz (65-78%)
    await updateStatus(recordingId, 'generating_quiz', 67);
    console.log(`[ClassRecording] Generating quiz...`);
    const quizQuestions = await generateQuizFromTranscript(transcript, recording.title);
    await updateStatus(recordingId, 'generating_quiz', 78, {
      generatedQuiz: { questions: quizQuestions }
    });
    console.log(`[ClassRecording] Quiz complete: ${quizQuestions.length} questions`);

    // Step 5: Generate Practice (78-88%)
    await updateStatus(recordingId, 'generating_practice', 80);
    console.log(`[ClassRecording] Generating practice problems...`);
    const generatedPractice = await generatePracticeFromTranscript(transcript, recording.title);
    await updateStatus(recordingId, 'generating_practice', 88, { generatedPractice });
    console.log(`[ClassRecording] Practice complete`);

    // Step 6: Generate Assignment (88-100%)
    await updateStatus(recordingId, 'generating_assignment', 90);
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
