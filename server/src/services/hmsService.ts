/**
 * hmsService — thin wrapper around 100ms (hundred-ms) for the Live Classes module.
 *
 * Two kinds of JWT are signed locally with the App Access Key + App Secret
 * (HS256, per the 100ms v2 spec) so we never call out just to mint tokens:
 *   - management token  → used as a Bearer against api.100ms.live (create rooms, etc.)
 *   - auth token        → handed to the browser SDK so a user can join a room in a role
 *
 * Credentials live in Platform Settings (HMS_APP_ACCESS_KEY / HMS_APP_SECRET /
 * HMS_TEMPLATE_ID). The secret is never sent to the browser.
 */
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';
import { getStr, isSet } from './settingsService';

const HMS_API_BASE = 'https://api.100ms.live/v2';

// 100ms webinar template roles (see project_live_classes memory)
export const HMS_ROLES = {
  broadcaster: 'broadcaster',    // instructor / host
  viewer: 'viewer',              // HLS audience (the 500+)
  stage: 'viewer-on-stage',      // a viewer promoted to speak (two-way)
} as const;

export type HmsRole = (typeof HMS_ROLES)[keyof typeof HMS_ROLES];

function creds(tenantId?: string) {
  const accessKey = getStr('HMS_APP_ACCESS_KEY', '', tenantId);
  const secret = getStr('HMS_APP_SECRET', '', tenantId);
  if (!accessKey || !secret) {
    throw new Error('100ms is not configured — set HMS_APP_ACCESS_KEY and HMS_APP_SECRET in Platform Settings → Live Classes.');
  }
  return { accessKey, secret };
}

export function isHmsConfigured(tenantId?: string): boolean {
  return isSet('HMS_APP_ACCESS_KEY', tenantId) && isSet('HMS_APP_SECRET', tenantId);
}

/** Management token — Bearer for the 100ms REST API. Short-lived. */
export function managementToken(tenantId?: string): string {
  const { accessKey, secret } = creds(tenantId);
  const now = Math.floor(Date.now() / 1000);
  return jwt.sign(
    {
      access_key: accessKey,
      type: 'management',
      version: 2,
      iat: now,
      nbf: now,
      exp: now + 60 * 60, // 1 hour
      jti: uuidv4(),
    },
    secret,
    { algorithm: 'HS256' }
  );
}

/**
 * Client auth token — the browser SDK uses this to join `roomId` as `role` for `userId`.
 * Valid 24h so a scheduled class join link keeps working through the session.
 */
export function authToken(
  roomId: string,
  userId: string,
  role: HmsRole,
  tenantId?: string
): string {
  const { accessKey, secret } = creds(tenantId);
  const now = Math.floor(Date.now() / 1000);
  return jwt.sign(
    {
      access_key: accessKey,
      room_id: roomId,
      user_id: userId,
      role,
      type: 'app',
      version: 2,
      iat: now,
      nbf: now,
      exp: now + 24 * 60 * 60, // 24 hours
      jti: uuidv4(),
    },
    secret,
    { algorithm: 'HS256' }
  );
}

/** Create a 100ms room bound to the configured webinar template. Returns its room id. */
export async function createRoom(name: string, description: string, tenantId?: string): Promise<string> {
  const templateId = getStr('HMS_TEMPLATE_ID', '', tenantId);
  const body: Record<string, any> = {
    // 100ms room names must be unique-ish and URL safe
    name: name.toLowerCase().replace(/[^a-z0-9-]/g, '-').slice(0, 60) + '-' + uuidv4().slice(0, 8),
    description: description?.slice(0, 200) || 'CodeBegun live class',
  };
  if (templateId) body.template_id = templateId;

  const res = await axios.post(`${HMS_API_BASE}/rooms`, body, {
    headers: { Authorization: `Bearer ${managementToken(tenantId)}`, 'Content-Type': 'application/json' },
    timeout: 15000,
  });
  return res.data?.id;
}

/** Change a peer's role live (e.g. bring a viewer on stage, or send them back). */
export async function changeRole(
  roomId: string,
  peerId: string,
  toRole: HmsRole,
  tenantId?: string
): Promise<void> {
  await axios.post(
    `${HMS_API_BASE}/active-rooms/${roomId}/change-role`,
    { peer_id: peerId, role: toRole, force: true },
    {
      headers: { Authorization: `Bearer ${managementToken(tenantId)}`, 'Content-Type': 'application/json' },
      timeout: 15000,
    }
  );
}

/**
 * Resolve a downloadable HTTPS URL for a room's recording.
 * The recording webhook hands us a `gs://` path that Bunny/others can't fetch, so we
 * ask 100ms for the room-composite asset and its short-lived presigned URL.
 */
export async function getRecordingDownloadUrl(roomId: string, tenantId?: string): Promise<string | null> {
  if (!roomId) return null;
  const auth = { headers: { Authorization: `Bearer ${managementToken(tenantId)}` }, timeout: 15000 };
  const res = await axios.get(`${HMS_API_BASE}/recording-assets?room_id=${roomId}`, auth);
  const list: any[] = res.data?.data || res.data?.assets || [];
  const asset =
    list.find((a) => a.type === 'room-composite') ||
    list.find((a) => /mp4|composite|video/i.test(a.type || '')) ||
    list[0];
  if (!asset?.id) return null;
  const pre = await axios.get(`${HMS_API_BASE}/recording-assets/${asset.id}/presigned-url`, auth);
  return pre.data?.url || pre.data?.path || pre.data?.presigned_url || null;
}

/** End an active room (kicks everyone, stops HLS/recording). Best-effort. */
export async function endRoom(roomId: string, reason = 'Class ended', tenantId?: string): Promise<void> {
  try {
    await axios.post(
      `${HMS_API_BASE}/active-rooms/${roomId}/end-room`,
      { reason, lock: false },
      {
        headers: { Authorization: `Bearer ${managementToken(tenantId)}`, 'Content-Type': 'application/json' },
        timeout: 15000,
      }
    );
  } catch {
    // room may already be inactive — ignore
  }
}
