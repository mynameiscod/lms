import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import passportApi, { ResumeSections, ResumeScore } from '../../api/passportApi';
import PassportShell, { LockedPanel } from './PassportShell';
import './resumeCenter.css';

/** ?focus= on a mission link → the section it should land on. 'title' is the target title
 *  field, which lives inside Contact Information. */
const FOCUS_SECTION: Record<string, string> = {
  basics: 'rc-contact', title: 'rc-contact', education: 'rc-education',
  skills: 'rc-skills', projects: 'rc-projects',
};

const SECTION_MAX: Record<string, number> = {
  contact: 10, summary: 15, experience: 20, education: 15, skills: 20, projects: 10, ats: 10,
};

const SECTION_META: Record<string, { label: string; icon: string }> = {
  contact: { label: 'Contact', icon: 'bi-person' },
  summary: { label: 'Summary', icon: 'bi-file-text' },
  experience: { label: 'Experience', icon: 'bi-briefcase' },
  education: { label: 'Education', icon: 'bi-mortarboard' },
  skills: { label: 'Skills', icon: 'bi-code-slash' },
  projects: { label: 'Projects', icon: 'bi-folder2-open' },
  ats: { label: 'ATS Check', icon: 'bi-shield-check' },
};

const BLANK: ResumeSections = {
  contact: { name: '', title: '', email: '', phone: '', linkedin: '', github: '', portfolio: '', location: '' },
  summary: '', experience: [], education: [], skills: [], projects: [], certifications: [],
};

const ListField: React.FC<{
  label: string; items: string[]; onChange: (v: string[]) => void;
  placeholder?: string; sep?: string; area?: boolean;
}> = ({ label, items, onChange, placeholder, sep = ', ', area }) => {
  const joined = items.join(sep);
  const [draft, setDraft] = useState(joined);
  const [editing, setEditing] = useState(false);
  useEffect(() => { if (!editing) setDraft(joined); }, [joined, editing]);
  const commit = (raw: string) => {
    setDraft(raw);
    onChange(raw.split(sep === ', ' ? ',' : sep).map(x => x.trim()).filter(Boolean));
  };
  const props = {
    value: draft, placeholder,
    onFocus: () => setEditing(true),
    onBlur: () => { setEditing(false); setDraft(items.join(sep)); },
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => commit(e.target.value),
  };
  return <div className="rs-field"><label>{label}</label>{area ? <textarea {...props} rows={4} /> : <input {...props} />}</div>;
};

const Field: React.FC<{ label: string; value: string; onChange: (v: string) => void; area?: boolean; placeholder?: string }> =
  ({ label, value, onChange, area, placeholder }) => (
    <div className="rs-field">
      <label>{label}</label>
      {area ? <textarea value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} /> : <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} />}
    </div>
  );

const SectionTitle: React.FC<{ icon: string; title: string; subtitle: string; done?: boolean }> = ({ icon, title, subtitle, done }) => (
  <div className="rc-section-title">
    <span className="rc-section-icon"><i className={`bi ${icon}`} /></span>
    <div><h3>{title}</h3><p>{subtitle}</p></div>
    <span className={`rc-section-state ${done ? 'done' : 'todo'}`}><i className={`bi ${done ? 'bi-check-circle-fill' : 'bi-exclamation-circle-fill'}`} /></span>
  </div>
);

