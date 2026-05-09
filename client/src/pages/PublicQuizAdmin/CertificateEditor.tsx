import React, { useState } from 'react';

interface Props {
  template: string;
  onChange: (val: string) => void;
}

const DEFAULT_TEMPLATE = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<title>Certificate of Achievement</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700&family=Open+Sans:wght@400;600&display=swap');
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Open Sans', sans-serif; background: #f8fafc; display: flex; justify-content: center; align-items: center; min-height: 100vh; padding: 20px; }
  .cert { width: 800px; background: #fff; border: 12px solid #005897; padding: 60px; text-align: center; box-shadow: 0 20px 60px rgba(0,0,0,0.15); }
  .cert-inner { border: 2px solid #e2c96e; padding: 40px; }
  .badge { font-size: 3rem; margin-bottom: 16px; }
  .cert-title { font-family: 'Playfair Display', serif; font-size: 2.2rem; color: #005897; letter-spacing: 4px; text-transform: uppercase; margin-bottom: 8px; }
  .cert-subtitle { font-size: 0.9rem; color: #888; letter-spacing: 2px; text-transform: uppercase; margin-bottom: 32px; }
  .cert-name { font-family: 'Playfair Display', serif; font-size: 2.8rem; color: #1a1a1a; border-bottom: 2px solid #e2c96e; display: inline-block; padding-bottom: 8px; margin-bottom: 24px; }
  .cert-body { font-size: 1rem; color: #555; line-height: 1.8; margin-bottom: 28px; }
  .cert-quiz { font-weight: 700; color: #005897; font-size: 1.2rem; }
  .cert-score { display: inline-block; background: #005897; color: #fff; padding: 10px 28px; border-radius: 40px; font-size: 1.1rem; font-weight: 600; margin-bottom: 28px; }
  .cert-date { font-size: 0.9rem; color: #888; margin-top: 24px; }
  .cert-footer { margin-top: 32px; border-top: 1px solid #eee; padding-top: 20px; font-size: 0.8rem; color: #aaa; }
</style>
</head>
<body>
<div class="cert">
  <div class="cert-inner">
    <div class="badge">🏆</div>
    <div class="cert-title">Certificate of Achievement</div>
    <div class="cert-subtitle">This certifies that</div>
    <div class="cert-name">{{name}}</div>
    <div class="cert-body">
      has successfully completed<br/>
      <span class="cert-quiz">{{quizTitle}}</span>
    </div>
    <div class="cert-score">Score: {{score}} / {{maxScore}} ({{percentage}}%)</div>
    <div class="cert-date">Issued on {{date}}</div>
    <div class="cert-footer">{{tenantName}} &nbsp;|&nbsp; Powered by CodeBegun LMS</div>
  </div>
</div>
</body>
</html>`;

const PLACEHOLDERS = [
  { key: '{{name}}', desc: "Participant's full name" },
  { key: '{{score}}', desc: 'Score obtained' },
  { key: '{{maxScore}}', desc: 'Maximum marks' },
  { key: '{{percentage}}', desc: 'Percentage scored' },
  { key: '{{quizTitle}}', desc: 'Quiz title' },
  { key: '{{date}}', desc: 'Certificate issue date' },
  { key: '{{tenantName}}', desc: 'Your organization name' },
];

const CertificateEditor: React.FC<Props> = ({ template, onChange }) => {
  const [previewMode, setPreviewMode] = useState(false);
  const html = template || DEFAULT_TEMPLATE;

  const previewHtml = html
    .replace(/{{name}}/g, 'John Doe')
    .replace(/{{score}}/g, '85')
    .replace(/{{maxScore}}/g, '100')
    .replace(/{{percentage}}/g, '85')
    .replace(/{{quizTitle}}/g, 'Java Fundamentals Quiz 2026')
    .replace(/{{date}}/g, new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }))
    .replace(/{{tenantName}}/g, 'CodeBegun');

  return (
    <div className="ce-wrap">
      <div className="d-flex gap-2 mb-3 align-items-center">
        <h5 className="mb-0 flex-grow-1">Certificate HTML Template</h5>
        {!template && (
          <button className="btn btn-outline-secondary btn-sm" onClick={() => onChange(DEFAULT_TEMPLATE)}>
            Load Default Template
          </button>
        )}
        {template && (
          <button className="btn btn-outline-secondary btn-sm" onClick={() => { if (window.confirm('Reset to default template?')) onChange(DEFAULT_TEMPLATE); }}>
            Reset to Default
          </button>
        )}
        <button className={`btn btn-sm ${previewMode ? 'btn-secondary' : 'btn-outline-primary'}`} onClick={() => setPreviewMode(!previewMode)}>
          {previewMode ? '✏️ Edit' : '👁️ Preview'}
        </button>
      </div>

      {/* Placeholder reference */}
      <div className="ce-placeholder-guide mb-3">
        <div className="ce-placeholder-title">Available Placeholders</div>
        <div className="d-flex flex-wrap gap-2">
          {PLACEHOLDERS.map(p => (
            <div key={p.key} className="ce-placeholder-chip" title={p.desc}>
              <code>{p.key}</code> <span>{p.desc}</span>
            </div>
          ))}
        </div>
      </div>

      {!previewMode ? (
        <div>
          <textarea
            className="form-control font-monospace ce-editor"
            value={html}
            onChange={e => onChange(e.target.value)}
            spellCheck={false}
            style={{ minHeight: 500, fontSize: '0.82rem', lineHeight: 1.5 }}
          />
          <div className="form-text mt-2">
            Write full HTML. Placeholders above will be replaced with actual data when generating certificates.
          </div>
        </div>
      ) : (
        <div className="ce-preview-wrap">
          <div className="ce-preview-label">Preview (with sample data)</div>
          <iframe
            srcDoc={previewHtml}
            title="Certificate Preview"
            className="ce-preview-frame"
            sandbox="allow-same-origin"
          />
        </div>
      )}
    </div>
  );
};

export default CertificateEditor;
