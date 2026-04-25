import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { notificationApi } from '../../api';
import { Spinner } from '../../components/common';
import './NotificationCenter.css';

type NotifType = 'placement_drive_new' | 'placement_deadline' | 'placement_status' | 'general';

interface Notification {
  _id: string;
  type: NotifType;
  title: string;
  body: string;
  link?: string;
  read: boolean;
  createdAt: string;
}

const TYPE_LABELS: Record<NotifType, string> = {
  placement_drive_new: 'New Drive',
  placement_deadline: 'Deadline',
  placement_status: 'Status Update',
  general: 'General'
};

const TYPE_ICONS: Record<NotifType, string> = {
  placement_drive_new: 'fa-briefcase',
  placement_deadline: 'fa-clock',
  placement_status: 'fa-circle-check',
  general: 'fa-bell'
};

const NotificationCenterPage: React.FC = () => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  // Filters
  const [readFilter, setReadFilter] = useState<'all' | 'unread' | 'read'>('all');
  const [typeFilter, setTypeFilter] = useState<NotifType | 'all'>('all');

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res = await notificationApi.list();
      if (res.success) {
        setNotifications(res.data || []);
        setUnreadCount(res.unreadCount || 0);
      }
    } catch {
      // silently ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleMarkRead = async (id: string) => {
    await notificationApi.markRead(id);
    setNotifications(prev => prev.map(n => n._id === id ? { ...n, read: true } : n));
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  const handleMarkAllRead = async () => {
    await notificationApi.markAllRead();
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadCount(0);
  };

  const handleClick = (n: Notification) => {
    if (!n.read) handleMarkRead(n._id);
    if (n.link) navigate(n.link);
  };

  const filtered = notifications.filter(n => {
    if (readFilter === 'unread' && n.read) return false;
    if (readFilter === 'read' && !n.read) return false;
    if (typeFilter !== 'all' && n.type !== typeFilter) return false;
    return true;
  });

  const formatDate = (d: string) => {
    const date = new Date(d);
    const now = new Date();
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
    return date.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  if (loading) return <Spinner fullScreen />;

  return (
    <div className="nc-page">
      <div className="nc-header">
        <div>
          <h1><i className="fa-solid fa-bell" /> Notifications</h1>
          {unreadCount > 0 && (
            <span className="nc-unread-badge">{unreadCount} unread</span>
          )}
        </div>
        {unreadCount > 0 && (
          <button className="nc-mark-all-btn" onClick={handleMarkAllRead}>
            <i className="fa-solid fa-check-double" /> Mark all read
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="nc-filters">
        <div className="nc-filter-group">
          {(['all', 'unread', 'read'] as const).map(f => (
            <button
              key={f}
              className={`nc-filter-btn ${readFilter === f ? 'nc-filter-active' : ''}`}
              onClick={() => setReadFilter(f)}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
        <select
          className="nc-type-select"
          value={typeFilter}
          onChange={e => setTypeFilter(e.target.value as NotifType | 'all')}
        >
          <option value="all">All Types</option>
          {Object.entries(TYPE_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
      </div>

      <div className="nc-count">{filtered.length} notification{filtered.length !== 1 ? 's' : ''}</div>

      <div className="nc-list">
        {filtered.length === 0 ? (
          <div className="nc-empty">
            <i className="fa-solid fa-bell-slash" />
            <p>No notifications here</p>
          </div>
        ) : filtered.map(n => (
          <div
            key={n._id}
            className={`nc-item ${!n.read ? 'nc-item-unread' : ''} ${n.link ? 'nc-item-clickable' : ''}`}
            onClick={() => n.link && handleClick(n)}
          >
            <div className={`nc-item-icon nc-icon-${n.type}`}>
              <i className={`fa-solid ${TYPE_ICONS[n.type]}`} />
            </div>
            <div className="nc-item-body">
              <div className="nc-item-top">
                <span className="nc-item-title">{n.title}</span>
                <span className="nc-item-time">{formatDate(n.createdAt)}</span>
              </div>
              <p className="nc-item-text">{n.body}</p>
              <div className="nc-item-meta">
                <span className={`nc-type-tag nc-type-${n.type}`}>{TYPE_LABELS[n.type]}</span>
                {!n.read && (
                  <button
                    className="nc-mark-btn"
                    onClick={e => { e.stopPropagation(); handleMarkRead(n._id); }}
                  >
                    Mark as read
                  </button>
                )}
              </div>
            </div>
            {!n.read && <div className="nc-unread-dot" />}
          </div>
        ))}
      </div>
    </div>
  );
};

export default NotificationCenterPage;