const ResumeCenter: React.FC = () => {
  const [sections, setSections] = useState<ResumeSections>(BLANK);
  const [importing, setImporting] = useState(false);
  const nav = useNavigate();
  const [params] = useSearchParams();
  const [score, setScore] = useState<ResumeScore | null>(null);
  const [locked, setLocked] = useState<{ priceInr?: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [scoring, setScoring] = useState(false);
  const [improving, setImproving] = useState(false);
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err' | 'info'; text: string } | null>(null);
  const [preview, setPreview] = useState<ResumeSections | null>(null);
  const [paying, setPaying] = useState(false);

  const load = useCallback(async () => {
    try {
      const r = await passportApi.getResume();
      setSections({ ...BLANK, ...r.resume.sections });
      setScore(r.resume.score);
    } catch (e: any) {
      if (e?.response?.status === 403) setLocked({ priceInr: e?.response?.data?.priceInr });
      else setMsg({ kind: 'err', text: e?.response?.data?.message || 'Could not load your resume.' });
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  /**
   * A mission that says "add one project" lands on the project section, not the top of a
   * seven-section page. The mission's link carries the same ?focus= the server reads when
   * it verifies the tick, so what the member is sent to and what is checked cannot drift.
   */
  const focus = params.get('focus');
  useEffect(() => {
    if (loading || locked || !focus) return;
    const id = FOCUS_SECTION[focus];
    if (!id) return;
    const el = document.getElementById(id);
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    el.classList.add('rc-focused');
    const t = setTimeout(() => el.classList.remove('rc-focused'), 2600);
    return () => clearTimeout(t);
  }, [loading, locked, focus]);

  const unlock = async () => {
    setPaying(true);
    const res = await passportApi.membershipCheckout();
    setPaying(false);
    if (res.ok) { setLocked(null); setLoading(true); load(); }
  };

  const patch = (fn: (s: ResumeSections) => void) => {
    setSections(prev => { const next = JSON.parse(JSON.stringify(prev)); fn(next); return next; });
  };

  const runImport = async (file: File) => {
    setImporting(true); setMsg(null);
    try {
      const r = await passportApi.importResume(file);
      setSections({ ...BLANK, ...r.sections });
      setMsg({ kind: 'ok', text: 'Imported. Check each section, then Save — anything you had already typed was kept.' });
    } catch (e: any) {
      setMsg({ kind: 'err', text: e?.response?.data?.message || 'Could not read that file.' });
    }
    setImporting(false);
  };

  const save = async () => {
    setSaving(true); setMsg(null);
    try { await passportApi.saveResume(sections); setMsg({ kind: 'ok', text: 'Saved.' }); }
    catch (e: any) { setMsg({ kind: 'err', text: e?.response?.data?.message || 'Could not save.' }); }
    setSaving(false);
  };

  const runScore = async () => {
    setScoring(true); setMsg(null);
    try {
      await passportApi.saveResume(sections);
      const r = await passportApi.scoreResume();
      setScore(r.score);
      setMsg({
        kind: r.atsReady ? 'ok' : 'info',
        text: r.atsReady
          ? `ATS-ready — you scored ${r.score.total}/100.${r.xpAwarded ? ` +${r.xpAwarded} XP!` : ''}`
          : `Scored ${r.score.total}/100. Your roadmap targets ${r.goodScore}+ — work the fixes below.${r.xpAwarded ? ` +${r.xpAwarded} XP!` : ''}`,
      });
    } catch (e: any) { setMsg({ kind: 'err', text: e?.response?.data?.message || 'Could not score the resume.' }); }
    setScoring(false);
  };

  const runImprove = async () => {
    setImproving(true); setMsg(null);
    try {
      await passportApi.saveResume(sections);
      const r = await passportApi.improveResume();
      setPreview(r.sections);
    } catch (e: any) { setMsg({ kind: 'err', text: e?.response?.data?.message || 'Could not improve the resume.' }); }
    setImproving(false);
  };

  const acceptImproved = () => {
    if (!preview) return;
    setSections({ ...BLANK, ...preview });
    setPreview(null);
    setMsg({ kind: 'ok', text: 'Applied the AI rewrite — review it, then Save.' });
  };

  const completed = useMemo(() => ({
    contact: !!sections.contact.name && !!sections.contact.email && !!sections.contact.phone,
    summary: sections.summary.trim().length >= 40,
    education: sections.education.length > 0,
    skills: sections.skills.some(s => s.items?.length),
    experience: sections.experience.length > 0,
    projects: sections.projects.length > 0,
    certifications: sections.certifications.length > 0,
  }), [sections]);

  const completedCount = Object.values(completed).filter(Boolean).length;
  const topStrength = useMemo(() => {
    if (!score?.breakdown) return 'Build your resume';
    const rows = Object.entries(score.breakdown).filter(([k]) => k !== 'ats');
    if (!rows.length) return 'Build your resume';
    const [key] = rows.sort((a, b) => (Number(b[1]) / (SECTION_MAX[b[0]] || 20)) - (Number(a[1]) / (SECTION_MAX[a[0]] || 20)))[0];
    return SECTION_META[key]?.label || key;
  }, [score]);
  const targetRole = sections.contact.title?.trim() || 'Set your target title';
  const atsLabel = !score ? 'Not scored yet' : score.total >= 75 ? 'ATS Ready' : score.total >= 60 ? 'Getting stronger' : 'Needs improvement';

  if (loading) return <PassportShell><div className="pm-loading">Loading your resume…</div></PassportShell>;

  if (locked) {
    return <PassportShell><LockedPanel title="The Resume Center is part of your membership" blurb="Build a one-page fresher resume, get an honest ATS score with a specific fix list, and let AI sharpen your wording — facts untouched." priceInr={locked.priceInr} busy={paying} onUnlock={unlock} /></PassportShell>;
  }

  return (
    <PassportShell meta={score ? <span className="pm-pill"><i>📄</i>ATS <b>{score.total}</b>/100</span> : undefined}>
      <div className="rc-page">
        <section className="rc-hero">
          <div className="rc-hero-copy">
            <div className="rc-kicker">RESUME READINESS</div>
            <h1>Resume Center</h1>
            <p>Build a resume that reflects your real skills and gets you interview-ready.</p>
            <div className="rc-target">Target Role: <b>{targetRole}</b> <button onClick={() => nav('/careerpilot/setup?step=direction')}><i className="bi bi-pencil" /> Change</button></div>
            <div className="rc-hero-actions">
              <label className={`rc-action primary ${importing ? 'disabled' : ''}`}>
                <i className="bi bi-upload" /> <span><b>{importing ? 'Reading…' : 'Import Resume'}</b><small>Upload PDF/DOCX</small></span>
                <input type="file" accept=".pdf,.doc,.docx" hidden disabled={importing} onChange={e => { const f = e.target.files?.[0]; e.target.value = ''; if (f) runImport(f); }} />
              </label>
              <button className="rc-action" onClick={runScore} disabled={scoring}><i className="bi bi-bar-chart-fill" /><span><b>{scoring ? 'Scoring…' : 'Score Resume'}</b><small>Analyze ATS score</small></span></button>
              <button className="rc-action" onClick={runImprove} disabled={improving}><i className="bi bi-stars" /><span><b>{improving ? 'Rewriting…' : 'Improve with AI'}</b><small>Get AI suggestions</small></span></button>
            </div>
          </div>
          <div className="rc-hero-art"><img src="/assets/careerpilot/careerpilot-hero-student.png" alt="CareerPilot student" onError={e => { e.currentTarget.style.display = 'none'; }} /></div>
          <div className="rc-score-card">
            <div className="rc-score-ring" style={{ '--score': `${score?.total || 0}%` } as React.CSSProperties}><div><strong>{score?.total ?? '—'}</strong><span>/100</span></div></div>
            <div><span>ATS Score</span><h3>{atsLabel}</h3><p>{score ? 'Use the intelligence panel below to improve the sections holding you back.' : 'Score your resume to get section-level feedback and an ATS fix list.'}</p></div>
          </div>
        </section>

        {msg && <div className={`pm-msg ${msg.kind} rc-message`}>{msg.text}</div>}

        <section className="rc-stats">
          <div className="rc-stat"><span className="rc-stat-icon teal"><i className="bi bi-patch-check-fill" /></span><div><small>ATS Score</small><strong>{score ? `${score.total}/100` : '—'}</strong><span>{atsLabel}</span></div></div>
          <div className="rc-stat"><span className="rc-stat-icon violet"><i className="bi bi-clipboard-check-fill" /></span><div><small>Completed Sections</small><strong>{completedCount}/7</strong><span>{completedCount >= 6 ? 'Almost there!' : 'Keep building'}</span></div></div>
          <div className="rc-stat"><span className="rc-stat-icon amber"><i className="bi bi-star-fill" /></span><div><small>Top Strength</small><strong>{topStrength}</strong><span>Strongest scored area</span></div></div>
          <div className="rc-stat"><span className="rc-stat-icon red"><i className="bi bi-exclamation-triangle-fill" /></span><div><small>Priority Fixes</small><strong>{score?.suggestions?.length || 0}</strong><span>{score?.suggestions?.length ? 'Need attention' : 'Score to identify'}</span></div></div>
        </section>

        {preview && (
          <section className="rc-ai-preview">
            <div className="rc-ai-head"><div><span className="rc-ai-icon"><i className="bi bi-stars" /></span><div><h3>AI Rewrite Assistant <em>Beta</em></h3><p>Your facts stay untouched. Only the wording is sharpened.</p></div></div><button onClick={() => setPreview(null)} aria-label="Close"><i className="bi bi-x-lg" /></button></div>
            <div className="rc-ai-compare">
              <div><span>Original</span><p>{sections.summary || '(No summary yet)'}</p></div>
              <i className="bi bi-arrow-right rc-ai-arrow" />
              <div className="improved"><span><i className="bi bi-stars" /> AI Improved</span><p>{preview.summary || '(unchanged)'}</p></div>
            </div>
            <div className="rc-ai-actions"><button className="rc-btn primary" onClick={acceptImproved}><i className="bi bi-check-lg" /> Apply Rewrite</button><button className="rc-btn" onClick={() => setPreview(null)}>Discard</button></div>
          </section>
        )}

        <div className="rc-workspace">
          <main className="rc-editor">
            <div className="rc-editor-head"><div><h2>Resume Builder</h2><p>Complete each section to build a strong, evidence-backed resume.</p></div><span>{completedCount}/7 complete</span></div>

            <section className="rs-section rc-section-card" id="rc-contact">
              <SectionTitle icon="bi-person" title="Contact Information" subtitle="Name, email, phone, location, links" done={completed.contact} />
              <div className="rc-fields"><div className="rs-row"><Field label="Full name" value={sections.contact.name} onChange={v => patch(s => { s.contact.name = v; })} /><Field label="Target title" value={sections.contact.title || ''} onChange={v => patch(s => { s.contact.title = v; })} placeholder="e.g. Backend Engineer" /></div><div className="rs-row"><Field label="Email" value={sections.contact.email} onChange={v => patch(s => { s.contact.email = v; })} /><Field label="Phone" value={sections.contact.phone} onChange={v => patch(s => { s.contact.phone = v; })} /></div><div className="rs-row"><Field label="LinkedIn" value={sections.contact.linkedin || ''} onChange={v => patch(s => { s.contact.linkedin = v; })} /><Field label="GitHub" value={sections.contact.github || ''} onChange={v => patch(s => { s.contact.github = v; })} /></div><Field label="Location" value={sections.contact.location || ''} onChange={v => patch(s => { s.contact.location = v; })} /></div>
            </section>

            <section className="rs-section rc-section-card"><SectionTitle icon="bi-file-text" title="Professional Summary" subtitle="Highlight your experience and key strengths" done={completed.summary} /><div className="rc-fields"><Field label="2–3 lines" area value={sections.summary} onChange={v => patch(s => { s.summary = v; })} placeholder="Final-year CSE student with hands-on Java and SQL experience through 3 projects…" /></div></section>

            <section className="rs-section rc-section-card" id="rc-education"><SectionTitle icon="bi-mortarboard" title="Education" subtitle="Your educational background" done={completed.education} /><div className="rc-fields">{sections.education.map((e, i) => <div className="rs-sub" key={i}><button className="rs-del" onClick={() => patch(s => { s.education.splice(i, 1); })}>✕</button><div className="rs-row"><Field label="Degree" value={e.degree} onChange={v => patch(s => { s.education[i].degree = v; })} placeholder="B.Tech CSE" /><Field label="College" value={e.college} onChange={v => patch(s => { s.education[i].college = v; })} /></div><div className="rs-row"><Field label="Year" value={e.year || ''} onChange={v => patch(s => { s.education[i].year = v; })} placeholder="2026" /><Field label="CGPA" value={e.cgpa || ''} onChange={v => patch(s => { s.education[i].cgpa = v; })} /></div></div>)}<button className="rs-add" onClick={() => patch(s => { s.education.push({ degree: '', college: '', year: '', cgpa: '' }); })}>+ Add education</button></div></section>

            <section className="rs-section rc-section-card" id="rc-skills"><SectionTitle icon="bi-code-slash" title="Skills" subtitle="Technical and soft skills" done={completed.skills} /><div className="rc-fields">{sections.skills.map((g, i) => <div className="rs-sub" key={i}><button className="rs-del" onClick={() => patch(s => { s.skills.splice(i, 1); })}>✕</button><div className="rs-row"><Field label="Group" value={g.category} onChange={v => patch(s => { s.skills[i].category = v; })} placeholder="Languages" /><ListField label="Items (comma separated)" items={g.items} onChange={v => patch(s => { s.skills[i].items = v; })} placeholder="Java, SQL, Git" /></div></div>)}<button className="rs-add" onClick={() => patch(s => { s.skills.push({ category: '', items: [] }); })}>+ Add skill group</button></div></section>

            <section className="rs-section rc-section-card"><SectionTitle icon="bi-briefcase" title="Experience / Internships" subtitle="Your work experience and responsibilities" done={completed.experience} /><div className="rc-fields">{sections.experience.map((x, i) => <div className="rs-sub" key={i}><button className="rs-del" onClick={() => patch(s => { s.experience.splice(i, 1); })}>✕</button><div className="rs-row"><Field label="Company" value={x.company} onChange={v => patch(s => { s.experience[i].company = v; })} /><Field label="Role" value={x.role} onChange={v => patch(s => { s.experience[i].role = v; })} /></div><div className="rs-row"><Field label="From" value={x.from} onChange={v => patch(s => { s.experience[i].from = v; })} placeholder="Jun 2025" /><Field label="To" value={x.to} onChange={v => patch(s => { s.experience[i].to = v; })} placeholder="Aug 2025" /></div><ListField label="Bullets (one per line)" area sep={'\n'} items={x.bullets} placeholder={'Built the payment screen in React\nCut page load from 4s to 1.2s'} onChange={v => patch(s => { s.experience[i].bullets = v; })} /></div>)}<button className="rs-add" onClick={() => patch(s => { s.experience.push({ company: '', role: '', from: '', to: '', current: false, bullets: [] }); })}>+ Add experience</button></div></section>

            <section className="rs-section rc-section-card" id="rc-projects"><SectionTitle icon="bi-folder2-open" title="Projects" subtitle="Key projects and achievements" done={completed.projects} /><div className="rc-fields">{sections.projects.map((p, i) => <div className="rs-sub" key={i}><button className="rs-del" onClick={() => patch(s => { s.projects.splice(i, 1); })}>✕</button><div className="rs-row"><Field label="Name" value={p.name} onChange={v => patch(s => { s.projects[i].name = v; })} /><ListField label="Tech (comma separated)" items={p.tech} onChange={v => patch(s => { s.projects[i].tech = v; })} /></div><Field label="What it does & what you built" area value={p.description} onChange={v => patch(s => { s.projects[i].description = v; })} /><Field label="Link" value={p.link || ''} onChange={v => patch(s => { s.projects[i].link = v; })} placeholder="https://github.com/…" /></div>)}<button className="rs-add" onClick={() => patch(s => { s.projects.push({ name: '', tech: [], description: '', link: '' }); })}>+ Add project</button></div></section>

            <section className="rs-section rc-section-card"><SectionTitle icon="bi-award" title="Certifications" subtitle="Certifications and achievements" done={completed.certifications} /><div className="rc-fields">{sections.certifications.map((c, i) => <div className="rs-sub" key={i}><button className="rs-del" onClick={() => patch(s => { s.certifications.splice(i, 1); })}>✕</button><div className="rs-row"><Field label="Name" value={c.name} onChange={v => patch(s => { s.certifications[i].name = v; })} /><Field label="Issuer" value={c.issuer} onChange={v => patch(s => { s.certifications[i].issuer = v; })} /></div><Field label="Year" value={c.year || ''} onChange={v => patch(s => { s.certifications[i].year = v; })} /></div>)}<button className="rs-add" onClick={() => patch(s => { s.certifications.push({ name: '', issuer: '', year: '' }); })}>+ Add certification</button></div></section>
          </main>

          <aside className="rc-intelligence">
            <section className="rc-panel rc-score-panel">
              <div className="rc-panel-head"><h3>Resume Intelligence</h3><span>{score ? 'Live score' : 'Not scored'}</span></div>
              {!score ? <div className="rc-score-empty"><span><i className="bi bi-bar-chart" /></span><h4>Score your resume</h4><p>Get an honest ATS read, section scores and a prioritized fix list.</p><button className="rc-btn primary" onClick={runScore}>Score My Resume</button></div> : <><div className="rc-mini-score"><div className="rc-score-ring small" style={{ '--score': `${score.total}%` } as React.CSSProperties}><div><strong>{score.total}</strong><span>/100</span></div></div><div><small>ATS Score</small><h3>{atsLabel}</h3><p>Keep improving toward a recruiter-ready resume.</p></div></div><div className="rc-breakdown">{Object.entries(score.breakdown || {}).map(([k, v]) => { const max = SECTION_MAX[k] || 20; const pct = Math.min(100, (Number(v) / max) * 100); return <div className="rc-break-row" key={k}><div><span>{SECTION_META[k]?.label || k}</span><b>{v as number}/{max}</b></div><div className="rc-break-bar"><i style={{ width: `${pct}%` }} /></div></div>; })}</div></>}
            </section>

            {!!score?.suggestions?.length && <section className="rc-panel"><div className="rc-panel-head"><h3><i className="bi bi-exclamation-circle text-danger" /> Fix These First</h3></div><div className="rc-fix-list">{score.suggestions.slice(0, 5).map((s, i) => <div className="rc-fix-item" key={i}><span className="rc-fix-dot"><i className="bi bi-bullseye" /></span><div><b>{s.issue}</b><p>{s.fix}</p></div><em>{i < 2 ? 'High' : 'Medium'}</em></div>)}</div></section>}

            {!!score?.atsWarnings?.length && <section className="rc-panel"><div className="rc-panel-head"><h3>ATS Warnings</h3></div><ul className="rc-warning-list">{score.atsWarnings.map((w, i) => <li key={i}><i className="bi bi-shield-exclamation" /> {w}</li>)}</ul></section>}

            <section className="rc-panel rc-role-panel"><div className="rc-panel-head"><h3>Target Role Alignment</h3></div><div className="rc-role"><span><i className="bi bi-briefcase-fill" /></span><div><b>{targetRole}</b><small>CareerPilot target title</small></div></div><p>See how your resume evidence reads against the role you are aiming for.</p><button onClick={() => nav('/careerpilot/placement')}>View role readiness <i className="bi bi-arrow-right" /></button></section>

            {!!score?.keywordsMissing?.length && <section className="rc-panel"><div className="rc-panel-head"><h3>Top Missing Keywords</h3></div><div className="rs-kw">{score.keywordsMissing.slice(0, 8).map(k => <span className="missing" key={k}>{k}</span>)}</div></section>}
          </aside>
        </div>

        <div className="rc-sticky-actions"><div><span className="rc-trophy"><i className="bi bi-trophy-fill" /></span><div><b>Keep improving!</b><small>A better resume creates better opportunities.</small></div></div><div><button className="rc-btn primary" onClick={save} disabled={saving}><i className="bi bi-briefcase" /> {saving ? 'Saving…' : 'Save Resume'}</button><button className="rc-btn" onClick={runScore} disabled={scoring}><i className="bi bi-bar-chart-fill" /> {scoring ? 'Scoring…' : 'Score My Resume'}</button><button className="rc-btn teal" onClick={runImprove} disabled={improving}><i className="bi bi-stars" /> {improving ? 'Rewriting…' : 'Improve with AI'}</button></div></div>
      </div>
    </PassportShell>
  );
};

export default ResumeCenter;