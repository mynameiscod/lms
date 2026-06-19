import * as settings from './settingsService';

/**
 * ElevenLabs text-to-speech. Returns an MP3 Buffer for the configured voice, or
 * null when not configured / on error so the caller falls back to browser TTS.
 */
export function elevenLabsEnabled(tenantId?: string): boolean {
  return settings.getStr('INTERVIEW_VOICE_PROVIDER', 'browser', tenantId) === 'elevenlabs'
    && !!settings.getStr('ELEVENLABS_API_KEY', '', tenantId);
}

export async function synthesizeSpeech(text: string, tenantId?: string): Promise<Buffer | null> {
  const apiKey = settings.getStr('ELEVENLABS_API_KEY', '', tenantId);
  const voiceId = settings.getStr('ELEVENLABS_VOICE_ID', '', tenantId) || 'EXAVITQu4vr4xnSDxMaL'; // default warm voice
  if (!apiKey || !text.trim()) return null;
  try {
    const r = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}`, {
      method: 'POST',
      headers: { 'xi-api-key': apiKey, 'Content-Type': 'application/json', Accept: 'audio/mpeg' },
      body: JSON.stringify({
        text: text.slice(0, 1500),
        model_id: 'eleven_turbo_v2_5',   // low-latency, good for live conversation
        voice_settings: { stability: 0.4, similarity_boost: 0.8, style: 0.2, use_speaker_boost: true },
      }),
    });
    if (!r.ok) {
      console.error('[ElevenLabs] TTS failed:', r.status, (await r.text()).slice(0, 200));
      return null;
    }
    return Buffer.from(await r.arrayBuffer());
  } catch (e: any) {
    console.error('[ElevenLabs] TTS error:', e?.message);
    return null;
  }
}
