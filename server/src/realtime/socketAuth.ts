import jwt from 'jsonwebtoken';
import type { Server as SocketIOServer, Socket } from 'socket.io';
import User from '../models/User';
import { jwtSecret } from '../config/secrets';
import { allowedByRoleOrPermission } from '../middleware/roleGuard';

/**
 * Who is on the other end of a socket.
 *
 * Rooms used to be joined on the client's word: `join_tenant` with any tenant id put a socket in
 * that institute's room (lead assignments, follow-up reminders), and the live classroom took the
 * user id, name and even `role: 'host'` from the browser. Every socket is now identified once, at
 * connect, from the same JWT the HTTP API uses; handlers decide from `socket.data.user`.
 * A socket without a valid token still connects (so nothing errors) but can join nothing.
 */

export interface SocketUser {
  id: string;
  role: string;
  tenantId: string;
  customRoleId?: string | null;
  name: string;
}

export const socketUser = (socket: Socket): SocketUser | null => (socket.data as any)?.user || null;

export function registerSocketAuth(io: SocketIOServer) {
  io.use(async (socket, next) => {
    try {
      const token = (socket.handshake.auth as any)?.token;
      if (token) {
        const decoded = jwt.verify(token, jwtSecret()) as any;
        const u: any = await User.findById(decoded.id).select('role tenantId isActive customRoleId firstName lastName email').lean();
        if (u && u.isActive !== false) {
          (socket.data as any).user = {
            id: String(u._id), role: u.role, tenantId: String(u.tenantId || ''), customRoleId: u.customRoleId ? String(u.customRoleId) : null,
            name: [u.firstName, u.lastName].filter(Boolean).join(' ').trim() || u.email || 'User',
          } as SocketUser;
        }
      }
    } catch { /* invalid or expired token — the socket stays anonymous */ }
    next();
  });
}

/** Own institute only; a super admin may watch whichever institute they have open. */
export const mayJoinTenant = (u: SocketUser | null, tenantId: string) =>
  !!u && !!tenantId && (u.role === 'SUPER_ADMIN' || u.tenantId === String(tenantId));

/** The staff room carries lead and follow-up alerts — never students or guests. */
export const mayJoinStaff = (u: SocketUser | null, tenantId: string) =>
  mayJoinTenant(u, tenantId) && !['STUDENT', 'GUEST'].includes(u!.role);

/** The same rule the live-class HTTP routes use for hosting (liveClassRoutes hostGuard). */
export const mayHostLiveClass = async (u: SocketUser | null): Promise<boolean> =>
  !!u && allowedByRoleOrPermission(u, ['SUPER_ADMIN', 'TENANT_ADMIN', 'INSTRUCTOR'],
    ['manage_live_classes', 'create_courses', 'edit_courses', 'manage_own_courses', 'manage_tenant']);
