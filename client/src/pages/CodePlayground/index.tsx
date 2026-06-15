import React, { useEffect, useState, useCallback } from 'react';
import Editor from '@monaco-editor/react';
import { playgroundApi } from '../../api/playgroundApi';

interface Lang { key: string; label: string; monaco: string; starter: string; }

const LANGS: Lang[] = [
  { key: 'python', label: 'Python', monaco: 'python', starter: 'print("Hello, World!")\n' },
  { key: 'javascript', label: 'JavaScript', monaco: 'javascript', starter: 'console.log("Hello, World!");\n' },
  { key: 'typescript', label: 'TypeScript', monaco: 'typescript', starter: 'const msg: string = "Hello, World!";\nconsole.log(msg);\n' },
  { key: 'java', label: 'Java', monaco: 'java', starter: 'import java.util.*;\n\npublic class Main {\n  public static void main(String[] args) {\n    System.out.println("Hello, World!");\n  }\n}\n' },
  { key: 'cpp', label: 'C++', monaco: 'cpp', starter: '#include <iostream>\nusing namespace std;\nint main() {\n  cout << "Hello, World!" << endl;\n  return 0;\n}\n' },
  { key: 'c', label: 'C', monaco: 'c', starter: '#include <stdio.h>\nint main() {\n  printf("Hello, World!\\n");\n  return 0;\n}\n' },
  { key: 'csharp', label: 'C#', monaco: 'csharp', starter: 'using System;\nclass Program {\n  static void Main() {\n    Console.WriteLine("Hello, World!");\n  }\n}\n' },
];
const STARTERS = new Set(LANGS.map(l => l.starter));
const byKey = (k: string) => LANGS.find(l => l.key === k) || LANGS[0];

