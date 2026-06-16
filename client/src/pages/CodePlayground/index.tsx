import React, { useEffect, useState, useCallback, useRef } from 'react';
import Editor from '@monaco-editor/react';
import { playgroundApi } from '../../api/playgroundApi';
import { studentProfileAPI } from '../../api/studentProfileAPI';
import { runSql, SqlResult } from '../../utils/sqlRunner';
import './CodePlayground.css';

interface Lang { key: string; label: string; icon: string; monaco: string; file: string; starter: string; }

const hello = (s: string) => s;
const WEB_STARTER = `<!doctype html>
<html>
<head>
  <style>
    body { font-family: sans-serif; padding: 24px; }
    h1 { color: #2563eb; }
  </style>
</head>
<body>
  <h1>Hello, CodeBegun! 👋</h1>
  <button onclick="document.getElementById('o').textContent = 'Clicked at ' + new Date().toLocaleTimeString()">Click me</button>
  <p id="o"></p>
</body>
</html>
`;
const SQL_STARTER = `CREATE TABLE students (id INTEGER, name TEXT, marks INTEGER);
INSERT INTO students VALUES (1, 'Asha', 88), (2, 'Ravi', 72), (3, 'Meena', 95);

SELECT name, marks FROM students ORDER BY marks DESC;
`;

const LANGS: Lang[] = [
  { key: 'java', label: 'Java (JDK 17)', icon: '☕', monaco: 'java', file: 'Main.java', starter: hello('public class Main {\n  public static void main(String[] args) {\n    System.out.println("Hello, CodeBegun! 👋");\n  }\n}\n') },
  { key: 'python', label: 'Python 3', icon: '🐍', monaco: 'python', file: 'main.py', starter: 'print("Hello, CodeBegun! 👋")\n' },
  { key: 'cpp', label: 'C++ (GCC 13)', icon: '🟦', monaco: 'cpp', file: 'main.cpp', starter: '#include <iostream>\nusing namespace std;\nint main() {\n  cout << "Hello, CodeBegun!" << endl;\n  return 0;\n}\n' },
  { key: 'c', label: 'C (GCC 13)', icon: '🔵', monaco: 'c', file: 'main.c', starter: '#include <stdio.h>\nint main() {\n  printf("Hello, CodeBegun!\\n");\n  return 0;\n}\n' },
  { key: 'javascript', label: 'JavaScript (Node.js 20)', icon: '🟨', monaco: 'javascript', file: 'index.js', starter: 'console.log("Hello, CodeBegun! 👋");\n' },
  { key: 'typescript', label: 'TypeScript', icon: '🔷', monaco: 'typescript', file: 'index.ts', starter: 'const msg: string = "Hello, CodeBegun!";\nconsole.log(msg);\n' },
  { key: 'csharp', label: 'C#', icon: '🟩', monaco: 'csharp', file: 'Program.cs', starter: 'using System;\nclass Program {\n  static void Main() {\n    Console.WriteLine("Hello, CodeBegun!");\n  }\n}\n' },
  { key: 'web', label: 'Web (HTML/CSS/JS)', icon: '🌐', monaco: 'html', file: 'index.html', starter: WEB_STARTER },
  { key: 'sql', label: 'SQL (SQLite)', icon: '🗄️', monaco: 'sql', file: 'query.sql', starter: SQL_STARTER },
];
const STARTERS = new Set(LANGS.map(l => l.starter));
const byKey = (k: string) => LANGS.find(l => l.key === k) || LANGS[0];
const kindFor = (lang: string) => (lang === 'web' ? 'web' : lang === 'sql' ? 'sql' : 'single');

