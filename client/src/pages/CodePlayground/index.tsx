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
    <div className={`cp-root ${full ? 'cp-full' : ''}`}>
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
        {!isFramework && canDebug && <button className="cp-btn" onClick={() => setDebugUrl(buildDebugUrl(language, code, stdin))}>⚙ Debug</button>}
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
              onMount={(ed) => { editorRef.current = ed; ed.onDidChangeCursorPosition((e: any) => setPos({ ln: e.position.lineNumber, col: e.position.column })); }}
              theme="light"
              options={{ minimap: { enabled: false }, fontSize: 14, scrollBeyondLastLine: false, automaticLayout: true, tabSize: 4 }}
            />
          )}
        </div>

        {!isFramework && (
          <div className="cp-right">
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
      </div>

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
