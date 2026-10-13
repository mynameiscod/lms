import FormData from 'form-data';
import axios from 'axios';
import OutperoCall from '../models/OutperoCall';
import Lead from '../models/Lead';
import * as settings from './settingsService';
import * as bunny from './bunnyStorageService';
import { aiComplete, recordUsage } from './aiGateway';
import { getPolicy, classifyOutcome } from './outperoPolicyService';
import { saveRecording } from './outperoCallService';

/**
 * What Outpero gives us about a call is one or two sentences and a link to the audio that stops
 * working after 24 hours. This keeps the audio (a copy in our own storage, retried until it
 * lands) and, for calls where someone actually spoke, listens to it: speech to text, then a short
 * structured write-up (what they want, when, objections, next step) that goes onto the lead.
 */

const MAX_AUDIO_BYTES = 24 * 1024 * 1024; // the speech-to-text service takes up to 25 MB
const HOUR = 3_600_000;
const MAX_ATTEMPTS = 6;

/** When a signed Outpero link stops working, or null when it is not a signed link. */
export function linkExpiry(url?: string): Date | null {
  try {
    const u = new URL(String(url));
    const d = u.searchParams.get('X-Amz-Date');
    const secs = Number(u.searchParams.get('X-Amz-Expires'));
    const m = d && d.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/);
    if (!m || !Number.isFinite(secs)) return null;
    return new Date(Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6]) + secs * 1000);
  } catch { return null; }
}

/** Can the Outpero link still be fetched? An unsigned link is assumed to last. */
export const linkIsLive = (url?: string, now = Date.now()) => {
  if (!url) return false;
  const exp = linkExpiry(url);
  return !exp || exp.getTime() - 60_000 > now;
};

