import fs from 'fs';
import FormData from 'form-data';
import axios from 'axios';
import { getAnthropic, getOpenAI, isAnthropicEnabled } from './aiClients';
import * as settings from './settingsService';
import { recordUsage } from './aiGateway';

/**
 * speakingService — occurrence scheduling, Whisper transcription and AI evaluation
 * for the recurring speaking-practice tasks.
 */

const DAY_KEYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

// Compute the task's due occurrences (as YYYY-MM-DD) from `days`, over a window of
// the last ~10 days through the next ~7 days, bounded by the task's start/end.
export function computeOccurrences(task: { days: string[]; startDate?: Date | string; endDate?: Date | string }): { date: string; overdue: boolean }[] {
  const days = new Set((task.days || []).map((d) => d.toLowerCase().slice(0, 3)));
  const start = task.startDate ? new Date(task.startDate) : null;
  const end = task.endDate ? new Date(task.endDate) : null;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const out: { date: string; overdue: boolean }[] = [];
  for (let offset = -10; offset <= 7; offset++) {
    const d = new Date(today); d.setDate(today.getDate() + offset);
    if (!days.has(DAY_KEYS[d.getDay()].toLowerCase())) continue;
    if (start && d < new Date(new Date(start).setHours(0, 0, 0, 0))) continue;
    if (end && d > new Date(new Date(end).setHours(23, 59, 59, 999))) continue;
    out.push({ date: ymd(d), overdue: d < today });
  }
  return out;
}

// The prompt for a given occurrence — rotates through `topics` one per week if set.
export function promptForOccurrence(task: { prompt: string; topics?: string[]; startDate?: Date | string; createdAt?: Date | string }, dateStr: string): string {
  const topics = (task.topics || []).filter(Boolean);
  if (!topics.length) return task.prompt;
  const startBase = task.startDate || task.createdAt || new Date();
  const start = new Date(new Date(startBase).setHours(0, 0, 0, 0)).getTime();
  const d = new Date(`${dateStr}T00:00:00`).getTime();
  const weeks = Math.max(0, Math.floor((d - start) / (7 * 86400000)));
  return topics[weeks % topics.length] || task.prompt;
}

// Monday-anchored ISO-ish week key (YYYY-Www) for streak/leaderboard grouping.
export function weekKey(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00`);
  const day = (d.getDay() + 6) % 7; // Mon=0
  const monday = new Date(d); monday.setDate(d.getDate() - day);
  const y = monday.getFullYear();
  const firstJan = new Date(y, 0, 1);
  const wk = Math.ceil(((monday.getTime() - firstJan.getTime()) / 86400000 + firstJan.getDay() + 1) / 7);
  return `${y}-W${String(wk).padStart(2, '0')}`;
}

// Transcribe a recorded file (audio or video/webm) via OpenAI Whisper.
export async function transcribeFile(filePath: string, tenantId?: string, module = 'whisper'): Promise<{ text: string; durationSec: number }> {
  const apiKey = settings.getStr('OPENAI_API_KEY', process.env.OPENAI_API_KEY || '');
  if (!apiKey) throw new Error('OPENAI_API_KEY is not configured (needed for speech-to-text).');
  const form = new FormData();
  form.append('file', fs.createReadStream(filePath));
  form.append('model', 'whisper-1');
  form.append('response_format', 'verbose_json');
  const r = await axios.post('https://api.openai.com/v1/audio/transcriptions', form, {
    headers: { ...form.getHeaders(), Authorization: `Bearer ${apiKey}` },
    maxContentLength: Infinity, maxBodyLength: Infinity, timeout: 300_000,
  });
  const durationSec = Math.round(r.data?.duration || 0);
  await recordUsage({ tenantId, module, provider: 'whisper', model: 'whisper-1', audioSeconds: durationSec });
  return { text: r.data?.text || '', durationSec };
}

const stripJson = (s: string) => (s || '').replace(/^```(?:json)?/i, '').replace(/```$/i, '').trim();

// Evaluate a spoken answer's transcript for a given topic → per-dimension scores + feedback.
export async function evaluateSpeaking(topic: string, transcript: string, durationSec: number): Promise<any> {
  const sys = 'You are a warm but honest communication coach evaluating a student\'s spoken practice answer (transcribed from audio/video). Output ONLY raw JSON.';
  const usr = `Topic the student was asked to speak on: "${topic}"
Spoken length: ~${durationSec}s.

Transcript of what they said:
"""${(transcript || '').slice(0, 4000)}"""

Score each 0-100 and give specific, encouraging, actionable feedback grounded in what they actually said.
Return JSON exactly:
{"overall":<0-100>,"fluency":<0-100>,"clarity":<0-100>,"structure":<0-100>,"confidence":<0-100>,"vocabulary":<0-100>,"summary":"<2-3 sentence overall assessment>","strengths":["<what they did well>"],"improvements":["<specific things to work on for next time>"]}`;

  let parsed: any = {};
  try {
    if (isAnthropicEnabled()) {
      const anth = getAnthropic();
      if (anth) {
        const model = settings.getStr('INTERVIEW_AI_MODEL', 'claude-sonnet-4-6');
        const r: any = await anth.messages.create({ model, max_tokens: 1200, system: sys, messages: [{ role: 'user', content: usr }] });
        parsed = JSON.parse(stripJson((r.content || []).map((b: any) => (b.type === 'text' ? b.text : '')).join('')));
      }
    }
    if (!parsed.overall) {
      const openai = getOpenAI();
      if (openai) {
        const model = settings.getStr('OPENAI_MODEL', 'gpt-4o-mini');
        const r = await openai.chat.completions.create({ model, max_tokens: 1200, messages: [{ role: 'system', content: sys }, { role: 'user', content: usr }] });
        parsed = JSON.parse(stripJson(r.choices?.[0]?.message?.content || '{}'));
      }
    }
  } catch { parsed = {}; }

  const clamp = (n: any) => Math.max(0, Math.min(100, Math.round(Number(n) || 0)));
  const arr = (v: any) => (Array.isArray(v) ? v.filter((x) => typeof x === 'string' && x.trim()).slice(0, 6) : []);
  return {
    score: {
      overall: clamp(parsed.overall), fluency: clamp(parsed.fluency), clarity: clamp(parsed.clarity),
      structure: clamp(parsed.structure), confidence: clamp(parsed.confidence), vocabulary: clamp(parsed.vocabulary),
    },
    feedback: {
      summary: typeof parsed.summary === 'string' ? parsed.summary : 'Keep practising — consistency is what builds fluent, confident speaking.',
      strengths: arr(parsed.strengths),
      improvements: arr(parsed.improvements),
    },
  };
}