interface Framework { key: string; label: string; icon: string; url: string; }
const FRAMEWORKS: Framework[] = [
  { key: 'fw-react', label: 'React', icon: '⚛️', url: 'https://stackblitz.com/fork/react?embed=1&view=both' },
  { key: 'fw-react-ts', label: 'React + TypeScript', icon: '⚛️', url: 'https://stackblitz.com/fork/react-ts?embed=1&view=both' },
  { key: 'fw-angular', label: 'Angular', icon: '🅰️', url: 'https://stackblitz.com/fork/angular?embed=1&view=both' },
  { key: 'fw-vue', label: 'Vue', icon: '🟩', url: 'https://stackblitz.com/fork/vue?embed=1&view=both' },
  { key: 'fw-node', label: 'Node.js / Express (MERN)', icon: '🟢', url: 'https://stackblitz.com/fork/node?embed=1&view=both' },
];
const fwByKey = (k: string) => FRAMEWORKS.find(f => f.key === k);

const DEBUG_LANG: Record<string, string> = { python: '3', javascript: 'js', java: 'java', c: 'c', cpp: 'cpp' };
const buildDebugUrl = (lang: string, code: string, stdin: string) => {
  const params = new URLSearchParams({
    code, cumulative: 'false', curInstr: '0', heapPrimitives: 'nevernest', mode: 'display',
    origin: 'opt-frontend.js', py: DEBUG_LANG[lang], rawInputLstJSON: JSON.stringify(stdin ? stdin.split('\n') : []), textReferences: 'false',
  });
  return `https://pythontutor.com/iframe-embed.html#${params.toString()}`;
};

