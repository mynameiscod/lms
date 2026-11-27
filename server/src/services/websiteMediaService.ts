/**
 * Website images (2026-11-27): student photos and company logos for the public website.
 *
 * Every upload is re-encoded with sharp, so the website always gets a small WebP of one shape:
 *   photo — 480×480 square, cropped around the most interesting part (usually the face)
 *   logo  — fitted inside 400×160, transparent background kept, never enlarged
 *   thumb — 960×540 (16:9), for video stills and event images
 * One odd photo can never break the row of cards. Stored on Bunny when it is set up, else on disk,
 * and served publicly (they are shown on the open website) by GET /public/:slug/media/:id.webp.
 */
import fs from 'fs';
import path from 'path';
import { Readable } from 'stream';
import sharp from 'sharp';
import mongoose from 'mongoose';
import * as bunny from './bunnyStorageService';
import { WebsiteMedia, WebsiteMediaKind } from '../models/WebsiteContent';

export class WebsiteContentError extends Error {
  constructor(message: string, public status = 400) { super(message); }
}

export const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const localRoot = () => path.join(process.cwd(), 'uploads', 'website-media');

async function encode(kind: WebsiteMediaKind, input: Buffer) {
  try {
    const img = sharp(input, { failOn: 'error', limitInputPixels: 40_000_000 }).rotate();
    const out = kind === 'photo'
      ? img.resize(480, 480, { fit: 'cover', position: sharp.strategy.attention }).webp({ quality: 82 })
      : kind === 'thumb'
        ? img.resize(960, 540, { fit: 'cover', position: sharp.strategy.attention }).webp({ quality: 80 })
        : img.resize(400, 160, { fit: 'inside', withoutEnlargement: true }).webp({ quality: 90, alphaQuality: 100 });
    return await out.toBuffer({ resolveWithObject: true });
  } catch {
    throw new WebsiteContentError('That file is not an image we can use. Upload a JPG, PNG, WebP or SVG.');
  }
}

/** Re-encode and store one image. Returns the saved media row. */
export async function saveImage(tenantId: string, kind: WebsiteMediaKind, input: Buffer, uploadedBy?: string) {
  if (!['photo', 'logo', 'thumb'].includes(kind)) throw new WebsiteContentError('Unknown image kind.');
  if (!input?.length) throw new WebsiteContentError('Choose an image to upload.');
  if (input.length > MAX_IMAGE_BYTES) throw new WebsiteContentError('The image is larger than 8 MB.');
  const { data, info } = await encode(kind, input);
  const id = new mongoose.Types.ObjectId();
  const rel = `website-media/${tenantId}/${id}.webp`;
  let storage: 'bunny' | 'local' = 'local';
  if (bunny.isBunnyStorageConfigured()) {
    await bunny.uploadFile(rel, data, 'image/webp');
    storage = 'bunny';
  } else {
    const dir = path.join(localRoot(), tenantId);
    await fs.promises.mkdir(dir, { recursive: true });
    await fs.promises.writeFile(path.join(dir, `${id}.webp`), data);
  }
  return WebsiteMedia.create({
    _id: id, tenantId, kind, storage, path: rel, contentType: 'image/webp',
    width: info.width, height: info.height, bytes: data.length,
    uploadedBy: uploadedBy && mongoose.isValidObjectId(uploadedBy) ? uploadedBy : undefined,
  });
}

/** The stored bytes of one image of this institute, or null. */
export async function openImage(tenantId: string, id: string): Promise<{ stream: Readable; contentType: string } | null> {
  if (!mongoose.isValidObjectId(id)) return null;
  const m: any = await WebsiteMedia.findOne({ _id: id, tenantId }).lean();
  if (!m) return null;
  if (m.storage === 'bunny') {
    const f = await bunny.getFileStream(m.path);
    return { stream: f.stream, contentType: m.contentType || 'image/webp' };
  }
  const file = path.join(localRoot(), tenantId, `${id}.webp`);
  if (!fs.existsSync(file)) return null;
  return { stream: fs.createReadStream(file), contentType: m.contentType || 'image/webp' };
}

/** Is this an image of this institute, of this kind? Used before linking one to a card. */
export async function ownsImage(tenantId: string, id: unknown, kind: WebsiteMediaKind): Promise<boolean> {
  if (!id || !mongoose.isValidObjectId(String(id))) return false;
  return !!(await WebsiteMedia.exists({ _id: String(id), tenantId, kind }));
}
