import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { enrollmentPlanApi } from '../../api/enrollmentPlanApi';
import { useAuth } from '../../contexts/AuthContext';
import './MyLearningPlan.css';

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
}

const tileColors = ['#6366f1', '#0ea5e9', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6'];
const tileColor = (s: string) => tileColors[(s?.charCodeAt(0) || 0) % tileColors.length];

export default function MyLearningPlan() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const firstName = (user as any)?.firstName || 'there';

  const [enrollments, setEnrollments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    enrollmentPlanApi.getMyEnrollments()
      .then(setEnrollments)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="lp-page">
        <div className="lp-loading"><div className="lp-spinner" /></div>
      </div>
    );
  }

  return (
    <div className="lp-page">
      <div className="lp-header">
        <div>
          <h1 className="lp-title">My Learning Plans</h1>
          <p className="lp-subtitle">Your enrolled curricula and daily learning plans.</p>
        </div>
      </div>

      {enrollments.length === 0 ? (
        <div className="lp-empty">
          <div className="lp-empty-ic"><i className="fa-solid fa-graduation-cap" /></div>
          <h3>No active learning plans</h3>
          <p>Your instructor will enroll you in a curriculum. Check back soon!</p>
        </div>
      ) : (
        <div className="lp-list">
          {enrollments.map((e: any) => {
            const today = e.todayPlanDay;
            const totalDays = e.totalDays || 145;
            const pct = e.progressPct || 0;
            const doneCount = e.completedDays?.length || 0;
            const daysLeft = today ? totalDays - today : null;
            const itemCount = e.todayPlan?.items?.length || 0;
            const estMins = itemCount > 0
              ? e.todayPlan.items.reduce((sum: number, i: any) => sum + (i.estimatedDuration || 0), 0)
              : 0;
            const initial = (e.curriculumTitle?.[0] || '📘').toUpperCase();

            return (
              <div key={e._id} className="lp-card">
                {/* progress strip */}
                <div className="lp-progress-strip"><div className="lp-progress-fill" style={{ width: `${pct}%` }} /></div>

                <div className="lp-card-body">
                  {/* Top: identity + motivational panel */}
                  <div className="lp-top">
                    <div className="lp-identity">
                      <div className="lp-tile" style={{ background: tileColor(e.curriculumTitle || '') }}>{initial}</div>
                      <div className="lp-identity-text">
                        <h2 className="lp-plan-title">{e.curriculumTitle}</h2>
                        <div className="lp-plan-sub">
                          <span className={`lp-status ${e.status === 'active' ? 'active' : ''}`}>
                            {e.status === 'active' ? '● Active' : e.status}
                          </span>
                          <span className="lp-started">Started on {fmtDate(e.startDate)}</span>
                          {e.batchName && <span className="lp-batch">· {e.batchName}</span>}
                        </div>

                        {/* Stat row */}
                        <div className="lp-stats">
                          <div className="lp-stat">
                            <div className="lp-stat-val">{today || '—'}</div>
                            <div className="lp-stat-label">Today's Day</div>
                          </div>
                          <div className="lp-stat">
                            <div className="lp-stat-val green">{doneCount}</div>
                            <div className="lp-stat-label">Days Completed</div>
                          </div>
                          <div className="lp-stat">
                            <div className="lp-stat-val muted">{totalDays}</div>
                            <div className="lp-stat-label">Total Days</div>
                          </div>
                          <div className="lp-stat">
                            <div className="lp-stat-val blue">{pct}%</div>
                            <div className="lp-stat-label">Progress</div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="lp-motivate">
                      <div className="lp-motivate-text">
                        <div className="lp-motivate-title">Keep going, {firstName}! 🚀</div>
                        <div className="lp-motivate-sub">Consistency today, mastery tomorrow.</div>
                      </div>
                      <div className="lp-motivate-art">🏆</div>
                    </div>
                  </div>

                  {/* Today notice */}
                  {itemCount > 0 ? (
                    <div className="lp-notice info">
                      <span className="lp-notice-ic">📅</span>
                      <span>
                        <strong>Today's Plan — Day {today}:</strong> {itemCount} content item{itemCount !== 1 ? 's' : ''} assigned
                        {estMins > 0 && <span className="lp-notice-est"> · {estMins}m estimated</span>}
                      </span>
                    </div>
                  ) : today ? (
                    <div className="lp-notice warn">
                      <span className="lp-notice-ic">📅</span>
                      <span>No content assigned for Day {today} yet.</span>
                    </div>
                  ) : null}

                  {/* Actions */}
                  <div className="lp-actions">
                    <div className="lp-actions-left">
                      {today && (
                        <button className="lp-btn primary" onClick={() => navigate(`/my-learning/${e._id}/day/${today}`)}>
                          📅 Go to Today (Day {today})
                        </button>
                      )}
                      {doneCount > 0 && (
                        <button className="lp-btn outline" onClick={() => navigate(`/my-learning/${e._id}/day/${Math.min(e.currentDay, totalDays)}`)}>
                          Continue from Day {Math.min(e.currentDay, totalDays)}
                        </button>
                      )}
                      <button className="lp-btn outline" onClick={() => navigate(`/my-learning/${e._id}/day/1`)}>
                        📋 View from Day 1
                      </button>
                    </div>
                    {daysLeft !== null && daysLeft > 0 && (
                      <div className="lp-daysleft">📅 {daysLeft} weekdays remaining</div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
