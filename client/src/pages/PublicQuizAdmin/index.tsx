import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { publicQuizAdminApi } from '../../api';
import './PublicQuizAdmin.css';

const PublicQuizListPage: React.FC = () => {
  const [configs, setConfigs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [featuring, setFeaturing] = useState<string | null>(null);
  const [embedSlug, setEmbedSlug] = useState<string | null>(null);
  const [copiedEmbed, setCopiedEmbed] = useState(false);
  const [showApiDocs, setShowApiDocs] = useState(false);
  const [copiedApi, setCopiedApi] = useState(false);
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

  const handleSetFeatured = async (id: string, title: string) => {
    if (!window.confirm(`Set "${title}" as the current weekly quiz?\n\nThis will be the quiz that the codebegun.com website form registers users for.`)) return;
    setFeaturing(id);
    try {
      await publicQuizAdminApi.setFeatured(id);
      setConfigs(prev => prev.map(c => ({ ...c, isFeatured: c._id === id })));
    } catch (e: any) {
      alert(e.message);
    }
    setFeaturing(null);
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

  // Derive tenant slug from the current LMS URL (subdomain or path)
  const apiBase = (window as any).__API_BASE__ || `${window.location.protocol}//${window.location.host}/api/v1`;
  const tenantSlug = (window as any).__TENANT_SLUG__ || 'codebegun';
  const websiteApiEndpoint = `${apiBase}/public/${tenantSlug}/weekly-quiz-register`;
  const websiteApiSnippet = `// JavaScript — call from your codebegun.com form submit handler
const response = await fetch('${websiteApiEndpoint}', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: formData.name,       // required
    email: formData.email,     // required
    phone: formData.phone,     // optional
    // ...any extra fields
  })
});

const result = await response.json();
// result.canTakeQuiz  — true if user can start quiz now
// result.quizUrl      — redirect user here to take the quiz
// result.submissionId — unique ID for this participant
// result.message      — human-readable status

if (result.canTakeQuiz) {
  window.location.href = result.quizUrl; // redirect to quiz
} else {
  showMessage(result.message);
}`;

  const copyApiSnippet = () => {
    navigator.clipboard.writeText(websiteApiSnippet).then(() => { setCopiedApi(true); setTimeout(() => setCopiedApi(false), 2000); });
  };

  if (loading) return <div className="pq-loading">Loading...</div>;

  return (
    <div className="pq-page">
      <div className="pq-header">
        <div>
          <h1 className="pq-title">Public Quizzes</h1>
          <p className="pq-subtitle">Shareable quiz links for branding and lead generation — no LMS account needed</p>
        </div>
        <div className="d-flex gap-2">
          <button className="btn btn-outline-secondary" onClick={() => setShowApiDocs(true)}>
            🔌 Website API Docs
          </button>
          <button className="btn btn-primary" onClick={() => navigate('/public-quiz-admin/new')}>
            + Create Public Quiz
          </button>
        </div>
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
                <div className="d-flex gap-1 flex-wrap">
                  {c.isFeatured && (
                    <span className="pq-badge" style={{ background: '#e8f5e9', color: '#2e7d32', border: '1px solid #a5d6a7' }}>
                      ⭐ Current Weekly
                    </span>
                  )}
                  <span className={`pq-badge ${c.isActive ? 'active' : 'inactive'}`}>
                    {c.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
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
                {!c.isFeatured && (
                  <button
                    className="btn btn-sm btn-outline-success"
                    onClick={() => handleSetFeatured(c._id, c.title)}
                    disabled={featuring === c._id}
                    title="Set as current weekly quiz for website API"
                  >
                    {featuring === c._id ? '...' : '⭐ Set Weekly'}
                  </button>
                )}
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

      {/* Website API Docs Modal */}
      {showApiDocs && (
        <div className="pq-modal-overlay" onClick={() => setShowApiDocs(false)}>
          <div className="pq-modal-box" style={{ maxWidth: 720 }} onClick={e => e.stopPropagation()}>
            <div className="pq-modal-header">
              <h5>🔌 Website Integration API</h5>
              <button className="btn-close" onClick={() => setShowApiDocs(false)} />
            </div>
            <div className="pq-modal-body">
              <div className="alert alert-info py-2 mb-3">
                <strong>How it works:</strong> Mark one quiz as <strong>⭐ Current Weekly</strong> using the button on each card. Your website form calls the API below — no quiz slug needed. Participants are stored separately from regular students.
              </div>

              <p className="fw-semibold mb-1">Endpoint</p>
              <pre className="pq-embed-code" style={{ fontSize: '0.85rem' }}>{`POST ${websiteApiEndpoint}`}</pre>

              <p className="fw-semibold mb-1 mt-3">Request body (JSON)</p>
              <pre className="pq-embed-code" style={{ fontSize: '0.8rem' }}>{`{
  "name":  "Priya Sharma",   // required
  "email": "priya@example.com", // required
  "phone": "9876543210",     // optional
  // ...any additional fields from your form
}`}</pre>

              <p className="fw-semibold mb-1 mt-3">Response</p>
              <pre className="pq-embed-code" style={{ fontSize: '0.8rem' }}>{`{
  "canTakeQuiz":    true,
  "submissionId":   "6650abc123...",
  "quizUrl":        "https://lms.codebegun.com/public-quiz/weekly-java-quiz?session=...",
  "eligibilityStatus": "qualified",
  "message":        "Registration successful! Click the quiz link to begin."
}`}</pre>

              <p className="fw-semibold mb-1 mt-3">JavaScript example</p>
              <pre className="pq-embed-code" style={{ fontSize: '0.75rem', maxHeight: 260, overflowY: 'auto' }}>{websiteApiSnippet}</pre>

              <div className="d-flex gap-2 mt-3">
                <button className="btn btn-primary" onClick={copyApiSnippet}>
                  {copiedApi ? '✅ Copied!' : '📋 Copy Code'}
                </button>
              </div>

              <hr />
              <p className="small text-muted mb-1"><strong>Data separation:</strong> Participants registered via this API are stored in <code>PublicQuizSubmission</code>, completely separate from enrolled students. View them under <strong>Submissions</strong> on any quiz card. You can convert any participant to a lead from there.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PublicQuizListPage;
