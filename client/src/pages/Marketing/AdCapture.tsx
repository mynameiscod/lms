import React, { useState, useEffect } from 'react';
import { marketingAPI, Competitor, CompetitorAd, PLATFORMS } from '../../api/marketingAPI';
import './Marketing.css';

const AdCapture: React.FC = () => {
  const [ads, setAds] = useState<CompetitorAd[]>([]);
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [analyzing, setAnalyzing] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [form, setForm] = useState({
    competitorId: '', platform: '', headline: '', primaryText: '',
    cta: '', landingPageUrl: '', mediaUrl: '', notes: '',
  });

  useEffect(() => {
    Promise.all([fetchAds(), fetchCompetitors()]);
  }, []);

  const fetchAds = async () => {
    try {
      const res = await marketingAPI.getAds();
      if (res.success) setAds(res.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const fetchCompetitors = async () => {
    try {
      const res = await marketingAPI.getCompetitors();
      if (res.success) setCompetitors(res.data);
    } catch (err) { console.error(err); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.competitorId || !form.platform || !form.headline.trim()) {
      setError('Competitor, platform, and headline are required');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await marketingAPI.createAd(form);
      setSuccess('Ad captured successfully!');
      setShowForm(false);
      setForm({ competitorId: '', platform: '', headline: '', primaryText: '', cta: '', landingPageUrl: '', mediaUrl: '', notes: '' });
      fetchAds();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to capture ad');
    } finally {
      setSaving(false);
    }
  };

  const handleAnalyze = async (adId: string) => {
    setAnalyzing(adId);
    try {
      await marketingAPI.analyzeAd(adId);
      setSuccess('Ad analyzed successfully! Check Insights page.');
      fetchAds();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Analysis failed');
    } finally {
      setAnalyzing(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this ad?')) return;
    try {
      await marketingAPI.deleteAd(id);
      fetchAds();
    } catch (err) { console.error(err); }
  };

  if (loading) {
    return <div className="marketing-page"><div className="marketing-loading"><div className="spinner"></div><p>Loading...</p></div></div>;
  }

  return (
    <div className="marketing-page">
      <div className="marketing-header">
        <h1>📢 Ad Capture</h1>
        <button className="btn btn-primary" onClick={() => setShowForm(true)}>+ Capture Ad</button>
      </div>

      {error && <div className="alert alert-error">❌ {error}</div>}
      {success && <div className="alert alert-success">✅ {success}</div>}

      {showForm && (
        <div className="marketing-form-card">
          <h3>Capture Competitor Ad</h3>
          <form onSubmit={handleSubmit}>
            <div className="form-grid-2">
              <div className="form-group">
                <label>Competitor *</label>
                <select value={form.competitorId} onChange={e => setForm({ ...form, competitorId: e.target.value })}>
                  <option value="">Select Competitor</option>
                  {competitors.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                </select>
                {competitors.length === 0 && <small className="field-hint">Add competitors first in Competitor Management</small>}
              </div>
              <div className="form-group">
                <label>Platform *</label>
                <select value={form.platform} onChange={e => setForm({ ...form, platform: e.target.value })}>
                  <option value="">Select Platform</option>
                  {PLATFORMS.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
            </div>
            <div className="form-group">
              <label>Headline *</label>
              <input type="text" value={form.headline} onChange={e => setForm({ ...form, headline: e.target.value })} placeholder="The main headline of the ad" />
            </div>
            <div className="form-group">
              <label>Primary Text</label>
              <textarea value={form.primaryText} onChange={e => setForm({ ...form, primaryText: e.target.value })} placeholder="The main body text / description of the ad" rows={4} />
            </div>
            <div className="form-grid-2">
              <div className="form-group">
                <label>Call to Action (CTA)</label>
                <input type="text" value={form.cta} onChange={e => setForm({ ...form, cta: e.target.value })} placeholder="e.g., Book Free Demo, Enroll Now" />
              </div>
              <div className="form-group">
                <label>Landing Page URL</label>
                <input type="url" value={form.landingPageUrl} onChange={e => setForm({ ...form, landingPageUrl: e.target.value })} placeholder="https://competitor.com/landing" />
              </div>
            </div>
            <div className="form-grid-2">
              <div className="form-group">
                <label>Media URL (Image/Video)</label>
                <input type="url" value={form.mediaUrl} onChange={e => setForm({ ...form, mediaUrl: e.target.value })} placeholder="https://example.com/ad-image.jpg" />
              </div>
              <div className="form-group">
                <label>Notes</label>
                <input type="text" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Any observations..." />
              </div>
            </div>
            <div className="form-actions">
              <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Capture Ad'}</button>
            </div>
          </form>
        </div>
      )}

      {ads.length === 0 ? (
        <div className="marketing-empty">
          <h2>No ads captured yet</h2>
          <p>Click "Capture Ad" to add a competitor's marketing content for analysis.</p>
        </div>
      ) : (
        <div className="ads-list">
          {ads.map(ad => (
            <div key={ad._id} className="ad-card">
              <div className="ad-card-top">
                <div className="ad-platform-badge">{getPlatformIcon(ad.platform)} {ad.platform}</div>
                <span className="ad-competitor-name">{(ad.competitorId as any)?.name || 'Unknown'}</span>
                <span className="ad-date">{new Date(ad.createdAt).toLocaleDateString()}</span>
              </div>
              <h3 className="ad-headline">{ad.headline}</h3>
              {ad.primaryText && <p className="ad-text">{ad.primaryText.length > 150 ? ad.primaryText.substring(0, 150) + '...' : ad.primaryText}</p>}
              {ad.cta && <span className="ad-cta-tag">CTA: {ad.cta}</span>}
              <div className="ad-card-actions">
                {ad.isAnalyzed ? (
                  <span className="analyzed-badge">✅ Analyzed</span>
                ) : (
                  <button className="btn btn-accent" onClick={() => handleAnalyze(ad._id)} disabled={analyzing === ad._id}>
                    {analyzing === ad._id ? '🔄 Analyzing...' : '🧠 Analyze Ad'}
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
};

function getPlatformIcon(platform: string): string {
  const icons: Record<string, string> = {
    Facebook: '📘', Instagram: '📸', LinkedIn: '💼', 'Google Ads': '🔍',
    YouTube: '▶️', Twitter: '🐦', WhatsApp: '💬', Other: '🌐',
  };
  return icons[platform] || '🌐';
}

export default AdCapture;
