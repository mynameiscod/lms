import jwt from 'jsonwebtoken';
import type { Server as SocketIOServer, Socket } from 'socket.io';
import User from '../models/User';
import { jwtSecret } from '../config/secrets';
import { permissionsOf } from '../middleware/roleGuard';

/**
 * Live updates for WhatsApp conversations.
 *
 * The existing `join_tenant` room accepts anyone who names a tenant, so nothing about a
 * conversation goes there. A socket joins `wa_<tenant>` only after its JWT verifies and the user
 * holds `chat_whatsapp`; it also joins `wa_user_<id>` for things meant for one person. Events carry
 * the phone and what changed — never message text; the client re-reads through the authenticated API.
 */

let ioRef: SocketIOServer | null = null;

const room = (tenantId: string) => `wa_${tenantId}`;
export const userRoom = (userId: string) => `wa_user_${userId}`;

async function join(socket: Socket, requestedTenant?: string) {
  try {
    const token = (socket.handshake.auth as any)?.token;
    if (!token) return socket.emit('wa:joined', { ok: false });
    const decoded = jwt.verify(token, jwtSecret()) as any;
    const user: any = await User.findById(decoded.id).select('role tenantId isActive customRoleId').lean();
    if (!user?.isActive) return socket.emit('wa:joined', { ok: false });
    const perms = await permissionsOf({ role: user.role, customRoleId: user.customRoleId });
    if (user.role !== 'SUPER_ADMIN' && !perms.includes('chat_whatsapp')) return socket.emit('wa:joined', { ok: false });
    // A super admin works inside whichever institute they have selected; everyone else only their own.
    const tenantId = user.role === 'SUPER_ADMIN' && requestedTenant ? String(requestedTenant) : String(user.tenantId);
    for (const r of socket.rooms) if (r.startsWith('wa_') && r !== socket.id) socket.leave(r);
    socket.join(room(tenantId));
    socket.join(userRoom(String(user._id)));
    socket.emit('wa:joined', { ok: true });
  } catch {
    socket.emit('wa:joined', { ok: false });
  }
}

export function registerWaChatSocket(io: SocketIOServer) {
  ioRef = io;
  io.on('connection', (socket) => {
    socket.on('wa:join', (tenantId?: string) => { join(socket, tenantId); });
  });
}

export type WaThreadEvent = { phone: string; reason: 'in' | 'out' | 'status' | 'assign' | 'bot' | 'read' };

/** Tell everyone watching this institute's chats that a thread changed. */
export function emitWaThread(tenantId: string, ev: WaThreadEvent) {
  try { ioRef?.to(room(String(tenantId))).emit('wa:thread', ev); } catch { /* realtime is best-effort */ }
}

/** A nudge for one person (e.g. "a chat was assigned to you"). */
export function emitWaUser(userId: string, event: string, payload: Record<string, unknown>) {
  try { ioRef?.to(userRoom(String(userId))).emit(event, payload); } catch { /* best-effort */ }
}
