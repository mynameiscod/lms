/**
 * Where proctoring recordings live.
 *
 * ── IT IS BUNNY, BECAUSE BUNNY IS ALREADY HERE ────────────────────────────────────────────
 *
 * The Resource Library already stores files in a Bunny Edge Storage zone, configured in
 * Platform Settings, working today. Recordings go in the same zone under their own prefix.
 * That means no new bucket, no new credential, no second thing to be misconfigured on the
 * morning of an exam — and it keeps the read path Bunny already established, where bytes are
 * streamed back through a gated app endpoint so access control applies to every request
 * rather than to a URL that then travels.
 *
 * ── NOT ON THIS DISK ──────────────────────────────────────────────────────────────────────
 *
 * Continuous video with audio is roughly 200MB per candidate per hour. Eight hundred
 * candidates is about 160GB for one sitting. On the volume that carries MongoDB and Piston, a
 * full disk during an exam does not degrade the exam, it ends it — for everyone at once,
 * including the people whose footage nobody was ever going to watch.
 *
 * ── CHUNKS ARE NUMBERED, NOT LISTED ───────────────────────────────────────────────────────
 *
 * The attempt records how many chunks it wrote, and the key for each is derived from its
 * sequence number. Nothing has to list a directory to play a recording back, which matters
 * because a listing tells you what arrived and the count tells you what was meant to arrive —
 * and the gap between those two is exactly the thing a reviewer needs to see.
 */

import { uploadFile, deleteFile, getFileStream, isBunnyStorageConfigured } from './bunnyStorageService';

/** True when there is somewhere to put a recording. Ask before offering to record. */
export const proctorStorageConfigured = (): boolean => isBunnyStorageConfigured();

/**
 * One chunk's path.
 *
 * Zero-padded so the natural sort is the playback order — 00001 before 00010, where 1 would
 * sort after 10. Nothing depends on that today, and something will.
 */
export const chunkPath = (examId: string, attemptId: string, seq: number): string =>
  `proctoring/${examId}/${attemptId}/${String(seq).padStart(5, '0')}.webm`;

export async function putChunk(
  examId: string, attemptId: string, seq: number, body: Buffer,
): Promise<{ path: string; bytes: number }> {
  const path = chunkPath(examId, attemptId, seq);
  await uploadFile(path, body, 'video/webm');
  return { path, bytes: body.length };
}

/** Bytes for one chunk, to be piped straight to a reviewer. */
export const readChunk = (examId: string, attemptId: string, seq: number) =>
  getFileStream(chunkPath(examId, attemptId, seq));

/**
 * Delete one attempt's recording.
 *
 * Deliberately not automatic and not scheduled. This footage exists to settle a dispute about
 * one sitting; once that is settled it is a liability rather than an asset, but deciding it is
 * settled is a person's job, on a date they chose, not a cron's.
 */
export async function purgeAttemptRecording(
  examId: string, attemptId: string, chunks: number,
): Promise<number> {
  let removed = 0;
  for (let i = 1; i <= chunks; i++) {
    await deleteFile(chunkPath(examId, attemptId, i));
    removed++;
  }
  return removed;
}
