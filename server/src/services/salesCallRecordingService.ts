import fs from 'fs';
import path from 'path';
import FormData from 'form-data';
import axios from 'axios';
import SalesCallRecording from '../models/SalesCallRecording';

const OPENAI_BASE = 'https://api.openai.com/v1';

function getApiKey(): string {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error('OPENAI_API_KEY environment variable is not set');
  return key;
}

async function transcribeAudio(filePath: string): Promise<{ text: string; durationSeconds?: number }> {
  const apiKey = getApiKey();
  const form = new FormData();
  form.append('file', fs.createReadStream(filePath));
  form.append('model', 'whisper-1');
  form.append('response_format', 'verbose_json');

  const response = await axios.post(`${OPENAI_BASE}/audio/transcriptions`, form, {
    headers: { ...form.getHeaders(), Authorization: `Bearer ${apiKey}` },
    maxContentLength: Infinity,
    maxBodyLength: Infinity,
    timeout: 300_000,
  });

  return {
    text: response.data.text || '',
    durationSeconds: response.data.duration,
  };
}

async function analyzeCallWithGPT(transcript: string, leadName: string): Promise<any> {
  const apiKey = getApiKey();

  const systemPrompt = `You are an expert sales coach analysing a sales call transcript from an educational institution (LMS/EdTech). 
Evaluate the salesperson's performance and return structured JSON ONLY — no extra text.`;

  const userPrompt = `Lead name: ${leadName || 'Unknown'}

Transcript:
"""
${transcript.slice(0, 14000)}
"""

Return valid JSON with exactly this structure:
{
  "summary": "2-3 sentence summary of the call",
  "qualityScore": <0-100 overall score>,
  "scores": {
    "opening": <0-100>,
    "needsDiscovery": <0-100>,
    "productKnowledge": <0-100>,
    "objectionHandling": <0-100>,
    "closingAttempt": <0-100>,
    "professionalism": <0-100>
  },
  "keyMoments": ["moment1", "moment2"],
  "improvements": ["coaching tip 1", "coaching tip 2", "coaching tip 3"],
  "competitorsMentioned": ["competitor names if any"],
  "sentimentOverall": "positive|neutral|negative",
  "leadInterestLevel": "high|medium|low|unknown"
}`;

  const response = await axios.post(
    `${OPENAI_BASE}/chat/completions`,
    {
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.3,
      max_tokens: 1200,
      response_format: { type: 'json_object' },
    },
    { headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' }, timeout: 120_000 }
  );

  const raw = response.data.choices?.[0]?.message?.content || '{}';
  try {
    return JSON.parse(raw);
  } catch {
    return { summary: raw.substring(0, 500) };
  }
}

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

/**
 * Main entry point: transcribes + analyses a recording.
 * Updates the DB record progressively.
 */
export async function processCallRecording(recordingId: string): Promise<void> {
  const recording = await SalesCallRecording.findById(recordingId).populate('leadId', 'name');
  if (!recording) throw new Error(`Recording ${recordingId} not found`);

  const localPath = path.join(process.cwd(), recording.audioUrl);
  if (!fs.existsSync(localPath)) {
    await SalesCallRecording.findByIdAndUpdate(recordingId, {
      status: 'failed',
      errorMessage: 'Audio file not found on disk',
    });
    return;
  }

  try {
    // Step 1 — transcription
    await SalesCallRecording.findByIdAndUpdate(recordingId, { status: 'processing', processingProgress: 10 });
    const { text, durationSeconds } = await transcribeAudio(localPath);

    await SalesCallRecording.findByIdAndUpdate(recordingId, { processingProgress: 60 });

    // Step 2 — GPT analysis
    const leadName = (recording.leadId as any)?.name || 'Lead';
    const gptResult = await analyzeCallWithGPT(text, leadName);

    const words = countWords(text);
    const wpm = durationSeconds && durationSeconds > 0 ? Math.round((words / durationSeconds) * 60) : 0;

    // Step 3 — save
    await SalesCallRecording.findByIdAndUpdate(recordingId, {
      status: 'processed',
      processingProgress: 100,
      durationSeconds,
      analysis: {
        transcript: text,
        summary: gptResult.summary || '',
        qualityScore: gptResult.qualityScore ?? 0,
        scores: {
          opening:           gptResult.scores?.opening ?? 0,
          needsDiscovery:    gptResult.scores?.needsDiscovery ?? 0,
          productKnowledge:  gptResult.scores?.productKnowledge ?? 0,
          objectionHandling: gptResult.scores?.objectionHandling ?? 0,
          closingAttempt:    gptResult.scores?.closingAttempt ?? 0,
          professionalism:   gptResult.scores?.professionalism ?? 0,
        },
        keyMoments:           gptResult.keyMoments ?? [],
        improvements:         gptResult.improvements ?? [],
        competitorsMentioned: gptResult.competitorsMentioned ?? [],
        sentimentOverall:     gptResult.sentimentOverall ?? 'neutral',
        leadInterestLevel:    gptResult.leadInterestLevel ?? 'unknown',
        callDurationSeconds:  durationSeconds ?? 0,
        wordsPerMinute:       wpm,
        processedAt:          new Date(),
        model:                process.env.OPENAI_MODEL || 'gpt-4o-mini',
      },
    });
  } catch (err: any) {
    await SalesCallRecording.findByIdAndUpdate(recordingId, {
      status: 'failed',
      errorMessage: err.message || 'Processing failed',
      processingProgress: 0,
    });
    console.error('[SALES-CALL] Processing error:', err.message);
  }
}
