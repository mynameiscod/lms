import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { publicQuizAdminApi } from '../../api';
import './PublicQuizAdmin.css';

const PublicQuizListPage: React.FC = () => {
  const [configs, setConfigs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [embedSlug, setEmbedSlug] = useState<string | null>(null);
  const [copiedEmbed, setCopiedEmbed] = useState(false);
  const navigate = useNavigate();

  const origin = window.location.origin;

  useEffect(() => {
    publicQuizAdminApi.listConfigs().then(setConfigs).catch(console.error).finally(() => setLoading(false));
  }, []);

  const handleDelete = async (id: string, title: string) => {
    if (!window.confirm(`Delete public quiz config "${title}"? This also deletes all submissions.`)) return;
    setDeleting(id);
    try {
      await publicQuizAdminApi.deleteConfig(id);
      setConfigs(prev => prev.filter(c => c._id !== id));
    } catch (e: any) {
      alert(e.message);
    }
    setDeleting(null);
  };

  const copyLink = (slug: string) => {
    navigator.clipboard.writeText(`${origin}/public-quiz/${slug}`);
  };

  const embedCode = embedSlug
    ? `<iframe\n  src="${origin}/public-quiz/${embedSlug}"\n  width="100%"\n  height="700"\n  frameborder="0"\n  allow="fullscreen"\n  style="border:none; border-radius:8px;"\n  title="Quiz"\n></iframe>`
    : '';

  const copyEmbed = () => {
    navigator.clipboard.writeText(embedCode).then(() => { setCopiedEmbed(true); setTimeout(() => setCopiedEmbed(false), 2000); });
  };

  if (loading) return <div className="pq-loading">Loading...</div>;

  return (
    <div className="pq-page">
      <div className="pq-header">
        <div>
          <h1 className="pq-title">Public Quizzes</h1>
          <p className="pq-subtitle">Shareable quiz links for branding and lead generation — no LMS account needed</p>
        </div>
        <button className="btn btn-primary" onClick={() => navigate('/public-quiz-admin/new')}>
          + Create Public Quiz
        </button>
      </div>

      {configs.length === 0 ? (
        <div className="pq-empty">
          <div className="pq-empty-icon">🌐</div>
          <h3>No public quizzes yet</h3>
          <p>Create a public quiz link to share with prospective students for lead generation and branding.</p>
          <button className="btn btn-primary" onClick={() => navigate('/public-quiz-admin/new')}>
            Create First Public Quiz
          </button>
        </div>
      ) : (
        <div className="pq-grid">
          {configs.map(c => (
            <div key={c._id} className="pq-card">
              <div className="pq-card-header">
                <div className="pq-card-title">{c.title}</div>
                <span className={`pq-badge ${c.isActive ? 'active' : 'inactive'}`}>
                  {c.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>

              <div className="pq-card-meta">
                <span>📝 {c.quizId?.title || 'Unknown Quiz'}</span>
                <span>👥 {c.totalSubmissions} submissions</span>
                <span>📅 {new Date(c.createdAt).toLocaleDateString('en-IN')}</span>
              </div>

              <div className="pq-link-row">
                <input
                  className="pq-link-input form-control form-control-sm"
                  readOnly
                  value={`${origin}/public-quiz/${c.slug}`}
                  onFocus={e => e.target.select()}
                />
                <button className="btn btn-outline-secondary btn-sm" onClick={() => copyLink(c.slug)} title="Copy link">
                  📋
                </button>
                <a
                  href={`${origin}/public-quiz/${c.slug}`}
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-outline-secondary btn-sm"
                  title="Preview"
                >
                  👁️
                </a>
              </div>

              <div className="pq-card-actions">
                <button className="btn btn-sm btn-outline-primary" onClick={() => navigate(`/public-quiz-admin/${c._id}/edit`)}>
                  ✏️ Edit
                </button>
                <button className="btn btn-sm btn-outline-info" onClick={() => navigate(`/public-quiz-admin/${c._id}/submissions`)}>
                  📊 Submissions ({c.totalSubmissions})
                </button>
                <button className="btn btn-sm btn-outline-secondary" onClick={() => setEmbedSlug(c.slug)}>
                  🔗 Embed
                </button>
                <button
                  className="btn btn-sm btn-outline-danger"
                  onClick={() => handleDelete(c._id, c.title)}
                  disabled={deleting === c._id}
                >
                  {deleting === c._id ? '...' : '🗑️ Delete'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Embed Code Modal */}
      {embedSlug && (
        <div className="pq-modal-overlay" onClick={() => setEmbedSlug(null)}>
          <div className="pq-modal-box" onClick={e => e.stopPropagation()}>
            <div className="pq-modal-header">
              <h5>🔗 Embed on Your Website</h5>
              <button className="btn-close" onClick={() => setEmbedSlug(null)} />
            </div>
            <div className="pq-modal-body">
              <p className="text-muted mb-2">Paste this code anywhere on your website — in a landing page, blog post, or after an ad click. Students fill the form directly on your site.</p>
              <pre className="pq-embed-code">{embedCode}</pre>
              <div className="d-flex gap-2 mt-3">
                <button className="btn btn-primary" onClick={copyEmbed}>
                  {copiedEmbed ? '✅ Copied!' : '📋 Copy Code'}
                </button>
                <a href={`${origin}/public-quiz/${embedSlug}`} target="_blank" rel="noreferrer" className="btn btn-outline-secondary">
                  👁️ Preview Page
                </a>
              </div>
              <hr />
              <p className="small text-muted mb-1"><strong>Meta / Facebook Ads tip:</strong></p>
              <p className="small text-muted">Use <code>{`${origin}/public-quiz/${embedSlug}`}</code> as your ad destination URL. Students who click the ad will land directly on this quiz registration page. Enable Meta Pixel in the quiz settings to track conversions.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PublicQuizListPage;
