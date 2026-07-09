import React, { useEffect, useState } from 'react';
import { placementDriveApi } from '../../api';
import './MyApplications.css';

type AppStatus = 'applied' | 'shortlisted' | 'selected' | 'rejected' | 'placed';
type DriveStatus = 'upcoming' | 'ongoing' | 'completed' | 'cancelled';

interface Round {
  name: string;
  date?: string;
  venue?: string;
  description?: string;
}

interface Application {
  _id: string;
  companyName: string;
  companyLogo?: string;
  role: string;
  ctcMin?: number;
  ctcMax?: number;
  location?: string;
  driveType: string;
  driveDate?: string;
  applyDeadline?: string;
  status: AppStatus;
  rounds: Round[];
  driveStatus: DriveStatus;
}

const STATUS_CONFIG: Record<AppStatus, { label: string; cls: string }> = {
  applied:     { label: 'Applied',     cls: 'ma-badge-applied' },
  shortlisted: { label: 'Shortlisted', cls: 'ma-badge-shortlisted' },
  selected:    { label: 'Selected',    cls: 'ma-badge-selected' },
  placed:      { label: 'Placed 🎉',  cls: 'ma-badge-placed' },
  rejected:    { label: 'Rejected',    cls: 'ma-badge-rejected' },
};

const MyApplications: React.FC = () => {
  const [apps, setApps] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<AppStatus | 'all'>('all');

  useEffect(() => {
    (async () => {
      try {
        const res = await placementDriveApi.getMyApplications();
        const json = await res.json();
        if (json.success) setApps(json.data);
        else setError(json.message || 'Failed to load');
      } catch {
        setError('Failed to load applications');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filtered = filter === 'all' ? apps : apps.filter(a => a.status === filter);

  const counts: Record<string, number> = { all: apps.length };
  for (const a of apps) counts[a.status] = (counts[a.status] || 0) + 1;

  if (loading) return <div className="ma-loading"><div className="spinner-border text-primary" /></div>;
  if (error) return <div className="alert alert-danger m-4">{error}</div>;

  return (
    <div className="ma-container">
      <div className="ma-header">
        <h4 className="ma-title">My Applications</h4>
        <p className="ma-subtitle">Track your placement drive applications and status</p>
      </div>

      {/* Quick stats */}
      <div className="ma-stats-row">
        {[
          { key: 'all', label: 'Total' },
          { key: 'applied', label: 'Applied' },
          { key: 'shortlisted', label: 'Shortlisted' },
          { key: 'selected', label: 'Selected' },
          { key: 'placed', label: 'Placed' },
          { key: 'rejected', label: 'Rejected' },
        ].map(s => (
          <button
            key={s.key}
            className={`ma-stat-btn${filter === s.key ? ' active' : ''}`}
            onClick={() => setFilter(s.key as any)}
          >
            <span className="ma-stat-count">{counts[s.key] || 0}</span>
            <span className="ma-stat-lbl">{s.label}</span>
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="ma-empty">
          <div className="ma-empty-icon">📋</div>
          <p>{filter === 'all' ? "You haven't applied to any drives yet." : `No applications with status "${filter}".`}</p>
        </div>
      ) : (
        <div className="ma-list">
          {filtered.map(app => {
            const sc = STATUS_CONFIG[app.status] || STATUS_CONFIG.applied;
            const isExpanded = expandedId === app._id;
            return (
              <div key={app._id} className={`ma-card${isExpanded ? ' ma-card-expanded' : ''}`}>
                <div className="ma-card-top" onClick={() => setExpandedId(isExpanded ? null : app._id)}>
                  <div className="ma-company-logo">
                    {app.companyLogo
                      ? <img src={app.companyLogo} alt={app.companyName} />
                      : <span>{app.companyName[0]}</span>
                    }
                  </div>
                  <div className="ma-card-info">
                    <div className="ma-company-name">{app.companyName}</div>
                    <div className="ma-role">{app.role}</div>
                    <div className="ma-meta">
                      {app.location && <span>📍 {app.location}</span>}
                      {app.ctcMax ? <span>💰 {app.ctcMin ? `${app.ctcMin}–` : ''}{app.ctcMax} LPA</span> : null}
                      <span className="text-capitalize">🏢 {app.driveType}</span>
                      {app.driveDate && <span>📅 {new Date(app.driveDate).toLocaleDateString()}</span>}
                    </div>
                  </div>
                  <div className="ma-card-right">
                    <span className={`ma-status-badge ${sc.cls}`}>{sc.label}</span>
                    <span className={`ma-drive-badge ma-drive-${app.driveStatus}`}>{app.driveStatus}</span>
                    <button className="ma-expand-btn">{isExpanded ? '▲' : '▼'}</button>
                  </div>
                </div>

                {isExpanded && (
                  <div className="ma-rounds">
                    <h6 className="ma-rounds-title">Interview Rounds</h6>
                    {app.rounds.length === 0 ? (
                      <p className="ma-no-rounds">No rounds scheduled yet.</p>
                    ) : (
                      <div className="ma-timeline">
                        {app.rounds.map((r, i) => (
                          <div key={i} className="ma-tl-item">
                            <div className="ma-tl-dot" />
                            <div className="ma-tl-content">
                              <div className="ma-tl-name">{r.name}</div>
                              {r.date && <div className="ma-tl-detail">📅 {new Date(r.date).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</div>}
                              {r.venue && <div className="ma-tl-detail">📍 {r.venue}</div>}
                              {r.description && <div className="ma-tl-desc">{r.description}</div>}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    {app.applyDeadline && (
                      <div className="ma-deadline">
                        Apply Deadline: <strong>{new Date(app.applyDeadline).toLocaleDateString()}</strong>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default MyApplications;
