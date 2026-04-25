import React, { useEffect, useRef, useState, useCallback } from 'react';
import { notificationApi } from '../../api';
import './NotificationBell.css';

interface Notification {
  _id: string;
  type: string;
  title: string;
  body: string;
  link?: string;
  read: boolean;
  createdAt: string;
}

const NotificationBell: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await notificationApi.list();
      setNotifications(res.data || []);
      setUnreadCount(res.unreadCount || 0);
    } catch {
      // silently fail — bell should never break the app
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000); // poll every 30s
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleOpen = () => {
    setOpen(o => !o);
  };

  const handleMarkRead = async (id: string) => {
    try {
      await notificationApi.markRead(id);
      setNotifications(prev => prev.map(n => n._id === id ? { ...n, read: true } : n));
      setUnreadCount(c => Math.max(0, c - 1));
    } catch { /* ignore */ }
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationApi.markAllRead();
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch { /* ignore */ }
  };

  const typeIcon = (type: string) => {
    if (type === 'placement_drive_new') return '🏢';
    if (type === 'placement_status')  return '✅';
    if (type === 'placement_deadline') return '⏰';
    return '🔔';
  };

  return (
    <div className="nb-wrapper" ref={dropdownRef}>
      <button className="nb-bell-btn" onClick={handleOpen} aria-label="Notifications">
        <i className="bi bi-bell-fill" />
        {unreadCount > 0 && (
          <span className="nb-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>
        )}
      </button>

      {open && (
        <div className="nb-dropdown shadow-lg">
          <div className="nb-header d-flex justify-content-between align-items-center px-3 py-2">
            <span className="fw-semibold">Notifications</span>
            {unreadCount > 0 && (
              <button className="btn btn-link btn-sm p-0 text-primary" onClick={handleMarkAllRead}>
                Mark all read
              </button>
            )}
          </div>

          <div className="nb-list">
            {notifications.length === 0 ? (
              <div className="nb-empty text-muted small text-center py-4">No notifications yet</div>
            ) : (
              notifications.map(n => (
                <div
                  key={n._id}
                  className={`nb-item d-flex gap-2 px-3 py-2 ${n.read ? '' : 'nb-item--unread'}`}
                  onClick={() => { if (!n.read) handleMarkRead(n._id); if (n.link) window.location.href = n.link; }}
                  role="button"
                >
                  <span className="nb-icon">{typeIcon(n.type)}</span>
                  <div className="flex-grow-1 overflow-hidden">
                    <div className="nb-title fw-medium small text-truncate">{n.title}</div>
                    <div className="nb-body text-muted" style={{ fontSize: '0.78rem' }}>{n.body}</div>
                    <div className="nb-time text-muted" style={{ fontSize: '0.72rem' }}>
                      {new Date(n.createdAt).toLocaleString()}
                    </div>
                  </div>
                  {!n.read && <span className="nb-dot flex-shrink-0" />}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
