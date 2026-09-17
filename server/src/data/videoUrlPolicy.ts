/**
 * What a hosted video link must look like before it is saved to the Content Library.
 *
 * The student player never puts an authored URL into the page: it extracts a YouTube or Vimeo id and
 * builds the embed address on the provider's own origin. So an unsafe link cannot run anything — but a
 * link the player cannot read would reach every learner on that unit as an empty frame. Refusing it at
 * save time tells the author, who can fix it, instead of the student, who cannot.
 *
 * The id patterns here are the player's (client/src/pages/MyLearningPlan/VideoPlayer.tsx); they must
 * agree, or a link accepted here would still play as nothing.
 */

export const YOUTUBE_ID = /(?:[?&]v=|youtu\.be\/|\/embed\/|\/shorts\/|\/live\/)([A-Za-z0-9_-]{11})(?![A-Za-z0-9_-])/;
export const VIMEO_ID = /vimeo\.com\/(?:video\/)?(\d+)/;

const HOSTS: Record<string, RegExp> = {
  youtube: /(^|\.)(youtube\.com|youtube-nocookie\.com|youtu\.be)$/i,
  vimeo: /(^|\.)vimeo\.com$/i,
};

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
  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    return `The ${name} link must start with https://`;
  }
  if (!HOSTS[source].test(parsed.hostname)) {
    return `That is not a ${name} link. Paste the link from ${name}, or change the video source.`;
  }
  const id = source === 'youtube' ? raw.match(YOUTUBE_ID)?.[1] : raw.match(VIMEO_ID)?.[1];
  if (!id) return `The ${name} link does not point at a single video. Open the video on ${name} and copy its address.`;
  return null;
}
