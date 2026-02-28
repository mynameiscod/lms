import React from 'react';
import './ActivityLog.css';

interface LogEntry {
  id: string;
  action: string;
  message: string;
  timestamp: string;
  icon: string;
}

interface ActivityLogProps {
  logs: LogEntry[];
}

const ActivityLog: React.FC<ActivityLogProps> = ({ logs }) => {
  return (
    <div className="activity-log">
      <div className="log-header">
        <h3>Activity Timeline</h3>
        <span className="log-count">{logs.length} events</span>
      </div>

      <div className="log-timeline">
        {logs.length === 0 ? (
          <div className="no-logs">
            <span className="no-logs-icon">📋</span>
            <p>No activity yet</p>
          </div>
        ) : (
          logs.map((log, index) => (
            <div key={log.id} className="log-entry">
              <div className="log-marker">
                <div className="log-icon">{log.icon}</div>
                {index < logs.length - 1 && <div className="log-line"></div>}
              </div>

              <div className="log-content">
                <div className="log-action">{log.action}</div>
                <div className="log-message">{log.message}</div>
                <div className="log-time">{log.timestamp}</div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default ActivityLog;
