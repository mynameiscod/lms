import React from 'react';
import './DailyActivityPanel.css';

interface ActivityItem {
  id: string;
  type: 'note' | 'assignment' | 'announcement' | 'cheatsheet' | 'snippet';
  title: string;
  content: string;
  author: string;
  timestamp: string;
  icon: string;
}

interface DailyActivityPanelProps {
  date: Date;
  activities: ActivityItem[];
}

const DailyActivityPanel: React.FC<DailyActivityPanelProps> = ({ date, activities }) => {
  const getTypeColor = (type: string) => {
    switch (type) {
      case 'note':
        return '#3b82f6';
      case 'assignment':
        return '#f59e0b';
      case 'announcement':
        return '#ef4444';
      case 'cheatsheet':
        return '#10b981';
      case 'snippet':
        return '#8b5cf6';
      default:
        return '#64748b';
    }
  };

  const getTypeLabel = (type: string) => {
    return type.charAt(0).toUpperCase() + type.slice(1);
  };

  return (
    <div className="daily-activity-panel">
      <div className="panel-header">
        <h3>Today's Activity</h3>
        <div className="date-display">
          {date.toLocaleDateString('en-US', { 
            weekday: 'long', 
            month: 'long', 
            day: 'numeric' 
          })}
        </div>
      </div>

      <div className="activities-container">
        {activities.length === 0 ? (
          <div className="no-activity">
            <span className="no-activity-icon">📭</span>
            <p>No activities for this day</p>
          </div>
        ) : (
          activities.map((activity) => (
            <div
              key={activity.id}
              className="activity-card"
              style={{ borderLeftColor: getTypeColor(activity.type) }}
            >
              <div className="activity-header">
                <div className="activity-type-badge" style={{ backgroundColor: getTypeColor(activity.type) }}>
                  <span className="type-icon">{activity.icon}</span>
                  <span className="type-label">{getTypeLabel(activity.type)}</span>
                </div>
                <span className="activity-time">{activity.timestamp}</span>
              </div>

              <h4 className="activity-title">{activity.title}</h4>
              
              <p className="activity-content">{activity.content}</p>

              <div className="activity-footer">
                <span className="activity-author">By {activity.author}</span>
                <button className="view-btn">View Details →</button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default DailyActivityPanel;
