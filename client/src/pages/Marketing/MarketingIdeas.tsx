import React, { useState, useEffect } from 'react';
import { marketingAPI, AdInsight, GeneratedMarketingContent } from '../../api/marketingAPI';
import './Marketing.css';

const CONTENT_TYPES = [
  { type: 'instagram_reel', label: '🎬 Instagram Reel Idea', icon: '📸' },
  { type: 'ad_copy', label: '📢 Meta Ad Copy', icon: '📝' },
  { type: 'linkedin_post', label: '💼 LinkedIn Post', icon: '💼' },
  { type: 'whatsapp_message', label: '💬 WhatsApp Campaign', icon: '📱' },
];

const MarketingIdeas: React.FC = () => {
  const [insights, setInsights] = useState<AdInsight[]>([]);
  const [generatedContent, setGeneratedContent] = useState<GeneratedMarketingContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [selectedInsight, setSelectedInsight] = useState('');
  const [result, setResult] = useState<{ type: string; content: string } | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [insRes, contentRes] = await Promise.all([
        marketingAPI.getInsights(),
        marketingAPI.getGeneratedContent(),
      ]);
      if (insRes.success) setInsights(insRes.data);
      if (contentRes.success) setGeneratedContent(contentRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async (type: string) => {
    if (!selectedInsight) {
      setError('Select an insight first to generate content');
      return;
    }
    setGenerating(true);
    setError('');
    setResult(null);
    try {
      const res = await marketingAPI.generateContent(selectedInsight, type);
      if (res.success) {
        setResult(res.data);
        setSuccess(`${CONTENT_TYPES.find(c => c.type === type)?.label} generated!`);
        loadData(); // Refresh generated content list
        setTimeout(() => setSuccess(''), 3000);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Generation failed');
    } finally {
      setGenerating(false);
    }
  };

  const handleCopy = (content: string) => {
    navigator.clipboard.writeText(content);
    setSuccess('Copied to clipboard!');
    setTimeout(() => setSuccess(''), 2000);
  };

  if (loading) {
    return <div className="marketing-page"><div className="marketing-loading"><div className="spinner"></div><p>Loading...</p></div></div>;
  }

  return (
    <div className="marketing-page">
      <div className="marketing-header">
        <h1>💡 Marketing Idea Generator</h1>
        <p className="marketing-subtitle">Generate marketing content ideas for CodeBegun from competitor analysis</p>
      </div>

      {error && <div className="alert alert-error">❌ {error}</div>}
      {success && <div className="alert alert-success">✅ {success}</div>}

      {insights.length === 0 ? (
        <div className="marketing-empty">
          <h2>No insights available</h2>
          <p>First capture and analyze competitor ads to get insights, then come back to generate marketing ideas.</p>
        </div>
      ) : (
        <>
          {/* Select Insight */}
          <div className="marketing-form-card">
            <h3>🎯 Select Competitor Insight</h3>
            <div className="form-group">
              <label>Choose an analyzed ad to base your content on:</label>
              <select
                value={selectedInsight}
                onChange={e => setSelectedInsight(e.target.value)}
                style={{ maxWidth: 600 }}
              >
                <option value="">-- Select Insight --</option>
                {insights.map(ins => {
                  const ad = ins.adId as any;
                  const comp = ins.competitorId as any;
                  return (
                    <option key={ins._id} value={ins._id}>
                      {comp?.name || 'Unknown'} — {ad?.headline || 'N/A'} ({ins.hookType})
                    </option>
                  );
                })}
              </select>
            </div>

            {selectedInsight && (() => {
              const ins = insights.find(i => i._id === selectedInsight);
              if (!ins) return null;
              const ad = ins.adId as any;
              const comp = ins.competitorId as any;
              return (
                <div className="generator-insight-summary" style={{ marginTop: 16 }}>
                  <h3>Based on: <em>{ad?.headline || 'N/A'}</em></h3>
                  <div className="summary-meta">
                    <span>🏢 {comp?.name}</span>
                    <span>📱 {ad?.platform}</span>
                    <span>🎣 {ins.hookType}</span>
                    <span>🎯 {ins.targetAudience}</span>
                    <span>💢 {ins.painPoint}</span>
                  </div>
                  <p className="positioning-text">📍 {ins.suggestedAngleForCodeBegun}</p>
                </div>
              );
            })()}

            {/* Generate Buttons */}
            <h3 style={{ marginTop: 24 }}>🚀 Generate Marketing Ideas</h3>
            <div className="generator-buttons">
              {CONTENT_TYPES.map(ct => (
                <button
                  key={ct.type}
                  className={`generator-btn ${generating ? 'generating' : ''}`}
                  onClick={() => handleGenerate(ct.type)}
                  disabled={generating || !selectedInsight}
                >
                  <span className="gen-icon">{ct.icon}</span>
                  <span className="gen-label">{ct.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Generated Result */}
          {result && (
            <div className="generated-content-card">
              <div className="generated-header">
                <h3>{CONTENT_TYPES.find(c => c.type === result.type)?.label || 'Generated Content'}</h3>
                <button className="btn btn-secondary btn-sm" onClick={() => handleCopy(result.content)}>📋 Copy</button>
              </div>
              <pre className="generated-text">{result.content}</pre>
            </div>
          )}

          {/* All Previously Generated Content */}
          {generatedContent.length > 0 && (
            <div className="previous-content">
              <h3>📜 All Generated Marketing Ideas ({generatedContent.length})</h3>
              {generatedContent.map((gc) => (
                <div key={gc._id} className="previous-content-item">
                  <div className="prev-header">
                    <span>{CONTENT_TYPES.find(c => c.type === gc.type)?.label || gc.type}</span>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <span className="prev-date">{new Date(gc.createdAt).toLocaleString()}</span>
                      <button className="btn btn-secondary btn-sm" onClick={() => handleCopy(gc.content)}>📋</button>
                    </div>
                  </div>
                  <pre className="generated-text small">{gc.content}</pre>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default MarketingIdeas;
