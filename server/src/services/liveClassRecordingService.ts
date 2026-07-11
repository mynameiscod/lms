/**
 * liveClassRecordingService — Phase 3.
 *
 *  A) importRecording()  — when 100ms says a recording is ready, tell Bunny Stream to
 *     pull the MP4 from the recording URL (no server bandwidth) and surface it in the
 *     Class Hub as a published LearningContentLibrary video.
 *  B) generateNotesFromTranscript() — when 100ms's Transcription add-on delivers a
 *     transcript, ask Claude for a summary + Q&A + practice questions and attach them
 *     to that Class Hub entry. Degrades gracefully if either is unavailable.
 */
import axios from 'axios';
import LiveClass from '../models/LiveClass';
import LearningContentLibrary from '../models/LearningContentLibrary';
import { getStr, isSet } from './settingsService';
import { aiComplete } from './aiGateway';
import { isAnthropicEnabled } from './aiClients';
import { getRecordingDownloadUrl } from './hmsService';

const BUNNY_API = 'https://video.bunnycdn.com';

// Ask Bunny to create a video object and pull the source URL into it.
async function bunnyPull(title: string, sourceUrl: string): Promise<{ videoId: string; libraryId: number; playUrl?: string } | null> {
  const libraryId = Number(getStr('BUNNY_STREAM_LIBRARY_ID', ''));
  const apiKey = getStr('BUNNY_STREAM_API_KEY', '');
  const cdn = getStr('BUNNY_STREAM_CDN_HOSTNAME', '');
  if (!libraryId || !apiKey) return null;

  const headers = { AccessKey: apiKey, 'Content-Type': 'application/json' };
  // 1) create the video object
  const created = await axios.post(`${BUNNY_API}/library/${libraryId}/videos`, { title: title.slice(0, 200) }, { headers, timeout: 20000 });
  const videoId = created.data?.guid;
  if (!videoId) return null;
  // 2) tell Bunny to fetch/pull the source (async on Bunny's side)
  try {
    await axios.post(`${BUNNY_API}/library/${libraryId}/videos/${videoId}/fetch`, { url: sourceUrl }, { headers, timeout: 20000 });
  } catch (e: any) {
    // eslint-disable-next-line no-console
    console.error('[liveClassRecording] Bunny fetch failed:', e.response?.status, e.response?.data || e.message);
  }
  const playUrl = cdn ? `https://${cdn}/${videoId}/playlist.m3u8` : undefined;
  return { videoId, libraryId, playUrl };
}

export async function importRecording(liveClassId: string, recordingUrl: string): Promise<void> {
  const lc = await LiveClass.findById(liveClassId);
  if (!lc || !recordingUrl) return;
  if (lc.recordingContentId) return; // already imported — idempotent

  // The webhook hands us a gs:// path that Bunny can't download — resolve a real
  // presigned HTTPS URL from 100ms whenever the URL isn't already an http(s) one.
  let downloadUrl = recordingUrl;
  if (!/^https?:\/\//i.test(downloadUrl) && lc.hmsRoomId) {
    try {
      const fresh = await getRecordingDownloadUrl(lc.hmsRoomId, String(lc.tenantId));
      if (fresh) downloadUrl = fresh;
    } catch { /* fall back to the raw value */ }
  }

  let videoSource: 'bunny' | 'upload' = 'upload';
  let bunnyVideoId: string | undefined;
  let bunnyLibraryId: number | undefined;
  let videoUrl = downloadUrl; // fallback: the presigned URL (time-limited)

  if (isSet('BUNNY_STREAM_API_KEY') && /^https?:\/\//i.test(downloadUrl)) {
    try {
      const b = await bunnyPull(`Live Class: ${lc.title}`, downloadUrl);
      if (b) {
        videoSource = 'bunny';
        bunnyVideoId = b.videoId;
        bunnyLibraryId = b.libraryId;
        if (b.playUrl) videoUrl = b.playUrl;
      }
    } catch {
      // fall back to raw url
    }
  }

  const content = await LearningContentLibrary.create({
    tenantId: String(lc.tenantId),
    title: `Live Class: ${lc.title}`,
    description: lc.description || `Recording of the live class held on ${new Date(lc.startedAt || lc.scheduledAt).toLocaleDateString('en-IN')}.`,
    type: 'video',
    videoSource,
    videoUrl,
    bunnyVideoId,
    bunnyLibraryId,
    videoDuration: lc.durationMin ? lc.durationMin * 60 : undefined,
    estimatedDuration: lc.durationMin || 0,
    topicTags: [],
    courseTags: [],
    completionThreshold: 0,
    isPublished: true,
    createdBy: String(lc.instructorId || lc.createdBy),
  });

  lc.recordingContentId = content._id as any;
  lc.recordingReady = true;
  await lc.save();
}

