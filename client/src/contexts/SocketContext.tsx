import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  onContentCreated: (callback: (data: any) => void) => void;
  onContentUpdated: (callback: (data: any) => void) => void;
  onContentDeleted: (callback: (data: any) => void) => void;
  offContentCreated: () => void;
  offContentUpdated: () => void;
  offContentDeleted: () => void;
  onHotLeadCreated: (callback: (data: any) => void) => void;
  offHotLeadCreated: () => void;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const auth = useAuth();

  useEffect(() => {
    if (!auth?.user) return;

    // Initialize socket connection
    const newSocket = io(window.location.origin, {
      auth: {
        token: auth.token,
      },
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
    });

    // Connection events
    newSocket.on('connect', () => {
      console.log('✅ Socket connected');
      setIsConnected(true);

      // Join tenant room
      if (auth.user?.tenantId) {
        newSocket.emit('join_tenant', auth.user.tenantId);
        console.log(`📍 Joined tenant room: ${auth.user.tenantId}`);
      }

      // Join course room if in course context
      // This can be done later when user navigates to a specific course
    });

    newSocket.on('disconnect', () => {
      console.log('❌ Socket disconnected');
      setIsConnected(false);
    });

    newSocket.on('connect_error', (error) => {
      console.error('🔴 Socket connection error:', error);
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [auth?.user, auth?.token]);

  // Event listener functions
  const onContentCreated = useCallback((callback: (data: any) => void) => {
    if (socket) {
      socket.on('content_created', callback);
    }
  }, [socket]);

  const onContentUpdated = useCallback((callback: (data: any) => void) => {
    if (socket) {
      socket.on('content_updated', callback);
    }
  }, [socket]);

  const onContentDeleted = useCallback((callback: (data: any) => void) => {
    if (socket) {
      socket.on('content_deleted', callback);
    }
  }, [socket]);

  // Cleanup listeners
  const offContentCreated = useCallback(() => {
    if (socket) {
      socket.off('content_created');
    }
  }, [socket]);

  const offContentUpdated = useCallback(() => {
    if (socket) {
      socket.off('content_updated');
    }
  }, [socket]);

  const offContentDeleted = useCallback(() => {
    if (socket) {
      socket.off('content_deleted');
    }
  }, [socket]);

  const onHotLeadCreated = useCallback((callback: (data: any) => void) => {
    if (socket) {
      socket.on('hot_lead_created', callback);
    }
  }, [socket]);

  const offHotLeadCreated = useCallback(() => {
    if (socket) {
      socket.off('hot_lead_created');
    }
  }, [socket]);

  const value: SocketContextType = {
    socket,
    isConnected,
    onContentCreated,
    onContentUpdated,
    onContentDeleted,
    offContentCreated,
    offContentUpdated,
    offContentDeleted,
    onHotLeadCreated,
    offHotLeadCreated,
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within SocketProvider');
  }
  return context;
};
