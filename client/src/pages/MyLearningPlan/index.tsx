import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { enrollmentPlanApi, CurriculumEnrollment } from '../../api/enrollmentPlanApi';

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
}

function weekdayName(d: string) {
  return new Date(d).toLocaleDateString('en-IN', { weekday: 'long', timeZone: 'UTC' });
}

export default function MyLearningPlan() {
  const navigate = useNavigate();
  const [enrollments, setEnrollments] = useState<any[]>([]);
  const [loading, setLoading]         = useState(true);

  useEffect(() => {
    enrollmentPlanApi.getMyEnrollments()
      .then(setEnrollments)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>Loading your learning plans...</div>;
  }

  return (
    <div style={{ padding: '24px', maxWidth: '1000px', margin: '0 auto' }}>
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ margin: 0, fontSize: '24px', fontWeight: 700, color: '#0f172a' }}>
          🎓 My Learning Plans
        </h2>
        <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '14px' }}>
          Your enrolled curricula and daily plans
        </p>
      </div>

      {enrollments.length === 0 ? (
        <div style={{
          textAlign: 'center', padding: '80px 24px',
          background: '#f8fafc', borderRadius: '12px', border: '1.5px dashed #e2e8f0',
        }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>📚</div>
          <h3 style={{ color: '#0f172a', margin: '0 0 8px' }}>No active learning plans</h3>
          <p style={{ color: '#64748b', margin: 0 }}>
            Your instructor will enroll you in a curriculum. Check back soon!
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {enrollments.map((e: any) => {
            const today       = e.todayPlanDay;
            const totalDays   = e.totalDays || 145;
            const pct         = e.progressPct || 0;
            const doneCount   = e.completedDays?.length || 0;
            const isAhead     = today && e.currentDay > today;
            const daysLeft    = today ? totalDays - today : null;

            return (
              <div key={e._id} style={{
                background: '#fff', borderRadius: '12px', border: '1.5px solid #e2e8f0',
                overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
              }}>
                {/* Progress bar */}
                <div style={{ height: '4px', background: '#f1f5f9' }}>
                  <div style={{ height: '4px', background: '#3b82f6', width: `${pct}%`, transition: 'width 0.4s' }} />
                </div>

                <div style={{ padding: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', flexWrap: 'wrap' }}>
                    <div style={{ flex: 1 }}>
                      <h3 style={{ margin: '0 0 4px', fontSize: '18px', fontWeight: 700, color: '#0f172a' }}>
                        {e.curriculumTitle}
                      </h3>
                      {e.batchName && (
                        <span style={{ fontSize: '12px', color: '#64748b' }}>Batch: {e.batchName}</span>
                      )}
                    </div>
                    <span style={{
                      background: '#dcfce7', color: '#15803d', borderRadius: '12px',
                      padding: '4px 12px', fontSize: '12px', fontWeight: 600, flexShrink: 0,
                    }}>
                      {e.status === 'active' ? '● Active' : e.status}
                    </span>
                  </div>

                  {/* Stats */}
                  <div style={{ display: 'flex', gap: '24px', margin: '16px 0', flexWrap: 'wrap' }}>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '22px', fontWeight: 800, color: '#0f172a' }}>{today || '—'}</div>
                      <div style={{ fontSize: '12px', color: '#64748b' }}>Today's Day</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '22px', fontWeight: 800, color: '#10b981' }}>{doneCount}</div>
                      <div style={{ fontSize: '12px', color: '#64748b' }}>Days Completed</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '22px', fontWeight: 800, color: '#94a3b8' }}>{totalDays}</div>
                      <div style={{ fontSize: '12px', color: '#64748b' }}>Total Days</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '22px', fontWeight: 800, color: '#3b82f6' }}>{pct}%</div>
                      <div style={{ fontSize: '12px', color: '#64748b' }}>Progress</div>
                    </div>
                  </div>

                  {/* Today's plan info */}
                  {e.todayPlan ? (
                    <div style={{
                      background: '#eff6ff', borderRadius: '10px', padding: '14px 16px', marginBottom: '16px',
                      border: '1px solid #bfdbfe',
                    }}>
                      <div style={{ fontSize: '13px', fontWeight: 700, color: '#1d4ed8', marginBottom: '4px' }}>
                        📅 Today's Plan — Day {today}
                      </div>
                      <div style={{ fontSize: '13px', color: '#374151' }}>
                        {e.todayPlan.items?.length || 0} content item{e.todayPlan.items?.length !== 1 ? 's' : ''} assigned
                        {e.todayPlan.items?.length > 0 && (
                          <span style={{ marginLeft: '8px', color: '#64748b' }}>
                            · {e.todayPlan.items.reduce((sum: number, i: any) => sum + (i.estimatedDuration || 0), 0)}m estimated
                          </span>
                        )}
                      </div>
                    </div>
                  ) : today ? (
                    <div style={{
                      background: '#fef9c3', borderRadius: '10px', padding: '12px 16px', marginBottom: '16px',
                      border: '1px solid #fde68a', fontSize: '13px', color: '#92400e',
                    }}>
                      No content assigned for Day {today} yet.
                    </div>
                  ) : null}

                  {/* Action buttons */}
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {today && (
                      <button
                        onClick={() => navigate(`/my-learning/${e._id}/day/${today}`)}
                        style={{
                          background: '#0f172a', color: '#fff', border: 'none',
                          borderRadius: '8px', padding: '10px 20px',
                          fontWeight: 600, fontSize: '14px', cursor: 'pointer',
                        }}
                      >
                        📅 Go to Today (Day {today})
                      </button>
                    )}
                    {doneCount > 0 && (
                      <button
                        onClick={() => navigate(`/my-learning/${e._id}/day/${Math.min(doneCount, totalDays)}`)}
                        style={{
                          background: '#f8fafc', color: '#374151', border: '1.5px solid #e2e8f0',
                          borderRadius: '8px', padding: '10px 20px',
                          fontWeight: 600, fontSize: '14px', cursor: 'pointer',
                        }}
                      >
                        Continue from Day {Math.min(e.currentDay, totalDays)}
                      </button>
                    )}
                    <button
                      onClick={() => navigate(`/my-learning/${e._id}/day/1`)}
                      style={{
                        background: '#f8fafc', color: '#374151', border: '1.5px solid #e2e8f0',
                        borderRadius: '8px', padding: '10px 20px',
                        fontWeight: 600, fontSize: '14px', cursor: 'pointer',
                      }}
                    >
                      📋 View from Day 1
                    </button>
                  </div>

                  {/* Start date */}
                  <div style={{ marginTop: '12px', fontSize: '12px', color: '#94a3b8' }}>
                    Started {fmtDate(e.startDate)}
                    {daysLeft !== null && daysLeft > 0 && ` · ${daysLeft} weekdays remaining`}
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
