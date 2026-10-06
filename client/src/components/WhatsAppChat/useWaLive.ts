import { useEffect, useRef } from 'react';
import { useSocket } from '../../contexts/SocketContext';

export type WaThreadEvent = { phone: string; reason: 'in' | 'out' | 'status' | 'assign' | 'bot' | 'read' };

/**
 * Live WhatsApp updates. Joins the authenticated chat room (the server checks the login and the
 * chat permission) and calls `onThread` whenever a conversation changes. Events carry only the
 * phone and what changed; callers re-read through the API.
 */
export function useWaLive(onThread: (ev: WaThreadEvent) => void) {
  const { socket } = useSocket();
  const cb = useRef(onThread);
  cb.current = onThread;

  useEffect(() => {
    if (!socket) return;
    const tenantId = localStorage.getItem('tenantId') || undefined;
    const join = () => socket.emit('wa:join', tenantId);
    const handler = (ev: WaThreadEvent) => cb.current(ev);
    if (socket.connected) join();
    socket.on('connect', join); // rejoin after a reconnect — rooms do not survive it
    socket.on('wa:thread', handler);
    return () => {
      socket.off('connect', join);
      socket.off('wa:thread', handler);
    };
  }, [socket]);
}
