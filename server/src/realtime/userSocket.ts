import jwt from 'jsonwebtoken';
import type { Server as SocketIOServer, Socket } from 'socket.io';
import User from '../models/User';
import { jwtSecret } from '../config/secrets';

/**
 * A private room per signed-in person, for nudges meant for them alone ("a lead was assigned to
 * you", "you have a new notification"). The open `join_tenant` room takes anyone who names a tenant,
 * so nothing personal goes there: a socket joins `u_<id>` only after its JWT verifies. Events carry a
 * title and a link, never data; the client re-reads through the authenticated API.
 */

let ioRef: SocketIOServer | null = null;
const room = (userId: string) => `u_${userId}`;

async function join(socket: Socket) {
  try {
    const token = (socket.handshake.auth as any)?.token;
    if (!token) return;
    const decoded = jwt.verify(token, jwtSecret()) as any;
    const user: any = await User.findById(decoded.id).select('isActive').lean();
    if (!user || user.isActive === false) return;
    socket.join(room(String(decoded.id)));
    socket.emit('me:joined', { ok: true });
  } catch {
    /* a bad token simply gets no room */
  }
}

export function registerUserSocket(io: SocketIOServer) {
  ioRef = io;
  io.on('connection', (socket) => {
    socket.on('me:join', () => { join(socket); });
  });
}

/** Best effort: the bell's own polling catches anything a closed tab missed. */
export function emitToUser(userId: string, event: string, payload: Record<string, unknown>) {
  try { ioRef?.to(room(String(userId))).emit(event, payload); } catch { /* best-effort */ }
}
