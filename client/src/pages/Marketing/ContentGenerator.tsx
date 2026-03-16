import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { marketingAPI, AdInsight } from '../../api/marketingAPI';
import './Marketing.css';

const CONTENT_TYPES = [
  { type: 'instagram_reel', label: '🎬 Instagram Reel Script', icon: '📸' },
  { type: 'ad_copy', label: '📢 Ad Copy', icon: '📝' },
  { type: 'linkedin_post', label: '💼 LinkedIn Post', icon: '💼' },
  { type: 'whatsapp_message', label: '💬 WhatsApp Message', icon: '📱' },
];

const ContentGenerator: React.FC = () => {
  const { insightId } = useParams<{ insightId: string }>();
  const navigate = useNavigate();
  const [insight, setInsight] = useState<AdInsight | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState<string | null>(null);
  const [generatedContent, setGeneratedContent] = useState<{ type: string; content: string } | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (insightId) fetchInsight();
  }, [insightId]);

  const fetchInsight = async () => {
    try {
      const res = await marketingAPI.getInsightById(insightId!);
      if (res.success) setInsight(res.data);
    } catch (err) {
      console.error(err);
      setError('Failed to load insight');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async (type: string) => {
    setGenerating(type);
    setError('');
    try {
      const res = await marketingAPI.generateContent(insightId!, type);
      if (res.success) {
        setGeneratedContent(res.data);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Generation failed');
    } finally {
      setGenerating(null);
    }
  };

  const handleCopy = () => {
    if (generatedContent?.content) {
      navigator.clipboard.writeText(generatedContent.content);
    }
  };

  if (loading) {
    return <div className="marketing-page"><div className="marketing-loading"><div className="spinner"></div><p>Loading...</p></div></div>;
  }

  if (!insight) {
    return (
      <div className="marketing-page">
        <div className="marketing-empty">
          <h2>Insight not found</h2>
          <button className="btn btn-primary" onClick={() => navigate('/marketing/insights')}>← Back to Insights</button>
        </div>
      </div>
    );
  }

  const ad = insight.adId as any;
  const competitor = insight.competitorId as any;

  return (
    <div className="marketing-page">
      <div className="marketing-header">
        <div>
          <button className="btn btn-secondary btn-sm" onClick={() => navigate('/marketing/insights')} style={{ marginBottom: 8 }}>
            ← Back to Insights
          </button>
          <h1>✨ Content Generator</h1>
          <p className="marketing-subtitle">Generate marketing content for CodeBegun based on competitor analysis</p>
        </div>
      </div>

      {error && <div className="alert alert-error">❌ {error}</div>}

      {/* Insight Summary */}
      <div className="generator-insight-summary">
        <h3>Based on Analysis of: <em>{ad?.headline || 'N/A'}</em></h3>
        <div className="summary-meta">
          <span>🏢 {competitor?.name}</span>
          <span>📱 {ad?.platform}</span>
          <span>🎣 {insight.hookType}</span>
          <span>🎯 {insight.targetAudience}</span>
        </div>
        <p className="positioning-text">📍 {insight.suggestedPositioning}</p>
      </div>

      {/* Generate Buttons */}
      <div className="generator-buttons">
        {CONTENT_TYPES.map(ct => (
          <button
            key={ct.type}
            className={`generator-btn ${generating === ct.type ? 'generating' : ''}`}
            onClick={() => handleGenerate(ct.type)}
            disabled={generating !== null}
          >
            <span className="gen-icon">{ct.icon}</span>
            <span className="gen-label">{generating === ct.type ? 'Generating...' : ct.label}</span>
          </button>
        ))}
      </div>

      {/* Generated Content */}
      {generatedContent && (
        <div className="generated-content-card">
          <div className="generated-header">
            <h3>{CONTENT_TYPES.find(c => c.type === generatedContent.type)?.label || 'Generated Content'}</h3>
            <button className="btn btn-secondary btn-sm" onClick={handleCopy}>📋 Copy</button>
          </div>
          <pre className="generated-text">{generatedContent.content}</pre>
        </div>
      )}

      {/* Previously Generated Content */}
      {insight.generatedContent && insight.generatedContent.length > 0 && (
        <div className="previous-content">
          <h3>📜 Previously Generated Content</h3>
          {insight.generatedContent.map((gc, i) => (
            <div key={gc._id || i} className="previous-content-item">
              <div className="prev-header">
                <span>{CONTENT_TYPES.find(c => c.type === gc.type)?.label || gc.type}</span>
                <span className="prev-date">{new Date(gc.generatedAt).toLocaleString()}</span>
              </div>
              <pre className="generated-text small">{gc.content}</pre>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ContentGenerator;
