import crypto from 'crypto';
import { Request, Response } from 'express';
import * as bunny from './bunnyStorageService';

/**
 * PDFs for WhatsApp template headers (brochures, fee sheets).
 *
 * Meta fetches a template's PDF from a public link at every send, so an uploaded PDF is kept in
 * our storage and served at a public, unguessable URL:
 *   /api/v1/public/wa-files/<tenantId>/<random>-<name>.pdf
 * These are files the institute sends to anyone who enquires — public by design.
 */
export const WA_FILE_MAX_BYTES = 30 * 1024 * 1024;
const NAME_RE = /^[a-f0-9]{16}-[a-zA-Z0-9._-]{1,100}\.pdf$/;

export class WaFileError extends Error {
  constructor(message: string, public status = 400) { super(message); }
}

const appBase = () => String(process.env.CLIENT_URL || process.env.FRONTEND_URL || 'https://platform.codebegun.com').replace(/\/+$/, '');

export async function storePdf(tenantId: string, file: { buffer: Buffer; originalname: string; size: number }) {
  if (!bunny.isBunnyStorageConfigured()) throw new WaFileError('File storage is not set up on this server — paste a public https link to the PDF instead.', 503);
  if (!file?.buffer?.length) throw new WaFileError('Choose a PDF file.');
  if (file.size > WA_FILE_MAX_BYTES) throw new WaFileError('The PDF must be under 30 MB.');
  if (file.buffer.subarray(0, 5).toString() !== '%PDF-') throw new WaFileError('That file is not a PDF.');
  const base = String(file.originalname || 'document.pdf').replace(/\.pdf$/i, '').replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80) || 'document';
  const name = `${crypto.randomBytes(8).toString('hex')}-${base}.pdf`;
  await bunny.uploadFile(`wa-template-files/${tenantId}/${name}`, file.buffer, 'application/pdf');
  return { url: `${appBase()}/api/v1/public/wa-files/${tenantId}/${name}`, fileName: `${base}.pdf`, size: file.size };
}

/** Public GET — Meta (and the person's phone preview) download the PDF from here. */
export async function servePdf(req: Request, res: Response) {
  const { tenantId, name } = req.params;
  if (!/^[a-f0-9]{24}$/.test(String(tenantId)) || !NAME_RE.test(String(name))) { res.status(404).end(); return; }
  try {
    const { stream, size } = await bunny.getFileStream(`wa-template-files/${tenantId}/${name}`);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${name.slice(17)}"`);
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    if (size) res.setHeader('Content-Length', String(size));
    stream.on('error', () => { if (!res.headersSent) res.status(404); res.end(); });
    stream.pipe(res);
  } catch {
    res.status(404).end();
  }
}
