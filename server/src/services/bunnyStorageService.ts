import { Readable } from 'stream';
import * as settings from './settingsService';

/**
 * bunnyStorageService — thin wrapper over Bunny Edge Storage (Object Storage)
 * for the Resource Library (project ZIPs / docs). Files are uploaded/deleted via
 * the Storage API (AccessKey header) and streamed back through a gated app endpoint
 * so access control + audit always apply. Config comes from Platform Settings.
 */

const cfg = () => ({
  zone: settings.getStr('BUNNY_STORAGE_ZONE', ''),
  key: settings.getStr('BUNNY_STORAGE_ACCESSKEY', ''),
  host: settings.getStr('BUNNY_STORAGE_HOSTNAME', 'storage.bunnycdn.com') || 'storage.bunnycdn.com',
});

export const isBunnyStorageConfigured = (): boolean => {
  const c = cfg();
  return !!(c.zone && c.key);
};

const baseUrl = (remotePath: string) => {
  const c = cfg();
  const path = remotePath.replace(/^\/+/, '');
  return `https://${c.host}/${c.zone}/${path}`;
};

export async function uploadFile(remotePath: string, body: Buffer, contentType = 'application/octet-stream'): Promise<void> {
  if (!isBunnyStorageConfigured()) throw new Error('Bunny Storage is not configured (set the Storage Zone + AccessKey in Platform Settings).');
  const r = await fetch(baseUrl(remotePath), {
    method: 'PUT',
    headers: { AccessKey: cfg().key, 'Content-Type': contentType },
    body,
  });
  if (!r.ok) throw new Error(`Bunny upload failed (${r.status}): ${await r.text().catch(() => '')}`);
}

export async function deleteFile(remotePath: string): Promise<void> {
  if (!isBunnyStorageConfigured()) return;
  try {
    await fetch(baseUrl(remotePath), { method: 'DELETE', headers: { AccessKey: cfg().key } });
  } catch { /* best-effort */ }
}

/** Fetch a file from Bunny and return a Node Readable stream to pipe to the client. */
export async function getFileStream(remotePath: string): Promise<{ stream: Readable; size: number | null }> {
  if (!isBunnyStorageConfigured()) throw new Error('Bunny Storage is not configured.');
  const r = await fetch(baseUrl(remotePath), { headers: { AccessKey: cfg().key } });
  if (!r.ok || !r.body) throw new Error(`Bunny download failed (${r.status}).`);
  const len = r.headers.get('content-length');
  return { stream: Readable.fromWeb(r.body as any), size: len ? Number(len) : null };
}
