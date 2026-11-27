import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import passportApi, { ResumeSections, ResumeScore } from '../../api/passportApi';
import PassportShell from './PassportShell';
import SectionLock from './SectionLock';
import './resumeCenter.css';
import './resumeCenterRedesign.css';
import { ResumeDocument, TEMPLATES } from '../ResumeBuilder/templates';
import type { ResumeTemplate } from '../../api/resumeApi';
import { RichTextEditor } from '../ResumeBuilder/RichText';

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

/** Plain text of a description's bullets, for comparing and showing a rewrite. */
const bulletsOf = (html: string): string[] => {
  const t = String(html || '').replace(/<li[^>]*>/gi, '\n').replace(/<br\s*\/?>/gi, '\n').replace(/<\/(p|div|li)>/gi, '\n').replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ');
  return t.split('\n').map(x => x.replace(/\s+/g, ' ').trim()).filter(Boolean);
};
const same = (a: string[], b: string[]) => a.length === b.length && a.every((x, i) => x.trim() === (b[i] || '').trim());

/** Every place the AI rewrite differs from the resume, one checkbox each. */
function rewriteChanges(cur: ResumeSections, next: ResumeSections): { key: string; title: string; index?: number; before: string[]; after: string[] }[] {
  const out: { key: string; title: string; index?: number; before: string[]; after: string[] }[] = [];
  if ((next.summary || '').trim() && (next.summary || '').trim() !== (cur.summary || '').trim()) out.push({ key: 'summary', title: 'Professional summary', before: cur.summary ? [cur.summary] : [], after: [next.summary] });
  cur.experience.forEach((e, i) => { const n = next.experience[i]; if (n && !same(e.bullets || [], n.bullets || [])) out.push({ key: `exp:${i}`, index: i, title: `Experience — ${[e.role, e.company].filter(Boolean).join(' at ') || `entry ${i + 1}`}`, before: e.bullets || [], after: n.bullets || [] }); });
  cur.projects.forEach((p, i) => { const n = next.projects[i]; if (n && !same(bulletsOf(p.description), bulletsOf(n.description))) out.push({ key: `proj:${i}`, index: i, title: `Project — ${p.name || `entry ${i + 1}`}`, before: bulletsOf(p.description), after: bulletsOf(n.description) }); });
  const sk = (s: ResumeSections) => s.skills.map(g => `${g.category}: ${g.items.join(', ')}`);
  if (!same(sk(cur), sk(next))) out.push({ key: 'skills', title: 'Skills (regrouped — same skills)', before: sk(cur), after: sk(next) });
  return out;
}

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
  /** Which parts of the AI rewrite to apply (all on by default; the member can untick any). */
  const [accept, setAccept] = useState<Record<string, boolean>>({});
  /** What an import read, waiting for the member to choose how to use it. Nothing is saved until they do. */
  const [importDraft, setImportDraft] = useState<{ parsed: ResumeSections; found: Record<string, number | boolean>; fileName: string } | null>(null);
  /** The resume as it was when last scored, so the page can say when the score is out of date. */
  const [scoredSnapshot, setScoredSnapshot] = useState<string>('');
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
      const loaded = { ...BLANK, ...r.resume.sections };
      setSections(loaded);
      setScore(r.resume.score);
      if (r.resume.score) setScoredSnapshot(JSON.stringify(loaded));
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
      setImportDraft({ parsed: { ...BLANK, ...r.parsed, contact: { ...BLANK.contact, ...(r.parsed?.contact || {}) } }, found: r.found || {}, fileName: file.name });
    } catch (e: any) {
      setMsg({ kind: 'err', text: e?.response?.data?.message || 'Could not read that file.' });
    }
    setImporting(false);
  };

  /**
   * Use what the import read. "Replace" swaps the resume for the file's content; "fill" only fills sections and
   * contact fields that are still empty, so nothing the member typed is overwritten. Either way it is saved.
   */
  const applyImport = async (mode: 'replace' | 'fill') => {
    if (!importDraft) return;
    const p = importDraft.parsed;
    let next: ResumeSections;
    if (mode === 'replace') {
      next = { ...BLANK, ...p, contact: { ...BLANK.contact, ...p.contact } };
    } else {
      const c: any = { ...sections.contact };
      for (const [k, v] of Object.entries(p.contact || {})) if (!String(c[k] || '').trim() && v) c[k] = v;
      next = {
        ...sections, contact: c,
        summary: sections.summary.trim() ? sections.summary : p.summary,
        experience: sections.experience.length ? sections.experience : p.experience,
        education: sections.education.length ? sections.education : p.education,
        skills: sections.skills.some(g => g.items?.length) ? sections.skills : p.skills,
        projects: sections.projects.length ? sections.projects : p.projects,
        certifications: sections.certifications.length ? sections.certifications : p.certifications,
      };
    }
    setSections(next); setImportDraft(null); setView('build');
    try {
      await passportApi.saveResume(next);
      setMsg({ kind: 'ok', text: mode === 'replace' ? `Your resume now holds what was read from ${importDraft.fileName}. Check each section below.` : `Filled the empty sections from ${importDraft.fileName}. Everything you had typed was kept.` });
    } catch (e: any) { setMsg({ kind: 'err', text: e?.response?.data?.message || 'Imported, but could not save. Press Save Resume.' }); }
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
    // Only the resume's own stylesheet (inside ResumeDocument) goes into the print page. Copying every app stylesheet
    // made printing wait on dozens of files and let app styles leak into the page.
    const styles = '';
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
      setScoredSnapshot(JSON.stringify(sections));
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
      const improved = { ...BLANK, ...r.sections } as ResumeSections;
      const keys = rewriteChanges(sections, improved).map(c => c.key);
      if (!keys.length) setMsg({ kind: 'info', text: 'The AI found nothing to reword without changing your facts. Your resume is unchanged.' });
      else { setPreview(improved); setAccept(Object.fromEntries(keys.map(k => [k, true]))); }
    } catch (e: any) { if (e?.response?.data?.aiMissing) setAiOff(true); else setMsg({ kind: 'err', text: e?.response?.data?.message || 'Could not improve the resume.' }); }
    setImproving(false);
  };

  /** Apply only the parts of the rewrite the member kept ticked. */
  const acceptImproved = () => {
    if (!preview) return;
    const next: ResumeSections = JSON.parse(JSON.stringify(sections));
    for (const ch of rewriteChanges(sections, preview)) {
      if (!accept[ch.key]) continue;
      if (ch.key === 'summary') next.summary = preview.summary;
      else if (ch.key === 'skills') next.skills = preview.skills;
      else if (ch.key.startsWith('exp:')) next.experience[ch.index!] = { ...next.experience[ch.index!], bullets: preview.experience[ch.index!].bullets };
      else if (ch.key.startsWith('proj:')) next.projects[ch.index!] = { ...next.projects[ch.index!], description: preview.projects[ch.index!].description };
    }
    setSections(next);
    setPreview(null);
    setMsg({ kind: 'ok', text: 'Applied the parts you kept — review them, then Save.' });
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
    const mx = (k: string) => (score.maxes as any)?.[k] ?? SECTION_MAX[k] ?? 20;
    const counted = rows.filter(([k]) => mx(k) > 0);
    if (!counted.length) return 'Build your resume';
    const [key] = counted.sort((a, b) => (Number(b[1]) / mx(b[0])) - (Number(a[1]) / mx(a[0])))[0];
    return SECTION_META[key]?.label || key;
  }, [score]);
  const hasTargetTitle = !!sections.contact.title?.trim();
  const targetRole = sections.contact.title?.trim() || '';
  const maxOf = (k: string) => (score?.maxes as any)?.[k] ?? SECTION_MAX[k] ?? 20;
  const scoreStale = !!score && !!scoredSnapshot && scoredSnapshot !== JSON.stringify(sections);
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
              <button className="rc-action" onClick={runScore} disabled={scoring}><i className="bi bi-bar-chart-fill" /><span><b>{scoring ? 'Scoring…' : 'Score resume'}</b><small>ATS score + fix list</small></span></button>
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
        {importDraft && (
          <section className="rc-import-review" role="dialog" aria-label="Review imported resume">
            <div className="rc-import-head">
              <span className="rc-ai-icon"><i className="bi bi-file-earmark-check" /></span>
              <div><h3>We read {importDraft.fileName}</h3><p>Nothing is saved yet. Check what was found, then choose how to use it.</p></div>
              <button onClick={() => setImportDraft(null)} aria-label="Close"><i className="bi bi-x-lg" /></button>
            </div>
            <div className="rc-import-grid">
              {[
                ['Contact details', `${importDraft.found.contact || 0} found`, importDraft.parsed.contact.name],
                ['Summary', importDraft.found.summary ? 'Found' : 'Not found', importDraft.parsed.summary.slice(0, 90)],
                ['Education', `${importDraft.found.education || 0}`, importDraft.parsed.education.map(e => e.degree).filter(Boolean).join(' · ')],
                ['Skills', `${importDraft.found.skills || 0}`, importDraft.parsed.skills.flatMap(g => g.items).slice(0, 6).join(', ')],
                ['Experience', `${importDraft.found.experience || 0}`, importDraft.parsed.experience.map(e => [e.role, e.company].filter(Boolean).join(' at ')).join(' · ')],
                ['Projects', `${importDraft.found.projects || 0}`, importDraft.parsed.projects.map(p => p.name).join(' · ')],
                ['Certifications', `${importDraft.found.certifications || 0}`, importDraft.parsed.certifications.map(c => c.name).slice(0, 3).join(' · ')],
              ].map(([label, count, sample]) => (
                <div key={label as string} className={`rc-import-row${String(count).startsWith('0') || count === 'Not found' ? ' none' : ''}`}><b>{label}</b><em>{count}</em><span>{sample || '—'}</span></div>
              ))}
            </div>
            <div className="rc-ai-actions">
              <button className="rc-btn primary" onClick={() => applyImport('replace')}><i className="bi bi-arrow-repeat" /> Replace my resume with this</button>
              <button className="rc-btn" onClick={() => applyImport('fill')}><i className="bi bi-plus-square" /> Only fill my empty sections</button>
              <button className="rc-btn" onClick={() => setImportDraft(null)}>Cancel</button>
            </div>
          </section>
        )}
        {aiOff && (
          <div className="rc2-aioff">
            <i className="bi bi-plug" />
            <div><b>AI rewriting is not switched on yet</b><span>No AI provider is set up for your institute — ask your admin to add an Anthropic or OpenAI key in Platform Settings. Importing, scoring, editing and downloading all work.</span></div>
          </div>
        )}

        <section className="rc-stats">
          <div className="rc-stat"><span className="rc-stat-icon teal"><i className="bi bi-patch-check-fill" /></span><div><small>ATS Score</small><strong>{score ? `${score.total}/100` : '—'}</strong><span>{atsLabel}</span></div></div>
          <div className="rc-stat"><span className="rc-stat-icon violet"><i className="bi bi-clipboard-check-fill" /></span><div><small>Completed Sections</small><strong>{completedCount}/7</strong><span>{completedCount >= 6 ? 'Almost there!' : 'Keep building'}</span></div></div>
          <div className="rc-stat"><span className="rc-stat-icon amber"><i className="bi bi-star-fill" /></span><div><small>Top Strength</small><strong>{topStrength}</strong><span>Strongest scored area</span></div></div>
          <div className="rc-stat"><span className="rc-stat-icon red"><i className="bi bi-exclamation-triangle-fill" /></span><div><small>Priority Fixes</small><strong>{score?.suggestions?.length || 0}</strong><span>{score?.suggestions?.length ? 'Need attention' : 'Score to identify'}</span></div></div>
        </section>

        {preview && (() => {
          const changes = rewriteChanges(sections, preview);
          const on = changes.filter(c => accept[c.key]).length;
          return (
          <section className="rc-ai-preview">
            <div className="rc-ai-head"><div><span className="rc-ai-icon"><i className="bi bi-stars" /></span><div><h3>AI Rewrite Assistant</h3><p>Only the wording changes — your facts, numbers and skills stay the same. Untick anything you want to keep as it was.</p></div></div><button onClick={() => setPreview(null)} aria-label="Close"><i className="bi bi-x-lg" /></button></div>
            <div className="rc-ai-changes">
              {changes.map(ch => (
                <label key={ch.key} className={`rc-ai-change${accept[ch.key] ? ' on' : ''}`}>
                  <input type="checkbox" checked={!!accept[ch.key]} onChange={e => setAccept(a => ({ ...a, [ch.key]: e.target.checked }))} />
                  <div className="rc-ai-change-body">
                    <b>{ch.title}</b>
                    <div className="rc-ai-compare">
                      <div><span>Now</span>{ch.before.length ? <ul>{ch.before.map((t, j) => <li key={j}>{t}</li>)}</ul> : <p>(empty)</p>}</div>
                      <i className="bi bi-arrow-right rc-ai-arrow" />
                      <div className="improved"><span><i className="bi bi-stars" /> Suggested</span><ul>{ch.after.map((t, j) => <li key={j}>{t}</li>)}</ul></div>
                    </div>
                  </div>
                </label>
              ))}
            </div>
            <div className="rc-ai-actions"><button className="rc-btn primary" onClick={acceptImproved} disabled={!on}><i className="bi bi-check-lg" /> Apply {on} of {changes.length}</button><button className="rc-btn" onClick={() => setPreview(null)}>Discard all</button></div>
          </section>
          );
        })()}

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

            <section className="rs-section rc-section-card" id="rc-projects"><SectionTitle icon="bi-folder2-open" title="Projects" subtitle="Key projects and achievements" done={completed.projects} /><div className="rc-fields">{sections.projects.map((p, i) => <div className="rs-sub" key={i}><button className="rs-del" onClick={() => patch(s => { s.projects.splice(i, 1); })}>✕</button><div className="rs-row"><Field label="Name" value={p.name} onChange={v => patch(s => { s.projects[i].name = v; })} /><ListField label="Tech (comma separated)" items={p.tech} onChange={v => patch(s => { s.projects[i].tech = v; })} /></div><div className="rs-field"><label>What it does &amp; what you built</label><RichTextEditor value={p.description} onChange={v => patch(s => { s.projects[i].description = v; })} placeholder="Use the bullet list: the problem, what you built, the result." rows={3} /></div><Field label="Link" value={p.link || ''} onChange={v => patch(s => { s.projects[i].link = v; })} placeholder="https://github.com/…" /></div>)}<button className="rs-add" onClick={() => patch(s => { s.projects.push({ name: '', tech: [], description: '', link: '' }); })}>+ Add project</button></div></section>

            <section className="rs-section rc-section-card" id="rc-certifications"><SectionTitle icon="bi-award" title="Certifications" subtitle="Certifications and achievements" done={completed.certifications} /><div className="rc-fields">{sections.certifications.map((c, i) => <div className="rs-sub" key={i}><button className="rs-del" onClick={() => patch(s => { s.certifications.splice(i, 1); })}>✕</button><div className="rs-row"><Field label="Name" value={c.name} onChange={v => patch(s => { s.certifications[i].name = v; })} /><Field label="Issuer" value={c.issuer} onChange={v => patch(s => { s.certifications[i].issuer = v; })} /></div><Field label="Year" value={c.year || ''} onChange={v => patch(s => { s.certifications[i].year = v; })} /></div>)}<button className="rs-add" onClick={() => patch(s => { s.certifications.push({ name: '', issuer: '', year: '' }); })}>+ Add certification</button></div></section>
            </>)}
          </main>

          <aside className="rc-intelligence">
            <section className="rc-panel rc-score-panel">
              <div className="rc-panel-head"><h3>Resume Intelligence</h3><span>{score ? 'Live score' : 'Not scored'}</span></div>
              {!score ? <div className="rc-score-empty"><span><i className="bi bi-bar-chart" /></span><h4>Score your resume</h4><p>Get an honest ATS read, section scores and a prioritized fix list.</p><button className="rc-btn primary" onClick={runScore}>Score My Resume</button></div> : <><div className="rc-mini-score"><div className="rc-score-ring small" style={{ '--score': `${score.total}%` } as React.CSSProperties}><div><strong>{score.total}</strong><span>/100</span></div></div><div><small>ATS Score</small><h3>{atsLabel}</h3><p>Keep improving toward a recruiter-ready resume.</p></div></div>{scoreStale && <div className="rc2-stale"><i className="bi bi-arrow-repeat" /> You have edited your resume since this score. <button type="button" onClick={runScore} disabled={scoring}>{scoring ? 'Scoring…' : 'Score again'}</button></div>}<div className="rc-breakdown">{Object.keys(SECTION_META).filter(k => k in (score.breakdown || {})).map(k => { const v = Number((score.breakdown as any)[k] || 0); const max = maxOf(k); const checks = (score.checks || []).filter(c => c.section === k); if (!max) return <div className="rc-break-row muted" key={k}><div><span>{SECTION_META[k]?.label || k}</span><b>Not counted</b></div><small className="rc-break-note">No internship yet, so projects carry this weight.</small></div>; const pct = Math.min(100, (v / max) * 100); return <details className="rc-break-row" key={k}><summary><div><span>{SECTION_META[k]?.label || k}</span><b>{v}/{max}</b></div><div className="rc-break-bar"><i style={{ width: `${pct}%` }} /></div></summary>{!!checks.length && <ul className="rc-checks">{checks.map((c, j) => <li key={j} className={c.got >= c.max ? 'ok' : c.got > 0 ? 'part' : 'no'}><i className={`bi ${c.got >= c.max ? 'bi-check-circle-fill' : c.got > 0 ? 'bi-dash-circle-fill' : 'bi-x-circle-fill'}`} /><span>{c.label}</span><b>{Math.round(c.got)}/{Math.round(c.max)}</b></li>)}</ul>}</details>; })}</div><p className="rc-score-how">The score is worked out from your resume itself — every point is one of the checks above, so the same resume always gets the same score. Tap a section to see its checks.</p></>}
            </section>

            {!!score?.suggestions?.length && <section className="rc-panel"><div className="rc-panel-head"><h3><i className="bi bi-exclamation-circle text-danger" /> Fix These First</h3></div><div className="rc-fix-list">{score.suggestions.slice(0, 8).map((s, i) => { const pr = s.section === 'wording' ? 'wording' : i < 2 ? 'high' : i < 5 ? 'medium' : 'low'; return <div className={`rc-fix-item p-${pr}`} key={i}><span className="rc-fix-dot"><i className={`bi ${s.section === 'wording' ? 'bi-pencil' : 'bi-bullseye'}`} /></span><div><b>{s.issue}</b><p>{s.fix}</p></div><em>{pr === 'wording' ? 'Wording' : pr[0].toUpperCase() + pr.slice(1)}</em></div>; })}</div></section>}

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