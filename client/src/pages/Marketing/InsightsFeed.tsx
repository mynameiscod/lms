import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { marketingAPI, AdInsight } from '../../api/marketingAPI';
import './Marketing.css';

const InsightsFeed: React.FC = () => {
  const [insights, setInsights] = useState<AdInsight[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => { fetchInsights(); }, []);

  const fetchInsights = async () => {
    try {
      const res = await marketingAPI.getInsights();
      if (res.success) setInsights(res.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  if (loading) {
    return <div className="marketing-page"><div className="marketing-loading"><div className="spinner"></div><p>Loading insights...</p></div></div>;
  }

  return (
    <div className="marketing-page">
      <div className="marketing-header">
        <h1>🧠 Insights Feed</h1>
        <p className="marketing-subtitle">AI-analyzed competitor ads with actionable insights for CodeBegun</p>
      </div>

      {insights.length === 0 ? (
        <div className="marketing-empty">
          <h2>No insights yet</h2>
          <p>Go to Ad Capture, add competitor ads, and click "Analyze Ad" to generate insights.</p>
        </div>
      ) : (
        <div className="insights-grid">
          {insights.map(insight => {
            const ad = insight.adId as any;
            const competitor = insight.competitorId as any;
            return (
              <div key={insight._id} className="insight-card">
                <div className="insight-card-header">
                  <span className="insight-competitor">{competitor?.name || 'Unknown'}</span>
                  <span className="insight-platform">{ad?.platform || ''}</span>
                </div>
                <h3 className="insight-headline">{ad?.headline || 'N/A'}</h3>
                
                <div className="insight-tags">
                  <div className="insight-tag hook">
                    <span className="tag-label">Hook</span>
                    <span className="tag-value">{insight.hookType}</span>
                  </div>
                  <div className="insight-tag pain">
                    <span className="tag-label">Pain Point</span>
                    <span className="tag-value">{insight.painPoint}</span>
                  </div>
                  <div className="insight-tag audience">
                    <span className="tag-label">Audience</span>
                    <span className="tag-value">{insight.targetAudience}</span>
                  </div>
                  <div className="insight-tag cta">
                    <span className="tag-label">CTA</span>
                    <span className="tag-value">{insight.ctaType}</span>
                  </div>
                </div>

                <div className="insight-positioning">
                  <strong>📍 Suggested CodeBegun Positioning:</strong>
                  <p>{insight.suggestedPositioning}</p>
                </div>

                <div className="insight-quality">
                  <div className="quality-section strengths">
                    <strong>💪 Strengths:</strong>
                    <ul>{insight.strengths.map((s, i) => <li key={i}>{s}</li>)}</ul>
                  </div>
                  <div className="quality-section weaknesses">
                    <strong>⚠️ Weaknesses:</strong>
                    <ul>{insight.weaknesses.map((w, i) => <li key={i}>{w}</li>)}</ul>
                  </div>
                </div>

                <div className="insight-card-footer">
                  <span className="insight-date">{new Date(insight.createdAt).toLocaleDateString()}</span>
                  <button className="btn btn-primary btn-sm" onClick={() => navigate(`/marketing/generate/${insight._id}`)}>
                    ✨ Generate Content
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default InsightsFeed;
