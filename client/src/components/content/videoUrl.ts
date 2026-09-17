/**
 * Hosted video links: the id the player embeds, and whether a link can be saved.
 *
 * Mirrors server/src/data/videoUrlPolicy.ts, which refuses the same links on save. The two must agree:
 * a link the editor accepts but the server refuses is a confusing save error, and a link either accepts
 * that the player cannot read plays as an empty frame.
 */

export const YOUTUBE_ID = /(?:[?&]v=|youtu\.be\/|\/embed\/|\/shorts\/|\/live\/)([A-Za-z0-9_-]{11})(?![A-Za-z0-9_-])/;
export const VIMEO_ID = /vimeo\.com\/(?:video\/)?(\d+)/;

const HOSTS: Record<string, RegExp> = {
  youtube: /(^|\.)(youtube\.com|youtube-nocookie\.com|youtu\.be)$/i,
  vimeo: /(^|\.)vimeo\.com$/i,
};

export const youtubeIdOf = (url?: string | null) => (url || '').match(YOUTUBE_ID)?.[1] || null;
export const vimeoIdOf = (url?: string | null) => (url || '').match(VIMEO_ID)?.[1] || null;

/** Null when the link is acceptable for its source, otherwise a sentence an author can act on. */
export function videoUrlProblem(source: unknown, url: unknown): string | null {
  if (source !== 'youtube' && source !== 'vimeo') return null;
  const raw = typeof url === 'string' ? url.trim() : '';
  const name = source === 'youtube' ? 'YouTube' : 'Vimeo';
  if (!raw) return `Add the ${name} link for this video.`;
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    return `The ${name} link is not a web address. Paste the full link, starting with https://`;
  }
  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return `The ${name} link must start with https://`;
  if (!HOSTS[source].test(parsed.hostname)) {
    return `That is not a ${name} link. Paste the link from ${name}, or change the video source.`;
  }
  const id = source === 'youtube' ? youtubeIdOf(raw) : vimeoIdOf(raw);
  if (!id) return `The ${name} link does not point at a single video. Open the video on ${name} and copy its address.`;
  return null;
}
