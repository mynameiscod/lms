import LearningContentLibrary from '../models/LearningContentLibrary';

/**
 * Mirror Bunny's encode status onto our own content records.
 *
 * WHY THIS EXISTS. A Bunny video that failed to encode and one still transcoding look
 * identical to a viewer: both render the "Processing video" placeholder. So a recording
 * that will never play reads as one that is nearly ready, and nobody finds out until a
 * student asks. Eight recordings were in that state — six of them from the previous two
 * days — all stalled at exactly 5%.
 *
 * The status lives on our record rather than being fetched per view because the Bunny API
 * needs a secret key, is rate-limited, and a class page can render a dozen videos at once.
 * One sweep updates many; every viewer then reads a local field.
 */

export const BUNNY_STATUS = {
  CREATED: 0, UPLOADED: 1, PROCESSING: 2, TRANSCODING: 3,
  FINISHED: 4, ERROR: 5, UPLOAD_FAILED: 6,
} as const;

/** Terminal failure — this video will not play without being uploaded again. */
export const isFailedStatus = (s?: number | null): boolean =>
  s === BUNNY_STATUS.ERROR || s === BUNNY_STATUS.UPLOAD_FAILED;

/** Still working; a viewer should be told to come back, not that it is broken. */
export const isPendingStatus = (s?: number | null): boolean =>
  s === BUNNY_STATUS.CREATED || s === BUNNY_STATUS.UPLOADED
  || s === BUNNY_STATUS.PROCESSING || s === BUNNY_STATUS.TRANSCODING;

interface BunnyVideo { guid: string; status: number; encodeProgress: number; title?: string }

export interface StatusSweepReport {
  scanned: number;
  updated: number;
  failed: { guid: string; title: string; encodeProgress: number }[];
  pending: number;
  libraryId: string;
  error?: string;
}

/**
 * Read every video in the library, in pages.
 *
 * The list endpoint is used rather than one call per video: a per-video sweep of a few
 * hundred recordings is a few hundred requests against a rate limit, for data the list
 * already carries.
 */
async function listLibraryVideos(libraryId: string, apiKey: string): Promise<BunnyVideo[]> {
  const out: BunnyVideo[] = [];
  for (let page = 1; page <= 20; page++) {
    const res = await fetch(
      `https://video.bunnycdn.com/library/${libraryId}/videos?page=${page}&itemsPerPage=100&orderBy=date`,
      { headers: { AccessKey: apiKey, accept: 'application/json' } },
    );
    if (!res.ok) throw new Error(`Bunny list failed: HTTP ${res.status}`);
    const body = await res.json() as { items?: BunnyVideo[] };
    const items = body.items || [];
    out.push(...items);
    if (items.length < 100) break;
  }
  return out;
}

/**
 * Refresh stored status for one tenant's Bunny videos.
 *
 * Never throws for a caller that just wants the numbers — a Bunny outage must not take a
 * page down. The error is reported in the result instead.
 */
export async function refreshBunnyVideoStatuses(tenantId: string): Promise<StatusSweepReport> {
  const libraryId = process.env.BUNNY_STREAM_LIBRARY_ID || '';
  const apiKey = process.env.BUNNY_STREAM_API_KEY || '';

  const report: StatusSweepReport = { scanned: 0, updated: 0, failed: [], pending: 0, libraryId };
  if (!libraryId || !apiKey) {
    report.error = 'Bunny Stream is not configured (BUNNY_STREAM_LIBRARY_ID / BUNNY_STREAM_API_KEY).';
    return report;
  }

  let videos: BunnyVideo[];
  try {
    videos = await listLibraryVideos(libraryId, apiKey);
  } catch (e: any) {
    report.error = e?.message || 'Could not reach Bunny.';
    return report;
  }

  const byGuid = new Map(videos.map(v => [String(v.guid), v]));
  report.scanned = videos.length;

  // Only rows this tenant owns are touched, even though the library is shared.
  const rows = await LearningContentLibrary
    .find({ tenantId, videoSource: 'bunny', bunnyVideoId: { $nin: [null, ''] } })
    .select('_id title bunnyVideoId bunnyStatus').lean() as any[];

  const now = new Date();
  for (const row of rows) {
    const v = byGuid.get(String(row.bunnyVideoId));
    if (!v) continue;                       // in our DB, not in this library — left alone

    if (isFailedStatus(v.status)) {
      report.failed.push({ guid: v.guid, title: row.title || v.title || '', encodeProgress: v.encodeProgress });
    } else if (isPendingStatus(v.status)) {
      report.pending += 1;
    }

    if (row.bunnyStatus === v.status) continue;
    await LearningContentLibrary.updateOne(
      { _id: row._id },
      { $set: { bunnyStatus: v.status, bunnyStatusAt: now } },
    );
    report.updated += 1;
  }

  return report;
}
