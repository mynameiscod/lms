import * as settings from './settingsService';

/**
 * D-ID Streams proxy — keeps the D-ID API key server-side. The browser drives a
 * WebRTC peer connection; we relay the create/sdp/ice/talk/close calls.
 * Docs: https://docs.d-id.com/reference/talks-streams-overview
 */
const BASE = 'https://api.d-id.com';

export function didEnabled(tenantId?: string): boolean {
  return settings.getStr('INTERVIEW_AVATAR_PROVIDER', 'animated', tenantId) === 'did'
    && !!settings.getStr('DID_API_KEY', '', tenantId);
}

function authHeader(tenantId?: string): string {
  const key = settings.getStr('DID_API_KEY', '', tenantId).trim();
  if (/^(Basic|Bearer)\s/i.test(key)) return key;
  return `Basic ${key}`;
}

async function didFetch(tenantId: string, path: string, method: string, body?: any): Promise<{ status: number; data: any }> {
  const r = await fetch(`${BASE}${path}`, {
    method,
    headers: { Authorization: authHeader(tenantId), 'Content-Type': 'application/json', Accept: 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  let data: any = null;
  try { data = await r.json(); } catch { /* DELETE may return empty */ }
  return { status: r.status, data };
}

// Voice provider used by the talking head. Prefers ElevenLabs (if a voice id is
// set + linked in the D-ID account), else a natural Microsoft neural voice.
function ttsProvider(tenantId: string): any {
  const elevenVoice = settings.getStr('ELEVENLABS_VOICE_ID', '', tenantId);
  if (elevenVoice && settings.getStr('INTERVIEW_VOICE_PROVIDER', '', tenantId) === 'elevenlabs') {
    return { type: 'elevenlabs', voice_id: elevenVoice };
  }
  return { type: 'microsoft', voice_id: 'en-US-JennyNeural' };
}

export async function createStream(tenantId: string) {
  const sourceUrl = settings.getStr('INTERVIEW_AVATAR_IMAGE_URL', '', tenantId);
  if (!sourceUrl) throw new Error('Set an Interviewer Avatar Image URL in Platform Settings → AI Interview.');
  const { status, data } = await didFetch(tenantId, '/talks/streams', 'POST', { source_url: sourceUrl });
  if (status >= 400) throw new Error(data?.description || data?.message || `D-ID create failed (${status})`);
  return data; // { id, offer, ice_servers, session_id }
}

export async function sendSdp(tenantId: string, streamId: string, answer: any, sessionId: string) {
  const { status, data } = await didFetch(tenantId, `/talks/streams/${streamId}/sdp`, 'POST', { answer, session_id: sessionId });
  if (status >= 400) throw new Error(data?.description || `D-ID sdp failed (${status})`);
  return data;
}

export async function sendIce(tenantId: string, streamId: string, candidate: any, sessionId: string) {
  const { status, data } = await didFetch(tenantId, `/talks/streams/${streamId}/ice`, 'POST', { ...candidate, session_id: sessionId });
  if (status >= 400) throw new Error(data?.description || `D-ID ice failed (${status})`);
  return data;
}

export async function talk(tenantId: string, streamId: string, sessionId: string, text: string) {
  const { status, data } = await didFetch(tenantId, `/talks/streams/${streamId}`, 'POST', {
    script: { type: 'text', input: text.slice(0, 1500), provider: ttsProvider(tenantId) },
    config: { stitch: true },
    session_id: sessionId,
  });
  if (status >= 400) throw new Error(data?.description || `D-ID talk failed (${status})`);
  return data;
}

export async function closeStream(tenantId: string, streamId: string, sessionId: string) {
  await didFetch(tenantId, `/talks/streams/${streamId}`, 'DELETE', { session_id: sessionId });
}
