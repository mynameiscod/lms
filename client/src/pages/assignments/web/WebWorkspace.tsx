import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Editor from '@monaco-editor/react';
import SplitWorkspace from '../../../components/SplitWorkspace/SplitWorkspace';
import { Assignment, Submission, submissionApi, ProgrammingLanguage } from '../../../api/assignmentApi';
import { briefHtml } from '../briefHtml';
import WebDesignPanel from './WebDesignPanel';
import WebPreview, { ConsoleLine, Device, WebPreviewHandle } from './WebPreview';
import { WebFile, WebAssignmentConfig, filesForStack, monacoLanguage, stackOf, absoluteAssetUrl, buildPreviewDoc } from './webStack';
import './web.css';

/** An assignment saved before web briefs existed: HTML/CSS, its old starter code, no checklist. */
export function webConfigOf(a: Assignment): WebAssignmentConfig {
  if (a.web) return a.web;
  const fromStarter: WebFile[] = [];
  const html = a.starterCode?.find(s => s.language === ProgrammingLanguage.HTML)?.code;
  const css = a.starterCode?.find(s => s.language === ProgrammingLanguage.CSS)?.code;
  if (html) fromStarter.push({ name: 'index.html', code: html });
  if (css) fromStarter.push({ name: 'style.css', code: css });
  return { stack: 'html_css', files: fromStarter, brief: '', referenceImages: [], assets: [], colors: [], fonts: [], requirements: [], autoWeight: 0, aiFeedback: false };
}

/**
 * The workspace for a web (frontend) assignment: the stack's files side by side in tabs, a live
 * preview that runs their JavaScript (or React), Desktop / Tablet / Mobile widths, a console, the
 * design brief, and a compare mode that lays the reference image over the page. Every file is saved
 * and handed in together.
 */
