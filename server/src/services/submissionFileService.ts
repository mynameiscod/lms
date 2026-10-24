import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import * as bunny from './bunnyStorageService';

/**
 * Files a student hands in for a FILE_UPLOAD assignment.
 *
 * The workspace showed a "Choose files" picker with nothing behind it, so a file-upload assignment
 * could never be submitted — and a roadmap day holding one stayed one task short for good. Files are
 * stored the way the rest of the platform stores uploads: on Bunny when it is configured (production),
 * otherwise on this server's disk. The submission keeps only the reference.
 */

export const MAX_FILE_BYTES = 25 * 1024 * 1024;
export const MAX_FILES = 10;
/** What a student may hand in: documents, archives, images and source code. Never executables. */
const ALLOWED = new Set([
  '.pdf', '.doc', '.docx', '.ppt', '.pptx', '.xls', '.xlsx', '.csv', '.txt', '.md', '.rtf', '.odt',
  '.zip', '.rar', '.7z', '.tar', '.gz',
  '.png', '.jpg', '.jpeg', '.gif', '.webp',
  '.py', '.java', '.js', '.ts', '.jsx', '.tsx', '.c', '.cpp', '.h', '.cs', '.go', '.rb', '.php', '.sql', '.html', '.css', '.json', '.xml', '.ipynb', '.kt', '.swift',
]);

const LOCAL_ROOT = path.join(process.cwd(), 'uploads', 'assignment-submissions');

export function fileProblem(name: string, size: number): string | null {
  const ext = path.extname(name).toLowerCase();
  if (!ALLOWED.has(ext)) return `${name}: that kind of file cannot be handed in. Use a document, an image, a zip or source code.`;
  if (size > MAX_FILE_BYTES) return `${name} is larger than ${MAX_FILE_BYTES / 1024 / 1024} MB.`;
  return null;
}

/** Store one file; returns the reference kept on the submission. */
export async function storeSubmissionFile(
  tenantId: string, submissionId: string, file: { originalname: string; mimetype: string; size: number; buffer: Buffer },
): Promise<{ filename: string; originalName: string; mimeType: string; size: number; path: string; uploadedAt: Date }> {
  const ext = path.extname(file.originalname).toLowerCase();
  const filename = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${ext}`;
  const key = `assignment-submissions/${tenantId}/${submissionId}/${filename}`;
  if (bunny.isBunnyStorageConfigured()) {
    await bunny.uploadFile(key, file.buffer, file.mimetype || 'application/octet-stream');
  } else {
    const dir = path.join(LOCAL_ROOT, tenantId, submissionId);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, filename), file.buffer);
  }
  return {
    filename,
    originalName: file.originalname.slice(0, 200),
    mimeType: file.mimetype || 'application/octet-stream',
    size: file.size,
    path: key,
    uploadedAt: new Date(),
  };
}

/** Send a stored file to the browser (download), from Bunny or local disk. */
export async function sendSubmissionFile(
  req: any, res: any, stored: { path: string; originalName: string; mimeType: string },
): Promise<void> {
  res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(stored.originalName)}"`);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  const local = path.join(process.cwd(), 'uploads', stored.path);
  if (fs.existsSync(local)) {
    res.setHeader('Content-Type', stored.mimeType || 'application/octet-stream');
    fs.createReadStream(local).pipe(res);
    return;
  }
  if (bunny.isBunnyStorageConfigured()) {
    await bunny.sendFileWithRanges(req, res, stored.path, stored.mimeType || 'application/octet-stream');
    return;
  }
  res.status(404).json({ message: 'That file is no longer available.' });
}

/** Remove a stored file (best effort) when a student takes it back before submitting. */
export async function removeSubmissionFile(stored: { path: string }): Promise<void> {
  const local = path.join(process.cwd(), 'uploads', stored.path);
  try { if (fs.existsSync(local)) fs.unlinkSync(local); } catch { /* already gone */ }
  if (bunny.isBunnyStorageConfigured()) await bunny.deleteFile(stored.path);
}
