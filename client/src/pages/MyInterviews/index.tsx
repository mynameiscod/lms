import React, { useState, useEffect } from 'react';
import { scheduledInterviewApi } from '../../api';

const STATUS_COLORS: Record<CriterionStatus, { bg: string; text: string }> = {
  good:    { bg: '#f0fdf4', text: '#16a34a' },
  average: { bg: '#fffbeb', text: '#d97706' },
  poor:    { bg: '#fef2f2', text: '#dc2626' },
};
type CriterionStatus = 'good' | 'average' | 'poor';

const MyInterviewsPage: React.FC = () => {
  const [interviews, setInterviews] = useState<any[]>([]);
  const [feedbacks, setFeedbacks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'upcoming' | 'feedback'>('upcoming');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      scheduledInterviewApi.getMyInterviews(),
      scheduledInterviewApi.getMyFeedback(),
    ]).then(([ivRes, fbRes]) => {
      setInterviews(ivRes.data || []);
      setFeedbacks(fbRes.data || []);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', weekday: 'short' });
  const formatTime = (t: string) => {
    const [h, m] = t.split(':').map(Number);
    return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
  };

  const isUpcoming = (date: string) => new Date(date) >= new Date(new Date().setHours(0, 0, 0, 0));

  const upcomingInterviews = interviews.filter(iv => isUpcoming(iv.date));
  const pastInterviews = interviews.filter(iv => !isUpcoming(iv.date));

  const getScoreColor = (score: number) => score >= 8 ? '#16a34a' : score >= 5 ? '#d97706' : '#dc2626';

  if (loading) return (
    <div style={{ padding: 60, textAlign: 'center', color: '#9ca3af' }}>
      <div style={{ fontSize: 32, marginBottom: 12 }}>⏳</div>
      Loading your interviews…
    </div>
  );

  return (
    <div style={{ padding: '24px', maxWidth: 900, margin: '0 auto' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: '#111827' }}>My Interviews</h1>
        <p style={{ margin: '4px 0 0', color: '#6b7280', fontSize: 14 }}>
          Your scheduled mock interviews and feedback
        </p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '2px solid #e5e7eb', marginBottom: 24 }}>
        {([['upcoming', `Interviews (${interviews.length})`], ['feedback', `Feedback (${feedbacks.length})`]] as const).map(([t, label]) => (
          <button key={t} onClick={() => setTab(t)}
            style={{ padding: '10px 20px', border: 'none', background: 'none', cursor: 'pointer',
              fontWeight: tab === t ? 700 : 500, fontSize: 14,
              color: tab === t ? '#2563eb' : '#6b7280',
              borderBottom: tab === t ? '2px solid #2563eb' : '2px solid transparent',
              marginBottom: -2 }}>
            {label}
          </button>
        ))}
      </div>

      {/* Interviews Tab */}
      {tab === 'upcoming' && (
        <div>
          {interviews.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', border: '2px dashed #e5e7eb',
              borderRadius: 12, color: '#9ca3af' }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>📋</div>
              <p style={{ margin: 0, fontWeight: 600 }}>No interviews scheduled yet</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {upcomingInterviews.length > 0 && (
                <>
                  <h3 style={{ margin: '0 0 4px', fontSize: 14, fontWeight: 600, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Upcoming
                  </h3>
                  {upcomingInterviews.map(iv => (
                    <InterviewCard key={iv._id} iv={iv} formatDate={formatDate} formatTime={formatTime} isUpcoming={true}
                      expanded={expandedId === iv._id} onToggle={() => setExpandedId(expandedId === iv._id ? null : iv._id)} />
                  ))}
                </>
              )}
              {pastInterviews.length > 0 && (
                <>
                  <h3 style={{ margin: '16px 0 4px', fontSize: 14, fontWeight: 600, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Past
                  </h3>
                  {pastInterviews.map(iv => (
                    <InterviewCard key={iv._id} iv={iv} formatDate={formatDate} formatTime={formatTime} isUpcoming={false}
                      expanded={expandedId === iv._id} onToggle={() => setExpandedId(expandedId === iv._id ? null : iv._id)} />
                  ))}
                </>
              )}
            </div>
          )}
        </div>
      )}

      {/* Feedback Tab */}
      {tab === 'feedback' && (
        <div>
          {feedbacks.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', border: '2px dashed #e5e7eb',
              borderRadius: 12, color: '#9ca3af' }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>📝</div>
              <p style={{ margin: 0, fontWeight: 600 }}>No feedback available yet</p>
              <p style={{ margin: '4px 0 0', fontSize: 14 }}>Feedback will appear here once your interviewer releases it</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {feedbacks.map((fb: any) => {
                const iv = fb.interviewId;
                return (
                  <div key={fb._id} style={{ background: '#fff', border: '1px solid #e5e7eb',
                    borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,.06)' }}>
                    {/* Interview header */}
                    <div style={{ background: 'linear-gradient(135deg,#1e3a5f,#2563eb)', padding: '16px 20px', color: '#fff' }}>
                      <div style={{ fontWeight: 700, fontSize: 16 }}>{iv?.title || 'Interview'}</div>
                      <div style={{ fontSize: 13, opacity: 0.85, marginTop: 3 }}>
                        {iv?.date && formatDate(iv.date)} {iv?.time && `at ${formatTime(iv.time)}`}
                        {iv?.interviewerName && ` · ${iv.interviewerName}`}
                      </div>
                    </div>
                    <div style={{ padding: '20px' }}>
                      {fb.attendanceStatus === 'absent' ? (
                        <div style={{ color: '#dc2626', fontWeight: 600 }}>Marked Absent</div>
                      ) : (
                        <>
                          {/* Overall score */}
                          {fb.overallScore != null && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20,
                              background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 10, padding: '12px 16px' }}>
                              <span style={{ fontSize: 14, fontWeight: 600, color: '#0369a1' }}>Overall Score</span>
                              <span style={{ fontSize: 32, fontWeight: 800, color: getScoreColor(fb.overallScore) }}>
                                {fb.overallScore.toFixed(1)}
                              </span>
                              <span style={{ fontSize: 14, color: '#9ca3af' }}>/10</span>
                            </div>
                          )}

                          {/* Per criterion */}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
                            {(fb.criteriaRatings || []).map((r: any) => (
                              <div key={r.key} style={{ display: 'flex', alignItems: 'center', gap: 12,
                                padding: '10px 14px', background: '#f8fafc', borderRadius: 8, border: '1px solid #e5e7eb' }}>
                                <span style={{ minWidth: 140, fontWeight: 600, fontSize: 14, color: '#374151' }}>{r.label}</span>
                                {/* Score bar */}
                                <div style={{ flex: 1, height: 8, background: '#e5e7eb', borderRadius: 4, overflow: 'hidden' }}>
                                  <div style={{ height: '100%', width: `${r.score * 10}%`,
                                    background: getScoreColor(r.score), borderRadius: 4, transition: 'width .4s' }} />
                                </div>
                                <span style={{ fontWeight: 700, fontSize: 16, color: getScoreColor(r.score), minWidth: 28, textAlign: 'right' }}>
                                  {r.score}
                                </span>
                                <span style={{ padding: '2px 10px', borderRadius: 12, fontSize: 12, fontWeight: 600,
                                  background: STATUS_COLORS[r.status as CriterionStatus]?.bg || '#f3f4f6',
                                  color: STATUS_COLORS[r.status as CriterionStatus]?.text || '#374151' }}>
                                  {r.status}
                                </span>
                                {r.comment && <span style={{ fontSize: 13, color: '#6b7280', flex: 1 }}>— {r.comment}</span>}
                              </div>
                            ))}
                          </div>

                          {/* Overall comment */}
                          {fb.overallComment && (
                            <div style={{ background: '#fafaf9', border: '1px solid #e5e7eb', borderRadius: 8,
                              padding: '12px 14px', fontSize: 14, color: '#374151', lineHeight: 1.6 }}>
                              <span style={{ fontWeight: 600, color: '#111827' }}>Interviewer Comments: </span>
                              {fb.overallComment}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// Sub-component for interview card
const InterviewCard: React.FC<{
  iv: any; formatDate: (d: string) => string; formatTime: (t: string) => string;
  isUpcoming: boolean; expanded: boolean; onToggle: () => void;
}> = ({ iv, formatDate, formatTime, isUpcoming, expanded, onToggle }) => {
  const daysUntil = Math.ceil((new Date(iv.date).getTime() - Date.now()) / 86400000);

  return (
    <div style={{ background: '#fff', border: `1px solid ${isUpcoming ? '#bfdbfe' : '#e5e7eb'}`,
      borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,.06)' }}>
      <div style={{ padding: '16px 20px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 16 }}
        onClick={onToggle}>
        {/* Date badge */}
        <div style={{ width: 52, height: 52, borderRadius: 10, background: isUpcoming ? '#eff6ff' : '#f3f4f6',
          border: `1px solid ${isUpcoming ? '#bfdbfe' : '#e5e7eb'}`, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: isUpcoming ? '#2563eb' : '#9ca3af' }}>
            {new Date(iv.date).toLocaleDateString('en-GB', { month: 'short' }).toUpperCase()}
          </span>
          <span style={{ fontSize: 18, fontWeight: 800, color: isUpcoming ? '#1e3a5f' : '#9ca3af', lineHeight: 1.1 }}>
            {new Date(iv.date).getDate()}
          </span>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontWeight: 700, fontSize: 15, color: '#111827' }}>{iv.title}</span>
            {isUpcoming && daysUntil <= 3 && daysUntil >= 0 && (
              <span style={{ padding: '2px 8px', background: '#fef3c7', color: '#d97706',
                borderRadius: 10, fontSize: 11, fontWeight: 700 }}>
                {daysUntil === 0 ? 'Today!' : `In ${daysUntil}d`}
              </span>
            )}
          </div>
          <div style={{ fontSize: 13, color: '#6b7280', marginTop: 3 }}>
            {formatDate(iv.date)} at {formatTime(iv.time)} · {iv.duration} min · {iv.interviewerName}
          </div>
        </div>
        <span style={{ fontSize: 16, color: '#9ca3af', flexShrink: 0 }}>{expanded ? '▲' : '▼'}</span>
      </div>

      {expanded && (
        <div style={{ padding: '0 20px 16px', borderTop: '1px solid #f3f4f6' }}>
          {iv.venue && <p style={{ margin: '10px 0 4px', fontSize: 13, color: '#374151' }}>📍 <strong>Venue:</strong> {iv.venue}</p>}
          {iv.meetLink && (
            <p style={{ margin: '4px 0', fontSize: 13 }}>
              🔗 <a href={iv.meetLink} target="_blank" rel="noreferrer" style={{ color: '#2563eb', fontWeight: 600 }}>Join Meeting</a>
            </p>
          )}
          {iv.description && <p style={{ margin: '8px 0', fontSize: 13, color: '#6b7280', lineHeight: 1.6 }}>{iv.description}</p>}
          {(iv.criteria || []).length > 0 && (
            <div style={{ marginTop: 10 }}>
              <p style={{ margin: '0 0 6px', fontSize: 13, fontWeight: 600, color: '#374151' }}>Topics / Criteria:</p>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {iv.criteria.map((c: any) => (
                  <span key={c.key} style={{ padding: '3px 10px', background: '#f3f4f6', borderRadius: 12,
                    fontSize: 12, fontWeight: 500, color: '#374151' }}>{c.label}</span>
                ))}
              </div>
            </div>
          )}
          {/* Google Calendar link */}
          {(() => {
            const d = new Date(iv.date);
            const [h, m] = iv.time.split(':').map(Number);
            d.setHours(h, m, 0, 0);
            const end = new Date(d.getTime() + iv.duration * 60000);
            const fmt = (dt: Date) => dt.toISOString().replace(/[-:]/g, '').replace('.000Z', 'Z');
            const link = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(iv.title)}&dates=${fmt(d)}/${fmt(end)}&details=${encodeURIComponent(iv.description || '')}&location=${encodeURIComponent(iv.venue || iv.meetLink || '')}`;
            return (
              <a href={link} target="_blank" rel="noreferrer"
                style={{ display: 'inline-block', marginTop: 12, padding: '7px 16px',
                  background: '#eff6ff', color: '#2563eb', borderRadius: 8, fontSize: 13,
                  fontWeight: 600, textDecoration: 'none', border: '1px solid #bfdbfe' }}>
                📅 Add to Google Calendar
              </a>
            );
          })()}
        </div>
      )}
    </div>
  );
};

export default MyInterviewsPage;