const CodePlayground: React.FC = () => {
  const [language, setLanguage] = useState('python');
  const [code, setCode] = useState(byKey('python').starter);
  const [stdin, setStdin] = useState('');
  const [title, setTitle] = useState('Untitled');
  const [output, setOutput] = useState('');
  const [error, setError] = useState('');
  const [running, setRunning] = useState(false);
  const [saving, setSaving] = useState(false);
  const [programs, setPrograms] = useState<any[]>([]);
  const [currentId, setCurrentId] = useState<string | null>(null);

  const loadList = useCallback(async () => {
    try { const r = await playgroundApi.list(); setPrograms(r.data || []); } catch { /* ignore */ }
  }, []);
  useEffect(() => { loadList(); }, [loadList]);

  const changeLanguage = (key: string) => {
    setLanguage(key);
    // Only swap in the new starter if the editor is empty or still a starter.
    if (!code.trim() || STARTERS.has(code)) setCode(byKey(key).starter);
  };

  const handleRun = async () => {
    setRunning(true); setOutput(''); setError('');
    try {
      const r = await playgroundApi.run({ language, code, stdin });
      setOutput(r.data?.output ?? '');
      setError(r.data?.error ?? '');
    } catch (e: any) { setError(e.message || 'Run failed'); }
    finally { setRunning(false); }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const body = { title: title.trim() || 'Untitled', language, code, stdin, kind: 'single' };
      const r = currentId ? await playgroundApi.update(currentId, body) : await playgroundApi.create(body);
      setCurrentId(r.data?._id || currentId);
      loadList();
    } catch (e: any) { alert(e.message || 'Save failed'); }
    finally { setSaving(false); }
  };

  const loadProgram = async (id: string) => {
    try {
      const r = await playgroundApi.get(id);
      const p = r.data;
      setCurrentId(p._id); setTitle(p.title); setLanguage(p.language);
      setCode(p.code || ''); setStdin(p.stdin || ''); setOutput(''); setError('');
    } catch { /* ignore */ }
  };

  const newProgram = () => {
    setCurrentId(null); setTitle('Untitled');
    setCode(byKey(language).starter); setStdin(''); setOutput(''); setError('');
  };

  const del = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm('Delete this saved program?')) return;
    try { await playgroundApi.remove(id); if (currentId === id) newProgram(); loadList(); } catch { /* ignore */ }
  };

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 60px)' }}>
      {/* Saved list */}
      <div style={{ width: 230, borderRight: '1px solid #e5e7eb', background: '#fff', overflowY: 'auto', flexShrink: 0 }}>
        <div style={{ padding: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <strong style={{ fontSize: 13, color: '#334155' }}>My Programs</strong>
          <button onClick={newProgram} style={{ border: '1px solid #cbd5e1', borderRadius: 6, background: '#fff', cursor: 'pointer', padding: '2px 8px', fontSize: 13 }}>+ New</button>
        </div>
        {programs.length === 0 ? <div style={{ padding: 12, color: '#94a3b8', fontSize: 12 }}>No saved programs yet.</div> :
          programs.map(p => (
            <div key={p._id} onClick={() => loadProgram(p._id)}
              style={{ padding: '8px 12px', cursor: 'pointer', borderBottom: '1px solid #f1f5f9', background: currentId === p._id ? '#eff6ff' : '#fff', display: 'flex', justifyContent: 'space-between', gap: 6 }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.title}</div>
                <div style={{ fontSize: 11, color: '#94a3b8' }}>{byKey(p.language).label}</div>
              </div>
              <button onClick={(e) => del(p._id, e)} title="Delete" style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#ef4444' }}>🗑</button>
            </div>
          ))}
      </div>

      {/* Editor + controls */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', borderBottom: '1px solid #e5e7eb', background: '#fff', flexWrap: 'wrap' }}>
          <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Program title"
            style={{ border: '1px solid #cbd5e1', borderRadius: 6, padding: '6px 10px', fontSize: 14, width: 220 }} />
          <select value={language} onChange={e => changeLanguage(e.target.value)} style={{ border: '1px solid #cbd5e1', borderRadius: 6, padding: '6px 10px', fontSize: 14 }}>
            {LANGS.map(l => <option key={l.key} value={l.key}>{l.label}</option>)}
          </select>
          <button onClick={handleRun} disabled={running} style={{ background: '#16a34a', color: '#fff', border: 'none', borderRadius: 6, padding: '7px 18px', fontWeight: 700, cursor: 'pointer', opacity: running ? 0.6 : 1 }}>
            {running ? 'Running…' : '▶ Run'}
          </button>
          <button onClick={handleSave} disabled={saving} style={{ background: '#2563eb', color: '#fff', border: 'none', borderRadius: 6, padding: '7px 16px', fontWeight: 700, cursor: 'pointer', opacity: saving ? 0.6 : 1 }}>
            {saving ? 'Saving…' : '💾 Save'}
          </button>
          <span style={{ marginLeft: 'auto', fontSize: 12, color: '#94a3b8' }}>Debugger & GitHub push coming soon</span>
        </div>

        <div style={{ flex: 1, minHeight: 0 }}>
          <Editor
            height="100%"
            language={byKey(language).monaco}
            value={code}
            onChange={(v) => setCode(v ?? '')}
            theme="vs-dark"
            options={{ minimap: { enabled: false }, fontSize: 14, scrollBeyondLastLine: false, automaticLayout: true }}
          />
        </div>
      </div>

      {/* Input / Output */}
      <div style={{ width: 360, borderLeft: '1px solid #e5e7eb', background: '#0b1020', color: '#e2e8f0', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
        <div style={{ padding: '10px 14px', borderBottom: '1px solid #1e293b', fontSize: 12, fontWeight: 700, color: '#93c5fd' }}>STDIN (input)</div>
        <textarea value={stdin} onChange={e => setStdin(e.target.value)} placeholder="Type input passed to your program…"
          style={{ background: '#0b1020', color: '#e2e8f0', border: 'none', borderBottom: '1px solid #1e293b', padding: 12, fontFamily: 'monospace', fontSize: 13, resize: 'none', height: 120, outline: 'none' }} />
        <div style={{ padding: '10px 14px', borderBottom: '1px solid #1e293b', fontSize: 12, fontWeight: 700, color: '#86efac' }}>OUTPUT</div>
        <pre style={{ flex: 1, margin: 0, padding: 12, overflow: 'auto', fontFamily: 'monospace', fontSize: 13, whiteSpace: 'pre-wrap' }}>
          {error ? <span style={{ color: '#fca5a5' }}>{error}</span> : (output || <span style={{ color: '#64748b' }}>Run your program to see output here.</span>)}
        </pre>
      </div>
    </div>
  );
};

export default CodePlayground;
