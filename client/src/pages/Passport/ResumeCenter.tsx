import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import passportApi, { ResumeSections, ResumeScore } from '../../api/passportApi';
import PassportShell from './PassportShell';
import SectionLock from './SectionLock';
import './resumeCenter.css';
import './resumeCenterRedesign.css';
import { ResumeDocument, TEMPLATES } from '../ResumeBuilder/templates';
import type { ResumeTemplate } from '../../api/resumeApi';

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

/**
 * The stages a resume is read in, for the banner's step line. A stage is ticked from the
 * member's own sections, never from a guess: "Work" covers experience OR projects, because a
 * fresher with three projects and no internship has still cleared that stage.
 */
const RESUME_STAGES: { label: string; title: string; keys: string[] }[] = [
  { label: 'Contact', title: 'Contact information', keys: ['contact'] },
  { label: 'Summary', title: 'Professional summary', keys: ['summary'] },
  { label: 'Skills', title: 'Skills', keys: ['skills'] },
  { label: 'Work', title: 'Experience or projects', keys: ['experience', 'projects'] },
  { label: 'Education', title: 'Education', keys: ['education'] },
];

/** The seven sections in the order they appear on the page, so "first empty" is the first one
 *  the member would reach scrolling down, not an order invented for the banner. */
const RESUME_TODO: { key: string; id: string; label: string; hint: string }[] = [
  { key: 'contact', id: 'rc-contact', label: 'Contact information', hint: 'Name, email and phone — nobody can call you without them.' },
  { key: 'summary', id: 'rc-summary', label: 'Professional summary', hint: 'Two or three lines on what you build and what you are aiming for.' },
  { key: 'education', id: 'rc-education', label: 'Education', hint: 'Your degree, college, year and CGPA.' },
  { key: 'skills', id: 'rc-skills', label: 'Skills', hint: 'Group the languages and tools you can actually use.' },
  { key: 'experience', id: 'rc-experience', label: 'Experience / internships', hint: 'Any internship or part-time work, with what you did there.' },
  { key: 'projects', id: 'rc-projects', label: 'Projects', hint: 'What you built, the tech behind it and a link.' },
  { key: 'certifications', id: 'rc-certifications', label: 'Certifications', hint: 'Courses and certificates worth naming.' },
];

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
  /** Set when the server says scoring/rewriting have no AI provider: said once, plainly, instead of a failure per click. */
  const [aiOff, setAiOff] = useState(false);
  /** Build (the editor) or Preview & download (templates + the page as it will print). */
  const [view, setView] = useState<'build' | 'preview'>('build');
  /** The chosen look — the LMS Resume Builder's templates, remembered on this device. */
  const [template, setTemplate] = useState<ResumeTemplate>(() => {
    try { return (localStorage.getItem('cp.resumeTemplate') as ResumeTemplate) || 'classic'; } catch { return 'classic'; }
  });
  /** An always-mounted copy of the page as it prints, so Download works from either tab. */
  const printRef = useRef<HTMLDivElement>(null);
  const chooseTemplate = (t: ResumeTemplate) => { setTemplate(t); try { localStorage.setItem('cp.resumeTemplate', t); } catch { /* private mode */ } };

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


  const patch = (fn: (s: ResumeSections) => void) => {
    setSections(prev => { const next = JSON.parse(JSON.stringify(prev)); fn(next); return next; });
  };

  const runImport = async (file: File) => {
    setImporting(true); setMsg(null);
    try {
      const r = await passportApi.importResume(file);
      setSections({ ...BLANK, ...r.sections });
      setMsg({ kind: 'ok', text: `Imported from ${file.name}. Check each section below — anything you had already typed was kept.` });
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

  /**
   * Download = the browser's "Save as PDF" of the resume ALONE.
   *
   * Printed from a hidden frame holding only the resume and the app's stylesheets, rather than by hiding the rest of
   * this page: the member shell (rail, sticky bars, #root's .75 zoom) otherwise shrinks the page or adds blank sheets.
   * The PDF keeps real text, so ATS tools can read it; the frame's title is the file name the dialog suggests.
   */
  const download = () => {
    const src = printRef.current;
    if (!src) return;
    const clean = (x?: string) => (x || '').trim().replace(/[^\w\s-]/g, '').replace(/\s+/g, '_');
    const name = [clean(sections.contact.name) || 'Resume', clean(sections.contact.title), 'Resume'].filter(Boolean).join('_');
    const styles = Array.from(document.head.querySelectorAll('style, link[rel="stylesheet"]')).map(n => n.outerHTML).join('');
    const frame = document.createElement('iframe');
    frame.setAttribute('aria-hidden', 'true');
    /*
     * OFF-SCREEN, NOT INVISIBLE AND NOT ZERO-SIZED.
     *
     * This was width:0;height:0;visibility:hidden. A frame with no size has nothing to lay
     * out, and a hidden one is not guaranteed to render at all — which is how the dialog
     * came up on a blank or unstyled page. It needs real A4-ish dimensions to lay the
     * resume out; it just does not need to be anywhere the member can see.
     */
    frame.style.cssText = 'position:fixed;left:-10000px;top:0;width:794px;height:1123px;border:0';
    document.body.appendChild(frame);
    const doc = frame.contentDocument!;
    doc.open();
    doc.write(`<!doctype html><html><head><meta charset="utf-8"><title>${name}</title>${styles}<style>@page{size:A4;margin:0}html,body{margin:0!important;padding:0!important;background:#fff!important;zoom:1!important}*{-webkit-print-color-adjust:exact;print-color-adjust:exact}</style></head><body>${src.innerHTML}</body></html>`);
    doc.close();
    const win = frame.contentWindow!;
    let done = false;
    const cleanup = () => { if (done) return; done = true; setTimeout(() => frame.remove(), 500); };
    win.addEventListener('afterprint', cleanup);

    /**
     * WAIT FOR THE PAGE TO BE READY, RATHER THAN FOR 400ms.
     *
     * The old code guessed. Every <link rel="stylesheet"> copied into this frame is fetched
     * again from scratch, and webfonts after that, so on a cold cache or a slow connection
     * the print dialog opened over an unstyled document — a resume that looked broken, or
     * blank, with nothing said about why.
     *
     * So: wait for every stylesheet to settle, then for the fonts, then print. The timeout
     * is a ceiling rather than the mechanism, because a stylesheet that never loads must
     * not leave the member with a button that silently does nothing.
     */
    const sheets = Array.from(doc.querySelectorAll('link[rel="stylesheet"]')) as HTMLLinkElement[];
    const settled = sheets.map(l => (l.sheet ? Promise.resolve() : new Promise<void>(res => {
      l.addEventListener('load', () => res(), { once: true });
      l.addEventListener('error', () => res(), { once: true });
    })));
    const fonts = (doc as any).fonts?.ready ?? Promise.resolve();
    const ceiling = new Promise<void>(res => setTimeout(res, 4000));

    void Promise.race([Promise.all([...settled, fonts]), ceiling]).then(() => {
      try {
        win.focus();
        win.print();
        if (!('onafterprint' in win)) cleanup();
      } catch {
        cleanup();
        setMsg({ kind: 'err', text: 'Your browser blocked the print dialog. Allow pop-ups for this site and try again.' });
      }
    });
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
    } catch (e: any) { if (e?.response?.data?.aiMissing) setAiOff(true); else setMsg({ kind: 'err', text: e?.response?.data?.message || 'Could not score the resume.' }); }
    setScoring(false);
  };

  const runImprove = async () => {
    setImproving(true); setMsg(null);
    try {
      await passportApi.saveResume(sections);
      const r = await passportApi.improveResume();
      setPreview(r.sections);
    } catch (e: any) { if (e?.response?.data?.aiMissing) setAiOff(true); else setMsg({ kind: 'err', text: e?.response?.data?.message || 'Could not improve the resume.' }); }
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
  /** Indexed lookup for the banner's stages, which name their sections as plain strings. */
  const doneBySection = completed as Record<string, boolean>;
  const totalSections = Object.keys(completed).length;
  const firstEmpty = RESUME_TODO.find(s => !doneBySection[s.key]) || null;
  /**
   * The banner's next-step row lands on the section itself. From Preview the editor is not
   * mounted, so the view is switched back first and the scroll waits for that render — the
   * same highlight the mission deep-link uses, so both feel like one behaviour.
   */
  const jumpToSection = (id: string) => {
    setView('build');
    setTimeout(() => {
      const el = document.getElementById(id);
      if (!el) return;
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.add('rc-focused');
      setTimeout(() => el.classList.remove('rc-focused'), 2600);
    }, 60);
  };
  const topStrength = useMemo(() => {
    if (!score?.breakdown) return 'Build your resume';
    const rows = Object.entries(score.breakdown).filter(([k]) => k !== 'ats');
    if (!rows.length) return 'Build your resume';
    const [key] = rows.sort((a, b) => (Number(b[1]) / (SECTION_MAX[b[0]] || 20)) - (Number(a[1]) / (SECTION_MAX[a[0]] || 20)))[0];
    return SECTION_META[key]?.label || key;
  }, [score]);
  const hasTargetTitle = !!sections.contact.title?.trim();
  const targetRole = sections.contact.title?.trim() || '';
  const atsLabel = !score ? 'Not scored yet' : score.total >= 75 ? 'ATS Ready' : score.total >= 60 ? 'Getting stronger' : 'Needs improvement';

  if (loading) return <PassportShell><div className="pm-loading">Loading your resume…</div></PassportShell>;

  if (locked) {
    return <PassportShell><SectionLock section="resume" blurb="Build a one-page fresher resume, get an honest ATS score with a specific fix list, and let AI sharpen your wording — facts untouched." /></PassportShell>;
  }

  return (
    <PassportShell meta={score ? <span className="pm-pill"><i>📄</i>ATS <b>{score.total}</b>/100</span> : undefined}>
      <div className="rc-page rc2">
        {/* The banner, as on every redesigned CareerPilot page: the actions, the member's own resume
            progress in the middle, and the ATS score. */}
        <section className="rc-hero rc2-hero">
          <div className="rc-hero-copy">
            <div className="rc-kicker">Resume readiness</div>
            <h1>Resume <span>Center</span></h1>
            <p>Build a one-page resume that reflects your real skills — import the one you have, score it, and sharpen the wording.</p>
            <div className="rc-hero-actions">
              <label className={`rc-action primary ${importing ? 'disabled' : ''}`}>
                <i className="bi bi-upload" /> <span><b>{importing ? 'Reading your file…' : 'Import resume'}</b><small>PDF or Word (.docx)</small></span>
                <input type="file" accept=".pdf,.doc,.docx" hidden disabled={importing} onChange={e => { const f = e.target.files?.[0]; e.target.value = ''; if (f) runImport(f); }} />
              </label>
              <button className="rc-action" onClick={runScore} disabled={scoring}><i className="bi bi-bar-chart-fill" /><span><b>{scoring ? 'Scoring…' : 'Score resume'}</b><small>{aiOff ? 'Needs an AI key' : 'ATS score + fix list'}</small></span></button>
              <button className="rc-action" onClick={download}><i className="bi bi-download" /><span><b>Download PDF</b><small>Pick a template first</small></span></button>
              <button className="rc-action" onClick={runImprove} disabled={improving}><i className="bi bi-stars" /><span><b>{improving ? 'Rewriting…' : 'Improve with AI'}</b><small>{aiOff ? 'Needs an AI key' : 'Sharper wording, same facts'}</small></span></button>
            </div>
          </div>
          {/* Resume progress: how much of the resume is really filled, the stage it has reached and the
              next section still empty — every figure comes from the sections already loaded. */}
          <div className="rc2-momentum">
            <div className="rc-kicker">Resume progress</div>
            <div className={`rc2-filled${completedCount === totalSections ? ' on' : ''}`}>
              <span className="ic"><i className="bi bi-file-earmark-text-fill" /></span>
              <div>
                <b>{completedCount} of {totalSections} sections filled</b>
                <span>{completedCount === totalSections ? 'Every section has something in it.' : `${totalSections - completedCount} still empty — each one adds evidence.`}</span>
                <i className="rc2-filled-bar" aria-hidden="true"><em style={{ width: `${Math.max(completedCount ? 4 : 0, Math.round((completedCount / totalSections) * 100))}%` }} /></i>
              </div>
              {score && <b className="rc2-filled-score">{score.total}<em>/100</em></b>}
            </div>
            <ol className="rc2-steps2">
              {(() => {
                const marks = RESUME_STAGES.map(s => s.keys.some(k => doneBySection[k]));
                const current = marks.indexOf(false);
                return RESUME_STAGES.map((s, i) => (
                  <li key={s.label} className={marks[i] ? 'done' : i === current ? 'current' : ''} title={s.title}><i /><span>{s.label}</span></li>
                ));
              })()}
            </ol>
            {firstEmpty
              ? <button type="button" className="rc2-next" onClick={() => jumpToSection(firstEmpty.id)}>
                  <span className="ic"><i className="bi bi-pencil-square" /></span>
                  <div><b>Next: {firstEmpty.label}</b><span>{firstEmpty.hint}</span></div>
                  <i className="bi bi-chevron-right" />
                </button>
              : <button type="button" className="rc2-next" onClick={runScore} disabled={scoring}>
                  <span className="ic"><i className="bi bi-check-circle-fill" /></span>
                  <div><b>All seven sections are filled</b><span>{scoring ? 'Scoring…' : 'Score it again to see what a recruiter’s ATS makes of it.'}</span></div>
                  <i className="bi bi-chevron-right" />
                </button>}
          </div>
          <div className="rc-score-card">
            <div className="rc-score-ring" style={{ '--score': `${score?.total || 0}%` } as React.CSSProperties}><div><strong>{score?.total ?? '—'}</strong>{score && <span>/100</span>}</div></div>
            <div><span>ATS score</span><h3>{atsLabel}</h3><p>{score ? 'Work the fix list on the right to raise it.' : 'Score your resume for section-level feedback and an ATS fix list.'}</p></div>
          </div>
        </section>

        {msg && <div className={`pm-msg ${msg.kind} rc-message`}>{msg.text}</div>}
        {aiOff && (
          <div className="rc2-aioff">
            <i className="bi bi-plug" />
            <div><b>AI scoring and rewriting are not switched on yet</b><span>No AI provider is set up for your institute — ask your admin to add an Anthropic or OpenAI key in Platform Settings. Importing, editing and saving your resume all work.</span></div>
          </div>
        )}

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
            <div className="rc-editor-head">
              <div><h2>Resume Builder</h2><p>{view === 'build' ? 'Complete each section to build a strong, evidence-backed resume.' : 'Pick a template, check the page, then download it as a PDF.'}</p></div>
              <div className="rc2-tabs" role="tablist" aria-label="Resume builder view">
                <button role="tab" aria-selected={view === 'build'} className={view === 'build' ? 'on' : ''} onClick={() => setView('build')}><i className="bi bi-pencil-square" /> Build <em>{completedCount}/7</em></button>
                <button role="tab" aria-selected={view === 'preview'} className={view === 'preview' ? 'on' : ''} onClick={() => setView('preview')}><i className="bi bi-eye" /> Preview &amp; download</button>
              </div>
            </div>

            {view === 'preview' && (
              <section className="rc2-preview">
                <div className="rc2-preview-bar">
                  <div><b>Template</b><span>{TEMPLATES.find(t => t.id === template)?.name} — {TEMPLATES.find(t => t.id === template)?.blurb}</span></div>
                  <button className="rc-btn primary" onClick={download}><i className="bi bi-download" /> Download PDF</button>
                </div>
                <div className="rc2-templates" role="radiogroup" aria-label="Resume templates">
                  {TEMPLATES.map(t => (
                    <button key={t.id} role="radio" aria-checked={template === t.id} className={`rc2-tpl${template === t.id ? ' on' : ''}`} onClick={() => chooseTemplate(t.id)}>
                      <span className="rc2-tpl-thumb" style={{ ['--acc' as any]: t.accent }} aria-hidden="true"><i /><i /><i /><i /></span>
                      <b>{t.name}</b><small>{t.blurb}</small>
                      {template === t.id && <em><i className="bi bi-check-circle-fill" /></em>}
                    </button>
                  ))}
                </div>
                <div className="rc2-paper-wrap">
                  <div className="rc2-paper">
                    <ResumeDocument sections={sections as any} template={template} />
                  </div>
                </div>
                <p className="rc2-print-tip"><i className="bi bi-info-circle" /> In the print window choose <b>Save as PDF</b> as the destination. The PDF keeps real text, so ATS tools can read it.</p>
              </section>
            )}

            {/* The printable page, always mounted (off-screen) so Download works from the Build tab too. */}
            <div className="rc2-print-src" ref={printRef} aria-hidden="true"><ResumeDocument sections={sections as any} template={template} /></div>

            {view === 'build' && (<>

            <section className="rs-section rc-section-card" id="rc-contact">
              <SectionTitle icon="bi-person" title="Contact Information" subtitle="Name, email, phone, location, links" done={completed.contact} />
              <div className="rc-fields"><div className="rs-row"><Field label="Full name" value={sections.contact.name} onChange={v => patch(s => { s.contact.name = v; })} /><Field label="Target title" value={sections.contact.title || ''} onChange={v => patch(s => { s.contact.title = v; })} placeholder="e.g. Backend Engineer" /></div><div className="rs-row"><Field label="Email" value={sections.contact.email} onChange={v => patch(s => { s.contact.email = v; })} /><Field label="Phone" value={sections.contact.phone} onChange={v => patch(s => { s.contact.phone = v; })} /></div><div className="rs-row"><Field label="LinkedIn" value={sections.contact.linkedin || ''} onChange={v => patch(s => { s.contact.linkedin = v; })} /><Field label="GitHub" value={sections.contact.github || ''} onChange={v => patch(s => { s.contact.github = v; })} /></div><Field label="Location" value={sections.contact.location || ''} onChange={v => patch(s => { s.contact.location = v; })} /></div>
            </section>

            <section className="rs-section rc-section-card" id="rc-summary"><SectionTitle icon="bi-file-text" title="Professional Summary" subtitle="Highlight your experience and key strengths" done={completed.summary} /><div className="rc-fields"><Field label="2–3 lines" area value={sections.summary} onChange={v => patch(s => { s.summary = v; })} placeholder="Final-year CSE student with hands-on Java and SQL experience through 3 projects…" /></div></section>

            <section className="rs-section rc-section-card" id="rc-education"><SectionTitle icon="bi-mortarboard" title="Education" subtitle="Your educational background" done={completed.education} /><div className="rc-fields">{sections.education.map((e, i) => <div className="rs-sub" key={i}><button className="rs-del" onClick={() => patch(s => { s.education.splice(i, 1); })}>✕</button><div className="rs-row"><Field label="Degree" value={e.degree} onChange={v => patch(s => { s.education[i].degree = v; })} placeholder="B.Tech CSE" /><Field label="College" value={e.college} onChange={v => patch(s => { s.education[i].college = v; })} /></div><div className="rs-row"><Field label="Year" value={e.year || ''} onChange={v => patch(s => { s.education[i].year = v; })} placeholder="2026" /><Field label="CGPA" value={e.cgpa || ''} onChange={v => patch(s => { s.education[i].cgpa = v; })} /></div></div>)}<button className="rs-add" onClick={() => patch(s => { s.education.push({ degree: '', college: '', year: '', cgpa: '' }); })}>+ Add education</button></div></section>

            <section className="rs-section rc-section-card" id="rc-skills"><SectionTitle icon="bi-code-slash" title="Skills" subtitle="Technical and soft skills" done={completed.skills} /><div className="rc-fields">{sections.skills.map((g, i) => <div className="rs-sub" key={i}><button className="rs-del" onClick={() => patch(s => { s.skills.splice(i, 1); })}>✕</button><div className="rs-row"><Field label="Group" value={g.category} onChange={v => patch(s => { s.skills[i].category = v; })} placeholder="Languages" /><ListField label="Items (comma separated)" items={g.items} onChange={v => patch(s => { s.skills[i].items = v; })} placeholder="Java, SQL, Git" /></div></div>)}<button className="rs-add" onClick={() => patch(s => { s.skills.push({ category: '', items: [] }); })}>+ Add skill group</button></div></section>

            <section className="rs-section rc-section-card" id="rc-experience"><SectionTitle icon="bi-briefcase" title="Experience / Internships" subtitle="Your work experience and responsibilities" done={completed.experience} /><div className="rc-fields">{sections.experience.map((x, i) => <div className="rs-sub" key={i}><button className="rs-del" onClick={() => patch(s => { s.experience.splice(i, 1); })}>✕</button><div className="rs-row"><Field label="Company" value={x.company} onChange={v => patch(s => { s.experience[i].company = v; })} /><Field label="Role" value={x.role} onChange={v => patch(s => { s.experience[i].role = v; })} /></div><div className="rs-row"><Field label="From" value={x.from} onChange={v => patch(s => { s.experience[i].from = v; })} placeholder="Jun 2025" /><Field label="To" value={x.to} onChange={v => patch(s => { s.experience[i].to = v; })} placeholder="Aug 2025" /></div><ListField label="Bullets (one per line)" area sep={'\n'} items={x.bullets} placeholder={'Built the payment screen in React\nCut page load from 4s to 1.2s'} onChange={v => patch(s => { s.experience[i].bullets = v; })} /></div>)}<button className="rs-add" onClick={() => patch(s => { s.experience.push({ company: '', role: '', from: '', to: '', current: false, bullets: [] }); })}>+ Add experience</button></div></section>

            <section className="rs-section rc-section-card" id="rc-projects"><SectionTitle icon="bi-folder2-open" title="Projects" subtitle="Key projects and achievements" done={completed.projects} /><div className="rc-fields">{sections.projects.map((p, i) => <div className="rs-sub" key={i}><button className="rs-del" onClick={() => patch(s => { s.projects.splice(i, 1); })}>✕</button><div className="rs-row"><Field label="Name" value={p.name} onChange={v => patch(s => { s.projects[i].name = v; })} /><ListField label="Tech (comma separated)" items={p.tech} onChange={v => patch(s => { s.projects[i].tech = v; })} /></div><Field label="What it does & what you built" area value={p.description} onChange={v => patch(s => { s.projects[i].description = v; })} /><Field label="Link" value={p.link || ''} onChange={v => patch(s => { s.projects[i].link = v; })} placeholder="https://github.com/…" /></div>)}<button className="rs-add" onClick={() => patch(s => { s.projects.push({ name: '', tech: [], description: '', link: '' }); })}>+ Add project</button></div></section>

            <section className="rs-section rc-section-card" id="rc-certifications"><SectionTitle icon="bi-award" title="Certifications" subtitle="Certifications and achievements" done={completed.certifications} /><div className="rc-fields">{sections.certifications.map((c, i) => <div className="rs-sub" key={i}><button className="rs-del" onClick={() => patch(s => { s.certifications.splice(i, 1); })}>✕</button><div className="rs-row"><Field label="Name" value={c.name} onChange={v => patch(s => { s.certifications[i].name = v; })} /><Field label="Issuer" value={c.issuer} onChange={v => patch(s => { s.certifications[i].issuer = v; })} /></div><Field label="Year" value={c.year || ''} onChange={v => patch(s => { s.certifications[i].year = v; })} /></div>)}<button className="rs-add" onClick={() => patch(s => { s.certifications.push({ name: '', issuer: '', year: '' }); })}>+ Add certification</button></div></section>
            </>)}
          </main>

          <aside className="rc-intelligence">
            <section className="rc-panel rc-score-panel">
              <div className="rc-panel-head"><h3>Resume Intelligence</h3><span>{score ? 'Live score' : 'Not scored'}</span></div>
              {!score ? <div className="rc-score-empty"><span><i className="bi bi-bar-chart" /></span><h4>Score your resume</h4><p>Get an honest ATS read, section scores and a prioritized fix list.</p><button className="rc-btn primary" onClick={runScore}>Score My Resume</button></div> : <><div className="rc-mini-score"><div className="rc-score-ring small" style={{ '--score': `${score.total}%` } as React.CSSProperties}><div><strong>{score.total}</strong><span>/100</span></div></div><div><small>ATS Score</small><h3>{atsLabel}</h3><p>Keep improving toward a recruiter-ready resume.</p></div></div><div className="rc-breakdown">{Object.entries(score.breakdown || {}).map(([k, v]) => { const max = SECTION_MAX[k] || 20; const pct = Math.min(100, (Number(v) / max) * 100); return <div className="rc-break-row" key={k}><div><span>{SECTION_META[k]?.label || k}</span><b>{v as number}/{max}</b></div><div className="rc-break-bar"><i style={{ width: `${pct}%` }} /></div></div>; })}</div></>}
            </section>

            {!!score?.suggestions?.length && <section className="rc-panel"><div className="rc-panel-head"><h3><i className="bi bi-exclamation-circle text-danger" /> Fix These First</h3></div><div className="rc-fix-list">{score.suggestions.slice(0, 5).map((s, i) => <div className="rc-fix-item" key={i}><span className="rc-fix-dot"><i className="bi bi-bullseye" /></span><div><b>{s.issue}</b><p>{s.fix}</p></div><em>{i < 2 ? 'High' : 'Medium'}</em></div>)}</div></section>}

            {!!score?.atsWarnings?.length && <section className="rc-panel"><div className="rc-panel-head"><h3>ATS Warnings</h3></div><ul className="rc-warning-list">{score.atsWarnings.map((w, i) => <li key={i}><i className="bi bi-shield-exclamation" /> {w}</li>)}</ul></section>}

            {/* Only when a target title has been typed (Contact Information) — no "set your title" placeholder. */}
            {hasTargetTitle && <section className="rc-panel rc-role-panel"><div className="rc-panel-head"><h3>Target Role Alignment</h3></div><div className="rc-role"><span><i className="bi bi-briefcase-fill" /></span><div><b>{targetRole}</b><small>CareerPilot target title</small></div></div><p>See how your resume evidence reads against the role you are aiming for.</p><button onClick={() => nav('/careerpilot/placement')}>View role readiness <i className="bi bi-arrow-right" /></button></section>}

            {!!score?.keywordsMissing?.length && <section className="rc-panel"><div className="rc-panel-head"><h3>Top Missing Keywords</h3></div><div className="rs-kw">{score.keywordsMissing.slice(0, 8).map(k => <span className="missing" key={k}>{k}</span>)}</div></section>}
          </aside>
        </div>

        <div className="rc-sticky-actions"><div><span className="rc-trophy"><i className="bi bi-trophy-fill" /></span><div><b>Keep improving!</b><small>A better resume creates better opportunities.</small></div></div><div><button className="rc-btn primary" onClick={save} disabled={saving}><i className="bi bi-briefcase" /> {saving ? 'Saving…' : 'Save Resume'}</button><button className="rc-btn" onClick={download}><i className="bi bi-download" /> Download PDF</button><button className="rc-btn" onClick={runScore} disabled={scoring}><i className="bi bi-bar-chart-fill" /> {scoring ? 'Scoring…' : 'Score My Resume'}</button><button className="rc-btn teal" onClick={runImprove} disabled={improving}><i className="bi bi-stars" /> {improving ? 'Rewriting…' : 'Improve with AI'}</button></div></div>
      </div>
    </PassportShell>
  );
};

export default ResumeCenter;