const WebWorkspace: React.FC<{
  assignment: Assignment;
  submission: Submission;
  previewMode: boolean;
  exitLabel: string;
  onExit: () => void;
  onSubmitted: () => void;
  timeRemaining: number | null;
}> = ({ assignment, submission, previewMode, exitLabel, onExit, onSubmitted, timeRemaining }) => {
  const web = useMemo(() => webConfigOf(assignment), [assignment]);
  const stack = web.stack;
  const legacy = !assignment.web;
  const [files, setFiles] = useState<WebFile[]>(() => filesForStack(stack, (submission.webFiles?.length ? submission.webFiles : web.files), web.fonts, assignment.title));
  const [active, setActive] = useState(0);
  const [runKey, setRunKey] = useState(0);
  const [previewFiles, setPreviewFiles] = useState<WebFile[]>(files);
  const [autoRun, setAutoRun] = useState(true);
  const [device, setDevice] = useState<Device>(() => (typeof window !== 'undefined' && window.innerWidth < 600 ? 'mobile' : 'desktop'));
  const [consoleLines, setConsoleLines] = useState<ConsoleLine[]>([]);
  const [showConsole, setShowConsole] = useState(false);
  const [overlay, setOverlay] = useState<string | null>(null);
  const [opacity, setOpacity] = useState(0.5);
  const [tab, setTab] = useState<'task' | 'design'>('task');
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const preview = useRef<WebPreviewHandle>(null);
  const filesRef = useRef(files);
  filesRef.current = files;
  const dirty = useRef(false);

  // Live preview: rebuild a moment after typing stops.
  useEffect(() => {
    if (!autoRun) return;
    const t = window.setTimeout(() => { setPreviewFiles(files); setConsoleLines([]); }, 700);
    return () => window.clearTimeout(t);
  }, [files, autoRun]);

  const run = () => { setPreviewFiles(filesRef.current); setConsoleLines([]); setRunKey(k => k + 1); };

  const save = useCallback(async (silent: boolean) => {
    if (previewMode) { if (!silent) setError('This is a preview — nothing is saved or submitted.'); return; }
    if (silent && !dirty.current) return;
    try {
      if (!silent) setSaving(true);
      await submissionApi.saveWeb(submission._id, filesRef.current);
      dirty.current = false;
      setLastSaved(new Date());
    } catch {
      if (!silent) setError('Failed to save');
    } finally { if (!silent) setSaving(false); }
  }, [previewMode, submission._id]);

  useEffect(() => {
    const t = window.setInterval(() => save(true), 30000);
    return () => window.clearInterval(t);
  }, [save]);

  const edit = (code: string) => {
    dirty.current = true;
    setFiles(prev => prev.map((f, i) => (i === active ? { ...f, code } : f)));
  };

  const submit = async () => {
    if (previewMode) { setError('This is a preview — nothing is saved or submitted.'); return; }
    if (!files.some(f => f.code.trim())) { setError('Write your page before you submit it.'); return; }
    if (!window.confirm('Submit your page? You may not be able to change it after submitting.')) return;
    try {
      setSubmitting(true); setError(null);
      if (legacy) {
        // An older web assignment is still marked by its test cases, on the whole page with the CSS inlined.
        await submissionApi.saveWeb(submission._id, files);
        await submissionApi.submitCoding(submission._id, { code: buildPreviewDoc('html_css', files, { bridge: false }), language: ProgrammingLanguage.HTML });
      } else {
        let renderedHtml: string | undefined;
        if (stack !== 'html_css') {
          setPreviewFiles(files);
          await new Promise(r => window.setTimeout(r, 900));
          renderedHtml = (await preview.current?.snapshot()) || undefined;
        }
        await submissionApi.submitWeb(submission._id, { files, renderedHtml });
      }
      onSubmitted();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to submit');
    } finally { setSubmitting(false); }
  };

  const errors = consoleLines.filter(l => l.level === 'error').length;
  const fmt = (ms: number) => `${Math.floor(ms / 60000)}:${String(Math.floor((ms % 60000) / 1000)).padStart(2, '0')}`;
  const refs = web.referenceImages || [];
  const hasDesign = !!(web.brief?.trim() || refs.length || web.assets?.length || web.colors?.length || web.fonts?.length);

  const left = (
    <div className="ww-task">
      <div className="ww-tabs" role="tablist">
        <button type="button" role="tab" aria-selected={tab === 'task'} className={tab === 'task' ? 'on' : ''} onClick={() => setTab('task')}>
          <i className="bi bi-journal-text" aria-hidden /> Task
        </button>
        {hasDesign && (
          <button type="button" role="tab" aria-selected={tab === 'design'} className={tab === 'design' ? 'on' : ''} onClick={() => setTab('design')}>
            <i className="bi bi-palette" aria-hidden /> Design
          </button>
        )}
      </div>
      <div className="ww-task-body">
        {tab === 'task' ? (
          <>
            <div className="rich-content ww-rich" dangerouslySetInnerHTML={{ __html: assignment.description || '' }} />
            {assignment.instructions && (
              <>
                <h4 className="ww-h">Steps</h4>
                <div className="rich-content ww-rich" dangerouslySetInnerHTML={{ __html: briefHtml(assignment.instructions) }} />
              </>
            )}
            {(web.requirements || []).length > 0 && (
              <>
                <h4 className="ww-h">Your page must have</h4>
                <ul className="wd-checks">
                  {web.requirements.map(r => (
                    <li key={r.id}><i className="bi bi-circle" aria-hidden /><span>{r.text}</span><b>{r.points} pt{r.points === 1 ? '' : 's'}</b></li>
                  ))}
                </ul>
                <p className="ww-note">These are checked automatically when you submit. Your trainer marks the rest (layout, design and code quality).</p>
              </>
            )}
            {hasDesign && (
              <button type="button" className="ww-link" onClick={() => setTab('design')}>
                <i className="bi bi-palette" aria-hidden /> See the design: images, colours and fonts →
              </button>
            )}
          </>
        ) : (
          <WebDesignPanel web={web} hideChecklist />
        )}
      </div>
    </div>
  );

  const right = (
    <div className="ww-code">
      <div className="ww-files" role="tablist" aria-label="Files">
        {files.map((f, i) => (
          <button key={f.name} type="button" role="tab" aria-selected={i === active} className={i === active ? 'on' : ''} onClick={() => setActive(i)}>
            <i className={`bi ${f.name.endsWith('.html') ? 'bi-filetype-html' : f.name.endsWith('.css') ? 'bi-filetype-css' : f.name.endsWith('.jsx') ? 'bi-filetype-jsx' : 'bi-filetype-js'}`} aria-hidden />
            {f.name}
          </button>
        ))}
        <span className="ww-stack">{stackOf(stack).short}</span>
      </div>
      <div className="ww-editor">
        <Editor
          height="100%"
          language={monacoLanguage(files[active]?.name || 'index.html')}
          path={files[active]?.name}
          value={files[active]?.code || ''}
          onChange={v => edit(v || '')}
          theme="vs-dark"
          options={{ minimap: { enabled: false }, fontSize: 14, wordWrap: 'on', tabSize: 2, automaticLayout: true, scrollBeyondLastLine: false }}
        />
      </div>
      <div className="ww-preview">
        <div className="ww-pbar">
          <div className="ww-seg" role="group" aria-label="Preview width">
            {([['desktop', 'bi-display', 'Desktop'], ['tablet', 'bi-tablet', 'Tablet'], ['mobile', 'bi-phone', 'Mobile']] as const).map(([d, ic, label]) => (
              <button key={d} type="button" className={device === d ? 'on' : ''} onClick={() => setDevice(d)} title={`${label} width`} aria-pressed={device === d}>
                <i className={`bi ${ic}`} aria-hidden /><span>{label}</span>
              </button>
            ))}
          </div>
          {refs.length > 0 && (
            <div className="ww-compare">
              <select value={overlay || ''} onChange={e => setOverlay(e.target.value || null)} aria-label="Compare with a reference image">
                <option value="">Compare: off</option>
                {refs.map((r, i) => <option key={i} value={absoluteAssetUrl(r.url)}>Compare: {r.name || `Reference ${i + 1}`}</option>)}
              </select>
              {overlay && <input type="range" min={0.1} max={0.9} step={0.05} value={opacity} onChange={e => setOpacity(Number(e.target.value))} aria-label="Reference see-through" />}
            </div>
          )}
          <span className="ww-grow" />
          <label className="ww-auto"><input type="checkbox" checked={autoRun} onChange={e => setAutoRun(e.target.checked)} /> Live</label>
          <button type="button" className="ww-pbtn" onClick={run} title="Run the page again"><i className="bi bi-arrow-clockwise" aria-hidden /> Run</button>
          <button type="button" className={`ww-pbtn${errors ? ' err' : ''}`} onClick={() => setShowConsole(s => !s)} aria-pressed={showConsole}>
            <i className="bi bi-terminal" aria-hidden /> Console{consoleLines.length ? ` (${consoleLines.length})` : ''}
          </button>
        </div>
        <WebPreview
          ref={preview}
          stack={stack}
          files={previewFiles}
          runKey={runKey}
          device={device}
          overlayUrl={overlay}
          overlayOpacity={opacity}
          onConsole={line => setConsoleLines(prev => [...prev.slice(-199), line])}
        />
        {showConsole && (
          <div className="ww-console" role="log" aria-label="Console">
            {consoleLines.length === 0 ? <div className="ww-cempty">No console output. console.log() lines and errors show here.</div>
              : consoleLines.map((l, i) => <div key={i} className={`ww-cline ${l.level}`}>{l.text}</div>)}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="workspace-container ww">
      {previewMode && <div className="asgn-preview-strip">👁 Student preview — nothing here is saved or submitted.</div>}
      <div className="ww-head">
        <button type="button" className="ww-back" onClick={onExit}><i className="bi bi-arrow-left" aria-hidden /> <span>{exitLabel}</span></button>
        <h2 title={assignment.title}>{assignment.title}</h2>
        <div className="ww-actions">
          {timeRemaining !== null && <span className={`ww-timer${timeRemaining < 300000 ? ' low' : ''}`}>⏱ {fmt(timeRemaining)}</span>}
          {lastSaved && <span className="ww-saved">Saved {lastSaved.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>}
          <button type="button" className="ww-btn ghost" onClick={() => save(false)} disabled={saving}>
            <i className="bi bi-floppy" aria-hidden /> <span>{saving ? 'Saving…' : 'Save'}</span>
          </button>
          <button type="button" className="ww-btn primary" onClick={submit} disabled={submitting}>
            <i className="bi bi-send" aria-hidden /> <span>{submitting ? 'Submitting…' : 'Submit'}</span>
          </button>
        </div>
      </div>
      {error && (
        <div className="ww-error" role="alert">{error}<button type="button" onClick={() => setError(null)} aria-label="Dismiss">✕</button></div>
      )}
      <SplitWorkspace storageKey="web-assignment-workspace" className="workspace-layout" stackBelow={900} defaultPct={32} leftLabel="Task" rightLabel="Code" left={left} right={right} />
    </div>
  );
};

export default WebWorkspace;
