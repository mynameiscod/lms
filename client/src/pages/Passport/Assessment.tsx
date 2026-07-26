import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import passportApi, { AssessQuestion, AssessResult } from '../../api/passportApi';

/**
 * Career Readiness Assessment — the free deterministic entry point. Student answers the
 * MCQ bank one at a time; on submit we score server-side and show the Career Score,
 * category breakdown, strengths/gaps, recommended pathway, and a 7-day preview + ₹499 CTA.
 * Separate from the LMS layout (part of the Passport experience).
 */
const CAT_ICON: Record<string, string> = {
  career_clarity: '🎯', aptitude: '🔢', logical_reasoning: '🧩',
  technical: '💻', communication: '🗣️', employability: '💼',
};

const Assessment: React.FC = () => {
  const nav = useNavigate();
  const [loading, setLoading] = useState(true);
  const [questions, setQuestions] = useState<AssessQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [idx, setIdx] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<AssessResult | null>(null);
  const [retake, setRetake] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const existing = await passportApi.getResult();
        if (existing.result) { setResult(existing.result); setLoading(false); return; }
        const a = await passportApi.getAssessment();
        setQuestions(a.questions);
      } catch (e: any) { setError(e?.response?.data?.message || 'Could not load the assessment.'); }
      setLoading(false);
    })();
  }, []);

  const startFresh = async () => {
    setLoading(true); setResult(null); setRetake(true); setAnswers({}); setIdx(0);
    try { const a = await passportApi.getAssessment(); setQuestions(a.questions); } catch { /* */ }
    setLoading(false);
  };

  const total = questions.length;
  const answeredCount = Object.keys(answers).length;
  const current = questions[idx];
  const progress = total ? Math.round((answeredCount / total) * 100) : 0;
  const canSubmit = answeredCount === total && total > 0;

  const submit = async () => {
    setSubmitting(true); setError('');
    try {
      const payload = Object.entries(answers).map(([questionId, chosen]) => ({ questionId, chosen }));
      const { result: r } = await passportApi.submitAssessment(payload);
      setResult(r); setRetake(false);
    } catch (e: any) { setError(e?.response?.data?.message || 'Submit failed. Try again.'); }
    setSubmitting(false);
  };

  if (loading) return <Shell><div style={{ textAlign: 'center', color: '#64748b', padding: 60 }}>Loading…</div></Shell>;

  if (result && !retake) return <ResultView result={result} onRetake={startFresh} onHome={() => nav('/passport')} />;

  return (
    <Shell>
      <div style={{ maxWidth: 720, margin: '0 auto' }}>
        <button onClick={() => nav('/passport')} style={backBtn}>← Mission Control</button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '10px 0 4px' }}>
          <span style={{ fontSize: 24 }}>🧭</span>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', margin: 0 }}>Career Readiness Assessment</h1>
        </div>
        <p style={{ color: '#64748b', fontSize: 13.5, margin: '0 0 16px' }}>Answer honestly — there are no wrong answers on the self-rating ones. Takes about 5 minutes.</p>

        {/* progress */}
        <div style={{ height: 8, background: '#e9edf5', borderRadius: 99, overflow: 'hidden', marginBottom: 18 }}>
          <div style={{ width: `${progress}%`, height: '100%', background: 'linear-gradient(90deg,#6650d8,#14a89c)', transition: 'width .25s' }} />
        </div>

        {error && <div style={errBox}>{error}</div>}

        {current && (
          <div style={card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94a3b8', fontSize: 12.5, fontWeight: 600, marginBottom: 8 }}>
              <span>{CAT_ICON[current.category] || '•'} {current.category.replace(/_/g, ' ')}</span>
              <span>Question {idx + 1} of {total}</span>
            </div>
            <div style={{ fontSize: 17, fontWeight: 700, color: '#0f172a', marginBottom: 16 }}>{current.text}</div>
            <div style={{ display: 'grid', gap: 10 }}>
              {current.options.map((opt, i) => {
                const chosen = answers[current.id] === i;
                return (
                  <button key={i} onClick={() => setAnswers(a => ({ ...a, [current.id]: i }))}
                    style={{
                      textAlign: 'left', padding: '13px 16px', borderRadius: 11, fontSize: 14.5, cursor: 'pointer',
                      border: chosen ? '2px solid #6650d8' : '1px solid #e2e8f0',
                      background: chosen ? '#f4f2ff' : '#fff', color: '#0f172a', fontWeight: chosen ? 700 : 500,
                    }}>
                    <span style={{ display: 'inline-block', width: 22, height: 22, borderRadius: 99, marginRight: 10, textAlign: 'center', lineHeight: '22px', fontSize: 12, fontWeight: 700, color: chosen ? '#fff' : '#94a3b8', background: chosen ? '#6650d8' : '#eef1f6' }}>{String.fromCharCode(65 + i)}</span>
                    {opt}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* nav */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 18 }}>
          <button disabled={idx === 0} onClick={() => setIdx(i => Math.max(0, i - 1))}
            style={{ ...navBtn, opacity: idx === 0 ? 0.4 : 1, cursor: idx === 0 ? 'default' : 'pointer' }}>← Back</button>
          {idx < total - 1 ? (
            <button disabled={answers[current?.id] === undefined} onClick={() => setIdx(i => i + 1)}
              style={{ ...navBtnPrimary, opacity: answers[current?.id] === undefined ? 0.5 : 1 }}>Next →</button>
          ) : (
            <button disabled={!canSubmit || submitting} onClick={submit}
              style={{ ...navBtnPrimary, opacity: (!canSubmit || submitting) ? 0.5 : 1 }}>
              {submitting ? 'Scoring…' : 'See my Career Score'}
            </button>
          )}
        </div>
        {!canSubmit && idx === total - 1 && <div style={{ textAlign: 'right', fontSize: 12, color: '#94a3b8', marginTop: 6 }}>Answer all {total} questions to submit ({answeredCount}/{total}).</div>}
      </div>
    </Shell>
  );
};

// ── Result ──
const ResultView: React.FC<{ result: AssessResult; onRetake: () => void; onHome: () => void }> = ({ result, onRetake, onHome }) => {
  const scoreColor = result.careerScore >= 75 ? '#14a89c' : result.careerScore >= 45 ? '#6650d8' : '#f59e0b';
  const circumference = 2 * Math.PI * 52;
  const dash = useMemo(() => (result.careerScore / 100) * circumference, [result.careerScore, circumference]);

  return (
    <Shell>
      <div style={{ maxWidth: 760, margin: '0 auto' }}>
        <button onClick={onHome} style={backBtn}>← Mission Control</button>
        <div style={{ ...card, textAlign: 'center', marginTop: 10 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#94a3b8', letterSpacing: 0.5, textTransform: 'uppercase' }}>Your Career Score</div>
          <div style={{ position: 'relative', width: 140, height: 140, margin: '12px auto 6px' }}>
            <svg width="140" height="140">
              <circle cx="70" cy="70" r="52" fill="none" stroke="#eef1f6" strokeWidth="12" />
              <circle cx="70" cy="70" r="52" fill="none" stroke={scoreColor} strokeWidth="12" strokeLinecap="round"
                strokeDasharray={`${dash} ${circumference}`} transform="rotate(-90 70 70)" />
            </svg>
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ fontSize: 38, fontWeight: 800, color: '#0f172a', lineHeight: 1 }}>{result.careerScore}</div>
              <div style={{ fontSize: 12, color: '#94a3b8' }}>/ 100</div>
            </div>
          </div>
          <div style={{ display: 'inline-block', background: scoreColor + '1a', color: scoreColor, fontWeight: 800, fontSize: 14, padding: '5px 14px', borderRadius: 99 }}>{result.level}</div>
          <div style={{ marginTop: 10, fontSize: 14, color: '#475569' }}>Recommended pathway: <b style={{ color: '#0f172a' }}>{result.pathwayLabel}</b></div>
        </div>

        {/* category breakdown */}
        <div style={{ ...card, marginTop: 14 }}>
          <div style={sectionTitle}>Category breakdown</div>
          <div style={{ display: 'grid', gap: 12, marginTop: 10 }}>
            {result.categoryScores.map(c => (
              <div key={c.key}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13.5, marginBottom: 4 }}>
                  <span style={{ color: '#334155', fontWeight: 600 }}>{CAT_ICON[c.key] || '•'} {c.label}</span>
                  <span style={{ color: '#0f172a', fontWeight: 700 }}>{c.score}%</span>
                </div>
                <div style={{ height: 7, background: '#eef1f6', borderRadius: 99, overflow: 'hidden' }}>
                  <div style={{ width: `${c.score}%`, height: '100%', background: c.score >= 60 ? '#14a89c' : c.score >= 35 ? '#6650d8' : '#f59e0b' }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* strengths / gaps */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', gap: 14, marginTop: 14 }}>
          <div style={{ ...card }}>
            <div style={{ ...sectionTitle, color: '#14a89c' }}>💪 Your strengths</div>
            <ul style={listStyle}>{result.strengths.map((s, i) => <li key={i}>{s}</li>)}</ul>
          </div>
          <div style={{ ...card }}>
            <div style={{ ...sectionTitle, color: '#f59e0b' }}>🎯 Focus areas</div>
            <ul style={listStyle}>{result.weaknesses.map((s, i) => <li key={i}>{s}</li>)}</ul>
          </div>
        </div>

        {/* 7-day preview */}
        <div style={{ ...card, marginTop: 14 }}>
          <div style={sectionTitle}>Your first 7 days (preview)</div>
          <div style={{ display: 'grid', gap: 8, marginTop: 10 }}>
            {result.weekPreview.map(d => (
              <div key={d.day} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', padding: '9px 12px', background: '#f8fafc', borderRadius: 10 }}>
                <div style={{ minWidth: 30, height: 30, borderRadius: 8, background: '#ede9fe', color: '#6650d8', fontWeight: 800, fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{d.day}</div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>{d.title}</div>
                  <div style={{ fontSize: 12.5, color: '#64748b' }}>{d.detail}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div style={{ ...card, marginTop: 14, background: 'linear-gradient(120deg,#1e1b4b,#0f766e)', color: '#fff', textAlign: 'center' }}>
          <div style={{ fontSize: 19, fontWeight: 800 }}>Unlock your full 90-day journey</div>
          <p style={{ opacity: 0.85, fontSize: 13.5, maxWidth: 460, margin: '8px auto 16px' }}>
            Daily missions, verified practice, mock interviews, resume &amp; the shareable Career Passport — personalized to your score.
          </p>
          <button onClick={onHome} style={{ background: '#fff', color: '#1e1b4b', border: 'none', borderRadius: 10, padding: '12px 28px', fontWeight: 800, fontSize: 15, cursor: 'pointer' }}>
            Continue to Mission Control
          </button>
          <div style={{ fontSize: 12, opacity: 0.7, marginTop: 10 }}>Membership unlock coming next — your score is saved.</div>
        </div>

        <div style={{ textAlign: 'center', marginTop: 16 }}>
          <button onClick={onRetake} style={{ background: 'none', border: 'none', color: '#6650d8', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>↻ Retake assessment</button>
        </div>
      </div>
    </Shell>
  );
};

const Shell: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{ minHeight: '100vh', background: 'linear-gradient(180deg,#f5f3ff,#f6f7f9)', padding: '28px 20px' }}>{children}</div>
);

const card: React.CSSProperties = { background: '#fff', border: '1px solid #eef1f6', borderRadius: 16, padding: '20px 22px' };
const sectionTitle: React.CSSProperties = { fontSize: 14, fontWeight: 800, color: '#0f172a' };
const listStyle: React.CSSProperties = { margin: '8px 0 0', paddingLeft: 18, color: '#334155', fontSize: 14, lineHeight: 1.8 };
const backBtn: React.CSSProperties = { background: 'none', border: 'none', color: '#6650d8', fontWeight: 600, fontSize: 13, cursor: 'pointer', padding: 0 };
const navBtn: React.CSSProperties = { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: '11px 20px', fontWeight: 700, fontSize: 14, color: '#475569' };
const navBtnPrimary: React.CSSProperties = { background: 'linear-gradient(90deg,#6650d8,#14a89c)', color: '#fff', border: 'none', borderRadius: 10, padding: '11px 22px', fontWeight: 800, fontSize: 14, cursor: 'pointer' };
const errBox: React.CSSProperties = { background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', borderRadius: 10, padding: '10px 14px', fontSize: 13.5, marginBottom: 14 };

export default Assessment;
