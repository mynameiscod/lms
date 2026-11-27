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

// Stream a (potentially large, e.g. 1 GB) file to Bunny without buffering it in memory.
export async function uploadStream(remotePath: string, body: Readable, contentType: string, contentLength?: number): Promise<void> {
  if (!isBunnyStorageConfigured()) throw new Error('Bunny Storage is not configured (set the Storage Zone + AccessKey in Platform Settings).');
  const headers: any = { AccessKey: cfg().key, 'Content-Type': contentType || 'application/octet-stream' };
  if (contentLength != null) headers['Content-Length'] = String(contentLength);
  const r = await fetch(baseUrl(remotePath), { method: 'PUT', headers, body: body as any, duplex: 'half' } as any);
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

/**
 * Send a Bunny file to the browser WITH byte ranges, for anything played in a <video>/<audio>.
 *
 * getFileStream always fetches the whole file and the response says nothing about ranges, so the
 * browser treats the video as unseekable: in production (where uploads live on Bunny) the player's
 * -10s/+10s, dragging the bar and picking up where you left off all did nothing, while on a
 * developer's disk (local files, ranges served) they worked. Here the browser's Range header goes
 * to Bunny and Bunny's 206 / Content-Range / Accept-Ranges come back. The upstream download is
 * cancelled when the browser drops the request, which it does constantly while seeking.
 */
export async function sendFileWithRanges(
  req: { headers: Record<string, any> },
  res: any,
  remotePath: string,
  contentType?: string,
): Promise<void> {
  if (!isBunnyStorageConfigured()) throw new Error('Bunny Storage is not configured.');
  const range = typeof req.headers.range === 'string' ? req.headers.range : undefined;
  const abort = new AbortController();
  res.on?.('close', () => abort.abort());
  const r = await fetch(baseUrl(remotePath), {
    headers: { AccessKey: cfg().key, ...(range ? { Range: range } : {}) },
    signal: abort.signal,
  });
  if (r.status === 416) {
    const cr = r.headers.get('content-range');
    if (cr) res.setHeader('Content-Range', cr);
    res.status(416).end();
    return;
  }
  if (!r.ok || !r.body) throw new Error(`Bunny download failed (${r.status}).`);

  /* Bunny answered the whole file to a range request: cut the range out here, so seeking still
     works (at the cost of reading from the start of the file up to the range). */
  const total = Number(r.headers.get('content-length'));
  const m = range && r.status === 200 && Number.isFinite(total) && total > 0 ? /^bytes=(\d*)-(\d*)$/.exec(range.trim()) : null;
  if (m && (m[1] || m[2])) {
    let start = m[1] ? Number(m[1]) : Math.max(0, total - Number(m[2]));
    let end = m[1] && m[2] ? Math.min(Number(m[2]), total - 1) : total - 1;
    if (start >= total || start > end) { abort.abort(); res.setHeader('Content-Range', `bytes */${total}`); res.status(416).end(); return; }
    res.setHeader('Content-Range', `bytes ${start}-${end}/${total}`);
    res.setHeader('Content-Length', String(end - start + 1));
    res.setHeader('Accept-Ranges', 'bytes');
    if (contentType) res.setHeader('Content-Type', contentType);
    res.status(206);
    let pos = 0;
    const src = Readable.fromWeb(r.body as any);
    src.on('data', (chunk: Buffer) => {
      const from = Math.max(start - pos, 0);
      const to = Math.min(end - pos + 1, chunk.length);
      pos += chunk.length;
      if (to > from) res.write(chunk.subarray(from, to));
      if (pos > end) { src.destroy(); abort.abort(); res.end(); }
    });
    src.on('end', () => res.end());
    src.on('error', () => { try { res.end(); } catch { /* already closed */ } });
    return;
  }

  for (const h of ['content-length', 'content-range', 'accept-ranges', 'last-modified', 'etag']) {
    const v = r.headers.get(h);
    if (v) res.setHeader(h, v);
  }
  if (r.status === 206 && !r.headers.get('accept-ranges')) res.setHeader('Accept-Ranges', 'bytes');
  if (contentType) res.setHeader('Content-Type', contentType);
  res.status(r.status);
  const stream = Readable.fromWeb(r.body as any);
  stream.on('error', () => { try { res.end(); } catch { /* already closed */ } });
  stream.pipe(res);
}
