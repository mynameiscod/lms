import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { followUpApi } from '../../api';
import './FollowUpCalendar.css';

interface FollowUp {
  _id: string;
  leadId: string;
  leadName: string;
  type: 'call' | 'whatsapp' | 'email' | 'one_on_one' | 'demo' | 'touch_base' | 'payment_reminder' | 'visit';
  scheduledFor: string;
  notes?: string;
  status: 'pending' | 'completed' | 'cancelled' | 'rescheduled';
}

interface DayFollowUps {
  [date: string]: FollowUp[];
}

const FollowUpCalendar: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [alertMsg, setAlertMsg] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const showAlertMsg = (type: 'success' | 'error', message: string) => {
    setAlertMsg({ type, message });
    setTimeout(() => setAlertMsg(null), 3000);
  };
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'month' | 'week' | 'day'>('month');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [followUps, setFollowUps] = useState<DayFollowUps>({});
  const [stats, setStats] = useState({ overdue: 0, today: 0, upcoming: 0 });
  const [teamStats, setTeamStats] = useState<any>(null);
  const [showTeamPanel, setShowTeamPanel] = useState(true);

  const loadFollowUps = useCallback(async () => {
    try {
      setLoading(true);

      // Compute first and last day of the current visible month
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth();
      const startDate = new Date(year, month, 1).toISOString().split('T')[0];
      const endDate = new Date(year, month + 1, 0).toISOString().split('T')[0];

      const resp = await followUpApi.getCalendar(startDate, endDate);
      // resp.data.calendar is keyed by "YYYY-MM-DD"; convert to dateString() keys
      const apiCalendar: Record<string, any[]> = resp?.data?.calendar || {};

      const converted: DayFollowUps = {};
      Object.entries(apiCalendar).forEach(([isoDate, items]) => {
        // isoDate is "YYYY-MM-DD"; parse as local date (avoid UTC offset issues)
        const [y, m, d] = isoDate.split('-').map(Number);
        const localDate = new Date(y, m - 1, d);
        const key = localDate.toDateString();
        converted[key] = items.map((item: any) => ({
          _id: item._id,
          leadId: item.leadId?._id || item.leadId,
          leadName: item.leadId?.name || 'Unknown Lead',
          type: item.type,
          scheduledFor: item.scheduledAt,
          notes: item.description || item.notes,
          status: item.status === 'scheduled' ? 'pending' : item.status,
        }));
      });

      // Calculate stats
      const now = new Date();
      let overdue = 0, today = 0, upcoming = 0;
      Object.values(converted).flat().forEach((fu: FollowUp) => {
        const fuDate = new Date(fu.scheduledFor);
        if (fu.status === 'pending') {
          if (fuDate < now && fuDate.toDateString() !== now.toDateString()) {
            overdue++;
          } else if (fuDate.toDateString() === now.toDateString()) {
            today++;
          } else {
            upcoming++;
          }
        }
      });

      setFollowUps(converted);
      setStats({ overdue, today, upcoming });
    } catch (error: any) {
      console.error('Failed to load follow-ups from API, using empty calendar:', error);
      setFollowUps({});
      setStats({ overdue: 0, today: 0, upcoming: 0 });
    } finally {
      setLoading(false);
    }
  }, [currentDate]);

  useEffect(() => {
    loadFollowUps();
  }, [loadFollowUps]);

  // Load team activity stats (admins/staff only)
  useEffect(() => {
    if (!user || user.role === 'STUDENT') return;
    followUpApi.getTeamStats().then(res => {
      if (res?.data) setTeamStats(res.data);
    }).catch(() => {});
  }, [user]);

  const getTypeIcon = (type: string): string => {
    const icons: Record<string, string> = {
      call: '📞',
      whatsapp: '💬',
      email: '📧',
      one_on_one: '💻',
      demo: '🎥',
      meeting: '💻',
      touch_base: '👋',
      payment_reminder: '💳',
      visit: '🏢'
    };
    return icons[type] || '📋';
  };

  const getTypeClass = (type: string): string => {
    if (['call', 'touch_base'].includes(type)) return 'call';
    if (type === 'whatsapp') return 'whatsapp';
    if (['one_on_one', 'demo', 'meeting'].includes(type)) return 'meeting';
    if (type === 'visit') return 'visit';
    if (type === 'payment_reminder') return 'payment';
    return 'call';
  };

  const formatTime = (dateStr: string): string => {
    return new Date(dateStr).toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
  };

  const goToPreviousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const handleComplete = async (followUp: FollowUp) => {
    try {
      await followUpApi.completeFollowUp(followUp._id, {});
      // Optimistically update local state
      setFollowUps(prev => {
        const updated = { ...prev };
        Object.keys(updated).forEach(date => {
          updated[date] = updated[date].map(fu =>
            fu._id === followUp._id ? { ...fu, status: 'completed' as const } : fu
          );
        });
        return updated;
      });
      showAlertMsg('success', 'Follow-up marked as completed');
    } catch (error) {
      showAlertMsg('error', 'Failed to update follow-up');
    }
  };

  const handleViewLead = (leadId: string) => {
    navigate(`/leads/${leadId}`);
  };

  const renderCalendarDays = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();
    const today = new Date();
    
    const days = [];
    
    // Previous month days
    for (let i = firstDay - 1; i >= 0; i--) {
      const date = new Date(year, month - 1, daysInPrevMonth - i);
      days.push({ date, isOtherMonth: true });
    }
    
    // Current month days
    for (let i = 1; i <= daysInMonth; i++) {
      const date = new Date(year, month, i);
      days.push({ date, isOtherMonth: false });
    }
    
    // Next month days
    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i++) {
      const date = new Date(year, month + 1, i);
      days.push({ date, isOtherMonth: true });
    }
    
    return days.map((day, index) => {
      const dateStr = day.date.toDateString();
      const dayFollowUps = followUps[dateStr] || [];
      const isToday = day.date.toDateString() === today.toDateString();
      
      return (
        <div 
          key={index}
          className={`calendar-day ${day.isOtherMonth ? 'other-month' : ''} ${isToday ? 'today' : ''}`}
          onClick={() => {
            setCurrentDate(day.date);
            setView('day');
          }}
        >
          <span className="day-number">{day.date.getDate()}</span>
          <div className="day-followups">
            {dayFollowUps.slice(0, 3).map((fu) => (
              <div key={fu._id} className={`followup-dot ${getTypeClass(fu.type)}`}>
                {getTypeIcon(fu.type)} {fu.leadName.split(' ')[0]}
              </div>
            ))}
            {dayFollowUps.length > 3 && (
              <span className="more-count">+{dayFollowUps.length - 3} more</span>
            )}
          </div>
        </div>
      );
    });
  };

  const renderDayView = () => {
    const dateStr = currentDate.toDateString();
    const dayFollowUps = followUps[dateStr] || [];
    const now = new Date();
    
    // Get overdue from previous days
    const overdue: FollowUp[] = [];
    Object.entries(followUps).forEach(([date, fus]) => {
      const d = new Date(date);
      if (d < now && d.toDateString() !== now.toDateString()) {
        overdue.push(...fus.filter(f => f.status === 'pending'));
      }
    });
    
    const sorted = [...dayFollowUps].sort((a, b) => 
      new Date(a.scheduledFor).getTime() - new Date(b.scheduledFor).getTime()
    );
    
    return (
      <div className="day-view">
        <h2 className="day-header">
          {currentDate.toLocaleDateString('en-US', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          })}
        </h2>
        
        {overdue.length > 0 && (
          <div className="followup-section">
            <h3 className="overdue">⚠️ Overdue ({overdue.length})</h3>
            <div className="followup-list">
              {overdue.map((fu) => (
                <div key={fu._id} className="followup-item overdue">
                  <div className="followup-time">Overdue</div>
                  <div className={`followup-type-icon ${getTypeClass(fu.type)}`}>
                    {getTypeIcon(fu.type)}
                  </div>
                  <div className="followup-details">
                    <div className="followup-lead-name">{fu.leadName}</div>
                    <div className="followup-note">{fu.notes || 'No notes'}</div>
                  </div>
                  <div className="followup-actions">
                    <button className="btn-action" onClick={() => handleViewLead(fu.leadId)}>View</button>
                    <button className="btn-action primary" onClick={() => handleComplete(fu)}>Complete</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {sorted.length > 0 ? (
          <div className="followup-section">
            <h3>Today's Follow-ups ({sorted.length})</h3>
            <div className="followup-list">
              {sorted.map((fu) => (
                <div key={fu._id} className="followup-item">
                  <div className="followup-time">{formatTime(fu.scheduledFor)}</div>
                  <div className={`followup-type-icon ${getTypeClass(fu.type)}`}>
                    {getTypeIcon(fu.type)}
                  </div>
                  <div className="followup-details">
                    <div className="followup-lead-name">{fu.leadName}</div>
                    <div className="followup-note">{fu.notes || 'No notes'}</div>
                  </div>
                  <div className="followup-actions">
                    <button className="btn-action" onClick={() => handleViewLead(fu.leadId)}>View</button>
                    <button className="btn-action primary" onClick={() => handleComplete(fu)}>Complete</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="no-followups">
            <div className="no-followups-icon">📅</div>
            <p>No follow-ups scheduled for this day</p>
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="followup-calendar">
        <div className="calendar-loading">
          <div className="spinner"></div>
          <p>Loading follow-ups...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="followup-calendar">
      {/* Alert banner */}
      {alertMsg && (
        <div className={`fuc-alert ${alertMsg.type}`}>
          {alertMsg.type === 'success' ? '✓ ' : '✕ '}{alertMsg.message}
        </div>
      )}

      <div className="followup-header">
        <h1>Follow-up Calendar</h1>
        <div className="view-toggles">
          <button
            className={`view-toggle ${view === 'month' ? 'active' : ''}`}
            onClick={() => setView('month')}
          >
            Month
          </button>
          <button
            className={`view-toggle ${view === 'day' ? 'active' : ''}`}
            onClick={() => setView('day')}
          >
            Day
          </button>
        </div>
      </div>

      <div className="followup-stats">
        <div className="stat-pill overdue">
          <span className="count">{stats.overdue}</span> Overdue
        </div>
        <div className="stat-pill today">
          <span className="count">{stats.today}</span> Due Today
        </div>
        <div className="stat-pill upcoming">
          <span className="count">{stats.upcoming}</span> Upcoming
        </div>
      </div>

      {/* Team Activity Today — admin/staff only */}
      {teamStats && user?.role !== 'STUDENT' && (
        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, marginBottom: 20, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,.05)' }}>
          <div
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 18px', cursor: 'pointer', background: '#f8fafc', borderBottom: showTeamPanel ? '1px solid #e5e7eb' : 'none' }}
            onClick={() => setShowTeamPanel(v => !v)}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontWeight: 700, fontSize: 14, color: '#1e3a5f' }}>📊 Today's Team Activity</span>
              <span style={{ background: '#dbeafe', color: '#1d4ed8', borderRadius: 10, padding: '2px 10px', fontSize: 12, fontWeight: 700 }}>
                {teamStats.teamTotal.completed} done
              </span>
            </div>
            <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
              <span style={{ fontSize: 13, color: '#6b7280' }}>📞 {teamStats.teamTotal.calls} calls &nbsp;💬 {teamStats.teamTotal.whatsapp} WA &nbsp;📧 {teamStats.teamTotal.emails} email</span>
              <span style={{ color: '#9ca3af', fontSize: 14 }}>{showTeamPanel ? '▲' : '▼'}</span>
            </div>
          </div>
          {showTeamPanel && (
            <div style={{ padding: '0 0 4px' }}>
              {teamStats.users.length === 0 ? (
                <div style={{ padding: '16px 20px', color: '#9ca3af', fontSize: 13 }}>No follow-ups completed yet today.</div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                      <th style={{ padding: '8px 18px', textAlign: 'left', color: '#6b7280', fontWeight: 600 }}>Team Member</th>
                      <th style={{ padding: '8px 12px', textAlign: 'center', color: '#16a34a', fontWeight: 600 }}>✅ Done</th>
                      <th style={{ padding: '8px 12px', textAlign: 'center', color: '#2563eb', fontWeight: 600 }}>📞 Calls</th>
                      <th style={{ padding: '8px 12px', textAlign: 'center', color: '#7c3aed', fontWeight: 600 }}>💬 WA</th>
                      <th style={{ padding: '8px 12px', textAlign: 'center', color: '#0891b2', fontWeight: 600 }}>📧 Email</th>
                      <th style={{ padding: '8px 12px', textAlign: 'center', color: '#d97706', fontWeight: 600 }}>⏳ Pending</th>
                      <th style={{ padding: '8px 12px', textAlign: 'center', color: '#dc2626', fontWeight: 600 }}>❌ Missed</th>
                    </tr>
                  </thead>
                  <tbody>
                    {teamStats.users.map((u: any, i: number) => (
                      <tr key={u.userId} style={{ borderBottom: '1px solid #f3f4f6', background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                        <td style={{ padding: '10px 18px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{ width: 30, height: 30, borderRadius: '50%', background: '#dbeafe', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13, color: '#1d4ed8', flexShrink: 0 }}>
                              {u.name[0]?.toUpperCase()}
                            </div>
                            <div>
                              <div style={{ fontWeight: 600, color: '#111827' }}>{u.name}</div>
                              <div style={{ fontSize: 11, color: '#9ca3af' }}>{u.email}</div>
                            </div>
                          </div>
                        </td>
                        <td style={{ textAlign: 'center', fontWeight: 700, color: '#16a34a' }}>{u.completedTotal}</td>
                        <td style={{ textAlign: 'center', color: '#2563eb' }}>{u.calls || 0}</td>
                        <td style={{ textAlign: 'center', color: '#7c3aed' }}>{u.whatsapp || 0}</td>
                        <td style={{ textAlign: 'center', color: '#0891b2' }}>{u.emails || 0}</td>
                        <td style={{ textAlign: 'center', color: '#d97706' }}>{u.scheduledToday || 0}</td>
                        <td style={{ textAlign: 'center', color: '#dc2626' }}>{u.missed || 0}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>
      )}

      <div className="calendar-container">
        <div className="calendar-header">
          <div className="calendar-nav">
            <button onClick={goToPreviousMonth}>&#8249; Prev</button>
            <h2>
              {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </h2>
            <button onClick={goToNextMonth}>Next &#8250;</button>
          </div>
          <button className="btn-today" onClick={goToToday}>Today</button>
        </div>

        {view === 'month' ? (
          <div className="calendar-grid">
            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
              <div key={i} className="calendar-weekday">{day}</div>
            ))}
            {renderCalendarDays()}
          </div>
        ) : (
          renderDayView()
        )}
      </div>
    </div>
  );
};

export default FollowUpCalendar;
