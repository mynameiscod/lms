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

const Result: React.FC = () => {
  const { token = '' } = useParams();
  const [data, setData] = useState<ResultData | null>(null);
  const [err, setErr] = useState('');

  useEffect(() => {
    (async () => {
      try {
        setData(await assessmentApi.getResult(token));
      } catch (e: any) {
        setErr(e.message || 'Failed to load your result.');
      }
    })();
  }, [token]);

  if (err) return <div className="as-root"><div className="as-wrap"><div className="as-card as-center"><div className="as-err">{err}</div></div></div></div>;
  if (!data) return <div className="as-root"><div className="as-loading"><div className="as-spinner" /></div></div>;

  const readiness = data.readinessScore ?? 0;
  const topPct = data.percentile != null ? 100 - data.percentile : null;
  const rm = data.roadmap;

  return (
    <div className="as-root">
      <div className="as-wrap">
        <div className="as-brand"><span className="as-dot" /><b>CodeBegun</b><span>Compass</span></div>

        <div className="as-card as-center">
          <div className="as-note">{data.candidateName ? `${data.candidateName}, your` : 'Your'} Readiness Score</div>
          <div className="as-score-big">{readiness}</div>
          <div className="as-score-sub">out of 100{topPct != null ? ` · ahead of ${data.percentile}% of peers` : ''}</div>
        </div>

        <div className="as-card">
          <div className="as-note" style={{ marginBottom: 12, fontWeight: 700, color: 'var(--text)' }}>Your skill breakdown</div>
          <div className="as-dims">
            {data.subScores.map((s) => (
              <div className="as-dim" key={s.dimension}>
                <div className="as-dim-top"><span>{DIMENSION_LABELS[s.dimension] || s.dimension}</span><b>{s.percentage}%</b></div>
                <div className="as-dim-bar"><div className="as-dim-fill" style={{ width: `${s.percentage}%` }} /></div>
              </div>
            ))}
          </div>
        </div>

        {rm ? (
          <div className="as-card">
            <div className="as-note" style={{ marginBottom: 6, fontWeight: 700, color: 'var(--text)' }}>Your roadmap</div>
            {rm.targetRole && <p className="as-qprompt" style={{ fontSize: 15 }}>🎯 {rm.targetRole}{rm.salaryBand ? ` · ${rm.salaryBand}` : ''}{rm.timelineWeeks ? ` · ~${rm.timelineWeeks} weeks` : ''}</p>}
            {rm.narrative && <p className="as-note" style={{ fontSize: 14, lineHeight: 1.6 }}>{rm.narrative}</p>}
            {!!rm.gaps?.length && (
              <div style={{ marginTop: 10 }}>
                {rm.gaps.map((g, i) => <div key={i} className="as-note" style={{ fontSize: 13.5 }}>• {g}</div>)}
              </div>
            )}
          </div>
        ) : (
          <div className="as-card as-center">
            <div className="as-note" style={{ lineHeight: 1.6 }}>
              🚀 Your personalized roadmap is being prepared. One of our mentors will reach out shortly to walk you through your path and unlock your full plan.
            </div>
          </div>
        )}

        <div className="as-card as-center">
          <p className="as-qprompt" style={{ fontSize: 16 }}>Your free account is ready 🎉</p>
          <p className="as-note" style={{ marginBottom: 14 }}>
            We've created your CodeBegun account and enrolled you in your plan. The first days are unlocked free — log in to start. Your login was sent to your email & WhatsApp.
          </p>
          <button className="as-btn primary" onClick={() => { window.location.href = '/login'; }}>Log in & start my plan →</button>
          <p className="as-note" style={{ marginTop: 12 }}>Want the full plan, code labs, and mock interviews unlocked? A mentor will reach out — or ask us anytime.</p>
        </div>
      </div>
    </div>
  );
};

export default Result;