/** The recording as bytes: from our own copy when we have one, otherwise from Outpero while its link is live. */
export async function audioOf(call: any): Promise<Buffer | null> {
  if (call.recordingKey && bunny.isBunnyStorageConfigured()) {
    const { stream } = await bunny.getFileStream(call.recordingKey);
    const chunks: Buffer[] = [];
    let n = 0;
    for await (const c of stream) { const b = Buffer.isBuffer(c) ? c : Buffer.from(c); n += b.length; if (n > MAX_AUDIO_BYTES) return null; chunks.push(b); }
    return Buffer.concat(chunks);
  }
  if (!call.recordingUrl || !/^https:\/\//i.test(call.recordingUrl) || !linkIsLive(call.recordingUrl)) return null;
  const r = await fetch(call.recordingUrl, { signal: AbortSignal.timeout(60_000) });
  if (!r.ok) throw new Error(`Outpero recording answered ${r.status}`);
  if (Number(r.headers.get('content-length') || 0) > MAX_AUDIO_BYTES) return null;
  const buf = Buffer.from(await r.arrayBuffer());
  return buf.length && buf.length <= MAX_AUDIO_BYTES ? buf : null;
}

// ── Keeping the recording ────────────────────────────────────────────────────

/**
 * Copy every recent recording we do not yet hold. The one-minute job calls this, so a recording
 * that failed to copy the first time (or arrived before storage was set up) is retried until its
 * link would expire.
 */
export async function rescueRecordings(limit = 8): Promise<number> {
  if (!bunny.isBunnyStorageConfigured()) return 0;
  const calls: any[] = await OutperoCall.find({
    recordingUrl: { $type: 'string', $ne: '' }, recordingKey: { $in: [null, ''] },
    createdAt: { $gte: new Date(Date.now() - 23 * HOUR) }, $or: [{ recordingAttempts: { $lt: MAX_ATTEMPTS } }, { recordingAttempts: { $exists: false } }],
  }).sort({ createdAt: 1 }).limit(limit).lean();
  let saved = 0;
  for (const c of calls) {
    if (!linkIsLive(c.recordingUrl)) { await OutperoCall.updateOne({ _id: c._id }, { $set: { recordingError: 'The Outpero link expired before it could be copied.', recordingAttempts: MAX_ATTEMPTS } }); continue; }
    if (await saveRecording(String(c.tenantId), c)) saved++;
  }
  return saved;
}

// ── Listening to the call ────────────────────────────────────────────────────

async function transcribe(tenantId: string, audio: Buffer): Promise<{ text: string; durationSec: number }> {
  const apiKey = settings.getStr('OPENAI_API_KEY', process.env.OPENAI_API_KEY || '');
  if (!apiKey) throw new Error('OPENAI_API_KEY is not configured (needed for speech-to-text).');
  const form = new FormData();
  form.append('file', audio, { filename: 'call.mp3', contentType: 'audio/mpeg' });
  form.append('model', 'whisper-1');
  form.append('response_format', 'verbose_json');
  const r = await axios.post('https://api.openai.com/v1/audio/transcriptions', form, {
    headers: { ...form.getHeaders(), Authorization: `Bearer ${apiKey}` }, maxContentLength: Infinity, maxBodyLength: Infinity, timeout: 240_000,
  });
  const durationSec = Math.round(r.data?.duration || 0);
  await recordUsage({ tenantId, module: 'outpero_call', provider: 'whisper', model: 'whisper-1', audioSeconds: durationSec }).catch(() => {});
  return { text: String(r.data?.text || '').trim(), durationSec };
}

export interface CallAnalysis {
  summary: string;
  intent: 'high' | 'medium' | 'low' | 'none';
  course?: string; background?: string; timing?: string; budget?: string;
  objections: string[]; nextStep?: string; callbackWhen?: string; language?: string;
}

const SYSTEM = 'You write short, accurate call notes for a software-training institute (CodeBegun) in India. An AI caller phoned a prospective student. Conversations may mix English, Telugu and Hindi: always write the notes in plain English. Use ONLY what is in the transcript: never guess, never invent a course, a fee or a promise. If the person barely spoke, say so. Output ONLY raw JSON.';

const stripJson = (s: string) => String(s || '').replace(/^```(?:json)?/i, '').replace(/```$/i, '').trim();
const text = (v: unknown, max = 400) => (typeof v === 'string' ? v.trim().slice(0, max) : undefined) || undefined;

export function parseAnalysis(raw: string): CallAnalysis | null {
  try {
    const j = JSON.parse(stripJson(raw));
    const summary = text(j.summary, 1200);
    if (!summary) return null;
    const intent = ['high', 'medium', 'low', 'none'].includes(j.intent) ? j.intent : 'low';
    return {
      summary, intent, course: text(j.course, 120), background: text(j.background, 300), timing: text(j.timing, 200), budget: text(j.budget, 200),
      objections: (Array.isArray(j.objections) ? j.objections : []).map((x: unknown) => text(x, 200)).filter(Boolean).slice(0, 6) as string[],
      nextStep: text(j.nextStep, 300), callbackWhen: text(j.callbackWhen, 120), language: text(j.language, 60),
    };
  } catch { return null; }
}

export async function summarise(tenantId: string, transcript: string, leadName?: string): Promise<CallAnalysis | null> {
  const user = `Lead: ${leadName || 'unknown'}\n\nTranscript:\n"""\n${transcript.slice(0, 14_000)}\n"""\n\nReturn JSON with exactly these keys:\n{"summary":"3-5 sentences: who they are, what they want, how the call went","intent":"high|medium|low|none (how likely they are to join)","course":"course they asked about, if any","background":"qualification, year, job status, if said","timing":"when they want to start or be called, if said","budget":"anything said about fees or money, if said","objections":["each concern or reason for hesitating"],"nextStep":"the single best next action for the counsellor","callbackWhen":"a callback time they asked for, if any","language":"language(s) spoken"}\nLeave a key out (or use an empty list) when the transcript does not say.`;
  const raw = await aiComplete({ tenantId, module: 'outpero_call', system: SYSTEM, user, maxTokens: 900 });
  return parseAnalysis(raw);
}

/** Is this call worth transcribing? Someone must have spoken: not a miss, a voicemail or a very short call. */
export function worthAnalysing(call: any): boolean {
  const outcome = classifyOutcome(call);
  if (outcome === 'no_answer' || outcome === 'wrong_number') return false;
  if (/voicemail|failed|busy|no.?answer/i.test(String(call.status || ''))) return false;
  if (typeof call.durationSec === 'number') return call.durationSec >= 20;
  return !!outcome;
}

/** Turn one call's recording into a transcript and a write-up, and put them on the lead. Idempotent. */
export async function analyseCall(callMongoId: any): Promise<'done' | 'skipped' | 'failed'> {
  const call: any = await OutperoCall.findById(callMongoId).lean();
  if (!call || call.analysis || !call.leadId) return 'skipped';
  const tenantId = String(call.tenantId);
  if (!getPolicy(tenantId).callAnalysis || !worthAnalysing(call)) return 'skipped';
  try {
    let transcript = String(call.transcript || '').trim();
    if (!transcript) {
      const audio = await audioOf(call);
      if (!audio) { await OutperoCall.updateOne({ _id: call._id }, { $set: { analysisError: 'No recording to listen to.' }, $inc: { analysisAttempts: 1 } }); return 'failed'; }
      transcript = (await transcribe(tenantId, audio)).text;
    }
    if (transcript.length < 15) {
      await OutperoCall.updateOne({ _id: call._id }, { $set: { analysis: { summary: 'Nothing was said that could be written down.', intent: 'none', objections: [] }, analysedAt: new Date(), ...(transcript ? { transcript } : {}) } });
      return 'skipped';
    }
    const lead: any = await Lead.findById(call.leadId).select('name createdBy aiSummary').lean();
    const a = await summarise(tenantId, transcript, lead?.name);
    if (!a) throw new Error('The summary could not be read.');
    await OutperoCall.updateOne({ _id: call._id }, { $set: { transcript, analysis: a, analysedAt: new Date() }, $unset: { analysisError: '' }, $addToSet: { actions: 'analysed' } });
    const insights = [a.intent !== 'none' ? `Interest: ${a.intent}` : '', a.course && `Course: ${a.course}`, a.background && `Background: ${a.background}`, a.timing && `Timing: ${a.timing}`, a.budget && `Money: ${a.budget}`, ...a.objections.map((o) => `Concern: ${o}`)].filter(Boolean) as string[];
    await Lead.updateOne({ _id: call.leadId, tenantId: call.tenantId, 'aiCallLogs.callSid': call.callId }, { $set: { 'aiCallLogs.$.transcript': transcript } });
    await Lead.updateOne({ _id: call.leadId, tenantId: call.tenantId, $or: [{ 'aiSummary.summary': { $exists: false } }, { 'aiSummary.generatedBy': 'outpero' }] },
      { $set: { aiSummary: { generatedAt: new Date(), summary: a.summary, keyInsights: insights, suggestedNextAction: a.nextStep || '', generatedBy: 'outpero' } } });
    await Lead.updateOne({ _id: call.leadId, tenantId: call.tenantId }, { $push: { activities: { type: 'note', createdBy: lead?.createdBy, createdAt: new Date(),
      description: `🤖 Call summary (from the recording): ${a.summary}${a.nextStep ? ` Next: ${a.nextStep}` : ''}`.slice(0, 2000) } } });
    return 'done';
  } catch (e: any) {
    console.error('[outpero-analysis]', e?.message);
    await OutperoCall.updateOne({ _id: call._id }, { $set: { analysisError: String(e?.message || 'failed').slice(0, 300) }, $inc: { analysisAttempts: 1 } });
    return 'failed';
  }
}

/** The one-minute job: listen to the next few answered calls that have not been written up. */
export async function processPendingAnalysis(limit = 3): Promise<number> {
  const calls: any[] = await OutperoCall.find({
    leadId: { $ne: null }, analysis: { $exists: false }, analysisSkipped: { $ne: true }, createdAt: { $gte: new Date(Date.now() - 22 * HOUR) },
    recordingUrl: { $type: 'string', $ne: '' }, $or: [{ analysisAttempts: { $lt: 3 } }, { analysisAttempts: { $exists: false } }],
    // Give Outpero's second delivery (the outcome) a moment to arrive.
    updatedAt: { $lte: new Date(Date.now() - 20_000) },
  }).sort({ createdAt: 1 }).limit(limit * 4).select('_id tenantId outcome status durationSec variables summary transcript').lean();
  let done = 0;
  for (const c of calls) {
    if (done >= limit) break;
    if (!getPolicy(String(c.tenantId)).callAnalysis) continue;
    // A miss, a voicemail or a very short call has nothing to write up: never look at it again.
    if (!worthAnalysing(c)) { await OutperoCall.updateOne({ _id: c._id }, { $set: { analysisSkipped: true } }); continue; }
    if ((await analyseCall(c._id)) === 'done') done++;
  }
  return done;
}

