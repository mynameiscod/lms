import fs from 'fs';
import path from 'path';
import os from 'os';
import { spawn } from 'child_process';

/**
 * QUALITY VERSIONS OF AN UPLOADED VIDEO.
 *
 * An uploaded lesson or welcome video is one file at one quality — often a 1080p recording of
 * 100MB+, which is slow to start on a phone or a weak connection and offers no way to drop down.
 * After upload, each video is converted in the background into the standard steps below its own
 * height (1080p only when the original is bigger than that), each with its index at the front
 * (`+faststart`) so it starts playing while it downloads. The player offers them as a Quality
 * menu; the original stays available as "Original".
 *
 * Kept beside the file, no schema change:
 *   <file>                    the upload, untouched
 *   <base>.<h>p.mp4           one per quality
 *   <file>.renditions.json    { status, sourceHeight, heights, updatedAt, error? }
 *
 * One conversion at a time, at low CPU priority and two threads, so a batch of uploads never
 * starves the API. ffmpeg comes from FFMPEG_PATH, else `ffmpeg` on the PATH (the production
 * image installs it). Without it, nothing breaks: the manifest says "unavailable" and the player
 * simply offers the original.
 */

export const LADDER = [1080, 720, 480, 360] as const;
export type RenditionStatus = 'queued' | 'processing' | 'done' | 'failed' | 'unavailable';
export interface RenditionManifest {
  status: RenditionStatus;
  sourceHeight: number | null;
  heights: number[];
  updatedAt: string;
  error?: string;
}

const VIDEO_EXT = new Set(['.mp4', '.mov', '.m4v', '.webm', '.mkv', '.avi']);
export const isVideoFile = (file: string) => VIDEO_EXT.has(path.extname(file).toLowerCase());

const ffmpegBin = () => process.env.FFMPEG_PATH || 'ffmpeg';
const manifestPath = (file: string) => `${file}.renditions.json`;
export const renditionPath = (file: string, height: number) => {
  const dir = path.dirname(file);
  const base = path.basename(file, path.extname(file));
  return path.join(dir, `${base}.${height}p.mp4`);
};

export function readManifest(file: string): RenditionManifest | null {
  try { return JSON.parse(fs.readFileSync(manifestPath(file), 'utf8')); } catch { return null; }
}
function writeManifest(file: string, m: Omit<RenditionManifest, 'updatedAt'>) {
  try { fs.writeFileSync(manifestPath(file), JSON.stringify({ ...m, updatedAt: new Date().toISOString() })); } catch { /* read-only volume: the player falls back to the original */ }
}

/** The quality versions that actually exist on disk for this upload (highest first). */
export function availableHeights(file: string): number[] {
  return LADDER.filter(h => fs.existsSync(renditionPath(file, h)));
}

let ffmpegOk: boolean | null = null;
function run(args: string[], lowPriority = false): Promise<{ code: number; stderr: string }> {
  return new Promise(resolve => {
    let stderr = '';
    let child;
    try { child = spawn(ffmpegBin(), args, { windowsHide: true }); } catch (e: any) { resolve({ code: -1, stderr: String(e?.message || e) }); return; }
    if (lowPriority && child.pid) { try { os.setPriority(child.pid, os.constants.priority.PRIORITY_BELOW_NORMAL); } catch { /* not permitted here */ } }
    child.stderr?.on('data', (d: Buffer) => { stderr = (stderr + d.toString()).slice(-8000); });
    child.on('error', (e: any) => resolve({ code: -1, stderr: String(e?.message || e) }));
    child.on('close', (code: number) => resolve({ code: code ?? -1, stderr }));
  });
}
export async function ffmpegAvailable(): Promise<boolean> {
  if (ffmpegOk !== null) return ffmpegOk;
  const r = await run(['-hide_banner', '-version']);
  ffmpegOk = r.code === 0;
  if (!ffmpegOk) console.warn('[video] ffmpeg not found — uploaded videos will play at their original quality only. Set FFMPEG_PATH or install ffmpeg.');
  return ffmpegOk;
}

