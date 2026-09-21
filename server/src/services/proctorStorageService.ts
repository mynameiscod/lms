/**
 * Where proctoring recordings live.
 *
 * ── WHY OBJECT STORAGE AND NOT THIS DISK ──────────────────────────────────────────────────
 *
 * Continuous video is roughly 110MB per candidate per hour. Eight hundred candidates is about
 * 90GB for one sitting, onto the same volume as MongoDB and Piston. A full disk during an exam
 * does not degrade the exam, it ends it — and it would end it for everyone at once, including
 * the people whose recordings were never going to be watched. So the recordings go somewhere
 * that cannot take the exam down when it fills.
 *
 * ── IT IS OPTIONAL, AND SAYING SO IS THE POINT ────────────────────────────────────────────
 *
 * `proctorStorageConfigured()` is what the rest of the system asks before it offers to record
 * anything. An exam that believes it is recording and is not is worse than one that never
 * offered: somebody decides a result is safe on the strength of footage that does not exist.
 * Every caller checks first, and the admin screen refuses to enable the camera until this
 * returns true.
 *
 * ── CREDENTIALS ARE NOT THE SES ONES ──────────────────────────────────────────────────────
 *
 * They are configured separately even though both are AWS. The SES key carries ses:SendEmail
 * and nothing else, which is how it should stay: a key that can write video is a key that can
 * delete it, and mailing rights and evidence-storage rights have no business being the same
 * credential.
 */

import { S3Client, PutObjectCommand, GetObjectCommand, ListObjectsV2Command, DeleteObjectsCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import * as settings from './settingsService';

const cfg = (key: string, tenantId?: string): string => settings.getStr(key, '', tenantId);

/** True when there is somewhere to put a recording. Ask before offering to record. */
export function proctorStorageConfigured(tenantId?: string): boolean {
  return Boolean(cfg('PROCTOR_S3_BUCKET', tenantId) && cfg('PROCTOR_S3_REGION', tenantId));
}

const clients = new Map<string, S3Client>();

function clientFor(tenantId?: string): S3Client {
  const region = cfg('PROCTOR_S3_REGION', tenantId);
  if (!region) throw new Error('PROCTOR_S3_REGION is not set — configure it in Platform Settings → Proctoring.');

  const accessKeyId = cfg('PROCTOR_S3_ACCESS_KEY_ID', tenantId);
  const secretAccessKey = cfg('PROCTOR_S3_SECRET_ACCESS_KEY', tenantId);
  const endpoint = cfg('PROCTOR_S3_ENDPOINT', tenantId);

  const sig = `${region}|${accessKeyId}|${endpoint}`;
  const hit = clients.get(sig);
  if (hit) return hit;

  const c = new S3Client({
    region,
    // An explicit endpoint is what lets this point at R2, Wasabi, MinIO or anything else
    // speaking S3 — path style, because those do not all do virtual-hosted buckets.
    ...(endpoint ? { endpoint, forcePathStyle: true } : {}),
    // Explicit keys when given, otherwise the machine's ambient role, exactly as SES does.
    ...(accessKeyId && secretAccessKey ? { credentials: { accessKeyId, secretAccessKey } } : {}),
  });
  clients.set(sig, c);
  return c;
}

/**
 * One chunk's key.
 *
 * Ordered by sequence number, zero-padded, so a plain listing comes back in playback order
 * rather than 1, 10, 11, 2 — the review screen plays what the listing gives it, and sorting
 * that out at read time is a thing somebody forgets exactly once.
 */
export function chunkKey(examId: string, attemptId: string, seq: number, ext = 'webm'): string {
  return `hackathon-exams/${examId}/${attemptId}/${String(seq).padStart(5, '0')}.${ext}`;
}

export async function putChunk(
  tenantId: string, key: string, body: Buffer, contentType: string,
): Promise<{ key: string; bytes: number }> {
  await clientFor(tenantId).send(new PutObjectCommand({
    Bucket: cfg('PROCTOR_S3_BUCKET', tenantId),
    Key: key,
    Body: body,
    ContentType: contentType,
  }));
  return { key, bytes: body.length };
}

/**
 * A link a reviewer can open, good for an hour.
 *
 * Presigned rather than a public bucket: this is a recording of somebody's face in an exam,
 * and the URL should stop working. An hour is long enough to watch a paper through and short
 * enough that a link pasted into a chat is dead before it travels.
 */
export async function chunkUrl(tenantId: string, key: string, seconds = 3600): Promise<string> {
  return getSignedUrl(
    clientFor(tenantId),
    new GetObjectCommand({ Bucket: cfg('PROCTOR_S3_BUCKET', tenantId), Key: key }),
    { expiresIn: seconds },
  );
}

/** Every chunk stored for one attempt, in playback order. */
export async function listChunks(tenantId: string, examId: string, attemptId: string): Promise<string[]> {
  const out: string[] = [];
  let token: string | undefined;
  do {
    const r = await clientFor(tenantId).send(new ListObjectsV2Command({
      Bucket: cfg('PROCTOR_S3_BUCKET', tenantId),
      Prefix: `hackathon-exams/${examId}/${attemptId}/`,
      ContinuationToken: token,
    }));
    for (const o of r.Contents || []) if (o.Key) out.push(o.Key);
    token = r.IsTruncated ? r.NextContinuationToken : undefined;
  } while (token);
  return out.sort();
}

/**
 * Delete everything recorded for one exam.
 *
 * This footage is a means of settling a dispute about one sitting, not a permanent record of
 * a student's face, and keeping it after the results are settled is a liability rather than
 * an asset. Deliberately not automatic: deletion of evidence should be somebody's decision,
 * on a date they chose.
 */
export async function purgeExamRecordings(tenantId: string, examId: string): Promise<number> {
  const bucket = cfg('PROCTOR_S3_BUCKET', tenantId);
  const c = clientFor(tenantId);
  let removed = 0;
  let token: string | undefined;
  do {
    const r = await c.send(new ListObjectsV2Command({
      Bucket: bucket, Prefix: `hackathon-exams/${examId}/`, ContinuationToken: token,
    }));
    const keys = (r.Contents || []).map((o) => ({ Key: o.Key! })).filter((o) => o.Key);
    // DeleteObjects takes a thousand at a time, and a long exam is well past that.
    for (let i = 0; i < keys.length; i += 1000) {
      const batch = keys.slice(i, i + 1000);
      await c.send(new DeleteObjectsCommand({ Bucket: bucket, Delete: { Objects: batch } }));
      removed += batch.length;
    }
    token = r.IsTruncated ? r.NextContinuationToken : undefined;
  } while (token);
  return removed;
}
