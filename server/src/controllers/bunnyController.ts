import { Request, Response } from 'express';
import crypto from 'crypto';
import axios from 'axios';

/**
 * Bunny.net Stream integration (Slice 2).
 *
 * Creates a video object in the configured Bunny Stream library and returns a
 * short-lived TUS (resumable) upload authorization so the browser can upload the
 * recording DIRECTLY to Bunny — the API key never leaves the server and the
 * upload never passes through this VPS (no bandwidth cost, no size cap).
 *
 * Env (server only):
 *   BUNNY_STREAM_LIBRARY_ID   e.g. 681820
 *   BUNNY_STREAM_API_KEY      the library's Stream API key (secret)
 *   BUNNY_STREAM_CDN_HOSTNAME e.g. vz-xxxx.b-cdn.net
 */
// Read at call time so values set in the Platform Settings UI (mirrored into
// process.env by settingsService.applyToEnv) take effect without a redeploy.
const bunnyCfg = () => ({
  LIBRARY_ID: process.env.BUNNY_STREAM_LIBRARY_ID || '',
  API_KEY:    process.env.BUNNY_STREAM_API_KEY || '',
  CDN_HOST:   process.env.BUNNY_STREAM_CDN_HOSTNAME || '',
});

export const bunnyConfigured = (_req: Request, res: Response) => {
  const { LIBRARY_ID, API_KEY, CDN_HOST } = bunnyCfg();
  res.json({ configured: Boolean(LIBRARY_ID && API_KEY), libraryId: LIBRARY_ID ? Number(LIBRARY_ID) : null, cdnHostname: CDN_HOST });
};

export const createBunnyVideo = async (req: Request, res: Response) => {
  try {
    const { LIBRARY_ID, API_KEY, CDN_HOST } = bunnyCfg();
    if (!LIBRARY_ID || !API_KEY) {
      return res.status(500).json({ message: 'Bunny Stream is not configured on the server.' });
    }
    const title = String(req.body?.title || 'Class Recording').slice(0, 200);

    // 1) Create the video object in the library
    const created = await axios.post(
      `https://video.bunnycdn.com/library/${LIBRARY_ID}/videos`,
      { title },
      { headers: { AccessKey: API_KEY, 'Content-Type': 'application/json', accept: 'application/json' } },
    );
    const videoId: string | undefined = created.data?.guid;
    if (!videoId) return res.status(502).json({ message: 'Bunny did not return a video id.' });

    // 2) TUS resumable-upload signature (key stays server-side)
    const expiration = Math.floor(Date.now() / 1000) + 3 * 60 * 60; // valid 3h
    const signature = crypto
      .createHash('sha256')
      .update(`${LIBRARY_ID}${API_KEY}${expiration}${videoId}`)
      .digest('hex');

    return res.json({
      videoId,
      libraryId: Number(LIBRARY_ID),
      cdnHostname: CDN_HOST,
      tus: { endpoint: 'https://video.bunnycdn.com/tusupload', expiration, signature },
    });
  } catch (err: any) {
    const msg = err?.response?.data?.Message || err?.response?.data?.message || err?.message || 'unknown error';
    return res.status(500).json({ message: `Bunny create-video failed: ${msg}` });
  }
};

/**
 * POST /learning-content/bunny/refresh-status
 *
 * Re-reads Bunny's encode status for this tenant's videos and stores it, so a failed
 * upload stops presenting as one that is still processing. Read-only against Bunny.
 */
export const refreshBunnyStatus = async (req: any, res: any) => {
  try {
    const tenantId = String(req.tenantId || req.user?.tenantId || '');
    if (!tenantId) return res.status(401).json({ message: 'Not authenticated' });
    const { refreshBunnyVideoStatuses } = await import('../services/bunnyVideoStatusService');
    const report = await refreshBunnyVideoStatuses(tenantId);
    if (report.error) return res.status(400).json({ message: report.error });
    return res.json(report);
  } catch (e: any) {
    console.error('[bunny] refresh-status:', e?.message || e);
    return res.status(500).json({ message: 'Could not refresh video status.' });
  }
};
