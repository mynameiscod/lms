import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { studentInterviewApi, interviewAnalyticsApi } from '../../api/interviewModuleApi';
import './InterviewFeedbackReport.css';

const SCORE_COLOR = (s: number) => (s >= 70 ? '#10b981' : s >= 40 ? '#f59e0b' : '#ef4444');
const titleCase = (s: string) => (s || '').replace(/([A-Z])/g, ' $1').replace(/^./, c => c.toUpperCase()).trim();
const fmtDate = (d?: string) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';
const fmtTime = (d?: string) => d ? new Date(d).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '';

const READY: Record<string, { t: string; s: string }> = {
  not_ready: { t: 'Not Ready', s: 'Needs more preparation' },
  needs_improvement: { t: 'Needs Improvement', s: 'Keep practicing' },
  almost_ready: { t: 'Almost Ready', s: 'Close to interview-ready' },
  interview_ready: { t: 'Interview Ready', s: "You're well prepared" },
};
const METRIC_ICONS = ['📖', '🧩', '🔀', '💬', '⌨️', '🛠️', '🎯'];

const Gauge: React.FC<{ pct: number }> = ({ pct }) => {
  const cx = 60, cy = 58, r = 50;
  const f = Math.max(0, Math.min(100, pct)) / 100;
  const pt = (frac: number) => { const t = (180 - 180 * frac) * Math.PI / 180; return [cx + r * Math.cos(t), cy - r * Math.sin(t)]; };
  const [ex, ey] = pt(f);
  return (
    <div className="ifr2-gauge">
      <svg width="120" height="66" viewBox="0 0 120 66">
        <path d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`} fill="none" stroke="#eef2f6" strokeWidth="9" strokeLinecap="round" />
        <path d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${ex} ${ey}`} fill="none" stroke={SCORE_COLOR(pct)} strokeWidth="9" strokeLinecap="round" />
      </svg>
      <div className="pct">{pct.toFixed(1)}%</div>
    </div>
  );
};

const Radar: React.FC<{ metrics: { label: string; value: number }[] }> = ({ metrics }) => {
  const N = metrics.length;
  if (N < 3) return null;
  const cx = 135, cy = 130, R = 95;
  const pt = (i: number, rad: number) => { const a = (-90 + i * 360 / N) * Math.PI / 180; return [cx + rad * Math.cos(a), cy + rad * Math.sin(a)]; };
  const grid = (frac: number) => metrics.map((_, i) => pt(i, R * frac).join(',')).join(' ');
  const data = metrics.map((m, i) => pt(i, (Math.max(0, Math.min(10, m.value)) / 10) * R).join(',')).join(' ');
  return (
    <svg width="270" height="260" viewBox="0 0 270 260">
      {[0.25, 0.5, 0.75, 1].map(f => <polygon key={f} points={grid(f)} fill="none" stroke="#e2e8f0" strokeWidth="1" />)}
      {metrics.map((_, i) => { const [x, y] = pt(i, R); return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="#e2e8f0" strokeWidth="1" />; })}
      <polygon points={data} fill="rgba(239,68,68,.18)" stroke="#ef4444" strokeWidth="2" />
      {metrics.map((m, i) => {
        const [x, y] = pt(i, R + 16);
        return <text key={i} x={x} y={y} fontSize="10" fill="#64748b" textAnchor={x < cx - 5 ? 'end' : x > cx + 5 ? 'start' : 'middle'} dominantBaseline="middle">{m.label.length > 16 ? m.label.slice(0, 15) + '…' : m.label}</text>;
      })}
    </svg>
  );
};

