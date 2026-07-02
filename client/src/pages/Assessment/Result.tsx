import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { assessmentApi, DIMENSION_LABELS } from '../../api/assessmentApi';
import './assessment.css';

interface SubScore { dimension: string; percentage: number; }
interface ResultData {
  status: string;
  candidateName?: string;
  segment?: string;
  subScores: SubScore[];
  readinessScore?: number;
  percentile?: number;
  roadmap?: { planTitle?: string; gaps?: string[]; narrative?: string; targetRole?: string; salaryBand?: string; timelineWeeks?: number };
}

const PURPLE = '#6650d8', TEAL = '#14a89c', NAVY = '#0a2a5e', INK = '#1f2937', MUTED = '#64748b';

// Warm, honest label for the readiness band.
const readinessBand = (v: number): { label: string; color: string } => {
  if (v >= 80) return { label: 'Job-ready', color: '#0a8d7a' };
  if (v >= 60) return { label: 'Almost there', color: '#14a89c' };
  if (v >= 40) return { label: 'Getting there', color: '#6650d8' };
  if (v >= 20) return { label: 'Strong start', color: '#e8830c' };
  return { label: 'Early days', color: '#e8830c' };
};

// Circular readiness gauge (conic-gradient ring).
const Gauge: React.FC<{ value: number }> = ({ value }) => {
  const v = Math.max(0, Math.min(100, value));
  return (
    <div style={{ width: 176, height: 176, borderRadius: '50%', background: `conic-gradient(${TEAL} 0% ${v}%, #e9ecf4 ${v}% 100%)`, display: 'grid', placeItems: 'center', margin: '0 auto', boxShadow: '0 8px 24px rgba(20,168,156,.15)' }}>
      <div style={{ width: 138, height: 138, borderRadius: '50%', background: '#fff', display: 'grid', placeItems: 'center', boxShadow: 'inset 0 2px 8px rgba(0,0,0,.05)' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 46, fontWeight: 800, lineHeight: 1, background: `linear-gradient(90deg,${PURPLE},${TEAL})`, WebkitBackgroundClip: 'text', backgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{v}%</div>
          <div style={{ fontSize: 11.5, color: MUTED, marginTop: 4, fontWeight: 600, letterSpacing: .3 }}>JOB-READY</div>
        </div>
      </div>
    </div>
  );
};

const Result: React.FC = () => {
  const { token = '' } = useParams();
  const [data, setData] = useState<ResultData | null>(null);
  const [err, setErr] = useState('');
  const [mentorAsked, setMentorAsked] = useState(false);

  useEffect(() => {
    (async () => {
      try { setData(await assessmentApi.getResult(token)); }
      catch (e: any) { setErr(e.message || 'Failed to load your result.'); }
    })();
  }, [token]);

  if (err) return <div className="as-root"><div className="as-wrap"><div className="as-card as-center"><div className="as-err">{err}</div></div></div></div>;
  if (!data) return <div className="as-root"><div className="as-loading"><div className="as-spinner" /></div></div>;

  const readiness = data.readinessScore ?? 0;
  const rm = data.roadmap;
  const name = data.candidateName?.split(' ')[0];
  const band = readinessBand(readiness);

  const card: React.CSSProperties = { background: '#fff', border: '1px solid #e8ecf3', borderRadius: 18, padding: 24, marginBottom: 16, boxShadow: '0 2px 12px rgba(16,24,40,.05)' };
  const eyebrow: React.CSSProperties = { fontSize: 11, fontWeight: 800, color: PURPLE, letterSpacing: .6, textTransform: 'uppercase' };

  return (
    <div className="as-root">
      <div className="as-wrap" style={{ maxWidth: 600 }}>
        <div className="as-brand"><span className="as-dot" /><b>CodeBegun</b><span>Compass</span></div>

        {/* Hero — readiness gauge */}
        <div style={{ ...card, textAlign: 'center', background: 'linear-gradient(135deg,#faf9ff,#f3fdfb)', paddingTop: 30, paddingBottom: 26 }}>
          <div style={{ fontSize: 14, color: INK, fontWeight: 700 }}>{name ? `${name}, here's where you stand` : "Here's where you stand"}</div>
          <div style={{ margin: '20px 0 14px' }}><Gauge value={readiness} /></div>
          <div style={{ display: 'inline-block', background: '#fff', color: band.color, border: `1.5px solid ${band.color}33`, borderRadius: 20, padding: '5px 16px', fontSize: 13, fontWeight: 800 }}>
            {band.label}
          </div>
          {data.percentile != null && (
            <div style={{ marginTop: 12, fontSize: 12.5, color: '#0a8d7a', fontWeight: 700 }}>
              🔼 Ahead of {data.percentile}% of peers in your segment
            </div>
          )}
        </div>

        {/* Salary potential */}
        {rm?.salaryBand && (
          <div style={{ ...card, textAlign: 'center', background: `linear-gradient(125deg,${NAVY},${PURPLE})`, color: '#fff', border: 'none', boxShadow: '0 10px 30px rgba(102,80,216,.28)' }}>
            <div style={{ fontSize: 11.5, opacity: .82, fontWeight: 700, letterSpacing: .6 }}>YOUR TARGET POTENTIAL</div>
            <div style={{ fontSize: 34, fontWeight: 800, margin: '8px 0 4px' }}>{rm.salaryBand}</div>
            <div style={{ fontSize: 13.5, opacity: .92 }}>as a {rm.targetRole || 'job-ready developer'}{rm.timelineWeeks ? ` · in ~${rm.timelineWeeks} weeks` : ''}</div>
          </div>
        )}

        {/* Roadmap preview — the plan */}
        {rm && (
          <div style={card}>
            <div style={eyebrow}>Your personalized path</div>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: INK, margin: '6px 0 8px', lineHeight: 1.25 }}>{rm.planTitle || `Your ${rm.targetRole || ''} roadmap`}</h2>
            {rm.narrative && <p style={{ fontSize: 14, lineHeight: 1.65, color: '#374151', margin: 0 }}>{rm.narrative}</p>}
            {!!rm.gaps?.length && (
              <div style={{ marginTop: 18, background: '#f8fafc', border: '1px solid #eef1f6', borderRadius: 12, padding: '14px 16px' }}>
                <div style={{ fontSize: 12.5, fontWeight: 800, color: INK, marginBottom: 10 }}>What your plan fixes first</div>
                {rm.gaps.map((g, i) => (
                  <div key={i} style={{ display: 'flex', gap: 10, fontSize: 13.2, color: '#374151', marginBottom: i === rm.gaps!.length - 1 ? 0 : 9, lineHeight: 1.5 }}>
                    <span style={{ color: TEAL, fontWeight: 800, flexShrink: 0 }}>→</span><span>{g}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Skill breakdown — gap map */}
        <div style={card}>
          <div style={{ ...eyebrow, marginBottom: 14 }}>Your skill breakdown</div>
          {data.subScores.map((s) => {
            const weak = s.percentage < 50;
            return (
              <div key={s.dimension} style={{ marginBottom: 13 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 5 }}>
                  <span style={{ color: INK, fontWeight: 600 }}>{DIMENSION_LABELS[s.dimension] || s.dimension}{weak && <span style={{ color: '#e8830c', fontWeight: 700 }}> · focus area</span>}</span>
                  <b style={{ color: weak ? '#e8830c' : INK }}>{s.percentage}%</b>
                </div>
                <div style={{ height: 9, background: '#eef1f6', borderRadius: 6, overflow: 'hidden' }}>
                  <div style={{ width: `${s.percentage}%`, height: '100%', borderRadius: 6, background: weak ? 'linear-gradient(90deg,#f59e0b,#fbbf24)' : `linear-gradient(90deg,${PURPLE},${TEAL})`, transition: 'width .6s ease' }} />
                </div>
              </div>
            );
          })}
        </div>

        {/* Curated sampler + CTA — the sell */}
        <div style={{ ...card, background: 'linear-gradient(135deg,#f6f4ff,#eafaf7)', border: '1px solid #e6e2fb' }}>
          <div style={{ fontSize: 18, fontWeight: 800, color: INK }}>🎉 Your free preview is ready</div>
          <p style={{ fontSize: 14, color: '#374151', margin: '8px 0 16px', lineHeight: 1.6 }}>
            We've created your CodeBegun account and built your plan. Log in to play your first interactive lesson, try a DSA problem, and sample a mock interview — free.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 14px', fontSize: 12.8, marginBottom: 20 }}>
            <div style={{ color: '#0a8d7a', fontWeight: 600 }}>✓ First lessons — free</div>
            <div style={{ color: '#0a8d7a', fontWeight: 600 }}>✓ A DSA problem — free</div>
            <div style={{ color: '#0a8d7a', fontWeight: 600 }}>✓ Sample mock question</div>
            <div style={{ color: '#9a3412', fontWeight: 600 }}>🔒 Full plan, mocks &amp; mentor</div>
          </div>

          <button
            onClick={() => { window.location.href = '/login'; }}
            style={{ width: '100%', background: `linear-gradient(90deg,${PURPLE},${TEAL})`, color: '#fff', border: 'none', borderRadius: 12, padding: '15px', fontWeight: 800, fontSize: 15.5, cursor: 'pointer', boxShadow: '0 8px 20px rgba(102,80,216,.3)', marginBottom: 12 }}
          >
            Log in &amp; start free →
          </button>
          <button
            onClick={() => setMentorAsked(true)}
            disabled={mentorAsked}
            style={{ width: '100%', background: '#fff', border: `1.5px solid ${mentorAsked ? '#cbd5e1' : PURPLE}`, borderRadius: 12, padding: '13px', fontWeight: 700, fontSize: 14, cursor: mentorAsked ? 'default' : 'pointer', color: mentorAsked ? '#64748b' : PURPLE }}
          >
            {mentorAsked ? '✓ A mentor will reach out to you' : '💬 Talk to a mentor'}
          </button>

          <p style={{ fontSize: 12, color: MUTED, marginTop: 14, textAlign: 'center', lineHeight: 1.5 }}>
            📩 Your login details were sent to your <b>email</b> &amp; <b>WhatsApp</b>.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Result;
