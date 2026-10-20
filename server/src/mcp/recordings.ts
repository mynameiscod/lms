import { McpError } from './oauthPolicy';

export const MAX_RECORDING_BYTES = 8 * 1024 * 1024;
let activeDownloads = 0;

type Storage = { tenantId: string; hostname: string; zone: string; readOnlyKey: string };
function storage(): Storage | null {
  try {
    const c = JSON.parse(process.env.MCP_RECORDING_STORAGE || 'null');
    if (!c || !/^[a-f0-9]{24}$/.test(c.tenantId) ||
      !/^(?:[a-z]{2,3}\.)?storage\.bunnycdn\.com$/.test(c.hostname) ||
      !/^[a-zA-Z0-9_-]{1,100}$/.test(c.zone) || typeof c.readOnlyKey !== 'string' ||
      c.readOnlyKey.length < 16 || c.readOnlyKey.length > 512 || /[\r\n]/.test(c.readOnlyKey)) return null;
    return c;
  } catch { return null; }
}
export const recordingStorageConfigured = (tenantId: string) => storage()?.tenantId === tenantId;

// Only this trusted class can bypass the ordinary 128 KiB text-result cap.
export class McpAudioResult {
  constructor(private bytes: Buffer, private mimeType: string, private recordId: string) {
    if (!bytes.length || bytes.length > MAX_RECORDING_BYTES) throw new McpError('recording_too_large', 400);
  }
  toResult() {
    return { content: [
      { type: 'text', text: JSON.stringify({ recordId: this.recordId, source: 'stored_recording', untrustedContent: true }) },
      { type: 'audio', data: this.bytes.toString('base64'), mimeType: this.mimeType },
    ] };
  }
}

function audioType(b: Buffer): string {
  if (b.subarray(0, 3).toString() === 'ID3' || (b.length > 1 && b[0] === 0xff && (b[1] & 0xe0) === 0xe0)) return 'audio/mpeg';
  if (b.subarray(0, 4).toString() === 'RIFF' && b.subarray(8, 12).toString() === 'WAVE') return 'audio/wav';
  if (b.subarray(0, 4).toString() === 'OggS') return 'audio/ogg';
  if (b.subarray(0, 4).toString() === 'fLaC') return 'audio/flac';
  throw new McpError('unsupported_recording_format', 400);
}

/** Caller must first resolve the record through the tenant + active-lead ownership query. */
export async function readRecordingAudio(tenantId: string, call: { _id: any; callId: string; recordingKey?: string }) {
  if (!/^[a-f0-9]{24}$/.test(tenantId) || typeof call.callId !== 'string' ||
      !/^[a-zA-Z0-9_-]{1,200}$/.test(call.callId)) throw new McpError('recording_not_found', 404);
  const expected = `outpero-recordings/${tenantId}/${call.callId}`;
  if (!call.recordingKey || call.recordingKey !== expected) throw new McpError('recording_not_found', 404);
  const c = storage();
  if (!c || c.tenantId !== tenantId) throw new McpError('recording_storage_not_configured', 503);
  if (activeDownloads >= 2) throw new McpError('recording_busy', 429);
  activeDownloads++;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 30000);
  try {
    // No webhook URL, arbitrary storage path, redirects, provider settings DB access or write credential.
    const r = await fetch(`https://${c.hostname}/${c.zone}/${expected}`, {
      method: 'GET', headers: { AccessKey: c.readOnlyKey }, redirect: 'error', signal: controller.signal,
    });
    if (!r.ok || !r.body) {
      await r.body?.cancel();
      throw new McpError(r.status === 404 ? 'recording_not_found' : 'recording_unavailable', r.status === 404 ? 404 : 503);
    }
    if (Number(r.headers.get('content-length')) > MAX_RECORDING_BYTES) {
      await r.body.cancel();
      throw new McpError('recording_too_large', 400);
    }
    const reader = r.body.getReader();
    const chunks: Buffer[] = [];
    let size = 0;
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.length;
        if (size > MAX_RECORDING_BYTES) throw new McpError('recording_too_large', 400);
        chunks.push(Buffer.from(value));
      }
    } finally { await reader.cancel().catch(() => {}); reader.releaseLock(); }
    const bytes = Buffer.concat(chunks);
    if (!bytes.length) throw new McpError('recording_not_found', 404);
    return new McpAudioResult(bytes, audioType(bytes), String(call._id));
  } catch (error) {
    if (error instanceof McpError) throw error;
    throw new McpError('recording_unavailable', 503); // Never log provider URLs, response bodies or keys.
  } finally { clearTimeout(timer); controller.abort(); activeDownloads--; }
}
