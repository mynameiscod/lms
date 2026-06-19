import React, { useEffect, useState } from 'react';
import { careerProfileApi, CareerProfile, Pillar } from '../../api/careerProfileApi';
import { ScoreCards, IssuesList, ImprovedView, PILLAR_LABEL, buildMarkdown, downloadMarkdown } from './parts';
import './CareerProfile.css';

const TARGET_ROLES = [
  'Frontend Developer', 'Backend Developer', 'Full Stack Developer', 'Software Engineer',
  'Data Analyst', 'Data Scientist', 'DevOps Engineer', 'Mobile Developer', 'QA / SDET',
  'Machine Learning Engineer', 'Cloud Engineer', 'UI/UX Designer',
];

export default function CareerProfilePage() {
  const [cp, setCp] = useState<CareerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [running, setRunning] = useState(false);
  const [msg, setMsg] = useState<{ t: 'err' | 'ok' | 'info'; m: string } | null>(null);
  const [tab, setTab] = useState<Pillar>('resume');
  const [regen, setRegen] = useState<string>('');

  // form fields
  const [targetRole, setTargetRole] = useState('');
  const [githubUrl, setGithubUrl] = useState('');
  const [linkedinUrl, setLinkedinUrl] = useState('');
  const [linkedinPasted, setLinkedinPasted] = useState('');

  const load = async () => {
    try {
      const { data } = await careerProfileApi.getMy();
      const p: CareerProfile = data.data;
      setCp(p);
      setTargetRole(p.targetRole || '');
      setGithubUrl(p.githubUrl || '');
      setLinkedinUrl(p.linkedinUrl || '');
      setLinkedinPasted(p.linkedinPasted || '');
    } catch (e: any) {
      setMsg({ t: 'err', m: e?.response?.data?.message || 'Failed to load' });
    } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const save = async () => {
    setSaving(true); setMsg(null);
    try {
      const { data } = await careerProfileApi.updateMy({ targetRole, githubUrl, linkedinUrl, linkedinPasted });
      setCp(data.data);
      setMsg({ t: 'ok', m: 'Saved.' });
    } catch (e: any) {
      setMsg({ t: 'err', m: e?.response?.data?.message || 'Save failed' });
    } finally { setSaving(false); }
  };

  const runReview = async () => {
    setRunning(true); setMsg(null);
    try {
      await careerProfileApi.updateMy({ targetRole, githubUrl, linkedinUrl, linkedinPasted });
      const { data } = await careerProfileApi.runReview();
      setCp(data.data);
      setMsg({ t: 'ok', m: 'AI review complete! Scroll down to see your scores & improved content.' });
    } catch (e: any) {
      setMsg({ t: 'err', m: e?.response?.data?.message || 'Review failed' });
    } finally { setRunning(false); }
  };

  const regenerateSection = async (key: string) => {
    setRegen(key); setMsg(null);
    try {
      const { data } = await careerProfileApi.regenerateMySection(tab, key);
      setCp(data.data);
    } catch (e: any) {
      setMsg({ t: 'err', m: e?.response?.data?.message || 'Regenerate failed' });
    } finally { setRegen(''); }
  };

  const exportMd = () => {
    if (!cp) return;
    downloadMarkdown(`career-profile-${(cp.studentName || 'me').replace(/\s+/g, '-')}.md`,
      buildMarkdown({ studentName: cp.studentName, targetRole: cp.targetRole, resume: cp.resume, github: cp.github, linkedin: cp.linkedin }));
  };

  if (loading) return <div className="cp-wrap"><div className="cp-empty">Loading…</div></div>;

  const hasReview = cp && (cp.resume?.reviewedAt || cp.github?.reviewedAt || cp.linkedin?.reviewedAt);
  const allIssues = cp ? [
    ...(cp.resume?.issues || []).map(i => ({ ...i, pillar: 'Resume' })),
    ...(cp.github?.issues || []).map(i => ({ ...i, pillar: 'GitHub' })),
    ...(cp.linkedin?.issues || []).map(i => ({ ...i, pillar: 'LinkedIn' })),
  ] : [];
  const active = cp ? cp[tab] : null;

  return (
    <div className="cp-wrap">
      <div className="cp-head">
        <h1>Career Profile Builder</h1>
        <p>Get your Resume, GitHub & LinkedIn reviewed by AI — with concrete fixes and ready-to-paste improved content.</p>
      </div>

      {msg && <div className={`cp-banner ${msg.t}`}>{msg.m}</div>}

      {/* Inputs */}
      <div className="cp-card">
        <h2>1 · Your details {cp && <span className={`cp-status ${cp.status}`} style={{ marginLeft: 'auto' }}>{cp.status.replace('_', ' ')}</span>}</h2>

        <div className="cp-field">
          <label>Target role</label>
          <input list="cp-roles" value={targetRole} onChange={e => setTargetRole(e.target.value)} placeholder="e.g. Frontend Developer" />
          <datalist id="cp-roles">{TARGET_ROLES.map(r => <option key={r} value={r} />)}</datalist>
        </div>

        <div className="cp-field">
          <label>GitHub profile URL</label>
          <input value={githubUrl} onChange={e => setGithubUrl(e.target.value)} placeholder="https://github.com/yourusername" />
          <div className="cp-hint">We read your public profile & repositories.</div>
        </div>

        <div className="cp-field">
          <label>LinkedIn profile URL</label>
          <input value={linkedinUrl} onChange={e => setLinkedinUrl(e.target.value)} placeholder="https://linkedin.com/in/yourname" />
        </div>

        <div className="cp-field">
          <label>Paste your LinkedIn content</label>
          <textarea value={linkedinPasted} onChange={e => setLinkedinPasted(e.target.value)}
            placeholder={'Copy & paste your LinkedIn Headline, About section, and Experience descriptions here.\n\n(LinkedIn does not allow auto-import, so paste the text you want reviewed.)'} />
          <div className="cp-hint">Include headline + About + experience for the best feedback.</div>
        </div>

        <div className="cp-field" style={{ marginBottom: 0 }}>
          <label>Resume</label>
          <div className="cp-hint">Your latest resume from the <a href="/resume-builder">Resume Builder</a> is reviewed automatically.</div>
        </div>

        <div className="cp-row" style={{ marginTop: 16 }}>
          <button className="cp-btn cp-btn-primary" onClick={runReview} disabled={running || saving}>
            {running ? 'Running AI review…' : (hasReview ? 'Re-run AI review' : 'Run AI review')}
          </button>
          <button className="cp-btn cp-btn-ghost" onClick={save} disabled={saving || running}>{saving ? 'Saving…' : 'Save draft'}</button>
        </div>
      </div>

      {/* Results */}
      {hasReview && cp && (
        <>
          <div className="cp-card">
            <h2>2 · Your scores</h2>
            <ScoreCards resume={cp.resume} github={cp.github} linkedin={cp.linkedin} />
            {cp.reviewerNotes && (
              <div className="cp-banner info" style={{ marginTop: 14, marginBottom: 0 }}>
                <b>Trainer notes:</b> {cp.reviewerNotes}
              </div>
            )}
          </div>

          <div className="cp-card">
            <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
              <h2 style={{ margin: 0 }}>3 · Detailed feedback & improved content</h2>
              <button className="cp-btn cp-btn-ghost cp-btn-sm" style={{ marginLeft: 'auto' }} onClick={exportMd}>⬇ Download .md</button>
            </div>
            <div className="cp-tabs" style={{ marginTop: 14 }}>
              {(['resume', 'github', 'linkedin'] as Pillar[]).map(p => (
                <button key={p} className={`cp-tab ${tab === p ? 'active' : ''}`} onClick={() => setTab(p)}>
                  {PILLAR_LABEL[p]} · {cp[p]?.score || 0}
                </button>
              ))}
            </div>
            {active && (
              <div className="cp-twocol cp-pillar">
                <div>
                  <p className="cp-subhead">What to fix</p>
                  <IssuesList issues={active.issues} />
                </div>
                <div>
                  <p className="cp-subhead">AI-improved (ready to use) — hover a block to ↻ redo just that part</p>
                  <ImprovedView improved={active.improved} onRegenerate={regenerateSection} regenerating={regen} />
                </div>
              </div>
            )}
          </div>

          <div className="cp-card">
            <h2>4 · Action checklist</h2>
            {allIssues.length === 0 ? (
              <div style={{ fontSize: 13, color: '#16a34a' }}>Everything looks great — nothing pending!</div>
            ) : (
              <ul className="cp-check">
                {allIssues.map((is: any, i) => (
                  <li key={i}><b>[{is.pillar}]</b> {is.fix || is.problem}</li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  );
}
