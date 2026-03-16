import React, { useState, useEffect } from 'react';
import { marketingAPI, Competitor, CompetitorAd, CompetitorWithCounts, CompetitorAnalysisSummary, PLATFORMS } from '../../api/marketingAPI';
import './Marketing.css';

const AdCapture: React.FC = () => {
  const [competitors, setCompetitors] = useState<CompetitorWithCounts[]>([]);
  const [allCompetitors, setAllCompetitors] = useState<Competitor[]>([]);
  const [selectedCompetitor, setSelectedCompetitor] = useState<CompetitorWithCounts | null>(null);
  const [competitorAds, setCompetitorAds] = useState<CompetitorAd[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingAds, setLoadingAds] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [analyzing, setAnalyzing] = useState<string | null>(null);
  const [analyzingAll, setAnalyzingAll] = useState(false);
  const [analysisSummary, setAnalysisSummary] = useState<CompetitorAnalysisSummary | null>(null);
  const [fetching, setFetching] = useState(false);
  const [fetchInput, setFetchInput] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [form, setForm] = useState({
    competitorId: '', platform: '', headline: '', primaryText: '',
    cta: '', landingPageUrl: '', mediaUrl: '', notes: '',
  });

  useEffect(() => {
    loadCompetitors();
  }, []);

  const loadCompetitors = async () => {
    try {
      const [countsRes, compRes] = await Promise.all([
        marketingAPI.getCompetitorsWithCounts(),
        marketingAPI.getCompetitors(),
      ]);
      if (countsRes.success) setCompetitors(countsRes.data);
      if (compRes.success) setAllCompetitors(compRes.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const selectCompetitor = async (comp: CompetitorWithCounts) => {
    setSelectedCompetitor(comp);
    setAnalysisSummary(null);
    setLoadingAds(true);
    try {
      const res = await marketingAPI.getAdsByCompetitor(comp._id);
      if (res.success) setCompetitorAds(res.data);
    } catch (err) { console.error(err); }
    finally { setLoadingAds(false); }
  };

  const goBack = () => {
    setSelectedCompetitor(null);
    setCompetitorAds([]);
    setAnalysisSummary(null);
    loadCompetitors();
  };

  const handleFetchAds = async () => {
    if (!fetchInput.trim()) { setError('Enter a competitor name to fetch ads'); return; }
    setFetching(true); setError(''); setSuccess('');
    try {
      const res = await marketingAPI.fetchAds(fetchInput.trim());
      setSuccess(res.message);
      setFetchInput('');
      loadCompetitors();
      setTimeout(() => setSuccess(''), 5000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch ads. Try adding ads manually.');
    } finally { setFetching(false); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.competitorId || !form.platform || !form.headline.trim()) {
      setError('Competitor, platform, and headline are required'); return;
    }
    setSaving(true); setError('');
    try {
      await marketingAPI.createAd(form);
      setSuccess('Ad captured successfully!');
      setShowForm(false);
      setForm({ competitorId: '', platform: '', headline: '', primaryText: '', cta: '', landingPageUrl: '', mediaUrl: '', notes: '' });
      loadCompetitors();
      if (selectedCompetitor && form.competitorId === selectedCompetitor._id) {
        selectCompetitor(selectedCompetitor);
      }
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to capture ad');
    } finally { setSaving(false); }
  };

  const handleAnalyze = async (adId: string) => {
    setAnalyzing(adId);
    try {
      await marketingAPI.analyzeAd(adId);
      setSuccess('Ad analyzed! Check Insights page.');
      if (selectedCompetitor) selectCompetitor(selectedCompetitor);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Analysis failed');
    } finally { setAnalyzing(null); }
  };

  const handleAnalyzeAll = async () => {
    if (!selectedCompetitor) return;
    setAnalyzingAll(true); setError(''); setAnalysisSummary(null);
    try {
      const res = await marketingAPI.analyzeCompetitor(selectedCompetitor._id);
      if (res.success) {
        setAnalysisSummary(res.data);
        setSuccess(`Analyzed ${res.data.totalAds} ads for ${res.data.competitorName}`);
        selectCompetitor(selectedCompetitor);
      }
      setTimeout(() => setSuccess(''), 5000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Combined analysis failed');
    } finally { setAnalyzingAll(false); }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this ad?')) return;
    try {
      await marketingAPI.deleteAd(id);
      if (selectedCompetitor) selectCompetitor(selectedCompetitor);
      loadCompetitors();
    } catch (err) { console.error(err); }
  };

  if (loading) {
    return <div className="marketing-page"><div className="marketing-loading"><div className="spinner"></div><p>Loading...</p></div></div>;
  }

  // ============= DETAIL VIEW: Selected competitor's ads =============
  if (selectedCompetitor) {
    return (
      <div className="marketing-page">
        <div className="marketing-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button className="btn btn-secondary" onClick={goBack}>← Back</button>
            <h1>📢 {selectedCompetitor.name}</h1>
            <span className="competitor-count-badge">{selectedCompetitor.adCount} ads</span>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-accent" onClick={handleAnalyzeAll} disabled={analyzingAll || competitorAds.length === 0}>
              {analyzingAll ? '🔄 Analyzing All...' : '🧠 Analyze All Ads'}
            </button>
            <button className="btn btn-primary" onClick={() => setShowForm(true)}>+ Manual Capture</button>
          </div>
        </div>

        {error && <div className="alert alert-error">❌ {error}</div>}
        {success && <div className="alert alert-success">✅ {success}</div>}

        {/* Combined Analysis Summary */}
        {analysisSummary && (
          <div className="combined-analysis-section">
            <h2>🧠 Combined Analysis: {analysisSummary.competitorName}</h2>
            <div className="analysis-overview-grid">
              <div className="analysis-stat-card">
                <div className="analysis-stat-value">{analysisSummary.totalAds}</div>
                <div className="analysis-stat-label">Total Ads</div>
              </div>
              <div className="analysis-stat-card">
                <div className="analysis-stat-value">{analysisSummary.avgStrengthScore}/10</div>
                <div className="analysis-stat-label">Avg Strength</div>
              </div>
              <div className="analysis-stat-card">
                <div className="analysis-stat-value">{analysisSummary.topHooks[0]?.name || '-'}</div>
                <div className="analysis-stat-label">Top Hook</div>
              </div>
              <div className="analysis-stat-card">
                <div className="analysis-stat-value">{analysisSummary.topCTAs[0]?.name || '-'}</div>
                <div className="analysis-stat-label">Top CTA</div>
              </div>
            </div>

            <div className="analysis-details-grid">
              <div className="analysis-detail-card">
                <h4>🎯 Target Audiences</h4>
                <div className="analysis-tag-list">
                  {analysisSummary.topAudiences.map((a, i) => (
                    <span key={i} className="analysis-tag audience">{a.name} ({a.count})</span>
                  ))}
                </div>
              </div>
              <div className="analysis-detail-card">
                <h4>😰 Pain Points</h4>
                <div className="analysis-tag-list">
                  {analysisSummary.topPainPoints.map((p, i) => (
                    <span key={i} className="analysis-tag pain">{p.name} ({p.count})</span>
                  ))}
                </div>
              </div>
              <div className="analysis-detail-card">
                <h4>🎣 Hooks Used</h4>
                <div className="analysis-tag-list">
                  {analysisSummary.topHooks.map((h, i) => (
                    <span key={i} className="analysis-tag hook">{h.name} ({h.count})</span>
                  ))}
                </div>
              </div>
              <div className="analysis-detail-card">
                <h4>⚠️ Weaknesses</h4>
                <ul className="weakness-list">
                  {analysisSummary.commonWeaknesses.map((w, i) => (
                    <li key={i}>{w}</li>
                  ))}
                </ul>
              </div>
            </div>

            {analysisSummary.suggestedAngles.length > 0 && (
              <div className="analysis-detail-card" style={{ marginTop: 16 }}>
                <h4>💡 Suggested Angles for CodeBegun</h4>
                <ul className="weakness-list">
                  {analysisSummary.suggestedAngles.map((a, i) => (
                    <li key={i}>{a}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Marketing Ideas */}
            <h3 style={{ marginTop: 24, marginBottom: 12 }}>🚀 Marketing Ideas for CodeBegun</h3>
            <div className="ideas-grid">
              {analysisSummary.marketingIdeas.map((idea, i) => (
                <div key={i} className="idea-card">
                  <div className="idea-type-badge">{getIdeaIcon(idea.type)} {formatIdeaType(idea.type)}</div>
                  <pre className="idea-content">{idea.content}</pre>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Manual Capture Form */}
        {showForm && (
          <div className="marketing-form-card">
            <h3>Capture Competitor Ad</h3>
            <form onSubmit={handleSubmit}>
              <div className="form-grid-2">
                <div className="form-group">
                  <label>Competitor *</label>
                  <select value={form.competitorId} onChange={e => setForm({ ...form, competitorId: e.target.value })}>
                    <option value="">Select Competitor</option>
                    {allCompetitors.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Platform *</label>
                  <select value={form.platform} onChange={e => setForm({ ...form, platform: e.target.value })}>
                    <option value="">Select Platform</option>
                    {PLATFORMS.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-group"><label>Headline *</label><input type="text" value={form.headline} onChange={e => setForm({ ...form, headline: e.target.value })} placeholder="The main headline of the ad" /></div>
              <div className="form-group"><label>Primary Text</label><textarea value={form.primaryText} onChange={e => setForm({ ...form, primaryText: e.target.value })} placeholder="The main body text" rows={4} /></div>
              <div className="form-grid-2">
                <div className="form-group"><label>CTA</label><input type="text" value={form.cta} onChange={e => setForm({ ...form, cta: e.target.value })} placeholder="e.g., Book Free Demo" /></div>
                <div className="form-group"><label>Landing Page URL</label><input type="url" value={form.landingPageUrl} onChange={e => setForm({ ...form, landingPageUrl: e.target.value })} placeholder="https://competitor.com/landing" /></div>
              </div>
              <div className="form-grid-2">
                <div className="form-group"><label>Media URL</label><input type="url" value={form.mediaUrl} onChange={e => setForm({ ...form, mediaUrl: e.target.value })} placeholder="https://example.com/ad-image.jpg" /></div>
                <div className="form-group"><label>Notes</label><input type="text" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Any observations..." /></div>
              </div>
              <div className="form-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Capture Ad'}</button>
              </div>
            </form>
          </div>
        )}

        {/* Ads List */}
        {loadingAds ? (
          <div className="marketing-loading"><div className="spinner"></div><p>Loading ads...</p></div>
        ) : competitorAds.length === 0 ? (
          <div className="marketing-empty"><h2>No ads captured for {selectedCompetitor.name}</h2><p>Fetch ads or add them manually.</p></div>
        ) : (
          <div className="ads-list">
            {competitorAds.map(ad => (
              <div key={ad._id} className="ad-card">
                <div className="ad-card-top">
                  <div className="ad-platform-badge">{getPlatformIcon(ad.platform)} {ad.platform}</div>
                  <span className="ad-date">{new Date(ad.createdAt).toLocaleDateString()}</span>
                </div>
                <h3 className="ad-headline">{ad.headline}</h3>
                {ad.primaryText && <p className="ad-text">{ad.primaryText.length > 150 ? ad.primaryText.substring(0, 150) + '...' : ad.primaryText}</p>}
                <div className="ad-meta-row">
                  {ad.cta && <span className="ad-cta-tag">CTA: {ad.cta}</span>}
                  {ad.startedRunning && <span className="ad-meta-tag">📅 {ad.startedRunning}</span>}
                  {ad.estimatedReach && <span className="ad-meta-tag">📊 Reach: {ad.estimatedReach}</span>}
                  {ad.estimatedCpl && <span className="ad-meta-tag">💰 CPL: {ad.estimatedCpl}</span>}
                </div>
                <div className="ad-card-actions">
                  {ad.isAnalyzed ? (
                    <span className="analyzed-badge">✅ Analyzed</span>
                  ) : (
                    <button className="btn btn-accent" onClick={() => handleAnalyze(ad._id)} disabled={analyzing === ad._id}>
                      {analyzing === ad._id ? '🔄 Analyzing...' : '🧠 Analyze'}
                    </button>
                  )}
                  <button className="btn-icon delete" onClick={() => handleDelete(ad._id)}>🗑️</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ============= LIST VIEW: Competitor cards with ad counts =============
  return (
    <div className="marketing-page">
      <div className="marketing-header">
        <h1>📢 Competitor Ads</h1>
        <button className="btn btn-primary" onClick={() => setShowForm(true)}>+ Manual Capture</button>
      </div>

      {error && <div className="alert alert-error">❌ {error}</div>}
      {success && <div className="alert alert-success">✅ {success}</div>}

      {/* Auto-Fetch Section */}
      <div className="marketing-form-card fetch-section">
        <h3>🔍 Auto-Fetch Competitor Ads from Meta Ads Library</h3>
        <p style={{ color: '#64748b', fontSize: 14, marginBottom: 16 }}>Enter a competitor name (e.g., Scaler, NxtWave, PW Skills, Intellipaat) to automatically scrape their ads.</p>
        <div className="fetch-row">
          <input type="text" value={fetchInput} onChange={e => setFetchInput(e.target.value)} placeholder="Enter competitor name... (e.g., Scaler)" className="fetch-input" disabled={fetching} onKeyDown={e => e.key === 'Enter' && handleFetchAds()} />
          <button className="btn btn-accent fetch-btn" onClick={handleFetchAds} disabled={fetching || !fetchInput.trim()}>
            {fetching ? '🔄 Fetching...' : '🚀 Fetch Ads'}
          </button>
        </div>
        {fetching && <p className="fetch-status">⏳ Scraping Meta Ads Library... This may take 15-30 seconds.</p>}
      </div>

      {/* Manual Capture Form (on list page) */}
      {showForm && (
        <div className="marketing-form-card">
          <h3>Capture Competitor Ad</h3>
          <form onSubmit={handleSubmit}>
            <div className="form-grid-2">
              <div className="form-group">
                <label>Competitor *</label>
                <select value={form.competitorId} onChange={e => setForm({ ...form, competitorId: e.target.value })}>
                  <option value="">Select Competitor</option>
                  {allCompetitors.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Platform *</label>
                <select value={form.platform} onChange={e => setForm({ ...form, platform: e.target.value })}>
                  <option value="">Select Platform</option>
                  {PLATFORMS.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
            </div>
            <div className="form-group"><label>Headline *</label><input type="text" value={form.headline} onChange={e => setForm({ ...form, headline: e.target.value })} placeholder="The main headline of the ad" /></div>
            <div className="form-group"><label>Primary Text</label><textarea value={form.primaryText} onChange={e => setForm({ ...form, primaryText: e.target.value })} placeholder="The main body text" rows={4} /></div>
            <div className="form-grid-2">
              <div className="form-group"><label>CTA</label><input type="text" value={form.cta} onChange={e => setForm({ ...form, cta: e.target.value })} placeholder="e.g., Book Free Demo" /></div>
              <div className="form-group"><label>Landing Page URL</label><input type="url" value={form.landingPageUrl} onChange={e => setForm({ ...form, landingPageUrl: e.target.value })} placeholder="https://competitor.com/landing" /></div>
            </div>
            <div className="form-grid-2">
              <div className="form-group"><label>Media URL</label><input type="url" value={form.mediaUrl} onChange={e => setForm({ ...form, mediaUrl: e.target.value })} placeholder="https://example.com/ad-image.jpg" /></div>
              <div className="form-group"><label>Notes</label><input type="text" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Any observations..." /></div>
            </div>
            <div className="form-actions">
              <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Capture Ad'}</button>
            </div>
          </form>
        </div>
      )}

      {/* Competitor Cards Grid */}
      {competitors.length === 0 ? (
        <div className="marketing-empty">
          <h2>No competitors found</h2>
          <p>Use "Auto-Fetch" above to scrape ads, or add competitors in Competitor Management first.</p>
        </div>
      ) : (
        <div className="competitor-card-grid">
          {competitors.map(comp => (
            <div key={comp._id} className="competitor-card" onClick={() => selectCompetitor(comp)}>
              <div className="competitor-card-header">
                <h3 className="competitor-card-name">{comp.name}</h3>
                <span className="competitor-card-count">{comp.adCount}</span>
              </div>
              {comp.website && <p className="competitor-card-website">{comp.website}</p>}
              <div className="competitor-card-footer">
                <span className="competitor-card-analyzed">
                  {comp.analyzedCount}/{comp.adCount} analyzed
                </span>
                <span className="competitor-card-status" data-status={comp.status}>{comp.status}</span>
              </div>
              <div className="competitor-card-action">Click to view ads →</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

function getPlatformIcon(platform: string): string {
  const icons: Record<string, string> = {
    Facebook: '📘', Instagram: '📸', LinkedIn: '💼', 'Google Ads': '🔍',
    YouTube: '▶️', Twitter: '🐦', WhatsApp: '💬', 'Meta Ads': '📱', Other: '🌐',
  };
  return icons[platform] || '🌐';
}

function getIdeaIcon(type: string): string {
  const icons: Record<string, string> = {
    instagram_reel: '🎬', ad_copy: '📝', linkedin_post: '💼', whatsapp_message: '💬',
  };
  return icons[type] || '💡';
}

function formatIdeaType(type: string): string {
  const labels: Record<string, string> = {
    instagram_reel: 'Instagram Reel', ad_copy: 'Ad Copy', linkedin_post: 'LinkedIn Post', whatsapp_message: 'WhatsApp Message',
  };
  return labels[type] || type;
}

export default AdCapture;
