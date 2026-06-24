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

// Circular readiness gauge (conic-gradient ring).
const Gauge: React.FC<{ value: number }> = ({ value }) => {
  const v = Math.max(0, Math.min(100, value));
  return (
    <div style={{ width: 168, height: 168, borderRadius: '50%', background: `conic-gradient(${TEAL} 0% ${v}%, #e9ecf4 ${v}% 100%)`, display: 'grid', placeItems: 'center', margin: '0 auto' }}>
      <div style={{ width: 132, height: 132, borderRadius: '50%', background: '#fff', display: 'grid', placeItems: 'center', boxShadow: 'inset 0 2px 6px rgba(0,0,0,.05)' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 42, fontWeight: 800, lineHeight: 1, background: `linear-gradient(90deg,${PURPLE},${TEAL})`, WebkitBackgroundClip: 'text', backgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{v}%</div>
          <div style={{ fontSize: 11.5, color: MUTED, marginTop: 4, fontWeight: 600 }}>job-ready</div>
        </div>
      </div>
    </div>
  );
};

const Result: React.FC = () => {
  const { token = '' } = useParams();
  const [data, setData] = useState<ResultData | null>(null);
  const [err, setErr] = useState('');

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
  const weakest = [...data.subScores].sort((a, b) => a.percentage - b.percentage).slice(0, 3);

  const card: React.CSSProperties = { background: '#fff', border: '1px solid #e8ecf3', borderRadius: 16, padding: 22, marginBottom: 16, boxShadow: '0 2px 10px rgba(16,24,40,.05)' };

  return (
    <div className="as-root">
      <div className="as-wrap" style={{ maxWidth: 620 }}>
        <div className="as-brand"><span className="as-dot" /><b>CodeBegun</b><span>Compass</span></div>

        {/* Hero — readiness gauge */}
        <div style={{ ...card, textAlign: 'center', background: `linear-gradient(135deg,#faf9ff,#f3fdfb)` }}>
          <div style={{ fontSize: 13.5, color: MUTED, fontWeight: 600 }}>{name ? `${name}, here's where you stand` : 'Here is where you stand'}</div>
          <div style={{ margin: '16px 0 10px' }}><Gauge value={readiness} /></div>
          {data.percentile != null && (
            <div style={{ display: 'inline-block', background: '#eafaf7', color: '#0a8d7a', border: '1px solid #bfeee5', borderRadius: 20, padding: '5px 14px', fontSize: 12.5, fontWeight: 700 }}>
              Ahead of {data.percentile}% of peers in your segment
            </div>
          )}
        </div>

        {/* Salary potential */}
        {rm?.salaryBand && (
          <div style={{ ...card, textAlign: 'center', background: `linear-gradient(120deg,${NAVY},${PURPLE})`, color: '#fff', border: 'none' }}>
            <div style={{ fontSize: 12.5, opacity: .85, fontWeight: 600 }}>YOUR TARGET POTENTIAL</div>
            <div style={{ fontSize: 30, fontWeight: 800, margin: '6px 0' }}>{rm.salaryBand}</div>
            <div style={{ fontSize: 13.5, opacity: .92 }}>as a {rm.targetRole || 'job-ready developer'}{rm.timelineWeeks ? ` · in ~${rm.timelineWeeks} weeks` : ''}</div>
          </div>
        )}

        {/* Roadmap preview — the plan */}
        {rm && (
          <div style={card}>
            <div style={{ fontSize: 11, fontWeight: 800, color: PURPLE, letterSpacing: .5 }}>YOUR PERSONALIZED PATH</div>
            <h2 style={{ fontSize: 19, fontWeight: 800, color: INK, margin: '5px 0 8px' }}>{rm.planTitle || `Your ${rm.targetRole || ''} roadmap`}</h2>
            {rm.narrative && <p style={{ fontSize: 13.8, lineHeight: 1.6, color: '#374151', margin: 0 }}>{rm.narrative}</p>}
            {!!rm.gaps?.length && (
              <div style={{ marginTop: 14 }}>
                <div style={{ fontSize: 12.5, fontWeight: 700, color: INK, marginBottom: 8 }}>What your plan fixes first:</div>
                {rm.gaps.map((g, i) => (
                  <div key={i} style={{ display: 'flex', gap: 8, fontSize: 13, color: '#374151', marginBottom: 7, lineHeight: 1.45 }}>
                    <span style={{ color: TEAL, fontWeight: 800 }}>→</span><span>{g}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Skill breakdown — gap map */}
        <div style={card}>
          <div style={{ fontSize: 12.5, fontWeight: 700, color: INK, marginBottom: 12 }}>Your skill breakdown</div>
          {data.subScores.map((s) => {
            const weak = s.percentage < 50;
            return (
              <div key={s.dimension} style={{ marginBottom: 11 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.8, marginBottom: 4 }}>
                  <span style={{ color: INK }}>{DIMENSION_LABELS[s.dimension] || s.dimension}{weak && <span style={{ color: '#e8830c', fontWeight: 700 }}> · focus area</span>}</span>
                  <b style={{ color: weak ? '#e8830c' : INK }}>{s.percentage}%</b>
                </div>
                <div style={{ height: 8, background: '#eef1f6', borderRadius: 6, overflow: 'hidden' }}>
                  <div style={{ width: `${s.percentage}%`, height: '100%', borderRadius: 6, background: weak ? '#f59e0b' : `linear-gradient(90deg,${PURPLE},${TEAL})` }} />
                </div>
              </div>
            );
          })}
        </div>

        {/* Curated sampler + CTA — the sell */}
        <div style={{ ...card, background: `linear-gradient(135deg,#f6f4ff,#eafaf7)` }}>
          <div style={{ fontSize: 17, fontWeight: 800, color: INK }}>🎉 Your free preview is ready</div>
          <p style={{ fontSize: 13.5, color: '#374151', margin: '6px 0 12px', lineHeight: 1.55 }}>
            We've created your CodeBegun account and built your plan. Start free now — log in to play your first interactive lesson, try a DSA problem, and sample a mock interview.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 12.3, marginBottom: 16 }}>
            <div style={{ color: '#0a8d7a' }}>✓ First lessons — free</div>
            <div style={{ color: '#0a8d7a' }}>✓ A DSA problem — free</div>
            <div style={{ color: '#0a8d7a' }}>✓ Sample mock question</div>
            <div style={{ color: '#9a3412' }}>🔒 Full plan, mocks &amp; mentor</div>
          </div>
          <button className="as-btn primary" style={{ width: '100%', marginBottom: 10 }} onClick={() => { window.location.href = '/login'; }}>
            Log in &amp; start free →
          </button>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={() => alert('Online unlock (Razorpay) — coming with the paywall.')} style={{ flex: 1, background: `linear-gradient(90deg,${PURPLE},${TEAL})`, color: '#fff', border: 'none', borderRadius: 10, padding: '11px', fontWeight: 800, fontSize: 13, cursor: 'pointer' }}>
              Unlock full plan
            </button>
            <button onClick={() => alert('A mentor will reach out to you shortly.')} style={{ flex: 1, background: '#fff', color: PURPLE, border: `1.5px solid ${PURPLE}`, borderRadius: 10, padding: '11px', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
              Talk to a mentor
            </button>
          </div>
          <p style={{ fontSize: 11.5, color: MUTED, marginTop: 12, textAlign: 'center' }}>Login details were sent to your email &amp; WhatsApp.</p>
        </div>
      </div>
    </div>
  );
};

export default Result;