// ── Claude summary + Q&A + practice questions from a transcript ────────────────
interface AiNotes {
  summary?: string;
  notes?: string;
  qaItems?: { question: string; answer: string }[];
  practiceQuestions?: { type?: string; title: string; description?: string; options?: { text: string; isCorrect: boolean }[]; explanation?: string }[];
}

function extractJson(text: string): AiNotes | null {
  if (!text) return null;
  const m = text.match(/\{[\s\S]*\}/);
  if (!m) return null;
  try { return JSON.parse(m[0]); } catch { return null; }
}

export async function generateNotesFromTranscript(liveClassId: string, transcript: string): Promise<void> {
  const lc = await LiveClass.findById(liveClassId);
  if (!lc || !lc.recordingContentId) return;
  const clean = (transcript || '').trim();
  if (clean.length < 200 || !isAnthropicEnabled()) return; // not enough signal / no key

  const system =
    'You are a teaching assistant. Given a class transcript, produce concise, accurate study material. ' +
    'Respond with ONLY valid JSON, no prose, matching: ' +
    '{"summary": string (2-4 sentences), "notes": string (markdown bullet notes of key concepts), ' +
    '"qaItems": [{"question": string, "answer": string}] (5-8 items), ' +
    '"practiceQuestions": [{"type": "mcq"|"theory", "title": string, "description": string, ' +
    '"options": [{"text": string, "isCorrect": boolean}] (only for mcq, 4 options, exactly one correct), "explanation": string}] (3-5 items)}.';
  const user = `Class title: ${lc.title}\n\nTranscript:\n${clean.slice(0, 45000)}`;

  let raw = '';
  try {
    raw = await aiComplete({ tenantId: String(lc.tenantId), module: 'live_class_notes', prefer: 'anthropic', system, user, maxTokens: 3000 });
  } catch {
    return;
  }
  const parsed = extractJson(raw);
  if (!parsed) return;

  const qaItems = (parsed.qaItems || [])
    .filter(q => q && q.question && q.answer)
    .map((q, i) => ({ question: String(q.question), answer: String(q.answer), order: i }));

  const practiceQuestions = (parsed.practiceQuestions || [])
    .filter(p => p && p.title)
    .map(p => {
      const type = p.type === 'mcq' ? 'mcq' : 'theory';
      return {
        type,
        title: String(p.title),
        description: String(p.description || p.title),
        difficulty: 'medium' as const,
        options: type === 'mcq' ? (p.options || []).map(o => ({ text: String(o.text), isCorrect: !!o.isCorrect })) : undefined,
        explanation: p.explanation ? String(p.explanation) : undefined,
        marks: 1,
        gradingMode: (type === 'mcq' ? 'auto' : 'self') as 'auto' | 'self',
      };
    });

  const update: any = {};
  if (parsed.summary) update.description = String(parsed.summary);
  if (parsed.notes) { update.notesContent = String(parsed.notes); update.notesSource = 'richtext'; }
  if (qaItems.length) update.qaItems = qaItems;
  if (practiceQuestions.length) update.practiceQuestions = practiceQuestions;

  if (Object.keys(update).length) {
    await LearningContentLibrary.updateOne({ _id: lc.recordingContentId }, { $set: update });
  }
}

// Best-effort fetch of a transcript/summary text file from a URL the webhook gave us.
export async function fetchTranscriptText(url: string): Promise<string> {
  try {
    const res = await axios.get(url, { timeout: 20000, responseType: 'text', maxContentLength: 8 * 1024 * 1024 });
    const data = res.data;
    if (typeof data === 'string') {
      // if it's JSON (100ms transcript json), pull out spoken text; else return as-is
      try {
        const j = JSON.parse(data);
        if (Array.isArray(j)) return j.map((x: any) => x.text || x.transcript || '').join(' ');
        if (j.text) return String(j.text);
        if (Array.isArray(j.segments)) return j.segments.map((s: any) => s.text || '').join(' ');
      } catch { /* plain text (vtt/srt/txt) */ }
      return data;
    }
    return typeof data === 'object' ? JSON.stringify(data) : String(data || '');
  } catch {
    return '';
  }
}
