/**
 * Images for web assignments (mockups and the files a student must use). Every upload is re-encoded
 * with sharp to a WebP no larger than 2000 px on its long side, transparency kept, never enlarged —
 * so an SVG or a huge photo can neither run script from our origin nor bloat a student's page.
 * Stored on Bunny when it is set up, else on disk.
 */
import fs from 'fs';
import path from 'path';
import { Readable } from 'stream';
import sharp from 'sharp';
import mongoose from 'mongoose';
import * as bunny from '../bunnyStorageService';
import AssignmentAsset from '../../models/AssignmentAsset';

export const MAX_ASSET_BYTES = 8 * 1024 * 1024;
export class AssetError extends Error { constructor(message: string, public status = 400) { super(message); } }
const localRoot = () => path.join(process.cwd(), 'uploads', 'assignment-assets');

/** The path the browser asks for, under the API base (/api/v1). */
export const assetPath = (tenantId: string, id: string) => `/public/assignment-assets/${tenantId}/${id}.webp`;

export async function saveAsset(tenantId: string, input: Buffer, originalName: string, uploadedBy?: string) {
  if (!input?.length) throw new AssetError('Choose an image to upload.');
  if (input.length > MAX_ASSET_BYTES) throw new AssetError('The image is larger than 8 MB.');
  let out: { data: Buffer; info: sharp.OutputInfo };
  try {
    out = await sharp(input, { failOn: 'error', limitInputPixels: 60_000_000 }).rotate()
      .resize(2000, 2000, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 85, alphaQuality: 100 })
      .toBuffer({ resolveWithObject: true });
  } catch {
    throw new AssetError('That file is not an image we can use. Upload a JPG, PNG, WebP, GIF or SVG.');
  }
  const id = new mongoose.Types.ObjectId();
  const rel = `assignment-assets/${tenantId}/${id}.webp`;
  let storage: 'bunny' | 'local' = 'local';
  if (bunny.isBunnyStorageConfigured()) {
    await bunny.uploadFile(rel, out.data, 'image/webp');
    storage = 'bunny';
  } else {
    const dir = path.join(localRoot(), tenantId);
    await fs.promises.mkdir(dir, { recursive: true });
    await fs.promises.writeFile(path.join(dir, `${id}.webp`), out.data);
  }
  const row = await AssignmentAsset.create({
    _id: id, tenantId, storage, path: rel, contentType: 'image/webp', originalName: String(originalName || '').slice(0, 200),
    width: out.info.width, height: out.info.height, bytes: out.data.length,
    uploadedBy: uploadedBy && mongoose.isValidObjectId(uploadedBy) ? uploadedBy : undefined,
  });
  return { id: String(row._id), path: assetPath(tenantId, String(row._id)), width: row.width, height: row.height, name: row.originalName };
}

export async function openAsset(tenantId: string, id: string): Promise<{ stream: Readable; contentType: string } | null> {
  if (!mongoose.isValidObjectId(id)) return null;
  const m: any = await AssignmentAsset.findOne({ _id: id, tenantId }).lean();
  if (!m) return null;
  if (m.storage === 'bunny') {
    const f = await bunny.getFileStream(m.path);
    return { stream: f.stream, contentType: m.contentType || 'image/webp' };
  }
  const file = path.join(localRoot(), tenantId, `${id}.webp`);
  if (!fs.existsSync(file)) return null;
  return { stream: fs.createReadStream(file), contentType: m.contentType || 'image/webp' };
}