const InterviewFeedbackReport: React.FC = () => {
  const { attemptId } = useParams<{ attemptId: string }>();
  const navigate = useNavigate();
  const [attempt, setAttempt] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [openSection, setOpenSection] = useState<number | null>(null);
  const [showRec, setShowRec] = useState(false);

  const isAdminView = typeof window !== 'undefined' && window.location.pathname.includes('/admin/');

  useEffect(() => {
    if (!attemptId) return;
    const req = isAdminView ? interviewAnalyticsApi.getAttemptReport(attemptId) : studentInterviewApi.getReport(attemptId);
    req.then(res => setAttempt(res.data)).catch(() => setPending(true)).finally(() => setLoading(false));
  }, [attemptId, isAdminView]);

  if (loading) return <div className="ifr-loading">Loading report…</div>;
  if (pending || !attempt) {
    return (
      <div className="ifr-empty">
        <h2>Report not ready yet</h2>
        <p>Your interview has been submitted. The feedback report will appear once evaluation is complete.</p>
        <button className="ifr2-back" style={{ marginTop: 16 }} onClick={() => navigate('/student/interviews')}>← Back to Hub</button>
      </div>
    );
  }

  const sections = attempt.sectionAttempts || [];
  const pct = attempt.overallPercentage || 0;
  const ready = READY[attempt.readinessLevel] || READY.needs_improvement;
  const overallBadge = pct >= 70 ? { c: 'good', t: 'Strong' } : pct >= 40 ? { c: 'mid', t: 'Getting There' } : { c: 'bad', t: 'Needs Improvement' };
  const durationMin = attempt.startedAt && attempt.submittedAt
    ? (() => { const s = Math.round((new Date(attempt.submittedAt).getTime() - new Date(attempt.startedAt).getTime()) / 1000); return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`; })()
    : '—';

  // Aggregate category metrics across sections for the radar + bars
  const metricMap: Record<string, number[]> = {};
  sections.forEach((s: any) => {
    const cat = s.communicationScores || s.hrScores || s.technicalScores;
    if (cat) Object.entries(cat).forEach(([k, v]) => { if (typeof v === 'number') (metricMap[k] = metricMap[k] || []).push(v); });
  });
  const metrics = Object.entries(metricMap).map(([k, arr]) => ({ label: titleCase(k), value: arr.reduce((a, b) => a + b, 0) / arr.length })).slice(0, 7);

  const recId = attempt.recordingBunnyVideoId, recLib = attempt.recordingBunnyLibraryId;

  return (
    <div className="ifr2">
      <button className="ifr2-back" onClick={() => navigate(isAdminView ? -1 as any : '/student/interviews')}>← Back to Hub</button>

      <div className="ifr2-top">
        <span className="ic">📄</span>
        <div>
          <h1>Interview Feedback Report</h1>
          <p>{attempt.templateId?.title || 'Interview'} — Attempt #{attempt.attemptNumber}</p>
        </div>
        <div className="ifr2-top-actions">
          <button className="ifr2-btn" onClick={() => window.print()}>⬇ Download Report</button>
          <button className="ifr2-btn primary" onClick={() => { navigator.clipboard?.writeText(window.location.href); alert('Report link copied.'); }}>↗ Share Report</button>
        </div>
      </div>

      {/* Summary strip */}
      <div className="ifr2-card ifr2-summary">
        <div className="ifr2-sum-cell ifr2-gauge-wrap">
          <div>
            <Gauge pct={pct} />
            <div style={{ textAlign: 'center', fontSize: 12, color: '#94a3b8', margin: '2px 0 6px' }}>Overall Score</div>
            <div style={{ textAlign: 'center' }}><span className={`ifr2-badge ${overallBadge.c}`}>{overallBadge.t}</span></div>
          </div>
        </div>
        <div className="ifr2-sum-cell"><span className="ifr2-sum-ic">📶</span><div><div className="ifr2-sum-lbl">Readiness Level</div><div className="ifr2-sum-val">{ready.t}</div><div className="ifr2-sum-sub">{ready.s}</div></div></div>
        <div className="ifr2-sum-cell"><span className="ifr2-sum-ic">⭐</span><div><div className="ifr2-sum-lbl">Total Score</div><div className="ifr2-sum-val">{(attempt.overallScore || 0).toFixed(1)} / {attempt.overallMaxScore || 0}</div></div></div>
        <div className="ifr2-sum-cell"><span className="ifr2-sum-ic">📅</span><div><div className="ifr2-sum-lbl">Started At</div><div className="ifr2-sum-val">{fmtDate(attempt.startedAt)}</div><div className="ifr2-sum-sub">{fmtTime(attempt.startedAt)}</div></div></div>
        <div className="ifr2-sum-cell"><span className="ifr2-sum-ic">📅</span><div><div className="ifr2-sum-lbl">Submitted At</div><div className="ifr2-sum-val">{fmtDate(attempt.submittedAt)}</div><div className="ifr2-sum-sub">{fmtTime(attempt.submittedAt)}</div></div></div>
        <div className="ifr2-sum-cell"><span className="ifr2-sum-ic">⏱</span><div><div className="ifr2-sum-lbl">Duration</div><div className="ifr2-sum-val">{durationMin}</div><div className="ifr2-sum-sub">Minutes</div></div></div>
        <div className="ifr2-sum-cell"><span className="ifr2-sum-ic">🎥</span><div><div className="ifr2-sum-lbl">Recording</div>
          {recId ? <><div className="ifr2-sum-val ifr2-rec-link">Video saved ✓</div><div className="ifr2-rec-sub" onClick={() => setShowRec(true)}>Click to view</div></>
            : <div className="ifr2-sum-val" style={{ color: '#94a3b8' }}>—</div>}
        </div></div>
      </div>

      {/* Overall feedback */}
      {attempt.overallFeedback && (
        <div className="ifr2-fb">
          <span className="bulb">💡</span>
          <div><h3>Overall Feedback</h3><p>{attempt.overallFeedback}</p></div>
        </div>
      )}

      {/* Strengths / Areas */}
      <div className="ifr2-two-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        <div className="ifr2-card ifr2-two s">
          <h3>💪 Top Strengths</h3>
          {(attempt.topStrengths || []).length ? attempt.topStrengths.map((s: string, i: number) => (
            <div key={i} className="ifr2-li"><span className="b" style={{ color: '#16a34a' }}>✓</span>{s}</div>
          )) : <div className="ifr2-li" style={{ color: '#94a3b8' }}>No notable strengths recorded.</div>}
        </div>
        <div className="ifr2-card ifr2-two i">
          <h3>🎯 Areas to Improve</h3>
          {(attempt.topWeaknesses || []).length ? attempt.topWeaknesses.map((s: string, i: number) => (
            <div key={i} className="ifr2-li"><span className="b" style={{ color: '#dc2626' }}>!</span>{s}</div>
          )) : <div className="ifr2-li" style={{ color: '#94a3b8' }}>No major gaps recorded.</div>}
        </div>
      </div>

      {/* Section-wise results */}
      <div className="ifr2-sec-title">Section-wise Results</div>
      <div className="ifr2-card" style={{ padding: 0 }}>
        <div className="ifr2-sec-head"><span>SECTION</span><span>TYPE</span><span>QUESTIONS</span><span>SCORE</span><span>PERFORMANCE</span><span /></div>
        {sections.map((sec: any, idx: number) => {
          const sPct = sec.percentage ?? (sec.maxScore > 0 ? (sec.totalScore / sec.maxScore) * 100 : 0);
          const total = (sec.questionResponses || []).length;
          const ans = (sec.questionResponses || []).filter((q: any) => q.status === 'answered').length;
          const badge = sPct >= 70 ? { c: 'good', t: 'Strong' } : sPct >= 40 ? { c: 'mid', t: 'Average' } : { c: 'bad', t: 'Needs Improvement' };
          return (
            <div key={idx}>
              <div className="ifr2-sec-row" onClick={() => setOpenSection(openSection === idx ? null : idx)}>
                <span style={{ fontWeight: 600 }}>Section {idx + 1}: {sec.sectionTitle}</span>
                <span><span className="ifr2-chip">{titleCase(sec.sectionType)}</span></span>
                <span>{ans} / {total}</span>
                <span className="ifr2-bar"><span style={{ color: SCORE_COLOR(sPct), fontWeight: 700, minWidth: 44 }}>{sPct.toFixed(1)}%</span><span className="track"><span className="fill" style={{ width: `${sPct}%`, background: SCORE_COLOR(sPct) }} /></span><span className="raw">({(sec.totalScore || 0).toFixed(1)} / {sec.maxScore || 0})</span></span>
                <span><span className={`ifr2-badge ${badge.c}`}>{badge.t}</span></span>
                <span style={{ color: '#94a3b8' }}>{openSection === idx ? '▲' : '▼'}</span>
              </div>
              {openSection === idx && (
                <div className="ifr2-sec-body">
                  {(sec.questionResponses || []).map((q: any, qi: number) => (
                    <div key={qi} className="ifr-question">
                      <div className="ifr-q-header">
                        <span className="ifr-q-num">Q{qi + 1}</span>
                        <span className="ifr-q-text">{q.questionText}</span>
                        <span className="ifr-q-score" style={{ color: SCORE_COLOR(q.maxScore > 0 ? (q.score / q.maxScore) * 100 : 0) }}>{(q.score || 0).toFixed(1)}/{q.maxScore || 0}</span>
                      </div>
                      {q.answerText && <div className="ifr-q-answer"><strong>Your Answer:</strong><p>{q.answerText}</p></div>}
                      {q.answerCode && <div className="ifr-q-answer"><strong>Your Code:</strong><pre>{q.answerCode}</pre></div>}
                      {q.selectedMCQOption && <div className="ifr-q-answer"><strong>Selected:</strong> {q.selectedMCQOption}</div>}
                      {q.status === 'skipped' && <div className="ifr-q-skipped">⏭ Skipped</div>}
                      {q.correctAnswer && <div className="ifr-q-correct"><strong>✅ Correct Answer:</strong> {q.correctAnswer}</div>}
                      {q.sampleStrongAnswer && <div className="ifr-q-correct"><strong>💡 Model Answer:</strong><p>{q.sampleStrongAnswer}</p></div>}
                      {q.expectedAnswerPoints?.length > 0 && <div className="ifr-q-keypoints"><strong>Key points expected:</strong><ul>{q.expectedAnswerPoints.map((p: string, i: number) => <li key={i}>{p}</li>)}</ul></div>}
                      {q.feedback && <div className="ifr-q-feedback"><strong>Feedback:</strong> {q.feedback}</div>}
                      {q.strengths?.length > 0 && <div className="ifr-q-breakdown">{q.strengths.map((s: string, i: number) => <span key={i} className="ifr-breakdown-chip" style={{ background: '#dcfce7', color: '#166534' }}>✓ {s}</span>)}</div>}
                      {q.weaknesses?.length > 0 && <div className="ifr-q-breakdown">{q.weaknesses.map((s: string, i: number) => <span key={i} className="ifr-breakdown-chip" style={{ background: '#fee2e2', color: '#991b1b' }}>△ {s}</span>)}</div>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Performance breakdown + recommendations */}
      <div className="ifr2-perf" style={{ marginTop: 16 }}>
        {metrics.length >= 3 && (
          <div className="ifr2-card">
            <h3>📊 Performance Breakdown</h3>
            <div className="ifr2-perf" style={{ gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="ifr2-radar"><Radar metrics={metrics} /></div>
              <div className="ifr2-metrics">
                {metrics.map((m, i) => (
                  <div key={i} className="ifr2-metric">
                    <span className="mic">{METRIC_ICONS[i % METRIC_ICONS.length]}</span>
                    <span className="name">{m.label}</span>
                    <span className="track"><span className="fill" style={{ width: `${(m.value / 10) * 100}%` }} /></span>
                    <span className="val">{m.value.toFixed(1)}/10</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
        <div className="ifr2-card ifr2-rec">
          <h3>📚 Recommended Practice Areas</h3>
          {(attempt.recommendedPracticeAreas || []).length ? (
            <ul>{attempt.recommendedPracticeAreas.map((r: string, i: number) => <li key={i}>{titleCase(r)}</li>)}</ul>
          ) : <p style={{ color: '#94a3b8', fontSize: 13 }}>No specific recommendations — keep practicing across all sections.</p>}
        </div>
      </div>

      {/* Pro tip */}
      <div className="ifr2-tip" style={{ marginTop: 16 }}>
        <span>🎯</span><span><b>Pro Tip:</b> Focus on understanding the “why” behind each concept and practise explaining with real examples. Quality over quantity in interview preparation!</span>
      </div>

      {/* Recording modal */}
      {showRec && recId && recLib && (
        <div className="ifr2-overlay" onClick={() => setShowRec(false)}>
          <div className="ifr2-vidbox" onClick={e => e.stopPropagation()}>
            <div className="h">🎥 Interview Recording <button onClick={() => setShowRec(false)} style={{ border: 'none', background: 'none', fontSize: 20, cursor: 'pointer', color: '#94a3b8' }}>×</button></div>
            <div style={{ position: 'relative', paddingTop: '56.25%' }}>
              <iframe title="recording" src={`https://iframe.mediadelivery.net/embed/${recLib}/${recId}`} loading="lazy" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 0 }} allow="autoplay;encrypted-media;picture-in-picture" allowFullScreen />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InterviewFeedbackReport;
