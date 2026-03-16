import React, { useState, useEffect } from 'react';
import { marketingAPI, Competitor, PLATFORMS } from '../../api/marketingAPI';
import './Marketing.css';

const CompetitorManagement: React.FC = () => {
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ name: '', website: '', platforms: [] as string[], notes: '' });

  useEffect(() => { fetchCompetitors(); }, []);

  const fetchCompetitors = async () => {
    try {
      const res = await marketingAPI.getCompetitors();
      if (res.success) setCompetitors(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { setError('Competitor name is required'); return; }
    setSaving(true);
    setError('');
    try {
      if (editId) {
        await marketingAPI.updateCompetitor(editId, form);
      } else {
        await marketingAPI.createCompetitor(form);
      }
      setShowForm(false);
      setEditId(null);
      setForm({ name: '', website: '', platforms: [], notes: '' });
      fetchCompetitors();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (comp: Competitor) => {
    setForm({ name: comp.name, website: comp.website, platforms: comp.platforms, notes: comp.notes });
    setEditId(comp._id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this competitor and all related ads/insights?')) return;
    try {
      await marketingAPI.deleteCompetitor(id);
      fetchCompetitors();
    } catch (err) {
      console.error(err);
    }
  };

  const togglePlatform = (platform: string) => {
    setForm(prev => ({
      ...prev,
      platforms: prev.platforms.includes(platform)
        ? prev.platforms.filter(p => p !== platform)
        : [...prev.platforms, platform],
    }));
  };

  if (loading) {
    return <div className="marketing-page"><div className="marketing-loading"><div className="spinner"></div><p>Loading...</p></div></div>;
  }

  return (
    <div className="marketing-page">
      <div className="marketing-header">
        <h1>🏢 Competitor Management</h1>
        <button className="btn btn-primary" onClick={() => { setShowForm(true); setEditId(null); setForm({ name: '', website: '', platforms: [], notes: '' }); }}>
          + Add Competitor
        </button>
      </div>

      {showForm && (
        <div className="marketing-form-card">
          <h3>{editId ? 'Edit Competitor' : 'Add New Competitor'}</h3>
          {error && <div className="alert alert-error">❌ {error}</div>}
          <form onSubmit={handleSubmit}>
            <div className="form-grid-2">
              <div className="form-group">
                <label>Competitor Name *</label>
                <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g., Scaler Academy" />
              </div>
              <div className="form-group">
                <label>Website</label>
                <input type="url" value={form.website} onChange={e => setForm({ ...form, website: e.target.value })} placeholder="https://example.com" />
              </div>
            </div>
            <div className="form-group">
              <label>Platforms</label>
              <div className="platform-chips">
                {PLATFORMS.map(p => (
                  <button key={p} type="button" className={`chip ${form.platforms.includes(p) ? 'active' : ''}`} onClick={() => togglePlatform(p)}>
                    {p}
                  </button>
                ))}
              </div>
            </div>
            <div className="form-group">
              <label>Notes</label>
              <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Any notes about this competitor..." rows={3} />
            </div>
            <div className="form-actions">
              <button type="button" className="btn btn-secondary" onClick={() => { setShowForm(false); setEditId(null); }}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : editId ? 'Update' : 'Add Competitor'}</button>
            </div>
          </form>
        </div>
      )}

      {competitors.length === 0 ? (
        <div className="marketing-empty">
          <h2>No competitors added yet</h2>
          <p>Click "Add Competitor" to start tracking your competition.</p>
        </div>
      ) : (
        <div className="competitor-grid">
          {competitors.map(comp => (
            <div key={comp._id} className="competitor-card">
              <div className="competitor-card-header">
                <h3>{comp.name}</h3>
                <span className={`status-badge ${comp.status}`}>{comp.status}</span>
              </div>
              {comp.website && <a href={comp.website} target="_blank" rel="noopener noreferrer" className="competitor-website">🔗 {comp.website}</a>}
              {comp.platforms.length > 0 && (
                <div className="competitor-platforms">
                  {comp.platforms.map(p => <span key={p} className="platform-tag">{p}</span>)}
                </div>
              )}
              {comp.notes && <p className="competitor-notes">{comp.notes}</p>}
              <div className="competitor-card-footer">
                <span className="competitor-date">Added {new Date(comp.createdAt).toLocaleDateString()}</span>
                <div className="competitor-actions">
                  <button className="btn-icon" title="Edit" onClick={() => handleEdit(comp)}>✏️</button>
                  <button className="btn-icon delete" title="Delete" onClick={() => handleDelete(comp._id)}>🗑️</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CompetitorManagement;