const CodePlayground: React.FC = () => {
  const [language, setLanguage] = useState('java');
  const [code, setCode] = useState(byKey('java').starter);
  const [stdin, setStdin] = useState('');
  const [title, setTitle] = useState('Untitled');
  const [output, setOutput] = useState('');
  const [error, setError] = useState('');
  const [running, setRunning] = useState(false);
  const [saving, setSaving] = useState(false);
  const [programs, setPrograms] = useState<any[]>([]);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [preview, setPreview] = useState('');
  const [sqlRows, setSqlRows] = useState<SqlResult[] | null>(null);
  const [debugUrl, setDebugUrl] = useState<string | null>(null);
  const [pushing, setPushing] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const [langSearch, setLangSearch] = useState('');
  const [progsOpen, setProgsOpen] = useState(false);
  const [rightTab, setRightTab] = useState<'input' | 'output'>('input');
  const [full, setFull] = useState(false);
  const [pos, setPos] = useState({ ln: 1, col: 1 });
  const [ghModal, setGhModal] = useState(false);
  const [ghConnecting, setGhConnecting] = useState(false);
  const editorRef = useRef<any>(null);
  const monacoRef = useRef<any>(null);
  const decoRef = useRef<string[]>([]);
  const rootRef = useRef<HTMLDivElement>(null);

  // Sizing is now pure CSS (see CodePlayground.css). The playground fills the
  // content area via the .main-content:has(> .cp-root) rule — no JS measurement,
  // so it can't mis-size from DPR/zoom or a collapsing parent.

  // Debugger
  const [debugMode, setDebugMode] = useState(false);
  const [trace, setTrace] = useState<any[] | null>(null);
  const [step, setStep] = useState(0);
  const [breakpoints, setBreakpoints] = useState<number[]>([]);
  const [dbgLoading, setDbgLoading] = useState(false);
  const [consoleTab, setConsoleTab] = useState<'Console' | 'Input' | 'Output' | 'Errors'>('Console');
  const [rightW, setRightW] = useState(400);
  const [consoleH, setConsoleH] = useState(220);
  const cur = trace ? trace[Math.min(step, trace.length - 1)] : null;

  const startColDrag = (e: React.MouseEvent) => {
    e.preventDefault();
    const move = (ev: MouseEvent) => setRightW(Math.min(820, Math.max(280, window.innerWidth - ev.clientX)));
    const up = () => { window.removeEventListener('mousemove', move); window.removeEventListener('mouseup', up); document.body.style.userSelect = ''; };
    document.body.style.userSelect = 'none';
    window.addEventListener('mousemove', move); window.addEventListener('mouseup', up);
  };
  const startRowDrag = (e: React.MouseEvent) => {
    e.preventDefault();
    const move = (ev: MouseEvent) => setConsoleH(Math.min(window.innerHeight * 0.65, Math.max(90, window.innerHeight - ev.clientY)));
    const up = () => { window.removeEventListener('mousemove', move); window.removeEventListener('mouseup', up); document.body.style.userSelect = ''; };
    document.body.style.userSelect = 'none';
    window.addEventListener('mousemove', move); window.addEventListener('mouseup', up);
  };
  const lastIdx = trace ? trace.length - 1 : 0;
  const depthAt = (i: number) => trace?.[i]?.stack_to_render?.length || 0;

  const isWeb = language === 'web';
  const isSql = language === 'sql';
  const isFramework = language.startsWith('fw-');
  const canDebug = !!DEBUG_LANG[language];
  const current = isFramework ? null : byKey(language);

  const loadList = useCallback(async () => {
    try { const r = await playgroundApi.list(); setPrograms(r.data || []); } catch { /* ignore */ }
  }, []);
  useEffect(() => { loadList(); }, [loadList]);

  const changeLanguage = (key: string) => {
    setLangOpen(false); setLanguage(key);
    if (key.startsWith('fw-')) return;
    if (!code.trim() || STARTERS.has(code)) setCode(byKey(key).starter);
  };

  const handleRun = async () => {
    setOutput(''); setError(''); setSqlRows(null); setRightTab('output');
    if (isWeb) { setPreview(code); return; }
    setPreview('');
    if (isSql) {
      setRunning(true);
      try { setSqlRows(await runSql(code)); } catch (e: any) { setError(e.message || 'SQL error'); }
      finally { setRunning(false); }
      return;
    }
    setRunning(true);
    try {
      const r = await playgroundApi.run({ language, code, stdin });
      setOutput(r.data?.output ?? ''); setError(r.data?.error ?? '');
    } catch (e: any) { setError(e.message || 'Run failed'); }
    finally { setRunning(false); }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const body = { title: title.trim() || 'Untitled', language, code, stdin, kind: kindFor(language) };
      const r = currentId ? await playgroundApi.update(currentId, body) : await playgroundApi.create(body);
      setCurrentId(r.data?._id || currentId);
      loadList();
    } catch (e: any) { alert(e.message || 'Save failed'); }
    finally { setSaving(false); }
  };

  const loadProgram = async (id: string) => {
    setProgsOpen(false);
    try {
      const r = await playgroundApi.get(id); const p = r.data;
      setCurrentId(p._id); setTitle(p.title); setLanguage(p.language);
      setCode(p.code || ''); setStdin(p.stdin || ''); setOutput(''); setError(''); setPreview(''); setSqlRows(null);
    } catch { /* ignore */ }
  };

  const newProgram = () => {
    setCurrentId(null); setTitle('Untitled');
    setCode(byKey(language.startsWith('fw-') ? 'java' : language).starter);
    setStdin(''); setOutput(''); setError(''); setPreview(''); setSqlRows(null);
  };

  const del = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm('Delete this saved program?')) return;
    try { await playgroundApi.remove(id); if (currentId === id) newProgram(); loadList(); } catch { /* ignore */ }
  };

  // GitHub push — check connection first, prompt to connect if missing
  const handlePushGithub = async () => {
    try {
      const st = await studentProfileAPI.getOAuthStatus();
      if (!st?.data?.github?.connected) { setGhModal(true); return; }
    } catch { /* if status fails, attempt push anyway */ }
    setPushing(true);
    try {
      let id = currentId;
      const body = { title: title.trim() || 'Untitled', language, code, stdin, kind: kindFor(language) };
      if (id) await playgroundApi.update(id, body);
      else { const r = await playgroundApi.create(body); id = r.data?._id; setCurrentId(id); loadList(); }
      const suggested = (title.trim() || 'playground').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
      const repoName = window.prompt('GitHub repository name:', suggested);
      if (repoName === null) { setPushing(false); return; }
      const r = await playgroundApi.pushGithub(id as string, { repoName });
      if (window.confirm(`Pushed to ${r.data?.repo}. Open it on GitHub?`)) window.open(r.data?.url, '_blank');
    } catch (e: any) {
      if (/connect.*github/i.test(e.message || '')) setGhModal(true); else alert(e.message || 'GitHub push failed');
    } finally { setPushing(false); }
  };

  const connectGithub = async () => {
    setGhConnecting(true);
    try {
      const c = await studentProfileAPI.connectGitHub();
      if (c?.authUrl) window.open(c.authUrl, '_blank', 'width=760,height=820');
    } catch (e: any) { alert(e.message || 'Could not start GitHub connect'); }
    finally { setGhConnecting(false); }
  };

  // ── Debugger ──────────────────────────────────────────────────────────────
  const startDebug = async () => {
    setDbgLoading(true);
    try {
      const r = await playgroundApi.trace({ language, code, stdin });
      const t: any[] = r.data?.trace || [];
      if (!t.length) throw new Error('empty trace');
      setTrace(t); setStep(0); setConsoleTab('Console'); setDebugMode(true);
    } catch {
      setDebugUrl(buildDebugUrl(language, code, stdin));   // fallback to Python Tutor iframe
    } finally { setDbgLoading(false); }
  };
  const stopDebug = () => { setDebugMode(false); setTrace(null); };
  const stepInto = () => setStep(s => Math.min(lastIdx, s + 1));
  const stepOver = () => { const c = depthAt(step); let i = step + 1; while (i <= lastIdx && depthAt(i) > c) i++; setStep(Math.min(i, lastIdx)); };
  const stepOut = () => { const c = depthAt(step); let i = step + 1; while (i <= lastIdx && depthAt(i) >= c) i++; setStep(Math.min(i, lastIdx)); };
  const resume = () => { const bp = new Set(breakpoints); let i = step + 1; while (i <= lastIdx && !bp.has(trace![i].line)) i++; setStep(Math.min(i, lastIdx)); };
  const toggleBreakpoint = (ln: number) => setBreakpoints(b => b.includes(ln) ? b.filter(x => x !== ln) : [...b, ln]);

  const renderVal = (v: any, heap: any): string => {
    if (v === null || v === undefined) return 'null';
    if (Array.isArray(v)) {
      if (v[0] === 'REF') {
        const h = heap?.[v[1]]; const ty = h?.[0];
        if (ty === 'LIST') return `Array[${Math.max(0, (h.length - 1))}] (id=${v[1]})`;
        if (ty === 'INSTANCE') return `${h[1]} (id=${v[1]})`;
        if (ty === 'DICT') return `Map (id=${v[1]})`;
        return `${ty || 'ref'} (id=${v[1]})`;
      }
      return JSON.stringify(v);
    }
    if (typeof v === 'object') return JSON.stringify(v);
    return String(v);
  };

  // Editor decorations: breakpoints + current debug line
  useEffect(() => {
    const ed = editorRef.current, monaco = monacoRef.current;
    if (!ed || !monaco) return;
    const decos: any[] = [];
    breakpoints.forEach(ln => decos.push({ range: new monaco.Range(ln, 1, ln, 1), options: { glyphMarginClassName: 'cp-bp-glyph' } }));
    if (debugMode && cur?.line) {
      decos.push({ range: new monaco.Range(cur.line, 1, cur.line, 1), options: { isWholeLine: true, className: 'cp-curline' } });
      try { ed.revealLineInCenterIfOutsideViewport(cur.line); } catch { /* ignore */ }
    }
    decoRef.current = ed.deltaDecorations(decoRef.current, decos);
  }, [breakpoints, step, debugMode, cur?.line]);

  const formatCode = () => { try { editorRef.current?.getAction('editor.action.formatDocument')?.run(); } catch { /* ignore */ } };
  const resetCode = () => { if (current) setCode(current.starter); setOutput(''); setError(''); setPreview(''); setSqlRows(null); };
  const downloadCode = () => {
    const blob = new Blob([code], { type: 'text/plain' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
    a.download = current?.file || 'program.txt'; a.click(); URL.revokeObjectURL(a.href);
  };
  const share = async () => { try { await navigator.clipboard.writeText(code); alert('Code copied to clipboard.'); } catch { /* ignore */ } };

  const visibleLangs = LANGS.filter(l => l.label.toLowerCase().includes(langSearch.toLowerCase()));
  const visibleFw = FRAMEWORKS.filter(f => f.label.toLowerCase().includes(langSearch.toLowerCase()));
  const langLabel = isFramework ? (fwByKey(language)?.label || 'Framework') : byKey(language).label;
  const langIcon = isFramework ? (fwByKey(language)?.icon || '📦') : byKey(language).icon;

  return (
    <div className={`cp-root ${full ? 'cp-full' : ''}`} ref={rootRef}>
      {/* Tabs */}
      <div className="cp-tabbar">
        <div className="cp-tab active">
          <span>{isFramework ? (fwByKey(language)?.label) : (title.trim() ? `${title}` : current?.file)}</span>
          <span className="cp-tab-x" onClick={newProgram} title="New">✕</span>
        </div>
        <button className="cp-tab-add" onClick={newProgram} title="New program">+</button>
      </div>

      {/* Toolbar */}
      <div className="cp-toolbar">
        <div className={`cp-lang ${langOpen ? 'open' : ''}`} onClick={() => setLangOpen(o => !o)}>
          <span>{langIcon}</span><span>{langLabel}</span><span className="chev">▾</span>
        </div>
        {langOpen && (
          <div className="cp-lang-panel" onMouseLeave={() => setLangOpen(false)}>
            <input className="cp-lang-search" autoFocus placeholder="Search language…" value={langSearch} onChange={e => setLangSearch(e.target.value)} />
            <div className="cp-lang-list">
              <div className="cp-lang-group">POPULAR LANGUAGES</div>
              {visibleLangs.map(l => (
                <div key={l.key} className={`cp-lang-item ${language === l.key ? 'sel' : ''}`} onClick={() => changeLanguage(l.key)}>
                  <span className="cp-lang-dot">{l.icon}</span>{l.label}{language === l.key && ' ✓'}
                </div>
              ))}
              {visibleFw.length > 0 && <div className="cp-lang-group">FRAMEWORKS (StackBlitz)</div>}
              {visibleFw.map(f => (
                <div key={f.key} className={`cp-lang-item ${language === f.key ? 'sel' : ''}`} onClick={() => changeLanguage(f.key)}>
                  <span className="cp-lang-dot">{f.icon}</span>{f.label}{language === f.key && ' ✓'}
                </div>
              ))}
            </div>
          </div>
        )}

        {!isFramework && <button className="cp-btn cp-btn-run" onClick={handleRun} disabled={running}>▶ {running ? 'Running…' : 'Run'}</button>}
        {!isFramework && canDebug && (debugMode
          ? <button className="cp-btn" onClick={stopDebug}>■ Stop Debug</button>
          : <button className="cp-btn" onClick={startDebug} disabled={dbgLoading}>⚙ {dbgLoading ? 'Starting…' : 'Debug'}</button>)}
        {!isFramework && <button className="cp-btn" onClick={resetCode}>↺ Reset</button>}
        {!isFramework && <button className="cp-btn" onClick={formatCode}>≣ Format</button>}

        <div className="cp-toolbar-right">
          {!isFramework && <button className="cp-btn" onClick={share}>↗ Share</button>}
          {!isFramework && <button className="cp-btn cp-btn-run" onClick={handleSave} disabled={saving}>💾 {saving ? 'Saving…' : 'Save'}</button>}
          <button className="cp-icon-btn" onClick={() => setProgsOpen(o => !o)} title="My Programs">⋮</button>
          <button className="cp-icon-btn" onClick={() => setFull(f => !f)} title="Fullscreen">⛶</button>
        </div>

        {progsOpen && (
          <div className="cp-progs" onMouseLeave={() => setProgsOpen(false)}>
            <div className="cp-lang-group">MY PROGRAMS</div>
            {programs.length === 0 ? <div style={{ padding: 14, color: '#94a3b8', fontSize: 13 }}>No saved programs yet.</div> :
              programs.map(p => (
                <div key={p._id} className="cp-prog" onClick={() => loadProgram(p._id)}>
                  <div><div className="t">{p.title}</div><div className="s">{byKey(p.language).label}</div></div>
                  <button onClick={(e) => del(p._id, e)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#ef4444' }}>🗑</button>
                </div>
              ))}
          </div>
        )}
      </div>

      {/* Body */}
      <div className="cp-body">
        <div className="cp-editor-wrap">
          {isFramework ? (
            <iframe title="framework-sandbox" src={fwByKey(language)?.url} style={{ width: '100%', height: '100%', border: 'none' }} />
          ) : (
            <Editor
              height="100%"
              language={byKey(language).monaco}
              value={code}
              onChange={(v) => setCode(v ?? '')}
              onMount={(ed, monaco) => {
                editorRef.current = ed; monacoRef.current = monaco;
                ed.onDidChangeCursorPosition((e: any) => setPos({ ln: e.position.lineNumber, col: e.position.column }));
                ed.onMouseDown((e: any) => {
                  if (e.target?.type === monaco.editor.MouseTargetType.GUTTER_GLYPH_MARGIN && e.target?.position) {
                    toggleBreakpoint(e.target.position.lineNumber);
                  }
                });
              }}
              theme="light"
              options={{ minimap: { enabled: false }, fontSize: 14, scrollBeyondLastLine: false, automaticLayout: true, tabSize: 4, glyphMargin: true }}
            />
          )}
        </div>

        {!isFramework && !debugMode && <div className="cp-vdiv" onMouseDown={startColDrag} />}
        {!isFramework && !debugMode && (
          <div className="cp-right" style={{ width: rightW }}>
            <div className="cp-right-head">
              <span className={`cp-rtab ${rightTab === 'input' ? 'active' : ''}`} onClick={() => setRightTab('input')}>Input</span>
              <span className={`cp-rtab ${rightTab === 'output' ? 'active' : ''}`} onClick={() => setRightTab('output')}>Output</span>
              <span className="cp-run-input" onClick={handleRun}>▶ Run{isWeb || isSql ? '' : ' with Input'}</span>
            </div>

            {isWeb ? (
              <div className="cp-sec" style={{ flex: 1 }}>
                <div className="cp-sec-label">LIVE PREVIEW</div>
                {preview ? <iframe title="preview" srcDoc={preview} sandbox="allow-scripts allow-modals" style={{ width: '100%', height: 380, border: '1px solid #e2e8f0', borderRadius: 8 }} />
                  : <div className="cp-output muted">Click ▶ Run to render your page.</div>}
              </div>
            ) : isSql ? (
              <div className="cp-sec" style={{ flex: 1 }}>
                <div className="cp-sec-label">RESULT</div>
                {error ? <div className="cp-output err">{error}</div> :
                  sqlRows === null ? <div className="cp-output muted">Run a query to see results.</div> :
                  sqlRows.length === 0 ? <div className="cp-output" style={{ color: '#16a34a' }}>✅ Query executed (no rows).</div> :
                  sqlRows.map((rs, i) => (
                    <table key={i} className="cp-sql-table">
                      <thead><tr>{rs.columns.map(c => <th key={c}>{c}</th>)}</tr></thead>
                      <tbody>{rs.values.map((row, ri) => <tr key={ri}>{row.map((v, ci) => <td key={ci}>{String(v)}</td>)}</tr>)}</tbody>
                    </table>
                  ))}
              </div>
            ) : (
              <>
                <div className="cp-sec">
                  <div className="cp-sec-label">STDIN (Input)</div>
                  <textarea className="cp-stdin" value={stdin} onChange={e => setStdin(e.target.value)} placeholder="Enter input for your program (if any)" />
                </div>
                <div className="cp-sec">
                  <div className="cp-sec-label">Output</div>
                  <div className="cp-output">
                    {error ? <span className="err">{error}</span> : (output || <span className="muted">Your program output will appear here.</span>)}
                  </div>
                </div>
              </>
            )}

            <div className="cp-sec-label" style={{ padding: '4px 16px 0' }}>Quick Actions</div>
            <div className="cp-quick">
              <div className="cp-qcard" onClick={resetCode}><span className="ic">{'</>'}</span><span className="lbl">Generate Boilerplate</span></div>
              <div className="cp-qcard" onClick={handleSave}><span className="ic">🔖</span><span className="lbl">Add to My Programs</span></div>
              <div className="cp-qcard" onClick={downloadCode}><span className="ic">⬇</span><span className="lbl">Download Code</span></div>
              <div className="cp-qcard" onClick={handlePushGithub}><span className="ic">⬆</span><span className="lbl">{pushing ? 'Pushing…' : 'Push to GitHub'}</span></div>
            </div>
          </div>
        )}

        {/* Debug panel */}
        {!isFramework && debugMode && cur && (() => {
          const stack: any[] = cur.stack_to_render || [];
          const top = stack.find((f: any) => f.is_highlighted) || stack[stack.length - 1];
          const codeLines = code.split('\n');
          return (<>
            <div className="cp-vdiv" onMouseDown={startColDrag} />
            <div className="cp-right" style={{ width: rightW }}>
              <div className="cp-dbg-bar">
                <span className="ttl">Debug</span>
                <button className="cp-dbg-act resume" onClick={resume} disabled={step >= lastIdx}>▶ Resume</button>
                <button className="cp-dbg-act" onClick={stepOver} disabled={step >= lastIdx}>⤼ Step Over</button>
                <button className="cp-dbg-act" onClick={stepInto} disabled={step >= lastIdx}>⤓ Step Into</button>
                <button className="cp-dbg-act" onClick={stepOut} disabled={step >= lastIdx}>⤴ Step Out</button>
                <button className="cp-dbg-act stop" onClick={stopDebug}>■ Stop</button>
              </div>
              <div className="cp-dbg-cols">
                <div className="cp-dbg-col">
                  <div className="cp-dbg-h">VARIABLES</div>
                  <div className="cp-dbg-sub">▾ Locals</div>
                  {top ? (top.ordered_varnames || []).filter((n: string) => n !== '__return__').map((n: string) => (
                    <div key={n} className="cp-var"><span className="k">{n}</span><span className="v">{renderVal(top.encoded_locals?.[n], cur.heap)}</span></div>
                  )) : <div className="cp-var"><span className="k" style={{ color: '#94a3b8' }}>—</span></div>}
                  <div className="cp-dbg-h" style={{ marginTop: 16 }}>WATCH</div>
                  <div className="cp-watch-add">+ Add watch</div>
                </div>
                <div className="cp-dbg-col">
                  <div className="cp-dbg-h">CALL STACK</div>
                  {[...stack].reverse().map((f: any, i: number) => (
                    <div key={i} className="cp-frame"><div className="fn">{f.func_name}</div><div className="sig">{f.func_name?.split(':')[0]}({(f.ordered_varnames || []).join(', ')})</div></div>
                  ))}
                  <div className="cp-thread" style={{ marginTop: 6 }}>Thread: main</div>
                </div>
                <div className="cp-dbg-col">
                  <div className="cp-dbg-h">BREAKPOINTS</div>
                  {breakpoints.length === 0 ? <div style={{ fontSize: 13, color: '#94a3b8' }}>Click the gutter to add a breakpoint.</div> :
                    [...breakpoints].sort((a, b) => a - b).map(ln => (
                      <div key={ln}>
                        <div className="cp-bp"><input type="checkbox" checked readOnly onClick={() => toggleBreakpoint(ln)} /><span className="dot">●</span> {current?.file || 'code'}:{ln}</div>
                        <div className="src">{(codeLines[ln - 1] || '').trim()}</div>
                      </div>
                    ))}
                </div>
              </div>
              <div className="cp-sec-label" style={{ padding: '12px 16px 0' }}>QUICK ACTIONS</div>
              <div className="cp-quick">
                <div className="cp-qcard" onClick={resetCode}><span className="ic">{'</>'}</span><span className="lbl">Generate Boilerplate</span></div>
                <div className="cp-qcard" onClick={handleSave}><span className="ic">🔖</span><span className="lbl">Add to My Programs</span></div>
                <div className="cp-qcard" onClick={downloadCode}><span className="ic">⬇</span><span className="lbl">Download Code</span></div>
                <div className="cp-qcard" onClick={handlePushGithub}><span className="ic">⬆</span><span className="lbl">Push to GitHub</span></div>
              </div>
            </div>
          </>);
        })()}
      </div>

      {/* Debug console (resizable) */}
      {debugMode && <div className="cp-hdiv" onMouseDown={startRowDrag} />}
      {debugMode && (
        <div className="cp-console" style={{ height: consoleH }}>
          <div className="cp-console-tabs">
            {(['Console', 'Input', 'Output', 'Errors'] as const).map(t => (
              <span key={t} className={`cp-console-tab ${consoleTab === t ? 'active' : ''}`} onClick={() => setConsoleTab(t)}>{t}</span>
            ))}
            <span className="cp-console-clear">Step {Math.min(step + 1, lastIdx + 1)} / {lastIdx + 1}</span>
          </div>
          <div className="cp-console-body">
            {consoleTab === 'Console' && <><span className="info">Program started in debug mode…</span>{'\n'}{cur?.stdout || ''}</>}
            {consoleTab === 'Output' && (cur?.stdout || <span style={{ color: '#94a3b8' }}>No output yet.</span>)}
            {consoleTab === 'Input' && <textarea className="cp-stdin" value={stdin} onChange={e => setStdin(e.target.value)} placeholder="STDIN — re-run Debug to apply" style={{ width: '100%' }} />}
            {consoleTab === 'Errors' && (cur?.event === 'exception' || cur?.exception_msg ? <span className="err">{cur.exception_msg || 'Runtime exception'}</span> : <span style={{ color: '#16a34a' }}>No errors.</span>)}
          </div>
        </div>
      )}

      {/* Status bar */}
      <div className="cp-status">
        <span>Ln {pos.ln}, Col {pos.col}</span>
        <span>Spaces: 4</span>
        <span>UTF-8</span>
        <span className="ok">● {running ? 'Running' : 'Ready'}</span>
        <span style={{ marginLeft: 'auto' }}>{isFramework ? 'StackBlitz sandbox' : langLabel}</span>
      </div>

      {/* Tip bar */}
      <div className="cp-tip">
        💡 <span>Tip: Use <b>Ctrl + Enter</b> to run, <b>Ctrl + S</b> to save.</span>
        <span className="right">
          <span onClick={share}>🔗 Share Code</span>
          <span onClick={() => window.open('mailto:support@codebegun.com?subject=Playground%20Feedback')}>💬 Feedback</span>
        </span>
      </div>

      {/* Debugger modal */}
      {debugUrl && (
        <div className="cp-modal-overlay" onClick={() => setDebugUrl(null)}>
          <div className="cp-modal-dbg" onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 16px', borderBottom: '1px solid #e5e7eb' }}>
              <strong>🐞 Step-through Debugger — {byKey(language).label}</strong>
              <button className="cp-btn" onClick={() => setDebugUrl(null)}>✕ Close</button>
            </div>
            <iframe title="debugger" src={debugUrl} style={{ flex: 1, border: 'none', width: '100%' }} />
          </div>
        </div>
      )}

      {/* GitHub connect modal */}
      {ghModal && (
        <div className="cp-modal-overlay" onClick={() => setGhModal(false)}>
          <div className="cp-modal" onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 40 }}>🐙</div>
            <h3>Connect your GitHub</h3>
            <p>To push your code to a repository, connect your GitHub account once. A GitHub window will open — approve access, then come back and click <b>Push to GitHub</b> again.</p>
            <div className="gh-actions">
              <button className="gh-btn" onClick={connectGithub} disabled={ghConnecting}>{ghConnecting ? 'Opening…' : '🐙 Connect GitHub'}</button>
              <button className="gh-later" onClick={() => setGhModal(false)}>Maybe later</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CodePlayground;
