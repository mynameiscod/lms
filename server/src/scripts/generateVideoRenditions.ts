/**
 * Makes the quality versions (360p–1080p) for videos uploaded BEFORE automatic conversion existed.
 * New uploads are converted on their own (videoRenditionService); run this once per environment.
 *
 *   node dist/scripts/generateVideoRenditions.js            (production container)
 *   npx ts-node src/scripts/generateVideoRenditions.ts      (development)
 *   ... --dry                                               list what would be converted
 *   ... --only <file>                                       convert just that one file
 *
 * Covers lesson uploads (LearningContentLibrary.videoFilePath) and media uploads kept on this
 * server's disk (uploads/concept-attachments: welcome-day videos, videos in lesson notes). Files
 * already converted are skipped, so it is safe to run again. One video at a time, low priority.
 */
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';
import LearningContentLibrary from '../models/LearningContentLibrary';
import { enqueueRenditions, isVideoFile, whenIdle, qualitiesFor, ffmpegAvailable } from '../services/videoRenditionService';

dotenv.config();

const walk = (dir: string): string[] => {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(e => {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) return walk(full);
    // The original uploads only: not the versions this makes, not half-written ones.
    return isVideoFile(full) && !/\.(\d{3,4})p\.mp4$/i.test(e.name) && !/\.part\.mp4$/i.test(e.name) ? [full] : [];
  });
};

(async () => {
  const dry = process.argv.includes('--dry');
  await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI || '');
  const lessons = (await LearningContentLibrary.find({ videoFilePath: { $exists: true, $ne: '' } }).select('videoFilePath').lean() as any[])
    .map(r => String(r.videoFilePath)).filter(f => fs.existsSync(f));
  const media = walk(path.join(process.cwd(), 'uploads', 'concept-attachments'));
  const onlyAt = process.argv.indexOf('--only');
  const only = onlyAt > 0 ? path.resolve(String(process.argv[onlyAt + 1] || '')) : null;
  const files = only ? [only].filter(f => fs.existsSync(f)) : Array.from(new Set([...lessons, ...media]));
  const todo = files.filter(f => qualitiesFor(f).status !== 'done');
  console.log(`videos found: ${files.length} (lessons ${lessons.length}, media ${media.length}) — to convert: ${todo.length}`);
  if (dry) { todo.forEach(f => console.log('  ', f)); await mongoose.disconnect(); return; }
  if (!(await ffmpegAvailable())) {
    console.error('ffmpeg was not found. Install it (production image: apk add ffmpeg) or set FFMPEG_PATH, then run again.');
    await mongoose.disconnect(); process.exit(1);
  }
  const started = Date.now();
  for (const f of todo) enqueueRenditions(f);
  await whenIdle();
  for (const f of todo) { const q = qualitiesFor(f); console.log(`  ${q.status.padEnd(8)} ${q.heights.map(h => h + 'p').join(' ') || '-'}  ${path.basename(f)}`); }
  console.log(`done in ${Math.round((Date.now() - started) / 1000)}s`);
  await mongoose.disconnect();
})().catch(async e => { console.error(e); try { await mongoose.disconnect(); } catch { /* already closed */ } process.exit(1); });
