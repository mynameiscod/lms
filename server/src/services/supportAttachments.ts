import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import multer from 'multer';

/**
 * Ticket attachments: screenshots and PDFs, kept where nothing serves them.
 *
 * The same arrangement as placement cheques (services/placementAgreementService.ts): multer
 * writes to uploads/.private/tmp, which express.static ignores and app.ts refuses outright, and
 * the file is then moved into a folder per ticket under a random name. The only way back out is
 * the download route, which checks the caller may see the ticket AND the message the file is on.
 *
 * The declared type is not trusted: the first bytes must match it, so a script renamed to
 * shot.png is refused rather than stored.
 */
export const ATTACHMENT_LIMITS = { maxBytes: 5 * 1024 * 1024, maxFiles: 3 } as const;

const EXT: Record<string, 'jpg' | 'png' | 'webp' | 'pdf'> = {
  'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'application/pdf': 'pdf',
};

export const supportPrivateRoot = () => path.join(process.cwd(), 'uploads', '.private', 'support');
const tmpDir = () => path.join(process.cwd(), 'uploads', '.private', 'tmp');

/** True when the bytes are what the type claims. */
export function contentMatches(mime: string, head: Buffer): boolean {
  switch (mime) {
    case 'image/jpeg': return head.length >= 3 && head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff;
    case 'image/png': return head.length >= 8 && head.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
    case 'image/webp': return head.length >= 12 && head.subarray(0, 4).toString('latin1') === 'RIFF' && head.subarray(8, 12).toString('latin1') === 'WEBP';
    case 'application/pdf': return head.length >= 5 && head.subarray(0, 5).toString('latin1') === '%PDF-';
    default: return false;
  }
}

/** A display name with no path, no control characters, and a bounded length. */
export function cleanName(raw: string): string {
  const base = path.basename(String(raw || 'file')).replace(/[\u0000-\u001f\u007f<>:"/\\|?*]+/g, '_').trim();
  return (base || 'file').slice(0, 120);
}

export const supportUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => { try { fs.mkdirSync(tmpDir(), { recursive: true }); } catch { /* exists */ } cb(null, tmpDir()); },
    filename: (_req, _file, cb) => cb(null, crypto.randomBytes(16).toString('hex')),
  }),
  limits: { fileSize: ATTACHMENT_LIMITS.maxBytes, files: ATTACHMENT_LIMITS.maxFiles, fields: 20 },
  fileFilter: (req, file, cb) => {
    const ok = !!EXT[file.mimetype];
    if (!ok) (req as any).supportRejectedType = true;
    cb(null, ok);
  },
});

export interface StoredAttachment { name: string; mime: string; size: number; storedName: string }

const removeQuietly = (p: string) => fs.promises.unlink(p).catch(() => undefined);

/** Drops whatever multer wrote, for a request that failed before the files were kept. */
export async function discardUploads(files: Express.Multer.File[] | undefined) {
  await Promise.all((files || []).map(f => removeQuietly(f.path)));
}

/**
 * Checks each uploaded file's bytes and moves it into the ticket's folder. All or nothing: one
 * bad file and every file of the request is removed, so a half-attached message never exists.
 */
export async function keepUploads(ticketId: string, files: Express.Multer.File[] | undefined): Promise<StoredAttachment[] | { error: string }> {
  if (!files?.length) return [];
  for (const f of files) {
    const fd = await fs.promises.open(f.path, 'r');
    const head = Buffer.alloc(16);
    try { await fd.read(head, 0, 16, 0); } finally { await fd.close(); }
    if (!contentMatches(f.mimetype, head)) {
      await discardUploads(files);
      return { error: `"${cleanName(f.originalname)}" is not a real ${EXT[f.mimetype]?.toUpperCase() || 'image or PDF'} file.` };
    }
  }
  const dir = path.join(supportPrivateRoot(), ticketId);
  await fs.promises.mkdir(dir, { recursive: true });
  const kept: StoredAttachment[] = [];
  for (const f of files) {
    const storedName = `${crypto.randomBytes(16).toString('hex')}.${EXT[f.mimetype]}`;
    await fs.promises.rename(f.path, path.join(dir, storedName));
    kept.push({ name: cleanName(f.originalname), mime: f.mimetype, size: f.size, storedName });
  }
  return kept;
}

/** Removes files that were kept for a message that was then not saved. */
export async function removeKept(ticketId: string, kept: StoredAttachment[]) {
  await Promise.all(kept.map(k => { const p = attachmentPath(ticketId, k.storedName); return p ? removeQuietly(p) : undefined; }));
}

/** The file on disk for a stored attachment, or null if it is missing or the name is not ours. */
export function attachmentPath(ticketId: string, storedName: string): string | null {
  if (!/^[a-f0-9]{24}$/.test(ticketId) || !/^[a-f0-9]{32}\.(jpg|png|webp|pdf)$/.test(storedName)) return null;
  const p = path.join(supportPrivateRoot(), ticketId, storedName);
  return fs.existsSync(p) ? p : null;
}
