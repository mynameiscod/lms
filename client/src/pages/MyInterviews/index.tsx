import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { scheduledInterviewApi } from '../../api';
import { studentInterviewApi } from '../../api/interviewModuleApi';

type CriterionStatus = 'good' | 'average' | 'poor';
const STATUS_COLORS: Record<CriterionStatus, { bg: string; text: string }> = {
  good:    { bg: '#f0fdf4', text: '#16a34a' },
  average: { bg: '#fffbeb', text: '#d97706' },
  poor:    { bg: '#fef2f2', text: '#dc2626' },
};

const TypeChip: React.FC<{ ai: boolean }> = ({ ai }) => (
  <span style={{
    fontSize: 11, fontWeight: 700, padding: '2px 9px', borderRadius: 999,
    background: ai ? '#ede9fe' : '#e0f2fe', color: ai ? '#7c3aed' : '#0369a1',
  }}>{ai ? '🤖 AI Virtual' : '🧑‍💼 Mock Interview'}</span>
);

const fmtDate = (d: string) => new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', weekday: 'short' });
const fmtTime = (t: string) => { const [h, m] = String(t).split(':').map(Number); return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`; };
const scoreColor = (s: number) => s >= 8 ? '#16a34a' : s >= 5 ? '#d97706' : '#dc2626';

const MyInterviews: React.FC = () => {
  const navigate = useNavigate();
  const [assignments, setAssignments] = useState<any[]>([]);   // AI assignments
  const [attempts, setAttempts] = useState<any[]>([]);          // AI attempts (results)
  const [interviews, setInterviews] = useState<any[]>([]);      // mock scheduled
  const [feedbacks, setFeedbacks] = useState<any[]>([]);        // mock feedback (released)
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'upcoming' | 'results'>('upcoming');

  useEffect(() => {
    Promise.all([
      studentInterviewApi.getAssignments().catch(() => ({})),
      studentInterviewApi.getAttempts().catch(() => ({})),
      scheduledInterviewApi.getMyInterviews().catch(() => ({})),
      scheduledInterviewApi.getMyFeedback().catch(() => ({})),
    ]).then(([aRes, atRes, ivRes, fbRes]: any[]) => {
      setAssignments(aRes.data || aRes.assignments || []);
      setAttempts(atRes.attempts || atRes.data || []);
      setInterviews(ivRes.data || []);
      setFeedbacks(fbRes.data || []);
    }).finally(() => setLoading(false));
  }, []);

  const today0 = new Date(new Date().setHours(0, 0, 0, 0)).getTime();
  const aiActive = assignments.filter(a => a.status === 'assigned' || a.status === 'in_progress');
  const aiReports = attempts.filter(a => ['completed', 'evaluated', 'result_published'].includes(a.status));
  const mockUpcoming = interviews.filter(iv => new Date(iv.date).getTime() >= today0);
  const mockPast = interviews.filter(iv => new Date(iv.date).getTime() < today0);
  const fbByInterview = new Map(feedbacks.map((f: any) => [String(f.interviewId?._id || f.interviewId), f]));

  const upcomingCount = aiActive.length + mockUpcoming.length;
  const resultsCount = aiReports.length + feedbacks.length;

  if (loading) return <div style={{ padding: 60, textAlign: 'center', color: '#9ca3af' }}><div style={{ fontSize: 32, marginBottom: 12 }}>⏳</div>Loading your interviews…</div>;

  return (
    <div style={{ padding: '12px 6px', maxWidth: 900, margin: '0 auto' }}>
      <div style={{ marginBottom: 18 }}>
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: '#111827' }}>My Interviews</h1>
        <p style={{ margin: '4px 0 0', color: '#6b7280', fontSize: 14 }}>Your AI virtual interviews and in-person mock interviews — and all your results, in one place.</p>
      </div>

      <div style={{ display: 'flex', borderBottom: '2px solid #e5e7eb', marginBottom: 22 }}>
        {([['upcoming', `Upcoming (${upcomingCount})`], ['results', `Results (${resultsCount})`]] as const).map(([t, label]) => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding: '10px 20px', border: 'none', background: 'none', cursor: 'pointer',
            fontWeight: tab === t ? 700 : 500, fontSize: 14, color: tab === t ? '#2563eb' : '#6b7280',
            borderBottom: tab === t ? '2px solid #2563eb' : '2px solid transparent', marginBottom: -2,
          }}>{label}</button>
        ))}
      </div>

      {/* ── Upcoming ─────────────────────────────────────────────── */}
      {tab === 'upcoming' && (
        upcomingCount === 0 ? (
          <Empty icon="📋" title="No interviews coming up" sub="Assigned AI interviews and scheduled mock interviews will appear here." />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* AI assigned */}
            {aiActive.map(a => (
              <div key={a._id} style={card}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={iconTile('#ede9fe')}>🤖</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: 700, fontSize: 15, color: '#111827' }}>{a.templateId?.title || 'AI Interview'}</span>
                      <TypeChip ai />
                    </div>
                    <div style={{ fontSize: 13, color: '#6b7280', marginTop: 3 }}>
                      {a.templateId?.totalDuration ? `${a.templateId.totalDuration} min · ` : ''}Attempts {a.attemptsUsed ?? 0}/{a.maxAttempts ?? 1}
                      {a.dueDate ? ` · Due ${new Date(a.dueDate).toLocaleDateString()}` : ''}
                    </div>
                  </div>
                  <button
                    style={{ ...primaryBtn, opacity: a.attemptsUsed >= a.maxAttempts ? 0.5 : 1 }}
                    disabled={a.attemptsUsed >= a.maxAttempts}
                    onClick={() => navigate(`/student/interviews/live/${a.templateId?._id || a.templateId}?assignmentId=${a._id}`)}
                  >{a.status === 'in_progress' ? 'Resume →' : a.attemptsUsed > 0 ? 'Reattempt →' : 'Start →'}</button>
                </div>
              </div>
            ))}

            {/* Mock upcoming */}
            {mockUpcoming.map(iv => <MockCard key={iv._id} iv={iv} />)}
          </div>
        )
      )}

      {/* ── Results ──────────────────────────────────────────────── */}
      {tab === 'results' && (
        resultsCount === 0 && mockPast.length === 0 ? (
          <Empty icon="📝" title="No results yet" sub="Your AI reports and interviewer feedback will show up here." />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* AI reports */}
            {aiReports.map(att => (
              <div key={att._id} style={card}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={iconTile('#ede9fe')}>🤖</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: 700, fontSize: 15, color: '#111827' }}>{att.templateId?.title || 'AI Interview'}</span>
                      <TypeChip ai />
                    </div>
                    <div style={{ fontSize: 13, color: '#6b7280', marginTop: 3 }}>
                      Score {att.overallPercentage != null ? `${att.overallPercentage.toFixed(0)}%` : '—'} · {att.startedAt ? new Date(att.startedAt).toLocaleDateString() : ''}
                    </div>
                  </div>
                  <button style={primaryBtn} onClick={() => navigate(`/student/interviews/report/${att._id}`)}>View Report →</button>
                </div>
              </div>
            ))}

            {/* Mock feedback (released) */}
            {feedbacks.map((fb: any) => <FeedbackCard key={fb._id} fb={fb} />)}

            {/* Past mock awaiting feedback */}
            {mockPast.filter(iv => !fbByInterview.has(String(iv._id))).map(iv => (
              <div key={iv._id} style={card}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={iconTile('#e0f2fe')}>🧑‍💼</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: 700, fontSize: 15, color: '#111827' }}>{iv.title}</span>
                      <TypeChip ai={false} />
                    </div>
                    <div style={{ fontSize: 13, color: '#6b7280', marginTop: 3 }}>{fmtDate(iv.date)} · {iv.interviewerName}</div>
                  </div>
                  <span style={{ fontSize: 13, color: '#9ca3af', fontWeight: 600 }}>Awaiting feedback</span>
                </div>
              </div>
            ))}
          </div>
        )
      )}
    </div>
  );
};

// ── Mock interview card (upcoming) ───────────────────────────────────────────
const MockCard: React.FC<{ iv: any }> = ({ iv }) => {
  const [open, setOpen] = useState(false);
  const daysUntil = Math.ceil((new Date(iv.date).getTime() - Date.now()) / 86400000);
  return (
    <div style={card}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }} onClick={() => setOpen(o => !o)}>
        <div style={{ ...iconTile('#e0f2fe'), flexDirection: 'column', fontSize: 11 }}>
          <span style={{ fontWeight: 700, color: '#0369a1' }}>{new Date(iv.date).toLocaleDateString('en-GB', { month: 'short' }).toUpperCase()}</span>
          <span style={{ fontSize: 17, fontWeight: 800, color: '#1e3a5f', lineHeight: 1 }}>{new Date(iv.date).getDate()}</span>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontWeight: 700, fontSize: 15, color: '#111827' }}>{iv.title}</span>
            <TypeChip ai={false} />
            {daysUntil <= 3 && daysUntil >= 0 && <span style={{ padding: '2px 8px', background: '#fef3c7', color: '#d97706', borderRadius: 10, fontSize: 11, fontWeight: 700 }}>{daysUntil === 0 ? 'Today!' : `In ${daysUntil}d`}</span>}
          </div>
          <div style={{ fontSize: 13, color: '#6b7280', marginTop: 3 }}>{fmtDate(iv.date)} at {fmtTime(iv.time)} · {iv.duration} min · {iv.interviewerName}</div>
        </div>
        {iv.meetLink && <a href={iv.meetLink} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()} style={{ ...primaryBtn, textDecoration: 'none' }}>Join →</a>}
        <span style={{ color: '#9ca3af' }}>{open ? '▲' : '▼'}</span>
      </div>
      {open && (
        <div style={{ borderTop: '1px solid #f3f4f6', marginTop: 12, paddingTop: 12 }}>
          {iv.venue && <p style={{ margin: '0 0 4px', fontSize: 13, color: '#374151' }}>📍 <strong>Venue:</strong> {iv.venue}</p>}
          {iv.description && <p style={{ margin: '6px 0', fontSize: 13, color: '#6b7280', lineHeight: 1.6 }}>{iv.description}</p>}
          {(iv.criteria || []).length > 0 && (
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
              {iv.criteria.map((c: any) => <span key={c.key} style={{ padding: '3px 10px', background: '#f3f4f6', borderRadius: 12, fontSize: 12, color: '#374151' }}>{c.label}</span>)}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ── Mock feedback card ───────────────────────────────────────────────────────
const FeedbackCard: React.FC<{ fb: any }> = ({ fb }) => {
  const iv = fb.interviewId;
  return (
    <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,.06)' }}>
      <div style={{ background: 'linear-gradient(135deg,#1e3a5f,#2563eb)', padding: '14px 18px', color: '#fff' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontWeight: 700, fontSize: 16 }}>{iv?.title || 'Mock Interview'}</span>
          <TypeChip ai={false} />
        </div>
        <div style={{ fontSize: 13, opacity: 0.85, marginTop: 3 }}>{iv?.date && fmtDate(iv.date)} {iv?.interviewerName && `· ${iv.interviewerName}`}</div>
      </div>
      <div style={{ padding: 18 }}>
        {fb.attendanceStatus === 'absent' ? <div style={{ color: '#dc2626', fontWeight: 600 }}>Marked Absent</div> : (
          <>
            {fb.overallScore != null && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16, background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 10, padding: '10px 14px' }}>
                <span style={{ fontSize: 14, fontWeight: 600, color: '#0369a1' }}>Overall Score</span>
                <span style={{ fontSize: 30, fontWeight: 800, color: scoreColor(fb.overallScore) }}>{fb.overallScore.toFixed(1)}</span>
                <span style={{ fontSize: 14, color: '#9ca3af' }}>/10</span>
              </div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {(fb.criteriaRatings || []).map((r: any) => (
                <div key={r.key} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 12px', background: '#f8fafc', borderRadius: 8, border: '1px solid #e5e7eb' }}>
                  <span style={{ minWidth: 130, fontWeight: 600, fontSize: 13.5, color: '#374151' }}>{r.label}</span>
                  <div style={{ flex: 1, height: 8, background: '#e5e7eb', borderRadius: 4, overflow: 'hidden' }}><div style={{ height: '100%', width: `${r.score * 10}%`, background: scoreColor(r.score), borderRadius: 4 }} /></div>
                  <span style={{ fontWeight: 700, fontSize: 15, color: scoreColor(r.score), minWidth: 26, textAlign: 'right' }}>{r.score}</span>
                  <span style={{ padding: '2px 10px', borderRadius: 12, fontSize: 12, fontWeight: 600, background: STATUS_COLORS[r.status as CriterionStatus]?.bg || '#f3f4f6', color: STATUS_COLORS[r.status as CriterionStatus]?.text || '#374151' }}>{r.status}</span>
                </div>
              ))}
            </div>
            {fb.overallComment && <div style={{ background: '#fafaf9', border: '1px solid #e5e7eb', borderRadius: 8, padding: '12px 14px', fontSize: 14, color: '#374151', lineHeight: 1.6, marginTop: 14 }}><span style={{ fontWeight: 600, color: '#111827' }}>Interviewer Comments: </span>{fb.overallComment}</div>}
          </>
        )}
      </div>
    </div>
  );
};

const Empty: React.FC<{ icon: string; title: string; sub: string }> = ({ icon, title, sub }) => (
  <div style={{ textAlign: 'center', padding: '56px 20px', border: '2px dashed #e5e7eb', borderRadius: 12, color: '#9ca3af' }}>
    <div style={{ fontSize: 40, marginBottom: 12 }}>{icon}</div>
    <p style={{ margin: 0, fontWeight: 600, color: '#374151' }}>{title}</p>
    <p style={{ margin: '4px 0 0', fontSize: 14 }}>{sub}</p>
  </div>
);

const card: React.CSSProperties = { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: '14px 16px', boxShadow: '0 1px 4px rgba(0,0,0,.05)' };
const iconTile = (bg: string): React.CSSProperties => ({ width: 46, height: 46, borderRadius: 11, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 });
const primaryBtn: React.CSSProperties = { background: '#4f46e5', color: '#fff', border: 'none', borderRadius: 9, padding: '9px 16px', fontSize: 13.5, fontWeight: 700, cursor: 'pointer', flexShrink: 0, whiteSpace: 'nowrap' };

export default MyInterviews;
