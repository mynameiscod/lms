import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSocket } from '../../contexts/SocketContext';
import { useAuth } from '../../contexts/AuthContext';
import './leadAssignedAlert.css';

/**
 * "A lead was assigned to you" — a live alert for staff (server: services/salesTeamService.ts
 * alertNewAssignments, realtime/userSocket.ts). The same alert is also in the bell, which polls,
 * so a closed tab misses nothing. Also refreshes the bell when any personal notification arrives.
 */
interface Alert { id: number; title: string; body: string; link: string }

export const NOTIFICATIONS_REFRESH = 'cb:notifications-refresh';

export default function LeadAssignedAlert() {
  const { socket } = useSocket();
  const { user } = useAuth() as any;
  const navigate = useNavigate();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const isStaff = !!user && user.role !== 'STUDENT';

  useEffect(() => {
    if (!socket || !isStaff) return;
    const join = () => socket.emit('me:join');
    if (socket.connected) join();
    socket.on('connect', join);
    const onAssigned = (p: any) => {
      const id = Date.now() + Math.random();
      setAlerts(prev => [...prev.slice(-2), { id, title: String(p?.title || 'New lead assigned'), body: String(p?.body || ''), link: String(p?.link || '/leads') }]);
      window.dispatchEvent(new Event(NOTIFICATIONS_REFRESH));
      setTimeout(() => setAlerts(prev => prev.filter(a => a.id !== id)), 12000);
    };
    const onNew = () => window.dispatchEvent(new Event(NOTIFICATIONS_REFRESH));
    socket.on('lead:assigned', onAssigned);
    socket.on('notifications:new', onNew);
    return () => {
      socket.off('connect', join);
      socket.off('lead:assigned', onAssigned);
      socket.off('notifications:new', onNew);
    };
  }, [socket, isStaff]);

  if (!alerts.length) return null;
  const close = (id: number) => setAlerts(prev => prev.filter(a => a.id !== id));
  return (
    <div className="laa" role="region" aria-label="New lead alerts">
      {alerts.map(a => (
        <div key={a.id} className="laa-card" role="alert">
          <span className="laa-ic"><i className="bi bi-telephone-inbound-fill" /></span>
          <div className="laa-body">
            <b>{a.title}</b>
            {a.body && <span>{a.body}</span>}
            <button type="button" className="laa-go" onClick={() => { close(a.id); navigate(a.link); }}>{a.link.startsWith('/leads/') ? 'Open lead' : 'Open my queue'} <i className="bi bi-arrow-right" /></button>
          </div>
          <button type="button" className="laa-x" aria-label="Dismiss" onClick={() => close(a.id)}><i className="bi bi-x-lg" /></button>
        </div>
      ))}
    </div>
  );
}
