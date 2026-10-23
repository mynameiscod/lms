/**
 * A link to a file uploaded to CareerPilot, made to work from wherever the app is running.
 *
 * Uploads used to be saved with the API host baked in — e.g. "http://192.168.0.101:5000/api/v1/
 * passport/skill-resources/media/…" from a developer machine whose address later changed — so the
 * saved link pointed at a host that no longer answered and the video spun forever. New uploads
 * save only the path (MEDIA_PATH + key); every link to an uploaded file, old or new, is rebuilt
 * here against the API this build talks to. Any other URL (YouTube, a CDN) is returned untouched.
 */
export const MEDIA_PATH = '/passport/skill-resources/media/';
const API = (process.env.REACT_APP_API_URL || '/api/v1').replace(/\/$/, '');

export function mediaUrl(raw: string | null | undefined): string {
  const url = String(raw || '').trim();
  const at = url.indexOf(MEDIA_PATH);
  if (at < 0) return url;
  return `${API}${MEDIA_PATH}${url.slice(at + MEDIA_PATH.length)}`;
}

/** What an upload stores: the path only, never a host. */
export const mediaPathFor = (fileKey: string): string => `/api/v1${MEDIA_PATH}${fileKey}`;