/** The video's height, read from ffmpeg's own description of the file (no ffprobe needed). */
async function sourceHeight(file: string): Promise<number | null> {
  const r = await run(['-hide_banner', '-i', file]);
  const m = r.stderr.match(/Stream #[^\n]*Video:[^\n]*?\b(\d{2,5})x(\d{2,5})\b/);
  return m ? Number(m[2]) : null;
}

/** Heights to make for a source: every step below it, and 1080 only when the source is taller. */
export function targetHeights(src: number | null): number[] {
  if (!src) return [720, 480, 360];
  return LADDER.filter(h => h < src - 8);
}

async function convert(file: string): Promise<void> {
  if (!fs.existsSync(file)) return;
  if (!(await ffmpegAvailable())) { writeManifest(file, { status: 'unavailable', sourceHeight: null, heights: [] }); return; }
  const src = await sourceHeight(file);
  const targets = targetHeights(src);
  writeManifest(file, { status: 'processing', sourceHeight: src, heights: availableHeights(file) });
  for (const h of targets) {
    const out = renditionPath(file, h);
    if (fs.existsSync(out)) continue;
    const tmp = `${out}.part.mp4`;
    const r = await run([
      '-hide_banner', '-loglevel', 'error', '-y', '-i', file,
      '-vf', `scale=-2:${h}`, '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '24', '-profile:v', 'main', '-pix_fmt', 'yuv420p',
      '-c:a', 'aac', '-b:a', h <= 480 ? '96k' : '128k', '-ac', '2',
      '-movflags', '+faststart', '-threads', '2', tmp,
    ], true);
    if (r.code !== 0 || !fs.existsSync(tmp)) {
      try { fs.unlinkSync(tmp); } catch { /* nothing to clean */ }
      writeManifest(file, { status: 'failed', sourceHeight: src, heights: availableHeights(file), error: r.stderr.trim().split('\n').slice(-2).join(' ').slice(0, 300) });
      console.error(`[video] ${h}p version failed for ${path.basename(file)}:`, r.stderr.trim().split('\n').pop());
      return;
    }
    fs.renameSync(tmp, out);
    writeManifest(file, { status: 'processing', sourceHeight: src, heights: availableHeights(file) });
  }
  writeManifest(file, { status: 'done', sourceHeight: src, heights: availableHeights(file) });
}

/* One at a time, in order of upload. */
const queue: string[] = [];
let busy = false;
const done = new Set<() => void>();
async function pump() {
  if (busy) return;
  busy = true;
  try {
    while (queue.length) {
      const file = queue.shift()!;
      try { await convert(file); } catch (e: any) { console.error('[video] conversion error:', e?.message || e); }
    }
  } finally {
    busy = false;
    for (const fn of Array.from(done)) { done.delete(fn); fn(); }
  }
}

/** Queue an uploaded video for its quality versions. Returns at once; never throws. */
export function enqueueRenditions(file: string | null | undefined): void {
  if (!file || !isVideoFile(file) || queue.includes(file)) return;
  const m = readManifest(file);
  if (m && (m.status === 'done' || m.status === 'processing')) return;
  writeManifest(file, { status: 'queued', sourceHeight: m?.sourceHeight ?? null, heights: availableHeights(file) });
  queue.push(file);
  setImmediate(() => { pump(); });
}

/** Resolves when the queue is empty (for the backfill script). */
export function whenIdle(): Promise<void> {
  if (!busy && !queue.length) return Promise.resolve();
  return new Promise(resolve => { done.add(resolve); });
}

/** What the player needs: the qualities on offer, highest first, plus the conversion state. */
export function qualitiesFor(file: string): { status: RenditionStatus | 'none'; sourceHeight: number | null; heights: number[] } {
  const m = readManifest(file);
  return { status: m?.status || 'none', sourceHeight: m?.sourceHeight ?? null, heights: availableHeights(file) };
}
